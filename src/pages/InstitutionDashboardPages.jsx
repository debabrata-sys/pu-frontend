import React, { useMemo, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  FormControlLabel,
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
  Line,
  LineChart,
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

const palette = ["#2563eb", "#16a34a", "#ea580c", "#7c3aed", "#0891b2", "#dc2626", "#4f46e5", "#0f766e", "#b45309", "#65a30d"];
const money = (value) => Number(value || 0).toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const displayValue = (card) => card.money ? money(card.value) : `${Number(card.value || 0).toLocaleString("en-IN")}${card.suffix || ""}`;
const institutionName = (institution = {}) => institution.institutionname || institution.insname || institution.name || institution.institution || global1.insname || "Institution";
const institutionAddress = (institution = {}) => institution.address || institution.address1 || global1.address || "";
const institutionLogo = (institution = {}) => institution.logo || institution.logolink || institution.inslogo || global1.logo || "";
const gridSx = {
  "& .MuiDataGrid-cell": { whiteSpace: "normal", overflowWrap: "anywhere", lineHeight: 1.3, py: 1 },
  "& .MuiDataGrid-columnHeaderTitle": { whiteSpace: "normal", lineHeight: 1.2 }
};
const csvEscape = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;

function exportCsv(filename, rows = [], columns = []) {
  const fields = columns.map((column) => column.field);
  const csv = [
    columns.map((column) => csvEscape(column.headerName || column.field)).join(","),
    ...rows.map((row) => fields.map((field) => csvEscape(row[field])).join(","))
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

function PrintHeader({ title, institution }) {
  return (
    <Paper elevation={0} sx={{ p: 2, mb: 2, border: "1px solid #d1d5db", borderRadius: 1, textAlign: "center", color: "#000" }}>
      {institutionLogo(institution) && <Box component="img" src={institutionLogo(institution)} alt="logo" sx={{ height: 58, objectFit: "contain", mb: 1 }} />}
      <Typography variant="h5" fontWeight={950}>{institutionName(institution)}</Typography>
      <Typography variant="body2">{institutionAddress(institution)}</Typography>
      <Typography variant="h6" fontWeight={950} sx={{ mt: 1 }}>{title}</Typography>
    </Paper>
  );
}

function ChartCard({ title, children }) {
  return (
    <Paper elevation={0} sx={{ p: 2, border: "1px solid #e5e7eb", borderRadius: 2, height: "100%" }}>
      <Typography fontWeight={900} sx={{ mb: 1 }}>{title}</Typography>
      <Box sx={{ height: 320 }}>{children}</Box>
    </Paper>
  );
}

function BarPanel({ data = [], dataKey = "count" }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data.slice(0, 18)}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} angle={-25} textAnchor="end" height={82} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip />
        <Legend />
        <Bar dataKey={dataKey} fill="#2563eb" radius={[6, 6, 0, 0]} />
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
          {data.slice(0, 12).map((row, index) => <Cell key={row.label || index} fill={palette[index % palette.length]} />)}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  );
}

function LinePanel({ data = [], dataKey = "amount" }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey={dataKey} stroke="#16a34a" strokeWidth={3} />
      </LineChart>
    </ResponsiveContainer>
  );
}

const dashboardConfig = {
  cultural: { title: "Cultural Activity Dashboard", endpoint: "/api/v2/cultural-dashboard/summary", year: true, charts: [["monthwise", "Monthwise activity", "line"], ["programwise", "Programwise activity", "bar"], ["categorywise", "Categorywise students", "pie"], ["categoryProgram", "Category and program", "bar"]] },
  sports: { title: "Sports Dashboard", endpoint: "/api/v2/sports-dashboard/summary", year: true, charts: [["monthwise", "Monthwise activity", "line"], ["programwise", "Programwise activity", "bar"], ["categorywise", "Categorywise students", "pie"], ["categoryProgram", "Category and program", "bar"]] },
  asset: { title: "Asset Management Dashboard", endpoint: "/api/v2/asset-dashboard/summary", charts: [["typewise", "Type of assets", "pie"], ["categorywise", "Categorywise assets", "bar"], ["departmentwise", "Departmentwise allocation", "bar"], ["addedMonthwise", "Assets added monthwise", "line"], ["retiredMonthwise", "Assets retired monthwise", "line"], ["statuswise", "Asset status", "pie"]] },
  purchaseNew: { title: "Purchase Dashboard", endpoint: "/api/v2/purchase-new-dashboard/summary", charts: [["indentMonthwise", "Monthwise purchase indents", "line"], ["poMonthwise", "Monthwise PO value", "money"], ["departmentIndent", "Departmentwise indent", "bar"], ["categoryPo", "Categorywise PO", "money"], ["statusPo", "PO status", "pie"]] },
  purchase2: { title: "Purchase 2 Dashboard", endpoint: "/api/v2/purchase2-dashboard/summary", charts: [["indentMonthwise", "Monthwise store indents", "line"], ["prMonthwise", "Monthwise PR", "line"], ["poMonthwise", "Monthwise PO", "money"], ["departmentIndent", "Departmentwise indent", "bar"], ["categoryPo", "Categorywise PO", "money"], ["localPurchaseMonthwise", "Local purchase monthwise", "money"], ["processStatus", "Process status", "pie"]] },
  hrLeave: { title: "HR Leave Dashboard", endpoint: "/api/v2/hr-leave-dashboard/summary", dateRange: true, charts: [["monthwise", "Monthwise leaves taken", "lineDays"], ["departmentwise", "Departmentwise leave taken", "barDays"], ["categorywise", "Categorywise leave taken", "pieDays"], ["highest", "Highest leave taken employee", "barDays"], ["lowest", "Lowest leave taken employee", "barDays"], ["frequentLastMonth", "Frequent leaves in last 1 month", "barDays"]] },
  salary: { title: "Salary Dashboard", endpoint: "/api/v2/salary-dashboard/summary", yearOnly: true, charts: [["monthwise", "Monthwise salary", "money"], ["departmentwise", "Departmentwise salary", "money"], ["categorywise", "Categorywise salary", "money"], ["designationwise", "Designationwise salary", "money"], ["typewise", "Salary type", "money"]] }
};

function renderChart(type, data) {
  if (type === "pie") return <PiePanel data={data} />;
  if (type === "money") return <BarPanel data={data} dataKey="amount" />;
  if (type === "line") return <LinePanel data={data} dataKey="count" />;
  if (type === "lineDays") return <LinePanel data={data} dataKey="days" />;
  if (type === "barDays" || type === "pieDays") return type === "pieDays" ? <PiePanel data={(data || []).map((row) => ({ ...row, count: row.days }))} /> : <BarPanel data={data} dataKey="days" />;
  return <BarPanel data={data} />;
}

function DashboardPage({ type }) {
  const config = dashboardConfig[type];
  const [filters, setFilters] = useState({ academicyear: "", year: "", fromdate: "", todate: "" });
  const [dashboard, setDashboard] = useState(null);
  const [dashboardOptions, setDashboardOptions] = useState({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const rows = dashboard?.table || [];
  const columns = useMemo(() => {
    const sample = rows[0] || {};
    return Object.keys(sample).filter((key) => !["__v", "history", "items", "approvals", "approvalhistory", "employeeinfo"].includes(key) && typeof sample[key] !== "object")
      .slice(0, 18)
      .map((key) => ({ field: key, headerName: key, minWidth: 140, flex: ["description", "activityname", "student", "vendorname", "title"].includes(key) ? 1 : 0 }));
  }, [rows]);

  const load = async () => {
    try {
      setLoading(true);
      setError("");
      const params = { colid: global1.colid };
      if (config.year && filters.academicyear) params.academicyear = filters.academicyear;
      if (config.yearOnly && filters.year) params.year = filters.year;
      if (config.dateRange) {
        if (filters.fromdate) params.fromdate = filters.fromdate;
        if (filters.todate) params.todate = filters.todate;
      }
      const res = await ep1.get(config.endpoint, { params });
      setDashboard(res.data?.data || null);
      setDashboardOptions(res.data?.options || {});
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  return (
    <MenuPageShell title={config.title}>
      <Box sx={{ p: 3, bgcolor: "#f6f7fb", minHeight: "100vh" }}>
        <style>{`@media print {.no-print{display:none!important}.print-area{box-shadow:none!important;border:0!important} body{background:white!important;color:#000!important}}`}</style>
        <Paper className="no-print" elevation={0} sx={{ p: 2.5, mb: 2, border: "1px solid #e5e7eb", borderRadius: 2, background: "linear-gradient(135deg, #0f172a, #1d4ed8)" }}>
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2}>
            <Box>
              <Typography variant="h4" color="white" fontWeight={950}>{config.title}</Typography>
              <Typography sx={{ color: "#dbeafe" }}>Summary, charts, full-screen detail grid and printable institutional report.</Typography>
            </Box>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
              {config.year && <Autocomplete freeSolo options={dashboardOptions.academicyears || []} value={filters.academicyear} onInputChange={(e, value) => setFilters((prev) => ({ ...prev, academicyear: value || "" }))} renderInput={(params) => <TextField {...params} size="small" label="Academic year" sx={{ bgcolor: "white", borderRadius: 1, minWidth: 170 }} />} />}
              {config.yearOnly && <Autocomplete freeSolo options={dashboardOptions.years || []} value={filters.year} onInputChange={(e, value) => setFilters((prev) => ({ ...prev, year: value || "" }))} renderInput={(params) => <TextField {...params} size="small" label="Year" sx={{ bgcolor: "white", borderRadius: 1, minWidth: 130 }} />} />}
              {config.dateRange && <TextField size="small" label="From" type="date" InputLabelProps={{ shrink: true }} value={filters.fromdate} onChange={(e) => setFilters((prev) => ({ ...prev, fromdate: e.target.value }))} sx={{ bgcolor: "white", borderRadius: 1 }} />}
              {config.dateRange && <TextField size="small" label="To" type="date" InputLabelProps={{ shrink: true }} value={filters.todate} onChange={(e) => setFilters((prev) => ({ ...prev, todate: e.target.value }))} sx={{ bgcolor: "white", borderRadius: 1 }} />}
              <Button variant="contained" color="secondary" startIcon={<RefreshIcon />} onClick={load} disabled={loading}>Apply</Button>
              <Button variant="outlined" startIcon={<DownloadIcon />} onClick={() => exportCsv(`${type}_dashboard.csv`, rows, columns)} sx={{ color: "white", borderColor: "#bfdbfe" }}>Export</Button>
              <Button variant="outlined" startIcon={<PrintIcon />} onClick={() => window.print()} sx={{ color: "white", borderColor: "#bfdbfe" }}>Print</Button>
            </Stack>
          </Stack>
        </Paper>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Box className="print-area">
          <PrintHeader title={config.title} institution={dashboard?.institution || {}} />
          <Grid container spacing={2} sx={{ mb: 2 }}>
            {(dashboard?.cards || []).map((card) => (
              <Grid item xs={12} sm={6} md={3} key={card.key}>
                <Card elevation={0} sx={{ border: `1px solid ${card.tone || "#2563eb"}33`, borderLeft: `5px solid ${card.tone || "#2563eb"}`, borderRadius: 2, height: "100%" }}>
                  <CardContent>
                    <Typography color="text.secondary" fontWeight={800}>{card.label}</Typography>
                    <Typography variant="h4" fontWeight={950} sx={{ color: card.tone || "#2563eb" }}>{displayValue(card)}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            {(config.charts || []).map(([key, title, chartType]) => (
              <Grid item xs={12} md={6} key={key}>
                <ChartCard title={title}>{renderChart(chartType, dashboard?.charts?.[key] || [])}</ChartCard>
              </Grid>
            ))}
          </Grid>
          <Paper sx={{ p: 2, border: "1px solid #e5e7eb", borderRadius: 2 }}>
            <Box sx={{ height: "calc(100vh - 160px)", minHeight: 680 }}>
              <DataGrid rows={rows.map((row, index) => ({ id: row.id || row._id || index, ...row }))} columns={columns} loading={loading} slots={{ toolbar: GridToolbar }} pageSizeOptions={[25, 50, 100]} sx={gridSx} />
            </Box>
          </Paper>
        </Box>
      </Box>
    </MenuPageShell>
  );
}

export const CulturalDashboardPage = () => <DashboardPage type="cultural" />;
export const SportsDashboardPage = () => <DashboardPage type="sports" />;
export const AssetDashboardPage = () => <DashboardPage type="asset" />;
export const PurchaseNewDashboard2Page = () => <DashboardPage type="purchaseNew" />;
export const Purchase2DashboardPage = () => <DashboardPage type="purchase2" />;
export const HrLeaveInstitutionDashboardPage = () => <DashboardPage type="hrLeave" />;
export const SalaryDashboardPage = () => <DashboardPage type="salary" />;

export function InstitutionDummyDataPage() {
  const [form, setForm] = useState({ count: 25, sports: true, cultural: true, leaves: true, attendance: true, salary: true });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const generate = async () => {
    try {
      setLoading(true);
      setError("");
      const kinds = ["sports", "cultural", "leaves", "attendance", "salary"].filter((key) => form[key]);
      const res = await ep1.post("/api/v2/institution-dashboard-dummy/generate", { colid: global1.colid, user: global1.user, count: form.count, kinds });
      setMessage((res.data?.summary || []).map((row) => `${row.section}: ${row.count}`).join(", ") || "Dummy data generated.");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to generate dummy data");
    } finally {
      setLoading(false);
    }
  };
  return (
    <MenuPageShell title="Institution dummy data">
      <Stack spacing={2}>
        {message && <Alert severity="success">{message}</Alert>}
        {error && <Alert severity="error">{error}</Alert>}
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" fontWeight={900}>Generate dummy data</Typography>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={2}><TextField type="number" label="How many" value={form.count} onChange={(e) => setForm((prev) => ({ ...prev, count: e.target.value }))} fullWidth /></Grid>
            {["sports", "cultural", "leaves", "attendance", "salary"].map((key) => (
              <Grid item xs={12} md={2} key={key}>
                <FormControlLabel control={<Checkbox checked={form[key]} onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.checked }))} />} label={key} />
              </Grid>
            ))}
            <Grid item xs={12} md={2}><Button variant="contained" startIcon={<SaveIcon />} onClick={generate} disabled={loading} fullWidth sx={{ height: 56 }}>{loading ? "Generating..." : "Generate"}</Button></Grid>
          </Grid>
        </Paper>
      </Stack>
    </MenuPageShell>
  );
}
