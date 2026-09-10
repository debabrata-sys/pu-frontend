import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid,
  LinearProgress,
  MenuItem,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography
} from "@mui/material";
import { DataGrid, GridToolbar } from "@mui/x-data-grid";
import DeleteIcon from "@mui/icons-material/Delete";
import DownloadIcon from "@mui/icons-material/Download";
import PrintIcon from "@mui/icons-material/Print";
import SaveIcon from "@mui/icons-material/Save";
import SearchIcon from "@mui/icons-material/Search";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import * as XLSX from "xlsx";
import ep1 from "../api/ep1";
import global1 from "./global1";
import MenuPageShell from "./MenuPageShell";

const clean = (value) => String(value ?? "").trim();
const today = () => new Date().toISOString().slice(0, 10);
const displayDate = () => new Date().toLocaleDateString("en-GB");
const rowsWithId = (rows = []) => rows.map((row, index) => ({ id: row._id || index + 1, ...row }));
const csvEscape = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
const htmlEscape = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
const thesisSupportingDocuments = ["Registration letter", "Coursework marksheet", "Plagiarism report", "Fees report", "Pre-PhD viva report"];
const thesisMandatoryComponents = ["Title", "Prelim pages", "Content", "Abstract", "Recommendation", "Annexure", "Plagiarism report"];
const defaultThesisChapters = [1, 2, 3, 4, 5, 6];
const gridSx = {
  "& .MuiDataGrid-cell": { whiteSpace: "normal", overflowWrap: "anywhere", lineHeight: 1.3, py: 1, alignItems: "flex-start" },
  "& .MuiDataGrid-columnHeaderTitle": { whiteSpace: "normal", lineHeight: 1.2 }
};

const assignmentFields = ["academicyear", "regulation", "program", "programcode", "student", "regno", "email", "phone", "topic", "subject", "guidename", "guideemail", "startdate", "enddate", "status"];
const workflowFields = ["academicyear", "regulation", "program", "programcode", "level", "role", "approvername", "approveremail", "status", "remarks"];
const panelFields = ["academicyear", "regulation", "program", "programcode", "panelname", "description", "status"];
const oralPanelFields = ["academicyear", "regulation", "program", "programcode", "panelname", "description", "approvalstatus", "status", "currentapprovername", "currentapproveremail", "comments"];
const oralPanelMemberFields = ["academicyear", "regulation", "panelname", "program", "programcode", "examinername", "examineremail", "designation", "qualification", "type", "specialization", "eligible", "approvalstatus", "preferenceorder", "currentlevel", "currentapprovername", "currentapproveremail", "useremail", "comments"];
const memberFields = ["academicyear", "regulation", "panelname", "program", "programcode", "examinername", "examineremail", "designation", "qualification", "type", "specialization", "ugteachingexp", "pgteachingexp", "address", "phone", "email", "eligible", "approvalstatus", "comments"];
const memberApprovalFields = [...memberFields, "currentlevel", "currentapprovername", "currentapproveremail", "user", "useremail"];
const examinerAssignmentFields = ["academicyear", "regulation", "program", "programcode", "panelname", "student", "regno", "topic", "fileurl", "examinername", "examineremail", "status", "remarks"];
const rubricFields = ["academicyear", "regulation", "program", "programcode", "group", "topic", "status"];
const oralDefenseFields = ["academicyear", "regulation", "program", "programcode", "panelname", "student", "regno", "topic", "examinername", "examineremail", "targetdate", "oraldefensedate", "status", "comments"];

function fieldLabel(field) {
  return field.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());
}

function queryString(params) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (Array.isArray(value) && value.length) q.set(key, value.join(","));
    else if (clean(value)) q.set(key, value);
  });
  return q.toString();
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

function DynamicFilters({ fields, filters, setFilters, options, onSearch }) {
  const [active, setActive] = useState(["academicyear", "program", "status"].filter((field) => fields.includes(field)));
  const [toAdd, setToAdd] = useState(null);
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <Autocomplete options={fields.filter((f) => !active.includes(f))} value={toAdd} onChange={(_, v) => setToAdd(v)} getOptionLabel={fieldLabel} renderInput={(params) => <TextField {...params} size="small" label="Add filter" />} />
        </Grid>
        <Grid item xs={12} md={2}><Button fullWidth variant="outlined" onClick={() => { if (toAdd) setActive((prev) => [...prev, toAdd]); setToAdd(null); }}>Add filter</Button></Grid>
        <Grid item xs={12} md={2}><Button fullWidth variant="contained" startIcon={<SearchIcon />} onClick={onSearch}>Search</Button></Grid>
        <Grid item xs={12} />
        {active.map((field) => (
          <Grid item xs={12} md={3} key={field}>
            <Stack spacing={0.5}>
              <Autocomplete
                multiple
                freeSolo
                options={options[field] || []}
                value={Array.isArray(filters[field]) ? filters[field] : (filters[field] ? [filters[field]] : [])}
                onChange={(_, value) => setFilters((prev) => ({ ...prev, [field]: value || [] }))}
                renderInput={(params) => <TextField {...params} size="small" label={fieldLabel(field)} />}
              />
              <Button size="small" color="error" onClick={() => { setActive((prev) => prev.filter((x) => x !== field)); setFilters((prev) => { const next = { ...prev }; delete next[field]; return next; }); }}>Remove</Button>
            </Stack>
          </Grid>
        ))}
      </Grid>
    </Paper>
  );
}

function DocumentsButton({ row, label = "Documents" }) {
  const [open, setOpen] = useState(false);
  const docs = [
    ...(row?.fileurl ? [{ documentname: "Thesis file", url: row.fileurl, filename: row.filename }] : []),
    ...((row?.documents || []).filter((doc) => doc?.url)),
    ...((row?.componentdocuments || []).filter((doc) => doc?.url))
  ].filter((doc, index, list) => list.findIndex((item) => item.url === doc.url && (item.documentname || item.component) === (doc.documentname || doc.component)) === index);
  if (!docs.length) return "";
  return (
    <>
      <Button size="small" variant="outlined" onClick={() => setOpen(true)}>{label} ({docs.length})</Button>
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Uploaded documents</DialogTitle>
        <DialogContent>
          <Stack spacing={1} sx={{ mt: 1 }}>
            {docs.map((doc, index) => (
              <Paper key={`${doc.url}-${index}`} variant="outlined" sx={{ p: 1.5 }}>
                <Typography fontWeight={800}>{doc.component || doc.documentname || doc.documenttype || doc.filename || `Document ${index + 1}`}{doc.chapter ? ` - Chapter ${doc.chapter}` : ""}</Typography>
                <Typography variant="caption" color="text.secondary">{doc.filename || ""}</Typography>
                <Box sx={{ mt: 1 }}>
                  <Button size="small" variant="contained" component="a" href={doc.url} target="_blank" rel="noreferrer">Open document</Button>
                </Box>
              </Paper>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions><Button onClick={() => setOpen(false)}>Close</Button></DialogActions>
      </Dialog>
    </>
  );
}

function usePhdOptions() {
  const [data, setData] = useState({ options: {}, students: [], users: [], programs: [], institution: {} });
  const load = async () => {
    const res = await ep1.get("/api/v2/phd/options", { params: { colid: global1.colid } });
    setData(res.data || { options: {}, students: [], users: [], programs: [], institution: {} });
  };
  useEffect(() => { load(); }, []);
  return { ...data, load };
}

function programLabel(row) {
  return clean(`${row?.program || ""}${row?.programcode ? ` (${row.programcode})` : ""}`);
}

function userLabel(row) {
  return clean(`${row?.name || ""}${row?.email ? ` - ${row.email}` : ""}`);
}

function studentLabel(row) {
  return clean(`${row?.name || ""}${row?.regno ? ` (${row.regno})` : ""}${row?.programcode ? ` - ${row.programcode}` : ""}`);
}

function panelLabel(row) {
  return clean(`${row?.panelname || ""}${row?.programcode ? ` - ${row.programcode}` : ""}${row?.academicyear ? ` (${row.academicyear})` : ""}`);
}

function formatDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function PrintHeader({ title }) {
  return null;
}

function instHeaderHtml(institution = {}, title = "") {
  const logo = institution.logolink || institution.logo || global1.logo || "";
  const name = institution.institutionname || global1.insname || "Institution";
  const address = institution.address || global1.address || "";
  return `<div class="head">${logo ? `<img class="logo" src="${logo}" />` : ""}<div class="inst">${name}</div><div class="addr">${address}</div>${title ? `<h2>${title}</h2>` : ""}</div>`;
}

function htmlRows(items = [], columns = []) {
  if (!items.length) return `<tr><td colspan="${columns.length || 1}">No records found</td></tr>`;
  return items.map((item, index) => `<tr>${columns.map((column) => `<td>${column.field === "sr" ? index + 1 : htmlEscape(column.value ? column.value(item) : item[column.field])}</td>`).join("")}</tr>`).join("");
}

function printOralDefenseCandidateReport(report = {}) {
  const institution = report.institution || {};
  const assignment = report.assignment || {};
  const submission = report.submission || {};
  const noc = report.nocApproval || {};
  const oralApproval = report.oralApproval || {};
  const columns = (cols) => `<tr>${cols.map((col) => `<th>${htmlEscape(col.header || fieldLabel(col.field))}</th>`).join("")}</tr>`;
  const thesisCols = [
    { field: "sr", header: "Sr" }, { field: "examinername", header: "Examiner" }, { field: "examineremail", header: "Email" },
    { field: "status", header: "Status" }, { field: "remarks", header: "Comments" }, { field: "revieweddate", header: "Reviewed", value: (row) => formatDateTime(row.revieweddate || row.updatedAt) }
  ];
  const rubricCols = [
    { field: "sr", header: "Sr" }, { field: "examinername", header: "Examiner" }, { field: "group", header: "Group" },
    { field: "topic", header: "Topic" }, { field: "value", header: "Value" }, { field: "comments", header: "Comments" }, { field: "submitteddate", header: "Date", value: (row) => formatDateTime(row.submitteddate || row.updatedAt) }
  ];
  const oralCols = [
    { field: "sr", header: "Sr" }, { field: "examinername", header: "Examiner" }, { field: "targetdate", header: "Target Date" },
    { field: "oraldefensedate", header: "Oral Defense Date" }, { field: "status", header: "Status" }, { field: "comments", header: "Comments" }, { field: "revieweddate", header: "Reviewed", value: (row) => formatDateTime(row.revieweddate) }
  ];
  const attendees = (report.oralAssignments || []).flatMap((row) => (row.attendees || []).map((item) => ({ ...item, examinername: row.examinername, oraldefensedate: row.oraldefensedate })));
  const attendeeCols = [
    { field: "sr", header: "Sr" }, { field: "name", header: "Name" }, { field: "email", header: "Email" }, { field: "department", header: "Department" },
    { field: "designation", header: "Designation" }, { field: "institution", header: "Institution" }, { field: "oraldefensedate", header: "Defense Date" }
  ];
  const historyCols = [
    { field: "sr", header: "Sr" }, { field: "action", header: "Action" }, { field: "level", header: "Level" }, { field: "approvername", header: "Approver" },
    { field: "approveremail", header: "Email" }, { field: "comments", header: "Comments" }, { field: "date", header: "Date", value: (row) => formatDateTime(row.date) }
  ];
  const docs = [
    ...(submission.fileurl ? [{ documentname: "Thesis file", component: "Thesis file", url: submission.fileurl, filename: submission.filename }] : []),
    ...((submission.componentdocuments || []).filter((doc) => doc?.url)),
    ...((submission.documents || []).filter((doc) => doc?.url))
  ].filter((doc, index, list) => list.findIndex((item) => item.url === doc.url && (item.documentname || item.component) === (doc.documentname || doc.component)) === index);
  const docCols = [
    { field: "sr", header: "Sr" }, { field: "component", header: "Component", value: (row) => row.component || row.documentname || row.documenttype },
    { field: "chapter", header: "Chapter" }, { field: "filename", header: "File" }, { field: "url", header: "Link", value: (row) => row.url ? "Available for download" : "" }
  ];
  const progressCols = [
    { field: "sr", header: "Sr" }, { field: "progressdate", header: "Date" }, { field: "progress", header: "Progress" },
    { field: "conversation", header: "Conversation", value: (row) => (row.conversation || []).map((item) => `${item.byname || item.role}: ${item.comments}`).join(" | ") }
  ];
  const html = `<!doctype html><html><head><title>PhD Candidate Report</title><style>
    @page{size:A4 portrait;margin:12mm}body{font-family:Arial,sans-serif;color:#000;background:#fff;font-size:12px}.no-print{margin:10px}
    .report{max-width:190mm;margin:auto}.head{text-align:center;border-bottom:1px solid #000;padding-bottom:8px;margin-bottom:10px}.logo{max-height:58px;object-fit:contain}.inst{font-size:18px;font-weight:800}.addr{font-size:11px}
    h2{font-size:16px;margin:8px 0 0}h3{font-size:13px;margin:12px 0 6px}.summary{display:grid;grid-template-columns:repeat(2,1fr);gap:4px 14px;margin:8px 0}
    table{width:100%;border-collapse:collapse;margin-bottom:8px}th,td{border:1px solid #000;padding:5px;text-align:left;vertical-align:top}th{font-weight:800;background:#f1f1f1}
    @media print{.no-print{display:none}.report{max-width:none}tr{break-inside:avoid}thead{display:table-header-group}}
  </style></head><body><div class="no-print"><button onclick="window.print()">Print</button><button onclick="window.close()">Close</button></div><div class="report">
  ${instHeaderHtml(institution, "PhD Oral Defense Candidate Report")}
  <div class="summary">
    <div><b>Student:</b> ${htmlEscape(assignment.student || submission.student)}</div><div><b>Reg No:</b> ${htmlEscape(assignment.regno || submission.regno)}</div>
    <div><b>Academic Year:</b> ${htmlEscape(assignment.academicyear || submission.academicyear)}</div><div><b>Regulation:</b> ${htmlEscape(assignment.regulation || submission.regulation)}</div>
    <div><b>Program:</b> ${htmlEscape(assignment.program || submission.program)}</div><div><b>Program Code:</b> ${htmlEscape(assignment.programcode || submission.programcode)}</div>
    <div><b>Guide:</b> ${htmlEscape(assignment.guidename || submission.guidename)}</div><div><b>Guide Email:</b> ${htmlEscape(assignment.guideemail || submission.guideemail)}</div>
    <div><b>Panel:</b> ${htmlEscape(assignment.panelname)}</div><div><b>Oral Defense Date:</b> ${htmlEscape(assignment.oraldefensedate)}</div>
    <div style="grid-column:1 / -1"><b>Thesis Topic:</b> ${htmlEscape(assignment.topic || submission.topic)}</div>
  </div>
  <h3>Submission History</h3><table><thead>${columns(historyCols)}</thead><tbody>${htmlRows(submission.history || [], historyCols)}</tbody></table>
  <h3>Thesis Approval History</h3><table><thead>${columns(historyCols)}</thead><tbody>${htmlRows(noc.history || [], historyCols)}</tbody></table>
  <h3>Thesis Component Documents</h3><table><thead>${columns(docCols)}</thead><tbody>${htmlRows(docs, docCols)}</tbody></table>
  <h3>Progress Reports</h3><table><thead>${columns(progressCols)}</thead><tbody>${htmlRows(report.progressReports || [], progressCols)}</tbody></table>
  <h3>Thesis Examiner Reviews</h3><table><thead>${columns(thesisCols)}</thead><tbody>${htmlRows(report.thesisAssignments || [], thesisCols)}</tbody></table>
  <h3>Examiner Rubrics</h3><table><thead>${columns(rubricCols)}</thead><tbody>${htmlRows(report.thesisAssessments || [], rubricCols)}</tbody></table>
  <h3>Oral Defense Schedule and Comments</h3><table><thead>${columns(oralCols)}</thead><tbody>${htmlRows(report.oralAssignments || [], oralCols)}</tbody></table>
  <h3>Oral Defense Attendees</h3><table><thead>${columns(attendeeCols)}</thead><tbody>${htmlRows(attendees, attendeeCols)}</tbody></table>
  <h3>Oral Defense Approval History</h3><table><thead>${columns(historyCols)}</thead><tbody>${htmlRows(oralApproval.history || [], historyCols)}</tbody></table>
  </div></body></html>`;
  const win = window.open("", "_blank");
  win.document.write(html);
  win.document.close();
}

function appointmentRef(row = {}) {
  return `PU/COE/Conf.Acad/M/Acad./Ph.D./${new Date().getFullYear()}/${clean(row._id).slice(-5)}`;
}

function replaceAppointmentPlaceholders(template = "", row = {}, institution = {}, includeCredentials = false) {
  const values = {
    ref: appointmentRef(row),
    date: displayDate(),
    institutionname: institution.institutionname || global1.insname || "Institution",
    institutionaddress: institution.address || global1.address || "",
    institutionphone: institution.phone || institution.contact || "",
    institutionemail: institution.email || institution.emailid || "",
    examinername: row.examinername || "",
    examineremail: row.examineremail || row.email || "",
    designation: row.designation || "",
    examineraddress: row.address || "",
    subject: row.program || row.programcode || "",
    program: row.program || "",
    programcode: row.programcode || "",
    academicyear: row.academicyear || "",
    regulation: row.regulation || "",
    panelname: row.panelname || "",
    examinertype: row.type || "",
    username: row.useremail || row.user || "",
    password: includeCredentials ? "Password@123" : ""
  };
  return clean(template).replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => values[String(key).toLowerCase()] ?? "");
}

function defaultAppointmentContent(row = {}, institution = {}, includeCredentials = false) {
  const credentialLine = includeCredentials
    ? `\n\nERP login details:\nUser name: {{username}}\nDefault password: {{password}}`
    : "";
  return `Subject: Appointment as Thesis Valuator of the Ph.D.

Respected Sir/Madam,

1. With the approval of the competent authority of {{institutionname}}, an assignment as a thesis valuator is offered to you in the subject: {{subject}} for the Ph.D. Program.

2. Presuming that you are willing to accept the appointment, all relevant papers as per the enclosure list given below are sent herewith.

3. You are also requested to keep your appointment strictly confidential.

4. Kindly provide the correct details of Account No., IFSC Code, and PAN No. in the attached remuneration bill and hardcopy of cancelled cheque for timely transfer of remuneration into your account.

5. You are also requested to fill the valuation report in your own handwriting only.

6. Please send all the documents in the envelope as per the list of enclosures only within 20 days of receipt through mail only at {{institutionemail}}.${credentialLine}

Note: Remuneration Rates:
Valuation of thesis for Ph.D. = as per institutional rules.

Enclosures:
1. Acceptance Form
2. Valuation Report Form
3. Remuneration Bill Form`;
}

function printAppointmentLetter(row, institution = {}, includeCredentials = false, contentTemplate = "") {
  const name = institution.institutionname || global1.insname || "Institution";
  const logo = institution.logolink || institution.logo || global1.logo || "";
  const address = institution.address || global1.address || "";
  const phone = institution.phone || institution.contact || "0755-4005402";
  const email = institution.email || institution.emailid || "";
  const content = replaceAppointmentPlaceholders(contentTemplate || defaultAppointmentContent(row, institution, includeCredentials), row, institution, includeCredentials);
  const blocks = content.split(/\n{2,}/).map((block) => `<p>${block.split(/\n/).map((line) => htmlEscape(line)).join("<br/>")}</p>`).join("");
  const win = window.open("", "_blank", "width=900,height=800");
  if (!win) return;
  win.document.write(`<!doctype html><html><head><title>Appointment Letter - ${row.examinername || ""}</title><style>
    @page{size:A4;margin:14mm}body{font-family:Georgia,'Times New Roman',serif;color:#000;background:#fff;margin:0}.toolbar{text-align:right;padding:8px;border-bottom:1px solid #ddd}.page{max-width:185mm;margin:auto;padding:10mm}.head{text-align:center;border-bottom:2px solid #222;padding-bottom:8px;margin-bottom:14px}.logo{height:72px;object-fit:contain}.inst{font-size:26px;font-weight:800;text-transform:uppercase;letter-spacing:1px}.addr,.contact{font-size:12px}.meta{display:flex;justify-content:space-between;font-size:13px;margin:12px 0}.conf{text-align:center;text-decoration:underline;font-weight:800;margin:14px 0 8px}.fromto{width:100%;border-collapse:collapse;font-size:13px;margin-bottom:18px}.fromto td{border:1px solid #222;padding:8px;vertical-align:top;width:50%}.body{font-size:14px;line-height:1.48;text-align:justify}.body p{margin:9px 0}.sign{text-align:right;margin-top:48px;font-weight:700}.small{font-size:12px}@media print{.toolbar{display:none}.page{padding:0}}
  </style></head><body><div class="toolbar"><button onclick="print()">Print</button><button onclick="close()">Close</button></div><div class="page">
  <div class="head">${logo ? `<img class="logo" src="${logo}" />` : ""}<div class="inst">${name}</div><div class="addr">${address}</div><div class="contact">${[phone, email].filter(Boolean).join(" | ")}</div></div>
  <div class="meta"><div><b>Ref:</b> ${appointmentRef(row)}</div><div><b>Date:</b> ${displayDate()}</div></div>
  <div class="conf">MOST CONFIDENTIAL &amp; URGENT</div>
  <table class="fromto"><tbody><tr><td><b>From:</b><br/>Assistant Registrar(Confidential)<br/>${htmlEscape(name)}<br/>${htmlEscape(address)}</td><td><b>To:</b><br/>${htmlEscape(row.examinername || "")}${row.designation ? `, ${htmlEscape(row.designation)}` : ""}<br/>${htmlEscape(row.address || "")}</td></tr></tbody></table>
  <div class="body">${blocks}</div>
  <div class="sign">Yours faithfully<br/><br/>(Signature)<br/><br/>Assistant Registrar(Confidential)<br/>Ph.No.- ${phone || "0755-4005402"}</div></div></body></html>`);
  win.document.close();
}

async function printStudentReview(row, institution = {}) {
  const res = await ep1.get("/api/v2/phd/examiner-review-printable", { params: { colid: global1.colid, submissionid: row.submissionid || row._id } });
  const assignments = res.data?.assignments || [];
  const assessments = res.data?.assessments || [];
  const win = window.open("", "_blank", "width=1000,height=800");
  if (!win) return;
  win.document.write(`<!doctype html><html><head><title>PhD Examiner Review - ${row.student || ""}</title><style>
    @page{size:A4;margin:12mm}body{font-family:Arial;color:#000}.toolbar{text-align:right;padding:8px}.head{text-align:center;border-bottom:2px solid #111;padding-bottom:8px}.logo{height:60px}.inst{font-size:20px;font-weight:800}.addr{font-size:12px}table{width:100%;border-collapse:collapse;font-size:11px;margin-top:12px}th,td{border:1px solid #111;padding:5px;text-align:left;vertical-align:top}h3{margin:14px 0 4px}@media print{.toolbar{display:none}}
  </style></head><body><div class="toolbar"><button onclick="print()">Print</button><button onclick="close()">Close</button></div>${instHeaderHtml(institution, "PhD Examiner Review")}
  <h3>Student Details</h3><table><tbody><tr><th>Student</th><td>${row.student || ""}</td><th>Reg No</th><td>${row.regno || ""}</td></tr><tr><th>Program</th><td>${row.program || ""}</td><th>Program Code</th><td>${row.programcode || ""}</td></tr><tr><th>Topic</th><td colspan="3">${row.topic || ""}</td></tr></tbody></table>
  <h3>Examiner Decisions</h3><table><thead><tr><th>Examiner</th><th>Email</th><th>Status</th><th>Remarks</th><th>Date</th></tr></thead><tbody>${assignments.map((a) => `<tr><td>${a.examinername || ""}</td><td>${a.examineremail || ""}</td><td>${a.status || ""}</td><td>${a.remarks || ""}</td><td>${a.revieweddate ? new Date(a.revieweddate).toLocaleDateString() : ""}</td></tr>`).join("")}</tbody></table>
  <h3>Assessment Rubrics</h3><table><thead><tr><th>Examiner</th><th>Group</th><th>Topic</th><th>Value</th><th>Comments</th></tr></thead><tbody>${assessments.map((a) => `<tr><td>${a.examinername || ""}</td><td>${a.group || ""}</td><td>${a.topic || ""}</td><td>${a.value || ""}</td><td>${a.comments || ""}</td></tr>`).join("")}</tbody></table></body></html>`);
  win.document.close();
}

function printNoc(row, institution = {}) {
  const logo = institution.logolink || institution.logo || global1.logo || "";
  const name = institution.institutionname || global1.insname || "Institution";
  const address = institution.address || global1.address || "";
  const ref = `PhD/NOC/${row.regno || row._id}/${new Date().getFullYear()}`;
  const win = window.open("", "_blank", "width=900,height=800");
  if (!win) return;
  win.document.write(`<!doctype html><html><head><title>NoC - ${row.student}</title><style>
    @page{size:A4;margin:14mm}body{font-family:Georgia,'Times New Roman',serif;color:#000;background:#fff;margin:0}
    .toolbar{padding:10px;border-bottom:1px solid #ddd;text-align:right}.page{max-width:185mm;margin:auto;padding:12mm}
    .head{text-align:center;border-bottom:2px solid #111;padding-bottom:8px;margin-bottom:14px}.logo{height:72px;object-fit:contain}.inst{font-size:22px;font-weight:800;text-transform:uppercase}.addr{font-size:12px}
    .meta{display:flex;justify-content:space-between;font-size:13px;margin:12px 0}.to{border:1px solid #111;padding:8px;width:62%;font-size:13px;line-height:1.45}
    h1{text-align:center;font-size:22px;text-decoration:underline;margin:22px 0 14px}.body{font-size:15px;line-height:1.75;text-align:justify}
    table{width:100%;border-collapse:collapse;margin:14px 0;font-size:14px}th,td{border:1px solid #111;padding:8px;text-align:left;vertical-align:top}
    .sign{margin-top:42px;display:flex;justify-content:space-between;gap:20px}.sigbox{width:45%;font-size:13px}.sigline{border-top:1px solid #111;margin-top:42px;padding-top:6px;font-weight:700}
    @media print{.toolbar{display:none}.page{padding:0}}
  </style></head><body><div class="toolbar"><button onclick="window.print()">Print</button><button onclick="window.close()">Close</button></div>
  <div class="page"><div class="head">${logo ? `<img class="logo" src="${logo}" />` : ""}<div class="inst">${name}</div><div class="addr">${address}</div></div>
  <div class="meta"><div><b>Ref:</b> ${ref}</div><div><b>Date:</b> ${today()}</div></div>
  <div class="to"><b>To,</b><br/>The Principal / Controller of Examinations<br/>${name}<br/>${address}</div>
  <h1>NOC</h1>
  <div class="body">This is to certify that the Ph.D. student mentioned below has been allotted the thesis / research topic and the submitted thesis document has been approved through the institutional PhD thesis approval workflow. The institution has no objection for processing the student for thesis evaluation / examination / viva-voce or related academic requirement as applicable.</div>
  <table><tbody>
    <tr><th>Student Name</th><td>${row.student || ""}</td><th>Registration No.</th><td>${row.regno || ""}</td></tr>
    <tr><th>Program</th><td>${row.program || ""} (${row.programcode || ""})</td><th>Academic Year</th><td>${row.academicyear || ""}</td></tr>
    <tr><th>Subject</th><td>${row.subject || ""}</td><th>Topic</th><td>${row.topic || ""}</td></tr>
    <tr><th>Guide</th><td>${row.guidename || ""}</td><th>Guide Email</th><td>${row.guideemail || ""}</td></tr>
    <tr><th>Approval Date</th><td>${row.approveddate ? new Date(row.approveddate).toLocaleDateString() : ""}</td><th>Document</th><td>${row.fileurl ? `<a href="${row.fileurl}">Approved thesis file</a>` : ""}</td></tr>
  </tbody></table>
  <div class="body">This NoC is issued on the basis of the approved PhD thesis record available in the ERP and is subject to verification of all original documents and applicable university / institutional rules.</div>
  <div class="sign"><div class="sigbox"><div class="sigline">Guide / Research Supervisor</div>${row.guidename || ""}</div><div class="sigbox"><div class="sigline">Principal / Controller of Examinations</div>${name}</div></div>
  </div></body></html>`);
  win.document.close();
}

function printOralDefenseAppointment(row, institution = {}) {
  const logo = institution.logolink || institution.logo || global1.logo || "";
  const name = institution.institutionname || global1.insname || "Institution";
  const address = institution.address || global1.address || "";
  const win = window.open("", "_blank", "width=900,height=800");
  if (!win) return;
  win.document.write(`<!doctype html><html><head><title>Oral Defense Appointment</title><style>@page{size:A4;margin:14mm}body{font-family:Georgia,'Times New Roman',serif;color:#000}.toolbar{text-align:right;padding:8px}.page{max-width:185mm;margin:auto}.head{text-align:center;border-bottom:2px solid #111;padding-bottom:8px}.logo{height:68px}.meta{display:flex;justify-content:space-between;margin:14px 0}.box{border:1px solid #111;padding:10px;margin:12px 0}.body{line-height:1.65;text-align:justify}.sign{text-align:right;margin-top:50px;font-weight:700}@media print{.toolbar{display:none}}</style></head><body><div class="toolbar"><button onclick="print()">Print</button><button onclick="close()">Close</button></div><div class="page"><div class="head">${logo ? `<img class="logo" src="${logo}"/>` : ""}<h2>${name}</h2><div>${address}</div><h3>Appointment for Oral Defense / Viva-Voce Examination</h3></div><div class="meta"><b>Ref:</b> PhD/ORAL/${row._id || ""}<span><b>Date:</b> ${displayDate()}</span></div><div class="box"><b>To:</b><br/>${row.examinername || ""}<br/>${row.examinerdesignation || ""}<br/>${row.examineremail || ""}</div><div class="body">You are requested to conduct the oral defense / viva-voce examination for the Ph.D. candidate mentioned below on the scheduled date. The assignment is issued as per the approved examiner panel and institutional rules.</div><table style="width:100%;border-collapse:collapse;margin-top:14px" border="1" cellpadding="7"><tbody><tr><th>Candidate</th><td>${row.student || ""}</td></tr><tr><th>Registration No.</th><td>${row.regno || ""}</td></tr><tr><th>Program</th><td>${row.program || ""} (${row.programcode || ""})</td></tr><tr><th>Subject</th><td>${row.subject || ""}</td></tr><tr><th>Title of Thesis</th><td>${row.topic || ""}</td></tr><tr><th>Target Date</th><td>${row.targetdate || ""}</td></tr><tr><th>Oral Defense Date</th><td>${row.oraldefensedate || ""}</td></tr></tbody></table><div class="sign">Controller of Examinations<br/>${name}</div></div></body></html>`);
  win.document.close();
}

function awardTemplate() {
  return `It is hereby notified that taking into account the reports of the examiners and oral defense examination, {{institutionname}} accepts the thesis submitted by the following candidate and accords approval for the award of the degree of "DOCTOR OF PHILOSOPHY" (Ph.D.).

Enrollment No.: {{regno}}
Name of Candidate: {{student}}
Subject: {{subject}}
Faculty: {{program}}
Title of Thesis: {{topic}}
Registration No.: {{regno}}
Date of Oral Defense Exam: {{oraldefensedate}}`;
}

function replaceAwardPlaceholders(template = "", row = {}, institution = {}) {
  const values = {
    institutionname: institution.institutionname || global1.insname || "Institution",
    institutionaddress: institution.address || global1.address || "",
    regno: row.regno || "",
    student: row.student || "",
    subject: row.subject || "",
    program: row.program || "",
    programcode: row.programcode || "",
    faculty: row.program || "",
    topic: row.topic || "",
    oraldefensedate: row.oraldefensedate || "",
    date: displayDate(),
    ref: `PU/COE/RT/Conf./Ph.D./${new Date().getFullYear()}/${clean(row._id).slice(-5)}`
  };
  return clean(template).replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => values[String(key).toLowerCase()] ?? "");
}

function printAwardLetter(row, institution = {}, template = "") {
  const logo = institution.logolink || institution.logo || global1.logo || "";
  const name = institution.institutionname || global1.insname || "Institution";
  const address = institution.address || global1.address || "";
  const body = replaceAwardPlaceholders(template || awardTemplate(), row, institution);
  const lines = body.split(/\n/).map((line) => htmlEscape(line)).join("<br/>");
  const win = window.open("", "_blank", "width=900,height=800");
  if (!win) return;
  win.document.write(`<!doctype html><html><head><title>PhD Award Letter</title><style>@page{size:A4;margin:14mm}body{font-family:Georgia,'Times New Roman',serif;color:#000}.toolbar{text-align:right;padding:8px}.page{max-width:185mm;margin:auto}.head{text-align:center;border-bottom:2px solid #111;padding-bottom:8px}.logo{height:72px}.meta{display:flex;justify-content:space-between;margin:12px 0}.title{text-align:center;color:#9b3434;text-decoration:underline;font-weight:800;margin:18px 0}.body{line-height:1.7;text-align:justify}.details{width:100%;border-collapse:collapse;margin:14px 0}.details th,.details td{border:1px solid #111;padding:8px;text-align:left}.sign{text-align:right;margin-top:45px;font-weight:800}@media print{.toolbar{display:none}}</style></head><body><div class="toolbar"><button onclick="print()">Print</button><button onclick="close()">Close</button></div><div class="page"><div class="head">${logo ? `<img class="logo" src="${logo}"/>` : ""}<h2>${name}</h2><div>${address}</div><h3>Office of Controller of Examinations</h3></div><div class="meta"><b>Ref:</b> PU/COE/RT/Conf./Ph.D./${new Date().getFullYear()}/${clean(row._id).slice(-5)}<span><b>Date:</b> ${displayDate()}</span></div><div class="title">Ph.D. NOTIFICATION</div><div class="body">${lines}</div><table class="details"><tbody><tr><th>Enrollment No.</th><td>${row.regno || ""}</td></tr><tr><th>Name of Candidate</th><td>${row.student || ""}</td></tr><tr><th>Subject</th><td>${row.subject || ""}</td></tr><tr><th>Faculty</th><td>${row.program || ""}</td></tr><tr><th>Title of Thesis</th><td>${row.topic || ""}</td></tr><tr><th>Registration No.</th><td>${row.regno || ""}</td></tr><tr><th>Date of Oral Defense Exam</th><td>${row.oraldefensedate || ""}</td></tr></tbody></table><div class="sign">Controller of Examinations</div></div></body></html>`);
  win.document.close();
}

export function PhdThesisAssignmentPage() {
  const { options, students, users, programs, load } = usePhdOptions();
  const [rows, setRows] = useState([]);
  const [filters, setFilters] = useState({});
  const [selection, setSelection] = useState([]);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({ academicyear: "", regulation: "", program: "", programcode: "", student: "", regno: "", email: "", phone: "", topic: "", subject: "", guidename: "", guideemail: "", startdate: today(), enddate: "", status: "Active" });
  const selectedGuide = useMemo(
    () => users.find((user) => clean(user.email || user.user).toLowerCase() === clean(form.guideemail).toLowerCase()) || null,
    [users, form.guideemail]
  );

  const loadRows = async () => {
    const res = await ep1.get(`/api/v2/phd/assignments?${queryString({ colid: global1.colid, ...filters })}`);
    setRows(res.data?.data || []);
  };
  useEffect(() => { loadRows(); }, []);

  const chooseStudent = (student) => setForm((prev) => ({
    ...prev,
    academicyear: student?.academicyear || student?.admissionyear || prev.academicyear,
    regulation: student?.regulation || prev.regulation,
    program: student?.program || prev.program,
    programcode: student?.programcode || prev.programcode,
    student: student?.name || "",
    regno: student?.regno || "",
    email: student?.email || student?.user || "",
    phone: student?.phone || ""
  }));
  const chooseProgram = (program) => setForm((prev) => ({ ...prev, academicyear: program?.academicyear || prev.academicyear, regulation: program?.regulation || prev.regulation, program: program?.program || "", programcode: program?.programcode || "" }));
  const chooseGuide = (user) => setForm((prev) => ({ ...prev, guidename: user?.name || "", guideemail: user?.email || user?.user || "" }));
  const save = async () => {
    await ep1.post("/api/v2/phd/assignments", { ...form, colid: global1.colid, name: global1.name, user: global1.user });
    setMessage("Thesis assignment saved.");
    setForm({ academicyear: "", regulation: "", program: "", programcode: "", student: "", regno: "", email: "", phone: "", topic: "", subject: "", guidename: "", guideemail: "", startdate: today(), enddate: "", status: "Active" });
    loadRows();
    load();
  };
  const deleteRows = async () => {
    await ep1.post("/api/v2/phd/assignments-delete", { colid: global1.colid, ids: selection });
    setSelection([]);
    loadRows();
  };
  const template = () => {
    const ws = XLSX.utils.json_to_sheet([assignmentFields.reduce((acc, f) => ({ ...acc, [f]: "" }), {})]);
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Thesis assignment"); XLSX.writeFile(wb, "phd-thesis-assignment-template.xlsx");
  };
  const bulkUpload = async (event) => {
    const file = event.target.files?.[0]; event.target.value = ""; if (!file) return;
    const wb = XLSX.read(await file.arrayBuffer()); const records = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: "" });
    await ep1.post("/api/v2/phd/assignments-bulk", { colid: global1.colid, name: global1.name, user: global1.user, items: records });
    setMessage(`${records.length} assignment rows uploaded.`);
    loadRows();
  };
  const columns = [
    ...assignmentFields.map((field) => ({ field, headerName: fieldLabel(field), minWidth: ["topic", "subject", "student"].includes(field) ? 190 : 130, flex: ["topic", "subject"].includes(field) ? 1 : undefined })),
    { field: "edit", headerName: "Edit", width: 90, renderCell: ({ row }) => <Button size="small" onClick={() => setForm(row)}>Edit</Button> }
  ];
  return (
    <MenuPageShell title="Thesis assignment">
      <Stack spacing={2} sx={{ p: 2 }}>
        <Typography variant="h5" fontWeight={900}>Thesis Assignment</Typography>
        {message && <Alert severity="success" onClose={() => setMessage("")}>{message}</Alert>}
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}><Autocomplete options={students} getOptionLabel={studentLabel} onChange={(_, v) => chooseStudent(v)} renderInput={(params) => <TextField {...params} size="small" label="Search and select student" />} /></Grid>
            <Grid item xs={12} md={4}><Autocomplete options={programs} getOptionLabel={programLabel} onChange={(_, v) => chooseProgram(v)} renderInput={(params) => <TextField {...params} size="small" label="Program" />} /></Grid>
            <Grid item xs={12} md={4}><Autocomplete options={users} getOptionLabel={userLabel} value={selectedGuide} onChange={(_, v) => chooseGuide(v)} renderInput={(params) => <TextField {...params} size="small" label="Guide" />} /></Grid>
            <Grid item xs={12} md={3}><TextField fullWidth size="small" label="Guide name" value={form.guidename || ""} InputProps={{ readOnly: true }} /></Grid>
            <Grid item xs={12} md={3}><TextField fullWidth size="small" label="Guide email" value={form.guideemail || ""} InputProps={{ readOnly: true }} /></Grid>
            {assignmentFields.filter((field) => !["guidename", "guideemail"].includes(field)).map((field) => (
              <Grid item xs={12} md={["topic", "subject"].includes(field) ? 6 : 3} key={field}>
                <TextField fullWidth size="small" type={field.includes("date") ? "date" : "text"} InputLabelProps={field.includes("date") ? { shrink: true } : undefined} label={fieldLabel(field)} value={form[field] || ""} onChange={(e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))} />
              </Grid>
            ))}
            <Grid item xs={12}><Button variant="contained" startIcon={<SaveIcon />} onClick={save}>Save assignment</Button></Grid>
          </Grid>
        </Paper>
        <DynamicFilters fields={assignmentFields} filters={filters} setFilters={setFilters} options={options || {}} onSearch={loadRows} />
        <Stack direction="row" spacing={1} flexWrap="wrap">
          <Button variant="outlined" startIcon={<DownloadIcon />} onClick={() => exportCsv("phd-thesis-assignments.csv", rows, columns.filter((c) => c.field !== "edit"))}>Export</Button>
          <Button variant="outlined" startIcon={<DownloadIcon />} onClick={template}>Template</Button>
          <Button variant="outlined" component="label" startIcon={<UploadFileIcon />}>Bulk upload<input hidden type="file" accept=".xlsx,.xls,.csv" onChange={bulkUpload} /></Button>
          <Button color="error" variant="outlined" startIcon={<DeleteIcon />} disabled={!selection.length} onClick={deleteRows}>Bulk delete</Button>
        </Stack>
        <Paper sx={{ height: 620 }}><DataGrid rows={rowsWithId(rows)} columns={columns} checkboxSelection onRowSelectionModelChange={(m) => setSelection(Array.from(m))} slots={{ toolbar: GridToolbar }} sx={gridSx} getRowHeight={() => "auto"} /></Paper>
      </Stack>
    </MenuPageShell>
  );
}

export function PhdThesisWorkflowPage() {
  const { options, users, programs, load } = usePhdOptions();
  const [rows, setRows] = useState([]);
  const [filters, setFilters] = useState({});
  const [selection, setSelection] = useState([]);
  const [form, setForm] = useState({ academicyear: "", regulation: "", program: "", programcode: "", level: 1, role: "", approvername: "", approveremail: "", status: "Active", remarks: "" });
  const loadRows = async () => {
    const res = await ep1.get(`/api/v2/phd/workflows?${queryString({ colid: global1.colid, ...filters })}`);
    setRows(res.data?.data || []);
  };
  useEffect(() => { loadRows(); }, []);
  const chooseProgram = (p) => setForm((prev) => ({ ...prev, academicyear: p?.academicyear || prev.academicyear, regulation: p?.regulation || prev.regulation, program: p?.program || "", programcode: p?.programcode || "" }));
  const chooseApprover = (u) => setForm((prev) => ({ ...prev, approvername: u?.name || "", approveremail: u?.email || u?.user || "", role: u?.role || prev.role }));
  const save = async () => {
    await ep1.post("/api/v2/phd/workflows", { ...form, colid: global1.colid, name: global1.name, user: global1.user });
    setForm({ academicyear: "", regulation: "", program: "", programcode: "", level: 1, role: "", approvername: "", approveremail: "", status: "Active", remarks: "" });
    loadRows(); load();
  };
  const columns = [...workflowFields.map((field) => ({ field, headerName: fieldLabel(field), minWidth: 130, flex: field === "remarks" ? 1 : undefined })), { field: "edit", headerName: "Edit", width: 90, renderCell: ({ row }) => <Button size="small" onClick={() => setForm(row)}>Edit</Button> }];
  return (
    <MenuPageShell title="Thesis approval workflow">
      <Stack spacing={2} sx={{ p: 2 }}>
        <Typography variant="h5" fontWeight={900}>Thesis Approval Workflow</Typography>
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}><Autocomplete options={programs} getOptionLabel={programLabel} onChange={(_, v) => chooseProgram(v)} renderInput={(params) => <TextField {...params} size="small" label="Program" />} /></Grid>
            <Grid item xs={12} md={4}><Autocomplete options={users} getOptionLabel={userLabel} onChange={(_, v) => chooseApprover(v)} renderInput={(params) => <TextField {...params} size="small" label="Approver" />} /></Grid>
            {workflowFields.map((field) => <Grid item xs={12} md={field === "remarks" ? 6 : 3} key={field}><TextField fullWidth size="small" type={field === "level" ? "number" : "text"} label={fieldLabel(field)} value={form[field] || ""} onChange={(e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))} /></Grid>)}
            <Grid item xs={12}><Button variant="contained" startIcon={<SaveIcon />} onClick={save}>Save workflow</Button></Grid>
          </Grid>
        </Paper>
        <DynamicFilters fields={workflowFields} filters={filters} setFilters={setFilters} options={options || {}} onSearch={loadRows} />
        <Stack direction="row" spacing={1}><Button variant="outlined" onClick={() => exportCsv("phd-thesis-workflow.csv", rows, columns.filter((c) => c.field !== "edit"))}>Export</Button><Button color="error" variant="outlined" disabled={!selection.length} onClick={async () => { await ep1.post("/api/v2/phd/workflows-delete", { colid: global1.colid, ids: selection }); setSelection([]); loadRows(); }}>Bulk delete</Button></Stack>
        <Paper sx={{ height: 620 }}><DataGrid rows={rowsWithId(rows)} columns={columns} checkboxSelection onRowSelectionModelChange={(m) => setSelection(Array.from(m))} slots={{ toolbar: GridToolbar }} sx={gridSx} getRowHeight={() => "auto"} /></Paper>
      </Stack>
    </MenuPageShell>
  );
}

export function PhdThesisAssignmentWorkflowPage() {
  const { options, users, programs, load } = usePhdOptions();
  const [rows, setRows] = useState([]);
  const [filters, setFilters] = useState({});
  const [selection, setSelection] = useState([]);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({ academicyear: "", regulation: "", program: "", programcode: "", level: 1, role: "", approvername: "", approveremail: "", status: "Active", remarks: "" });
  const loadRows = async () => {
    setBusy("load");
    try {
      const res = await ep1.get(`/api/v2/phd/assignment-workflows?${queryString({ colid: global1.colid, ...filters })}`);
      setRows(res.data?.data || []);
    } finally {
      setBusy("");
    }
  };
  useEffect(() => { loadRows(); }, []);
  const chooseProgram = (p) => setForm((prev) => ({ ...prev, academicyear: p?.academicyear || prev.academicyear, regulation: p?.regulation || prev.regulation, program: p?.program || "", programcode: p?.programcode || "" }));
  const chooseApprover = (u) => setForm((prev) => ({ ...prev, approvername: u?.name || "", approveremail: u?.email || u?.user || "", role: u?.role || prev.role }));
  const save = async () => {
    setBusy("save");
    try {
      await ep1.post("/api/v2/phd/assignment-workflows", { ...form, colid: global1.colid, name: global1.name, user: global1.user });
      setForm({ academicyear: "", regulation: "", program: "", programcode: "", level: 1, role: "", approvername: "", approveremail: "", status: "Active", remarks: "" });
      setMessage("Thesis assignment workflow saved.");
      await loadRows(); load();
    } finally {
      setBusy("");
    }
  };
  const deleteSelected = async () => {
    setBusy("delete");
    try {
      await ep1.post("/api/v2/phd/assignment-workflows-delete", { colid: global1.colid, ids: selection });
      setSelection([]);
      await loadRows();
    } finally {
      setBusy("");
    }
  };
  const template = () => {
    const ws = XLSX.utils.json_to_sheet([workflowFields.reduce((acc, f) => ({ ...acc, [f]: "" }), {})]);
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Assignment workflow"); XLSX.writeFile(wb, "phd-thesis-assignment-workflow-template.xlsx");
  };
  const bulkUpload = async (event) => {
    const file = event.target.files?.[0]; event.target.value = ""; if (!file) return;
    setBusy("upload");
    try {
      const wb = XLSX.read(await file.arrayBuffer());
      const records = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: "" });
      await ep1.post("/api/v2/phd/assignment-workflows-bulk", { colid: global1.colid, name: global1.name, user: global1.user, items: records });
      setMessage(`${records.length} workflow row(s) uploaded.`);
      await loadRows();
    } finally {
      setBusy("");
    }
  };
  const columns = [
    ...workflowFields.map((field) => ({ field, headerName: fieldLabel(field), minWidth: 130, flex: field === "remarks" ? 1 : undefined })),
    { field: "edit", headerName: "Edit", width: 90, renderCell: ({ row }) => <Button size="small" disabled={Boolean(busy)} onClick={() => setForm(row)}>Edit</Button> }
  ];
  return (
    <MenuPageShell title="Thesis assignment workflow">
      <Stack spacing={2} sx={{ p: 2 }}>
        <Typography variant="h5" fontWeight={900}>Thesis Assignment Approval Workflow</Typography>
        {message && <Alert severity="success" onClose={() => setMessage("")}>{message}</Alert>}
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}><Autocomplete options={programs} getOptionLabel={programLabel} onChange={(_, v) => chooseProgram(v)} renderInput={(params) => <TextField {...params} size="small" label="Program" />} /></Grid>
            <Grid item xs={12} md={4}><Autocomplete options={users} getOptionLabel={userLabel} onChange={(_, v) => chooseApprover(v)} renderInput={(params) => <TextField {...params} size="small" label="Approver" />} /></Grid>
            {workflowFields.map((field) => <Grid item xs={12} md={field === "remarks" ? 6 : 3} key={field}><TextField fullWidth size="small" type={field === "level" ? "number" : "text"} label={fieldLabel(field)} value={form[field] || ""} onChange={(e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))} /></Grid>)}
            <Grid item xs={12}><Button variant="contained" startIcon={busy === "save" ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />} disabled={Boolean(busy)} onClick={save}>Save workflow</Button></Grid>
          </Grid>
        </Paper>
        <DynamicFilters fields={workflowFields} filters={filters} setFilters={setFilters} options={options || {}} onSearch={loadRows} />
        <Stack direction="row" spacing={1} flexWrap="wrap">
          <Button variant="outlined" disabled={Boolean(busy)} onClick={() => exportCsv("phd-thesis-assignment-workflow.csv", rows, columns.filter((c) => c.field !== "edit"))}>Export</Button>
          <Button variant="outlined" disabled={Boolean(busy)} startIcon={<DownloadIcon />} onClick={template}>Template</Button>
          <Button variant="outlined" disabled={Boolean(busy)} component="label" startIcon={<UploadFileIcon />}>Bulk upload<input hidden type="file" accept=".xlsx,.xls,.csv" onChange={bulkUpload} /></Button>
          <Button color="error" variant="outlined" disabled={!selection.length || Boolean(busy)} onClick={deleteSelected}>{busy === "delete" ? <CircularProgress size={18} /> : "Bulk delete"}</Button>
        </Stack>
        <Paper sx={{ height: 620 }}><DataGrid loading={busy === "load"} rows={rowsWithId(rows)} columns={columns} checkboxSelection rowSelectionModel={selection} onRowSelectionModelChange={(m) => setSelection(Array.from(m))} slots={{ toolbar: GridToolbar }} sx={gridSx} getRowHeight={() => "auto"} /></Paper>
      </Stack>
    </MenuPageShell>
  );
}

export function PhdNocWorkflowPage() {
  const { options, users, programs, load } = usePhdOptions();
  const [rows, setRows] = useState([]);
  const [filters, setFilters] = useState({});
  const [selection, setSelection] = useState([]);
  const [busy, setBusy] = useState("");
  const [form, setForm] = useState({ academicyear: "", regulation: "", program: "", programcode: "", level: 1, role: "", approvername: "", approveremail: "", status: "Active", remarks: "" });
  const loadRows = async () => {
    setBusy("load");
    try {
      const res = await ep1.get(`/api/v2/phd/noc-workflows?${queryString({ colid: global1.colid, ...filters })}`);
      setRows(res.data?.data || []);
    } finally {
      setBusy("");
    }
  };
  useEffect(() => { loadRows(); }, []);
  const chooseProgram = (p) => setForm((prev) => ({ ...prev, academicyear: p?.academicyear || prev.academicyear, regulation: p?.regulation || prev.regulation, program: p?.program || "", programcode: p?.programcode || "" }));
  const chooseApprover = (u) => setForm((prev) => ({ ...prev, approvername: u?.name || "", approveremail: u?.email || u?.user || "", role: u?.role || prev.role }));
  const save = async () => {
    setBusy("save");
    try {
      await ep1.post("/api/v2/phd/noc-workflows", { ...form, colid: global1.colid, name: global1.name, user: global1.user });
      setForm({ academicyear: "", regulation: "", program: "", programcode: "", level: 1, role: "", approvername: "", approveremail: "", status: "Active", remarks: "" });
      await loadRows(); load();
    } finally {
      setBusy("");
    }
  };
  const deleteSelected = async () => {
    setBusy("delete");
    try {
      await ep1.post("/api/v2/phd/noc-workflows-delete", { colid: global1.colid, ids: selection });
      setSelection([]);
      await loadRows();
    } finally {
      setBusy("");
    }
  };
  const columns = [...workflowFields.map((field) => ({ field, headerName: fieldLabel(field), minWidth: 130, flex: field === "remarks" ? 1 : undefined })), { field: "edit", headerName: "Edit", width: 90, renderCell: ({ row }) => <Button size="small" disabled={Boolean(busy)} onClick={() => setForm(row)}>Edit</Button> }];
  return (
    <MenuPageShell title="NoC final approval workflow">
      <Stack spacing={2} sx={{ p: 2 }}>
        <Typography variant="h5" fontWeight={900}>NoC Final Approval Workflow</Typography>
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}><Autocomplete options={programs} getOptionLabel={programLabel} onChange={(_, v) => chooseProgram(v)} renderInput={(params) => <TextField {...params} size="small" label="Program" />} /></Grid>
            <Grid item xs={12} md={4}><Autocomplete options={users} getOptionLabel={userLabel} onChange={(_, v) => chooseApprover(v)} renderInput={(params) => <TextField {...params} size="small" label="Approver" />} /></Grid>
            {workflowFields.map((field) => <Grid item xs={12} md={field === "remarks" ? 6 : 3} key={field}><TextField fullWidth size="small" type={field === "level" ? "number" : "text"} label={fieldLabel(field)} value={form[field] || ""} onChange={(e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))} /></Grid>)}
            <Grid item xs={12}><Button variant="contained" startIcon={busy === "save" ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />} disabled={Boolean(busy)} onClick={save}>Save workflow</Button></Grid>
          </Grid>
        </Paper>
        <DynamicFilters fields={workflowFields} filters={filters} setFilters={setFilters} options={options || {}} onSearch={loadRows} />
        <Stack direction="row" spacing={1} flexWrap="wrap"><Button variant="outlined" disabled={Boolean(busy)} onClick={() => exportCsv("phd-noc-workflow.csv", rows, columns.filter((c) => c.field !== "edit"))}>Export</Button><Button color="error" variant="outlined" disabled={!selection.length || Boolean(busy)} onClick={deleteSelected}>{busy === "delete" ? <CircularProgress size={18} /> : "Bulk delete"}</Button></Stack>
        <Paper sx={{ height: 620 }}><DataGrid loading={busy === "load"} rows={rowsWithId(rows)} columns={columns} checkboxSelection rowSelectionModel={selection} onRowSelectionModelChange={(m) => setSelection(Array.from(m))} slots={{ toolbar: GridToolbar }} sx={gridSx} getRowHeight={() => "auto"} /></Paper>
      </Stack>
    </MenuPageShell>
  );
}

export function PhdOralDefenseWorkflowPage() {
  const { options, users, programs, load } = usePhdOptions();
  const [rows, setRows] = useState([]);
  const [filters, setFilters] = useState({});
  const [selection, setSelection] = useState([]);
  const [busy, setBusy] = useState("");
  const [form, setForm] = useState({ academicyear: "", regulation: "", program: "", programcode: "", level: 1, role: "", approvername: "", approveremail: "", status: "Active", remarks: "" });
  const loadRows = async () => {
    setBusy("load");
    try {
      const res = await ep1.get(`/api/v2/phd/oral-workflows?${queryString({ colid: global1.colid, ...filters })}`);
      setRows(res.data?.data || []);
    } finally {
      setBusy("");
    }
  };
  useEffect(() => { loadRows(); }, []);
  const chooseProgram = (p) => setForm((prev) => ({ ...prev, academicyear: p?.academicyear || prev.academicyear, regulation: p?.regulation || prev.regulation, program: p?.program || "", programcode: p?.programcode || "" }));
  const chooseApprover = (u) => setForm((prev) => ({ ...prev, approvername: u?.name || "", approveremail: u?.email || u?.user || "", role: u?.role || prev.role }));
  const save = async () => {
    setBusy("save");
    try {
      await ep1.post("/api/v2/phd/oral-workflows", { ...form, colid: global1.colid, name: global1.name, user: global1.user });
      setForm({ academicyear: "", regulation: "", program: "", programcode: "", level: 1, role: "", approvername: "", approveremail: "", status: "Active", remarks: "" });
      await loadRows(); load();
    } finally {
      setBusy("");
    }
  };
  const deleteSelected = async () => {
    setBusy("delete");
    try {
      await ep1.post("/api/v2/phd/oral-workflows-delete", { colid: global1.colid, ids: selection });
      setSelection([]);
      await loadRows();
    } finally {
      setBusy("");
    }
  };
  const columns = [...workflowFields.map((field) => ({ field, headerName: fieldLabel(field), minWidth: 130, flex: field === "remarks" ? 1 : undefined })), { field: "edit", headerName: "Edit", width: 90, renderCell: ({ row }) => <Button size="small" disabled={Boolean(busy)} onClick={() => setForm(row)}>Edit</Button> }];
  return (
    <MenuPageShell title="Oral defense workflow">
      <Stack spacing={2} sx={{ p: 2 }}>
        <Typography variant="h5" fontWeight={900}>Oral Defense Comments Approval Workflow</Typography>
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}><Autocomplete options={programs} getOptionLabel={programLabel} onChange={(_, v) => chooseProgram(v)} renderInput={(params) => <TextField {...params} size="small" label="Program" />} /></Grid>
            <Grid item xs={12} md={4}><Autocomplete options={users} getOptionLabel={userLabel} onChange={(_, v) => chooseApprover(v)} renderInput={(params) => <TextField {...params} size="small" label="Approver" />} /></Grid>
            {workflowFields.map((field) => <Grid item xs={12} md={field === "remarks" ? 6 : 3} key={field}><TextField fullWidth size="small" type={field === "level" ? "number" : "text"} label={fieldLabel(field)} value={form[field] || ""} onChange={(e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))} /></Grid>)}
            <Grid item xs={12}><Button variant="contained" startIcon={busy === "save" ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />} disabled={Boolean(busy)} onClick={save}>Save workflow</Button></Grid>
          </Grid>
        </Paper>
        <DynamicFilters fields={workflowFields} filters={filters} setFilters={setFilters} options={options || {}} onSearch={loadRows} />
        <Stack direction="row" spacing={1} flexWrap="wrap"><Button variant="outlined" disabled={Boolean(busy)} onClick={() => exportCsv("phd-oral-defense-workflow.csv", rows, columns.filter((c) => c.field !== "edit"))}>Export</Button><Button color="error" variant="outlined" disabled={!selection.length || Boolean(busy)} onClick={deleteSelected}>{busy === "delete" ? <CircularProgress size={18} /> : "Bulk delete"}</Button></Stack>
        <Paper sx={{ height: 620 }}><DataGrid loading={busy === "load"} rows={rowsWithId(rows)} columns={columns} checkboxSelection rowSelectionModel={selection} onRowSelectionModelChange={(m) => setSelection(Array.from(m))} slots={{ toolbar: GridToolbar }} sx={gridSx} getRowHeight={() => "auto"} /></Paper>
      </Stack>
    </MenuPageShell>
  );
}

export function StudentPhdThesisSubmissionPage() {
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [assignmentid, setAssignmentid] = useState("");
  const [uploaded, setUploaded] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [componentDocuments, setComponentDocuments] = useState([]);
  const [chapters, setChapters] = useState(defaultThesisChapters);
  const [customDocumentName, setCustomDocumentName] = useState("");
  const [uploadProgress, setUploadProgress] = useState({});
  const [uploadingKey, setUploadingKey] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [comments, setComments] = useState("");
  const [tab, setTab] = useState(0);
  const [message, setMessage] = useState("");
  const selected = assignments.find((row) => row._id === assignmentid);
  const load = async () => {
    const res = await ep1.get("/api/v2/phd/student-context", { params: { colid: global1.colid, regno: global1.regno } });
    setAssignments(res.data?.assignments || []);
    setSubmissions(res.data?.submissions || []);
  };
  useEffect(() => { load(); }, []);
  const upload = async (file, documentname = "Thesis file", target = "thesis", meta = {}) => {
    if (!file) return;
    const progressKey = `${target}-${documentname}`;
    setUploadingKey(progressKey);
    setUploadProgress((prev) => ({ ...prev, [progressKey]: 0 }));
    const fd = new FormData(); fd.append("file", file); fd.append("colid", global1.colid);
    const res = await ep1.post("/api/v2/phd/upload", fd, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (event) => {
        const percent = event.total ? Math.round((event.loaded * 100) / event.total) : 0;
        setUploadProgress((prev) => ({ ...prev, [progressKey]: percent }));
      }
    });
    const data = res.data?.data;
    if (target === "thesis") setUploaded(data);
    else if (target === "component") {
      setComponentDocuments((prev) => {
        const nextDoc = { documentname, documenttype: documentname, component: meta.component || documentname, chapter: meta.chapter || 0, url: data.url, filename: data.filename, key: data.key, uploadedat: new Date().toISOString() };
        const match = (doc) => clean(doc.component || doc.documentname).toLowerCase() === clean(nextDoc.component).toLowerCase() && Number(doc.chapter || 0) === Number(nextDoc.chapter || 0);
        return prev.some(match) ? prev.map((doc) => match(doc) ? nextDoc : doc) : [...prev, nextDoc];
      });
    }
    else {
      setDocuments((prev) => {
        const nextDoc = { documentname, documenttype: documentname, url: data.url, filename: data.filename, key: data.key, uploadedat: new Date().toISOString() };
        const exists = prev.some((doc) => clean(doc.documentname).toLowerCase() === clean(documentname).toLowerCase());
        return exists ? prev.map((doc) => clean(doc.documentname).toLowerCase() === clean(documentname).toLowerCase() ? nextDoc : doc) : [...prev, nextDoc];
      });
    }
    setUploadProgress((prev) => ({ ...prev, [progressKey]: 100 }));
    setUploadingKey("");
  };
  const submit = async () => {
    if (!assignmentid || !uploaded?.url) return alert("Select thesis subject and upload file.");
    const missing = [
      ...thesisMandatoryComponents.filter((name) => !componentDocuments.some((doc) => clean(doc.component || doc.documentname).toLowerCase() === name.toLowerCase())),
      ...defaultThesisChapters.filter((chapter) => !componentDocuments.some((doc) => Number(doc.chapter) === chapter)).map((chapter) => `Chapter ${chapter}`)
    ];
    if (missing.length) return alert(`Please upload all mandatory thesis documents: ${missing.join(", ")}`);
    setSubmitting(true);
    try {
      await ep1.post("/api/v2/phd/submit-thesis", { colid: global1.colid, assignmentid, fileurl: uploaded.url, filename: uploaded.filename, filekey: uploaded.key, documents, componentdocuments: componentDocuments, studentcomments: comments, resubmissioncomments: comments, name: global1.name, user: global1.user });
      setMessage("Thesis submitted for approval.");
      setUploaded(null); setDocuments([]); setComponentDocuments([]); setComments(""); load();
    } finally {
      setSubmitting(false);
    }
  };
  const buckets = [["Submitted", submissions.filter((r) => /^submitted$/i.test(r.status))], ["Approved", submissions.filter((r) => /^approved$/i.test(r.status))], ["Rejected", submissions.filter((r) => /^rejected$/i.test(r.status))]];
  return (
    <MenuPageShell title="PhD thesis submission" menuType="student">
      <Stack spacing={2} sx={{ p: 2 }}>
        <Typography variant="h5" fontWeight={900}>PhD Thesis Submission</Typography>
        {message && <Alert severity="success" onClose={() => setMessage("")}>{message}</Alert>}
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={5}><Autocomplete options={assignments} getOptionLabel={(row) => `${row.subject || ""} - ${row.topic || ""}`} value={selected || null} onChange={(_, v) => setAssignmentid(v?._id || "")} renderInput={(params) => <TextField {...params} size="small" label="Active PhD subject" />} /></Grid>
            <Grid item xs={12} md={3}><Button component="label" fullWidth variant="outlined" disabled={Boolean(uploadingKey) || submitting} startIcon={<UploadFileIcon />}>Upload thesis file<input hidden type="file" onChange={(e) => upload(e.target.files?.[0], "Thesis file", "thesis")} /></Button></Grid>
            <Grid item xs={12} md={4}>{uploaded?.url && <Typography component="a" href={uploaded.url} target="_blank" rel="noreferrer">Uploaded: {uploaded.filename}</Typography>}</Grid>
            {uploadProgress["thesis-Thesis file"] > 0 && uploadProgress["thesis-Thesis file"] < 100 && <Grid item xs={12}><LinearProgress variant="determinate" value={uploadProgress["thesis-Thesis file"]} /><Typography variant="caption">Uploading thesis file: {uploadProgress["thesis-Thesis file"]}%</Typography></Grid>}
            <Grid item xs={12}>
              <Typography fontWeight={900} sx={{ mb: 1 }}>Mandatory thesis components</Typography>
              <Grid container spacing={1}>
                {thesisMandatoryComponents.map((docName) => {
                  const doc = componentDocuments.find((item) => clean(item.component || item.documentname).toLowerCase() === docName.toLowerCase());
                  const key = `component-${docName}`;
                  return (
                    <Grid item xs={12} md={6} key={docName}>
                      <Paper variant="outlined" sx={{ p: 1.5 }}>
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ xs: "stretch", sm: "center" }}>
                          <Box sx={{ flexGrow: 1 }}>
                            <Typography fontWeight={800}>{docName} <Chip size="small" color="error" label="Mandatory" /></Typography>
                            {doc?.url && <Typography component="a" href={doc.url} target="_blank" rel="noreferrer" variant="caption">Open uploaded component</Typography>}
                          </Box>
                          <Button component="label" size="small" variant="outlined" disabled={Boolean(uploadingKey) || submitting}>Upload<input hidden type="file" onChange={(e) => upload(e.target.files?.[0], docName, "component", { component: docName })} /></Button>
                        </Stack>
                        {uploadProgress[key] > 0 && uploadProgress[key] < 100 && <Box sx={{ mt: 1 }}><LinearProgress variant="determinate" value={uploadProgress[key]} /><Typography variant="caption">{uploadProgress[key]}%</Typography></Box>}
                      </Paper>
                    </Grid>
                  );
                })}
              </Grid>
            </Grid>
            <Grid item xs={12}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                <Typography fontWeight={900}>Chapter documents</Typography>
                <Button size="small" variant="outlined" onClick={() => setChapters((prev) => [...prev, (Math.max(...prev) || 0) + 1])}>Add chapter</Button>
              </Stack>
              <Grid container spacing={1}>
                {chapters.map((chapter) => {
                  const docName = `Chapter ${chapter}`;
                  const doc = componentDocuments.find((item) => Number(item.chapter) === Number(chapter));
                  const key = `component-${docName}`;
                  return (
                    <Grid item xs={12} md={4} key={chapter}>
                      <Paper variant="outlined" sx={{ p: 1.5 }}>
                        <Stack spacing={1}>
                          <Typography fontWeight={800}>{docName}{chapter <= 6 && <Chip size="small" color="error" label="Mandatory" sx={{ ml: 1 }} />}</Typography>
                          {doc?.url && <Typography component="a" href={doc.url} target="_blank" rel="noreferrer" variant="caption">Open uploaded chapter</Typography>}
                          <Button component="label" size="small" variant="outlined" disabled={Boolean(uploadingKey) || submitting}>Upload<input hidden type="file" onChange={(e) => upload(e.target.files?.[0], docName, "component", { component: docName, chapter })} /></Button>
                          {uploadProgress[key] > 0 && uploadProgress[key] < 100 && <Box><LinearProgress variant="determinate" value={uploadProgress[key]} /><Typography variant="caption">{uploadProgress[key]}%</Typography></Box>}
                        </Stack>
                      </Paper>
                    </Grid>
                  );
                })}
              </Grid>
            </Grid>
            <Grid item xs={12}>
              <Typography fontWeight={900} sx={{ mb: 1 }}>Supporting documents</Typography>
              <Grid container spacing={1}>
                {thesisSupportingDocuments.map((docName) => {
                  const doc = documents.find((item) => clean(item.documentname).toLowerCase() === docName.toLowerCase());
                  const key = `support-${docName}`;
                  return (
                    <Grid item xs={12} md={6} key={docName}>
                      <Paper variant="outlined" sx={{ p: 1.5 }}>
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ xs: "stretch", sm: "center" }}>
                          <Box sx={{ flexGrow: 1 }}>
                            <Typography fontWeight={800}>{docName}</Typography>
                            {doc?.url && <Typography component="a" href={doc.url} target="_blank" rel="noreferrer" variant="caption">Open uploaded document</Typography>}
                          </Box>
                          <Button component="label" size="small" variant="outlined" disabled={Boolean(uploadingKey) || submitting}>Upload<input hidden type="file" onChange={(e) => upload(e.target.files?.[0], docName, "support")} /></Button>
                        </Stack>
                        {uploadProgress[key] > 0 && uploadProgress[key] < 100 && <Box sx={{ mt: 1 }}><LinearProgress variant="determinate" value={uploadProgress[key]} /><Typography variant="caption">{uploadProgress[key]}%</Typography></Box>}
                      </Paper>
                    </Grid>
                  );
                })}
                <Grid item xs={12}>
                  <Paper variant="outlined" sx={{ p: 1.5 }}>
                    <Grid container spacing={1} alignItems="center">
                      <Grid item xs={12} md={5}><TextField fullWidth size="small" label="Other document name" value={customDocumentName} onChange={(e) => setCustomDocumentName(e.target.value)} /></Grid>
                      <Grid item xs={12} md={3}><Button fullWidth component="label" variant="outlined" disabled={!clean(customDocumentName) || Boolean(uploadingKey) || submitting}>Upload other document<input hidden type="file" onChange={(e) => { upload(e.target.files?.[0], customDocumentName, "support"); setCustomDocumentName(""); }} /></Button></Grid>
                      <Grid item xs={12} md={4}><DocumentsButton row={{ documents }} label="View uploaded supporting documents" /></Grid>
                    </Grid>
                  </Paper>
                </Grid>
              </Grid>
            </Grid>
            <Grid item xs={12}><TextField fullWidth multiline minRows={3} label="Student comments / resubmission comments" value={comments} onChange={(e) => setComments(e.target.value)} /></Grid>
            <Grid item xs={12}><Button variant="contained" disabled={submitting || Boolean(uploadingKey)} onClick={submit}>{submitting ? <CircularProgress size={18} color="inherit" /> : "Submit thesis"}</Button></Grid>
          </Grid>
        </Paper>
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)}>{buckets.map(([label, rows]) => <Tab key={label} label={`${label} (${rows.length})`} />)}</Tabs>
          <Box sx={{ height: 520, mt: 2 }}><DataGrid rows={rowsWithId(buckets[tab][1])} columns={submissionColumns()} slots={{ toolbar: GridToolbar }} sx={gridSx} getRowHeight={() => "auto"} /></Box>
        </Paper>
      </Stack>
    </MenuPageShell>
  );
}

export function StudentPhdThesisAssignmentApplyPage() {
  const { users, programs } = usePhdOptions();
  const [requests, setRequests] = useState([]);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({ academicyear: global1.academicyear || "", regulation: global1.regulation || "", program: global1.program || "", programcode: global1.programcode || "", topic: "", subject: "", guidename: "", guideemail: "", startdate: today(), enddate: "", comments: "" });
  const guides = users || [];
  const load = async () => {
    setBusy("load");
    try {
      const res = await ep1.get("/api/v2/phd/student-assignment-requests", { params: { colid: global1.colid, regno: global1.regno, user: global1.user } });
      setRequests(res.data?.data || []);
    } finally {
      setBusy("");
    }
  };
  useEffect(() => { load(); }, []);
  const chooseProgram = (program) => setForm((prev) => ({ ...prev, academicyear: program?.academicyear || prev.academicyear, regulation: program?.regulation || prev.regulation, program: program?.program || "", programcode: program?.programcode || "" }));
  const chooseGuide = (guide) => setForm((prev) => ({ ...prev, guidename: guide?.name || "", guideemail: guide?.email || guide?.user || "" }));
  const submit = async () => {
    setBusy("save");
    try {
      await ep1.post("/api/v2/phd/student-assignment-apply", { ...form, colid: global1.colid, name: global1.name, user: global1.user, regno: global1.regno });
      setMessage("Thesis assignment application submitted.");
      setForm((prev) => ({ ...prev, topic: "", subject: "", comments: "" }));
      await load();
    } finally {
      setBusy("");
    }
  };
  const columns = [...assignmentFields, "requestsource", "assignmentapprovalstatus", "currentapprovername", "approvalcomments"].map((field) => ({ field, headerName: fieldLabel(field), minWidth: ["topic", "subject", "approvalcomments"].includes(field) ? 220 : 130, flex: field === "topic" ? 1 : undefined }));
  return (
    <MenuPageShell title="Apply for thesis assignment" menuType="student">
      <Stack spacing={2} sx={{ p: 2 }}>
        <Typography variant="h5" fontWeight={900}>Apply for Thesis Assignment</Typography>
        {message && <Alert severity="success" onClose={() => setMessage("")}>{message}</Alert>}
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}><Autocomplete options={programs || []} getOptionLabel={programLabel} onChange={(_, v) => chooseProgram(v)} renderInput={(params) => <TextField {...params} size="small" label="Program" />} /></Grid>
            <Grid item xs={12} md={4}><Autocomplete options={guides} getOptionLabel={userLabel} onChange={(_, v) => chooseGuide(v)} renderInput={(params) => <TextField {...params} size="small" label="Guide" />} /></Grid>
            {["academicyear", "regulation", "program", "programcode", "guidename", "guideemail", "topic", "subject", "startdate", "enddate"].map((field) => (
              <Grid item xs={12} md={["topic", "subject"].includes(field) ? 6 : 3} key={field}>
                <TextField fullWidth size="small" type={field.includes("date") ? "date" : "text"} InputLabelProps={field.includes("date") ? { shrink: true } : undefined} label={fieldLabel(field)} value={form[field] || ""} onChange={(e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))} />
              </Grid>
            ))}
            <Grid item xs={12}><TextField fullWidth multiline minRows={2} label="Student comments" value={form.comments || ""} onChange={(e) => setForm((prev) => ({ ...prev, comments: e.target.value }))} /></Grid>
            <Grid item xs={12}><Button variant="contained" disabled={Boolean(busy)} onClick={submit}>{busy === "save" ? <CircularProgress size={18} color="inherit" /> : "Submit application"}</Button></Grid>
          </Grid>
        </Paper>
        <Paper sx={{ height: 520 }}><DataGrid loading={busy === "load"} rows={rowsWithId(requests)} columns={columns} slots={{ toolbar: GridToolbar }} sx={gridSx} getRowHeight={() => "auto"} /></Paper>
      </Stack>
    </MenuPageShell>
  );
}

export function PhdStudentAssignmentApprovalPage() {
  const { options } = usePhdOptions();
  const [pendingRows, setPendingRows] = useState([]);
  const [approvedRows, setApprovedRows] = useState([]);
  const [filters, setFilters] = useState({});
  const [comments, setComments] = useState("");
  const [tab, setTab] = useState(0);
  const [busy, setBusy] = useState("");
  const loadRows = async () => {
    setBusy("load");
    try {
      const base = { colid: global1.colid, user: global1.user, ...filters };
      const [pending, approved] = await Promise.all([
        ep1.get(`/api/v2/phd/assignment-approvals?${queryString({ ...base, scope: "pending" })}`),
        ep1.get(`/api/v2/phd/assignment-approvals?${queryString({ ...base, scope: "approved" })}`)
      ]);
      setPendingRows(pending.data?.data || []);
      setApprovedRows(approved.data?.data || []);
    } finally {
      setBusy("");
    }
  };
  const action = async (id, act) => {
    setBusy(`${act}-${id}`);
    try {
      await ep1.post("/api/v2/phd/assignment-approval-action", { colid: global1.colid, id, action: act, comments, name: global1.name, user: global1.user });
      setComments("");
      await loadRows();
    } finally {
      setBusy("");
    }
  };
  const cols = [
    ...["student", "regno", "academicyear", "regulation", "program", "programcode", "subject", "topic", "guidename", "assignmentapprovalstatus", "currentapprovername", "approvalcomments"].map((field) => ({ field, headerName: fieldLabel(field), minWidth: ["topic", "approvalcomments"].includes(field) ? 240 : 135, flex: field === "topic" ? 1 : undefined })),
    ...(tab === 0 ? [
      { field: "approve", headerName: "Approve", width: 110, renderCell: ({ row }) => <Button size="small" disabled={Boolean(busy)} onClick={() => action(row._id, "Approve")}>{busy === `Approve-${row._id}` ? <CircularProgress size={16} /> : "Approve"}</Button> },
      { field: "reject", headerName: "Reject", width: 100, renderCell: ({ row }) => <Button size="small" color="error" disabled={Boolean(busy)} onClick={() => action(row._id, "Reject")}>{busy === `Reject-${row._id}` ? <CircularProgress size={16} /> : "Reject"}</Button> }
    ] : [])
  ];
  const rows = tab === 0 ? pendingRows : approvedRows;
  return (
    <MenuPageShell title="Thesis assignment approval">
      <Stack spacing={2} sx={{ p: 2 }}>
        <Typography variant="h5" fontWeight={900}>Student Thesis Assignment Approval</Typography>
        <TextField fullWidth multiline minRows={2} label="Approval / rejection comments" value={comments} onChange={(e) => setComments(e.target.value)} />
        <DynamicFilters fields={["academicyear", "regulation", "program", "programcode", "student", "regno", "subject", "topic", "assignmentapprovalstatus"]} filters={filters} setFilters={setFilters} options={options || {}} onSearch={loadRows} />
        <Stack direction="row" spacing={1}><Button variant="contained" disabled={Boolean(busy)} onClick={loadRows}>{busy === "load" ? <CircularProgress size={18} color="inherit" /> : "Load"}</Button><Button variant="outlined" onClick={() => exportCsv("phd-assignment-approval.csv", rows, cols)}>Export</Button></Stack>
        <Paper variant="outlined"><Tabs value={tab} onChange={(_, v) => setTab(v)}><Tab label={`Pending (${pendingRows.length})`} /><Tab label={`Approved (${approvedRows.length})`} /></Tabs></Paper>
        <Paper sx={{ height: 650 }}><DataGrid loading={busy === "load"} rows={rowsWithId(rows)} columns={cols} slots={{ toolbar: GridToolbar }} sx={gridSx} getRowHeight={() => "auto"} /></Paper>
      </Stack>
    </MenuPageShell>
  );
}

export function StudentPhdProgressReportPage() {
  const [assignments, setAssignments] = useState([]);
  const [reports, setReports] = useState([]);
  const [assignmentid, setAssignmentid] = useState("");
  const [documents, setDocuments] = useState([]);
  const [progressdate, setProgressdate] = useState(today());
  const [progress, setProgress] = useState("");
  const [comment, setComment] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [busy, setBusy] = useState("");
  const selected = assignments.find((row) => row._id === assignmentid);
  const loadContext = async () => {
    const res = await ep1.get("/api/v2/phd/student-context", { params: { colid: global1.colid, regno: global1.regno, user: global1.user } });
    setAssignments(res.data?.assignments || []);
  };
  const loadReports = async (id = assignmentid) => {
    const res = await ep1.get("/api/v2/phd/progress-reports", { params: { colid: global1.colid, assignmentid: id, regno: global1.regno, user: global1.user } });
    setReports(res.data?.data || []);
  };
  useEffect(() => { loadContext(); loadReports(""); }, []);
  const uploadDoc = async (file) => {
    if (!file) return;
    setBusy("upload"); setUploadProgress(0);
    try {
      const fd = new FormData(); fd.append("file", file); fd.append("colid", global1.colid);
      const res = await ep1.post("/api/v2/phd/upload", fd, { headers: { "Content-Type": "multipart/form-data" }, onUploadProgress: (event) => setUploadProgress(event.total ? Math.round((event.loaded * 100) / event.total) : 0) });
      const data = res.data?.data;
      setDocuments((prev) => [...prev, { documentname: data.filename, documenttype: "Progress report", url: data.url, filename: data.filename, key: data.key }]);
    } finally {
      setBusy("");
    }
  };
  const save = async () => {
    setBusy("save");
    try {
      await ep1.post("/api/v2/phd/progress-reports", { colid: global1.colid, assignmentid, progressdate, progress, documents, studentcomment: comment, name: global1.name, user: global1.user, role: "Student" });
      setProgress(""); setComment(""); setDocuments([]);
      await loadReports(assignmentid);
    } finally {
      setBusy("");
    }
  };
  const addComment = async (id) => {
    const value = window.prompt("Add comment");
    if (!value) return;
    await ep1.post("/api/v2/phd/progress-comment", { colid: global1.colid, id, comments: value, name: global1.name, user: global1.user, role: "Student" });
    await loadReports(assignmentid);
  };
  const cols = [
    { field: "progressdate", headerName: "Date", width: 130 },
    { field: "progress", headerName: "Progress", minWidth: 260, flex: 1 },
    { field: "documents", headerName: "Documents", minWidth: 140, renderCell: ({ row }) => <DocumentsButton row={row} /> },
    { field: "conversation", headerName: "Conversation", minWidth: 300, flex: 1, renderCell: ({ row }) => (row.conversation || []).map((item) => `${item.byname || item.role}: ${item.comments}`).join(" | ") },
    { field: "comment", headerName: "Add comment", width: 140, renderCell: ({ row }) => <Button size="small" onClick={() => addComment(row._id)}>Comment</Button> }
  ];
  return (
    <MenuPageShell title="PhD progress report" menuType="student">
      <Stack spacing={2} sx={{ p: 2 }}>
        <Typography variant="h5" fontWeight={900}>PhD Progress Report</Typography>
        <Paper variant="outlined" sx={{ p: 2 }}><Grid container spacing={2}>
          <Grid item xs={12} md={5}><Autocomplete options={assignments} getOptionLabel={(row) => `${row.subject || ""} - ${row.topic || ""}`} value={selected || null} onChange={(_, v) => { setAssignmentid(v?._id || ""); loadReports(v?._id || ""); }} renderInput={(params) => <TextField {...params} size="small" label="Select thesis" />} /></Grid>
          <Grid item xs={12} md={3}><TextField fullWidth size="small" type="date" label="Progress date" InputLabelProps={{ shrink: true }} value={progressdate} onChange={(e) => setProgressdate(e.target.value)} /></Grid>
          <Grid item xs={12} md={4}><Button fullWidth component="label" variant="outlined" disabled={Boolean(busy)}>Attach document<input hidden type="file" onChange={(e) => uploadDoc(e.target.files?.[0])} /></Button></Grid>
          {busy === "upload" && <Grid item xs={12}><LinearProgress variant="determinate" value={uploadProgress} /></Grid>}
          <Grid item xs={12}><TextField fullWidth multiline minRows={3} label="Progress" value={progress} onChange={(e) => setProgress(e.target.value)} /></Grid>
          <Grid item xs={12}><TextField fullWidth multiline minRows={2} label="Student comment" value={comment} onChange={(e) => setComment(e.target.value)} /></Grid>
          <Grid item xs={12}><Button variant="contained" disabled={!assignmentid || !progress || Boolean(busy)} onClick={save}>{busy === "save" ? <CircularProgress size={18} color="inherit" /> : "Save progress report"}</Button></Grid>
        </Grid></Paper>
        <Paper sx={{ height: 620 }}><DataGrid rows={rowsWithId(reports)} columns={cols} slots={{ toolbar: GridToolbar }} sx={gridSx} getRowHeight={() => "auto"} /></Paper>
      </Stack>
    </MenuPageShell>
  );
}

export function PhdGuideDashboardPage() {
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState(null);
  const [tab, setTab] = useState(0);
  const [busy, setBusy] = useState("");
  const load = async () => {
    setBusy("load");
    try {
      const res = await ep1.get("/api/v2/phd/guide-dashboard", { params: { colid: global1.colid, user: global1.user } });
      setRows(res.data?.data || []);
    } finally {
      setBusy("");
    }
  };
  useEffect(() => { load(); }, []);
  const addComment = async (report) => {
    const value = window.prompt("Guide comment");
    if (!value) return;
    await ep1.post("/api/v2/phd/progress-comment", { colid: global1.colid, id: report._id, comments: value, name: global1.name, user: global1.user, role: "Guide" });
    await load();
  };
  const visible = rows.filter((row) => tab === 0 ? row.guidecompletionstatus !== "Completed" : row.guidecompletionstatus === "Completed");
  const cols = [
    { field: "student", headerName: "Student", minWidth: 170 },
    { field: "regno", headerName: "Reg no", width: 130 },
    { field: "program", headerName: "Program", minWidth: 160 },
    { field: "topic", headerName: "Topic", minWidth: 240, flex: 1 },
    { field: "guidecompletionstatus", headerName: "Status", width: 130 },
    { field: "view", headerName: "View", width: 100, renderCell: ({ row }) => <Button size="small" onClick={() => setSelected(row)}>Open</Button> }
  ];
  const progressCols = [
    { field: "progressdate", headerName: "Date", width: 130 },
    { field: "progress", headerName: "Progress", minWidth: 280, flex: 1 },
    { field: "documents", headerName: "Documents", minWidth: 140, renderCell: ({ row }) => <DocumentsButton row={row} /> },
    { field: "conversation", headerName: "Conversation", minWidth: 320, flex: 1, renderCell: ({ row }) => (row.conversation || []).map((item) => `${item.byname || item.role}: ${item.comments}`).join(" | ") },
    { field: "comment", headerName: "Guide comment", width: 150, renderCell: ({ row }) => <Button size="small" onClick={() => addComment(row)}>Comment</Button> }
  ];
  return (
    <MenuPageShell title="PhD guide dashboard">
      <Stack spacing={2} sx={{ p: 2 }}>
        <Typography variant="h5" fontWeight={900}>PhD Guide Dashboard</Typography>
        <Stack direction="row" spacing={1}><Button variant="outlined" disabled={Boolean(busy)} onClick={load}>{busy === "load" ? <CircularProgress size={18} /> : "Refresh"}</Button></Stack>
        <Paper variant="outlined"><Tabs value={tab} onChange={(_, v) => setTab(v)}><Tab label={`Ongoing (${rows.filter((r) => r.guidecompletionstatus !== "Completed").length})`} /><Tab label={`Completed (${rows.filter((r) => r.guidecompletionstatus === "Completed").length})`} /></Tabs></Paper>
        <Paper sx={{ height: 420 }}><DataGrid loading={busy === "load"} rows={rowsWithId(visible)} columns={cols} slots={{ toolbar: GridToolbar }} sx={gridSx} getRowHeight={() => "auto"} /></Paper>
        {selected && <>
          <Typography fontWeight={900}>Thesis submissions: {selected.student}</Typography>
          <Paper sx={{ height: 300 }}><DataGrid rows={rowsWithId(selected.submissions || [])} columns={submissionColumns()} slots={{ toolbar: GridToolbar }} sx={gridSx} getRowHeight={() => "auto"} /></Paper>
          <Typography fontWeight={900}>Progress reports</Typography>
          <Paper sx={{ height: 340 }}><DataGrid rows={rowsWithId(selected.progressreports || [])} columns={progressCols} slots={{ toolbar: GridToolbar }} sx={gridSx} getRowHeight={() => "auto"} /></Paper>
        </>}
      </Stack>
    </MenuPageShell>
  );
}

function PhdGuideMessagingCore({ studentMode = false }) {
  const [assignments, setAssignments] = useState([]);
  const [assignmentid, setAssignmentid] = useState("");
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [documents, setDocuments] = useState([]);
  const [busy, setBusy] = useState("");
  const selected = assignments.find((row) => row._id === assignmentid);
  const loadAssignments = async () => {
    if (studentMode) {
      const res = await ep1.get("/api/v2/phd/student-context", { params: { colid: global1.colid, regno: global1.regno, user: global1.user } });
      setAssignments(res.data?.assignments || []);
    } else {
      const res = await ep1.get("/api/v2/phd/guide-dashboard", { params: { colid: global1.colid, user: global1.user } });
      setAssignments(res.data?.data || []);
    }
  };
  const loadMessages = async (id = assignmentid) => {
    const res = await ep1.get("/api/v2/phd/guide-messages", { params: { colid: global1.colid, assignmentid: id, user: global1.user, regno: global1.regno } });
    setMessages(res.data?.data || []);
  };
  useEffect(() => { loadAssignments(); }, []);
  const uploadDoc = async (file) => {
    if (!file) return;
    setBusy("upload");
    try {
      const fd = new FormData(); fd.append("file", file); fd.append("colid", global1.colid);
      const res = await ep1.post("/api/v2/phd/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
      const data = res.data?.data;
      setDocuments((prev) => [...prev, { documentname: data.filename, documenttype: "Message attachment", url: data.url, filename: data.filename, key: data.key }]);
    } finally {
      setBusy("");
    }
  };
  const send = async () => {
    setBusy("send");
    try {
      await ep1.post("/api/v2/phd/guide-messages", { colid: global1.colid, assignmentid, message, documents, name: global1.name, user: global1.user, role: studentMode ? "Student" : "Guide" });
      setMessage(""); setDocuments([]);
      await loadMessages(assignmentid);
    } finally {
      setBusy("");
    }
  };
  return (
    <MenuPageShell title={studentMode ? "Guide messages" : "Student guide messages"} menuType={studentMode ? "student" : undefined}>
      <Stack spacing={2} sx={{ p: 2 }}>
        <Typography variant="h5" fontWeight={900}>{studentMode ? "Message Guide" : "Message PhD Student"}</Typography>
        <Paper variant="outlined" sx={{ p: 2 }}><Grid container spacing={2}>
          <Grid item xs={12} md={7}><Autocomplete options={assignments} getOptionLabel={(row) => `${row.student ? `${row.student} - ` : ""}${row.subject || ""} - ${row.topic || ""}`} value={selected || null} onChange={(_, v) => { setAssignmentid(v?._id || ""); loadMessages(v?._id || ""); }} renderInput={(params) => <TextField {...params} size="small" label="Select thesis" />} /></Grid>
          <Grid item xs={12} md={5}><Button fullWidth variant="outlined" disabled={!assignmentid} onClick={() => loadMessages()}>Load messages</Button></Grid>
        </Grid></Paper>
        <Paper variant="outlined" sx={{ p: 2, minHeight: 360, bgcolor: "#f8fafc" }}>
          <Stack spacing={1.5}>
            {messages.map((row) => {
              const own = clean(row.senderemail).toLowerCase() === clean(global1.user).toLowerCase();
              return <Box key={row._id} sx={{ alignSelf: own ? "flex-end" : "flex-start", maxWidth: "75%", bgcolor: own ? "#d1fae5" : "#fff", border: "1px solid #d7dee8", p: 1.5, borderRadius: 2 }}><Typography fontWeight={800}>{row.sendername || row.senderrole}</Typography><Typography>{row.message}</Typography><DocumentsButton row={row} label="Attachments" /><Typography variant="caption">{formatDateTime(row.messagedate || row.createdAt)}</Typography></Box>;
            })}
          </Stack>
        </Paper>
        <Paper variant="outlined" sx={{ p: 2 }}><Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={8}><TextField fullWidth multiline minRows={2} label="Type message" value={message} onChange={(e) => setMessage(e.target.value)} /></Grid>
          <Grid item xs={12} md={2}><Button fullWidth component="label" variant="outlined" disabled={Boolean(busy)}>Attach<input hidden type="file" onChange={(e) => uploadDoc(e.target.files?.[0])} /></Button></Grid>
          <Grid item xs={12} md={2}><Button fullWidth variant="contained" disabled={!assignmentid || !message || Boolean(busy)} onClick={send}>{busy === "send" ? <CircularProgress size={18} color="inherit" /> : "Send"}</Button></Grid>
        </Grid></Paper>
      </Stack>
    </MenuPageShell>
  );
}

export function PhdGuideMessagingPage() {
  return <PhdGuideMessagingCore />;
}

export function StudentPhdGuideMessagingPage() {
  return <PhdGuideMessagingCore studentMode />;
}

export function StudentPhdNocDownloadPage() {
  const [rows, setRows] = useState([]);
  const [institution, setInstitution] = useState({});
  const [busy, setBusy] = useState(false);
  const loadRows = async () => {
    setBusy(true);
    try {
      const res = await ep1.get("/api/v2/phd/student-noc-list", { params: { colid: global1.colid, regno: global1.regno, user: global1.user } });
      setRows(res.data?.data || []);
      setInstitution(res.data?.institution || {});
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => { loadRows(); }, []);
  const cols = submissionColumns([
    { field: "approveddate", headerName: "Final approved", minWidth: 150, valueGetter: ({ value }) => value ? new Date(value).toLocaleDateString() : "" },
    { field: "noc", headerName: "Download NoC", width: 150, renderCell: ({ row }) => /^Approved$/i.test(row.status) ? <Button size="small" startIcon={<PrintIcon />} onClick={() => printNoc(row, institution)}>Generate</Button> : "" }
  ]);
  return (
    <MenuPageShell title="Download PhD NoC" menuType="student">
      <Stack spacing={2} sx={{ p: 2 }}>
        <Typography variant="h5" fontWeight={900}>Download PhD NoC</Typography>
        <Alert severity={rows.length ? "success" : "info"}>{rows.length ? "Final approved NoC is available for download." : "NoC will be available after all final approval levels are completed."}</Alert>
        <Stack direction="row" spacing={1}><Button variant="outlined" disabled={busy} onClick={loadRows}>{busy ? <CircularProgress size={18} /> : "Refresh"}</Button></Stack>
        <Paper sx={{ height: 620 }}><DataGrid loading={busy} rows={rowsWithId(rows)} columns={cols} slots={{ toolbar: GridToolbar }} sx={gridSx} getRowHeight={() => "auto"} /></Paper>
      </Stack>
    </MenuPageShell>
  );
}

function submissionColumns(extra = []) {
  return [
    { field: "student", headerName: "Student", minWidth: 170 },
    { field: "regno", headerName: "Reg no", width: 130 },
    { field: "program", headerName: "Program", minWidth: 150 },
    { field: "subject", headerName: "Subject", minWidth: 170 },
    { field: "topic", headerName: "Topic", minWidth: 230, flex: 1 },
    { field: "guidename", headerName: "Guide", minWidth: 160 },
    { field: "fileurl", headerName: "File", minWidth: 130, renderCell: ({ value }) => value ? <a href={value} target="_blank" rel="noreferrer">Open</a> : "" },
    { field: "documents", headerName: "Documents", minWidth: 150, renderCell: ({ row }) => <DocumentsButton row={row} /> },
    { field: "status", headerName: "Status", width: 120 },
    { field: "currentlevel", headerName: "Level", width: 80 },
    { field: "currentapprovername", headerName: "Current approver", minWidth: 170 },
    { field: "studentcomments", headerName: "Student comments", minWidth: 220 },
    { field: "finalcomments", headerName: "Final comments", minWidth: 220 },
    ...extra
  ];
}

export function PhdThesisApprovalPage() {
  const { options } = usePhdOptions();
  const [pendingRows, setPendingRows] = useState([]);
  const [approvedRows, setApprovedRows] = useState([]);
  const [filters, setFilters] = useState({});
  const [comments, setComments] = useState("");
  const [selection, setSelection] = useState([]);
  const [tab, setTab] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState("");
  const loadRows = async () => {
    setBusy("load");
    try {
      const base = { colid: global1.colid, user: global1.user, role: global1.role, ...filters };
      const [pending, approved] = await Promise.all([
        ep1.get(`/api/v2/phd/approvals?${queryString({ ...base, scope: "pending" })}`),
        ep1.get(`/api/v2/phd/approvals?${queryString({ ...base, scope: "approved" })}`)
      ]);
      setPendingRows(pending.data?.data || []);
      setApprovedRows(approved.data?.data || []);
      setLoaded(true);
      setSelection([]);
    } finally {
      setBusy("");
    }
  };
  const action = async (id, act) => {
    setBusy(`${act}-${id}`);
    try {
      await ep1.post("/api/v2/phd/approval-action", { colid: global1.colid, id, action: act, comments, name: global1.name, user: global1.user });
      setComments("");
      await loadRows();
    } finally {
      setBusy("");
    }
  };
  const isCurrentApprover = (row) => clean(row?.currentapproveremail).toLowerCase() === clean(global1.user).toLowerCase();
  const pendingCols = submissionColumns([
    { field: "approve", headerName: "Approve", width: 110, renderCell: ({ row }) => /^submitted$/i.test(row.status) && isCurrentApprover(row) ? <Button size="small" disabled={Boolean(busy)} onClick={() => action(row._id, "Approve")}>{busy === `Approve-${row._id}` ? <CircularProgress size={16} /> : "Approve"}</Button> : "" },
    { field: "reject", headerName: "Reject", width: 105, renderCell: ({ row }) => /^submitted$/i.test(row.status) && isCurrentApprover(row) ? <Button color="error" size="small" disabled={Boolean(busy)} onClick={() => action(row._id, "Reject")}>{busy === `Reject-${row._id}` ? <CircularProgress size={16} /> : "Reject"}</Button> : "" }
  ]);
  const approvedCols = submissionColumns([]);
  const rows = tab === 0 ? pendingRows : approvedRows;
  const cols = tab === 0 ? pendingCols : approvedCols;
  return (
    <MenuPageShell title="PhD thesis approval">
      <Stack spacing={2} sx={{ p: 2 }}>
        <Typography variant="h5" fontWeight={900}>PhD Thesis Approval</Typography>
        <TextField fullWidth multiline minRows={2} label="Approval / rejection comments" value={comments} onChange={(e) => setComments(e.target.value)} />
        <DynamicFilters fields={["academicyear", "regulation", "program", "programcode", "student", "regno", "subject", "topic", "status"]} filters={filters} setFilters={setFilters} options={options || {}} onSearch={loadRows} />
        <Stack direction="row" spacing={1} flexWrap="wrap">
          <Button variant="contained" startIcon={busy === "load" ? <CircularProgress size={18} color="inherit" /> : <SearchIcon />} disabled={Boolean(busy)} onClick={loadRows}>Load</Button>
          <Button variant="outlined" disabled={!loaded || Boolean(busy)} onClick={() => exportCsv(tab === 0 ? "phd-thesis-pending.csv" : "phd-thesis-approved-by-me.csv", rows, cols)}>Export</Button>
        </Stack>
        <Paper variant="outlined">
          <Tabs value={tab} onChange={(_, value) => { setTab(value); setSelection([]); }}>
            <Tab label={`Pending (${pendingRows.length})`} />
            <Tab label={`Approved (${approvedRows.length})`} />
          </Tabs>
        </Paper>
        {!loaded && <Alert severity="info">Select filters and click Load to display thesis approval records.</Alert>}
        <Paper sx={{ height: 650 }}><DataGrid loading={busy === "load"} rows={rowsWithId(loaded ? rows : [])} columns={cols} checkboxSelection rowSelectionModel={selection} onRowSelectionModelChange={(m) => setSelection(Array.from(m))} slots={{ toolbar: GridToolbar }} sx={gridSx} getRowHeight={() => "auto"} localeText={{ noRowsLabel: loaded ? "No thesis approval records found for this tab." : "Click Load to fetch records." }} /></Paper>
      </Stack>
    </MenuPageShell>
  );
}

function SimpleTemplateButton({ fields, filename, sheet }) {
  return <Button variant="outlined" startIcon={<DownloadIcon />} onClick={() => {
    const ws = XLSX.utils.json_to_sheet([fields.reduce((acc, f) => ({ ...acc, [f]: "" }), {})]);
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, sheet); XLSX.writeFile(wb, filename);
  }}>Template</Button>;
}

export function PhdExaminerPanelPage() {
  const { options, programs, load } = usePhdOptions();
  const [rows, setRows] = useState([]);
  const [filters, setFilters] = useState({});
  const [selection, setSelection] = useState([]);
  const [form, setForm] = useState({ academicyear: "", regulation: "", program: "", programcode: "", panelname: "", description: "", status: "Active" });
  const loadRows = async () => {
    const res = await ep1.get(`/api/v2/phd/examiner-panels?${queryString({ colid: global1.colid, ...filters })}`);
    setRows(res.data?.data || []);
  };
  useEffect(() => { loadRows(); }, []);
  const chooseProgram = (p) => setForm((prev) => ({ ...prev, academicyear: p?.academicyear || prev.academicyear, regulation: p?.regulation || prev.regulation, program: p?.program || "", programcode: p?.programcode || "" }));
  const save = async () => {
    await ep1.post("/api/v2/phd/examiner-panels", { ...form, colid: global1.colid, name: global1.name, user: global1.user });
    setForm({ academicyear: "", regulation: "", program: "", programcode: "", panelname: "", description: "", status: "Active" });
    loadRows(); load();
  };
  const bulkUpload = async (event) => {
    const file = event.target.files?.[0]; event.target.value = ""; if (!file) return;
    const wb = XLSX.read(await file.arrayBuffer()); const items = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: "" });
    await ep1.post("/api/v2/phd/examiner-panels-bulk", { colid: global1.colid, name: global1.name, user: global1.user, items });
    loadRows(); load();
  };
  const columns = [...panelFields.map((field) => ({ field, headerName: fieldLabel(field), minWidth: field === "description" ? 260 : 140, flex: field === "description" ? 1 : undefined })), { field: "edit", headerName: "Edit", width: 90, renderCell: ({ row }) => <Button size="small" onClick={() => setForm(row)}>Edit</Button> }];
  return (
    <MenuPageShell title="Examiner panel">
      <Stack spacing={2} sx={{ p: 2 }}>
        <Typography variant="h5" fontWeight={900}>Examiner Panel</Typography>
        <Paper variant="outlined" sx={{ p: 2 }}><Grid container spacing={2}>
          <Grid item xs={12} md={4}><Autocomplete options={programs || []} getOptionLabel={programLabel} onChange={(_, v) => chooseProgram(v)} renderInput={(params) => <TextField {...params} size="small" label="Program" />} /></Grid>
          {panelFields.map((field) => <Grid item xs={12} md={field === "description" ? 6 : 3} key={field}><TextField fullWidth multiline={field === "description"} minRows={field === "description" ? 2 : undefined} size="small" label={fieldLabel(field)} value={form[field] || ""} onChange={(e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))} /></Grid>)}
          <Grid item xs={12}><Button variant="contained" startIcon={<SaveIcon />} onClick={save}>Save panel</Button></Grid>
        </Grid></Paper>
        <DynamicFilters fields={panelFields} filters={filters} setFilters={setFilters} options={options || {}} onSearch={loadRows} />
        <Stack direction="row" spacing={1} flexWrap="wrap"><Button variant="outlined" onClick={() => exportCsv("phd-examiner-panels.csv", rows, columns.filter((c) => c.field !== "edit"))}>Export</Button><SimpleTemplateButton fields={panelFields} filename="phd-examiner-panel-template.xlsx" sheet="Panels" /><Button variant="outlined" component="label" startIcon={<UploadFileIcon />}>Bulk upload<input hidden type="file" accept=".xlsx,.xls,.csv" onChange={bulkUpload} /></Button><Button color="error" variant="outlined" disabled={!selection.length} onClick={async () => { await ep1.post("/api/v2/phd/examiner-panels-delete", { colid: global1.colid, ids: selection }); setSelection([]); loadRows(); }}>Bulk delete</Button></Stack>
        <Paper sx={{ height: 620 }}><DataGrid rows={rowsWithId(rows)} columns={columns} checkboxSelection onRowSelectionModelChange={(m) => setSelection(Array.from(m))} slots={{ toolbar: GridToolbar }} sx={gridSx} getRowHeight={() => "auto"} /></Paper>
      </Stack>
    </MenuPageShell>
  );
}

export function PhdExaminerPanelMembersPage() {
  const { options, load } = usePhdOptions();
  const [panels, setPanels] = useState([]);
  const [rows, setRows] = useState([]);
  const [filters, setFilters] = useState({});
  const [selection, setSelection] = useState([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");
  const [submitComments, setSubmitComments] = useState("");
  const [form, setForm] = useState({ panelid: "", academicyear: "", regulation: "", panelname: "", program: "", programcode: "", examinername: "", examineremail: "", designation: "", qualification: "", type: "External", specialization: "", ugteachingexp: "", pgteachingexp: "", address: "", phone: "", email: "", eligible: "Yes", approvalstatus: "Pending", comments: "" });
  const loadPanels = async () => {
    const res = await ep1.get("/api/v2/phd/examiner-panels", { params: { colid: global1.colid } });
    setPanels(res.data?.data || []);
  };
  const loadRows = async () => {
    const res = await ep1.get(`/api/v2/phd/examiner-panel-members?${queryString({ colid: global1.colid, ...filters })}`);
    setRows(res.data?.data || []);
  };
  useEffect(() => { loadPanels(); loadRows(); }, []);
  const choosePanel = (p) => setForm((prev) => ({ ...prev, panelid: p?._id || "", academicyear: p?.academicyear || "", regulation: p?.regulation || "", panelname: p?.panelname || "", program: p?.program || "", programcode: p?.programcode || "" }));
  const save = async () => {
    setBusy("save");
    await ep1.post("/api/v2/phd/examiner-panel-members", { ...form, colid: global1.colid, name: global1.name, user: global1.user });
    setForm({ panelid: "", academicyear: "", regulation: "", panelname: "", program: "", programcode: "", examinername: "", examineremail: "", designation: "", qualification: "", type: "External", specialization: "", ugteachingexp: "", pgteachingexp: "", address: "", phone: "", email: "", eligible: "Yes", approvalstatus: "Pending", comments: "" });
    loadRows(); load();
    setBusy("");
  };
  const submitPanel = async () => {
    if (!form.panelid) return;
    setBusy("submit");
    try {
      const res = await ep1.post("/api/v2/phd/examiner-panels-submit", { colid: global1.colid, id: form.panelid, comments: submitComments, name: global1.name, user: global1.user });
      setMessage(`${res.data?.submitted || 0} examiner member(s) submitted for approval.`);
      setSubmitComments("");
      await loadRows();
    } finally {
      setBusy("");
    }
  };
  const bulkUpload = async (event) => {
    const file = event.target.files?.[0]; event.target.value = ""; if (!file) return;
    const wb = XLSX.read(await file.arrayBuffer()); const items = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: "" });
    await ep1.post("/api/v2/phd/examiner-panel-members-bulk", { colid: global1.colid, name: global1.name, user: global1.user, items });
    loadRows(); load();
  };
  const columns = [...memberFields.map((field) => ({ field, headerName: fieldLabel(field), minWidth: ["address", "comments", "specialization"].includes(field) ? 220 : 135, flex: field === "address" ? 1 : undefined })), { field: "edit", headerName: "Edit", width: 90, renderCell: ({ row }) => <Button size="small" onClick={() => setForm(row)}>Edit</Button> }];
  return (
    <MenuPageShell title="Examiner panel members">
      <Stack spacing={2} sx={{ p: 2 }}>
        <Typography variant="h5" fontWeight={900}>Examiner Panel Members</Typography>
        {message && <Alert severity="success" onClose={() => setMessage("")}>{message}</Alert>}
        <Paper variant="outlined" sx={{ p: 2 }}><Grid container spacing={2}>
          <Grid item xs={12} md={5}><Autocomplete options={panels} getOptionLabel={panelLabel} onChange={(_, v) => choosePanel(v)} renderInput={(params) => <TextField {...params} size="small" label="Select examiner panel" />} /></Grid>
          {memberFields.map((field) => <Grid item xs={12} md={["address", "comments", "specialization"].includes(field) ? 6 : 3} key={field}><TextField select={["type", "eligible", "approvalstatus"].includes(field)} fullWidth multiline={["address", "comments"].includes(field)} minRows={["address", "comments"].includes(field) ? 2 : undefined} size="small" label={fieldLabel(field)} value={form[field] || ""} onChange={(e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))}>{field === "type" && ["Internal", "External"].map((x) => <MenuItem key={x} value={x}>{x}</MenuItem>)}{field === "eligible" && ["Yes", "No"].map((x) => <MenuItem key={x} value={x}>{x}</MenuItem>)}{field === "approvalstatus" && ["Pending", "Submitted", "Approved", "Rejected"].map((x) => <MenuItem key={x} value={x}>{x}</MenuItem>)}</TextField></Grid>)}
          <Grid item xs={12} md={6}><TextField fullWidth size="small" label="Submission comments" value={submitComments} onChange={(e) => setSubmitComments(e.target.value)} /></Grid>
          <Grid item xs={12} md={3}><Button fullWidth variant="contained" startIcon={<SaveIcon />} disabled={Boolean(busy)} onClick={save}>{busy === "save" ? <CircularProgress size={18} color="inherit" /> : "Save member"}</Button></Grid>
          <Grid item xs={12} md={3}><Button fullWidth variant="outlined" disabled={!form.panelid || Boolean(busy)} onClick={submitPanel}>{busy === "submit" ? <CircularProgress size={18} /> : "Submit panel for approval"}</Button></Grid>
        </Grid></Paper>
        <DynamicFilters fields={memberFields} filters={filters} setFilters={setFilters} options={options || {}} onSearch={loadRows} />
        <Stack direction="row" spacing={1} flexWrap="wrap"><Button variant="outlined" onClick={() => exportCsv("phd-panel-members.csv", rows, columns.filter((c) => c.field !== "edit"))}>Export</Button><SimpleTemplateButton fields={["panelid", ...memberFields]} filename="phd-panel-members-template.xlsx" sheet="Members" /><Button variant="outlined" component="label" startIcon={<UploadFileIcon />}>Bulk upload<input hidden type="file" accept=".xlsx,.xls,.csv" onChange={bulkUpload} /></Button><Button color="error" variant="outlined" disabled={!selection.length} onClick={async () => { await ep1.post("/api/v2/phd/examiner-panel-members-delete", { colid: global1.colid, ids: selection }); setSelection([]); loadRows(); }}>Bulk delete</Button></Stack>
        <Paper sx={{ height: 650 }}><DataGrid rows={rowsWithId(rows)} columns={columns} checkboxSelection onRowSelectionModelChange={(m) => setSelection(Array.from(m))} slots={{ toolbar: GridToolbar }} sx={gridSx} getRowHeight={() => "auto"} /></Paper>
      </Stack>
    </MenuPageShell>
  );
}

export function PhdExaminerPanelWorkflowPage() {
  const { options, programs, users } = usePhdOptions();
  const [rows, setRows] = useState([]);
  const [filters, setFilters] = useState({});
  const [selection, setSelection] = useState([]);
  const [busy, setBusy] = useState("");
  const [form, setForm] = useState({ academicyear: "", regulation: "", program: "", programcode: "", level: 1, role: "", approvername: "", approveremail: "", status: "Active", remarks: "" });
  const loadRows = async () => {
    setBusy("load");
    try {
      const res = await ep1.get(`/api/v2/phd/examiner-panel-workflows?${queryString({ colid: global1.colid, ...filters })}`);
      setRows(res.data?.data || []);
    } finally {
      setBusy("");
    }
  };
  useEffect(() => { loadRows(); }, []);
  const chooseProgram = (p) => setForm((prev) => ({ ...prev, academicyear: p?.academicyear || prev.academicyear, regulation: p?.regulation || prev.regulation, program: p?.program || "", programcode: p?.programcode || "" }));
  const chooseApprover = (u) => setForm((prev) => ({ ...prev, approvername: u?.name || "", approveremail: u?.email || u?.user || "", role: u?.role || prev.role }));
  const save = async () => {
    setBusy("save");
    try {
      await ep1.post("/api/v2/phd/examiner-panel-workflows", { ...form, colid: global1.colid, name: global1.name, user: global1.user });
      setForm({ academicyear: "", regulation: "", program: "", programcode: "", level: 1, role: "", approvername: "", approveremail: "", status: "Active", remarks: "" });
      await loadRows();
    } finally {
      setBusy("");
    }
  };
  const bulkUpload = async (event) => {
    const file = event.target.files?.[0]; event.target.value = ""; if (!file) return;
    setBusy("upload");
    try {
      const wb = XLSX.read(await file.arrayBuffer()); const items = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: "" });
      await Promise.all(items.map((item) => ep1.post("/api/v2/phd/examiner-panel-workflows", { ...item, colid: global1.colid, name: global1.name, user: global1.user })));
      await loadRows();
    } finally {
      setBusy("");
    }
  };
  const deleteRows = async () => {
    setBusy("delete");
    try {
      await ep1.post("/api/v2/phd/examiner-panel-workflows-delete", { colid: global1.colid, ids: selection });
      setSelection([]);
      await loadRows();
    } finally {
      setBusy("");
    }
  };
  const cols = workflowFields.map((field) => ({ field, headerName: fieldLabel(field), minWidth: field === "remarks" ? 220 : 140, flex: field === "remarks" ? 1 : undefined }));
  return (
    <MenuPageShell title="Examiner panel workflow">
      <Stack spacing={2} sx={{ p: 2 }}>
        <Typography variant="h5" fontWeight={900}>Examiner Panel Approval Workflow</Typography>
        <Paper variant="outlined" sx={{ p: 2 }}><Grid container spacing={2}>
          <Grid item xs={12} md={4}><Autocomplete options={programs || []} getOptionLabel={programLabel} onChange={(_, v) => chooseProgram(v)} renderInput={(params) => <TextField {...params} size="small" label="Program" />} /></Grid>
          <Grid item xs={12} md={4}><Autocomplete options={users || []} getOptionLabel={userLabel} onChange={(_, v) => chooseApprover(v)} renderInput={(params) => <TextField {...params} size="small" label="Approver" />} /></Grid>
          {workflowFields.map((field) => <Grid item xs={12} md={field === "remarks" ? 6 : 3} key={field}><TextField fullWidth size="small" multiline={field === "remarks"} minRows={field === "remarks" ? 2 : undefined} label={fieldLabel(field)} value={form[field] || ""} onChange={(e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))} /></Grid>)}
          <Grid item xs={12} md={3}><Button fullWidth variant="contained" disabled={Boolean(busy)} onClick={save}>{busy === "save" ? <CircularProgress size={18} color="inherit" /> : "Save workflow"}</Button></Grid>
        </Grid></Paper>
        <DynamicFilters fields={workflowFields} filters={filters} setFilters={setFilters} options={options || {}} onSearch={loadRows} />
        <Stack direction="row" spacing={1} flexWrap="wrap">
          <Button variant="outlined" onClick={() => exportCsv("phd-examiner-panel-workflow.csv", rows, cols)}>Export</Button>
          <SimpleTemplateButton fields={workflowFields} filename="phd-examiner-panel-workflow-template.xlsx" sheet="Workflow" />
          <Button variant="outlined" component="label" startIcon={<UploadFileIcon />} disabled={Boolean(busy)}>Bulk upload<input hidden type="file" accept=".xlsx,.xls,.csv" onChange={bulkUpload} /></Button>
          <Button color="error" variant="outlined" disabled={!selection.length || Boolean(busy)} onClick={deleteRows}>{busy === "delete" ? <CircularProgress size={18} /> : "Bulk delete"}</Button>
        </Stack>
        <Paper sx={{ height: 620 }}><DataGrid loading={busy === "load"} rows={rowsWithId(rows)} columns={cols} checkboxSelection rowSelectionModel={selection} onRowSelectionModelChange={(m) => setSelection(Array.from(m))} slots={{ toolbar: GridToolbar }} sx={gridSx} getRowHeight={() => "auto"} /></Paper>
      </Stack>
    </MenuPageShell>
  );
}

export function PhdExaminerPanelMemberApprovalPage() {
  const { options } = usePhdOptions();
  const [panels, setPanels] = useState([]);
  const [rows, setRows] = useState([]);
  const [filters, setFilters] = useState({});
  const [selection, setSelection] = useState([]);
  const [comments, setComments] = useState("");
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const loadRows = async () => {
    setBusy("load");
    try {
      const res = await ep1.get(`/api/v2/phd/examiner-panel-approvals?${queryString({ colid: global1.colid, user: global1.user, finalOnly: "No", ...filters })}`);
      setRows(res.data?.data || []);
      setPanels(res.data?.panels || []);
      setSelection([]);
    } finally {
      setBusy("");
    }
  };
  useEffect(() => { loadRows(); }, []);
  const action = async (actionName) => {
    if (!selection.length) return;
    setBusy(actionName.toLowerCase());
    try {
      const res = await ep1.post("/api/v2/phd/examiner-panel-approval-action", { colid: global1.colid, ids: selection, action: actionName, comments, name: global1.name, user: global1.user });
      setMessage(`${res.data?.updated || 0} member(s) ${actionName.toLowerCase()}d.`);
      setComments("");
      await loadRows();
    } finally {
      setBusy("");
    }
  };
  const cols = memberApprovalFields.map((field) => ({ field, headerName: fieldLabel(field), minWidth: ["address", "comments", "useremail", "currentapproveremail"].includes(field) ? 220 : 140, flex: field === "address" ? 1 : undefined }));
  const panelCols = panelFields.map((field) => ({ field, headerName: fieldLabel(field), minWidth: field === "description" ? 240 : 140, flex: field === "description" ? 1 : undefined }));
  return (
    <MenuPageShell title="Examiner panel member approval">
      <Stack spacing={2} sx={{ p: 2 }}>
        <Typography variant="h5" fontWeight={900}>Examiner Panel Member Approval</Typography>
        {message && <Alert severity="success" onClose={() => setMessage("")}>{message}</Alert>}
        <DynamicFilters fields={memberApprovalFields} filters={filters} setFilters={setFilters} options={options || {}} onSearch={loadRows} />
        <Paper variant="outlined" sx={{ p: 2 }}><Grid container spacing={2}>
          <Grid item xs={12}><TextField fullWidth multiline minRows={2} label="Approval / rejection comments" value={comments} onChange={(e) => setComments(e.target.value)} /></Grid>
          <Grid item xs={12} md={3}><Button fullWidth variant="contained" disabled={!selection.length || Boolean(busy)} onClick={() => action("Approve")}>{busy === "approve" ? <CircularProgress size={18} color="inherit" /> : "Approve selected members"}</Button></Grid>
          <Grid item xs={12} md={3}><Button fullWidth color="error" variant="outlined" disabled={!selection.length || Boolean(busy)} onClick={() => action("Reject")}>{busy === "reject" ? <CircularProgress size={18} /> : "Reject selected members"}</Button></Grid>
        </Grid></Paper>
        <Typography fontWeight={800}>Panels Pending At Your Level</Typography>
        <Paper sx={{ height: 250 }}><DataGrid loading={busy === "load"} rows={rowsWithId(panels)} columns={panelCols} slots={{ toolbar: GridToolbar }} sx={gridSx} getRowHeight={() => "auto"} /></Paper>
        <Typography fontWeight={800}>Members Pending At Your Level</Typography>
        <Paper sx={{ height: 620 }}><DataGrid loading={busy === "load"} rows={rowsWithId(rows)} columns={cols} checkboxSelection rowSelectionModel={selection} onRowSelectionModelChange={(m) => setSelection(Array.from(m))} slots={{ toolbar: GridToolbar }} sx={gridSx} getRowHeight={() => "auto"} /></Paper>
      </Stack>
    </MenuPageShell>
  );
}

export function PhdPanelApprovalPage() {
  const { options, institution } = usePhdOptions();
  const [panels, setPanels] = useState([]);
  const [rows, setRows] = useState([]);
  const [selection, setSelection] = useState([]);
  const [comments, setComments] = useState("");
  const [filters, setFilters] = useState({});
  const [includeCredentials, setIncludeCredentials] = useState(false);
  const [emailContent, setEmailContent] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const loadPanels = async () => { const res = await ep1.get("/api/v2/phd/examiner-panels", { params: { colid: global1.colid, approvalstatus: "Submitted" } }); setPanels(res.data?.data || []); };
  const loadRows = async (extra = {}) => {
    const res = await ep1.get(`/api/v2/phd/examiner-panel-approvals?${queryString({ colid: global1.colid, user: global1.user, finalOnly: "Yes", ...filters, ...extra })}`);
    setRows(res.data?.data || []);
  };
  useEffect(() => { loadPanels(); loadRows(); }, []);
  useEffect(() => {
    if (!emailContent) setEmailContent(defaultAppointmentContent(rows[0] || {}, institution, includeCredentials));
  }, [rows, institution, includeCredentials, emailContent]);
  const resetAppointmentContent = () => setEmailContent(defaultAppointmentContent(rows.find((row) => selection.includes(row._id)) || rows[0] || {}, institution, includeCredentials));
  const sendBulkEmail = async () => {
    setMessage(""); setError("");
    setBusy("email");
    try {
      const res = await ep1.post("/api/v2/phd/examiner-panel-members-email", { colid: global1.colid, ids: selection, includeCredentials: includeCredentials ? "Yes" : "No", emailContent });
      setMessage(`Appointment email sent to ${res.data?.sent || 0} examiner(s). ${res.data?.failed?.length || 0} failed.`);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Unable to send appointment emails.");
    } finally {
      setBusy("");
    }
  };
  const approveSelected = async () => {
    setMessage(""); setError("");
    setBusy("approve");
    try {
      const res = await ep1.post("/api/v2/phd/examiner-panel-approval-action", { colid: global1.colid, ids: selection, action: "Approve", comments, name: global1.name, user: global1.user });
      setMessage(`${res.data?.updated || 0} examiner(s) approved and linked to user login.`);
      setSelection([]); setComments(""); loadRows();
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Unable to approve panel members.");
    } finally {
      setBusy("");
    }
  };
  const rejectSelected = async () => {
    setMessage(""); setError("");
    setBusy("reject");
    try {
      const res = await ep1.post("/api/v2/phd/examiner-panel-approval-action", { colid: global1.colid, ids: selection, action: "Reject", comments, name: global1.name, user: global1.user });
      setMessage(`${res.data?.updated || 0} examiner(s) rejected.`);
      setSelection([]); setComments(""); loadRows();
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Unable to reject panel members.");
    } finally {
      setBusy("");
    }
  };
  const cols = [
    ...memberApprovalFields.map((field) => ({ field, headerName: fieldLabel(field), minWidth: ["address", "comments", "useremail"].includes(field) ? 220 : 140, flex: field === "address" ? 1 : undefined })),
    { field: "appointment", headerName: "Appointment", width: 155, renderCell: ({ row }) => /^Approved$/i.test(row.approvalstatus) ? <Button size="small" startIcon={<PrintIcon />} onClick={() => printAppointmentLetter(row, institution, includeCredentials, emailContent)}>Print</Button> : "" }
  ];
  return (
    <MenuPageShell title="Panel approval">
      <Stack spacing={2} sx={{ p: 2 }}>
        <Typography variant="h5" fontWeight={900}>Final Examiner Panel Approval</Typography>
        {message && <Alert severity="success" onClose={() => setMessage("")}>{message}</Alert>}
        {error && <Alert severity="error" onClose={() => setError("")}>{error}</Alert>}
        <Paper variant="outlined" sx={{ p: 2 }}><Grid container spacing={2}><Grid item xs={12} md={5}><Autocomplete options={panels} getOptionLabel={panelLabel} onChange={(_, v) => loadRows({ panelid: v?._id || "" })} renderInput={(params) => <TextField {...params} size="small" label="Select panel" />} /></Grid><Grid item xs={12} md={7}><TextField fullWidth size="small" label="Approval comments" value={comments} onChange={(e) => setComments(e.target.value)} /></Grid><Grid item xs={12} md={3}><FormControlLabel control={<Checkbox checked={includeCredentials} onChange={(e) => setIncludeCredentials(e.target.checked)} />} label="Include username/password" /></Grid><Grid item xs={12} md={3}><Button fullWidth variant="outlined" disabled={Boolean(busy)} onClick={resetAppointmentContent}>Load default letter content</Button></Grid><Grid item xs={12} md={3}><Button fullWidth variant="contained" disabled={!selection.length || Boolean(busy)} onClick={approveSelected}>{busy === "approve" ? <CircularProgress size={18} color="inherit" /> : "Approve selected members"}</Button></Grid><Grid item xs={12} md={3}><Button fullWidth color="error" variant="outlined" disabled={!selection.length || Boolean(busy)} onClick={rejectSelected}>{busy === "reject" ? <CircularProgress size={18} /> : "Reject selected members"}</Button></Grid><Grid item xs={12} md={3}><Button fullWidth variant="outlined" disabled={!selection.length || Boolean(busy)} onClick={sendBulkEmail}>{busy === "email" ? <CircularProgress size={18} /> : "Send appointment email"}</Button></Grid><Grid item xs={12}><TextField fullWidth multiline minRows={12} label="Appointment email content" value={emailContent} onChange={(e) => setEmailContent(e.target.value)} helperText="Use placeholders such as {{examinername}}, {{program}}, {{programcode}}, {{institutionname}}, {{institutionemail}}, {{username}}, {{password}}. The same content is used for print and email." /></Grid></Grid></Paper>
        <DynamicFilters fields={memberApprovalFields} filters={filters} setFilters={setFilters} options={options || {}} onSearch={loadRows} />
        <Paper sx={{ height: 680 }}><DataGrid rows={rowsWithId(rows)} columns={cols} checkboxSelection rowSelectionModel={selection} onRowSelectionModelChange={(m) => setSelection(Array.from(m))} slots={{ toolbar: GridToolbar }} sx={gridSx} getRowHeight={() => "auto"} /></Paper>
      </Stack>
    </MenuPageShell>
  );
}

export function PhdOralDefensePanelPage() {
  const { options, programs, load } = usePhdOptions();
  const [panels, setPanels] = useState([]);
  const [sourceMembers, setSourceMembers] = useState([]);
  const [members, setMembers] = useState([]);
  const [filters, setFilters] = useState({});
  const [panel, setPanel] = useState(null);
  const [form, setForm] = useState({ academicyear: "", regulation: "", program: "", programcode: "", panelname: "", description: "", approvalstatus: "Draft", status: "Active" });
  const [selection, setSelection] = useState([]);
  const [memberSelection, setMemberSelection] = useState([]);
  const [memberDeleteSelection, setMemberDeleteSelection] = useState([]);
  const [orders, setOrders] = useState({});
  const [comments, setComments] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");
  const loadPanels = async () => {
    setBusy("load");
    try {
      const res = await ep1.get(`/api/v2/phd/oral-defense-panels?${queryString({ colid: global1.colid, ...filters })}`);
      setPanels(res.data?.data || []);
    } finally {
      setBusy("");
    }
  };
  const loadSourceMembers = async (selectedPanel = panel) => {
    const res = await ep1.get(`/api/v2/phd/examiner-panel-members?${queryString({ colid: global1.colid, academicyear: selectedPanel?.academicyear || "", regulation: selectedPanel?.regulation || "", program: selectedPanel?.program || "", programcode: selectedPanel?.programcode || "", approvalstatus: "Approved", eligible: "Yes" })}`);
    setSourceMembers(res.data?.data || []);
  };
  const loadMembers = async (selectedPanel = panel) => {
    if (!selectedPanel?._id) { setMembers([]); return; }
    const res = await ep1.get("/api/v2/phd/oral-defense-panel-members", { params: { colid: global1.colid, oralpanelid: selectedPanel._id } });
    setMembers(res.data?.data || []);
  };
  useEffect(() => { loadPanels(); }, []);
  const chooseProgram = (p) => setForm((prev) => ({ ...prev, academicyear: p?.academicyear || prev.academicyear, regulation: p?.regulation || prev.regulation, program: p?.program || "", programcode: p?.programcode || "" }));
  const choosePanel = async (row) => {
    setPanel(row || null);
    setForm(row?._id ? { ...row } : { academicyear: "", regulation: "", program: "", programcode: "", panelname: "", description: "", approvalstatus: "Draft", status: "Active" });
    setMemberSelection([]);
    setMemberDeleteSelection([]);
    setOrders({});
    await loadSourceMembers(row);
    await loadMembers(row);
  };
  const save = async () => {
    setBusy("save");
    try {
      const res = await ep1.post("/api/v2/phd/oral-defense-panels", { ...form, colid: global1.colid, name: global1.name, user: global1.user });
      setMessage("Oral defense panel saved.");
      setPanel(res.data?.data || null);
      setForm(res.data?.data || form);
      await loadPanels();
      load();
    } finally {
      setBusy("");
    }
  };
  const addMembers = async () => {
    if (!panel?._id) return;
    setBusy("members");
    try {
      await ep1.post("/api/v2/phd/oral-defense-panel-members", { colid: global1.colid, oralpanelid: panel._id, memberids: memberSelection, preferenceorders: orders, name: global1.name, user: global1.user });
      setMessage("Selected examiner(s) added to oral defense panel.");
      setMemberSelection([]);
      setOrders({});
      await loadMembers(panel);
    } finally {
      setBusy("");
    }
  };
  const submitPanel = async () => {
    if (!panel?._id) return;
    setBusy("submit");
    try {
      await ep1.post("/api/v2/phd/oral-defense-panels-submit", { colid: global1.colid, id: panel._id, comments, name: global1.name, user: global1.user });
      setMessage("Oral defense panel submitted for approval.");
      setComments("");
      await loadPanels();
      await choosePanel({ ...panel, approvalstatus: "Submitted" });
    } finally {
      setBusy("");
    }
  };
  const deletePanels = async () => {
    setBusy("delete");
    try {
      await ep1.post("/api/v2/phd/oral-defense-panels-delete", { colid: global1.colid, ids: selection });
      setSelection([]);
      await loadPanels();
    } finally {
      setBusy("");
    }
  };
  const deleteMembers = async () => {
    setBusy("memberdelete");
    try {
      await ep1.post("/api/v2/phd/oral-defense-panel-members-delete", { colid: global1.colid, ids: memberDeleteSelection });
      setMemberDeleteSelection([]);
      await loadMembers(panel);
    } finally {
      setBusy("");
    }
  };
  const sourceCols = [
    ...["panelname", "examinername", "examineremail", "designation", "type", "specialization", "useremail"].map((field) => ({ field, headerName: fieldLabel(field), minWidth: ["examineremail", "specialization"].includes(field) ? 220 : 150, flex: field === "specialization" ? 1 : undefined })),
    { field: "preferenceorder", headerName: "Preference order", width: 160, renderCell: ({ row }) => <TextField size="small" type="number" value={orders[row._id] || ""} onChange={(e) => setOrders((prev) => ({ ...prev, [row._id]: e.target.value }))} /> }
  ];
  const panelCols = [...oralPanelFields.map((field) => ({ field, headerName: fieldLabel(field), minWidth: ["description", "comments"].includes(field) ? 240 : 140, flex: field === "description" ? 1 : undefined })), { field: "edit", headerName: "Select", width: 100, renderCell: ({ row }) => <Button size="small" disabled={Boolean(busy)} onClick={() => choosePanel(row)}>Select</Button> }];
  const memberCols = oralPanelMemberFields.map((field) => ({ field, headerName: fieldLabel(field), minWidth: ["examineremail", "specialization", "comments"].includes(field) ? 220 : 135, flex: field === "comments" ? 1 : undefined }));
  return (
    <MenuPageShell title="Oral defense panel">
      <Stack spacing={2} sx={{ p: 2 }}>
        <Typography variant="h5" fontWeight={900}>Oral Defense Panel</Typography>
        {message && <Alert severity="success" onClose={() => setMessage("")}>{message}</Alert>}
        <Paper variant="outlined" sx={{ p: 2 }}><Grid container spacing={2}>
          <Grid item xs={12} md={4}><Autocomplete options={programs || []} getOptionLabel={programLabel} onChange={(_, v) => chooseProgram(v)} renderInput={(params) => <TextField {...params} size="small" label="Program" />} /></Grid>
          {["academicyear", "regulation", "program", "programcode", "panelname", "description", "approvalstatus", "status"].map((field) => <Grid item xs={12} md={field === "description" ? 6 : 3} key={field}><TextField fullWidth disabled={["approvalstatus"].includes(field)} multiline={field === "description"} minRows={field === "description" ? 2 : undefined} size="small" label={fieldLabel(field)} value={form[field] || ""} onChange={(e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))} /></Grid>)}
          <Grid item xs={12} md={3}><Button fullWidth variant="contained" startIcon={<SaveIcon />} disabled={Boolean(busy)} onClick={save}>{busy === "save" ? <CircularProgress size={18} color="inherit" /> : "Save panel"}</Button></Grid>
          <Grid item xs={12} md={3}><TextField fullWidth size="small" label="Submission comments" value={comments} onChange={(e) => setComments(e.target.value)} /></Grid>
          <Grid item xs={12} md={3}><Button fullWidth variant="outlined" disabled={!panel?._id || Boolean(busy) || /^Approved$/i.test(panel?.approvalstatus)} onClick={submitPanel}>{busy === "submit" ? <CircularProgress size={18} /> : "Submit for approval"}</Button></Grid>
        </Grid></Paper>
        <DynamicFilters fields={oralPanelFields} filters={filters} setFilters={setFilters} options={options || {}} onSearch={loadPanels} />
        <Stack direction="row" spacing={1} flexWrap="wrap"><Button variant="outlined" onClick={() => exportCsv("phd-oral-defense-panels.csv", panels, panelCols.filter((c) => c.field !== "edit"))}>Export</Button><Button color="error" variant="outlined" disabled={!selection.length || Boolean(busy)} onClick={deletePanels}>{busy === "delete" ? <CircularProgress size={18} /> : "Bulk delete"}</Button></Stack>
        <Paper sx={{ height: 380 }}><DataGrid loading={busy === "load"} rows={rowsWithId(panels)} columns={panelCols} checkboxSelection rowSelectionModel={selection} onRowSelectionModelChange={(m) => setSelection(Array.from(m))} slots={{ toolbar: GridToolbar }} sx={gridSx} getRowHeight={() => "auto"} /></Paper>
        <Typography fontWeight={800}>Add Members From Approved Examiner Panel</Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap"><Button variant="outlined" disabled={!panel?._id || Boolean(busy)} onClick={() => loadSourceMembers(panel)}>Load examiner panel members</Button><Button variant="contained" disabled={!panel?._id || !memberSelection.length || Boolean(busy)} onClick={addMembers}>{busy === "members" ? <CircularProgress size={18} color="inherit" /> : "Add selected members"}</Button></Stack>
        <Paper sx={{ height: 360 }}><DataGrid rows={rowsWithId(sourceMembers)} columns={sourceCols} checkboxSelection rowSelectionModel={memberSelection} onRowSelectionModelChange={(m) => setMemberSelection(Array.from(m))} slots={{ toolbar: GridToolbar }} sx={gridSx} getRowHeight={() => "auto"} /></Paper>
        <Typography fontWeight={800}>Oral Defense Panel Members</Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap"><Button color="error" variant="outlined" disabled={!memberDeleteSelection.length || Boolean(busy)} onClick={deleteMembers}>{busy === "memberdelete" ? <CircularProgress size={18} /> : "Bulk delete members"}</Button></Stack>
        <Paper sx={{ height: 360 }}><DataGrid rows={rowsWithId(members)} columns={memberCols} checkboxSelection rowSelectionModel={memberDeleteSelection} onRowSelectionModelChange={(m) => setMemberDeleteSelection(Array.from(m))} slots={{ toolbar: GridToolbar }} sx={gridSx} getRowHeight={() => "auto"} /></Paper>
      </Stack>
    </MenuPageShell>
  );
}

export function PhdOralDefensePanelWorkflowPage() {
  const { options, programs, users } = usePhdOptions();
  const [rows, setRows] = useState([]);
  const [filters, setFilters] = useState({});
  const [selection, setSelection] = useState([]);
  const [busy, setBusy] = useState("");
  const [form, setForm] = useState({ academicyear: "", regulation: "", program: "", programcode: "", level: 1, role: "", approvername: "", approveremail: "", status: "Active", remarks: "" });
  const loadRows = async () => {
    setBusy("load");
    try {
      const res = await ep1.get(`/api/v2/phd/oral-panel-workflows?${queryString({ colid: global1.colid, ...filters })}`);
      setRows(res.data?.data || []);
    } finally {
      setBusy("");
    }
  };
  useEffect(() => { loadRows(); }, []);
  const chooseProgram = (p) => setForm((prev) => ({ ...prev, academicyear: p?.academicyear || prev.academicyear, regulation: p?.regulation || prev.regulation, program: p?.program || "", programcode: p?.programcode || "" }));
  const chooseApprover = (u) => setForm((prev) => ({ ...prev, approvername: u?.name || "", approveremail: u?.email || u?.user || "", role: u?.role || prev.role }));
  const save = async () => {
    setBusy("save");
    try {
      await ep1.post("/api/v2/phd/oral-panel-workflows", { ...form, colid: global1.colid, name: global1.name, user: global1.user });
      setForm({ academicyear: "", regulation: "", program: "", programcode: "", level: 1, role: "", approvername: "", approveremail: "", status: "Active", remarks: "" });
      await loadRows();
    } finally {
      setBusy("");
    }
  };
  const deleteRows = async () => {
    setBusy("delete");
    try {
      await ep1.post("/api/v2/phd/oral-panel-workflows-delete", { colid: global1.colid, ids: selection });
      setSelection([]);
      await loadRows();
    } finally {
      setBusy("");
    }
  };
  const cols = workflowFields.map((field) => ({ field, headerName: fieldLabel(field), minWidth: field === "remarks" ? 220 : 140, flex: field === "remarks" ? 1 : undefined }));
  return (
    <MenuPageShell title="Oral defense panel workflow">
      <Stack spacing={2} sx={{ p: 2 }}>
        <Typography variant="h5" fontWeight={900}>Oral Defense Panel Approval Workflow</Typography>
        <Paper variant="outlined" sx={{ p: 2 }}><Grid container spacing={2}>
          <Grid item xs={12} md={4}><Autocomplete options={programs || []} getOptionLabel={programLabel} onChange={(_, v) => chooseProgram(v)} renderInput={(params) => <TextField {...params} size="small" label="Program" />} /></Grid>
          <Grid item xs={12} md={4}><Autocomplete options={users || []} getOptionLabel={userLabel} onChange={(_, v) => chooseApprover(v)} renderInput={(params) => <TextField {...params} size="small" label="Approver" />} /></Grid>
          {workflowFields.map((field) => <Grid item xs={12} md={field === "remarks" ? 6 : 3} key={field}><TextField fullWidth size="small" multiline={field === "remarks"} minRows={field === "remarks" ? 2 : undefined} label={fieldLabel(field)} value={form[field] || ""} onChange={(e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))} /></Grid>)}
          <Grid item xs={12} md={3}><Button fullWidth variant="contained" disabled={Boolean(busy)} onClick={save}>{busy === "save" ? <CircularProgress size={18} color="inherit" /> : "Save workflow"}</Button></Grid>
        </Grid></Paper>
        <DynamicFilters fields={workflowFields} filters={filters} setFilters={setFilters} options={options || {}} onSearch={loadRows} />
        <Stack direction="row" spacing={1}><Button color="error" variant="outlined" disabled={!selection.length || Boolean(busy)} onClick={deleteRows}>{busy === "delete" ? <CircularProgress size={18} /> : "Bulk delete"}</Button></Stack>
        <Paper sx={{ height: 620 }}><DataGrid loading={busy === "load"} rows={rowsWithId(rows)} columns={cols} checkboxSelection rowSelectionModel={selection} onRowSelectionModelChange={(m) => setSelection(Array.from(m))} slots={{ toolbar: GridToolbar }} sx={gridSx} getRowHeight={() => "auto"} /></Paper>
      </Stack>
    </MenuPageShell>
  );
}

export function PhdOralDefensePanelApprovalPage() {
  const { options } = usePhdOptions();
  const [panels, setPanels] = useState([]);
  const [members, setMembers] = useState([]);
  const [filters, setFilters] = useState({});
  const [panel, setPanel] = useState(null);
  const [selection, setSelection] = useState([]);
  const [orders, setOrders] = useState({});
  const [comments, setComments] = useState("");
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const loadRows = async () => {
    setBusy("load");
    try {
      const res = await ep1.get(`/api/v2/phd/oral-defense-panel-approvals?${queryString({ colid: global1.colid, user: global1.user, role: global1.role, ...filters })}`);
      setPanels(res.data?.data || []);
      setPanel(null);
      setMembers([]);
      setSelection([]);
      setOrders({});
    } finally {
      setBusy("");
    }
  };
  useEffect(() => { loadRows(); }, []);
  const loadMembers = async (selectedPanel) => {
    setPanel(selectedPanel || null);
    setMembers([]);
    setSelection([]);
    setOrders({});
    if (!selectedPanel?._id) return;
    setBusy("members");
    try {
      const res = await ep1.get("/api/v2/phd/oral-defense-panel-members", { params: { colid: global1.colid, oralpanelid: selectedPanel._id, approvalstatus: "Submitted" } });
      const data = res.data?.data || [];
      setMembers(data);
      setOrders(data.reduce((acc, row) => ({ ...acc, [row._id]: row.preferenceorder || "" }), {}));
    } finally {
      setBusy("");
    }
  };
  const action = async (actionName) => {
    if (!panel?._id || !selection.length) return;
    setBusy(actionName.toLowerCase());
    try {
      const res = await ep1.post("/api/v2/phd/oral-defense-panel-approval-action", { colid: global1.colid, id: panel._id, memberids: selection, preferenceorders: orders, action: actionName, comments, name: global1.name, user: global1.user });
      setMessage(`${res.data?.updated || 0} member(s) ${actionName.toLowerCase()}d.`);
      setComments("");
      await loadMembers(panel);
      await loadRows();
    } finally {
      setBusy("");
    }
  };
  const panelCols = oralPanelFields.map((field) => ({ field, headerName: fieldLabel(field), minWidth: ["description", "comments"].includes(field) ? 240 : 140, flex: field === "description" ? 1 : undefined }));
  const memberCols = [
    ...oralPanelMemberFields.filter((field) => !["preferenceorder"].includes(field)).map((field) => ({ field, headerName: fieldLabel(field), minWidth: ["examineremail", "specialization", "comments", "currentapproveremail"].includes(field) ? 220 : 135, flex: field === "comments" ? 1 : undefined })),
    { field: "preferenceorder", headerName: "Preference order", width: 165, renderCell: ({ row }) => <TextField size="small" type="number" value={orders[row._id] || ""} onChange={(e) => setOrders((prev) => ({ ...prev, [row._id]: e.target.value }))} /> }
  ];
  return (
    <MenuPageShell title="Oral defense panel approval">
      <Stack spacing={2} sx={{ p: 2 }}>
        <Typography variant="h5" fontWeight={900}>Oral Defense Panel Member Approval</Typography>
        {message && <Alert severity="success" onClose={() => setMessage("")}>{message}</Alert>}
        <DynamicFilters fields={["academicyear", "regulation", "program", "programcode", "panelname", "approvalstatus", "currentapprovername", "currentapproveremail"]} filters={filters} setFilters={setFilters} options={options || {}} onSearch={loadRows} />
        <Paper variant="outlined" sx={{ p: 2 }}><Grid container spacing={2}>
          <Grid item xs={12} md={8}><Autocomplete loading={busy === "load"} options={panels} getOptionLabel={panelLabel} value={panel} onChange={(_, v) => loadMembers(v)} renderInput={(params) => <TextField {...params} size="small" label="Select pending oral defense panel" />} /></Grid>
          <Grid item xs={12} md={4}><Button fullWidth variant="outlined" disabled={Boolean(busy)} onClick={loadRows}>{busy === "load" ? <CircularProgress size={18} /> : "Load pending panels"}</Button></Grid>
          <Grid item xs={12}><TextField fullWidth multiline minRows={2} label="Approval / rejection comments" value={comments} onChange={(e) => setComments(e.target.value)} /></Grid>
          <Grid item xs={12} md={3}><Button fullWidth variant="contained" disabled={!panel?._id || !selection.length || Boolean(busy)} onClick={() => action("Approve")}>{busy === "approve" ? <CircularProgress size={18} color="inherit" /> : "Approve selected members"}</Button></Grid>
          <Grid item xs={12} md={3}><Button fullWidth color="error" variant="outlined" disabled={!panel?._id || !selection.length || Boolean(busy)} onClick={() => action("Reject")}>{busy === "reject" ? <CircularProgress size={18} /> : "Reject selected members"}</Button></Grid>
        </Grid></Paper>
        <Typography fontWeight={800}>Pending Oral Defense Panels</Typography>
        <Paper sx={{ height: 260 }}><DataGrid loading={busy === "load"} rows={rowsWithId(panels)} columns={panelCols} slots={{ toolbar: GridToolbar }} sx={gridSx} getRowHeight={() => "auto"} /></Paper>
        <Typography fontWeight={800}>Panel Members Pending At Your Level</Typography>
        <Paper sx={{ height: 520 }}><DataGrid loading={busy === "members"} rows={rowsWithId(members)} columns={memberCols} checkboxSelection rowSelectionModel={selection} onRowSelectionModelChange={(m) => setSelection(Array.from(m))} slots={{ toolbar: GridToolbar }} sx={gridSx} getRowHeight={() => "auto"} /></Paper>
      </Stack>
    </MenuPageShell>
  );
}

export function PhdExaminerRubricsPage() {
  const { options, programs, load } = usePhdOptions();
  const [rows, setRows] = useState([]);
  const [filters, setFilters] = useState({});
  const [selection, setSelection] = useState([]);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({ academicyear: "", regulation: "", program: "", programcode: "", group: "", topic: "", status: "Active" });
  const loadRows = async () => {
    const res = await ep1.get(`/api/v2/phd/examiner-rubrics?${queryString({ colid: global1.colid, ...filters })}`);
    setRows(res.data?.data || []);
  };
  useEffect(() => { loadRows(); }, []);
  const chooseProgram = (p) => setForm((prev) => ({ ...prev, academicyear: p?.academicyear || prev.academicyear, regulation: p?.regulation || prev.regulation, program: p?.program || "", programcode: p?.programcode || "" }));
  const save = async () => {
    await ep1.post("/api/v2/phd/examiner-rubrics", { ...form, colid: global1.colid, name: global1.name, user: global1.user });
    setMessage("Rubric saved.");
    setForm({ academicyear: "", regulation: "", program: "", programcode: "", group: "", topic: "", status: "Active" });
    loadRows(); load();
  };
  const bulkUpload = async (event) => {
    const file = event.target.files?.[0]; event.target.value = ""; if (!file) return;
    const wb = XLSX.read(await file.arrayBuffer()); const items = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: "" });
    await ep1.post("/api/v2/phd/examiner-rubrics-bulk", { colid: global1.colid, name: global1.name, user: global1.user, items });
    setMessage(`${items.length} rubric row(s) uploaded.`);
    loadRows(); load();
  };
  const columns = [...rubricFields.map((field) => ({ field, headerName: fieldLabel(field), minWidth: field === "topic" ? 260 : 140, flex: field === "topic" ? 1 : undefined })), { field: "edit", headerName: "Edit", width: 90, renderCell: ({ row }) => <Button size="small" onClick={() => setForm(row)}>Edit</Button> }];
  return (
    <MenuPageShell title="Examiner assessment rubrics">
      <Stack spacing={2} sx={{ p: 2 }}>
        <Typography variant="h5" fontWeight={900}>Examiner Assessment Rubrics</Typography>
        {message && <Alert severity="success" onClose={() => setMessage("")}>{message}</Alert>}
        <Paper variant="outlined" sx={{ p: 2 }}><Grid container spacing={2}>
          <Grid item xs={12} md={4}><Autocomplete options={programs || []} getOptionLabel={programLabel} onChange={(_, v) => chooseProgram(v)} renderInput={(params) => <TextField {...params} size="small" label="Program" />} /></Grid>
          {rubricFields.map((field) => <Grid item xs={12} md={field === "topic" ? 6 : 3} key={field}><TextField fullWidth size="small" label={fieldLabel(field)} value={form[field] || ""} onChange={(e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))} /></Grid>)}
          <Grid item xs={12}><Button variant="contained" startIcon={<SaveIcon />} onClick={save}>Save rubric</Button></Grid>
        </Grid></Paper>
        <DynamicFilters fields={rubricFields} filters={filters} setFilters={setFilters} options={options || {}} onSearch={loadRows} />
        <Stack direction="row" spacing={1} flexWrap="wrap"><Button variant="outlined" onClick={() => exportCsv("phd-examiner-rubrics.csv", rows, columns.filter((c) => c.field !== "edit"))}>Export</Button><SimpleTemplateButton fields={rubricFields} filename="phd-examiner-rubrics-template.xlsx" sheet="Rubrics" /><Button variant="outlined" component="label" startIcon={<UploadFileIcon />}>Bulk upload<input hidden type="file" accept=".xlsx,.xls,.csv" onChange={bulkUpload} /></Button><Button color="error" variant="outlined" disabled={!selection.length} onClick={async () => { await ep1.post("/api/v2/phd/examiner-rubrics-delete", { colid: global1.colid, ids: selection }); setSelection([]); loadRows(); }}>Bulk delete</Button></Stack>
        <Paper sx={{ height: 620 }}><DataGrid rows={rowsWithId(rows)} columns={columns} checkboxSelection onRowSelectionModelChange={(m) => setSelection(Array.from(m))} slots={{ toolbar: GridToolbar }} sx={gridSx} getRowHeight={() => "auto"} /></Paper>
      </Stack>
    </MenuPageShell>
  );
}

export function PhdExaminerAssignmentPage() {
  const { options } = usePhdOptions();
  const [panels, setPanels] = useState([]);
  const [panel, setPanel] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [members, setMembers] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [studentSelection, setStudentSelection] = useState([]);
  const [memberSelection, setMemberSelection] = useState([]);
  const [assignedSelection, setAssignedSelection] = useState([]);
  const [filters, setFilters] = useState({});
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const loadPanels = async () => { const res = await ep1.get("/api/v2/phd/examiner-panels", { params: { colid: global1.colid } }); setPanels(res.data?.data || []); };
  const loadContext = async (chosen = panel) => {
    setBusy("load");
    try {
      const res = await ep1.get(`/api/v2/phd/examiner-assignment-context?${queryString({ colid: global1.colid, ...filters, panelid: chosen?._id || "" })}`);
      setSubmissions(res.data?.submissions || []); setMembers(res.data?.members || []); setAssignments(res.data?.assignments || []);
    } finally {
      setBusy("");
    }
  };
  useEffect(() => { loadPanels(); loadContext(); }, []);
  const selectedSubmissionIds = useMemo(() => new Set(studentSelection.map(String)), [studentSelection]);
  const selectedAssignments = useMemo(() => assignments.filter((row) => selectedSubmissionIds.has(String(row.submissionid))), [assignments, selectedSubmissionIds]);
  const assign = async () => {
    setMessage("");
    setError("");
    setBusy("assign");
    try {
      const res = await ep1.post("/api/v2/phd/examiner-assignments", { colid: global1.colid, submissionids: studentSelection, memberids: memberSelection, name: global1.name, user: global1.user });
      setMessage(`Assignment completed. ${res.data?.inserted || 0} new examiner assignment(s) added out of ${res.data?.attempted || 0} requested.`);
      setMemberSelection([]);
      await loadContext();
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Unable to assign examiners.");
    } finally {
      setBusy("");
    }
  };
  const deleteAssigned = async () => {
    setMessage("");
    setError("");
    setBusy("delete");
    try {
      const res = await ep1.post("/api/v2/phd/examiner-assignments-delete", { colid: global1.colid, ids: assignedSelection });
      setMessage(`${res.data?.deleted || 0} examiner assignment(s) deleted.`);
      setAssignedSelection([]);
      await loadContext();
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Unable to delete examiner assignments.");
    } finally {
      setBusy("");
    }
  };
  const submitCols = submissionColumns([]);
  const memberCols = memberFields.map((field) => ({ field, headerName: fieldLabel(field), minWidth: 140 }));
  const assignedCols = [
    ...examinerAssignmentFields.map((field) => ({ field, headerName: fieldLabel(field), minWidth: ["topic", "remarks", "fileurl"].includes(field) ? 220 : 140, flex: field === "topic" ? 1 : undefined, renderCell: field === "fileurl" ? ({ value }) => value ? <a href={value} target="_blank" rel="noreferrer">Open thesis</a> : "" : undefined })),
    { field: "documents", headerName: "Documents", minWidth: 150, renderCell: ({ row }) => <DocumentsButton row={row} /> }
  ];
  return (
    <MenuPageShell title="Examiner assignment">
      <Stack spacing={2} sx={{ p: 2 }}>
        <Typography variant="h5" fontWeight={900}>Examiner Assignment</Typography>
        {message && <Alert severity="success" onClose={() => setMessage("")}>{message}</Alert>}
        {error && <Alert severity="error" onClose={() => setError("")}>{error}</Alert>}
        <Paper variant="outlined" sx={{ p: 2 }}><Grid container spacing={2}><Grid item xs={12} md={5}><Autocomplete options={panels} getOptionLabel={panelLabel} value={panel} onChange={(_, v) => { setPanel(v); setAssignedSelection([]); loadContext(v); }} renderInput={(params) => <TextField {...params} size="small" label="Select approved examiner panel" />} /></Grid><Grid item xs={12} md={3}><Button fullWidth variant="outlined" disabled={Boolean(busy)} onClick={() => loadContext()}>{busy === "load" ? <CircularProgress size={18} /> : "Load approved thesis and members"}</Button></Grid><Grid item xs={12} md={4}><Button fullWidth variant="contained" disabled={!studentSelection.length || !memberSelection.length || Boolean(busy)} onClick={assign}>{busy === "assign" ? <CircularProgress size={18} color="inherit" /> : "Assign selected examiners"}</Button></Grid></Grid></Paper>
        <DynamicFilters fields={["academicyear", "regulation", "program", "programcode", "student", "regno", "subject", "topic"]} filters={filters} setFilters={setFilters} options={options || {}} onSearch={() => loadContext()} />
        <Typography fontWeight={800}>Approved student thesis</Typography>
        <Paper sx={{ height: 360 }}><DataGrid rows={rowsWithId(submissions)} columns={submitCols} checkboxSelection rowSelectionModel={studentSelection} onRowSelectionModelChange={(m) => setStudentSelection(Array.from(m))} slots={{ toolbar: GridToolbar }} sx={gridSx} getRowHeight={() => "auto"} /></Paper>
        <Typography fontWeight={800}>Approved eligible examiners</Typography>
        <Paper sx={{ height: 360 }}><DataGrid rows={rowsWithId(members)} columns={memberCols} checkboxSelection rowSelectionModel={memberSelection} onRowSelectionModelChange={(m) => setMemberSelection(Array.from(m))} slots={{ toolbar: GridToolbar }} sx={gridSx} getRowHeight={() => "auto"} /></Paper>
        <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" flexWrap="wrap">
          <Typography fontWeight={800}>Examiners assigned for selected student thesis ({selectedAssignments.length})</Typography>
          <Button color="error" variant="outlined" startIcon={busy === "delete" ? <CircularProgress size={18} /> : <DeleteIcon />} disabled={!assignedSelection.length || Boolean(busy)} onClick={deleteAssigned}>Delete selected assignment</Button>
        </Stack>
        <Paper sx={{ height: 360 }}><DataGrid rows={rowsWithId(selectedAssignments)} columns={assignedCols} checkboxSelection rowSelectionModel={assignedSelection} onRowSelectionModelChange={(m) => setAssignedSelection(Array.from(m))} slots={{ toolbar: GridToolbar }} sx={gridSx} getRowHeight={() => "auto"} /></Paper>
      </Stack>
    </MenuPageShell>
  );
}

export function PhdExaminerReviewPage() {
  const { options } = usePhdOptions();
  const [rows, setRows] = useState([]);
  const [filters, setFilters] = useState({});
  const [remarks, setRemarks] = useState("");
  const [selected, setSelected] = useState(null);
  const [rubrics, setRubrics] = useState([]);
  const [message, setMessage] = useState("");
  const [loadingRows, setLoadingRows] = useState(false);
  const [loadingRubrics, setLoadingRubrics] = useState(false);
  const [savingRubrics, setSavingRubrics] = useState(false);
  const [reviewing, setReviewing] = useState("");
  const loadRows = async () => {
    setLoadingRows(true);
    try {
      const res = await ep1.get(`/api/v2/phd/examiner-my-assignments?${queryString({ colid: global1.colid, user: global1.user, ...filters })}`);
      setRows(res.data?.data || []);
      setSelected(null);
      setRubrics([]);
    } finally {
      setLoadingRows(false);
    }
  };
  useEffect(() => { loadRows(); }, []);
  const loadRubrics = async (row) => {
    setSelected(row || null);
    setRubrics([]);
    if (!row?._id) return;
    setLoadingRubrics(true);
    try {
      const res = await ep1.get("/api/v2/phd/examiner-assignment-rubrics", { params: { colid: global1.colid, assignmentid: row._id } });
      setRubrics(res.data?.rubrics || []);
    } finally {
      setLoadingRubrics(false);
    }
  };
  const saveAssessment = async () => {
    if (!selected?._id) return alert("Select a student thesis first.");
    setSavingRubrics(true);
    try {
      const res = await ep1.post("/api/v2/phd/examiner-assessment", { colid: global1.colid, assignmentid: selected._id, items: rubrics, name: global1.name, user: global1.user });
      setMessage(`${res.data?.saved || 0} rubric response(s) saved.`);
    } finally {
      setSavingRubrics(false);
    }
  };
  const review = async (id, action) => {
    setReviewing(`${id}-${action}`);
    try {
      await ep1.post("/api/v2/phd/examiner-review-action", { colid: global1.colid, id, action, remarks, name: global1.name, user: global1.user });
      setRemarks("");
      setMessage(`Thesis ${action.toLowerCase()}d.`);
      await loadRows();
    } finally {
      setReviewing("");
    }
  };
  const cols = [
    ...examinerAssignmentFields.map((field) => ({ field, headerName: fieldLabel(field), minWidth: ["topic", "remarks", "fileurl"].includes(field) ? 220 : 130, flex: field === "topic" ? 1 : undefined, renderCell: field === "fileurl" ? ({ value }) => value ? <a href={value} target="_blank" rel="noreferrer">Open thesis</a> : "" : undefined })),
    { field: "documents", headerName: "Documents", minWidth: 150, renderCell: ({ row }) => <DocumentsButton row={row} /> },
    { field: "approve", headerName: "Approve", width: 115, renderCell: ({ row }) => /^Pending$/i.test(row.status) ? <Button size="small" disabled={Boolean(reviewing)} onClick={() => review(row._id, "Approve")}>{reviewing === `${row._id}-Approve` ? <CircularProgress size={16} /> : "Approve"}</Button> : "" },
    { field: "reject", headerName: "Reject", width: 105, renderCell: ({ row }) => /^Pending$/i.test(row.status) ? <Button color="error" size="small" disabled={Boolean(reviewing)} onClick={() => review(row._id, "Reject")}>{reviewing === `${row._id}-Reject` ? <CircularProgress size={16} /> : "Reject"}</Button> : "" }
  ];
  const rubricCols = [
    { field: "group", headerName: "Group", minWidth: 180 },
    { field: "topic", headerName: "Topic", minWidth: 260, flex: 1 },
    { field: "value", headerName: "Yes/No", width: 140, renderCell: ({ row }) => <TextField select size="small" value={row.value || "Yes"} onChange={(e) => setRubrics((prev) => prev.map((r) => (r._id === row._id ? { ...r, value: e.target.value } : r)))} sx={{ minWidth: 110 }}><MenuItem value="Yes">Yes</MenuItem><MenuItem value="No">No</MenuItem></TextField> },
    { field: "comments", headerName: "Comments", minWidth: 260, flex: 1, renderCell: ({ row }) => <TextField fullWidth size="small" value={row.comments || ""} onChange={(e) => setRubrics((prev) => prev.map((r) => (r._id === row._id ? { ...r, comments: e.target.value } : r)))} /> }
  ];
  return (
    <MenuPageShell title="Examiner thesis review">
      <Stack spacing={2} sx={{ p: 2 }}>
        <Typography variant="h5" fontWeight={900}>Examiner Thesis Review</Typography>
        {message && <Alert severity="success" onClose={() => setMessage("")}>{message}</Alert>}
        <Paper variant="outlined" sx={{ p: 2 }}><Grid container spacing={2}>
          <Grid item xs={12} md={6}><Autocomplete loading={loadingRows || loadingRubrics} options={rows} getOptionLabel={(row) => `${row.student || ""} (${row.regno || ""}) - ${row.topic || ""}`} value={selected} onChange={(_, v) => loadRubrics(v)} renderInput={(params) => <TextField {...params} size="small" label="Select student thesis" helperText="Details and rubrics load only after selecting a student." />} /></Grid>
          <Grid item xs={12} md={3}>{selected?.fileurl && <Button fullWidth variant="outlined" component="a" href={selected.fileurl} target="_blank" rel="noreferrer">Open thesis link</Button>}</Grid>
          <Grid item xs={12} md={3}>{selected?._id && <DocumentsButton row={selected} />}</Grid>
          <Grid item xs={12} md={3}><Button fullWidth variant="contained" disabled={!selected?._id || !rubrics.length || savingRubrics || loadingRubrics} onClick={saveAssessment}>{savingRubrics ? <CircularProgress size={18} color="inherit" /> : "Submit rubrics"}</Button></Grid>
        </Grid></Paper>
        {selected?._id && <>
          <Typography fontWeight={800}>Assessment Rubrics</Typography>
          <Paper sx={{ height: 360 }}><DataGrid loading={loadingRubrics} rows={rowsWithId(rubrics)} columns={rubricCols} slots={{ toolbar: GridToolbar }} sx={gridSx} getRowHeight={() => "auto"} /></Paper>
          <TextField fullWidth multiline minRows={2} label="Examiner remarks / rejection comments" value={remarks} onChange={(e) => setRemarks(e.target.value)} />
        </>}
        <DynamicFilters fields={["academicyear", "regulation", "program", "programcode", "panelname", "student", "regno", "status"]} filters={filters} setFilters={setFilters} options={options || {}} onSearch={loadRows} />
        <Paper sx={{ height: selected?._id ? 260 : 360 }}>
          <DataGrid
            loading={loadingRows}
            rows={rowsWithId(selected?._id ? [selected] : [])}
            columns={cols}
            slots={{ toolbar: GridToolbar }}
            sx={gridSx}
            getRowHeight={() => "auto"}
            localeText={{ noRowsLabel: "Select a student thesis to load review data." }}
          />
        </Paper>
      </Stack>
    </MenuPageShell>
  );
}

export function PhdFinalExaminerApprovedPage() {
  const { options, institution } = usePhdOptions();
  const [rows, setRows] = useState([]);
  const [filters, setFilters] = useState({});
  const loadRows = async () => {
    const res = await ep1.get(`/api/v2/phd/examiner-final-approved?${queryString({ colid: global1.colid, ...filters })}`);
    setRows(res.data?.data || []);
  };
  useEffect(() => { loadRows(); }, []);
  const print = () => {
    const logo = institution?.logolink || institution?.logo || global1.logo || "";
    const name = institution?.institutionname || global1.insname || "Institution";
    const address = institution?.address || global1.address || "";
    const win = window.open("", "_blank", "width=1000,height=800");
    if (!win) return;
    win.document.write(`<html><head><title>Final examiner approved thesis</title><style>@page{size:A4;margin:12mm}body{font-family:Arial;color:#000}.toolbar{text-align:right;padding:8px}.head{text-align:center;border-bottom:2px solid #111;padding-bottom:8px}.logo{height:60px}table{width:100%;border-collapse:collapse;font-size:11px;margin-top:14px}th,td{border:1px solid #111;padding:5px;text-align:left;vertical-align:top}@media print{.toolbar{display:none}}</style></head><body><div class="toolbar"><button onclick="print()">Print</button><button onclick="close()">Close</button></div><div class="head">${logo ? `<img class="logo" src="${logo}"/>` : ""}<h2>${name}</h2><div>${address}</div><h3>Final Examiner Approved Thesis List</h3></div><table><thead><tr>${["Student","Reg no","Program","Subject","Topic","Guide","Examiners","Approved"].map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr><td>${r.student || ""}</td><td>${r.regno || ""}</td><td>${r.program || ""} ${r.programcode || ""}</td><td>${r.subject || ""}</td><td>${r.topic || ""}</td><td>${r.guidename || ""}</td><td>${r.examinerCount || 0}</td><td>${r.examinerApprovedCount || 0}</td></tr>`).join("")}</tbody></table></body></html>`);
    win.document.close();
  };
  const cols = submissionColumns([{ field: "examinerCount", headerName: "Examiners", width: 110 }, { field: "examinerApprovedCount", headerName: "Approved", width: 110 }, { field: "examinerstatus", headerName: "Examiner status", width: 150 }]);
  return (
    <MenuPageShell title="Final examiner approved">
      <Stack spacing={2} sx={{ p: 2 }}>
        <Typography variant="h5" fontWeight={900}>Final Examiner Approved Thesis</Typography>
        <DynamicFilters fields={["academicyear", "regulation", "program", "programcode", "student", "regno", "subject", "topic", "guideemail"]} filters={filters} setFilters={setFilters} options={options || {}} onSearch={loadRows} />
        <Stack direction="row" spacing={1}><Button variant="outlined" onClick={() => exportCsv("phd-final-examiner-approved.csv", rows, cols)}>Export</Button><Button variant="outlined" startIcon={<PrintIcon />} onClick={print}>Print preview</Button></Stack>
        <Paper sx={{ height: 650 }}><DataGrid rows={rowsWithId(rows)} columns={cols} slots={{ toolbar: GridToolbar }} sx={gridSx} getRowHeight={() => "auto"} /></Paper>
      </Stack>
    </MenuPageShell>
  );
}

export function PhdNocApprovalPage() {
  const { options, institution } = usePhdOptions();
  const [rows, setRows] = useState([]);
  const [filters, setFilters] = useState({});
  const [selected, setSelected] = useState(null);
  const [details, setDetails] = useState({ assignments: [], assessments: [], submission: null });
  const [comments, setComments] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");
  const loadRows = async () => {
    setBusy("load");
    try {
      const res = await ep1.get(`/api/v2/phd/noc-approvals?${queryString({ colid: global1.colid, user: global1.user, role: global1.role, name: global1.name, ...filters })}`);
      setRows(res.data?.data || []);
      setSelected(null);
      setDetails({ assignments: [], assessments: [], submission: null });
    } finally {
      setBusy("");
    }
  };
  useEffect(() => { loadRows(); }, []);
  const loadDetails = async (row) => {
    setSelected(row || null);
    setDetails({ assignments: [], assessments: [], submission: null });
    if (!row?._id) return;
    setBusy("details");
    try {
      const res = await ep1.get("/api/v2/phd/noc-approval-details", { params: { colid: global1.colid, id: row._id } });
      setDetails({ assignments: res.data?.assignments || [], assessments: res.data?.assessments || [], submission: res.data?.submission || null });
    } finally {
      setBusy("");
    }
  };
  const takeAction = async (action) => {
    if (!selected?._id) return;
    setBusy(action.toLowerCase());
    try {
      await ep1.post("/api/v2/phd/noc-approval-action", { colid: global1.colid, id: selected._id, action, comments, name: global1.name, user: global1.user });
      setMessage(`NoC ${action.toLowerCase()}d.`);
      setComments("");
      await loadRows();
    } finally {
      setBusy("");
    }
  };
  const cols = submissionColumns([
    { field: "nocstatus", headerName: "NoC status", width: 130, valueGetter: ({ row }) => row.status || "" },
    { field: "select", headerName: "Select", width: 100, renderCell: ({ row }) => <Button size="small" disabled={Boolean(busy)} onClick={() => loadDetails(row)}>Select</Button> }
  ]);
  const examiners = useMemo(() => [...new Set((details.assessments || []).map((row) => row.examinername || row.examineremail).filter(Boolean))], [details.assessments]);
  const rubricKeys = useMemo(() => [...new Set((details.assessments || []).map((row) => `${row.group || ""}||${row.topic || ""}`))], [details.assessments]);
  const assessmentLookup = useMemo(() => {
    const map = {};
    (details.assessments || []).forEach((row) => {
      map[`${row.group || ""}||${row.topic || ""}||${row.examinername || row.examineremail || ""}`] = row;
    });
    return map;
  }, [details.assessments]);
  return (
    <MenuPageShell title="NoC final approval">
      <Stack spacing={2} sx={{ p: 2 }}>
        <Typography variant="h5" fontWeight={900}>NoC Final Approval</Typography>
        {message && <Alert severity="success" onClose={() => setMessage("")}>{message}</Alert>}
        <DynamicFilters fields={["academicyear", "regulation", "program", "programcode", "student", "regno", "subject", "topic", "status", "currentapprovername", "currentapproveremail"]} filters={filters} setFilters={setFilters} options={options || {}} onSearch={loadRows} />
        <Paper sx={{ height: selected?._id ? 260 : 520 }}><DataGrid loading={busy === "load"} rows={rowsWithId(rows)} columns={cols} slots={{ toolbar: GridToolbar }} sx={gridSx} getRowHeight={() => "auto"} /></Paper>
        {selected?._id && (
          <>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={3}><Typography><b>Student:</b> {selected.student}</Typography></Grid>
                <Grid item xs={12} md={3}><Typography><b>Reg No:</b> {selected.regno}</Typography></Grid>
                <Grid item xs={12} md={3}><Typography><b>Program:</b> {selected.program} ({selected.programcode})</Typography></Grid>
                <Grid item xs={12} md={3}><Typography><b>Status:</b> {selected.status}</Typography></Grid>
                <Grid item xs={12}><Typography><b>Topic:</b> {selected.topic}</Typography></Grid>
                <Grid item xs={12} md={4}>{selected.fileurl && <Button variant="outlined" component="a" href={selected.fileurl} target="_blank" rel="noreferrer">Open thesis</Button>}</Grid>
                <Grid item xs={12} md={4}><DocumentsButton row={selected} /></Grid>
                <Grid item xs={12} md={4}><Button variant="outlined" onClick={() => printStudentReview(selected, institution)}>Printable review</Button></Grid>
              </Grid>
            </Paper>
            <Typography fontWeight={800}>Initial Thesis Approval History</Typography>
            <Paper variant="outlined" sx={{ p: 2 }}>
              {(details.submission?.history || []).map((row, index) => <Typography key={index} sx={{ mb: 0.75 }}>{row.date ? new Date(row.date).toLocaleString() : ""} - {row.action} - {row.approvername || row.approveremail || "Student"} {row.comments ? `: ${row.comments}` : ""}</Typography>)}
            </Paper>
            <Typography fontWeight={800}>Examiner Approval Details</Typography>
            <Paper sx={{ height: 260 }}><DataGrid loading={busy === "details"} rows={rowsWithId(details.assignments)} columns={[{ field: "examinername", headerName: "Examiner", minWidth: 180 }, { field: "examineremail", headerName: "Email", minWidth: 220 }, { field: "status", headerName: "Status", width: 120 }, { field: "remarks", headerName: "Remarks", minWidth: 260, flex: 1 }, { field: "revieweddate", headerName: "Reviewed", minWidth: 150, valueGetter: ({ value }) => value ? new Date(value).toLocaleDateString() : "" }]} sx={gridSx} getRowHeight={() => "auto"} /></Paper>
            <Typography fontWeight={800}>Rubrics Comparison</Typography>
            <Paper variant="outlined" sx={{ p: 2, overflowX: "auto" }}>
              <Box component="table" sx={{ width: "100%", borderCollapse: "collapse", "& th,& td": { border: "1px solid #ccc", p: 1, textAlign: "left", verticalAlign: "top", fontSize: 13 } }}>
                <thead><tr><th>Group</th><th>Topic</th>{examiners.map((examiner) => <th key={examiner}>{examiner}</th>)}</tr></thead>
                <tbody>
                  {rubricKeys.map((key) => {
                    const [group, topic] = key.split("||");
                    return <tr key={key}><td>{group}</td><td>{topic}</td>{examiners.map((examiner) => {
                      const item = assessmentLookup[`${group}||${topic}||${examiner}`] || {};
                      return <td key={examiner}><b>{item.value || ""}</b>{item.comments ? <><br />{item.comments}</> : null}</td>;
                    })}</tr>;
                  })}
                </tbody>
              </Box>
            </Paper>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12}><TextField fullWidth multiline minRows={2} label="Final NoC approval / rejection comments" value={comments} onChange={(e) => setComments(e.target.value)} /></Grid>
                <Grid item xs={12} md={3}><Button fullWidth variant="contained" disabled={!/^Submitted$/i.test(selected.status) || Boolean(busy)} onClick={() => takeAction("Approve")}>{busy === "approve" ? <CircularProgress size={18} color="inherit" /> : "Approve"}</Button></Grid>
                <Grid item xs={12} md={3}><Button fullWidth color="error" variant="outlined" disabled={!/^Submitted$/i.test(selected.status) || Boolean(busy)} onClick={() => takeAction("Reject")}>{busy === "reject" ? <CircularProgress size={18} /> : "Reject"}</Button></Grid>
              </Grid>
            </Paper>
          </>
        )}
      </Stack>
    </MenuPageShell>
  );
}

export function PhdOralDefenseAssignmentPage() {
  const { options } = usePhdOptions();
  const [panels, setPanels] = useState([]);
  const [members, setMembers] = useState([]);
  const [students, setStudents] = useState([]);
  const [panel, setPanel] = useState(null);
  const [member, setMember] = useState(null);
  const [selection, setSelection] = useState([]);
  const [filters, setFilters] = useState({});
  const [targetdate, setTargetdate] = useState(today());
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");
  const loadContext = async (chosen = panel) => {
    setBusy("load");
    try {
      const res = await ep1.get(`/api/v2/phd/oral-defense-context?${queryString({ colid: global1.colid, ...filters, panelid: chosen?._id || "" })}`);
      setPanels(res.data?.panels || []);
      setMembers(res.data?.members || []);
      setStudents(res.data?.students || []);
      setSelection([]);
    } finally {
      setBusy("");
    }
  };
  useEffect(() => { loadContext(); }, []);
  const assign = async () => {
    setBusy("assign");
    try {
      const res = await ep1.post("/api/v2/phd/oral-defense-assignments", { colid: global1.colid, panelid: panel?._id, memberid: member?._id, nocapprovalids: selection, targetdate, name: global1.name, user: global1.user });
      setMessage(`${res.data?.inserted || 0} oral defense assignment(s) created.`);
      await loadContext(panel);
    } finally {
      setBusy("");
    }
  };
  const studentCols = submissionColumns([{ field: "oralassigned", headerName: "Oral assigned", width: 130 }]);
  return (
    <MenuPageShell title="Oral defense assignment">
      <Stack spacing={2} sx={{ p: 2 }}>
        <Typography variant="h5" fontWeight={900}>Oral Defense Assignment</Typography>
        {message && <Alert severity="success" onClose={() => setMessage("")}>{message}</Alert>}
        <Paper variant="outlined" sx={{ p: 2 }}><Grid container spacing={2}>
          <Grid item xs={12} md={4}><Autocomplete options={panels} getOptionLabel={panelLabel} value={panel} onChange={(_, v) => { setPanel(v); setMember(null); loadContext(v); }} renderInput={(params) => <TextField {...params} size="small" label="Select panel" />} /></Grid>
          <Grid item xs={12} md={4}><Autocomplete options={members} getOptionLabel={(row) => `${row.examinername || ""} - ${row.examineremail || ""}`} value={member} onChange={(_, v) => setMember(v)} renderInput={(params) => <TextField {...params} size="small" label="Select examiner" />} /></Grid>
          <Grid item xs={12} md={2}><TextField fullWidth type="date" size="small" label="Target date" InputLabelProps={{ shrink: true }} value={targetdate} onChange={(e) => setTargetdate(e.target.value)} /></Grid>
          <Grid item xs={12} md={2}><Button fullWidth variant="contained" disabled={!panel?._id || !member?._id || !selection.length || Boolean(busy)} onClick={assign}>{busy === "assign" ? <CircularProgress size={18} color="inherit" /> : "Assign"}</Button></Grid>
        </Grid></Paper>
        <DynamicFilters fields={["academicyear", "regulation", "program", "programcode", "panelname", "student", "regno", "subject", "topic"]} filters={filters} setFilters={setFilters} options={options || {}} onSearch={() => loadContext(panel)} />
        <Stack direction="row" spacing={1}><Button variant="outlined" disabled={Boolean(busy)} onClick={() => loadContext(panel)}>{busy === "load" ? <CircularProgress size={18} /> : "Load"}</Button></Stack>
        <Paper sx={{ height: 650 }}><DataGrid loading={busy === "load"} rows={rowsWithId(students)} columns={studentCols} checkboxSelection rowSelectionModel={selection} onRowSelectionModelChange={(m) => setSelection(Array.from(m))} slots={{ toolbar: GridToolbar }} sx={gridSx} getRowHeight={() => "auto"} /></Paper>
      </Stack>
    </MenuPageShell>
  );
}

export function PhdOralDefenseSchedulePage() {
  const { options, institution } = usePhdOptions();
  const [rows, setRows] = useState([]);
  const [selection, setSelection] = useState([]);
  const [filters, setFilters] = useState({});
  const [oraldefensedate, setOraldefensedate] = useState(today());
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");
  const loadRows = async () => {
    setBusy("load");
    try {
      const res = await ep1.get(`/api/v2/phd/oral-defense-assignments?${queryString({ colid: global1.colid, ...filters })}`);
      setRows(res.data?.data || []);
    } finally {
      setBusy("");
    }
  };
  useEffect(() => { loadRows(); }, []);
  const update = async () => {
    setBusy("save");
    try {
      const res = await ep1.post("/api/v2/phd/oral-defense-schedule", { colid: global1.colid, ids: selection, oraldefensedate, status: "Assigned" });
      setMessage(`${res.data?.updated || 0} oral defense schedule(s) updated.`);
      setSelection([]);
      await loadRows();
    } finally {
      setBusy("");
    }
  };
  const cols = [
    ...oralDefenseFields.map((field) => ({ field, headerName: fieldLabel(field), minWidth: ["topic", "comments"].includes(field) ? 220 : 135, flex: field === "topic" ? 1 : undefined })),
    { field: "documents", headerName: "Documents", minWidth: 150, renderCell: ({ row }) => <DocumentsButton row={row} /> },
    { field: "appointment", headerName: "Appointment", width: 135, renderCell: ({ row }) => <Button size="small" startIcon={<PrintIcon />} onClick={() => printOralDefenseAppointment(row, institution)}>Print</Button> }
  ];
  return (
    <MenuPageShell title="Oral defense schedule">
      <Stack spacing={2} sx={{ p: 2 }}>
        <Typography variant="h5" fontWeight={900}>Oral Defense Schedule</Typography>
        {message && <Alert severity="success" onClose={() => setMessage("")}>{message}</Alert>}
        <Paper variant="outlined" sx={{ p: 2 }}><Grid container spacing={2}>
          <Grid item xs={12} md={3}><TextField fullWidth type="date" size="small" label="Oral defense date" InputLabelProps={{ shrink: true }} value={oraldefensedate} onChange={(e) => setOraldefensedate(e.target.value)} /></Grid>
          <Grid item xs={12} md={3}><Button fullWidth variant="contained" disabled={!selection.length || Boolean(busy)} onClick={update}>{busy === "save" ? <CircularProgress size={18} color="inherit" /> : "Update selected"}</Button></Grid>
        </Grid></Paper>
        <DynamicFilters fields={oralDefenseFields} filters={filters} setFilters={setFilters} options={options || {}} onSearch={loadRows} />
        <Paper sx={{ height: 650 }}><DataGrid loading={busy === "load"} rows={rowsWithId(rows)} columns={cols} checkboxSelection rowSelectionModel={selection} onRowSelectionModelChange={(m) => setSelection(Array.from(m))} slots={{ toolbar: GridToolbar }} sx={gridSx} getRowHeight={() => "auto"} /></Paper>
      </Stack>
    </MenuPageShell>
  );
}

export function PhdOralDefenseReviewPage() {
  const { options, users } = usePhdOptions();
  const [rows, setRows] = useState([]);
  const [filters, setFilters] = useState({});
  const [panel, setPanel] = useState(null);
  const [selected, setSelected] = useState(null);
  const [attendees, setAttendees] = useState([]);
  const [comments, setComments] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");
  const panels = useMemo(() => {
    const map = new Map();
    rows.forEach((row) => {
      const key = row.panelid || row.panelname;
      if (key && !map.has(key)) map.set(key, row);
    });
    return Array.from(map.values());
  }, [rows]);
  const panelStudents = useMemo(() => rows.filter((row) => {
    if (!panel) return false;
    return clean(row.panelid || row.panelname) === clean(panel.panelid || panel.panelname);
  }), [rows, panel]);
  const loadRows = async () => {
    setBusy("load");
    try {
      const res = await ep1.get(`/api/v2/phd/oral-defense-my?${queryString({ colid: global1.colid, user: global1.user, ...filters })}`);
      setRows(res.data?.data || []);
      setPanel(null);
      setSelected(null);
      setAttendees([]);
    } finally {
      setBusy("");
    }
  };
  useEffect(() => { loadRows(); }, []);
  const takeAction = async (action) => {
    if (!selected?._id) return;
    setBusy(action.toLowerCase());
    try {
      await ep1.post("/api/v2/phd/oral-defense-examiner-action", { colid: global1.colid, id: selected._id, action, comments, attendees, name: global1.name, user: global1.user });
      setMessage(`Oral defense ${action.toLowerCase()}d.`);
      setComments("");
      setAttendees([]);
      await loadRows();
    } finally {
      setBusy("");
    }
  };
  const cols = [
    ...oralDefenseFields.map((field) => ({ field, headerName: fieldLabel(field), minWidth: ["topic", "comments"].includes(field) ? 220 : 135, flex: field === "topic" ? 1 : undefined })),
    { field: "documents", headerName: "Documents", minWidth: 150, renderCell: ({ row }) => <DocumentsButton row={row} /> }
  ];
  const attendeeCols = ["name", "email", "department", "designation", "institution"].map((field) => ({ field, headerName: fieldLabel(field), minWidth: field === "email" ? 210 : 150, flex: ["name", "institution"].includes(field) ? 1 : undefined }));
  return (
    <MenuPageShell title="Oral defense review">
      <Stack spacing={2} sx={{ p: 2 }}>
        <Typography variant="h5" fontWeight={900}>Oral Defense Examiner Review</Typography>
        {message && <Alert severity="success" onClose={() => setMessage("")}>{message}</Alert>}
        <Paper variant="outlined" sx={{ p: 2 }}><Grid container spacing={2}>
          <Grid item xs={12} md={6}><Autocomplete loading={busy === "load"} options={panels} getOptionLabel={panelLabel} value={panel} onChange={(_, v) => { setPanel(v); setSelected(null); setComments(""); setAttendees([]); }} renderInput={(params) => <TextField {...params} size="small" label="Select oral defense panel" />} /></Grid>
          <Grid item xs={12} md={6}><Autocomplete disabled={!panel} loading={busy === "load"} options={panelStudents} getOptionLabel={(row) => clean(`${row.student || ""}${row.regno ? ` (${row.regno})` : ""}${row.oraldefensedate ? ` - ${row.oraldefensedate}` : ""}`)} value={selected} onChange={(_, v) => { setSelected(v); setComments(v?.comments || ""); setAttendees(v?.attendees || []); }} renderInput={(params) => <TextField {...params} size="small" label="Select scheduled student" />} /></Grid>
          <Grid item xs={12} md={3}>{selected?._id && <DocumentsButton row={selected} />}</Grid>
          <Grid item xs={12}><TextField fullWidth multiline minRows={3} label="Oral defense comments" value={comments} onChange={(e) => setComments(e.target.value)} /></Grid>
          <Grid item xs={12}>
            <Typography fontWeight={800} sx={{ mb: 1 }}>Oral Defense Attendees</Typography>
            <Autocomplete
              multiple
              options={users || []}
              getOptionLabel={userLabel}
              value={(users || []).filter((user) => attendees.some((item) => clean(item.email).toLowerCase() === clean(user.email || user.user).toLowerCase()))}
              onChange={(_, value) => setAttendees((value || []).map((user) => ({ name: user.name || "", email: user.email || user.user || "", department: user.department || "", designation: user.designation || "", institution: user.institution || "" })))}
              renderInput={(params) => <TextField {...params} size="small" label="Add attendees from users" />}
            />
          </Grid>
          <Grid item xs={12}><Paper sx={{ height: attendees.length ? 220 : 120 }}><DataGrid rows={rowsWithId(attendees)} columns={attendeeCols} sx={gridSx} getRowHeight={() => "auto"} localeText={{ noRowsLabel: "No attendees added." }} /></Paper></Grid>
          <Grid item xs={12} md={3}><Button fullWidth variant="contained" disabled={!selected?._id || Boolean(busy)} onClick={() => takeAction("Approve")}>{busy === "approve" ? <CircularProgress size={18} color="inherit" /> : "Approve"}</Button></Grid>
          <Grid item xs={12} md={3}><Button fullWidth color="error" variant="outlined" disabled={!selected?._id || Boolean(busy)} onClick={() => takeAction("Reject")}>{busy === "reject" ? <CircularProgress size={18} /> : "Reject"}</Button></Grid>
        </Grid></Paper>
        <DynamicFilters fields={oralDefenseFields} filters={filters} setFilters={setFilters} options={options || {}} onSearch={loadRows} />
        <Paper sx={{ height: selected?._id ? 300 : 620 }}><DataGrid loading={busy === "load"} rows={rowsWithId(selected?._id ? [selected] : panelStudents)} columns={cols} slots={{ toolbar: GridToolbar }} sx={gridSx} getRowHeight={() => "auto"} localeText={{ noRowsLabel: panel ? "No scheduled students found for this panel." : "Select a panel to load scheduled students." }} /></Paper>
      </Stack>
    </MenuPageShell>
  );
}

export function PhdOralDefenseCandidateReportPage() {
  const { options, institution } = usePhdOptions();
  const [rows, setRows] = useState([]);
  const [filters, setFilters] = useState({});
  const [panel, setPanel] = useState(null);
  const [selected, setSelected] = useState(null);
  const [report, setReport] = useState(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");
  const panels = useMemo(() => {
    const map = new Map();
    rows.forEach((row) => {
      const key = row.panelid || row.panelname;
      if (key && !map.has(key)) map.set(key, row);
    });
    return Array.from(map.values());
  }, [rows]);
  const students = useMemo(() => rows.filter((row) => {
    if (!panel) return false;
    return clean(row.panelid || row.panelname) === clean(panel.panelid || panel.panelname);
  }), [rows, panel]);
  const loadRows = async () => {
    setBusy("load");
    try {
      const res = await ep1.get(`/api/v2/phd/oral-defense-assignments?${queryString({ colid: global1.colid, ...filters })}`);
      setRows(res.data?.data || []);
      setPanel(null);
      setSelected(null);
      setReport(null);
    } finally {
      setBusy("");
    }
  };
  useEffect(() => { loadRows(); }, []);
  const loadReport = async () => {
    if (!selected?._id) return;
    setBusy("report");
    setMessage("");
    try {
      const res = await ep1.get("/api/v2/phd/oral-defense-candidate-report", { params: { colid: global1.colid, oralassignmentid: selected._id } });
      setReport(res.data || null);
    } catch (error) {
      setMessage(error?.response?.data?.message || "Unable to load candidate report.");
    } finally {
      setBusy("");
    }
  };
  const summary = report?.assignment || selected || {};
  const thesisCols = [
    { field: "examinername", headerName: "Examiner", minWidth: 180 },
    { field: "examineremail", headerName: "Email", minWidth: 210 },
    { field: "status", headerName: "Status", width: 130 },
    { field: "remarks", headerName: "Comments", minWidth: 260, flex: 1 },
    { field: "updatedAt", headerName: "Date", minWidth: 170, valueGetter: ({ value }) => formatDateTime(value) }
  ];
  const rubricCols = [
    { field: "examinername", headerName: "Examiner", minWidth: 170 },
    { field: "group", headerName: "Group", minWidth: 160 },
    { field: "topic", headerName: "Topic", minWidth: 220, flex: 1 },
    { field: "value", headerName: "Value", width: 100 },
    { field: "comments", headerName: "Comments", minWidth: 260, flex: 1 }
  ];
  const oralCols = [
    { field: "examinername", headerName: "Examiner", minWidth: 180 },
    { field: "targetdate", headerName: "Target Date", width: 140 },
    { field: "oraldefensedate", headerName: "Oral Defense Date", width: 160 },
    { field: "status", headerName: "Status", width: 130 },
    { field: "comments", headerName: "Comments", minWidth: 280, flex: 1 }
  ];
  const thesisDocs = report?.submission ? [
    ...(report.submission.fileurl ? [{ documentname: "Thesis file", component: "Thesis file", url: report.submission.fileurl, filename: report.submission.filename }] : []),
    ...((report.submission.componentdocuments || []).filter((doc) => doc?.url)),
    ...((report.submission.documents || []).filter((doc) => doc?.url))
  ].filter((doc, index, list) => list.findIndex((item) => item.url === doc.url && (item.documentname || item.component) === (doc.documentname || doc.component)) === index) : [];
  const docCols = [
    { field: "component", headerName: "Component", minWidth: 170, valueGetter: ({ row }) => row.component || row.documentname || row.documenttype },
    { field: "chapter", headerName: "Chapter", width: 100 },
    { field: "filename", headerName: "File", minWidth: 220, flex: 1 },
    { field: "url", headerName: "Download", width: 140, renderCell: ({ value }) => value ? <Button size="small" component="a" href={value} target="_blank" rel="noreferrer">Open</Button> : "" }
  ];
  const progressCols = [
    { field: "progressdate", headerName: "Date", width: 130 },
    { field: "progress", headerName: "Progress", minWidth: 280, flex: 1 },
    { field: "documents", headerName: "Documents", width: 140, renderCell: ({ row }) => <DocumentsButton row={row} /> },
    { field: "conversation", headerName: "Conversation", minWidth: 320, flex: 1, renderCell: ({ row }) => (row.conversation || []).map((item) => `${item.byname || item.role}: ${item.comments}`).join(" | ") }
  ];
  const attendees = (report?.oralAssignments || []).flatMap((row) => (row.attendees || []).map((item, index) => ({ id: `${row._id}-${index}`, examinername: row.examinername, oraldefensedate: row.oraldefensedate, ...item })));
  return (
    <MenuPageShell title="Candidate report">
      <Stack spacing={2} sx={{ p: 2 }}>
        <Typography variant="h5" fontWeight={900}>PhD Candidate Oral Defense Report</Typography>
        {message && <Alert severity="error" onClose={() => setMessage("")}>{message}</Alert>}
        <DynamicFilters fields={oralDefenseFields} filters={filters} setFilters={setFilters} options={options || {}} onSearch={loadRows} />
        <Paper variant="outlined" sx={{ p: 2 }}><Grid container spacing={2}>
          <Grid item xs={12} md={4}><Autocomplete loading={busy === "load"} options={panels} getOptionLabel={panelLabel} value={panel} onChange={(_, v) => { setPanel(v); setSelected(null); setReport(null); }} renderInput={(params) => <TextField {...params} size="small" label="Select panel" />} /></Grid>
          <Grid item xs={12} md={5}><Autocomplete disabled={!panel} loading={busy === "load"} options={students} getOptionLabel={(row) => clean(`${row.student || ""}${row.regno ? ` (${row.regno})` : ""}${row.oraldefensedate ? ` - ${row.oraldefensedate}` : ""}`)} value={selected} onChange={(_, v) => { setSelected(v); setReport(null); }} renderInput={(params) => <TextField {...params} size="small" label="Select student" />} /></Grid>
          <Grid item xs={12} md={3}><Button fullWidth variant="contained" disabled={!selected?._id || Boolean(busy)} onClick={loadReport}>{busy === "report" ? <CircularProgress size={18} color="inherit" /> : "Load report"}</Button></Grid>
        </Grid></Paper>
        <Paper sx={{ height: report ? 220 : 520 }}><DataGrid loading={busy === "load"} rows={rowsWithId(students)} columns={oralDefenseFields.map((field) => ({ field, headerName: fieldLabel(field), minWidth: ["topic", "comments"].includes(field) ? 220 : 135, flex: field === "topic" ? 1 : undefined }))} slots={{ toolbar: GridToolbar }} sx={gridSx} getRowHeight={() => "auto"} /></Paper>
        {report && <>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={3}><Typography><b>Student:</b> {summary.student}</Typography></Grid>
              <Grid item xs={12} md={3}><Typography><b>Reg No:</b> {summary.regno}</Typography></Grid>
              <Grid item xs={12} md={3}><Typography><b>Program:</b> {summary.program}</Typography></Grid>
              <Grid item xs={12} md={3}><Typography><b>Panel:</b> {summary.panelname}</Typography></Grid>
              <Grid item xs={12}><Typography><b>Thesis:</b> {summary.topic}</Typography></Grid>
              <Grid item xs={12} md={3}><Button fullWidth variant="outlined" startIcon={<PrintIcon />} disabled={Boolean(busy)} onClick={() => printOralDefenseCandidateReport({ ...report, institution: report.institution || institution })}>Print preview</Button></Grid>
            </Grid>
	          </Paper>
          <Typography fontWeight={800}>Thesis Component Documents</Typography>
          <Paper sx={{ height: 260 }}><DataGrid rows={rowsWithId(thesisDocs)} columns={docCols} slots={{ toolbar: GridToolbar }} sx={gridSx} getRowHeight={() => "auto"} /></Paper>
          <Typography fontWeight={800}>Progress Reports</Typography>
          <Paper sx={{ height: 280 }}><DataGrid rows={rowsWithId(report.progressReports || [])} columns={progressCols} slots={{ toolbar: GridToolbar }} sx={gridSx} getRowHeight={() => "auto"} /></Paper>
          <Typography fontWeight={800}>Thesis Examiner Approvals</Typography>
          <Paper sx={{ height: 260 }}><DataGrid rows={rowsWithId(report.thesisAssignments || [])} columns={thesisCols} slots={{ toolbar: GridToolbar }} sx={gridSx} getRowHeight={() => "auto"} /></Paper>
          <Typography fontWeight={800}>Rubrics and Comments</Typography>
          <Paper sx={{ height: 320 }}><DataGrid rows={rowsWithId(report.thesisAssessments || [])} columns={rubricCols} slots={{ toolbar: GridToolbar }} sx={gridSx} getRowHeight={() => "auto"} /></Paper>
          <Typography fontWeight={800}>Oral Defense Schedule and Comments</Typography>
          <Paper sx={{ height: 260 }}><DataGrid rows={rowsWithId(report.oralAssignments || [])} columns={oralCols} slots={{ toolbar: GridToolbar }} sx={gridSx} getRowHeight={() => "auto"} /></Paper>
          <Typography fontWeight={800}>Oral Defense Attendees</Typography>
          <Paper sx={{ height: 240 }}><DataGrid rows={attendees} columns={[{ field: "name", headerName: "Name", minWidth: 170 }, { field: "email", headerName: "Email", minWidth: 220 }, { field: "department", headerName: "Department", minWidth: 150 }, { field: "designation", headerName: "Designation", minWidth: 150 }, { field: "institution", headerName: "Institution", minWidth: 180, flex: 1 }, { field: "oraldefensedate", headerName: "Defense Date", minWidth: 150 }]} slots={{ toolbar: GridToolbar }} sx={gridSx} getRowHeight={() => "auto"} /></Paper>
        </>}
      </Stack>
    </MenuPageShell>
  );
}

export function PhdOralDefenseApprovalPage() {
  const { options } = usePhdOptions();
  const [rows, setRows] = useState([]);
  const [filters, setFilters] = useState({});
  const [selected, setSelected] = useState(null);
  const [details, setDetails] = useState({});
  const [comments, setComments] = useState("");
  const [message, setMessage] = useState("");
  const [messageSeverity, setMessageSeverity] = useState("success");
  const [busy, setBusy] = useState("");
  const isCoe = /^coe$/i.test(clean(global1.role));
  const loadRows = async () => {
    setBusy("load");
    try {
      const res = await ep1.get(`/api/v2/phd/oral-defense-approvals?${queryString({ colid: global1.colid, user: global1.user, role: global1.role, ...filters })}`);
      setRows(res.data?.data || []);
      setSelected(null);
      setDetails({});
    } finally {
      setBusy("");
    }
  };
  useEffect(() => { loadRows(); }, []);
  const loadDetails = async (row) => {
    setSelected(row || null);
    setDetails({});
    if (!row?._id) return;
    setBusy("details");
    try {
      const res = await ep1.get("/api/v2/phd/oral-defense-approval-details", { params: { colid: global1.colid, id: row._id } });
      setDetails(res.data || {});
      if (res.data?.data) setSelected(res.data.data);
    } finally {
      setBusy("");
    }
  };
  const takeAction = async (action) => {
    setBusy(action.toLowerCase());
    try {
      await ep1.post("/api/v2/phd/oral-defense-approval-action", { colid: global1.colid, id: selected._id, action, comments, name: global1.name, user: global1.user });
      setMessageSeverity("success");
      setMessage(`Oral defense approval ${action.toLowerCase()}d.`);
      setComments("");
      await loadRows();
    } catch (error) {
      setMessageSeverity("error");
      setMessage(error.response?.data?.message || error.message || "Unable to update approval.");
    } finally {
      setBusy("");
    }
  };
  const updateRecommendation = async (row, recommended) => {
    const key = `recommend-${row._id}`;
    setBusy(key);
    try {
      const res = await ep1.post("/api/v2/phd/oral-defense-approval-recommendation", { colid: global1.colid, id: row._id, recommended, name: global1.name, user: global1.user, role: global1.role });
      const updated = res.data?.data || { ...row, recommended };
      setRows((prev) => prev.map((item) => item._id === row._id ? { ...item, ...updated } : item));
      if (selected?._id === row._id) setSelected((prev) => ({ ...prev, ...updated }));
      setMessageSeverity("success");
      setMessage(`Recommendation changed to ${recommended}.`);
    } catch (error) {
      setMessageSeverity("error");
      setMessage(error.response?.data?.message || error.message || "Unable to update recommendation.");
    } finally {
      setBusy("");
    }
  };
  const cols = submissionColumns([
    { field: "oraldefensedate", headerName: "Oral defense date", width: 160 },
    {
      field: "recommended",
      headerName: "Recommended",
      width: 160,
      renderCell: ({ row }) => isCoe ? (
        <TextField
          select
          size="small"
          value={row.recommended || "No"}
          disabled={Boolean(busy)}
          onChange={(e) => updateRecommendation(row, e.target.value)}
          sx={{ minWidth: 110 }}
        >
          {["Yes", "No"].map((value) => <MenuItem key={value} value={value}>{value}</MenuItem>)}
        </TextField>
      ) : (row.recommended || "No")
    },
    { field: "select", headerName: "Select", width: 100, renderCell: ({ row }) => <Button size="small" disabled={Boolean(busy)} onClick={() => loadDetails(row)}>Select</Button> }
  ]);
  return (
    <MenuPageShell title="Oral defense approval">
      <Stack spacing={2} sx={{ p: 2 }}>
        <Typography variant="h5" fontWeight={900}>Oral Defense Approval</Typography>
        {message && <Alert severity={messageSeverity} onClose={() => setMessage("")}>{message}</Alert>}
        <DynamicFilters fields={["academicyear", "regulation", "program", "programcode", "student", "regno", "subject", "topic", "status", "recommended", "currentapprovername", "currentapproveremail"]} filters={filters} setFilters={setFilters} options={options || {}} onSearch={loadRows} />
        <Paper sx={{ height: selected?._id ? 260 : 620 }}><DataGrid loading={busy === "load"} rows={rowsWithId(rows)} columns={cols} slots={{ toolbar: GridToolbar }} sx={gridSx} getRowHeight={() => "auto"} /></Paper>
        {selected?._id && <>
          <Paper variant="outlined" sx={{ p: 2 }}><Grid container spacing={2}><Grid item xs={12} md={3}><Typography><b>Student:</b> {selected.student}</Typography></Grid><Grid item xs={12} md={3}><Typography><b>Reg No:</b> {selected.regno}</Typography></Grid><Grid item xs={12} md={3}><Typography><b>Program:</b> {selected.program}</Typography></Grid><Grid item xs={12} md={3}><Typography><b>Oral defense:</b> {selected.oraldefensedate}</Typography></Grid><Grid item xs={12} md={3}><Typography><b>Recommended:</b> {selected.recommended || "No"}</Typography></Grid><Grid item xs={12} md={6}><Typography><b>Thesis:</b> {selected.topic}</Typography></Grid><Grid item xs={12} md={3}><DocumentsButton row={selected} /></Grid></Grid></Paper>
          <Typography fontWeight={800}>Oral Defense Examiner Comments</Typography>
          <Paper sx={{ height: 260 }}><DataGrid loading={busy === "details"} rows={rowsWithId(details.oralAssignments || [])} columns={[{ field: "examinername", headerName: "Examiner", minWidth: 180 }, { field: "status", headerName: "Status", width: 120 }, { field: "comments", headerName: "Comments", minWidth: 300, flex: 1 }, { field: "revieweddate", headerName: "Reviewed", minWidth: 150, valueGetter: ({ value }) => value ? new Date(value).toLocaleDateString() : "" }]} sx={gridSx} getRowHeight={() => "auto"} /></Paper>
          <Typography fontWeight={800}>Thesis Examiner Details</Typography>
          <Paper sx={{ height: 240 }}><DataGrid rows={rowsWithId(details.thesisAssignments || [])} columns={[{ field: "examinername", headerName: "Examiner", minWidth: 180 }, { field: "status", headerName: "Status", width: 120 }, { field: "remarks", headerName: "Remarks", minWidth: 300, flex: 1 }]} sx={gridSx} getRowHeight={() => "auto"} /></Paper>
          <Paper variant="outlined" sx={{ p: 2 }}><Grid container spacing={2}><Grid item xs={12}><TextField fullWidth multiline minRows={2} label="Approval / rejection comments" value={comments} onChange={(e) => setComments(e.target.value)} /></Grid><Grid item xs={12} md={3}><Button fullWidth variant="contained" disabled={!/^Submitted$/i.test(selected.status) || Boolean(busy)} onClick={() => takeAction("Approve")}>{busy === "approve" ? <CircularProgress size={18} color="inherit" /> : "Approve"}</Button></Grid><Grid item xs={12} md={3}><Button fullWidth color="error" variant="outlined" disabled={!/^Submitted$/i.test(selected.status) || Boolean(busy)} onClick={() => takeAction("Reject")}>{busy === "reject" ? <CircularProgress size={18} /> : "Reject"}</Button></Grid></Grid></Paper>
        </>}
      </Stack>
    </MenuPageShell>
  );
}

export function PhdNocPage() {
  const { options, institution } = usePhdOptions();
  const [rows, setRows] = useState([]);
  const [filters, setFilters] = useState({});
  const loadRows = async () => {
    const res = await ep1.get(`/api/v2/phd/noc-approved?${queryString({ colid: global1.colid, ...filters })}`);
    setRows(res.data?.data || []);
  };
  useEffect(() => { loadRows(); }, []);
  const cols = submissionColumns([
    { field: "review", headerName: "Review", width: 115, renderCell: ({ row }) => <Button size="small" onClick={() => printStudentReview(row, institution)}>Review</Button> },
    { field: "noc", headerName: "NoC", width: 100, renderCell: ({ row }) => <Button size="small" startIcon={<PrintIcon />} onClick={() => printNoc(row, institution)}>Print</Button> }
  ]);
  return (
    <MenuPageShell title="PhD NoC">
      <Stack spacing={2} sx={{ p: 2 }}>
        <Typography variant="h5" fontWeight={900}>Generate PhD NoC</Typography>
        <DynamicFilters fields={["academicyear", "regulation", "program", "programcode", "student", "regno", "subject", "topic", "guideemail"]} filters={filters} setFilters={setFilters} options={options || {}} onSearch={loadRows} />
        <Paper sx={{ height: 650 }}><DataGrid rows={rowsWithId(rows)} columns={cols} slots={{ toolbar: GridToolbar }} sx={gridSx} getRowHeight={() => "auto"} /></Paper>
      </Stack>
    </MenuPageShell>
  );
}

export function PhdAwardLetterPage() {
  const { options, institution } = usePhdOptions();
  const [rows, setRows] = useState([]);
  const [filters, setFilters] = useState({});
  const [template, setTemplate] = useState(awardTemplate());
  const [busy, setBusy] = useState("");
  const loadRows = async () => {
    setBusy("load");
    try {
      const res = await ep1.get(`/api/v2/phd/award-approved?${queryString({ colid: global1.colid, ...filters })}`);
      setRows(res.data?.data || []);
    } finally {
      setBusy("");
    }
  };
  useEffect(() => { loadRows(); }, []);
  const uploadTemplate = async (file) => {
    if (!file) return;
    setTemplate(await file.text());
  };
  const downloadTemplate = () => {
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([awardTemplate()], { type: "text/plain" }));
    link.download = "phd-award-letter-template.txt";
    link.click();
    URL.revokeObjectURL(link.href);
  };
  const cols = submissionColumns([
    { field: "oraldefensedate", headerName: "Oral defense date", width: 160 },
    { field: "award", headerName: "Award letter", width: 145, renderCell: ({ row }) => <Button size="small" startIcon={<PrintIcon />} onClick={() => printAwardLetter(row, institution, template)}>Print</Button> }
  ]);
  return (
    <MenuPageShell title="Generate PhD award letter">
      <Stack spacing={2} sx={{ p: 2 }}>
        <Typography variant="h5" fontWeight={900}>Generate PhD Award Letter</Typography>
        <Paper variant="outlined" sx={{ p: 2 }}><Grid container spacing={2}>
          <Grid item xs={12}><TextField fullWidth multiline minRows={7} label="Award letter template" value={template} onChange={(e) => setTemplate(e.target.value)} helperText="Placeholders: {{institutionname}}, {{regno}}, {{student}}, {{subject}}, {{program}}, {{programcode}}, {{topic}}, {{oraldefensedate}}, {{date}}, {{ref}}" /></Grid>
          <Grid item xs={12} md={3}><Button fullWidth variant="outlined" onClick={downloadTemplate}>Download template</Button></Grid>
          <Grid item xs={12} md={3}><Button fullWidth variant="outlined" component="label" startIcon={<UploadFileIcon />}>Upload template<input hidden type="file" accept=".txt,.html" onChange={(e) => uploadTemplate(e.target.files?.[0])} /></Button></Grid>
          <Grid item xs={12} md={3}><Button fullWidth variant="outlined" disabled={Boolean(busy)} onClick={loadRows}>{busy === "load" ? <CircularProgress size={18} /> : "Load students"}</Button></Grid>
        </Grid></Paper>
        <DynamicFilters fields={["academicyear", "regulation", "program", "programcode", "student", "regno", "subject", "topic", "oraldefensedate"]} filters={filters} setFilters={setFilters} options={options || {}} onSearch={loadRows} />
        <Paper sx={{ height: 650 }}><DataGrid loading={busy === "load"} rows={rowsWithId(rows)} columns={cols} slots={{ toolbar: GridToolbar }} sx={gridSx} getRowHeight={() => "auto"} /></Paper>
      </Stack>
    </MenuPageShell>
  );
}
