import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  Grid,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import { DataGrid, GridToolbar } from "@mui/x-data-grid";
import { Delete, PlayArrow, Print, Save } from "@mui/icons-material";
import MenuPageShell from "./MenuPageShell";
import ep1 from "../api/ep1";
import global1 from "./global1";

const initialForm = {
  agentname: "Personal Data Agent",
  academicyear: "",
  projectsperfaculty: 1,
  publicationsperfaculty: 1,
  seminarsperfaculty: 1,
  dayofweek: "Monday",
  timeofrunning: "09:00",
  reportemail: "",
  status: "Active"
};
const filterFields = ["agentname", "academicyear", "dayofweek", "timeofrunning", "reportemail", "status"];
const gridSx = {
  "& .MuiDataGrid-cell": { whiteSpace: "normal", overflowWrap: "anywhere", lineHeight: 1.35, py: 1 },
  "& .MuiDataGrid-columnHeaderTitle": { whiteSpace: "normal", lineHeight: 1.2 }
};
const rowsOf = (rows = []) => rows.map((row) => ({ ...row, id: row._id }));
const uniq = (rows, field) => [...new Set((rows || []).map((row) => row?.[field]).filter(Boolean))].sort();
const fmt = (value) => value ? new Date(value).toLocaleString() : "";

function DynamicFilters({ filters, setFilters, valueOptions, onApply }) {
  return (
    <Paper sx={{ p: 2 }}>
      <Stack spacing={1.2}>
        {filters.map((filter, index) => (
          <Grid container spacing={1.2} key={`agent-filter-${index}`}>
            <Grid item xs={12} md={3}><Autocomplete options={filterFields} value={filter.field || ""} onChange={(_, value) => setFilters((prev) => prev.map((row, i) => i === index ? { ...row, field: value || filterFields[0], value: "" } : row))} renderInput={(params) => <TextField {...params} label="Field" />} /></Grid>
            <Grid item xs={12} md={2}><TextField select fullWidth label="Operator" value={filter.operator} onChange={(e) => setFilters((prev) => prev.map((row, i) => i === index ? { ...row, operator: e.target.value } : row))}><MenuItem value="contains">Contains</MenuItem><MenuItem value="equals">Equals</MenuItem></TextField></Grid>
            <Grid item xs={12} md={6}>
              <Autocomplete
                freeSolo
                options={valueOptions[filter.field] || []}
                value={filter.value || ""}
                onInputChange={(_, value) => setFilters((prev) => prev.map((row, i) => i === index ? { ...row, value } : row))}
                onChange={(_, value) => setFilters((prev) => prev.map((row, i) => i === index ? { ...row, value: value || "" } : row))}
                renderInput={(params) => <TextField {...params} label="Value" />}
              />
            </Grid>
            <Grid item xs={12} md={1}><Button fullWidth color="error" sx={{ height: 56 }} onClick={() => setFilters((prev) => prev.filter((_, i) => i !== index))}>Remove</Button></Grid>
          </Grid>
        ))}
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" onClick={() => setFilters((prev) => [...prev, { field: filterFields[0], operator: "contains", value: "" }])}>Add filter</Button>
          <Button variant="contained" onClick={onApply}>Apply</Button>
        </Stack>
      </Stack>
    </Paper>
  );
}

function printLogs(logs = []) {
  const rows = logs.map((row, index) => `<tr><td>${index + 1}</td><td>${row.agentname || ""}</td><td>${row.academicyear || ""}</td><td>${fmt(row.runat)}</td><td>${row.reportemail || ""}</td><td>${row.status || ""}</td><td>${row.facultycount || 0}</td><td>${row.deficitcount || 0}</td><td>${row.error || ""}</td></tr>`).join("");
  const win = window.open("", "_blank", "width=1100,height=800");
  if (!win) return;
  win.document.write(`<!doctype html><html><head><title>Personal Data Agent Logs</title><style>body{font-family:Arial;color:#000}.actions{padding:10px;border-bottom:1px solid #ccc}.page{padding:16mm}table{width:100%;border-collapse:collapse;font-size:12px}td,th{border:1px solid #111;padding:6px;vertical-align:top}th{background:#eee}@media print{.actions{display:none}}</style></head><body><div class="actions"><button onclick="window.print()">Print</button><button onclick="window.close()">Close</button></div><div class="page"><h2>${global1.insname || "Institution"}</h2><h3>Personal Data Agent Logs</h3><table><thead><tr><th>Sr</th><th>Agent</th><th>Academic Year</th><th>Run At</th><th>Email</th><th>Status</th><th>Faculty</th><th>Deficit</th><th>Error</th></tr></thead><tbody>${rows}</tbody></table></div></body></html>`);
  win.document.close();
}

export default function PersonalDataAgentPage() {
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState("");
  const [agents, setAgents] = useState([]);
  const [logs, setLogs] = useState([]);
  const [options, setOptions] = useState({ days: [], academicyears: [] });
  const [selectedIds, setSelectedIds] = useState([]);
  const [filters, setFilters] = useState([{ field: "status", operator: "equals", value: "Active" }]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const valueOptions = useMemo(() => ({
    agentname: uniq(agents, "agentname"),
    academicyear: [...new Set([...(options.academicyears || []), ...uniq(agents, "academicyear")])].sort(),
    dayofweek: options.days || [],
    timeofrunning: uniq(agents, "timeofrunning"),
    reportemail: uniq(agents, "reportemail"),
    status: ["Active", "Inactive"]
  }), [agents, options]);

  const load = async () => {
    setLoading(true);
    try {
      const [opt, list, logRes] = await Promise.all([
        ep1.get("/api/v2/personal-data-agent/options", { params: { colid: global1.colid } }),
        ep1.get("/api/v2/personal-data-agent/list", { params: { colid: global1.colid } }),
        ep1.get("/api/v2/personal-data-agent/logs", { params: { colid: global1.colid } })
      ]);
      setOptions(opt.data || { days: [], academicyears: [] });
      setAgents(list.data?.data || []);
      setLogs(logRes.data?.data || opt.data?.logs || []);
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to load personal data agents.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const applyFilters = async () => {
    const params = { colid: global1.colid };
    filters.filter((f) => f.value).forEach((f) => { params[f.field] = f.value; });
    const res = await ep1.get("/api/v2/personal-data-agent/list", { params });
    setAgents(res.data?.data || []);
  };

  const save = async () => {
    setLoading(true);
    try {
      await ep1.post("/api/v2/personal-data-agent/save", { ...form, id: editingId, colid: global1.colid, name: global1.name, user: global1.user });
      setForm(initialForm);
      setEditingId("");
      setMessage("Personal data agent saved.");
      await load();
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to save agent.");
    } finally {
      setLoading(false);
    }
  };

  const edit = (row) => {
    setEditingId(row._id);
    setForm({ ...initialForm, ...row });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteSelected = async () => {
    if (!selectedIds.length || !window.confirm(`Delete ${selectedIds.length} agent(s)?`)) return;
    await ep1.post("/api/v2/personal-data-agent/delete", { colid: global1.colid, ids: selectedIds });
    setSelectedIds([]);
    await load();
  };

  const runNow = async (row) => {
    setLoading(true);
    try {
      const res = await ep1.post("/api/v2/personal-data-agent/run-now", { colid: global1.colid, id: row._id });
      setMessage(`Run completed with status ${res.data?.data?.status || ""}.`);
      await load();
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to run agent.");
    } finally {
      setLoading(false);
    }
  };

  const agentColumns = [
    { field: "agentname", headerName: "Agent", minWidth: 190 },
    { field: "academicyear", headerName: "Academic Year", minWidth: 130 },
    { field: "projectsperfaculty", headerName: "Projects / Faculty", minWidth: 140 },
    { field: "publicationsperfaculty", headerName: "Publications / Faculty", minWidth: 170 },
    { field: "seminarsperfaculty", headerName: "Seminars / Faculty", minWidth: 150 },
    { field: "dayofweek", headerName: "Day", minWidth: 120 },
    { field: "timeofrunning", headerName: "Time", minWidth: 110 },
    { field: "reportemail", headerName: "Report Email", minWidth: 220 },
    { field: "status", headerName: "Status", minWidth: 110 },
    { field: "laststatus", headerName: "Last Status", minWidth: 130 },
    { field: "lastrunat", headerName: "Last Run", minWidth: 180, valueFormatter: ({ value }) => fmt(value) },
    { field: "actions", headerName: "Actions", minWidth: 190, sortable: false, renderCell: ({ row }) => <Stack direction="row" spacing={0.8}><Button size="small" onClick={() => edit(row)}>Edit</Button><Button size="small" startIcon={<PlayArrow />} onClick={() => runNow(row)}>Run</Button></Stack> }
  ];
  const logColumns = [
    { field: "agentname", headerName: "Agent", minWidth: 190 },
    { field: "academicyear", headerName: "Academic Year", minWidth: 130 },
    { field: "runat", headerName: "Run At", minWidth: 180, valueFormatter: ({ value }) => fmt(value) },
    { field: "reportemail", headerName: "Report Email", minWidth: 220 },
    { field: "status", headerName: "Status", minWidth: 110 },
    { field: "facultycount", headerName: "Faculty", minWidth: 100 },
    { field: "deficitcount", headerName: "Deficit", minWidth: 100 },
    { field: "error", headerName: "Error", minWidth: 260, flex: 1 }
  ];

  return (
    <MenuPageShell title="Personal Data Agent">
      <Box sx={{ p: 2, bgcolor: "#f6f8fb", minHeight: "100vh" }}>
        <Stack spacing={2}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="h5" fontWeight={900} sx={{ flex: 1 }}>Personal Data Agent</Typography>
            <Button color="error" startIcon={<Delete />} variant="outlined" disabled={!selectedIds.length} onClick={deleteSelected}>Bulk delete</Button>
          </Stack>
          {message && <Alert severity={/unable|missing|required|failed/i.test(message) ? "warning" : "success"} onClose={() => setMessage("")}>{message}</Alert>}
          <Grid container spacing={2}>
            <Grid item xs={12} md={3}><Card><CardContent><Typography color="text.secondary">Active agents</Typography><Typography variant="h4" fontWeight={900}>{agents.filter((a) => a.status === "Active").length}</Typography></CardContent></Card></Grid>
            <Grid item xs={12} md={3}><Card><CardContent><Typography color="text.secondary">Runs logged</Typography><Typography variant="h4" fontWeight={900}>{logs.length}</Typography></CardContent></Card></Grid>
            <Grid item xs={12} md={3}><Card><CardContent><Typography color="text.secondary">Latest deficit</Typography><Typography variant="h4" fontWeight={900}>{logs[0]?.deficitcount || 0}</Typography></CardContent></Card></Grid>
            <Grid item xs={12} md={3}><Card><CardContent><Typography color="text.secondary">Scheduler</Typography><Chip label="Runs every minute" color="primary" /></CardContent></Card></Grid>
          </Grid>
          <Paper sx={{ p: 2 }}>
            <Grid container spacing={1.5}>
              <Grid item xs={12} md={3}><TextField fullWidth label="Agent name" value={form.agentname} onChange={(e) => setForm((p) => ({ ...p, agentname: e.target.value }))} /></Grid>
              <Grid item xs={12} md={2}><Autocomplete freeSolo options={options.academicyears || []} value={form.academicyear || ""} onInputChange={(_, value) => setForm((p) => ({ ...p, academicyear: value }))} renderInput={(params) => <TextField {...params} label="Academic year" required />} /></Grid>
              <Grid item xs={12} md={2}><TextField fullWidth type="number" label="Projects per faculty" value={form.projectsperfaculty} onChange={(e) => setForm((p) => ({ ...p, projectsperfaculty: e.target.value }))} /></Grid>
              <Grid item xs={12} md={2}><TextField fullWidth type="number" label="Publications per faculty" value={form.publicationsperfaculty} onChange={(e) => setForm((p) => ({ ...p, publicationsperfaculty: e.target.value }))} /></Grid>
              <Grid item xs={12} md={2}><TextField fullWidth type="number" label="Seminars per faculty" value={form.seminarsperfaculty} onChange={(e) => setForm((p) => ({ ...p, seminarsperfaculty: e.target.value }))} /></Grid>
              <Grid item xs={12} md={2}><Autocomplete options={options.days || []} value={form.dayofweek || ""} onChange={(_, value) => setForm((p) => ({ ...p, dayofweek: value || "" }))} renderInput={(params) => <TextField {...params} label="Day of running" required />} /></Grid>
              <Grid item xs={12} md={2}><TextField fullWidth type="time" label="Time of running" InputLabelProps={{ shrink: true }} value={form.timeofrunning} onChange={(e) => setForm((p) => ({ ...p, timeofrunning: e.target.value }))} /></Grid>
              <Grid item xs={12} md={3}><TextField fullWidth label="Email address to send report to" value={form.reportemail} onChange={(e) => setForm((p) => ({ ...p, reportemail: e.target.value }))} /></Grid>
              <Grid item xs={12} md={2}><TextField select fullWidth label="Status" value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}><MenuItem value="Active">Active</MenuItem><MenuItem value="Inactive">Inactive</MenuItem></TextField></Grid>
              <Grid item xs={12} md={2}><Button fullWidth sx={{ height: 56 }} disabled={loading} variant="contained" startIcon={<Save />} onClick={save}>{editingId ? "Update" : "Save"}</Button></Grid>
              {editingId && <Grid item xs={12} md={2}><Button fullWidth sx={{ height: 56 }} variant="outlined" onClick={() => { setEditingId(""); setForm(initialForm); }}>Cancel edit</Button></Grid>}
            </Grid>
          </Paper>
          <DynamicFilters filters={filters} setFilters={setFilters} valueOptions={valueOptions} onApply={applyFilters} />
          <Paper sx={{ p: 1 }}>
            <DataGrid rows={rowsOf(agents)} columns={agentColumns} checkboxSelection onRowSelectionModelChange={(ids) => setSelectedIds(ids)} rowSelectionModel={selectedIds} slots={{ toolbar: GridToolbar }} slotProps={{ toolbar: { showQuickFilter: true, csvOptions: { fileName: "personal-data-agents" } } }} pageSizeOptions={[10, 25, 50, 100]} getRowHeight={() => "auto"} sx={gridSx} autoHeight />
          </Paper>
          <Paper sx={{ p: 1 }}>
            <Stack direction="row" sx={{ p: 1 }} alignItems="center">
              <Typography variant="h6" fontWeight={900} sx={{ flex: 1 }}>Run Logs</Typography>
              <Button startIcon={<Print />} variant="outlined" disabled={!logs.length} onClick={() => printLogs(logs)}>Print logs</Button>
            </Stack>
            <DataGrid rows={rowsOf(logs)} columns={logColumns} slots={{ toolbar: GridToolbar }} slotProps={{ toolbar: { showQuickFilter: true, csvOptions: { fileName: "personal-data-agent-logs" } } }} pageSizeOptions={[10, 25, 50, 100]} getRowHeight={() => "auto"} sx={gridSx} autoHeight />
          </Paper>
        </Stack>
      </Box>
    </MenuPageShell>
  );
}
