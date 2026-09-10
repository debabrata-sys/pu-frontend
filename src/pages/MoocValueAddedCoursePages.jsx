import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import { DataGrid, GridActionsCellItem, GridToolbar } from "@mui/x-data-grid";
import { Bar, BarChart, CartesianGrid, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from "recharts";
import { Delete, Download, Edit, Print, Save, UploadFile } from "@mui/icons-material";
import * as XLSX from "xlsx";
import MenuPageShell from "./MenuPageShell";
import ep1 from "../api/ep1";
import global1 from "./global1";

const colors = ["#2563eb", "#16a34a", "#dc2626", "#f59e0b", "#7c3aed", "#0891b2"];
const courseFields = ["academicyear", "valueaddedcourse", "vaccode", "department", "description", "coursetype", "category", "provider", "credittype", "credit"];
const studentFields = ["academicyear", "regulation", "program", "programcode", "semester", "department", "valueaddedcoursecategory", "valueaddedcourse", "vaccode", "student", "regno", "marksobtained", "totalmarks", "status"];
const labels = {
  academicyear: "Academic Year",
  valueaddedcourse: "Value Added Course",
  vaccode: "VAC Code",
  department: "Department",
  description: "Description",
  coursetype: "Course Type",
  category: "Category",
  provider: "Provider",
  credittype: "Credit Type",
  credit: "Credit",
  regulation: "Regulation",
  program: "Program",
  programcode: "Program Code",
  semester: "Semester",
  valueaddedcoursecategory: "Value Added Course Category",
  student: "Student",
  regno: "Reg No",
  marksobtained: "Marks Obtained",
  totalmarks: "Total Marks",
  status: "Status"
};
const text = (value) => String(value ?? "").trim();
const shortDate = (value) => (value ? String(value).slice(0, 10) : "");
const msg = (err, fallback) => err.response?.data?.message || err.response?.data?.msg || fallback;
const gridSx = {
  "& .MuiDataGrid-cell": { whiteSpace: "normal", wordBreak: "break-word", lineHeight: 1.3, alignItems: "flex-start", py: 1 },
  "& .MuiDataGrid-columnHeaderTitle": { whiteSpace: "normal", lineHeight: 1.2 }
};

function downloadRows(filename, rows) {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Data");
  XLSX.writeFile(wb, filename);
}

async function readExcel(file) {
  const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
  return XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: "" });
}

function PrintHeader({ institution = {}, title }) {
  const logo = institution.logolink || institution.logo || global1.logo || "";
  return (
    <Box sx={{ textAlign: "center", mb: 2 }}>
      {logo && <Box component="img" src={logo} alt="logo" sx={{ height: 66, objectFit: "contain", mb: 0.5 }} />}
      <Typography variant="h5" fontWeight={950}>{institution.institutionname || institution.insname || institution.name || global1.insname || "Institution"}</Typography>
      <Typography sx={{ fontSize: 13 }}>{institution.address || ""}</Typography>
      <Typography variant="h6" fontWeight={950} sx={{ mt: 1 }}>{title}</Typography>
    </Box>
  );
}

function DynamicFilterPanel({ fields, options = {}, filters, setFilters, onApply }) {
  const update = (index, patch) => setFilters(filters.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  return (
    <Paper className="screen-only" elevation={0} sx={{ p: 2, border: "1px solid #e5e7eb", borderRadius: 2 }}>
      <Typography fontWeight={900} sx={{ mb: 1 }}>Dynamic Filters</Typography>
      <Stack spacing={1}>
        {filters.map((filter, index) => (
          <Grid container spacing={1} key={index}>
            <Grid item xs={12} md={4}>
              <TextField select fullWidth size="small" label="Field" value={filter.field} onChange={(e) => update(index, { field: e.target.value, value: "" })}>
                {fields.map((field) => <MenuItem key={field} value={field}>{labels[field] || field}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <Autocomplete
                freeSolo
                options={options[filter.field] || []}
                value={filter.value || ""}
                onInputChange={(_, value) => update(index, { value })}
                renderInput={(params) => <TextField {...params} size="small" label="Value" />}
              />
            </Grid>
            <Grid item xs={12} md={2}><Button fullWidth color="error" variant="outlined" onClick={() => setFilters(filters.filter((_, i) => i !== index))}>Remove</Button></Grid>
          </Grid>
        ))}
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" onClick={() => setFilters([...filters, { field: fields[0], value: "" }])}>Add Filter</Button>
          <Button variant="contained" onClick={onApply}>Apply</Button>
        </Stack>
      </Stack>
    </Paper>
  );
}

const filterParams = (filters = []) => filters.reduce((acc, row) => {
  if (row.field && text(row.value)) acc[row.field] = row.value;
  return acc;
}, {});

export function MoocValueAddedCourseMasterPage() {
  const [rows, setRows] = useState([]);
  const [options, setOptions] = useState({});
  const [form, setForm] = useState({ coursetype: "Value added", credittype: "Credit" });
  const [selected, setSelected] = useState([]);
  const [filters, setFilters] = useState([{ field: "academicyear", value: "" }]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadRows = async () => {
    try {
      const res = await ep1.get("/api/v2/mooc-value-added/courses", { params: { colid: global1.colid, ...filterParams(filters) } });
      setRows(res.data?.data || []);
      setOptions(res.data?.options || {});
    } catch (err) {
      setError(msg(err, "Unable to load courses"));
    }
  };
  useEffect(() => { loadRows(); }, []);
  const save = async () => {
    try {
      await ep1.post("/api/v2/mooc-value-added/courses", { ...form, colid: global1.colid, user: global1.user, name: global1.name });
      setForm({ coursetype: "Value added", credittype: "Credit" });
      setMessage("Course saved.");
      loadRows();
    } catch (err) {
      setError(msg(err, "Unable to save course"));
    }
  };
  const deleteRows = async (ids) => {
    if (!ids.length || !window.confirm(`Delete ${ids.length} course record(s)?`)) return;
    await ep1.post("/api/v2/mooc-value-added/courses-delete", { colid: global1.colid, ids });
    setSelected([]);
    loadRows();
  };
  const upload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const rows = await readExcel(file);
      const res = await ep1.post("/api/v2/mooc-value-added/courses-bulk", { colid: global1.colid, user: global1.user, name: global1.name, rows });
      setMessage(`${res.data?.saved || 0} courses uploaded.`);
      loadRows();
    } catch (err) {
      setError(msg(err, "Unable to bulk upload courses"));
    }
  };
  const columns = [
    { field: "actions", type: "actions", width: 110, getActions: (p) => [
      <GridActionsCellItem icon={<Edit />} label="Edit" onClick={() => setForm({ ...p.row, id: p.row._id })} />,
      <GridActionsCellItem icon={<Delete />} label="Delete" onClick={() => deleteRows([p.row._id])} />
    ] },
    ...courseFields.map((field) => ({ field, headerName: labels[field] || field, minWidth: ["description", "valueaddedcourse"].includes(field) ? 220 : 140, flex: ["description", "valueaddedcourse"].includes(field) ? 1 : undefined }))
  ];
  return (
    <MenuPageShell title="MOOC / Value Added Course Master">
      <Stack spacing={2} sx={{ p: 2 }}>
        {error && <Alert severity="error" onClose={() => setError("")}>{error}</Alert>}
        {message && <Alert severity="success" onClose={() => setMessage("")}>{message}</Alert>}
        <Paper sx={{ p: 2 }}>
          <Grid container spacing={1.5}>
            {courseFields.map((field) => (
              <Grid item xs={12} md={["description", "valueaddedcourse"].includes(field) ? 4 : 2} key={field}>
                {["academicyear", "department"].includes(field) ? (
                  <Autocomplete
                    freeSolo
                    options={options[field] || []}
                    value={form[field] || ""}
                    onInputChange={(_, value) => setForm({ ...form, [field]: value })}
                    onChange={(_, value) => setForm({ ...form, [field]: value || "" })}
                    renderInput={(params) => <TextField {...params} fullWidth size="small" label={labels[field] || field} />}
                  />
                ) : (
                  <TextField
                    fullWidth
                    select={["coursetype", "credittype"].includes(field)}
                    multiline={field === "description"}
                    minRows={field === "description" ? 2 : undefined}
                    size="small"
                    type={field === "credit" ? "number" : "text"}
                    label={labels[field] || field}
                    value={form[field] || ""}
                    onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                  >
                    {field === "coursetype" && ["Certificate", "Value added"].map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}
                    {field === "credittype" && ["Credit", "Non credit"].map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}
                  </TextField>
                )}
              </Grid>
            ))}
            <Grid item xs={12}>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                <Button variant="contained" startIcon={<Save />} onClick={save}>Save</Button>
                <Button variant="outlined" onClick={() => setForm({ coursetype: "Value added", credittype: "Credit" })}>Clear</Button>
                <Button variant="outlined" startIcon={<Download />} onClick={() => downloadRows("mooc_value_added_course_template.xlsx", [courseFields.reduce((a, f) => ({ ...a, [f]: "" }), {})])}>Template</Button>
                <Button component="label" variant="outlined" startIcon={<UploadFile />}>Bulk Upload<input hidden type="file" accept=".xlsx,.xls,.csv" onChange={upload} /></Button>
                <Button color="error" variant="outlined" disabled={!selected.length} onClick={() => deleteRows(selected)}>Bulk Delete</Button>
              </Stack>
            </Grid>
          </Grid>
        </Paper>
        <DynamicFilterPanel fields={courseFields} options={options} filters={filters} setFilters={setFilters} onApply={loadRows} />
        <Box sx={{ height: 620 }}><DataGrid rows={rows} columns={columns} getRowId={(row) => row._id} checkboxSelection rowSelectionModel={selected} onRowSelectionModelChange={setSelected} slots={{ toolbar: GridToolbar }} sx={gridSx} pageSizeOptions={[25, 50, 100]} /></Box>
      </Stack>
    </MenuPageShell>
  );
}

export function MoocValueAddedOfferingPage() {
  const [options, setOptions] = useState({ courses: [], students: [] });
  const [rows, setRows] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);
  const [form, setForm] = useState({ academicyear: "", category: "", courses: [], startdate: "", enddate: "", syllabus: [{ module: "", topics: "", description: "", order: 1 }] });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadOptions = async () => {
    const res = await ep1.get("/api/v2/mooc-value-added/options", { params: { colid: global1.colid } });
    setOptions(res.data || {});
  };
  const loadRows = async () => {
    const res = await ep1.get("/api/v2/mooc-value-added/offerings", { params: { colid: global1.colid } });
    setRows(res.data?.data || []);
  };
  useEffect(() => { loadOptions(); loadRows(); }, []);
  const selectedCourseObjects = useMemo(() => form.courses || [], [form.courses]);
  const saveOfferings = async () => {
    try {
      for (const course of selectedCourseObjects) {
        await ep1.post("/api/v2/mooc-value-added/offerings", {
          colid: global1.colid,
          user: global1.user,
          name: global1.name,
          academicyear: form.academicyear,
          category: form.category || course.category,
          courseid: course._id,
              valueaddedcourse: course.valueaddedcourse,
              vaccode: course.vaccode,
          coursetype: course.coursetype,
          provider: course.provider,
          credittype: course.credittype,
          credit: course.credit,
          startdate: form.startdate,
          enddate: form.enddate,
          syllabus: form.syllabus
        });
      }
      setMessage(`${selectedCourseObjects.length} course offering(s) saved.`);
      loadRows();
    } catch (err) {
      setError(msg(err, "Unable to save offerings"));
    }
  };
  const deleteOfferings = async () => {
    if (!selectedRows.length || !window.confirm("Delete selected offerings and linked student rows?")) return;
    await ep1.post("/api/v2/mooc-value-added/offerings-delete", { colid: global1.colid, ids: selectedRows });
    setSelectedRows([]);
    loadRows();
  };
  const offeringColumns = [
    { field: "valueaddedcourse", headerName: "Course", minWidth: 230, flex: 1 },
    { field: "vaccode", headerName: "VAC Code", minWidth: 130 },
    { field: "academicyear", headerName: "Academic Year", minWidth: 130 },
    { field: "category", headerName: "Category", minWidth: 150 },
    { field: "startdate", headerName: "Start Date", minWidth: 120, valueGetter: (p) => shortDate(p.row.startdate) },
    { field: "enddate", headerName: "End Date", minWidth: 120, valueGetter: (p) => shortDate(p.row.enddate) },
    { field: "modulecount", headerName: "Modules", minWidth: 100, valueGetter: (p) => p.row.syllabus?.length || 0 }
  ];
  return (
    <MenuPageShell title="MOOC / Value Added Course Offering">
      <Stack spacing={2} sx={{ p: 2 }}>
        {error && <Alert severity="error" onClose={() => setError("")}>{error}</Alert>}
        {message && <Alert severity="success" onClose={() => setMessage("")}>{message}</Alert>}
        <Paper sx={{ p: 2 }}>
          <Grid container spacing={1.5}>
            <Grid item xs={12} md={2}><Autocomplete freeSolo options={options.courseOptions?.academicyear || []} value={form.academicyear} onInputChange={(_, value) => setForm({ ...form, academicyear: value })} onChange={(_, value) => setForm({ ...form, academicyear: value || "" })} renderInput={(params) => <TextField {...params} fullWidth size="small" label="Academic Year" />} /></Grid>
            <Grid item xs={12} md={3}><Autocomplete freeSolo options={options.courseOptions?.category || []} value={form.category} onInputChange={(_, value) => setForm({ ...form, category: value })} renderInput={(params) => <TextField {...params} size="small" label="Category" />} /></Grid>
            <Grid item xs={12} md={5}>
              <Autocomplete
                multiple
                options={options.courses || []}
                getOptionLabel={(o) => `${o.valueaddedcourse || ""} (${o.vaccode || ""})`}
                value={form.courses}
                onChange={(_, value) => setForm({ ...form, courses: value })}
                renderInput={(params) => <TextField {...params} size="small" label="Courses" />}
              />
            </Grid>
            <Grid item xs={12} md={1}><TextField fullWidth size="small" type="date" label="Start" InputLabelProps={{ shrink: true }} value={form.startdate} onChange={(e) => setForm({ ...form, startdate: e.target.value })} /></Grid>
            <Grid item xs={12} md={1}><TextField fullWidth size="small" type="date" label="End" InputLabelProps={{ shrink: true }} value={form.enddate} onChange={(e) => setForm({ ...form, enddate: e.target.value })} /></Grid>
          </Grid>
        </Paper>
        <Paper sx={{ p: 2 }}>
          <Typography fontWeight={900} sx={{ mb: 1 }}>Modulewise Syllabus</Typography>
          <Stack spacing={1}>
            {(form.syllabus || []).map((row, index) => (
              <Grid container spacing={1} key={index}>
                <Grid item xs={12} md={1}><TextField fullWidth size="small" type="number" label="Order" value={row.order || index + 1} onChange={(e) => setForm({ ...form, syllabus: form.syllabus.map((r, i) => i === index ? { ...r, order: e.target.value } : r) })} /></Grid>
                <Grid item xs={12} md={3}><TextField fullWidth size="small" label="Module" value={row.module || ""} onChange={(e) => setForm({ ...form, syllabus: form.syllabus.map((r, i) => i === index ? { ...r, module: e.target.value } : r) })} /></Grid>
                <Grid item xs={12} md={4}><TextField fullWidth size="small" label="Topics" value={row.topics || ""} onChange={(e) => setForm({ ...form, syllabus: form.syllabus.map((r, i) => i === index ? { ...r, topics: e.target.value } : r) })} /></Grid>
                <Grid item xs={12} md={3}><TextField fullWidth size="small" label="Description" value={row.description || ""} onChange={(e) => setForm({ ...form, syllabus: form.syllabus.map((r, i) => i === index ? { ...r, description: e.target.value } : r) })} /></Grid>
                <Grid item xs={12} md={1}><Button color="error" onClick={() => setForm({ ...form, syllabus: form.syllabus.filter((_, i) => i !== index) })}>Delete</Button></Grid>
              </Grid>
            ))}
            <Stack direction="row" spacing={1}><Button variant="outlined" onClick={() => setForm({ ...form, syllabus: [...(form.syllabus || []), { order: (form.syllabus?.length || 0) + 1, module: "", topics: "", description: "" }] })}>Add module</Button><Button variant="contained" onClick={saveOfferings}>Save selected courses</Button></Stack>
          </Stack>
        </Paper>
        <Paper sx={{ p: 2 }}>
          <Stack direction="row" spacing={1} sx={{ mb: 1 }}><Button color="error" variant="outlined" disabled={!selectedRows.length} onClick={deleteOfferings}>Bulk Delete Offerings</Button></Stack>
          <Box sx={{ height: 420 }}><DataGrid rows={rows} columns={offeringColumns} getRowId={(row) => row._id} checkboxSelection rowSelectionModel={selectedRows} onRowSelectionModelChange={setSelectedRows} slots={{ toolbar: GridToolbar }} sx={gridSx} /></Box>
        </Paper>
      </Stack>
    </MenuPageShell>
  );
}

const userStudentFilterFields = ["academicyear", "admissionyear", "regulation", "program", "programcode", "semester", "section", "department", "gender", "name", "regno", "email", "phone"];
const studentResultCrudFields = ["academicyear", "regulation", "program", "programcode", "semester", "department", "valueaddedcoursecategory", "valueaddedcourse", "vaccode", "student", "regno", "marksobtained", "totalmarks", "status"];

function optionsFromRows(rows = [], fields = []) {
  return fields.reduce((acc, field) => {
    acc[field] = Array.from(new Set(rows.map((row) => text(row[field])).filter(Boolean))).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    return acc;
  }, {});
}

function rowMatchesFilters(row, filters = []) {
  return filters.every((filter) => !filter.field || !text(filter.value) || text(row[filter.field]).toLowerCase().includes(text(filter.value).toLowerCase()));
}

export function MoocValueAddedStudentsPage() {
  const [options, setOptions] = useState({ courses: [], students: [] });
  const [offerings, setOfferings] = useState([]);
  const [studentMasterRows, setStudentMasterRows] = useState([]);
  const [resultRows, setResultRows] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [selectedResults, setSelectedResults] = useState([]);
  const [studentFilters, setStudentFilters] = useState([{ field: "academicyear", value: "" }]);
  const [resultFilters, setResultFilters] = useState([{ field: "academicyear", value: "" }]);
  const [selectedOffering, setSelectedOffering] = useState(null);
  const [defaultResult, setDefaultResult] = useState({ marksobtained: 0, totalmarks: 100, status: "Pass" });
  const [editingRow, setEditingRow] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadOptions = async () => {
    const res = await ep1.get("/api/v2/mooc-value-added/options", { params: { colid: global1.colid } });
    setOptions(res.data || {});
    setStudentMasterRows(res.data?.students || []);
  };
  const loadOfferings = async () => {
    const res = await ep1.get("/api/v2/mooc-value-added/offerings", { params: { colid: global1.colid } });
    setOfferings(res.data?.data || []);
  };
  const loadResults = async () => {
    const res = await ep1.get("/api/v2/mooc-value-added/students", { params: { colid: global1.colid, ...filterParams(resultFilters) } });
    setResultRows(res.data?.data || []);
  };
  useEffect(() => { loadOptions(); loadOfferings(); loadResults(); }, []);

  const studentFilterOptions = useMemo(() => optionsFromRows(studentMasterRows, userStudentFilterFields), [studentMasterRows]);
  const filteredStudents = useMemo(() => studentMasterRows.filter((row) => rowMatchesFilters(row, studentFilters)), [studentMasterRows, studentFilters]);
  const resultOptions = useMemo(() => ({ ...(options.studentOptions || {}), ...optionsFromRows(resultRows, studentResultCrudFields) }), [options, resultRows]);

  const selectedStudentRows = filteredStudents.filter((row) => selectedStudents.includes(row._id || row.regno || row.email));

  const addSelectedStudents = async () => {
    if (!selectedOffering?._id) {
      setError("Select an offering before adding students.");
      return;
    }
    if (!selectedStudentRows.length) {
      setError("Select at least one student.");
      return;
    }
    const rows = selectedStudentRows.map((student) => ({
      offeringid: selectedOffering._id,
      academicyear: selectedOffering.academicyear || student.academicyear || "",
      regulation: student.regulation || "",
      program: student.program || "",
      programcode: student.programcode || "",
      semester: student.semester || "",
      department: student.department || "",
      valueaddedcoursecategory: selectedOffering.category || "",
      valueaddedcourse: selectedOffering.valueaddedcourse || "",
      vaccode: selectedOffering.vaccode || "",
      student: student.name || "",
      regno: student.regno || "",
      marksobtained: defaultResult.marksobtained,
      totalmarks: defaultResult.totalmarks,
      status: defaultResult.status
    }));
    try {
      const res = await ep1.post("/api/v2/mooc-value-added/students", { colid: global1.colid, user: global1.user, name: global1.name, rows });
      setMessage(`${res.data?.saved || 0} student(s) added to ${selectedOffering.valueaddedcourse}.`);
      setSelectedStudents([]);
      loadResults();
    } catch (err) {
      setError(msg(err, "Unable to add selected students"));
    }
  };

  const saveResultRow = async () => {
    if (!editingRow) return;
    try {
      const row = { ...editingRow, id: editingRow._id };
      const res = await ep1.post("/api/v2/mooc-value-added/students", { colid: global1.colid, user: global1.user, name: global1.name, rows: [row] });
      setMessage(`${res.data?.saved || 0} student result saved.`);
      setEditingRow(null);
      loadResults();
    } catch (err) {
      setError(msg(err, "Unable to save student result"));
    }
  };

  const deleteResults = async (ids = selectedResults) => {
    if (!ids.length || !window.confirm(`Delete ${ids.length} student result record(s)?`)) return;
    await ep1.post("/api/v2/mooc-value-added/students-delete", { colid: global1.colid, ids });
    setSelectedResults([]);
    loadResults();
  };

  const uploadResults = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const rows = await readExcel(file);
      const res = await ep1.post("/api/v2/mooc-value-added/students", { colid: global1.colid, user: global1.user, name: global1.name, rows });
      setMessage(`${res.data?.saved || 0} student result(s) uploaded.`);
      loadResults();
    } catch (err) {
      setError(msg(err, "Unable to bulk upload student results"));
    }
  };

  const studentColumns = [
    { field: "name", headerName: "Student", minWidth: 190, flex: 1 },
    { field: "regno", headerName: "Reg No", minWidth: 130 },
    { field: "academicyear", headerName: "Academic Year", minWidth: 130 },
    { field: "regulation", headerName: "Regulation", minWidth: 130 },
    { field: "program", headerName: "Program", minWidth: 180 },
    { field: "programcode", headerName: "Program Code", minWidth: 130 },
    { field: "semester", headerName: "Semester", minWidth: 110 },
    { field: "section", headerName: "Section", minWidth: 100 },
    { field: "department", headerName: "Department", minWidth: 150 },
    { field: "email", headerName: "Email", minWidth: 190 }
  ];
  const resultColumns = [
    { field: "actions", type: "actions", width: 120, getActions: (p) => [
      <GridActionsCellItem icon={<Edit />} label="Edit" onClick={() => setEditingRow({ ...p.row })} />,
      <GridActionsCellItem icon={<Delete />} label="Delete" onClick={() => deleteResults([p.row._id])} />
    ] },
    ...studentResultCrudFields.map((field) => ({ field, headerName: labels[field] || field, minWidth: ["student", "valueaddedcourse"].includes(field) ? 190 : 130, flex: ["student", "valueaddedcourse"].includes(field) ? 1 : undefined }))
  ];

  return (
    <MenuPageShell title="MOOC / Value Added Course Students">
      <Stack spacing={2} sx={{ p: 2 }}>
        {error && <Alert severity="error" onClose={() => setError("")}>{error}</Alert>}
        {message && <Alert severity="success" onClose={() => setMessage("")}>{message}</Alert>}
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" fontWeight={900} sx={{ mb: 1 }}>Add students to offering</Typography>
          <Grid container spacing={1.5}>
            <Grid item xs={12} md={5}>
              <Autocomplete
                options={offerings}
                getOptionLabel={(o) => `${o.academicyear || ""} - ${o.valueaddedcourse || ""} (${o.vaccode || ""})`}
                value={selectedOffering}
                onChange={(_, value) => setSelectedOffering(value)}
                renderInput={(params) => <TextField {...params} size="small" label="Offering" />}
              />
            </Grid>
            <Grid item xs={12} md={2}><TextField fullWidth size="small" type="number" label="Marks obtained" value={defaultResult.marksobtained} onChange={(e) => setDefaultResult({ ...defaultResult, marksobtained: e.target.value })} /></Grid>
            <Grid item xs={12} md={2}><TextField fullWidth size="small" type="number" label="Total marks" value={defaultResult.totalmarks} onChange={(e) => setDefaultResult({ ...defaultResult, totalmarks: e.target.value })} /></Grid>
            <Grid item xs={12} md={2}><TextField select fullWidth size="small" label="Status" value={defaultResult.status} onChange={(e) => setDefaultResult({ ...defaultResult, status: e.target.value })}>{["Pass", "Fail", "Ongoing"].map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}</TextField></Grid>
            <Grid item xs={12} md={1}><Button fullWidth variant="contained" onClick={addSelectedStudents}>Add</Button></Grid>
          </Grid>
        </Paper>
        <DynamicFilterPanel fields={userStudentFilterFields} options={studentFilterOptions} filters={studentFilters} setFilters={setStudentFilters} onApply={() => setStudentFilters([...studentFilters])} />
        <Paper sx={{ p: 2 }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }} flexWrap="wrap">
            <Typography fontWeight={900}>Student search result</Typography>
            <Chip label={`${filteredStudents.length} matched`} />
            <Chip label={`${selectedStudents.length} selected`} />
          </Stack>
          <Box sx={{ height: 430 }}>
            <DataGrid
              rows={filteredStudents}
              columns={studentColumns}
              getRowId={(row) => row._id || row.regno || row.email}
              checkboxSelection
              rowSelectionModel={selectedStudents}
              onRowSelectionModelChange={setSelectedStudents}
              slots={{ toolbar: GridToolbar }}
              sx={gridSx}
              pageSizeOptions={[25, 50, 100]}
            />
          </Box>
        </Paper>
        {editingRow && <Paper sx={{ p: 2 }}>
          <Typography variant="h6" fontWeight={900} sx={{ mb: 1 }}>Edit student result</Typography>
          <Grid container spacing={1.5}>
            {studentResultCrudFields.map((field) => (
              <Grid item xs={12} md={["student", "valueaddedcourse"].includes(field) ? 4 : 2} key={field}>
                <Autocomplete
                  freeSolo
                  options={resultOptions[field] || []}
                  value={editingRow[field] || ""}
                  onInputChange={(_, value) => setEditingRow({ ...editingRow, [field]: value })}
                  renderInput={(params) => <TextField {...params} fullWidth size="small" type={["marksobtained", "totalmarks"].includes(field) ? "number" : "text"} label={labels[field] || field} />}
                />
              </Grid>
            ))}
            <Grid item xs={12}>
              <Stack direction="row" spacing={1}>
                <Button variant="contained" onClick={saveResultRow}>Save</Button>
                <Button variant="outlined" onClick={() => setEditingRow(null)}>Cancel</Button>
              </Stack>
            </Grid>
          </Grid>
        </Paper>}
        <DynamicFilterPanel fields={studentFields} options={resultOptions} filters={resultFilters} setFilters={setResultFilters} onApply={loadResults} />
        <Paper sx={{ p: 2 }}>
          <Stack direction="row" spacing={1} sx={{ mb: 1 }} flexWrap="wrap">
            <Typography fontWeight={900} sx={{ mr: 1 }}>Enrolled / result records</Typography>
            <Button variant="outlined" startIcon={<Download />} onClick={() => downloadRows("mooc_value_added_students_template.xlsx", [studentFields.reduce((a, f) => ({ ...a, [f]: "" }), {})])}>Template</Button>
            <Button component="label" variant="outlined" startIcon={<UploadFile />}>Bulk Upload<input hidden type="file" accept=".xlsx,.xls,.csv" onChange={uploadResults} /></Button>
            <Button color="error" variant="outlined" disabled={!selectedResults.length} onClick={() => deleteResults()}>Bulk Delete</Button>
            <Button variant="outlined" onClick={() => downloadRows("mooc_value_added_students_export.xlsx", resultRows)}>Export</Button>
          </Stack>
          <Box sx={{ height: 540 }}>
            <DataGrid
              rows={resultRows}
              columns={resultColumns}
              getRowId={(row) => row._id}
              checkboxSelection
              rowSelectionModel={selectedResults}
              onRowSelectionModelChange={setSelectedResults}
              slots={{ toolbar: GridToolbar }}
              sx={gridSx}
              pageSizeOptions={[25, 50, 100]}
            />
          </Box>
        </Paper>
      </Stack>
    </MenuPageShell>
  );
}

export function MoocValueAddedReportPage() {
  const [filters, setFilters] = useState([{ field: "academicyear", value: "" }]);
  const [options, setOptions] = useState({});
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");
  const loadOptions = async () => {
    const res = await ep1.get("/api/v2/mooc-value-added/options", { params: { colid: global1.colid } });
    setOptions(res.data?.studentOptions || {});
  };
  const loadReport = async () => {
    try {
      const res = await ep1.post("/api/v2/mooc-value-added/report", { colid: global1.colid, filters: filterParams(filters) });
      setReport(res.data);
    } catch (err) {
      setError(msg(err, "Unable to load report"));
    }
  };
  useEffect(() => { loadOptions(); loadReport(); }, []);
  const summary = report?.summary || {};
  return (
    <MenuPageShell title="MOOC / Value Added Course Report">
      <Stack spacing={2} sx={{ p: 2 }}>
        {error && <Alert severity="error" onClose={() => setError("")}>{error}</Alert>}
        <DynamicFilterPanel fields={studentFields} options={options} filters={filters} setFilters={setFilters} onApply={loadReport} />
        {report && <Box className="print-area" sx={{ bgcolor: "#fff", p: 2 }}>
          <PrintHeader institution={report.institution} title="MOOC / Value Added Course Report" />
          <Grid container spacing={2} sx={{ mb: 2 }}>
            {[["Students", summary.total], ["Passed", summary.passed], ["Failed", summary.failed], ["Pass %", summary.passpercentage]].map(([label, value]) => <Grid item xs={12} md={3} key={label}><Card><CardContent><Typography color="text.secondary">{label}</Typography><Typography variant="h4" fontWeight={950}>{value || 0}</Typography></CardContent></Card></Grid>)}
          </Grid>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}><Paper sx={{ p: 2, height: 320 }}><Typography fontWeight={900}>Coursewise Pass / Fail</Typography><ResponsiveContainer><BarChart data={report.charts?.byCourse || []}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Legend /><Bar dataKey="pass" fill="#16a34a" /><Bar dataKey="fail" fill="#dc2626" /></BarChart></ResponsiveContainer></Paper></Grid>
            <Grid item xs={12} md={6}><Paper sx={{ p: 2, height: 320 }}><Typography fontWeight={900}>Categorywise Students</Typography><ResponsiveContainer><PieChart><Pie data={report.charts?.byCategory || []} dataKey="total" nameKey="name" label>{(report.charts?.byCategory || []).map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer></Paper></Grid>
          </Grid>
          <Typography variant="h6" fontWeight={950} sx={{ mt: 2 }}>Syllabus Summary</Typography>
          <Box sx={{ height: 280, mb: 2 }}><DataGrid rows={report.syllabusSummary || []} columns={[{ field: "valueaddedcourse", headerName: "Course", minWidth: 220, flex: 1 }, { field: "vaccode", headerName: "VAC Code", width: 130 }, { field: "category", headerName: "Category", width: 150 }, { field: "modulecount", headerName: "Modules", width: 110 }, { field: "topiccount", headerName: "Topics", width: 110 }]} getRowId={(row) => row.offeringid || row.vaccode} slots={{ toolbar: GridToolbar }} sx={gridSx} /></Box>
          <Typography variant="h6" fontWeight={950}>Student Details</Typography>
          <Box sx={{ height: 520 }}><DataGrid rows={report.students || []} columns={studentFields.map((field) => ({ field, headerName: labels[field] || field, minWidth: ["student", "valueaddedcourse"].includes(field) ? 190 : 130 }))} getRowId={(row) => row._id} slots={{ toolbar: GridToolbar }} sx={gridSx} /></Box>
        </Box>}
        <Button className="screen-only" variant="outlined" startIcon={<Print />} onClick={() => window.print()}>Print Preview</Button>
        <style>{`@media print { body * { visibility:hidden; } .print-area, .print-area * { visibility: visible; color:#000!important; } .print-area { position:absolute; left:0; top:0; width:100%; } .screen-only, .MuiDataGrid-toolbarContainer { display:none!important; } }`}</style>
      </Stack>
    </MenuPageShell>
  );
}

function Certificate({ record, student, institution }) {
  return (
    <Paper className="certificate-print" sx={{ width: "277mm", minHeight: "190mm", mx: "auto", p: "12mm", bgcolor: "#fff", border: "8px double #1d4ed8", color: "#000", textAlign: "center", position: "relative", "& *": { color: "#000 !important" } }}>
      <PrintHeader institution={institution} title="Certificate of Completion" />
      <Typography sx={{ mt: 5, fontSize: 22 }}>This is to certify that</Typography>
      <Typography sx={{ mt: 2, fontSize: 34, fontWeight: 950 }}>{student?.name || record.student}</Typography>
      <Typography sx={{ mt: 1, fontSize: 16 }}>Reg No: {record.regno}</Typography>
      <Typography sx={{ mt: 4, fontSize: 20, lineHeight: 1.6 }}>
        has successfully completed <b>{record.valueaddedcourse}</b> ({record.vaccode}) under {record.valueaddedcoursecategory || record.offering?.category || "Add on course"} during {record.academicyear}.
      </Typography>
      <Stack direction="row" justifyContent="center" spacing={2} sx={{ mt: 3 }}>
        <Chip label={`Marks: ${record.marksobtained || 0}/${record.totalmarks || 0}`} />
        <Chip color="success" label={`Status: ${record.status}`} />
        {record.offering?.credit && <Chip label={`Credit: ${record.offering.credit}`} />}
      </Stack>
      <Stack direction="row" justifyContent="space-between" sx={{ mt: 10, px: 6 }}>
        <Typography fontWeight={900}>Course Coordinator</Typography>
        <Typography fontWeight={900}>Authorized Signatory</Typography>
      </Stack>
    </Paper>
  );
}

const certificateTemplates = Array.from({ length: 10 }).map((_, index) => ({
  id: `template-${index + 1}`,
  name: [
    "Classic Blue Border", "Modern Minimal", "Academic Gold", "Professional Seal", "Landscape Ribbon",
    "Compact Registrar", "Elegant Serif", "Skill Badge", "Formal Completion", "Clean International"
  ][index],
  html: `
    <div class="cert cert-${index + 1}">
      <div class="header">{{logoImg}}<h1>{{institution}}</h1><p>{{address}}</p></div>
      <h2>${index % 2 === 0 ? "Certificate of Completion" : "Certificate of Achievement"}</h2>
      <p class="lead">This is to certify that</p>
      <h3>{{student}}</h3>
      <p>Reg No: <b>{{regno}}</b></p>
      <p>has successfully completed <b>{{course}}</b> ({{vaccode}}) during <b>{{academicyear}}</b>.</p>
      <p>Category: {{category}} | Marks: {{marksobtained}} / {{totalmarks}} | Status: {{status}}</p>
      <div class="sign"><span>Course Coordinator</span><span>Authorized Signatory</span></div>
    </div>`
}));

function renderTemplate(template, record, institution = {}) {
  const logo = institution.logolink || institution.logo || global1.logo || "";
  const map = {
    institution: institution.institutionname || institution.insname || institution.name || global1.insname || "Institution",
    address: institution.address || "",
    logo,
    logoImg: logo ? `<img src="${logo}" style="max-height:64px;object-fit:contain" />` : "",
    student: record.student || "",
    regno: record.regno || "",
    course: record.valueaddedcourse || "",
    vaccode: record.vaccode || "",
    academicyear: record.academicyear || "",
    category: record.valueaddedcoursecategory || "",
    marksobtained: record.marksobtained ?? "",
    totalmarks: record.totalmarks ?? "",
    status: record.status || "",
    semester: record.semester || "",
    department: record.department || "",
    program: record.program || "",
    programcode: record.programcode || "",
    date: new Date().toLocaleDateString("en-IN")
  };
  return Object.entries(map).reduce((html, [key, value]) => html.replaceAll(`{{${key}}}`, String(value ?? "")), template || "");
}

export function MoocValueAddedCertificateGeneratorPage() {
  const [rows, setRows] = useState([]);
  const [options, setOptions] = useState({});
  const [institution, setInstitution] = useState({});
  const [filters, setFilters] = useState([{ field: "academicyear", value: "" }]);
  const [selected, setSelected] = useState([]);
  const [templateId, setTemplateId] = useState("template-1");
  const [customHtml, setCustomHtml] = useState("");
  const [useCustom, setUseCustom] = useState(false);
  const [error, setError] = useState("");
  const load = async () => {
    try {
      const [studentRes, optionRes] = await Promise.all([
        ep1.get("/api/v2/mooc-value-added/students", { params: { colid: global1.colid, status: "Pass", ...filterParams(filters) } }),
        ep1.get("/api/v2/mooc-value-added/options", { params: { colid: global1.colid } })
      ]);
      setRows(studentRes.data?.data || []);
      setOptions(studentRes.data?.options || optionRes.data?.studentOptions || {});
      setInstitution(optionRes.data?.institution || {});
    } catch (err) {
      setError(msg(err, "Unable to load certificate data"));
    }
  };
  useEffect(() => { load(); }, []);
  const selectedRows = rows.filter((row) => selected.includes(row._id));
  const activeTemplate = useCustom ? customHtml : certificateTemplates.find((item) => item.id === templateId)?.html;
  const uploadTemplate = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setCustomHtml(await file.text());
    setUseCustom(true);
  };
  const columns = studentFields.map((field) => ({ field, headerName: labels[field] || field, minWidth: ["student", "valueaddedcourse"].includes(field) ? 190 : 130 }));
  return (
    <MenuPageShell title="Add on Course Certificate Generator">
      <Stack spacing={2} sx={{ p: 2 }}>
        {error && <Alert severity="error" onClose={() => setError("")}>{error}</Alert>}
        <Paper className="screen-only" sx={{ p: 2 }}>
          <Typography variant="h5" fontWeight={950}>Single / Bulk Certificate Generation</Typography>
          <Typography color="text.secondary">Custom HTML supports placeholders: {"{{student}}, {{regno}}, {{course}}, {{vaccode}}, {{academicyear}}, {{category}}, {{semester}}, {{department}}, {{program}}, {{programcode}}, {{marksobtained}}, {{totalmarks}}, {{institution}}, {{address}}, {{logoImg}}, {{date}}"}.</Typography>
        </Paper>
        <DynamicFilterPanel fields={studentFields} options={options} filters={filters} setFilters={setFilters} onApply={load} />
        <Paper className="screen-only" sx={{ p: 2 }}>
          <Grid container spacing={1.5} alignItems="center">
            <Grid item xs={12} md={3}><TextField select fullWidth label="Certificate Template" value={templateId} onChange={(e) => { setTemplateId(e.target.value); setUseCustom(false); }}>{certificateTemplates.map((item) => <MenuItem key={item.id} value={item.id}>{item.name}</MenuItem>)}</TextField></Grid>
            <Grid item xs={12} md={2}><Button component="label" fullWidth variant="outlined" startIcon={<UploadFile />}>Upload HTML<input hidden type="file" accept=".html,.txt" onChange={uploadTemplate} /></Button></Grid>
            <Grid item xs={12} md={2}><Button fullWidth variant="outlined" startIcon={<Print />} disabled={!selectedRows.length} onClick={() => window.print()}>Print Selected</Button></Grid>
            <Grid item xs={12} md={5}><TextField fullWidth size="small" label="Custom HTML loaded" value={useCustom ? "Yes" : "No"} InputProps={{ readOnly: true }} /></Grid>
            <Grid item xs={12}>{useCustom && <TextField fullWidth multiline minRows={5} label="Custom HTML" value={customHtml} onChange={(e) => setCustomHtml(e.target.value)} />}</Grid>
          </Grid>
        </Paper>
        <Box className="screen-only" sx={{ height: 520 }}><DataGrid rows={rows} columns={columns} getRowId={(row) => row._id} checkboxSelection rowSelectionModel={selected} onRowSelectionModelChange={setSelected} slots={{ toolbar: GridToolbar }} sx={gridSx} pageSizeOptions={[25, 50, 100]} /></Box>
        <Box id="bulk-vac-certificates">
          {selectedRows.map((row) => <Box key={row._id} className="bulk-cert-page" dangerouslySetInnerHTML={{ __html: renderTemplate(activeTemplate, row, institution) }} />)}
        </Box>
        <style>{`
          #bulk-vac-certificates .bulk-cert-page{width:277mm;min-height:190mm;margin:0 auto 12px;background:#fff;color:#000;padding:10mm;box-sizing:border-box;page-break-after:always;}
          #bulk-vac-certificates .cert{border:8px double #1d4ed8;min-height:170mm;text-align:center;padding:12mm;font-family:Arial;color:#000;}
          #bulk-vac-certificates .cert h1{font-size:26px;margin:4px 0}.cert h2{font-size:32px;margin:22px 0}.cert h3{font-size:36px;margin:14px 0}.cert p{font-size:17px;line-height:1.6}.cert .sign{display:flex;justify-content:space-between;margin-top:55px;font-weight:700}
          #bulk-vac-certificates .cert-3,.cert-8{border-color:#b45309}.cert-5{border-style:solid;border-width:5px}.cert-7{font-family:Georgia,serif}.cert-10{border-color:#111827}
          @media print{@page{size:A4 landscape;margin:10mm}body *{visibility:hidden}.screen-only{display:none!important}#bulk-vac-certificates,#bulk-vac-certificates *{visibility:visible;color:#000!important}#bulk-vac-certificates{position:absolute;left:0;top:0;width:100%}.bulk-cert-page{page-break-after:always!important;margin:0!important}}
        `}</style>
      </Stack>
    </MenuPageShell>
  );
}

export function StudentMoocValueAddedCoursesPage() {
  const [data, setData] = useState([]);
  const [student, setStudent] = useState(null);
  const [institution, setInstitution] = useState({});
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState("");
  const load = async () => {
    try {
      const res = await ep1.get("/api/v2/mooc-value-added/student-courses", { params: { colid: global1.colid, regno: global1.regno, user: global1.user, email: global1.email } });
      setData(res.data?.data || []);
      setStudent(res.data?.student || null);
      setInstitution(res.data?.institution || {});
    } catch (err) {
      setError(msg(err, "Unable to load courses"));
    }
  };
  useEffect(() => { load(); }, []);
  const columns = [
    { field: "valueaddedcourse", headerName: "Course", minWidth: 230, flex: 1 },
    { field: "vaccode", headerName: "VAC Code", minWidth: 130 },
    { field: "academicyear", headerName: "Academic Year", minWidth: 130 },
    { field: "valueaddedcoursecategory", headerName: "Category", minWidth: 160 },
    { field: "marksobtained", headerName: "Marks", minWidth: 100 },
    { field: "totalmarks", headerName: "Total", minWidth: 100 },
    { field: "status", headerName: "Status", minWidth: 110 },
    { field: "certificate", headerName: "Certificate", minWidth: 150, renderCell: (p) => /^pass$/i.test(text(p.row.status)) ? <Button size="small" onClick={() => setSelected(p.row)}>Generate</Button> : <Typography variant="caption">Not eligible</Typography> }
  ];
  return (
    <MenuPageShell title="My Add on Courses" menuType="student">
      <Stack spacing={2} sx={{ p: 2 }}>
        {error && <Alert severity="error" onClose={() => setError("")}>{error}</Alert>}
        <Paper sx={{ p: 2 }} className="screen-only"><Typography variant="h5" fontWeight={950}>Courses Attended</Typography><Typography color="text.secondary">Passed courses can generate a completion certificate.</Typography></Paper>
        <Box className="screen-only" sx={{ height: 520 }}><DataGrid rows={data} columns={columns} getRowId={(row) => row._id} slots={{ toolbar: GridToolbar }} sx={gridSx} pageSizeOptions={[25, 50, 100]} /></Box>
        {selected && <><Stack className="screen-only" direction="row" spacing={1}><Button variant="outlined" startIcon={<Print />} onClick={() => window.print()}>Print Certificate</Button><Button variant="outlined" onClick={() => setSelected(null)}>Close Certificate</Button></Stack><Certificate record={selected} student={student} institution={institution} /></>}
        <style>{`@media print { body * { visibility:hidden; } .certificate-print, .certificate-print * { visibility: visible; } .certificate-print { position:absolute; left:0; top:0; width:277mm!important; min-height:190mm!important; box-shadow:none!important; } .screen-only { display:none!important; } @page { size:A4 landscape; margin:10mm; } }`}</style>
      </Stack>
    </MenuPageShell>
  );
}
