import React, { useEffect, useMemo, useState } from "react";
import { Alert, Autocomplete, Box, Button, Card, CardContent, Grid, MenuItem, Paper, Stack, TextField, Typography } from "@mui/material";
import { DataGrid, GridToolbar } from "@mui/x-data-grid";
import { Delete, PlayArrow, Save } from "@mui/icons-material";
import MenuPageShell from "./MenuPageShell";
import ep1 from "../api/ep1";
import global1 from "./global1";

const initialForm = { agentname: "VAC Compliance Agent", academicyear: "", dayofweek: "Monday", timeofrunning: "09:00", reportemail: "", targetcoursesperdepartment: 1, minhours: 30, status: "Active" };
const gridSx = {
  "& .MuiDataGrid-cell": { whiteSpace: "normal", overflowWrap: "anywhere", lineHeight: 1.35, py: 1 },
  "& .MuiDataGrid-columnHeaderTitle": { whiteSpace: "normal", lineHeight: 1.2 }
};
const rowsOf = (rows = []) => rows.map((row) => ({ ...row, id: row._id }));
const fmt = (value) => value ? new Date(value).toLocaleString() : "";

export default function VacComplianceAgentPage() {
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState("");
  const [agents, setAgents] = useState([]);
  const [logs, setLogs] = useState([]);
  const [options, setOptions] = useState({ days: [], academicyears: [] });
  const [selectedIds, setSelectedIds] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [opt, list, logRes] = await Promise.all([
        ep1.get("/api/v2/vac-compliance-agent/options", { params: { colid: global1.colid } }),
        ep1.get("/api/v2/vac-compliance-agent/list", { params: { colid: global1.colid } }),
        ep1.get("/api/v2/vac-compliance-agent/logs", { params: { colid: global1.colid } })
      ]);
      setOptions(opt.data || {});
      setAgents(list.data?.data || []);
      setLogs(logRes.data?.data || opt.data?.logs || []);
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to load VAC compliance agents.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    setLoading(true);
    try {
      await ep1.post("/api/v2/vac-compliance-agent/save", { ...form, id: editingId, colid: global1.colid, name: global1.name, user: global1.user });
      setForm(initialForm);
      setEditingId("");
      setMessage("VAC compliance agent saved.");
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
    await ep1.post("/api/v2/vac-compliance-agent/delete", { colid: global1.colid, ids: selectedIds });
    setSelectedIds([]);
    await load();
  };
  const runNow = async (row) => {
    setLoading(true);
    try {
      const res = await ep1.post("/api/v2/vac-compliance-agent/run-now", { colid: global1.colid, id: row._id });
      setMessage(`Run completed with status ${res.data?.data?.status || ""}.`);
      await load();
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to run agent.");
    } finally {
      setLoading(false);
    }
  };
  const valueOptions = useMemo(() => ({ academicyear: options.academicyears || [], dayofweek: options.days || [] }), [options]);
  const agentColumns = [
    { field: "agentname", headerName: "Agent", minWidth: 190 },
    { field: "academicyear", headerName: "Academic Year", minWidth: 130 },
    { field: "targetcoursesperdepartment", headerName: "Target Courses / Department", minWidth: 210 },
    { field: "minhours", headerName: "Min Hours", minWidth: 120 },
    { field: "dayofweek", headerName: "Day", minWidth: 120 },
    { field: "timeofrunning", headerName: "Time", minWidth: 110 },
    { field: "reportemail", headerName: "Report Email", minWidth: 220 },
    { field: "status", headerName: "Status", minWidth: 110 },
    { field: "laststatus", headerName: "Last Status", minWidth: 130 },
    { field: "lastmessage", headerName: "Last Message", minWidth: 220 },
    { field: "actions", headerName: "Actions", minWidth: 190, sortable: false, renderCell: ({ row }) => <Stack direction="row" spacing={0.8}><Button size="small" onClick={() => edit(row)}>Edit</Button><Button size="small" startIcon={<PlayArrow />} onClick={() => runNow(row)}>Run</Button></Stack> }
  ];
  const logColumns = [
    { field: "agentname", headerName: "Agent", minWidth: 190 },
    { field: "academicyear", headerName: "Academic Year", minWidth: 130 },
    { field: "runat", headerName: "Run At", minWidth: 180, valueFormatter: ({ value }) => fmt(value) },
    { field: "reportemail", headerName: "Report Email", minWidth: 220 },
    { field: "status", headerName: "Status", minWidth: 110 },
    { field: "departmentcount", headerName: "Departments", minWidth: 120 },
    { field: "deviationcount", headerName: "Deviations", minWidth: 120 },
    { field: "error", headerName: "Error", minWidth: 260, flex: 1 }
  ];
  return (
    <MenuPageShell title="VAC Compliance Agent">
      <Box sx={{ p: 2, bgcolor: "#f6f8fb", minHeight: "100vh" }}>
        <Stack spacing={2}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="h5" fontWeight={900} sx={{ flex: 1 }}>VAC Compliance Agent</Typography>
            <Button color="error" startIcon={<Delete />} variant="outlined" disabled={!selectedIds.length} onClick={deleteSelected}>Bulk delete</Button>
          </Stack>
          {message && <Alert severity={/unable|missing|required|failed/i.test(message) ? "warning" : "success"} onClose={() => setMessage("")}>{message}</Alert>}
          <Grid container spacing={2}>
            <Grid item xs={12} md={3}><Card><CardContent><Typography color="text.secondary">Agents</Typography><Typography variant="h4" fontWeight={900}>{agents.length}</Typography></CardContent></Card></Grid>
            <Grid item xs={12} md={3}><Card><CardContent><Typography color="text.secondary">Runs logged</Typography><Typography variant="h4" fontWeight={900}>{logs.length}</Typography></CardContent></Card></Grid>
            <Grid item xs={12} md={3}><Card><CardContent><Typography color="text.secondary">Latest deviations</Typography><Typography variant="h4" fontWeight={900}>{logs[0]?.deviationcount || 0}</Typography></CardContent></Card></Grid>
            <Grid item xs={12} md={3}><Card><CardContent><Typography color="text.secondary">Scheduler</Typography><Typography fontWeight={900}>Weekly day/time</Typography></CardContent></Card></Grid>
          </Grid>
          <Paper sx={{ p: 2 }}>
            <Grid container spacing={1.5}>
              <Grid item xs={12} md={3}><TextField fullWidth label="Agent name" value={form.agentname} onChange={(e) => setForm((p) => ({ ...p, agentname: e.target.value }))} /></Grid>
              <Grid item xs={12} md={2}><Autocomplete freeSolo options={valueOptions.academicyear} value={form.academicyear || ""} onInputChange={(_, value) => setForm((p) => ({ ...p, academicyear: value }))} renderInput={(params) => <TextField {...params} label="Academic year" required />} /></Grid>
              <Grid item xs={12} md={2}><TextField fullWidth type="number" label="Target courses per department" value={form.targetcoursesperdepartment} onChange={(e) => setForm((p) => ({ ...p, targetcoursesperdepartment: e.target.value }))} /></Grid>
              <Grid item xs={12} md={2}><TextField fullWidth type="number" label="Min no. of hours" value={form.minhours} onChange={(e) => setForm((p) => ({ ...p, minhours: e.target.value }))} /></Grid>
              <Grid item xs={12} md={2}><Autocomplete options={valueOptions.dayofweek} value={form.dayofweek || ""} onChange={(_, value) => setForm((p) => ({ ...p, dayofweek: value || "" }))} renderInput={(params) => <TextField {...params} label="Weekly running day" required />} /></Grid>
              <Grid item xs={12} md={2}><TextField fullWidth type="time" label="Time" InputLabelProps={{ shrink: true }} value={form.timeofrunning} onChange={(e) => setForm((p) => ({ ...p, timeofrunning: e.target.value }))} /></Grid>
              <Grid item xs={12} md={3}><TextField fullWidth label="Email to send report to" value={form.reportemail} onChange={(e) => setForm((p) => ({ ...p, reportemail: e.target.value }))} /></Grid>
              <Grid item xs={12} md={2}><TextField select fullWidth label="Status" value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}><MenuItem value="Active">Active</MenuItem><MenuItem value="Inactive">Inactive</MenuItem></TextField></Grid>
              <Grid item xs={12} md={2}><Button fullWidth sx={{ height: 56 }} disabled={loading} variant="contained" startIcon={<Save />} onClick={save}>{editingId ? "Update" : "Save"}</Button></Grid>
            </Grid>
          </Paper>
          <Paper sx={{ p: 2 }}><Box sx={{ height: 430 }}><DataGrid rows={rowsOf(agents)} columns={agentColumns} checkboxSelection rowSelectionModel={selectedIds} onRowSelectionModelChange={setSelectedIds} slots={{ toolbar: GridToolbar }} sx={gridSx} pageSizeOptions={[10, 25, 50, 100]} /></Box></Paper>
          <Paper sx={{ p: 2 }}><Typography variant="h6" fontWeight={900}>Agent Logs</Typography><Box sx={{ height: 360 }}><DataGrid rows={rowsOf(logs)} columns={logColumns} slots={{ toolbar: GridToolbar }} sx={gridSx} pageSizeOptions={[10, 25, 50, 100]} /></Box></Paper>
        </Stack>
      </Box>
    </MenuPageShell>
  );
}
