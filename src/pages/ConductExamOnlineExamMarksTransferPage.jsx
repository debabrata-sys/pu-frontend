import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  LinearProgress,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import { DataGrid, GridToolbar } from "@mui/x-data-grid";
import DownloadDoneIcon from "@mui/icons-material/DownloadDone";
import RefreshIcon from "@mui/icons-material/Refresh";
import MenuPageShell from "./MenuPageShell";
import ep1 from "../api/ep1";
import global1 from "./global1";

const uniq = (values) => [...new Set((values || []).filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }));
const courseLabel = (row) => row ? `${row.course || ""} (${row.coursecode || ""}) | ${row.exam || ""} (${row.examcode || ""}) | ${row.programcode || ""}` : "";
const componentLabel = (row) => row ? `${row.assessmentcomponent || ""} | ${row.componenttype || ""} | ${row.scoretype || ""} | ${row.assessmentgroup || ""} | Max: ${row.marks ?? row.maxmarks ?? 0}` : "";
const onlineExamLabel = (row) => row ? `${row.examname || ""} (${row.examcode || ""}) | ${row.coursecode || ""} | ${row.starttime ? new Date(row.starttime).toLocaleString() : ""}` : "";

export default function ConductExamOnlineExamMarksTransferPage({ vivaMode = false, myMode = false }) {
  const [options, setOptions] = useState({ courses: [], components: [], filters: {} });
  const [filters, setFilters] = useState({ academicyear: "", examcode: "", regulation: "", programcode: "", coursecode: "", componenttype: "" });
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedComponent, setSelectedComponent] = useState(null);
  const [onlineExams, setOnlineExams] = useState([]);
  const [selectedOnlineExam, setSelectedOnlineExam] = useState(null);
  const [rows, setRows] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const filteredCourses = useMemo(() => (options.courses || []).filter((row) => (
    (!filters.academicyear || row.academicyear === filters.academicyear)
    && (!filters.examcode || row.examcode === filters.examcode)
    && (!filters.regulation || row.regulation === filters.regulation)
    && (!filters.programcode || row.programcode === filters.programcode)
    && (!filters.coursecode || row.coursecode === filters.coursecode)
  )), [filters, options.courses]);

  const filteredComponents = useMemo(() => {
    if (!selectedCourse) return [];
    return (options.components || []).filter((row) => (
      row.academicyear === selectedCourse.academicyear
      && row.regulation === selectedCourse.regulation
      && row.programcode === selectedCourse.programcode
      && row.coursecode === selectedCourse.coursecode
      && (!filters.componenttype || row.componenttype === filters.componenttype)
    ));
  }, [filters.componenttype, options.components, selectedCourse]);

  const filterValues = useMemo(() => {
    const source = [...(options.courses || []), ...(options.components || [])];
    return {
      academicyear: uniq(source.map((row) => row.academicyear)),
      examcode: uniq(source.filter((row) => !filters.academicyear || row.academicyear === filters.academicyear).map((row) => row.examcode)),
      regulation: uniq(source.filter((row) => !filters.academicyear || row.academicyear === filters.academicyear).map((row) => row.regulation)),
      programcode: uniq(source.filter((row) => !filters.regulation || row.regulation === filters.regulation).map((row) => row.programcode)),
      coursecode: uniq(source.filter((row) => !filters.programcode || row.programcode === filters.programcode).map((row) => row.coursecode)),
      componenttype: uniq((options.components || []).map((row) => row.componenttype))
    };
  }, [filters, options]);

  const selectedComponentPayload = useMemo(() => ({
    componenttype: selectedComponent?.componenttype || "",
    scoretype: selectedComponent?.scoretype || "",
    assessmentgroup: selectedComponent?.assessmentgroup || "",
    assessmentgrouptype: selectedComponent?.grouptype || selectedComponent?.assessmentgrouptype || "",
    assessmentcomponent: selectedComponent?.assessmentcomponent || "",
    maxmarks: selectedComponent?.marks ?? selectedComponent?.maxmarks ?? 0,
    credits: selectedComponent?.credits ?? selectedComponent?.credit ?? 0
  }), [selectedComponent]);

  const loadOptions = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await ep1.get("/api/v2/examination-model2/component-allocation-options", { params: { colid: global1.colid } });
      setOptions({ courses: res.data?.courses || [], components: res.data?.components || [], filters: res.data?.filters || {} });
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load component options.");
    } finally {
      setLoading(false);
    }
  };

  const chooseCourse = (course) => {
    setSelectedCourse(course);
    setSelectedComponent(null);
    setSelectedOnlineExam(null);
    setOnlineExams([]);
    setRows([]);
    setSelectedRows([]);
    if (course) {
      setFilters((prev) => ({
        ...prev,
        academicyear: course.academicyear || "",
        examcode: course.examcode || "",
        regulation: course.regulation || "",
        programcode: course.programcode || "",
        coursecode: course.coursecode || ""
      }));
    }
  };

  const loadOnlineExams = async () => {
    if (!selectedCourse) {
      setError("Select conduct exam course first.");
      return;
    }
    try {
      setLoading(true);
      setError("");
      setRows([]);
      setSelectedRows([]);
      const res = await ep1.get("/api/v2/examination-model2/component-online-exams", {
        params: {
          colid: global1.colid,
          academicyear: selectedCourse.academicyear,
          regulation: selectedCourse.regulation,
          program: selectedCourse.program,
          programcode: selectedCourse.programcode,
          course: selectedCourse.course,
          coursecode: selectedCourse.coursecode,
          ...(myMode ? { createdby: global1.user } : {})
        }
      });
      const data = res.data?.data || [];
      setOnlineExams(data);
      setSelectedOnlineExam(data[0] || null);
      if (!data.length) setMessage("No online exam source found for the selected academic year, program code and course code.");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load online exams.");
    } finally {
      setLoading(false);
    }
  };

  const loadMarks = async (exam = selectedOnlineExam) => {
    if (!selectedCourse || !exam) return;
    try {
      setLoading(true);
      setError("");
      const res = await ep1.get("/api/v2/examination-model2/component-online-exam-marks", {
        params: {
          colid: global1.colid,
          onlineexamid: exam._id,
          academicyear: selectedCourse.academicyear,
          examcode: selectedCourse.examcode,
          regulation: selectedCourse.regulation,
          programcode: selectedCourse.programcode,
          coursecode: selectedCourse.coursecode,
          ...(selectedComponent ? selectedComponentPayload : {})
        }
      });
      setRows((res.data?.data || []).map((row) => ({ ...row, id: row._id })));
      setSelectedRows([]);
      if (!(res.data?.data || []).length) setMessage("No submitted online exam marks found for the selected online exam.");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load online exam marks.");
    } finally {
      setLoading(false);
    }
  };

  const transferMarks = async () => {
    if (!selectedCourse || !selectedComponent || !selectedOnlineExam) return setError("Select course, component and online exam first.");
    if (!selectedRows.length) return setError("Select at least one student row.");
    try {
      setSaving(true);
      setError("");
    const res = await ep1.post(vivaMode ? "/api/v2/examination-model2/component-online-exam-transfer-viva" : "/api/v2/examination-model2/component-online-exam-transfer", {
        colid: global1.colid,
        user: global1.user,
        onlineexamid: selectedOnlineExam._id,
        attemptids: selectedRows,
        academicyear: selectedCourse.academicyear,
        exam: selectedCourse.exam,
        examcode: selectedCourse.examcode,
        regulation: selectedCourse.regulation,
        program: selectedCourse.program,
        programcode: selectedCourse.programcode,
        semester: selectedCourse.semester,
        course: selectedCourse.course,
        coursecode: selectedCourse.coursecode,
        ...selectedComponentPayload
      });
      const errors = res.data?.errors || [];
      setMessage(`Transferred ${res.data?.transferred || 0} selected marks into ${vivaMode ? "viva model" : "exammodel2-component-marks-crud"}.`);
      if (errors.length) setError(errors.slice(0, 5).map((item) => `${item.regno || ""}: ${item.message}`).join(" | "));
      await loadMarks();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to transfer online exam marks.");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => { loadOptions(); }, []);
  useEffect(() => { if (selectedOnlineExam) loadMarks(selectedOnlineExam); }, [selectedOnlineExam, selectedComponent]);

  const columns = [
    { field: "student", headerName: "Student", minWidth: 180, flex: 1 },
    { field: "regno", headerName: "Reg No", width: 140 },
    { field: "email", headerName: "Email", minWidth: 190, flex: 1 },
    { field: "marksobtained", headerName: "Marks Obtained", width: 150, type: "number" },
    { field: "totalmarks", headerName: "Total Marks", width: 130, type: "number" },
    { field: "grade", headerName: "Grade", width: 110 },
    { field: "submittime", headerName: "Submitted", minWidth: 180, valueGetter: (params) => params.row.submittime ? new Date(params.row.submittime).toLocaleString() : "" },
    { field: "existingmark", headerName: "Existing Component Mark", width: 190 },
    { field: "existingstatus", headerName: "Existing Status", width: 150 }
  ];

  return (
    <MenuPageShell title={myMode ? (vivaMode ? "My Transfer Marks 2" : "My Online Exam Marks Transfer") : (vivaMode ? "Transfer Marks 2" : "Online Exam Marks Transfer")}>
      <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: "#f6f7fb", minHeight: "100vh" }}>
        <Paper elevation={0} sx={{ p: 2.5, mb: 2, border: "1px solid #e5e7eb", borderRadius: 2 }}>
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2}>
            <Box>
              <Typography variant="h5" fontWeight={900}>{myMode ? (vivaMode ? "My Transfer Marks 2" : "My Online Exam Marks Transfer") : (vivaMode ? "Transfer Marks 2" : "Online Exam Marks Transfer")}</Typography>
              <Typography color="text.secondary">
                {vivaMode
                  ? "Select a conduct exam course, component and online exam, then transfer selected submitted online exam marks into the Exam Model 2 viva marks model."
                  : "Select a conduct exam course, component and online exam, then transfer selected submitted online exam marks into exammodel2-component-marks-crud as Draft componentwise marks."}
              </Typography>
              {myMode && <Typography color="text.secondary">Online exam sources are restricted to exams created by {global1.name || global1.user}.</Typography>}
            </Box>
            <Button startIcon={<RefreshIcon />} variant="outlined" onClick={loadOptions}>Refresh</Button>
          </Stack>
          {(loading || saving) && <LinearProgress sx={{ mt: 2 }} />}
        </Paper>

        {message && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMessage("")}>{message}</Alert>}
        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}

        <Paper elevation={0} sx={{ p: 2.5, mb: 2, border: "1px solid #e5e7eb", borderRadius: 2 }}>
          <Grid container spacing={2}>
            {["academicyear", "examcode", "regulation", "programcode", "coursecode", "componenttype"].map((field) => (
              <Grid item xs={12} md={2} key={field}>
                <Autocomplete
                  options={filterValues[field] || []}
                  value={filters[field] || ""}
                  onChange={(_, value) => setFilters((prev) => ({ ...prev, [field]: value || "" }))}
                  renderInput={(params) => <TextField {...params} label={field} />}
                />
              </Grid>
            ))}
            <Grid item xs={12} md={6}>
              <Autocomplete
                options={filteredCourses}
                value={selectedCourse}
                isOptionEqualToValue={(option, value) => option._id === value._id}
                getOptionLabel={courseLabel}
                onChange={(_, value) => chooseCourse(value)}
                renderInput={(params) => <TextField {...params} label="Conduct exam course" />}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Autocomplete
                options={filteredComponents}
                value={selectedComponent}
                isOptionEqualToValue={(option, value) => option._id === value._id}
                getOptionLabel={componentLabel}
                onChange={(_, value) => {
                  setSelectedComponent(value);
                  setRows([]);
                  setSelectedRows([]);
                }}
                renderInput={(params) => <TextField {...params} label="Assessment component" />}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <Button fullWidth variant="contained" onClick={loadOnlineExams} disabled={loading || !selectedCourse} sx={{ height: 56 }}>
                Load Online Exams
              </Button>
            </Grid>
            <Grid item xs={12} md={9}>
              <Autocomplete
                options={onlineExams}
                value={selectedOnlineExam}
                isOptionEqualToValue={(option, value) => option._id === value._id}
                getOptionLabel={onlineExamLabel}
                onChange={(_, value) => setSelectedOnlineExam(value)}
                renderInput={(params) => <TextField {...params} label="Online exam source" />}
              />
            </Grid>
          </Grid>
        </Paper>

        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} md={3}><Card><CardContent><Typography color="text.secondary">Online exam rows</Typography><Typography variant="h4" fontWeight={900}>{rows.length}</Typography></CardContent></Card></Grid>
          <Grid item xs={12} md={3}><Card><CardContent><Typography color="text.secondary">Selected</Typography><Typography variant="h4" fontWeight={900}>{selectedRows.length}</Typography></CardContent></Card></Grid>
          <Grid item xs={12} md={3}><Card><CardContent><Typography color="text.secondary">Component max marks</Typography><Typography variant="h4" fontWeight={900}>{selectedComponentPayload.maxmarks || 0}</Typography></CardContent></Card></Grid>
          <Grid item xs={12} md={3}><Card><CardContent><Typography color="text.secondary">Transfer target</Typography><Chip color="info" label={vivaMode ? "Viva model" : "exammodel2-component-marks-crud"} /></CardContent></Card></Grid>
        </Grid>

        <Paper elevation={0} sx={{ p: 2, border: "1px solid #e5e7eb", borderRadius: 2 }}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1} justifyContent="space-between" alignItems={{ md: "center" }} sx={{ mb: 1.5 }}>
            <Box>
              <Typography fontWeight={900}>Submitted online exam marks</Typography>
              <Typography variant="body2" color="text.secondary">
                {vivaMode
                  ? "Select students and transfer their online exam marks obtained into the selected Theory, Practical or Viva fields."
                  : "Select students and transfer their online exam marks obtained into the selected component."}
              </Typography>
            </Box>
            <Button startIcon={<DownloadDoneIcon />} variant="contained" color="success" onClick={transferMarks} disabled={saving || !selectedRows.length || !selectedComponent || !selectedOnlineExam}>
              Transfer
            </Button>
          </Stack>
          <Box sx={{ height: 560, width: "100%" }}>
            <DataGrid
              rows={rows}
              columns={columns}
              checkboxSelection
              rowSelectionModel={selectedRows}
              onRowSelectionModelChange={(ids) => setSelectedRows(Array.from(ids))}
              loading={loading}
              slots={{ toolbar: GridToolbar }}
              pageSizeOptions={[10, 25, 50, 100]}
              sx={{ "& .MuiDataGrid-cell": { whiteSpace: "normal", alignItems: "flex-start", py: 1 } }}
            />
          </Box>
        </Paper>
      </Box>
    </MenuPageShell>
  );
}

export function ConductExamOnlineExamMarksTransferVivaPage() {
  return <ConductExamOnlineExamMarksTransferPage vivaMode />;
}

export function MyConductExamOnlineExamMarksTransferPage() {
  return <ConductExamOnlineExamMarksTransferPage myMode />;
}

export function MyConductExamOnlineExamMarksTransferVivaPage() {
  return <ConductExamOnlineExamMarksTransferPage vivaMode myMode />;
}
