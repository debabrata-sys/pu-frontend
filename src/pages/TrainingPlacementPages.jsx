import React, { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  Container,
  Grid,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import { DataGrid, GridActionsCellItem, GridToolbar } from "@mui/x-data-grid";
import { AutoAwesome, Delete, Edit, FileDownload, Refresh, Save, UploadFile } from "@mui/icons-material";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import ep1 from "../api/ep1";
import global1 from "./global1";
import MenuPageShell from "./MenuPageShell";

const today = new Date().toISOString().slice(0, 10);
const colors = ["#2563eb", "#16a34a", "#f97316", "#9333ea", "#dc2626", "#0891b2", "#facc15"];
const text = (value) => String(value || "").trim();
const uniqueSorted = (values = []) => [...new Set(values.map(text).filter(Boolean))].sort((a, b) => a.localeCompare(b));
const basePayload = () => ({ colid: global1.colid, user: global1.user });
const aiDefault = { provider: "Gemini", geminiModel: "gemini-2.5-flash", ollamaConfigId: "", prompt: "" };

function Shell({ title, subtitle, children }) {
  return (
    <MenuPageShell title={title}>
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1} sx={{ mb: 2 }}>
          <Box>
            <Typography variant="h5" fontWeight={900}>{title}</Typography>
            {subtitle && <Typography color="text.secondary">{subtitle}</Typography>}
          </Box>
        </Stack>
        {children}
      </Container>
    </MenuPageShell>
  );
}

function useOptions() {
  const [options, setOptions] = useState({ courses: [], events: [], students: [], users: [], ollamaConfigs: [], geminiModels: [] });
  const loadOptions = async () => {
    const res = await ep1.get("/api/v2/training-placement/options", { params: { colid: global1.colid } });
    setOptions(res.data || {});
  };
  useEffect(() => { loadOptions(); }, []);
  return { options, loadOptions };
}

function Message({ message, error, clear }) {
  return (
    <>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => clear?.("error")}>{error}</Alert>}
      {message && <Alert severity="success" sx={{ mb: 2 }} onClose={() => clear?.("message")}>{message}</Alert>}
    </>
  );
}

function AiControls({ ai, setAi, options }) {
  return (
    <Grid container spacing={2}>
      <Grid item xs={12} md={2}><TextField select fullWidth size="small" label="AI provider" value={ai.provider} onChange={(e) => setAi((p) => ({ ...p, provider: e.target.value }))}><MenuItem value="Gemini">Gemini</MenuItem><MenuItem value="Ollama">Ollama</MenuItem></TextField></Grid>
      {ai.provider === "Gemini" && <Grid item xs={12} md={3}><TextField select fullWidth size="small" label="Gemini model" value={ai.geminiModel} onChange={(e) => setAi((p) => ({ ...p, geminiModel: e.target.value }))}>{(options.geminiModels || ["gemini-2.5-flash"]).map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}</TextField></Grid>}
      {ai.provider === "Ollama" && <Grid item xs={12} md={3}><TextField select fullWidth size="small" label="Ollama" value={ai.ollamaConfigId} onChange={(e) => setAi((p) => ({ ...p, ollamaConfigId: e.target.value }))}>{(options.ollamaConfigs || []).map((item) => <MenuItem key={item._id} value={item._id}>{item.name || item.modelname} - {item.modelname}</MenuItem>)}</TextField></Grid>}
      <Grid item xs={12} md={7}><TextField fullWidth size="small" label="Additional AI prompt" value={ai.prompt} onChange={(e) => setAi((p) => ({ ...p, prompt: e.target.value }))} /></Grid>
    </Grid>
  );
}

function CrudPage({ kind, title, subtitle, blank, fields, columns, decorateForm }) {
  const { options, loadOptions } = useOptions();
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(blank);
  const [editingId, setEditingId] = useState("");
  const [selectedRows, setSelectedRows] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const loadRows = async () => {
    try {
      setLoading(true);
      const res = await ep1.get(`/api/v2/training-placement/${kind}`, { params: basePayload() });
      setRows(res.data?.data || []);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load records");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { loadRows(); }, []);

  const update = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));
  const save = async () => {
    try {
      setError("");
      await ep1.post(`/api/v2/training-placement/${kind}`, { ...form, id: editingId, ...basePayload() });
      setMessage("Saved");
      setEditingId("");
      setForm(blank);
      await Promise.all([loadRows(), loadOptions()]);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to save");
    }
  };
  const remove = async (row) => {
    if (!window.confirm("Delete this record?")) return;
    await ep1.post(`/api/v2/training-placement/${kind}/delete`, { id: row._id, colid: global1.colid });
    setMessage("Deleted");
    loadRows();
  };
  const bulkDelete = async () => {
    if (!selectedRows.length) return setError("Select rows to delete");
    if (!window.confirm(`Delete ${selectedRows.length} selected record(s)?`)) return;
    await ep1.post(`/api/v2/training-placement/${kind}/bulk-delete`, { colid: global1.colid, ids: selectedRows });
    setSelectedRows([]);
    setMessage("Selected records deleted");
    loadRows();
  };
  const template = () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([blank]), title);
    XLSX.writeFile(wb, `${kind}_training_placement_template.xlsx`);
  };
  const upload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const data = new FormData();
    data.append("file", file);
    data.append("colid", global1.colid);
    data.append("user", global1.user);
    await ep1.post(`/api/v2/training-placement/${kind}/bulkupload`, data, { headers: { "Content-Type": "multipart/form-data" } });
    setMessage("Bulk upload completed");
    loadRows();
  };

  return (
    <Shell title={title} subtitle={subtitle}>
      <Message message={message} error={error} clear={(type) => type === "error" ? setError("") : setMessage("")} />
      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2}>
          {fields.map((field) => (
            <Grid item xs={12} md={field.wide ? 4 : 2} key={field.name}>
              {field.type === "select" ? (
                <TextField select fullWidth size="small" label={field.label} value={form[field.name] || ""} onChange={(e) => update(field.name, e.target.value)}>
                  {(field.options || []).map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}
                </TextField>
              ) : field.type === "course" ? (
                <Autocomplete
                  size="small"
                  options={options.courses || []}
                  value={(options.courses || []).find((item) => item._id === form.courseid) || null}
                  onChange={(_, value) => setForm((prev) => ({ ...prev, courseid: value?._id || "", coursecode: value?.coursecode || "", coursename: value?.coursename || "" }))}
                  getOptionLabel={(option) => option ? `${option.coursecode || ""} - ${option.coursename || ""}` : ""}
                  renderInput={(params) => <TextField {...params} label={field.label} />}
                />
              ) : (
                <TextField fullWidth multiline={field.multiline} rows={field.multiline ? 3 : 1} type={field.inputType || "text"} size="small" label={field.label} value={form[field.name] || ""} onChange={(e) => update(field.name, e.target.value)} />
              )}
            </Grid>
          ))}
          {decorateForm?.({ form, setForm, options })}
          <Grid item xs={12} md={2}><Button fullWidth variant="contained" startIcon={<Save />} onClick={save}>{editingId ? "Update" : "Save"}</Button></Grid>
        </Grid>
      </Paper>
      <Stack direction={{ xs: "column", md: "row" }} spacing={1} sx={{ mb: 2 }}>
        <Button variant="outlined" startIcon={<Refresh />} onClick={loadRows}>Refresh</Button>
        <Button variant="outlined" startIcon={<FileDownload />} onClick={template}>Template</Button>
        <Button variant="outlined" component="label" startIcon={<UploadFile />}>Bulk upload<input hidden type="file" accept=".xlsx,.xls" onChange={upload} /></Button>
        <Button variant="contained" color="error" startIcon={<Delete />} disabled={!selectedRows.length} onClick={bulkDelete}>Bulk delete</Button>
      </Stack>
      <Paper sx={{ p: 1 }}>
        <DataGrid
          rows={rows}
          getRowId={(row) => row._id}
          columns={[...columns, { field: "actions", type: "actions", width: 110, getActions: ({ row }) => [
            <GridActionsCellItem icon={<Edit />} label="Edit" onClick={() => { setEditingId(row._id); setForm({ ...blank, ...row }); }} />,
            <GridActionsCellItem icon={<Delete />} label="Delete" onClick={() => remove(row)} />
          ] }]}
          loading={loading}
          checkboxSelection
          rowSelectionModel={selectedRows}
          onRowSelectionModelChange={(model) => setSelectedRows(model)}
          autoHeight
          slots={{ toolbar: GridToolbar }}
          slotProps={{ toolbar: { showQuickFilter: true, csvOptions: { fileName: kind } } }}
          pageSizeOptions={[10, 25, 50, 100]}
          initialState={{ pagination: { paginationModel: { pageSize: 25, page: 0 } } }}
        />
      </Paper>
    </Shell>
  );
}

export function TrainingPlacementCoursesPage() {
  const blank = { academicyear: "2026-27", coursecode: "", coursename: "", category: "", level: "", duration: "", mode: "Offline", description: "", objectives: "", skillscovered: "", startdate: today, enddate: today, status: "Active" };
  return <CrudPage kind="course" title="Training courses" subtitle="Create special courses for training and placement readiness." blank={blank} fields={[
    { name: "academicyear", label: "Academic year" }, { name: "coursecode", label: "Course code" }, { name: "coursename", label: "Course name", wide: true },
    { name: "category", label: "Category" }, { name: "level", label: "Level" }, { name: "duration", label: "Duration" },
    { name: "mode", label: "Mode", type: "select", options: ["Offline", "Online", "Hybrid"] }, { name: "startdate", label: "Start date", inputType: "date" }, { name: "enddate", label: "End date", inputType: "date" },
    { name: "skillscovered", label: "Skills covered", wide: true }, { name: "objectives", label: "Objectives", wide: true, multiline: true }, { name: "description", label: "Description", wide: true, multiline: true },
    { name: "status", label: "Status", type: "select", options: ["Active", "Inactive", "Completed"] }
  ]} columns={[
    { field: "academicyear", headerName: "Year", width: 110 }, { field: "coursecode", headerName: "Code", width: 130 }, { field: "coursename", headerName: "Course", width: 240 },
    { field: "category", headerName: "Category", width: 140 }, { field: "level", headerName: "Level", width: 120 }, { field: "mode", headerName: "Mode", width: 120 },
    { field: "skillscovered", headerName: "Skills", width: 240 }, { field: "status", headerName: "Status", width: 120 }
  ]} />;
}

export function TrainingPlacementEventsPage() {
  const blank = { academicyear: "2026-27", eventname: "", eventcode: "", eventtype: "", courseid: "", coursecode: "", coursename: "", startdate: today, enddate: today, venue: "", mode: "Offline", meetinglink: "", description: "", outcome: "", status: "Planned" };
  return <CrudPage kind="event" title="Training events" subtitle="Create workshops, bootcamps, drives and placement preparation events." blank={blank} fields={[
    { name: "academicyear", label: "Academic year" }, { name: "eventname", label: "Event name", wide: true }, { name: "eventcode", label: "Event code" },
    { name: "eventtype", label: "Event type" }, { name: "courseid", label: "Special course", type: "course", wide: true },
    { name: "startdate", label: "Start date", inputType: "date" }, { name: "enddate", label: "End date", inputType: "date" },
    { name: "venue", label: "Venue" }, { name: "mode", label: "Mode", type: "select", options: ["Offline", "Online", "Hybrid"] }, { name: "meetinglink", label: "Meeting link", wide: true },
    { name: "description", label: "Description", wide: true, multiline: true }, { name: "outcome", label: "Outcome", wide: true, multiline: true },
    { name: "status", label: "Status", type: "select", options: ["Planned", "Active", "Completed", "Cancelled"] }
  ]} columns={[
    { field: "academicyear", headerName: "Year", width: 110 }, { field: "eventcode", headerName: "Code", width: 130 }, { field: "eventname", headerName: "Event", width: 240 },
    { field: "eventtype", headerName: "Type", width: 150 }, { field: "coursename", headerName: "Course", width: 220 }, { field: "startdate", headerName: "Start", width: 120 }, { field: "status", headerName: "Status", width: 120 }
  ]} />;
}

export function TrainingPlacementGuestFacultyPage() {
  const blank = { courseid: "", coursecode: "", coursename: "", facultyname: "", facultyemail: "", phone: "", organization: "", designation: "", expertise: "", sessiontopic: "", sessiondate: today, honorarium: 0, remarks: "", status: "Active" };
  return <CrudPage kind="guestfaculty" title="Guest faculties" subtitle="Add guest faculty to any special training course." blank={blank} fields={[
    { name: "courseid", label: "Special course", type: "course", wide: true },
    { name: "facultyname", label: "Faculty name" }, { name: "facultyemail", label: "Faculty email" }, { name: "phone", label: "Phone" },
    { name: "organization", label: "Organization" }, { name: "designation", label: "Designation" }, { name: "expertise", label: "Expertise", wide: true },
    { name: "sessiontopic", label: "Session topic", wide: true }, { name: "sessiondate", label: "Session date", inputType: "date" }, { name: "honorarium", label: "Honorarium", inputType: "number" },
    { name: "remarks", label: "Remarks", wide: true, multiline: true }, { name: "status", label: "Status", type: "select", options: ["Active", "Inactive"] }
  ]} columns={[
    { field: "coursecode", headerName: "Course code", width: 130 }, { field: "coursename", headerName: "Course", width: 220 }, { field: "facultyname", headerName: "Guest faculty", width: 200 },
    { field: "facultyemail", headerName: "Email", width: 220 }, { field: "organization", headerName: "Organization", width: 180 }, { field: "expertise", headerName: "Expertise", width: 220 }, { field: "sessiondate", headerName: "Date", width: 120 }
  ]} />;
}

const studentFilterFields = ["academicyear", "regulation", "program", "programcode", "semester", "section", "gender", "category", "Major", "Minor", "IDC"];

function StudentFilters({ filters, setFilters, options, onSearch }) {
  const optionMap = useMemo(() => {
    const rows = options.students || [];
    const map = {};
    studentFilterFields.forEach((field) => { map[field] = uniqueSorted(rows.map((row) => row[field])); });
    return map;
  }, [options.students]);
  return (
    <Grid container spacing={1.5}>
      {studentFilterFields.map((field) => (
        <Grid item xs={12} md={2} key={field}>
          <Autocomplete
            size="small"
            options={optionMap[field] || []}
            value={filters[field] || ""}
            onChange={(_, value) => setFilters((prev) => ({ ...prev, [field]: value || "" }))}
            renderInput={(params) => <TextField {...params} label={field} />}
          />
        </Grid>
      ))}
      <Grid item xs={12} md={3}><TextField fullWidth size="small" label="Search name/email/regno/phone" value={filters.search || ""} onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))} /></Grid>
      <Grid item xs={12} md={2}><Button fullWidth variant="contained" onClick={onSearch}>Apply</Button></Grid>
    </Grid>
  );
}

export function TrainingPlacementStudentAssignmentPage() {
  const { options, loadOptions } = useOptions();
  const [course, setCourse] = useState(null);
  const [event, setEvent] = useState(null);
  const [filters, setFilters] = useState({});
  const [students, setStudents] = useState([]);
  const [assigned, setAssigned] = useState([]);
  const [selected, setSelected] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const loadAssigned = async () => {
    const res = await ep1.get("/api/v2/training-placement/student", { params: basePayload() });
    setAssigned(res.data?.data || []);
  };
  useEffect(() => { loadAssigned(); }, []);
  const search = async () => {
    setLoading(true);
    try {
      const res = await ep1.post("/api/v2/training-placement/search-students", { ...basePayload(), ...filters });
      setStudents(res.data?.data || []);
      setSelected([]);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to search students");
    } finally {
      setLoading(false);
    }
  };
  const assign = async () => {
    if (!course) return setError("Select a course");
    const chosen = students.filter((row) => selected.includes(row._id));
    if (!chosen.length) return setError("Select students");
    await ep1.post("/api/v2/training-placement/assign-students", { ...basePayload(), course, event: event || {}, students: chosen });
    setMessage("Students added");
    await Promise.all([loadAssigned(), loadOptions()]);
  };
  const columns = [
    { field: "name", headerName: "Student", width: 180 }, { field: "regno", headerName: "Reg no", width: 140 }, { field: "email", headerName: "Email", width: 220 },
    { field: "program", headerName: "Program", width: 180 }, { field: "programcode", headerName: "Program code", width: 140 }, { field: "semester", headerName: "Semester", width: 110 }, { field: "section", headerName: "Section", width: 110 }
  ];
  return (
    <Shell title="Training students" subtitle="Search students dynamically and add them to training courses or events.">
      <Message message={message} error={error} clear={(type) => type === "error" ? setError("") : setMessage("")} />
      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={5}><Autocomplete options={options.courses || []} value={course} onChange={(_, value) => setCourse(value)} getOptionLabel={(option) => option ? `${option.coursecode || ""} - ${option.coursename || ""}` : ""} renderInput={(params) => <TextField {...params} label="Training course" />} /></Grid>
          <Grid item xs={12} md={5}><Autocomplete options={options.events || []} value={event} onChange={(_, value) => setEvent(value)} getOptionLabel={(option) => option ? `${option.eventcode || ""} - ${option.eventname || ""}` : ""} renderInput={(params) => <TextField {...params} label="Event optional" />} /></Grid>
          <Grid item xs={12} md={2}><Button fullWidth variant="contained" sx={{ height: "100%" }} onClick={assign}>Add selected</Button></Grid>
        </Grid>
      </Paper>
      <Paper sx={{ p: 2, mb: 2 }}><StudentFilters filters={filters} setFilters={setFilters} options={options} onSearch={search} /></Paper>
      <Grid container spacing={2}>
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 1 }}>
            <Typography fontWeight={900} sx={{ p: 1 }}>Student search results</Typography>
            <DataGrid rows={students} getRowId={(row) => row._id} columns={columns} checkboxSelection rowSelectionModel={selected} onRowSelectionModelChange={(model) => setSelected(model)} loading={loading} autoHeight slots={{ toolbar: GridToolbar }} slotProps={{ toolbar: { showQuickFilter: true } }} />
          </Paper>
        </Grid>
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 1 }}>
            <Typography fontWeight={900} sx={{ p: 1 }}>Assigned students</Typography>
            <DataGrid rows={assigned} getRowId={(row) => row._id} columns={[
              { field: "student", headerName: "Student", width: 170 }, { field: "regno", headerName: "Reg no", width: 130 }, { field: "coursename", headerName: "Course", width: 210 }, { field: "eventname", headerName: "Event", width: 180 }, { field: "completionstatus", headerName: "Status", width: 130 }
            ]} autoHeight slots={{ toolbar: GridToolbar }} slotProps={{ toolbar: { showQuickFilter: true } }} />
          </Paper>
        </Grid>
      </Grid>
    </Shell>
  );
}

export function TrainingPlacementNeedsAnalysisPage() {
  const { options } = useOptions();
  const [filters, setFilters] = useState({});
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [ai, setAi] = useState(aiDefault);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const search = async () => {
    setLoading(true);
    try {
      const res = await ep1.post("/api/v2/training-placement/search-students", { ...basePayload(), ...filters });
      setStudents(res.data?.data || []);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to search students");
    } finally {
      setLoading(false);
    }
  };
  const analyze = async () => {
    if (!selectedStudent?._id) return setError("Select a student first");
    setLoading(true);
    setError("");
    try {
      const res = await ep1.post("/api/v2/training-placement/analyze-student", { ...basePayload(), studentid: selectedStudent._id, ...ai });
      setResult(res.data?.data || null);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to analyze student");
    } finally {
      setLoading(false);
    }
  };
  const chartData = useMemo(() => {
    const marks = result?.finalMarks || [];
    return marks.map((row) => ({ course: row.coursecode, total: Number(row.total || 0) })).slice(-12);
  }, [result]);
  return (
    <Shell title="Training needs analysis" subtitle="Select a student, combine academic and extracurricular records, and identify extra training needs using AI.">
      <Message error={error} clear={() => setError("")} />
      <Paper sx={{ p: 2, mb: 2 }}><StudentFilters filters={filters} setFilters={setFilters} options={options} onSearch={search} /></Paper>
      <Grid container spacing={2}>
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 1 }}>
            <Typography fontWeight={900} sx={{ p: 1 }}>Students</Typography>
            <DataGrid rows={students} getRowId={(row) => row._id} columns={[
              { field: "name", headerName: "Student", width: 180 }, { field: "regno", headerName: "Reg no", width: 140 }, { field: "email", headerName: "Email", width: 220 }, { field: "programcode", headerName: "Program", width: 130 }, { field: "semester", headerName: "Sem", width: 90 }
            ]} loading={loading} autoHeight onRowClick={(params) => setSelectedStudent(params.row)} slots={{ toolbar: GridToolbar }} slotProps={{ toolbar: { showQuickFilter: true } }} />
          </Paper>
        </Grid>
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 2, mb: 2 }}>
            <Stack spacing={2}>
              <Typography fontWeight={900}>AI analysis controls</Typography>
              <AiControls ai={ai} setAi={setAi} options={options} />
              <Stack direction="row" spacing={1} alignItems="center">
                <Chip color={selectedStudent ? "primary" : "default"} label={selectedStudent ? `${selectedStudent.name} | ${selectedStudent.regno}` : "No student selected"} />
                <Button variant="contained" startIcon={<AutoAwesome />} disabled={!selectedStudent || loading} onClick={analyze}>{loading ? "Analyzing..." : "Analyze training need"}</Button>
              </Stack>
            </Stack>
          </Paper>
          {result && (
            <Stack spacing={2}>
              <Grid container spacing={2}>
                {[{ label: "Final marks", value: result.finalMarks?.length || 0 }, { label: "Exam model 2 marks", value: result.vivaMarks?.length || 0 }, { label: "Training records", value: result.training?.length || 0 }, { label: "Mentoring notes", value: (result.mentoring?.length || 0) + (result.homeVisits?.length || 0) }].map((item) => (
                  <Grid item xs={12} md={3} key={item.label}><Card><CardContent><Typography color="text.secondary">{item.label}</Typography><Typography variant="h4" fontWeight={900}>{item.value}</Typography></CardContent></Card></Grid>
                ))}
              </Grid>
              {!!chartData.length && <Paper sx={{ p: 2, height: 280 }}><ResponsiveContainer><BarChart data={chartData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="course" /><YAxis /><Tooltip /><Bar dataKey="total">{chartData.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}</Bar></BarChart></ResponsiveContainer></Paper>}
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" fontWeight={900}>AI recommendation</Typography>
                <Typography color="text.secondary" sx={{ mb: 1 }}>Provider: {result.provider}</Typography>
                <Box sx={{ whiteSpace: "pre-wrap", lineHeight: 1.7 }}>{result.analysis}</Box>
              </Paper>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" fontWeight={900}>Training mix</Typography>
                <Box sx={{ height: 240 }}>
                  <ResponsiveContainer>
                    <PieChart><Pie data={[{ name: "Training", value: result.training?.length || 0 }, { name: "Internship/SIP", value: (result.internships?.length || 0) + (result.sip?.length || 0) }, { name: "Mentoring", value: (result.mentoring?.length || 0) + (result.homeVisits?.length || 0) }]} dataKey="value" nameKey="name" outerRadius={90} label>{colors.map((c, i) => <Cell key={i} fill={c} />)}</Pie><Tooltip /></PieChart>
                  </ResponsiveContainer>
                </Box>
              </Paper>
            </Stack>
          )}
        </Grid>
      </Grid>
    </Shell>
  );
}
