import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  MenuItem,
  Paper,
  Stack,
  Step,
  StepContent,
  StepLabel,
  Stepper,
  TextField,
  Typography
} from "@mui/material";
import { DataGrid, GridToolbar } from "@mui/x-data-grid";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import SettingsEthernetIcon from "@mui/icons-material/SettingsEthernet";
import { GridActionsCellItem } from "@mui/x-data-grid";
import ep1 from "../api/ep1";
import global1 from "./global1";
import MenuPageShell from "./MenuPageShell";

const blankServer = {
  title: "",
  command: "",
  remoteaddress: "",
  token: "",
  headers: "",
  arguments: "",
  active: "Yes",
  default: "No"
};

const labels = {
  title: "Title",
  command: "Command",
  remoteaddress: "Remote Address",
  token: "Token",
  headers: "Headers",
  arguments: "Arguments",
  active: "Active",
  default: "Default"
};

const statusColor = (status) => {
  if (status === "done") return "success";
  if (status === "running") return "primary";
  if (status === "warning") return "warning";
  if (status === "error") return "error";
  return "default";
};

export function McpServerSettingsPage() {
  const [rows, setRows] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);
  const [form, setForm] = useState(blankServer);
  const [editing, setEditing] = useState(null);
  const [filters, setFilters] = useState([{ field: "title", value: "" }]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      setError("");
      const params = { colid: global1.colid };
      filters.forEach((filter) => {
        if (filter.field && filter.value) params[filter.field] = filter.value;
      });
      const res = await ep1.get("/api/v2/mcp-servers", { params });
      setRows(res.data?.data || []);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load MCP servers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    try {
      setError("");
      setMessage("");
      const payload = { ...form, id: editing?._id, colid: global1.colid, name: global1.name, user: global1.user };
      const res = await ep1.post("/api/v2/mcp-servers", payload);
      setMessage(`MCP server ${editing ? "updated" : "saved"}: ${res.data?.data?.title || form.title}`);
      setForm(blankServer);
      setEditing(null);
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to save MCP server");
    }
  };

  const edit = (row) => {
    setEditing(row);
    setForm({
      title: row.title || "",
      command: row.command || "",
      remoteaddress: row.remoteaddress || "",
      arguments: row.arguments || "",
      headers: row.headers || "",
      token: "",
      active: row.active || "Yes",
      default: row.default || "No"
    });
  };

  const remove = async (ids) => {
    try {
      setError("");
      await ep1.post("/api/v2/mcp-servers-delete", { colid: global1.colid, ids });
      setMessage("Selected MCP server configuration deleted.");
      setSelectedRows([]);
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to delete MCP server");
    }
  };

  const columns = [
    { field: "title", headerName: "Title", width: 190 },
    { field: "command", headerName: "Command", width: 170 },
    { field: "remoteaddress", headerName: "Remote Address", width: 260 },
    { field: "tokenconfigured", headerName: "Token", width: 120, valueGetter: (params) => params.row?.tokenconfigured ? "Configured" : "Not set" },
    { field: "headerconfigured", headerName: "Headers", width: 130, valueGetter: (params) => params.row?.headerconfigured ? "Configured" : "Not set" },
    { field: "arguments", headerName: "Arguments", width: 260 },
    { field: "active", headerName: "Active", width: 100 },
    { field: "default", headerName: "Default", width: 100 },
    { field: "user", headerName: "User", width: 180 },
    {
      field: "actions",
      type: "actions",
      headerName: "Actions",
      width: 110,
      getActions: ({ row }) => [
        <GridActionsCellItem icon={<EditIcon />} label="Edit" onClick={() => edit(row)} />,
        <GridActionsCellItem icon={<DeleteIcon />} label="Delete" onClick={() => remove([row._id])} showInMenu />
      ]
    }
  ];

  return (
    <MenuPageShell title="MCP Server">
      <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: "#f6f7fb", minHeight: "100vh" }}>
        <Stack spacing={2}>
          <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: "1px solid #e5e7eb" }}>
            <Typography variant="h4" fontWeight={950}>MCP Server</Typography>
            <Typography color="text.secondary">Configure default MCP server metadata, token and required HTTP headers for AI ticketing transactions.</Typography>
          </Paper>
          {message && <Alert severity="success" onClose={() => setMessage("")}>{message}</Alert>}
          {error && <Alert severity="error" onClose={() => setError("")}>{error}</Alert>}
          <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #e5e7eb" }}>
            <Grid container spacing={1.5}>
              <Grid item xs={12} md={3}><TextField fullWidth size="small" label="Title" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} /></Grid>
              <Grid item xs={12} md={3}><TextField fullWidth size="small" label="Command" value={form.command} onChange={(e) => setForm((p) => ({ ...p, command: e.target.value }))} /></Grid>
              <Grid item xs={12} md={4}><TextField fullWidth size="small" label="Remote Address" value={form.remoteaddress} onChange={(e) => setForm((p) => ({ ...p, remoteaddress: e.target.value }))} /></Grid>
              <Grid item xs={12} md={1}><TextField select fullWidth size="small" label="Active" value={form.active} onChange={(e) => setForm((p) => ({ ...p, active: e.target.value }))}><MenuItem value="Yes">Yes</MenuItem><MenuItem value="No">No</MenuItem></TextField></Grid>
              <Grid item xs={12} md={1}><TextField select fullWidth size="small" label="Default" value={form.default} onChange={(e) => setForm((p) => ({ ...p, default: e.target.value }))}><MenuItem value="Yes">Yes</MenuItem><MenuItem value="No">No</MenuItem></TextField></Grid>
              <Grid item xs={12} md={4}><TextField fullWidth size="small" type="password" label="Token" value={form.token} onChange={(e) => setForm((p) => ({ ...p, token: e.target.value }))} helperText={editing ? "Enter a new token to replace the saved token." : "Token used for MCP connect and bearer authorization."} /></Grid>
              <Grid item xs={12} md={8}>
                <TextField
                  fullWidth
                  multiline
                  minRows={3}
                  label="Header format"
                  value={form.headers}
                  onChange={(e) => setForm((p) => ({ ...p, headers: e.target.value }))}
                  helperText={'JSON: {"X-Tenant":"demo"} or line format: X-Tenant: demo'}
                />
              </Grid>
              <Grid item xs={12}><TextField fullWidth multiline minRows={3} label="Arguments" value={form.arguments} onChange={(e) => setForm((p) => ({ ...p, arguments: e.target.value }))} helperText="Use JSON array/object or plain command arguments." /></Grid>
              <Grid item xs={12}>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  <Button variant="contained" onClick={save}>{editing ? "Update" : "Save"}</Button>
                  <Button variant="outlined" onClick={() => { setEditing(null); setForm(blankServer); }}>Clear</Button>
                  <Button color="error" variant="outlined" disabled={!selectedRows.length} onClick={() => remove(selectedRows)}>Bulk delete</Button>
                </Stack>
              </Grid>
            </Grid>
          </Paper>
          <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #e5e7eb" }}>
            <Typography variant="h6" fontWeight={900} sx={{ mb: 1 }}>Dynamic filters</Typography>
            <Stack spacing={1}>
              {filters.map((filter, index) => (
                <Grid container spacing={1} key={index}>
                  <Grid item xs={12} md={3}>
                    <TextField select fullWidth size="small" label="Field" value={filter.field} onChange={(e) => setFilters((prev) => prev.map((item, i) => i === index ? { ...item, field: e.target.value } : item))}>
                      {Object.entries(labels).filter(([field]) => !["arguments", "token", "headers"].includes(field)).map(([field, label]) => <MenuItem key={field} value={field}>{label}</MenuItem>)}
                    </TextField>
                  </Grid>
                  <Grid item xs={12} md={5}><TextField fullWidth size="small" label="Value" value={filter.value} onChange={(e) => setFilters((prev) => prev.map((item, i) => i === index ? { ...item, value: e.target.value } : item))} /></Grid>
                  <Grid item xs={12} md={4}>
                    <Stack direction="row" spacing={1}>
                      <Button variant="outlined" onClick={() => setFilters((prev) => [...prev, { field: "title", value: "" }])}>Add filter</Button>
                      <Button color="error" variant="outlined" onClick={() => setFilters((prev) => prev.length === 1 ? [{ field: "title", value: "" }] : prev.filter((_, i) => i !== index))}>Remove</Button>
                    </Stack>
                  </Grid>
                </Grid>
              ))}
              <Box><Button variant="contained" onClick={load} disabled={loading}>{loading ? "Loading..." : "Apply filters"}</Button></Box>
            </Stack>
          </Paper>
          <Paper elevation={0} sx={{ p: 1.5, borderRadius: 3, border: "1px solid #e5e7eb" }}>
            <DataGrid
              rows={rows}
              columns={columns}
              getRowId={(row) => row._id}
              checkboxSelection
              rowSelectionModel={selectedRows}
              onRowSelectionModelChange={(model) => setSelectedRows(model)}
              loading={loading}
              autoHeight
              slots={{ toolbar: GridToolbar }}
              slotProps={{ toolbar: { showQuickFilter: true, csvOptions: { fileName: "mcp_servers" } } }}
              pageSizeOptions={[10, 25, 50, 100]}
            />
          </Paper>
        </Stack>
      </Box>
    </MenuPageShell>
  );
}

export function AiTicketingBotPage() {
  const [query, setQuery] = useState("");
  const [geminiModel, setGeminiModel] = useState("gemini-2.5-flash");
  const [token, setToken] = useState("");
  const [headers, setHeaders] = useState("");
  const [loading, setLoading] = useState(false);
  const [steps, setSteps] = useState([]);
  const [result, setResult] = useState(null);
  const [conversation, setConversation] = useState([]);
  const [error, setError] = useState("");

  const run = async () => {
    try {
      setLoading(true);
      setError("");
      setResult(null);
      const userMessage = { role: "user", content: query, at: new Date().toLocaleString() };
      setConversation((prev) => [...prev, userMessage]);
      setSteps([
        { status: "running", label: "Loading MCP server", detail: "Loading default active MCP server from settings." },
        { status: "running", label: "Preparing headers and token", detail: "The backend will use saved headers/token plus any run overrides." },
        { status: "running", label: "Connecting with token", detail: "The backend will call MCP connect with the saved token or this run token." },
        { status: "running", label: "Preparing Gemini request", detail: "Building transaction prompt with MCP server details." }
      ]);
      const res = await ep1.post("/api/v2/central-tickets/ai-bot", { colid: global1.colid, query, geminiModel, token, headers, history: conversation, user: global1.user });
      setSteps(res.data?.steps || []);
      setResult(res.data || null);
      setConversation((prev) => [...prev, {
        role: "assistant",
        content: res.data?.assistantMessage || res.data?.plan?.reply || res.data?.plan?.summary || "No response returned.",
        at: new Date().toLocaleString(),
        needsUserInput: !!res.data?.needsUserInput
      }]);
      setQuery("");
    } catch (err) {
      setError(err.response?.data?.message || "AI ticketing bot failed");
      setSteps(err.response?.data?.steps || [{ status: "error", label: "AI ticketing bot failed", detail: err.response?.data?.message || err.message }]);
      setConversation((prev) => [...prev, {
        role: "assistant",
        content: err.response?.data?.message || "AI ticketing bot failed",
        at: new Date().toLocaleString()
      }]);
    } finally {
      setLoading(false);
    }
  };

  const toolRows = useMemo(() => (result?.tools || []).map((tool, index) => ({ id: tool.name || index, ...tool })), [result]);

  return (
    <MenuPageShell title="AI Ticketing Bot">
      <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: "#f6f7fb", minHeight: "100vh" }}>
        <Stack spacing={2}>
          <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: "1px solid #e5e7eb" }}>
            <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2}>
              <Box>
                <Typography variant="h4" fontWeight={950}>AI Ticketing Bot</Typography>
                <Typography color="text.secondary">Ask a support or transaction query. The bot uses the default MCP server, connects with token, then lets Gemini choose MCP tools.</Typography>
              </Box>
              {result?.server && (
                <Card variant="outlined" sx={{ minWidth: 260 }}>
                  <CardContent sx={{ py: 1.5 }}>
                    <Typography variant="caption" color="text.secondary">Default MCP server</Typography>
                    <Typography fontWeight={900}>{result.server.title}</Typography>
                    <Typography variant="body2" color="text.secondary">{result.server.remoteaddress || result.server.command || "No address/command"}</Typography>
                    <Stack direction="row" spacing={1} sx={{ mt: 1 }} flexWrap="wrap">
                      <Chip size="small" color={result.server.tokenconfigured ? "success" : "warning"} label={result.server.tokenconfigured ? "Token configured" : "No saved token"} />
                      <Chip size="small" color={result.server.headerconfigured ? "success" : "warning"} label={result.server.headerconfigured ? "Headers configured" : "No saved headers"} />
                    </Stack>
                  </CardContent>
                </Card>
              )}
            </Stack>
          </Paper>
          <Alert severity="info">
            <Typography fontWeight={900}>How to use</Typography>
            <Typography variant="body2">
              1. In Settings - MCP Server, save the server remote address, token and header format, then mark it Active and Default.
              2. Open AI Ticketing Bot and type the query.
              3. If you want to use a fresh token or headers only for this run, paste them in Run token and Run headers.
              4. Header format can be JSON like {"{ \"X-API-Key\": \"abc\", \"X-Tenant\": \"demo\" }"} or one per line like X-API-Key: abc.
              5. Click Run bot. The backend calls MCP connect with the token and headers, loads tools, sends the tool list to Gemini, then executes selected MCP tool calls.
            </Typography>
          </Alert>
          {error && <Alert severity="error" onClose={() => setError("")}>{error}</Alert>}
          <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #e5e7eb" }}>
            <Grid container spacing={1.5}>
              <Grid item xs={12} md={9}><TextField fullWidth multiline minRows={4} label="Query" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Example: Check pending ticket status and update the related record if the MCP server exposes a matching tool." /></Grid>
              <Grid item xs={12} md={3}>
                <Stack spacing={1.5}>
                  <TextField select fullWidth label="Gemini model" value={geminiModel} onChange={(e) => setGeminiModel(e.target.value)}>
                    {["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-1.5-flash"].map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}
                  </TextField>
                  <TextField fullWidth type="password" label="Run token" value={token} onChange={(e) => setToken(e.target.value)} helperText="Optional. Overrides saved MCP token for this run." />
                  <TextField fullWidth multiline minRows={3} label="Run headers" value={headers} onChange={(e) => setHeaders(e.target.value)} helperText={'Optional. JSON or Header: value lines. Merged with saved headers.'} />
                  <Button variant="contained" size="large" startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <PlayArrowIcon />} disabled={loading || !query.trim()} onClick={run}>
                    {loading ? "Running..." : (conversation.length ? "Send / continue" : "Run bot")}
                  </Button>
                  <Button variant="outlined" disabled={loading || !conversation.length} onClick={() => { setConversation([]); setResult(null); setSteps([]); setError(""); }}>
                    New conversation
                  </Button>
                </Stack>
              </Grid>
            </Grid>
          </Paper>
          <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #e5e7eb" }}>
            <Typography variant="h6" fontWeight={900} sx={{ mb: 1 }}>Conversation</Typography>
            <Stack spacing={1.5} sx={{ maxHeight: 520, overflow: "auto", pr: 1 }}>
              {conversation.length === 0 && <Typography color="text.secondary">The conversation will appear here. If Gemini asks a question, type the answer above and click Send / continue.</Typography>}
              {conversation.map((message, index) => (
                <Box key={index} sx={{ display: "flex", justifyContent: message.role === "user" ? "flex-end" : "flex-start" }}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 1.5,
                      maxWidth: { xs: "100%", md: "78%" },
                      bgcolor: message.role === "user" ? "#e0f2fe" : "#ffffff",
                      border: message.needsUserInput ? "2px solid #f59e0b" : "1px solid #e5e7eb",
                      borderRadius: 2
                    }}
                  >
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                      <Chip size="small" label={message.role === "user" ? "You" : "Gemini"} color={message.role === "user" ? "primary" : (message.needsUserInput ? "warning" : "default")} />
                      <Typography variant="caption" color="text.secondary">{message.at}</Typography>
                    </Stack>
                    <Typography sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{message.content}</Typography>
                  </Paper>
                </Box>
              ))}
            </Stack>
          </Paper>
          <Grid container spacing={2}>
            <Grid item xs={12} md={5}>
              <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #e5e7eb", minHeight: 360 }}>
                <Typography variant="h6" fontWeight={900} sx={{ mb: 1 }}>Live update</Typography>
                <Stepper orientation="vertical" activeStep={steps.findIndex((step) => step.status === "running") >= 0 ? steps.findIndex((step) => step.status === "running") : steps.length}>
                  {steps.map((step, index) => (
                    <Step key={`${step.label}-${index}`} expanded active completed={step.status === "done"}>
                      <StepLabel icon={<SettingsEthernetIcon color={statusColor(step.status)} />}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography fontWeight={900}>{step.label}</Typography>
                          <Chip size="small" color={statusColor(step.status)} label={step.status || "info"} />
                        </Stack>
                      </StepLabel>
                      <StepContent><Typography color="text.secondary">{step.detail}</Typography></StepContent>
                    </Step>
                  ))}
                </Stepper>
              </Paper>
            </Grid>
            <Grid item xs={12} md={7}>
              <Stack spacing={2}>
                <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #e5e7eb" }}>
                  <Typography variant="h6" fontWeight={900}>Result</Typography>
                  <Typography sx={{ whiteSpace: "pre-wrap", mt: 1 }}>{result?.assistantMessage || result?.plan?.reply || result?.plan?.summary || "Run the bot to see the transaction result."}</Typography>
                  {!!result?.plan?.notes?.length && (
                    <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 1 }}>
                      {result.plan.notes.map((note, index) => <Chip key={index} label={note} />)}
                    </Stack>
                  )}
                </Paper>
                <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #e5e7eb" }}>
                  <Typography variant="h6" fontWeight={900} sx={{ mb: 1 }}>MCP tools discovered</Typography>
                  <DataGrid
                    rows={toolRows}
                    columns={[
                      { field: "name", headerName: "Tool", width: 180 },
                      { field: "description", headerName: "Description", flex: 1, minWidth: 260 }
                    ]}
                    autoHeight
                    slots={{ toolbar: GridToolbar }}
                    pageSizeOptions={[5, 10, 25]}
                  />
                </Paper>
                <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #e5e7eb" }}>
                  <Typography variant="h6" fontWeight={900}>Complete result</Typography>
                  <Box component="pre" sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word", bgcolor: "#0f172a", color: "#e5e7eb", p: 2, borderRadius: 2, maxHeight: 720, overflow: "auto" }}>
                    {result ? JSON.stringify({
                      assistantMessage: result.assistantMessage,
                      needsUserInput: result.needsUserInput,
                      plan: result.plan,
                      toolResults: result.toolResults || [],
                      rawGemini: result.rawGemini,
                      finalGemini: result.finalGemini
                    }, null, 2) : "No transaction details yet."}
                  </Box>
                </Paper>
              </Stack>
            </Grid>
          </Grid>
        </Stack>
      </Box>
    </MenuPageShell>
  );
}
