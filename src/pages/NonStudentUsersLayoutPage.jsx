import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Breadcrumbs,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  Link,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography
} from "@mui/material";
import { DataGrid, GridToolbar } from "@mui/x-data-grid";
import {
  Close as CloseIcon,
  Delete as DeleteIcon,
  Description as DescriptionIcon,
  Download as DownloadIcon,
  Edit as EditIcon,
  OpenInNew as OpenInNewIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  UploadFile as UploadFileIcon
} from "@mui/icons-material";
import * as XLSX from "xlsx";
import MenuPageShell from "./MenuPageShell";
import ep1 from "../api/ep1";
import global1 from "./global1";

const cleanValue = (value) => {
  if (value === undefined || value === null || value === "") return "-";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

const titleCase = (value = "") => String(value)
  .replace(/^customFields\./, "")
  .replace(/([A-Z])/g, " $1")
  .replace(/_/g, " ")
  .replace(/\s+/g, " ")
  .trim()
  .replace(/^./, (char) => char.toUpperCase());

export default function NonStudentUsersLayoutPage() {
  const [users, setUsers] = useState([]);
  const [layouts, setLayouts] = useState([]);
  const [roles, setRoles] = useState([]);
  const [selectedRole, setSelectedRole] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [selectedRows, setSelectedRows] = useState([]);

  // Bulk Upload state
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkErrors, setBulkErrors] = useState([]);

  // Documents modal state
  const [docModalUser, setDocModalUser] = useState(null);
  const [docRequirements, setDocRequirements] = useState([]);
  const [userUploadedDocs, setUserUploadedDocs] = useState([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [uploadingDocId, setUploadingDocId] = useState("");
  const [selectedFiles, setSelectedFiles] = useState({});
  const [fileDescriptions, setFileDescriptions] = useState({});
  const [docMessage, setDocMessage] = useState("");
  const [docError, setDocError] = useState("");

  // Edit user modal state
  const [editUser, setEditUser] = useState(null);
  const [editValues, setEditValues] = useState({});
  const [editTab, setEditTab] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // Delete confirmation dialog state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [singleDeleteId, setSingleDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadMeta();
  }, []);

  useEffect(() => {
    loadUsers();
  }, [selectedRole]);

  const loadMeta = async () => {
    try {
      const [rolesRes, layoutRes] = await Promise.all([
        ep1.get("/api/v2/user-documents/roles", { params: { colid: global1.colid } }),
        ep1.get("/api/v2/user-profile-layouts", { params: { colid: global1.colid } })
      ]);
      const rawRoles = Array.isArray(rolesRes.data) ? rolesRes.data : [];
      const nonStudentRoles = rawRoles
        .filter((r) => r && !/^Student$/i.test(String(r)))
        .sort((a, b) => String(a).localeCompare(String(b)));
      setRoles(nonStudentRoles);
      setLayouts(layoutRes.data || []);
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.msg || "Failed to load metadata");
    }
  };

  const loadUsers = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await ep1.get("/api/v2/non-student-users", {
        params: {
          colid: global1.colid,
          role: selectedRole,
          search: searchTerm,
          limit: 2000
        }
      });
      setUsers(res.data?.users || []);
      setSelectedRows([]);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load non-student users");
    } finally {
      setLoading(false);
    }
  };

  // Layout fields for the selected role or aggregated across all non-student roles
  const activeLayoutFields = useMemo(() => {
    let fields = [];
    if (selectedRole && selectedRole !== "All") {
      fields = layouts.filter((item) => String(item.role).toLowerCase() === selectedRole.toLowerCase());
    } else {
      const seen = new Set();
      fields = layouts
        .filter((item) => !/^Student$/i.test(String(item.role || "")))
        .filter((item) => {
          if (seen.has(item.field)) return false;
          seen.add(item.field);
          return true;
        });
    }
    return fields.sort((a, b) => Number(a.taborder || 0) - Number(b.taborder || 0) || Number(a.order || 0) - Number(b.order || 0) || String(a.label || a.field).localeCompare(String(b.label || b.field)));
  }, [layouts, selectedRole]);

  // Flatten row data for DataGrid with layout fields & customFields
  const rows = useMemo(() => {
    return users.map((u) => {
      const custom = u.customFields instanceof Map
        ? Object.fromEntries(u.customFields)
        : (u.customFields || {});
      const row = { ...u };
      activeLayoutFields.forEach((field) => {
        const fieldKey = field.field;
        if (fieldKey.startsWith("customFields.")) {
          row[fieldKey] = custom[fieldKey.replace("customFields.", "")] ?? "";
        } else {
          row[fieldKey] = u[fieldKey] ?? custom[fieldKey] ?? "";
        }
      });
      return row;
    });
  }, [users, activeLayoutFields]);

  // Bulk Upload template download
  const downloadTemplate = () => {
    const baseHeaders = ["Name", "Email", "Role", "Phone", "Employee ID", "Department", "Designation", "Institution", "Gender", "Password"];
    const layoutHeaders = activeLayoutFields
      .filter((f) => !["name", "email", "role", "phone", "regno", "department", "designation", "institution", "gender", "password"].includes(f.field.toLowerCase()))
      .map((f) => f.label || titleCase(f.field));

    const allHeaders = [...baseHeaders, ...layoutHeaders];
    const sampleRole = selectedRole !== "All" ? selectedRole : "Faculty";
    const sampleRow = [
      "Dr. Ramesh Sharma",
      "ramesh.faculty@peoplesuniversity.edu.in",
      sampleRole,
      "9876543210",
      "EMP30901",
      "Computer Science & Engineering",
      "Associate Professor",
      "Peoples University",
      "Male",
      "User@123",
      ...layoutHeaders.map(() => "")
    ];

    const ws = XLSX.utils.aoa_to_sheet([allHeaders, sampleRow]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "NonStudentUsers");
    XLSX.writeFile(wb, `non_student_users_${sampleRole}_template.xlsx`);
  };

  // Handle Bulk Upload file
  const handleBulkUpload = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setBulkUploading(true);
    setError("");
    setMessage("");
    setBulkErrors([]);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[firstSheetName];
        const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

        if (!rawRows.length) {
          setError("Spreadsheet is empty. No rows found.");
          setBulkUploading(false);
          return;
        }

        const res = await ep1.post("/api/v2/non-student-users/bulk-upload", {
          colid: global1.colid,
          items: rawRows,
          user: global1.user
        });

        setMessage(res.data?.message || `Successfully processed ${res.data?.saved || 0} user(s).`);
        if (res.data?.errors?.length) {
          setBulkErrors(res.data.errors);
        }
        await loadUsers();
      } catch (err) {
        setError(err.response?.data?.message || err.message || "Failed to process bulk upload file");
      } finally {
        setBulkUploading(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Open Document Modal and load configured document requirements from /userprofiledetailrequirements
  const openDocModal = async (user) => {
    setDocModalUser(user);
    setDocMessage("");
    setDocError("");
    setSelectedFiles({});
    setFileDescriptions({});
    setDocsLoading(true);
    try {
      const [reqRes, docRes] = await Promise.all([
        ep1.get("/api/v2/user-profile-detail-requirements", {
          params: { colid: global1.colid, role: user.role, status: "Active" }
        }),
        ep1.get("/api/v2/user-uploaded-documents", {
          params: { colid: global1.colid, role: user.role, owneruser: user.email }
        })
      ]);
      setDocRequirements(reqRes.data?.data || []);
      setUserUploadedDocs(docRes.data || []);
    } catch (err) {
      setDocError(err.response?.data?.message || err.response?.data?.msg || "Failed to load document requirements");
    } finally {
      setDocsLoading(false);
    }
  };

  // Upload configured document for user
  const uploadDocForUser = async (requirement) => {
    const file = selectedFiles[requirement._id];
    if (!file) {
      setDocError(`Please select a file to upload for ${requirement.documentname}`);
      return;
    }
    setUploadingDocId(requirement._id);
    setDocError("");
    setDocMessage("");
    try {
      const payload = new FormData();
      payload.append("file", file);
      payload.append("colid", global1.colid);
      payload.append("role", docModalUser.role);
      payload.append("documentrequirementid", requirement._id);
      payload.append("documentname", requirement.documentname);
      payload.append("description", fileDescriptions[requirement._id] || requirement.description || "");
      payload.append("owneruser", docModalUser.email);
      payload.append("ownername", docModalUser.name);
      payload.append("uploadedby", global1.user || "");

      await ep1.post("/api/v2/user-uploaded-documents/upload", payload, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      setDocMessage(`Document '${requirement.documentname}' uploaded successfully.`);
      setSelectedFiles((prev) => ({ ...prev, [requirement._id]: null }));
      setFileDescriptions((prev) => ({ ...prev, [requirement._id]: "" }));

      // Reload uploaded docs
      const docRes = await ep1.get("/api/v2/user-uploaded-documents", {
        params: { colid: global1.colid, role: docModalUser.role, owneruser: docModalUser.email }
      });
      setUserUploadedDocs(docRes.data || []);

      // Also update users state to increment document count immediately in table
      setUsers((prev) => prev.map((u) => {
        if (u._id === docModalUser._id) {
          const updatedDocs = docRes.data || [];
          return { ...u, documents: updatedDocs };
        }
        return u;
      }));
    } catch (err) {
      setDocError(err.response?.data?.msg || err.response?.data?.message || "Failed to upload document");
    } finally {
      setUploadingDocId("");
    }
  };

  // Delete uploaded document
  const deleteUploadedDoc = async (docId) => {
    if (!window.confirm("Are you sure you want to delete this document?")) return;
    setDocError("");
    setDocMessage("");
    try {
      await ep1.post("/api/v2/user-uploaded-documents-delete", { id: docId, colid: global1.colid });
      setDocMessage("Document deleted successfully.");

      const docRes = await ep1.get("/api/v2/user-uploaded-documents", {
        params: { colid: global1.colid, role: docModalUser.role, owneruser: docModalUser.email }
      });
      setUserUploadedDocs(docRes.data || []);

      setUsers((prev) => prev.map((u) => {
        if (u._id === docModalUser._id) {
          const updatedDocs = docRes.data || [];
          return { ...u, documents: updatedDocs };
        }
        return u;
      }));
    } catch (err) {
      setDocError(err.response?.data?.msg || "Failed to delete document");
    }
  };

  // Handle Edit User
  const openEditModal = (user) => {
    const custom = user.customFields instanceof Map
      ? Object.fromEntries(user.customFields)
      : (user.customFields || {});
    const initial = { ...user };
    Object.entries(custom).forEach(([k, v]) => {
      initial[`customFields.${k}`] = v;
    });
    setEditUser(user);
    setEditValues(initial);

    const userLayout = layouts.filter((item) => String(item.role).toLowerCase() === String(user.role).toLowerCase());
    const firstTab = userLayout[0]?.tab || "Profile";
    setEditTab(firstTab);
  };

  const handleEditChange = (fieldKey, value) => {
    setEditValues((prev) => ({
      ...prev,
      [fieldKey]: value
    }));
  };

  const saveUserEdit = async () => {
    if (!editUser) return;
    setSavingEdit(true);
    setError("");
    setMessage("");
    try {
      const payload = {
        colid: global1.colid,
        id: editUser._id,
        values: editValues
      };
      const res = await ep1.post("/api/v2/non-student-users/update", payload);
      setMessage(res.data?.message || "User profile updated successfully");
      setEditUser(null);
      await loadUsers();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to update user profile");
    } finally {
      setSavingEdit(false);
    }
  };

  // Group edit fields by tab for modal
  const editGroupedFields = useMemo(() => {
    if (!editUser) return [];
    let fields = layouts.filter((item) => String(item.role).toLowerCase() === String(editUser.role).toLowerCase());
    if (!fields.length) {
      fields = activeLayoutFields;
    }
    const map = new Map();
    fields.forEach((field) => {
      const tabName = field.tab || "Profile";
      if (!map.has(tabName)) map.set(tabName, []);
      map.get(tabName).push(field);
    });
    return [...map.entries()].map(([name, fieldList]) => ({
      name,
      taborder: Math.min(...fieldList.map((f) => Number(f.taborder || 0))),
      fields: fieldList.sort((a, b) => Number(a.order || 0) - Number(b.order || 0) || String(a.label).localeCompare(String(b.label)))
    })).sort((a, b) => Number(a.taborder || 0) - Number(b.taborder || 0) || String(a.name).localeCompare(String(b.name)));
  }, [editUser, layouts, activeLayoutFields]);

  // Bulk Delete
  const confirmBulkDelete = () => {
    if (!selectedRows.length) return;
    setSingleDeleteId(null);
    setDeleteConfirmOpen(true);
  };

  const confirmSingleDelete = (id) => {
    setSingleDeleteId(id);
    setDeleteConfirmOpen(true);
  };

  const executeDelete = async () => {
    const idsToDelete = singleDeleteId ? [singleDeleteId] : selectedRows;
    if (!idsToDelete.length) return;

    setDeleting(true);
    setError("");
    setMessage("");
    try {
      const res = await ep1.post("/api/v2/non-student-users/bulk-delete", {
        colid: global1.colid,
        ids: idsToDelete
      });
      setMessage(res.data?.message || `Successfully deleted ${res.data?.deletedCount || 0} user(s)`);
      setDeleteConfirmOpen(false);
      setSingleDeleteId(null);
      setSelectedRows([]);
      await loadUsers();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete users");
    } finally {
      setDeleting(false);
    }
  };

  // Build columns
  const columns = useMemo(() => {
    const cols = [
      {
        field: "actions",
        headerName: "Actions",
        width: 130,
        sortable: false,
        filterable: false,
        renderCell: (params) => (
          <Stack direction="row" spacing={0.5}>
            <Tooltip title="Edit Profile Details">
              <IconButton size="small" color="primary" onClick={() => openEditModal(params.row)}>
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete User">
              <IconButton size="small" color="error" onClick={() => confirmSingleDelete(params.row._id)}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        )
      },
      {
        field: "documents_column",
        headerName: "Documents",
        width: 170,
        sortable: false,
        renderCell: (params) => {
          const docCount = params.row.documents?.length || 0;
          return (
            <Chip
              icon={<DescriptionIcon />}
              label={`${docCount} Document${docCount === 1 ? "" : "s"}`}
              color={docCount > 0 ? "primary" : "default"}
              size="small"
              clickable
              onClick={() => openDocModal(params.row)}
            />
          );
        }
      },
      { field: "name", headerName: "Name", minWidth: 180 },
      { field: "email", headerName: "Email", minWidth: 210 },
      { field: "role", headerName: "Role", minWidth: 130 },
      { field: "regno", headerName: "Employee ID / Reg No", minWidth: 160 },
      { field: "department", headerName: "Department", minWidth: 160 },
      { field: "designation", headerName: "Designation", minWidth: 160 },
      { field: "institution", headerName: "Institution", minWidth: 180 },
      { field: "phone", headerName: "Phone", minWidth: 130 }
    ];

    const standardFieldSet = new Set(["name", "email", "role", "regno", "department", "designation", "institution", "phone"]);

    activeLayoutFields.forEach((field) => {
      if (standardFieldSet.has(field.field)) return;

      cols.push({
        field: field.field,
        headerName: field.label || titleCase(field.field),
        minWidth: 160,
        renderCell: ({ value }) => (
          <Typography variant="body2" sx={{ whiteSpace: "normal", overflowWrap: "anywhere", lineHeight: 1.25 }}>
            {cleanValue(value)}
          </Typography>
        )
      });
    });

    return cols;
  }, [activeLayoutFields]);

  const activeEditTabGroup = editGroupedFields.find((g) => g.name === editTab) || editGroupedFields[0] || { name: "Profile", fields: [] };

  return (
    <MenuPageShell title="Non-Student Users Layout Directory">
      <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: "#f6f7fb", minHeight: "100vh" }}>
        <Paper elevation={0} sx={{ p: 2.5, mb: 2, border: "1px solid #e5e7eb", borderRadius: 2 }}>
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2}>
            <Box>
              <Breadcrumbs sx={{ mb: 0.5 }}>
                <Link underline="hover" color="inherit" href="/dashdashfacnew">Dashboard</Link>
                <Typography color="text.primary">User Management</Typography>
              </Breadcrumbs>
              <Typography variant="h5" fontWeight={900}>Non-Student Users (Profile Layout Format)</Typography>
              <Typography color="text.secondary">
                View, search and edit all non-student users formatted according to configured profile layouts, with document viewer, document upload and bulk upload/delete.
              </Typography>
            </Box>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={downloadTemplate}
              >
                Download Template
              </Button>
              <Button
                variant="contained"
                color="secondary"
                component="label"
                startIcon={<UploadFileIcon />}
                disabled={bulkUploading}
              >
                {bulkUploading ? "Uploading..." : "Bulk Upload"}
                <input hidden type="file" accept=".xlsx,.xls,.csv" onChange={handleBulkUpload} />
              </Button>
              <Button variant="outlined" startIcon={<RefreshIcon />} onClick={loadUsers} disabled={loading}>
                Refresh
              </Button>
              <Button
                variant="contained"
                color="error"
                startIcon={<DeleteIcon />}
                disabled={!selectedRows.length || loading}
                onClick={confirmBulkDelete}
              >
                Bulk Delete ({selectedRows.length})
              </Button>
            </Stack>
          </Stack>
        </Paper>

        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}
        {message && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMessage("")}>{message}</Alert>}
        {bulkErrors.length > 0 && (
          <Alert severity="warning" sx={{ mb: 2 }} onClose={() => setBulkErrors([])}>
            <Typography fontWeight={800}>Some rows were skipped during bulk upload:</Typography>
            <Box component="ul" sx={{ m: 0, pl: 2 }}>
              {bulkErrors.slice(0, 10).map((err, idx) => (
                <li key={idx}>{err}</li>
              ))}
              {bulkErrors.length > 10 && <li>...and {bulkErrors.length - 10} more</li>}
            </Box>
          </Alert>
        )}
        {(loading || bulkUploading) && <LinearProgress sx={{ mb: 2 }} />}

        {/* Filter Toolbar */}
        <Paper elevation={0} sx={{ p: 2, mb: 2, border: "1px solid #e5e7eb", borderRadius: 2 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={4} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Role Filter</InputLabel>
                <Select
                  value={selectedRole}
                  label="Role Filter"
                  onChange={(e) => setSelectedRole(e.target.value)}
                >
                  <MenuItem value="All">All Non-Student Roles</MenuItem>
                  {roles.map((r) => (
                    <MenuItem key={r} value={r}>{r}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={6}>
              <TextField
                fullWidth
                size="small"
                label="Search by Name, Email, Emp ID, Dept..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") loadUsers(); }}
              />
            </Grid>
            <Grid item xs={12} sm={2} md={3}>
              <Button fullWidth variant="contained" startIcon={<SearchIcon />} onClick={loadUsers} disabled={loading}>
                Search
              </Button>
            </Grid>
          </Grid>
        </Paper>

        {/* DataGrid */}
        <Paper elevation={0} sx={{ p: 1, border: "1px solid #e5e7eb", borderRadius: 2, overflowX: "auto" }}>
          <DataGrid
            rows={rows}
            columns={columns}
            getRowId={(row) => row._id}
            loading={loading}
            checkboxSelection
            rowSelectionModel={selectedRows}
            onRowSelectionModelChange={(model) => setSelectedRows(model)}
            autoHeight
            slots={{ toolbar: GridToolbar }}
            slotProps={{
              toolbar: {
                showQuickFilter: true,
                csvOptions: { fileName: "non_student_users_layout" }
              }
            }}
            pageSizeOptions={[10, 25, 50, 100]}
            initialState={{ pagination: { paginationModel: { pageSize: 25, page: 0 } } }}
            sx={{
              minWidth: 1400,
              "& .MuiDataGrid-cell": { alignItems: "center", py: 0.5 }
            }}
          />
        </Paper>

        {/* Uploaded & Configured Documents Viewer & Upload Dialog */}
        <Dialog
          open={Boolean(docModalUser)}
          onClose={() => setDocModalUser(null)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Box>
              <Typography variant="h6" fontWeight={800}>
                Documents: {docModalUser?.name || docModalUser?.email}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Role: {docModalUser?.role} | Reg No / Emp ID: {docModalUser?.regno || "-"}
              </Typography>
            </Box>
            <IconButton onClick={() => setDocModalUser(null)}>
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent dividers>
            {docError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setDocError("")}>{docError}</Alert>}
            {docMessage && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setDocMessage("")}>{docMessage}</Alert>}
            {docsLoading && <LinearProgress sx={{ mb: 2 }} />}

            <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 1.5 }}>
              Configured Document Requirements (from /userprofiledetailrequirements)
            </Typography>

            {!docRequirements.length && !docsLoading && (
              <Alert severity="info" sx={{ mb: 2 }}>
                No document requirements configured for role {docModalUser?.role} in /userprofiledetailrequirements.
              </Alert>
            )}

            <Stack spacing={2} sx={{ mb: 3 }}>
              {docRequirements.map((req) => {
                const uploaded = userUploadedDocs.find((d) => d.documentname?.toLowerCase() === req.documentname?.toLowerCase());
                const isUploadingThis = uploadingDocId === req._id;
                const fileChosen = selectedFiles[req._id];

                return (
                  <Paper key={req._id} elevation={0} sx={{ p: 2, border: "1px solid #e5e7eb", borderRadius: 2 }}>
                    <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} spacing={1} sx={{ mb: 1 }}>
                      <Box>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography variant="subtitle1" fontWeight={800}>{req.documentname}</Typography>
                          {req.mandatory === "Yes" && <Chip label="Mandatory" size="small" color="error" variant="outlined" />}
                          {uploaded ? (
                            <Chip
                              size="small"
                              label={uploaded.status || "Uploaded"}
                              color={uploaded.status === "Approved" ? "success" : uploaded.status === "Rejected" ? "error" : "warning"}
                            />
                          ) : (
                            <Chip size="small" label="Pending" color="default" />
                          )}
                        </Stack>
                        {req.description && <Typography variant="body2" color="text.secondary">{req.description}</Typography>}
                        {uploaded && (
                          <Typography variant="caption" color="text.secondary" display="block">
                            Uploaded: {new Date(uploaded.createdAt).toLocaleString()} | File: {uploaded.originalname || uploaded.filename || "View"}
                          </Typography>
                        )}
                      </Box>
                      {uploaded?.url && (
                        <Stack direction="row" spacing={1}>
                          <Button
                            variant="outlined"
                            size="small"
                            startIcon={<OpenInNewIcon />}
                            href={uploaded.url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            View
                          </Button>
                          <Button
                            color="error"
                            variant="outlined"
                            size="small"
                            startIcon={<DeleteIcon />}
                            onClick={() => deleteUploadedDoc(uploaded._id)}
                          >
                            Delete
                          </Button>
                        </Stack>
                      )}
                    </Stack>

                    {/* Upload / Re-upload form for this requirement */}
                    <Box sx={{ bgcolor: "#f8fafc", p: 1.5, borderRadius: 1.5, border: "1px dashed #cbd5e1", mt: 1 }}>
                      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems="center">
                        <Button
                          variant="outlined"
                          size="small"
                          component="label"
                          startIcon={<UploadFileIcon />}
                          disabled={isUploadingThis}
                        >
                          Choose File
                          <input
                            hidden
                            type="file"
                            onChange={(e) => setSelectedFiles((prev) => ({ ...prev, [req._id]: e.target.files?.[0] || null }))}
                          />
                        </Button>
                        <Typography variant="caption" noWrap sx={{ maxWidth: 180, color: fileChosen ? "text.primary" : "text.secondary" }}>
                          {fileChosen?.name || "No file selected"}
                        </Typography>
                        <TextField
                          size="small"
                          placeholder="Description / Remarks"
                          value={fileDescriptions[req._id] || ""}
                          onChange={(e) => setFileDescriptions((prev) => ({ ...prev, [req._id]: e.target.value }))}
                          sx={{ flex: 1 }}
                        />
                        <Button
                          variant="contained"
                          size="small"
                          disabled={!fileChosen || isUploadingThis}
                          onClick={() => uploadDocForUser(req)}
                        >
                          {isUploadingThis ? "Uploading..." : uploaded ? "Re-upload" : "Upload"}
                        </Button>
                      </Stack>
                    </Box>
                  </Paper>
                );
              })}
            </Stack>

            {/* Other documents uploaded that are not in configured requirements */}
            {userUploadedDocs.some((d) => !docRequirements.some((r) => r.documentname?.toLowerCase() === d.documentname?.toLowerCase())) && (
              <>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 1.5 }}>
                  Other Uploaded Documents
                </Typography>
                <Stack spacing={1.5}>
                  {userUploadedDocs
                    .filter((d) => !docRequirements.some((r) => r.documentname?.toLowerCase() === d.documentname?.toLowerCase()))
                    .map((doc) => (
                      <Paper key={doc._id} elevation={0} sx={{ p: 1.5, border: "1px solid #e5e7eb", borderRadius: 1.5 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Box>
                            <Typography fontWeight={700}>{doc.documentname}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              Uploaded: {new Date(doc.createdAt).toLocaleString()} | Status: {doc.status || "Uploaded"}
                            </Typography>
                          </Box>
                          <Stack direction="row" spacing={1}>
                            {doc.url && (
                              <Button size="small" variant="outlined" startIcon={<OpenInNewIcon />} href={doc.url} target="_blank" rel="noreferrer">
                                View
                              </Button>
                            )}
                            <Button size="small" color="error" variant="outlined" startIcon={<DeleteIcon />} onClick={() => deleteUploadedDoc(doc._id)}>
                              Delete
                            </Button>
                          </Stack>
                        </Stack>
                      </Paper>
                    ))}
                </Stack>
              </>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDocModalUser(null)}>Close</Button>
          </DialogActions>
        </Dialog>

        {/* Edit User Dialog */}
        <Dialog
          open={Boolean(editUser)}
          onClose={() => { if (!savingEdit) setEditUser(null); }}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Box>
              <Typography variant="h6" fontWeight={800}>
                Edit User Profile: {editUser?.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Role: {editUser?.role} | Email: {editUser?.email}
              </Typography>
            </Box>
            <IconButton disabled={savingEdit} onClick={() => setEditUser(null)}>
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent dividers sx={{ p: 2 }}>
            {editGroupedFields.length > 1 && (
              <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
                <Tabs value={editTab} onChange={(_, val) => setEditTab(val)} variant="scrollable" scrollButtons="auto">
                  {editGroupedFields.map((group) => (
                    <Tab key={group.name} value={group.name} label={group.name} />
                  ))}
                </Tabs>
              </Box>
            )}
            <Grid container spacing={2}>
              {activeEditTabGroup.fields.map((field) => {
                const isDropdown = field.type === "dropdown" && Array.isArray(field.options) && field.options.length > 0;
                const value = editValues[field.field] ?? "";
                return (
                  <Grid item xs={12} sm={field.type === "textarea" ? 12 : 6} key={field.field}>
                    {isDropdown ? (
                      <FormControl fullWidth size="small">
                        <InputLabel>{field.label || titleCase(field.field)}</InputLabel>
                        <Select
                          label={field.label || titleCase(field.field)}
                          value={value}
                          onChange={(e) => handleEditChange(field.field, e.target.value)}
                        >
                          <MenuItem value="">Select</MenuItem>
                          {field.options.map((opt) => (
                            <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    ) : (
                      <TextField
                        fullWidth
                        size="small"
                        multiline={field.type === "textarea"}
                        minRows={field.type === "textarea" ? 3 : 1}
                        type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
                        label={field.label || titleCase(field.field)}
                        InputLabelProps={field.type === "date" ? { shrink: true } : undefined}
                        value={value}
                        onChange={(e) => handleEditChange(field.field, e.target.value)}
                      />
                    )}
                  </Grid>
                );
              })}
              {!activeEditTabGroup.fields.length && (
                <Grid item xs={12}>
                  <Alert severity="info">No layout fields found for this tab.</Alert>
                </Grid>
              )}
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button disabled={savingEdit} onClick={() => setEditUser(null)}>Cancel</Button>
            <Button variant="contained" disabled={savingEdit} onClick={saveUserEdit}>
              {savingEdit ? "Saving..." : "Save Changes"}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={deleteConfirmOpen}
          onClose={() => { if (!deleting) setDeleteConfirmOpen(false); }}
        >
          <DialogTitle fontWeight={800}>Confirm User Deletion</DialogTitle>
          <DialogContent>
            <DialogContentText>
              {singleDeleteId ? (
                "Are you sure you want to delete this non-student user and all their associated uploaded documents? This action cannot be undone."
              ) : (
                `Are you sure you want to permanently delete the ${selectedRows.length} selected non-student user(s) and their associated uploaded documents? This action cannot be undone.`
              )}
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button disabled={deleting} onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
            <Button color="error" variant="contained" disabled={deleting} onClick={executeDelete}>
              {deleting ? "Deleting..." : "Delete Permanently"}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </MenuPageShell>
  );
}
