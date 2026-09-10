import React, { useEffect, useMemo, useState } from "react";
import { Autocomplete, Box, Button, Checkbox, Chip, FormControl, Grid, IconButton, InputLabel, ListItemText, MenuItem, OutlinedInput, Paper, Select, Stack, TextField, Tooltip, Typography, Alert } from "@mui/material";
import { DataGrid, GridToolbar } from "@mui/x-data-grid";
import { Delete, Edit, Save } from "@mui/icons-material";
import MenuPageShell from "./MenuPageShell";
import ep1 from "../api/ep1";
import global1 from "./global1";

const courseFields = ["academicyear", "regulation", "program", "programcode", "type", "subject", "semester", "course", "coursecode"];
const bloomLevels = ["Remember", "Understand", "Apply", "Analyze", "Evaluate", "Create"];
const blankForm = { conumber: "", co: "", modules: [], topics: [], bloomlevels: [], status: "Active" };
const unique = (rows, field) => [...new Set((rows || []).map((row) => row[field]).filter(Boolean))].sort();
const asArray = (value) => Array.isArray(value) ? value.map((item) => String(item || "").trim()).filter(Boolean) : String(value || "").split(/[,;|]/).map((item) => item.trim()).filter(Boolean);
const courseLabel = (row) => row ? `${row.course || ""} (${row.coursecode || ""}) | ${row.regulation || ""} | ${row.program || ""} (${row.programcode || ""})` : "";

function MultiSelect({ label, value, options, onChange, disabled }) {
  return (
    <FormControl fullWidth disabled={disabled}>
      <InputLabel>{label}</InputLabel>
      <Select
        multiple
        value={value}
        onChange={(event) => onChange(event.target.value)}
        input={<OutlinedInput label={label} />}
        renderValue={(selected) => <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>{selected.map((item) => <Chip key={item} size="small" label={item} />)}</Box>}
      >
        {options.map((option) => (
          <MenuItem key={option} value={option}>
            <Checkbox checked={value.includes(option)} />
            <ListItemText primary={option} primaryTypographyProps={{ sx: { whiteSpace: "normal" } }} />
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

export default function MyCourseOutcomePage() {
  const [assigned, setAssigned] = useState([]);
  const [academicyear, setAcademicyear] = useState("");
  const [semester, setSemester] = useState("");
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [syllabusRows, setSyllabusRows] = useState([]);
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(blankForm);
  const [editingId, setEditingId] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadAssigned = async () => {
    const res = await ep1.get("/api/v2/workloadassignment", { params: { colid: global1.colid, status: "Active", facultyemail: global1.user } });
    const data = res.data?.data || [];
    setAssigned(data);
    if (!academicyear && data[0]?.academicyear) setAcademicyear(data[0].academicyear);
    if (!semester && data[0]?.semester) setSemester(data[0].semester);
  };
  useEffect(() => { loadAssigned().catch((err) => setError(err.response?.data?.message || "Unable to load assigned courses")); }, []);

  const yearOptions = useMemo(() => unique(assigned, "academicyear"), [assigned]);
  const semesterOptions = useMemo(() => unique(assigned.filter((row) => !academicyear || row.academicyear === academicyear), "semester"), [assigned, academicyear]);
  const courseOptions = useMemo(() => {
    const map = new Map();
    assigned
      .filter((row) => (!academicyear || row.academicyear === academicyear) && (!semester || row.semester === semester))
      .forEach((row) => {
        const key = courseFields.map((field) => row[field] || "").join("||");
        if (!map.has(key)) map.set(key, row);
      });
    return [...map.values()].sort((a, b) => courseLabel(a).localeCompare(courseLabel(b)));
  }, [assigned, academicyear, semester]);

  useEffect(() => {
    if (courseOptions.length && !courseOptions.some((row) => row === selectedCourse || courseLabel(row) === courseLabel(selectedCourse))) setSelectedCourse(courseOptions[0]);
    if (!courseOptions.length) setSelectedCourse(null);
  }, [courseOptions]);

  const courseParams = (course = selectedCourse) => {
    const params = { colid: global1.colid };
    if (course) courseFields.forEach((field) => { params[field] = course[field] || ""; });
    return params;
  };

  const loadCourseData = async (course = selectedCourse) => {
    if (!course) {
      setRows([]);
      setSyllabusRows([]);
      return;
    }
    setLoading(true);
    try {
      const [syllabus, co] = await Promise.all([
        ep1.get("/api/v2/syllabus", { params: courseParams(course) }),
        ep1.get("/api/v2/courseoutcomes", { params: courseParams(course) })
      ]);
      setSyllabusRows(syllabus.data?.data || []);
      setRows(co.data?.data || []);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load CO data");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { if (selectedCourse) loadCourseData(selectedCourse); }, [selectedCourse]);

  const moduleOptions = useMemo(() => unique(syllabusRows, "module"), [syllabusRows]);
  const topicOptions = useMemo(() => {
    const source = form.modules.length ? syllabusRows.filter((row) => form.modules.includes(String(row.module || "").trim())) : syllabusRows;
    return unique(source, "syllabus");
  }, [syllabusRows, form.modules]);

  const save = async () => {
    if (!selectedCourse) return setError("Select an assigned course first");
    if (!form.co || !form.conumber) return setError("CO number and CO are required");
    try {
      const payload = { ...selectedCourse, ...form, colid: global1.colid, user: global1.user };
      if (editingId) await ep1.post("/api/v2/courseoutcomes/update", { ...payload, id: editingId });
      else await ep1.post("/api/v2/courseoutcomes", payload);
      setMessage(editingId ? "CO updated" : "CO added");
      setForm(blankForm);
      setEditingId("");
      await loadCourseData();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to save CO");
    }
  };

  const editRow = (row) => {
    setEditingId(row._id);
    setForm({ conumber: row.conumber || "", co: row.co || "", modules: asArray(row.modules), topics: asArray(row.topics), bloomlevels: asArray(row.bloomlevels), status: row.status || "Active" });
  };

  const deleteRow = async (row) => {
    if (!window.confirm("Delete this CO?")) return;
    await ep1.post("/api/v2/courseoutcomes/delete", { id: row._id });
    setMessage("CO deleted");
    await loadCourseData();
  };

  const columns = [
    { field: "conumber", headerName: "CO No.", width: 110 },
    { field: "co", headerName: "Course Outcome", minWidth: 360, flex: 1 },
    { field: "modules", headerName: "Modules", width: 200, valueGetter: (params) => asArray(params.row.modules).join(", ") },
    { field: "topics", headerName: "Topics", width: 260, valueGetter: (params) => asArray(params.row.topics).join(", ") },
    { field: "bloomlevels", headerName: "Bloom", width: 180, valueGetter: (params) => asArray(params.row.bloomlevels).join(", ") },
    { field: "status", headerName: "Status", width: 120 },
    {
      field: "actions",
      headerName: "Actions",
      width: 120,
      renderCell: ({ row }) => (
        <Stack direction="row" spacing={0.5}>
          <Tooltip title="Edit"><IconButton size="small" onClick={() => editRow(row)}><Edit fontSize="small" /></IconButton></Tooltip>
          <Tooltip title="Delete"><IconButton size="small" color="error" onClick={() => deleteRow(row)}><Delete fontSize="small" /></IconButton></Tooltip>
        </Stack>
      )
    }
  ];

  return (
    <MenuPageShell title="My CO">
      <Box sx={{ p: 2, bgcolor: "#f6f8fb", minHeight: "100vh" }}>
        <Stack spacing={2}>
          <Typography variant="h5" fontWeight={900}>My CO</Typography>
          {message && <Alert severity="success" onClose={() => setMessage("")}>{message}</Alert>}
          {error && <Alert severity="error" onClose={() => setError("")}>{error}</Alert>}
          <Paper sx={{ p: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={2}><Autocomplete options={yearOptions} value={academicyear || ""} onChange={(_, value) => setAcademicyear(value || "")} renderInput={(params) => <TextField {...params} label="Academic year" />} /></Grid>
              <Grid item xs={12} md={2}><Autocomplete options={semesterOptions} value={semester || ""} onChange={(_, value) => setSemester(value || "")} renderInput={(params) => <TextField {...params} label="Semester" />} /></Grid>
              <Grid item xs={12} md={8}><Autocomplete options={courseOptions} value={selectedCourse} onChange={(_, value) => setSelectedCourse(value)} getOptionLabel={courseLabel} renderInput={(params) => <TextField {...params} label="Assigned course" />} /></Grid>
            </Grid>
          </Paper>
          <Paper sx={{ p: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={3}><MultiSelect label="Modules" value={form.modules} options={moduleOptions} onChange={(value) => setForm((p) => ({ ...p, modules: value }))} disabled={!selectedCourse} /></Grid>
              <Grid item xs={12} md={3}><MultiSelect label="Topics" value={form.topics} options={topicOptions} onChange={(value) => setForm((p) => ({ ...p, topics: value }))} disabled={!selectedCourse} /></Grid>
              <Grid item xs={12} md={3}><MultiSelect label="Bloom taxonomy" value={form.bloomlevels} options={bloomLevels} onChange={(value) => setForm((p) => ({ ...p, bloomlevels: value }))} /></Grid>
              <Grid item xs={12} md={1}><TextField fullWidth label="CO No." value={form.conumber} onChange={(e) => setForm((p) => ({ ...p, conumber: e.target.value }))} /></Grid>
              <Grid item xs={12} md={2}><TextField select fullWidth label="Status" value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}><MenuItem value="Active">Active</MenuItem><MenuItem value="Inactive">Inactive</MenuItem></TextField></Grid>
              <Grid item xs={12} md={10}><TextField fullWidth multiline minRows={2} label="Course Outcome" value={form.co} onChange={(e) => setForm((p) => ({ ...p, co: e.target.value }))} /></Grid>
              <Grid item xs={12} md={2}><Button fullWidth sx={{ height: 56 }} variant="contained" startIcon={<Save />} onClick={save}>{editingId ? "Update" : "Save"}</Button></Grid>
            </Grid>
          </Paper>
          <Paper sx={{ p: 1 }}>
            <DataGrid rows={rows} columns={columns} getRowId={(row) => row._id} autoHeight loading={loading} slots={{ toolbar: GridToolbar }} pageSizeOptions={[10, 25, 50, 100]} />
          </Paper>
        </Stack>
      </Box>
    </MenuPageShell>
  );
}
