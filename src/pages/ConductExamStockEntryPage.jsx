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
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import InventoryIcon from "@mui/icons-material/Inventory";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import SettingsIcon from "@mui/icons-material/Settings";
import PrintIcon from "@mui/icons-material/Print";
import { useNavigate } from "react-router-dom";
import ep1 from "../api/ep1";
import global1 from "./global1";
import MenuPageShell from "./MenuPageShell";

const formatNumber = (val) => Number(val || 0).toLocaleString("en-IN");

export default function ConductExamStockEntryPage() {
  const navigate = useNavigate();
  const colid = global1.colid || 1;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [entries, setEntries] = useState([]);
  const [totals, setTotals] = useState({
    totalStock: 0,
    totalIssued: 0,
    totalReceived: 0,
    totalBalance: 0,
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
    itemname: "",
    institute: "",
    hos: ""
  });

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    _id: "",
    academicyear: "2026-27",
    itemname: "",
    srno_from: "",
    srno_to: "",
    totalitems: "",
    institute: "",
    hos: "",
    entrydate: new Date().toISOString().slice(0, 10),
    remarks: ""
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadOptions();
    loadStockEntries();
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

  const loadStockEntries = async (activeFilters = filters) => {
    try {
      setLoading(true);
      setError("");
      const params = { colid };
      if (activeFilters.academicyear) params.academicyear = activeFilters.academicyear;
      if (activeFilters.itemname) params.itemname = activeFilters.itemname;
      if (activeFilters.institute) params.institute = activeFilters.institute;
      if (activeFilters.hos) params.hos = activeFilters.hos;

      const res = await ep1.get("/api/v2/conductexam/stock/entries", { params });
      if (res.data?.success) {
        setEntries(res.data.data || []);
        setTotals(res.data.totals || {});
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load stock entries.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setForm({
      _id: "",
      academicyear: filters.academicyear || "2026-27",
      itemname: "",
      srno_from: "",
      srno_to: "",
      totalitems: "",
      institute: options.institutes[0]?.institutecode || "",
      hos: options.hosList[0]?.hoscode || "",
      entrydate: new Date().toISOString().slice(0, 10),
      remarks: ""
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (row) => {
    setForm({
      _id: row._id,
      academicyear: row.academicyear || "2026-27",
      itemname: row.itemname || "",
      srno_from: row.srno_from || "",
      srno_to: row.srno_to || "",
      totalitems: row.totalitems || "",
      institute: row.institute || "",
      hos: row.hos || "",
      entrydate: row.entrydate || new Date().toISOString().slice(0, 10),
      remarks: row.remarks || ""
    });
    setModalOpen(true);
  };

  // Auto-calculate total items when serial from and to change
  const handleSerialChange = (fromVal, toVal) => {
    const fromNum = parseInt(fromVal, 10);
    const toNum = parseInt(toVal, 10);
    if (!isNaN(fromNum) && !isNaN(toNum) && toNum >= fromNum) {
      const calcCount = toNum - fromNum + 1;
      setForm((prev) => ({ ...prev, srno_from: fromVal, srno_to: toVal, totalitems: calcCount }));
    } else {
      setForm((prev) => ({ ...prev, srno_from: fromVal, srno_to: toVal }));
    }
  };

  const handleSave = async () => {
    if (!form.itemname.trim()) {
      setError("Item Name is required.");
      return;
    }
    const count = Number(form.totalitems);
    if (isNaN(count) || count <= 0) {
      setError("Total No. of Items must be greater than 0.");
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

      const res = await ep1.post("/api/v2/conductexam/stock/entries", payload);
      if (res.data?.success) {
        setMessage(form._id ? "Stock entry updated successfully!" : "Stock entry added successfully!");
        setModalOpen(false);
        loadStockEntries();
        loadOptions();
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save stock entry.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this stock entry?")) return;
    try {
      const res = await ep1.post("/api/v2/conductexam/stock/entries/delete", { id, colid });
      if (res.data?.success) {
        setMessage("Stock entry deleted successfully.");
        loadStockEntries();
        loadOptions();
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete stock entry.");
    }
  };

  return (
    <MenuPageShell title="Stock Entry Management">
      <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: "#f8fafc", minHeight: "100vh" }}>
        {/* Top Header Card */}
        <Paper elevation={0} sx={{ p: 2.5, mb: 2.5, borderRadius: 2, border: "1px solid #e2e8f0" }}>
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", md: "center" }} spacing={2}>
            <Box>
              <Typography variant="h5" fontWeight={800} color="#1e293b" sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <InventoryIcon color="primary" /> Examination Stock Entry Management
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Record answer books, supplementary sheets, and exam stationary batches with serial number ranges and monitor live stock balances.
              </Typography>
            </Box>
            <Stack direction="row" spacing={1.5} flexWrap="wrap">
              <Button
                variant="outlined"
                startIcon={<SettingsIcon />}
                onClick={() => navigate("/conduct-exam-stock-configuration")}
                sx={{ fontWeight: 700, textTransform: "none" }}
              >
                Stock Configuration
              </Button>
              <Button
                variant="outlined"
                color="secondary"
                startIcon={<SwapHorizIcon />}
                onClick={() => navigate("/conduct-exam-stock-issue-receive")}
                sx={{ fontWeight: 700, textTransform: "none" }}
              >
                Issue / Receive Stock
              </Button>
              <Button
                variant="outlined"
                startIcon={<PrintIcon />}
                onClick={() => navigate("/conduct-exam-stock-report-print")}
                sx={{ fontWeight: 700, textTransform: "none" }}
              >
                Print Report
              </Button>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleOpenAdd}
                sx={{ fontWeight: 700, textTransform: "none" }}
              >
                New Stock Entry
              </Button>
            </Stack>
          </Stack>
        </Paper>

        {/* Summary Stat Cards */}
        <Grid container spacing={2} sx={{ mb: 2.5 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card elevation={0} sx={{ bgcolor: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 2 }}>
              <CardContent sx={{ py: 2 }}>
                <Typography variant="caption" fontWeight={700} color="text.secondary">
                  TOTAL STOCK ENTERED
                </Typography>
                <Typography variant="h4" fontWeight={900} color="#1e40af">
                  {formatNumber(totals.totalStock)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Across {totals.count} batch entries
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card elevation={0} sx={{ bgcolor: "#fff1f2", border: "1px solid #fecdd3", borderRadius: 2 }}>
              <CardContent sx={{ py: 2 }}>
                <Typography variant="caption" fontWeight={700} color="text.secondary">
                  TOTAL ITEMS ISSUED
                </Typography>
                <Typography variant="h4" fontWeight={900} color="#be123c">
                  {formatNumber(totals.totalIssued)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Dispatched to exam centers
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card elevation={0} sx={{ bgcolor: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 2 }}>
              <CardContent sx={{ py: 2 }}>
                <Typography variant="caption" fontWeight={700} color="text.secondary">
                  TOTAL RECEIVED BACK
                </Typography>
                <Typography variant="h4" fontWeight={900} color="#15803d">
                  {formatNumber(totals.totalReceived)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Unused / returned answer sheets
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card elevation={0} sx={{ bgcolor: "#faf5ff", border: "1px solid #e9d5ff", borderRadius: 2 }}>
              <CardContent sx={{ py: 2 }}>
                <Typography variant="caption" fontWeight={700} color="text.secondary">
                  AVAILABLE STOCK BALANCE
                </Typography>
                <Typography variant="h4" fontWeight={900} color="#7e22ce">
                  {formatNumber(totals.totalBalance)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Live current in-hand balance
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
            <Grid item xs={12} sm={3}>
              <TextField
                select
                fullWidth
                size="small"
                label="Academic Year"
                value={filters.academicyear}
                onChange={(e) => {
                  const next = { ...filters, academicyear: e.target.value };
                  setFilters(next);
                  loadStockEntries(next);
                }}
              >
                <MenuItem value="">All Academic Years</MenuItem>
                {options.academicyears.map((yr) => (
                  <MenuItem key={yr} value={yr}>{yr}</MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                size="small"
                label="Filter by Item Name"
                placeholder="e.g. 20-A PAGES AB"
                value={filters.itemname}
                onChange={(e) => {
                  const next = { ...filters, itemname: e.target.value };
                  setFilters(next);
                  loadStockEntries(next);
                }}
              />
            </Grid>

            <Grid item xs={12} sm={3}>
              <TextField
                select
                fullWidth
                size="small"
                label="Institute"
                value={filters.institute}
                onChange={(e) => {
                  const next = { ...filters, institute: e.target.value };
                  setFilters(next);
                  loadStockEntries(next);
                }}
              >
                <MenuItem value="">All Institutes</MenuItem>
                {options.institutes.map((inst) => (
                  <MenuItem key={inst.institutecode} value={inst.institutecode}>
                    {inst.institutecode} - {inst.institutename}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} sm={3}>
              <TextField
                select
                fullWidth
                size="small"
                label="HOS (Section / Station)"
                value={filters.hos}
                onChange={(e) => {
                  const next = { ...filters, hos: e.target.value };
                  setFilters(next);
                  loadStockEntries(next);
                }}
              >
                <MenuItem value="">All HOS</MenuItem>
                {options.hosList.map((h) => (
                  <MenuItem key={h.hoscode} value={h.hoscode}>
                    {h.hoscode} - {h.hosname}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
          </Grid>
        </Paper>

        {/* Stock Entries Table */}
        <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: "1px solid #e2e8f0" }}>
          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
              <CircularProgress />
            </Box>
          ) : entries.length === 0 ? (
            <Box sx={{ p: 6, textAlign: "center", color: "#64748b" }}>
              <Typography variant="h6" fontWeight={700}>
                No Stock Entries Found
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                Click "New Stock Entry" above to add answer books or exam stationery into the inventory.
              </Typography>
            </Box>
          ) : (
            <Box sx={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                <thead>
                  <tr style={{ backgroundColor: "#f8fafc", borderBottom: "2px solid #cbd5e1" }}>
                    <th style={{ padding: "10px", textAlign: "left", width: "50px" }}>S.No</th>
                    <th style={{ padding: "10px", textAlign: "left" }}>Item Name</th>
                    <th style={{ padding: "10px", textAlign: "left", width: "120px" }}>Institute</th>
                    <th style={{ padding: "10px", textAlign: "left", width: "100px" }}>HOS</th>
                    <th style={{ padding: "10px", textAlign: "left", width: "110px" }}>Entry Date</th>
                    <th style={{ padding: "10px", textAlign: "left", width: "110px" }}>From Sr.</th>
                    <th style={{ padding: "10px", textAlign: "left", width: "110px" }}>To Sr.</th>
                    <th style={{ padding: "10px", textAlign: "right", width: "100px" }}>Total Stock</th>
                    <th style={{ padding: "10px", textAlign: "right", width: "90px" }}>Issued</th>
                    <th style={{ padding: "10px", textAlign: "right", width: "90px" }}>Received</th>
                    <th style={{ padding: "10px", textAlign: "right", width: "120px" }}>Balance In Hand</th>
                    <th style={{ padding: "10px", textAlign: "center", width: "100px" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry, index) => (
                    <tr key={entry._id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                      <td style={{ padding: "10px", fontWeight: 600 }}>{index + 1}</td>
                      <td style={{ padding: "10px" }}>
                        <Typography variant="body2" fontWeight={800} color="#1e293b">
                          {entry.itemname}
                        </Typography>
                        {entry.remarks && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                            {entry.remarks}
                          </Typography>
                        )}
                      </td>
                      <td style={{ padding: "10px" }}>
                        <Chip label={entry.institute || "MAIN"} size="small" variant="outlined" sx={{ fontWeight: 600 }} />
                      </td>
                      <td style={{ padding: "10px" }}>
                        <Chip label={entry.hos || "CS"} size="small" color="primary" sx={{ fontWeight: 700 }} />
                      </td>
                      <td style={{ padding: "10px", color: "#64748b" }}>{entry.entrydate}</td>
                      <td style={{ padding: "10px", fontFamily: "monospace", fontWeight: 700 }}>
                        {entry.srno_from || "-"}
                      </td>
                      <td style={{ padding: "10px", fontFamily: "monospace", fontWeight: 700 }}>
                        {entry.srno_to || "-"}
                      </td>
                      <td style={{ padding: "10px", textAlign: "right", fontWeight: 700 }}>
                        {formatNumber(entry.totalitems)}
                      </td>
                      <td style={{ padding: "10px", textAlign: "right", color: "#be123c", fontWeight: 600 }}>
                        {formatNumber(entry.issueditems)}
                      </td>
                      <td style={{ padding: "10px", textAlign: "right", color: "#15803d", fontWeight: 600 }}>
                        {formatNumber(entry.receiveditems)}
                      </td>
                      <td style={{ padding: "10px", textAlign: "right" }}>
                        <Chip
                          label={formatNumber(entry.currentbalance)}
                          color={entry.currentbalance > 0 ? "success" : "default"}
                          size="small"
                          sx={{ fontWeight: 800, minWidth: "60px" }}
                        />
                      </td>
                      <td style={{ padding: "10px", textAlign: "center" }}>
                        <Stack direction="row" spacing={0.5} justifyContent="center">
                          <Tooltip title="Edit Stock Entry">
                            <IconButton size="small" color="primary" onClick={() => handleOpenEdit(entry)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={entry.issueditems > 0 ? "Cannot delete stock with active issues" : "Delete Stock Entry"}>
                            <span>
                              <IconButton
                                size="small"
                                color="error"
                                disabled={entry.issueditems > 0}
                                onClick={() => handleDelete(entry._id)}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                        </Stack>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Box>
          )}
        </Paper>

        {/* Modal: Add / Edit Stock Entry */}
        <Dialog open={modalOpen} onClose={() => setModalOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle sx={{ fontWeight: 800 }}>
            {form._id ? "Edit Stock Entry" : "New Examination Stock Entry"}
          </DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              {/* Academic Year */}
              <Grid item xs={12} sm={4}>
                <TextField
                  select
                  fullWidth
                  label="Academic Year *"
                  value={form.academicyear}
                  onChange={(e) => setForm({ ...form, academicyear: e.target.value })}
                >
                  {options.academicyears.map((yr) => (
                    <MenuItem key={yr} value={yr}>{yr}</MenuItem>
                  ))}
                </TextField>
              </Grid>

              {/* Item Name */}
              <Grid item xs={12} sm={8}>
                <TextField
                  fullWidth
                  required
                  label="Item Name *"
                  placeholder="e.g. 20-A PAGES AB, 20-B PAGES AB, 40 PAGES AB"
                  value={form.itemname}
                  onChange={(e) => setForm({ ...form, itemname: e.target.value })}
                  helperText="Name of Answer Book / Examination stationery"
                />
              </Grid>

              {/* Institute */}
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  fullWidth
                  label="Institute *"
                  value={form.institute}
                  onChange={(e) => setForm({ ...form, institute: e.target.value })}
                  helperText="Select from configured institutes"
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
                  label="HOS (Section / Station) *"
                  value={form.hos}
                  onChange={(e) => setForm({ ...form, hos: e.target.value })}
                  helperText="Select from configured HOS codes (e.g. CS)"
                >
                  <MenuItem value="">-- Select HOS --</MenuItem>
                  {options.hosList.map((h) => (
                    <MenuItem key={h.hoscode} value={h.hoscode}>
                      {h.hoscode} - {h.hosname}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              {/* Serial No. From */}
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Serial No. From"
                  placeholder="e.g. 57001"
                  value={form.srno_from}
                  onChange={(e) => handleSerialChange(e.target.value, form.srno_to)}
                  helperText="Starting serial number"
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
                  helperText="Ending serial number"
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
                  helperText="Auto-computed or enter quantity"
                />
              </Grid>

              {/* Entry Date */}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="date"
                  label="Entry Date"
                  InputLabelProps={{ shrink: true }}
                  value={form.entrydate}
                  onChange={(e) => setForm({ ...form, entrydate: e.target.value })}
                />
              </Grid>

              {/* Remarks */}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Remarks (Optional)"
                  placeholder="e.g. Received from printer / central store"
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
            <Button variant="contained" onClick={handleSave} disabled={saving} sx={{ fontWeight: 700 }}>
              {saving ? "Saving..." : form._id ? "Update Stock Entry" : "Add Stock Entry"}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </MenuPageShell>
  );
}
