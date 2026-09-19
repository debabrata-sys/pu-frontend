import React, { useState, useEffect } from "react";
import ep1 from "../api/ep1";
import global1 from "./global1";
import {
  Container,
  Paper,
  Typography,
  Box,
  Grid,
  TextField,
  Button,
  Tabs,
  Tab,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  Divider,
  Tooltip,
  MenuItem,
  InputAdornment
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import VisibilityIcon from "@mui/icons-material/Visibility";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import PauseCircleFilledIcon from "@mui/icons-material/PauseCircleFilled";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import LaunchIcon from "@mui/icons-material/Launch";
import DeleteIcon from "@mui/icons-material/Delete";
import AddLinkIcon from "@mui/icons-material/AddLink";
import RefreshIcon from "@mui/icons-material/Refresh";

export default function FacultyRegistrationAdminPage() {
  const colid = global1.colid || 1;
  const adminUser = global1.user || "admin";

  const [tabIndex, setTabIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Tab 0: Applications State
  const [applications, setApplications] = useState([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, hold: 0, rejected: 0 });
  const [statusFilter, setStatusFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  // Detail Modal State
  const [selectedApp, setSelectedApp] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  // Action Dialog State (Approve / Reject / Hold)
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState("");
  const [actionRemarks, setActionRemarks] = useState("");
  const [actionProcessing, setActionProcessing] = useState(false);
  const [actionResult, setActionResult] = useState(null);

  // Tab 1: Links State
  const [links, setLinks] = useState([]);
  const [newLinkTitle, setNewLinkTitle] = useState("Faculty & Valuator Registration 2026");
  const [newLinkRole, setNewLinkRole] = useState("Faculty");
  const [newLinkDept, setNewLinkDept] = useState("");
  const [newLinkFacultyType, setNewLinkFacultyType] = useState("");
  const [newLinkValuatorType, setNewLinkValuatorType] = useState("");
  const [newLinkValidUntil, setNewLinkValidUntil] = useState("");
  const [newLinkMaxSubmissions, setNewLinkMaxSubmissions] = useState("");
  const [linkCreating, setLinkCreating] = useState(false);

  useEffect(() => {
    loadApplications();
    loadLinks();
  }, [colid, statusFilter]);

  const loadApplications = async () => {
    setLoading(true);
    try {
      const res = await ep1.get("/api/v2/faculty-registration-admin/list", {
        params: {
          colid,
          status: statusFilter,
          search: searchQuery
        }
      });
      if (res.data?.status === "Success") {
        setApplications(res.data.data || []);
        if (res.data.stats) setStats(res.data.stats);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Failed to load registration applications.");
    } finally {
      setLoading(false);
    }
  };

  const loadLinks = async () => {
    try {
      const res = await ep1.get("/api/v2/faculty-registration-link", { params: { colid } });
      if (res.data?.status === "Success") {
        setLinks(res.data.data || []);
      }
    } catch (err) {
      console.error("Failed to load links:", err);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadApplications();
  };

  const openDetailModal = (app) => {
    setSelectedApp(app);
    setDetailModalOpen(true);
  };

  const openActionDialog = (app, type) => {
    setSelectedApp(app);
    setActionType(type);
    setActionRemarks(
      type === "Approve"
        ? "Approved and account credentials issued."
        : type === "Hold"
        ? "Application placed on hold pending verification of medical council ID."
        : "Application rejected."
    );
    setActionResult(null);
    setActionDialogOpen(true);
  };

  const handleExecuteAction = async () => {
    if (!selectedApp || !actionType) return;
    setActionProcessing(true);
    try {
      const res = await ep1.post("/api/v2/faculty-registration-admin/action", {
        id: selectedApp._id,
        colid,
        action: actionType,
        remarks: actionRemarks,
        user: adminUser
      });

      if (res.data?.status === "Success") {
        setSuccessMsg(res.data.message || `Application marked as ${actionType}.`);
        if (actionType === "Approve" && res.data.credentials) {
          setActionResult(res.data.credentials);
        } else {
          setActionDialogOpen(false);
        }
        loadApplications();
      } else {
        alert(res.data?.message || "Failed to process action.");
      }
    } catch (err) {
      alert(err.response?.data?.message || "Action processing failed.");
    } finally {
      setActionProcessing(false);
    }
  };

  const handleCreateLink = async (e) => {
    e.preventDefault();
    setLinkCreating(true);
    try {
      const res = await ep1.post("/api/v2/faculty-registration-link", {
        colid,
        title: newLinkTitle,
        role: newLinkRole,
        department: newLinkDept,
        facultytype: newLinkFacultyType,
        valuatortype: newLinkValuatorType,
        validuntil: newLinkValidUntil || null,
        maxsubmissions: Number(newLinkMaxSubmissions || 0),
        user: adminUser,
        username: global1.name || "Admin"
      });

      if (res.data?.status === "Success") {
        setSuccessMsg("New registration link generated successfully!");
        loadLinks();
        setNewLinkTitle("Faculty & Valuator Registration 2026");
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Failed to generate link.");
    } finally {
      setLinkCreating(false);
    }
  };

  const handleToggleLink = async (link) => {
    const nextStatus = link.status === "Active" ? "Inactive" : "Active";
    try {
      await ep1.post("/api/v2/faculty-registration-link/toggle", {
        id: link._id,
        colid,
        status: nextStatus
      });
      loadLinks();
    } catch (err) {
      alert("Failed to toggle link status.");
    }
  };

  const handleDeleteLink = async (linkId) => {
    if (!window.confirm("Are you sure you want to delete this link?")) return;
    try {
      await ep1.post("/api/v2/faculty-registration-link/delete", { id: linkId, colid });
      loadLinks();
    } catch (err) {
      alert("Failed to delete link.");
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert("Copied to clipboard!");
  };

  const getStatusChip = (status) => {
    switch (status) {
      case "Approved":
        return <Chip label="Approved" color="success" size="small" icon={<CheckCircleIcon />} />;
      case "Hold":
        return <Chip label="On Hold" color="warning" size="small" icon={<PauseCircleFilledIcon />} />;
      case "Rejected":
        return <Chip label="Rejected" color="error" size="small" icon={<CancelIcon />} />;
      default:
        return <Chip label="Pending Review" color="info" size="small" />;
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold" color="#0f172a">
            Faculty & Valuator Registrations
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage public self-registrations, approval workflows, custom user fields, and shareable registration links.
          </Typography>
        </Box>
        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => { loadApplications(); loadLinks(); }}>
          Refresh
        </Button>
      </Box>

      {/* KPI Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={4} md={2.4}>
          <Card sx={{ bgcolor: "#ffffff", borderLeft: "5px solid #64748b" }}>
            <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
              <Typography variant="caption" color="text.secondary">Total Applications</Typography>
              <Typography variant="h5" fontWeight="bold">{stats.total}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={4} md={2.4}>
          <Card sx={{ bgcolor: "#ffffff", borderLeft: "5px solid #0284c7" }}>
            <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
              <Typography variant="caption" color="#0284c7" fontWeight="bold">Pending Review</Typography>
              <Typography variant="h5" fontWeight="bold" color="#0284c7">{stats.pending}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={4} md={2.4}>
          <Card sx={{ bgcolor: "#ffffff", borderLeft: "5px solid #16a34a" }}>
            <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
              <Typography variant="caption" color="#16a34a" fontWeight="bold">Approved</Typography>
              <Typography variant="h5" fontWeight="bold" color="#16a34a">{stats.approved}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={4} md={2.4}>
          <Card sx={{ bgcolor: "#ffffff", borderLeft: "5px solid #d97706" }}>
            <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
              <Typography variant="caption" color="#d97706" fontWeight="bold">On Hold</Typography>
              <Typography variant="h5" fontWeight="bold" color="#d97706">{stats.hold}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={4} md={2.4}>
          <Card sx={{ bgcolor: "#ffffff", borderLeft: "5px solid #dc2626" }}>
            <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
              <Typography variant="caption" color="#dc2626" fontWeight="bold">Rejected</Typography>
              <Typography variant="h5" fontWeight="bold" color="#dc2626">{stats.rejected}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {successMsg && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMsg("")}>
          {successMsg}
        </Alert>
      )}
      {errorMsg && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErrorMsg("")}>
          {errorMsg}
        </Alert>
      )}

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabIndex} onChange={(_, val) => setTabIndex(val)} indicatorColor="primary" textColor="primary">
          <Tab label={`Applications (${stats.total})`} />
          <Tab label={`Registration Links (${links.length})`} icon={<AddLinkIcon />} iconPosition="start" />
        </Tabs>
      </Paper>

      {/* ========================================================= */}
      {/* TAB 0: Applications Table & Approval Workflow             */}
      {/* ========================================================= */}
      {tabIndex === 0 && (
        <Paper elevation={2} sx={{ p: 2, borderRadius: 2 }}>
          {/* Filters & Search */}
          <Box sx={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 2, mb: 2 }}>
            <Box sx={{ display: "flex", gap: 1 }}>
              {["All", "Pending", "Approved", "Hold", "Rejected"].map((s) => (
                <Button
                  key={s}
                  variant={statusFilter === s ? "contained" : "outlined"}
                  color={s === "Approved" ? "success" : s === "Pending" ? "primary" : s === "Hold" ? "warning" : s === "Rejected" ? "error" : "inherit"}
                  size="small"
                  onClick={() => setStatusFilter(s)}
                >
                  {s}
                </Button>
              ))}
            </Box>

            <form onSubmit={handleSearchSubmit} style={{ display: "flex", gap: "8px" }}>
              <TextField
                size="small"
                placeholder="Search name, email, mobile, council ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                sx={{ minWidth: 280 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  )
                }}
              />
              <Button type="submit" variant="contained" size="small">
                Search
              </Button>
            </form>
          </Box>

          {/* Table */}
          <TableContainer>
            <Table size="small">
              <TableHead sx={{ bgcolor: "#f8fafc" }}>
                <TableRow>
                  <TableCell><b>Applicant</b></TableCell>
                  <TableCell><b>Contact Info</b></TableCell>
                  <TableCell><b>Faculty & Valuator Type</b></TableCell>
                  <TableCell><b>Current Employment</b></TableCell>
                  <TableCell><b>Experience</b></TableCell>
                  <TableCell><b>Status</b></TableCell>
                  <TableCell><b>Submitted</b></TableCell>
                  <TableCell align="center"><b>Actions</b></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                      <CircularProgress size={32} />
                    </TableCell>
                  </TableRow>
                ) : applications.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 4, color: "text.secondary" }}>
                      No registration applications found matching the selected filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  applications.map((row) => (
                    <TableRow key={row._id} hover>
                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                          {row.photolink ? (
                            <img
                              src={row.photolink}
                              alt={row.fullname}
                              style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover" }}
                            />
                          ) : (
                            <Box sx={{ width: 36, height: 36, borderRadius: "50%", bgcolor: "#cbd5e1", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: "bold" }}>
                              {row.fullname?.charAt(0)}
                            </Box>
                          )}
                          <Box>
                            <Typography variant="body2" fontWeight="bold">
                              {row.fullname}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {row.gender}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{row.email}</Typography>
                        <Typography variant="caption" color="text.secondary">{row.mobile}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2"><b>Faculty:</b> {row.facultytype}</Typography>
                        <Typography variant="caption" color="text.secondary"><b>Valuator:</b> {row.valuatortype}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{row.currentemployment?.designation || "-"}</Typography>
                        <Typography variant="caption" color="text.secondary">{row.currentemployment?.institution || "-"}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{row.teachingexperience_years}y {row.teachingexperience_months}m</Typography>
                      </TableCell>
                      <TableCell>{getStatusChip(row.status)}</TableCell>
                      <TableCell>
                        <Typography variant="caption">
                          {new Date(row.createdAt).toLocaleDateString()}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: "flex", justifyContent: "center", gap: 0.5 }}>
                          <Tooltip title="View Complete Application">
                            <IconButton size="small" color="primary" onClick={() => openDetailModal(row)}>
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>

                          {row.status === "Pending" && (
                            <>
                              <Tooltip title="Approve & Create Login">
                                <IconButton size="small" color="success" onClick={() => openActionDialog(row, "Approve")}>
                                  <CheckCircleIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Place on Hold">
                                <IconButton size="small" color="warning" onClick={() => openActionDialog(row, "Hold")}>
                                  <PauseCircleFilledIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Reject Application">
                                <IconButton size="small" color="error" onClick={() => openActionDialog(row, "Reject")}>
                                  <CancelIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </>
                          )}

                          {row.status === "Hold" && (
                            <>
                              <Tooltip title="Approve">
                                <IconButton size="small" color="success" onClick={() => openActionDialog(row, "Approve")}>
                                  <CheckCircleIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Reject">
                                <IconButton size="small" color="error" onClick={() => openActionDialog(row, "Reject")}>
                                  <CancelIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* ========================================================= */}
      {/* TAB 1: Generate & Manage Registration Links               */}
      {/* ========================================================= */}
      {tabIndex === 1 && (
        <Grid container spacing={3}>
          {/* Create Link Card */}
          <Grid item xs={12} md={4}>
            <Paper elevation={2} sx={{ p: 3, borderRadius: 2 }}>
              <Typography variant="h6" fontWeight="bold" gutterBottom color="#0f172a">
                Generate Registration Link
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                Create a customized shareable registration link for candidates to self-register.
              </Typography>
              <Divider sx={{ mb: 2 }} />

              <form onSubmit={handleCreateLink}>
                <TextField
                  fullWidth
                  required
                  label="Link Title / Purpose"
                  size="small"
                  value={newLinkTitle}
                  onChange={(e) => setNewLinkTitle(e.target.value)}
                  sx={{ mb: 2 }}
                />

                <TextField
                  select
                  fullWidth
                  label="Account Role"
                  size="small"
                  value={newLinkRole}
                  onChange={(e) => setNewLinkRole(e.target.value)}
                  sx={{ mb: 2 }}
                >
                  <MenuItem value="Faculty">Faculty</MenuItem>
                  <MenuItem value="Valuator">Valuator</MenuItem>
                </TextField>

                <TextField
                  fullWidth
                  label="Department (Optional pre-fill)"
                  placeholder="e.g. Medical, Engineering"
                  size="small"
                  value={newLinkDept}
                  onChange={(e) => setNewLinkDept(e.target.value)}
                  sx={{ mb: 2 }}
                />

                <TextField
                  fullWidth
                  type="date"
                  label="Valid Until (Optional expiration)"
                  InputLabelProps={{ shrink: true }}
                  size="small"
                  value={newLinkValidUntil}
                  onChange={(e) => setNewLinkValidUntil(e.target.value)}
                  sx={{ mb: 2 }}
                />

                <TextField
                  fullWidth
                  type="number"
                  label="Max Submissions (0 for unlimited)"
                  size="small"
                  value={newLinkMaxSubmissions}
                  onChange={(e) => setNewLinkMaxSubmissions(e.target.value)}
                  sx={{ mb: 2.5 }}
                />

                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  fullWidth
                  disabled={linkCreating}
                  startIcon={<AddLinkIcon />}
                >
                  {linkCreating ? "Generating..." : "Generate Shareable Link"}
                </Button>
              </form>
            </Paper>
          </Grid>

          {/* Links List */}
          <Grid item xs={12} md={8}>
            <Paper elevation={2} sx={{ p: 3, borderRadius: 2 }}>
              <Typography variant="h6" fontWeight="bold" gutterBottom color="#0f172a">
                Active Registration Links ({links.length})
              </Typography>
              <Divider sx={{ mb: 2 }} />

              <TableContainer>
                <Table size="small">
                  <TableHead sx={{ bgcolor: "#f8fafc" }}>
                    <TableRow>
                      <TableCell><b>Title & Role</b></TableCell>
                      <TableCell><b>Registration URL</b></TableCell>
                      <TableCell align="center"><b>Submissions</b></TableCell>
                      <TableCell><b>Expiry</b></TableCell>
                      <TableCell><b>Status</b></TableCell>
                      <TableCell align="center"><b>Actions</b></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {links.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} align="center" sx={{ py: 3, color: "text.secondary" }}>
                          No links generated yet. Generate your first registration link on the left.
                        </TableCell>
                      </TableRow>
                    ) : (
                      links.map((link) => (
                        <TableRow key={link._id} hover>
                          <TableCell>
                            <Typography variant="body2" fontWeight="bold">{link.title}</Typography>
                            <Typography variant="caption" color="text.secondary">{link.role}</Typography>
                          </TableCell>
                          <TableCell sx={{ maxWidth: 220 }}>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                              <Typography variant="caption" noWrap sx={{ fontFamily: "monospace", bgcolor: "#f1f5f9", px: 1, py: 0.5, borderRadius: 1 }}>
                                {link.url}
                              </Typography>
                              <Tooltip title="Copy Link">
                                <IconButton size="small" onClick={() => copyToClipboard(link.url)}>
                                  <ContentCopyIcon fontSize="inherit" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Open Form">
                                <IconButton size="small" component="a" href={link.url} target="_blank">
                                  <LaunchIcon fontSize="inherit" />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </TableCell>
                          <TableCell align="center">
                            <Typography variant="body2" fontWeight="bold">
                              {link.submissioncount || 0}
                              {link.maxsubmissions > 0 && ` / ${link.maxsubmissions}`}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption">
                              {link.validuntil ? new Date(link.validuntil).toLocaleDateString() : "Never"}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={link.status}
                              color={link.status === "Active" ? "success" : "default"}
                              size="small"
                              onClick={() => handleToggleLink(link)}
                              sx={{ cursor: "pointer" }}
                            />
                          </TableCell>
                          <TableCell align="center">
                            <IconButton size="small" color="error" onClick={() => handleDeleteLink(link._id)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* ========================================================= */}
      {/* DIALOG 1: Comprehensive View Application Details          */}
      {/* ========================================================= */}
      <Dialog open={detailModalOpen} onClose={() => setDetailModalOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", bgcolor: "#f8fafc" }}>
          <Box>
            <Typography variant="h6" fontWeight="bold">
              Registration Form Details
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Submitted: {selectedApp && new Date(selectedApp.createdAt).toLocaleString()}
            </Typography>
          </Box>
          {selectedApp && getStatusChip(selectedApp.status)}
        </DialogTitle>

        <DialogContent dividers sx={{ p: 3 }}>
          {selectedApp && (
            <Box>
              {/* Photo and Signature Previews */}
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6}>
                  <Box sx={{ p: 2, border: "1px solid #e2e8f0", borderRadius: 2, textAlign: "center", bgcolor: "#f8fafc" }}>
                    <Typography variant="caption" fontWeight="bold" display="block" sx={{ mb: 1 }}>
                      Applicant Photograph
                    </Typography>
                    {selectedApp.photolink ? (
                      <img
                        src={selectedApp.photolink}
                        alt="Applicant"
                        style={{ maxHeight: 150, maxWidth: "100%", borderRadius: 6, objectFit: "contain" }}
                      />
                    ) : (
                      <Typography variant="body2" color="text.secondary">No photo uploaded</Typography>
                    )}
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box sx={{ p: 2, border: "1px solid #e2e8f0", borderRadius: 2, textAlign: "center", bgcolor: "#f8fafc" }}>
                    <Typography variant="caption" fontWeight="bold" display="block" sx={{ mb: 1 }}>
                      Applicant Signature
                    </Typography>
                    {selectedApp.signaturelink ? (
                      <img
                        src={selectedApp.signaturelink}
                        alt="Signature"
                        style={{ maxHeight: 80, maxWidth: "100%", borderRadius: 4, objectFit: "contain" }}
                      />
                    ) : (
                      <Typography variant="body2" color="text.secondary">No signature uploaded</Typography>
                    )}
                  </Box>
                </Grid>
              </Grid>

              {/* 1. Basic Information */}
              <Typography variant="subtitle1" fontWeight="bold" color="primary" gutterBottom>
                1. Basic Details
              </Typography>
              <Grid container spacing={1.5} sx={{ mb: 3 }}>
                <Grid item xs={6} sm={4}><Typography variant="caption" color="text.secondary">Full Name</Typography><Typography variant="body2" fontWeight="bold">{selectedApp.fullname}</Typography></Grid>
                <Grid item xs={6} sm={4}><Typography variant="caption" color="text.secondary">Gender</Typography><Typography variant="body2">{selectedApp.gender}</Typography></Grid>
                <Grid item xs={6} sm={4}><Typography variant="caption" color="text.secondary">Faculty Type</Typography><Typography variant="body2">{selectedApp.facultytype}</Typography></Grid>
                <Grid item xs={6} sm={4}><Typography variant="caption" color="text.secondary">Valuator Type</Typography><Typography variant="body2">{selectedApp.valuatortype}</Typography></Grid>
                <Grid item xs={6} sm={4}><Typography variant="caption" color="text.secondary">Email Address</Typography><Typography variant="body2" fontWeight="bold">{selectedApp.email}</Typography></Grid>
                <Grid item xs={6} sm={4}><Typography variant="caption" color="text.secondary">Mobile Number</Typography><Typography variant="body2">{selectedApp.mobile}</Typography></Grid>
                <Grid item xs={6} sm={4}><Typography variant="caption" color="text.secondary">Alternate Mobile</Typography><Typography variant="body2">{selectedApp.alternatemobile || "N/A"}</Typography></Grid>
                <Grid item xs={6} sm={4}><Typography variant="caption" color="text.secondary">Teaching Experience</Typography><Typography variant="body2">{selectedApp.teachingexperience_years} Years, {selectedApp.teachingexperience_months} Months</Typography></Grid>
              </Grid>
              <Divider sx={{ mb: 3 }} />

              {/* 2. Employment Profile */}
              <Typography variant="subtitle1" fontWeight="bold" color="primary" gutterBottom>
                2. Employment Profile
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" fontWeight="bold" color="#334155">Current Employment</Typography>
                <Grid container spacing={1.5} sx={{ mt: 0.5, mb: 1.5 }}>
                  <Grid item xs={6} sm={3}><Typography variant="caption" color="text.secondary">Designation</Typography><Typography variant="body2">{selectedApp.currentemployment?.designation}</Typography></Grid>
                  <Grid item xs={6} sm={3}><Typography variant="caption" color="text.secondary">Institution</Typography><Typography variant="body2">{selectedApp.currentemployment?.institution}</Typography></Grid>
                  <Grid item xs={6} sm={3}><Typography variant="caption" color="text.secondary">Joining Date</Typography><Typography variant="body2">{selectedApp.currentemployment?.dateofjoining}</Typography></Grid>
                  <Grid item xs={6} sm={3}><Typography variant="caption" color="text.secondary">Exit Date</Typography><Typography variant="body2">{selectedApp.currentemployment?.dateofexit || "till date"}</Typography></Grid>
                  <Grid item xs={6} sm={4}><Typography variant="caption" color="text.secondary">Medical/Dental Council ID</Typography><Typography variant="body2" fontWeight="bold">{selectedApp.currentemployment?.medicalcouncilid || "N/A"}</Typography></Grid>
                  <Grid item xs={6} sm={4}><Typography variant="caption" color="text.secondary">Specialization</Typography><Typography variant="body2">{selectedApp.currentemployment?.specialization}</Typography></Grid>
                  <Grid item xs={12} sm={4}><Typography variant="caption" color="text.secondary">Subject(s) Taught</Typography><Typography variant="body2">{selectedApp.currentemployment?.subjectstaught}</Typography></Grid>
                </Grid>
              </Box>

              {/* Past Employments */}
              {selectedApp.pastemployment && selectedApp.pastemployment.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" fontWeight="bold" color="#334155">Past Employments</Typography>
                  <Table size="small" sx={{ mt: 1 }}>
                    <TableHead sx={{ bgcolor: "#f1f5f9" }}>
                      <TableRow>
                        <TableCell><b>Designation</b></TableCell>
                        <TableCell><b>Institution</b></TableCell>
                        <TableCell><b>Dates</b></TableCell>
                        <TableCell><b>Council ID</b></TableCell>
                        <TableCell><b>Subjects</b></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {selectedApp.pastemployment.map((pe, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{pe.designation}</TableCell>
                          <TableCell>{pe.institution}</TableCell>
                          <TableCell>{pe.dateofjoining} to {pe.dateofexit}</TableCell>
                          <TableCell>{pe.medicalcouncilid || "-"}</TableCell>
                          <TableCell>{pe.subjectstaught || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              )}
              <Divider sx={{ my: 3 }} />

              {/* 3. Bank & PAN Details */}
              <Typography variant="subtitle1" fontWeight="bold" color="primary" gutterBottom>
                3. Bank Details & PAN Card
              </Typography>
              <Grid container spacing={1.5} sx={{ mb: 2 }}>
                <Grid item xs={6} sm={4}><Typography variant="caption" color="text.secondary">Bank Name</Typography><Typography variant="body2">{selectedApp.bankname}</Typography></Grid>
                <Grid item xs={6} sm={4}><Typography variant="caption" color="text.secondary">Branch Name</Typography><Typography variant="body2">{selectedApp.branchname || "N/A"}</Typography></Grid>
                <Grid item xs={6} sm={4}><Typography variant="caption" color="text.secondary">Account Holder's Name</Typography><Typography variant="body2">{selectedApp.accountholdername}</Typography></Grid>
                <Grid item xs={6} sm={4}><Typography variant="caption" color="text.secondary">Account Number</Typography><Typography variant="body2" fontWeight="bold">{selectedApp.accountnumber}</Typography></Grid>
                <Grid item xs={6} sm={4}><Typography variant="caption" color="text.secondary">IFSC Code</Typography><Typography variant="body2" fontWeight="bold">{selectedApp.ifsccode}</Typography></Grid>
                <Grid item xs={6} sm={4}><Typography variant="caption" color="text.secondary">PAN Number</Typography><Typography variant="body2" fontWeight="bold">{selectedApp.pancardnumber}</Typography></Grid>
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">PAN Card File</Typography>
                  {selectedApp.pancardlink ? (
                    <Box sx={{ mt: 0.5 }}>
                      <Button
                        variant="outlined"
                        size="small"
                        component="a"
                        href={selectedApp.pancardlink}
                        target="_blank"
                        startIcon={<LaunchIcon />}
                      >
                        View / Download PAN Card Document
                      </Button>
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.secondary">No PAN card document attached</Typography>
                  )}
                </Grid>
              </Grid>

              {/* Admin Audit & Remarks */}
              {selectedApp.adminremarks && (
                <Box sx={{ mt: 3, p: 2, bgcolor: "#f8fafc", borderRadius: 1.5, borderLeft: "4px solid #3b82f6" }}>
                  <Typography variant="caption" fontWeight="bold" color="text.secondary">
                    Admin Review Remarks ({selectedApp.actionby || "Admin"})
                  </Typography>
                  <Typography variant="body2">{selectedApp.adminremarks}</Typography>
                  {selectedApp.createduserid && (
                    <Typography variant="caption" display="block" sx={{ mt: 0.5, color: "success.main" }}>
                      User ID Created: <b>{selectedApp.createduserid}</b>
                    </Typography>
                  )}
                </Box>
              )}
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          {selectedApp && selectedApp.status === "Pending" && (
            <>
              <Button color="error" onClick={() => { setDetailModalOpen(false); openActionDialog(selectedApp, "Reject"); }}>
                Reject
              </Button>
              <Button color="warning" onClick={() => { setDetailModalOpen(false); openActionDialog(selectedApp, "Hold"); }}>
                Hold
              </Button>
              <Button variant="contained" color="success" onClick={() => { setDetailModalOpen(false); openActionDialog(selectedApp, "Approve"); }}>
                Approve & Provision Account
              </Button>
            </>
          )}
          <Button onClick={() => setDetailModalOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* ========================================================= */}
      {/* DIALOG 2: Action Prompt (Approve / Reject / Hold)         */}
      {/* ========================================================= */}
      <Dialog open={actionDialogOpen} onClose={() => setActionDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {actionType === "Approve" ? "Approve Application & Create Login" : `${actionType} Application`}
        </DialogTitle>
        <DialogContent>
          {actionResult ? (
            <Box sx={{ py: 2 }}>
              <Alert severity="success" sx={{ mb: 2 }}>
                Account has been created and provisioned successfully!
              </Alert>
              <Paper variant="outlined" sx={{ p: 2, bgcolor: "#f8fafc" }}>
                <Typography variant="subtitle2" fontWeight="bold">Created Login Credentials</Typography>
                <Typography variant="body2" sx={{ mt: 1 }}><b>User ID / Email:</b> <code>{actionResult.email}</code></Typography>
                <Typography variant="body2"><b>Temporary Password:</b> <code>{actionResult.password}</code></Typography>
                <Typography variant="body2"><b>Role:</b> {actionResult.role}</Typography>
                <Divider sx={{ my: 1.5 }} />
                <Typography variant="body2" color={actionResult.mailsent ? "success.main" : "warning.main"}>
                  <b>Email Delivery:</b> {actionResult.mailsent ? "Credentials successfully sent to candidate's email." : `Email notification queued / fallback (${actionResult.mailerror || "SMTP not configured"})`}
                </Typography>
              </Paper>
            </Box>
          ) : (
            <Box sx={{ pt: 1 }}>
              {actionType === "Approve" && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  Approving this application will automatically:
                  <ul style={{ margin: "4px 0 0 16px", padding: 0 }}>
                    <li>Create an active User record with role <b>Faculty</b></li>
                    <li>Populate Bank Details into <b>userbankaccountds</b></li>
                    <li>Populate Signature into <b>usersignatureds</b></li>
                    <li>Populate Employment Profile into <b>useremploymentdetailds</b></li>
                    <li>Store custom attributes in <b>usercustomfieldds</b></li>
                    <li>Dispatch an email with login credentials to <b>{selectedApp?.email}</b></li>
                  </ul>
                </Alert>
              )}

              <TextField
                fullWidth
                multiline
                rows={3}
                label="Admin Remarks / Justification"
                value={actionRemarks}
                onChange={(e) => setActionRemarks(e.target.value)}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          {actionResult ? (
            <Button variant="contained" onClick={() => setActionDialogOpen(false)}>
              Done
            </Button>
          ) : (
            <>
              <Button onClick={() => setActionDialogOpen(false)} disabled={actionProcessing}>
                Cancel
              </Button>
              <Button
                variant="contained"
                color={actionType === "Approve" ? "success" : actionType === "Hold" ? "warning" : "error"}
                onClick={handleExecuteAction}
                disabled={actionProcessing}
              >
                {actionProcessing ? <CircularProgress size={24} color="inherit" /> : `Confirm ${actionType}`}
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>
    </Container>
  );
}
