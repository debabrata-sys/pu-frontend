import React, { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Checkbox,
  Grid,
  LinearProgress,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import { DataGrid, GridToolbar } from "@mui/x-data-grid";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import ep1 from "../api/ep1";
import global1 from "./global1";
import MenuPageShell from "./MenuPageShell";

const uniq = (items) => [...new Set(items.map((item) => String(item || "").trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
const label = (row, primary = "panelname") => row ? `${row[primary] || ""}${row.programcode ? ` (${row.programcode})` : ""}` : "";
const blankPanel = { academicyear: "", regulation: "", program: "", programcode: "", panelname: "", description: "", status: "Active" };
const blankRegistration = { academicyear: "", regulation: "", exam: "", examcode: "", program: "", programcode: "", type: "", subject: "", semester: "", course: "", coursecode: "", papersettername: "", papersetteremail: "", startdate: "", enddate: "", admindocuments: [], status: "assigned" };

const useConductExamOptions = () => {
  const [courses, setCourses] = useState([]);
  const [users, setUsers] = useState([]);
  const [busy, setBusy] = useState(false);
  const load = async () => {
    setBusy(true);
    try {
      const res = await ep1.get("/api/v2/conductexam/papersetter-options", { params: { colid: global1.colid } });
      setCourses(res.data?.courses || []);
      setUsers(res.data?.users || []);
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => { load(); }, []);
  return { courses, users, busy };
};

const usePanelOptions = () => {
  const [panels, setPanels] = useState([]);
  const loadPanels = async (params = {}) => {
    const res = await ep1.get("/api/v2/conductexam/papersetter-panels", { params: { colid: global1.colid, ...params } });
    setPanels(res.data?.data || []);
    return res.data?.data || [];
  };
  return { panels, setPanels, loadPanels };
};

const programOptionsFromCourses = (courses, context = {}) => {
  const map = new Map();
  courses
    .filter((row) => !context.academicyear || row.academicyear === context.academicyear)
    .filter((row) => !context.regulation || row.regulation === context.regulation)
    .forEach((row) => {
      if (row.programcode) map.set(row.programcode, { program: row.program, programcode: row.programcode });
    });
  return [...map.values()].sort((a, b) => String(a.program || "").localeCompare(String(b.program || "")));
};

const filterParams = (filters) => Object.fromEntries(Object.entries(filters).filter(([, value]) => value));

const uploadSheet = async (event, mapper, postUrl, onDone, onError, setUploading) => {
  const file = event.target.files?.[0];
  event.target.value = "";
  if (!file) return;
  try {
    setUploading(true);
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const items = XLSX.utils.sheet_to_json(sheet, { defval: "" }).map((row, index) => mapper({ ...row, rowNumber: index + 2 }));
    const res = await ep1.post(postUrl, { colid: global1.colid, name: global1.name, user: global1.user, items });
    onDone(res.data);
  } catch (err) {
    onError(err.response?.data?.message || "Unable to upload file.");
  } finally {
    setUploading(false);
  }
};

const FilterBar = ({ filters, options, onChange, onLoad, onClear, loading }) => (
  <Paper elevation={0} sx={{ p: 2, mb: 2, border: "1px solid #e5e7eb", borderRadius: 2 }}>
    <Grid container spacing={2}>
      {Object.keys(filters).map((field) => (
        <Grid item xs={12} md={2.4} key={field}>
          <Autocomplete
            options={options[field] || []}
            value={filters[field] || ""}
            onChange={(event, value) => onChange({ ...filters, [field]: value || "" })}
            renderInput={(params) => <TextField {...params} label={field} />}
          />
        </Grid>
      ))}
      <Grid item xs={12} md={2}><Button fullWidth variant="contained" onClick={onLoad} disabled={loading} sx={{ height: 56 }}>{loading ? "Loading..." : "Load"}</Button></Grid>
      <Grid item xs={12} md={2}><Button fullWidth variant="outlined" onClick={onClear} disabled={loading} sx={{ height: 56 }}>Clear</Button></Grid>
    </Grid>
  </Paper>
);

export function ConductExamPaperSetterPanelPage() {
  const { courses, busy } = useConductExamOptions();
  const [form, setForm] = useState(blankPanel);
  const [rows, setRows] = useState([]);
  const [filters, setFilters] = useState({ academicyear: "", regulation: "", programcode: "", panelname: "", status: "" });
  const [selected, setSelected] = useState([]);
  const [editId, setEditId] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const programs = useMemo(() => programOptionsFromCourses(courses, form), [courses, form]);
  const options = useMemo(() => ({
    academicyear: uniq([...courses.map((row) => row.academicyear), ...rows.map((row) => row.academicyear)]),
    regulation: uniq([...courses.map((row) => row.regulation), ...rows.map((row) => row.regulation)]),
    programcode: uniq([...courses.map((row) => row.programcode), ...rows.map((row) => row.programcode)]),
    panelname: uniq(rows.map((row) => row.panelname)),
    status: uniq(["Active", "Inactive", ...rows.map((row) => row.status)])
  }), [courses, rows]);

  const loadRows = async () => {
    setLoading(true);
    try {
      const res = await ep1.get("/api/v2/conductexam/papersetter-panels", { params: { colid: global1.colid, ...filterParams(filters) } });
      setRows(res.data?.data || []);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load panels.");
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      await ep1.post("/api/v2/conductexam/papersetter-panels", { ...form, id: editId, colid: global1.colid, name: global1.name, user: global1.user });
      setMessage(editId ? "Panel updated." : "Panel saved.");
      setForm(blankPanel);
      setEditId("");
      await loadRows();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to save panel.");
    } finally {
      setSaving(false);
    }
  };

  const bulkDelete = async () => {
    if (!selected.length || !window.confirm("Delete selected panels and their members?")) return;
    setSaving(true);
    try {
      await ep1.post("/api/v2/conductexam/papersetter-panels-delete", { colid: global1.colid, ids: selected });
      setMessage("Selected panels deleted.");
      setSelected([]);
      await loadRows();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to delete panels.");
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { field: "academicyear", headerName: "Academic Year", width: 140 },
    { field: "regulation", headerName: "Regulation", width: 150 },
    { field: "program", headerName: "Program", minWidth: 180, flex: 1 },
    { field: "programcode", headerName: "Program Code", width: 150 },
    { field: "panelname", headerName: "Panel Name", minWidth: 220, flex: 1 },
    { field: "description", headerName: "Description", minWidth: 220, flex: 1 },
    { field: "status", headerName: "Status", width: 120 },
    { field: "actions", headerName: "Actions", width: 110, sortable: false, renderCell: (params) => <Button size="small" onClick={() => { setEditId(params.row._id); setForm({ ...blankPanel, ...params.row }); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Edit</Button> }
  ];

  return (
    <MenuPageShell title="Paper Setter Panel">
      <Box sx={{ p: 3, bgcolor: "#f6f7fb", minHeight: "100vh" }}>
        <Paper elevation={0} sx={{ p: 2.5, mb: 2, border: "1px solid #e5e7eb", borderRadius: 2 }}>
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2}>
            <Box><Typography variant="h5" fontWeight={900}>Paper Setter Panel</Typography><Typography color="text.secondary">Create program-wise paper setter panels.</Typography></Box>
            <Stack direction="row" spacing={1}>
              <Button variant="outlined" onClick={() => XLSX.writeFile(Object.assign(XLSX.utils.book_new(), { Sheets: { Template: XLSX.utils.json_to_sheet([{ ...blankPanel, academicyear: "2026-27", regulation: "Regulation", program: "Program", programcode: "CODE", panelname: "Panel 1" }]) }, SheetNames: ["Template"] }), "paper_setter_panel_template.xlsx")}>Template</Button>
              <Button component="label" variant="contained" startIcon={<UploadFileIcon />} disabled={uploading}>Bulk Upload<input hidden type="file" accept=".xlsx,.xls,.csv" onChange={(e) => uploadSheet(e, (row) => row, "/api/v2/conductexam/papersetter-panels-bulk", (data) => { setMessage(`${data.saved || 0} panels uploaded.`); loadRows(); }, setError, setUploading)} /></Button>
              <Button color="error" variant="outlined" disabled={!selected.length || saving} onClick={bulkDelete}>Bulk Delete</Button>
            </Stack>
          </Stack>
          {(busy || saving || uploading) && <LinearProgress sx={{ mt: 2 }} />}
        </Paper>
        {message && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMessage("")}>{message}</Alert>}
        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}
        <Paper elevation={0} sx={{ p: 2, mb: 2, border: "1px solid #e5e7eb", borderRadius: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={2}><Autocomplete options={uniq(courses.map((row) => row.academicyear))} value={form.academicyear} onChange={(e, value) => setForm({ ...blankPanel, academicyear: value || "" })} renderInput={(params) => <TextField {...params} label="Academic Year" />} /></Grid>
            <Grid item xs={12} md={2}><Autocomplete options={uniq(courses.filter((row) => !form.academicyear || row.academicyear === form.academicyear).map((row) => row.regulation))} value={form.regulation} onChange={(e, value) => setForm((prev) => ({ ...prev, regulation: value || "", program: "", programcode: "" }))} renderInput={(params) => <TextField {...params} label="Regulation" />} /></Grid>
            <Grid item xs={12} md={3}><Autocomplete options={programs} value={programs.find((item) => item.programcode === form.programcode) || null} getOptionLabel={(option) => `${option.program || ""} (${option.programcode || ""})`} onChange={(e, value) => setForm((prev) => ({ ...prev, program: value?.program || "", programcode: value?.programcode || "" }))} renderInput={(params) => <TextField {...params} label="Program" />} /></Grid>
            <Grid item xs={12} md={3}><TextField fullWidth label="Panel Name" value={form.panelname} onChange={(e) => setForm({ ...form, panelname: e.target.value })} /></Grid>
            <Grid item xs={12} md={2}><TextField select fullWidth label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><MenuItem value="Active">Active</MenuItem><MenuItem value="Inactive">Inactive</MenuItem></TextField></Grid>
            <Grid item xs={12}><TextField fullWidth multiline minRows={2} label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Grid>
            <Grid item xs={12} md={2}><Button fullWidth variant="contained" disabled={saving} onClick={save}>{saving ? "Saving..." : editId ? "Update" : "Save"}</Button></Grid>
            <Grid item xs={12} md={2}><Button fullWidth variant="outlined" onClick={() => { setForm(blankPanel); setEditId(""); }}>Clear</Button></Grid>
          </Grid>
        </Paper>
        <FilterBar filters={filters} options={options} onChange={setFilters} onLoad={loadRows} onClear={() => { setFilters({ academicyear: "", regulation: "", programcode: "", panelname: "", status: "" }); setRows([]); }} loading={loading} />
        <Paper elevation={0} sx={{ p: 2, border: "1px solid #e5e7eb", borderRadius: 2 }}><Box sx={{ height: 620 }}><DataGrid rows={rows} getRowId={(row) => row._id} columns={columns} checkboxSelection rowSelectionModel={selected} onRowSelectionModelChange={setSelected} slots={{ toolbar: GridToolbar }} slotProps={{ toolbar: { showQuickFilter: true, csvOptions: { fileName: "paper_setter_panels" } } }} sx={{ "& .MuiDataGrid-cell": { whiteSpace: "normal", alignItems: "start" } }} /></Box></Paper>
      </Box>
    </MenuPageShell>
  );
}

export function ConductExamPaperSetterPanelAssignmentPage() {
  const { courses, users } = useConductExamOptions();
  const { panels, loadPanels } = usePanelOptions();
  const [filters, setFilters] = useState({ academicyear: "", regulation: "", programcode: "", panelname: "", approvalstatus: "" });
  const [selectedPanel, setSelectedPanel] = useState(null);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [members, setMembers] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const options = useMemo(() => ({ academicyear: uniq(courses.map((r) => r.academicyear)), regulation: uniq(courses.map((r) => r.regulation)), programcode: uniq(courses.map((r) => r.programcode)), panelname: uniq(panels.map((r) => r.panelname)), approvalstatus: ["Pending", "Approved", "Rejected"] }), [courses, panels]);

  const load = async () => {
    setLoading(true);
    try {
      await loadPanels(filterParams(filters));
      const res = await ep1.get("/api/v2/conductexam/papersetter-panel-members", { params: { colid: global1.colid, ...filterParams(filters) } });
      setMembers(res.data?.data || []);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load panel assignment data.");
    } finally {
      setLoading(false);
    }
  };

  const assign = async () => {
    if (!selectedPanel || !selectedUsers.length) {
      setError("Select a panel and one or more users.");
      return;
    }
    setSaving(true);
    try {
      await ep1.post("/api/v2/conductexam/papersetter-panel-members", { colid: global1.colid, panelid: selectedPanel._id, name: global1.name, user: global1.user, users: selectedUsers.map((u) => ({ membername: u.name, memberemail: u.email, role: u.role, department: u.department, designation: u.designation, institution: u.institution })) });
      setMessage("Panel members assigned.");
      setSelectedUsers([]);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to assign members.");
    } finally {
      setSaving(false);
    }
  };

  const bulkDelete = async () => {
    if (!selected.length || !window.confirm("Delete selected panel members?")) return;
    setSaving(true);
    try {
      await ep1.post("/api/v2/conductexam/papersetter-panel-members-delete", { colid: global1.colid, ids: selected });
      setMessage("Selected members deleted.");
      setSelected([]);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { field: "academicyear", headerName: "Academic Year", width: 140 },
    { field: "program", headerName: "Program", minWidth: 170, flex: 1 },
    { field: "panelname", headerName: "Panel", minWidth: 190, flex: 1 },
    { field: "membername", headerName: "Member", width: 180 },
    { field: "memberemail", headerName: "Email", width: 220 },
    { field: "role", headerName: "Role", width: 130 },
    { field: "department", headerName: "Department", width: 160 },
    { field: "approvalstatus", headerName: "Approval", width: 130 },
    { field: "status", headerName: "Status", width: 110 }
  ];

  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([{ membername: "Member Name", memberemail: "member@example.com", role: "Faculty", department: "Department", designation: "Professor", institution: "Institution", status: "Active" }]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Panel Members");
    XLSX.writeFile(wb, "paper_setter_panel_members_template.xlsx");
  };

  return (
    <MenuPageShell title="Paper Setter Panel Assignment">
      <Box sx={{ p: 3, bgcolor: "#f6f7fb", minHeight: "100vh" }}>
        <Paper elevation={0} sx={{ p: 2.5, mb: 2, border: "1px solid #e5e7eb", borderRadius: 2 }}>
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2}>
            <Box><Typography variant="h5" fontWeight={900}>Paper Setter Panel Assignment</Typography><Typography color="text.secondary">Add users to a panel. Member approval is handled separately.</Typography></Box>
            <Stack direction="row" spacing={1}>
              <Button variant="outlined" onClick={downloadTemplate}>Template</Button>
              <Button component="label" variant="contained" startIcon={<UploadFileIcon />} disabled={uploading || !selectedPanel}>
                Bulk Upload
                <input hidden type="file" accept=".xlsx,.xls,.csv" onChange={async (e) => {
                  if (!selectedPanel) {
                    setError("Select a panel before bulk upload.");
                    e.target.value = "";
                    return;
                  }
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (!file) return;
                  try {
                    setUploading(true);
                    const buffer = await file.arrayBuffer();
                    const workbook = XLSX.read(buffer, { type: "array" });
                    const sheet = workbook.Sheets[workbook.SheetNames[0]];
                    const users = XLSX.utils.sheet_to_json(sheet, { defval: "" }).map((row, index) => ({ ...row, rowNumber: index + 2 }));
                    const res = await ep1.post("/api/v2/conductexam/papersetter-panel-members", { colid: global1.colid, panelid: selectedPanel._id, name: global1.name, user: global1.user, users });
                    setMessage(`${res.data?.saved || 0} panel members uploaded.`);
                    await load();
                  } catch (err) {
                    setError(err.response?.data?.message || "Unable to upload panel members.");
                  } finally {
                    setUploading(false);
                  }
                }} />
              </Button>
              <Button color="error" variant="outlined" disabled={!selected.length || saving} onClick={bulkDelete}>Bulk Delete</Button>
            </Stack>
          </Stack>
          {(loading || saving || uploading) && <LinearProgress sx={{ mt: 2 }} />}
        </Paper>
        {message && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMessage("")}>{message}</Alert>}
        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}
        <FilterBar filters={filters} options={options} onChange={setFilters} onLoad={load} onClear={() => { setFilters({ academicyear: "", regulation: "", programcode: "", panelname: "", approvalstatus: "" }); setMembers([]); }} loading={loading} />
        <Paper elevation={0} sx={{ p: 2, mb: 2, border: "1px solid #e5e7eb", borderRadius: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={5}><Autocomplete options={panels} value={selectedPanel} getOptionLabel={(option) => label(option)} onChange={(e, value) => setSelectedPanel(value)} renderInput={(params) => <TextField {...params} label="Select Panel" />} /></Grid>
            <Grid item xs={12} md={5}><Autocomplete multiple disableCloseOnSelect options={users} value={selectedUsers} getOptionLabel={(option) => `${option.name || ""}${option.email ? ` (${option.email})` : ""}`} isOptionEqualToValue={(option, value) => option.email === value.email} onChange={(e, value) => setSelectedUsers(value || [])} renderOption={(props, option, { selected: checked }) => <li {...props}><Checkbox checked={checked} sx={{ mr: 1 }} />{option.name} ({option.email})</li>} renderInput={(params) => <TextField {...params} label="Select Users" />} /></Grid>
            <Grid item xs={12} md={2}><Button fullWidth variant="contained" onClick={assign} disabled={saving} sx={{ height: 56 }}>{saving ? "Assigning..." : "Assign"}</Button></Grid>
          </Grid>
        </Paper>
        <Paper elevation={0} sx={{ p: 2, border: "1px solid #e5e7eb", borderRadius: 2 }}><Box sx={{ height: 620 }}><DataGrid rows={members} getRowId={(row) => row._id} columns={columns} checkboxSelection rowSelectionModel={selected} onRowSelectionModelChange={setSelected} slots={{ toolbar: GridToolbar }} sx={{ "& .MuiDataGrid-cell": { whiteSpace: "normal", alignItems: "start" } }} /></Box></Paper>
      </Box>
    </MenuPageShell>
  );
}

export function ConductExamPaperSetterPanelApprovalPage() {
  const { courses } = useConductExamOptions();
  const [filters, setFilters] = useState({ academicyear: "", regulation: "", programcode: "", panelname: "", approvalstatus: "Pending" });
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState([]);
  const [comments, setComments] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const options = useMemo(() => ({ academicyear: uniq(courses.map((r) => r.academicyear)), regulation: uniq(courses.map((r) => r.regulation)), programcode: uniq(courses.map((r) => r.programcode)), panelname: uniq(rows.map((r) => r.panelname)), approvalstatus: ["Pending", "Approved", "Rejected"] }), [courses, rows]);
  const load = async () => {
    setLoading(true);
    try {
      const res = await ep1.get("/api/v2/conductexam/papersetter-panel-members", { params: { colid: global1.colid, ...filterParams(filters) } });
      setRows(res.data?.data || []);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load members.");
    } finally {
      setLoading(false);
    }
  };
  const act = async (approvalstatus) => {
    if (!selected.length) {
      setError("Select members first.");
      return;
    }
    setSaving(true);
    try {
      await ep1.post("/api/v2/conductexam/papersetter-panel-members-approve", { colid: global1.colid, ids: selected, approvalstatus, comments, approvedby: global1.name, approvedbyemail: global1.user });
      setMessage(`Selected members marked ${approvalstatus}.`);
      setSelected([]);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to update approval.");
    } finally {
      setSaving(false);
    }
  };
  const columns = [
    { field: "academicyear", headerName: "Academic Year", width: 140 },
    { field: "program", headerName: "Program", minWidth: 170, flex: 1 },
    { field: "panelname", headerName: "Panel", minWidth: 190, flex: 1 },
    { field: "membername", headerName: "Member", width: 180 },
    { field: "memberemail", headerName: "Email", width: 220 },
    { field: "role", headerName: "Role", width: 130 },
    { field: "approvalstatus", headerName: "Approval", width: 130 },
    { field: "comments", headerName: "Comments", minWidth: 180, flex: 1 }
  ];
  return (
    <MenuPageShell title="Paper Setter Panel Approval">
      <Box sx={{ p: 3, bgcolor: "#f6f7fb", minHeight: "100vh" }}>
        <Paper elevation={0} sx={{ p: 2.5, mb: 2, border: "1px solid #e5e7eb", borderRadius: 2 }}><Typography variant="h5" fontWeight={900}>Paper Setter Panel Approval</Typography><Typography color="text.secondary">Approve or reject selected panel members. The panel itself is not approved.</Typography>{(loading || saving) && <LinearProgress sx={{ mt: 2 }} />}</Paper>
        {message && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMessage("")}>{message}</Alert>}
        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}
        <FilterBar filters={filters} options={options} onChange={setFilters} onLoad={load} onClear={() => { setFilters({ academicyear: "", regulation: "", programcode: "", panelname: "", approvalstatus: "Pending" }); setRows([]); }} loading={loading} />
        <Paper elevation={0} sx={{ p: 2, mb: 2, border: "1px solid #e5e7eb", borderRadius: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={8}><TextField fullWidth label="Approval Comments" value={comments} onChange={(e) => setComments(e.target.value)} /></Grid>
            <Grid item xs={12} md={2}><Button fullWidth variant="contained" disabled={saving || !selected.length} onClick={() => act("Approved")} sx={{ height: 56 }}>{saving ? "Saving..." : "Approve Selected"}</Button></Grid>
            <Grid item xs={12} md={2}><Button fullWidth color="error" variant="outlined" disabled={saving || !selected.length} onClick={() => act("Rejected")} sx={{ height: 56 }}>Reject Selected</Button></Grid>
          </Grid>
        </Paper>
        <Paper elevation={0} sx={{ p: 2, border: "1px solid #e5e7eb", borderRadius: 2 }}><Box sx={{ height: 620 }}><DataGrid rows={rows} getRowId={(row) => row._id} columns={columns} checkboxSelection rowSelectionModel={selected} onRowSelectionModelChange={setSelected} slots={{ toolbar: GridToolbar }} sx={{ "& .MuiDataGrid-cell": { whiteSpace: "normal", alignItems: "start" } }} /></Box></Paper>
      </Box>
    </MenuPageShell>
  );
}

export function ConductExamPaperSetterRegistration2Page() {
  const { courses } = useConductExamOptions();
  const { panels, loadPanels } = usePanelOptions();
  const [form, setForm] = useState(blankRegistration);
  const [filters, setFilters] = useState({ academicyear: "", examcode: "", regulation: "", programcode: "", coursecode: "" });
  const [selectedPanel, setSelectedPanel] = useState(null);
  const [approvedMembers, setApprovedMembers] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [adminDocTitle, setAdminDocTitle] = useState("");
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState([]);
  const [editId, setEditId] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => { loadPanels({ status: "Active" }); }, []);

  const dropdowns = useMemo(() => {
    const byYear = courses.filter((row) => !form.academicyear || row.academicyear === form.academicyear);
    const byExam = byYear.filter((row) => !form.examcode || row.examcode === form.examcode);
    const byReg = byExam.filter((row) => !form.regulation || row.regulation === form.regulation);
    const byProg = byReg.filter((row) => !form.programcode || row.programcode === form.programcode);
    const programs = new Map();
    byReg.forEach((row) => row.programcode && programs.set(row.programcode, { program: row.program, programcode: row.programcode }));
    const courseMap = new Map();
    byProg.forEach((row) => row.coursecode && courseMap.set(row.coursecode, row));
    return {
      academicyears: uniq(courses.map((r) => r.academicyear)),
      exams: uniq(byYear.map((r) => `${r.examcode}||${r.exam}`)).map((v) => { const [examcode, exam] = v.split("||"); return { examcode, exam }; }),
      regulations: uniq(byExam.map((r) => r.regulation)),
      programs: [...programs.values()],
      coursesList: [...courseMap.values()]
    };
  }, [courses, form]);

  const filteredPanels = useMemo(() => panels.filter((panel) => (!form.academicyear || panel.academicyear === form.academicyear) && (!form.regulation || panel.regulation === form.regulation) && (!form.programcode || panel.programcode === form.programcode)), [panels, form]);
  const filterOptions = useMemo(() => ({ academicyear: uniq(courses.map((r) => r.academicyear)), examcode: uniq(courses.map((r) => r.examcode)), regulation: uniq(courses.map((r) => r.regulation)), programcode: uniq(courses.map((r) => r.programcode)), coursecode: uniq(courses.map((r) => r.coursecode)) }), [courses]);

  const loadMembers = async (panel) => {
    setApprovedMembers([]);
    setSelectedMember(null);
    if (!panel?._id) return;
    const res = await ep1.get("/api/v2/conductexam/papersetter-panel-members", { params: { colid: global1.colid, panelid: panel._id, approvalstatus: "Approved", status: "Active" } });
    setApprovedMembers(res.data?.data || []);
  };

  const loadRows = async () => {
    setLoading(true);
    try {
      const res = await ep1.get("/api/v2/conductexam/papersetters", { params: { colid: global1.colid, ...filterParams(filters) } });
      setRows(res.data?.data || []);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load registration list.");
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    if (!selectedPanel?._id || !selectedMember?.memberemail) {
      setError("Select panel and approved member.");
      return;
    }
    setSaving(true);
    try {
      await ep1.post("/api/v2/conductexam/papersetters", { ...form, id: editId, papersettername: selectedMember.membername, papersetteremail: selectedMember.memberemail, colid: global1.colid, user: global1.user });
      setMessage(editId ? "Paper setter registration updated." : "Paper setter registered from approved panel member.");
      setForm(blankRegistration);
      setAdminDocTitle("");
      setSelectedPanel(null);
      setSelectedMember(null);
      setApprovedMembers([]);
      setEditId("");
      await loadRows();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to save registration.");
    } finally {
      setSaving(false);
    }
  };

  const uploadAdminDocument = async (file) => {
    if (!file) return;
    try {
      setUploadingDoc(true);
      setError("");
      const formData = new FormData();
      formData.append("file", file);
      formData.append("colid", global1.colid);
      const res = await ep1.post("/api/v2/conductexam/question-paper-upload", formData, { headers: { "Content-Type": "multipart/form-data" } });
      const data = res.data?.data || {};
      setForm((prev) => ({ ...prev, admindocuments: [...(prev.admindocuments || []), { title: adminDocTitle || file.name, filename: data.filename || file.name, url: data.url || "", uploadedby: global1.user, uploadeddate: new Date().toISOString() }] }));
      setAdminDocTitle("");
      setMessage("Document uploaded.");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to upload document.");
    } finally {
      setUploadingDoc(false);
    }
  };

  const bulkDelete = async () => {
    if (!selected.length || !window.confirm("Delete selected paper setter registrations?")) return;
    setSaving(true);
    try {
      await Promise.all(selected.map((id) => ep1.post("/api/v2/conductexam/papersetters-delete", { id, colid: global1.colid })));
      setMessage("Selected registrations deleted.");
      setSelected([]);
      await loadRows();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to delete selected registrations.");
    } finally {
      setSaving(false);
    }
  };

  const setCourseDetails = (coursecode) => {
    const selectedCourse = dropdowns.coursesList.find((row) => row.coursecode === coursecode);
    setForm((prev) => ({ ...prev, coursecode, course: selectedCourse?.course || "", type: selectedCourse?.type || "", subject: selectedCourse?.subject || "", semester: selectedCourse?.semester || "" }));
  };

  const columns = [
    { field: "academicyear", headerName: "Year", width: 120 },
    { field: "exam", headerName: "Exam", minWidth: 180, flex: 1 },
    { field: "program", headerName: "Program", minWidth: 160, flex: 1 },
    { field: "course", headerName: "Course", minWidth: 190, flex: 1 },
    { field: "coursecode", headerName: "Course Code", width: 140 },
    { field: "papersettername", headerName: "Paper Setter", width: 180 },
    { field: "papersetteremail", headerName: "Paper Setter Email", width: 220 },
    { field: "startdate", headerName: "Start Date", width: 130, valueGetter: (params) => params.row.startdate ? String(params.row.startdate).slice(0, 10) : "" },
    { field: "enddate", headerName: "End Date", width: 130, valueGetter: (params) => params.row.enddate ? String(params.row.enddate).slice(0, 10) : "" },
    { field: "status", headerName: "Status", width: 120 },
    { field: "actions", headerName: "Actions", width: 110, sortable: false, renderCell: (params) => <Button size="small" onClick={() => { setEditId(params.row._id); setForm({ ...blankRegistration, ...params.row, startdate: params.row.startdate ? String(params.row.startdate).slice(0, 10) : "", enddate: params.row.enddate ? String(params.row.enddate).slice(0, 10) : "", admindocuments: params.row.admindocuments || [] }); }}>Edit</Button> }
  ];

  return (
    <MenuPageShell title="Paper Setter Registration 2">
      <Box sx={{ p: 3, bgcolor: "#f6f7fb", minHeight: "100vh" }}>
        <Paper elevation={0} sx={{ p: 2.5, mb: 2, border: "1px solid #e5e7eb", borderRadius: 2 }}>
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2}><Box><Typography variant="h5" fontWeight={900}>Paper Setter Registration 2</Typography><Typography color="text.secondary">Select a panel first, then register only approved panel members as paper setters.</Typography></Box><Button color="error" variant="outlined" disabled={!selected.length || saving} onClick={bulkDelete}>Bulk Delete</Button></Stack>
          {(loading || saving) && <LinearProgress sx={{ mt: 2 }} />}
        </Paper>
        {message && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMessage("")}>{message}</Alert>}
        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}
        <Paper elevation={0} sx={{ p: 2, mb: 2, border: "1px solid #e5e7eb", borderRadius: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={2}><Autocomplete options={dropdowns.academicyears} value={form.academicyear} onChange={(e, v) => { setForm({ ...blankRegistration, academicyear: v || "" }); setSelectedPanel(null); setApprovedMembers([]); }} renderInput={(params) => <TextField {...params} label="Academic Year" />} /></Grid>
            <Grid item xs={12} md={3}><Autocomplete options={dropdowns.exams} value={dropdowns.exams.find((x) => x.examcode === form.examcode) || null} getOptionLabel={(option) => option ? `${option.exam || ""} (${option.examcode || ""})` : ""} onChange={(e, v) => setForm((prev) => ({ ...prev, examcode: v?.examcode || "", exam: v?.exam || "", regulation: "", program: "", programcode: "", course: "", coursecode: "" }))} renderInput={(params) => <TextField {...params} label="Exam" />} /></Grid>
            <Grid item xs={12} md={2}><Autocomplete options={dropdowns.regulations} value={form.regulation} onChange={(e, v) => setForm((prev) => ({ ...prev, regulation: v || "", program: "", programcode: "", course: "", coursecode: "" }))} renderInput={(params) => <TextField {...params} label="Regulation" />} /></Grid>
            <Grid item xs={12} md={3}><Autocomplete options={dropdowns.programs} value={dropdowns.programs.find((x) => x.programcode === form.programcode) || null} getOptionLabel={(option) => option ? `${option.program || ""} (${option.programcode || ""})` : ""} onChange={(e, v) => setForm((prev) => ({ ...prev, program: v?.program || "", programcode: v?.programcode || "", course: "", coursecode: "" }))} renderInput={(params) => <TextField {...params} label="Program" />} /></Grid>
            <Grid item xs={12} md={2}><Autocomplete options={dropdowns.coursesList} value={dropdowns.coursesList.find((x) => x.coursecode === form.coursecode) || null} getOptionLabel={(option) => option ? `${option.course || ""} (${option.coursecode || ""})` : ""} onChange={(e, v) => setCourseDetails(v?.coursecode || "")} renderInput={(params) => <TextField {...params} label="Course" />} /></Grid>
            <Grid item xs={12} md={5}><Autocomplete options={filteredPanels} value={selectedPanel} getOptionLabel={(option) => label(option)} onChange={(e, value) => { setSelectedPanel(value); loadMembers(value); }} renderInput={(params) => <TextField {...params} label="Paper Setter Panel" />} /></Grid>
            <Grid item xs={12} md={5}><Autocomplete options={approvedMembers} value={selectedMember} getOptionLabel={(option) => `${option.membername || ""}${option.memberemail ? ` (${option.memberemail})` : ""}`} isOptionEqualToValue={(option, value) => option._id === value._id} onChange={(e, value) => setSelectedMember(value)} renderInput={(params) => <TextField {...params} label="Approved Panel Member" />} /></Grid>
            <Grid item xs={12} md={2}><TextField fullWidth type="date" label="Start Date" InputLabelProps={{ shrink: true }} value={form.startdate} onChange={(e) => setForm({ ...form, startdate: e.target.value })} /></Grid>
            <Grid item xs={12} md={2}><TextField fullWidth type="date" label="End Date" InputLabelProps={{ shrink: true }} value={form.enddate} onChange={(e) => setForm({ ...form, enddate: e.target.value })} /></Grid>
            <Grid item xs={12} md={2}><TextField select fullWidth label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><MenuItem value="assigned">assigned</MenuItem><MenuItem value="Submitted">Submitted</MenuItem><MenuItem value="Inactive">Inactive</MenuItem></TextField></Grid>
            <Grid item xs={12} md={2}><Button fullWidth variant="contained" onClick={save} disabled={saving} sx={{ height: 56 }}>{saving ? "Saving..." : editId ? "Update" : "Save"}</Button></Grid>
            <Grid item xs={12} md={2}><Button fullWidth variant="outlined" onClick={() => { setForm(blankRegistration); setAdminDocTitle(""); setSelectedPanel(null); setSelectedMember(null); setApprovedMembers([]); setEditId(""); }} sx={{ height: 56 }}>Clear</Button></Grid>
            <Grid item xs={12} md={4}><TextField fullWidth label="Document Title" value={adminDocTitle} onChange={(e) => setAdminDocTitle(e.target.value)} /></Grid>
            <Grid item xs={12} md={3}><Button fullWidth component="label" variant="outlined" startIcon={<UploadFileIcon />} disabled={uploadingDoc} sx={{ height: 56 }}>{uploadingDoc ? "Uploading..." : "Upload Syllabus/Scheme/Other"}<input hidden type="file" onChange={(e) => uploadAdminDocument(e.target.files?.[0])} /></Button></Grid>
            <Grid item xs={12} md={5}><Stack direction="row" spacing={1} flexWrap="wrap">{(form.admindocuments || []).map((doc, index) => <Button key={`${doc.url}-${index}`} size="small" href={doc.url} target="_blank" rel="noreferrer">{doc.title || doc.filename || `Document ${index + 1}`}</Button>)}</Stack></Grid>
          </Grid>
        </Paper>
        <FilterBar filters={filters} options={filterOptions} onChange={setFilters} onLoad={loadRows} onClear={() => { setFilters({ academicyear: "", examcode: "", regulation: "", programcode: "", coursecode: "" }); setRows([]); }} loading={loading} />
        <Paper elevation={0} sx={{ p: 2, border: "1px solid #e5e7eb", borderRadius: 2 }}><Box sx={{ height: 620 }}><DataGrid rows={rows} getRowId={(row) => row._id} columns={columns} checkboxSelection rowSelectionModel={selected} onRowSelectionModelChange={setSelected} slots={{ toolbar: GridToolbar }} sx={{ "& .MuiDataGrid-cell": { whiteSpace: "normal", alignItems: "start" } }} /></Box></Paper>
      </Box>
    </MenuPageShell>
  );
}
