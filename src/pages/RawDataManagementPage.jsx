import React, { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  Grid,
  MenuItem,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography
} from "@mui/material";
import { DataGrid, GridActionsCellItem, GridToolbar } from "@mui/x-data-grid";
import { Delete, Edit, FileDownload, UploadFile } from "@mui/icons-material";
import MenuPageShell from "./MenuPageShell";
import ep1 from "../api/ep1";
import global1 from "./global1";

const sourceBlank = { sourcename: "", description: "", status: "Active" };
const rawBlank = {
  year: "2026-27",
  sourcename: "",
  status: "New",
  employee: "",
  employeeemail: "",
  name: "",
  phone: "",
  email: "",
  category: "NA",
  course_interested: "",
  program: "",
  programcode: "",
  program_type: "",
  city: "",
  state: "",
  country: "",
  comments: ""
};
const rawFields = ["year", "sourcename", "status", "employee", "employeeemail", "name", "phone", "email", "category", "course_interested", "program", "programcode", "program_type", "city", "state", "country", "comments"];
const labels = {
  sourcename: "Source",
  course_interested: "Course interested",
  programcode: "Program code",
  program_type: "Program type",
  employeeemail: "Employee email",
  crmleadid: "CRM lead id"
};
const first = (...values) => values.find((value) => value !== undefined && value !== null && String(value).trim() !== "") || "";
const readExcelRows = async (file) => {
  const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
  return XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { defval: "" });
};
const downloadTemplate = (filename, sample) => {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([sample]), "Template");
  XLSX.writeFile(workbook, filename);
};

export default function RawDataManagementPage() {
  const [tab, setTab] = useState(0);
  const [sources, setSources] = useState([]);
  const [records, setRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [statuses, setStatuses] = useState(["New", "Verified", "Qualified", "Rejected", "Copied to CRM"]);
  const [sourceForm, setSourceForm] = useState(sourceBlank);
  const [rawForm, setRawForm] = useState(rawBlank);
  const [sourceEditId, setSourceEditId] = useState("");
  const [rawEditId, setRawEditId] = useState("");
  const [sourceSelection, setSourceSelection] = useState([]);
  const [rawSelection, setRawSelection] = useState([]);
  const [filters, setFilters] = useState({ search: "", sourcename: "", status: "", employeeemail: "", year: "" });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadAll();
  }, []);

  const sourceNames = useMemo(() => sources.map((item) => item.sourcename).filter(Boolean), [sources]);

  const loadAll = async () => {
    await Promise.all([loadOptions(), loadSources(), loadRecords()]);
  };

  const loadOptions = async () => {
    const res = await ep1.get("/api/v2/raw-data/options", { params: { colid: global1.colid } });
    setEmployees(res.data?.employees || []);
    setStatuses(res.data?.statuses || statuses);
    setSources(res.data?.sources || []);
  };

  const loadSources = async () => {
    const res = await ep1.get("/api/v2/raw-data/sources", { params: { colid: global1.colid } });
    setSources(res.data?.data || []);
    setSourceSelection([]);
  };

  const loadRecords = async () => {
    try {
      setLoading(true);
      const res = await ep1.get("/api/v2/raw-data/records", { params: { colid: global1.colid, ...filters } });
      setRecords(res.data?.data || []);
      setRawSelection([]);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load raw data");
    } finally {
      setLoading(false);
    }
  };

  const saveSource = async () => {
    if (!sourceForm.sourcename) return setError("Source name is required.");
    try {
      setSaving(true);
      await ep1.post("/api/v2/raw-data/sources", { ...sourceForm, id: sourceEditId, colid: global1.colid, user: global1.user });
      setMessage(sourceEditId ? "Source updated." : "Source added.");
      setSourceForm(sourceBlank);
      setSourceEditId("");
      await loadSources();
      await loadOptions();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to save source.");
    } finally {
      setSaving(false);
    }
  };

  const saveRaw = async () => {
    if (!rawForm.sourcename) return setError("Source is required.");
    try {
      setSaving(true);
      const res = await ep1.post("/api/v2/raw-data/records", { ...rawForm, id: rawEditId, colid: global1.colid, user: global1.user });
      setMessage(res.data?.crmlead ? "Raw data saved and copied to CRM." : rawEditId ? "Raw data updated." : "Raw data added.");
      setRawForm(rawBlank);
      setRawEditId("");
      await loadRecords();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to save raw data.");
    } finally {
      setSaving(false);
    }
  };

  const deleteSources = async (ids) => {
    if (!ids.length) return setError("Select source rows to delete.");
    if (!window.confirm(`Delete ${ids.length} selected source${ids.length === 1 ? "" : "s"}?`)) return;
    await ep1.post("/api/v2/raw-data/sources-delete", { ids, colid: global1.colid });
    setMessage("Source deleted.");
    await loadSources();
  };

  const deleteRecords = async (ids) => {
    if (!ids.length) return setError("Select raw data rows to delete.");
    if (!window.confirm(`Delete ${ids.length} selected raw data record${ids.length === 1 ? "" : "s"}?`)) return;
    await ep1.post("/api/v2/raw-data/records-delete", { ids, colid: global1.colid });
    setMessage("Raw data deleted.");
    await loadRecords();
  };

  const changeStatus = async (row, status) => {
    try {
      setSaving(true);
      const res = await ep1.post("/api/v2/raw-data/records-status", { id: row._id, colid: global1.colid, status, user: global1.user });
      setMessage(res.data?.crmlead ? "Status changed and copied to CRM." : "Status changed.");
      await loadRecords();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to change status.");
    } finally {
      setSaving(false);
    }
  };

  const uploadSources = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const rows = await readExcelRows(file);
    const res = await ep1.post("/api/v2/raw-data/sources-bulk", { colid: global1.colid, user: global1.user, rows });
    setMessage(`Sources uploaded. Saved: ${res.data?.saved || 0}`);
    setError((res.data?.errors || []).slice(0, 5).map((item) => `Row ${item.row}: ${item.message}`).join(" | "));
    await loadSources();
  };

  const uploadRecords = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const rows = (await readExcelRows(file)).map((row) => ({
      year: first(row.year, row.Year),
      sourcename: first(row.sourcename, row.Source, row.source),
      status: first(row.status, row.Status, "New"),
      employee: first(row.employee, row.Employee),
      employeeemail: first(row.employeeemail, row.EmployeeEmail, row.assignedto),
      name: first(row.name, row.Name, row.leadname),
      phone: first(row.phone, row.Phone, row.mobile),
      email: first(row.email, row.Email),
      category: first(row.category, row.Category, "NA"),
      course_interested: first(row.course_interested, row.Course),
      program: first(row.program, row.Program),
      programcode: first(row.programcode, row.ProgramCode),
      program_type: first(row.program_type, row.ProgramType),
      city: first(row.city, row.City),
      state: first(row.state, row.State),
      country: first(row.country, row.Country),
      comments: first(row.comments, row.Comments)
    }));
    const res = await ep1.post("/api/v2/raw-data/records-bulk", { colid: global1.colid, user: global1.user, rows });
    setMessage(`Raw data uploaded. Saved: ${res.data?.saved || 0}. Copied to CRM: ${res.data?.copied || 0}`);
    setError((res.data?.errors || []).slice(0, 5).map((item) => `Row ${item.row}: ${item.message}`).join(" | "));
    await loadRecords();
  };

  const employeeField = (
    <Autocomplete
      options={employees}
      value={employees.find((item) => item.email === rawForm.employeeemail) || null}
      getOptionLabel={(option) => option ? `${option.name || ""} (${option.email || ""})` : ""}
      onChange={(_, value) => setRawForm((prev) => ({ ...prev, employee: value?.name || "", employeeemail: value?.email || "" }))}
      renderInput={(params) => <TextField {...params} size="small" label="Employee" />}
    />
  );

  const sourceColumns = [
    { field: "sourcename", headerName: "Source", minWidth: 220, flex: 1 },
    { field: "description", headerName: "Description", minWidth: 260, flex: 1 },
    { field: "status", headerName: "Status", width: 130 },
    {
      field: "actions",
      type: "actions",
      headerName: "Actions",
      width: 110,
      getActions: ({ row }) => [
        <GridActionsCellItem icon={<Edit />} label="Edit" onClick={() => { setSourceEditId(row._id); setSourceForm({ ...sourceBlank, ...row }); }} />,
        <GridActionsCellItem icon={<Delete />} label="Delete" onClick={() => deleteSources([row._id])} />
      ]
    }
  ];

  const rawColumns = [
    {
      field: "actions",
      type: "actions",
      headerName: "Actions",
      width: 110,
      getActions: ({ row }) => [
        <GridActionsCellItem icon={<Edit />} label="Edit" onClick={() => { setRawEditId(row._id); setRawForm({ ...rawBlank, ...row }); window.scrollTo({ top: 0, behavior: "smooth" }); }} />,
        <GridActionsCellItem icon={<Delete />} label="Delete" onClick={() => deleteRecords([row._id])} />
      ]
    },
    {
      field: "status",
      headerName: "Status",
      width: 170,
      renderCell: ({ row }) => (
        <TextField select size="small" value={row.status || "New"} onChange={(event) => changeStatus(row, event.target.value)} disabled={saving} sx={{ minWidth: 145 }}>
          {statuses.map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}
        </TextField>
      )
    },
    { field: "crmleadid", headerName: "CRM", width: 150, renderCell: ({ row }) => row.crmleadid ? <Chip color="success" size="small" label="Copied" /> : <Chip size="small" label="Not copied" /> },
    ...rawFields.filter((field) => field !== "status").map((field) => ({ field, headerName: labels[field] || field, width: ["comments", "email", "employeeemail", "course_interested"].includes(field) ? 190 : 140 }))
  ];

  return (
    <MenuPageShell title="Raw Data Management">
      <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: "#f6f7fb", minHeight: "100vh" }}>
        <Stack spacing={2}>
          <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: "1px solid #e5e7eb" }}>
            <Typography variant="h4" fontWeight={950}>Raw Data Management</Typography>
            <Typography color="text.secondary">Manage raw inquiry data, source masters, assignments and CRM handoff status.</Typography>
          </Paper>
          {error && <Alert severity="error" onClose={() => setError("")}>{error}</Alert>}
          {message && <Alert severity="success" onClose={() => setMessage("")}>{message}</Alert>}
          <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid #e5e7eb", overflow: "hidden" }}>
            <Tabs value={tab} onChange={(_, value) => setTab(value)}>
              <Tab label="Raw data" />
              <Tab label="Source" />
            </Tabs>
          </Paper>

          {tab === 0 && (
            <>
              <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #e5e7eb" }}>
                <Grid container spacing={1.5}>
                  <Grid item xs={12} md={2}>
                    <TextField fullWidth size="small" label="Year" value={rawForm.year} onChange={(event) => setRawForm({ ...rawForm, year: event.target.value })} />
                  </Grid>
                  <Grid item xs={12} md={2}>
                    <TextField select fullWidth size="small" label="Source" value={rawForm.sourcename} onChange={(event) => setRawForm({ ...rawForm, sourcename: event.target.value })}>
                      <MenuItem value="">Select</MenuItem>
                      {sourceNames.map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}
                    </TextField>
                  </Grid>
                  <Grid item xs={12} md={2}>
                    <TextField select fullWidth size="small" label="Status" value={rawForm.status} onChange={(event) => setRawForm({ ...rawForm, status: event.target.value })}>
                      {statuses.map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}
                    </TextField>
                  </Grid>
                  <Grid item xs={12} md={3}>{employeeField}</Grid>
                  {["name", "phone", "email", "category", "course_interested", "program", "programcode", "program_type", "city", "state", "country"].map((field) => (
                    <Grid item xs={12} md={field === "email" ? 3 : 2} key={field}>
                      <TextField fullWidth size="small" label={labels[field] || field} value={rawForm[field] || ""} onChange={(event) => setRawForm({ ...rawForm, [field]: event.target.value })} />
                    </Grid>
                  ))}
                  <Grid item xs={12}>
                    <TextField fullWidth multiline minRows={2} size="small" label="Comments" value={rawForm.comments} onChange={(event) => setRawForm({ ...rawForm, comments: event.target.value })} />
                  </Grid>
                  <Grid item xs={12}>
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                      <Button variant="contained" disabled={saving} onClick={saveRaw}>{saving ? "Saving..." : rawEditId ? "Update raw data" : "Add raw data"}</Button>
                      <Button variant="outlined" onClick={() => { setRawEditId(""); setRawForm(rawBlank); }}>Clear</Button>
                      <Button variant="outlined" startIcon={<FileDownload />} onClick={() => downloadTemplate("raw_data_template.xlsx", rawBlank)}>Template</Button>
                      <Button variant="outlined" component="label" startIcon={<UploadFile />}>
                        Bulk upload
                        <input hidden type="file" accept=".xlsx,.xls,.csv" onChange={uploadRecords} />
                      </Button>
                    </Stack>
                  </Grid>
                </Grid>
              </Paper>
              <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #e5e7eb" }}>
                <Grid container spacing={1.5} sx={{ mb: 1 }}>
                  <Grid item xs={12} md={2}><TextField fullWidth size="small" label="Search" value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} /></Grid>
                  <Grid item xs={12} md={2}><TextField select fullWidth size="small" label="Source" value={filters.sourcename} onChange={(event) => setFilters({ ...filters, sourcename: event.target.value })}><MenuItem value="">All</MenuItem>{sourceNames.map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}</TextField></Grid>
                  <Grid item xs={12} md={2}><TextField select fullWidth size="small" label="Status" value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}><MenuItem value="">All</MenuItem>{statuses.map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}</TextField></Grid>
                  <Grid item xs={12} md={3}><Autocomplete options={employees} getOptionLabel={(option) => option ? `${option.name || ""} (${option.email || ""})` : ""} onChange={(_, value) => setFilters({ ...filters, employeeemail: value?.email || "" })} renderInput={(params) => <TextField {...params} size="small" label="Employee filter" />} /></Grid>
                  <Grid item xs={12} md={1.5}><Button fullWidth variant="contained" sx={{ height: "100%" }} onClick={loadRecords}>Apply</Button></Grid>
                </Grid>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                  <Button color="error" variant="outlined" startIcon={<Delete />} disabled={!rawSelection.length} onClick={() => deleteRecords(rawSelection)}>Bulk delete</Button>
                  <Typography variant="body2" color="text.secondary">{rawSelection.length} selected</Typography>
                </Stack>
                <Box sx={{ height: 620, width: "100%" }}>
                  <DataGrid rows={records} columns={rawColumns} getRowId={(row) => row._id} loading={loading} checkboxSelection rowSelectionModel={rawSelection} onRowSelectionModelChange={setRawSelection} slots={{ toolbar: GridToolbar }} slotProps={{ toolbar: { showQuickFilter: true, csvOptions: { fileName: "raw_data" } } }} pageSizeOptions={[10, 25, 50, 100]} initialState={{ pagination: { paginationModel: { pageSize: 25, page: 0 } } }} />
                </Box>
              </Paper>
            </>
          )}

          {tab === 1 && (
            <>
              <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #e5e7eb" }}>
                <Grid container spacing={1.5}>
                  <Grid item xs={12} md={4}><TextField fullWidth size="small" label="Source name" value={sourceForm.sourcename} onChange={(event) => setSourceForm({ ...sourceForm, sourcename: event.target.value })} /></Grid>
                  <Grid item xs={12} md={2}><TextField select fullWidth size="small" label="Status" value={sourceForm.status} onChange={(event) => setSourceForm({ ...sourceForm, status: event.target.value })}>{["Active", "Inactive"].map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}</TextField></Grid>
                  <Grid item xs={12} md={6}><TextField fullWidth size="small" label="Description" value={sourceForm.description} onChange={(event) => setSourceForm({ ...sourceForm, description: event.target.value })} /></Grid>
                  <Grid item xs={12}>
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                      <Button variant="contained" disabled={saving} onClick={saveSource}>{sourceEditId ? "Update source" : "Add source"}</Button>
                      <Button variant="outlined" onClick={() => { setSourceEditId(""); setSourceForm(sourceBlank); }}>Clear</Button>
                      <Button variant="outlined" startIcon={<FileDownload />} onClick={() => downloadTemplate("raw_data_source_template.xlsx", sourceBlank)}>Template</Button>
                      <Button variant="outlined" component="label" startIcon={<UploadFile />}>
                        Bulk upload
                        <input hidden type="file" accept=".xlsx,.xls,.csv" onChange={uploadSources} />
                      </Button>
                    </Stack>
                  </Grid>
                </Grid>
              </Paper>
              <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #e5e7eb" }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                  <Button color="error" variant="outlined" startIcon={<Delete />} disabled={!sourceSelection.length} onClick={() => deleteSources(sourceSelection)}>Bulk delete</Button>
                  <Typography variant="body2" color="text.secondary">{sourceSelection.length} selected</Typography>
                </Stack>
                <Box sx={{ height: 460, width: "100%" }}>
                  <DataGrid rows={sources} columns={sourceColumns} getRowId={(row) => row._id} checkboxSelection rowSelectionModel={sourceSelection} onRowSelectionModelChange={setSourceSelection} slots={{ toolbar: GridToolbar }} slotProps={{ toolbar: { showQuickFilter: true, csvOptions: { fileName: "raw_data_sources" } } }} pageSizeOptions={[10, 25, 50, 100]} initialState={{ pagination: { paginationModel: { pageSize: 25, page: 0 } } }} />
                </Box>
              </Paper>
            </>
          )}
        </Stack>
      </Box>
    </MenuPageShell>
  );
}
