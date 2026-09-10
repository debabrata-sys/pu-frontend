import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  Paper,
  Stack,
  Tab,
  Tabs,
  Typography
} from "@mui/material";
import { DataGrid, GridToolbar } from "@mui/x-data-grid";
import PrintIcon from "@mui/icons-material/Print";
import RefreshIcon from "@mui/icons-material/Refresh";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import ApartmentIcon from "@mui/icons-material/Apartment";
import GroupsIcon from "@mui/icons-material/Groups";
import SchoolIcon from "@mui/icons-material/School";
import CategoryIcon from "@mui/icons-material/Category";
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

const colors = ["#2563eb", "#16a34a", "#f97316", "#7c3aed", "#0891b2", "#dc2626", "#4f46e5", "#0f766e", "#b45309", "#65a30d"];
const text = (value) => String(value || "").trim();
const uniqueSorted = (values = []) => [...new Set(values.map(text).filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
const uniqRows = (rows = [], keyFn) => [...new Map(rows.map((row) => [keyFn(row), row]).filter(([key]) => key)).values()];
const instName = (institution = {}) => institution.institutionname || institution.insname || institution.name || global1.insname || "Institution";
const instAddress = (institution = {}) => institution.address || institution.address1 || global1.address || "";
const instLogo = (institution = {}) => institution.logolink || institution.logo || institution.inslogo || global1.logo || "";
const safe = (value) => String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const gridSx = {
  "& .MuiDataGrid-cell": { whiteSpace: "normal", overflowWrap: "anywhere", lineHeight: 1.3, py: 1, alignItems: "flex-start" },
  "& .MuiDataGrid-columnHeaderTitle": { whiteSpace: "normal", lineHeight: 1.2 }
};

function countBy(rows, field) {
  return uniqueSorted(rows.map((row) => row[field])).map((label) => ({
    label,
    count: rows.filter((row) => text(row[field]) === label).length
  }));
}

function CardTile({ label, value, icon, gradient, onClick }) {
  return (
    <Card
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") onClick?.(); }}
      sx={{
        height: "100%",
        color: "white",
        background: gradient,
        borderRadius: 2,
        boxShadow: "0 18px 40px rgba(15,23,42,.16)",
        cursor: "pointer",
        transition: "transform .16s ease, box-shadow .16s ease",
        "&:hover": { transform: "translateY(-3px)", boxShadow: "0 22px 46px rgba(15,23,42,.22)" }
      }}
    >
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography sx={{ opacity: 0.9, fontWeight: 800 }}>{label}</Typography>
            <Typography variant="h3" fontWeight={950}>{Number(value || 0).toLocaleString("en-IN")}</Typography>
          </Box>
          <Box sx={{ width: 56, height: 56, borderRadius: 2, bgcolor: "rgba(255,255,255,.2)", display: "grid", placeItems: "center" }}>{icon}</Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

function ChartCard({ title, children }) {
  return (
    <Paper elevation={0} sx={{ p: 2, height: "100%", border: "1px solid #e5e7eb", borderRadius: 2 }}>
      <Typography fontWeight={900} sx={{ mb: 1 }}>{title}</Typography>
      <Box sx={{ height: 300 }}>{children}</Box>
    </Paper>
  );
}

function BarPanel({ data = [] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data.slice(0, 15)}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} angle={-25} textAnchor="end" height={78} />
        <YAxis allowDecimals={false} />
        <Tooltip />
        <Legend />
        <Bar dataKey="count" radius={[7, 7, 0, 0]} fill="#2563eb" />
      </BarChart>
    </ResponsiveContainer>
  );
}

function PiePanel({ data = [] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Tooltip />
        <Legend />
        <Pie data={data.slice(0, 12)} dataKey="count" nameKey="label" outerRadius={95} label>
          {data.slice(0, 12).map((row, index) => <Cell key={row.label || index} fill={colors[index % colors.length]} />)}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  );
}

function printTable(rows, columns) {
  return `<table><thead><tr><th>Sr</th>${columns.map((col) => `<th>${safe(col.headerName || col.field)}</th>`).join("")}</tr></thead><tbody>${rows.length ? rows.map((row, index) => `<tr><td>${index + 1}</td>${columns.map((col) => `<td>${safe(row[col.field])}</td>`).join("")}</tr>`).join("") : `<tr><td colspan="${columns.length + 1}" style="text-align:center">No records</td></tr>`}</tbody></table>`;
}

function openPrint({ institution, cards, tabData }) {
  const win = window.open("", "_blank", "width=1100,height=800");
  if (!win) return alert("Popup blocked. Please allow popups for print preview.");
  win.document.write(`<!doctype html><html><head><title>Institution Overview</title><style>
    body{font-family:Arial,Helvetica,sans-serif;color:#000;background:#fff;margin:0}
    .actions{padding:10px;border-bottom:1px solid #ccc;background:#f5f5f5}.actions button{margin-right:8px;padding:7px 14px}
    .page{padding:12mm}.header{text-align:center;border-bottom:2px solid #111;padding-bottom:10px;margin-bottom:12px;position:relative;min-height:72px}
    .logo{position:absolute;left:0;top:0;max-width:82px;max-height:70px;object-fit:contain}h1{font-size:21px;margin:0 90px 4px;font-weight:900}h2{font-size:17px;margin:8px 0 0;text-transform:uppercase}
    .cards{display:grid;grid-template-columns:repeat(5,1fr);gap:7px;margin:10px 0 14px}.card{border:1px solid #111;padding:8px;font-size:11px}.card b{display:block;font-size:18px;margin-top:4px}
    h3{font-size:14px;margin:14px 0 5px}table{width:100%;border-collapse:collapse;font-size:9.2px;margin-bottom:12px}th,td{border:1px solid #111;padding:4px;text-align:left;vertical-align:top;word-break:break-word}th{background:#eee}thead{display:table-header-group}tr{break-inside:avoid}
    @page{size:A4 portrait;margin:8mm}@media print{.actions{display:none}.page{padding:0}}
  </style></head><body><div class="actions"><button onclick="window.print()">Print</button><button onclick="window.close()">Close</button></div><div class="page">
    <div class="header">${instLogo(institution) ? `<img class="logo" src="${safe(instLogo(institution))}" />` : ""}<h1>${safe(instName(institution))}</h1><div>${safe(instAddress(institution))}</div><h2>Institution Overview</h2></div>
    <div class="cards">${cards.map((card) => `<div class="card">${safe(card.label)}<b>${safe(card.value)}</b></div>`).join("")}</div>
    ${tabData.map((tab) => `<h3>${safe(tab.label)}</h3>${printTable(tab.rows, tab.columns)}`).join("")}
  </div></body></html>`);
  win.document.close();
  win.focus();
}

export default function InstitutionOverviewDashboardPage() {
  const [institution, setInstitution] = useState({});
  const [programs, setPrograms] = useState([]);
  const [specializations, setSpecializations] = useState([]);
  const [tab, setTab] = useState("faculty");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      setError("");
      const [institutionRes, programRes, specNewRes, specOldRes] = await Promise.all([
        ep1.get("/vins", { params: { colid: global1.colid } }).catch(() => ({ data: {} })),
        ep1.get("/api/v2/mprograms-management", { params: { colid: global1.colid } }),
        ep1.get("/api/v2/specialization-new", { params: { colid: global1.colid } }).catch(() => ({ data: { data: [] } })),
        ep1.get("/api/v2/specialization", { params: { colid: global1.colid } }).catch(() => ({ data: { data: [] } }))
      ]);
      setInstitution(institutionRes.data || {});
      setPrograms(programRes.data?.data || []);
      setSpecializations([...(specNewRes.data?.data || specNewRes.data?.specializations || []), ...(specOldRes.data?.data || [])]);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load institution overview.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const data = useMemo(() => {
    const programRows = uniqRows(programs.map((row) => ({
      id: `${row.academicyear || row.year || ""}|${row.programcode || ""}|${row.program || ""}`,
      academicyear: row.academicyear || row.year,
      program: row.program,
      programcode: row.programcode,
      institution: row.institution,
      faculty: row.faculty,
      department: row.department,
      level: row.level,
      board: row.type,
      totalcredits: row.totalcredits
    })), (row) => row.id);
    const facultyRows = uniqueSorted(programRows.map((row) => row.faculty)).map((faculty, index) => ({
      id: faculty || index,
      faculty,
      institutions: uniqueSorted(programRows.filter((row) => text(row.faculty) === faculty).map((row) => row.institution)).join(", "),
      departments: uniqueSorted(programRows.filter((row) => text(row.faculty) === faculty).map((row) => row.department)).join(", "),
      programs: programRows.filter((row) => text(row.faculty) === faculty).length
    }));
    const instituteRows = uniqueSorted(programRows.map((row) => row.institution)).map((institutionName, index) => ({
      id: institutionName || index,
      institution: institutionName,
      faculties: uniqueSorted(programRows.filter((row) => text(row.institution) === institutionName).map((row) => row.faculty)).join(", "),
      departments: uniqueSorted(programRows.filter((row) => text(row.institution) === institutionName).map((row) => row.department)).join(", "),
      programs: programRows.filter((row) => text(row.institution) === institutionName).length
    }));
    const departmentRows = uniqueSorted(programRows.map((row) => row.department)).map((department, index) => ({
      id: department || index,
      department,
      institution: uniqueSorted(programRows.filter((row) => text(row.department) === department).map((row) => row.institution)).join(", "),
      faculty: uniqueSorted(programRows.filter((row) => text(row.department) === department).map((row) => row.faculty)).join(", "),
      programs: programRows.filter((row) => text(row.department) === department).length
    }));
    const specializationRows = uniqRows(specializations.map((row) => ({
      id: `${row.academicyear || ""}|${row.regulation || ""}|${row.programcode || ""}|${row.semester || ""}|${row.specialization || row.course || ""}`,
      academicyear: row.academicyear,
      regulation: row.regulation,
      program: row.program,
      programcode: row.programcode,
      semester: row.semester,
      specialization: row.specialization || row.course,
      status: row.status
    })), (row) => row.id);
    return { facultyRows, instituteRows, departmentRows, programRows, specializationRows };
  }, [programs, specializations]);

  const cards = [
    { label: "Departments", value: data.departmentRows.length, tabKey: "department", icon: <ApartmentIcon fontSize="large" />, gradient: "linear-gradient(135deg,#0f766e,#14b8a6)" },
    { label: "Institutions", value: data.instituteRows.length, tabKey: "institute", icon: <AccountBalanceIcon fontSize="large" />, gradient: "linear-gradient(135deg,#1d4ed8,#60a5fa)" },
    { label: "Programs", value: data.programRows.length, tabKey: "program", icon: <SchoolIcon fontSize="large" />, gradient: "linear-gradient(135deg,#c2410c,#fb923c)" },
    { label: "Faculty", value: data.facultyRows.length, tabKey: "faculty", icon: <GroupsIcon fontSize="large" />, gradient: "linear-gradient(135deg,#6d28d9,#a78bfa)" },
    { label: "Specializations", value: data.specializationRows.length, tabKey: "specialization", icon: <CategoryIcon fontSize="large" />, gradient: "linear-gradient(135deg,#be123c,#fb7185)" }
  ];

  const tabData = {
    faculty: { label: "Faculty", rows: data.facultyRows, columns: ["faculty", "institutions", "departments", "programs"].map((field) => ({ field, headerName: field, minWidth: 150, flex: 1 })) },
    institute: { label: "Institute", rows: data.instituteRows, columns: ["institution", "faculties", "departments", "programs"].map((field) => ({ field, headerName: field, minWidth: 180, flex: 1 })) },
    department: { label: "Department", rows: data.departmentRows, columns: ["department", "faculty", "programs", "institution"].map((field) => ({ field, headerName: field, minWidth: 150, flex: 1 })) },
    program: { label: "Program", rows: data.programRows, columns: ["academicyear", "program", "programcode", "institution", "faculty", "department", "level", "board", "totalcredits"].map((field) => ({ field, headerName: field, minWidth: 135, flex: 1 })) },
    specialization: { label: "Specialization", rows: data.specializationRows, columns: ["academicyear", "regulation", "program", "programcode", "semester", "specialization", "status"].map((field) => ({ field, headerName: field, minWidth: 145, flex: 1 })) }
  };

  const printPreview = () => openPrint({ institution, cards, tabData: Object.values(tabData) });

  return (
    <MenuPageShell title="Institution overview">
      <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: "#f6f7fb", minHeight: "100vh" }}>
        <Paper elevation={0} sx={{ p: 2.5, mb: 2, border: "1px solid #e5e7eb", borderRadius: 2 }}>
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2}>
            <Box>
              <Typography variant="h5" fontWeight={950}>Institution overview</Typography>
              <Typography color="text.secondary">Bird's-eye operational view of institution structure, departments, programs, faculty and specializations.</Typography>
            </Box>
            <Stack direction="row" spacing={1}>
              <Button variant="outlined" startIcon={<RefreshIcon />} onClick={load} disabled={loading}>Refresh</Button>
              <Button variant="contained" startIcon={<PrintIcon />} onClick={printPreview}>Print Preview</Button>
            </Stack>
          </Stack>
        </Paper>
        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}

        <Grid container spacing={2} sx={{ mb: 2 }}>
          {cards.map((card) => <Grid item xs={12} sm={6} md={2.4} key={card.label}><CardTile {...card} onClick={() => setTab(card.tabKey)} /></Grid>)}
        </Grid>

        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} md={6}><ChartCard title="Programs by faculty"><BarPanel data={countBy(data.programRows, "faculty")} /></ChartCard></Grid>
          <Grid item xs={12} md={6}><ChartCard title="Programs by institution"><PiePanel data={countBy(data.programRows, "institution")} /></ChartCard></Grid>
          <Grid item xs={12} md={6}><ChartCard title="Programs by department"><BarPanel data={countBy(data.programRows, "department")} /></ChartCard></Grid>
          <Grid item xs={12} md={6}><ChartCard title="Specializations by program"><PiePanel data={countBy(data.specializationRows, "programcode")} /></ChartCard></Grid>
        </Grid>

        <Paper elevation={0} sx={{ p: 2, border: "1px solid #e5e7eb", borderRadius: 2 }}>
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ md: "center" }} sx={{ mb: 1 }} spacing={1}>
            <Tabs value={tab} onChange={(_, value) => setTab(value)} variant="scrollable" scrollButtons="auto">
              {Object.entries(tabData).map(([key, info]) => <Tab key={key} value={key} label={info.label} />)}
            </Tabs>
            <Chip color="primary" label={`${tabData[tab].rows.length} records`} />
          </Stack>
          <Box sx={{ height: 590, width: "100%" }}>
            <DataGrid
              rows={tabData[tab].rows}
              getRowId={(row) => row.id || row._id || JSON.stringify(row)}
              columns={tabData[tab].columns}
              loading={loading}
              slots={{ toolbar: GridToolbar }}
              pageSizeOptions={[10, 25, 50, 100]}
              initialState={{ pagination: { paginationModel: { pageSize: 25, page: 0 } } }}
              sx={gridSx}
            />
          </Box>
        </Paper>
      </Box>
    </MenuPageShell>
  );
}
