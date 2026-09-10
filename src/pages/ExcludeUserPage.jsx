import React, { useEffect, useMemo, useState } from "react";
import { Alert, Autocomplete, Box, Button, Chip, Grid, MenuItem, Paper, Stack, TextField, Typography } from "@mui/material";
import { DataGrid, GridToolbar } from "@mui/x-data-grid";
import { CheckCircle, Search } from "@mui/icons-material";
import ep1 from "../api/ep1";
import global1 from "./global1";
import MenuPageShell from "./MenuPageShell";

const filterRow = { field: "", value: "" };

export default function ExcludeUserPage() {
  const [roles, setRoles] = useState([]);
  const [fields, setFields] = useState([]);
  const [role, setRole] = useState("");
  const [filters, setFilters] = useState([filterRow]);
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState([]);
  const [excluded, setExcluded] = useState("Yes");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const colid = global1.colid;
  const fieldMap = useMemo(() => Object.fromEntries(fields.map((item) => [item.field, item])), [fields]);

  const loadOptions = async () => {
    const res = await ep1.get("/api/v2/exclude-user/options", { params: { colid } });
    setRoles(res.data?.roles || []);
    setFields(res.data?.fields || []);
  };

  const search = async () => {
    setLoading(true);
    try {
      const activeFilters = filters.filter((item) => item.field && item.value);
      const res = await ep1.post("/api/v2/exclude-user/search", { colid, role, filters: activeFilters });
      setRows(res.data?.data || []);
      setSelected([]);
    } catch (error) {
      setMessage(error.response?.data?.msg || error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadOptions(); }, []);

  const setFilter = (index, patch) => setFilters((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));

  const bulkUpdate = async () => {
    if (!selected.length) {
      setMessage("Select users first.");
      return;
    }
    const res = await ep1.post("/api/v2/exclude-user/bulk-set", { colid, ids: selected, excluded });
    setMessage(`${res.data?.modified || 0} user(s) updated to excluded ${res.data?.excluded}.`);
    await search();
  };

  const columns = [
    { field: "name", headerName: "Name", minWidth: 180, flex: 1 },
    { field: "email", headerName: "Email", minWidth: 220, flex: 1 },
    { field: "role", headerName: "Role", minWidth: 140 },
    { field: "department", headerName: "Department", minWidth: 170 },
    { field: "designation", headerName: "Designation", minWidth: 160 },
    { field: "program", headerName: "Program", minWidth: 180 },
    { field: "programcode", headerName: "Program code", minWidth: 140 },
    { field: "academicyear", headerName: "Academic year", minWidth: 140 },
    { field: "semester", headerName: "Semester", minWidth: 110 },
    { field: "section", headerName: "Section", minWidth: 110 },
    { field: "excluded", headerName: "Excluded", minWidth: 110 }
  ];

  return (
    <MenuPageShell title="Exclude user">
      <Box sx={{ p: 2 }}>
        <Typography variant="h5" fontWeight={900}>Exclude User</Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>Select users by role and dynamic filters, then bulk mark them as excluded Yes/No for accreditation reports.</Typography>
        {message && <Alert sx={{ mb: 2 }} severity={/error|fail|required|select/i.test(message) ? "warning" : "success"} onClose={() => setMessage("")}>{message}</Alert>}

        <Paper sx={{ p: 2, mb: 2 }} variant="outlined">
          <Grid container spacing={2}>
            <Grid item xs={12} md={3}>
              <Autocomplete options={roles} value={role} onChange={(_, value) => setRole(value || "")} renderInput={(params) => <TextField {...params} label="Role" size="small" />} />
            </Grid>
            {filters.map((item, index) => (
              <React.Fragment key={index}>
                <Grid item xs={12} md={3}>
                  <Autocomplete
                    options={fields}
                    getOptionLabel={(option) => option?.label || ""}
                    value={fields.find((field) => field.field === item.field) || null}
                    onChange={(_, value) => setFilter(index, { field: value?.field || "", value: "" })}
                    renderInput={(params) => <TextField {...params} label="Filter field" size="small" />}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <Autocomplete
                    freeSolo
                    options={fieldMap[item.field]?.options || []}
                    value={item.value}
                    onInputChange={(_, value) => setFilter(index, { value })}
                    onChange={(_, value) => setFilter(index, { value: value || "" })}
                    renderInput={(params) => <TextField {...params} label="Value" size="small" />}
                  />
                </Grid>
              </React.Fragment>
            ))}
            <Grid item xs={12}>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                <Button variant="outlined" onClick={() => setFilters((prev) => [...prev, filterRow])}>Add filter</Button>
                <Button variant="outlined" onClick={() => setFilters([filterRow])}>Clear filters</Button>
                <Button variant="contained" startIcon={<Search />} onClick={search}>Search</Button>
              </Stack>
            </Grid>
          </Grid>
        </Paper>

        <Paper sx={{ p: 2, mb: 2 }} variant="outlined">
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }}>
            <Chip label={`${selected.length} selected`} />
            <TextField select size="small" label="Set excluded" value={excluded} onChange={(e) => setExcluded(e.target.value)} sx={{ minWidth: 160 }}>
              <MenuItem value="Yes">Yes</MenuItem>
              <MenuItem value="No">No</MenuItem>
            </TextField>
            <Button variant="contained" startIcon={<CheckCircle />} disabled={!selected.length} onClick={bulkUpdate}>Apply to selected</Button>
          </Stack>
        </Paper>

        <Paper sx={{ p: 2 }} variant="outlined">
          <Box sx={{ height: 650 }}>
            <DataGrid
              rows={rows.map((row) => ({ ...row, id: row._id }))}
              columns={columns}
              loading={loading}
              checkboxSelection
              disableRowSelectionOnClick
              rowSelectionModel={selected}
              onRowSelectionModelChange={setSelected}
              slots={{ toolbar: GridToolbar }}
              slotProps={{ toolbar: { showQuickFilter: true, csvOptions: { fileName: "excluded_users" } } }}
              sx={{ "& .MuiDataGrid-cell": { whiteSpace: "normal", lineHeight: 1.35, alignItems: "flex-start", py: 1 } }}
            />
          </Box>
        </Paper>
      </Box>
    </MenuPageShell>
  );
}
