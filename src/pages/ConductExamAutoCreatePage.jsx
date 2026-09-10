import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  Grid,
  Paper,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import { DataGrid, GridToolbar } from "@mui/x-data-grid";
import AutoModeIcon from "@mui/icons-material/AutoMode";
import RefreshIcon from "@mui/icons-material/Refresh";
import ep1 from "../api/ep1";
import global1 from "./global1";
import MenuPageShell from "./MenuPageShell";

const sessions = ["Odd", "Even"];
const examTypes = ["Regular", "Supplementary"];
const semesterOptions = ["All", ...Array.from({ length: 12 }, (_, index) => String(index + 1))];
const text = (value) => String(value || "").trim();
const uniqueSorted = (values) => [...new Set((values || []).map(text).filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
const normalizeSemesters = (values = []) => {
  const items = [...new Set((values || []).map(text).filter(Boolean))];
  return items.includes("All") ? ["All"] : items;
};
const expandedSemesters = (values = []) => {
  const items = normalizeSemesters(values);
  return items.includes("All") || !items.length ? semesterOptions.filter((item) => item !== "All") : items;
};

const academicYearCode = (year) => {
  const match = text(year).match(/(\d{4})\D+(\d{2,4})/);
  if (!match) return text(year).replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  return `${match[1].slice(-2)}${match[2].slice(-2)}`;
};

const shortCode = (value, fallback) => {
  const clean = text(value).replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  return clean || fallback;
};

const buildExamRow = ({ program, academicyear, semester, session, type }) => {
  const programCode = shortCode(program.programcode, "PROGRAM");
  const sessionCode = session === "Odd" ? "ODD" : "EVEN";
  const typeCode = type === "Supplementary" ? "SUP" : "REG";
  const semesterCode = `SEM${shortCode(semester, "ALL")}`;
  return {
    academicyear,
    examname: `${program.program || programCode} Semester ${semester} ${session} ${type} Examination ${academicyear}`,
    examcode: `${programCode}-${academicYearCode(academicyear)}-${semesterCode}-${sessionCode}-${typeCode}`,
    program: program.program || "",
    programcode: program.programcode || "",
    faculty: program.faculty || "",
    institution: program.institution || "",
    department: program.department || "",
    semester,
    session,
    type
  };
};

function ConductExamAutoCreateBase({ mode = "faculty", title, description }) {
  const [programs, setPrograms] = useState([]);
  const [existingExams, setExistingExams] = useState([]);
  const [form, setForm] = useState({ academicyear: "", selector: "", semesters: ["All"], session: "Odd", type: "Regular" });
  const [previewRows, setPreviewRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const selectorLabel = mode === "institution" ? "Institution" : "Faculty";
  const selectorField = mode === "institution" ? "institution" : "faculty";

  const loadBaseData = async () => {
    try {
      setLoading(true);
      setError("");
      const [programRes, examRes] = await Promise.all([
        ep1.get("/api/v2/mprograms-management", { params: { colid: global1.colid } }),
        ep1.get("/api/v2/conductexam/exams", { params: { colid: global1.colid } })
      ]);
      setPrograms(programRes.data?.data || []);
      setExistingExams(examRes.data?.data || []);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load program and exam data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadBaseData(); }, []);

  const academicYears = useMemo(() => uniqueSorted([
    ...programs.map((row) => row.year || row.academicyear),
    ...existingExams.map((row) => row.academicyear)
  ]), [existingExams, programs]);

  const selectorOptions = useMemo(() => uniqueSorted(
    programs
      .filter((row) => !form.academicyear || text(row.year || row.academicyear) === text(form.academicyear))
      .map((row) => row[selectorField])
  ), [form.academicyear, programs, selectorField]);

  const selectedPrograms = useMemo(() => {
    const map = new Map();
    programs
      .filter((row) => text(row.year || row.academicyear) === text(form.academicyear))
      .filter((row) => text(row[selectorField]) === text(form.selector))
      .filter((row) => text(row.programcode))
      .forEach((row) => {
        const key = text(row.programcode);
        if (!map.has(key)) map.set(key, row);
      });
    return [...map.values()].sort((a, b) => text(a.programcode).localeCompare(text(b.programcode), undefined, { numeric: true }));
  }, [form.academicyear, form.selector, programs, selectorField]);

  const generatePreview = () => {
    if (!form.academicyear || !form.selector || !form.semesters.length || !form.session || !form.type) {
      setError(`Select academic year, ${selectorLabel.toLowerCase()}, semester, session and exam type.`);
      return;
    }
    if (!selectedPrograms.length) {
      setPreviewRows([]);
      setError(`No programs found for selected ${selectorLabel.toLowerCase()}.`);
      return;
    }
    const existingKeys = new Set(existingExams.map((row) => `${text(row.academicyear)}||${text(row.examcode)}`));
    const rows = selectedPrograms.flatMap((program) => expandedSemesters(form.semesters).map((semester) => {
      const row = buildExamRow({ program, academicyear: form.academicyear, semester, session: form.session, type: form.type });
      return {
        ...row,
        id: `${row.programcode}-${row.semester}-${row.examcode}`,
        status: existingKeys.has(`${text(row.academicyear)}||${text(row.examcode)}`) ? "Existing" : "New"
      };
    }));
    setError("");
    setPreviewRows(rows);
    setMessage(`${rows.length} program-wise exams prepared for review.`);
  };

  const createExams = async () => {
    const rowsToCreate = previewRows.filter((row) => row.status !== "Existing");
    if (!rowsToCreate.length) {
      setError("No new exam rows to create.");
      return;
    }
    try {
      setSaving(true);
      setError("");
      const res = await ep1.post("/api/v2/conductexam/exams-bulk", {
        colid: global1.colid,
        user: global1.user,
        items: rowsToCreate
      });
      setMessage(`${res.data?.saved || 0} exams created. ${res.data?.errors?.length || 0} rows had errors.`);
      await loadBaseData();
      setPreviewRows((prev) => prev.map((row) => ({ ...row, status: "Existing" })));
    } catch (err) {
      setError(err.response?.data?.message || "Unable to create exams.");
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { field: "academicyear", headerName: "Academic Year", width: 140 },
    { field: "program", headerName: "Program", minWidth: 220, flex: 1 },
    { field: "programcode", headerName: "Program Code", width: 140 },
    { field: "faculty", headerName: "Faculty", width: 180 },
    { field: "institution", headerName: "Institution", width: 190 },
    { field: "department", headerName: "Department", width: 170 },
    { field: "semester", headerName: "Semester", width: 120 },
    { field: "examname", headerName: "Exam Name", minWidth: 280, flex: 1 },
    { field: "examcode", headerName: "Exam Code", width: 210 },
    { field: "session", headerName: "Session", width: 110 },
    { field: "type", headerName: "Type of Exam", width: 160 },
    {
      field: "status",
      headerName: "Status",
      width: 120,
      renderCell: (params) => <Chip size="small" color={params.value === "Existing" ? "default" : "success"} label={params.value} />
    }
  ];

  return (
    <MenuPageShell title={title}>
      <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: "#f6f7fb", minHeight: "100vh" }}>
        <Paper elevation={0} sx={{ p: 2.5, mb: 2, border: "1px solid #e5e7eb", borderRadius: 2 }}>
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2}>
            <Box>
              <Typography variant="h5" fontWeight={900}>{title}</Typography>
              <Typography color="text.secondary">{description}</Typography>
            </Box>
            <Stack direction="row" spacing={1}>
              <Button variant="outlined" startIcon={<RefreshIcon />} onClick={loadBaseData} disabled={loading}>Refresh</Button>
              <Button variant="contained" startIcon={<AutoModeIcon />} onClick={createExams} disabled={saving || !previewRows.some((row) => row.status !== "Existing")}>
                {saving ? "Creating..." : "Create Exams"}
              </Button>
            </Stack>
          </Stack>
        </Paper>

        {message && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMessage("")}>{message}</Alert>}
        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}

        <Paper elevation={0} sx={{ p: 2.5, mb: 2, border: "1px solid #e5e7eb", borderRadius: 2 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={2.4}>
              <Autocomplete
                options={academicYears}
                value={form.academicyear}
                onChange={(_, value) => setForm((prev) => ({ ...prev, academicyear: value || "", selector: "" }))}
                renderInput={(params) => <TextField {...params} label="Academic Year" />}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <Autocomplete
                options={selectorOptions}
                value={form.selector}
                onChange={(_, value) => setForm((prev) => ({ ...prev, selector: value || "" }))}
                renderInput={(params) => <TextField {...params} label={selectorLabel} />}
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <Autocomplete
                multiple
                disableCloseOnSelect
                options={semesterOptions}
                value={form.semesters}
                onChange={(_, value) => setForm((prev) => ({ ...prev, semesters: normalizeSemesters(value) }))}
                renderOption={(props, option, { selected }) => <li {...props}><Checkbox checked={selected} sx={{ mr: 1 }} />{option}</li>}
                renderInput={(params) => <TextField {...params} label="Semester" />}
              />
            </Grid>
            <Grid item xs={12} md={1.7}>
              <Autocomplete
                options={sessions}
                value={form.session}
                onChange={(_, value) => setForm((prev) => ({ ...prev, session: value || "Odd" }))}
                renderInput={(params) => <TextField {...params} label="Session" />}
              />
            </Grid>
            <Grid item xs={12} md={1.9}>
              <Autocomplete
                options={examTypes}
                value={form.type}
                onChange={(_, value) => setForm((prev) => ({ ...prev, type: value || "Regular" }))}
                renderInput={(params) => <TextField {...params} label="Type of Exam" />}
              />
            </Grid>
            <Grid item xs={12} md={1.8}>
              <Button fullWidth variant="contained" onClick={generatePreview} disabled={loading} sx={{ height: 56 }}>Generate Preview</Button>
            </Grid>
          </Grid>
        </Paper>

        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} md={3}><Card><CardContent><Typography color="text.secondary">Programs Found</Typography><Typography variant="h4" fontWeight={900}>{selectedPrograms.length}</Typography></CardContent></Card></Grid>
          <Grid item xs={12} md={3}><Card><CardContent><Typography color="text.secondary">Preview Rows</Typography><Typography variant="h4" fontWeight={900}>{previewRows.length}</Typography></CardContent></Card></Grid>
          <Grid item xs={12} md={3}><Card><CardContent><Typography color="text.secondary">New Exams</Typography><Typography variant="h4" fontWeight={900}>{previewRows.filter((row) => row.status !== "Existing").length}</Typography></CardContent></Card></Grid>
          <Grid item xs={12} md={3}><Card><CardContent><Typography color="text.secondary">Existing Exams</Typography><Typography variant="h4" fontWeight={900}>{previewRows.filter((row) => row.status === "Existing").length}</Typography></CardContent></Card></Grid>
        </Grid>

        <Paper elevation={0} sx={{ p: 2, border: "1px solid #e5e7eb", borderRadius: 2 }}>
          <Box sx={{ height: 580, width: "100%" }}>
            <DataGrid
              rows={previewRows}
              columns={columns}
              loading={loading}
              slots={{ toolbar: GridToolbar }}
              slotProps={{ toolbar: { showQuickFilter: true, csvOptions: { fileName: mode === "institution" ? "create_exam_auto_institution" : "create_exam_auto_faculty" } } }}
              pageSizeOptions={[10, 25, 50, 100]}
              initialState={{ pagination: { paginationModel: { pageSize: 25, page: 0 } } }}
              sx={{ "& .MuiDataGrid-cell": { whiteSpace: "normal", alignItems: "flex-start", py: 1 } }}
            />
          </Box>
        </Paper>
      </Box>
    </MenuPageShell>
  );
}

export function ConductExamAutoFacultyPage() {
  return (
    <ConductExamAutoCreateBase
      mode="faculty"
      title="Create Exam Auto Faculty"
      description="Select academic year, faculty, session and exam type to automatically create one exam for every program in that faculty."
    />
  );
}

export function ConductExamAutoInstitutionPage() {
  return (
    <ConductExamAutoCreateBase
      mode="institution"
      title="Create Exam Auto 3"
      description="Select academic year, institution, session and exam type to automatically create one exam for every program in that institution."
    />
  );
}
