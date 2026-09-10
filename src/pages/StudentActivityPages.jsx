import React, { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  Grid,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import { DataGrid, GridToolbar } from "@mui/x-data-grid";
import DeleteIcon from "@mui/icons-material/Delete";
import DownloadIcon from "@mui/icons-material/Download";
import SaveIcon from "@mui/icons-material/Save";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import MenuPageShell from "./MenuPageShell";
import ep1 from "../api/ep1";
import global1 from "./global1";

const labels = {
  academicyear: "Academic Year",
  program: "Program",
  programcode: "Program Code",
  student: "Student",
  regno: "Reg No",
  activitytype: "Activity Type",
  activitydate: "Activity Date",
  activityname: "Activity Name",
  venue: "Venue",
  location: "Location",
  prizewon: "Prize Won",
  source: "Source",
  status: "Status",
  name: "Name",
  email: "Email",
  phone: "Phone",
  semester: "Semester",
  section: "Section",
  regulation: "Regulation"
};
const studentFilterFields = ["academicyear", "regulation", "program", "programcode", "semester", "section", "name", "email", "phone", "regno"];
const rowFields = ["academicyear", "program", "programcode", "student", "regno", "activitytype", "activitydate", "activityname", "venue", "location", "prizewon", "source", "status"];
const defaultForm = { academicyear: "", activitytype: "", activitydate: "", activityname: "", venue: "", location: "", prizewon: "NA", status: "Active" };
const gridSx = {
  "& .MuiDataGrid-cell": { whiteSpace: "normal", overflowWrap: "anywhere", lineHeight: 1.3, py: 1 },
  "& .MuiDataGrid-columnHeaderTitle": { whiteSpace: "normal", lineHeight: 1.2 }
};
const titleCase = (kind) => kind === "sports" ? "Sports" : "Cultural";
const unique = (values = []) => [...new Set(values.map((v) => String(v ?? "").trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
const filteredStudents = (students = [], filters = {}) => students.filter((student) => Object.entries(filters).every(([field, value]) => {
  const needle = String(value || "").trim().toLowerCase();
  return !needle || String(student[field] ?? "").toLowerCase().includes(needle);
}));
const readSheet = async (file) => {
  const data = await file.arrayBuffer();
  const wb = XLSX.read(data);
  return XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: "" });
};

function ActivityCrudPage({ kind }) {
  const [options, setOptions] = useState({ students: [], culturalTypes: [], sportsTypes: [], prizes: [] });
  const [studentFilters, setStudentFilters] = useState({});
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [form, setForm] = useState(defaultForm);
  const [rows, setRows] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);
  const [filters, setFilters] = useState({ academicyear: "", activitytype: "", programcode: "", regno: "", fromdate: "", todate: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const endpoint = `/api/v2/student-activities/${kind}`;
  const typeOptions = kind === "sports" ? options.sportsTypes : options.culturalTypes;

  const loadOptions = async () => {
    const res = await ep1.get("/api/v2/student-activities/options", { params: { colid: global1.colid } });
    setOptions(res.data || {});
  };
  const loadRows = async () => {
    try {
      const res = await ep1.get(endpoint, { params: { colid: global1.colid, ...filters } });
      setRows(res.data?.data || []);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load records");
    }
  };
  useEffect(() => { loadOptions(); loadRows(); }, []);

  const candidates = useMemo(() => filteredStudents(options.students || [], studentFilters), [options.students, studentFilters]);
  const columns = rowFields.map((field) => ({ field, headerName: labels[field] || field, minWidth: field === "activityname" ? 220 : 140, flex: ["activityname", "venue", "location"].includes(field) ? 1 : 0 }));
  const studentColumns = [
    { field: "name", headerName: "Student", minWidth: 180, flex: 1 },
    { field: "regno", headerName: "Reg No", minWidth: 140 },
    { field: "program", headerName: "Program", minWidth: 180, flex: 1 },
    { field: "programcode", headerName: "Program Code", minWidth: 150 },
    { field: "semester", headerName: "Semester", minWidth: 110 },
    { field: "section", headerName: "Section", minWidth: 110 }
  ];

  const save = async () => {
    try {
      setError("");
      const selected = candidates.filter((student) => selectedStudents.includes(student._id));
      if (!selected.length) {
        setError("Select at least one student.");
        return;
      }
      const rowsToSave = selected.map((student) => ({
        ...form,
        colid: global1.colid,
        user: global1.user,
        source: "Admin",
        academicyear: form.academicyear || student.academicyear,
        program: student.program,
        programcode: student.programcode,
        student: student.name,
        regno: student.regno
      }));
      const res = await ep1.post(endpoint, { rows: rowsToSave, colid: global1.colid, user: global1.user });
      setMessage(`Saved ${res.data?.saved || rowsToSave.length} records.`);
      setSelectedStudents([]);
      loadRows();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to save records");
    }
  };

  const bulkUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const uploadRows = await readSheet(file);
      await ep1.post(`${endpoint}-bulk`, { rows: uploadRows, colid: global1.colid, user: global1.user });
      setMessage("Bulk upload completed.");
      loadRows();
    } catch (err) {
      setError(err.response?.data?.message || "Bulk upload failed");
    } finally {
      event.target.value = "";
    }
  };
  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([{ ...defaultForm, program: "", programcode: "", student: "", regno: "" }]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, `${kind}_activity_template.xlsx`);
  };
  const remove = async () => {
    await ep1.post(`${endpoint}-delete`, { ids: selectedRows });
    setSelectedRows([]);
    loadRows();
  };

  return (
    <MenuPageShell title={`${titleCase(kind)} activity`}>
      <Stack spacing={2}>
        {message && <Alert severity="success">{message}</Alert>}
        {error && <Alert severity="error">{error}</Alert>}
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" fontWeight={900} sx={{ mb: 2 }}>Select students</Typography>
          <Grid container spacing={2}>
            {studentFilterFields.map((field) => (
              <Grid item xs={12} md={2.4} key={field}>
                <Autocomplete
                  freeSolo
                  options={unique((options.students || []).map((student) => student[field]))}
                  value={studentFilters[field] || ""}
                  onInputChange={(event, value) => setStudentFilters((prev) => ({ ...prev, [field]: value || "" }))}
                  onChange={(event, value) => setStudentFilters((prev) => ({ ...prev, [field]: value || "" }))}
                  renderInput={(params) => <TextField {...params} label={labels[field] || field} size="small" />}
                />
              </Grid>
            ))}
          </Grid>
          <Box sx={{ height: 380, mt: 2 }}>
            <DataGrid rows={candidates.map((row) => ({ ...row, id: row._id }))} columns={studentColumns} checkboxSelection onRowSelectionModelChange={setSelectedStudents} slots={{ toolbar: GridToolbar }} pageSizeOptions={[25, 50, 100]} sx={gridSx} />
          </Box>
        </Paper>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" fontWeight={900} sx={{ mb: 2 }}>Activity details</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={2}><Autocomplete freeSolo options={unique([...(options.years || []), ...candidates.map((s) => s.academicyear)])} value={form.academicyear} onInputChange={(e, value) => setForm((prev) => ({ ...prev, academicyear: value || "" }))} renderInput={(params) => <TextField {...params} label="Academic Year" size="small" />} /></Grid>
            <Grid item xs={12} md={2.5}><Autocomplete freeSolo options={typeOptions || []} value={form.activitytype} onInputChange={(e, value) => setForm((prev) => ({ ...prev, activitytype: value || "" }))} renderInput={(params) => <TextField {...params} label={`${titleCase(kind)} Type`} size="small" />} /></Grid>
            <Grid item xs={12} md={2}><TextField label="Activity Date" type="date" size="small" InputLabelProps={{ shrink: true }} value={form.activitydate} onChange={(e) => setForm((prev) => ({ ...prev, activitydate: e.target.value }))} fullWidth /></Grid>
            <Grid item xs={12} md={2.5}><TextField label="Activity Name" size="small" value={form.activityname} onChange={(e) => setForm((prev) => ({ ...prev, activityname: e.target.value }))} fullWidth /></Grid>
            <Grid item xs={12} md={1.5}><TextField label="Venue" size="small" value={form.venue} onChange={(e) => setForm((prev) => ({ ...prev, venue: e.target.value }))} fullWidth /></Grid>
            <Grid item xs={12} md={1.5}><TextField label="Location" size="small" value={form.location} onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))} fullWidth /></Grid>
            <Grid item xs={12} md={2}><TextField select label="Prize Won" size="small" value={form.prizewon} onChange={(e) => setForm((prev) => ({ ...prev, prizewon: e.target.value }))} fullWidth>{(options.prizes || ["First", "Second", "Third", "Other", "NA"]).map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}</TextField></Grid>
            <Grid item xs={12} md={2}><Button variant="contained" startIcon={<SaveIcon />} onClick={save} fullWidth>Save for selected</Button></Grid>
          </Grid>
        </Paper>
        <Paper sx={{ p: 2 }}>
          <Grid container spacing={2} alignItems="center">
            {["academicyear", "activitytype", "programcode", "regno"].map((field) => (
              <Grid item xs={12} md={2} key={field}>
                <Autocomplete freeSolo options={unique(rows.map((row) => row[field]))} value={filters[field] || ""} onInputChange={(e, value) => setFilters((prev) => ({ ...prev, [field]: value || "" }))} renderInput={(params) => <TextField {...params} label={labels[field] || field} size="small" />} />
              </Grid>
            ))}
            <Grid item xs={12} md={1.5}><TextField type="date" size="small" label="From" InputLabelProps={{ shrink: true }} value={filters.fromdate} onChange={(e) => setFilters((prev) => ({ ...prev, fromdate: e.target.value }))} fullWidth /></Grid>
            <Grid item xs={12} md={1.5}><TextField type="date" size="small" label="To" InputLabelProps={{ shrink: true }} value={filters.todate} onChange={(e) => setFilters((prev) => ({ ...prev, todate: e.target.value }))} fullWidth /></Grid>
            <Grid item xs={12} md={1}><Button variant="contained" onClick={loadRows} fullWidth>Apply</Button></Grid>
          </Grid>
          <Stack direction="row" spacing={1} sx={{ my: 1 }} flexWrap="wrap">
            <Button startIcon={<DownloadIcon />} onClick={downloadTemplate}>Template</Button>
            <Button component="label" startIcon={<UploadFileIcon />}>Bulk upload<input hidden type="file" accept=".xlsx,.xls,.csv" onChange={bulkUpload} /></Button>
            <Button color="error" startIcon={<DeleteIcon />} disabled={!selectedRows.length} onClick={remove}>Bulk delete</Button>
          </Stack>
          <Box sx={{ height: "calc(100vh - 190px)", minHeight: 620 }}>
            <DataGrid rows={rows.map((row) => ({ ...row, id: row._id }))} columns={columns} checkboxSelection onRowSelectionModelChange={setSelectedRows} slots={{ toolbar: GridToolbar }} pageSizeOptions={[25, 50, 100]} sx={gridSx} />
          </Box>
        </Paper>
      </Stack>
    </MenuPageShell>
  );
}

function StudentActivityPage({ kind }) {
  const [options, setOptions] = useState({ culturalTypes: [], sportsTypes: [], prizes: [] });
  const [form, setForm] = useState(defaultForm);
  const [data, setData] = useState({ cultural: [], sports: [] });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const typeOptions = kind === "sports" ? options.sportsTypes : options.culturalTypes;
  const rows = kind === "sports" ? data.sports : data.cultural;
  const columns = rowFields.filter((field) => !["student", "regno", "source"].includes(field)).map((field) => ({ field, headerName: labels[field] || field, minWidth: 140, flex: ["activityname", "venue", "location"].includes(field) ? 1 : 0 }));

  const load = async () => {
    const res = await ep1.get("/api/v2/student-activities/student", { params: { colid: global1.colid, regno: global1.regno } });
    setData(res.data || { cultural: [], sports: [] });
  };
  useEffect(() => {
    ep1.get("/api/v2/student-activities/options", { params: { colid: global1.colid } }).then((res) => setOptions(res.data || {}));
    load();
  }, []);

  const save = async () => {
    try {
      const payload = {
        ...form,
        colid: global1.colid,
        user: global1.user,
        source: "Student",
        academicyear: form.academicyear || global1.academicyear,
        program: global1.program,
        programcode: global1.programcode,
        student: global1.name,
        regno: global1.regno
      };
      await ep1.post(`/api/v2/student-activities/${kind}`, payload);
      setMessage("Activity saved.");
      setForm(defaultForm);
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to save activity");
    }
  };

  return (
    <MenuPageShell title={`My ${titleCase(kind)} activity`} menuType="student">
      <Stack spacing={2}>
        {message && <Alert severity="success">{message}</Alert>}
        {error && <Alert severity="error">{error}</Alert>}
        <Paper sx={{ p: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={2}><TextField label="Academic Year" size="small" value={form.academicyear} onChange={(e) => setForm((prev) => ({ ...prev, academicyear: e.target.value }))} fullWidth /></Grid>
            <Grid item xs={12} md={2.5}><Autocomplete freeSolo options={typeOptions || []} value={form.activitytype} onInputChange={(e, value) => setForm((prev) => ({ ...prev, activitytype: value || "" }))} renderInput={(params) => <TextField {...params} label="Activity Type" size="small" />} /></Grid>
            <Grid item xs={12} md={2}><TextField label="Activity Date" type="date" size="small" InputLabelProps={{ shrink: true }} value={form.activitydate} onChange={(e) => setForm((prev) => ({ ...prev, activitydate: e.target.value }))} fullWidth /></Grid>
            <Grid item xs={12} md={2.5}><TextField label="Activity Name" size="small" value={form.activityname} onChange={(e) => setForm((prev) => ({ ...prev, activityname: e.target.value }))} fullWidth /></Grid>
            <Grid item xs={12} md={1.5}><TextField label="Venue" size="small" value={form.venue} onChange={(e) => setForm((prev) => ({ ...prev, venue: e.target.value }))} fullWidth /></Grid>
            <Grid item xs={12} md={1.5}><TextField label="Location" size="small" value={form.location} onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))} fullWidth /></Grid>
            <Grid item xs={12} md={2}><TextField select label="Prize Won" size="small" value={form.prizewon} onChange={(e) => setForm((prev) => ({ ...prev, prizewon: e.target.value }))} fullWidth>{(options.prizes || ["First", "Second", "Third", "Other", "NA"]).map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}</TextField></Grid>
            <Grid item xs={12} md={2}><Button variant="contained" startIcon={<SaveIcon />} onClick={save} fullWidth>Save</Button></Grid>
          </Grid>
        </Paper>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" fontWeight={900} sx={{ mb: 1 }}>My records</Typography>
          <Box sx={{ height: "calc(100vh - 260px)", minHeight: 520 }}>
            <DataGrid rows={(rows || []).map((row) => ({ ...row, id: row._id }))} columns={columns} slots={{ toolbar: GridToolbar }} pageSizeOptions={[25, 50, 100]} sx={gridSx} />
          </Box>
        </Paper>
      </Stack>
    </MenuPageShell>
  );
}

export const CulturalActivityPage = () => <ActivityCrudPage kind="cultural" />;
export const SportsActivityPage = () => <ActivityCrudPage kind="sports" />;
export const StudentCulturalActivityPage = () => <StudentActivityPage kind="cultural" />;
export const StudentSportsActivityPage = () => <StudentActivityPage kind="sports" />;
