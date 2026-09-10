import React, { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
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
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import BadgeIcon from "@mui/icons-material/Badge";
import InventoryIcon from "@mui/icons-material/Inventory";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import PrintIcon from "@mui/icons-material/Print";
import { useNavigate } from "react-router-dom";
import ep1 from "../api/ep1";
import global1 from "./global1";
import MenuPageShell from "./MenuPageShell";

export default function ConductExamStockConfigurationPage() {
  const navigate = useNavigate();
  const colid = global1.colid || 1;

  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // Institute state
  const [institutes, setInstitutes] = useState([]);
  const [instituteModalOpen, setInstituteModalOpen] = useState(false);
  const [instituteForm, setInstituteForm] = useState({
    _id: "",
    institutename: "",
    institutecode: "",
    description: "",
    status: "Active"
  });

  // HOS state
  const [hosList, setHosList] = useState([]);
  const [hosModalOpen, setHosModalOpen] = useState(false);
  const [hosForm, setHosForm] = useState({
    _id: "",
    hosname: "",
    hoscode: "",
    department: "",
    status: "Active"
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    try {
      setLoading(true);
      setError("");
      const [resInst, resHos] = await Promise.all([
        ep1.get("/api/v2/conductexam/stock/institutes", { params: { colid } }),
        ep1.get("/api/v2/conductexam/stock/hos", { params: { colid } })
      ]);
      if (resInst.data?.success) setInstitutes(resInst.data.data || []);
      if (resHos.data?.success) setHosList(resHos.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load configuration data.");
    } finally {
      setLoading(false);
    }
  };

  // Institute Handlers
  const handleOpenAddInstitute = () => {
    setInstituteForm({ _id: "", institutename: "", institutecode: "", description: "", status: "Active" });
    setInstituteModalOpen(true);
  };

  const handleOpenEditInstitute = (row) => {
    setInstituteForm({
      _id: row._id,
      institutename: row.institutename || "",
      institutecode: row.institutecode || "",
      description: row.description || "",
      status: row.status || "Active"
    });
    setInstituteModalOpen(true);
  };

  const handleSaveInstitute = async () => {
    if (!instituteForm.institutename.trim() || !instituteForm.institutecode.trim()) {
      setError("Please provide both Institute Name and Institute Code.");
      return;
    }
    try {
      setSaving(true);
      setError("");
      const payload = {
        ...instituteForm,
        colid,
        user: global1.user || "admin"
      };
      const res = await ep1.post("/api/v2/conductexam/stock/institutes", payload);
      if (res.data?.success) {
        setMessage(instituteForm._id ? "Institute updated successfully!" : "Institute added successfully!");
        setInstituteModalOpen(false);
        loadAll();
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save institute.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteInstitute = async (id) => {
    if (!window.confirm("Are you sure you want to delete this institute?")) return;
    try {
      const res = await ep1.post("/api/v2/conductexam/stock/institutes/delete", { id, colid });
      if (res.data?.success) {
        setMessage("Institute deleted successfully.");
        loadAll();
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete institute.");
    }
  };

  // HOS Handlers
  const handleOpenAddHos = () => {
    setHosForm({ _id: "", hosname: "", hoscode: "", department: "", status: "Active" });
    setHosModalOpen(true);
  };

  const handleOpenEditHos = (row) => {
    setHosForm({
      _id: row._id,
      hosname: row.hosname || "",
      hoscode: row.hoscode || "",
      department: row.department || "",
      status: row.status || "Active"
    });
    setHosModalOpen(true);
  };

  const handleSaveHos = async () => {
    if (!hosForm.hosname.trim() || !hosForm.hoscode.trim()) {
      setError("Please provide both HOS Name and HOS Code.");
      return;
    }
    try {
      setSaving(true);
      setError("");
      const payload = {
        ...hosForm,
        colid,
        user: global1.user || "admin"
      };
      const res = await ep1.post("/api/v2/conductexam/stock/hos", payload);
      if (res.data?.success) {
        setMessage(hosForm._id ? "HOS updated successfully!" : "HOS added successfully!");
        setHosModalOpen(false);
        loadAll();
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save HOS.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteHos = async (id) => {
    if (!window.confirm("Are you sure you want to delete this HOS entry?")) return;
    try {
      const res = await ep1.post("/api/v2/conductexam/stock/hos/delete", { id, colid });
      if (res.data?.success) {
        setMessage("HOS deleted successfully.");
        loadAll();
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete HOS.");
    }
  };

  return (
    <MenuPageShell title="Stock Configuration (Institutes & HOS)">
      <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: "#f8fafc", minHeight: "100vh" }}>
        {/* Navigation Bar across Stock Module */}
        <Paper elevation={0} sx={{ p: 2, mb: 2.5, borderRadius: 2, border: "1px solid #e2e8f0" }}>
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", md: "center" }} spacing={2}>
            <Box>
              <Typography variant="h5" fontWeight={800} color="#1e293b" sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <AccountBalanceIcon color="primary" /> Stock Configuration (Institute &amp; HOS)
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Configure Institute names and HOS (Head of Section / Station) codes to be used in Stock Entry and Issue/Receive transactions.
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
                startIcon={<SwapHorizIcon />}
                onClick={() => navigate("/conduct-exam-stock-issue-receive")}
                sx={{ fontWeight: 700, textTransform: "none" }}
              >
                Issue / Receive Stock
              </Button>
              <Button
                variant="contained"
                startIcon={<PrintIcon />}
                onClick={() => navigate("/conduct-exam-stock-report-print")}
                sx={{ fontWeight: 700, textTransform: "none", bgcolor: "#1e293b", "&:hover": { bgcolor: "#0f172a" } }}
              >
                Print Report
              </Button>
            </Stack>
          </Stack>
        </Paper>

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

        {/* Tabs for Institute vs HOS */}
        <Paper elevation={0} sx={{ borderRadius: 2, border: "1px solid #e2e8f0", overflow: "hidden" }}>
          <Tabs
            value={activeTab}
            onChange={(e, val) => setActiveTab(val)}
            sx={{ borderBottom: "1px solid #e2e8f0", bgcolor: "#ffffff", px: 2 }}
          >
            <Tab
              icon={<AccountBalanceIcon fontSize="small" />}
              iconPosition="start"
              label={`Institutes (${institutes.length})`}
              sx={{ fontWeight: 700, textTransform: "none" }}
            />
            <Tab
              icon={<BadgeIcon fontSize="small" />}
              iconPosition="start"
              label={`HOS - Head of Section / Station (${hosList.length})`}
              sx={{ fontWeight: 700, textTransform: "none" }}
            />
          </Tabs>

          {/* TAB 0: INSTITUTES */}
          {activeTab === 0 && (
            <Box sx={{ p: 2.5 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="subtitle1" fontWeight={700} color="primary">
                  Configured Examination Institutes / Colleges
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={handleOpenAddInstitute}
                  sx={{ fontWeight: 700, textTransform: "none" }}
                >
                  Add Institute
                </Button>
              </Stack>

              {loading ? (
                <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : institutes.length === 0 ? (
                <Box sx={{ p: 4, textAlign: "center", color: "#64748b" }}>
                  <Typography variant="body1" fontWeight={600}>
                    No institutes configured yet. Click "Add Institute" to create your first institute (e.g. PCMSRC, PCNRC).
                  </Typography>
                </Box>
              ) : (
                <Box sx={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                    <thead>
                      <tr style={{ backgroundColor: "#f8fafc", borderBottom: "2px solid #cbd5e1" }}>
                        <th style={{ padding: "10px", textAlign: "left", width: "80px" }}>S.No</th>
                        <th style={{ padding: "10px", textAlign: "left" }}>Institute Name</th>
                        <th style={{ padding: "10px", textAlign: "left", width: "160px" }}>Institute Code</th>
                        <th style={{ padding: "10px", textAlign: "left" }}>Description</th>
                        <th style={{ padding: "10px", textAlign: "center", width: "110px" }}>Status</th>
                        <th style={{ padding: "10px", textAlign: "center", width: "120px" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {institutes.map((inst, idx) => (
                        <tr key={inst._id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                          <td style={{ padding: "10px", fontWeight: 600 }}>{idx + 1}</td>
                          <td style={{ padding: "10px", fontWeight: 700, color: "#1e293b" }}>{inst.institutename}</td>
                          <td style={{ padding: "10px" }}>
                            <Chip label={inst.institutecode} color="primary" size="small" sx={{ fontWeight: 700 }} />
                          </td>
                          <td style={{ padding: "10px", color: "#64748b" }}>{inst.description || "-"}</td>
                          <td style={{ padding: "10px", textAlign: "center" }}>
                            <Chip
                              label={inst.status || "Active"}
                              color={inst.status === "Active" ? "success" : "default"}
                              size="small"
                            />
                          </td>
                          <td style={{ padding: "10px", textAlign: "center" }}>
                            <Stack direction="row" spacing={0.5} justifyContent="center">
                              <Tooltip title="Edit Institute">
                                <IconButton size="small" color="primary" onClick={() => handleOpenEditInstitute(inst)}>
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Delete Institute">
                                <IconButton size="small" color="error" onClick={() => handleDeleteInstitute(inst._id)}>
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Stack>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Box>
              )}
            </Box>
          )}

          {/* TAB 1: HOS (HEAD OF SECTION / STATION) */}
          {activeTab === 1 && (
            <Box sx={{ p: 2.5 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="subtitle1" fontWeight={700} color="primary">
                  Configured Head of Section / Station (HOS) Codes
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={handleOpenAddHos}
                  sx={{ fontWeight: 700, textTransform: "none" }}
                >
                  Add HOS
                </Button>
              </Stack>

              {loading ? (
                <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : hosList.length === 0 ? (
                <Box sx={{ p: 4, textAlign: "center", color: "#64748b" }}>
                  <Typography variant="body1" fontWeight={600}>
                    No HOS configured yet. Click "Add HOS" to configure section/station codes (e.g. CS - Conduct Section).
                  </Typography>
                </Box>
              ) : (
                <Box sx={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                    <thead>
                      <tr style={{ backgroundColor: "#f8fafc", borderBottom: "2px solid #cbd5e1" }}>
                        <th style={{ padding: "10px", textAlign: "left", width: "80px" }}>S.No</th>
                        <th style={{ padding: "10px", textAlign: "left" }}>HOS Name / Section</th>
                        <th style={{ padding: "10px", textAlign: "left", width: "160px" }}>HOS Code</th>
                        <th style={{ padding: "10px", textAlign: "left" }}>Department</th>
                        <th style={{ padding: "10px", textAlign: "center", width: "110px" }}>Status</th>
                        <th style={{ padding: "10px", textAlign: "center", width: "120px" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {hosList.map((h, idx) => (
                        <tr key={h._id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                          <td style={{ padding: "10px", fontWeight: 600 }}>{idx + 1}</td>
                          <td style={{ padding: "10px", fontWeight: 700, color: "#1e293b" }}>{h.hosname}</td>
                          <td style={{ padding: "10px" }}>
                            <Chip label={h.hoscode} color="secondary" size="small" sx={{ fontWeight: 700 }} />
                          </td>
                          <td style={{ padding: "10px", color: "#64748b" }}>{h.department || "-"}</td>
                          <td style={{ padding: "10px", textAlign: "center" }}>
                            <Chip
                              label={h.status || "Active"}
                              color={h.status === "Active" ? "success" : "default"}
                              size="small"
                            />
                          </td>
                          <td style={{ padding: "10px", textAlign: "center" }}>
                            <Stack direction="row" spacing={0.5} justifyContent="center">
                              <Tooltip title="Edit HOS">
                                <IconButton size="small" color="primary" onClick={() => handleOpenEditHos(h)}>
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Delete HOS">
                                <IconButton size="small" color="error" onClick={() => handleDeleteHos(h._id)}>
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Stack>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Box>
              )}
            </Box>
          )}
        </Paper>

        {/* Modal: Add / Edit Institute */}
        <Dialog open={instituteModalOpen} onClose={() => setInstituteModalOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight: 800 }}>
            {instituteForm._id ? "Edit Institute" : "Add New Examination Institute"}
          </DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  required
                  label="Institute Full Name"
                  placeholder="e.g. People's College of Medical Sciences & Research Centre"
                  value={instituteForm.institutename}
                  onChange={(e) => setInstituteForm({ ...instituteForm, institutename: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  required
                  label="Institute Code (Short Name)"
                  placeholder="e.g. PCMSRC, PCNRC"
                  value={instituteForm.institutecode}
                  onChange={(e) => setInstituteForm({ ...instituteForm, institutecode: e.target.value.toUpperCase() })}
                  helperText="Appears on stock report table"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  fullWidth
                  label="Status"
                  value={instituteForm.status}
                  onChange={(e) => setInstituteForm({ ...instituteForm, status: e.target.value })}
                >
                  <MenuItem value="Active">Active</MenuItem>
                  <MenuItem value="Inactive">Inactive</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Description / Campus Details (Optional)"
                  value={instituteForm.description}
                  onChange={(e) => setInstituteForm({ ...instituteForm, description: e.target.value })}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setInstituteModalOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button variant="contained" onClick={handleSaveInstitute} disabled={saving} sx={{ fontWeight: 700 }}>
              {saving ? "Saving..." : instituteForm._id ? "Update Institute" : "Save Institute"}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Modal: Add / Edit HOS */}
        <Dialog open={hosModalOpen} onClose={() => setHosModalOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight: 800 }}>
            {hosForm._id ? "Edit HOS" : "Add Head of Section / Station (HOS)"}
          </DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  required
                  label="HOS Name / Section Title"
                  placeholder="e.g. Conduct Section, Centre Superintendent"
                  value={hosForm.hosname}
                  onChange={(e) => setHosForm({ ...hosForm, hosname: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  required
                  label="HOS Code (Short Code)"
                  placeholder="e.g. CS, HOS-01"
                  value={hosForm.hoscode}
                  onChange={(e) => setHosForm({ ...hosForm, hoscode: e.target.value.toUpperCase() })}
                  helperText="Shown in HOS column of stock report"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  fullWidth
                  label="Status"
                  value={hosForm.status}
                  onChange={(e) => setHosForm({ ...hosForm, status: e.target.value })}
                >
                  <MenuItem value="Active">Active</MenuItem>
                  <MenuItem value="Inactive">Inactive</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Department (Optional)"
                  placeholder="e.g. Examination Department"
                  value={hosForm.department}
                  onChange={(e) => setHosForm({ ...hosForm, department: e.target.value })}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setHosModalOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button variant="contained" onClick={handleSaveHos} disabled={saving} sx={{ fontWeight: 700 }}>
              {saving ? "Saving..." : hosForm._id ? "Update HOS" : "Save HOS"}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </MenuPageShell>
  );
}
