import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Autocomplete,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  LinearProgress,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography
} from "@mui/material";
import { DataGrid, GridToolbar } from "@mui/x-data-grid";
import { Add, Delete, Edit, Login, Payment, Print, Refresh, UploadFile } from "@mui/icons-material";
import * as XLSX from "xlsx";
import { useNavigate } from "react-router-dom";
import ep1 from "../api/ep1";
import global1 from "./global1";
import MenuPageShell from "./MenuPageShell";

const sessionKey = "parentPortalSession";
const parentFields = ["parentname", "email", "phone", "address", "city", "pin", "state", "country", "occupation", "income", "caste", "password", "status"];
const linkFields = ["academicyear", "regulation", "program", "programcode", "semester", "section", "parentemail", "parent", "student", "regno", "studentemail", "status"];
const studentFields = ["name", "email", "regno", "academicyear", "regulation", "program", "programcode", "semester", "section", "gender", "admissionyear"];
const money = (value) => Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const selectionToArray = (selection) => Array.from(selection?.ids || selection || []);
const gatewayKey = (value) => String(value || "").replace(/\s|-/g, "").toLowerCase();

function fieldLabel(field) {
  return String(field || "").replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, (item) => item.toUpperCase());
}

function DynamicFilters({ fields, options, filters, setFilters }) {
  const update = (index, patch) => setFilters((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  return (
    <Stack spacing={1}>
      {filters.map((filter, index) => (
        <Grid container spacing={1} key={index}>
          <Grid item xs={12} md={4}>
            <Autocomplete
              size="small"
              options={fields}
              value={filter.field || null}
              onChange={(_, value) => update(index, { field: value || "", value: [] })}
              renderInput={(params) => <TextField {...params} label="Filter field" />}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <Autocomplete
              size="small"
              multiple
              disableCloseOnSelect
              options={options[filter.field] || []}
              value={Array.isArray(filter.value) ? filter.value : []}
              onChange={(_, value) => update(index, { value })}
              renderOption={(props, option, { selected }) => <li {...props}><Checkbox size="small" checked={selected} />{option}</li>}
              renderInput={(params) => <TextField {...params} label="Value" />}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <Button fullWidth color="error" variant="outlined" onClick={() => setFilters((prev) => prev.length === 1 ? [{ field: "", value: [] }] : prev.filter((_, i) => i !== index))}>Remove</Button>
          </Grid>
        </Grid>
      ))}
      <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
        <Button variant="outlined" onClick={() => setFilters((prev) => [...prev, { field: "", value: [] }])}>Add filter</Button>
        <Button onClick={() => setFilters([{ field: "", value: [] }])}>Clear filters</Button>
      </Stack>
    </Stack>
  );
}

async function excelRows(file) {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer);
  return XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { defval: "" });
}

function printGrid(title, rows, columns, institution = {}) {
  const popup = window.open("", "_blank", "width=1100,height=800");
  if (!popup) return;
  const head = columns.map((col) => `<th>${col.headerName}</th>`).join("");
  const body = rows.map((row, index) => `<tr><td>${index + 1}</td>${columns.map((col) => `<td>${row[col.field] ?? ""}</td>`).join("")}</tr>`).join("");
  popup.document.write(`
    <html><head><title>${title}</title><style>
    body{font-family:Arial,sans-serif;color:#000;background:#fff;margin:24px}.actions{margin-bottom:12px}.header{text-align:center;border-bottom:1px solid #000;margin-bottom:12px;padding-bottom:8px}.logo{max-height:60px}table{border-collapse:collapse;width:100%;font-size:11px}th,td{border:1px solid #000;padding:6px;text-align:left;vertical-align:top;word-break:break-word}th{background:#f2f2f2}@media print{.actions{display:none}body{margin:12mm}tr{page-break-inside:avoid}}
    </style></head><body><div class="actions"><button onclick="window.print()">Print</button><button onclick="window.close()">Close</button></div>
    <div class="header">${institution.logolink ? `<img class="logo" src="${institution.logolink}" />` : ""}<h2>${institution.institutionname || ""}</h2><div>${institution.address || ""}</div><h3>${title}</h3></div>
    <table><thead><tr><th>Sr</th>${head}</tr></thead><tbody>${body}</tbody></table></body></html>
  `);
  popup.document.close();
}

function ParentCrud({ kind }) {
  const isParent = kind === "parents";
  const title = isParent ? "Parent details" : "Parent student link";
  const fields = isParent ? parentFields : linkFields;
  const [rows, setRows] = useState([]);
  const [options, setOptions] = useState({});
  const [parents, setParents] = useState([]);
  const [students, setStudents] = useState([]);
  const [institution, setInstitution] = useState({});
  const [filters, setFilters] = useState([{ field: "", value: [] }]);
  const [selected, setSelected] = useState([]);
  const [form, setForm] = useState({});
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const columns = useMemo(() => [
    ...fields.filter((field) => field !== "password").map((field) => ({ field, headerName: fieldLabel(field), minWidth: 140, flex: 1 })),
    { field: "actions", headerName: "Actions", width: 110, sortable: false, renderCell: (params) => <Button size="small" onClick={() => { setForm(params.row); setOpen(true); }}><Edit fontSize="small" /></Button> }
  ], [fields]);

  const load = async () => {
    setBusy(true);
    try {
      const cleanFilters = filters.filter((row) => row.field && row.value?.length);
      const [list, opts] = await Promise.all([
        ep1.get(`/api/v2/parent-portal/${kind}`, { params: { colid: global1.colid, filters: JSON.stringify(cleanFilters) } }),
        ep1.get("/api/v2/parent-portal/options", { params: { colid: global1.colid } })
      ]);
      setRows(list.data.data || []);
      setOptions(opts.data.options || {});
      setParents(opts.data.parents || []);
      setStudents(opts.data.students || []);
      setInstitution(opts.data.institution || {});
    } catch (error) {
      setMessage(error.response?.data?.message || error.message);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    setBusy(true);
    try {
      await ep1.post(`/api/v2/parent-portal/${kind}`, { ...form, colid: global1.colid, name: global1.name, user: global1.user });
      setOpen(false);
      setForm({});
      setMessage("Saved successfully");
      await load();
    } catch (error) {
      setMessage(error.response?.data?.message || error.message);
    } finally {
      setBusy(false);
    }
  };

  const bulkUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      await ep1.post(`/api/v2/parent-portal/${kind}-bulk`, { colid: global1.colid, name: global1.name, user: global1.user, rows: await excelRows(file) });
      setMessage("Bulk upload completed");
      await load();
    } catch (error) {
      setMessage(error.response?.data?.message || error.message);
    } finally {
      event.target.value = "";
      setBusy(false);
    }
  };

  const bulkDelete = async () => {
    if (!selected.length || !window.confirm(`Delete ${selected.length} selected row(s)?`)) return;
    setBusy(true);
    try {
      await ep1.post(`/api/v2/parent-portal/${kind}-delete`, { colid: global1.colid, ids: selected });
      setSelected([]);
      setMessage("Deleted successfully");
      await load();
    } catch (error) {
      setMessage(error.response?.data?.message || error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <MenuPageShell title={title}>
      <Box sx={{ p: 3 }}>
        {message && <Alert sx={{ mb: 2 }} onClose={() => setMessage("")}>{message}</Alert>}
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="h6" fontWeight={800} sx={{ mb: 1 }}>Dynamic filters</Typography>
          <DynamicFilters fields={isParent ? parentFields : [...linkFields, ...studentFields]} options={options} filters={filters} setFilters={setFilters} />
          <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: "wrap" }}>
            <Button variant="contained" startIcon={<Refresh />} onClick={load} disabled={busy}>Load</Button>
            <Button variant="outlined" startIcon={<Add />} onClick={() => { setForm({ status: "Active", password: "Password@123" }); setOpen(true); }} disabled={busy}>Add</Button>
            <Button variant="outlined" component="label" startIcon={<UploadFile />} disabled={busy}>Bulk upload<input hidden type="file" accept=".xlsx,.xls,.csv" onChange={bulkUpload} /></Button>
            <Button variant="outlined" color="error" startIcon={<Delete />} onClick={bulkDelete} disabled={busy || !selected.length}>Bulk delete</Button>
            <Button variant="outlined" startIcon={<Print />} onClick={() => printGrid(title, rows, columns.filter((col) => col.field !== "actions"), institution)}>Print preview</Button>
          </Stack>
        </Paper>
        {busy && <LinearProgress sx={{ mb: 1 }} />}
        <Paper sx={{ height: 620 }}>
          <DataGrid
            rows={rows}
            columns={columns}
            getRowId={(row) => row._id}
            checkboxSelection
            disableRowSelectionOnClick
            onRowSelectionModelChange={(model) => setSelected(selectionToArray(model))}
            slots={{ toolbar: GridToolbar }}
            sx={{ "& .MuiDataGrid-cell": { whiteSpace: "normal", lineHeight: 1.35, alignItems: "flex-start", py: 1 } }}
          />
        </Paper>
        <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>{form._id ? `Edit ${title}` : `Add ${title}`}</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              {!isParent && (
                <>
                  <Grid item xs={12} md={6}>
                    <Autocomplete options={parents} value={parents.find((item) => item.email === form.parentemail) || null} getOptionLabel={(option) => option ? `${option.parentname || ""} (${option.email || ""})` : ""} onChange={(_, value) => setForm((prev) => ({ ...prev, parentemail: value?.email || "", parent: value?.parentname || "" }))} renderInput={(params) => <TextField {...params} label="Search parent" />} />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Autocomplete options={students} value={students.find((item) => item.regno === form.regno) || null} getOptionLabel={(option) => option ? `${option.name || ""} (${option.regno || ""})` : ""} onChange={(_, value) => setForm((prev) => ({ ...prev, student: value?.name || "", regno: value?.regno || "", studentemail: value?.email || "", academicyear: value?.academicyear || "", regulation: value?.regulation || "", program: value?.program || "", programcode: value?.programcode || "", semester: value?.semester || "", section: value?.section || "", photo: value?.photo || "" }))} renderInput={(params) => <TextField {...params} label="Search student" />} />
                  </Grid>
                </>
              )}
              {fields.map((field) => (
                <Grid item xs={12} md={field === "address" ? 12 : 6} key={field}>
                  <TextField fullWidth label={fieldLabel(field)} type={field === "password" ? "password" : "text"} multiline={field === "address"} rows={field === "address" ? 2 : 1} value={form[field] || ""} onChange={(event) => setForm((prev) => ({ ...prev, [field]: event.target.value }))} />
                </Grid>
              ))}
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)} disabled={busy}>Cancel</Button>
            <Button variant="contained" onClick={save} disabled={busy}>{busy ? "Saving..." : "Save"}</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </MenuPageShell>
  );
}

export default function ParentDetailsPage() {
  return <ParentCrud kind="parents" />;
}

export function ParentStudentLinkPage() {
  return <ParentCrud kind="links" />;
}

export function ParentLoginPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const loginParent = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await ep1.post("/api/v2/parent-portal/login", form);
      localStorage.setItem(sessionKey, JSON.stringify(res.data));
      navigate("/parent-dashboard");
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center", bgcolor: "#eef4ff", p: 2 }}>
      <Card sx={{ width: "100%", maxWidth: 460, borderRadius: 3, boxShadow: "0 20px 60px rgba(15,23,42,.16)" }}>
        <CardContent>
          <Typography variant="h4" fontWeight={900}>Parent Login</Typography>
          <Typography color="text.secondary" sx={{ mb: 2 }}>View academic, fee and student activity information for linked children.</Typography>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Stack spacing={2}>
            <TextField label="Parent email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} fullWidth />
            <TextField label="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} fullWidth />
            {busy && <LinearProgress />}
            <Button size="large" variant="contained" startIcon={<Login />} onClick={loginParent} disabled={busy}>{busy ? "Signing in..." : "Login"}</Button>
            <Button onClick={() => navigate("/")}>Back to homepage</Button>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}

function SimpleGrid({ rows, columns, height = 360, checkboxSelection = false, onSelectionModelChange }) {
  return (
    <Paper sx={{ height }}>
      <DataGrid rows={rows || []} columns={columns} getRowId={(row) => row._id || `${row.regno || ""}-${row.coursecode || ""}-${row.feeitem || ""}-${Math.random()}`} checkboxSelection={checkboxSelection} disableRowSelectionOnClick onRowSelectionModelChange={onSelectionModelChange} slots={{ toolbar: GridToolbar }} sx={{ "& .MuiDataGrid-cell": { whiteSpace: "normal", lineHeight: 1.35, alignItems: "flex-start", py: 1 } }} />
    </Paper>
  );
}

export function ParentDashboardPage() {
  const navigate = useNavigate();
  const initial = useMemo(() => { try { return JSON.parse(localStorage.getItem(sessionKey) || "{}"); } catch { return {}; } }, []);
  const [session, setSession] = useState(initial);
  const [selectedStudent, setSelectedStudent] = useState(initial.linkedStudents?.[0] || null);
  const [context, setContext] = useState(null);
  const [tab, setTab] = useState(0);
  const [selectedFees, setSelectedFees] = useState([]);
  const [gatewayId, setGatewayId] = useState("");
  const [passwordForm, setPasswordForm] = useState({ oldpassword: "", newpassword: "" });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => { if (!session?.parent?.email) navigate("/parent-login"); }, [session, navigate]);
  const gateways = context?.gateways || [];
  const selectedStudentDetail = context?.student || selectedStudent || {};
  const payable = (context?.pendingFees || []).filter((row) => selectedFees.includes(row._id)).reduce((sum, row) => sum + Number(row.balance || 0), 0);

  const loadContext = async (link = selectedStudent) => {
    if (!session?.parent?.email || !link?.regno) return;
    setBusy(true);
    try {
      const res = await ep1.get("/api/v2/parent-portal/student-context", { params: { colid: session.parent.colid, parentemail: session.parent.email, regno: link.regno } });
      setContext(res.data);
      const preferred = (res.data.gateways || []).find((gateway) => gateway.default === "Yes") || (res.data.gateways || [])[0];
      setGatewayId(preferred?._id || "");
      setSelectedFees([]);
    } catch (error) {
      setMessage(error.response?.data?.message || error.message);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => { if (selectedStudent) loadContext(selectedStudent); }, [selectedStudent?._id]);

  const logout = () => {
    localStorage.removeItem(sessionKey);
    setSession({});
    navigate("/");
  };

  const startPayment = async () => {
    if (!selectedFees.length) return setMessage("Please select fee items to pay.");
    const gateway = gateways.find((item) => item._id === gatewayId);
    if (!gateway) return setMessage("Please select payment gateway.");
    setBusy(true);
    try {
      const paySession = (await ep1.post("/api/v2/studentonlinepayment/session", {
        colid: session.parent.colid,
        regno: selectedStudent.regno,
        ledgerids: selectedFees,
        gatewayid: gatewayId,
        student: selectedStudentDetail.name || selectedStudent.student,
        name: session.parent.parentname,
        user: session.parent.email,
        email: selectedStudentDetail.email || selectedStudent.studentemail || session.parent.email,
        phone: selectedStudentDetail.phone || session.parent.phone,
        program: selectedStudentDetail.program || selectedStudent.program,
        programcode: selectedStudentDetail.programcode || selectedStudent.programcode,
        regulation: selectedStudentDetail.regulation || selectedStudent.regulation,
        academicyear: selectedStudentDetail.academicyear || selectedStudent.academicyear,
        semester: selectedStudentDetail.semester || selectedStudent.semester,
        section: selectedStudentDetail.section || selectedStudent.section,
        description: `Parent fee payment for ${selectedStudent.regno}`
      })).data.data;
      const key = gatewayKey(gateway.gatewayname);
      if (gateway.type === "External" && !key.includes("easebuzz") && !key.includes("icici")) {
        if (!gateway.externallink) throw new Error("External gateway link is not configured.");
        const params = new URLSearchParams({ colid: String(session.parent.colid), regno: selectedStudent.regno, onlinepaymentid: paySession.payment._id, amount: String(paySession.payment.totalamount || payable), returnurl: window.location.href });
        window.location.assign(`${gateway.externallink}${gateway.externallink.includes("?") ? "&" : "?"}${params.toString()}`);
        return;
      }
      const endpoint = key.includes("icici") ? "/api/v2/icicipayment/initiate" : key.includes("easebuzz") ? "/api/v2/easebuzzpayment/initiate" : "";
      if (!endpoint) throw new Error("Selected gateway must be ICICI, Easebuzz, or an external payment link.");
      const payRes = await ep1.post(endpoint, { ...paySession.gatewayPayload, name: selectedStudentDetail.name || selectedStudent.student || selectedStudent.regno, user: session.parent.email, gateway: gateway.gatewayname, frontendcallbackurl: `${window.location.origin}/parent-dashboard` });
      const url = payRes.data?.data?.paymenturl || payRes.data?.paymenturl || payRes.data?.data?.paymentUrl || payRes.data?.paymentUrl;
      if (!url) throw new Error("Gateway did not return payment URL.");
      window.location.assign(url);
    } catch (error) {
      setMessage(error.response?.data?.message || error.message);
    } finally {
      setBusy(false);
    }
  };

  const changePassword = async () => {
    setBusy(true);
    try {
      await ep1.post("/api/v2/parent-portal/change-password", { ...passwordForm, colid: session.parent.colid, email: session.parent.email });
      setPasswordForm({ oldpassword: "", newpassword: "" });
      setMessage("Password changed successfully");
    } catch (error) {
      setMessage(error.response?.data?.message || error.message);
    } finally {
      setBusy(false);
    }
  };

  const cards = [
    ["Courses", context?.courses?.length || 0],
    ["Pending fees", `Rs. ${money((context?.pendingFees || []).reduce((sum, row) => sum + Number(row.balance || 0), 0))}`],
    ["Open disciplinary", (context?.disciplinary || []).filter((row) => /^open$/i.test(row.status || "")).length],
    ["Assignments due", (context?.assignments || []).filter((row) => row.submissionstatus === "Due").length]
  ];

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#f4f7fb" }}>
      <Box sx={{ px: 3, py: 1.5, bgcolor: "#102a43", color: "#fff", display: "flex", alignItems: "center", gap: 2 }}>
        {session.institution?.logolink && <Avatar src={session.institution.logolink} variant="rounded" />}
        <Box sx={{ flexGrow: 1 }}><Typography variant="h6" fontWeight={900}>{session.institution?.institutionname || "Parent Portal"}</Typography><Typography variant="caption">{session.institution?.address || ""}</Typography></Box>
        <Button color="inherit" onClick={() => navigate("/")}>Home</Button>
        <Button color="inherit" onClick={logout}>Logout</Button>
      </Box>
      <Box sx={{ p: 3 }}>
        {message && <Alert sx={{ mb: 2 }} onClose={() => setMessage("")}>{message}</Alert>}
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} md={4}>
            <Card><CardContent>
              <Typography fontWeight={800} sx={{ mb: 1 }}>Select student</Typography>
              <Autocomplete options={session.linkedStudents || []} value={selectedStudent} getOptionLabel={(option) => option ? `${option.student || ""} (${option.regno || ""})` : ""} onChange={(_, value) => setSelectedStudent(value)} renderInput={(params) => <TextField {...params} label="Linked student" />} />
              <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 2 }}>
                <Avatar src={selectedStudentDetail.photo || selectedStudent?.photo} sx={{ width: 72, height: 72 }} />
                <Box><Typography fontWeight={900}>{selectedStudentDetail.name || selectedStudent?.student}</Typography><Typography variant="body2">{selectedStudent?.regno}</Typography><Typography variant="body2">{selectedStudentDetail.program || selectedStudent?.program} {selectedStudentDetail.semester ? `- Sem ${selectedStudentDetail.semester}` : ""}</Typography></Box>
              </Stack>
            </CardContent></Card>
          </Grid>
          <Grid item xs={12} md={8}>
            <Grid container spacing={1.5}>{cards.map(([label, value]) => <Grid item xs={12} sm={6} lg={3} key={label}><Card sx={{ borderLeft: "5px solid #2563eb" }}><CardContent><Typography color="text.secondary">{label}</Typography><Typography variant="h5" fontWeight={900}>{value}</Typography></CardContent></Card></Grid>)}</Grid>
          </Grid>
        </Grid>
        {busy && <LinearProgress sx={{ mb: 2 }} />}
        <Paper sx={{ mb: 2 }}><Tabs value={tab} onChange={(_, value) => setTab(value)} variant="scrollable" scrollButtons="auto">{["Courses", "Fees payment", "Online payments", "Ledger", "Disciplinary", "Academic calendar", "Exam marks", "Assignments", "Password"].map((label) => <Tab key={label} label={label} />)}</Tabs></Paper>
        {tab === 0 && <SimpleGrid rows={context?.courses || []} columns={["academicyear", "regulation", "program", "programcode", "semester", "course", "coursecode", "facultyname"].map((field) => ({ field, headerName: fieldLabel(field), minWidth: 140, flex: 1 }))} />}
        {tab === 1 && <Stack spacing={2}><Paper sx={{ p: 2 }}><Grid container spacing={2} alignItems="center"><Grid item xs={12} md={5}><Autocomplete options={gateways} value={gateways.find((g) => g._id === gatewayId) || null} getOptionLabel={(option) => option?.gatewayname || ""} onChange={(_, value) => setGatewayId(value?._id || "")} renderInput={(params) => <TextField {...params} label="Payment gateway" />} /></Grid><Grid item xs={12} md={3}><Typography fontWeight={900}>Selected Rs. {money(payable)}</Typography></Grid><Grid item xs={12} md={4}><Button fullWidth variant="contained" startIcon={<Payment />} onClick={startPayment} disabled={busy || !selectedFees.length}>Pay selected fees</Button></Grid></Grid></Paper><SimpleGrid rows={context?.pendingFees || []} checkboxSelection onSelectionModelChange={(model) => setSelectedFees(selectionToArray(model))} columns={["academicyear", "feegroup", "feeitem", "duedate", "amount", "paid", "concession", "balance"].map((field) => ({ field, headerName: fieldLabel(field), minWidth: 140, flex: 1 }))} /></Stack>}
        {tab === 2 && <SimpleGrid rows={context?.onlinePayments || []} columns={["refno", "gateway", "paymentstatus", "totalamount", "paidamount", "paiddate", "gatewayrefno"].map((field) => ({ field, headerName: fieldLabel(field), minWidth: 150, flex: 1 }))} />}
        {tab === 3 && <SimpleGrid rows={context?.ledger || []} columns={["academicyear", "feegroup", "feeitem", "duedate", "amount", "paid", "concession", "balance", "status"].map((field) => ({ field, headerName: fieldLabel(field), minWidth: 140, flex: 1 }))} />}
        {tab === 4 && <SimpleGrid rows={context?.disciplinary || []} columns={["actiondate", "severity", "description", "actiontaken", "actiontakendate", "status"].map((field) => ({ field, headerName: fieldLabel(field), minWidth: 160, flex: 1 }))} />}
        {tab === 5 && <SimpleGrid rows={context?.calendar || []} columns={["activitydate", "ativity", "description", "type", "level", "status1"].map((field) => ({ field, headerName: fieldLabel(field), minWidth: 150, flex: 1 }))} />}
        {tab === 6 && <Stack spacing={2}><Typography variant="h6" fontWeight={800}>Exam Model 2</Typography><SimpleGrid rows={[...(context?.examMarks?.exammodel2 || []), ...(context?.examMarks?.exammodel2viva || [])]} columns={["academicyear", "exam", "examcode", "semester", "course", "coursecode", "overallgrade", "overallpercentage", "status"].map((field) => ({ field, headerName: fieldLabel(field), minWidth: 140, flex: 1 }))} /><Typography variant="h6" fontWeight={800}>Other exam marks</Typography><SimpleGrid rows={[...(context?.examMarks?.exammarks2 || []), ...(context?.examMarks?.exammarksall || [])]} columns={["academicyear", "year", "exam", "examcode", "semester", "papername", "course", "coursecode", "totalmarks", "egrade", "status"].map((field) => ({ field, headerName: fieldLabel(field), minWidth: 140, flex: 1 }))} /></Stack>}
        {tab === 7 && <Stack spacing={2}><Typography variant="h6" fontWeight={800}>Assignments due</Typography><SimpleGrid rows={(context?.assignments || []).filter((row) => row.submissionstatus === "Due")} columns={["course", "coursecode", "title", "duedate", "fullmarks", "submissionstatus"].map((field) => ({ field, headerName: fieldLabel(field), minWidth: 150, flex: 1 }))} /><Typography variant="h6" fontWeight={800}>Assignments submitted</Typography><SimpleGrid rows={context?.submissions || []} columns={["course", "coursecode", "assignmenttitle", "submitteddate", "marks", "fullmarks", "status", "url"].map((field) => ({ field, headerName: fieldLabel(field), minWidth: 150, flex: 1 }))} /></Stack>}
        {tab === 8 && <Paper sx={{ p: 2, maxWidth: 520 }}><Typography variant="h6" fontWeight={800}>Change password</Typography><Stack spacing={2} sx={{ mt: 2 }}><TextField label="Old password" type="password" value={passwordForm.oldpassword} onChange={(e) => setPasswordForm({ ...passwordForm, oldpassword: e.target.value })} /><TextField label="New password" type="password" value={passwordForm.newpassword} onChange={(e) => setPasswordForm({ ...passwordForm, newpassword: e.target.value })} /><Button variant="contained" onClick={changePassword} disabled={busy}>Update password</Button></Stack></Paper>}
      </Box>
    </Box>
  );
}
