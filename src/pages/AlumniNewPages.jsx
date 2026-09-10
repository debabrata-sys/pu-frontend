import React, { useEffect, useMemo, useState } from "react";
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Divider,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Slider,
  Stack,
  Tab,
  Tabs,
  TextField,
  Toolbar,
  Typography
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import BusinessCenterIcon from "@mui/icons-material/BusinessCenter";
import CampaignIcon from "@mui/icons-material/Campaign";
import DashboardIcon from "@mui/icons-material/Dashboard";
import EventIcon from "@mui/icons-material/Event";
import HomeIcon from "@mui/icons-material/Home";
import LogoutIcon from "@mui/icons-material/Logout";
import MailIcon from "@mui/icons-material/Mail";
import PeopleIcon from "@mui/icons-material/People";
import SearchIcon from "@mui/icons-material/Search";
import UploadIcon from "@mui/icons-material/Upload";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from "recharts";
import ep1 from "../api/ep1";
import global1 from "./global1";
import MenuPageShell from "./MenuPageShell";

const colors = ["#0f766e", "#2563eb", "#b45309", "#7c3aed", "#be123c", "#15803d"];
const kmMarks = [{ value: 1, label: "1" }, { value: 25, label: "25" }, { value: 50, label: "50" }, { value: 100, label: "100" }];
const blankProfile = {
  name: "",
  phone: "",
  photo: "",
  company: "",
  designation: "",
  sector: "",
  industry: "",
  city: "",
  country: "",
  latitude: "",
  longitude: "",
  linkedin: "",
  website: "",
  skills: "",
  professionalsummary: "",
  allowsearch: "Yes",
  status: "Active"
};
const blankJob = {
  type: "Job",
  title: "",
  company: "",
  sector: "",
  industry: "",
  city: "",
  country: "",
  location: "",
  description: "",
  eligibility: "",
  applylink: "",
  contactemail: "",
  startdate: "",
  enddate: "",
  status: "Active"
};
const blankEvent = {
  title: "",
  description: "",
  eventdate: "",
  starttime: "",
  venue: "",
  city: "",
  country: "",
  registrationstart: "",
  registrationend: "",
  status: "Active"
};

const apiParams = () => ({ colid: global1.colid, user: global1.user, email: global1.email || global1.user });
const safe = (value) => String(value || "");

const StatCard = ({ title, value, icon, tone = "#0f766e" }) => (
  <Card sx={{ height: "100%", borderRadius: 2, border: "1px solid #dce4ec" }}>
    <CardContent>
      <Stack direction="row" spacing={2} alignItems="center">
        <Avatar sx={{ bgcolor: tone }}>{icon}</Avatar>
        <Box>
          <Typography variant="body2" color="text.secondary">{title}</Typography>
          <Typography variant="h4" fontWeight={900}>{value || 0}</Typography>
        </Box>
      </Stack>
    </CardContent>
  </Card>
);

const printRows = (title, rows, columns) => {
  const win = window.open("", "_blank", "width=1100,height=800");
  if (!win) return;
  const header = `<h2>${safe(global1.insname || "Institution")}</h2><p>${safe(global1.address || "")}</p><h3>${title}</h3>`;
  const table = `<table><thead><tr>${columns.map((c) => `<th>${c.headerName}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${columns.map((c) => `<td>${safe(row[c.field])}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
  win.document.write(`<html><head><title>${title}</title><style>body{font-family:Arial;color:#000;margin:24px}h2,h3{text-align:center;margin:4px}table{width:100%;border-collapse:collapse;margin-top:16px}th,td{border:1px solid #222;padding:6px;font-size:12px;vertical-align:top;white-space:normal}button{margin:12px}@media print{button{display:none}}</style></head><body><button onclick="window.print()">Print</button><button onclick="window.close()">Close</button>${header}${table}</body></html>`);
  win.document.close();
};

function AlumniShell({ title, children }) {
  const navigate = useNavigate();
  const links = [
    ["/alumni-new-dashboard", "Dashboard", <DashboardIcon />],
    ["/alumni-new-profile", "Professional profile", <AccountCircleIcon />],
    ["/alumni-new-directory", "Alumni search", <SearchIcon />],
    ["/alumni-new-jobs", "Jobs and internships", <BusinessCenterIcon />],
    ["/alumni-new-events", "Events", <EventIcon />],
    ["/alumni-new-messages", "Messages", <MailIcon />]
  ];
  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#f5f7fb" }}>
      <Box sx={{ bgcolor: "#0f172a", color: "#fff", position: "sticky", top: 0, zIndex: 10 }}>
        <Toolbar sx={{ gap: 1, flexWrap: "wrap" }}>
          <Typography variant="h6" fontWeight={900} sx={{ mr: 2 }}>Alumni Portal</Typography>
          {links.map(([to, label, icon]) => (
            <Button key={to} color="inherit" component={RouterLink} to={to} startIcon={icon} sx={{ textTransform: "none" }}>{label}</Button>
          ))}
          <Box sx={{ flexGrow: 1 }} />
          <Button color="inherit" startIcon={<HomeIcon />} onClick={() => navigate("/alumni-new-dashboard")}>Home</Button>
          <Button color="inherit" startIcon={<LogoutIcon />} onClick={() => { localStorage.clear(); window.location.href = "/"; }}>Logout</Button>
        </Toolbar>
      </Box>
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Typography variant="h4" fontWeight={900} sx={{ mb: 2 }}>{title}</Typography>
        {children}
      </Container>
    </Box>
  );
}

function Field({ form, setForm, name, label, type = "text", select = false, children, multiline = false }) {
  return (
    <TextField
      fullWidth
      size="small"
      type={type}
      select={select}
      multiline={multiline}
      minRows={multiline ? 3 : undefined}
      label={label}
      value={form[name] || ""}
      onChange={(e) => setForm((prev) => ({ ...prev, [name]: e.target.value }))}
    >
      {children}
    </TextField>
  );
}

export function AlumniDashboardNewPage() {
  const [stats, setStats] = useState({});
  const [profile, setProfile] = useState({});
  useEffect(() => {
    ep1.get("/api/v2/alumni-new/dashboard", { params: apiParams() }).then((res) => {
      setStats(res.data?.data || {});
      setProfile(res.data?.data?.profile || {});
    }).catch(() => {});
  }, []);
  const chartData = [
    { name: "Alumni", value: stats.alumniCount || 0 },
    { name: "Jobs", value: stats.jobCount || 0 },
    { name: "Events", value: stats.eventCount || 0 },
    { name: "Messages", value: stats.messageCount || 0 }
  ];
  return (
    <AlumniShell title={`Welcome ${global1.name || "Alumni"}`}>
      <Grid container spacing={2}>
        <Grid item xs={12} md={3}><StatCard title="Searchable alumni" value={stats.alumniCount} icon={<PeopleIcon />} /></Grid>
        <Grid item xs={12} md={3}><StatCard title="Jobs and internships" value={stats.jobCount} icon={<BusinessCenterIcon />} tone="#2563eb" /></Grid>
        <Grid item xs={12} md={3}><StatCard title="Events open" value={stats.eventCount} icon={<EventIcon />} tone="#b45309" /></Grid>
        <Grid item xs={12} md={3}><StatCard title="Messages" value={stats.messageCount} icon={<MailIcon />} tone="#7c3aed" /></Grid>
        <Grid item xs={12} md={5}>
          <Card sx={{ height: 340 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={800}>Portal activity</Typography>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#0f766e" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={7}>
          <Card sx={{ height: 340 }}>
            <CardContent>
              <Stack direction={{ xs: "column", md: "row" }} spacing={3} alignItems="center">
                <Avatar src={profile.photo} sx={{ width: 128, height: 128, bgcolor: "#0f766e" }}>{safe(profile.name || global1.name).charAt(0)}</Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h5" fontWeight={900}>{profile.name || global1.name}</Typography>
                  <Typography color="text.secondary">{profile.designation || "Update your designation"} at {profile.company || "your current organization"}</Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ my: 2 }}>
                    {[profile.sector, profile.city, profile.country, profile.skills].filter(Boolean).map((item) => <Chip key={item} label={item} />)}
                  </Stack>
                  <Typography sx={{ whiteSpace: "pre-wrap" }}>{profile.professionalsummary || "Complete your professional profile so students and alumni can discover and connect with you."}</Typography>
                  <Button sx={{ mt: 2 }} variant="contained" component={RouterLink} to="/alumni-new-profile">Update profile</Button>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </AlumniShell>
  );
}

export function AlumniProfileNewPage() {
  const [form, setForm] = useState(blankProfile);
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const load = () => ep1.get("/api/v2/alumni-new/profile", { params: apiParams() }).then((res) => setForm({ ...blankProfile, ...(res.data?.data || {}) }));
  useEffect(() => { load().catch(() => {}); }, []);
  const save = async () => {
    setSaving(true);
    try {
      await ep1.post("/api/v2/alumni-new/profile", { ...form, colid: global1.colid, useremail: global1.user, user: global1.user, name: form.name || global1.name });
      if (file) {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("colid", global1.colid);
        fd.append("useremail", global1.user);
        fd.append("user", global1.user);
        const upload = await ep1.post("/api/v2/alumni-new/profile-photo", fd, { headers: { "Content-Type": "multipart/form-data" } });
        setForm((prev) => ({ ...prev, photo: upload.data?.url || prev.photo }));
        setFile(null);
      }
      alert("Profile saved");
      load();
    } catch (error) {
      alert(error.response?.data?.message || error.message);
    } finally {
      setSaving(false);
    }
  };
  const setCoordinates = () => {
    if (!navigator.geolocation) return alert("Geolocation is not available in this browser");
    navigator.geolocation.getCurrentPosition((pos) => setForm((prev) => ({ ...prev, latitude: pos.coords.latitude, longitude: pos.coords.longitude })));
  };
  return (
    <AlumniShell title="Professional profile">
      <Paper sx={{ p: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={3}>
            <Stack spacing={2} alignItems="center">
              <Avatar src={form.photo} sx={{ width: 156, height: 156, bgcolor: "#0f766e" }}>{safe(form.name || global1.name).charAt(0)}</Avatar>
              <Button fullWidth component="label" variant="outlined" startIcon={<UploadIcon />}>Upload photo<input hidden type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} /></Button>
              {file && <Typography variant="caption">{file.name}</Typography>}
              <Button fullWidth onClick={setCoordinates}>Use my current location</Button>
            </Stack>
          </Grid>
          <Grid item xs={12} md={9}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}><Field form={form} setForm={setForm} name="name" label="Name" /></Grid>
              <Grid item xs={12} md={4}><Field form={form} setForm={setForm} name="phone" label="Phone" /></Grid>
              <Grid item xs={12} md={4}><Field form={form} setForm={setForm} name="allowsearch" label="Visible in alumni search" select><MenuItem value="Yes">Yes</MenuItem><MenuItem value="No">No</MenuItem></Field></Grid>
              <Grid item xs={12} md={4}><Field form={form} setForm={setForm} name="company" label="Company" /></Grid>
              <Grid item xs={12} md={4}><Field form={form} setForm={setForm} name="designation" label="Designation" /></Grid>
              <Grid item xs={12} md={4}><Field form={form} setForm={setForm} name="sector" label="Job sector" /></Grid>
              <Grid item xs={12} md={4}><Field form={form} setForm={setForm} name="industry" label="Industry" /></Grid>
              <Grid item xs={12} md={4}><Field form={form} setForm={setForm} name="city" label="City" /></Grid>
              <Grid item xs={12} md={4}><Field form={form} setForm={setForm} name="country" label="Country" /></Grid>
              <Grid item xs={12} md={3}><Field form={form} setForm={setForm} name="latitude" label="Latitude" /></Grid>
              <Grid item xs={12} md={3}><Field form={form} setForm={setForm} name="longitude" label="Longitude" /></Grid>
              <Grid item xs={12} md={3}><Field form={form} setForm={setForm} name="linkedin" label="LinkedIn" /></Grid>
              <Grid item xs={12} md={3}><Field form={form} setForm={setForm} name="website" label="Website" /></Grid>
              <Grid item xs={12}><Field form={form} setForm={setForm} name="skills" label="Skills" /></Grid>
              <Grid item xs={12}><Field form={form} setForm={setForm} name="professionalsummary" label="Professional summary" multiline /></Grid>
            </Grid>
            <Stack direction="row" justifyContent="flex-end" sx={{ mt: 2 }}>
              <Button variant="contained" onClick={save} disabled={saving}>{saving ? "Saving..." : "Save profile"}</Button>
            </Stack>
          </Grid>
        </Grid>
      </Paper>
    </AlumniShell>
  );
}

function AlumniSearchCore({ student = false }) {
  const [filters, setFilters] = useState({ keyword: "", company: "", sector: "", city: "", country: "", latitude: "", longitude: "", distanceKm: 10 });
  const [rows, setRows] = useState([]);
  const [message, setMessage] = useState({ alumniemail: "", alumniname: "", subject: "Alumni connect", message: "" });
  const search = async () => {
    const res = await ep1.post("/api/v2/alumni-new/search", { ...filters, colid: global1.colid });
    setRows(res.data?.data || []);
  };
  useEffect(() => { search().catch(() => {}); }, []);
  const locate = () => navigator.geolocation?.getCurrentPosition((pos) => setFilters((prev) => ({ ...prev, latitude: pos.coords.latitude, longitude: pos.coords.longitude })));
  const sendMessage = async () => {
    if (!message.alumniemail || !message.message) return alert("Select an alumni and write a message");
    await ep1.post("/api/v2/alumni-new/messages-start", {
      colid: global1.colid,
      alumniemail: message.alumniemail,
      alumniname: message.alumniname,
      studentemail: global1.user,
      studentname: global1.name,
      studentregno: global1.regno,
      subject: message.subject,
      message: message.message,
      senderrole: student ? "Student" : global1.role
    });
    setMessage({ alumniemail: "", alumniname: "", subject: "Alumni connect", message: "" });
    alert("Message sent");
  };
  const columns = [
    { field: "photo", headerName: "Photo", width: 80, renderCell: (p) => <Avatar src={p.value} /> },
    { field: "name", headerName: "Name", width: 170 },
    { field: "company", headerName: "Company", width: 170 },
    { field: "designation", headerName: "Designation", width: 170 },
    { field: "sector", headerName: "Sector", width: 150 },
    { field: "city", headerName: "City", width: 120 },
    { field: "country", headerName: "Country", width: 120 },
    { field: "distanceKm", headerName: "Distance km", width: 120, valueGetter: (p) => p.row.distanceKm ? Number(p.row.distanceKm).toFixed(1) : "" },
    { field: "action", headerName: "Connect", width: 120, renderCell: (p) => <Button size="small" onClick={() => setMessage((prev) => ({ ...prev, alumniemail: p.row.useremail, alumniname: p.row.name }))}>Message</Button> }
  ];
  return (
    <Stack spacing={2}>
      <Paper sx={{ p: 2 }}>
        <Grid container spacing={1}>
          {["keyword", "company", "sector", "city", "country", "latitude", "longitude"].map((field) => (
            <Grid item xs={12} md={field === "keyword" ? 3 : 1.5} key={field}>
              <TextField fullWidth size="small" label={field} value={filters[field]} onChange={(e) => setFilters((prev) => ({ ...prev, [field]: e.target.value }))} />
            </Grid>
          ))}
          <Grid item xs={12} md={3}>
            <Typography variant="caption" color="text.secondary">Distance: {filters.distanceKm} km</Typography>
            <Slider min={1} max={100} marks={kmMarks} valueLabelDisplay="auto" value={Number(filters.distanceKm) || 10} onChange={(_, value) => setFilters((prev) => ({ ...prev, distanceKm: value }))} />
          </Grid>
          <Grid item xs={12} md={3}>
            <Stack direction="row" spacing={1}>
              <Button variant="contained" onClick={search} startIcon={<SearchIcon />}>Search</Button>
              <Button onClick={locate}>Use location</Button>
              <Button onClick={() => printRows("Alumni directory", rows, columns.filter((c) => c.field !== "photo" && c.field !== "action"))}>Print</Button>
            </Stack>
          </Grid>
        </Grid>
      </Paper>
      <Paper sx={{ p: 2 }}>
        <Box sx={{ height: 430, width: "100%" }}>
          <DataGrid rows={rows} columns={columns} getRowId={(row) => row._id} pageSizeOptions={[10, 25, 50, 100]} initialState={{ pagination: { paginationModel: { pageSize: 10 } } }} sx={{ "& .MuiDataGrid-cell": { whiteSpace: "normal", lineHeight: 1.35, alignItems: "flex-start", py: 1 } }} />
        </Box>
      </Paper>
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" fontWeight={800}>Connect through message</Typography>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid item xs={12} md={3}><TextField fullWidth size="small" label="Alumni email" value={message.alumniemail} InputProps={{ readOnly: true }} /></Grid>
          <Grid item xs={12} md={3}><TextField fullWidth size="small" label="Alumni name" value={message.alumniname} InputProps={{ readOnly: true }} /></Grid>
          <Grid item xs={12} md={3}><TextField fullWidth size="small" label="Subject" value={message.subject} onChange={(e) => setMessage((prev) => ({ ...prev, subject: e.target.value }))} /></Grid>
          <Grid item xs={12} md={3}><Button fullWidth variant="contained" onClick={sendMessage}>Send message</Button></Grid>
          <Grid item xs={12}><TextField fullWidth multiline minRows={3} label="Message" value={message.message} onChange={(e) => setMessage((prev) => ({ ...prev, message: e.target.value }))} /></Grid>
        </Grid>
      </Paper>
    </Stack>
  );
}

export function AlumniDirectoryPage() {
  return <AlumniShell title="Alumni search"><AlumniSearchCore /></AlumniShell>;
}

export function StudentAlumniConnectPage() {
  const [tab, setTab] = useState(0);
  return (
    <MenuPageShell title="Alumni connect" menuType="student">
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
          <Tab label="Search alumni" />
          <Tab label="Jobs and internships" />
          <Tab label="Messages" />
        </Tabs>
        {tab === 0 && <AlumniSearchCore student />}
        {tab === 1 && <JobsCore readonly />}
        {tab === 2 && <MessagesCore role="Student" />}
      </Container>
    </MenuPageShell>
  );
}

function JobsCore({ readonly = false }) {
  const [form, setForm] = useState(blankJob);
  const [rows, setRows] = useState([]);
  const [filters, setFilters] = useState({ keyword: "", type: "", company: "", sector: "", city: "", country: "" });
  const load = async () => {
    const params = { ...filters, colid: global1.colid };
    if (!readonly) params.alumniemail = global1.user;
    const res = await ep1.get("/api/v2/alumni-new/jobs", { params });
    setRows(res.data?.data || []);
  };
  useEffect(() => { load().catch(() => {}); }, []);
  const save = async () => {
    await ep1.post("/api/v2/alumni-new/jobs", { ...form, colid: global1.colid, alumniemail: global1.user, alumniname: global1.name, user: global1.user });
    setForm(blankJob);
    load();
  };
  const remove = async (id) => {
    await ep1.post("/api/v2/alumni-new/jobs-delete", { colid: global1.colid, ids: [id] });
    load();
  };
  const columns = [
    { field: "type", headerName: "Type", width: 120 },
    { field: "title", headerName: "Title", width: 220 },
    { field: "company", headerName: "Company", width: 170 },
    { field: "sector", headerName: "Sector", width: 140 },
    { field: "city", headerName: "City", width: 120 },
    { field: "country", headerName: "Country", width: 120 },
    { field: "enddate", headerName: "End date", width: 120 },
    { field: "applylink", headerName: "Apply", width: 150, renderCell: (p) => p.value ? <Button size="small" onClick={() => window.open(p.value, "_blank")}>Open</Button> : "" },
    ...(!readonly ? [{ field: "actions", headerName: "Actions", width: 170, renderCell: (p) => <Stack direction="row"><Button size="small" onClick={() => setForm({ ...blankJob, ...p.row })}>Edit</Button><Button size="small" color="error" onClick={() => remove(p.row._id)}>Delete</Button></Stack> }] : [])
  ];
  return (
    <Stack spacing={2}>
      {!readonly && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" fontWeight={800}>Post job or internship</Typography>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} md={2}><Field form={form} setForm={setForm} name="type" label="Type" select><MenuItem value="Job">Job</MenuItem><MenuItem value="Internship">Internship</MenuItem></Field></Grid>
            {["title", "company", "sector", "industry", "city", "country", "location", "contactemail", "applylink", "startdate", "enddate"].map((field) => (
              <Grid item xs={12} md={field === "title" ? 4 : 2} key={field}><Field form={form} setForm={setForm} name={field} label={field} type={field.includes("date") ? "date" : "text"} /></Grid>
            ))}
            <Grid item xs={12} md={6}><Field form={form} setForm={setForm} name="eligibility" label="Eligibility" multiline /></Grid>
            <Grid item xs={12} md={6}><Field form={form} setForm={setForm} name="description" label="Description" multiline /></Grid>
            <Grid item xs={12}><Button variant="contained" onClick={save}>Save post</Button></Grid>
          </Grid>
        </Paper>
      )}
      <Paper sx={{ p: 2 }}>
        <Grid container spacing={1} sx={{ mb: 2 }}>
          {["keyword", "type", "company", "sector", "city", "country"].map((field) => <Grid item xs={12} md={2} key={field}><TextField fullWidth size="small" label={field} value={filters[field]} onChange={(e) => setFilters((prev) => ({ ...prev, [field]: e.target.value }))} /></Grid>)}
          <Grid item xs={12} md={2}><Button variant="contained" onClick={load}>Apply</Button></Grid>
        </Grid>
        <Box sx={{ height: 430 }}><DataGrid rows={rows} columns={columns} getRowId={(row) => row._id} pageSizeOptions={[10, 25, 50, 100]} sx={{ "& .MuiDataGrid-cell": { whiteSpace: "normal", lineHeight: 1.35, alignItems: "flex-start", py: 1 } }} /></Box>
      </Paper>
    </Stack>
  );
}

export function AlumniJobsInternshipsPage() {
  return <AlumniShell title="Jobs and internships"><JobsCore /></AlumniShell>;
}

function EventsCore({ admin = false }) {
  const [form, setForm] = useState(blankEvent);
  const [rows, setRows] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const load = async () => {
    const [events, regs] = await Promise.all([
      ep1.get("/api/v2/alumni-new/events", { params: { colid: global1.colid } }),
      ep1.get("/api/v2/alumni-new/events-registrations", { params: { colid: global1.colid } })
    ]);
    setRows(events.data?.data || []);
    setRegistrations(regs.data?.data || []);
  };
  useEffect(() => { load().catch(() => {}); }, []);
  const save = async () => {
    await ep1.post("/api/v2/alumni-new/events", { ...form, colid: global1.colid, user: global1.user, createdby: global1.user });
    setForm(blankEvent);
    load();
  };
  const register = async (row) => {
    await ep1.post("/api/v2/alumni-new/events-register", { colid: global1.colid, eventid: row._id, alumniemail: global1.user, alumniname: global1.name, phone: global1.phone, user: global1.user });
    alert("Registered");
    load();
  };
  const eventCounts = rows.map((event) => ({ name: event.title, registrations: registrations.filter((r) => r.eventid === event._id).length }));
  const columns = [
    { field: "title", headerName: "Event", width: 220 },
    { field: "eventdate", headerName: "Date", width: 120 },
    { field: "starttime", headerName: "Time", width: 100 },
    { field: "venue", headerName: "Venue", width: 180 },
    { field: "city", headerName: "City", width: 120 },
    { field: "status", headerName: "Status", width: 120 },
    { field: "action", headerName: admin ? "Edit" : "Register", width: 150, renderCell: (p) => admin ? <Button size="small" onClick={() => setForm({ ...blankEvent, ...p.row })}>Edit</Button> : <Button size="small" onClick={() => register(p.row)}>Register</Button> }
  ];
  return (
    <Stack spacing={2}>
      {admin && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" fontWeight={800}>Institute event posting</Typography>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            {["title", "eventdate", "starttime", "venue", "city", "country", "registrationstart", "registrationend", "status"].map((field) => (
              <Grid item xs={12} md={field === "title" ? 4 : 2} key={field}><Field form={form} setForm={setForm} name={field} label={field} type={field.includes("date") ? "date" : "text"} /></Grid>
            ))}
            <Grid item xs={12}><Field form={form} setForm={setForm} name="description" label="Description" multiline /></Grid>
            <Grid item xs={12}><Button variant="contained" onClick={save}>Save event</Button></Grid>
          </Grid>
        </Paper>
      )}
      <Grid container spacing={2}>
        <Grid item xs={12} md={8}><Paper sx={{ p: 2, height: 460 }}><DataGrid rows={rows} columns={columns} getRowId={(row) => row._id} pageSizeOptions={[10, 25, 50]} sx={{ "& .MuiDataGrid-cell": { whiteSpace: "normal", lineHeight: 1.35, alignItems: "flex-start", py: 1 } }} /></Paper></Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, height: 460 }}>
            <Typography variant="h6" fontWeight={800}>Registrations</Typography>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={eventCounts} dataKey="registrations" nameKey="name" outerRadius={80} label>
                  {eventCounts.map((_, index) => <Cell key={index} fill={colors[index % colors.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
            <Divider sx={{ my: 1 }} />
            <Box sx={{ maxHeight: 170, overflow: "auto" }}>{registrations.map((r) => <Typography key={r._id} variant="body2">{r.eventtitle}: {r.alumniname || r.alumniemail}</Typography>)}</Box>
          </Paper>
        </Grid>
      </Grid>
    </Stack>
  );
}

export function AlumniEventsPage() {
  return <AlumniShell title="Alumni events"><EventsCore /></AlumniShell>;
}

export function AlumniInstituteEventsPage() {
  return <MenuPageShell title="Alumni events"><Container maxWidth="xl" sx={{ py: 3 }}><EventsCore admin /></Container></MenuPageShell>;
}

function MessagesCore({ role = "Alumni" }) {
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState(null);
  const [reply, setReply] = useState("");
  const load = async () => {
    const res = await ep1.get("/api/v2/alumni-new/messages", { params: { colid: global1.colid, email: global1.user, role } });
    setRows(res.data?.data || []);
  };
  useEffect(() => { load().catch(() => {}); }, [role]);
  const send = async () => {
    if (!selected || !reply) return;
    await ep1.post("/api/v2/alumni-new/messages-reply", { colid: global1.colid, id: selected._id, senderrole: role, senderemail: global1.user, sendername: global1.name, message: reply, status: "Open" });
    setReply("");
    load();
  };
  const columns = [
    { field: "subject", headerName: "Subject", width: 200 },
    { field: "studentname", headerName: "Student", width: 160 },
    { field: "studentregno", headerName: "Regno", width: 120 },
    { field: "alumniname", headerName: "Alumni", width: 160 },
    { field: "status", headerName: "Status", width: 100 },
    { field: "action", headerName: "Open", width: 100, renderCell: (p) => <Button size="small" onClick={() => setSelected(p.row)}>Open</Button> }
  ];
  return (
    <Grid container spacing={2}>
      <Grid item xs={12} md={5}><Paper sx={{ p: 2, height: 520 }}><DataGrid rows={rows} columns={columns} getRowId={(row) => row._id} pageSizeOptions={[10, 25, 50]} /></Paper></Grid>
      <Grid item xs={12} md={7}>
        <Paper sx={{ p: 2, minHeight: 520 }}>
          <Typography variant="h6" fontWeight={800}>{selected?.subject || "Select a conversation"}</Typography>
          <Stack spacing={1.5} sx={{ my: 2, maxHeight: 330, overflow: "auto" }}>
            {(selected?.messages || []).map((m) => (
              <Box key={m._id || m.date} sx={{ p: 1.5, borderRadius: 2, bgcolor: m.senderemail === global1.user ? "#e0f2fe" : "#f1f5f9" }}>
                <Typography variant="caption" fontWeight={800}>{m.sendername || m.senderemail} - {new Date(m.date).toLocaleString()}</Typography>
                <Typography sx={{ whiteSpace: "pre-wrap" }}>{m.message}</Typography>
              </Box>
            ))}
          </Stack>
          <TextField fullWidth multiline minRows={3} label="Reply" value={reply} onChange={(e) => setReply(e.target.value)} />
          <Button sx={{ mt: 1 }} variant="contained" disabled={!selected} onClick={send}>Send reply</Button>
        </Paper>
      </Grid>
    </Grid>
  );
}

export function AlumniMessagesPage() {
  return <AlumniShell title="Messages"><MessagesCore role="Alumni" /></AlumniShell>;
}
