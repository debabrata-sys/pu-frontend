import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  Grid,
  MenuItem,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography
} from "@mui/material";
import { DataGrid, GridToolbar } from "@mui/x-data-grid";
import { Delete, Download, Login, Logout, Print, Save, UploadFile, Verified } from "@mui/icons-material";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import * as XLSX from "xlsx";
import MenuPageShell from "./MenuPageShell";
import ep1 from "../api/ep1";
import global1 from "./global1";

const initialForm = {
  visitdate: new Date().toISOString().slice(0, 10),
  gatepassno: "",
  visitorname: "",
  visitoremail: "",
  visitorphone: "",
  organization: "",
  visitoridtype: "",
  visitoridno: "",
  purpose: "",
  department: "",
  whomtomeet: "",
  whomtomeetemail: "",
  approvalstatus: "Pending",
  approvalremarks: "",
  gate: "",
  passstatus: "Requested",
  gatepassgenerated: "No",
  finalmeetingstatus: "Pending",
  meetingdetails: "",
  meetingoutcome: "",
  vehicletype: "None",
  vehicleno: "",
  drivername: "",
  driverphone: "",
  itemsbrought: "",
  laptopserial: "",
  remarks: "",
  status: "Active"
};
const fields = Object.keys(initialForm);
const palette = ["#2563eb", "#16a34a", "#f97316", "#9333ea", "#0f766e", "#dc2626", "#0891b2", "#64748b"];
const gridSx = {
  "& .MuiDataGrid-cell": { whiteSpace: "normal", overflowWrap: "anywhere", lineHeight: 1.35, py: 1 },
  "& .MuiDataGrid-columnHeaderTitle": { whiteSpace: "normal", lineHeight: 1.2 }
};

const rowsOf = (rows = []) => rows.map((row) => ({ ...row, id: row._id }));
const fmtDate = (value) => value ? new Date(value).toLocaleDateString() : "";
const fmtDateTime = (value) => value ? new Date(value).toLocaleString() : "";
const uniq = (rows, field) => [...new Set((rows || []).map((row) => row?.[field]).filter(Boolean))].sort();
const csvEscape = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;

function DynamicFilters({ filters, setFilters, onApply, loading, valueOptions = {} }) {
  return (
    <Paper sx={{ p: 2 }}>
      <Stack spacing={1.2}>
        {filters.map((filter, index) => (
          <Grid container spacing={1.2} key={`filter-${index}`}>
            <Grid item xs={12} md={3}>
              <Autocomplete options={fields} value={filter.field || ""} onChange={(_, value) => setFilters((prev) => prev.map((item, i) => i === index ? { ...item, field: value || fields[0], value: "" } : item))} renderInput={(params) => <TextField {...params} label="Field" />} />
            </Grid>
            <Grid item xs={12} md={2}>
              <TextField select fullWidth label="Operator" value={filter.operator} onChange={(e) => setFilters((prev) => prev.map((item, i) => i === index ? { ...item, operator: e.target.value } : item))}>
                <MenuItem value="contains">Contains</MenuItem>
                <MenuItem value="equals">Equals</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <Autocomplete
                freeSolo
                options={valueOptions[filter.field] || []}
                value={filter.value || ""}
                onInputChange={(_, value) => setFilters((prev) => prev.map((item, i) => i === index ? { ...item, value } : item))}
                onChange={(_, value) => setFilters((prev) => prev.map((item, i) => i === index ? { ...item, value: value || "" } : item))}
                renderInput={(params) => <TextField {...params} label="Value" />}
              />
            </Grid>
            <Grid item xs={12} md={1}>
              <Button fullWidth color="error" sx={{ height: 56 }} onClick={() => setFilters((prev) => prev.filter((_, i) => i !== index))}>Remove</Button>
            </Grid>
          </Grid>
        ))}
        <Stack direction="row" spacing={1} flexWrap="wrap">
          <Button variant="outlined" onClick={() => setFilters((prev) => [...prev, { field: fields[0], operator: "contains", value: "" }])}>Add filter</Button>
          <Button variant="contained" disabled={loading} onClick={onApply}>Apply</Button>
        </Stack>
      </Stack>
    </Paper>
  );
}

function SummaryCard({ label, value, color = "#1d4ed8" }) {
  return (
    <Card sx={{ height: "100%", borderTop: `4px solid ${color}` }}>
      <CardContent>
        <Typography color="text.secondary" fontSize={13}>{label}</Typography>
        <Typography variant="h4" fontWeight={900}>{value ?? 0}</Typography>
      </CardContent>
    </Card>
  );
}

function BarPanel({ data = [] }) {
  return (
    <ResponsiveContainer width="100%" height={290}>
      <BarChart data={data.slice(0, 12)}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
        <YAxis allowDecimals={false} />
        <Tooltip />
        <Legend />
        <Bar dataKey="count" fill="#2563eb" />
      </BarChart>
    </ResponsiveContainer>
  );
}

function PiePanel({ data = [] }) {
  return (
    <ResponsiveContainer width="100%" height={290}>
      <PieChart>
        <Tooltip />
        <Legend />
        <Pie data={data.slice(0, 10)} dataKey="count" nameKey="label" outerRadius={92} label>
          {data.slice(0, 10).map((row, index) => <Cell key={row.label || index} fill={palette[index % palette.length]} />)}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  );
}

function printHtml({ title, institution = {}, rows = [], summary = {} }) {
  const logo = institution.logolink || institution.logo || global1.logo || "";
  const name = institution.institutionname || institution.insname || global1.insname || "Institution";
  const address = institution.address || institution.contactusdetails || "";
  const tableRows = rows.map((row, index) => `<tr>
    <td>${index + 1}</td><td>${row.gatepassno || ""}</td><td>${fmtDate(row.visitdate)}</td><td>${row.visitorname || ""}</td>
    <td>${row.visitorphone || ""}</td><td>${row.organization || ""}</td><td>${row.purpose || ""}</td>
    <td>${row.whomtomeet || ""}</td><td>${row.approvalstatus || ""}</td><td>${row.passstatus || ""}</td><td>${row.gatepassgenerated || ""}</td>
    <td>${row.finalmeetingstatus || ""}</td><td>${row.meetingdetails || ""}</td><td>${row.meetingoutcome || ""}</td><td>${row.vehicleno || ""}</td>
  </tr>`).join("");
  const win = window.open("", "_blank", "width=1100,height=800");
  if (!win) return;
  win.document.write(`<!doctype html><html><head><title>${title}</title><style>
    body{font-family:Arial,sans-serif;color:#000;background:#fff;margin:0}.actions{position:sticky;top:0;background:#fff;padding:10px;border-bottom:1px solid #ddd}
    .page{padding:18mm}.header{text-align:center;border-bottom:2px solid #111;padding-bottom:10px;margin-bottom:12px}.logo{max-height:64px;max-width:130px;object-fit:contain}
    h1,h2,h3{margin:4px 0}.cards{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:12px 0}.card{border:1px solid #111;padding:8px}
    table{width:100%;border-collapse:collapse;font-size:11px}th,td{border:1px solid #111;padding:5px;vertical-align:top}th{background:#f0f0f0}
    @media print{.actions{display:none}.page{padding:12mm}tr{break-inside:avoid}thead{display:table-header-group}}
  </style></head><body><div class="actions"><button onclick="window.print()">Print</button><button onclick="window.close()">Close</button></div><div class="page">
    <div class="header">${logo ? `<img class="logo" src="${logo}" />` : ""}<h2>${name}</h2><div>${address}</div><h3>${title}</h3></div>
    <div class="cards"><div class="card"><b>Total</b><br/>${summary.total || rows.length}</div><div class="card"><b>Approved</b><br/>${summary.approved || 0}</div><div class="card"><b>Pending</b><br/>${summary.pending || 0}</div><div class="card"><b>Gatepass Generated</b><br/>${summary.gatepassGenerated || 0}</div></div>
    <table><thead><tr><th>Sr</th><th>Gate Pass</th><th>Date</th><th>Visitor</th><th>Phone</th><th>Organization</th><th>Purpose</th><th>Whom To Meet</th><th>Approval</th><th>Pass Status</th><th>Gatepass Generated</th><th>Meeting Status</th><th>Meeting Details</th><th>Outcome</th><th>Vehicle</th></tr></thead><tbody>${tableRows}</tbody></table>
  </div></body></html>`);
  win.document.close();
}

function exportTemplate() {
  const sample = [{ ...initialForm, visitorname: "Sample Visitor", visitorphone: "9999999999", whomtomeetemail: "employee@example.com" }];
  const sheet = XLSX.utils.json_to_sheet(sample);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "visitor_pass");
  XLSX.writeFile(book, "visitor-management-template.xlsx");
}

function visitorValueOptions(options = {}, rows = []) {
  return {
    department: options.departments || uniq(rows, "department"),
    purpose: options.purposes || uniq(rows, "purpose"),
    approvalstatus: options.approvalstatuses || uniq(rows, "approvalstatus"),
    passstatus: options.passstatuses || uniq(rows, "passstatus"),
    gatepassgenerated: ["Yes", "No"],
    finalmeetingstatus: options.finalmeetingstatuses || ["Pending", "Updated"],
    gate: options.gates || uniq(rows, "gate"),
    vehicletype: options.vehicletypes || uniq(rows, "vehicletype"),
    visitoridtype: options.idtypes || uniq(rows, "visitoridtype"),
    whomtomeet: (options.users || []).map((u) => u.name).filter(Boolean),
    whomtomeetemail: (options.users || []).map((u) => u.email).filter(Boolean)
  };
}

function useVisitorOptions() {
  const [options, setOptions] = useState({});
  useEffect(() => {
    ep1.get("/api/v2/visitor-management/options", { params: { colid: global1.colid } })
      .then((res) => setOptions(res.data || {}))
      .catch(() => setOptions({}));
  }, []);
  return options;
}

function DateRangeBar({ fromdate, setFromdate, todate, setTodate, onApply, loading, children }) {
  return (
    <Paper sx={{ p: 2 }}>
      <Grid container spacing={1.5} alignItems="center">
        <Grid item xs={12} md={3}><TextField fullWidth type="date" label="From date" InputLabelProps={{ shrink: true }} value={fromdate} onChange={(e) => setFromdate(e.target.value)} /></Grid>
        <Grid item xs={12} md={3}><TextField fullWidth type="date" label="To date" InputLabelProps={{ shrink: true }} value={todate} onChange={(e) => setTodate(e.target.value)} /></Grid>
        {children}
        <Grid item xs={12} md={2}><Button fullWidth sx={{ height: 56 }} variant="contained" disabled={loading} onClick={onApply}>Apply</Button></Grid>
      </Grid>
    </Paper>
  );
}

function useVisitorRows(extra = {}) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const loadRows = async (params = {}) => {
    setLoading(true);
    try {
      const res = await ep1.get("/api/v2/visitor-management/list", { params: { colid: global1.colid, ...extra, ...params } });
      setRows(res.data?.data || []);
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to load visitor records.");
    } finally {
      setLoading(false);
    }
  };
  return { rows, setRows, loading, message, setMessage, loadRows };
}

export function VisitorManagementPage() {
  const [rows, setRows] = useState([]);
  const [options, setOptions] = useState({});
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [filters, setFilters] = useState([{ field: "visitdate", operator: "contains", value: "" }]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const valueOptions = useMemo(() => ({
    department: options.departments || uniq(rows, "department"),
    purpose: options.purposes || uniq(rows, "purpose"),
    approvalstatus: options.approvalstatuses || uniq(rows, "approvalstatus"),
    passstatus: options.passstatuses || uniq(rows, "passstatus"),
    gate: options.gates || uniq(rows, "gate"),
    vehicletype: options.vehicletypes || uniq(rows, "vehicletype"),
    visitoridtype: options.idtypes || uniq(rows, "visitoridtype"),
    whomtomeet: (options.users || []).map((u) => u.name).filter(Boolean),
    whomtomeetemail: (options.users || []).map((u) => u.email).filter(Boolean)
  }), [options, rows]);

  const load = async () => {
    setLoading(true);
    try {
      const [opt, list] = await Promise.all([
        ep1.get("/api/v2/visitor-management/options", { params: { colid: global1.colid } }),
        ep1.get("/api/v2/visitor-management/list", { params: { colid: global1.colid } })
      ]);
      setOptions(opt.data || {});
      setRows(list.data?.data || []);
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to load visitor passes.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const applyFilters = async () => {
    setLoading(true);
    try {
      const params = { colid: global1.colid };
      filters.filter((f) => f.value).forEach((f) => { params[f.field] = f.value; });
      const res = await ep1.get("/api/v2/visitor-management/list", { params });
      setRows(res.data?.data || []);
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to apply filters.");
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    setLoading(true);
    try {
      await ep1.post("/api/v2/visitor-management/save", { ...form, id: editingId, colid: global1.colid, name: global1.name, user: global1.user });
      setForm(initialForm);
      setEditingId("");
      setMessage("Visitor gate pass saved.");
      await load();
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to save visitor pass.");
    } finally {
      setLoading(false);
    }
  };

  const action = async (row, actionName) => {
    const remarks = actionName === "reject" || actionName === "checkout" ? window.prompt("Remarks", "") || "" : "";
    await ep1.post("/api/v2/visitor-management/action", { colid: global1.colid, id: row._id, action: actionName, remarks, name: global1.name, user: global1.user });
    await load();
  };

  const edit = (row) => {
    setEditingId(row._id);
    setForm({ ...initialForm, ...row, visitdate: row.visitdate ? String(row.visitdate).slice(0, 10) : initialForm.visitdate });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const bulkDelete = async () => {
    if (!selectedIds.length || !window.confirm(`Delete ${selectedIds.length} visitor pass record(s)?`)) return;
    await ep1.post("/api/v2/visitor-management/delete", { colid: global1.colid, ids: selectedIds });
    setSelectedIds([]);
    await load();
  };

  const bulkUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const book = XLSX.read(await file.arrayBuffer(), { type: "array" });
    const items = XLSX.utils.sheet_to_json(book.Sheets[book.SheetNames[0]], { defval: "" });
    const res = await ep1.post("/api/v2/visitor-management/bulkupload", { colid: global1.colid, name: global1.name, user: global1.user, items });
    setMessage(`Uploaded ${res.data?.inserted || 0} visitor records.`);
    await load();
  };

  const printGatePass = (row) => printHtml({ title: "Visitor Gate Pass", institution: options.institution || {}, rows: [row], summary: { total: 1, approved: row.approvalstatus === "Approved" ? 1 : 0, pending: row.approvalstatus === "Pending" ? 1 : 0, checkedIn: row.passstatus === "Checked In" ? 1 : 0 } });

  const columns = [
    { field: "gatepassno", headerName: "Gate Pass No", minWidth: 160 },
    { field: "visitdate", headerName: "Visit Date", minWidth: 130, valueFormatter: ({ value }) => fmtDate(value) },
    { field: "visitorname", headerName: "Visitor", minWidth: 170, flex: 1 },
    { field: "visitorphone", headerName: "Phone", minWidth: 130 },
    { field: "organization", headerName: "Organization", minWidth: 160 },
    { field: "purpose", headerName: "Purpose", minWidth: 160 },
    { field: "department", headerName: "Department", minWidth: 150 },
    { field: "whomtomeet", headerName: "Whom To Meet", minWidth: 170 },
    { field: "approvalstatus", headerName: "Approval", minWidth: 120 },
    { field: "passstatus", headerName: "Pass Status", minWidth: 130 },
    { field: "vehicleno", headerName: "Vehicle No", minWidth: 130 },
    { field: "actions", headerName: "Actions", minWidth: 420, sortable: false, renderCell: ({ row }) => (
      <Stack direction="row" spacing={0.7}>
        <Button size="small" onClick={() => edit(row)}>Edit</Button>
        <Button size="small" color="success" startIcon={<Verified />} onClick={() => action(row, "approve")}>Approve</Button>
        <Button size="small" color="error" onClick={() => action(row, "reject")}>Reject</Button>
        <Button size="small" startIcon={<Login />} onClick={() => action(row, "checkin")}>In</Button>
        <Button size="small" startIcon={<Logout />} onClick={() => action(row, "checkout")}>Out</Button>
        <Button size="small" startIcon={<Print />} onClick={() => printGatePass(row)}>Print</Button>
      </Stack>
    ) }
  ];

  return (
    <MenuPageShell title="Visitor Management">
      <Box sx={{ p: 2, bgcolor: "#f6f8fb", minHeight: "100vh" }}>
        <Stack spacing={2}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography variant="h5" fontWeight={900} sx={{ flex: 1 }}>Visitor Management</Typography>
            <Button startIcon={<Download />} variant="outlined" onClick={exportTemplate}>Template</Button>
            <Button component="label" startIcon={<UploadFile />} variant="outlined">Bulk upload<input hidden type="file" accept=".xlsx,.xls,.csv" onChange={bulkUpload} /></Button>
            <Button color="error" startIcon={<Delete />} variant="outlined" disabled={!selectedIds.length} onClick={bulkDelete}>Bulk delete</Button>
          </Stack>
          {message && <Alert severity={/unable|required|delete/i.test(message) ? "warning" : "success"} onClose={() => setMessage("")}>{message}</Alert>}

          <Paper sx={{ p: 2 }}>
            <Grid container spacing={1.5}>
              <Grid item xs={12} md={2}><TextField fullWidth type="date" label="Visit date" InputLabelProps={{ shrink: true }} value={form.visitdate} onChange={(e) => setForm((p) => ({ ...p, visitdate: e.target.value }))} /></Grid>
              {["gatepassno", "visitorname", "visitoremail", "visitorphone", "organization"].map((field) => <Grid item xs={12} md={2} key={field}><TextField fullWidth label={field} value={form[field]} onChange={(e) => setForm((p) => ({ ...p, [field]: e.target.value }))} /></Grid>)}
              <Grid item xs={12} md={2}><Autocomplete freeSolo options={options.idtypes || []} value={form.visitoridtype || ""} onInputChange={(_, value) => setForm((p) => ({ ...p, visitoridtype: value }))} renderInput={(params) => <TextField {...params} label="ID type" />} /></Grid>
              <Grid item xs={12} md={2}><TextField fullWidth label="ID no" value={form.visitoridno} onChange={(e) => setForm((p) => ({ ...p, visitoridno: e.target.value }))} /></Grid>
              <Grid item xs={12} md={2}><Autocomplete freeSolo options={options.purposes || []} value={form.purpose || ""} onInputChange={(_, value) => setForm((p) => ({ ...p, purpose: value }))} renderInput={(params) => <TextField {...params} label="Purpose" />} /></Grid>
              <Grid item xs={12} md={2}><Autocomplete freeSolo options={options.departments || []} value={form.department || ""} onInputChange={(_, value) => setForm((p) => ({ ...p, department: value }))} renderInput={(params) => <TextField {...params} label="Department" />} /></Grid>
              <Grid item xs={12} md={3}>
                <Autocomplete
                  options={options.users || []}
                  getOptionLabel={(o) => typeof o === "string" ? o : `${o.name || ""} - ${o.email || ""}`}
                  onChange={(_, value) => setForm((p) => ({ ...p, whomtomeet: value?.name || "", whomtomeetemail: value?.email || "", department: value?.department || p.department }))}
                  renderInput={(params) => <TextField {...params} label="Whom to meet" required />}
                />
              </Grid>
              <Grid item xs={12} md={2}><Autocomplete freeSolo options={options.gates || []} value={form.gate || ""} onInputChange={(_, value) => setForm((p) => ({ ...p, gate: value }))} renderInput={(params) => <TextField {...params} label="Gate" />} /></Grid>
              <Grid item xs={12} md={2}><TextField select fullWidth label="Approval status" value={form.approvalstatus} onChange={(e) => setForm((p) => ({ ...p, approvalstatus: e.target.value }))}>{(options.approvalstatuses || ["Pending", "Approved", "Rejected"]).map((x) => <MenuItem key={x} value={x}>{x}</MenuItem>)}</TextField></Grid>
              <Grid item xs={12} md={2}><TextField select fullWidth label="Pass status" value={form.passstatus} onChange={(e) => setForm((p) => ({ ...p, passstatus: e.target.value }))}>{(options.passstatuses || ["Requested", "Issued", "Checked In", "Checked Out", "Rejected"]).map((x) => <MenuItem key={x} value={x}>{x}</MenuItem>)}</TextField></Grid>
              <Grid item xs={12} md={2}><TextField select fullWidth label="Vehicle type" value={form.vehicletype} onChange={(e) => setForm((p) => ({ ...p, vehicletype: e.target.value }))}>{(options.vehicletypes || []).map((x) => <MenuItem key={x} value={x}>{x}</MenuItem>)}</TextField></Grid>
              {["vehicleno", "drivername", "driverphone", "itemsbrought", "laptopserial"].map((field) => <Grid item xs={12} md={2} key={field}><TextField fullWidth label={field} value={form[field]} onChange={(e) => setForm((p) => ({ ...p, [field]: e.target.value }))} /></Grid>)}
              <Grid item xs={12} md={6}><TextField fullWidth label="Remarks" value={form.remarks} onChange={(e) => setForm((p) => ({ ...p, remarks: e.target.value }))} /></Grid>
              <Grid item xs={12} md={2}><Button fullWidth sx={{ height: 56 }} variant="contained" startIcon={<Save />} onClick={save}>{editingId ? "Update" : "Save"}</Button></Grid>
              {editingId && <Grid item xs={12} md={2}><Button fullWidth sx={{ height: 56 }} variant="outlined" onClick={() => { setEditingId(""); setForm(initialForm); }}>Cancel edit</Button></Grid>}
            </Grid>
          </Paper>

          <DynamicFilters filters={filters} setFilters={setFilters} onApply={applyFilters} loading={loading} valueOptions={valueOptions} />
          <Paper sx={{ p: 1 }}>
            <DataGrid
              rows={rowsOf(rows)}
              columns={columns}
              checkboxSelection
              onRowSelectionModelChange={(ids) => setSelectedIds(ids)}
              rowSelectionModel={selectedIds}
              slots={{ toolbar: GridToolbar }}
              slotProps={{ toolbar: { showQuickFilter: true, csvOptions: { fileName: "visitor-management" } } }}
              pageSizeOptions={[10, 25, 50, 100]}
              getRowHeight={() => "auto"}
              sx={gridSx}
              autoHeight
            />
          </Paper>
        </Stack>
      </Box>
    </MenuPageShell>
  );
}

export function VisitorManagementReportPage() {
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({});
  const [institution, setInstitution] = useState({});
  const [filters, setFilters] = useState([{ field: "visitdate", operator: "contains", value: "" }]);
  const [fromdate, setFromdate] = useState("");
  const [todate, setTodate] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const valueOptions = useMemo(() => Object.fromEntries(fields.map((field) => [field, uniq(rows, field)])), [rows]);
  const load = async () => {
    setLoading(true);
    try {
      const res = await ep1.post("/api/v2/visitor-management/report", { colid: global1.colid, fromdate, todate, dynamicFilters: filters.filter((f) => f.value) });
      setRows(res.data?.data || []);
      setSummary(res.data?.summary || {});
      setInstitution(res.data?.institution || {});
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to load visitor report.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const columns = [
    { field: "gatepassno", headerName: "Gate Pass No", minWidth: 150 },
    { field: "visitdate", headerName: "Visit Date", minWidth: 130, valueFormatter: ({ value }) => fmtDate(value) },
    { field: "visitorname", headerName: "Visitor", minWidth: 170, flex: 1 },
    { field: "visitorphone", headerName: "Phone", minWidth: 130 },
    { field: "purpose", headerName: "Purpose", minWidth: 150 },
    { field: "department", headerName: "Department", minWidth: 150 },
    { field: "whomtomeet", headerName: "Whom To Meet", minWidth: 170 },
    { field: "approvalstatus", headerName: "Approval", minWidth: 120 },
    { field: "passstatus", headerName: "Pass Status", minWidth: 130 },
    { field: "intime", headerName: "In Time", minWidth: 180, valueFormatter: ({ value }) => fmtDateTime(value) },
    { field: "outtime", headerName: "Out Time", minWidth: 180, valueFormatter: ({ value }) => fmtDateTime(value) },
    { field: "vehicleno", headerName: "Vehicle No", minWidth: 130 }
  ];

  return (
    <MenuPageShell title="Visitor Reports">
      <Box sx={{ p: 2, bgcolor: "#f6f8fb", minHeight: "100vh" }}>
        <Stack spacing={2}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography variant="h5" fontWeight={900} sx={{ flex: 1 }}>Visitor Reports</Typography>
            <Button variant="outlined" startIcon={<Print />} disabled={!rows.length} onClick={() => printHtml({ title: "Visitor Management Report", institution, rows, summary })}>Print preview</Button>
          </Stack>
          {message && <Alert severity="warning" onClose={() => setMessage("")}>{message}</Alert>}
          <Paper sx={{ p: 2 }}>
            <Grid container spacing={1.5}>
              <Grid item xs={12} md={3}><TextField fullWidth type="date" label="From date" InputLabelProps={{ shrink: true }} value={fromdate} onChange={(e) => setFromdate(e.target.value)} /></Grid>
              <Grid item xs={12} md={3}><TextField fullWidth type="date" label="To date" InputLabelProps={{ shrink: true }} value={todate} onChange={(e) => setTodate(e.target.value)} /></Grid>
              <Grid item xs={12} md={2}><Button fullWidth sx={{ height: 56 }} variant="contained" disabled={loading} onClick={load}>Generate</Button></Grid>
            </Grid>
          </Paper>
          <DynamicFilters filters={filters} setFilters={setFilters} onApply={load} loading={loading} valueOptions={valueOptions} />
          <Grid container spacing={2}>
            <Grid item xs={12} md={2}><SummaryCard label="Total visitors" value={summary.total} color="#2563eb" /></Grid>
            <Grid item xs={12} md={2}><SummaryCard label="Approved" value={summary.approved} color="#16a34a" /></Grid>
            <Grid item xs={12} md={2}><SummaryCard label="Pending" value={summary.pending} color="#f97316" /></Grid>
            <Grid item xs={12} md={2}><SummaryCard label="Checked in" value={summary.checkedIn} color="#9333ea" /></Grid>
            <Grid item xs={12} md={2}><SummaryCard label="Checked out" value={summary.checkedOut} color="#0f766e" /></Grid>
            <Grid item xs={12} md={2}><SummaryCard label="Vehicle entries" value={(rows || []).filter((r) => r.vehicleno).length} color="#64748b" /></Grid>
          </Grid>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}><Paper sx={{ p: 2 }}><Typography fontWeight={900}>Purpose wise visitors</Typography><BarPanel data={summary.byPurpose || []} /></Paper></Grid>
            <Grid item xs={12} md={6}><Paper sx={{ p: 2 }}><Typography fontWeight={900}>Approval status</Typography><PiePanel data={summary.byApproval || []} /></Paper></Grid>
            <Grid item xs={12} md={6}><Paper sx={{ p: 2 }}><Typography fontWeight={900}>Department wise visitors</Typography><BarPanel data={summary.byDepartment || []} /></Paper></Grid>
            <Grid item xs={12} md={6}><Paper sx={{ p: 2 }}><Typography fontWeight={900}>Gate pass status</Typography><PiePanel data={summary.byPassStatus || []} /></Paper></Grid>
          </Grid>
          <Paper sx={{ p: 1 }}>
            <Stack direction="row" spacing={1} sx={{ p: 1 }}>
              {(summary.byVehicleType || []).map((row) => <Chip key={row.label} label={`${row.label}: ${row.count}`} />)}
            </Stack>
            <DataGrid rows={rowsOf(rows)} columns={columns} slots={{ toolbar: GridToolbar }} slotProps={{ toolbar: { showQuickFilter: true, csvOptions: { fileName: "visitor-report" } } }} pageSizeOptions={[10, 25, 50, 100]} getRowHeight={() => "auto"} sx={gridSx} autoHeight />
          </Paper>
        </Stack>
      </Box>
    </MenuPageShell>
  );
}

const approvalColumns = (onApprove, onReject) => [
  { field: "gatepassno", headerName: "Gate Pass No", minWidth: 150 },
  { field: "visitdate", headerName: "Visit Date", minWidth: 130, valueFormatter: ({ value }) => fmtDate(value) },
  { field: "visitorname", headerName: "Visitor", minWidth: 170, flex: 1 },
  { field: "visitorphone", headerName: "Phone", minWidth: 130 },
  { field: "organization", headerName: "Organization", minWidth: 160 },
  { field: "purpose", headerName: "Purpose", minWidth: 150 },
  { field: "department", headerName: "Department", minWidth: 150 },
  { field: "whomtomeet", headerName: "Whom To Meet", minWidth: 170 },
  { field: "approvalstatus", headerName: "Approval", minWidth: 120 },
  { field: "approvalremarks", headerName: "Approval Remarks", minWidth: 190 },
  { field: "actions", headerName: "Actions", minWidth: 190, sortable: false, renderCell: ({ row }) => (
    <Stack direction="row" spacing={0.8}>
      <Button size="small" color="success" onClick={() => onApprove(row)}>Approve</Button>
      <Button size="small" color="error" onClick={() => onReject(row)}>Reject</Button>
    </Stack>
  ) }
];

export function VisitorApprovalPage() {
  const options = useVisitorOptions();
  const { rows, loading, message, setMessage, loadRows } = useVisitorRows();
  const [filters, setFilters] = useState([{ field: "approvalstatus", operator: "equals", value: "Pending" }]);
  const [fromdate, setFromdate] = useState("");
  const [todate, setTodate] = useState("");
  useEffect(() => { loadRows({ approvalstatus: "Pending" }); }, []);
  const apply = () => {
    const params = { fromdate, todate };
    filters.filter((f) => f.value).forEach((f) => { params[f.field] = f.value; });
    loadRows(params);
  };
  const doAction = async (row, actionName) => {
    const remarks = window.prompt(actionName === "approve" ? "Approval remarks" : "Rejection reason", row.approvalremarks || "") || "";
    await ep1.post("/api/v2/visitor-management/action", { colid: global1.colid, id: row._id, action: actionName, remarks, name: global1.name, user: global1.user });
    setMessage(actionName === "approve" ? "Visitor approved." : "Visitor rejected.");
    apply();
  };
  return (
    <MenuPageShell title="Visitor Approval">
      <Box sx={{ p: 2, bgcolor: "#f6f8fb", minHeight: "100vh" }}>
        <Stack spacing={2}>
          <Typography variant="h5" fontWeight={900}>Visitor Approval</Typography>
          {message && <Alert severity={/unable/i.test(message) ? "warning" : "success"} onClose={() => setMessage("")}>{message}</Alert>}
          <DateRangeBar fromdate={fromdate} setFromdate={setFromdate} todate={todate} setTodate={setTodate} onApply={apply} loading={loading} />
          <DynamicFilters filters={filters} setFilters={setFilters} onApply={apply} loading={loading} valueOptions={visitorValueOptions(options, rows)} />
          <Paper sx={{ p: 1 }}>
            <DataGrid rows={rowsOf(rows)} columns={approvalColumns((row) => doAction(row, "approve"), (row) => doAction(row, "reject"))} slots={{ toolbar: GridToolbar }} slotProps={{ toolbar: { showQuickFilter: true, csvOptions: { fileName: "visitor-approval" } } }} pageSizeOptions={[10, 25, 50, 100]} getRowHeight={() => "auto"} sx={gridSx} autoHeight />
          </Paper>
        </Stack>
      </Box>
    </MenuPageShell>
  );
}

export function VisitorGatePassGenerationPage() {
  const options = useVisitorOptions();
  const { rows, loading, message, setMessage, loadRows } = useVisitorRows();
  const [tab, setTab] = useState(0);
  const [filters, setFilters] = useState([{ field: "whomtomeetemail", operator: "contains", value: "" }]);
  const [fromdate, setFromdate] = useState("");
  const [todate, setTodate] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const visibleRows = useMemo(() => rows.filter((row) => tab === 0 ? row.approvalstatus === "Approved" : row.approvalstatus !== "Approved"), [rows, tab]);
  useEffect(() => { loadRows(); }, []);
  const apply = () => {
    const params = { fromdate, todate };
    filters.filter((f) => f.value).forEach((f) => { params[f.field] = f.value; });
    loadRows(params);
  };
  const selectedRows = visibleRows.filter((row) => selectedIds.includes(row._id));
  const generatePasses = async () => {
    if (!selectedRows.length) return setMessage("Select approved visitors first.");
    for (const row of selectedRows) {
      await ep1.post("/api/v2/visitor-management/action", { colid: global1.colid, id: row._id, action: "generatepass", name: global1.name, user: global1.user });
    }
    setMessage("Gate pass generated for selected visitor(s).");
    await apply();
    printHtml({ title: "Visitor Gate Pass", institution: options.institution || {}, rows: selectedRows.map((row) => ({ ...row, gatepassgenerated: "Yes", passstatus: "Issued" })), summary: { total: selectedRows.length, approved: selectedRows.length } });
  };
  const columns = [
    { field: "gatepassno", headerName: "Gate Pass No", minWidth: 150 },
    { field: "visitdate", headerName: "Visit Date", minWidth: 130, valueFormatter: ({ value }) => fmtDate(value) },
    { field: "visitorname", headerName: "Visitor", minWidth: 170, flex: 1 },
    { field: "visitorphone", headerName: "Phone", minWidth: 130 },
    { field: "purpose", headerName: "Purpose", minWidth: 150 },
    { field: "whomtomeet", headerName: "Whom To Meet", minWidth: 170 },
    { field: "approvalstatus", headerName: "Approval", minWidth: 120 },
    { field: "gatepassgenerated", headerName: "Gatepass Generated", minWidth: 170 },
    { field: "passstatus", headerName: "Pass Status", minWidth: 130 },
    { field: "vehicleno", headerName: "Vehicle No", minWidth: 130 }
  ];
  return (
    <MenuPageShell title="Visitor Gate Pass Generation">
      <Box sx={{ p: 2, bgcolor: "#f6f8fb", minHeight: "100vh" }}>
        <Stack spacing={2}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="h5" fontWeight={900} sx={{ flex: 1 }}>Visitor Gate Pass Generation</Typography>
            <Button variant="contained" startIcon={<Print />} disabled={!selectedRows.length || tab !== 0} onClick={generatePasses}>Generate gate pass</Button>
          </Stack>
          {message && <Alert severity={/select|unable/i.test(message) ? "warning" : "success"} onClose={() => setMessage("")}>{message}</Alert>}
          <DateRangeBar fromdate={fromdate} setFromdate={setFromdate} todate={todate} setTodate={setTodate} onApply={apply} loading={loading}>
            <Grid item xs={12} md={4}>
              <Autocomplete
                freeSolo
                options={(options.users || []).map((user) => `${user.name || ""} - ${user.email || ""}`)}
                onInputChange={(_, value) => setFilters([{ field: "whomtomeetemail", operator: "contains", value: value.includes(" - ") ? value.split(" - ").pop() : value }])}
                renderInput={(params) => <TextField {...params} label="Filter whom to meet" />}
              />
            </Grid>
          </DateRangeBar>
          <DynamicFilters filters={filters} setFilters={setFilters} onApply={apply} loading={loading} valueOptions={visitorValueOptions(options, rows)} />
          <Paper sx={{ p: 1 }}>
            <Tabs value={tab} onChange={(_, value) => { setTab(value); setSelectedIds([]); }} sx={{ mb: 1 }}>
              <Tab label={`Approved (${rows.filter((row) => row.approvalstatus === "Approved").length})`} />
              <Tab label={`Unapproved (${rows.filter((row) => row.approvalstatus !== "Approved").length})`} />
            </Tabs>
            <DataGrid rows={rowsOf(visibleRows)} columns={columns} checkboxSelection onRowSelectionModelChange={(ids) => setSelectedIds(ids)} rowSelectionModel={selectedIds} slots={{ toolbar: GridToolbar }} slotProps={{ toolbar: { showQuickFilter: true, csvOptions: { fileName: "visitor-gatepass" } } }} pageSizeOptions={[10, 25, 50, 100]} getRowHeight={() => "auto"} sx={gridSx} autoHeight />
          </Paper>
        </Stack>
      </Box>
    </MenuPageShell>
  );
}

export function VisitorMyMeetingsPage() {
  const options = useVisitorOptions();
  const { rows, loading, message, setMessage, loadRows } = useVisitorRows({ whomtomeetemail: global1.user });
  const [tab, setTab] = useState(0);
  const [filters, setFilters] = useState([{ field: "visitorname", operator: "contains", value: "" }]);
  const [fromdate, setFromdate] = useState("");
  const [todate, setTodate] = useState("");
  useEffect(() => { loadRows(); }, []);
  const apply = () => {
    const params = { fromdate, todate, whomtomeetemail: global1.user };
    filters.filter((f) => f.value).forEach((f) => { params[f.field] = f.value; });
    loadRows(params);
  };
  const tabRows = useMemo(() => rows.filter((row) => {
    if (tab === 0) return (row.finalmeetingstatus || "Pending") === "Pending";
    if (tab === 1) return row.finalmeetingstatus === "Updated";
    return row.gatepassgenerated === "Yes";
  }), [rows, tab]);
  const updateMeeting = async (row) => {
    const meetingdetails = window.prompt("Meeting details", row.meetingdetails || "") || "";
    const meetingoutcome = window.prompt("Meeting outcome", row.meetingoutcome || "") || "";
    await ep1.post("/api/v2/visitor-management/action", { colid: global1.colid, id: row._id, action: "meetingupdate", meetingdetails, meetingoutcome, name: global1.name, user: global1.user });
    setMessage("Meeting details updated.");
    apply();
  };
  const columns = [
    { field: "gatepassno", headerName: "Gate Pass No", minWidth: 150 },
    { field: "visitdate", headerName: "Visit Date", minWidth: 130, valueFormatter: ({ value }) => fmtDate(value) },
    { field: "visitorname", headerName: "Visitor", minWidth: 170, flex: 1 },
    { field: "visitorphone", headerName: "Phone", minWidth: 130 },
    { field: "organization", headerName: "Organization", minWidth: 160 },
    { field: "purpose", headerName: "Purpose", minWidth: 150 },
    { field: "gatepassgenerated", headerName: "Gatepass Generated", minWidth: 170 },
    { field: "passstatus", headerName: "Pass Status", minWidth: 130 },
    { field: "finalmeetingstatus", headerName: "Final Meeting", minWidth: 140 },
    { field: "meetingdetails", headerName: "Meeting Details", minWidth: 240, flex: 1 },
    { field: "meetingoutcome", headerName: "Outcome", minWidth: 190 },
    { field: "actions", headerName: "Actions", minWidth: 160, sortable: false, renderCell: ({ row }) => <Button size="small" variant="outlined" onClick={() => updateMeeting(row)}>Update meeting</Button> }
  ];
  return (
    <MenuPageShell title="My Visitor Meetings">
      <Box sx={{ p: 2, bgcolor: "#f6f8fb", minHeight: "100vh" }}>
        <Stack spacing={2}>
          <Typography variant="h5" fontWeight={900}>Visitors Coming To Meet Me</Typography>
          {message && <Alert severity={/unable/i.test(message) ? "warning" : "success"} onClose={() => setMessage("")}>{message}</Alert>}
          <DateRangeBar fromdate={fromdate} setFromdate={setFromdate} todate={todate} setTodate={setTodate} onApply={apply} loading={loading} />
          <DynamicFilters filters={filters} setFilters={setFilters} onApply={apply} loading={loading} valueOptions={visitorValueOptions(options, rows)} />
          <Paper sx={{ p: 1 }}>
            <Tabs value={tab} onChange={(_, value) => setTab(value)} sx={{ mb: 1 }}>
              <Tab label={`Final meeting pending (${rows.filter((row) => (row.finalmeetingstatus || "Pending") === "Pending").length})`} />
              <Tab label={`Final meeting updated (${rows.filter((row) => row.finalmeetingstatus === "Updated").length})`} />
              <Tab label={`Gatepass generated (${rows.filter((row) => row.gatepassgenerated === "Yes").length})`} />
            </Tabs>
            <DataGrid rows={rowsOf(tabRows)} columns={columns} slots={{ toolbar: GridToolbar }} slotProps={{ toolbar: { showQuickFilter: true, csvOptions: { fileName: "my-visitor-meetings" } } }} pageSizeOptions={[10, 25, 50, 100]} getRowHeight={() => "auto"} sx={gridSx} autoHeight />
          </Paper>
        </Stack>
      </Box>
    </MenuPageShell>
  );
}

export function VisitorMeetingReportPage() {
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({});
  const [institution, setInstitution] = useState({});
  const [filters, setFilters] = useState([{ field: "whomtomeetemail", operator: "contains", value: "" }]);
  const [fromdate, setFromdate] = useState("");
  const [todate, setTodate] = useState("");
  const [loading, setLoading] = useState(false);
  const load = async () => {
    setLoading(true);
    try {
      const res = await ep1.post("/api/v2/visitor-management/report", { colid: global1.colid, fromdate, todate, dynamicFilters: filters.filter((f) => f.value) });
      setRows(res.data?.data || []);
      setSummary(res.data?.summary || {});
      setInstitution(res.data?.institution || {});
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);
  const valueOptions = useMemo(() => ({ ...Object.fromEntries(fields.map((field) => [field, uniq(rows, field)])), ...visitorValueOptions({}, rows) }), [rows]);
  const columns = [
    { field: "visitdate", headerName: "Visit Date", minWidth: 130, valueFormatter: ({ value }) => fmtDate(value) },
    { field: "visitorname", headerName: "Visitor", minWidth: 170, flex: 1 },
    { field: "whomtomeet", headerName: "Whom To Meet", minWidth: 170 },
    { field: "purpose", headerName: "Purpose", minWidth: 150 },
    { field: "department", headerName: "Department", minWidth: 150 },
    { field: "gatepassgenerated", headerName: "Gatepass Generated", minWidth: 170 },
    { field: "finalmeetingstatus", headerName: "Meeting Status", minWidth: 150 },
    { field: "meetingdetails", headerName: "Meeting Details", minWidth: 260, flex: 1 },
    { field: "meetingoutcome", headerName: "Outcome", minWidth: 220 }
  ];
  return (
    <MenuPageShell title="Visitor Meeting Report">
      <Box sx={{ p: 2, bgcolor: "#f6f8fb", minHeight: "100vh" }}>
        <Stack spacing={2}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography variant="h5" fontWeight={900} sx={{ flex: 1 }}>Visitor Meeting Report</Typography>
            <Button variant="outlined" startIcon={<Print />} disabled={!rows.length} onClick={() => printHtml({ title: "Visitor Meeting Report", institution, rows, summary })}>Print preview</Button>
          </Stack>
          <DateRangeBar fromdate={fromdate} setFromdate={setFromdate} todate={todate} setTodate={setTodate} onApply={load} loading={loading} />
          <DynamicFilters filters={filters} setFilters={setFilters} onApply={load} loading={loading} valueOptions={valueOptions} />
          <Grid container spacing={2}>
            <Grid item xs={12} md={2}><SummaryCard label="Total visits" value={summary.total} /></Grid>
            <Grid item xs={12} md={2}><SummaryCard label="Gatepass generated" value={summary.gatepassGenerated} color="#16a34a" /></Grid>
            <Grid item xs={12} md={2}><SummaryCard label="Meeting pending" value={summary.meetingPending} color="#f97316" /></Grid>
            <Grid item xs={12} md={2}><SummaryCard label="Meeting updated" value={summary.meetingUpdated} color="#0f766e" /></Grid>
            <Grid item xs={12} md={2}><SummaryCard label="Approved" value={summary.approved} color="#9333ea" /></Grid>
            <Grid item xs={12} md={2}><SummaryCard label="Checked out" value={summary.checkedOut} color="#64748b" /></Grid>
          </Grid>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}><Paper sx={{ p: 2 }}><Typography fontWeight={900}>Meeting status</Typography><PiePanel data={summary.byMeetingStatus || []} /></Paper></Grid>
            <Grid item xs={12} md={6}><Paper sx={{ p: 2 }}><Typography fontWeight={900}>Host wise visitors</Typography><BarPanel data={summary.byHost || []} /></Paper></Grid>
            <Grid item xs={12} md={6}><Paper sx={{ p: 2 }}><Typography fontWeight={900}>Purpose wise meetings</Typography><BarPanel data={summary.byPurpose || []} /></Paper></Grid>
            <Grid item xs={12} md={6}><Paper sx={{ p: 2 }}><Typography fontWeight={900}>Department wise meetings</Typography><BarPanel data={summary.byDepartment || []} /></Paper></Grid>
          </Grid>
          <Paper sx={{ p: 1 }}>
            <DataGrid rows={rowsOf(rows)} columns={columns} slots={{ toolbar: GridToolbar }} slotProps={{ toolbar: { showQuickFilter: true, csvOptions: { fileName: "visitor-meeting-report" } } }} pageSizeOptions={[10, 25, 50, 100]} getRowHeight={() => "auto"} sx={gridSx} autoHeight />
          </Paper>
        </Stack>
      </Box>
    </MenuPageShell>
  );
}
