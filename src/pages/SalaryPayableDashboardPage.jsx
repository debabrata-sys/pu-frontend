import React, { useEffect, useMemo, useState } from "react";
import {
  Autocomplete,
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

const palette = ["#2563eb", "#16a34a", "#ea580c", "#7c3aed", "#0891b2", "#dc2626", "#4f46e5", "#0f766e"];
const money = (value) => Number(value || 0).toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const clean = (value) => String(value || "").trim();
const dateText = (value) => (value ? String(value).slice(0, 10) : "");
const csvEscape = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
const gridSx = {
  "& .MuiDataGrid-cell": { whiteSpace: "normal", overflowWrap: "anywhere", lineHeight: 1.3, py: 1 },
  "& .MuiDataGrid-columnHeaderTitle": { whiteSpace: "normal", lineHeight: 1.2 }
};

const group = (rows, getter, amountField = "amount") => Object.values(rows.reduce((acc, row) => {
  const label = clean(typeof getter === "function" ? getter(row) : row[getter]) || "Not specified";
  acc[label] = acc[label] || { label, count: 0, amount: 0 };
  acc[label].count += 1;
  acc[label].amount += Number(row[amountField] || 0);
  return acc;
}, {})).sort((a, b) => b.amount - a.amount || b.count - a.count);

function exportCsv(filename, rows, columns) {
  const csv = [
    columns.map((column) => csvEscape(column.headerName || column.field)).join(","),
    ...rows.map((row) => columns.map((column) => csvEscape(row[column.field])).join(","))
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

function PrintHeader({ institution }) {
  const logo = institution?.logo || institution?.logolink || global1.logo || "";
  const name = institution?.institutionname || institution?.insname || global1.insname || "Institution";
  const address = institution?.address || institution?.insaddress || global1.address || "";
  return (
    <Paper elevation={0} sx={{ p: 2, mb: 2, border: "1px solid #d1d5db", borderRadius: 1, textAlign: "center", color: "#000" }}>
      {logo && <Box component="img" src={logo} alt="logo" sx={{ height: 58, objectFit: "contain", mb: 1 }} />}
      <Typography variant="h5" fontWeight={950}>{name}</Typography>
      <Typography variant="body2">{address}</Typography>
      <Typography variant="h6" fontWeight={950} sx={{ mt: 1 }}>Salary Payable Dashboard</Typography>
    </Paper>
  );
}

function StatCard({ label, value, tone = "#2563eb", cash = true }) {
  return (
    <Card elevation={0} sx={{ border: `1px solid ${tone}33`, borderLeft: `5px solid ${tone}`, borderRadius: 2, height: "100%" }}>
      <CardContent>
        <Typography color="text.secondary" fontWeight={800}>{label}</Typography>
        <Typography variant="h4" fontWeight={950} sx={{ color: tone }}>{cash ? money(value) : Number(value || 0).toLocaleString("en-IN")}</Typography>
      </CardContent>
    </Card>
  );
}

function ChartCard({ title, children }) {
  return (
    <Paper elevation={0} sx={{ p: 2, border: "1px solid #e5e7eb", borderRadius: 2, height: "100%" }}>
      <Typography fontWeight={900} sx={{ mb: 1 }}>{title}</Typography>
      <Box sx={{ height: 315 }}>{children}</Box>
    </Paper>
  );
}

function BarPanel({ data = [], dataKey = "amount" }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data.slice(0, 18)}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} angle={-25} textAnchor="end" height={82} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip formatter={(value) => dataKey === "amount" ? money(value) : value} />
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
        <Tooltip formatter={(value, name, props) => [money(props.payload.amount), props.payload.label]} />
        <Legend />
        <Pie data={data.slice(0, 12)} dataKey="amount" nameKey="label" outerRadius={95} label>
          {data.slice(0, 12).map((row, index) => <Cell key={row.label || index} fill={palette[index % palette.length]} />)}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  );
}

function LinePanel({ data = [] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip formatter={(value) => money(value)} />
        <Legend />
        <Line type="monotone" dataKey="amount" stroke="#16a34a" strokeWidth={3} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export default function SalaryPayableDashboardPage() {
  const [institution, setInstitution] = useState(null);
  const [options, setOptions] = useState({});
  const [rows, setRows] = useState([]);
  const [filters, setFilters] = useState({ year: "", fromdate: "", todate: "", component: "", type: "", paystatus: "", status1: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    ep1.get("/api/v2/hr-advanced/institution", { params: { colid: global1.colid } }).then((res) => setInstitution(res.data?.data || null)).catch(() => setInstitution(null));
    ep1.get("/api/v2/hr-advanced/salary-options", { params: { colid: global1.colid } }).then((res) => setOptions(res.data?.data || {})).catch(() => setOptions({}));
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const params = { colid: global1.colid };
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params[key] = value;
      });
      const res = await ep1.get("/api/v2/hr-advanced/salary-register", { params });
      setRows(res.data?.data || []);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const payableRows = useMemo(() => rows.filter((row) => {
    const pay = clean(row.paystatus || row.status1).toLowerCase();
    return !pay || !["paid", "completed", "closed", "settled"].includes(pay);
  }), [rows]);
  const totalPayable = payableRows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const deductions = payableRows.filter((row) => /deduction|lop|negative/i.test(`${row.type} ${row.component}`)).reduce((sum, row) => sum + Math.abs(Number(row.amount || 0)), 0);
  const earnings = payableRows.filter((row) => !/deduction|lop|negative/i.test(`${row.type} ${row.component}`)).reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const tableRows = rows.map((row, index) => ({
    id: row._id || index,
    year: row.year,
    month: row.month,
    duedate: dateText(row.duedate),
    employee: row.employee,
    empid: row.empid,
    component: row.component,
    amount: Number(row.amount || 0),
    type: row.type,
    level: row.level,
    paystatus: row.paystatus,
    status1: row.status1,
    structure: row.structure,
    comments: row.comments
  }));
  const columns = [
    { field: "year", headerName: "Academic year", minWidth: 130 },
    { field: "month", headerName: "Month", minWidth: 110 },
    { field: "duedate", headerName: "Due date", minWidth: 120 },
    { field: "employee", headerName: "Employee", minWidth: 180, flex: 1 },
    { field: "empid", headerName: "Employee ID", minWidth: 160 },
    { field: "component", headerName: "Component", minWidth: 170, flex: 1 },
    { field: "amount", headerName: "Amount", minWidth: 130, valueFormatter: (params) => money(params.value) },
    { field: "type", headerName: "Type", minWidth: 120 },
    { field: "paystatus", headerName: "Pay status", minWidth: 120 },
    { field: "status1", headerName: "Status", minWidth: 120 },
    { field: "comments", headerName: "Comments", minWidth: 220, flex: 1 }
  ];

  return (
    <MenuPageShell title="Salary payable dashboard">
      <Box sx={{ p: 3, bgcolor: "#f6f7fb", minHeight: "100vh" }}>
        <style>{`@media print {.no-print{display:none!important}.print-area{box-shadow:none!important;border:0!important} body{background:white!important;color:#000!important}}`}</style>
        <Paper className="no-print" elevation={0} sx={{ p: 2.5, mb: 2, border: "1px solid #e5e7eb", borderRadius: 2, background: "linear-gradient(135deg, #0f172a, #7c2d12)" }}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2} justifyContent="space-between">
            <Box>
              <Typography variant="h4" color="white" fontWeight={950}>Salary payable dashboard</Typography>
              <Typography sx={{ color: "#ffedd5" }}>Track payable salary from dashmhrsalary by due date, academic year, component, type and payment status.</Typography>
            </Box>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
              {["year", "component", "type", "paystatus", "status1"].map((field) => (
                <Autocomplete
                  key={field}
                  freeSolo
                  options={options[field] || []}
                  value={filters[field] || ""}
                  onInputChange={(_, value) => setFilters((prev) => ({ ...prev, [field]: value || "" }))}
                  renderInput={(params) => <TextField {...params} size="small" label={field === "year" ? "Academic year" : field} sx={{ bgcolor: "white", borderRadius: 1, minWidth: 150 }} />}
                />
              ))}
              <TextField size="small" label="From" type="date" InputLabelProps={{ shrink: true }} value={filters.fromdate} onChange={(e) => setFilters((prev) => ({ ...prev, fromdate: e.target.value }))} sx={{ bgcolor: "white", borderRadius: 1 }} />
              <TextField size="small" label="To" type="date" InputLabelProps={{ shrink: true }} value={filters.todate} onChange={(e) => setFilters((prev) => ({ ...prev, todate: e.target.value }))} sx={{ bgcolor: "white", borderRadius: 1 }} />
              <Button variant="contained" color="secondary" startIcon={<RefreshIcon />} onClick={load} disabled={loading}>Apply</Button>
              <Button variant="outlined" startIcon={<DownloadIcon />} onClick={() => exportCsv("salary_payable_dashboard.csv", tableRows, columns)} sx={{ color: "white", borderColor: "#fed7aa" }}>Export</Button>
              <Button variant="outlined" startIcon={<PrintIcon />} onClick={() => window.print()} sx={{ color: "white", borderColor: "#fed7aa" }}>Print</Button>
            </Stack>
          </Stack>
        </Paper>
        <Box className="print-area">
          <PrintHeader institution={institution} />
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} sm={6} md={3}><StatCard label="Total payable" value={totalPayable} /></Grid>
            <Grid item xs={12} sm={6} md={3}><StatCard label="Earnings payable" value={earnings} tone="#16a34a" /></Grid>
            <Grid item xs={12} sm={6} md={3}><StatCard label="Deductions" value={deductions} tone="#dc2626" /></Grid>
            <Grid item xs={12} sm={6} md={3}><StatCard label="Payable records" value={payableRows.length} tone="#7c3aed" cash={false} /></Grid>
          </Grid>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} md={6}><ChartCard title="Monthwise payable"><LinePanel data={group(payableRows, "month")} /></ChartCard></Grid>
            <Grid item xs={12} md={6}><ChartCard title="Componentwise payable"><BarPanel data={group(payableRows, "component")} /></ChartCard></Grid>
            <Grid item xs={12} md={6}><ChartCard title="Type wise payable"><PiePanel data={group(payableRows, "type")} /></ChartCard></Grid>
            <Grid item xs={12} md={6}><ChartCard title="Status wise payable"><PiePanel data={group(payableRows, (row) => row.paystatus || row.status1)} /></ChartCard></Grid>
            <Grid item xs={12} md={6}><ChartCard title="Employee wise payable"><BarPanel data={group(payableRows, "employee")} /></ChartCard></Grid>
            <Grid item xs={12} md={6}><ChartCard title="Academic year wise payable"><BarPanel data={group(payableRows, "year")} /></ChartCard></Grid>
          </Grid>
          <Paper sx={{ p: 2, border: "1px solid #e5e7eb", borderRadius: 2 }}>
            <Box sx={{ height: 680 }}>
              <DataGrid rows={tableRows} columns={columns} loading={loading} slots={{ toolbar: GridToolbar }} pageSizeOptions={[25, 50, 100]} sx={gridSx} />
            </Box>
          </Paper>
        </Box>
      </Box>
    </MenuPageShell>
  );
}
