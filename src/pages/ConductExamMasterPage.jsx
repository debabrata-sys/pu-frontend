import React, { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { Alert, Autocomplete, Box, Button, Checkbox, Grid, MenuItem, Paper, Stack, TextField, Typography } from "@mui/material";
import { DataGrid, GridToolbar } from "@mui/x-data-grid";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import ep1 from "../api/ep1";
import global1 from "./global1";
import MenuPageShell from "./MenuPageShell";

const academicYears = ["2026-27", "2027-28", "2028-29", "2029-30", "2030-31"];
const sessions = ["Odd", "Even"];
const examTypes = ["Regular", "Supplementary"];
const semesterOptions = ["All", ...Array.from({ length: 12 }, (_, index) => String(index + 1))];
const normalizeSemesters = (values = []) => {
  const items = [...new Set((values || []).map((value) => String(value || "").trim()).filter(Boolean))];
  return items.includes("All") ? ["All"] : items;
};
const semesterText = (values = []) => normalizeSemesters(values).join(",");
const blankForm = { academicyear: "2026-27", examname: "", examcode: "", program: "", programcode: "", faculty: "", institution: "", department: "", semester: ["All"], session: "Odd", type: "Regular" };

export default function ConductExamMasterPage() {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(blankForm);
  const [editId, setEditId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadRows();
  }, []);

  const loadRows = async () => {
    try {
      const res = await ep1.get("/api/v2/conductexam/exams", { params: { colid: global1.colid } });
      setRows(res.data?.data || []);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load exams.");
    }
  };

  const saveRow = async () => {
    if (!form.academicyear || !form.examname || !form.examcode || !form.session || !form.type) {
      setError("All fields are required.");
      return;
    }
    try {
      setError("");
      await ep1.post("/api/v2/conductexam/exams", { ...form, semester: semesterText(form.semester), id: editId, colid: global1.colid, user: global1.user });
      setMessage(editId ? "Exam updated." : "Exam created.");
      setForm(blankForm);
      setEditId("");
      loadRows();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to save exam.");
    }
  };

  const editRow = (row) => {
    setEditId(row._id);
    setForm({
      academicyear: row.academicyear || "2026-27",
      examname: row.examname || "",
      examcode: row.examcode || "",
      program: row.program || "",
      programcode: row.programcode || "",
      faculty: row.faculty || "",
      institution: row.institution || "",
      department: row.department || "",
      semester: row.semester ? String(row.semester).split(",").map((item) => item.trim()).filter(Boolean) : ["All"],
      session: row.session || "Odd",
      type: row.type || "Regular"
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteRow = async (id) => {
    if (!window.confirm("Delete this exam?")) return;
    try {
      await ep1.post("/api/v2/conductexam/exams-delete", { id, colid: global1.colid });
      setMessage("Exam deleted.");
      loadRows();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to delete exam.");
    }
  };

  const downloadTemplate = () => {
    const worksheet = XLSX.utils.json_to_sheet([
      { academicyear: "2026-27", examname: "Semester End Examination", examcode: "BSC-2627-SEM1-ODD-REG", program: "B.Sc Computer Science", programcode: "BSC", faculty: "Science", institution: "Main Institution", department: "Computer Science", semester: "1", session: "Odd", type: "Regular" },
      { academicyear: "2026-27", examname: "Supplementary Examination", examcode: "BSC-2627-ALL-ODD-SUP", program: "B.Sc Computer Science", programcode: "BSC", faculty: "Science", institution: "Main Institution", department: "Computer Science", semester: "All", session: "Odd", type: "Supplementary" }
    ]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Exams");
    XLSX.writeFile(workbook, "conduct_exam_template.xlsx");
  };

  const handleBulkUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const items = XLSX.utils.sheet_to_json(sheet, { defval: "" }).map((row, index) => ({
        rowNumber: index + 2,
        academicyear: row.academicyear || row["Academic Year"] || "",
        examname: row.examname || row.exam || row["Exam Name"] || "",
        examcode: row.examcode || row["Exam Code"] || "",
        program: row.program || row.Program || "",
        programcode: row.programcode || row["Program Code"] || "",
        faculty: row.faculty || row.Faculty || "",
        institution: row.institution || row.Institution || "",
        department: row.department || row.Department || "",
        semester: row.semester || row.Semester || "All",
        session: row.session || row.Session || "",
        type: row.type || row.Type || ""
      }));
      const res = await ep1.post("/api/v2/conductexam/exams-bulk", { colid: global1.colid, user: global1.user, items });
      setMessage(`${res.data?.saved || 0} exams uploaded.`);
      loadRows();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to upload exams.");
    }
  };

  const columns = useMemo(() => [
    { field: "academicyear", headerName: "Academic Year", width: 140 },
    { field: "examname", headerName: "Exam Name", minWidth: 220, flex: 1 },
    { field: "examcode", headerName: "Exam Code", minWidth: 160, flex: 1 },
    { field: "program", headerName: "Program", minWidth: 180, flex: 1 },
    { field: "programcode", headerName: "Program Code", width: 140 },
    { field: "faculty", headerName: "Faculty", width: 170 },
    { field: "institution", headerName: "Institution", width: 180 },
    { field: "department", headerName: "Department", width: 170 },
    { field: "semester", headerName: "Semester", width: 140 },
    { field: "session", headerName: "Session", width: 120 },
    { field: "type", headerName: "Type of Exam", width: 160 },
    {
      field: "actions",
      headerName: "Actions",
      width: 180,
      sortable: false,
      renderCell: (params) => (
        <Stack direction="row" spacing={1}>
          <Button size="small" onClick={() => editRow(params.row)}>Edit</Button>
          <Button size="small" color="error" onClick={() => deleteRow(params.row._id)}>Delete</Button>
        </Stack>
      )
    }
  ], []);

  return (
    <MenuPageShell title="Create Exam">
    <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: "#f6f7fb", minHeight: "100vh" }}>
      <Paper elevation={0} sx={{ p: 2.5, mb: 2, border: "1px solid #e5e7eb", borderRadius: 2 }}>
        <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2}>
          <Box>
            <Typography variant="h5" fontWeight={900}>Create Exam</Typography>
            <Typography color="text.secondary">Create and manage examination master records.</Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" onClick={downloadTemplate}>Template</Button>
            <Button component="label" variant="contained" startIcon={<UploadFileIcon />}>
              Bulk Upload
              <input hidden type="file" accept=".xlsx,.xls,.csv" onChange={handleBulkUpload} />
            </Button>
          </Stack>
        </Stack>
      </Paper>
      {message && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMessage("")}>{message}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}
      <Paper elevation={0} sx={{ p: 2.5, mb: 2, border: "1px solid #e5e7eb", borderRadius: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={2.2}><TextField select fullWidth label="Academic Year" value={form.academicyear} onChange={(e) => setForm({ ...form, academicyear: e.target.value })}>{academicYears.map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}</TextField></Grid>
          <Grid item xs={12} md={3}><TextField fullWidth label="Exam Name" value={form.examname} onChange={(e) => setForm({ ...form, examname: e.target.value })} /></Grid>
          <Grid item xs={12} md={2.2}><TextField fullWidth label="Exam Code" value={form.examcode} onChange={(e) => setForm({ ...form, examcode: e.target.value })} /></Grid>
          <Grid item xs={12} md={2.2}>
            <Autocomplete
              multiple
              disableCloseOnSelect
              options={semesterOptions}
              value={form.semester}
              onChange={(_, value) => setForm({ ...form, semester: normalizeSemesters(value) })}
              renderOption={(props, option, { selected }) => <li {...props}><Checkbox checked={selected} sx={{ mr: 1 }} />{option}</li>}
              renderInput={(params) => <TextField {...params} label="Semester" />}
            />
          </Grid>
          <Grid item xs={12} md={1.6}><TextField select fullWidth label="Session" value={form.session} onChange={(e) => setForm({ ...form, session: e.target.value })}>{sessions.map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}</TextField></Grid>
          <Grid item xs={12} md={2}><TextField select fullWidth label="Type of Exam" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>{examTypes.map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}</TextField></Grid>
          <Grid item xs={12} md={1}><Button fullWidth variant="contained" onClick={saveRow} sx={{ height: 56 }}>{editId ? "Update" : "Save"}</Button></Grid>
        </Grid>
      </Paper>
      <Paper elevation={0} sx={{ p: 2, border: "1px solid #e5e7eb", borderRadius: 2 }}>
        <Box sx={{ height: 560 }}>
          <DataGrid rows={rows} getRowId={(row) => row._id} columns={columns} slots={{ toolbar: GridToolbar }} pageSizeOptions={[10, 25, 50]} disableRowSelectionOnClick />
        </Box>
      </Paper>
    </Box>
    </MenuPageShell>
  );
}
