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

const palette = ["#2563eb", "#16a34a", "#ea580c", "#7c3aed", "#0891b2", "#dc2626", "#4f46e5", "#0f766e", "#b45309", "#65a30d"];
const gridSx = {
  "& .MuiDataGrid-cell": { whiteSpace: "normal", overflowWrap: "anywhere", lineHeight: 1.3, py: 1 },
  "& .MuiDataGrid-columnHeaderTitle": { whiteSpace: "normal", lineHeight: 1.2 }
};

const clean = (value) => String(value || "").trim();
const money = (value) => Number(value || 0).toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const csvEscape = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
const monthKey = (value) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "Not dated";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};
const academicFromRow = (row) => clean(row.academicyear || row.academicYear || row.year) || academicFromDate(row.startdate || row.createdat || row.createdAt);
const academicFromDate = (value) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  return date.getMonth() >= 6 ? `${year}-${String(year + 1).slice(-2)}` : `${year - 1}-${String(year).slice(-2)}`;
};
const groupCount = (rows, field, fallback = "Not specified") => Object.values(rows.reduce((acc, row) => {
  const label = clean(row[field]) || fallback;
  acc[label] = acc[label] || { label, count: 0, amount: 0 };
  acc[label].count += 1;
  acc[label].amount += Number(row.amount || 0);
  return acc;
}, {})).sort((a, b) => b.count - a.count || b.amount - a.amount);
const groupByGetter = (rows, getter, fallback = "Not specified") => Object.values(rows.reduce((acc, row) => {
  const label = clean(getter(row)) || fallback;
  acc[label] = acc[label] || { label, count: 0, amount: 0 };
  acc[label].count += 1;
  acc[label].amount += Number(row.amount || 0);
  return acc;
}, {})).sort((a, b) => String(a.label).localeCompare(String(b.label)));

function exportCsv(filename, rows = [], columns = []) {
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

function PrintHeader({ title, institution }) {
  const logo = institution.logo || institution.logolink || global1.logo || "";
  const name = institution.institutionname || institution.insname || global1.insname || "Institution";
  const address = institution.address || institution.address1 || global1.address || "";
  return (
    <Paper elevation={0} sx={{ p: 2, mb: 2, border: "1px solid #d1d5db", borderRadius: 1, textAlign: "center", color: "#000" }}>
      {logo && <Box component="img" src={logo} alt="logo" sx={{ height: 58, objectFit: "contain", mb: 1 }} />}
      <Typography variant="h5" fontWeight={950}>{name}</Typography>
      <Typography variant="body2">{address}</Typography>
      <Typography variant="h6" fontWeight={950} sx={{ mt: 1 }}>{title}</Typography>
    </Paper>
  );
}

function StatCard({ label, value, moneyValue = false, tone = "#2563eb" }) {
  return (
    <Card elevation={0} sx={{ border: `1px solid ${tone}33`, borderLeft: `5px solid ${tone}`, borderRadius: 2, height: "100%" }}>
      <CardContent>
        <Typography color="text.secondary" fontWeight={800}>{label}</Typography>
        <Typography variant="h4" fontWeight={950} sx={{ color: tone }}>{moneyValue ? money(value) : Number(value || 0).toLocaleString("en-IN")}</Typography>
      </CardContent>
    </Card>
  );
}

function ChartCard({ title, children }) {
  return (
    <Paper elevation={0} sx={{ p: 2, border: "1px solid #e5e7eb", borderRadius: 2, height: "100%" }}>
      <Typography fontWeight={900} sx={{ mb: 1 }}>{title}</Typography>
      <Box sx={{ height: 310 }}>{children}</Box>
    </Paper>
  );
}

function BarPanel({ data = [], dataKey = "count" }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data.slice(0, 18)}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} angle={-25} textAnchor="end" height={78} />
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

function LinePanel({ data = [], dataKey = "count" }) {
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

function useInstitution() {
  const [institution, setInstitution] = useState({});
  useEffect(() => {
    ep1.get("/api/v1/getinstitutionname", { params: { colid: global1.colid, user: global1.user, token: global1.token } })
      .then((res) => setInstitution(res.data?.data?.classes?.[0] || {}))
      .catch(() => setInstitution({}));
  }, []);
  return institution;
}

export function ScholarshipDashboardPage() {
  const institution = useInstitution();
  const [academicYear, setAcademicYear] = useState("");
  const [scholarships, setScholarships] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [sRes, aRes] = await Promise.all([
        ep1.get("/api/v2/getallscholarshipds", { params: { colid: global1.colid } }),
        ep1.get("/api/v2/getscholarshipapplicationds", { params: { colid: global1.colid } })
      ]);
      setScholarships(sRes.data?.scholarships || []);
      setApplications(aRes.data?.applications || []);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const years = useMemo(() => [...new Set([...scholarships, ...applications].map(academicFromRow).filter(Boolean))].sort().reverse(), [scholarships, applications]);
  const filteredScholarships = useMemo(() => academicYear ? scholarships.filter((row) => academicFromRow(row) === academicYear) : scholarships, [scholarships, academicYear]);
  const filteredApps = useMemo(() => academicYear ? applications.filter((row) => academicFromRow(row) === academicYear) : applications, [applications, academicYear]);
  const rows = useMemo(() => filteredApps.map((app, index) => ({
    id: app._id || index,
    scholarshipname: app.scholarshipname,
    applicantname: app.applicantname,
    applicantemail: app.applicantemail,
    regno: app.regno,
    program: app.program,
    programcode: app.programcode,
    category: app.category,
    status: app.status,
    academicyear: academicFromRow(app),
    createdat: app.createdat
  })), [filteredApps]);
  const columns = [
    { field: "scholarshipname", headerName: "Scholarship", minWidth: 180, flex: 1 },
    { field: "applicantname", headerName: "Applicant", minWidth: 160 },
    { field: "applicantemail", headerName: "Email", minWidth: 190 },
    { field: "regno", headerName: "Regno", minWidth: 120 },
    { field: "program", headerName: "Program", minWidth: 150 },
    { field: "programcode", headerName: "Program code", minWidth: 130 },
    { field: "category", headerName: "Category", minWidth: 120 },
    { field: "status", headerName: "Status", minWidth: 110 },
    { field: "academicyear", headerName: "Academic year", minWidth: 130 }
  ];
  const statuswise = groupCount(filteredApps, "status");
  const categorywise = groupCount([...filteredScholarships, ...filteredApps], "category");
  const programwise = groupCount(filteredApps, "programcode");
  const typewise = groupCount(filteredScholarships, "applicationtype");
  const amountByProgram = groupCount(filteredScholarships, "programcode");

  return (
    <MenuPageShell title="Scholarship dashboard">
      <Box sx={{ p: 3, bgcolor: "#f6f7fb", minHeight: "100vh" }}>
        <style>{`@media print {.no-print{display:none!important}.print-area{box-shadow:none!important;border:0!important} body{background:white!important;color:#000!important}}`}</style>
        <Paper className="no-print" elevation={0} sx={{ p: 2.5, mb: 2, border: "1px solid #e5e7eb", borderRadius: 2, background: "linear-gradient(135deg, #0f172a, #2563eb)" }}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2} justifyContent="space-between">
            <Box>
              <Typography variant="h4" color="white" fontWeight={950}>Scholarship dashboard</Typography>
              <Typography sx={{ color: "#dbeafe" }}>Academic year wise scholarships, applications, categories, programs and type analysis.</Typography>
            </Box>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
              <Autocomplete freeSolo options={years} value={academicYear} onInputChange={(_, value) => setAcademicYear(value || "")} renderInput={(params) => <TextField {...params} size="small" label="Academic year" sx={{ bgcolor: "white", borderRadius: 1, minWidth: 180 }} />} />
              <Button variant="contained" color="secondary" startIcon={<RefreshIcon />} onClick={load} disabled={loading}>Refresh</Button>
              <Button variant="outlined" startIcon={<DownloadIcon />} onClick={() => exportCsv("scholarship_dashboard.csv", rows, columns)} sx={{ color: "white", borderColor: "#bfdbfe" }}>Export</Button>
              <Button variant="outlined" startIcon={<PrintIcon />} onClick={() => window.print()} sx={{ color: "white", borderColor: "#bfdbfe" }}>Print</Button>
            </Stack>
          </Stack>
        </Paper>
        <Box className="print-area">
          <PrintHeader title="Scholarship Dashboard" institution={institution} />
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} sm={6} md={3}><StatCard label="Scholarships" value={filteredScholarships.length} /></Grid>
            <Grid item xs={12} sm={6} md={3}><StatCard label="Applications" value={filteredApps.length} tone="#16a34a" /></Grid>
            <Grid item xs={12} sm={6} md={3}><StatCard label="Approved" value={filteredApps.filter((row) => /^approved$/i.test(row.status)).length} tone="#0f766e" /></Grid>
            <Grid item xs={12} sm={6} md={3}><StatCard label="Scholarship value" value={filteredScholarships.reduce((sum, row) => sum + Number(row.amount || 0), 0)} moneyValue tone="#b45309" /></Grid>
          </Grid>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} md={6}><ChartCard title="Category wise"><PiePanel data={categorywise} /></ChartCard></Grid>
            <Grid item xs={12} md={6}><ChartCard title="Programwise applications"><BarPanel data={programwise} /></ChartCard></Grid>
            <Grid item xs={12} md={6}><ChartCard title="Scholarship type wise"><PiePanel data={typewise} /></ChartCard></Grid>
            <Grid item xs={12} md={6}><ChartCard title="Programwise scholarship value"><BarPanel data={amountByProgram} dataKey="amount" /></ChartCard></Grid>
            <Grid item xs={12} md={6}><ChartCard title="Application status"><PiePanel data={statuswise} /></ChartCard></Grid>
          </Grid>
          <Paper sx={{ p: 2, border: "1px solid #e5e7eb", borderRadius: 2 }}>
            <Box sx={{ height: 680 }}>
              <DataGrid rows={rows} columns={columns} loading={loading} slots={{ toolbar: GridToolbar }} pageSizeOptions={[25, 50, 100]} sx={gridSx} />
            </Box>
          </Paper>
        </Box>
      </Box>
    </MenuPageShell>
  );
}

export function EventNewDashboardPage() {
  const institution = useInstitution();
  const [filters, setFilters] = useState({ academicyear: "", fromdate: "", todate: "" });
  const [data, setData] = useState({ events: [], attendees: [], feedback: [], papersubmissions: [], checklistdetails: [] });
  const [loading, setLoading] = useState(false);
  const load = async () => {
    setLoading(true);
    try {
      const res = await ep1.post("/api/v2/event-management-new/report", { colid: global1.colid });
      setData(res.data?.data || {});
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);
  const events = data.events || [];
  const filteredEvents = useMemo(() => events.filter((event) => {
    if (filters.academicyear && clean(event.academicyear) !== filters.academicyear) return false;
    const start = event.startdate ? new Date(event.startdate) : null;
    if (filters.fromdate && start && start < new Date(filters.fromdate)) return false;
    if (filters.todate && start && start > new Date(filters.todate)) return false;
    return true;
  }), [events, filters]);
  const eventIds = new Set(filteredEvents.map((event) => String(event._id)));
  const attendees = (data.attendees || []).filter((row) => eventIds.has(String(row.eventid)));
  const feedback = (data.feedback || []).filter((row) => eventIds.has(String(row.eventid)));
  const papers = (data.papersubmissions || []).filter((row) => eventIds.has(String(row.eventid)));
  const checklist = (data.checklistdetails || []).filter((row) => eventIds.has(String(row.eventid)));
  const years = [...new Set(events.map((row) => clean(row.academicyear)).filter(Boolean))].sort().reverse();
  const rows = filteredEvents.map((event, index) => ({
    id: event._id || index,
    eventname: event.eventname,
    eventcode: event.eventcode,
    type: event.type,
    mode: event.mode,
    academicyear: event.academicyear,
    startdate: event.startdate ? new Date(event.startdate).toLocaleDateString() : "",
    enddate: event.enddate ? new Date(event.enddate).toLocaleDateString() : "",
    venue: event.venue,
    status: event.status,
    attendees: attendees.filter((row) => String(row.eventid) === String(event._id)).length,
    feedback: feedback.filter((row) => String(row.eventid) === String(event._id)).length,
    papers: papers.filter((row) => String(row.eventid) === String(event._id)).length
  }));
  const columns = [
    { field: "eventname", headerName: "Event", minWidth: 190, flex: 1 },
    { field: "eventcode", headerName: "Code", minWidth: 120 },
    { field: "type", headerName: "Type", minWidth: 130 },
    { field: "mode", headerName: "Mode", minWidth: 120 },
    { field: "academicyear", headerName: "Academic year", minWidth: 130 },
    { field: "startdate", headerName: "Start date", minWidth: 120 },
    { field: "venue", headerName: "Venue", minWidth: 160 },
    { field: "status", headerName: "Status", minWidth: 110 },
    { field: "attendees", headerName: "Attendees", minWidth: 110 },
    { field: "feedback", headerName: "Feedback", minWidth: 110 },
    { field: "papers", headerName: "Papers", minWidth: 100 }
  ];

  return (
    <MenuPageShell title="Event dashboard">
      <Box sx={{ p: 3, bgcolor: "#f6f7fb", minHeight: "100vh" }}>
        <style>{`@media print {.no-print{display:none!important}.print-area{box-shadow:none!important;border:0!important} body{background:white!important;color:#000!important}}`}</style>
        <Paper className="no-print" elevation={0} sx={{ p: 2.5, mb: 2, border: "1px solid #e5e7eb", borderRadius: 2, background: "linear-gradient(135deg, #0f172a, #0f766e)" }}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2} justifyContent="space-between">
            <Box>
              <Typography variant="h4" color="white" fontWeight={950}>Event dashboard</Typography>
              <Typography sx={{ color: "#ccfbf1" }}>Event Management New overview with registrations, papers, feedback and checklist status.</Typography>
            </Box>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
              <Autocomplete freeSolo options={years} value={filters.academicyear} onInputChange={(_, value) => setFilters((prev) => ({ ...prev, academicyear: value || "" }))} renderInput={(params) => <TextField {...params} size="small" label="Academic year" sx={{ bgcolor: "white", borderRadius: 1, minWidth: 180 }} />} />
              <TextField size="small" label="From" type="date" InputLabelProps={{ shrink: true }} value={filters.fromdate} onChange={(e) => setFilters((prev) => ({ ...prev, fromdate: e.target.value }))} sx={{ bgcolor: "white", borderRadius: 1 }} />
              <TextField size="small" label="To" type="date" InputLabelProps={{ shrink: true }} value={filters.todate} onChange={(e) => setFilters((prev) => ({ ...prev, todate: e.target.value }))} sx={{ bgcolor: "white", borderRadius: 1 }} />
              <Button variant="contained" color="secondary" startIcon={<RefreshIcon />} onClick={load} disabled={loading}>Refresh</Button>
              <Button variant="outlined" startIcon={<DownloadIcon />} onClick={() => exportCsv("event_new_dashboard.csv", rows, columns)} sx={{ color: "white", borderColor: "#bfdbfe" }}>Export</Button>
              <Button variant="outlined" startIcon={<PrintIcon />} onClick={() => window.print()} sx={{ color: "white", borderColor: "#bfdbfe" }}>Print</Button>
            </Stack>
          </Stack>
        </Paper>
        <Box className="print-area">
          <PrintHeader title="Event Dashboard" institution={institution} />
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} sm={6} md={3}><StatCard label="Events" value={filteredEvents.length} /></Grid>
            <Grid item xs={12} sm={6} md={3}><StatCard label="Attendees" value={attendees.length} tone="#16a34a" /></Grid>
            <Grid item xs={12} sm={6} md={3}><StatCard label="Feedback received" value={feedback.length} tone="#b45309" /></Grid>
            <Grid item xs={12} sm={6} md={3}><StatCard label="Paper submissions" value={papers.length} tone="#7c3aed" /></Grid>
          </Grid>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} md={6}><ChartCard title="Type wise events"><PiePanel data={groupCount(filteredEvents, "type")} /></ChartCard></Grid>
            <Grid item xs={12} md={6}><ChartCard title="Mode wise events"><PiePanel data={groupCount(filteredEvents, "mode")} /></ChartCard></Grid>
            <Grid item xs={12} md={6}><ChartCard title="Monthwise events"><LinePanel data={groupByGetter(filteredEvents, (row) => monthKey(row.startdate))} /></ChartCard></Grid>
            <Grid item xs={12} md={6}><ChartCard title="Attendee status"><BarPanel data={groupCount(attendees, "status")} /></ChartCard></Grid>
            <Grid item xs={12} md={6}><ChartCard title="Event registrations"><BarPanel data={rows.map((row) => ({ label: row.eventname, count: row.attendees }))} /></ChartCard></Grid>
            <Grid item xs={12} md={6}><ChartCard title="Checklist status"><PiePanel data={groupCount(checklist, "checkliststatus")} /></ChartCard></Grid>
          </Grid>
          <Paper sx={{ p: 2, border: "1px solid #e5e7eb", borderRadius: 2 }}>
            <Box sx={{ height: 680 }}>
              <DataGrid rows={rows} columns={columns} loading={loading} slots={{ toolbar: GridToolbar }} pageSizeOptions={[25, 50, 100]} sx={gridSx} />
            </Box>
          </Paper>
        </Box>
      </Box>
    </MenuPageShell>
  );
}
