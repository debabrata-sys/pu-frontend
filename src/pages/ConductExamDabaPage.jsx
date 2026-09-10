import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  ButtonGroup,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  Grid,
  MenuItem,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import PrintIcon from "@mui/icons-material/Print";
import RefreshIcon from "@mui/icons-material/Refresh";
import LayersIcon from "@mui/icons-material/Layers";
import LayersClearIcon from "@mui/icons-material/LayersClear";
import ep1 from "../api/ep1";
import global1 from "./global1";
import MenuPageShell from "./MenuPageShell";

const STUDENTS_PER_PAGE = 6;

export default function ConductExamDabaPage() {
  const colid = global1.colid || 1;
  const [options, setOptions] = useState({
    institution: {},
    combinations: [],
    academicyears: [],
    exams: [],
    programs: [],
    semesters: [],
    courses: []
  });

  const [filters, setFilters] = useState({
    academicyear: "",
    examcode: "",
    examname: "",
    programcode: "",
    programname: "",
    semester: "",
    coursecode: "",
    coursename: "",
    centername: "People's College of Medical Sciences & Research Centre",
    institutename: "People's College of Medical Science & Research Centre",
    status: "Main",
    specialization: "",
    examdate: "08-Sep-26"
  });

  // Toggle condition: With Section (Section-A / Section-B) vs Without Section
  const [withSection, setWithSection] = useState(false);

  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadOptions();
  }, []);

  const loadOptions = async () => {
    try {
      setError("");
      const res = await ep1.get("/api/v2/conductexam/daba-options", {
        params: { colid }
      });
      if (res.data?.status === "success") {
        setOptions(res.data);
        const ins = res.data.institution || {};
        const combos = res.data.combinations || [];

        // Auto-select initial values from the first combination if available
        if (combos.length > 0) {
          const first = combos[0];
          setFilters((prev) => ({
            ...prev,
            institutename: ins.institutionname || prev.institutename,
            academicyear: first.academicyear || prev.academicyear,
            examcode: first.examcode || prev.examcode,
            examname: first.examname || prev.examname,
            programcode: first.programcode || prev.programcode,
            programname: first.programname || prev.programname,
            semester: first.semester || prev.semester,
            coursecode: first.coursecode || prev.coursecode,
            coursename: first.coursename || prev.coursename
          }));
        } else {
          if (ins.institutionname) {
            setFilters((prev) => ({
              ...prev,
              institutename: ins.institutionname
            }));
          }
        }
      }
    } catch (err) {
      console.error("Failed to load DABA options", err);
    }
  };

  const combinations = useMemo(() => options.combinations || [], [options.combinations]);

  // 1. Available Academic Years (distinct)
  const availableAcademicYears = useMemo(() => {
    const list = [...new Set(combinations.map((c) => c.academicyear).filter(Boolean))];
    if (list.length === 0 && options.academicyears?.length > 0) return options.academicyears;
    return list.sort();
  }, [combinations, options.academicyears]);

  // 2. Available Exams (dependent on selected Academic Year)
  const availableExams = useMemo(() => {
    const filtered = combinations.filter((c) => !filters.academicyear || c.academicyear === filters.academicyear);
    const map = new Map();
    filtered.forEach((c) => {
      if (c.examcode && !map.has(c.examcode)) {
        map.set(c.examcode, { examcode: c.examcode, examname: c.examname || c.examcode });
      }
    });
    if (map.size === 0 && options.exams?.length > 0) {
      options.exams.forEach((e) => map.set(e.examcode, e));
    }
    return Array.from(map.values());
  }, [combinations, filters.academicyear, options.exams]);

  // 3. Available Programs (dependent on selected Academic Year & Exam)
  const availablePrograms = useMemo(() => {
    const filtered = combinations.filter(
      (c) =>
        (!filters.academicyear || c.academicyear === filters.academicyear) &&
        (!filters.examcode || c.examcode === filters.examcode)
    );
    const map = new Map();
    filtered.forEach((c) => {
      const code = c.programcode || c.programname;
      if (code && !map.has(code)) {
        map.set(code, { programcode: code, programname: c.programname || code });
      }
    });
    if (map.size === 0 && options.programs?.length > 0) {
      options.programs.forEach((p) => map.set(p.programcode, p));
    }
    return Array.from(map.values());
  }, [combinations, filters.academicyear, filters.examcode, options.programs]);

  // 4. Available Semesters / Profs (dependent on selected Academic Year, Exam & Program)
  const availableSemesters = useMemo(() => {
    const filtered = combinations.filter(
      (c) =>
        (!filters.academicyear || c.academicyear === filters.academicyear) &&
        (!filters.examcode || c.examcode === filters.examcode) &&
        (!filters.programcode || c.programcode === filters.programcode)
    );
    const list = [...new Set(filtered.map((c) => c.semester).filter(Boolean))];
    if (list.length === 0 && options.semesters?.length > 0) return options.semesters;
    return list.sort();
  }, [combinations, filters.academicyear, filters.examcode, filters.programcode, options.semesters]);

  // 5. Available Courses / Subjects (dependent on selected Academic Year, Exam, Program & Semester)
  const availableCourses = useMemo(() => {
    const filtered = combinations.filter(
      (c) =>
        (!filters.academicyear || c.academicyear === filters.academicyear) &&
        (!filters.examcode || c.examcode === filters.examcode) &&
        (!filters.programcode || c.programcode === filters.programcode) &&
        (!filters.semester || c.semester === filters.semester)
    );
    const map = new Map();
    filtered.forEach((c) => {
      if (c.coursecode && !map.has(c.coursecode)) {
        map.set(c.coursecode, {
          coursecode: c.coursecode,
          coursename: c.coursename || c.coursecode
        });
      }
    });
    if (map.size === 0 && options.courses?.length > 0) {
      options.courses.forEach((c) => map.set(c.coursecode, c));
    }
    return Array.from(map.values());
  }, [combinations, filters.academicyear, filters.examcode, filters.programcode, filters.semester, options.courses]);

  // Handlers with automatic cascading updates
  const handleAcademicYearChange = (newAY) => {
    const nextCombos = combinations.filter((c) => !newAY || c.academicyear === newAY);
    const firstExam = nextCombos.find((c) => c.examcode)?.examcode || "";
    const firstExamName = nextCombos.find((c) => c.examcode === firstExam)?.examname || firstExam;

    const nextProgs = nextCombos.filter((c) => !firstExam || c.examcode === firstExam);
    const firstProg = nextProgs.find((c) => c.programcode)?.programcode || "";
    const firstProgName = nextProgs.find((c) => c.programcode === firstProg)?.programname || firstProg;

    const nextSems = nextProgs.filter((c) => !firstProg || c.programcode === firstProg);
    const firstSem = nextSems.find((c) => c.semester)?.semester || "";

    const nextCourses = nextSems.filter((c) => !firstSem || c.semester === firstSem);
    const firstCourse = nextCourses.find((c) => c.coursecode);

    setFilters((prev) => ({
      ...prev,
      academicyear: newAY,
      examcode: firstExam,
      examname: firstExamName,
      programcode: firstProg,
      programname: firstProgName,
      semester: firstSem,
      coursecode: firstCourse?.coursecode || "",
      coursename: firstCourse?.coursename || ""
    }));
  };

  const handleExamChange = (newExamCode) => {
    const examObj = availableExams.find((e) => e.examcode === newExamCode);
    const nextProgs = combinations.filter(
      (c) =>
        (!filters.academicyear || c.academicyear === filters.academicyear) &&
        (!newExamCode || c.examcode === newExamCode)
    );
    const firstProg = nextProgs.find((c) => c.programcode)?.programcode || "";
    const firstProgName = nextProgs.find((c) => c.programcode === firstProg)?.programname || firstProg;

    const nextSems = nextProgs.filter((c) => !firstProg || c.programcode === firstProg);
    const firstSem = nextSems.find((c) => c.semester)?.semester || "";

    const nextCourses = nextSems.filter((c) => !firstSem || c.semester === firstSem);
    const firstCourse = nextCourses.find((c) => c.coursecode);

    setFilters((prev) => ({
      ...prev,
      examcode: newExamCode,
      examname: examObj?.examname || newExamCode,
      programcode: firstProg,
      programname: firstProgName,
      semester: firstSem,
      coursecode: firstCourse?.coursecode || "",
      coursename: firstCourse?.coursename || ""
    }));
  };

  const handleProgramChange = (newProgCode) => {
    const progObj = availablePrograms.find((p) => p.programcode === newProgCode);
    const nextSems = combinations.filter(
      (c) =>
        (!filters.academicyear || c.academicyear === filters.academicyear) &&
        (!filters.examcode || c.examcode === filters.examcode) &&
        (!newProgCode || c.programcode === newProgCode)
    );
    const firstSem = nextSems.find((c) => c.semester)?.semester || "";

    const nextCourses = nextSems.filter((c) => !firstSem || c.semester === firstSem);
    const firstCourse = nextCourses.find((c) => c.coursecode);

    setFilters((prev) => ({
      ...prev,
      programcode: newProgCode,
      programname: progObj?.programname || newProgCode,
      semester: firstSem,
      coursecode: firstCourse?.coursecode || "",
      coursename: firstCourse?.coursename || ""
    }));
  };

  const handleSemesterChange = (newSem) => {
    const nextCourses = combinations.filter(
      (c) =>
        (!filters.academicyear || c.academicyear === filters.academicyear) &&
        (!filters.examcode || c.examcode === filters.examcode) &&
        (!filters.programcode || c.programcode === filters.programcode) &&
        (!newSem || c.semester === newSem)
    );
    const firstCourse = nextCourses.find((c) => c.coursecode);

    setFilters((prev) => ({
      ...prev,
      semester: newSem,
      coursecode: firstCourse?.coursecode || "",
      coursename: firstCourse?.coursename || ""
    }));
  };

  const handleCourseChange = (newCourseCode) => {
    const courseObj = availableCourses.find((c) => c.coursecode === newCourseCode);
    setFilters((prev) => ({
      ...prev,
      coursecode: newCourseCode,
      coursename: courseObj?.coursename || ""
    }));
  };

  const loadReport = async () => {
    try {
      setLoading(true);
      setError("");
      setMessage("");
      const res = await ep1.get("/api/v2/conductexam/daba-report", {
        params: {
          colid,
          academicyear: filters.academicyear,
          examcode: filters.examcode,
          programcode: filters.programcode,
          coursecode: filters.coursecode,
          semester: filters.semester,
          centername: filters.centername,
          institutename: filters.institutename,
          status: filters.status,
          specialization: filters.specialization,
          examdate: filters.examdate
        }
      });
      if (res.data?.status === "success") {
        setReportData(res.data);
        if (res.data.examinees?.length === 0) {
          setMessage("No students found with submitted exam forms matching these filters.");
        }
      } else {
        setError(res.data?.message || "Failed to load report");
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to load DABA report");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Split examinees into pages of exactly 6 students per page
  const examineePages = useMemo(() => {
    const list = reportData?.examinees || [];
    const pages = [];
    for (let i = 0; i < list.length; i += STUDENTS_PER_PAGE) {
      pages.push(list.slice(i, i + STUDENTS_PER_PAGE));
    }
    return pages.length > 0 ? pages : [[]];
  }, [reportData]);

  const totalPages = examineePages.length;

  return (
    <MenuPageShell title="Conduct Examination - DABA">
      <Box className="daba-main-wrapper" sx={{ p: 2 }}>
        {/* Top Control Panel - Hidden during printing */}
        <Box className="no-print" sx={{ mb: 3 }}>
          <Card elevation={2}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Box>
                  <Typography variant="h6" fontWeight={700}>
                    Details of Answer Book and Attendance (DABA)
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Populates examinees strictly from submitted exam forms with exact university examination formatting.
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  {/* Condition Button Toggle: With Section vs Without Section */}
                  <ButtonGroup variant="outlined" size="small">
                    <Button
                      variant={!withSection ? "contained" : "outlined"}
                      color="primary"
                      startIcon={<LayersClearIcon />}
                      onClick={() => setWithSection(false)}
                    >
                      Without Section (Page 1)
                    </Button>
                    <Button
                      variant={withSection ? "contained" : "outlined"}
                      color="primary"
                      startIcon={<LayersIcon />}
                      onClick={() => setWithSection(true)}
                    >
                      With Section (Page 2)
                    </Button>
                  </ButtonGroup>

                  <Button
                    variant="contained"
                    color="success"
                    startIcon={<PrintIcon />}
                    onClick={handlePrint}
                    disabled={!reportData || reportData?.examinees?.length === 0}
                  >
                    Print / Save PDF
                  </Button>
                </Stack>
              </Stack>

              <Divider sx={{ my: 2 }} />

              {/* Dependent Cascading Filters */}
              <Grid container spacing={2}>
                {/* 1. Academic Year Dropdown */}
                <Grid item xs={12} sm={6} md={2}>
                  <TextField
                    select
                    fullWidth
                    size="small"
                    label="Academic Year"
                    value={filters.academicyear}
                    onChange={(e) => handleAcademicYearChange(e.target.value)}
                  >
                    <MenuItem value="">Select Academic Year</MenuItem>
                    {availableAcademicYears.map((y) => (
                      <MenuItem key={y} value={y}>
                        {y}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>

                {/* 2. Exam Dropdown (Dependent on Academic Year) */}
                <Grid item xs={12} sm={6} md={3}>
                  <TextField
                    select
                    fullWidth
                    size="small"
                    label="Exam"
                    value={filters.examcode}
                    onChange={(e) => handleExamChange(e.target.value)}
                  >
                    <MenuItem value="">Select Exam</MenuItem>
                    {availableExams.map((ex) => (
                      <MenuItem key={ex.examcode} value={ex.examcode}>
                        {ex.examname} ({ex.examcode})
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>

                {/* 3. Program Dropdown (Dependent on Exam) */}
                <Grid item xs={12} sm={6} md={2.5}>
                  <TextField
                    select
                    fullWidth
                    size="small"
                    label="Course / Program"
                    value={filters.programcode}
                    onChange={(e) => handleProgramChange(e.target.value)}
                  >
                    <MenuItem value="">Select Program</MenuItem>
                    {availablePrograms.map((p) => (
                      <MenuItem key={p.programcode} value={p.programcode}>
                        {p.programname} ({p.programcode})
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>

                {/* 4. Prof / Semester Dropdown (Dependent on Program) */}
                <Grid item xs={12} sm={6} md={1.5}>
                  <TextField
                    select
                    fullWidth
                    size="small"
                    label="Prof / Semester"
                    value={filters.semester}
                    onChange={(e) => handleSemesterChange(e.target.value)}
                  >
                    <MenuItem value="">Select</MenuItem>
                    {availableSemesters.map((s) => (
                      <MenuItem key={s} value={s}>
                        {s}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>

                {/* 5. Subject Code & Name Dropdown (Dependent on Semester) */}
                <Grid item xs={12} sm={6} md={3}>
                  <TextField
                    select
                    fullWidth
                    size="small"
                    label="Subject Code & Name"
                    value={filters.coursecode}
                    onChange={(e) => handleCourseChange(e.target.value)}
                  >
                    <MenuItem value="">Select Subject</MenuItem>
                    {availableCourses.map((c) => (
                      <MenuItem key={c.coursecode} value={c.coursecode}>
                        {c.coursecode} - {c.coursename}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>

                {/* Additional Header Attributes */}
                <Grid item xs={12} sm={6} md={3}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Name of Center"
                    value={filters.centername}
                    onChange={(e) => setFilters({ ...filters, centername: e.target.value })}
                  />
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Name of Institute"
                    value={filters.institutename}
                    onChange={(e) => setFilters({ ...filters, institutename: e.target.value })}
                  />
                </Grid>

                <Grid item xs={12} sm={6} md={2}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Status"
                    value={filters.status}
                    onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                    placeholder="e.g. Main"
                  />
                </Grid>

                <Grid item xs={12} sm={6} md={2}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Date of Exam"
                    value={filters.examdate}
                    onChange={(e) => setFilters({ ...filters, examdate: e.target.value })}
                    placeholder="e.g. 08-Sep-26"
                  />
                </Grid>

                <Grid item xs={12} sm={6} md={2}>
                  <Button
                    fullWidth
                    variant="contained"
                    color="primary"
                    startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <RefreshIcon />}
                    onClick={loadReport}
                    disabled={loading}
                    sx={{ height: 40 }}
                  >
                    {loading ? "Loading..." : "Generate DABA"}
                  </Button>
                </Grid>
              </Grid>

              {error && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {error}
                </Alert>
              )}
              {message && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  {message}
                </Alert>
              )}
            </CardContent>
          </Card>
        </Box>

        {/* Print Stylesheet */}
        <style>{`
          @page {
            size: A4 landscape;
            margin: 0;
          }

          @media print {
            /* 1. Completely hide UI navigation, drawer sidebar, appbar header, and controls */
            header,
            nav,
            aside,
            .MuiAppBar-root,
            .MuiDrawer-root,
            .MuiDrawer-docked,
            .MuiToolbar-root,
            .no-print,
            [role="navigation"] {
              display: none !important;
              visibility: hidden !important;
              width: 0 !important;
              height: 0 !important;
              margin: 0 !important;
              padding: 0 !important;
            }

            /* 2. Reset html and body */
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              background: #ffffff !important;
              font-family: Arial, Helvetica, sans-serif !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              width: 100% !important;
              height: auto !important;
              overflow: visible !important;
            }

            /* 3. Reset parent wrappers in MenuPageShell and page */
            main,
            [role="main"],
            .daba-main-wrapper {
              margin: 0 !important;
              padding: 0 !important;
              width: 100% !important;
              max-width: 100% !important;
              height: auto !important;
              overflow: visible !important;
              background: transparent !important;
              display: block !important;
              position: static !important;
            }

            /* 4. Container for printable DABA pages */
            #daba-printable-area,
            .daba-page-container {
              display: block !important;
              margin: 0 auto !important;
              padding: 0 !important;
              width: 100% !important;
              box-shadow: none !important;
              border: none !important;
              background: #ffffff !important;
            }

            /* 5. DABA Page Sheet — A4 Landscape */
            .daba-page {
              page-break-after: always !important;
              break-after: page !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
              width: 297mm !important;
              max-width: 297mm !important;
              height: 208mm !important;
              max-height: 208mm !important;
              min-height: auto !important;
              box-sizing: border-box !important;
              padding: 6mm 0.5in 5mm 0.5in !important;
              margin: 0 auto !important;
              box-shadow: none !important;
              border: none !important;
              background: #ffffff !important;
              display: flex !important;
              flex-direction: column !important;
              justify-content: space-between !important;
              overflow: hidden !important;
            }

            .daba-page:last-child {
              page-break-after: auto !important;
              break-after: auto !important;
            }

            /* Footer Table in Print */
            .daba-footer-table {
              width: 100% !important;
              border-collapse: collapse !important;
              border: none !important;
              margin-top: 8px !important;
              table-layout: fixed !important;
            }
            .daba-footer-table td {
              border: none !important;
              padding: 2px 0 !important;
              font-size: 11px !important;
              color: #000 !important;
            }
          }

          /* Screen Preview Styles */
          .daba-page-container {
            display: flex;
            flex-direction: column;
            gap: 24px;
            align-items: center;
          }
          .daba-page {
            width: 297mm;
            min-height: 210mm;
            background: #ffffff;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            padding: 6mm 0.5in 5mm 0.5in;
            box-sizing: border-box;
            color: #000;
            font-family: Arial, Helvetica, sans-serif;
            font-size: 12px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }

          /* Header Styles */
          .daba-header-top {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 8px;
            width: 100%;
          }
          .daba-header-logo-box {
            width: 130px;
            min-width: 130px;
            display: flex;
            align-items: center;
            justify-content: flex-start;
          }
          .daba-logo {
            max-width: 126px;
            max-height: 117px;
            object-fit: contain;
            display: block;
          }
          .daba-title-block {
            flex: 1;
            text-align: center;
            padding: 0 8px;
          }
          .daba-header-spacer-box {
            width: 130px;
            min-width: 130px;
          }
          .daba-univ-name {
            font-size: 30px !important;
            font-weight: 900 !important;
            letter-spacing: 1.5px !important;
            text-transform: uppercase !important;
            margin: 0 0 2px 0 !important;
            color: #000 !important;
            font-family: Arial, Helvetica, sans-serif !important;
            line-height: 1.15 !important;
          }
          .daba-act-line {
            font-size: 12px !important;
            font-weight: 700 !important;
            letter-spacing: 0.2px !important;
            margin: 2px 0 4px 0 !important;
            color: #000 !important;
            font-family: Arial, Helvetica, sans-serif !important;
            line-height: 1.25 !important;
          }
          .daba-doc-title {
            font-size: 13px !important;
            font-weight: 700 !important;
            line-height: 1.35 !important;
            color: #000 !important;
            margin: 0 !important;
            font-family: Arial, Helvetica, sans-serif !important;
          }

          /* Metadata Grid */
          .daba-meta-block {
            margin-top: 10px;
            margin-bottom: 12px;
            font-size: 12px;
            line-height: 1.65;
          }
          .daba-meta-row {
            display: flex;
            justify-content: space-between;
            align-items: baseline;
          }

          /* Table Styles */
          .daba-table {
            width: 100%;
            border-collapse: collapse;
            border: 1.5px solid #000;
            table-layout: fixed;
          }
          .daba-table th {
            border: 1px solid #000;
            padding: 5px 2px;
            text-align: center;
            font-size: 11.5px;
            font-weight: 700;
            background-color: #fff;
            vertical-align: middle;
          }
          .daba-table td {
            border: 1px solid #000;
            padding: 0;
            text-align: center;
            vertical-align: middle;
            font-size: 11.5px;
          }

          /* Exact Student Row Height — adjusted for A4 landscape */
          .daba-row {
            height: 95px;
          }

          /* Sub-section cells for With Section mode */
          .section-split-cell {
            display: flex;
            flex-direction: column;
            height: 100%;
            width: 100%;
          }
          .section-half {
            flex: 1;
            display: flex;
            flex-direction: column;
            height: 50%;
            box-sizing: border-box;
          }
          .section-half:first-of-type {
            border-bottom: 1px solid #000;
          }
          .section-title {
            border-bottom: 1px solid #000;
            padding: 3px 0;
            font-size: 11px;
            font-weight: 600;
            text-align: center;
            background: #fff;
          }
          .section-body {
            flex: 1;
          }

          .photo-container {
            width: 80px;
            height: 82px;
            margin: 0 auto;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            overflow: hidden;
          }
          .photo-img {
            max-width: 100%;
            max-height: 100%;
            object-fit: cover;
          }

          /* Footer Table */
          .daba-footer-table {
            width: 100%;
            border-collapse: collapse;
            border: none !important;
            margin-top: 12px;
            font-size: 11.5px;
            font-family: Arial, Helvetica, sans-serif;
            table-layout: fixed;
          }
          .daba-footer-table td {
            border: none !important;
            padding: 2px 0;
            font-size: 11.5px;
            color: #000;
          }
        `}</style>

        {/* Printable / Rendered Pages */}
        <Box id="daba-printable-area" className="daba-page-container">
          {examineePages.map((pageStudents, pageIdx) => {
            const header = reportData?.header || filters;
            const ins = reportData?.institution || options.institution || {};
            const univName = ins.institutionname || ins.name || "PEOPLE'S UNIVERSITY, BHOPAL";
            const logoSrc = ins.logo || ins.logolink || "https://upload.wikimedia.org/wikipedia/en/thumb/3/30/People%27s_University_logo.png/220px-People%27s_University_logo.png";

            // Compute exam title line
            const examTitleLine = header.examname || filters.examname || "Theory Examination, SEPTEMBER-2026";

            return (
              <Box key={`daba-page-${pageIdx}`} className="daba-page">
                {/* Top Section: Header & Meta */}
                <Box>
                  <Box className="daba-header-top">
                    <Box className="daba-header-logo-box">
                      {logoSrc ? (
                        <img
                          src={logoSrc}
                          alt="Logo"
                          className="daba-logo"
                          onError={(e) => {
                            e.target.style.display = "none";
                          }}
                        />
                      ) : null}
                    </Box>
                    <Box className="daba-title-block">
                      <p
                        className="daba-univ-name"
                        style={{
                          margin: "0 0 2px 0",
                          fontSize: "30px",
                          fontWeight: 900,
                          textTransform: "uppercase",
                          letterSpacing: "1.5px",
                          color: "#000",
                          fontFamily: "Arial, Helvetica, sans-serif",
                          lineHeight: 1.15
                        }}
                      >
                        {univName.toUpperCase()}
                      </p>
                      {ins.affiliatedboard ? (
                        <p
                          className="daba-act-line"
                          style={{
                            margin: "2px 0 4px 0",
                            fontSize: "12.5px",
                            fontWeight: 700,
                            color: "#1e3a8a",
                            fontFamily: "Arial, Helvetica, sans-serif",
                            letterSpacing: "0.2px",
                            lineHeight: 1.25
                          }}
                        >
                          {ins.affiliatedboard.startsWith("(") ? ins.affiliatedboard : `(${ins.affiliatedboard})`}
                        </p>
                      ) : null}
                      {ins.address ? (
                        <p
                          style={{
                            margin: "1px 0 3px 0",
                            fontSize: "11px",
                            fontWeight: 600,
                            color: "#475569",
                            fontFamily: "Arial, Helvetica, sans-serif"
                          }}
                        >
                          {ins.address}
                        </p>
                      ) : null}
                      <p
                        className="daba-doc-title"
                        style={{
                          margin: 0,
                          fontSize: "13px",
                          fontWeight: 700,
                          color: "#000",
                          fontFamily: "Arial, Helvetica, sans-serif",
                          lineHeight: 1.35
                        }}
                      >
                        Details of Answer Book and Attendance (DABA), {examTitleLine}
                      </p>
                    </Box>
                    <Box className="daba-header-spacer-box" />
                  </Box>

                  {/* Metadata Block */}
                  <Box className="daba-meta-block">
                    <Box className="daba-meta-row">
                      <span>Name of Center : {header.centername || filters.centername}</span>
                    </Box>
                    <Box className="daba-meta-row">
                      <span>Name of Institute: {header.institutename || filters.institutename}</span>
                    </Box>
                    <Box className="daba-meta-row">
                      <span style={{ width: "38%" }}>Course Name : {filters.programname || header.coursename || filters.programcode}</span>
                      <span style={{ width: "32%" }}>Prof : {filters.semester || header.prof}</span>
                      <span style={{ width: "30%" }}>Status : {filters.status || header.status}</span>
                    </Box>
                    <Box className="daba-meta-row">
                      <span>Specialization: {header.specialization || filters.specialization || ""}</span>
                    </Box>
                    <Box className="daba-meta-row">
                      <span style={{ width: "65%" }}>
                        Subject Code and Name : {filters.coursecode || header.subjectcode} {filters.coursename || header.subjectname}
                      </span>
                      <span style={{ width: "35%", textAlign: "right" }}>
                        Date of Exam : {header.examdate || filters.examdate}
                      </span>
                    </Box>
                  </Box>

                  {/* Examinee Table */}
                  <table className="daba-table">
                    <thead>
                      <tr>
                        <th style={{ width: "4%" }}>S.No.</th>
                        <th style={{ width: "18%" }}>Enrollment No.</th>
                        <th style={{ width: "20%" }}>Name of Examinee</th>
                        <th style={{ width: "13%" }}>Photo</th>
                        <th style={{ width: "12%" }}>A/B Serial No.</th>
                        <th style={{ width: "11%" }}>
                          Candidate
                          <br />
                          Signature
                        </th>
                        <th style={{ width: "11%" }}>
                          Invigilator
                          <br />
                          Signature
                        </th>
                        <th style={{ width: "11%" }}>CHO Signature</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Fixed 6 rows per page as per format */}
                      {Array.from({ length: STUDENTS_PER_PAGE }).map((_, rIdx) => {
                        const student = pageStudents[rIdx];
                        const serialNumber = pageIdx * STUDENTS_PER_PAGE + rIdx + 1;

                        if (!student) {
                          // Blank row placeholder to maintain exact page height if last page has < 6 students
                          return (
                            <tr key={`blank-row-${rIdx}`} className="daba-row">
                              <td>{serialNumber}</td>
                              <td>&nbsp;</td>
                              <td>&nbsp;</td>
                              <td>&nbsp;</td>
                              <td>
                                {withSection ? (
                                  <div className="section-split-cell">
                                    <div className="section-half">
                                      <div className="section-title">Section-A</div>
                                      <div className="section-body">&nbsp;</div>
                                    </div>
                                    <div className="section-half">
                                      <div className="section-title">Section-B</div>
                                      <div className="section-body">&nbsp;</div>
                                    </div>
                                  </div>
                                ) : (
                                  ""
                                )}
                              </td>
                              <td>
                                {withSection ? (
                                  <div className="section-split-cell">
                                    <div className="section-half"><div className="section-body">&nbsp;</div></div>
                                    <div className="section-half"><div className="section-body">&nbsp;</div></div>
                                  </div>
                                ) : (
                                  ""
                                )}
                              </td>
                              <td>
                                {withSection ? (
                                  <div className="section-split-cell">
                                    <div className="section-half"><div className="section-body">&nbsp;</div></div>
                                    <div className="section-half"><div className="section-body">&nbsp;</div></div>
                                  </div>
                                ) : (
                                  ""
                                )}
                              </td>
                              <td>
                                {withSection ? (
                                  <div className="section-split-cell">
                                    <div className="section-half"><div className="section-body">&nbsp;</div></div>
                                    <div className="section-half"><div className="section-body">&nbsp;</div></div>
                                  </div>
                                ) : (
                                  ""
                                )}
                              </td>
                            </tr>
                          );
                        }

                        return (
                          <tr key={student.id || student.enrollmentno || rIdx} className="daba-row">
                            <td>{student.sno || serialNumber}</td>
                            <td
                              style={{
                                fontWeight: 600,
                                padding: "2px 4px",
                                fontSize: "10.5px",
                                letterSpacing: "-0.2px",
                                wordBreak: "break-all",
                                overflowWrap: "anywhere",
                                whiteSpace: "normal"
                              }}
                            >
                              {student.enrollmentno}
                            </td>
                            <td
                              style={{
                                fontWeight: 600,
                                padding: "2px 4px",
                                fontSize: "11px",
                                wordBreak: "break-word",
                                whiteSpace: "normal"
                              }}
                            >
                              {student.studentname}
                            </td>
                            <td>
                              <div className="photo-container">
                                {student.photo &&
                                !student.photo.includes("dicebear") &&
                                !student.photo.includes("avataaars") ? (
                                  <img
                                    src={student.photo}
                                    alt={student.studentname}
                                    className="photo-img"
                                    onError={(e) => {
                                      e.target.style.display = "none";
                                    }}
                                  />
                                ) : null}
                              </div>
                            </td>

                            {/* A/B Serial No. with Section-A at top of upper half and Section-B at top of lower half */}
                            <td style={{ padding: 0 }}>
                              {withSection ? (
                                <div className="section-split-cell">
                                  <div className="section-half">
                                    <div className="section-title">Section-A</div>
                                    <div className="section-body">&nbsp;</div>
                                  </div>
                                  <div className="section-half">
                                    <div className="section-title">Section-B</div>
                                    <div className="section-body">&nbsp;</div>
                                  </div>
                                </div>
                              ) : (
                                <div style={{ height: "100%" }}>&nbsp;</div>
                              )}
                            </td>

                            {/* Candidate Signature */}
                            <td style={{ padding: 0 }}>
                              {withSection ? (
                                <div className="section-split-cell">
                                  <div className="section-half"><div className="section-body">&nbsp;</div></div>
                                  <div className="section-half"><div className="section-body">&nbsp;</div></div>
                                </div>
                              ) : (
                                <div style={{ height: "100%" }}>&nbsp;</div>
                              )}
                            </td>

                            {/* Invigilator Signature */}
                            <td style={{ padding: 0 }}>
                              {withSection ? (
                                <div className="section-split-cell">
                                  <div className="section-half"><div className="section-body">&nbsp;</div></div>
                                  <div className="section-half"><div className="section-body">&nbsp;</div></div>
                                </div>
                              ) : (
                                <div style={{ height: "100%" }}>&nbsp;</div>
                              )}
                            </td>

                            {/* CHO Signature */}
                            <td style={{ padding: 0 }}>
                              {withSection ? (
                                <div className="section-split-cell">
                                  <div className="section-half"><div className="section-body">&nbsp;</div></div>
                                  <div className="section-half"><div className="section-body">&nbsp;</div></div>
                                </div>
                              ) : (
                                <div style={{ height: "100%" }}>&nbsp;</div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </Box>

                {/* Footer Section */}
                <table className="daba-footer-table">
                  <tbody>
                    <tr>
                      <td style={{ width: "45%", textAlign: "left", verticalAlign: "top" }}>
                        Signature and Seal of Center Supdt.
                      </td>
                      <td style={{ width: "15%", textAlign: "center", verticalAlign: "top", fontWeight: "bold" }}>
                        {pageIdx + 1}/{totalPages}
                      </td>
                      <td style={{ width: "40%", textAlign: "left", verticalAlign: "top" }}>
                        Signature of Invigilator with Date
                      </td>
                    </tr>
                    <tr>
                      <td style={{ width: "45%", textAlign: "left", verticalAlign: "top", paddingTop: "4px" }}>
                        Note: CHO=Candidate Handing Over
                      </td>
                      <td style={{ width: "15%", paddingTop: "4px" }}>&nbsp;</td>
                      <td style={{ width: "40%", textAlign: "left", verticalAlign: "top", paddingTop: "4px" }}>
                        Name:
                      </td>
                    </tr>
                  </tbody>
                </table>
              </Box>
            );
          })}
        </Box>
      </Box>
    </MenuPageShell>
  );
}
