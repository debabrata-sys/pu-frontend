import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  CircularProgress,
  Grid,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import { DataGrid, GridActionsCellItem, GridToolbar } from "@mui/x-data-grid";
import AutoModeIcon from "@mui/icons-material/AutoMode";
import EditIcon from "@mui/icons-material/Edit";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import SaveIcon from "@mui/icons-material/Save";
import MenuPageShell from "./MenuPageShell";
import ep1 from "../api/ep1";
import global1 from "./global1";

const blank = {
  title: "",
  description: "",
  status: "Draft",
  active: "No",
  scheduleMode: "Manual",
  scheduleDay: "Monday",
  scheduleTime: "09:00",
  provider: "Gemini",
  geminiModel: "gemini-2.5-flash-lite",
  ollamaConfigId: "",
  selectedModels: [],
  prompt: "",
  agentCode: `const students = await db.User.count({ role: "Student" });
console.log("Student count", students);
result = { students };`,
  sampleInput: "{}"
};

const withScope = (payload = {}) => ({
  ...payload,
  colid: global1.colid,
  user: global1.user,
  createdby: global1.name
});

const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function AiCodingAgentsPage() {
  const [form, setForm] = useState(blank);
  const [editId, setEditId] = useState("");
  const [rows, setRows] = useState([]);
  const [options, setOptions] = useState({ models: [], modelDetails: {}, geminiModels: [], ollamaConfigs: [] });
  const [output, setOutput] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const setField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const loadOptions = useCallback(async () => {
    const response = await ep1.get("/api/v2/ai-coding-agents/options", { params: withScope() });
    setOptions(response.data || {});
  }, []);

  const loadRows = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await ep1.get("/api/v2/ai-coding-agents", { params: withScope() });
      setRows(response.data?.rows || []);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load agents.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOptions().catch(() => {});
    loadRows();
  }, [loadOptions, loadRows]);

  const selectedModelDetails = useMemo(() => {
    const models = form.selectedModels?.length ? form.selectedModels : options.models || [];
    return models.slice(0, 8).map((name) => `${name}: ${(options.modelDetails?.[name] || []).map((f) => f.field).slice(0, 16).join(", ")}`).join("\n");
  }, [form.selectedModels, options]);

  const save = async () => {
    if (!form.title.trim()) {
      setError("Title is required.");
      return;
    }
    setWorking(true);
    setError("");
    setMessage("");
    try {
      const response = await ep1.post("/api/v2/ai-coding-agents", withScope({ ...form, id: editId }));
      setEditId(response.data?.row?._id || "");
      setMessage("Agent saved.");
      await loadRows();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to save agent.");
    } finally {
      setWorking(false);
    }
  };

  const edit = (row) => {
    setEditId(row._id);
    setForm({
      ...blank,
      ...row,
      selectedModels: row.selectedModels || [],
      sampleInput: row.sampleInput || "{}"
    });
    setOutput(row.lastRunOutput || null);
    setLogs(row.lastRunLogs || []);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const run = async (row) => {
    const id = row?._id || editId;
    if (!id) {
      setError("Save or select an agent before running.");
      return;
    }
    setWorking(true);
    setError("");
    setMessage("Running agent...");
    try {
      const response = await ep1.post("/api/v2/ai-coding-agents-run", withScope({ id, input: form.sampleInput }));
      setOutput(response.data?.output ?? null);
      setLogs(response.data?.logs || []);
      setMessage("Agent run completed.");
      await loadRows();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to run agent.");
      setMessage("");
    } finally {
      setWorking(false);
    }
  };

  const generate = async () => {
    if (!form.prompt.trim() && !form.description.trim()) {
      setError("Enter prompt or description first.");
      return;
    }
    setWorking(true);
    setError("");
    setMessage("Generating agent code...");
    try {
      const response = await ep1.post("/api/v2/ai-coding-agents-generate", withScope(form));
      setField("agentCode", response.data?.agentCode || "");
      setMessage("Agent code generated. Review and save it.");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to generate agent code.");
    } finally {
      setWorking(false);
    }
  };

  const columns = [
    { field: "title", headerName: "Agent", minWidth: 180, flex: 1 },
    { field: "status", headerName: "Status", width: 110 },
    { field: "active", headerName: "Active", width: 100 },
    { field: "scheduleMode", headerName: "Mode", width: 120 },
    { field: "scheduleDay", headerName: "Day", width: 120 },
    { field: "scheduleTime", headerName: "Time", width: 100 },
    { field: "lastRunStatus", headerName: "Last Run", width: 130 },
    { field: "lastRunAt", headerName: "Last Run At", width: 180, valueGetter: (params) => params.row.lastRunAt ? new Date(params.row.lastRunAt).toLocaleString() : "" },
    {
      field: "actions",
      type: "actions",
      headerName: "Actions",
      width: 100,
      getActions: (params) => [
        <GridActionsCellItem icon={<EditIcon />} label="Edit" onClick={() => edit(params.row)} />,
        <GridActionsCellItem icon={<PlayArrowIcon />} label="Run" onClick={() => run(params.row)} />
      ]
    }
  ];

  return (
    <MenuPageShell title="AI Agents">
      <Stack spacing={2}>
        <Paper sx={{ p: 2 }}>
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1} sx={{ mb: 2 }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 900 }}>Agent Builder</Typography>
              <Typography variant="body2" color="text.secondary">
                Agents can read, create, and update colid-scoped ERP data. Delete operations are blocked. Use saved email and AWS helpers inside agent code.
              </Typography>
            </Box>
            <Chip color="primary" label={`User: ${global1.user || ""}`} />
          </Stack>
          {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <Grid container spacing={2}>
            <Grid item xs={12} md={4}><TextField label="Title" value={form.title} onChange={(e) => setField("title", e.target.value)} fullWidth /></Grid>
            <Grid item xs={12} md={2}><TextField select label="Status" value={form.status} onChange={(e) => setField("status", e.target.value)} fullWidth>{["Draft", "Ready", "Archived"].map((v) => <MenuItem key={v} value={v}>{v}</MenuItem>)}</TextField></Grid>
            <Grid item xs={12} md={2}><TextField select label="Active" value={form.active} onChange={(e) => setField("active", e.target.value)} fullWidth>{["No", "Yes"].map((v) => <MenuItem key={v} value={v}>{v}</MenuItem>)}</TextField></Grid>
            <Grid item xs={12} md={4}><TextField label="Description" value={form.description} onChange={(e) => setField("description", e.target.value)} fullWidth /></Grid>

            <Grid item xs={12}><Autocomplete multiple options={options.models || []} value={form.selectedModels || []} onChange={(_, value) => setField("selectedModels", value)} renderTags={(value, getTagProps) => value.map((option, index) => <Chip size="small" label={option} {...getTagProps({ index })} />)} renderInput={(params) => <TextField {...params} label="Models available to agent" helperText="Leave blank to allow all colid-enabled models. colid is always enforced automatically." />} /></Grid>

            <Grid item xs={12} md={3}><TextField select label="Provider" value={form.provider} onChange={(e) => setField("provider", e.target.value)} fullWidth><MenuItem value="Gemini">Gemini</MenuItem><MenuItem value="Ollama">Ollama</MenuItem></TextField></Grid>
            <Grid item xs={12} md={4}>{form.provider === "Ollama" ? <Autocomplete options={options.ollamaConfigs || []} getOptionLabel={(o) => `${o.name || ""} ${o.modelname || ""}`} value={(options.ollamaConfigs || []).find((o) => o._id === form.ollamaConfigId) || null} onChange={(_, value) => setField("ollamaConfigId", value?._id || "")} renderInput={(params) => <TextField {...params} label="Ollama configuration" />} /> : <Autocomplete options={options.geminiModels || []} value={form.geminiModel} onChange={(_, value) => setField("geminiModel", value || "gemini-2.5-flash-lite")} renderInput={(params) => <TextField {...params} label="Gemini model" />} />}</Grid>
            <Grid item xs={12} md={5}><TextField label="Model field summary" value={selectedModelDetails} multiline minRows={3} fullWidth InputProps={{ readOnly: true }} /></Grid>

            <Grid item xs={12}><TextField label="Prompt to create agent" value={form.prompt} onChange={(e) => setField("prompt", e.target.value)} multiline minRows={4} fullWidth helperText="Example: Check all pending fee refunds and email finance summary. Use db, email, and aws helpers." /></Grid>
            <Grid item xs={12}><Button variant="outlined" startIcon={working ? <CircularProgress size={18} /> : <AutoModeIcon />} onClick={generate} disabled={working}>Generate agent code</Button></Grid>

            <Grid item xs={12} md={8}><TextField label="Agent code" value={form.agentCode} onChange={(e) => setField("agentCode", e.target.value)} multiline minRows={16} fullWidth helperText="Available: db.Model.find/count/distinct/create/updateOne/updateMany, email.send, aws.configs/defaultConfig. Delete is blocked." /></Grid>
            <Grid item xs={12} md={4}><TextField label="Sample input JSON" value={form.sampleInput} onChange={(e) => setField("sampleInput", e.target.value)} multiline minRows={16} fullWidth /></Grid>

            <Grid item xs={12} md={3}><TextField select label="Run mode" value={form.scheduleMode} onChange={(e) => setField("scheduleMode", e.target.value)} fullWidth><MenuItem value="Manual">Manual</MenuItem><MenuItem value="Scheduled">Scheduled</MenuItem><MenuItem value="Both">Both</MenuItem></TextField></Grid>
            <Grid item xs={12} md={3}><TextField select label="Weekly day" value={form.scheduleDay} onChange={(e) => setField("scheduleDay", e.target.value)} fullWidth>{days.map((v) => <MenuItem key={v} value={v}>{v}</MenuItem>)}</TextField></Grid>
            <Grid item xs={12} md={3}><TextField type="time" label="Run time" value={form.scheduleTime} onChange={(e) => setField("scheduleTime", e.target.value)} InputLabelProps={{ shrink: true }} fullWidth /></Grid>
          </Grid>

          <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 2 }}>
            <Button variant="contained" startIcon={working ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />} onClick={save} disabled={working}>Save / Update</Button>
            <Button variant="outlined" startIcon={<PlayArrowIcon />} onClick={() => run()} disabled={working || !editId}>Run selected agent</Button>
            <Button variant="outlined" onClick={() => { setForm(blank); setEditId(""); setOutput(null); setLogs([]); }}>New / Clear</Button>
          </Stack>
        </Paper>

        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, height: "100%" }}>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>Run Output</Typography>
              <Box component="pre" sx={{ m: 0, p: 1.5, height: 280, maxHeight: 280, overflow: "auto", bgcolor: "#0f172a", color: "#e2e8f0", borderRadius: 1, fontSize: 13, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{JSON.stringify(output, null, 2)}</Box>
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, height: "100%" }}>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>Logs</Typography>
              <Box component="pre" sx={{ m: 0, p: 1.5, height: 280, maxHeight: 280, overflow: "auto", bgcolor: "#111827", color: "#d1fae5", borderRadius: 1, fontSize: 13, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{(logs || []).join("\n")}</Box>
            </Paper>
          </Grid>
        </Grid>

        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>Saved Agents</Typography>
          <Box sx={{ height: 460 }}>
            <DataGrid rows={rows} columns={columns} getRowId={(row) => row._id} loading={loading} slots={{ toolbar: GridToolbar }} disableRowSelectionOnClick sx={{ "& .MuiDataGrid-cell": { whiteSpace: "normal", alignItems: "flex-start", py: 1 } }} />
          </Box>
        </Paper>
      </Stack>
    </MenuPageShell>
  );
}
