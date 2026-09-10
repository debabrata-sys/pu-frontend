import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Grid,
  Paper,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import { DataGrid, GridToolbar } from "@mui/x-data-grid";
import { BarChart as BarChartIcon, EventNote, People, Today } from "@mui/icons-material";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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

const today = new Date().toISOString().slice(0, 10);
const priorDate = (days) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
};
const colors = ["#2563eb", "#16a34a", "#f97316", "#9333ea", "#dc2626", "#0891b2", "#ca8a04"];

function StatCard({ icon, title, value, subtitle, color }) {
  return (
    <Paper elevation={0} sx={{ p: 2, border: "1px solid #e5e7eb", borderRadius: 3, height: "100%", bgcolor: "#fff" }}>
      <Stack direction="row" spacing={1.5} alignItems="center">
        <Box sx={{ width: 44, height: 44, borderRadius: 2, bgcolor: color, color: "#fff", display: "grid", placeItems: "center" }}>{icon}</Box>
        <Box>
          <Typography variant="body2" color="text.secondary">{title}</Typography>
          <Typography variant="h4" fontWeight={950}>{value}</Typography>
          <Typography variant="caption" color="text.secondary">{subtitle}</Typography>
        </Box>
      </Stack>
    </Paper>
  );
}

export default function CrmDailyInteractionReportPage() {
  const [filters, setFilters] = useState({ fromDate: priorDate(7), toDate: today, useremail: "" });
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({ total: 0, users: 0, dueFollowups: 0, withComments: 0, byDate: [], byUser: [] });
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadReport();
  }, []);

  const loadReport = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await ep1.post("/api/v2/crm-management/daily-interaction-report", { ...filters, colid: global1.colid });
      setRows(res.data?.data || []);
      setSummary(res.data?.summary || summary);
      setUsers((res.data?.users || []).filter((item) => item.email));
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load daily interaction report.");
    } finally {
      setLoading(false);
    }
  };

  const columns = useMemo(() => [
    { field: "activitydateshort", headerName: "Activity date", minWidth: 130 },
    { field: "user", headerName: "User", minWidth: 180, flex: 1 },
    { field: "useremail", headerName: "User email", minWidth: 210 },
    { field: "lead", headerName: "Lead", minWidth: 170 },
    { field: "leadphone", headerName: "Phone", minWidth: 130 },
    { field: "leademail", headerName: "Lead email", minWidth: 190 },
    { field: "nextfollowupdateshort", headerName: "Next follow-up", minWidth: 140 },
    { field: "outcome", headerName: "Outcome", minWidth: 190 },
    { field: "comments", headerName: "Comments", minWidth: 280, flex: 1 },
    { field: "source", headerName: "Source", minWidth: 140 },
    { field: "course_interested", headerName: "Course", minWidth: 180 }
  ], []);

  return (
    <MenuPageShell title="Daily Interaction Report">
      <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: "#f6f7fb", minHeight: "100vh" }}>
        <Stack spacing={2}>
          <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: "1px solid #e5e7eb" }}>
            <Typography variant="h4" fontWeight={950}>Daily Interaction Report</Typography>
            <Typography color="text.secondary">Tracks lead update comments and next follow-up dates from My Leads.</Typography>
          </Paper>

          {error && <Alert severity="error" onClose={() => setError("")}>{error}</Alert>}

          <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #e5e7eb" }}>
            <Grid container spacing={1.5} alignItems="center">
              <Grid item xs={12} md={2.5}>
                <Typography variant="caption" color="text.secondary">From date</Typography>
                <Box component="input" type="date" value={filters.fromDate} onChange={(event) => setFilters({ ...filters, fromDate: event.target.value })} style={{ width: "100%", height: 40, border: "1px solid #cbd5e1", borderRadius: 6, padding: "0 10px", font: "inherit" }} />
              </Grid>
              <Grid item xs={12} md={2.5}>
                <Typography variant="caption" color="text.secondary">To date</Typography>
                <Box component="input" type="date" value={filters.toDate} onChange={(event) => setFilters({ ...filters, toDate: event.target.value })} style={{ width: "100%", height: 40, border: "1px solid #cbd5e1", borderRadius: 6, padding: "0 10px", font: "inherit" }} />
              </Grid>
              <Grid item xs={12} md={4}>
                <Autocomplete
                  options={users}
                  value={users.find((item) => item.email === filters.useremail) || null}
                  getOptionLabel={(option) => option ? `${option.name || ""} (${option.email || ""})` : ""}
                  onChange={(_, value) => setFilters({ ...filters, useremail: value?.email || "" })}
                  renderInput={(params) => <TextField {...params} size="small" label="User" placeholder="All users" />}
                />
              </Grid>
              <Grid item xs={12} md={1.5}><Button fullWidth variant="contained" sx={{ height: 42, mt: { md: 2.2 } }} onClick={loadReport} disabled={loading}>Apply</Button></Grid>
              <Grid item xs={12} md={1.5}><Button fullWidth variant="outlined" sx={{ height: 42, mt: { md: 2.2 } }} onClick={() => setFilters({ fromDate: priorDate(7), toDate: today, useremail: "" })}>Reset</Button></Grid>
            </Grid>
          </Paper>

          <Grid container spacing={2}>
            <Grid item xs={12} md={3}><StatCard icon={<EventNote />} title="Interactions" value={summary.total || 0} subtitle="Lead updates in range" color="#2563eb" /></Grid>
            <Grid item xs={12} md={3}><StatCard icon={<People />} title="Users" value={summary.users || 0} subtitle="Counsellors with activity" color="#16a34a" /></Grid>
            <Grid item xs={12} md={3}><StatCard icon={<Today />} title="Due follow-ups" value={summary.dueFollowups || 0} subtitle="Next follow-up due by today" color="#f97316" /></Grid>
            <Grid item xs={12} md={3}><StatCard icon={<BarChartIcon />} title="With comments" value={summary.withComments || 0} subtitle="Updates carrying comments" color="#9333ea" /></Grid>
          </Grid>

          <Grid container spacing={2}>
            <Grid item xs={12} md={7}>
              <Paper elevation={0} sx={{ p: 2, height: 360, borderRadius: 3, border: "1px solid #e5e7eb" }}>
                <Typography fontWeight={900} sx={{ mb: 1 }}>Datewise interactions</Typography>
                <ResponsiveContainer width="100%" height="88%">
                  <BarChart data={summary.byDate || []} margin={{ top: 10, right: 20, left: 0, bottom: 55 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" angle={-35} textAnchor="end" interval={0} height={70} />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#2563eb" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>
            <Grid item xs={12} md={5}>
              <Paper elevation={0} sx={{ p: 2, height: 360, borderRadius: 3, border: "1px solid #e5e7eb" }}>
                <Typography fontWeight={900} sx={{ mb: 1 }}>Userwise interactions</Typography>
                <ResponsiveContainer width="100%" height="88%">
                  <PieChart>
                    <Pie data={summary.byUser || []} dataKey="count" nameKey="user" outerRadius={105} label>
                      {(summary.byUser || []).map((_, index) => <Cell key={index} fill={colors[index % colors.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>
          </Grid>

          <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #e5e7eb" }}>
            <Typography fontWeight={900} sx={{ mb: 1 }}>Interaction details</Typography>
            <Box sx={{ height: 620, width: "100%" }}>
              <DataGrid
                rows={rows}
                columns={columns}
                getRowId={(row) => row._id}
                loading={loading}
                slots={{ toolbar: GridToolbar }}
                slotProps={{ toolbar: { showQuickFilter: true, csvOptions: { fileName: "crm_daily_interaction_report" } } }}
                pageSizeOptions={[10, 25, 50, 100]}
                initialState={{ pagination: { paginationModel: { pageSize: 25, page: 0 } } }}
              />
            </Box>
          </Paper>
        </Stack>
      </Box>
    </MenuPageShell>
  );
}
