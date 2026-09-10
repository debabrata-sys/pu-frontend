import React, { useEffect, useMemo, useState } from "react";
import { Autocomplete, Box, Button, Grid, Paper, Stack, TextField, Typography, Alert, IconButton, Tooltip } from "@mui/material";
import { DataGrid, GridToolbar } from "@mui/x-data-grid";
import { Delete, Edit, Save } from "@mui/icons-material";
import MenuPageShell from "./MenuPageShell";
import ep1 from "../api/ep1";
import global1 from "./global1";

const courseFields = ["academicyear", "regulation", "program", "programcode", "type", "subject", "semester", "course", "coursecode"];
const blankForm = { module: "", syllabus: "" };
const unique = (rows, field) => [...new Set((rows || []).map((row) => row[field]).filter(Boolean))].sort();
const courseLabel = (row) => row ? `${row.course || ""} (${row.coursecode || ""}) | ${row.regulation || ""} | ${row.program || ""} (${row.programcode || ""})` : "";

export default function MySyllabusPage() {
  const [assigned, setAssigned] = useState([]);
  const [academicyear, setAcademicyear] = useState("");
  const [semester, setSemester] = useState("");
  const [selectedCourse, setSelectedCourse] = useState(null);
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
    if (courseOptions.length && !courseOptions.some((row) => row === selectedCourse || courseLabel(row) === courseLabel(selectedCourse))) {
      setSelectedCourse(courseOptions[0]);
    }
    if (!courseOptions.length) setSelectedCourse(null);
  }, [courseOptions]);

  const loadRows = async (course = selectedCourse) => {
    if (!course) return setRows([]);
    setLoading(true);
    try {
      const params = { colid: global1.colid };
      courseFields.forEach((field) => { params[field] = course[field] || ""; });
      const res = await ep1.get("/api/v2/syllabus", { params });
      setRows(res.data?.data || []);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load syllabus rows");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (selectedCourse) loadRows(selectedCourse); }, [selectedCourse]);

  const save = async () => {
    if (!selectedCourse) return setError("Select an assigned course first");
    try {
      const payload = { ...selectedCourse, ...form, colid: global1.colid, user: global1.user };
      if (editingId) await ep1.post("/api/v2/syllabus/update", { ...payload, id: editingId });
      else await ep1.post("/api/v2/syllabus", payload);
      setMessage(editingId ? "Syllabus updated" : "Syllabus added");
      setForm(blankForm);
      setEditingId("");
      await loadRows();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to save syllabus");
    }
  };

  const editRow = (row) => {
    setEditingId(row._id);
    setForm({ module: row.module || "", syllabus: row.syllabus || "" });
  };

  const deleteRow = async (row) => {
    if (!window.confirm("Delete this syllabus row?")) return;
    await ep1.post("/api/v2/syllabus/delete", { id: row._id });
    setMessage("Syllabus deleted");
    await loadRows();
  };

  const columns = [
    { field: "module", headerName: "Module", width: 180 },
    { field: "syllabus", headerName: "Syllabus", minWidth: 420, flex: 1 },
    { field: "course", headerName: "Course", width: 220 },
    { field: "coursecode", headerName: "Course Code", width: 140 },
    { field: "programcode", headerName: "Program Code", width: 140 },
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
    <MenuPageShell title="My Syllabus">
      <Box sx={{ p: 2, bgcolor: "#f6f8fb", minHeight: "100vh" }}>
        <Stack spacing={2}>
          <Typography variant="h5" fontWeight={900}>My Syllabus</Typography>
          {message && <Alert severity="success" onClose={() => setMessage("")}>{message}</Alert>}
          {error && <Alert severity="error" onClose={() => setError("")}>{error}</Alert>}
          <Paper sx={{ p: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={2}><Autocomplete options={yearOptions} value={academicyear || ""} onChange={(_, value) => setAcademicyear(value || "")} renderInput={(params) => <TextField {...params} label="Academic year" />} /></Grid>
              <Grid item xs={12} md={2}><Autocomplete options={semesterOptions} value={semester || ""} onChange={(_, value) => setSemester(value || "")} renderInput={(params) => <TextField {...params} label="Semester" />} /></Grid>
              <Grid item xs={12} md={8}><Autocomplete options={courseOptions} value={selectedCourse} onChange={(_, value) => setSelectedCourse(value)} getOptionLabel={courseLabel} renderInput={(params) => <TextField {...params} label="Assigned course" />} /></Grid>
            </Grid>
          </Paper>
          {selectedCourse && <Alert severity="info">Regulation, program, program code, type, subject, course and course code are auto picked from workload assignment.</Alert>}
          <Paper sx={{ p: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={3}><TextField fullWidth label="Module" value={form.module} onChange={(e) => setForm((p) => ({ ...p, module: e.target.value }))} /></Grid>
              <Grid item xs={12} md={7}><TextField fullWidth multiline minRows={2} label="Syllabus" value={form.syllabus} onChange={(e) => setForm((p) => ({ ...p, syllabus: e.target.value }))} /></Grid>
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
