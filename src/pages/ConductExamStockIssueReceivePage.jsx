import React, { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormLabel,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Tooltip,
  Typography
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import InventoryIcon from "@mui/icons-material/Inventory";
import SettingsIcon from "@mui/icons-material/Settings";
import PrintIcon from "@mui/icons-material/Print";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import { useNavigate } from "react-router-dom";
import ep1 from "../api/ep1";
import global1 from "./global1";
import MenuPageShell from "./MenuPageShell";

const formatNumber = (val) => Number(val || 0).toLocaleString("en-IN");

export default function ConductExamStockIssueReceivePage() {
  const navigate = useNavigate();
  const colid = global1.colid || 1;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [transactions, setTransactions] = useState([]);
  const [totals, setTotals] = useState({
    grandTotal: 0,
    totalIssued: 0,
    totalReceived: 0,
    count: 0
  });

  const [options, setOptions] = useState({
    institutes: [],
    hosList: [],
    stockItems: [],
    academicyears: ["2026-27", "2025-26"]
  });

  const [filters, setFilters] = useState({
    academicyear: "2026-27",
    type: "",
    itemname: "",
    institute: "",
    hos: "",
    date: ""
  });

  // Transaction Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    itemname: "",
    type: "ISSUE",
    date: new Date().toISOString().slice(0, 10),
    towhom: "",
    institute: "",
    hos: "",
    srno_from: "",
    srno_to: "",
    totalitems: "",
    remarks: "",
    academicyear: "2026-27"
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadOptions();
    loadTransactions();
  }, []);

  const loadOptions = async () => {
    try {
      const res = await ep1.get("/api/v2/conductexam/stock/options", { params: { colid } });
      if (res.data?.success) {
        setOptions(res.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadTransactions = async (activeFilters = filters) => {
    try {
      setLoading(true);
      setError("");
      const params = { colid };
      if (activeFilters.academicyear) params.academicyear = activeFilters.academicyear;
      if (activeFilters.type) params.type = activeFilters.type;
      if (activeFilters.itemname) params.itemname = activeFilters.itemname;
      if (activeFilters.institute) params.institute = activeFilters.institute;
      if (activeFilters.hos) params.hos = activeFilters.hos;
      if (activeFilters.date) params.date = activeFilters.date;

      const res = await ep1.get("/api/v2/conductexam/stock/transactions", { params });
      if (res.data?.success) {
        setTransactions(res.data.data || []);
        setTotals(res.data.totals || {});
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load transactions.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    const defaultItem = options.stockItems[0]?.itemname || "";
    setForm({
      itemname: defaultItem,
      type: "ISSUE",
      date: new Date().toISOString().slice(0, 10),
      towhom: "",
      institute: options.institutes[0]?.institutecode || "PCMSRC",
      hos: options.hosList[0]?.hoscode || "CS",
      srno_from: "",
      srno_to: "",
      totalitems: "",
      remarks: "",
      academicyear: filters.academicyear || "2026-27"
    });
    setModalOpen(true);
  };

  const handleSerialChange = (fromVal, toVal) => {
    const fromNum = parseInt(fromVal, 10);
    const toNum = parseInt(toVal, 10);
    if (!isNaN(fromNum) && !isNaN(toNum) && toNum >= fromNum) {
      const count = toNum - fromNum + 1;
      setForm((prev) => ({ ...prev, srno_from: fromVal, srno_to: toVal, totalitems: count }));
    } else {
      setForm((prev) => ({ ...prev, srno_from: fromVal, srno_to: toVal }));
    }
  };

  const selectedItemMeta = options.stockItems.find((i) => i.itemname === form.itemname);
  const currentItemBalance = selectedItemMeta?.currentbalance ?? 0;

  const handleSaveTransaction = async () => {
    if (!form.itemname) {
      setError("Please select an item.");
      return;
    }
    const count = Number(form.totalitems);
    if (isNaN(count) || count <= 0) {
      setError("Total No. of Items must be greater than 0.");
      return;
    }

    // Front-end stock availability check for ISSUE
    if (form.type === "ISSUE" && currentItemBalance < count) {
      setError(
        `Insufficient stock! Cannot issue ${count} units. Available stock for "${form.itemname}" is only ${currentItemBalance} units.`
      );
      return;
    }

    try {
      setSaving(true);
      setError("");
      const payload = {
        ...form,
        totalitems: count,
        colid,
        user: global1.user || "admin"
      };

      const res = await ep1.post("/api/v2/conductexam/stock/transactions", payload);
      if (res.data?.success) {
        setMessage(res.data.message || "Transaction recorded successfully!");
        setModalOpen(false);
        loadTransactions();
        loadOptions();
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to record transaction.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTransaction = async (id) => {
    if (!window.confirm("Are you sure you want to delete this transaction? Stock balances will be rolled back automatically.")) return;
    try {
      const res = await ep1.post("/api/v2/conductexam/stock/transactions/delete", { id, colid });
      if (res.data?.success) {
        setMessage("Transaction deleted and stock balance rolled back successfully.");
        loadTransactions();
        loadOptions();
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete transaction.");
    }
  };

  const handlePrintReport = () => {
    const q = new URLSearchParams();
    if (filters.academicyear) q.set("academicyear", filters.academicyear);
    if (filters.type) q.set("type", filters.type);
    if (filters.itemname) q.set("itemname", filters.itemname);
    if (filters.institute) q.set("institute", filters.institute);
    if (filters.hos) q.set("hos", filters.hos);
    if (filters.date) q.set("date", filters.date);
    navigate(`/conduct-exam-stock-report-print?${q.toString()}`);
  };

  return (
    <MenuPageShell title="Issue / Receive Stock">
      <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: "#f8fafc", minHeight: "100vh" }}>
        {/* Top Header Card */}
        <Paper elevation={0} sx={{ p: 2.5, mb: 2.5, borderRadius: 2, border: "1px solid #e2e8f0" }}>
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", md: "center" }} spacing={2}>
            <Box>
              <Typography variant="h5" fontWeight={800} color="#1e293b" sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <SwapHorizIcon color="primary" /> Issue &amp; Receive Answer Books / Examination Stock
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Issuing answer books deducts from available stock; receiving returns adds back to stock. Print official dispatch reports.
              </Typography>
            </Box>
            <Stack direction="row" spacing={1.5} flexWrap="wrap">
              <Button
                variant="outlined"
                startIcon={<InventoryIcon />}
                onClick={() => navigate("/conduct-exam-stock-entry")}
                sx={{ fontWeight: 700, textTransform: "none" }}
              >
                Stock Entry
              </Button>
              <Button
                variant="outlined"
                startIcon={<SettingsIcon />}
                onClick={() => navigate("/conduct-exam-stock-configuration")}
                sx={{ fontWeight: 700, textTransform: "none" }}
              >
                Stock Configuration
              </Button>
              <Button
                variant="contained"
                startIcon={<PrintIcon />}
                onClick={handlePrintReport}
                sx={{ fontWeight: 700, textTransform: "none", bgcolor: "#1e293b", "&:hover": { bgcolor: "#0f172a" } }}
              >
                Print Stock Report
              </Button>
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                onClick={handleOpenAdd}
                sx={{ fontWeight: 700, textTransform: "none" }}
              >
                Issue / Receive Item
              </Button>
            </Stack>
          </Stack>
        </Paper>

        {/* Summary Stat Cards */}
        <Grid container spacing={2} sx={{ mb: 2.5 }}>
          <Grid item xs={12} sm={4}>
            <Card elevation={0} sx={{ bgcolor: "#fff1f2", border: "1px solid #fecdd3", borderRadius: 2 }}>
              <CardContent sx={{ py: 2 }}>
                <Typography variant="caption" fontWeight={700} color="text.secondary">
                  TOTAL ISSUED (DISPATCHED)
                </Typography>
                <Typography variant="h4" fontWeight={900} color="#be123c">
                  {formatNumber(totals.totalIssued)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Deducted from stock
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={4}>
            <Card elevation={0} sx={{ bgcolor: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 2 }}>
              <CardContent sx={{ py: 2 }}>
                <Typography variant="caption" fontWeight={700} color="text.secondary">
                  TOTAL RECEIVED (RETURNS)
                </Typography>
                <Typography variant="h4" fontWeight={900} color="#15803d">
                  {formatNumber(totals.totalReceived)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Credited back to stock
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={4}>
            <Card elevation={0} sx={{ bgcolor: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 2 }}>
              <CardContent sx={{ py: 2 }}>
                <Typography variant="caption" fontWeight={700} color="text.secondary">
                  TOTAL TRANSACTION QUANTITY
                </Typography>
                <Typography variant="h4" fontWeight={900} color="#1e40af">
                  {formatNumber(totals.grandTotal)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Across {totals.count} log entries
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Alerts */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
            {error}
          </Alert>
        )}
        {message && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMessage("")}>
            {message}
          </Alert>
        )}

        {/* Filters */}
        <Paper elevation={0} sx={{ p: 2, mb: 2.5, borderRadius: 2, border: "1px solid #e2e8f0" }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={2.4}>
              <TextField
                select
                fullWidth
                size="small"
                label="Transaction Type"
                value={filters.type}
                onChange={(e) => {
                  const next = { ...filters, type: e.target.value };
                  setFilters(next);
                  loadTransactions(next);
                }}
              >
                <MenuItem value="">All (Issue &amp; Receive)</MenuItem>
                <MenuItem value="ISSUE">ISSUE Only</MenuItem>
                <MenuItem value="RECEIVE">RECEIVE Only</MenuItem>
              </TextField>
            </Grid>

            <Grid item xs={12} sm={2.4}>
              <TextField
                select
                fullWidth
                size="small"
                label="Stock Item"
                value={filters.itemname}
                onChange={(e) => {
                  const next = { ...filters, itemname: e.target.value };
                  setFilters(next);
                  loadTransactions(next);
                }}
              >
                <MenuItem value="">All Items</MenuItem>
                {options.stockItems.map((it) => (
                  <MenuItem key={it.itemname} value={it.itemname}>
                    {it.itemname} ({it.currentbalance} avail.)
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} sm={2.4}>
              <TextField
                select
                fullWidth
                size="small"
                label="Institute"
                value={filters.institute}
                onChange={(e) => {
                  const next = { ...filters, institute: e.target.value };
                  setFilters(next);
                  loadTransactions(next);
                }}
              >
                <MenuItem value="">All Institutes</MenuItem>
                {options.institutes.map((inst) => (
                  <MenuItem key={inst.institutecode} value={inst.institutecode}>
                    {inst.institutecode}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} sm={2.4}>
              <TextField
                select
                fullWidth
                size="small"
                label="HOS"
                value={filters.hos}
                onChange={(e) => {
                  const next = { ...filters, hos: e.target.value };
                  setFilters(next);
                  loadTransactions(next);
                }}
              >
                <MenuItem value="">All HOS</MenuItem>
                {options.hosList.map((h) => (
                  <MenuItem key={h.hoscode} value={h.hoscode}>
                    {h.hoscode}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} sm={2.4}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="Transaction Date"
                InputLabelProps={{ shrink: true }}
                value={filters.date}
                onChange={(e) => {
                  const next = { ...filters, date: e.target.value };
                  setFilters(next);
                  loadTransactions(next);
                }}
              />
            </Grid>
          </Grid>
        </Paper>

        {/* Transactions Table */}
        <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: "1px solid #e2e8f0" }}>
          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
              <CircularProgress />
            </Box>
          ) : transactions.length === 0 ? (
            <Box sx={{ p: 6, textAlign: "center", color: "#64748b" }}>
              <Typography variant="h6" fontWeight={700}>
                No Transactions Found
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                Click "Issue / Receive Item" to dispatch answer books to exam centers or record unused stock returned back.
              </Typography>
            </Box>
          ) : (
            <Box sx={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                <thead>
                  <tr style={{ backgroundColor: "#f8fafc", borderBottom: "2px solid #cbd5e1" }}>
                    <th style={{ padding: "10px", textAlign: "left", width: "40px" }}>S.No</th>
                    <th style={{ padding: "10px", textAlign: "left" }}>Item Name</th>
                    <th style={{ padding: "10px", textAlign: "left", width: "110px" }}>Institute</th>
                    <th style={{ padding: "10px", textAlign: "left", width: "90px" }}>HOS</th>
                    <th style={{ padding: "10px", textAlign: "center", width: "100px" }}>TYPE</th>
                    <th style={{ padding: "10px", textAlign: "left", width: "110px" }}>Date</th>
                    <th style={{ padding: "10px", textAlign: "left" }}>To Whom</th>
                    <th style={{ padding: "10px", textAlign: "left", width: "100px" }}>From Sr.</th>
                    <th style={{ padding: "10px", textAlign: "left", width: "100px" }}>To Sr.</th>
                    <th style={{ padding: "10px", textAlign: "right", width: "90px" }}>Total</th>
                    <th style={{ padding: "10px", textAlign: "center", width: "70px" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx, idx) => (
                    <tr key={tx._id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                      <td style={{ padding: "10px", fontWeight: 600 }}>{idx + 1}</td>
                      <td style={{ padding: "10px", fontWeight: 700, color: "#1e293b" }}>{tx.itemname}</td>
                      <td style={{ padding: "10px" }}>
                        <Chip label={tx.institute} size="small" variant="outlined" sx={{ fontWeight: 600 }} />
                      </td>
                      <td style={{ padding: "10px" }}>
                        <Chip label={tx.hos} size="small" color="primary" sx={{ fontWeight: 700 }} />
                      </td>
                      <td style={{ padding: "10px", textAlign: "center" }}>
                        <Chip
                          icon={tx.type === "ISSUE" ? <ArrowDownwardIcon fontSize="small" /> : <ArrowUpwardIcon fontSize="small" />}
                          label={tx.type}
                          color={tx.type === "ISSUE" ? "error" : "success"}
                          size="small"
                          sx={{ fontWeight: 800 }}
                        />
                      </td>
                      <td style={{ padding: "10px", color: "#64748b" }}>{tx.date}</td>
                      <td style={{ padding: "10px" }}>
                        <Typography variant="body2" fontWeight={600}>{tx.towhom || "-"}</Typography>
                        {tx.remarks && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>{tx.remarks}</Typography>
                        )}
                      </td>
                      <td style={{ padding: "10px", fontFamily: "monospace", fontWeight: 700 }}>{tx.srno_from || "-"}</td>
                      <td style={{ padding: "10px", fontFamily: "monospace", fontWeight: 700 }}>{tx.srno_to || "-"}</td>
                      <td style={{ padding: "10px", textAlign: "right", fontWeight: 800 }}>{formatNumber(tx.totalitems)}</td>
                      <td style={{ padding: "10px", textAlign: "center" }}>
                        <Tooltip title="Delete transaction and rollback stock">
                          <IconButton size="small" color="error" onClick={() => handleDeleteTransaction(tx._id)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </td>
                    </tr>
                  ))}
                  {/* Grand Total Row */}
                  <tr style={{ backgroundColor: "#f1f5f9", fontWeight: 900 }}>
                    <td colSpan={9} style={{ padding: "12px 10px", textAlign: "right", fontSize: "14px" }}>
                      Grand Total
                    </td>
                    <td style={{ padding: "12px 10px", textAlign: "right", fontSize: "15px", color: "#1e40af" }}>
                      {formatNumber(totals.grandTotal)}
                    </td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </Box>
          )}
        </Paper>

        {/* Modal: Issue / Receive Item */}
        <Dialog open={modalOpen} onClose={() => setModalOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle sx={{ fontWeight: 800 }}>
            Record Stock Issue / Receive
          </DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              {/* Type: ISSUE vs RECEIVE */}
              <Grid item xs={12}>
                <FormControl component="fieldset">
                  <FormLabel component="legend" sx={{ fontWeight: 700, fontSize: "0.85rem", mb: 0.5 }}>
                    Transaction Action *
                  </FormLabel>
                  <RadioGroup
                    row
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                  >
                    <FormControlLabel
                      value="ISSUE"
                      control={<Radio color="error" />}
                      label={
                        <Typography variant="body2" fontWeight={700} color="#be123c">
                          ISSUE (Deduct from Stock)
                        </Typography>
                      }
                    />
                    <FormControlLabel
                      value="RECEIVE"
                      control={<Radio color="success" />}
                      label={
                        <Typography variant="body2" fontWeight={700} color="#15803d">
                          RECEIVE (Add back into Stock)
                        </Typography>
                      }
                    />
                  </RadioGroup>
                </FormControl>
              </Grid>

              {/* Select Item */}
              <Grid item xs={12} sm={8}>
                <TextField
                  select
                  fullWidth
                  required
                  label="Select Stock Item *"
                  value={form.itemname}
                  onChange={(e) => setForm({ ...form, itemname: e.target.value })}
                  helperText={`Current available balance in stock: ${currentItemBalance} units`}
                >
                  {options.stockItems.map((item) => (
                    <MenuItem key={item.itemname} value={item.itemname}>
                      {item.itemname} &nbsp;—&nbsp; (Available: {item.currentbalance} units)
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              {/* Transaction Date */}
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  type="date"
                  required
                  label="Date *"
                  InputLabelProps={{ shrink: true }}
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
              </Grid>

              {/* Institute */}
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  fullWidth
                  required
                  label="Institute *"
                  value={form.institute}
                  onChange={(e) => setForm({ ...form, institute: e.target.value })}
                >
                  <MenuItem value="">-- Select Institute --</MenuItem>
                  {options.institutes.map((inst) => (
                    <MenuItem key={inst.institutecode} value={inst.institutecode}>
                      {inst.institutecode} - {inst.institutename}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              {/* HOS */}
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  fullWidth
                  required
                  label="HOS (Section / Station) *"
                  value={form.hos}
                  onChange={(e) => setForm({ ...form, hos: e.target.value })}
                >
                  <MenuItem value="">-- Select HOS --</MenuItem>
                  {options.hosList.map((h) => (
                    <MenuItem key={h.hoscode} value={h.hoscode}>
                      {h.hoscode} - {h.hosname}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              {/* To Whom */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label={form.type === "ISSUE" ? "To Whom (Issued To)" : "From Whom (Received From)"}
                  placeholder="e.g. Centre Superintendent, Exam Hall 1, Dr. R. Sharma"
                  value={form.towhom}
                  onChange={(e) => setForm({ ...form, towhom: e.target.value })}
                />
              </Grid>

              {/* Serial No. From */}
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Serial No. From"
                  placeholder="e.g. 57001"
                  value={form.srno_from}
                  onChange={(e) => handleSerialChange(e.target.value, form.srno_to)}
                />
              </Grid>

              {/* Serial No. To */}
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Serial No. To"
                  placeholder="e.g. 57700"
                  value={form.srno_to}
                  onChange={(e) => handleSerialChange(form.srno_from, e.target.value)}
                />
              </Grid>

              {/* Total No of Items */}
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  required
                  type="number"
                  label="Total No. of Items *"
                  placeholder="e.g. 700"
                  value={form.totalitems}
                  onChange={(e) => setForm({ ...form, totalitems: e.target.value })}
                  helperText={
                    form.type === "ISSUE"
                      ? `Max allowed to issue: ${currentItemBalance} units`
                      : "Quantity to add back into stock"
                  }
                />
              </Grid>

              {/* Remarks */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Remarks (Optional)"
                  placeholder="e.g. For BDS Prof-1 Regular Examination"
                  value={form.remarks}
                  onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setModalOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button
              variant="contained"
              color={form.type === "ISSUE" ? "error" : "success"}
              onClick={handleSaveTransaction}
              disabled={saving}
              sx={{ fontWeight: 700 }}
            >
              {saving ? "Processing..." : form.type === "ISSUE" ? "Confirm Issue (Deduct Stock)" : "Confirm Receive (Add Stock)"}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </MenuPageShell>
  );
}
