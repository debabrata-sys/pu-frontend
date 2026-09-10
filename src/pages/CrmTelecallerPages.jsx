import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Grid,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import { DataGrid, GridToolbar } from "@mui/x-data-grid";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import ep1 from "../api/ep1";
import global1 from "./global1";
import MentoringLayout from "./MentoringLayout";

const colors = ["#2563eb", "#16a34a", "#f97316", "#9333ea", "#0891b2", "#dc2626"];
const defaultYears = ["2026-27", "2027-28", "2028-29", "2029-30", "2030-31"];
const text = (value) => String(value || "").trim();
const isStudent = (user) => /^student$/i.test(text(user.role));

function useCrmData() {
  const [options, setOptions] = useState({ users: [], stages: [], sources: [], institution: null });
  const [years, setYears] = useState(defaultYears);
  const [programs, setPrograms] = useState([]);
  const loadOptions = async () => {
    const [crmRes, programRes] = await Promise.all([
      ep1.get("/api/v2/crm-management/options", { params: { colid: global1.colid } }),
      ep1.get("/api/v2/mprograms-management/options", { params: { colid: global1.colid } })
    ]);
    setOptions(crmRes.data || {});
    setYears([...new Set([...(programRes.data?.years || []), ...defaultYears])].filter(Boolean).sort());
  };
  const loadPrograms = async (year) => {
    if (!year) return setPrograms([]);
    const res = await ep1.get("/api/v2/mprograms-management", { params: { colid: global1.colid, year } });
    setPrograms(res.data?.data || []);
  };
  useEffect(() => { loadOptions(); }, []);
  return { options, years, programs, loadPrograms };
}

function Shell({ title, children }) {
  return (
    <MentoringLayout title={title}>
      <Paper elevation={0} sx={{ p: 2, mb: 2, border: "1px solid #e5e7eb", borderRadius: 2 }}>
        <Typography variant="h5" fontWeight={900}>{title}</Typography>
      </Paper>
      {children}
    </MentoringLayout>
  );
}

function ProgramSelector({ years, programs, form, setForm, loadPrograms }) {
  return (
    <>
      <Grid item xs={12} md={2}>
        <Autocomplete options={years} value={form.academicyear || null} onChange={(_, v) => { setForm((p) => ({ ...p, academicyear: v || "", program: "", programcode: "" })); loadPrograms(v || ""); }} renderInput={(params) => <TextField {...params} size="small" label="Academic year" />} />
      </Grid>
      <Grid item xs={12} md={4}>
        <Autocomplete options={programs} value={programs.find((p) => p.programcode === form.programcode) || null} getOptionLabel={(o) => `${o.program || o.name || ""} - ${o.programcode || ""}`} onChange={(_, v) => setForm((p) => ({ ...p, program: v?.program || v?.name || "", programcode: v?.programcode || "" }))} renderInput={(params) => <TextField {...params} size="small" label="Program / Program code" />} />
      </Grid>
    </>
  );
}

export function CrmTelecallerMappingPage() {
  const { options, years, programs, loadPrograms } = useCrmData();
  const [rows, setRows] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);
  const [form, setForm] = useState({ academicyear: "", program: "", programcode: "", type: "Telecaller", telecallers: [], status: "Active" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const people = useMemo(() => (options.users || []).filter((u) => !isStudent(u)), [options.users]);
  const loadRows = async () => {
    const res = await ep1.get("/api/v2/crm-management/telecaller-mappings", { params: { colid: global1.colid } });
    setRows(res.data?.data || []);
  };
  useEffect(() => { loadRows(); }, []);
  const save = async () => {
    try {
      setError("");
      await ep1.post("/api/v2/crm-management/telecaller-mappings", { ...form, colid: global1.colid, user: global1.user });
      setMessage("Mapping saved");
      setForm((p) => ({ ...p, telecallers: [] }));
      loadRows();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to save mapping");
    }
  };
  const bulkDelete = async () => {
    if (!selectedRows.length) return setError("Select rows to delete");
    await ep1.post("/api/v2/crm-management/telecaller-mappings-delete", { ids: selectedRows, colid: global1.colid });
    setSelectedRows([]);
    setMessage("Selected mappings deleted");
    loadRows();
  };
  return (
    <Shell title="Telecaller and campus visit counselors">
      {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2}>
          <ProgramSelector years={years} programs={programs} form={form} setForm={setForm} loadPrograms={loadPrograms} />
          <Grid item xs={12} md={2}><TextField select fullWidth size="small" label="Type" value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}><MenuItem value="Telecaller">Telecaller</MenuItem><MenuItem value="Campus Visit Counselor">Campus Visit Counselor</MenuItem></TextField></Grid>
          <Grid item xs={12} md={4}><Autocomplete multiple disableCloseOnSelect options={people} value={form.telecallers} getOptionLabel={(o) => `${o.name || ""} - ${o.email || ""}`} isOptionEqualToValue={(o, v) => o.email === v.email} onChange={(_, v) => setForm((p) => ({ ...p, telecallers: v }))} renderOption={(props, option, { selected }) => <li {...props}><Checkbox checked={selected} />{option.name} - {option.email}</li>} renderInput={(params) => <TextField {...params} size="small" label="Users" />} /></Grid>
          <Grid item xs={12} md={2}><Button fullWidth variant="contained" onClick={save}>Save mapping</Button></Grid>
          <Grid item xs={12} md={2}><Button fullWidth color="error" variant="outlined" disabled={!selectedRows.length} onClick={bulkDelete}>Bulk delete</Button></Grid>
        </Grid>
      </Paper>
      <Paper sx={{ p: 1 }}>
        <DataGrid rows={rows} getRowId={(r) => r._id} checkboxSelection rowSelectionModel={selectedRows} onRowSelectionModelChange={setSelectedRows} autoHeight slots={{ toolbar: GridToolbar }} columns={[
          { field: "academicyear", headerName: "Academic year", width: 140 },
          { field: "program", headerName: "Program", width: 220 },
          { field: "programcode", headerName: "Program code", width: 140 },
          { field: "type", headerName: "Type", width: 180 },
          { field: "telecallername", headerName: "Name", width: 200 },
          { field: "telecalleremail", headerName: "Email", width: 240 },
          { field: "status", headerName: "Status", width: 120 }
        ]} />
      </Paper>
    </Shell>
  );
}

function LeadFilterPanel({ filters, setFilters, options, years, programs, loadPrograms, apply }) {
  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Grid container spacing={2}>
        <ProgramSelector years={years} programs={programs} form={filters} setForm={setFilters} loadPrograms={loadPrograms} />
        <Grid item xs={12} md={2}><TextField fullWidth size="small" label="Search" value={filters.search || ""} onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))} /></Grid>
        <Grid item xs={12} md={2}><TextField select fullWidth size="small" label="Source" value={filters.source || ""} onChange={(e) => setFilters((p) => ({ ...p, source: e.target.value }))}><MenuItem value="">All</MenuItem>{(options.sources || []).map((s) => <MenuItem key={s._id} value={s.source_name}>{s.source_name}</MenuItem>)}</TextField></Grid>
        <Grid item xs={12} md={2}><TextField select fullWidth size="small" label="Stage" value={filters.pipeline_stage || ""} onChange={(e) => setFilters((p) => ({ ...p, pipeline_stage: e.target.value }))}><MenuItem value="">All</MenuItem>{(options.stages || []).map((s) => <MenuItem key={s._id} value={s.stagename}>{s.stagename}</MenuItem>)}</TextField></Grid>
        <Grid item xs={12} md={2}><Button fullWidth variant="contained" onClick={apply}>Apply</Button></Grid>
      </Grid>
    </Paper>
  );
}

const leadColumns = [
  { field: "name", headerName: "Lead", width: 180 },
  { field: "phone", headerName: "Phone", width: 130 },
  { field: "email", headerName: "Email", width: 200 },
  { field: "year", headerName: "Academic year", width: 130 },
  { field: "program", headerName: "Program", width: 180 },
  { field: "programcode", headerName: "Program code", width: 130 },
  { field: "course_interested", headerName: "Course interested", width: 190 },
  { field: "source", headerName: "Source", width: 130 },
  { field: "pipeline_stage", headerName: "Pipeline stage", width: 170 },
  { field: "assignedto", headerName: "Counselor", width: 220 },
  { field: "telecalleremail", headerName: "Telecaller", width: 220 },
  { field: "campusvisitcounseloremail", headerName: "Campus visit counselor", width: 240 }
];

const queueColumns = [
  { field: "tokennumber", headerName: "Token", width: 150 },
  { field: "name", headerName: "Name", width: 180 },
  { field: "phone", headerName: "Phone", width: 130 },
  { field: "email", headerName: "Email", width: 220 },
  { field: "academicyear", headerName: "Academic year", width: 130 },
  { field: "program", headerName: "Program", width: 180 },
  { field: "programcode", headerName: "Program code", width: 130 },
  { field: "visitdate", headerName: "Visit date", width: 130 },
  { field: "visittime", headerName: "Visit time", width: 120 },
  { field: "status", headerName: "Status", width: 120 },
  { field: "counseloremail", headerName: "Counselor", width: 220 },
  { field: "purpose", headerName: "Purpose", width: 220 }
];

export function CrmTelecallerBulkAssignmentPage() {
  const { options, years, programs, loadPrograms } = useCrmData();
  const [filters, setFilters] = useState({});
  const [rows, setRows] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);
  const [telecaller, setTelecaller] = useState(null);
  const [assignmentType, setAssignmentType] = useState("Telecaller");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const people = useMemo(() => (options.users || []).filter((u) => !isStudent(u)), [options.users]);
  const load = async () => {
    const res = await ep1.post("/api/v2/crm-management/leads/search", { ...filters, year: filters.academicyear, colid: global1.colid, page: 0, limit: 100 });
    setRows(res.data?.data || []);
  };
  const assign = async () => {
    try {
      if (!selectedRows.length || !telecaller) return setError("Select leads and user");
      const res = await ep1.post("/api/v2/crm-management/telecaller-bulk-assign", { ids: selectedRows, telecaller, assignmentType, colid: global1.colid, user: global1.user });
      setMessage(`${res.data?.modified || 0} leads assigned`);
      setSelectedRows([]);
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to assign leads");
    }
  };
  return (
    <Shell title="Telecaller bulk assignment">
      {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <LeadFilterPanel filters={filters} setFilters={setFilters} options={options} years={years} programs={programs} loadPrograms={loadPrograms} apply={load} />
      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={2}><TextField select fullWidth size="small" label="Assignment type" value={assignmentType} onChange={(e) => setAssignmentType(e.target.value)}><MenuItem value="Telecaller">Telecaller</MenuItem><MenuItem value="Campus Visit Counselor">Campus Visit Counselor</MenuItem></TextField></Grid>
          <Grid item xs={12} md={5}><Autocomplete options={people} value={telecaller} getOptionLabel={(o) => `${o.name || ""} - ${o.email || ""}`} onChange={(_, v) => setTelecaller(v)} renderInput={(params) => <TextField {...params} size="small" label="User" />} /></Grid>
          <Grid item xs={12} md={2}><Button fullWidth variant="contained" onClick={assign}>Assign selected</Button></Grid>
        </Grid>
      </Paper>
      <Paper sx={{ p: 1 }}><DataGrid rows={rows} getRowId={(r) => r._id} checkboxSelection rowSelectionModel={selectedRows} onRowSelectionModelChange={setSelectedRows} autoHeight slots={{ toolbar: GridToolbar }} columns={leadColumns} /></Paper>
    </Shell>
  );
}

export function CrmRandomTelecallerAssignmentPage() {
  const { options, years, programs, loadPrograms } = useCrmData();
  const [form, setForm] = useState({ academicyear: "", program: "", programcode: "", leadsPerTelecaller: 10, onlyUnassigned: "Yes", assignmentType: "Telecaller", telecallers: [] });
  const [preview, setPreview] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const people = useMemo(() => (options.users || []).filter((u) => !isStudent(u)), [options.users]);
  const assign = async () => {
    try {
      if (!form.telecallers.length) return setError("Select users");
      const res = await ep1.post("/api/v2/crm-management/telecaller-random-assign", { ...form, year: form.academicyear, colid: global1.colid, user: global1.user });
      setMessage(`${res.data?.assigned || 0} leads auto assigned`);
      setPreview(res.data?.preview || []);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to auto assign");
    }
  };
  return (
    <Shell title="Random telecaller assignment">
      {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2}>
          <ProgramSelector years={years} programs={programs} form={form} setForm={setForm} loadPrograms={loadPrograms} />
          <Grid item xs={12} md={2}><TextField select fullWidth size="small" label="Assignment type" value={form.assignmentType} onChange={(e) => setForm((p) => ({ ...p, assignmentType: e.target.value }))}><MenuItem value="Telecaller">Telecaller</MenuItem><MenuItem value="Campus Visit Counselor">Campus Visit Counselor</MenuItem></TextField></Grid>
          <Grid item xs={12} md={4}><Autocomplete multiple disableCloseOnSelect options={people} value={form.telecallers} getOptionLabel={(o) => `${o.name || ""} - ${o.email || ""}`} isOptionEqualToValue={(o, v) => o.email === v.email} onChange={(_, v) => setForm((p) => ({ ...p, telecallers: v }))} renderOption={(props, option, { selected }) => <li {...props}><Checkbox checked={selected} />{option.name} - {option.email}</li>} renderInput={(params) => <TextField {...params} size="small" label="Users" />} /></Grid>
          <Grid item xs={12} md={2}><TextField fullWidth size="small" type="number" label="Leads per telecaller" value={form.leadsPerTelecaller} onChange={(e) => setForm((p) => ({ ...p, leadsPerTelecaller: e.target.value }))} /></Grid>
          <Grid item xs={12} md={2}><TextField select fullWidth size="small" label="Only unassigned" value={form.onlyUnassigned} onChange={(e) => setForm((p) => ({ ...p, onlyUnassigned: e.target.value }))}><MenuItem value="Yes">Yes</MenuItem><MenuItem value="No">No</MenuItem></TextField></Grid>
          <Grid item xs={12} md={2}><Button fullWidth variant="contained" onClick={assign}>Auto allocate</Button></Grid>
        </Grid>
      </Paper>
      <Paper sx={{ p: 1 }}><DataGrid rows={preview.map((row, i) => ({ id: i + 1, ...row }))} autoHeight slots={{ toolbar: GridToolbar }} columns={[{ field: "lead", headerName: "Lead", width: 200 }, { field: "phone", headerName: "Phone", width: 140 }, { field: "email", headerName: "Email", width: 220 }, { field: "assignmentType", headerName: "Type", width: 190 }, { field: "assignedto", headerName: "Assigned user", width: 240 }]} /></Paper>
    </Shell>
  );
}

export function CrmTelecallerReportPage() {
  const { options, years, programs, loadPrograms } = useCrmData();
  const [filters, setFilters] = useState({});
  const [data, setData] = useState({ data: [], activities: [], summary: {} });
  const printRef = useRef(null);
  const people = useMemo(() => (options.users || []).filter((u) => !isStudent(u)), [options.users]);
  const load = async () => {
    const res = await ep1.post("/api/v2/crm-management/telecaller-report", { ...filters, year: filters.academicyear, colid: global1.colid });
    setData(res.data || { data: [], activities: [], summary: {} });
  };
  useEffect(() => { load(); }, []);
  const print = () => {
    const w = window.open("", "_blank");
    w.document.write(`<html><head><title>Telecaller Report</title><style>@page{size:A4;margin:12mm}body{font-family:Arial;color:#111}table{width:100%;border-collapse:collapse;font-size:11px}td,th{border:1px solid #ddd;padding:5px}.cards{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.card{border:1px solid #ddd;padding:8px}</style></head><body>${printRef.current?.innerHTML || ""}</body></html>`);
    w.document.close();
    w.print();
  };
  return (
    <Shell title="Telecaller report">
      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2}>
          <ProgramSelector years={years} programs={programs} form={filters} setForm={setFilters} loadPrograms={loadPrograms} />
          <Grid item xs={12} md={2}><TextField select fullWidth size="small" label="Assignment type" value={filters.assignmentType || "Telecaller"} onChange={(e) => setFilters((p) => ({ ...p, assignmentType: e.target.value }))}><MenuItem value="Telecaller">Telecaller</MenuItem><MenuItem value="Campus Visit Counselor">Campus Visit Counselor</MenuItem></TextField></Grid>
          <Grid item xs={12} md={3}><Autocomplete options={people} value={people.find((p) => p.email === filters.telecalleremail) || null} getOptionLabel={(o) => `${o.name || ""} - ${o.email || ""}`} onChange={(_, v) => setFilters((p) => ({ ...p, telecalleremail: v?.email || "" }))} renderInput={(params) => <TextField {...params} size="small" label="Assigned user" />} /></Grid>
          <Grid item xs={12} md={2}><TextField select fullWidth size="small" label="Stage" value={filters.pipeline_stage || ""} onChange={(e) => setFilters((p) => ({ ...p, pipeline_stage: e.target.value }))}><MenuItem value="">All</MenuItem>{(options.stages || []).map((s) => <MenuItem key={s._id} value={s.stagename}>{s.stagename}</MenuItem>)}</TextField></Grid>
          <Grid item xs={12} md={2}><Button fullWidth variant="contained" onClick={load}>Apply</Button></Grid>
          <Grid item xs={12} md={2}><Button fullWidth variant="outlined" onClick={print}>Print</Button></Grid>
        </Grid>
      </Paper>
      <Box ref={printRef}>
        <Grid container spacing={2} sx={{ mb: 2 }}>
          {[["Total leads", data.summary?.total || 0], ["Assigned", data.summary?.assigned || 0], ["Active", data.summary?.active || 0], ["Interactions", data.summary?.interactions || 0]].map(([label, value]) => <Grid item xs={12} md={3} key={label}><Card><CardContent><Typography color="text.secondary">{label}</Typography><Typography variant="h4" fontWeight={900}>{value}</Typography></CardContent></Card></Grid>)}
        </Grid>
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} md={6}><Paper sx={{ p: 2, height: 320 }}><Typography fontWeight={800}>Telecaller wise leads</Typography><ResponsiveContainer><BarChart data={data.summary?.byTelecaller || []}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Bar dataKey="count" fill="#2563eb" /></BarChart></ResponsiveContainer></Paper></Grid>
          <Grid item xs={12} md={6}><Paper sx={{ p: 2, height: 320 }}><Typography fontWeight={800}>Pipeline stage</Typography><ResponsiveContainer><PieChart><Pie data={data.summary?.byStage || []} dataKey="count" nameKey="name" outerRadius={110}>{(data.summary?.byStage || []).map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></Paper></Grid>
        </Grid>
        <Paper sx={{ p: 1, mb: 2 }}><Typography fontWeight={800}>Lead details</Typography><DataGrid rows={data.data || []} getRowId={(r) => r._id} autoHeight slots={{ toolbar: GridToolbar }} columns={leadColumns} /></Paper>
        <Paper sx={{ p: 1 }}><Typography fontWeight={800}>Activity logs</Typography><DataGrid rows={data.activities || []} getRowId={(r) => r._id} autoHeight slots={{ toolbar: GridToolbar }} columns={[{ field: "activity_type", headerName: "Activity", width: 180 }, { field: "performed_by", headerName: "User", width: 220 }, { field: "activity_date", headerName: "Date", width: 180, valueGetter: ({ row }) => row.activity_date ? String(row.activity_date).slice(0, 10) : "" }, { field: "notes", headerName: "Comments", width: 260 }, { field: "outcome", headerName: "Outcome", width: 200 }]} /></Paper>
      </Box>
    </Shell>
  );
}

export function CrmTelecallerCounselorAssignmentPage() {
  const { options, years, programs, loadPrograms } = useCrmData();
  const [filters, setFilters] = useState({});
  const [rows, setRows] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);
  const [counselor, setCounselor] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const people = useMemo(() => (options.users || []).filter((u) => !isStudent(u)), [options.users]);
  const load = async () => {
    const res = await ep1.post("/api/v2/crm-management/leads/search", { ...filters, year: filters.academicyear, telecalleremail: global1.user, colid: global1.colid, page: 0, limit: 100 });
    setRows(res.data?.data || []);
  };
  useEffect(() => { load(); }, []);
  const assign = async () => {
    try {
      setError("");
      if (!selectedRows.length || !counselor) return setError("Select leads and counselor");
      const res = await ep1.post("/api/v2/crm-management/telecaller-assign-counselor", { ids: selectedRows, counselor, telecalleremail: global1.user, colid: global1.colid });
      setMessage(`${res.data?.modified || 0} leads assigned to counselor`);
      setSelectedRows([]);
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to assign counselor");
    }
  };
  return (
    <Shell title="Assign leads to counselor">
      {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <LeadFilterPanel filters={filters} setFilters={setFilters} options={options} years={years} programs={programs} loadPrograms={loadPrograms} apply={load} />
      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}><Autocomplete options={people} value={counselor} getOptionLabel={(o) => `${o.name || ""} - ${o.email || ""}`} onChange={(_, v) => setCounselor(v)} renderInput={(params) => <TextField {...params} size="small" label="Counselor" />} /></Grid>
          <Grid item xs={12} md={2}><Button fullWidth variant="contained" onClick={assign}>Assign selected</Button></Grid>
        </Grid>
      </Paper>
      <Paper sx={{ p: 1 }}><DataGrid rows={rows} getRowId={(r) => r._id} checkboxSelection rowSelectionModel={selectedRows} onRowSelectionModelChange={setSelectedRows} autoHeight slots={{ toolbar: GridToolbar }} columns={leadColumns} /></Paper>
    </Shell>
  );
}

export function CrmCounselorCampusVisitPage() {
  const { options, years, programs, loadPrograms } = useCrmData();
  const [filters, setFilters] = useState({});
  const [rows, setRows] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);
  const [campusCounselor, setCampusCounselor] = useState(null);
  const [visit, setVisit] = useState({ visitdate: "", visittime: "", comments: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const people = useMemo(() => (options.users || []).filter((u) => !isStudent(u)), [options.users]);
  const load = async () => {
    const res = await ep1.post("/api/v2/crm-management/leads/search", { ...filters, year: filters.academicyear, assignedto: global1.user, colid: global1.colid, page: 0, limit: 100 });
    setRows(res.data?.data || []);
  };
  useEffect(() => { load(); }, []);
  const mark = async () => {
    try {
      setError("");
      if (!selectedRows.length || !campusCounselor) return setError("Select leads and campus visit counselor");
      const res = await ep1.post("/api/v2/crm-management/campus-visit-mark", { ids: selectedRows, campusCounselor, ...visit, user: global1.user, colid: global1.colid });
      setMessage(`${res.data?.modified || 0} leads marked for campus visit`);
      setSelectedRows([]);
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to mark campus visit");
    }
  };
  return (
    <Shell title="Mark campus visit">
      {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <LeadFilterPanel filters={filters} setFilters={setFilters} options={options} years={years} programs={programs} loadPrograms={loadPrograms} apply={load} />
      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}><Autocomplete options={people} value={campusCounselor} getOptionLabel={(o) => `${o.name || ""} - ${o.email || ""}`} onChange={(_, v) => setCampusCounselor(v)} renderInput={(params) => <TextField {...params} size="small" label="Campus visit counselor" />} /></Grid>
          <Grid item xs={12} md={2}><TextField fullWidth size="small" type="date" label="Visit date" InputLabelProps={{ shrink: true }} value={visit.visitdate} onChange={(e) => setVisit((p) => ({ ...p, visitdate: e.target.value }))} /></Grid>
          <Grid item xs={12} md={2}><TextField fullWidth size="small" type="time" label="Visit time" InputLabelProps={{ shrink: true }} value={visit.visittime} onChange={(e) => setVisit((p) => ({ ...p, visittime: e.target.value }))} /></Grid>
          <Grid item xs={12} md={3}><TextField fullWidth size="small" label="Comments" value={visit.comments} onChange={(e) => setVisit((p) => ({ ...p, comments: e.target.value }))} /></Grid>
          <Grid item xs={12} md={1}><Button fullWidth variant="contained" onClick={mark}>Mark</Button></Grid>
        </Grid>
      </Paper>
      <Paper sx={{ p: 1 }}><DataGrid rows={rows} getRowId={(r) => r._id} checkboxSelection rowSelectionModel={selectedRows} onRowSelectionModelChange={setSelectedRows} autoHeight slots={{ toolbar: GridToolbar }} columns={leadColumns} /></Paper>
    </Shell>
  );
}

export function CrmCampusVisitFormPage() {
  const { years, programs, loadPrograms } = useCrmData();
  const [form, setForm] = useState({ name: "", phone: "", email: "", academicyear: "", program: "", programcode: "", course_interested: "", purpose: "" });
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const submit = async () => {
    try {
      setError("");
      setToken("");
      const params = new URLSearchParams(window.location.search);
      const res = await ep1.post("/api/v2/crm-management/campus-visit-form", { ...form, colid: Number(params.get("colid") || global1.colid), user: global1.user || "campus-visit-form" });
      setToken(res.data?.tokennumber || "");
      setForm((p) => ({ ...p, name: "", phone: "", email: "", course_interested: "", purpose: "" }));
    } catch (err) {
      setError(err.response?.data?.message || "Unable to submit campus visit form");
    }
  };
  return (
    <Shell title="Campus visit form">
      {token && <Alert severity="success" sx={{ mb: 2 }}>Your campus visit token is <strong>{token}</strong></Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Paper sx={{ p: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}><TextField fullWidth size="small" label="Name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} /></Grid>
          <Grid item xs={12} md={4}><TextField fullWidth size="small" label="Phone" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} /></Grid>
          <Grid item xs={12} md={4}><TextField fullWidth size="small" label="Email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} /></Grid>
          <ProgramSelector years={years} programs={programs} form={form} setForm={setForm} loadPrograms={loadPrograms} />
          <Grid item xs={12} md={4}><TextField fullWidth size="small" label="Course interested" value={form.course_interested} onChange={(e) => setForm((p) => ({ ...p, course_interested: e.target.value }))} /></Grid>
          <Grid item xs={12}><TextField fullWidth multiline minRows={3} label="Purpose / notes" value={form.purpose} onChange={(e) => setForm((p) => ({ ...p, purpose: e.target.value }))} /></Grid>
          <Grid item xs={12} md={2}><Button fullWidth variant="contained" onClick={submit}>Submit and get token</Button></Grid>
        </Grid>
      </Paper>
    </Shell>
  );
}

export function CrmCampusVisitQueuePage() {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState("Waiting");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const load = async () => {
    const params = { colid: global1.colid, status };
    if (status === "Assigned") params.counseloremail = global1.user;
    const res = await ep1.get("/api/v2/crm-management/campus-visit-queue", { params });
    setRows(res.data?.data || []);
  };
  useEffect(() => { load(); }, [status]);
  const take = async (row) => {
    try {
      setError("");
      await ep1.post("/api/v2/crm-management/campus-visit-queue/take", { id: row._id, colid: global1.colid, counselor: { name: global1.name, email: global1.user } });
      setMessage(`Token ${row.tokennumber} assigned to you`);
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to take queue token");
    }
  };
  return (
    <Shell title="Campus visit queue">
      {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={3}><TextField select fullWidth size="small" label="Queue status" value={status} onChange={(e) => setStatus(e.target.value)}><MenuItem value="Waiting">Waiting</MenuItem><MenuItem value="Assigned">Assigned to me</MenuItem><MenuItem value="All">All</MenuItem></TextField></Grid>
          <Grid item xs={12} md={2}><Button fullWidth variant="outlined" onClick={load}>Refresh</Button></Grid>
        </Grid>
      </Paper>
      <Paper sx={{ p: 1 }}><DataGrid rows={rows} getRowId={(r) => r._id} autoHeight slots={{ toolbar: GridToolbar }} columns={[...queueColumns, { field: "action", headerName: "Action", width: 140, sortable: false, renderCell: ({ row }) => row.status === "Waiting" ? <Button size="small" variant="contained" onClick={() => take(row)}>Take</Button> : "" }]} /></Paper>
    </Shell>
  );
}

export function CrmCampusVisitCommentsPage() {
  const { options } = useCrmData();
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ comments: "", pipeline_stage: "", next_followup_date: "", queueStatus: "Completed", status: "Yes" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const load = async () => {
    const res = await ep1.get("/api/v2/crm-management/campus-visit-queue", { params: { colid: global1.colid, status: "Assigned", counseloremail: global1.user } });
    setRows(res.data?.data || []);
  };
  useEffect(() => { load(); }, []);
  const save = async () => {
    try {
      setError("");
      if (!selected) return setError("Select a lead token");
      await ep1.post("/api/v2/crm-management/campus-visit-comment", { queueid: selected._id, leadid: selected.leadid, ...form, colid: global1.colid, user: global1.user, counseloremail: global1.user });
      setMessage("Campus visit comments saved in activity log");
      setSelected(null);
      setForm({ comments: "", pipeline_stage: "", next_followup_date: "", queueStatus: "Completed", status: "Yes" });
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to save comments");
    }
  };
  return (
    <Shell title="Campus visit comments">
      {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Grid container spacing={2}>
        <Grid item xs={12} md={7}><Paper sx={{ p: 1 }}><DataGrid rows={rows} getRowId={(r) => r._id} autoHeight slots={{ toolbar: GridToolbar }} columns={queueColumns} onRowClick={({ row }) => setSelected(row)} /></Paper></Grid>
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 2 }}>
            <Typography fontWeight={900} sx={{ mb: 2 }}>{selected ? `${selected.tokennumber} - ${selected.name}` : "Select a queue token"}</Typography>
            <Stack spacing={2}>
              <TextField select fullWidth size="small" label="Pipeline stage" value={form.pipeline_stage} onChange={(e) => setForm((p) => ({ ...p, pipeline_stage: e.target.value }))}><MenuItem value="">No change</MenuItem>{(options.stages || []).map((s) => <MenuItem key={s._id} value={s.stagename}>{s.stagename}</MenuItem>)}</TextField>
              <TextField fullWidth size="small" type="date" label="Next follow up" InputLabelProps={{ shrink: true }} value={form.next_followup_date} onChange={(e) => setForm((p) => ({ ...p, next_followup_date: e.target.value }))} />
              <TextField select fullWidth size="small" label="Lead campus visit status" value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}><MenuItem value="Yes">Completed</MenuItem><MenuItem value="In Progress">In progress</MenuItem><MenuItem value="No">Not completed</MenuItem></TextField>
              <TextField select fullWidth size="small" label="Queue status" value={form.queueStatus} onChange={(e) => setForm((p) => ({ ...p, queueStatus: e.target.value }))}><MenuItem value="Completed">Completed</MenuItem><MenuItem value="Assigned">Keep assigned</MenuItem></TextField>
              <TextField fullWidth multiline minRows={5} label="Comments" value={form.comments} onChange={(e) => setForm((p) => ({ ...p, comments: e.target.value }))} />
              <Button variant="contained" disabled={!selected} onClick={save}>Save comments</Button>
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </Shell>
  );
}
