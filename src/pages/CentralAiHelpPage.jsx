import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
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
import AutoModeIcon from "@mui/icons-material/AutoMode";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import ep1 from "../api/ep1";
import global1 from "./global1";
import MenuPageShell from "./MenuPageShell";

const defaultModel = "gemini-2.5-flash";
const compactDefaultModel = "gemini-2.5-flash-lite";
const modelOptions = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
  "gemini-1.5-flash"
];

const statusColor = (status) => {
  if (status === "done") return "success";
  if (status === "running") return "primary";
  if (status === "warning") return "warning";
  if (status === "error") return "error";
  return "default";
};

function CentralAiHelpPageBase({
  compact = false,
  pageTitle = "AI Help",
  initialModel = defaultModel,
  initialPassword = ""
}) {
  const [query, setQuery] = useState("");
  const [model, setModel] = useState(initialModel);
  const [password, setPassword] = useState(initialPassword);
  const [conversation, setConversation] = useState([]);
  const [steps, setSteps] = useState([]);
  const [tools, setTools] = useState([]);
  const [rules, setRules] = useState({});
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef(null);
  const queryRef = useRef(null);

  const modelChanged = model !== initialModel;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [conversation, loading]);

  useEffect(() => {
    if (compact) {
      setTimeout(() => queryRef.current?.focus(), 250);
    }
  }, [compact]);

  const loadTools = async () => {
    try {
      const res = await ep1.get("/api/v2/central-tickets/ai-help/tools");
      setTools(res.data?.tools || []);
      setRules(res.data?.rules || {});
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load AI Help tools");
    }
  };

  useEffect(() => { loadTools(); }, []);

  const send = async () => {
    if (!query.trim()) return;
    if (modelChanged && password !== "kumropatash") {
      setError("Password is required to change Gemini model. Default password is kumropatash.");
      return;
    }
    try {
      setLoading(true);
      setError("");
      setResult(null);
      const userMessage = { role: "user", content: query, at: new Date().toLocaleString() };
      setConversation((prev) => [...prev, userMessage]);
      setSteps([
        { status: "running", label: "Loading tools", detail: "Preparing LangChain-style tools for permitted view/add/update actions." },
        { status: "running", label: "Gemini thinking", detail: "Gemini will answer or choose tools." }
      ]);
      const res = await ep1.post("/api/v2/central-tickets/ai-help", {
        colid: global1.colid,
        query,
        model,
        password,
        history: conversation,
        user: global1.user,
        name: global1.name,
        role: global1.role,
        regno: global1.regno
      });
      setResult(res.data || null);
      setSteps(res.data?.steps || []);
      setTools(res.data?.tools || tools);
      setRules(res.data?.rules || rules);
      setConversation((prev) => [...prev, {
        role: "assistant",
        content: res.data?.assistantMessage || "No response returned.",
        at: new Date().toLocaleString(),
        needsUserInput: !!res.data?.needsUserInput
      }]);
      setQuery("");
    } catch (err) {
      const message = err.response?.data?.message || "AI Help failed";
      setError(message);
      setSteps(err.response?.data?.steps || [{ status: "error", label: "AI Help failed", detail: message }]);
      setConversation((prev) => [...prev, { role: "assistant", content: message, at: new Date().toLocaleString() }]);
    } finally {
      setLoading(false);
    }
  };

  const toolRows = useMemo(() => tools.map((tool, index) => ({
    id: tool.name || index,
    name: tool.name,
    description: tool.description,
    schema: JSON.stringify(tool.schema || {})
  })), [tools]);

  const ruleRows = useMemo(() => Object.entries(rules).flatMap(([module, items]) => (
    (items || []).map((rule, index) => ({ id: `${module}-${index}`, module, rule }))
  )), [rules]);

  return (
    <MenuPageShell title={pageTitle}>
      <Box sx={{ p: { xs: 1.25, md: 1.75 }, bgcolor: "#f6f7fb", minHeight: "100vh" }}>
        <Stack spacing={1.5}>
          <Alert severity="info">
            <Typography fontWeight={900}>Usage instructions</Typography>
            <Typography variant="body2">
              Ask operational questions like “Show workload for a faculty”, “Add a lesson plan”, or “Update attendance for this class”.
              The bot may inspect or update permitted ERP data and continue the conversation. Changing the Gemini model requires password `kumropatash`.
            </Typography>
          </Alert>
          {error && <Alert severity="error" onClose={() => setError("")}>{error}</Alert>}

          <Paper
            elevation={0}
            sx={{
              borderRadius: 3,
              border: "1px solid #dbeafe",
              overflow: "hidden",
              bgcolor: "#ffffff"
            }}
          >
            <Box sx={{ px: 1.5, py: compact ? 0.75 : 1.5, bgcolor: "#0f172a", color: "#ffffff" }}>
              <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1} alignItems={{ xs: "flex-start", md: "center" }}>
                <Box>
                  <Typography variant={compact ? "subtitle1" : "h6"} fontWeight={950}>Conversation</Typography>
                  {!compact && <Typography variant="body2" sx={{ color: "#cbd5e1" }}>Ask, answer follow-ups, and continue like a regular chat.</Typography>}
                </Box>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  <Chip size="small" color="success" label={`${tools.length} tools`} />
                  <Chip size="small" label={model} sx={{ bgcolor: "#e0f2fe" }} />
                  <Chip size="small" label={`Role: ${global1.role || "User"}`} sx={{ bgcolor: "#fef3c7" }} />
                  <Chip size="small" label={global1.user || "Current user"} sx={{ bgcolor: "#ede9fe" }} />
                </Stack>
              </Stack>
            </Box>
            <Box sx={{ height: { xs: compact ? "78vh" : "58vh", md: compact ? "80vh" : "62vh" }, display: "flex", flexDirection: "column", bgcolor: "#f8fafc" }}>
              <Stack spacing={1.5} sx={{ flex: 1, overflow: "auto", p: 2 }}>
                {conversation.length === 0 && (
                  <Box sx={{ m: "auto", textAlign: "center", maxWidth: 620 }}>
                    <Typography variant="h5" fontWeight={900}>How can I help?</Typography>
                    <Typography color="text.secondary" sx={{ mt: 1 }}>
                      Try asking about workload, courses, timetable, course material, assignments, lesson plans, quizzes or attendance. The bot can ask for missing details before adding or updating records.
                    </Typography>
                  </Box>
                )}
                  {conversation.map((message, index) => (
                    <Box key={index} sx={{ display: "flex", justifyContent: message.role === "user" ? "flex-end" : "flex-start" }}>
                      <Paper
                        elevation={0}
                        sx={{
                          p: 1.5,
                          maxWidth: { xs: "94%", md: "76%" },
                          bgcolor: message.role === "user" ? "#dcfce7" : "#ffffff",
                          border: message.needsUserInput ? "2px solid #f59e0b" : "1px solid #e5e7eb",
                          borderRadius: 3,
                          boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)"
                        }}
                      >
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                          <Chip size="small" label={message.role === "user" ? "You" : "AI Help"} color={message.role === "user" ? "primary" : (message.needsUserInput ? "warning" : "default")} />
                          <Typography variant="caption" color="text.secondary">{message.at}</Typography>
                        </Stack>
                        <Typography sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{message.content}</Typography>
                      </Paper>
                    </Box>
                  ))}
                  {loading && (
                    <Box sx={{ display: "flex", justifyContent: "flex-start" }}>
                      <Paper elevation={0} sx={{ p: 1.5, borderRadius: 3, border: "1px solid #e5e7eb", bgcolor: "#ffffff" }}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <CircularProgress size={16} />
                          <Typography color="text.secondary">AI Help is typing...</Typography>
                        </Stack>
                      </Paper>
                    </Box>
                  )}
                  <Box ref={bottomRef} />
              </Stack>
              <Box sx={{ borderTop: "1px solid #e5e7eb", bgcolor: "#ffffff", p: 1.5 }}>
                <Grid container spacing={1.2} alignItems="flex-end">
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      multiline
                      inputRef={queryRef}
                      minRows={2}
                      maxRows={compact ? 3 : 5}
                      label="Type a message"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) send();
                      }}
                      placeholder="Example: Check if course material is uploaded for 2026-27 CS101."
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={2.2}>
                    <TextField select fullWidth size="small" label="Gemini model" value={model} onChange={(e) => setModel(e.target.value)}>
                      {modelOptions.map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}
                    </TextField>
                  </Grid>
                  {modelChanged && (
                    <Grid item xs={12} sm={6} md={2}>
                      <TextField
                        fullWidth
                        size="small"
                        type="password"
                        label="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        helperText="Required for model change"
                      />
                    </Grid>
                  )}
                  <Grid item xs={12} sm={6} md={modelChanged ? 0.9 : 1.9}>
                    <Button fullWidth variant="contained" sx={{ minHeight: 42 }} startIcon={loading ? <CircularProgress color="inherit" size={18} /> : <PlayArrowIcon />} disabled={loading || !query.trim()} onClick={send}>
                      {loading ? "..." : "Send"}
                    </Button>
                  </Grid>
                  <Grid item xs={12} sm={6} md={0.9}>
                    <Button fullWidth variant="outlined" sx={{ minHeight: 42 }} startIcon={<RestartAltIcon />} disabled={loading || !conversation.length} onClick={() => { setConversation([]); setResult(null); setSteps([]); setQuery(""); }}>
                      New
                    </Button>
                  </Grid>
                </Grid>
              </Box>
            </Box>
          </Paper>

          {!compact && <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #e5e7eb", minHeight: 260 }}>
            <Typography variant="h6" fontWeight={900} sx={{ mb: 1 }}>Live update</Typography>
            <Stepper orientation="vertical" activeStep={steps.findIndex((step) => step.status === "running") >= 0 ? steps.findIndex((step) => step.status === "running") : steps.length}>
              {steps.map((step, index) => (
                <Step key={`${step.label}-${index}`} expanded active completed={step.status === "done"}>
                  <StepLabel icon={<AutoModeIcon color={statusColor(step.status)} />}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography fontWeight={900}>{step.label}</Typography>
                      <Chip size="small" color={statusColor(step.status)} label={step.status || "info"} />
                    </Stack>
                  </StepLabel>
                  <StepContent><Typography color="text.secondary">{step.detail}</Typography></StepContent>
                </Step>
              ))}
            </Stepper>
          </Paper>}

          {!compact && <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #e5e7eb" }}>
                <Typography variant="h6" fontWeight={900} sx={{ mb: 1 }}>Tools Created</Typography>
                <DataGrid
                  rows={toolRows}
                  columns={[
                    { field: "name", headerName: "Tool", width: 190 },
                    { field: "description", headerName: "Description", flex: 1, minWidth: 260 },
                    { field: "schema", headerName: "Schema", width: 260 }
                  ]}
                  autoHeight
                  slots={{ toolbar: GridToolbar }}
                  pageSizeOptions={[5, 10, 25]}
                />
              </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #e5e7eb" }}>
                <Typography variant="h6" fontWeight={900} sx={{ mb: 1 }}>Default Rules</Typography>
                <DataGrid
                  rows={ruleRows}
                  columns={[
                    { field: "module", headerName: "Module", width: 150 },
                    { field: "rule", headerName: "Rule", flex: 1, minWidth: 360 }
                  ]}
                  autoHeight
                  slots={{ toolbar: GridToolbar }}
                  pageSizeOptions={[5, 10, 25]}
                />
              </Paper>
            </Grid>
          </Grid>}

          {!compact && <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #e5e7eb" }}>
            <Typography variant="h6" fontWeight={900}>Complete result</Typography>
            <Box component="pre" sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word", bgcolor: "#0f172a", color: "#e5e7eb", p: 2, borderRadius: 2, maxHeight: 560, overflow: "auto" }}>
              {result ? JSON.stringify({
                assistantMessage: result.assistantMessage,
                needsUserInput: result.needsUserInput,
                plan: result.plan,
                toolResults: result.toolResults,
                rawGemini: result.rawGemini
              }, null, 2) : "No result yet."}
            </Box>
          </Paper>}
        </Stack>
      </Box>
    </MenuPageShell>
  );
}

export function CentralAiHelpBotPage() {
  return (
    <CentralAiHelpPageBase
      compact
      pageTitle="AI Help Bot"
      initialModel={compactDefaultModel}
      initialPassword="kumropatash"
    />
  );
}

export default function CentralAiHelpPage() {
  return <CentralAiHelpPageBase />;
}
