import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import { DataGrid, GridToolbar } from "@mui/x-data-grid";
import { ArrowBack, CheckCircle, Refresh, Search } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import ep1 from "../api/ep1";
import global1 from "./global1";
import PlacementCoordinatorShell from "./PlacementCoordinatorShell";

const dateValue = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString();
};

const money = (value) => Number(value || 0).toLocaleString("en-IN", { style: "currency", currency: "INR" });
const canManualSuccess = (row = {}) => ["INITIATED", "FAILED"].includes(String(row.status || "").toUpperCase());

const IciciPaymentManualSuccessPage = () => {
  const navigate = useNavigate();
  const colid = useMemo(() => global1.colid, []);
  const [filters, setFilters] = useState({ type: "", status: "", student: "", regno: "", feeitem: "", refno: "" });
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState([]);
  const [remarks, setRemarks] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadRows = async () => {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const res = await ep1.get("/api/v2/icicipayment", { params: { colid, ...filters } });
      setRows(res.data.data || []);
      setSelected([]);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Unable to load ICICI payments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!colid) {
      setError("College id is not available.");
      return;
    }
    loadRows();
  }, [colid]);

  const markSuccess = async () => {
    const ids = selected.filter((id) => rows.some((row) => row._id === id && canManualSuccess(row)));
    if (!ids.length) return setError("Select at least one INITIATED or FAILED transaction.");
    if (!window.confirm(`Mark ${ids.length} ICICI transaction(s) as SUCCESS and update linked student ledger?`)) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const res = await ep1.post("/api/v2/icicipayment/manual-success", {
        colid,
        ids,
        remarks,
        user: global1.user || "",
        name: global1.name || ""
      });
      setMessage(`${res.data?.count || ids.length} transaction(s) marked SUCCESS. Linked student ledgers were settled where payment sessions were available.`);
      setSelected([]);
      await loadRows();
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Unable to mark selected payments as SUCCESS");
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { field: "student", headerName: "Student", minWidth: 180, flex: 1 },
    { field: "regno", headerName: "Reg no", minWidth: 140 },
    { field: "feeitem", headerName: "Fee item", minWidth: 220, flex: 1 },
    { field: "type", headerName: "Type", minWidth: 120 },
    { field: "amount", headerName: "Amount", minWidth: 130, valueFormatter: (params) => money(params.value) },
    { field: "paidamount", headerName: "Paid amount", minWidth: 140, valueFormatter: (params) => money(params.value) },
    { field: "status", headerName: "Status", minWidth: 140 },
    { field: "source", headerName: "Source", minWidth: 170 },
    { field: "studentonlinepaymentid", headerName: "Student online payment id", minWidth: 230 },
    { field: "refno", headerName: "Ref no", minWidth: 220 },
    { field: "merchantTxnNo", headerName: "Merchant txn no", minWidth: 190 },
    { field: "txnid", headerName: "Txn ID", minWidth: 170 },
    { field: "initiationdate", headerName: "Initiation date", minWidth: 190, valueGetter: (params) => dateValue(params.row.initiationdate) },
    { field: "paiddate", headerName: "Paid date", minWidth: 190, valueGetter: (params) => dateValue(params.row.paiddate) },
    { field: "description", headerName: "Description", minWidth: 240, flex: 1 },
    { field: "email", headerName: "Email", minWidth: 200 },
    { field: "phone", headerName: "Phone", minWidth: 130 }
  ];

  return (
    <PlacementCoordinatorShell title="ICICI payment manual success">
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "stretch", sm: "center" }} spacing={2} sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>ICICI payment manual success</Typography>
          <Typography variant="body2" color="text.secondary">Select only INITIATED or FAILED ICICI transactions and manually mark them as SUCCESS.</Typography>
        </Box>
        <Button variant="outlined" startIcon={<ArrowBack />} onClick={() => navigate("/icicipaymentview")}>Back to ICICI view</Button>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}
      {message && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMessage("")}>{message}</Alert>}
      <Alert severity="warning" sx={{ mb: 2 }}>
        This is a manual override. It updates the ICICI payment status to SUCCESS and settles the student ledger only when the transaction is linked to a StudentFeesOnline payment session.
      </Alert>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(6, 1fr)" }, gap: 2 }}>
          <FormControl size="small" fullWidth>
            <InputLabel>Type</InputLabel>
            <Select label="Type" value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })}>
              <MenuItem value="">All</MenuItem>
              <MenuItem value="Student">Student</MenuItem>
              <MenuItem value="Event">Event</MenuItem>
              <MenuItem value="Admission">Admission</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" fullWidth>
            <InputLabel>Status</InputLabel>
            <Select label="Status" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
              <MenuItem value="">All</MenuItem>
              <MenuItem value="INITIATED">INITIATED</MenuItem>
              <MenuItem value="FAILED">FAILED</MenuItem>
              <MenuItem value="SUCCESS">SUCCESS</MenuItem>
              <MenuItem value="PENDING">PENDING</MenuItem>
            </Select>
          </FormControl>
          <TextField size="small" label="Student" value={filters.student} onChange={(e) => setFilters({ ...filters, student: e.target.value })} />
          <TextField size="small" label="Reg no" value={filters.regno} onChange={(e) => setFilters({ ...filters, regno: e.target.value })} />
          <TextField size="small" label="Fee item" value={filters.feeitem} onChange={(e) => setFilters({ ...filters, feeitem: e.target.value })} />
          <TextField size="small" label="Ref no" value={filters.refno} onChange={(e) => setFilters({ ...filters, refno: e.target.value })} />
        </Box>
        <Stack direction={{ xs: "column", md: "row" }} spacing={1} sx={{ mt: 2 }}>
          <Button variant="contained" startIcon={<Search />} onClick={loadRows} disabled={loading}>Search</Button>
          <Button variant="outlined" startIcon={<Refresh />} onClick={() => setFilters({ type: "", status: "", student: "", regno: "", feeitem: "", refno: "" })}>Clear</Button>
          <TextField size="small" label="Manual success remarks" value={remarks} onChange={(e) => setRemarks(e.target.value)} sx={{ minWidth: { md: 360 }, flex: 1 }} />
          <Button variant="contained" color="success" startIcon={<CheckCircle />} disabled={saving || !selected.length} onClick={markSuccess}>
            {saving ? "Updating..." : "Mark Selected SUCCESS"}
          </Button>
        </Stack>
      </Paper>

      <Paper sx={{ p: 2, overflowX: "auto" }}>
        <DataGrid
          rows={rows.map((row) => ({ ...row, id: row._id }))}
          columns={columns}
          checkboxSelection
          disableRowSelectionOnClick
          isRowSelectable={(params) => canManualSuccess(params.row)}
          rowSelectionModel={selected}
          onRowSelectionModelChange={setSelected}
          autoHeight
          loading={loading}
          density="compact"
          slots={{ toolbar: GridToolbar }}
          slotProps={{ toolbar: { showQuickFilter: true, csvOptions: { fileName: "icici_manual_success" } } }}
          sx={{ minWidth: 2300 }}
        />
      </Paper>
    </PlacementCoordinatorShell>
  );
};

export default IciciPaymentManualSuccessPage;
