import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Checkbox,
  Grid,
  Paper,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import { DataGrid, GridToolbar } from "@mui/x-data-grid";
import AutoModeIcon from "@mui/icons-material/AutoMode";
import PrintIcon from "@mui/icons-material/Print";
import ep1 from "../api/ep1";
import global1 from "./global1";
import MenuPageShell from "./MenuPageShell";
import { printExamSchedule } from "./ConductExamSchedulePrintUtils";

const SELECT_ALL = { value: "__all__", label: "Select All" };
const text = (value) => String(value || "").trim();
const uniq = (items) => [...new Set((items || []).map(text).filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

function MultiProgramSelect({ options, value, onChange, disabled }) {
  const allSelected = options.length > 0 && value.length === options.length;
  return (
    <Autocomplete
      multiple
      disableCloseOnSelect
      disabled={disabled}
      options={[SELECT_ALL, ...options]}
      value={value}
      isOptionEqualToValue={(option, val) => option.value ? option.value === val.value : option.programcode === val.programcode}
      getOptionLabel={(option) => option.label || `${option.program || ""} (${option.programcode || ""})`}
      onChange={(_, next, reason, details) => {
        if (details?.option?.value === SELECT_ALL.value) onChange(allSelected ? [] : options);
        else onChange(next.filter((item) => item.value !== SELECT_ALL.value));
      }}
      renderOption={(props, option, { selected }) => <li {...props}><Checkbox checked={option.value === SELECT_ALL.value ? allSelected : selected} />{option.label || `${option.program} (${option.programcode})`}</li>}
      renderInput={(params) => <TextField {...params} label="Program / Program Code" />}
    />
  );
}

const courseColumns = [
  { field: "academicyear", headerName: "Academic Year", width: 140 },
  { field: "regulation", headerName: "Regulation", width: 150 },
  { field: "program", headerName: "Program", minWidth: 190, flex: 1 },
  { field: "programcode", headerName: "Program Code", width: 140 },
  { field: "semester", headerName: "Semester", width: 110 },
  { field: "subject", headerName: "Subject", minWidth: 170, flex: 1 },
  { field: "course", headerName: "Course", minWidth: 220, flex: 1 },
  { field: "coursecode", headerName: "Course Code", width: 150 },
  { field: "type", headerName: "Subject Type", width: 130 },
  { field: "coursetype", headerName: "Course Type", width: 140 },
  { field: "failedstudents", headerName: "Failed Students", width: 140, type: "number" }
];

const studentColumns = [
  { field: "program", headerName: "Program", minWidth: 180, flex: 1 },
  { field: "programcode", headerName: "Program Code", width: 140 },
  { field: "semester", headerName: "Semester", width: 110 },
  { field: "course", headerName: "Course", minWidth: 220, flex: 1 },
  { field: "coursecode", headerName: "Course Code", width: 150 },
  { field: "student", headerName: "Student", minWidth: 190, flex: 1 },
  { field: "regno", headerName: "Reg No", width: 150 },
  { field: "overallgrade", headerName: "Overall Grade", width: 130 },
  { field: "status", headerName: "Status", width: 100 },
  { field: "attempt", headerName: "Attempt", width: 100, type: "number" }
];

export default function ConductExamAtktSchedulerPage() {
  const [exams, setExams] = useState([]);
  const [marksRows, setMarksRows] = useState([]);
  const [institution, setInstitution] = useState({});
  const [form, setForm] = useState({ academicyear: "", regulation: "", examId: "", exam: "", examcode: "", programs: [] });
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedCourses, setSelectedCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadBase = async () => {
    const [examRes, marksRes, institutionRes] = await Promise.all([
      ep1.get("/api/v2/conductexam/exams", { params: { colid: global1.colid } }),
      ep1.get("/api/v2/examination-model2/viva-marks", { params: { colid: global1.colid } }),
      ep1.get("/vins", { params: { colid: global1.colid } }).catch(() => ({ data: {} }))
    ]);
    setExams(examRes.data?.data || []);
    setMarksRows(marksRes.data?.data || []);
    setInstitution(institutionRes.data || {});
  };

  useEffect(() => { loadBase().catch((err) => setError(err.response?.data?.message || "Unable to load ATKT scheduler options.")); }, []);

  const academicYears = useMemo(() => uniq([...exams.map((row) => row.academicyear), ...marksRows.map((row) => row.academicyear)]), [exams, marksRows]);
  const regulationOptions = useMemo(() => uniq(marksRows.filter((row) => !form.academicyear || row.academicyear === form.academicyear).map((row) => row.regulation)), [marksRows, form.academicyear]);
  const examOptions = useMemo(() => exams.filter((row) => !form.academicyear || row.academicyear === form.academicyear), [exams, form.academicyear]);
  const programOptions = useMemo(() => {
    const map = new Map();
    marksRows
      .filter((row) => row.status === "Fail" || /^fail$/i.test(row.status || ""))
      .filter((row) => !form.academicyear || row.academicyear === form.academicyear)
      .filter((row) => !form.regulation || row.regulation === form.regulation)
      .forEach((row) => {
        if (row.programcode) map.set(row.programcode, { program: row.program || row.programcode, programcode: row.programcode });
      });
    return [...map.values()].sort((a, b) => text(a.program).localeCompare(text(b.program)));
  }, [marksRows, form.academicyear, form.regulation]);

  const selectExam = (exam) => {
    setForm((prev) => ({ ...prev, examId: exam?._id || "", exam: exam?.examname || "", examcode: exam?.examcode || "", academicyear: exam?.academicyear || prev.academicyear }));
  };

  const loadAtkt = async () => {
    if (!form.academicyear || !form.regulation || !form.examcode || !form.programs.length) {
      setError("Select academic year, regulation, exam and at least one program.");
      return;
    }
    setLoading(true);
    setError("");
    setMessage("");
    setSelectedCourses([]);
    try {
      const res = await ep1.get("/api/v2/conductexam/atkt-scheduler-data", {
        params: {
          colid: global1.colid,
          academicyear: form.academicyear,
          regulation: form.regulation,
          programcodes: form.programs.map((row) => row.programcode)
        }
      });
      setCourses(res.data?.courses || []);
      setStudents(res.data?.students || []);
      setMessage(`${res.data?.courses?.length || 0} failed courses and ${res.data?.students?.length || 0} failed student-course rows loaded.`);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load ATKT data.");
    } finally {
      setLoading(false);
    }
  };

  const confirmAtkt = async () => {
    const chosen = courses.filter((row) => selectedCourses.includes(row.id));
    if (!chosen.length) {
      setError("Select at least one course from the course grid.");
      return;
    }
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const res = await ep1.post("/api/v2/conductexam/atkt-scheduler-confirm", {
        colid: global1.colid,
        user: global1.user,
        academicyear: form.academicyear,
        regulation: form.regulation,
        exam: form.exam,
        examcode: form.examcode,
        programcodes: form.programs.map((row) => row.programcode),
        courses: chosen
      });
      setMessage(`${res.data?.courseSaved || 0} courses added to scheduler and ${res.data?.rollSaved || 0} exam roll rows created.`);
      if (res.data?.errors?.length) setError(res.data.errors.map((item) => `${item.regno || item.coursecode || ""}: ${item.message}`).join(" | "));
    } catch (err) {
      setError(err.response?.data?.message || "Unable to confirm ATKT scheduler.");
    } finally {
      setLoading(false);
    }
  };

  const printPreview = () => {
    const selectedCourseRows = selectedCourses.length ? courses.filter((row) => selectedCourses.includes(row.id)) : courses;
    const selectedKeys = new Set(selectedCourseRows.map((row) => [row.academicyear, row.regulation, row.programcode, row.semester, row.coursecode].map(text).join("||")));
    const studentRows = selectedKeys.size
      ? students.filter((row) => selectedKeys.has([row.academicyear, row.regulation, row.programcode, row.semester, row.coursecode].map(text).join("||")))
      : students;
    printExamSchedule({
      title: "ATKT Schedule Preview",
      institution,
      meta: {
        "Academic Year": form.academicyear || "All",
        "Regulation": form.regulation || "All",
        "Exam Code": form.examcode || "All",
        "Programs": form.programs.length ? form.programs.map((row) => row.programcode).join(", ") : "All",
        "Generated On": new Date().toLocaleString()
      },
      sections: [
        {
          title: selectedCourses.length ? "Selected Failed Courses" : "Semesterwise Failed Courses",
          rows: selectedCourseRows,
          columns: courseColumns.map((column) => ({ field: column.field, headerName: column.headerName })),
          summary: [
            { label: "Courses", value: selectedCourseRows.length },
            { label: "Failed Student Rows", value: studentRows.length }
          ]
        },
        {
          title: "Failed Student-Course List",
          rows: studentRows,
          columns: studentColumns.map((column) => ({ field: column.field, headerName: column.headerName }))
        }
      ]
    });
  };

  return (
    <MenuPageShell title="ATKT scheduler">
      <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: "#f6f7fb", minHeight: "100vh" }}>
        <Paper elevation={0} sx={{ p: 2.5, mb: 2, border: "1px solid #e5e7eb", borderRadius: 2 }}>
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2}>
            <Box>
              <Typography variant="h5" fontWeight={900}>ATKT scheduler</Typography>
              <Typography color="text.secondary">Load failed courses from Exam Model 2 Viva Marks, add selected courses to conduct exam scheduler, and create corresponding exam roll rows.</Typography>
            </Box>
            <Stack direction="row" spacing={1}>
              <Button variant="outlined" startIcon={<PrintIcon />} onClick={printPreview} disabled={!courses.length && !students.length}>Print Preview</Button>
              <Button variant="outlined" onClick={loadAtkt} disabled={loading}>{loading ? "Loading..." : "Load ATKT Data"}</Button>
              <Button variant="contained" startIcon={<AutoModeIcon />} onClick={confirmAtkt} disabled={loading || !selectedCourses.length}>Confirm Selected Courses</Button>
            </Stack>
          </Stack>
        </Paper>

        {message && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMessage("")}>{message}</Alert>}
        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}

        <Paper elevation={0} sx={{ p: 2.5, mb: 2, border: "1px solid #e5e7eb", borderRadius: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={2.2}><Autocomplete options={academicYears} value={form.academicyear} onChange={(_, value) => setForm((prev) => ({ ...prev, academicyear: value || "", regulation: "", examId: "", exam: "", examcode: "", programs: [] }))} renderInput={(params) => <TextField {...params} label="Academic Year" />} /></Grid>
            <Grid item xs={12} md={2.2}><Autocomplete options={regulationOptions} value={form.regulation} onChange={(_, value) => setForm((prev) => ({ ...prev, regulation: value || "", programs: [] }))} renderInput={(params) => <TextField {...params} label="Regulation" />} /></Grid>
            <Grid item xs={12} md={3}><Autocomplete options={examOptions} value={examOptions.find((row) => row._id === form.examId) || null} getOptionLabel={(row) => row?._id ? `${row.examname} (${row.examcode})` : ""} onChange={(_, value) => selectExam(value)} renderInput={(params) => <TextField {...params} label="Exam / Exam Code" />} /></Grid>
            <Grid item xs={12} md={4.6}><MultiProgramSelect options={programOptions} value={form.programs} onChange={(value) => setForm((prev) => ({ ...prev, programs: value }))} disabled={!form.regulation} /></Grid>
          </Grid>
        </Paper>

        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Paper elevation={0} sx={{ p: 2, border: "1px solid #e5e7eb", borderRadius: 2 }}>
              <Typography variant="h6" fontWeight={900} sx={{ mb: 1 }}>Semesterwise failed course list</Typography>
              <Box sx={{ height: 360 }}>
                <DataGrid
                  rows={courses}
                  columns={courseColumns}
                  checkboxSelection
                  disableRowSelectionOnClick
                  rowSelectionModel={selectedCourses}
                  onRowSelectionModelChange={(ids) => setSelectedCourses(ids)}
                  loading={loading}
                  slots={{ toolbar: GridToolbar }}
                  pageSizeOptions={[10, 25, 50, 100]}
                />
              </Box>
            </Paper>
          </Grid>
          <Grid item xs={12}>
            <Paper elevation={0} sx={{ p: 2, border: "1px solid #e5e7eb", borderRadius: 2 }}>
              <Typography variant="h6" fontWeight={900} sx={{ mb: 1 }}>Failed student-course list</Typography>
              <Box sx={{ height: 460 }}>
                <DataGrid
                  rows={students.map((row) => ({ ...row, id: row._id }))}
                  columns={studentColumns}
                  loading={loading}
                  slots={{ toolbar: GridToolbar }}
                  pageSizeOptions={[10, 25, 50, 100]}
                />
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </MenuPageShell>
  );
}
