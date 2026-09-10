import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  FormControl,
  Grid,
  InputLabel,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography
} from "@mui/material";
import { DataGrid, GridActionsCellItem, GridToolbar } from "@mui/x-data-grid";
import { Delete, Download, Edit, Print, Save, UploadFile } from "@mui/icons-material";
import * as XLSX from "xlsx";
import ep1 from "../api/ep1";
import global1 from "./global1";
import MenuPageShell from "./MenuPageShell";

const api = "/api/v2/conductexam/appeal";
const components = ["Theory", "Practical", "Viva"];
const blankWorkflow = { academicyear: "", program: "", programcode: "", level: 1, role: "", approvername: "", approveremail: "", status: "Active" };
const filterFields = ["academicyear", "regulation", "examcode", "programcode", "semester", "coursecode", "type", "component", "regno", "approvalstatus", "examineremail"];
const wrapCell = { whiteSpace: "normal", overflowWrap: "anywhere", lineHeight: 1.3, py: 1 };
const gridSx = { "& .MuiDataGrid-cell": wrapCell, "& .MuiDataGrid-columnHeaderTitle": { whiteSpace: "normal", lineHeight: 1.2 } };
const paperSx = { p: 2, borderRadius: 2, border: "1px solid #e5e7eb", boxShadow: "0 10px 26px rgba(15,23,42,0.06)" };

const text = (value) => String(value || "").trim();
const money = (value) => Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
const today = () => new Date().toISOString().slice(0, 10);

function optionLabel(option) {
  if (!option) return "";
  if (typeof option === "string") return option;
  return option.label || option.name || option.email || option.program || option.course || "";
}

function MultiSelect({ label, value, options, onChange, getLabel = optionLabel }) {
  const selected = Array.isArray(value) ? value : [];
  const all = options.length > 0 && selected.length === options.length;
  return (
    <FormControl fullWidth size="small">
      <InputLabel>{label}</InputLabel>
      <Select
        multiple
        label={label}
        value={selected}
        onChange={(event) => {
          const next = event.target.value;
          onChange(next.includes("__all__") ? (all ? [] : options) : next);
        }}
        renderValue={(items) => items.map(getLabel).join(", ")}
      >
        <MenuItem value="__all__"><Checkbox checked={all} indeterminate={selected.length > 0 && !all} /><ListItemText primary="Select all" /></MenuItem>
        {options.map((option) => <MenuItem key={typeof option === "string" ? option : JSON.stringify(option)} value={option}><Checkbox checked={selected.includes(option)} /><ListItemText primary={getLabel(option)} /></MenuItem>)}
      </Select>
    </FormControl>
  );
}

function SelectBox({ label, value, options, onChange, getLabel = optionLabel }) {
  return (
    <TextField select fullWidth size="small" label={label} value={value || ""} onChange={(e) => onChange(e.target.value)}>
      <MenuItem value="">Select</MenuItem>
      {options.map((option) => <MenuItem key={typeof option === "string" ? option : JSON.stringify(option)} value={typeof option === "string" ? option : option.value}>{getLabel(option)}</MenuItem>)}
    </TextField>
  );
}

function PrintHeader({ title, institution = {} }) {
  return (
    <Box sx={{ textAlign: "center", mb: 2 }}>
      {institution.logo && <Box component="img" src={institution.logo} sx={{ height: 58, objectFit: "contain", mb: 1 }} />}
      <Typography variant="h5" fontWeight={900}>{institution.insname || institution.name || global1.insname || "Institution"}</Typography>
      <Typography>{institution.address || institution.address1 || ""}</Typography>
      <Typography variant="h6" fontWeight={900} sx={{ mt: 1 }}>{title}</Typography>
      <Typography variant="caption">Generated on {today()}</Typography>
    </Box>
  );
}

function FilterPanel({ filters, setFilters, options, fields = filterFields, onApply }) {
  const [drafts, setDrafts] = useState([{ field: "", value: "" }]);
  const distinctValues = (field) => {
    const fromRequests = (options.requests || []).map((row) => row[field]);
    const fromCourses = (options.courses || []).map((row) => row[field]);
    return [...new Set([...fromRequests, ...fromCourses].map(text).filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  };
  const apply = () => {
    const next = {};
    drafts.forEach((row) => { if (row.field && row.value) next[row.field] = row.value; });
    setFilters(next);
    onApply?.(next);
  };
  return (
    <Paper sx={{ ...paperSx, mb: 2 }}>
      <Typography fontWeight={900} sx={{ mb: 1 }}>Dynamic filters</Typography>
      <Stack spacing={1}>
        {drafts.map((row, index) => (
          <Grid container spacing={1} key={index}>
            <Grid item xs={12} md={3}><SelectBox label="Field" value={row.field} options={fields} onChange={(value) => setDrafts((prev) => prev.map((item, i) => i === index ? { field: value, value: "" } : item))} /></Grid>
            <Grid item xs={12} md={5}><SelectBox label="Value" value={row.value} options={row.field ? distinctValues(row.field) : []} onChange={(value) => setDrafts((prev) => prev.map((item, i) => i === index ? { ...item, value } : item))} /></Grid>
            <Grid item xs={12} md={4}><Stack direction="row" spacing={1}><Button variant="outlined" onClick={() => setDrafts((prev) => [...prev, { field: "", value: "" }])}>Add</Button><Button color="error" variant="outlined" onClick={() => setDrafts((prev) => prev.length === 1 ? [{ field: "", value: "" }] : prev.filter((_, i) => i !== index))}>Remove</Button></Stack></Grid>
          </Grid>
        ))}
        <Box><Button variant="contained" onClick={apply}>Apply filters</Button></Box>
      </Stack>
    </Paper>
  );
}

function useAppealOptions() {
  const [options, setOptions] = useState({});
  const [error, setError] = useState("");
  const load = async () => {
    try {
      const res = await ep1.get(`${api}/options`, { params: { colid: global1.colid } });
      setOptions(res.data || {});
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load options");
    }
  };
  useEffect(() => { load(); }, []);
  return { options, error, reloadOptions: load };
}

function downloadSheet(filename, sample) {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([sample]), "Template");
  XLSX.writeFile(wb, filename);
}

export function ExamAppealWorkflowPage() {
  const { options, error: optionError, reloadOptions } = useAppealOptions();
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(blankWorkflow);
  const [editingId, setEditingId] = useState("");
  const [selected, setSelected] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const programOptions = options.programsList || [];
  const users = options.users || [];
  const selectedProgram = programOptions.find((row) => row.programcode === form.programcode);
  const load = async () => {
    const res = await ep1.get(`${api}/workflow`, { params: { colid: global1.colid } });
    setRows(res.data?.data || []);
  };
  useEffect(() => { load(); }, []);
  const save = async () => {
    try {
      await ep1.post(`${api}/workflow`, { ...form, program: selectedProgram?.program || form.program, id: editingId, colid: global1.colid, user: global1.user });
      setMessage(editingId ? "Workflow updated" : "Workflow saved");
      setForm(blankWorkflow);
      setEditingId("");
      await load();
      await reloadOptions();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to save workflow");
    }
  };
  const bulkDelete = async () => {
    if (!selected.length || !window.confirm("Delete selected workflow levels?")) return;
    await ep1.post(`${api}/workflow-delete`, { colid: global1.colid, ids: selected });
    setSelected([]);
    await load();
  };
  const columns = [
    { field: "academicyear", headerName: "Academic year", width: 140 },
    { field: "program", headerName: "Program", width: 180 },
    { field: "programcode", headerName: "Program code", width: 140 },
    { field: "level", headerName: "Level", width: 90 },
    { field: "role", headerName: "Role", width: 140 },
    { field: "approvername", headerName: "Approver", width: 180 },
    { field: "approveremail", headerName: "Approver email", width: 220 },
    { field: "status", headerName: "Status", width: 120 },
    { field: "actions", type: "actions", width: 90, getActions: ({ row }) => [<GridActionsCellItem icon={<Edit />} label="Edit" onClick={() => { setEditingId(row._id); setForm({ ...blankWorkflow, ...row }); }} />] }
  ];
  return (
    <MenuPageShell title="Appeal approval workflow">
      <Box sx={{ p: 3 }}>
        {(error || optionError) && <Alert severity="error" sx={{ mb: 2 }}>{error || optionError}</Alert>}
        {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
        <Paper sx={paperSx}>
          <Typography variant="h5" fontWeight={900} sx={{ mb: 2 }}>Exam appeal approval workflow</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={2}><SelectBox label="Academic year" value={form.academicyear} options={options.academicyears || []} onChange={(value) => setForm((prev) => ({ ...prev, academicyear: value }))} /></Grid>
            <Grid item xs={12} md={3}><SelectBox label="Program" value={form.programcode} options={programOptions.map((row) => ({ value: row.programcode, label: `${row.program} - ${row.programcode}` }))} onChange={(value) => setForm((prev) => ({ ...prev, programcode: value, program: programOptions.find((row) => row.programcode === value)?.program || "" }))} /></Grid>
            <Grid item xs={12} md={1}><TextField fullWidth size="small" label="Level" type="number" value={form.level} onChange={(e) => setForm((prev) => ({ ...prev, level: e.target.value }))} /></Grid>
            <Grid item xs={12} md={2}><SelectBox label="Role" value={form.role} options={options.roles || []} onChange={(value) => setForm((prev) => ({ ...prev, role: value }))} /></Grid>
            <Grid item xs={12} md={3}><SelectBox label="Approver" value={form.approveremail} options={users.filter((user) => !form.role || user.role === form.role).map((user) => ({ value: user.email, label: `${user.name || user.email} - ${user.email}` }))} onChange={(value) => { const user = users.find((item) => item.email === value); setForm((prev) => ({ ...prev, approveremail: value, approvername: user?.name || "" })); }} /></Grid>
            <Grid item xs={12} md={1}><SelectBox label="Status" value={form.status} options={["Active", "Inactive"]} onChange={(value) => setForm((prev) => ({ ...prev, status: value }))} /></Grid>
            <Grid item xs={12}><Stack direction="row" spacing={1}><Button variant="contained" startIcon={<Save />} onClick={save}>{editingId ? "Update" : "Save"}</Button><Button variant="outlined" startIcon={<Download />} onClick={() => downloadSheet("appeal_workflow_template.xlsx", blankWorkflow)}>Template</Button><Button color="error" variant="outlined" startIcon={<Delete />} disabled={!selected.length} onClick={bulkDelete}>Bulk delete</Button><Button variant="outlined" startIcon={<Print />} onClick={() => window.print()}>Print</Button></Stack></Grid>
          </Grid>
        </Paper>
        <Paper sx={{ ...paperSx, mt: 2, height: 540 }} className="print-area">
          <PrintHeader title="Appeal Approval Workflow" institution={options.institution} />
          <DataGrid rows={rows} columns={columns} getRowId={(row) => row._id} checkboxSelection rowSelectionModel={selected} onRowSelectionModelChange={setSelected} slots={{ toolbar: GridToolbar }} sx={gridSx} pageSizeOptions={[25, 50, 100]} />
        </Paper>
      </Box>
    </MenuPageShell>
  );
}

export function StudentExamAppealPage() {
  const [semester, setSemester] = useState("");
  const [student, setStudent] = useState(null);
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const load = async () => {
    try {
      const res = await ep1.get(`${api}/student-courses`, { params: { colid: global1.colid, regno: global1.regno || global1.user, email: global1.user, semester } });
      setStudent(res.data?.student || null);
      setRows(res.data?.data || []);
      setSelected([]);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load courses");
    }
  };
  const submit = async () => {
    try {
      const items = rows.filter((row) => selected.includes(row._id)).map((row) => ({
        ...row,
        type: drafts[row._id]?.type || "Theory",
        component: drafts[row._id]?.component || "Main",
        fee: row.appealfee || 0,
        student: student?.name || row.student,
        studentemail: student?.email || row.studentemail,
        regno: student?.regno || row.regno
      }));
      const res = await ep1.post(`${api}/submit`, { colid: global1.colid, user: global1.user, items });
      setMessage(`${res.data?.saved || 0} appeal request(s) submitted`);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to submit appeal");
    }
  };
  const columns = [
    { field: "academicyear", headerName: "Academic year", width: 140 },
    { field: "exam", headerName: "Exam", width: 160 },
    { field: "examcode", headerName: "Exam code", width: 130 },
    { field: "course", headerName: "Course", width: 220 },
    { field: "coursecode", headerName: "Course code", width: 130 },
    { field: "appealfee", headerName: "Appeal fee", width: 120, valueFormatter: ({ value }) => money(value) },
    { field: "type", headerName: "Type", width: 170, renderCell: ({ row }) => <SelectBox label="" value={drafts[row._id]?.type || "Theory"} options={components} onChange={(value) => setDrafts((prev) => ({ ...prev, [row._id]: { ...(prev[row._id] || {}), type: value } }))} /> },
    { field: "component", headerName: "Component", width: 180, renderCell: ({ row }) => <TextField fullWidth size="small" value={drafts[row._id]?.component || "Main"} onChange={(e) => setDrafts((prev) => ({ ...prev, [row._id]: { ...(prev[row._id] || {}), component: e.target.value } }))} /> }
  ];
  return (
    <MenuPageShell title="Student exam appeal">
      <Box sx={{ p: 3 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
        <Paper sx={paperSx}>
          <Typography variant="h5" fontWeight={900} sx={{ mb: 2 }}>Submit exam appeal</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={3}><SelectBox label="Semester" value={semester} options={["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]} onChange={setSemester} /></Grid>
            <Grid item xs={12} md={2}><Button fullWidth sx={{ height: "100%" }} variant="contained" onClick={load}>Load courses</Button></Grid>
            <Grid item xs={12} md={2}><Button fullWidth sx={{ height: "100%" }} variant="contained" disabled={!selected.length} onClick={submit}>Submit appeal</Button></Grid>
          </Grid>
        </Paper>
        {student && <Alert severity="info" sx={{ my: 2 }}>{student.name} - {student.regno} - {student.program} {student.programcode}</Alert>}
        <Paper sx={{ ...paperSx, height: 560 }}>
          <DataGrid rows={rows} columns={columns} getRowId={(row) => row._id} checkboxSelection rowSelectionModel={selected} onRowSelectionModelChange={setSelected} slots={{ toolbar: GridToolbar }} sx={gridSx} pageSizeOptions={[25, 50, 100]} />
        </Paper>
      </Box>
    </MenuPageShell>
  );
}

function AppealRequestGridPage({ mode }) {
  const { options, error: optionError } = useAppealOptions();
  const [rows, setRows] = useState([]);
  const [filters, setFilters] = useState({});
  const [selected, setSelected] = useState([]);
  const [remarks, setRemarks] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const load = async (extra = filters) => {
    try {
      const params = { colid: global1.colid, ...extra };
      if (mode === "approval") params.approveremail = global1.user;
      const res = await ep1.get(`${api}/requests`, { params });
      setRows(res.data?.data || []);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load appeal requests");
    }
  };
  useEffect(() => { load({}); }, []);
  const approve = async (action) => {
    await ep1.post(`${api}/approve`, { colid: global1.colid, ids: selected, action, remarks, approveremail: global1.user, approvername: global1.name, user: global1.user });
    setMessage(`${selected.length} request(s) ${action.toLowerCase()}`);
    setSelected([]);
    await load();
  };
  const deleteRows = async () => {
    if (!selected.length || !window.confirm("Delete selected appeal requests?")) return;
    await ep1.post(`${api}/requests-delete`, { colid: global1.colid, ids: selected });
    setSelected([]);
    await load();
  };
  const columns = [
    { field: "academicyear", headerName: "Academic year", width: 130 },
    { field: "examcode", headerName: "Exam code", width: 120 },
    { field: "programcode", headerName: "Program", width: 120 },
    { field: "semester", headerName: "Sem", width: 80 },
    { field: "course", headerName: "Course", width: 220 },
    { field: "coursecode", headerName: "Course code", width: 130 },
    { field: "type", headerName: "Type", width: 110 },
    { field: "component", headerName: "Component", width: 130 },
    { field: "student", headerName: "Student", width: 170 },
    { field: "regno", headerName: "Reg no", width: 130 },
    { field: "fee", headerName: "Fee", width: 100, valueFormatter: ({ value }) => money(value) },
    { field: "approvalstatus", headerName: "Status", width: 130 },
    { field: "currentlevel", headerName: "Level", width: 90 }
  ];
  return (
    <MenuPageShell title={mode === "approval" ? "Appeal approval" : "Appeal requests"}>
      <Box sx={{ p: 3 }}>
        {(error || optionError) && <Alert severity="error" sx={{ mb: 2 }}>{error || optionError}</Alert>}
        {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
        <FilterPanel filters={filters} setFilters={setFilters} options={options} onApply={load} />
        {mode === "approval" && <Paper sx={{ ...paperSx, mb: 2 }}><Stack direction="row" spacing={1}><TextField size="small" label="Remarks" value={remarks} onChange={(e) => setRemarks(e.target.value)} sx={{ minWidth: 360 }} /><Button variant="contained" disabled={!selected.length} onClick={() => approve("Approved")}>Bulk approve</Button><Button color="error" variant="outlined" disabled={!selected.length} onClick={() => approve("Rejected")}>Bulk reject</Button></Stack></Paper>}
        <Stack direction="row" spacing={1} sx={{ mb: 2 }}><Button variant="outlined" startIcon={<Print />} onClick={() => window.print()}>Print preview</Button><Button color="error" variant="outlined" startIcon={<Delete />} disabled={!selected.length} onClick={deleteRows}>Bulk delete</Button></Stack>
        <Paper sx={{ ...paperSx, height: 620 }} className="print-area"><PrintHeader title={mode === "approval" ? "Appeal Approval" : "Appeal Requests"} institution={options.institution} /><DataGrid rows={rows} columns={columns} getRowId={(row) => row._id} checkboxSelection rowSelectionModel={selected} onRowSelectionModelChange={setSelected} slots={{ toolbar: GridToolbar }} sx={gridSx} pageSizeOptions={[25, 50, 100]} /></Paper>
      </Box>
    </MenuPageShell>
  );
}

export function ExamAppealApprovalPage() { return <AppealRequestGridPage mode="approval" />; }

export function ExamAppealAllocationPage() {
  const { options, error: optionError } = useAppealOptions();
  const [rows, setRows] = useState([]);
  const [allotments, setAllotments] = useState([]);
  const [filters, setFilters] = useState({});
  const [selected, setSelected] = useState([]);
  const [selectedAllotments, setSelectedAllotments] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const examinerOptions = useMemo(() => [...new Map((options.examiners || []).map((row) => [row.examineremail, row])).values()], [options.examiners]);
  const [targetExaminer, setTargetExaminer] = useState("");
  const load = async (extra = filters) => {
    const [requestRes, allotmentRes] = await Promise.all([
      ep1.get(`${api}/requests`, { params: { colid: global1.colid, ...extra, approvalstatus: "Approved" } }),
      ep1.get(`${api}/allotments`, { params: { colid: global1.colid, ...extra } })
    ]);
    setRows(requestRes.data?.data || []);
    setAllotments(allotmentRes.data?.data || []);
  };
  useEffect(() => { load({}); }, []);
  const allocate = async () => {
    try {
      await ep1.post(`${api}/allocate-random`, { colid: global1.colid, ...filters, requestIds: selected, user: global1.user });
      setMessage("Random allocation completed");
      setSelected([]);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to allocate");
    }
  };
  const reassign = async () => {
    const examiner = examinerOptions.find((row) => row.examineremail === targetExaminer);
    await ep1.post(`${api}/reassign`, { colid: global1.colid, ids: selectedAllotments, examineremail: targetExaminer, examinername: examiner?.examinername, user: global1.user });
    setMessage("Reassigned selected allotments");
    setSelectedAllotments([]);
    await load();
  };
  const columns = [
    { field: "examcode", headerName: "Exam", width: 120 }, { field: "programcode", headerName: "Program", width: 120 }, { field: "coursecode", headerName: "Course code", width: 130 }, { field: "course", headerName: "Course", width: 200 }, { field: "type", headerName: "Type", width: 110 }, { field: "component", headerName: "Component", width: 130 }, { field: "regno", headerName: "Examroll/Regno", width: 140 }, { field: "student", headerName: "Student", width: 170 }
  ];
  const allotmentColumns = [...columns, { field: "examinername", headerName: "Examiner", width: 180 }, { field: "examineremail", headerName: "Email", width: 220 }, { field: "markstatus", headerName: "Mark status", width: 130 }, { field: "revisedmarks", headerName: "Revised", width: 100 }];
  return (
    <MenuPageShell title="Appeal allocation">
      <Box sx={{ p: 3 }}>
        {(error || optionError) && <Alert severity="error" sx={{ mb: 2 }}>{error || optionError}</Alert>}
        {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
        <FilterPanel filters={filters} setFilters={setFilters} options={options} onApply={load} />
        <Paper sx={{ ...paperSx, mb: 2 }}><Stack direction="row" spacing={1}><Button variant="contained" disabled={!selected.length} onClick={allocate}>Randomly assign selected approved appeals</Button><SelectBox label="Reassign to examiner" value={targetExaminer} options={examinerOptions.map((row) => ({ value: row.examineremail, label: `${row.examinername} - ${row.examineremail}` }))} onChange={setTargetExaminer} /><Button variant="outlined" disabled={!selectedAllotments.length || !targetExaminer} onClick={reassign}>Reassign selected</Button><Button variant="outlined" startIcon={<Print />} onClick={() => window.print()}>Print</Button></Stack></Paper>
        <Tabs value={0}><Tab label="Approved requests" /><Tab label="Allotments" /></Tabs>
        <Grid container spacing={2}>
          <Grid item xs={12} lg={6}><Paper sx={{ ...paperSx, height: 560 }}><DataGrid rows={rows} columns={columns} getRowId={(row) => row._id} checkboxSelection rowSelectionModel={selected} onRowSelectionModelChange={setSelected} slots={{ toolbar: GridToolbar }} sx={gridSx} pageSizeOptions={[25, 50, 100]} /></Paper></Grid>
          <Grid item xs={12} lg={6}><Paper sx={{ ...paperSx, height: 560 }}><DataGrid rows={allotments} columns={allotmentColumns} getRowId={(row) => row._id} checkboxSelection rowSelectionModel={selectedAllotments} onRowSelectionModelChange={setSelectedAllotments} slots={{ toolbar: GridToolbar }} sx={gridSx} pageSizeOptions={[25, 50, 100]} /></Paper></Grid>
        </Grid>
      </Box>
    </MenuPageShell>
  );
}

export function ExamAppealExaminerMarksPage() {
  const { options, error: optionError } = useAppealOptions();
  const [rows, setRows] = useState([]);
  const [filters, setFilters] = useState({});
  const [drafts, setDrafts] = useState({});
  const [tab, setTab] = useState("Allotted");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const load = async (extra = filters) => {
    const res = await ep1.get(`${api}/allotments`, { params: { colid: global1.colid, examineremail: global1.user, ...extra } });
    setRows(res.data?.data || []);
  };
  useEffect(() => { load({}); }, []);
  const save = async (row, status) => {
    await ep1.post(`${api}/marks`, { colid: global1.colid, allotmentid: row._id, revisedmarks: drafts[row._id]?.revisedmarks ?? row.revisedmarks, maxmarks: drafts[row._id]?.maxmarks, comments: drafts[row._id]?.comments || "", status, user: global1.user });
    setMessage(status === "Submitted" ? "Marks submitted" : "Draft saved");
    await load();
  };
  const filteredRows = rows.filter((row) => tab === "Allotted" ? true : row.markstatus === tab);
  const columns = [
    { field: "examcode", headerName: "Exam", width: 110 }, { field: "coursecode", headerName: "Course", width: 130 }, { field: "type", headerName: "Type", width: 100 }, { field: "component", headerName: "Component", width: 130 }, { field: "regno", headerName: "Examroll/Regno", width: 150 },
    { field: "revisedmarks", headerName: "Revised marks", width: 160, renderCell: ({ row }) => <TextField size="small" type="number" disabled={row.markstatus === "Submitted"} value={drafts[row._id]?.revisedmarks ?? row.revisedmarks ?? ""} onChange={(e) => setDrafts((prev) => ({ ...prev, [row._id]: { ...(prev[row._id] || {}), revisedmarks: e.target.value } }))} /> },
    { field: "comments", headerName: "Comments", width: 220, renderCell: ({ row }) => <TextField size="small" disabled={row.markstatus === "Submitted"} value={drafts[row._id]?.comments || ""} onChange={(e) => setDrafts((prev) => ({ ...prev, [row._id]: { ...(prev[row._id] || {}), comments: e.target.value } }))} /> },
    { field: "markstatus", headerName: "Status", width: 120 },
    { field: "actions", type: "actions", width: 150, getActions: ({ row }) => row.markstatus === "Submitted" ? [] : [<GridActionsCellItem icon={<Save />} label="Draft" onClick={() => save(row, "Draft")} />, <GridActionsCellItem icon={<UploadFile />} label="Submit" onClick={() => save(row, "Submitted")} />] }
  ];
  return (
    <MenuPageShell title="Appeal examiner marks">
      <Box sx={{ p: 3 }}>
        {(error || optionError) && <Alert severity="error" sx={{ mb: 2 }}>{error || optionError}</Alert>}
        {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
        <FilterPanel filters={filters} setFilters={setFilters} options={options} fields={filterFields.filter((field) => field !== "examineremail")} onApply={load} />
        <Tabs value={tab} onChange={(_, value) => setTab(value)} sx={{ mb: 2 }}><Tab value="Allotted" label="Allotted" /><Tab value="Draft" label="Draft" /><Tab value="Submitted" label="Submitted" /></Tabs>
        <Paper sx={{ ...paperSx, height: 620 }}><DataGrid rows={filteredRows} columns={columns} getRowId={(row) => row._id} slots={{ toolbar: GridToolbar }} sx={gridSx} pageSizeOptions={[25, 50, 100]} /></Paper>
      </Box>
    </MenuPageShell>
  );
}

export function ExamAppealCoeReviewPage() {
  const { options, error: optionError } = useAppealOptions();
  const [rows, setRows] = useState([]);
  const [filters, setFilters] = useState({});
  const [error, setError] = useState("");
  const load = async (extra = filters) => {
    try {
      const res = await ep1.get(`${api}/coe-review`, { params: { colid: global1.colid, ...extra } });
      setRows(res.data?.data || []);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load COE review");
    }
  };
  const summary = useMemo(() => ({
    requests: rows.length,
    submitted: rows.reduce((sum, row) => sum + Number(row.submittedcount || 0), 0),
    avgDeviation: rows.length ? (rows.reduce((sum, row) => sum + Number(row.deviation || 0), 0) / rows.length).toFixed(2) : 0
  }), [rows]);
  const columns = [
    { field: "academicyear", headerName: "Academic year", width: 130 }, { field: "examcode", headerName: "Exam", width: 110 }, { field: "programcode", headerName: "Program", width: 120 }, { field: "semester", headerName: "Sem", width: 80 }, { field: "coursecode", headerName: "Course code", width: 130 }, { field: "type", headerName: "Type", width: 100 }, { field: "component", headerName: "Component", width: 130 }, { field: "regno", headerName: "Reg no", width: 130 }, { field: "originalmarks", headerName: "Original", width: 110 }, { field: "revisedmarkslist", headerName: "Revised marks by examiners", flex: 1, minWidth: 260 }, { field: "average", headerName: "Average", width: 110 }, { field: "deviation", headerName: "Deviation", width: 110 }
  ];
  return (
    <MenuPageShell title="Appeal COE review">
      <Box sx={{ p: 3 }}>
        {(error || optionError) && <Alert severity="error" sx={{ mb: 2 }}>{error || optionError}</Alert>}
        <FilterPanel filters={filters} setFilters={setFilters} options={options} onApply={load} />
        <Grid container spacing={2} sx={{ mb: 2 }}>{[["Requests", summary.requests], ["Submitted examiner marks", summary.submitted], ["Average deviation", summary.avgDeviation]].map(([label, value]) => <Grid item xs={12} md={4} key={label}><Card><CardContent><Typography color="text.secondary">{label}</Typography><Typography variant="h4" fontWeight={900}>{value}</Typography></CardContent></Card></Grid>)}</Grid>
        <Stack direction="row" spacing={1} sx={{ mb: 2 }}><Button variant="contained" onClick={() => load()}>Load review</Button><Button variant="outlined" startIcon={<Print />} onClick={() => window.print()}>Print preview</Button></Stack>
        <Paper sx={{ ...paperSx, height: 640 }} className="print-area"><PrintHeader title="Appeal Revised Marks Review" institution={options.institution} /><DataGrid rows={rows} columns={columns} getRowId={(row) => row._id} slots={{ toolbar: GridToolbar }} sx={gridSx} pageSizeOptions={[25, 50, 100]} /></Paper>
      </Box>
    </MenuPageShell>
  );
}
