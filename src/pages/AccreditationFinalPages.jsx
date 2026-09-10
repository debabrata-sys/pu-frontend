import React, { useEffect, useMemo, useState } from "react";
import { Alert, Autocomplete, Box, Button, Chip, Grid, Paper, Stack, TextField, Typography } from "@mui/material";
import { DataGrid, GridToolbar } from "@mui/x-data-grid";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Print, Search } from "@mui/icons-material";
import ep1 from "../api/ep1";
import global1 from "./global1";
import MenuPageShell from "./MenuPageShell";
import PersonalDataSubmissionPage, { personalDataConfigs } from "./PersonalDataSubmissionPage";

const safe = (value) => String(value ?? "").replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[m]));
const filterParams = (filters) => Object.fromEntries(Object.entries(filters).filter(([, value]) => {
  if (Array.isArray(value)) return value.length > 0;
  return value !== "" && value !== null && value !== undefined;
}));
const queryParams = (filters) => Object.fromEntries(Object.entries(filterParams(filters)).map(([key, value]) => [key, Array.isArray(value) ? value.join(",") : value]));
const fieldLabel = (field) => field.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());

function printTable({ title, institution = {}, rows = [], columns = [] }) {
  const logo = institution.logolink || institution.logo || global1.logo || "";
  const name = institution.institutionname || global1.insname || "Institution";
  const address = institution.address || global1.address || "";
  const bodyRows = rows.map((row, index) => `<tr><td>${index + 1}</td>${columns.map((col) => `<td>${safe(row[col.field])}</td>`).join("")}</tr>`).join("");
  const win = window.open("", "_blank", "width=1100,height=800");
  win.document.write(`<!doctype html><html><head><title>${safe(title)}</title><style>
    body{font-family:Arial,sans-serif;color:#000;background:#fff;margin:0}.toolbar{padding:10px;border-bottom:1px solid #ddd}.page{padding:14mm}
    .head{text-align:center;margin-bottom:14px}.logo{height:70px;max-width:150px;object-fit:contain}h1{font-size:22px;margin:4px 0}h2{font-size:18px;margin:8px 0;text-transform:uppercase}
    table{width:100%;border-collapse:collapse;font-size:11px}th,td{border:1px solid #111;padding:5px;text-align:left;vertical-align:top;white-space:normal}th{background:#eee}
    @media print{.toolbar{display:none}.page{padding:10mm}thead{display:table-header-group}tr{page-break-inside:avoid}}
  </style></head><body><div class="toolbar"><button onclick="window.print()">Print</button><button onclick="window.close()">Close</button></div>
  <div class="page"><div class="head">${logo ? `<img class="logo" src="${safe(logo)}" />` : ""}<h1>${safe(name)}</h1><div>${safe(address)}</div><h2>${safe(title)}</h2></div>
  <table><thead><tr><th>Sr</th>${columns.map((col) => `<th>${safe(col.headerName || col.field)}</th>`).join("")}</tr></thead><tbody>${bodyRows || `<tr><td colspan="${columns.length + 1}" style="text-align:center">No data</td></tr>`}</tbody></table></div></body></html>`);
  win.document.close();
  win.focus();
}

function ReportShell({ title, children }) {
  return <MenuPageShell title={title}><Box sx={{ p: 2 }}>{children}</Box></MenuPageShell>;
}

function SummaryCards({ summary = {} }) {
  return (
    <Grid container spacing={2} sx={{ mb: 2 }}>
      {Object.entries(summary).map(([key, value]) => (
        <Grid item xs={12} sm={6} md={3} key={key}>
          <Paper sx={{ p: 2, borderLeft: "5px solid #2563eb" }} variant="outlined">
            <Typography variant="caption" color="text.secondary">{fieldLabel(key)}</Typography>
            <Typography variant="h5" fontWeight={900}>{value}</Typography>
          </Paper>
        </Grid>
      ))}
    </Grid>
  );
}

function useAccreditationOptions() {
  const [options, setOptions] = useState({});
  const [institution, setInstitution] = useState({});
  useEffect(() => {
    ep1.get("/api/v2/accreditation-final/options", { params: { colid: global1.colid } }).then((res) => {
      setOptions(res.data?.options || {});
      setInstitution(res.data?.institution || {});
    });
  }, []);
  return { options, institution };
}

function DynamicFilterPanel({ fields, filters, setFilters, options, onSearch, initialFields = ["academicyear"] }) {
  const [activeFields, setActiveFields] = useState(initialFields.filter((field) => fields.includes(field)));
  const [fieldToAdd, setFieldToAdd] = useState(null);
  const addField = () => {
    if (!fieldToAdd || activeFields.includes(fieldToAdd)) return;
    setActiveFields((prev) => [...prev, fieldToAdd]);
    setFieldToAdd(null);
  };
  const removeField = (field) => {
    setActiveFields((prev) => prev.filter((item) => item !== field));
    setFilters((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };
  return (
    <Paper sx={{ p: 2, mb: 2 }} variant="outlined">
      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <Autocomplete
            options={fields.filter((field) => !activeFields.includes(field))}
            value={fieldToAdd}
            onChange={(_, value) => setFieldToAdd(value)}
            getOptionLabel={(option) => fieldLabel(option)}
            renderInput={(params) => <TextField {...params} label="Add filter" size="small" />}
          />
        </Grid>
        <Grid item xs={12} md={2}>
          <Button fullWidth variant="outlined" onClick={addField}>Add filter</Button>
        </Grid>
        <Grid item xs={12} md={2}>
          <Button fullWidth variant="outlined" color="secondary" onClick={() => { setFilters({}); setActiveFields(initialFields.filter((field) => fields.includes(field))); }}>Clear</Button>
        </Grid>
        <Grid item xs={12} md={2}>
          <Button fullWidth variant="contained" startIcon={<Search />} onClick={onSearch}>Generate</Button>
        </Grid>
        <Grid item xs={12} />
        {activeFields.map((field) => (
          <Grid item xs={12} md={3} key={field}>
            <Stack spacing={0.5}>
              <Autocomplete
              multiple
              freeSolo
              options={options[field] || []}
              value={Array.isArray(filters[field]) ? filters[field] : (filters[field] ? [filters[field]] : [])}
              onChange={(_, value) => setFilters((prev) => ({ ...prev, [field]: value || [] }))}
              renderInput={(params) => <TextField {...params} label={fieldLabel(field)} size="small" />}
            />
              <Button size="small" color="error" onClick={() => removeField(field)}>Remove</Button>
            </Stack>
          </Grid>
        ))}
      </Grid>
    </Paper>
  );
}

export function AccreditationPersonalDataPage({ kind = "projects" }) {
  const config = personalDataConfigs[kind] || personalDataConfigs.projects;
  const [rows, setRows] = useState([]);
  const [filters, setFilters] = useState({ academicyear: [] });
  const [message, setMessage] = useState("");
  const { options, institution } = useAccreditationOptions();
  const filterFields = useMemo(() => ["academicyear", "name", "user", ...config.fields, "submissionstatus", "documentstatus", "aivalidationstatus", "overallstatus", "accreditationframework"], [config]);
  const columns = useMemo(() => [
    { field: "name", headerName: "Name", minWidth: 170 },
    { field: "user", headerName: "User", minWidth: 200 },
    ...config.fields.map((field) => ({ field, headerName: config.labels[field] || fieldLabel(field), minWidth: 160, flex: ["title", "project", "booktitle"].includes(field) ? 1 : undefined })),
    { field: "submissionstatus", headerName: "Submission", minWidth: 130 },
    { field: "documentstatus", headerName: "Document", minWidth: 120 },
    { field: "aivalidationstatus", headerName: "AI", minWidth: 100 },
    { field: "overallstatus", headerName: "Overall", minWidth: 120 },
    { field: "aivalidationcomment", headerName: "Validation comments", minWidth: 260, flex: 1 }
  ], [config]);
  const load = async () => {
    try {
      const res = await ep1.get(`/api/v2/accreditation-final/personal-data/${kind}`, { params: { colid: global1.colid, ...queryParams(filters) } });
      setRows(res.data?.data || []);
    } catch (error) {
      setMessage(error.response?.data?.message || error.message);
    }
  };
  useEffect(() => { load(); }, [kind]);
  return (
    <ReportShell title={`Accreditation Final - ${config.title}`}>
      <Stack direction={{ xs: "column", md: "row" }} spacing={1} justifyContent="space-between" sx={{ mb: 2 }}>
        <Box><Typography variant="h5" fontWeight={900}>{config.title}</Typography><Typography color="text.secondary">Excluded users are automatically removed.</Typography></Box>
        <Button variant="outlined" startIcon={<Print />} onClick={() => printTable({ title: config.title, institution, rows, columns })}>Print preview</Button>
      </Stack>
      <DynamicFilterPanel fields={filterFields} filters={filters} setFilters={setFilters} options={options} onSearch={load} />
      {message && <Alert sx={{ mb: 2 }} severity="error">{message}</Alert>}
      <Paper sx={{ p: 2 }} variant="outlined"><Box sx={{ height: 650 }}><DataGrid rows={rows.map((row) => ({ ...row, id: row._id }))} columns={columns} slots={{ toolbar: GridToolbar }} sx={{ "& .MuiDataGrid-cell": { whiteSpace: "normal", lineHeight: 1.35, alignItems: "flex-start", py: 1 } }} /></Box></Paper>
    </ReportShell>
  );
}

export function AccreditationAdminDataPage({ kind = "projects" }) {
  const config = personalDataConfigs[kind] || personalDataConfigs.projects;
  return (
    <MenuPageShell title={`Accreditation Admin - ${config.title}`}>
      <Box sx={{ p: 2 }}>
        <Typography variant="h5" fontWeight={900} sx={{ mb: 0.5 }}>Accreditation Admin - {config.title}</Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          Regular role-based admin page with menu search, ticket access, validation, approval, filters, upload and grid actions.
        </Typography>
        <PersonalDataSubmissionPage kind={kind} admin />
      </Box>
    </MenuPageShell>
  );
}

export function AccreditationValueAddedReportPage() {
  const { options, institution } = useAccreditationOptions();
  const [filters, setFilters] = useState({});
  const [report, setReport] = useState({ data: [], summary: {}, charts: {} });
  const columns = ["academicyear", "regulation", "program", "programcode", "semester", "department", "valueaddedcoursecategory", "valueaddedcourse", "vaccode", "student", "regno", "marksobtained", "totalmarks", "status"].map((field) => ({ field, headerName: fieldLabel(field), minWidth: ["valueaddedcourse", "student"].includes(field) ? 190 : 130 }));
  const load = async () => {
    const res = await ep1.post("/api/v2/accreditation-final/value-added", { colid: global1.colid, filters: filterParams(filters) });
    setReport(res.data || { data: [], summary: {}, charts: {} });
  };
  return (
    <ReportShell title="Accreditation Final - Value Added Course">
      <Typography variant="h5" fontWeight={900} sx={{ mb: 1 }}>Value Added Course Report</Typography>
      <DynamicFilterPanel fields={["academicyear", "regulation", "program", "programcode", "semester", "department", "valueaddedcoursecategory", "valueaddedcourse", "vaccode", "status"]} filters={filters} setFilters={setFilters} options={options} onSearch={load} />
      <SummaryCards summary={report.summary} />
      <Paper sx={{ p: 2, mb: 2 }} variant="outlined"><Box sx={{ height: 260 }}><ResponsiveContainer><BarChart data={report.charts?.byCourse || []}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="label" /><YAxis /><Tooltip /><Legend /><Bar dataKey="total" fill="#2563eb" /><Bar dataKey="pass" fill="#16a34a" /><Bar dataKey="fail" fill="#dc2626" /></BarChart></ResponsiveContainer></Box></Paper>
      <Stack direction="row" spacing={1} sx={{ mb: 1 }}><Button variant="outlined" startIcon={<Print />} onClick={() => printTable({ title: "Value Added Course Report", institution, rows: report.data, columns })}>Print preview</Button><Chip label={`${report.data?.length || 0} records`} /></Stack>
      <Paper sx={{ p: 2 }} variant="outlined"><Box sx={{ height: 600 }}><DataGrid rows={(report.data || []).map((row) => ({ ...row, id: row._id }))} columns={columns} slots={{ toolbar: GridToolbar }} sx={{ "& .MuiDataGrid-cell": { whiteSpace: "normal", lineHeight: 1.35, alignItems: "flex-start", py: 1 } }} /></Box></Paper>
    </ReportShell>
  );
}

export function AccreditationPassPercentagePage() {
  const { options, institution } = useAccreditationOptions();
  const [filters, setFilters] = useState({});
  const [report, setReport] = useState({ data: [], summary: {} });
  const columns = ["academicyear", "exam", "examcode", "program", "programcode", "appeared", "passed", "failed", "passpercentage"].map((field) => ({ field, headerName: fieldLabel(field), minWidth: 140, flex: ["program"].includes(field) ? 1 : undefined }));
  const load = async () => {
    const res = await ep1.post("/api/v2/accreditation-final/pass-percentage", { colid: global1.colid, filters: filterParams(filters) });
    setReport(res.data || { data: [], summary: {} });
  };
  return (
    <ReportShell title="Accreditation Final - Pass Percentage">
      <Typography variant="h5" fontWeight={900} sx={{ mb: 1 }}>Programwise Pass Percentage</Typography>
      <DynamicFilterPanel fields={["academicyear", "exam", "examcode", "program", "programcode", "semester", "status", "overallgrade"]} filters={filters} setFilters={setFilters} options={options} onSearch={load} />
      <SummaryCards summary={report.summary} />
      <Paper sx={{ p: 2, mb: 2 }} variant="outlined"><Box sx={{ height: 300 }}><ResponsiveContainer><BarChart data={report.data || []}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="programcode" /><YAxis /><Tooltip /><Legend /><Bar dataKey="passpercentage" fill="#16a34a" /><Bar dataKey="failed" fill="#dc2626" /></BarChart></ResponsiveContainer></Box></Paper>
      <Stack direction="row" spacing={1} sx={{ mb: 1 }}><Button variant="outlined" startIcon={<Print />} onClick={() => printTable({ title: "Pass Percentage Report", institution, rows: report.data, columns })}>Print preview</Button></Stack>
      <Paper sx={{ p: 2 }} variant="outlined"><Box sx={{ height: 600 }}><DataGrid rows={(report.data || []).map((row, i) => ({ ...row, id: row.id || i }))} columns={columns} slots={{ toolbar: GridToolbar }} sx={{ "& .MuiDataGrid-cell": { whiteSpace: "normal", lineHeight: 1.35, alignItems: "flex-start", py: 1 } }} /></Box></Paper>
    </ReportShell>
  );
}

export function AccreditationUserDetailsPage({ role = "Faculty" }) {
  const { options, institution } = useAccreditationOptions();
  const [filters, setFilters] = useState({ academicyear: [] });
  const [report, setReport] = useState({ data: [], summary: {}, charts: {} });
  const isStudent = /^student$/i.test(role);
  const fields = isStudent
    ? ["name", "email", "regno", "academicyear", "admissionyear", "regulation", "program", "programcode", "semester", "section", "department", "gender", "category"]
    : ["name", "email", "department", "designation", "institution", "academicyear", "gender", "phone"];
  const columns = fields.map((field) => ({ field, headerName: fieldLabel(field), minWidth: ["name", "email"].includes(field) ? 190 : 130, flex: ["name", "email"].includes(field) ? 1 : undefined }));
  const load = async () => {
    const res = await ep1.post(`/api/v2/accreditation-final/user-details/${role}`, { colid: global1.colid, academicyear: filters.academicyear || [], filters: filterParams(filters) });
    setReport(res.data || { data: [], summary: {}, charts: {} });
  };
  return (
    <ReportShell title={`Accreditation Final - ${role} Details`}>
      <Typography variant="h5" fontWeight={900} sx={{ mb: 1 }}>{role} Details</Typography>
      <DynamicFilterPanel fields={isStudent ? ["academicyear", "admissionyear", "regulation", "program", "programcode", "semester", "section", "department", "gender", "category"] : ["academicyear", "department", "institution", "designation", "gender"]} filters={filters} setFilters={setFilters} options={options} onSearch={load} />
      <SummaryCards summary={report.summary} />
      <Paper sx={{ p: 2, mb: 2 }} variant="outlined"><Box sx={{ height: 280 }}><ResponsiveContainer><BarChart data={report.charts?.byYear || []}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="label" /><YAxis /><Tooltip /><Bar dataKey="count" fill="#2563eb" /></BarChart></ResponsiveContainer></Box></Paper>
      <Stack direction="row" spacing={1} sx={{ mb: 1 }}><Button variant="outlined" startIcon={<Print />} onClick={() => printTable({ title: `${role} Details`, institution, rows: report.data, columns })}>Print preview</Button><Chip label={`${report.data?.length || 0} ${role}`} /></Stack>
      <Paper sx={{ p: 2 }} variant="outlined"><Box sx={{ height: 620 }}><DataGrid rows={(report.data || []).map((row) => ({ ...row, id: row._id }))} columns={columns} slots={{ toolbar: GridToolbar }} sx={{ "& .MuiDataGrid-cell": { whiteSpace: "normal", lineHeight: 1.35, alignItems: "flex-start", py: 1 } }} /></Box></Paper>
    </ReportShell>
  );
}

export const AccreditationFacultyDetailsPage = () => <AccreditationUserDetailsPage role="Faculty" />;
export const AccreditationStudentDetailsPage = () => <AccreditationUserDetailsPage role="Student" />;
