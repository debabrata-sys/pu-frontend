import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import { DataGrid, GridActionsCellItem, GridToolbar } from "@mui/x-data-grid";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import SaveIcon from "@mui/icons-material/Save";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import DownloadIcon from "@mui/icons-material/Download";
import CloseIcon from "@mui/icons-material/Close";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import AutoModeIcon from "@mui/icons-material/AutoMode";
import MenuPageShell from "./MenuPageShell";
import ep1 from "../api/ep1";
import global1 from "./global1";

const blankForm = {
  title: "",
  description: "",
  status: "Draft",
  selectedModels: ["Users"],
  customModels: "[\n  { \"name\": \"LocalTasks\", \"fields\": [\"title\", \"status\", \"amount\"] }\n]",
  virtualModels: "{\n  \"exampleRows\": [\n    { \"name\": \"Sample\", \"amount\": 100 }\n  ]\n}",
  backendCode: "const action = input.action || \"initial\";\nconst payload = input.payload || {};\n\nif (action === \"loadUsers\") {\n  const role = payload.role || \"Student\";\n  const users = await db.User.find({ role }, 100);\n  result = {\n    action,\n    role,\n    total: users.length,\n    rows: users.map((u) => ({\n      name: u.name,\n      email: u.email,\n      role: u.role,\n      program: u.program,\n      programcode: u.programcode,\n      semester: u.semester\n    }))\n  };\n} else {\n  result = {\n    message: \"Select a role and click Load users. Existing ERP reads are automatically colid scoped.\",\n    availableActions: [\"loadUsers\"]\n  };\n}",
  frontendCode: "<!doctype html>\n<html>\n<head>\n  <style>\n    body { font-family: Arial, sans-serif; padding: 16px; color: #111827; }\n    .bar { display: flex; gap: 10px; align-items: center; margin-bottom: 14px; flex-wrap: wrap; }\n    select, button { padding: 8px 10px; font-size: 14px; }\n    button { background: #2563eb; color: white; border: 0; border-radius: 6px; cursor: pointer; }\n    button:disabled { background: #94a3b8; cursor: wait; }\n    .card { display: inline-block; padding: 12px 14px; background: #ecfdf5; border: 1px solid #86efac; border-radius: 8px; margin-bottom: 12px; }\n    table { width: 100%; border-collapse: collapse; }\n    th, td { border: 1px solid #d1d5db; padding: 7px; font-size: 13px; text-align: left; }\n    th { background: #f3f4f6; }\n    #status { color: #475569; margin-left: 4px; }\n  </style>\n</head>\n<body>\n  <h2>Interactive User Viewer</h2>\n  <div class=\"bar\">\n    <label>Role</label>\n    <select id=\"role\">\n      <option>Student</option>\n      <option>Faculty</option>\n      <option>All</option>\n      <option>Admin</option>\n    </select>\n    <button id=\"loadBtn\">Load users from backend</button>\n    <span id=\"status\"></span>\n  </div>\n  <div id=\"summary\"></div>\n  <div id=\"table\"></div>\n\n  <script>\n    const statusEl = document.getElementById('status');\n    const btn = document.getElementById('loadBtn');\n\n    async function loadUsers() {\n      btn.disabled = true;\n      statusEl.textContent = 'Loading...';\n      try {\n        const role = document.getElementById('role').value;\n        const data = await window.myCodeApi.call('loadUsers', { role });\n        const rows = data.rows || [];\n        document.getElementById('summary').innerHTML = `<div class=\"card\"><b>${data.role}</b>: ${data.total || 0} record(s)</div>`;\n        document.getElementById('table').innerHTML = `\n          <table>\n            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Program</th><th>Program Code</th><th>Semester</th></tr></thead>\n            <tbody>${rows.map((r) => `<tr><td>${r.name || ''}</td><td>${r.email || ''}</td><td>${r.role || ''}</td><td>${r.program || ''}</td><td>${r.programcode || ''}</td><td>${r.semester || ''}</td></tr>`).join('')}</tbody>\n          </table>`;\n        statusEl.textContent = 'Done';\n      } catch (err) {\n        statusEl.textContent = err.message || 'Request failed';\n      } finally {\n        btn.disabled = false;\n      }\n    }\n\n    btn.addEventListener('click', loadUsers);\n  </script>\n</body>\n</html>",
  sampleInput: "{\n  \"message\": \"hello\"\n}"
};

const withScope = (payload = {}) => ({
  ...payload,
  colid: global1.colid,
  user: global1.user,
  createdby: global1.name
});

const apiBase = String(ep1.defaults?.baseURL || "").replace(/\/$/, "");

export default function AiCodeEditorPage() {
  const [form, setForm] = useState(blankForm);
  const [editId, setEditId] = useState("");
  const [rows, setRows] = useState([]);
  const [options, setOptions] = useState({ models: [], modelDetails: {} });
  const [selectedRows, setSelectedRows] = useState([]);
  const [activeRow, setActiveRow] = useState(null);
  const [frontendPreviewCode, setFrontendPreviewCode] = useState(blankForm.frontendCode);
  const [backendOutput, setBackendOutput] = useState(null);
  const [backendLogs, setBackendLogs] = useState([]);
  const [selectedCustomModel, setSelectedCustomModel] = useState("");
  const [customRows, setCustomRows] = useState([]);
  const [customSelection, setCustomSelection] = useState([]);
  const [customEditId, setCustomEditId] = useState("");
  const [customDataJson, setCustomDataJson] = useState("{\n  \"title\": \"Task\",\n  \"status\": \"Open\",\n  \"amount\": 100\n}");
  const [previewFullscreen, setPreviewFullscreen] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [working, setWorking] = useState(false);
  const [aiForm, setAiForm] = useState({
    provider: "Gemini",
    geminiModel: "gemini-2.5-flash-lite",
    ollamaConfigId: "",
    prompt: "",
    outputMode: "Interactive CRUD / Report"
  });

  const setField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const loadRows = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await ep1.get("/api/v2/my-code-editor", { params: withScope() });
      setRows(response.data?.rows || []);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load my code pages.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadOptions = useCallback(async () => {
    try {
      const response = await ep1.get("/api/v2/my-code-editor-options", { params: withScope() });
      setOptions(response.data || { models: [], modelDetails: {} });
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load existing model options.");
    }
  }, []);

  const setAiField = (field, value) => setAiForm((prev) => ({ ...prev, [field]: value }));

  useEffect(() => {
    loadOptions();
    loadRows();
  }, [loadOptions, loadRows]);

  const resetForm = () => {
    setForm(blankForm);
    setEditId("");
    setActiveRow(null);
    setFrontendPreviewCode(blankForm.frontendCode);
    setBackendOutput(null);
    setBackendLogs([]);
    setSelectedCustomModel("");
    setCustomRows([]);
    setCustomSelection([]);
    setCustomEditId("");
    setMessage("");
    setError("");
  };

  const customModelNames = useMemo(() => {
    try {
      const parsed = JSON.parse(form.customModels || "[]");
      if (Array.isArray(parsed)) return parsed.map((item) => (typeof item === "string" ? item : item?.name || item?.modelName)).filter(Boolean);
      if (parsed && typeof parsed === "object") return Object.keys(parsed);
    } catch {
      return [];
    }
    return [];
  }, [form.customModels]);

  const savePage = async () => {
    if (!form.title.trim()) {
      setError("Title is required.");
      return;
    }
    setWorking(true);
    setError("");
    setMessage("");
    try {
      const response = await ep1.post("/api/v2/my-code-editor", withScope({ ...form, id: editId }));
      setEditId(response.data?.row?._id || "");
      setActiveRow(response.data?.row || null);
      setFrontendPreviewCode(response.data?.row?.frontendCode || form.frontendCode || "");
      setMessage("Code page saved.");
      await loadRows();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to save code page.");
    } finally {
      setWorking(false);
    }
  };

  const editRow = (row) => {
    setEditId(row._id);
    setActiveRow(row);
    setForm({
      title: row.title || "",
      description: row.description || "",
      status: row.status || "Draft",
      selectedModels: row.selectedModels || [],
      customModels: row.customModels || "[]",
      virtualModels: row.virtualModels || "{}",
      backendCode: row.backendCode || "",
      frontendCode: row.frontendCode || "",
      sampleInput: row.sampleInput || "{}"
    });
    setBackendOutput(row.lastBackendOutput || null);
    setBackendLogs([]);
    setFrontendPreviewCode(row.frontendCode || "");
    setSelectedCustomModel("");
    setCustomRows([]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const runFrontend = (row) => {
    setActiveRow(row);
    setFrontendPreviewCode(row.frontendCode || "");
    setMessage(`Frontend loaded: ${row.title || "Untitled"}`);
    setError("");
  };

  const deleteRows = async (ids) => {
    if (!ids.length) {
      setError("Select at least one code page.");
      return;
    }
    if (!window.confirm("Delete selected code page(s)?")) return;
    setWorking(true);
    try {
      await ep1.post("/api/v2/my-code-editor-delete", withScope({ ids }));
      setMessage("Selected code page(s) deleted.");
      setSelectedRows([]);
      await loadRows();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to delete selected code page(s).");
    } finally {
      setWorking(false);
    }
  };

  const runBackend = async () => {
    if (!editId) {
      setError("Save the page before running backend code.");
      return;
    }
    setWorking(true);
    setError("");
    setMessage("Running backend code in isolated user scope...");
    try {
      const response = await ep1.post("/api/v2/my-code-editor-run", withScope({ id: editId, input: form.sampleInput }));
      setBackendOutput(response.data?.output ?? null);
      setBackendLogs(response.data?.logs || []);
      setMessage("Backend code executed.");
      await loadRows();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to run backend code.");
      setMessage("");
    } finally {
      setWorking(false);
    }
  };

  const generateWithAi = async () => {
    if (!aiForm.prompt.trim()) {
      setError("Enter a prompt describing the backend and frontend you want to create.");
      return;
    }
    if (aiForm.provider === "Ollama" && !aiForm.ollamaConfigId) {
      setError("Select an Ollama configuration.");
      return;
    }
    setWorking(true);
    setError("");
    setMessage("Generating backend and frontend code...");
    try {
      const response = await ep1.post("/api/v2/my-code-editor-generate", withScope({
        ...aiForm,
        title: form.title,
        description: form.description,
        selectedModels: form.selectedModels,
        customModels: form.customModels,
        virtualModels: form.virtualModels,
        sampleInput: form.sampleInput
      }));
      const generated = response.data?.generated || {};
      const nextForm = {
        ...form,
        title: generated.title || form.title || "AI generated interactive page",
        description: generated.description || form.description,
        selectedModels: Array.isArray(generated.selectedModels) && generated.selectedModels.length ? generated.selectedModels : form.selectedModels,
        customModels: generated.customModels || form.customModels,
        virtualModels: generated.virtualModels || form.virtualModels,
        sampleInput: generated.sampleInput || form.sampleInput,
        backendCode: generated.backendCode || form.backendCode,
        frontendCode: generated.frontendCode || form.frontendCode
      };
      const saveResponse = await ep1.post("/api/v2/my-code-editor", withScope({ ...nextForm, id: editId }));
      const savedRow = saveResponse.data?.row || null;
      setForm(nextForm);
      setEditId(savedRow?._id || editId);
      setActiveRow(savedRow);
      setFrontendPreviewCode(nextForm.frontendCode || "");
      setBackendOutput(savedRow?.lastBackendOutput || null);
      setBackendLogs([]);
      setMessage("AI generated code loaded and saved. Dropdowns can now call the generated backend.");
      await loadRows();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to generate code.");
      setMessage("");
    } finally {
      setWorking(false);
    }
  };

  const loadCustomData = async (modelName = selectedCustomModel) => {
    if (!editId || !modelName) {
      setError("Save the page and select a custom model first.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const response = await ep1.get("/api/v2/my-code-editor-custom-data", {
        params: withScope({ pageId: editId, modelName })
      });
      setCustomRows(response.data?.rows || []);
      setCustomSelection([]);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load custom model data.");
    } finally {
      setLoading(false);
    }
  };

  const saveCustomData = async () => {
    if (!editId || !selectedCustomModel) {
      setError("Save the page and select a custom model first.");
      return;
    }
    setWorking(true);
    setError("");
    try {
      await ep1.post("/api/v2/my-code-editor-custom-data", withScope({
        pageId: editId,
        modelName: selectedCustomModel,
        id: customEditId,
        data: customDataJson
      }));
      setMessage(customEditId ? "Custom model row updated." : "Custom model row saved.");
      setCustomEditId("");
      await loadCustomData(selectedCustomModel);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to save custom model row.");
    } finally {
      setWorking(false);
    }
  };

  const deleteCustomData = async () => {
    if (!customSelection.length || !selectedCustomModel) {
      setError("Select custom model rows first.");
      return;
    }
    if (!window.confirm("Delete selected custom model row(s)?")) return;
    setWorking(true);
    try {
      await ep1.post("/api/v2/my-code-editor-custom-data-delete", withScope({
        pageId: editId,
        modelName: selectedCustomModel,
        ids: customSelection
      }));
      setMessage("Selected custom model row(s) deleted.");
      await loadCustomData(selectedCustomModel);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to delete custom model row(s).");
    } finally {
      setWorking(false);
    }
  };

  const exportSelected = () => {
    const selected = rows.filter((row) => selectedRows.includes(row._id));
    const payload = selected.length ? selected : rows;
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "my-code-editor-interactive-pages.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  const importJson = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setWorking(true);
    setError("");
    try {
      const text = await file.text();
      const items = JSON.parse(text);
      const list = Array.isArray(items) ? items : [items];
      for (const item of list) {
        await ep1.post("/api/v2/my-code-editor", withScope({
          title: item.title || "Imported code page",
          description: item.description || "",
          status: item.status || "Draft",
          virtualModels: item.virtualModels || "{}",
          selectedModels: Array.isArray(item.selectedModels) ? item.selectedModels : [],
          customModels: item.customModels || "[]",
          backendCode: item.backendCode || "",
          frontendCode: item.frontendCode || "",
          sampleInput: item.sampleInput || "{}"
        }));
      }
      setMessage("Code page JSON imported.");
      await loadRows();
    } catch (err) {
      setError(err.message || "Unable to import JSON.");
    } finally {
      setWorking(false);
      event.target.value = "";
    }
  };

  const previewHtml = useMemo(() => {
    const pageId = editId || activeRow?._id || "";
    const context = {
      backendOutput,
      backendLogs,
      customRows,
      selectedCustomModel,
      page: activeRow ? { title: activeRow.title, id: activeRow._id } : null,
      interactive: true
    };
    const contextScript = `<script>window.myCodeContext=${JSON.stringify(context).replace(/</g, "\\u003c")};</script>`;
    const apiScript = `<script>
      window.myCodeApi = {
        call: async function(action, payload) {
          if (!${JSON.stringify(pageId)}) throw new Error("Save the page before calling backend.");
          const response = await fetch(${JSON.stringify(`${apiBase}/api/v2/my-code-editor-interact`)}, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: ${JSON.stringify(pageId)},
              colid: ${JSON.stringify(global1.colid)},
              user: ${JSON.stringify(global1.user || "")},
              createdby: ${JSON.stringify(global1.name || "")},
              action: action,
              payload: payload || {}
            })
          });
          const data = await response.json();
          if (!response.ok || data.success === false) throw new Error(data.message || "Backend request failed");
          const output = data.output ?? {};
          window.myCodeContext.lastInteractiveOutput = output;
          window.myCodeContext.lastInteractiveLogs = data.logs || [];
          return output;
        }
      };
    </script>`;
    const source = frontendPreviewCode || form.frontendCode || "<html><body></body></html>";
    if (source.includes("</head>")) return source.replace("</head>", `${contextScript}${apiScript}</head>`);
    if (source.includes("<body")) return source.replace(/<body([^>]*)>/i, `<body$1>${contextScript}${apiScript}`);
    return `${contextScript}${apiScript}${source}`;
  }, [activeRow, backendLogs, backendOutput, customRows, editId, frontendPreviewCode, form.frontendCode, selectedCustomModel]);

  const columns = [
    { field: "title", headerName: "Title", minWidth: 180, flex: 1 },
    { field: "status", headerName: "Status", width: 120 },
    { field: "description", headerName: "Description", minWidth: 220, flex: 1 },
    { field: "selectedModels", headerName: "Existing Models", minWidth: 180, flex: 0.8, valueGetter: (params) => (params.row.selectedModels || []).join(", ") },
    { field: "updatedAt", headerName: "Updated", minWidth: 170, flex: 0.7, valueGetter: (params) => params.row.updatedAt ? new Date(params.row.updatedAt).toLocaleString() : "" },
    {
      field: "actions",
      type: "actions",
      headerName: "Actions",
      width: 90,
      getActions: (params) => [
        <GridActionsCellItem icon={<PlayArrowIcon />} label="Run frontend" onClick={() => runFrontend(params.row)} />,
        <GridActionsCellItem icon={<EditIcon />} label="Edit" onClick={() => editRow(params.row)} />
      ]
    }
  ];

  const customColumns = useMemo(() => {
    const keys = Array.from(new Set(customRows.flatMap((row) => Object.keys(row.data || {})))).slice(0, 12);
    return [
      ...keys.map((key) => ({ field: `data.${key}`, headerName: key, minWidth: 140, flex: 1, valueGetter: (params) => params.row.data?.[key] ?? "" })),
      { field: "updatedAt", headerName: "Updated", minWidth: 170, valueGetter: (params) => params.row.updatedAt ? new Date(params.row.updatedAt).toLocaleString() : "" },
      {
        field: "actions",
        type: "actions",
        headerName: "Actions",
        width: 80,
        getActions: (params) => [
          <GridActionsCellItem
            icon={<EditIcon />}
            label="Edit"
            onClick={() => {
              setCustomEditId(params.row._id);
              setCustomDataJson(JSON.stringify(params.row.data || {}, null, 2));
            }}
          />
        ]
      }
    ];
  }, [customRows]);

  return (
    <MenuPageShell title="AI Code Editor">
      <Stack spacing={2}>
        <Paper sx={{ p: 2 }}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1} justifyContent="space-between" sx={{ mb: 1 }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>AI Code Editor</Typography>
              <Typography variant="body2" color="text.secondary">
                Generate backend and frontend code from a prompt, then run it in the same userwise interactive playground. Existing models stay read-only and always filtered by colid.
              </Typography>
            </Box>
            <Chip color="primary" label={`User: ${global1.user || ""}`} />
          </Stack>
          {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: "#f8fafc" }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 900, mb: 1 }}>Generate code using AI</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={2}>
                <TextField select fullWidth label="Provider" value={aiForm.provider} onChange={(event) => setAiField("provider", event.target.value)}>
                  <MenuItem value="Gemini">Gemini</MenuItem>
                  <MenuItem value="Ollama">Ollama</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} md={3}>
                {aiForm.provider === "Ollama" ? (
                  <Autocomplete
                    options={options.ollamaConfigs || []}
                    getOptionLabel={(option) => `${option.name || ""} ${option.modelname || ""}`.trim()}
                    value={(options.ollamaConfigs || []).find((item) => item._id === aiForm.ollamaConfigId) || null}
                    onChange={(event, value) => setAiField("ollamaConfigId", value?._id || "")}
                    renderInput={(params) => <TextField {...params} label="Ollama configuration" />}
                  />
                ) : (
                  <Autocomplete
                    options={options.geminiModels || ["gemini-2.5-flash-lite"]}
                    value={aiForm.geminiModel}
                    onChange={(event, value) => setAiField("geminiModel", value || "gemini-2.5-flash-lite")}
                    renderInput={(params) => <TextField {...params} label="Gemini model" />}
                  />
                )}
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField select fullWidth label="Mode" value={aiForm.outputMode} onChange={(event) => setAiField("outputMode", event.target.value)}>
                  <MenuItem value="Interactive CRUD / Report">Interactive CRUD / Report</MenuItem>
                  <MenuItem value="Read only report">Read only report</MenuItem>
                  <MenuItem value="Dashboard with charts">Dashboard with charts</MenuItem>
                  <MenuItem value="Custom model CRUD">Custom model CRUD</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} md={4}>
                <Button fullWidth sx={{ height: 56 }} variant="contained" startIcon={working ? <CircularProgress size={18} color="inherit" /> : <AutoModeIcon />} onClick={generateWithAi} disabled={working}>
                  Generate backend and frontend
                </Button>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  minRows={4}
                  label="Prompt"
                  value={aiForm.prompt}
                  onChange={(event) => setAiField("prompt", event.target.value)}
                  helperText="Example: Create an interactive page where the user selects academic year from Users, then loads programwise student count with a bar chart. Frontend must call backend through window.myCodeApi.call."
                />
              </Grid>
            </Grid>
          </Paper>

          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <TextField fullWidth label="Title" value={form.title} onChange={(event) => setField("title", event.target.value)} />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField select fullWidth label="Status" value={form.status} onChange={(event) => setField("status", event.target.value)}>
                {["Draft", "Ready", "Archived"].map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} md={5}>
              <TextField fullWidth label="Description" value={form.description} onChange={(event) => setField("description", event.target.value)} />
            </Grid>
            <Grid item xs={12}>
              <Autocomplete
                multiple
                options={options.models || []}
                value={form.selectedModels || []}
                onChange={(event, value) => setField("selectedModels", value)}
                renderTags={(value, getTagProps) => value.map((option, index) => (
                  <Chip size="small" label={option} {...getTagProps({ index })} />
                ))}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Connect existing models"
                    helperText="Selected existing ERP models are available only as db.ModelName.find/count/distinct. Create/update/delete is blocked and every read is automatically scoped by global colid."
                  />
                )}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth multiline minRows={4} label="Custom models JSON" value={form.customModels} onChange={(event) => setField("customModels", event.target.value)} helperText={'Define internal user models here, e.g. [{"name":"LocalTasks","fields":["title","status"]}]. Rows are stored as scoped documents and support CRUD.'} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth multiline minRows={9} label="Virtual models / userwise data JSON" value={form.virtualModels} onChange={(event) => setField("virtualModels", event.target.value)} helperText="Create your own isolated models/data here. These do not create or update any MongoDB model." />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth multiline minRows={9} label="Sample input JSON" value={form.sampleInput} onChange={(event) => setField("sampleInput", event.target.value)} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth multiline minRows={14} maxRows={14} label="Backend code" value={form.backendCode} onChange={(event) => setField("backendCode", event.target.value)} helperText="Use db.Model.find/count/distinct only for existing ERP data. Use custom.Model.create/update/delete for isolated custom CRUD. Set result = ... or return a value." InputProps={{ sx: { alignItems: "flex-start", "& textarea": { height: "360px !important", maxHeight: "360px !important", overflow: "auto !important", fontFamily: "Menlo, Consolas, monospace", fontSize: 13, lineHeight: 1.45 } } }} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth multiline minRows={14} maxRows={14} label="Frontend HTML / JS code" value={form.frontendCode} onChange={(event) => setField("frontendCode", event.target.value)} helperText="Runs only in the isolated preview iframe." InputProps={{ sx: { alignItems: "flex-start", "& textarea": { height: "360px !important", maxHeight: "360px !important", overflow: "auto !important", fontFamily: "Menlo, Consolas, monospace", fontSize: 13, lineHeight: 1.45 } } }} />
            </Grid>
          </Grid>

          <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 2 }}>
            <Button variant="contained" startIcon={working ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />} onClick={savePage} disabled={working}>
              Save
            </Button>
            <Button variant="outlined" startIcon={<PlayArrowIcon />} onClick={runBackend} disabled={working || !editId}>
              Run Backend
            </Button>
            <Button variant="outlined" onClick={resetForm} disabled={working}>New / Clear</Button>
            <Button variant="outlined" startIcon={<DownloadIcon />} onClick={exportSelected} disabled={working || !rows.length}>Export JSON</Button>
            <Button component="label" variant="outlined" startIcon={<UploadFileIcon />} disabled={working}>
              Bulk Upload JSON
              <input hidden type="file" accept=".json" onChange={importJson} />
            </Button>
          </Stack>
        </Paper>

        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>Custom Model CRUD</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            These rows are stored only for this code page, this user, and this institution. They do not create a real database model.
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <Autocomplete
                options={customModelNames}
                value={selectedCustomModel}
                onChange={(event, value) => {
                  setSelectedCustomModel(value || "");
                  setCustomRows([]);
                  if (value) setTimeout(() => loadCustomData(value), 0);
                }}
                renderInput={(params) => <TextField {...params} label="Select custom model" />}
              />
            </Grid>
            <Grid item xs={12} md={8}>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                <Button variant="outlined" startIcon={<PlayArrowIcon />} onClick={() => loadCustomData()} disabled={!editId || !selectedCustomModel || loading}>Load Rows</Button>
                <Button variant="contained" startIcon={<SaveIcon />} onClick={saveCustomData} disabled={!editId || !selectedCustomModel || working}>{customEditId ? "Update Row" : "Save Row"}</Button>
                <Button color="error" variant="outlined" startIcon={<DeleteIcon />} onClick={deleteCustomData} disabled={!customSelection.length || working}>Bulk Delete</Button>
                <Button variant="outlined" onClick={() => { setCustomEditId(""); setCustomDataJson("{}"); }}>Clear Row</Button>
              </Stack>
            </Grid>
            <Grid item xs={12} md={5}>
              <TextField fullWidth multiline minRows={10} label="Custom row JSON" value={customDataJson} onChange={(event) => setCustomDataJson(event.target.value)} />
            </Grid>
            <Grid item xs={12} md={7}>
              <Box sx={{ height: 300, width: "100%" }}>
                <DataGrid
                  rows={customRows}
                  columns={customColumns}
                  getRowId={(row) => row._id}
                  loading={loading}
                  checkboxSelection
                  onRowSelectionModelChange={(selection) => setCustomSelection(Array.from(selection))}
                  slots={{ toolbar: GridToolbar }}
                  disableRowSelectionOnClick
                  sx={{ "& .MuiDataGrid-cell": { whiteSpace: "normal", alignItems: "flex-start", py: 1 } }}
                />
              </Box>
            </Grid>
          </Grid>
        </Paper>

        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, height: "100%" }}>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>Backend Output</Typography>
              <Box component="pre" sx={{ m: 0, p: 1.5, minHeight: 220, overflow: "auto", bgcolor: "#0f172a", color: "#e2e8f0", borderRadius: 1 }}>
                {JSON.stringify({ output: backendOutput, logs: backendLogs }, null, 2)}
              </Box>
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, height: "100%" }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>Frontend Preview</Typography>
                <Button size="small" variant="outlined" startIcon={<FullscreenIcon />} onClick={() => setPreviewFullscreen(true)}>
                  Full screen
                </Button>
              </Stack>
              <Box
                component="iframe"
                title={`My interactive code frontend preview ${activeRow?.title || ""}`}
                sandbox="allow-scripts"
                srcDoc={previewHtml}
                sx={{ width: "100%", height: 260, border: "1px solid #cbd5e1", borderRadius: 1, bgcolor: "#fff" }}
              />
            </Paper>
          </Grid>
        </Grid>

        <Dialog fullScreen open={previewFullscreen} onClose={() => setPreviewFullscreen(false)}>
          <DialogTitle sx={{ py: 1.25, pr: 7, borderBottom: "1px solid #e2e8f0" }}>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              Frontend Preview {activeRow?.title ? `- ${activeRow.title}` : ""}
            </Typography>
            <IconButton
              aria-label="Close fullscreen preview"
              onClick={() => setPreviewFullscreen(false)}
              sx={{ position: "absolute", right: 12, top: 8 }}
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent sx={{ p: 0, height: "calc(100vh - 58px)" }}>
            <Box
              component="iframe"
              title={`Fullscreen interactive code frontend preview ${activeRow?.title || ""}`}
              sandbox="allow-scripts"
              srcDoc={previewHtml}
              sx={{ width: "100%", height: "100%", border: 0, bgcolor: "#fff", display: "block" }}
            />
          </DialogContent>
        </Dialog>

        <Paper sx={{ p: 2 }}>
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1} sx={{ mb: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>My Stored Interactive Code Pages</Typography>
            <Button color="error" variant="outlined" startIcon={<DeleteIcon />} disabled={working || !selectedRows.length} onClick={() => deleteRows(selectedRows)}>
              Bulk Delete
            </Button>
          </Stack>
          <Box sx={{ height: 430, width: "100%" }}>
            <DataGrid
              rows={rows}
              columns={columns}
              getRowId={(row) => row._id}
              loading={loading}
              checkboxSelection
              onRowSelectionModelChange={(selection) => setSelectedRows(Array.from(selection))}
              slots={{ toolbar: GridToolbar }}
              disableRowSelectionOnClick
              sx={{ "& .MuiDataGrid-cell": { whiteSpace: "normal", alignItems: "flex-start", py: 1 } }}
            />
          </Box>
        </Paper>
      </Stack>
    </MenuPageShell>
  );
}
