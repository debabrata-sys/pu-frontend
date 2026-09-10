import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import { DataGrid, GridToolbar } from "@mui/x-data-grid";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import DownloadIcon from "@mui/icons-material/Download";
import PsychologyIcon from "@mui/icons-material/Psychology";
import PrintIcon from "@mui/icons-material/Print";
import SaveIcon from "@mui/icons-material/Save";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import MenuPageShell from "./MenuPageShell";
import ep1 from "../api/ep1";
import global1 from "./global1";

const api = (path) => `${ep1.defaults?.baseURL || ""}${path}`;
const palette = ["#1d4ed8", "#059669", "#ea580c", "#7c3aed", "#0f766e", "#dc2626", "#4f46e5", "#0891b2"];
const gridSx = {
  "& .MuiDataGrid-cell": { whiteSpace: "normal", overflowWrap: "anywhere", lineHeight: 1.3, py: 1 },
  "& .MuiDataGrid-columnHeaderTitle": { whiteSpace: "normal", lineHeight: 1.2 }
};

const basePayload = () => ({ colid: global1.colid, name: global1.name, user: global1.user });
const clean = (value) => String(value || "").trim();
const rowsWithId = (rows = []) => rows.map((row, index) => ({ id: row._id || index + 1, ...row }));
const csvEscape = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;

async function getJson(path) {
  const response = await fetch(api(path));
  return response.json();
}

async function postJson(path, payload) {
  const response = await fetch(api(path), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...basePayload(), ...payload })
  });
  return response.json();
}

function exportCsv(filename, rows, columns) {
  const csv = [
    columns.map((column) => csvEscape(column.headerName || column.field)).join(","),
    ...rows.map((row) => columns.map((column) => csvEscape(row[column.field])).join(","))
  ].join("\n");
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

function printHtml(title, body) {
  const win = window.open("", "_blank", "width=1100,height=800");
  if (!win) return;
  win.document.write(`<!doctype html><html><head><title>${title}</title><style>
    @page{size:A4;margin:12mm} body{font-family:Arial,sans-serif;color:#000;background:#fff}
    .actions{position:sticky;top:0;background:#fff;padding:8px;text-align:right;border-bottom:1px solid #ddd}
    .print{max-width:190mm;margin:auto}.header{text-align:center;border-bottom:2px solid #111;padding-bottom:10px;margin-bottom:12px}
    .header img{max-height:58px;object-fit:contain}.title{font-size:20px;font-weight:700;margin-top:8px}
    table{width:100%;border-collapse:collapse;font-size:11px}th,td{border:1px solid #222;padding:5px;vertical-align:top}th{background:#f1f5f9}
    .cards{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:10px 0}.card{border:1px solid #999;padding:8px}
    @media print{.actions{display:none}tr{break-inside:avoid}thead{display:table-header-group}}
  </style></head><body><div class="actions"><button onclick="window.print()">Print</button><button onclick="window.close()">Close</button></div>${body}</body></html>`);
  win.document.close();
}

function AuditHeader({ title }) {
  return (
    <Stack spacing={0.5}>
      <Typography variant="h5" fontWeight={800}>{title}</Typography>
      <Typography variant="body2" color="text.secondary">Academic audit evidence, ERP import, departmental review and institution-level quality analysis.</Typography>
    </Stack>
  );
}

function StatCard({ label, value, accent = "#1d4ed8" }) {
  return (
    <Card variant="outlined" sx={{ borderTop: `4px solid ${accent}` }}>
      <CardContent>
        <Typography variant="body2" color="text.secondary">{label}</Typography>
        <Typography variant="h4" fontWeight={800}>{value ?? 0}</Typography>
      </CardContent>
    </Card>
  );
}

function ChartCard({ title, children }) {
  return (
    <Paper variant="outlined" sx={{ p: 2, height: 330 }}>
      <Typography fontWeight={700} mb={1}>{title}</Typography>
      {children}
    </Paper>
  );
}

function SearchSelect({ label, value, options, onChange, getLabel = (x) => x, freeSolo = false }) {
  return (
    <Autocomplete
      size="small"
      freeSolo={freeSolo}
      options={options || []}
      value={value || null}
      onChange={(_, next) => onChange(next || "")}
      onInputChange={(_, next, reason) => {
        if (freeSolo && (reason === "input" || reason === "clear")) onChange(next || "");
      }}
      getOptionLabel={(option) => clean(getLabel(option))}
      isOptionEqualToValue={(option, selected) => clean(getLabel(option)) === clean(getLabel(selected))}
      renderInput={(params) => <TextField {...params} label={label} />}
    />
  );
}

function useAuditOptions() {
  const [options, setOptions] = useState({ audits: [], questions: [], criteria: [], departments: [], academicyears: [] });
  const load = async () => {
    const json = await getJson(`/api/v2/academic-audit/options?colid=${global1.colid}`);
    if (json.status === "success") setOptions(json);
  };
  useEffect(() => { load(); }, []);
  return { options, load };
}

export function AcademicAuditMasterPage() {
  const { options, load } = useAuditOptions();
  const [rows, setRows] = useState([]);
  const [selection, setSelection] = useState([]);
  const [form, setForm] = useState({ academicyear: "", auditname: "", scope: "Institution", department: "", status: "Active", startdate: "", enddate: "", remarks: "" });

  const refresh = async () => {
    const json = await getJson(`/api/v2/academic-audit/audits?colid=${global1.colid}`);
    if (json.status === "success") setRows(rowsWithId(json.data));
    load();
  };
  useEffect(() => { refresh(); }, []);

  const save = async () => {
    const json = await postJson("/api/v2/academic-audit/audits", form);
    if (json.status !== "success") return alert(json.message || "Save failed");
    setForm({ academicyear: "", auditname: "", scope: "Institution", department: "", status: "Active", startdate: "", enddate: "", remarks: "" });
    refresh();
  };
  const deleteSelected = async () => {
    await postJson("/api/v2/academic-audit/audits-delete", { ids: selection });
    setSelection([]);
    refresh();
  };

  const columns = [
    { field: "academicyear", headerName: "Academic year", width: 140 },
    { field: "auditname", headerName: "Audit", minWidth: 240, flex: 1 },
    { field: "scope", headerName: "Scope", width: 130 },
    { field: "department", headerName: "Department", width: 170 },
    { field: "startdate", headerName: "Start date", width: 130 },
    { field: "enddate", headerName: "End date", width: 130 },
    { field: "status", headerName: "Status", width: 120 },
    { field: "remarks", headerName: "Remarks", minWidth: 220, flex: 1 },
    { field: "edit", headerName: "Edit", width: 90, renderCell: ({ row }) => <Button size="small" onClick={() => setForm(row)}>Edit</Button> }
  ];

  return (
    <MenuPageShell title="Academic audit">
      <Stack spacing={2}>
        <AuditHeader title="Academic Audit Master" />
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={2}><SearchSelect freeSolo label="Academic year" value={form.academicyear} options={options.academicyears} onChange={(v) => setForm({ ...form, academicyear: clean(v) })} /></Grid>
            <Grid item xs={12} md={4}><TextField size="small" fullWidth label="Audit name" value={form.auditname} onChange={(e) => setForm({ ...form, auditname: e.target.value })} /></Grid>
            <Grid item xs={12} md={2}><TextField select size="small" fullWidth label="Scope" value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value })}><MenuItem value="Institution">Institution</MenuItem><MenuItem value="Department">Department</MenuItem></TextField></Grid>
            <Grid item xs={12} md={2}><SearchSelect freeSolo label="Department" value={form.department} options={options.departments} onChange={(v) => setForm({ ...form, department: clean(v) })} /></Grid>
            <Grid item xs={6} md={2}><TextField size="small" fullWidth type="date" label="Start date" InputLabelProps={{ shrink: true }} value={form.startdate} onChange={(e) => setForm({ ...form, startdate: e.target.value })} /></Grid>
            <Grid item xs={6} md={2}><TextField size="small" fullWidth type="date" label="End date" InputLabelProps={{ shrink: true }} value={form.enddate} onChange={(e) => setForm({ ...form, enddate: e.target.value })} /></Grid>
            <Grid item xs={12} md={2}><TextField select size="small" fullWidth label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><MenuItem value="Active">Active</MenuItem><MenuItem value="Closed">Closed</MenuItem></TextField></Grid>
            <Grid item xs={12} md={6}><TextField size="small" fullWidth label="Remarks" value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} /></Grid>
            <Grid item xs={12} md={2}><Button fullWidth variant="contained" startIcon={<SaveIcon />} onClick={save}>Save</Button></Grid>
          </Grid>
        </Paper>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<DownloadIcon />} onClick={() => exportCsv("academic-audits.csv", rows, columns.filter((c) => c.field !== "edit"))}>Export</Button>
          <Button color="error" variant="outlined" disabled={!selection.length} onClick={deleteSelected}>Bulk delete</Button>
        </Stack>
        <Paper sx={{ height: 520 }}>
          <DataGrid rows={rows} columns={columns} checkboxSelection onRowSelectionModelChange={(m) => setSelection(Array.from(m))} slots={{ toolbar: GridToolbar }} sx={gridSx} getRowHeight={() => "auto"} />
        </Paper>
      </Stack>
    </MenuPageShell>
  );
}

export function AcademicAuditEntryPage() {
  const { options, load } = useAuditOptions();
  const [audit, setAudit] = useState(null);
  const [entryDepartment, setEntryDepartment] = useState("Institution");
  const [criteria, setCriteria] = useState("");
  const [question, setQuestion] = useState(null);
  const [responses, setResponses] = useState([]);
  const [form, setForm] = useState({ data: "", numericvalue: "", documentlink: "", documentname: "" });

  const filteredQuestions = useMemo(() => options.questions.filter((q) => !criteria || q.criteria === criteria), [options.questions, criteria]);
  const refreshResponses = async (id = audit?._id) => {
    if (!id) return setResponses([]);
    const json = await getJson(`/api/v2/academic-audit/responses?colid=${global1.colid}&auditid=${id}`);
    if (json.status === "success") setResponses(rowsWithId(json.data));
  };
  useEffect(() => { refreshResponses(); }, [audit?._id]);
  useEffect(() => {
    if (audit) setEntryDepartment(audit.department || "Institution");
  }, [audit?._id]);

  const importErp = async () => {
    if (!question || !audit) return;
    const json = await postJson("/api/v2/academic-audit/import-erp", { auditid: audit._id, erpsource: question.erpsource, department: entryDepartment === "Institution" ? "" : entryDepartment, academicyear: audit.academicyear });
    if (json.status === "success") setForm({ ...form, data: json.data, numericvalue: json.numericvalue || "" });
    else alert(json.message || "ERP import failed");
  };
  const uploadFile = async (file) => {
    const body = new FormData();
    body.append("file", file);
    body.append("colid", global1.colid);
    const response = await fetch(api("/api/v2/academic-audit/upload"), { method: "POST", body });
    const json = await response.json();
    if (json.status === "success") setForm({ ...form, documentlink: json.url, documentname: json.filename });
    else alert(json.message || "Upload failed");
  };
  const save = async () => {
    if (!audit || !question) return alert("Select audit and question");
    const json = await postJson("/api/v2/academic-audit/responses", {
      ...form,
      auditid: audit._id,
      academicyear: audit.academicyear,
      department: entryDepartment || "Institution",
      scope: audit.scope,
      responselevel: entryDepartment === "Institution" ? "Institution" : "Department",
      criteria: question.criteria,
      questionid: question._id,
      question: question.question,
      erpimportsource: question.erpsource,
      erpimported: form.data && question.erpsource ? "Yes" : "No"
    });
    if (json.status !== "success") return alert(json.message || "Save failed");
    setForm({ data: "", numericvalue: "", documentlink: "", documentname: "" });
    setQuestion(null);
    refreshResponses();
    load();
  };

  const columns = [
    { field: "responselevel", headerName: "Level", width: 130 },
    { field: "department", headerName: "Department/Institution", width: 190 },
    { field: "criteria", headerName: "Criteria", minWidth: 200, flex: 1 },
    { field: "question", headerName: "Question", minWidth: 300, flex: 1.4 },
    { field: "data", headerName: "Submitted data", minWidth: 300, flex: 1.5 },
    { field: "numericvalue", headerName: "Value", width: 110 },
    { field: "documentlink", headerName: "Document", minWidth: 180, renderCell: ({ value }) => value ? <a href={value} target="_blank" rel="noreferrer">Open document</a> : "" }
  ];

  return (
    <MenuPageShell title="Academic audit entry">
      <Stack spacing={2}>
        <AuditHeader title="Academic Audit Data Entry" />
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}><SearchSelect label="Academic audit" value={audit} options={options.audits} onChange={setAudit} getLabel={(x) => `${x.academicyear || ""} - ${x.auditname || ""} ${x.department ? `(${x.department})` : ""}`} /></Grid>
            <Grid item xs={12} md={3}><SearchSelect freeSolo label="Institution / Department" value={entryDepartment} options={["Institution", ...options.departments]} onChange={(v) => setEntryDepartment(clean(v) || "Institution")} /></Grid>
            <Grid item xs={12} md={2}><SearchSelect label="Criteria" value={criteria} options={options.criteria} onChange={(v) => { setCriteria(v); setQuestion(null); }} /></Grid>
            <Grid item xs={12} md={3}><SearchSelect label="Question" value={question} options={filteredQuestions} onChange={setQuestion} getLabel={(x) => x.question} /></Grid>
            {audit && <Grid item xs={12}><Alert severity="info">Selected audit: {audit.auditname} | Audit scope: {audit.scope} | Current response level: {entryDepartment === "Institution" ? "Institution" : `Department - ${entryDepartment}`}</Alert></Grid>}
            <Grid item xs={12} md={8}><TextField multiline minRows={5} fullWidth label="Data / evidence note" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} /></Grid>
            <Grid item xs={12} md={4}>
              <Stack spacing={1}>
                <TextField size="small" type="number" label="Numeric value, if applicable" value={form.numericvalue} onChange={(e) => setForm({ ...form, numericvalue: e.target.value })} />
                <Button variant="outlined" disabled={!question?.erpsource} onClick={importErp}>Import from ERP</Button>
                <Button component="label" variant="outlined" startIcon={<CloudUploadIcon />}>Upload document<input hidden type="file" onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0])} /></Button>
                {form.documentlink && <Chip label={form.documentname || "Document uploaded"} color="success" />}
                <Button variant="contained" onClick={save}>Save response</Button>
              </Stack>
            </Grid>
          </Grid>
        </Paper>
        <Paper sx={{ height: 520 }}>
          <DataGrid rows={responses} columns={columns} slots={{ toolbar: GridToolbar }} sx={gridSx} getRowHeight={() => "auto"} />
        </Paper>
      </Stack>
    </MenuPageShell>
  );
}

function ReportView({ endpoint = "report", title = "Academic Audit Report", dashboard = false }) {
  const { options } = useAuditOptions();
  const [audit, setAudit] = useState(null);
  const [department, setDepartment] = useState("");
  const [criteria, setCriteria] = useState("");
  const [data, setData] = useState({ data: [], responses: [], summary: { cards: {}, criteria: [], departments: [], departmentCriteria: [], departmentScores: [], metricScores: [] }, audits: [] });

  const loadReport = async () => {
    const params = new URLSearchParams({ colid: global1.colid });
    if (audit?._id) params.set("auditid", audit._id);
    if (department) params.set("department", department);
    if (criteria) params.set("criteria", criteria);
    const json = await getJson(`/api/v2/academic-audit/${endpoint}?${params.toString()}`);
    if (json.status === "success") setData(json);
  };
  useEffect(() => { loadReport(); }, []);

  const rows = rowsWithId(data.data || data.responses || []);
  const deptRows = rowsWithId(data.summary?.departmentCriteria || []);
  const columns = [
    { field: "academicyear", headerName: "Academic year", width: 140 },
    { field: "responselevel", headerName: "Level", width: 120 },
    { field: "department", headerName: "Department", width: 160 },
    { field: "criteria", headerName: "Criteria", minWidth: 220, flex: 1 },
    { field: "question", headerName: "Question", minWidth: 300, flex: 1.4 },
    { field: "data", headerName: "Data", minWidth: 320, flex: 1.5 },
    { field: "numericvalue", headerName: "Value", width: 110 },
    { field: "documentlink", headerName: "Document", minWidth: 160, renderCell: ({ value }) => value ? <a href={value} target="_blank" rel="noreferrer">Open</a> : "" }
  ];
  const deptColumns = [
    { field: "department", headerName: "Department / Institution", minWidth: 220, flex: 1 },
    { field: "criteria", headerName: "Criteria", minWidth: 260, flex: 1.4 },
    { field: "submitted", headerName: "Responses", width: 120 },
    { field: "documents", headerName: "Documents", width: 120 },
    { field: "numericvalue", headerName: "Numeric value", width: 140 },
    { field: "score", headerName: "Score", width: 110 }
  ];
  const print = () => printHtml(title, `<div class="print"><div class="header"><div class="title">${title}</div><div>${global1.college || global1.colid || ""}</div></div>
    <div class="cards"><div class="card"><b>Questions</b><br>${data.summary?.cards?.totalQuestions || 0}</div><div class="card"><b>Submitted</b><br>${data.summary?.cards?.submitted || 0}</div><div class="card"><b>Departments</b><br>${data.summary?.cards?.departmentsCovered || 0}</div><div class="card"><b>Avg score</b><br>${data.summary?.cards?.averageDepartmentScore || 0}</div></div>
    <h3>Department Score</h3><table><thead><tr><th>Department</th><th>Score</th><th>Metrics</th><th>Responses</th><th>Documents</th></tr></thead><tbody>${(data.summary?.departmentScores || []).map((r) => `<tr><td>${r.label || ""}</td><td>${r.score || 0}</td><td>${r.metrics || 0}</td><td>${r.responses || 0}</td><td>${r.documents || 0}</td></tr>`).join("")}</tbody></table>
    <h3>Metric Score</h3><table><thead><tr><th>Metric</th><th>Score</th><th>Departments</th><th>Responses</th><th>Documents</th></tr></thead><tbody>${(data.summary?.metricScores || []).map((r) => `<tr><td>${r.label || ""}</td><td>${r.score || 0}</td><td>${r.departments || 0}</td><td>${r.responses || 0}</td><td>${r.documents || 0}</td></tr>`).join("")}</tbody></table>
    <h3>Department-wise Summary</h3><table><thead><tr><th>Department / Institution</th><th>Criteria</th><th>Responses</th><th>Documents</th><th>Numeric value</th><th>Score</th></tr></thead><tbody>${deptRows.map((r) => `<tr><td>${r.department || ""}</td><td>${r.criteria || ""}</td><td>${r.submitted || 0}</td><td>${r.documents || 0}</td><td>${r.numericvalue || 0}</td><td>${r.score || 0}</td></tr>`).join("")}</tbody></table>
    <h3>Submitted Information</h3><table><thead><tr>${columns.filter((c) => c.field !== "documentlink").map((c) => `<th>${c.headerName}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr><td>${r.academicyear || ""}</td><td>${r.responselevel || ""}</td><td>${r.department || ""}</td><td>${r.criteria || ""}</td><td>${r.question || ""}</td><td>${r.data || ""}</td><td>${r.numericvalue || ""}</td></tr>`).join("")}</tbody></table></div>`);

  return (
    <MenuPageShell title={title}>
      <Stack spacing={2}>
        <AuditHeader title={title} />
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={5}><SearchSelect label="Academic audit" value={audit} options={options.audits} onChange={setAudit} getLabel={(x) => `${x.academicyear || ""} - ${x.auditname || ""}`} /></Grid>
            <Grid item xs={12} md={3}><SearchSelect freeSolo label="Department" value={department} options={options.departments} onChange={(v) => setDepartment(clean(v))} /></Grid>
            <Grid item xs={12} md={3}><SearchSelect label="Criteria" value={criteria} options={options.criteria} onChange={setCriteria} /></Grid>
            <Grid item xs={12} md={1}><Button fullWidth variant="contained" onClick={loadReport}>Apply</Button></Grid>
          </Grid>
        </Paper>
        <Grid container spacing={2}>
          <Grid item xs={6} md={2}><StatCard label="Questions" value={data.summary?.cards?.totalQuestions} /></Grid>
          <Grid item xs={6} md={2}><StatCard label="Submitted" value={data.summary?.cards?.submitted} accent="#059669" /></Grid>
          <Grid item xs={6} md={2}><StatCard label="Institution responses" value={data.summary?.cards?.institutionResponses} accent="#ea580c" /></Grid>
          <Grid item xs={6} md={2}><StatCard label="Department responses" value={data.summary?.cards?.departmentResponses} accent="#7c3aed" /></Grid>
          <Grid item xs={6} md={2}><StatCard label="Departments covered" value={data.summary?.cards?.departmentsCovered} accent="#0891b2" /></Grid>
          <Grid item xs={6} md={2}><StatCard label="Avg dept score" value={data.summary?.cards?.averageDepartmentScore} accent="#0f766e" /></Grid>
          <Grid item xs={6} md={2}><StatCard label="Avg metric score" value={data.summary?.cards?.averageMetricScore} accent="#b45309" /></Grid>
          <Grid item xs={12} md={6}>
            <ChartCard title="Criteria-wise submissions">
              <ResponsiveContainer><BarChart data={data.summary?.criteria || []}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="label" hide /><YAxis /><Tooltip /><Legend /><Bar dataKey="submitted" fill="#1d4ed8" /><Bar dataKey="documents" fill="#059669" /></BarChart></ResponsiveContainer>
            </ChartCard>
          </Grid>
          <Grid item xs={12} md={6}>
            <ChartCard title={dashboard ? "Departmental analysis" : "Department-wise submissions"}>
              <ResponsiveContainer><PieChart><Pie data={data.summary?.departments || []} dataKey="submitted" nameKey="label" outerRadius={105} label>{(data.summary?.departments || []).map((_, i) => <Cell key={i} fill={palette[i % palette.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer>
            </ChartCard>
          </Grid>
          <Grid item xs={12} md={6}>
            <ChartCard title="Department-wise score comparison">
              <ResponsiveContainer><BarChart data={data.summary?.departmentScores || []}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="label" hide /><YAxis domain={[0, 100]} /><Tooltip /><Legend /><Bar dataKey="score" fill="#7c3aed" /><Bar dataKey="responses" fill="#0891b2" /></BarChart></ResponsiveContainer>
            </ChartCard>
          </Grid>
          <Grid item xs={12} md={6}>
            <ChartCard title="Metric-wise score comparison">
              <ResponsiveContainer><BarChart data={data.summary?.metricScores || []}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="label" hide /><YAxis domain={[0, 100]} /><Tooltip /><Legend /><Bar dataKey="score" fill="#ea580c" /><Bar dataKey="documents" fill="#16a34a" /></BarChart></ResponsiveContainer>
            </ChartCard>
          </Grid>
        </Grid>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<PrintIcon />} onClick={print}>Print preview</Button>
          <Button variant="outlined" startIcon={<DownloadIcon />} onClick={() => exportCsv("academic-audit-report.csv", rows, columns)}>Export</Button>
        </Stack>
        <Typography variant="h6" fontWeight={800}>Department-wise Criteria Summary</Typography>
        <Paper sx={{ height: 420 }}>
          <DataGrid rows={deptRows} columns={deptColumns} slots={{ toolbar: GridToolbar }} sx={gridSx} getRowHeight={() => "auto"} />
        </Paper>
        <Typography variant="h6" fontWeight={800}>Submitted Information</Typography>
        <Paper sx={{ height: 560 }}>
          <DataGrid rows={rows} columns={columns} slots={{ toolbar: GridToolbar }} sx={gridSx} getRowHeight={() => "auto"} />
        </Paper>
      </Stack>
    </MenuPageShell>
  );
}

export function AcademicAuditReportPage() {
  return <ReportView endpoint="report" title="Academic Audit Report" />;
}

export function AcademicAuditDashboardPage() {
  return <ReportView endpoint="dashboard" title="Academic Audit Dashboard" dashboard />;
}

export function AcademicAuditDummyDataPage() {
  const { options, load } = useAuditOptions();
  const [academicyear, setAcademicyear] = useState("");
  const [departments, setDepartments] = useState([]);
  const [departmentcount, setDepartmentcount] = useState(5);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!academicyear && options.academicyears?.[0]) setAcademicyear(options.academicyears[0]);
  }, [options.academicyears, academicyear]);

  const generate = async () => {
    setLoading(true);
    const json = await postJson("/api/v2/academic-audit/generate-dummy-data", {
      academicyear,
      departments,
      departmentcount
    });
    setLoading(false);
    if (json.status !== "success") return alert(json.message || "Dummy data generation failed");
    setResult(json.data);
    load();
  };

  const print = () => {
    if (!result) return;
    const deptScores = result.summary?.departmentScores || [];
    const metricScores = result.summary?.metricScores || [];
    printHtml("Dummy data AAA", `<div class="print"><div class="header"><div class="title">Dummy Data AAA</div><div>Academic Audit Dummy Data Summary</div></div>
      <div class="cards"><div class="card"><b>Academic year</b><br>${result.audit?.academicyear || ""}</div><div class="card"><b>Questions</b><br>${result.questions || 0}</div><div class="card"><b>Departments</b><br>${result.departments || 0}</div><div class="card"><b>Responses</b><br>${result.responses || 0}</div></div>
      <h3>Created audit</h3><table><tbody><tr><th>Audit</th><td>${result.audit?.auditname || ""}</td></tr><tr><th>Status</th><td>${result.audit?.status || ""}</td></tr><tr><th>Analysis records</th><td>${result.analyses || 0}</td></tr></tbody></table>
      <h3>Department Score</h3><table><thead><tr><th>Department</th><th>Score</th><th>Metrics</th><th>Responses</th><th>Documents</th></tr></thead><tbody>${deptScores.map((row) => `<tr><td>${row.label || ""}</td><td>${row.score || 0}</td><td>${row.metrics || 0}</td><td>${row.responses || 0}</td><td>${row.documents || 0}</td></tr>`).join("")}</tbody></table>
      <h3>Metric Score</h3><table><thead><tr><th>Metric</th><th>Score</th><th>Departments</th><th>Responses</th><th>Documents</th></tr></thead><tbody>${metricScores.map((row) => `<tr><td>${row.label || ""}</td><td>${row.score || 0}</td><td>${row.departments || 0}</td><td>${row.responses || 0}</td><td>${row.documents || 0}</td></tr>`).join("")}</tbody></table></div>`);
  };

  const deptScoreRows = rowsWithId(result?.summary?.departmentScores || []);
  const metricScoreRows = rowsWithId(result?.summary?.metricScores || []);
  const scoreColumns = [
    { field: "label", headerName: "Name", minWidth: 240, flex: 1 },
    { field: "score", headerName: "Score", width: 110 },
    { field: "responses", headerName: "Responses", width: 120 },
    { field: "documents", headerName: "Documents", width: 120 }
  ];

  return (
    <MenuPageShell title="Dummy data AAA">
      <Stack spacing={2}>
        <AuditHeader title="Dummy Data AAA" />
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={3}>
              <SearchSelect freeSolo label="Academic year" value={academicyear} options={options.academicyears} onChange={(v) => setAcademicyear(clean(v))} />
            </Grid>
            <Grid item xs={12} md={5}>
              <Autocomplete
                multiple
                size="small"
                options={options.departments || []}
                value={departments}
                onChange={(_, next) => setDepartments(next)}
                renderInput={(params) => <TextField {...params} label="Departments, optional" helperText="Leave blank to use departments from User.department" />}
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <TextField size="small" fullWidth type="number" label="Department count" value={departmentcount} onChange={(e) => setDepartmentcount(e.target.value)} />
            </Grid>
            <Grid item xs={12} md={2}>
              <Button fullWidth variant="contained" disabled={loading} onClick={generate}>{loading ? "Generating..." : "Generate"}</Button>
            </Grid>
          </Grid>
        </Paper>
        {result && (
          <>
            <Grid container spacing={2}>
              <Grid item xs={6} md={3}><StatCard label="Questions" value={result.questions} /></Grid>
              <Grid item xs={6} md={3}><StatCard label="Departments" value={result.departments} accent="#059669" /></Grid>
              <Grid item xs={6} md={3}><StatCard label="Responses" value={result.responses} accent="#7c3aed" /></Grid>
              <Grid item xs={6} md={3}><StatCard label="Analysis" value={result.analyses} accent="#ea580c" /></Grid>
            </Grid>
            <Alert severity="success">Dummy academic audit created: {result.audit?.auditname}</Alert>
            <Stack direction="row" spacing={1}>
              <Button variant="outlined" startIcon={<PrintIcon />} onClick={print}>Print preview</Button>
              <Button variant="outlined" onClick={() => window.location.href = "/academic-audit-report"}>Open report</Button>
            </Stack>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" fontWeight={800}>Department score</Typography>
                <Paper sx={{ height: 360 }}><DataGrid rows={deptScoreRows} columns={scoreColumns} slots={{ toolbar: GridToolbar }} sx={gridSx} getRowHeight={() => "auto"} /></Paper>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" fontWeight={800}>Metric score</Typography>
                <Paper sx={{ height: 360 }}><DataGrid rows={metricScoreRows} columns={scoreColumns} slots={{ toolbar: GridToolbar }} sx={gridSx} getRowHeight={() => "auto"} /></Paper>
              </Grid>
            </Grid>
          </>
        )}
      </Stack>
    </MenuPageShell>
  );
}

export function AcademicAuditAiAnalysisPage() {
  const { options } = useAuditOptions();
  const [audit, setAudit] = useState(null);
  const [aiOptions, setAiOptions] = useState({ geminiModels: [], ollamaConfigs: [] });
  const [provider, setProvider] = useState("Gemini");
  const [model, setModel] = useState("gemini-1.5-flash");
  const [ollamaConfigId, setOllamaConfigId] = useState("");
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getJson(`/api/v2/academic-audit/ai-options?colid=${global1.colid}`).then((json) => {
      if (json.status === "success") {
        setAiOptions(json);
        if (json.ollamaConfigs?.[0]?._id) setOllamaConfigId(json.ollamaConfigs[0]._id);
      }
    });
  }, []);

  const analyze = async () => {
    if (!audit) return alert("Select academic audit");
    setLoading(true);
    const json = await postJson("/api/v2/academic-audit/ai-analysis", { auditid: audit._id, provider, model, ollamaConfigId, prompt });
    setLoading(false);
    if (json.status === "success") setResult(json.data.analysis);
    else alert(json.message || "AI analysis failed");
  };
  const print = () => printHtml("Academic Audit AI Analysis", `<div class="print"><div class="header"><div class="title">Academic Audit AI Analysis</div><div>${audit?.auditname || ""}</div></div><pre style="white-space:pre-wrap;font-family:Arial,sans-serif">${result}</pre></div>`);

  return (
    <MenuPageShell title="Academic audit AI analysis">
      <Stack spacing={2}>
        <AuditHeader title="Academic Audit AI Analysis" />
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={5}><SearchSelect label="Academic audit" value={audit} options={options.audits} onChange={setAudit} getLabel={(x) => `${x.academicyear || ""} - ${x.auditname || ""}`} /></Grid>
            <Grid item xs={12} md={2}><TextField select size="small" fullWidth label="AI provider" value={provider} onChange={(e) => setProvider(e.target.value)}><MenuItem value="Gemini">Gemini</MenuItem><MenuItem value="Ollama">Ollama</MenuItem><MenuItem value="Local">Local summary</MenuItem></TextField></Grid>
            <Grid item xs={12} md={3}>
              {provider === "Ollama"
                ? <TextField select size="small" fullWidth label="Ollama config" value={ollamaConfigId} onChange={(e) => setOllamaConfigId(e.target.value)}>{aiOptions.ollamaConfigs.map((c) => <MenuItem key={c._id} value={c._id}>{c.name} - {c.modelname}</MenuItem>)}</TextField>
                : <SearchSelect label="Gemini model" value={model} options={aiOptions.geminiModels} onChange={setModel} />}
            </Grid>
            <Grid item xs={12} md={2}><Button fullWidth variant="contained" startIcon={<PsychologyIcon />} disabled={loading} onClick={analyze}>{loading ? "Analyzing..." : "Analyze"}</Button></Grid>
            <Grid item xs={12}><TextField multiline minRows={4} fullWidth label="Additional audit analysis prompt" value={prompt} onChange={(e) => setPrompt(e.target.value)} /></Grid>
          </Grid>
        </Paper>
        {result && (
          <>
            <Stack direction="row" spacing={1}><Button variant="outlined" startIcon={<PrintIcon />} onClick={print}>Print preview</Button></Stack>
            <Paper variant="outlined" sx={{ p: 2, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{result}</Paper>
          </>
        )}
      </Stack>
    </MenuPageShell>
  );
}
