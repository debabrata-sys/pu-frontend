import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Alert, Autocomplete, Box, Button, Grid, Paper, Stack, TextField, Typography
} from "@mui/material";
import { DataGrid, GridToolbar } from "@mui/x-data-grid";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import ep1 from "../api/ep1";
import global1 from "./global1";
import MenuPageShell from "./MenuPageShell";
import GoogleCredentialButton from "../components/GoogleCredentialButton";
import { continueAfterPrimaryLogin } from "../utils/twoFactorLogin";

const defaultFrontendBase = "https://campustechnology.me";

export function GoogleEmailManagementPage() {
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [googleemail, setGoogleemail] = useState("");
  const [linkForm, setLinkForm] = useState({ role: "", department: "", designation: "", frontendBase: defaultFrontendBase });
  const [links, setLinks] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadUsers = async () => {
    const res = await ep1.get("/api/v2/google-auth/users", { params: { colid: global1.colid, search } });
    setRows(res.data?.data || []);
  };
  const loadLinks = async () => {
    const res = await ep1.get("/api/v2/google-auth/registration-links", { params: { colid: global1.colid } });
    setLinks(res.data?.data || []);
  };

  useEffect(() => { loadUsers(); loadLinks(); }, []);

  const roles = useMemo(() => [...new Set(rows.map((row) => row.role).filter(Boolean))].sort(), [rows]);
  const departments = useMemo(() => [...new Set(rows.map((row) => row.department).filter(Boolean))].sort(), [rows]);
  const designations = useMemo(() => [...new Set(rows.map((row) => row.designation).filter(Boolean))].sort(), [rows]);

  const saveGoogleEmail = async () => {
    try {
      setError("");
      if (!selected?._id) return setError("Select a user");
      await ep1.post("/api/v2/google-auth/google-email", { colid: global1.colid, id: selected._id, googleemail });
      setMessage("Google email updated");
      setSelected(null);
      setGoogleemail("");
      loadUsers();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to update Google email");
    }
  };

  const createLink = async () => {
    try {
      setError("");
      const res = await ep1.post("/api/v2/google-auth/registration-links", {
        ...linkForm,
        colid: global1.colid,
        user: global1.user,
        name: global1.name
      });
      setMessage("Registration link created");
      navigator.clipboard?.writeText(res.data?.data?.url || "");
      loadLinks();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to create registration link");
    }
  };

  const columns = [
    { field: "name", headerName: "Name", width: 180 },
    { field: "email", headerName: "Email", width: 220 },
    { field: "googleemail", headerName: "Google email", width: 220 },
    { field: "role", headerName: "Role", width: 140 },
    { field: "department", headerName: "Department", width: 160 },
    { field: "designation", headerName: "Designation", width: 170 }
  ];

  return (
    <MenuPageShell title="Google Email Access">
      <Box p={3}>
        <Typography variant="h5" fontWeight={800} gutterBottom>Google email login setup</Typography>
        {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" fontWeight={700}>Update existing user Google email</Typography>
          <Grid container spacing={2} alignItems="center" sx={{ mt: 1 }}>
            <Grid item xs={12} md={5}>
              <Autocomplete
                options={rows}
                value={selected}
                onChange={(_, value) => {
                  setSelected(value);
                  setGoogleemail(value?.googleemail || value?.email || "");
                }}
                getOptionLabel={(option) => option ? `${option.name || ""} | ${option.email || ""} | ${option.role || ""}` : ""}
                renderInput={(params) => <TextField {...params} label="Search and select user" size="small" />}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField fullWidth size="small" label="Google email" value={googleemail} onChange={(e) => setGoogleemail(e.target.value)} />
            </Grid>
            <Grid item xs={12} md={3}>
              <Button fullWidth variant="contained" onClick={saveGoogleEmail}>Save Google Email</Button>
            </Grid>
          </Grid>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ mt: 2 }}>
            <TextField size="small" label="Search grid" value={search} onChange={(e) => setSearch(e.target.value)} />
            <Button variant="outlined" onClick={loadUsers}>Apply</Button>
          </Stack>
          <Box sx={{ mt: 2, height: 420 }}>
            <DataGrid rows={rows} columns={columns} getRowId={(row) => row._id} slots={{ toolbar: GridToolbar }} pageSizeOptions={[25, 50, 100]} />
          </Box>
        </Paper>

        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" fontWeight={700}>Create role registration link</Typography>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={3}><Autocomplete freeSolo options={roles} value={linkForm.role} onInputChange={(_, value) => setLinkForm((p) => ({ ...p, role: value }))} renderInput={(params) => <TextField {...params} size="small" label="Role" />} /></Grid>
            <Grid item xs={12} md={3}><Autocomplete freeSolo options={departments} value={linkForm.department} onInputChange={(_, value) => setLinkForm((p) => ({ ...p, department: value }))} renderInput={(params) => <TextField {...params} size="small" label="Department" />} /></Grid>
            <Grid item xs={12} md={3}><Autocomplete freeSolo options={designations} value={linkForm.designation} onInputChange={(_, value) => setLinkForm((p) => ({ ...p, designation: value }))} renderInput={(params) => <TextField {...params} size="small" label="Designation" />} /></Grid>
            <Grid item xs={12} md={3}><TextField fullWidth size="small" label="Frontend base URL" value={linkForm.frontendBase} onChange={(e) => setLinkForm((p) => ({ ...p, frontendBase: e.target.value }))} /></Grid>
            <Grid item xs={12}><Button variant="contained" onClick={createLink}>Create encrypted Google registration link</Button></Grid>
          </Grid>
        </Paper>

        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" fontWeight={700}>Registration links</Typography>
          <Box sx={{ height: 360, mt: 2 }}>
            <DataGrid
              rows={links}
              getRowId={(row) => row._id}
              columns={[
                { field: "role", headerName: "Role", width: 140 },
                { field: "department", headerName: "Department", width: 160 },
                { field: "designation", headerName: "Designation", width: 170 },
                { field: "url", headerName: "URL", flex: 1 },
                {
                  field: "copy",
                  headerName: "Copy",
                  width: 90,
                  renderCell: (params) => <Button size="small" startIcon={<ContentCopyIcon />} onClick={() => navigator.clipboard?.writeText(params.row.url || "")}>Copy</Button>
                }
              ]}
              slots={{ toolbar: GridToolbar }}
            />
          </Box>
        </Paper>
      </Box>
    </MenuPageShell>
  );
}

export function GoogleRoleRegistrationPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [config, setConfig] = useState(null);
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const res = await ep1.get("/api/v2/google-auth/registration-config", { params: { token } });
        setConfig(res.data?.data);
      } catch (err) {
        setError(err.response?.data?.message || "Invalid registration link");
      }
    };
    load();
  }, [token]);

  const register = async (credential) => {
    try {
      setError("");
      const res = await ep1.post("/api/v2/google-auth/public-register", { token, credential, phone });
      setMessage("Registration complete. Redirecting...");
      await continueAfterPrimaryLogin(res.data, navigate);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Registration failed");
    }
  };

  return (
    <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center", bgcolor: "#eef4ff", p: 2 }}>
      <Paper sx={{ p: 4, width: "100%", maxWidth: 560 }}>
        <Typography variant="h4" fontWeight={900}>Google registration</Typography>
        <Typography color="text.secondary" sx={{ mt: 1 }}>Sign in with Google to create your institutional login.</Typography>
        {config && (
          <Alert severity="info" sx={{ my: 2 }}>
            Role: {config.role || "-"} | Department: {config.department || "-"} | Designation: {config.designation || "-"}
          </Alert>
        )}
        {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <TextField fullWidth label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} sx={{ mb: 2 }} />
        <GoogleCredentialButton onCredential={register} text="Register with Google" />
      </Paper>
    </Box>
  );
}
