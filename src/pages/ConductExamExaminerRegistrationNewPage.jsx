import React, { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  FormLabel,
  Grid,
  IconButton,
  LinearProgress,
  MenuItem,
  Paper,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Tooltip,
  Typography
} from "@mui/material";
import { DataGrid, GridToolbar } from "@mui/x-data-grid";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import DownloadIcon from "@mui/icons-material/Download";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import PersonAddAlt1Icon from "@mui/icons-material/PersonAddAlt1";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import BadgeIcon from "@mui/icons-material/Badge";
import SchoolIcon from "@mui/icons-material/School";
import ep1 from "../api/ep1";
import global1 from "./global1";
import MenuPageShell from "./MenuPageShell";

const uniq = (arr) => [...new Set((arr || []).filter(Boolean).map((x) => String(x).trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));

const initialForm = {
  academicyear: "",
  regulation: "",
  exam: "",
  examcode: "",
  program: "",
  programcode: "",
  department: "",
  semester: "",
  examtype: "Main",
  course: "",
  coursecode: "",
  papername: "",
  papercode: "",
  examdate: "",

  examinername: "",
  examineremail: "",
  designation: "",
  instituteaddress: "",
  contactno: "",
  qualification: "",
  specialization: "",
  experience_ug: "0",
  experience_pg: "0",

  rolecategory: "Evaluator",
  stafftype: "External", // Internal or External

  bankname: "",
  bankbranch: "",
  accountno: "",
  ifsccode: "",
  panno: "",

  assignedcount: 30,
  customrate: 0
};

export default function ConductExamExaminerRegistrationNewPage() {
  const colid = global1.colid || 1;
  const [options, setOptions] = useState({
    academicyears: [],
    examcodes: [],
    programs: [],
    courses: [],
    roleCategories: ["Evaluator", "Paper Setter", "Moderator", "Invigilator"],
    staffTypes: ["Internal", "External"],
    examTypes: ["Main", "Suppl.", "ATKT", "Regular"],
    departments: [],
    users: []
  });

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [openDialog, setOpenDialog] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);

  const [filters, setFilters] = useState({
    academicyear: "",
    examcode: "",
    rolecategory: "",
    stafftype: ""
  });

  useEffect(() => {
    loadOptions();
    loadExaminers();
  }, []);

  const loadOptions = async () => {
    try {
      const res = await ep1.get("/api/v2/conductexam/remuneration/options", { params: { colid } });
      if (res.data?.success) {
        setOptions(res.data);
        if (res.data.academicyears?.length && !filters.academicyear) {
          setFilters((prev) => ({ ...prev, academicyear: res.data.academicyears[0] }));
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadExaminers = async (activeFilters = filters) => {
    try {
      setLoading(true);
      setError("");
      const params = { colid };
      if (activeFilters.academicyear) params.academicyear = activeFilters.academicyear;
      if (activeFilters.examcode) params.examcode = activeFilters.examcode;
      if (activeFilters.rolecategory) params.rolecategory = activeFilters.rolecategory;
      if (activeFilters.stafftype) params.stafftype = activeFilters.stafftype;

      const res = await ep1.get("/api/v2/conductexam/remuneration/examiners", { params });
      setRows(res.data?.data || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load examiners");
    } finally {
      setLoading(false);
    }
  };

  const [courseSourceFilter, setCourseSourceFilter] = useState("All");

  const cascadingDropdowns = useMemo(() => {
    const rawCourses = options.courses || [];
    const rawExams = options.exams || [];

    // Filter courses by Academic Year
    const byYear = rawCourses.filter((r) => !form.academicyear || r.academicyear === form.academicyear);

    // Filter courses by Exam Code:
    // If strict match has courses, use them; if not (e.g. newly scheduled or ATKT exam), fallback to byYear courses
    const byExamStrict = form.examcode ? byYear.filter((r) => r.examcode === form.examcode) : [];
    const byExam = byExamStrict.length > 0 ? byExamStrict : byYear;

    // Available regulations:
    // 1. From strictly matching exam in options.exams (e.g. ESATKT-025 -> R2020)
    // 2. From all courses matching the selected exam
    // 3. From options.regulations (RegulationMaster for this university: R2011, R2020, R2025, etc.)
    // 4. From all courses for this academic year
    const selectedExamObj = (options.exams || []).find((e) => e.examcode === form.examcode);
    const selectedExamReg = selectedExamObj?.regulation ? [selectedExamObj.regulation] : [];
    const examCourseRegs = byExamStrict.map((r) => r.regulation).filter(Boolean);
    const masterRegs = options.regulations || [];
    const yearCourseRegs = byYear.map((r) => r.regulation).filter(Boolean);

    const regulationsList = uniq([
      ...selectedExamReg,
      ...examCourseRegs,
      ...masterRegs,
      ...yearCourseRegs
    ]).filter(Boolean);

    // Filter courses by Regulation
    const byRegulation = byExam.filter(
      (r) => !form.regulation || !r.regulation || r.regulation === form.regulation
    );

    // Available programs
    const programMap = new Map();
    byRegulation.forEach((r) => {
      if (r.programcode && !programMap.has(r.programcode)) {
        programMap.set(r.programcode, {
          programcode: r.programcode,
          program: r.program || r.programcode
        });
      }
    });
    // Fallback programs from options if none in filtered courses
    if (programMap.size === 0) {
      byYear.forEach((r) => {
        if (r.programcode && !programMap.has(r.programcode)) {
          programMap.set(r.programcode, { programcode: r.programcode, program: r.program || r.programcode });
        }
      });
    }
    if (programMap.size === 0 && options.programs?.length) {
      options.programs.forEach((p) => {
        if (p.programcode && !programMap.has(p.programcode)) {
          programMap.set(p.programcode, p);
        }
      });
    }

    // Filter courses by Program
    const byProgram = byRegulation.filter(
      (r) => !form.programcode || !r.programcode || r.programcode === form.programcode
    );

    // Available semesters: Dynamic 1 to 10 (not hardcoded)
    const semestersList = Array.from({ length: 10 }, (_, i) => String(i + 1));

    // Filter courses by Semester
    const bySemester = byProgram.filter((r) => {
      if (!form.semester) return true;
      const f = String(form.semester).trim();
      const s = String(r.semester || "").trim();
      if (!s) return true;
      if (s === f) return true;
      const numF = parseInt(f.replace(/\D/g, ""), 10);
      const numS = parseInt(s.replace(/\D/g, ""), 10);
      return !isNaN(numF) && !isNaN(numS) && numF === numS;
    });

    // Available courses
    const courseMap = new Map();
    bySemester.forEach((r) => {
      const code = r.coursecode || r.papercode;
      if (code && !courseMap.has(code)) {
        courseMap.set(code, r);
      }
    });

    // Available exams for the selected Academic Year
    const examsMap = new Map();
    byYear.forEach((r) => {
      if (r.examcode && !examsMap.has(r.examcode)) {
        examsMap.set(r.examcode, {
          examcode: r.examcode,
          exam: r.exam || r.examcode,
          regulation: r.regulation,
          programcode: r.programcode,
          program: r.program,
          semester: r.semester
        });
      }
    });
    rawExams.forEach((e) => {
      if ((!form.academicyear || e.academicyear === form.academicyear) && !examsMap.has(e.examcode)) {
        examsMap.set(e.examcode, {
          examcode: e.examcode,
          exam: e.exam || e.examcode,
          regulation: e.regulation,
          programcode: e.programcode,
          program: e.program,
          semester: e.semester
        });
      }
    });
    if (examsMap.size === 0 && options.examcodes?.length) {
      options.examcodes.forEach((code) => examsMap.set(code, { examcode: code, exam: code }));
    }

    return {
      academicyears: uniq([
        ...(options.academicyears || []),
        ...rawCourses.map((r) => r.academicyear),
        "2026-27",
        "2025-26"
      ]),
      exams: [...examsMap.values()].sort((a, b) => a.examcode.localeCompare(b.examcode)),
      regulations: regulationsList,
      programs: [...programMap.values()].sort((a, b) => (a.program || "").localeCompare(b.program || "")),
      semesters: semestersList,
      courses: [...courseMap.values()].sort((a, b) => (a.course || "").localeCompare(b.course || ""))
    };
  }, [options, form.academicyear, form.examcode, form.regulation, form.programcode, form.semester]);

  const filteredCoursesByRole = useMemo(() => {
    let list = cascadingDropdowns.courses;
    if (courseSourceFilter && courseSourceFilter !== "All") {
      list = list.filter((c) => (c.roles || []).includes(courseSourceFilter));
    }
    return list;
  }, [cascadingDropdowns.courses, courseSourceFilter]);

  const handleAcademicYearChange = (newYear) => {
    setForm((prev) => ({
      ...prev,
      academicyear: newYear,
      examcode: "",
      exam: "",
      regulation: "",
      programcode: "",
      program: "",
      semester: "",
      coursecode: "",
      course: "",
      papercode: "",
      papername: ""
    }));
  };

  const handleExamChange = (newExamCode) => {
    const selected = (options.exams || []).find((e) => e.examcode === newExamCode) ||
      cascadingDropdowns.exams.find((e) => e.examcode === newExamCode);
    const autoReg = selected?.regulation || "";
    const autoProgCode = selected?.programcode || "";
    const autoProgName = selected?.program || "";
    const autoSem = selected?.semester || "";
    setForm((prev) => ({
      ...prev,
      examcode: newExamCode,
      exam: selected?.exam || newExamCode,
      regulation: autoReg || prev.regulation || "",
      programcode: autoProgCode || "",
      program: autoProgName || "",
      semester: autoSem || "",
      coursecode: "",
      course: "",
      papercode: "",
      papername: ""
    }));
  };

  const handleRegulationChange = (newReg) => {
    setForm((prev) => ({
      ...prev,
      regulation: newReg,
      coursecode: "",
      course: "",
      papercode: "",
      papername: ""
    }));
  };

  const handleProgramChange = (newProgCode) => {
    const selected = cascadingDropdowns.programs.find((p) => p.programcode === newProgCode);
    setForm((prev) => ({
      ...prev,
      programcode: newProgCode,
      program: selected?.program || newProgCode,
      coursecode: "",
      course: "",
      papercode: "",
      papername: ""
    }));
  };

  const handleSemesterChange = (newSem) => {
    setForm((prev) => ({
      ...prev,
      semester: newSem,
      coursecode: "",
      course: "",
      papercode: "",
      papername: ""
    }));
  };

  const handleCourseSelect = (courseRow) => {
    if (!courseRow) return;
    setForm((prev) => ({
      ...prev,
      coursecode: courseRow.coursecode || courseRow.papercode || prev.coursecode,
      papercode: courseRow.coursecode || courseRow.papercode || prev.papercode,
      course: courseRow.course || courseRow.papername || prev.course,
      papername: courseRow.course || courseRow.papername || prev.papername,
      department: courseRow.department || courseRow.subject || prev.department,
      semester: courseRow.semester || prev.semester,
      programcode: courseRow.programcode || prev.programcode,
      program: courseRow.program || prev.program,
      regulation: courseRow.regulation || prev.regulation || "",
      examdate: courseRow.examdate ? courseRow.examdate.slice(0, 10) : prev.examdate
    }));
  };

  const handleOpenAdd = () => {
    setEditingId(null);
    const defaultYear = filters.academicyear || options.academicyears?.[0] || "2025-26";
    const defaultExam = filters.examcode || options.examcodes?.[0] || "";
    const selectedExamObj = (options.exams || []).find((e) => e.examcode === defaultExam);
    setForm({
      ...initialForm,
      academicyear: defaultYear,
      examcode: defaultExam,
      regulation: selectedExamObj?.regulation || ""
    });
    setCourseSourceFilter("All");
    setOpenDialog(true);
  };

  const handleOpenEdit = (row) => {
    setEditingId(row._id);
    setForm({
      ...row,
      assignedcount: row.assignedcount || (row.rolecategory === "Evaluator" ? 30 : 1),
      customrate: row.customrate || 0
    });
    setCourseSourceFilter("All");
    setOpenDialog(true);
  };

  const handleSave = async () => {
    if (!form.examinername || !form.examineremail) {
      return setError("Examiner name and email are required.");
    }
    if (!form.academicyear || !form.examcode) {
      return setError("Academic year and Exam code are required.");
    }

    try {
      setSaving(true);
      setError("");
      const payload = {
        ...form,
        id: editingId,
        colid,
        user: global1.user || "admin"
      };
      const res = await ep1.post("/api/v2/conductexam/remuneration/examiners", payload);
      if (res.data?.success) {
        setMessage(editingId ? "Examiner updated successfully!" : "Examiner registered successfully!");
        setOpenDialog(false);
        loadExaminers();
      }
    } catch (err) {
      setError(err.response?.data?.message || "Error saving examiner.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this examiner record?")) return;
    try {
      const res = await ep1.post("/api/v2/conductexam/remuneration/examiners/delete", { id, colid });
      if (res.data?.success) {
        setMessage("Examiner deleted successfully.");
        loadExaminers();
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete examiner.");
    }
  };

  const downloadExcelTemplate = () => {
    const templateData = [
      {
        "Staff Type (Internal/External)": "External",
        "Role Category (Evaluator/Paper Setter/Moderator/Invigilator)": "Paper Setter",
        "Examiner Name": "Dr. Rajesh Sharma",
        "Examiner Email": "rajesh.sharma@example.com",
        "Designation": "Professor & Head",
        "Institute Address": "AIIMS Bhopal, Saket Nagar, Bhopal",
        "Contact No": "9876543210",
        "Qualification": "M.D., Ph.D.",
        "Specialization": "Human Anatomy",
        "Experience UG (Years)": "12",
        "Experience PG (Years)": "8",
        "Academic Year": filters.academicyear || "2026-27",
        "Exam Code": filters.examcode || "MBBS-PROF1-2026",
        "Program Code": "MBBS",
        "Program Name": "Bachelor of Medicine and Bachelor of Surgery",
        "Department": "Anatomy",
        "Semester/Prof": "Prof-1",
        "Exam Type (Main/Suppl./ATKT)": "Main",
        "Paper Code": "BS-2101",
        "Paper Name": "General Anatomy & Histology",
        "Exam Date": "2026-09-15",
        "Bank Name": "State Bank of India",
        "Bank Branch": "Bhopal Main Branch",
        "Account No": "30129482910",
        "IFSC Code": "SBIN0001234",
        "PAN No": "ABCDE1234F",
        "Assigned Count": "1",
        "Custom Rate (0 for default)": "1500"
      },
      {
        "Staff Type (Internal/External)": "Internal",
        "Role Category (Evaluator/Paper Setter/Moderator/Invigilator)": "Evaluator",
        "Examiner Name": "Dr. Sunita Verma",
        "Examiner Email": "sunita.verma@peoplesuniversity.edu.in",
        "Designation": "Associate Professor",
        "Institute Address": "People's College of Medical Sciences, Bhopal",
        "Contact No": "9823456789",
        "Qualification": "M.D.",
        "Specialization": "Physiology",
        "Experience UG (Years)": "9",
        "Experience PG (Years)": "4",
        "Academic Year": filters.academicyear || "2026-27",
        "Exam Code": filters.examcode || "MBBS-PROF1-2026",
        "Program Code": "MBBS",
        "Program Name": "Bachelor of Medicine and Bachelor of Surgery",
        "Department": "Physiology",
        "Semester/Prof": "Prof-1",
        "Exam Type (Main/Suppl./ATKT)": "Main",
        "Paper Code": "BS-2102",
        "Paper Name": "General Physiology",
        "Exam Date": "2026-09-18",
        "Bank Name": "Punjab National Bank",
        "Bank Branch": "People's Campus, Bhanpur",
        "Account No": "489201928392",
        "IFSC Code": "PUNB0123456",
        "PAN No": "XYZPQ9876K",
        "Assigned Count": "35",
        "Custom Rate (0 for default)": "40"
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Staff_Remuneration_Template");
    XLSX.writeFile(wb, "examiner_staff_registration_template.xlsx");
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        setLoading(true);
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const rawJson = XLSX.utils.sheet_to_json(wb.Sheets[wsname]);

        const items = rawJson.map((row) => ({
          stafftype: row["Staff Type (Internal/External)"] || row["Staff Type"] || "External",
          rolecategory: row["Role Category (Evaluator/Paper Setter/Moderator/Invigilator)"] || row["Role Category"] || row["Role"] || "Evaluator",
          examinername: row["Examiner Name"] || row["Name"],
          examineremail: row["Examiner Email"] || row["Email"],
          designation: row["Designation"] || "",
          instituteaddress: row["Institute Address"] || row["Address"] || "",
          contactno: row["Contact No"] || row["Phone"] || "",
          qualification: row["Qualification"] || "",
          specialization: row["Specialization"] || "",
          experience_ug: String(row["Experience UG (Years)"] || row["UG Experience"] || "0"),
          experience_pg: String(row["Experience PG (Years)"] || row["PG Experience"] || "0"),
          academicyear: row["Academic Year"] || filters.academicyear,
          examcode: row["Exam Code"] || filters.examcode,
          programcode: row["Program Code"] || "",
          program: row["Program Name"] || row["Program"] || "",
          department: row["Department"] || "",
          semester: row["Semester/Prof"] || row["Semester"] || "",
          examtype: row["Exam Type (Main/Suppl./ATKT)"] || row["Exam Type"] || "Main",
          papercode: row["Paper Code"] || "",
          papername: row["Paper Name"] || "",
          examdate: row["Exam Date"] || "",
          bankname: row["Bank Name"] || "",
          bankbranch: row["Bank Branch"] || "",
          accountno: String(row["Account No"] || ""),
          ifsccode: row["IFSC Code"] || "",
          panno: row["PAN No"] || "",
          assignedcount: Number(row["Assigned Count"] || 0),
          customrate: Number(row["Custom Rate (0 for default)"] || 0)
        }));

        const res = await ep1.post("/api/v2/conductexam/remuneration/examiners-bulk", {
          colid,
          academicyear: filters.academicyear,
          examcode: filters.examcode,
          items,
          user: global1.user || "admin"
        });

        if (res.data?.success) {
          setMessage(`Successfully bulk uploaded ${res.data.count} examiners!`);
          loadExaminers();
        }
      } catch (err) {
        setError(err.response?.data?.message || "Failed to process Excel file.");
      } finally {
        setLoading(false);
        e.target.value = "";
      }
    };
    reader.readAsBinaryString(file);
  };

  const columns = useMemo(
    () => [
      {
        field: "stafftype",
        headerName: "Staff Type",
        width: 130,
        renderCell: (params) => (
          <Chip
            label={params.value || "External"}
            color={/^Internal$/i.test(params.value) ? "primary" : "secondary"}
            variant="filled"
            size="small"
            sx={{ fontWeight: 700 }}
          />
        )
      },
      {
        field: "rolecategory",
        headerName: "Category / Role",
        width: 150,
        renderCell: (params) => (
          <Chip
            label={params.value || "Evaluator"}
            color={
              params.value === "Evaluator"
                ? "success"
                : params.value === "Paper Setter"
                ? "info"
                : params.value === "Moderator"
                ? "warning"
                : "default"
            }
            variant="outlined"
            size="small"
            sx={{ fontWeight: 600 }}
          />
        )
      },
      { field: "examinername", headerName: "Staff Name", width: 190, fontWeight: 700 },
      { field: "examineremail", headerName: "Email", width: 200 },
      { field: "designation", headerName: "Designation", width: 140 },
      { field: "instituteaddress", headerName: "Institute Address", width: 220 },
      { field: "contactno", headerName: "Contact No", width: 120 },
      { field: "qualification", headerName: "Qualification", width: 120 },
      { field: "specialization", headerName: "Specialization", width: 140 },
      {
        field: "papername",
        headerName: "Paper / Subject",
        width: 220,
        renderCell: (params) => {
          const r = params?.row || {};
          const name = (r && r.papername) || (r && r.course) || "";
          const code = (r && r.papercode) || (r && r.coursecode) || "";
          return code ? `${name} (${code})` : name;
        },
        valueGetter: (params) => {
          const r = (params && params.row) ? params.row : (params || {});
          const name = (r && r.papername) || (r && r.course) || "";
          const code = (r && r.papercode) || (r && r.coursecode) || "";
          return code ? `${name} (${code})` : name;
        }
      },
      { field: "program", headerName: "Program", width: 140 },
      { field: "department", headerName: "Department", width: 130 },
      { field: "bankname", headerName: "Bank Name", width: 150 },
      { field: "accountno", headerName: "Account No", width: 150 },
      { field: "ifsccode", headerName: "IFSC Code", width: 120 },
      { field: "panno", headerName: "PAN No", width: 120 },
      {
        field: "actions",
        headerName: "Actions",
        width: 110,
        sortable: false,
        renderCell: (params) => (
          <Stack direction="row" spacing={1}>
            <Tooltip title="Edit">
              <IconButton size="small" color="primary" onClick={() => handleOpenEdit(params.row)}>
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete">
              <IconButton size="small" color="error" onClick={() => handleDelete(params.row._id)}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        )
      }
    ],
    []
  );

  return (
    <MenuPageShell title="Examiner & Staff Registration">
      <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: "#f8fafc", minHeight: "100vh" }}>
        {/* Top Header Card */}
        <Paper elevation={0} sx={{ p: 2.5, mb: 2.5, borderRadius: 2, border: "1px solid #e2e8f0" }}>
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", md: "center" }} spacing={2}>
            <Box>
              <Typography variant="h5" fontWeight={800} color="#1e293b" sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <BadgeIcon color="primary" /> Examiner & Staff Registration
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Register Evaluators, Paper Setters, Moderators, and Invigilators with Internal / External designation and RTGS/NEFT bank details.
              </Typography>
            </Box>
            <Stack direction="row" spacing={1.5} flexWrap="wrap">
              <Button variant="outlined" startIcon={<DownloadIcon />} onClick={downloadExcelTemplate} size="medium">
                Template
              </Button>
              <Button variant="outlined" component="label" startIcon={<UploadFileIcon />} size="medium">
                Excel Import
                <input type="file" hidden accept=".xlsx,.xls,.csv" onChange={handleFileUpload} />
              </Button>
              <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenAdd} size="medium" sx={{ fontWeight: 700 }}>
                Register Staff
              </Button>
            </Stack>
          </Stack>
        </Paper>

        {/* Alerts */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
            {error}
          </Alert>
        )}
        {message && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMessage("")}>
            {message}
          </Alert>
        )}

        {/* Filters Card */}
        <Paper elevation={0} sx={{ p: 2, mb: 2.5, borderRadius: 2, border: "1px solid #e2e8f0" }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={3}>
              <TextField
                select
                fullWidth
                size="small"
                label="Academic Year"
                value={filters.academicyear}
                onChange={(e) => {
                  const next = { ...filters, academicyear: e.target.value };
                  setFilters(next);
                  loadExaminers(next);
                }}
              >
                <MenuItem value="">All Academic Years</MenuItem>
                {options.academicyears.map((yr) => (
                  <MenuItem key={yr} value={yr}>
                    {yr}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                select
                fullWidth
                size="small"
                label="Exam Code"
                value={filters.examcode}
                onChange={(e) => {
                  const next = { ...filters, examcode: e.target.value };
                  setFilters(next);
                  loadExaminers(next);
                }}
              >
                <MenuItem value="">All Exams</MenuItem>
                {options.examcodes.map((code) => (
                  <MenuItem key={code} value={code}>
                    {code}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                select
                fullWidth
                size="small"
                label="Category / Role"
                value={filters.rolecategory}
                onChange={(e) => {
                  const next = { ...filters, rolecategory: e.target.value };
                  setFilters(next);
                  loadExaminers(next);
                }}
              >
                <MenuItem value="">All Categories</MenuItem>
                {options.roleCategories.map((cat) => (
                  <MenuItem key={cat} value={cat}>
                    {cat}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                select
                fullWidth
                size="small"
                label="Staff Type"
                value={filters.stafftype}
                onChange={(e) => {
                  const next = { ...filters, stafftype: e.target.value };
                  setFilters(next);
                  loadExaminers(next);
                }}
              >
                <MenuItem value="">All (Internal & External)</MenuItem>
                <MenuItem value="Internal">Internal Only</MenuItem>
                <MenuItem value="External">External Only</MenuItem>
              </TextField>
            </Grid>
          </Grid>
        </Paper>

        {/* DataGrid */}
        <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: "1px solid #e2e8f0" }}>
          {loading && <LinearProgress sx={{ mb: 1 }} />}
          <Box sx={{ height: 600, width: "100%" }}>
            <DataGrid
              rows={rows}
              getRowId={(row) => row._id}
              columns={columns}
              loading={loading}
              pageSizeOptions={[10, 25, 50, 100]}
              initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
              slots={{ toolbar: GridToolbar }}
              slotProps={{ toolbar: { showQuickFilter: true } }}
              disableRowSelectionOnClick
            />
          </Box>
        </Paper>

        {/* Registration & Edit Dialog */}
        <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
          <DialogTitle sx={{ fontWeight: 800, bgcolor: "#f1f5f9", py: 2 }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <PersonAddAlt1Icon color="primary" />
              <span>{editingId ? "Edit Staff / Examiner" : "Register New Staff / Examiner"}</span>
            </Stack>
          </DialogTitle>
          <DialogContent dividers sx={{ p: 3 }}>
            {/* Section 1: Staff Classification */}
            <Typography variant="subtitle1" fontWeight={700} color="primary" sx={{ mb: 1.5, display: "flex", alignItems: "center", gap: 1 }}>
              <BadgeIcon fontSize="small" /> 1. Staff Classification & Role
            </Typography>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={6}>
                <FormControl component="fieldset" fullWidth sx={{ p: 1.5, border: "1px solid #cbd5e1", borderRadius: 1.5, bgcolor: "#f8fafc" }}>
                  <FormLabel component="legend" sx={{ fontWeight: 700, fontSize: "0.85rem" }}>
                    Staff Type (Internal vs External) *
                  </FormLabel>
                  <RadioGroup
                    row
                    value={form.stafftype}
                    onChange={(e) => setForm({ ...form, stafftype: e.target.value })}
                  >
                    <FormControlLabel value="Internal" control={<Radio color="primary" />} label="Internal (Within University)" />
                    <FormControlLabel value="External" control={<Radio color="secondary" />} label="External (Other Institution)" />
                  </RadioGroup>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  fullWidth
                  label="Role Sub-Category *"
                  value={form.rolecategory}
                  onChange={(e) => setForm({ ...form, rolecategory: e.target.value })}
                  helperText="Evaluator (all paid), Paper Setter/Moderator (paid only if External)"
                >
                  {options.roleCategories.map((cat) => (
                    <MenuItem key={cat} value={cat}>
                      {cat}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
            </Grid>

            <Divider sx={{ my: 2 }} />

            {/* Section 2: Personal & Contact Details */}
            <Typography variant="subtitle1" fontWeight={700} color="primary" sx={{ mb: 1, display: "flex", alignItems: "center", gap: 1 }}>
              <SchoolIcon fontSize="small" /> 2. Personal &amp; Professional Details
            </Typography>

            {/* Quick Search & Auto-Fill from existing faculty/staff */}
            <Paper elevation={0} sx={{ p: 2, mb: 2.5, bgcolor: "#eff6ff", borderRadius: 2, border: "1px solid #bfdbfe" }}>
              <Typography variant="caption" fontWeight={800} color="#1d4ed8" sx={{ display: "block", mb: 0.8, letterSpacing: "0.5px" }}>
                SEARCH &amp; ASSIGN FROM REGISTERED UNIVERSITY FACULTY / STAFF (OPTIONAL):
              </Typography>
              <Autocomplete
                options={options.users || []}
                getOptionLabel={(option) => `${option.name || ""} (${option.email || ""}) - ${option.department || option.role || "Faculty"}`}
                onChange={(event, selectedUser) => {
                  if (selectedUser) {
                    setForm((prev) => ({
                      ...prev,
                      examinername: selectedUser.name || prev.examinername,
                      examineremail: selectedUser.email || prev.examineremail,
                      department: selectedUser.department || prev.department,
                      contactno: selectedUser.phone || selectedUser.phoneno || prev.contactno,
                      designation: selectedUser.designation || selectedUser.role || prev.designation,
                      qualification: selectedUser.qualification || prev.qualification,
                      instituteaddress: selectedUser.address || "People's University, Bhopal",
                      stafftype: "Internal" // Set to Internal when selected from university staff
                    }));
                  }
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    size="small"
                    placeholder="Search by faculty name, email, or department to auto-assign..."
                    helperText="Selecting a registered faculty auto-populates their profile and sets them to Internal."
                  />
                )}
              />
            </Paper>

            {/* Assignment Authorization Alert */}
            <Alert severity="success" sx={{ mb: 2.5, py: 0.8, fontSize: "0.84rem", border: "1px solid #bbf7d0" }}>
              <strong>Work Authorization Enabled:</strong> Assigning a staff member here automatically authorizes them to do the work in the respective module:
              <ul style={{ margin: "4px 0 0 18px", padding: 0 }}>
                <li><strong>Paper Setter:</strong> Can access and draft/submit papers in <em>Question Paper Management &rarr; Paper Setter</em>.</li>
                <li><strong>Moderator:</strong> Can access and review/moderate papers in <em>Question Paper Management &rarr; Moderator Question Paper</em>.</li>
                <li><strong>Evaluator:</strong> Can access and evaluate answer sheets/enter marks in <em>Evaluator Management</em>.</li>
              </ul>
            </Alert>

            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  required
                  label="Name of Examiner / Staff"
                  value={form.examinername}
                  onChange={(e) => setForm({ ...form, examinername: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  required
                  type="email"
                  label="Email ID"
                  value={form.examineremail}
                  onChange={(e) => setForm({ ...form, examineremail: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Designation"
                  placeholder="e.g. Professor, Associate Prof."
                  value={form.designation}
                  onChange={(e) => setForm({ ...form, designation: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Contact No."
                  value={form.contactno}
                  onChange={(e) => setForm({ ...form, contactno: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Qualification"
                  placeholder="e.g. M.D., Ph.D., M.Tech"
                  value={form.qualification}
                  onChange={(e) => setForm({ ...form, qualification: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Institute Address"
                  placeholder="Official college/institute address"
                  value={form.instituteaddress}
                  onChange={(e) => setForm({ ...form, instituteaddress: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Specialization"
                  value={form.specialization}
                  onChange={(e) => setForm({ ...form, specialization: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField
                  fullWidth
                  label="Experience UG (Years)"
                  value={form.experience_ug}
                  onChange={(e) => setForm({ ...form, experience_ug: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField
                  fullWidth
                  label="Experience PG (Years)"
                  value={form.experience_pg}
                  onChange={(e) => setForm({ ...form, experience_pg: e.target.value })}
                />
              </Grid>
            </Grid>

            <Divider sx={{ my: 2 }} />

            {/* Section 3: Academic / Paper Details (Cascading Dropdowns) */}
            <Typography variant="subtitle1" fontWeight={700} color="primary" sx={{ mb: 1, display: "flex", alignItems: "center", gap: 1 }}>
              <SchoolIcon fontSize="small" /> 3. Examination &amp; Paper Assignment (Cascading Dropdowns)
            </Typography>

            {/* Quick role registry filter chips */}
            <Box sx={{ mb: 2, p: 1.5, bgcolor: "#f8fafc", borderRadius: 2, border: "1px solid #e2e8f0" }}>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                <Typography variant="caption" fontWeight={700} color="text.secondary">
                  FILTER COURSES / PAPERS REGISTERED FOR:
                </Typography>
                {["All", "Paper Setter", "Moderator", "Evaluator", "Invigilator"].map((roleName) => (
                  <Chip
                    key={roleName}
                    label={roleName === "All" ? "All Courses / Papers" : `${roleName} Registered`}
                    size="small"
                    color={courseSourceFilter === roleName ? "primary" : "default"}
                    variant={courseSourceFilter === roleName ? "filled" : "outlined"}
                    onClick={() => setCourseSourceFilter(roleName)}
                    sx={{ fontWeight: 600, cursor: "pointer" }}
                  />
                ))}
              </Stack>
            </Box>

            <Grid container spacing={2} sx={{ mb: 3 }}>
              {/* 1. Academic Year Dropdown */}
              <Grid item xs={12} sm={4}>
                <TextField
                  select
                  fullWidth
                  required
                  size="small"
                  label="Academic Year *"
                  value={form.academicyear}
                  onChange={(e) => handleAcademicYearChange(e.target.value)}
                  helperText="Cascades to Exam & Course lists"
                >
                  {cascadingDropdowns.academicyears.map((yr) => (
                    <MenuItem key={yr} value={yr}>{yr}</MenuItem>
                  ))}
                </TextField>
              </Grid>

              {/* 2. Exam Code & Name Dropdown */}
              <Grid item xs={12} sm={4}>
                <TextField
                  select
                  fullWidth
                  required
                  size="small"
                  label="Exam *"
                  value={form.examcode}
                  onChange={(e) => handleExamChange(e.target.value)}
                  helperText={cascadingDropdowns.exams.length === 0 ? "No exams for this year" : "Select exam to filter courses"}
                >
                  <MenuItem value="">-- Select Exam --</MenuItem>
                  {cascadingDropdowns.exams.map((ex) => (
                    <MenuItem key={ex.examcode} value={ex.examcode}>
                      {ex.examcode} {ex.exam && ex.exam !== ex.examcode ? `- ${ex.exam}` : ""}
                    </MenuItem>
                  ))}
                  {form.examcode && !cascadingDropdowns.exams.find((e) => e.examcode === form.examcode) && (
                    <MenuItem value={form.examcode}>{form.examcode} (Custom)</MenuItem>
                  )}
                </TextField>
              </Grid>

              {/* 3. Regulation Dropdown */}
              <Grid item xs={12} sm={4}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Regulation"
                  value={form.regulation || ""}
                  onChange={(e) => handleRegulationChange(e.target.value)}
                  helperText="Select regulation (e.g. R2020, R2011, R2025)"
                >
                  <MenuItem value="">-- All Regulations --</MenuItem>
                  {cascadingDropdowns.regulations.map((reg) => (
                    <MenuItem key={reg} value={reg}>{reg}</MenuItem>
                  ))}
                  {form.regulation && !cascadingDropdowns.regulations.includes(form.regulation) && (
                    <MenuItem value={form.regulation}>{form.regulation} (Custom)</MenuItem>
                  )}
                </TextField>
              </Grid>

              {/* 4. Program Dropdown */}
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Program"
                  value={form.programcode}
                  onChange={(e) => handleProgramChange(e.target.value)}
                  helperText="Filter by Degree / Branch"
                >
                  <MenuItem value="">All Programs (No Filter)</MenuItem>
                  {cascadingDropdowns.programs.map((p) => (
                    <MenuItem key={p.programcode} value={p.programcode}>
                      {p.program} ({p.programcode})
                    </MenuItem>
                  ))}
                  {form.programcode && !cascadingDropdowns.programs.find((p) => p.programcode === form.programcode) && (
                    <MenuItem value={form.programcode}>{form.program || form.programcode} (Custom)</MenuItem>
                  )}
                </TextField>
              </Grid>

              {/* 5. Semester Dropdown */}
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Semester"
                  value={form.semester}
                  onChange={(e) => handleSemesterChange(e.target.value)}
                  helperText="Filter by Semester (1 to 10)"
                >
                  <MenuItem value="">All Semesters (No Filter)</MenuItem>
                  {cascadingDropdowns.semesters.map((sem) => (
                    <MenuItem key={sem} value={sem}>{sem}</MenuItem>
                  ))}
                  {form.semester && !cascadingDropdowns.semesters.includes(form.semester) && (
                    <MenuItem value={form.semester}>{form.semester} (Custom)</MenuItem>
                  )}
                </TextField>
              </Grid>

              {/* 6. Course / Paper Selection (Cascading Dropdown with Search) */}
              <Grid item xs={12}>
                <Autocomplete
                  options={filteredCoursesByRole}
                  getOptionLabel={(option) => {
                    if (!option) return "";
                    if (typeof option === "string") return option;
                    const code = option.coursecode || option.papercode || "";
                    const name = option.course || option.papername || "";
                    return code ? `${code} - ${name}` : name;
                  }}
                  value={
                    filteredCoursesByRole.find(
                      (c) => c && ((c.coursecode && c.coursecode === (form.coursecode || form.papercode)) ||
                             (c.course && c.course === (form.course || form.papername)))
                    ) || null
                  }
                  onChange={(event, selectedCourse) => {
                    if (selectedCourse) {
                      handleCourseSelect(selectedCourse);
                    }
                  }}
                  renderOption={(props, option) => {
                    if (!option) return null;
                    return (
                      <li {...props} key={`${option.coursecode || ""}_${option.course || option.papername || ""}_${option.semester || ""}`}>
                        <Box sx={{ width: "100%", py: 0.5 }}>
                          <Typography variant="body2" fontWeight={700}>
                            {option.coursecode || option.papercode || ""} - {option.course || option.papername || ""}
                          </Typography>
                        <Stack direction="row" spacing={0.6} sx={{ mt: 0.5 }} flexWrap="wrap">
                          {option.programcode && (
                            <Chip label={option.programcode} size="small" variant="outlined" sx={{ fontSize: "0.7rem", height: 20 }} />
                          )}
                          {option.semester && (
                            <Chip label={option.semester} size="small" variant="outlined" sx={{ fontSize: "0.7rem", height: 20 }} />
                          )}
                          {option.coursetype && (
                            <Chip label={option.coursetype} size="small" color="default" sx={{ fontSize: "0.7rem", height: 20 }} />
                          )}
                          {(option.roles || []).map((r) => (
                            <Chip key={r} label={r} size="small" color="primary" sx={{ fontSize: "0.7rem", height: 20, bgcolor: "#dbeafe", color: "#1e40af" }} />
                          ))}
                        </Stack>
                      </Box>
                    </li>
                  );
                }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      size="small"
                      label="Select Course / Paper (Cascading Dropdown) *"
                      placeholder="Type course name or code to search..."
                      helperText={`${filteredCoursesByRole.length} course(s) matched for current Year, Exam & Filters. Selecting auto-fills paper details below.`}
                    />
                  )}
                />
              </Grid>

              {/* 7. Detailed Paper Fields (Auto-filled from selection and editable) */}
              <Grid item xs={12} sm={3}>
                <TextField
                  fullWidth
                  size="small"
                  label="Paper Code"
                  value={form.papercode || form.coursecode}
                  onChange={(e) => setForm({ ...form, papercode: e.target.value, coursecode: e.target.value })}
                  helperText="Auto-filled from course"
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField
                  fullWidth
                  size="small"
                  label="Department"
                  value={form.department}
                  onChange={(e) => setForm({ ...form, department: e.target.value })}
                  helperText="e.g. Anatomy, CSE, Math"
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Exam Type"
                  value={form.examtype || "Main"}
                  onChange={(e) => setForm({ ...form, examtype: e.target.value })}
                >
                  <MenuItem value="Main">Main</MenuItem>
                  <MenuItem value="Suppl.">Suppl.</MenuItem>
                  <MenuItem value="ATKT">ATKT</MenuItem>
                  <MenuItem value="Regular">Regular</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField
                  fullWidth
                  size="small"
                  label="Date of Examination"
                  type="date"
                  InputLabelProps={{ shrink: true }}
                  value={form.examdate ? form.examdate.slice(0, 10) : ""}
                  onChange={(e) => setForm({ ...form, examdate: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  size="small"
                  label="Paper Name / Subject"
                  value={form.papername || form.course}
                  onChange={(e) => setForm({ ...form, papername: e.target.value, course: e.target.value })}
                  helperText="Auto-filled from course selection, editable if needed"
                />
              </Grid>
            </Grid>

            <Divider sx={{ my: 2 }} />

            {/* Section 4: RTGS / NEFT Bank Details */}
            <Typography variant="subtitle1" fontWeight={700} color="primary" sx={{ mb: 1.5, display: "flex", alignItems: "center", gap: 1 }}>
              <AccountBalanceIcon fontSize="small" /> 4. Bank Account Details (for RTGS / NEFT Bill Transfer)
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Bank Name"
                  placeholder="e.g. State Bank of India"
                  value={form.bankname}
                  onChange={(e) => setForm({ ...form, bankname: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Branch Name"
                  placeholder="e.g. Main Branch, Bhopal"
                  value={form.bankbranch}
                  onChange={(e) => setForm({ ...form, bankbranch: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Bank Account No."
                  value={form.accountno}
                  onChange={(e) => setForm({ ...form, accountno: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="IFSC Code"
                  value={form.ifsccode}
                  onChange={(e) => setForm({ ...form, ifsccode: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Applicant's PAN No."
                  value={form.panno}
                  onChange={(e) => setForm({ ...form, panno: e.target.value })}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 2, bgcolor: "#f8fafc" }}>
            <Button onClick={() => setOpenDialog(false)} color="inherit">
              Cancel
            </Button>
            <Button variant="contained" onClick={handleSave} disabled={saving} sx={{ fontWeight: 700, px: 3 }}>
              {saving ? "Saving..." : editingId ? "Update Details" : "Register"}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </MenuPageShell>
  );
}
