import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Checkbox,
  Card,
  CardContent,
  Grid,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import { DataGrid, GridToolbar } from "@mui/x-data-grid";
import AssessmentIcon from "@mui/icons-material/Assessment";
import DownloadIcon from "@mui/icons-material/Download";
import PrintIcon from "@mui/icons-material/Print";
import RefreshIcon from "@mui/icons-material/Refresh";
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

const palette = ["#2563eb", "#0891b2", "#16a34a", "#dc2626", "#7c3aed", "#ea580c", "#0f766e", "#4f46e5"];
const filters = [
  ["academicyear", "Academic year", "academicyears"],
  ["regulation", "Regulation", "regulations"],
  ["exam", "Exam", "exams"],
  ["examcode", "Exam code", "examcodes"],
  ["program", "Program", "programs"],
  ["programcode", "Program code", "programcodes"],
  ["semester", "Semester", "semesters"]
];
const csvEscape = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
const formatNumber = (value, suffix = "") => `${Number(value || 0).toLocaleString("en-IN")}${suffix}`;
const gridSx = {
  "& .MuiDataGrid-cell": { whiteSpace: "normal", overflowWrap: "anywhere", lineHeight: 1.3, py: 1 },
  "& .MuiDataGrid-columnHeaderTitle": { whiteSpace: "normal", lineHeight: 1.2 }
};
const institutionName = (institution = {}) => institution.institutionname || institution.insname || institution.name || global1.insname || "Institution";
const institutionLogo = (institution = {}) => institution.logolink || institution.logo || global1.logo || "";
const institutionAddress = (institution = {}) => institution.address || institution.address1 || global1.address || "";

function MultiFilter({ label, value, options, onChange }) {
  const choices = ["All", ...(options || [])];
  return (
    <Autocomplete
      multiple
      disableCloseOnSelect
      size="small"
      options={choices}
      value={value || []}
      onChange={(event, next) => onChange(next.includes("All") ? [] : next)}
      renderOption={(props, option, { selected }) => (
        <li {...props}>
          <Checkbox size="small" checked={option === "All" ? !(value || []).length : selected} sx={{ mr: 1 }} />
          {option}
        </li>
      )}
      renderInput={(params) => <TextField {...params} label={label} placeholder="All" />}
    />
  );
}

function ChartCard({ title, children, height = 310 }) {
  return (
    <Paper elevation={0} sx={{ p: 2, height: "100%", border: "1px solid #e5e7eb", borderRadius: 2 }}>
      <Typography fontWeight={900} sx={{ mb: 1 }}>{title}</Typography>
      <Box sx={{ height }}>{children}</Box>
    </Paper>
  );
}

function ProgramChart({ data = [] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data.slice(0, 14)}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} angle={-25} textAnchor="end" height={88} />
        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
        <Tooltip />
        <Legend />
        <Bar dataKey="applied" fill="#2563eb" radius={[6, 6, 0, 0]} />
        <Bar dataKey="admiteligible" name="Admit eligible" fill="#7c3aed" radius={[6, 6, 0, 0]} />
        <Bar dataKey="appeared" fill="#0891b2" radius={[6, 6, 0, 0]} />
        <Bar dataKey="passed" fill="#16a34a" radius={[6, 6, 0, 0]} />
        <Bar dataKey="failed" fill="#dc2626" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function YearChart({ data = [] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
        <Tooltip />
        <Legend />
        <Bar dataKey="applied" fill="#2563eb" radius={[6, 6, 0, 0]} />
        <Bar dataKey="appeared" fill="#0891b2" radius={[6, 6, 0, 0]} />
        <Bar dataKey="passed" fill="#16a34a" radius={[6, 6, 0, 0]} />
        <Bar dataKey="failed" fill="#dc2626" radius={[6, 6, 0, 0]} />
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
        <Pie data={data} dataKey="count" nameKey="label" outerRadius={95} label>
          {data.map((entry, index) => <Cell key={entry.label} fill={palette[index % palette.length]} />)}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  );
}

function ExamDashboardPage({ studentwise = false }) {
  const [options, setOptions] = useState({});
  const [selectedFilters, setSelectedFilters] = useState({});
  const [failRule, setFailRule] = useState("any");
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const pageTitle = studentwise ? "Exam Dashboard 2" : "Exam Dashboard";
  const pageDescription = studentwise
    ? "Studentwise applied, admit eligible, appeared, pass and fail summary. Each student is counted only once even when multiple subjects exist."
    : "Programwise applied, admit eligible, appeared, pass and fail summary from exam roll and viva marks.";

  useEffect(() => {
    loadOptions();
    loadDashboard({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const requestParams = (next = selectedFilters) => {
    const params = { colid: global1.colid };
    filters.forEach(([field]) => {
      if (next[field]?.length) params[field] = next[field].join(",");
    });
    if (studentwise) params.failrule = failRule;
    return params;
  };

  const loadOptions = async () => {
    const res = await ep1.get("/api/v2/exam-dashboard/options", { params: { colid: global1.colid } });
    setOptions(res.data?.options || {});
  };

  const loadDashboard = async (next = selectedFilters) => {
    try {
      setLoading(true);
      setError("");
      const endpoint = studentwise ? "/api/v2/exam-dashboard/studentwise-summary" : "/api/v2/exam-dashboard/summary";
      const res = await ep1.get(endpoint, { params: requestParams(next) });
      setDashboard(res.data?.data || null);
    } catch (err) {
      setError(err.response?.data?.message || `Unable to load ${pageTitle.toLowerCase()}`);
    } finally {
      setLoading(false);
    }
  };

  const updateFilter = (field, value) => setSelectedFilters((prev) => ({ ...prev, [field]: value }));

  const columns = useMemo(() => [
    { field: "academicyear", headerName: "Academic Year", minWidth: 130 },
    { field: "program", headerName: "Program", minWidth: 180, flex: 1 },
    { field: "programcode", headerName: "Program Code", minWidth: 140 },
    { field: "exam", headerName: "Exam", minWidth: 150, flex: 1 },
    { field: "examcode", headerName: "Exam Code", minWidth: 130 },
    { field: "applied", headerName: "Applied", minWidth: 105, type: "number" },
    { field: "admiteligible", headerName: "Admit Eligible", minWidth: 135, type: "number" },
    { field: "appeared", headerName: "Appeared", minWidth: 110, type: "number" },
    { field: "passed", headerName: "Passed", minWidth: 100, type: "number" },
    { field: "failed", headerName: "Failed", minWidth: 100, type: "number" },
    { field: "passPercent", headerName: "Pass %", minWidth: 105, type: "number" },
    { field: "appearancePercent", headerName: "Appearance %", minWidth: 135, type: "number" },
    { field: "pendingResult", headerName: "Pending Result", minWidth: 135, type: "number" },
    { field: "distinctStudents", headerName: "Distinct Students", minWidth: 145, type: "number" }
  ], []);

  const exportCsv = () => {
    const rows = dashboard?.table || [];
    const fields = columns.map((column) => column.field);
    const csv = [
      columns.map((column) => csvEscape(column.headerName)).join(","),
      ...rows.map((row) => fields.map((field) => csvEscape(row[field])).join(","))
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "exam_dashboard.csv";
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const cards = dashboard?.cards || [];
  const charts = dashboard?.charts || {};
  const institution = dashboard?.institution || {};

  return (
    <MenuPageShell title={pageTitle}>
      <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: "#f6f7fb", minHeight: "100vh" }}>
        <style>{`
          @media print {
            body { background: white !important; color: #000 !important; }
            .no-print { display: none !important; }
            .print-area { box-shadow: none !important; border: 0 !important; }
            .MuiDataGrid-root { color: #000 !important; }
          }
        `}</style>
        <Paper className="no-print" elevation={0} sx={{ p: 2.5, mb: 2, border: "1px solid #e5e7eb", borderRadius: 2, background: "linear-gradient(135deg, #111827, #1d4ed8)" }}>
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2} alignItems={{ xs: "stretch", md: "center" }}>
            <Box>
              <Stack direction="row" alignItems="center" spacing={1}>
                <AssessmentIcon sx={{ color: "#bfdbfe" }} />
                <Typography variant="h4" color="white" fontWeight={900}>{pageTitle}</Typography>
              </Stack>
              <Typography sx={{ color: "#dbeafe", mt: 0.5 }}>{pageDescription}</Typography>
            </Box>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
              <Button variant="contained" color="secondary" startIcon={<RefreshIcon />} onClick={() => loadDashboard()} disabled={loading}>Apply</Button>
              <Button variant="outlined" startIcon={<DownloadIcon />} onClick={exportCsv} sx={{ color: "white", borderColor: "#bfdbfe" }}>Export</Button>
              <Button variant="outlined" startIcon={<PrintIcon />} onClick={() => window.print()} sx={{ color: "white", borderColor: "#bfdbfe" }}>Print</Button>
            </Stack>
          </Stack>
        </Paper>

        <Paper className="no-print" elevation={0} sx={{ p: 2, mb: 2, border: "1px solid #e5e7eb", borderRadius: 2 }}>
          <Grid container spacing={1.5}>
            {filters.map(([field, label, optionKey]) => (
              <Grid item xs={12} sm={6} md={field === "academicyear" ? 4 : 3} key={field}>
                <MultiFilter label={label} value={selectedFilters[field] || []} options={options[optionKey] || []} onChange={(value) => updateFilter(field, value)} />
              </Grid>
            ))}
            {studentwise && (
              <Grid item xs={12} sm={6} md={4}>
                <TextField select fullWidth size="small" label="Fail rule" value={failRule} onChange={(event) => setFailRule(event.target.value)}>
                  <MenuItem value="any">Fail if failed in single subject</MenuItem>
                  <MenuItem value="all">Fail only if failed in all subjects</MenuItem>
                </TextField>
              </Grid>
            )}
          </Grid>
        </Paper>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Box className="print-area">
          <Paper elevation={0} sx={{ p: 2, mb: 2, border: "1px solid #e5e7eb", borderRadius: 2, textAlign: "center" }}>
            {institutionLogo(institution) && <Box component="img" src={institutionLogo(institution)} alt="logo" sx={{ height: 58, objectFit: "contain", mb: 1 }} />}
            <Typography variant="h5" fontWeight={950}>{institutionName(institution)}</Typography>
            <Typography variant="body2">{institutionAddress(institution)}</Typography>
            <Typography variant="h6" fontWeight={950} sx={{ mt: 1 }}>{pageTitle}</Typography>
            <Typography variant="caption">Academic year: {(selectedFilters.academicyear || []).join(", ") || "All"}</Typography>
            {studentwise && <Typography variant="caption" display="block">Fail rule: {failRule === "all" ? "Fail only if failed in all subjects" : "Fail if failed in single subject"}</Typography>}
          </Paper>

          <Grid container spacing={2} sx={{ mb: 2 }}>
            {cards.map((card) => (
              <Grid item xs={12} sm={6} md={2} key={card.key}>
                <Card elevation={0} sx={{ border: `1px solid ${card.tone}33`, borderLeft: `5px solid ${card.tone}`, borderRadius: 2, height: "100%" }}>
                  <CardContent>
                    <Typography color="text.secondary" fontWeight={700}>{card.label}</Typography>
                    <Typography variant="h4" fontWeight={950} sx={{ color: card.tone }}>{formatNumber(card.value, card.suffix || "")}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} lg={8}><ChartCard title="Programwise Applied vs Appeared vs Result"><ProgramChart data={charts.programwise || []} /></ChartCard></Grid>
            <Grid item xs={12} lg={4}><ChartCard title="Pass / Fail"><PiePanel data={charts.passFail || []} /></ChartCard></Grid>
            <Grid item xs={12} lg={6}><ChartCard title="Academic Year Trend"><YearChart data={charts.yearwise || []} /></ChartCard></Grid>
            <Grid item xs={12} lg={6}><ChartCard title="Applied, Admit Eligible and Appeared"><PiePanel data={charts.appliedAppeared || []} /></ChartCard></Grid>
          </Grid>

          <Paper elevation={0} sx={{ p: 2, border: "1px solid #e5e7eb", borderRadius: 2 }}>
            <Typography variant="h6" fontWeight={900} sx={{ mb: 1 }}>Programwise Details</Typography>
            <Box sx={{ height: 560 }}>
              <DataGrid
                rows={dashboard?.table || []}
                columns={columns}
                getRowId={(row) => row.id}
                loading={loading}
                slots={{ toolbar: GridToolbar }}
                pageSizeOptions={[25, 50, 100]}
                sx={gridSx}
                disableRowSelectionOnClick
              />
            </Box>
          </Paper>
        </Box>
      </Box>
    </MenuPageShell>
  );
}

export function ExamDashboard2Page() {
  return <ExamDashboardPage studentwise />;
}

export default ExamDashboardPage;
