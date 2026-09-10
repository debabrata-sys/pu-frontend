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
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import SaveIcon from "@mui/icons-material/Save";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import DownloadIcon from "@mui/icons-material/Download";
import MenuPageShell from "./MenuPageShell";
import ep1 from "../api/ep1";
import global1 from "./global1";

const blankForm = {
  title: "",
  description: "",
  status: "Draft",
  selectedModels: [],
  customModels: "[\n  { \"name\": \"LocalTasks\", \"fields\": [\"title\", \"status\", \"amount\"] }\n]",
  virtualModels: "{\n  \"exampleRows\": [\n    { \"name\": \"Sample\", \"amount\": 100 }\n  ]\n}",
  backendCode: "const rows = virtualModels.exampleRows || [];\n// Existing ERP models are read-only and always colid scoped.\nconst students = await db.User.find({ role: \"Student\" }, 10);\n// Custom models allow isolated CRUD.\nconst tasks = custom.LocalTasks ? await custom.LocalTasks.find({}, 50) : [];\nresult = { count: rows.length, students, tasks, input, existingModels: Object.keys(db || {}), customModels: Object.keys(custom || {}) };",
  frontendCode: "<!doctype html>\n<html>\n  <body style=\"font-family: Arial; padding: 16px;\">\n    <h2>My Preview</h2>\n    <pre id=\"out\"></pre>\n    <script>document.getElementById('out').textContent = JSON.stringify(window.myCodeContext, null, 2);</script>\n  </body>\n</html>",
  sampleInput: "{\n  \"message\": \"hello\"\n}"
};

const withScope = (payload = {}) => ({
  ...payload,
  colid: global1.colid,
  user: global1.user,
  createdby: global1.name
});

export default function MyCodeEditorPage() {
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
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [working, setWorking] = useState(false);

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
    link.download = "my-code-editor-pages.json";
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
    const context = {
      backendOutput,
      backendLogs,
      customRows,
      selectedCustomModel,
      page: activeRow ? { title: activeRow.title, id: activeRow._id } : null
    };
    const contextScript = `<script>window.myCodeContext=${JSON.stringify(context).replace(/</g, "\\u003c")};</script>`;
    const source = frontendPreviewCode || form.frontendCode || "<html><body></body></html>";
    if (source.includes("</head>")) return source.replace("</head>", `${contextScript}</head>`);
    if (source.includes("<body")) return source.replace(/<body([^>]*)>/i, `<body$1>${contextScript}`);
    return `${contextScript}${source}`;
  }, [activeRow, backendLogs, backendOutput, customRows, frontendPreviewCode, form.frontendCode, selectedCustomModel]);

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
    <MenuPageShell title="My Code Editor">
      <Stack spacing={2}>
        <Paper sx={{ p: 2 }}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1} justifyContent="space-between" sx={{ mb: 1 }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>Userwise Code Playground</Typography>
              <Typography variant="body2" color="text.secondary">
                Stored per logged-in user. Existing models are read-only and always filtered by colid. Virtual models stay inside this playground.
              </Typography>
            </Box>
            <Chip color="primary" label={`User: ${global1.user || ""}`} />
          </Stack>
          {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

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
              <TextField fullWidth multiline minRows={14} label="Backend code" value={form.backendCode} onChange={(event) => setField("backendCode", event.target.value)} helperText="Use db.Model.find/count/distinct only for existing ERP data. Use custom.Model.create/update/delete for isolated custom CRUD. Set result = ... or return a value." />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth multiline minRows={14} label="Frontend HTML / JS code" value={form.frontendCode} onChange={(event) => setField("frontendCode", event.target.value)} helperText="Runs only in the isolated preview iframe." />
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
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>Frontend Preview</Typography>
              <Box
                component="iframe"
                title={`My code frontend preview ${activeRow?.title || ""}`}
                sandbox="allow-scripts"
                srcDoc={previewHtml}
                sx={{ width: "100%", height: 260, border: "1px solid #cbd5e1", borderRadius: 1, bgcolor: "#fff" }}
              />
            </Paper>
          </Grid>
        </Grid>

        <Paper sx={{ p: 2 }}>
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1} sx={{ mb: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>My Stored Code Pages</Typography>
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
