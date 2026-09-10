import React, { useEffect, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  Grid,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import { DataGrid, GridActionsCellItem, GridToolbar } from "@mui/x-data-grid";
import ep1 from "../api/ep1";
import global1 from "./global1";
import MenuPageShell from "./MenuPageShell";

const asDateInput = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

export default function AuthenticatorManagementPage() {
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ authenticator: "No", authenticatordate: "", resetsecret: false });
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkForm, setBulkForm] = useState({
    authenticator: "",
    authenticatordate: "",
    clearDate: false,
    resetsecret: false
  });
  const [bulkSaving, setBulkSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    try {
      const res = await ep1.get("/api/v2/authenticator/users", { params: { colid: global1.colid, search } });
      setRows(res.data?.data || []);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Unable to load users");
    }
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    try {
      setError("");
      if (!selected?._id) throw new Error("Select a user");
      await ep1.post("/api/v2/authenticator/admin-update", {
        colid: global1.colid,
        id: selected._id,
        authenticator: form.authenticator,
        authenticatordate: form.authenticatordate,
        resetsecret: form.resetsecret
      });
      setMessage("Authenticator settings updated");
      setSelected(null);
      setForm({ authenticator: "No", authenticatordate: "", resetsecret: false });
      await load();
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Unable to update authenticator settings");
    }
  };

  const applyBulkUpdate = async () => {
    try {
      setError("");
      setMessage("");
      if (!selectedIds.length) throw new Error("Select at least one user from the grid");
      const payload = {
        colid: global1.colid,
        ids: selectedIds,
        resetsecret: bulkForm.resetsecret
      };
      if (bulkForm.authenticator) payload.authenticator = bulkForm.authenticator;
      if (bulkForm.authenticatordate || bulkForm.clearDate) {
        payload.authenticatordate = bulkForm.clearDate ? "" : bulkForm.authenticatordate;
      }
      if (!payload.authenticator && !payload.authenticatordate && !bulkForm.clearDate && !payload.resetsecret) {
        throw new Error("Choose Authenticator Yes/No, set a date, clear date, or reset setup");
      }
      setBulkSaving(true);
      const res = await ep1.post("/api/v2/authenticator/admin-bulk-update", payload);
      setMessage(`Bulk update completed for ${res.data?.updated || selectedIds.length} user(s)`);
      setBulkForm({ authenticator: "", authenticatordate: "", clearDate: false, resetsecret: false });
      setSelectedIds([]);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Unable to bulk update authenticator settings");
    } finally {
      setBulkSaving(false);
    }
  };

  const editRow = (row) => {
    setSelected(row);
    setForm({
      authenticator: row?.authenticator || "No",
      authenticatordate: asDateInput(row?.authenticatordate),
      resetsecret: false
    });
    setMessage("");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const columns = [
    {
      field: "actions",
      type: "actions",
      headerName: "Edit",
      width: 90,
      getActions: (params) => [
        <GridActionsCellItem
          key="edit"
          icon={<EditIcon />}
          label="Edit"
          onClick={() => editRow(params.row)}
          showInMenu={false}
        />
      ]
    },
    { field: "name", headerName: "Name", width: 190 },
    { field: "email", headerName: "Email", width: 230 },
    { field: "role", headerName: "Role", width: 140 },
    { field: "department", headerName: "Department", width: 170 },
    { field: "authenticator", headerName: "Authenticator", width: 150 },
    {
      field: "authenticatordate",
      headerName: "Mandatory From",
      width: 160,
      valueGetter: (params) => asDateInput(params.row.authenticatordate)
    },
    {
      field: "authenticatorsetupdate",
      headerName: "Setup Date",
      width: 160,
      valueGetter: (params) => asDateInput(params.row.authenticatorsetupdate)
    }
  ];

  return (
    <MenuPageShell title="Authenticator Management">
      <Box p={3}>
        <Typography variant="h5" fontWeight={900}>Authenticator management</Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          Configure Google Authenticator enforcement for non-student users, including the All role. Global enforcement starts on August 15, 2026.
        </Typography>
        {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Paper sx={{ p: 2, mb: 2 }}>
          {selected && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Editing {selected.name || selected.email}. Change the authenticator setting and click Save.
            </Alert>
          )}
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <Autocomplete
                options={rows}
                value={selected}
                onChange={(_, value) => {
                  setSelected(value);
                  setForm({
                    authenticator: value?.authenticator || "No",
                    authenticatordate: asDateInput(value?.authenticatordate),
                    resetsecret: false
                  });
                }}
                getOptionLabel={(option) => `${option.name || ""} | ${option.email || ""} | ${option.role || ""}`}
                isOptionEqualToValue={(option, value) => option._id === value?._id}
                renderInput={(params) => <TextField {...params} label="Search user" size="small" />}
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <TextField select fullWidth size="small" label="Authenticator" value={form.authenticator} onChange={(e) => setForm((p) => ({ ...p, authenticator: e.target.value }))}>
                {["Yes", "No"].map((value) => <MenuItem key={value} value={value}>{value}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} md={2}>
              <TextField fullWidth size="small" type="date" label="Mandatory from" value={form.authenticatordate} onChange={(e) => setForm((p) => ({ ...p, authenticatordate: e.target.value }))} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControlLabel control={<Checkbox checked={form.resetsecret} onChange={(e) => setForm((p) => ({ ...p, resetsecret: e.target.checked }))} />} label="Reset setup" />
            </Grid>
            <Grid item xs={12} md={2}>
              <Stack direction="row" spacing={1}>
                <Button fullWidth variant="contained" onClick={save}>
                  {selected ? "Update" : "Save"}
                </Button>
                {selected && (
                  <Button
                    variant="outlined"
                    onClick={() => {
                      setSelected(null);
                      setForm({ authenticator: "No", authenticatordate: "", resetsecret: false });
                    }}
                  >
                    Clear
                  </Button>
                )}
              </Stack>
            </Grid>
          </Grid>
        </Paper>

        <Paper sx={{ p: 2, mb: 2 }}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
            <TextField size="small" label="Search" value={search} onChange={(e) => setSearch(e.target.value)} />
            <Button variant="outlined" onClick={load}>Apply</Button>
          </Stack>
        </Paper>

        <Paper sx={{ p: 2 }}>
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 1 }}>
              Bulk update selected users ({selectedIds.length})
            </Typography>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={2}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Authenticator"
                  value={bulkForm.authenticator}
                  onChange={(e) => setBulkForm((p) => ({ ...p, authenticator: e.target.value }))}
                >
                  <MenuItem value="">No change</MenuItem>
                  {["Yes", "No"].map((value) => <MenuItem key={value} value={value}>{value}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={12} md={2}>
                <TextField
                  fullWidth
                  size="small"
                  type="date"
                  label="Set mandatory from"
                  value={bulkForm.authenticatordate}
                  disabled={bulkForm.clearDate}
                  onChange={(e) => setBulkForm((p) => ({ ...p, authenticatordate: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} md={2}>
                <FormControlLabel
                  control={(
                    <Checkbox
                      checked={bulkForm.clearDate}
                      onChange={(e) => setBulkForm((p) => ({ ...p, clearDate: e.target.checked, authenticatordate: e.target.checked ? "" : p.authenticatordate }))}
                    />
                  )}
                  label="Clear date"
                />
              </Grid>
              <Grid item xs={12} md={2}>
                <FormControlLabel
                  control={<Checkbox checked={bulkForm.resetsecret} onChange={(e) => setBulkForm((p) => ({ ...p, resetsecret: e.target.checked }))} />}
                  label="Reset setup"
                />
              </Grid>
              <Grid item xs={12} md={2}>
                <Button
                  fullWidth
                  variant="contained"
                  onClick={applyBulkUpdate}
                  disabled={!selectedIds.length || bulkSaving}
                >
                  Apply bulk
                </Button>
              </Grid>
              <Grid item xs={12} md={2}>
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={() => {
                    setSelectedIds([]);
                    setBulkForm({ authenticator: "", authenticatordate: "", clearDate: false, resetsecret: false });
                  }}
                >
                  Clear selection
                </Button>
              </Grid>
            </Grid>
          </Box>
          <DataGrid
            autoHeight
            rows={rows.map((row) => ({ ...row, id: row._id }))}
            columns={columns}
            checkboxSelection
            disableRowSelectionOnClick
            rowSelectionModel={selectedIds}
            onRowSelectionModelChange={(model) => setSelectedIds(Array.isArray(model) ? model : Array.from(model?.ids || []))}
            slots={{ toolbar: GridToolbar }}
            pageSizeOptions={[10, 25, 50, 100]}
            initialState={{ pagination: { paginationModel: { pageSize: 25, page: 0 } } }}
            sx={{
              "& .MuiDataGrid-cell": {
                whiteSpace: "normal",
                lineHeight: 1.35,
                py: 0.75
              }
            }}
          />
        </Paper>
      </Box>
    </MenuPageShell>
  );
}
