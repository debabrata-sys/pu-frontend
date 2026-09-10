import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Grid,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import { DataGrid, GridToolbar } from "@mui/x-data-grid";
import { Print, Refresh } from "@mui/icons-material";
import ep1 from "../api/ep1";
import global1 from "./global1";
import MenuPageShell from "./MenuPageShell";

const safe = (value) => String(value ?? "").trim();
const uniqueSorted = (values) => [...new Set((values || []).map(safe).filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
const escapeHtml = (value) => safe(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
const groupKey = (row) => row.programcode || row.program || "Program";

const courseColumns = [
  { field: "semester", headerName: "Semester", width: 100 },
  { field: "subject", headerName: "Subject", width: 160 },
  { field: "type", headerName: "Subject Type", width: 130 },
  { field: "course", headerName: "Course", minWidth: 220, flex: 1 },
  { field: "coursecode", headerName: "Course Code", width: 140 },
  { field: "coursetype", headerName: "Course Type", width: 140 },
  { field: "deliverytype", headerName: "Delivery Type", width: 150 },
  { field: "coursemastercode", headerName: "Master Code", width: 140 },
  { field: "credit", headerName: "Credits", width: 100, type: "number" },
  { field: "status", headerName: "Status", width: 120 }
];

const componentColumns = [
  { field: "semester", headerName: "Semester", width: 100 },
  { field: "course", headerName: "Course", minWidth: 220, flex: 1 },
  { field: "coursecode", headerName: "Course Code", width: 140 },
  { field: "assessmentgroup", headerName: "Assessment Group", width: 170 },
  { field: "grouptype", headerName: "Group Type", width: 130 },
  { field: "scoretype", headerName: "Score Type", width: 130 },
  { field: "componenttype", headerName: "Component Type", width: 150 },
  { field: "assessmentcomponent", headerName: "Component", minWidth: 190 },
  { field: "marks", headerName: "Marks", width: 100, type: "number" },
  { field: "passmarks", headerName: "Pass Marks", width: 120, type: "number" },
  { field: "weightage", headerName: "Weightage", width: 120, type: "number" },
  { field: "credits", headerName: "Credits", width: 100, type: "number" },
  { field: "status", headerName: "Status", width: 120 }
];

function htmlTable(rows, columns) {
  if (!rows.length) return `<p class="muted">No data found.</p>`;
  return `<table><thead><tr>${columns.map((col) => `<th>${escapeHtml(col.headerName)}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${columns.map((col) => `<td>${escapeHtml(row[col.field])}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
}

export default function RegulationGroupedReportPage() {
  const [allCourses, setAllCourses] = useState([]);
  const [institution, setInstitution] = useState(null);
  const [regulation, setRegulation] = useState("");
  const [selectorType, setSelectorType] = useState("faculty");
  const [selectorValue, setSelectorValue] = useState("");
  const [courses, setCourses] = useState([]);
  const [components, setComponents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const regulationOptions = useMemo(() => uniqueSorted(allCourses.map((row) => row.regulation)), [allCourses]);
  const selectorOptions = useMemo(() => uniqueSorted(allCourses
    .filter((row) => !regulation || row.regulation === regulation)
    .map((row) => selectorType === "faculty" ? row.faculty : row.institution)), [allCourses, regulation, selectorType]);
  const groupedPrograms = useMemo(() => {
    const map = new Map();
    courses.forEach((course) => {
      const key = groupKey(course);
      if (!map.has(key)) map.set(key, {
        program: course.program || "",
        programcode: course.programcode || "",
        faculty: course.faculty || "",
        institution: course.institution || "",
        department: course.department || "",
        courses: [],
        components: []
      });
      map.get(key).courses.push(course);
    });
    components.forEach((component) => {
      const key = groupKey(component);
      if (!map.has(key)) map.set(key, { program: component.program || "", programcode: component.programcode || "", courses: [], components: [] });
      map.get(key).components.push(component);
    });
    return [...map.values()].sort((a, b) => safe(a.programcode).localeCompare(safe(b.programcode), undefined, { numeric: true }));
  }, [components, courses]);

  const totalCredits = useMemo(() => courses.reduce((sum, row) => sum + Number(row.credit || 0), 0), [courses]);
  const totalMarks = useMemo(() => components.reduce((sum, row) => sum + Number(row.marks || 0), 0), [components]);

  const loadBaseData = async () => {
    try {
      setLoading(true);
      setError("");
      const [courseRes, insRes] = await Promise.all([
        ep1.get("/api/v2/regulationcoursemap", { params: { colid: global1.colid } }),
        ep1.get("/vins", { params: { colid: global1.colid } }).catch(() => ({ data: null }))
      ]);
      setAllCourses(courseRes.data?.data || []);
      setInstitution(insRes.data || null);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load grouped regulation report options.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadBaseData(); }, []);
  useEffect(() => { setSelectorValue(""); setCourses([]); setComponents([]); }, [regulation, selectorType]);

  const loadReport = async () => {
    if (!regulation || !selectorValue) {
      setError("Select regulation and faculty/institution.");
      return;
    }
    try {
      setLoading(true);
      setError("");
      setMessage("");
      const params = { colid: global1.colid, regulation, [selectorType]: selectorValue };
      const courseRes = await ep1.get("/api/v2/regulationcoursemap", { params });
      const courseRows = courseRes.data?.data || [];
      const programCodes = uniqueSorted(courseRows.map((row) => row.programcode));
      const componentLists = await Promise.all(programCodes.map((programcode) => ep1.get("/api/v2/assessmentcomponent", { params: { colid: global1.colid, regulation, programcode } }).then((res) => res.data?.data || [])));
      setCourses(courseRows);
      setComponents(componentLists.flat());
      setMessage("Grouped regulation report loaded.");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load grouped regulation report.");
    } finally {
      setLoading(false);
    }
  };

  const printPreview = () => {
    const logo = institution?.logolink || institution?.logo || global1.logo || "";
    const name = institution?.institutionname || institution?.insname || institution?.name || global1.insname || "Institution";
    const address = institution?.address || global1.address || "";
    const phone = institution?.phone || institution?.mobileno || "";
    const email = institution?.email || "";
    const sections = groupedPrograms.map((group) => `
      <section class="program-block">
        <h3>${escapeHtml(group.program || "Program")} ${group.programcode ? `(${escapeHtml(group.programcode)})` : ""}</h3>
        <div class="program-meta">
          <div><strong>Faculty:</strong> ${escapeHtml(group.faculty)}</div>
          <div><strong>Institution:</strong> ${escapeHtml(group.institution)}</div>
          <div><strong>Department:</strong> ${escapeHtml(group.department)}</div>
          <div><strong>Courses:</strong> ${group.courses.length}</div>
          <div><strong>Credits:</strong> ${group.courses.reduce((sum, row) => sum + Number(row.credit || 0), 0)}</div>
          <div><strong>Components:</strong> ${group.components.length}</div>
        </div>
        <div class="section-title">Course List</div>
        ${htmlTable(group.courses, courseColumns)}
        <div class="section-title">Assessment Component List</div>
        ${htmlTable(group.components, componentColumns)}
      </section>
    `).join("");
    const win = window.open("", "_blank", "width=1100,height=800");
    if (!win) return;
    win.document.write(`<!doctype html><html><head><title>Grouped Regulation Report</title><style>
      body{font-family:Arial,Helvetica,sans-serif;color:#000;background:#fff;margin:0}.actions{padding:10px;border-bottom:1px solid #ccc;background:#f7f7f7}.actions button{margin-right:8px;padding:7px 14px}.page{padding:14mm}.header{text-align:center;border-bottom:2px solid #111;padding-bottom:10px;margin-bottom:12px;position:relative;min-height:72px}.logo{position:absolute;left:0;top:0;max-width:82px;max-height:72px;object-fit:contain}h1{font-size:20px;margin:0 90px 4px;font-weight:800}h2{font-size:17px;margin:10px 0 0;text-transform:uppercase;letter-spacing:.4px}.summary,.program-meta{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:10px 0 14px}.summary div,.program-meta div{border:1px solid #111;padding:7px;font-size:12px}.summary b{display:block;font-size:15px;margin-top:3px}.program-block{break-inside:avoid;margin-top:18px}h3{font-size:16px;border:1px solid #111;padding:8px;margin:0 0 8px;background:#f2f2f2}.section-title{font-size:13px;font-weight:800;margin:12px 0 6px}table{width:100%;border-collapse:collapse;font-size:10.5px;margin-bottom:14px}th,td{border:1px solid #111;padding:5px;vertical-align:top;text-align:left}th{background:#eee;font-weight:700}thead{display:table-header-group}tr{break-inside:avoid;page-break-inside:avoid}.muted{color:#333;font-size:12px}@media print{.actions{display:none}.page{padding:10mm}@page{size:A4 portrait;margin:10mm}}
    </style></head><body><div class="actions"><button onclick="window.print()">Print</button><button onclick="window.close()">Close</button></div><div class="page">
      <div class="header">${logo ? `<img class="logo" src="${escapeHtml(logo)}" alt="Logo" />` : ""}<h1>${escapeHtml(name)}</h1><div>${escapeHtml(address)}</div><div>${escapeHtml([phone, email].filter(Boolean).join(" | "))}</div><h2>Grouped Regulation Report</h2></div>
      <div class="summary"><div>Regulation <b>${escapeHtml(regulation)}</b></div><div>${selectorType === "faculty" ? "Faculty" : "Institution"} <b>${escapeHtml(selectorValue)}</b></div><div>Programs <b>${groupedPrograms.length}</b></div><div>Courses <b>${courses.length}</b></div><div>Total Credits <b>${totalCredits}</b></div><div>Components <b>${components.length}</b></div><div>Total Component Marks <b>${totalMarks}</b></div></div>
      ${sections || `<p class="muted">No data found.</p>`}
    </div></body></html>`);
    win.document.close();
    win.focus();
  };

  return (
    <MenuPageShell title="Grouped Regulation Report">
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2} sx={{ mb: 2 }}>
          <Box>
            <Typography variant="h5" fontWeight={900}>Grouped Regulation Report</Typography>
            <Typography color="text.secondary">Generate program-wise course and assessment component lists by faculty or institution.</Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" startIcon={<Refresh />} onClick={loadBaseData}>Refresh Options</Button>
            <Button variant="contained" startIcon={<Print />} disabled={!groupedPrograms.length} onClick={printPreview}>Print Preview</Button>
          </Stack>
        </Stack>
        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}
        {message && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMessage("")}>{message}</Alert>}
        <Paper elevation={0} sx={{ p: 2, mb: 2, border: "1px solid #e5e7eb", borderRadius: 2 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={3}><Autocomplete options={regulationOptions} value={regulation} onChange={(_, value) => setRegulation(value || "")} renderInput={(params) => <TextField {...params} label="Regulation" />} /></Grid>
            <Grid item xs={12} md={3}><TextField select fullWidth label="Select By" value={selectorType} onChange={(e) => setSelectorType(e.target.value)}><MenuItem value="faculty">Faculty</MenuItem><MenuItem value="institution">Institution</MenuItem></TextField></Grid>
            <Grid item xs={12} md={4}><Autocomplete options={selectorOptions} value={selectorValue} onChange={(_, value) => setSelectorValue(value || "")} renderInput={(params) => <TextField {...params} label={selectorType === "faculty" ? "Faculty" : "Institution"} />} /></Grid>
            <Grid item xs={12} md={2}><Button fullWidth variant="contained" onClick={loadReport} disabled={loading || !regulation || !selectorValue}>Load Report</Button></Grid>
          </Grid>
        </Paper>
        <Grid container spacing={2} sx={{ mb: 2 }}>
          {[["Programs", groupedPrograms.length], ["Courses", courses.length], ["Credits", totalCredits], ["Components", components.length]].map(([label, value]) => (
            <Grid item xs={12} md={3} key={label}><Card><CardContent><Typography color="text.secondary">{label}</Typography><Typography variant="h4" fontWeight={900}>{value}</Typography></CardContent></Card></Grid>
          ))}
        </Grid>
        {groupedPrograms.map((group) => (
          <Paper key={group.programcode || group.program} elevation={0} sx={{ p: 2, mb: 2, border: "1px solid #e5e7eb", borderRadius: 2 }}>
            <Typography variant="h6" fontWeight={900}>{group.program || "Program"} {group.programcode ? `(${group.programcode})` : ""}</Typography>
            <Typography color="text.secondary" sx={{ mb: 2 }}>Faculty: {group.faculty || "-"} | Institution: {group.institution || "-"} | Department: {group.department || "-"}</Typography>
            <Typography fontWeight={900} sx={{ mb: 1 }}>Course List</Typography>
            <Box sx={{ height: 360, width: "100%", mb: 2 }}>
              <DataGrid rows={group.courses.map((row) => ({ ...row, id: row._id }))} columns={courseColumns} loading={loading} slots={{ toolbar: GridToolbar }} pageSizeOptions={[10, 25, 50, 100]} sx={{ "& .MuiDataGrid-cell": { whiteSpace: "normal", alignItems: "flex-start", py: 1 } }} />
            </Box>
            <Typography fontWeight={900} sx={{ mb: 1 }}>Assessment Component List</Typography>
            <Box sx={{ height: 360, width: "100%" }}>
              <DataGrid rows={group.components.map((row) => ({ ...row, id: row._id }))} columns={componentColumns} loading={loading} slots={{ toolbar: GridToolbar }} pageSizeOptions={[10, 25, 50, 100]} sx={{ "& .MuiDataGrid-cell": { whiteSpace: "normal", alignItems: "flex-start", py: 1 } }} />
            </Box>
          </Paper>
        ))}
      </Container>
    </MenuPageShell>
  );
}
