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
  InputAdornment,
  Switch,
  FormControlLabel,
  Stack,
  Select,
  FormControl,
  InputLabel
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import VisibilityIcon from "@mui/icons-material/Visibility";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import PauseCircleFilledIcon from "@mui/icons-material/PauseCircleFilled";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import LaunchIcon from "@mui/icons-material/Launch";
import DeleteIcon from "@mui/icons-material/Delete";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import RefreshIcon from "@mui/icons-material/Refresh";
import BuildIcon from "@mui/icons-material/Build";
import DynamicFormIcon from "@mui/icons-material/DynamicForm";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import PostAddIcon from "@mui/icons-material/PostAdd";

export default function EvaluatorRegistrationAdminPage() {
  const colid = global1.colid || 1;
  const adminUser = global1.user || "admin";

  const [tabIndex, setTabIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // ==========================================
  // Catalogs
  // ==========================================
  const [userModelCatalog, setUserModelCatalog] = useState({ essential: [], optional: [] });
  const [customFieldsCatalog, setCustomFieldsCatalog] = useState([]);

  // ==========================================
  // Tab 0: Forms & Form Builder State
  // ==========================================
  const [forms, setForms] = useState([]);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [editingFormId, setEditingFormId] = useState(null);

  // Form Builder fields state
  const [formTitle, setFormTitle] = useState("Evaluator / Faculty Registration Form");
  const [formDescription, setFormDescription] = useState("Please fill the registration form with accurate information.");
  const [targetRole, setTargetRole] = useState("Evaluator");
  const [validUntil, setValidUntil] = useState("");
  const [maxSubmissions, setMaxSubmissions] = useState("");
  const [includeBankDetails, setIncludeBankDetails] = useState(true);
  const [includeSignature, setIncludeSignature] = useState(true);
  const [includePhoto, setIncludePhoto] = useState(true);
  const [configuredFields, setConfiguredFields] = useState([]);

  // Add field dropdowns
  const [selectedModelFieldKey, setSelectedModelFieldKey] = useState("");
  const [selectedCustomFieldKey, setSelectedCustomFieldKey] = useState("");

  // Create Custom Field dialog inside builder
  const [newCustomFieldDialogOpen, setNewCustomFieldDialogOpen] = useState(false);
  const [newCustomFieldName, setNewCustomFieldName] = useState("");
  const [newCustomFieldLabel, setNewCustomFieldLabel] = useState("");
  const [newCustomFieldType, setNewCustomFieldType] = useState("text");
  const [newCustomFieldOptions, setNewCustomFieldOptions] = useState("");
  const [creatingCustomField, setCreatingCustomField] = useState(false);

  // ==========================================
  // Tab 1: Submissions & Approvals State
  // ==========================================
  const [submissions, setSubmissions] = useState([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, hold: 0, rejected: 0 });
  const [statusFilter, setStatusFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [formFilter, setFormFilter] = useState("All");

  // Detailed application view dialog
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  // Approval / Action Dialog
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState("");
  const [actionRemarks, setActionRemarks] = useState("");
  const [actionProcessing, setActionProcessing] = useState(false);
  const [actionResult, setActionResult] = useState(null);

  useEffect(() => {
    loadCatalogs();
    loadForms();
  }, [colid]);

  useEffect(() => {
    if (tabIndex === 1) {
      loadSubmissions();
    }
  }, [tabIndex, colid, statusFilter, formFilter]);

  const loadCatalogs = async () => {
    try {
      const [userRes, customRes] = await Promise.all([
        ep1.get("/api/v2/evaluator-registration/user-model-catalog"),
        ep1.get("/api/v2/evaluator-registration/custom-fields-catalog", { params: { colid } })
      ]);
      if (userRes.data?.status === "Success") {
        setUserModelCatalog(userRes.data.data);
      }
      if (customRes.data?.status === "Success") {
        setCustomFieldsCatalog(customRes.data.data || []);
      }
    } catch (err) {
      console.error("Error loading catalogs:", err);
    }
  };

  const loadForms = async () => {
    setLoading(true);
    try {
      const res = await ep1.get("/api/v2/evaluator-registration/forms", { params: { colid } });
      if (res.data?.status === "Success") {
        setForms(res.data.data || []);
      }
    } catch (err) {
      setErrorMsg("Failed to load registration forms");
    } finally {
      setLoading(false);
    }
  };

  const loadSubmissions = async () => {
    setLoading(true);
    try {
      const params = { colid, status: statusFilter, search: searchQuery };
      if (formFilter !== "All") params.formid = formFilter;
      const res = await ep1.get("/api/v2/evaluator-registration/submissions", { params });
      if (res.data?.status === "Success") {
        setSubmissions(res.data.data || []);
        if (res.data.stats) setStats(res.data.stats);
      }
    } catch (err) {
      setErrorMsg("Failed to load applicant submissions");
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------
  // Form Builder Handlers
  // -------------------------------------------------------------
  const openNewFormDialog = () => {
    setEditingFormId(null);
    setFormTitle("Evaluator / Faculty Registration Form");
    setFormDescription("Please fill the registration form with accurate information.");
    setTargetRole("Evaluator");
    setValidUntil("");
    setMaxSubmissions("");
    setIncludeBankDetails(true);
    setIncludeSignature(true);
    setIncludePhoto(true);

    // Initial default core fields from User Model
    const defaults = (userModelCatalog.essential || []).map((f, idx) => ({
      id: `f_${Date.now()}_${idx}`,
      fieldname: f.fieldname,
      label: f.label,
      source: "user_model",
      type: f.type,
      options: f.options || [],
      required: f.required !== false,
      section: "basic"
    }));

    setConfiguredFields(defaults);
    setFormDialogOpen(true);
  };

  const openEditFormDialog = (form) => {
    setEditingFormId(form._id);
    setFormTitle(form.title || "");
    setFormDescription(form.description || "");
    setTargetRole(form.targetRole || "Evaluator");
    setValidUntil(form.validUntil ? form.validUntil.slice(0, 10) : "");
    setMaxSubmissions(form.maxSubmissions || "");
    setIncludeBankDetails(form.includeBankDetails !== false);
    setIncludeSignature(form.includeSignature !== false);
    setIncludePhoto(form.includePhoto !== false);
    setConfiguredFields(form.fields || []);
    setFormDialogOpen(true);
  };

  const handleAddFieldFromUserModel = () => {
    if (!selectedModelFieldKey) return;
    const allModelFields = [...(userModelCatalog.essential || []), ...(userModelCatalog.optional || [])];
    const item = allModelFields.find((f) => f.fieldname === selectedModelFieldKey);
    if (!item) return;

    if (configuredFields.some((cf) => cf.fieldname === item.fieldname)) {
      alert(`Field "${item.label}" is already added to the form.`);
      return;
    }

    const newF = {
      id: `f_um_${Date.now()}`,
      fieldname: item.fieldname,
      label: item.label,
      source: "user_model",
      type: item.type || "text",
      options: item.options || [],
      required: false,
      section: "personal"
    };
    setConfiguredFields([...configuredFields, newF]);
    setSelectedModelFieldKey("");
  };

  const handleAddFieldFromCustomCatalog = () => {
    if (!selectedCustomFieldKey) return;
    const item = customFieldsCatalog.find((cf) => cf.fieldname === selectedCustomFieldKey);
    if (!item) return;

    if (configuredFields.some((cf) => cf.fieldname === item.fieldname)) {
      alert(`Custom field "${item.label}" is already added to the form.`);
      return;
    }

    const newF = {
      id: `f_cf_${Date.now()}`,
      fieldname: item.fieldname,
      label: item.label,
      source: "custom_field",
      type: item.type || "text",
      options: item.options || [],
      required: false,
      section: "custom"
    };
    setConfiguredFields([...configuredFields, newF]);
    setSelectedCustomFieldKey("");
  };

  const handleCreateNewCustomField = async () => {
    if (!newCustomFieldName.trim() || !newCustomFieldLabel.trim()) {
      alert("Please provide both field name and label");
      return;
    }
    setCreatingCustomField(true);
    try {
      const optionsArr = newCustomFieldOptions
        ? newCustomFieldOptions.split(",").map((o) => o.trim()).filter(Boolean)
        : [];
      const res = await ep1.post("/api/v2/evaluator-registration/custom-fields", {
        colid,
        fieldname: newCustomFieldName.trim(),
        label: newCustomFieldLabel.trim(),
        type: newCustomFieldType,
        options: optionsArr
      });
      if (res.data?.status === "Success") {
        const created = res.data.data;
        setCustomFieldsCatalog([created, ...customFieldsCatalog]);

        // Auto add to active form fields
        const newF = {
          id: `f_cf_${Date.now()}`,
          fieldname: created.fieldname,
          label: created.label,
          source: "custom_field",
          type: created.type || "text",
          options: created.options || [],
          required: false,
          section: "custom"
        };
        setConfiguredFields([...configuredFields, newF]);

        setNewCustomFieldDialogOpen(false);
        setNewCustomFieldName("");
        setNewCustomFieldLabel("");
        setNewCustomFieldOptions("");
      } else {
        alert(res.data?.message || "Failed to create custom field");
      }
    } catch (err) {
      alert(err.response?.data?.message || "Error creating custom field");
    } finally {
      setCreatingCustomField(false);
    }
  };

  const handleRemoveField = (idx) => {
    const updated = [...configuredFields];
    updated.splice(idx, 1);
    setConfiguredFields(updated);
  };

  const handleMoveField = (idx, direction) => {
    if (direction === "up" && idx === 0) return;
    if (direction === "down" && idx === configuredFields.length - 1) return;
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    const updated = [...configuredFields];
    const [moved] = updated.splice(idx, 1);
    updated.splice(targetIdx, 0, moved);
    setConfiguredFields(updated);
  };

  const handleToggleRequired = (idx) => {
    const updated = [...configuredFields];
    updated[idx].required = !updated[idx].required;
    setConfiguredFields(updated);
  };

  const handleSaveForm = async () => {
    if (!formTitle.trim()) {
      alert("Please enter a title for the registration form");
      return;
    }
    if (configuredFields.length === 0) {
      alert("Please add at least one field to the form");
      return;
    }

    try {
      const payload = {
        id: editingFormId,
        colid,
        title: formTitle.trim(),
        description: formDescription.trim(),
        targetRole,
        validUntil: validUntil || null,
        maxSubmissions: maxSubmissions ? Number(maxSubmissions) : null,
        includeBankDetails,
        includeSignature,
        includePhoto,
        fields: configuredFields,
        createdby: adminUser
      };

      const res = await ep1.post("/api/v2/evaluator-registration/forms", payload);
      if (res.data?.status === "Success") {
        setSuccessMsg(editingFormId ? "Form updated successfully!" : "Form created successfully!");
        setFormDialogOpen(false);
        loadForms();
      } else {
        setErrorMsg(res.data?.message || "Failed to save form");
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Error saving form");
    }
  };

  const handleDeleteForm = async (id) => {
    if (!window.confirm("Are you sure you want to delete this registration form?")) return;
    try {
      const res = await ep1.post("/api/v2/evaluator-registration/forms-delete", { id, colid });
      if (res.data?.status === "Success") {
        setSuccessMsg("Form deleted successfully");
        loadForms();
      } else {
        setErrorMsg(res.data?.message || "Failed to delete form");
      }
    } catch (err) {
      setErrorMsg("Error deleting form");
    }
  };

  // -------------------------------------------------------------
  // Action Handlers (Approve / Reject / Hold)
  // -------------------------------------------------------------
  const openActionDialog = (submission, type) => {
    setSelectedSubmission(submission);
    setActionType(type);
    setActionRemarks("");
    setActionResult(null);
    setActionDialogOpen(true);
  };

  const executeApprovalAction = async () => {
    if (!selectedSubmission || !actionType) return;
    setActionProcessing(true);
    try {
      const res = await ep1.post("/api/v2/evaluator-registration/process-action", {
        submissionId: selectedSubmission._id,
        colid,
        action: actionType,
        remarks: actionRemarks,
        reviewedby: adminUser
      });

      if (res.data?.status === "Success") {
        setActionResult(res.data);
        setSuccessMsg(res.data.message || `Applicant status updated to ${actionType}`);
        loadSubmissions();
      } else {
        alert(res.data?.message || "Failed to execute action");
      }
    } catch (err) {
      alert(err.response?.data?.message || "Error processing applicant action");
    } finally {
      setActionProcessing(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setSuccessMsg("Link copied to clipboard!");
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  const getPublicLink = (form) => {
    return `${window.location.origin}/evaluator-registration?colid=${colid}&token=${form.token}`;
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 3, mb: 6 }}>
      {/* Header */}
      <Paper elevation={3} sx={{ p: 3, mb: 3, borderRadius: 2, background: "linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)", color: "#fff" }}>
        <Grid container alignItems="center" justifyContent="space-between">
          <Grid item xs={12} md={8}>
            <Typography variant="h4" fontWeight="bold" sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <DynamicFormIcon fontSize="large" /> Evaluator / Faculty Registration Builder
            </Typography>
            <Typography variant="body1" sx={{ mt: 0.5, opacity: 0.9 }}>
              Completely dynamic form creation. Add any fields from the User Model or Custom Fields, toggle bank/signature sections, share links, and automate user login creation on approval.
            </Typography>
          </Grid>
          <Grid item xs={12} md={4} sx={{ textAlign: { xs: "left", md: "right" }, mt: { xs: 2, md: 0 } }}>
            <Button
              variant="contained"
              color="secondary"
              startIcon={<PostAddIcon />}
              onClick={openNewFormDialog}
              sx={{ fontWeight: "bold", px: 3, py: 1.2, backgroundColor: "#ff9800", "&:hover": { backgroundColor: "#f57c00" } }}
            >
              + Create Registration Form
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Notifications */}
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

      {/* Navigation Tabs */}
      <Paper elevation={2} sx={{ mb: 3, borderRadius: 2 }}>
        <Tabs
          value={tabIndex}
          onChange={(e, v) => setTabIndex(v)}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
        >
          <Tab icon={<BuildIcon />} iconPosition="start" label={`Configured Forms (${forms.length})`} />
          <Tab
            icon={<PeopleAltIcon />}
            iconPosition="start"
            label={`Applicant Submissions (${stats.total || submissions.length})`}
          />
        </Tabs>
      </Paper>

      {/* ========================================================================= */}
      {/* TAB 0: FORMS LIST & BUILDER */}
      {/* ========================================================================= */}
      {tabIndex === 0 && (
        <Box>
          <Grid container spacing={3}>
            {forms.map((form) => {
              const shareLink = getPublicLink(form);
              return (
                <Grid item xs={12} md={6} lg={4} key={form._id}>
                  <Card elevation={3} sx={{ borderRadius: 2, height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                    <CardContent>
                      <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                        <Box>
                          <Typography variant="h6" fontWeight="bold" color="primary">
                            {form.title}
                          </Typography>
                          <Typography variant="caption" color="textSecondary" display="block">
                            Target Role: <strong>{form.targetRole || "Evaluator"}</strong>
                          </Typography>
                        </Box>
                        <Chip
                          label={form.status === "Active" ? "Active" : "Inactive"}
                          color={form.status === "Active" ? "success" : "default"}
                          size="small"
                        />
                      </Box>

                      <Typography variant="body2" sx={{ my: 1.5, color: "#555" }}>
                        {form.description || "No description provided."}
                      </Typography>

                      <Divider sx={{ my: 1.5 }} />

                      <Grid container spacing={1} sx={{ fontSize: "13px", color: "#666" }}>
                        <Grid item xs={6}>
                          <strong>Configured Fields:</strong> {form.fields?.length || 0}
                        </Grid>
                        <Grid item xs={6}>
                          <strong>Submissions:</strong> {form.submissionCount || 0}
                        </Grid>
                        <Grid item xs={6}>
                          <strong>Bank Details:</strong> {form.includeBankDetails ? "Yes" : "No"}
                        </Grid>
                        <Grid item xs={6}>
                          <strong>Signature:</strong> {form.includeSignature ? "Yes" : "No"}
                        </Grid>
                        {form.validUntil && (
                          <Grid item xs={12}>
                            <strong>Expires:</strong> {new Date(form.validUntil).toLocaleDateString()}
                          </Grid>
                        )}
                      </Grid>

                      {/* Shareable Link Box */}
                      <Box
                        sx={{
                          mt: 2,
                          p: 1.2,
                          backgroundColor: "#f5f5f5",
                          borderRadius: 1,
                          border: "1px dashed #ccc",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          overflow: "hidden"
                        }}
                      >
                        <Typography
                          variant="caption"
                          sx={{
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            maxWidth: "80%",
                            fontFamily: "monospace"
                          }}
                        >
                          {shareLink}
                        </Typography>
                        <Box>
                          <Tooltip title="Copy Public Link">
                            <IconButton size="small" color="primary" onClick={() => copyToClipboard(shareLink)}>
                              <ContentCopyIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Open Public Form">
                            <IconButton size="small" color="secondary" onClick={() => window.open(shareLink, "_blank")}>
                              <LaunchIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </Box>
                    </CardContent>

                    <Box sx={{ p: 2, pt: 0, display: "flex", justifyContent: "flex-end", gap: 1 }}>
                      <Button size="small" variant="outlined" onClick={() => openEditFormDialog(form)}>
                        Edit Form
                      </Button>
                      <IconButton size="small" color="error" onClick={() => handleDeleteForm(form._id)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Card>
                </Grid>
              );
            })}

            {forms.length === 0 && !loading && (
              <Grid item xs={12}>
                <Paper sx={{ p: 5, textAlign: "center", borderRadius: 2 }}>
                  <DynamicFormIcon sx={{ fontSize: 60, color: "#aaa", mb: 1 }} />
                  <Typography variant="h6" color="textSecondary">
                    No dynamic registration forms configured yet.
                  </Typography>
                  <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
                    Click below to design your first custom Evaluator or Faculty registration link.
                  </Typography>
                  <Button variant="contained" color="primary" startIcon={<PostAddIcon />} onClick={openNewFormDialog}>
                    Create Registration Form
                  </Button>
                </Paper>
              </Grid>
            )}
          </Grid>
        </Box>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: SUBMISSIONS & APPROVAL WORKFLOW */}
      {/* ========================================================================= */}
      {tabIndex === 1 && (
        <Box>
          {/* Stats Bar */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6} sm={2.4}>
              <Card sx={{ bgcolor: "#e3f2fd", textAlign: "center", p: 1.5, borderRadius: 2 }}>
                <Typography variant="h5" fontWeight="bold" color="#1976d2">
                  {stats.total || 0}
                </Typography>
                <Typography variant="caption" fontWeight="medium">
                  Total Applications
                </Typography>
              </Card>
            </Grid>
            <Grid item xs={6} sm={2.4}>
              <Card sx={{ bgcolor: "#fff3e0", textAlign: "center", p: 1.5, borderRadius: 2 }}>
                <Typography variant="h5" fontWeight="bold" color="#ed6c02">
                  {stats.pending || 0}
                </Typography>
                <Typography variant="caption" fontWeight="medium">
                  Pending Review
                </Typography>
              </Card>
            </Grid>
            <Grid item xs={6} sm={2.4}>
              <Card sx={{ bgcolor: "#e8f5e9", textAlign: "center", p: 1.5, borderRadius: 2 }}>
                <Typography variant="h5" fontWeight="bold" color="#2e7d32">
                  {stats.approved || 0}
                </Typography>
                <Typography variant="caption" fontWeight="medium">
                  Approved & Created
                </Typography>
              </Card>
            </Grid>
            <Grid item xs={6} sm={2.4}>
              <Card sx={{ bgcolor: "#ede7f6", textAlign: "center", p: 1.5, borderRadius: 2 }}>
                <Typography variant="h5" fontWeight="bold" color="#673ab7">
                  {stats.hold || 0}
                </Typography>
                <Typography variant="caption" fontWeight="medium">
                  On Hold
                </Typography>
              </Card>
            </Grid>
            <Grid item xs={6} sm={2.4}>
              <Card sx={{ bgcolor: "#ffebee", textAlign: "center", p: 1.5, borderRadius: 2 }}>
                <Typography variant="h5" fontWeight="bold" color="#d32f2f">
                  {stats.rejected || 0}
                </Typography>
                <Typography variant="caption" fontWeight="medium">
                  Rejected
                </Typography>
              </Card>
            </Grid>
          </Grid>

          {/* Filters */}
          <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Search by name, email, phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && loadSubmissions()}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" />
                      </InputAdornment>
                    )
                  }}
                />
              </Grid>
              <Grid item xs={6} sm={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={statusFilter}
                    label="Status"
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <MenuItem value="All">All Statuses</MenuItem>
                    <MenuItem value="Pending">Pending</MenuItem>
                    <MenuItem value="Approved">Approved</MenuItem>
                    <MenuItem value="Hold">On Hold</MenuItem>
                    <MenuItem value="Rejected">Rejected</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6} sm={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Filter By Form</InputLabel>
                  <Select
                    value={formFilter}
                    label="Filter By Form"
                    onChange={(e) => setFormFilter(e.target.value)}
                  >
                    <MenuItem value="All">All Forms</MenuItem>
                    {forms.map((f) => (
                      <MenuItem key={f._id} value={f._id}>
                        {f.title}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={2} textAlign="right">
                <Button variant="outlined" startIcon={<RefreshIcon />} onClick={loadSubmissions}>
                  Refresh
                </Button>
              </Grid>
            </Grid>
          </Paper>

          {/* Submissions Table */}
          <TableContainer component={Paper} elevation={2} sx={{ borderRadius: 2 }}>
            <Table>
              <TableHead sx={{ bgcolor: "#f5f5f5" }}>
                <TableRow>
                  <TableCell><strong>Ref #</strong></TableCell>
                  <TableCell><strong>Applicant Name</strong></TableCell>
                  <TableCell><strong>Email</strong></TableCell>
                  <TableCell><strong>Phone</strong></TableCell>
                  <TableCell><strong>Role</strong></TableCell>
                  <TableCell><strong>Form Title</strong></TableCell>
                  <TableCell><strong>Date</strong></TableCell>
                  <TableCell><strong>Status</strong></TableCell>
                  <TableCell align="center"><strong>Actions</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {submissions.map((sub) => {
                  let statusColor = "default";
                  if (sub.status === "Approved") statusColor = "success";
                  if (sub.status === "Hold") statusColor = "warning";
                  if (sub.status === "Rejected") statusColor = "error";
                  if (sub.status === "Pending") statusColor = "info";

                  return (
                    <TableRow key={sub._id} hover>
                      <TableCell sx={{ fontFamily: "monospace", fontSize: "12px" }}>
                        {sub.applicationNumber || sub._id.slice(-6)}
                      </TableCell>
                      <TableCell><strong>{sub.applicantName}</strong></TableCell>
                      <TableCell>{sub.applicantEmail}</TableCell>
                      <TableCell>{sub.applicantPhone}</TableCell>
                      <TableCell>{sub.applicantRole || "Evaluator"}</TableCell>
                      <TableCell>{sub.formTitle || "Registration"}</TableCell>
                      <TableCell>{new Date(sub.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Chip label={sub.status} color={statusColor} size="small" />
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="View Full Details">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => {
                              setSelectedSubmission(sub);
                              setDetailModalOpen(true);
                            }}
                          >
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>

                        {sub.status === "Pending" && (
                          <>
                            <Tooltip title="Approve & Create Login">
                              <IconButton
                                size="small"
                                color="success"
                                onClick={() => openActionDialog(sub, "Approve")}
                              >
                                <CheckCircleIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Put on Hold">
                              <IconButton
                                size="small"
                                color="warning"
                                onClick={() => openActionDialog(sub, "Hold")}
                              >
                                <PauseCircleFilledIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Reject">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => openActionDialog(sub, "Reject")}
                              >
                                <CancelIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}

                {submissions.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                      <Typography color="textSecondary">No candidate registrations found.</Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* ========================================================================= */}
      {/* DIALOG: FORM BUILDER */}
      {/* ========================================================================= */}
      <Dialog open={formDialogOpen} onClose={() => setFormDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ bgcolor: "#1e3c72", color: "#fff", fontWeight: "bold" }}>
          {editingFormId ? "Edit Registration Form" : "Create Dynamic Registration Form"}
        </DialogTitle>
        <DialogContent sx={{ p: 3, mt: 1 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={8}>
              <TextField
                fullWidth
                label="Form Title"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="e.g. External Evaluator Registration 2026"
                required
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Target User Role"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                placeholder="e.g. Evaluator, Faculty, Examiner"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Form Instructions / Description"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="date"
                label="Link Expiration Date (Optional)"
                InputLabelProps={{ shrink: true }}
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Max Submissions Allowed (Optional)"
                value={maxSubmissions}
                onChange={(e) => setMaxSubmissions(e.target.value)}
              />
            </Grid>

            {/* Modular Section Toggles */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" fontWeight="bold" sx={{ mt: 1, mb: 0.5, color: "#333" }}>
                Optional Sections & Attachments:
              </Typography>
              <Paper variant="outlined" sx={{ p: 1.5, bgcolor: "#fafafa" }}>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={includePhoto}
                        onChange={(e) => setIncludePhoto(e.target.checked)}
                        color="primary"
                      />
                    }
                    label="Applicant Photo Upload"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={includeSignature}
                        onChange={(e) => setIncludeSignature(e.target.checked)}
                        color="primary"
                      />
                    }
                    label="Signature Upload (UserSignature)"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={includeBankDetails}
                        onChange={(e) => setIncludeBankDetails(e.target.checked)}
                        color="primary"
                      />
                    }
                    label="Bank Account Details (UserBankAccount)"
                  />
                </Stack>
              </Paper>
            </Grid>

            {/* Dynamic Fields Section */}
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
                <Typography variant="h6" fontWeight="bold">
                  Dynamic Form Fields ({configuredFields.length})
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  Core User Model fields are added by default. You can add ANY User Model or Custom Field.
                </Typography>
              </Box>

              {/* Add Field Controls */}
              <Grid container spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
                <Grid item xs={12} sm={5}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Add Field From User Model</InputLabel>
                    <Select
                      value={selectedModelFieldKey}
                      label="Add Field From User Model"
                      onChange={(e) => setSelectedModelFieldKey(e.target.value)}
                    >
                      <MenuItem value="">
                        <em>-- Select from User Model --</em>
                      </MenuItem>
                      <MenuItem disabled value="divider1">
                        <strong>-- Essential User Fields --</strong>
                      </MenuItem>
                      {(userModelCatalog.essential || []).map((f) => (
                        <MenuItem key={f.fieldname} value={f.fieldname}>
                          {f.label} ({f.fieldname})
                        </MenuItem>
                      ))}
                      <MenuItem disabled value="divider2">
                        <strong>-- Other Profile Fields --</strong>
                      </MenuItem>
                      {(userModelCatalog.optional || []).map((f) => (
                        <MenuItem key={f.fieldname} value={f.fieldname}>
                          {f.label} ({f.fieldname})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={2}>
                  <Button
                    fullWidth
                    variant="contained"
                    size="small"
                    onClick={handleAddFieldFromUserModel}
                    disabled={!selectedModelFieldKey}
                  >
                    + Add Field
                  </Button>
                </Grid>

                <Grid item xs={12} sm={3}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Existing Custom Field</InputLabel>
                    <Select
                      value={selectedCustomFieldKey}
                      label="Existing Custom Field"
                      onChange={(e) => setSelectedCustomFieldKey(e.target.value)}
                    >
                      <MenuItem value="">
                        <em>-- Select Custom Field --</em>
                      </MenuItem>
                      {customFieldsCatalog.map((cf) => (
                        <MenuItem key={cf.fieldname} value={cf.fieldname}>
                          {cf.label} ({cf.fieldname})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={2}>
                  <Button
                    fullWidth
                    variant="outlined"
                    size="small"
                    onClick={handleAddFieldFromCustomCatalog}
                    disabled={!selectedCustomFieldKey}
                  >
                    + Add Custom
                  </Button>
                </Grid>
                <Grid item xs={12} textAlign="right">
                  <Button
                    size="small"
                    color="secondary"
                    startIcon={<AddCircleOutlineIcon />}
                    onClick={() => setNewCustomFieldDialogOpen(true)}
                  >
                    Create Brand New Custom Field
                  </Button>
                </Grid>
              </Grid>

              {/* Configured Fields Table */}
              <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 320 }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: "#f5f5f5" }}>
                    <TableRow>
                      <TableCell width="60">#</TableCell>
                      <TableCell>Field Label</TableCell>
                      <TableCell>Field Key</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Source</TableCell>
                      <TableCell align="center">Required</TableCell>
                      <TableCell align="center">Reorder / Remove</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {configuredFields.map((f, idx) => (
                      <TableRow key={f.id || idx}>
                        <TableCell>{idx + 1}</TableCell>
                        <TableCell>
                          <strong>{f.label}</strong>
                        </TableCell>
                        <TableCell sx={{ fontFamily: "monospace", fontSize: "12px" }}>{f.fieldname}</TableCell>
                        <TableCell>
                          <Chip label={f.type} size="small" variant="outlined" />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={f.source === "user_model" ? "User Model" : "Custom Field"}
                            size="small"
                            color={f.source === "user_model" ? "primary" : "secondary"}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Switch
                            size="small"
                            checked={!!f.required}
                            onChange={() => handleToggleRequired(idx)}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <IconButton
                            size="small"
                            disabled={idx === 0}
                            onClick={() => handleMoveField(idx, "up")}
                          >
                            <ArrowUpwardIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            disabled={idx === configuredFields.length - 1}
                            onClick={() => handleMoveField(idx, "down")}
                          >
                            <ArrowDownwardIcon fontSize="small" />
                          </IconButton>
                          <IconButton size="small" color="error" onClick={() => handleRemoveField(idx)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2, bgcolor: "#f5f5f5" }}>
          <Button onClick={() => setFormDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" color="primary" onClick={handleSaveForm}>
            {editingFormId ? "Update Form" : "Save & Generate Link"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ========================================================================= */}
      {/* DIALOG: CREATE NEW CUSTOM FIELD */}
      {/* ========================================================================= */}
      <Dialog open={newCustomFieldDialogOpen} onClose={() => setNewCustomFieldDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: "bold" }}>Create New Custom Field</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField
            fullWidth
            label="Field Key Name"
            placeholder="e.g. medical_council_reg_no"
            value={newCustomFieldName}
            onChange={(e) => setNewCustomFieldName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_"))}
            helperText="Lowercase alphanumeric letters and underscores only."
            sx={{ mb: 2, mt: 1 }}
          />
          <TextField
            fullWidth
            label="Display Label"
            placeholder="e.g. Medical Council Registration Number"
            value={newCustomFieldLabel}
            onChange={(e) => setNewCustomFieldLabel(e.target.value)}
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Field Input Type</InputLabel>
            <Select
              value={newCustomFieldType}
              label="Field Input Type"
              onChange={(e) => setNewCustomFieldType(e.target.value)}
            >
              <MenuItem value="text">Text (Single Line)</MenuItem>
              <MenuItem value="textarea">Textarea (Multi-line)</MenuItem>
              <MenuItem value="number">Number</MenuItem>
              <MenuItem value="date">Date</MenuItem>
              <MenuItem value="select">Dropdown Select</MenuItem>
            </Select>
          </FormControl>
          {newCustomFieldType === "select" && (
            <TextField
              fullWidth
              label="Options (Comma separated)"
              placeholder="e.g. Option A, Option B, Option C"
              value={newCustomFieldOptions}
              onChange={(e) => setNewCustomFieldOptions(e.target.value)}
              helperText="Separate choices with commas."
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewCustomFieldDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleCreateNewCustomField}
            disabled={creatingCustomField}
          >
            {creatingCustomField ? <CircularProgress size={20} /> : "Save & Add to Form"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ========================================================================= */}
      {/* DIALOG: VIEW APPLICATION DETAIL */}
      {/* ========================================================================= */}
      <Dialog open={detailModalOpen} onClose={() => setDetailModalOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ bgcolor: "#1e3c72", color: "#fff", fontWeight: "bold" }}>
          Candidate Application Details: {selectedSubmission?.applicantName}
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          {selectedSubmission && (
            <Box>
              {/* Header Status Bar */}
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Box>
                  <Typography variant="caption" color="textSecondary">
                    Ref ID: {selectedSubmission.applicationNumber || selectedSubmission._id}
                  </Typography>
                  <Typography variant="body2">
                    Submitted on: {new Date(selectedSubmission.createdAt).toLocaleString()}
                  </Typography>
                </Box>
                <Chip
                  label={selectedSubmission.status}
                  color={
                    selectedSubmission.status === "Approved"
                      ? "success"
                      : selectedSubmission.status === "Hold"
                      ? "warning"
                      : selectedSubmission.status === "Rejected"
                      ? "error"
                      : "info"
                  }
                  size="medium"
                />
              </Box>

              <Divider sx={{ mb: 2 }} />

              {/* Dynamic Form Values */}
              <Typography variant="subtitle1" fontWeight="bold" color="primary" gutterBottom>
                Configured Field Values:
              </Typography>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                {Object.entries(selectedSubmission.fieldValues || {}).map(([key, val]) => (
                  <Grid item xs={12} sm={6} key={key}>
                    <Paper variant="outlined" sx={{ p: 1.5, bgcolor: "#fafafa" }}>
                      <Typography variant="caption" color="textSecondary" display="block">
                        {key.toUpperCase()}
                      </Typography>
                      <Typography variant="body1" fontWeight="medium">
                        {val !== null && val !== undefined && val !== "" ? String(val) : <em>Not Provided</em>}
                      </Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>

              {/* Custom Fields (if any) */}
              {selectedSubmission.customFields && Object.keys(selectedSubmission.customFields).length > 0 && (
                <>
                  <Typography variant="subtitle1" fontWeight="bold" color="secondary" gutterBottom>
                    Additional Custom Fields:
                  </Typography>
                  <Grid container spacing={2} sx={{ mb: 3 }}>
                    {Object.entries(selectedSubmission.customFields).map(([k, v]) => (
                      <Grid item xs={12} sm={6} key={k}>
                        <Paper variant="outlined" sx={{ p: 1.5, bgcolor: "#fff8e1" }}>
                          <Typography variant="caption" color="textSecondary" display="block">
                            {k}
                          </Typography>
                          <Typography variant="body1" fontWeight="medium">
                            {String(v)}
                          </Typography>
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
                </>
              )}

              {/* Bank Details (if applicable) */}
              {selectedSubmission.bankDetails && (
                <>
                  <Typography variant="subtitle1" fontWeight="bold" color="primary" gutterBottom>
                    Bank Account Information:
                  </Typography>
                  <Paper variant="outlined" sx={{ p: 2, mb: 3, bgcolor: "#f1f8e9" }}>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="caption" color="textSecondary">
                          Account Number
                        </Typography>
                        <Typography variant="body1" fontWeight="bold">
                          {selectedSubmission.bankDetails.accountnumber || "-"}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="caption" color="textSecondary">
                          Account Holder
                        </Typography>
                        <Typography variant="body1">
                          {selectedSubmission.bankDetails.accountholdername || "-"}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="caption" color="textSecondary">
                          Bank Name & Branch
                        </Typography>
                        <Typography variant="body1">
                          {selectedSubmission.bankDetails.bankname || "-"} (
                          {selectedSubmission.bankDetails.branchname || "-"})
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="caption" color="textSecondary">
                          IFSC Code
                        </Typography>
                        <Typography variant="body1" fontWeight="bold">
                          {selectedSubmission.bankDetails.ifsccode || "-"}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="caption" color="textSecondary">
                          PAN Card Number
                        </Typography>
                        <Typography variant="body1">
                          {selectedSubmission.bankDetails.pancardnumber || "-"}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Paper>
                </>
              )}

              {/* Attachments / Files */}
              <Typography variant="subtitle1" fontWeight="bold" color="primary" gutterBottom>
                Attachments & Verification:
              </Typography>
              <Grid container spacing={2} sx={{ mb: 2 }}>
                {selectedSubmission.photolink && (
                  <Grid item xs={12} sm={6}>
                    <Paper variant="outlined" sx={{ p: 1.5, textAlign: "center" }}>
                      <Typography variant="caption" display="block" sx={{ mb: 1 }}>
                        Applicant Photograph
                      </Typography>
                      <img
                        src={selectedSubmission.photolink}
                        alt="Candidate Photo"
                        style={{ maxHeight: 160, maxWidth: "100%", objectFit: "contain", borderRadius: 4 }}
                      />
                    </Paper>
                  </Grid>
                )}
                {selectedSubmission.signaturelink && (
                  <Grid item xs={12} sm={6}>
                    <Paper variant="outlined" sx={{ p: 1.5, textAlign: "center" }}>
                      <Typography variant="caption" display="block" sx={{ mb: 1 }}>
                        Specimen Signature
                      </Typography>
                      <img
                        src={selectedSubmission.signaturelink}
                        alt="Candidate Signature"
                        style={{ maxHeight: 100, maxWidth: "100%", objectFit: "contain", border: "1px dashed #ccc", padding: 4 }}
                      />
                    </Paper>
                  </Grid>
                )}
              </Grid>

              {/* Review History */}
              {selectedSubmission.reviewedby && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  Reviewed by <strong>{selectedSubmission.reviewedby}</strong> on{" "}
                  {new Date(selectedSubmission.reviewedat).toLocaleString()}.<br />
                  Remarks: {selectedSubmission.remarks || "None"}
                </Alert>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, bgcolor: "#f5f5f5" }}>
          <Button onClick={() => setDetailModalOpen(false)}>Close</Button>
          {selectedSubmission?.status === "Pending" && (
            <>
              <Button
                variant="outlined"
                color="warning"
                onClick={() => {
                  setDetailModalOpen(false);
                  openActionDialog(selectedSubmission, "Hold");
                }}
              >
                Put On Hold
              </Button>
              <Button
                variant="outlined"
                color="error"
                onClick={() => {
                  setDetailModalOpen(false);
                  openActionDialog(selectedSubmission, "Reject");
                }}
              >
                Reject Application
              </Button>
              <Button
                variant="contained"
                color="success"
                onClick={() => {
                  setDetailModalOpen(false);
                  openActionDialog(selectedSubmission, "Approve");
                }}
              >
                Approve & Create Account
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* ========================================================================= */}
      {/* DIALOG: ACTION CONFIRMATION (APPROVE / REJECT / HOLD) */}
      {/* ========================================================================= */}
      <Dialog open={actionDialogOpen} onClose={() => setActionDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: "bold" }}>
          {actionType === "Approve"
            ? "Approve Application & Create Account"
            : actionType === "Reject"
            ? "Reject Candidate Application"
            : "Put Application On Hold"}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {actionResult ? (
            <Box sx={{ mt: 1 }}>
              <Alert severity="success" sx={{ mb: 2 }}>
                Application successfully approved! Login account created.
              </Alert>
              {actionResult.credentials && (
                <Paper sx={{ p: 2, bgcolor: "#e8f5e9", borderRadius: 2, border: "1px solid #81c784" }}>
                  <Typography variant="subtitle2" fontWeight="bold" color="#2e7d32">
                    Generated Account Credentials:
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    <strong>Username:</strong> {actionResult.credentials.username}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Temporary Password:</strong> {actionResult.credentials.password}
                  </Typography>
                  <Button
                    size="small"
                    variant="outlined"
                    sx={{ mt: 1.5 }}
                    onClick={() =>
                      copyToClipboard(
                        `Username: ${actionResult.credentials.username}\nPassword: ${actionResult.credentials.password}`
                      )
                    }
                  >
                    Copy Credentials
                  </Button>
                </Paper>
              )}
              {actionResult.mailSent && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  Welcome email dispatched to candidate with login link and password.
                </Alert>
              )}
            </Box>
          ) : (
            <Box sx={{ mt: 1 }}>
              <Typography variant="body1" sx={{ mb: 2 }}>
                Candidate: <strong>{selectedSubmission?.applicantName}</strong> (
                {selectedSubmission?.applicantEmail})
              </Typography>
              {actionType === "Approve" && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  Approving this candidate will automatically:
                  <ul style={{ margin: "4px 0 0 16px", padding: 0 }}>
                    <li>Create an active account in the User model.</li>
                    <li>Generate a secure temporary password.</li>
                    <li>Populate Bank details to UserBankAccount and Signature to UserSignature.</li>
                    <li>Sync all custom fields.</li>
                    <li>Send welcome email with login credentials.</li>
                  </ul>
                </Alert>
              )}
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Admin Remarks / Justification"
                placeholder="Enter any notes or remarks..."
                value={actionRemarks}
                onChange={(e) => setActionRemarks(e.target.value)}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setActionDialogOpen(false)}>{actionResult ? "Close" : "Cancel"}</Button>
          {!actionResult && (
            <Button
              variant="contained"
              color={actionType === "Approve" ? "success" : actionType === "Reject" ? "error" : "warning"}
              onClick={executeApprovalAction}
              disabled={actionProcessing}
            >
              {actionProcessing ? <CircularProgress size={22} color="inherit" /> : `Confirm ${actionType}`}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Container>
  );
}
