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

const courseColumns = [
  { field: "academicyear", headerName: "Academic Year", width: 140 },
  { field: "regulation", headerName: "Regulation", width: 170 },
  { field: "program", headerName: "Program", minWidth: 180, flex: 1 },
  { field: "programcode", headerName: "Program Code", width: 140 },
  { field: "semester", headerName: "Semester", width: 110 },
  { field: "subject", headerName: "Subject", minWidth: 160 },
  { field: "type", headerName: "Subject Type", width: 130 },
  { field: "course", headerName: "Course", minWidth: 220, flex: 1 },
  { field: "coursecode", headerName: "Course Code", width: 140 },
  { field: "coursetype", headerName: "Course Type", width: 140 },
  { field: "deliverytype", headerName: "Delivery Type", width: 150 },
  { field: "coursemastercode", headerName: "Master Code", width: 140 },
  { field: "credit", headerName: "Credits", width: 110, type: "number" },
  { field: "status", headerName: "Status", width: 120 }
];

const componentColumns = [
  { field: "academicyear", headerName: "Academic Year", width: 140 },
  { field: "regulation", headerName: "Regulation", width: 170 },
  { field: "program", headerName: "Program", minWidth: 180, flex: 1 },
  { field: "programcode", headerName: "Program Code", width: 140 },
  { field: "semester", headerName: "Semester", width: 110 },
  { field: "course", headerName: "Course", minWidth: 220, flex: 1 },
  { field: "coursecode", headerName: "Course Code", width: 140 },
  { field: "assessmentgroup", headerName: "Assessment Group", width: 170 },
  { field: "grouptype", headerName: "Group Type", width: 130 },
  { field: "scoretype", headerName: "Score Type", width: 130 },
  { field: "componenttype", headerName: "Component Type", width: 150 },
  { field: "assessmentcomponent", headerName: "Component", minWidth: 190 },
  { field: "marks", headerName: "Marks", width: 110, type: "number" },
  { field: "passmarks", headerName: "Pass Marks", width: 120, type: "number" },
  { field: "weightage", headerName: "Weightage", width: 120, type: "number" },
  { field: "credits", headerName: "Credits", width: 110, type: "number" },
  { field: "status", headerName: "Status", width: 120 }
];

const optionLabel = (row) => row ? `${row.program || ""}${row.programcode ? ` (${row.programcode})` : ""}` : "";

function htmlTable(rows, columns) {
  if (!rows.length) return `<p class="muted">No data found.</p>`;
  return `
    <table>
      <thead><tr>${columns.map((col) => `<th>${escapeHtml(col.headerName)}</th>`).join("")}</tr></thead>
      <tbody>
        ${rows.map((row) => `<tr>${columns.map((col) => `<td>${escapeHtml(row[col.field])}</td>`).join("")}</tr>`).join("")}
      </tbody>
    </table>
  `;
}

export default function RegulationReportPage() {
  const [allCourses, setAllCourses] = useState([]);
  const [institution, setInstitution] = useState(null);
  const [regulation, setRegulation] = useState("");
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [courses, setCourses] = useState([]);
  const [components, setComponents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const regulationOptions = useMemo(() => uniqueSorted(allCourses.map((row) => row.regulation)), [allCourses]);
  const programOptions = useMemo(() => {
    const map = new Map();
    allCourses
      .filter((row) => !regulation || row.regulation === regulation)
      .forEach((row) => {
        const key = row.programcode || row.program;
        if (key && !map.has(key)) map.set(key, { program: row.program || "", programcode: row.programcode || "" });
      });
    return [...map.values()].sort((a, b) => optionLabel(a).localeCompare(optionLabel(b), undefined, { numeric: true }));
  }, [allCourses, regulation]);

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
      setError(err.response?.data?.message || "Unable to load regulation report options.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBaseData();
  }, []);

  useEffect(() => {
    if (selectedProgram && !programOptions.some((item) => item.programcode === selectedProgram.programcode && item.program === selectedProgram.program)) {
      setSelectedProgram(null);
    }
  }, [programOptions, selectedProgram]);

  const loadReport = async () => {
    if (!regulation || !selectedProgram?.programcode) {
      setError("Select regulation and program.");
      return;
    }
    try {
      setLoading(true);
      setError("");
      setMessage("");
      const params = { colid: global1.colid, regulation, programcode: selectedProgram.programcode };
      const [courseRes, componentRes] = await Promise.all([
        ep1.get("/api/v2/regulationcoursemap", { params }),
        ep1.get("/api/v2/assessmentcomponent", { params })
      ]);
      setCourses(courseRes.data?.data || []);
      setComponents(componentRes.data?.data || []);
      setMessage("Regulation report loaded.");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load regulation report.");
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
    const win = window.open("", "_blank", "width=1100,height=800");
    if (!win) return;
    win.document.write(`<!doctype html>
      <html>
        <head>
          <title>Regulation Report</title>
          <style>
            body{font-family:Arial,Helvetica,sans-serif;color:#000;background:#fff;margin:0}
            .actions{padding:10px;border-bottom:1px solid #ccc;background:#f7f7f7}
            .actions button{margin-right:8px;padding:7px 14px}
            .page{padding:14mm}
            .header{text-align:center;border-bottom:2px solid #111;padding-bottom:10px;margin-bottom:12px;position:relative;min-height:72px}
            .logo{position:absolute;left:0;top:0;max-width:82px;max-height:72px;object-fit:contain}
            h1{font-size:20px;margin:0 90px 4px;font-weight:800}
            h2{font-size:17px;margin:10px 0 0;text-transform:uppercase;letter-spacing:.4px}
            .meta{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:12px 0;font-size:12px}
            .meta div{border:1px solid #111;padding:6px}
            .summary{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:10px 0 14px}
            .summary div{border:1px solid #111;padding:7px;font-size:12px}
            .summary b{display:block;font-size:15px;margin-top:3px}
            table{width:100%;border-collapse:collapse;font-size:10.5px;margin-bottom:16px}
            th,td{border:1px solid #111;padding:5px;vertical-align:top;text-align:left}
            th{background:#eee;font-weight:700}
            thead{display:table-header-group}
            tr{break-inside:avoid;page-break-inside:avoid}
            .section-title{font-size:14px;font-weight:800;margin:14px 0 6px}
            .muted{color:#333;font-size:12px}
            @media print{.actions{display:none}.page{padding:10mm}@page{size:A4 portrait;margin:10mm}}
          </style>
        </head>
        <body>
          <div class="actions"><button onclick="window.print()">Print</button><button onclick="window.close()">Close</button></div>
          <div class="page">
            <div class="header">
              ${logo ? `<img class="logo" src="${escapeHtml(logo)}" alt="Logo" />` : ""}
              <h1>${escapeHtml(name)}</h1>
              <div>${escapeHtml(address)}</div>
              <div>${escapeHtml([phone, email].filter(Boolean).join(" | "))}</div>
              <h2>Regulation Report</h2>
            </div>
            <div class="meta">
              <div><strong>Regulation:</strong><br/>${escapeHtml(regulation)}</div>
              <div><strong>Program:</strong><br/>${escapeHtml(selectedProgram?.program)}</div>
              <div><strong>Program Code:</strong><br/>${escapeHtml(selectedProgram?.programcode)}</div>
            </div>
            <div class="summary">
              <div>Courses <b>${courses.length}</b></div>
              <div>Total Credits <b>${totalCredits}</b></div>
              <div>Assessment Components <b>${components.length}</b></div>
              <div>Total Component Marks <b>${totalMarks}</b></div>
            </div>
            <div class="section-title">Courses from Regulation Course Map</div>
            ${htmlTable(courses, courseColumns.filter((col) => col.field !== "academicyear"))}
            <div class="section-title">Assessment Components</div>
            ${htmlTable(components, componentColumns.filter((col) => col.field !== "academicyear"))}
          </div>
        </body>
      </html>`);
    win.document.close();
    win.focus();
  };

  return (
    <MenuPageShell title="Regulation Report">
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2} sx={{ mb: 2 }}>
          <Box>
            <Typography variant="h5" fontWeight={900}>Regulation Report</Typography>
            <Typography color="text.secondary">View mapped courses and assessment components for the selected regulation and program.</Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" startIcon={<Refresh />} onClick={loadBaseData}>Refresh Options</Button>
            <Button variant="contained" startIcon={<Print />} disabled={!courses.length && !components.length} onClick={printPreview}>Print Preview</Button>
          </Stack>
        </Stack>

        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}
        {message && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMessage("")}>{message}</Alert>}

        <Paper elevation={0} sx={{ p: 2, mb: 2, border: "1px solid #e5e7eb", borderRadius: 2 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <Autocomplete
                options={regulationOptions}
                value={regulation}
                onChange={(_, value) => {
                  setRegulation(value || "");
                  setSelectedProgram(null);
                  setCourses([]);
                  setComponents([]);
                }}
                renderInput={(params) => <TextField {...params} label="Regulation" />}
              />
            </Grid>
            <Grid item xs={12} md={5}>
              <Autocomplete
                options={programOptions}
                value={selectedProgram}
                isOptionEqualToValue={(option, value) => option.programcode === value.programcode && option.program === value.program}
                getOptionLabel={optionLabel}
                onChange={(_, value) => {
                  setSelectedProgram(value);
                  setCourses([]);
                  setComponents([]);
                }}
                renderInput={(params) => <TextField {...params} label="Program / Program Code" />}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField fullWidth label="Program Code" value={selectedProgram?.programcode || ""} InputProps={{ readOnly: true }} />
            </Grid>
            <Grid item xs={12}>
              <Button variant="contained" onClick={loadReport} disabled={loading || !regulation || !selectedProgram?.programcode}>Load Report</Button>
            </Grid>
          </Grid>
        </Paper>

        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} md={3}><Card><CardContent><Typography color="text.secondary">Courses</Typography><Typography variant="h4" fontWeight={900}>{courses.length}</Typography></CardContent></Card></Grid>
          <Grid item xs={12} md={3}><Card><CardContent><Typography color="text.secondary">Total Credits</Typography><Typography variant="h4" fontWeight={900}>{totalCredits}</Typography></CardContent></Card></Grid>
          <Grid item xs={12} md={3}><Card><CardContent><Typography color="text.secondary">Components</Typography><Typography variant="h4" fontWeight={900}>{components.length}</Typography></CardContent></Card></Grid>
          <Grid item xs={12} md={3}><Card><CardContent><Typography color="text.secondary">Component Marks</Typography><Typography variant="h4" fontWeight={900}>{totalMarks}</Typography></CardContent></Card></Grid>
        </Grid>

        <Paper elevation={0} sx={{ p: 2, mb: 2, border: "1px solid #e5e7eb", borderRadius: 2 }}>
          <Typography fontWeight={900} sx={{ mb: 1 }}>Courses from Regulation Course Map</Typography>
          <Box sx={{ height: 440, width: "100%" }}>
            <DataGrid
              rows={courses.map((row) => ({ ...row, id: row._id }))}
              columns={courseColumns}
              loading={loading}
              slots={{ toolbar: GridToolbar }}
              pageSizeOptions={[10, 25, 50, 100]}
              sx={{ "& .MuiDataGrid-cell": { whiteSpace: "normal", alignItems: "flex-start", py: 1 } }}
            />
          </Box>
        </Paper>

        <Paper elevation={0} sx={{ p: 2, border: "1px solid #e5e7eb", borderRadius: 2 }}>
          <Typography fontWeight={900} sx={{ mb: 1 }}>Assessment Components</Typography>
          <Box sx={{ height: 440, width: "100%" }}>
            <DataGrid
              rows={components.map((row) => ({ ...row, id: row._id }))}
              columns={componentColumns}
              loading={loading}
              slots={{ toolbar: GridToolbar }}
              pageSizeOptions={[10, 25, 50, 100]}
              sx={{ "& .MuiDataGrid-cell": { whiteSpace: "normal", alignItems: "flex-start", py: 1 } }}
            />
          </Box>
        </Paper>
      </Container>
    </MenuPageShell>
  );
}
