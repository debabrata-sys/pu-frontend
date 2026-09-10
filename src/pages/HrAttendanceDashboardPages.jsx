import React, { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  Paper,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import { DataGrid, GridToolbar } from "@mui/x-data-grid";
import DownloadIcon from "@mui/icons-material/Download";
import PrintIcon from "@mui/icons-material/Print";
import RefreshIcon from "@mui/icons-material/Refresh";
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

const palette = ["#16a34a", "#dc2626", "#2563eb", "#7c3aed", "#ea580c", "#0891b2"];
const today = new Date().toISOString().slice(0, 10);
const firstDay = `${today.slice(0, 8)}01`;
const csvEscape = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
const formatNumber = (value, suffix = "") => `${Number(value || 0).toLocaleString("en-IN")}${suffix}`;
const gridSx = {
  "& .MuiDataGrid-cell": { whiteSpace: "normal", overflowWrap: "anywhere", lineHeight: 1.3, py: 1 },
  "& .MuiDataGrid-columnHeaderTitle": { whiteSpace: "normal", lineHeight: 1.2 }
};
const institutionName = (institution = {}) => institution.institutionname || institution.insname || institution.name || global1.insname || "Institution";
const institutionLogo = (institution = {}) => institution.logolink || institution.logo || global1.logo || "";
const institutionAddress = (institution = {}) => institution.address || institution.address1 || global1.address || "";

function Header({ title, subtitle, actions }) {
  return (
    <Paper className="no-print" elevation={0} sx={{ p: 2.5, mb: 2, border: "1px solid #e5e7eb", borderRadius: 2, background: "linear-gradient(135deg, #111827, #2563eb)" }}>
      <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2} alignItems={{ xs: "stretch", md: "center" }}>
        <Box>
          <Typography variant="h4" color="white" fontWeight={950}>{title}</Typography>
          <Typography sx={{ color: "#dbeafe", mt: 0.5 }}>{subtitle}</Typography>
        </Box>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>{actions}</Stack>
      </Stack>
    </Paper>
  );
}

function PrintHeader({ title, fromdate, todate, institution = {} }) {
  return (
    <Paper elevation={0} sx={{ p: 2, mb: 2, border: "1px solid #e5e7eb", borderRadius: 2, textAlign: "center" }}>
      {institutionLogo(institution) && <Box component="img" src={institutionLogo(institution)} alt="logo" sx={{ height: 58, objectFit: "contain", mb: 1 }} />}
      <Typography variant="h5" fontWeight={950}>{institutionName(institution)}</Typography>
      <Typography variant="body2">{institutionAddress(institution)}</Typography>
      <Typography variant="h6" fontWeight={950} sx={{ mt: 1 }}>{title}</Typography>
      <Typography variant="caption">Date range: {fromdate || "-"} to {todate || "-"}</Typography>
    </Paper>
  );
}

function Cards({ cards = [] }) {
  return (
    <Grid container spacing={2} sx={{ mb: 2 }}>
      {cards.map((card) => (
        <Grid item xs={12} sm={6} md={3} key={card.key}>
          <Card elevation={0} sx={{ border: `1px solid ${card.tone}33`, borderLeft: `5px solid ${card.tone}`, borderRadius: 2, height: "100%" }}>
            <CardContent>
              <Typography color="text.secondary" fontWeight={800}>{card.label}</Typography>
              <Typography variant="h4" fontWeight={950} sx={{ color: card.tone }}>{formatNumber(card.value, card.suffix || "")}</Typography>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}

function ChartCard({ title, children }) {
  return (
    <Paper elevation={0} sx={{ p: 2, height: "100%", border: "1px solid #e5e7eb", borderRadius: 2 }}>
      <Typography fontWeight={900} sx={{ mb: 1 }}>{title}</Typography>
      <Box sx={{ height: 320 }}>{children}</Box>
    </Paper>
  );
}

function PercentBar({ data = [], labelKey = "label" }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data.slice(0, 18)}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey={labelKey} tick={{ fontSize: 11 }} interval={0} angle={-25} textAnchor="end" height={92} />
        <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
        <Tooltip />
        <Legend />
        <Bar dataKey="percentage" name="Attendance %" fill="#2563eb" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function PresentAbsentPie({ data = [] }) {
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

function exportCsv(filename, rows, columns) {
  const fields = columns.map((column) => column.field);
  const csv = [
    columns.map((column) => csvEscape(column.headerName)).join(","),
    ...rows.map((row) => fields.map((field) => csvEscape(row[field])).join(","))
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

export function DummyHrAttendancePage() {
  const [form, setForm] = useState({ fromdate: firstDay, todate: today, academicyear: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    try {
      setLoading(true);
      setError("");
      setMessage("");
      const res = await ep1.post("/api/v2/hr-attendance-dummy/generate", { ...form, colid: global1.colid, user: global1.user });
      setMessage(`Generated ${res.data?.generated || 0} attendance rows for ${res.data?.users || 0} users across ${res.data?.days || 0} days. Inserted ${res.data?.upserted || 0}, updated ${res.data?.modified || 0}.`);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to generate dummy HR attendance");
    } finally {
      setLoading(false);
    }
  };

  return (
    <MenuPageShell title="Dummy HR attendance">
      <Box sx={{ p: 3, bgcolor: "#f6f7fb", minHeight: "100vh" }}>
        <Header title="Dummy HR attendance" subtitle="Generate datewise present and absent attendance for all non-student users." actions={<Button variant="contained" color="secondary" startIcon={<SaveIcon />} onClick={generate} disabled={loading}>{loading ? "Generating..." : "Generate"}</Button>} />
        {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Paper elevation={0} sx={{ p: 2, border: "1px solid #e5e7eb", borderRadius: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={3}><TextField fullWidth type="date" size="small" label="From date" InputLabelProps={{ shrink: true }} value={form.fromdate} onChange={(e) => setForm((prev) => ({ ...prev, fromdate: e.target.value }))} /></Grid>
            <Grid item xs={12} md={3}><TextField fullWidth type="date" size="small" label="To date" InputLabelProps={{ shrink: true }} value={form.todate} onChange={(e) => setForm((prev) => ({ ...prev, todate: e.target.value }))} /></Grid>
            <Grid item xs={12} md={3}><TextField fullWidth size="small" label="Academic year" value={form.academicyear} onChange={(e) => setForm((prev) => ({ ...prev, academicyear: e.target.value }))} /></Grid>
          </Grid>
        </Paper>
      </Box>
    </MenuPageShell>
  );
}

export function HrAttendanceDashboardPage() {
  const [filters, setFilters] = useState({ fromdate: firstDay, todate: today });
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const columns = useMemo(() => [
    { field: "department", headerName: "Department", minWidth: 220, flex: 1 },
    { field: "present", headerName: "Present", minWidth: 110, type: "number" },
    { field: "absent", headerName: "Absent", minWidth: 110, type: "number" },
    { field: "total", headerName: "Total", minWidth: 110, type: "number" },
    { field: "percentage", headerName: "Attendance %", minWidth: 140, type: "number" }
  ], []);

  const load = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await ep1.get("/api/v2/hr-attendance-dashboard/summary", { params: { ...filters, colid: global1.colid } });
      setDashboard(res.data?.data || null);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load HR attendance dashboard");
    } finally {
      setLoading(false);
    }
  };

  return (
    <MenuPageShell title="HR Attendance Dashboard">
      <Box sx={{ p: 3, bgcolor: "#f6f7fb", minHeight: "100vh" }}>
        <style>{`@media print {.no-print{display:none!important}.print-area{box-shadow:none!important;border:0!important} body{background:white!important;color:#000!important}}`}</style>
        <Header title="HR Attendance Dashboard" subtitle="Departmentwise attendance percentage for the selected date range." actions={<><Button variant="contained" color="secondary" startIcon={<RefreshIcon />} onClick={load} disabled={loading}>Apply</Button><Button variant="outlined" startIcon={<DownloadIcon />} onClick={() => exportCsv("hr_attendance_dashboard.csv", dashboard?.table || [], columns)} sx={{ color: "white", borderColor: "#bfdbfe" }}>Export</Button><Button variant="outlined" startIcon={<PrintIcon />} onClick={() => window.print()} sx={{ color: "white", borderColor: "#bfdbfe" }}>Print</Button></>} />
        <Paper className="no-print" sx={{ p: 2, mb: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={3}><TextField fullWidth type="date" size="small" label="From date" InputLabelProps={{ shrink: true }} value={filters.fromdate} onChange={(e) => setFilters((prev) => ({ ...prev, fromdate: e.target.value }))} /></Grid>
            <Grid item xs={12} md={3}><TextField fullWidth type="date" size="small" label="To date" InputLabelProps={{ shrink: true }} value={filters.todate} onChange={(e) => setFilters((prev) => ({ ...prev, todate: e.target.value }))} /></Grid>
          </Grid>
        </Paper>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Box className="print-area">
          <PrintHeader title="HR Attendance Dashboard" fromdate={filters.fromdate} todate={filters.todate} institution={dashboard?.institution || {}} />
          <Cards cards={dashboard?.cards || []} />
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} md={8}><ChartCard title="Departmentwise Attendance %"><PercentBar data={dashboard?.charts?.departmentwise || []} /></ChartCard></Grid>
            <Grid item xs={12} md={4}><ChartCard title="Present / Absent"><PresentAbsentPie data={dashboard?.charts?.presentAbsent || []} /></ChartCard></Grid>
          </Grid>
          <Paper sx={{ p: 2, border: "1px solid #e5e7eb", borderRadius: 2 }}>
            <Box sx={{ height: 520 }}><DataGrid rows={dashboard?.table || []} columns={columns} loading={loading} slots={{ toolbar: GridToolbar }} pageSizeOptions={[25, 50, 100]} sx={gridSx} /></Box>
          </Paper>
        </Box>
      </Box>
    </MenuPageShell>
  );
}

export function TeamAttendanceReportPage() {
  const [filters, setFilters] = useState({ fromdate: firstDay, todate: today });
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const columns = useMemo(() => [
    { field: "employee", headerName: "Employee", minWidth: 180, flex: 1 },
    { field: "employeeemail", headerName: "Email", minWidth: 220, flex: 1 },
    { field: "department", headerName: "Department", minWidth: 160 },
    { field: "date", headerName: "Date", minWidth: 120 },
    { field: "status", headerName: "Status", minWidth: 120 }
  ], []);

  const load = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await ep1.get("/api/v2/hr-team-attendance-report/summary", { params: { ...filters, colid: global1.colid, manageremail: global1.user } });
      setDashboard(res.data?.data || null);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load team attendance report");
    } finally {
      setLoading(false);
    }
  };

  return (
    <MenuPageShell title="Team attendance report">
      <Box sx={{ p: 3, bgcolor: "#f6f7fb", minHeight: "100vh" }}>
        <style>{`@media print {.no-print{display:none!important}.print-area{box-shadow:none!important;border:0!important} body{background:white!important;color:#000!important}}`}</style>
        <Header title="Team attendance report" subtitle="Direct-report datewise attendance and userwise attendance percentage." actions={<><Button variant="contained" color="secondary" startIcon={<RefreshIcon />} onClick={load} disabled={loading}>Apply</Button><Button variant="outlined" startIcon={<DownloadIcon />} onClick={() => exportCsv("team_attendance_report.csv", dashboard?.table || [], columns)} sx={{ color: "white", borderColor: "#bfdbfe" }}>Export</Button><Button variant="outlined" startIcon={<PrintIcon />} onClick={() => window.print()} sx={{ color: "white", borderColor: "#bfdbfe" }}>Print</Button></>} />
        <Paper className="no-print" sx={{ p: 2, mb: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={3}><TextField fullWidth type="date" size="small" label="From date" InputLabelProps={{ shrink: true }} value={filters.fromdate} onChange={(e) => setFilters((prev) => ({ ...prev, fromdate: e.target.value }))} /></Grid>
            <Grid item xs={12} md={3}><TextField fullWidth type="date" size="small" label="To date" InputLabelProps={{ shrink: true }} value={filters.todate} onChange={(e) => setFilters((prev) => ({ ...prev, todate: e.target.value }))} /></Grid>
          </Grid>
        </Paper>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Box className="print-area">
          <PrintHeader title="Team Attendance Report" fromdate={filters.fromdate} todate={filters.todate} institution={dashboard?.institution || {}} />
          <Cards cards={dashboard?.cards || []} />
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} md={8}><ChartCard title="Userwise Attendance %"><PercentBar data={dashboard?.charts?.userwise || []} /></ChartCard></Grid>
            <Grid item xs={12} md={4}><ChartCard title="Present / Absent"><PresentAbsentPie data={dashboard?.charts?.presentAbsent || []} /></ChartCard></Grid>
          </Grid>
          <Paper sx={{ p: 2, border: "1px solid #e5e7eb", borderRadius: 2 }}>
            <Box sx={{ height: 560 }}><DataGrid rows={dashboard?.table || []} columns={columns} loading={loading} slots={{ toolbar: GridToolbar }} pageSizeOptions={[25, 50, 100]} sx={gridSx} /></Box>
          </Paper>
        </Box>
      </Box>
    </MenuPageShell>
  );
}
