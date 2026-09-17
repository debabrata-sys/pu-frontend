import React, { useEffect, useState, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Grid,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import {
  Print as PrintIcon,
  ArrowBack as ArrowBackIcon,
  Assessment as AssessmentIcon,
  FilterAlt as FilterAltIcon
} from "@mui/icons-material";
import ep1 from "../api/ep1";
import global1 from "./global1";
import MenuPageShell from "./MenuPageShell";

export default function ConductExam2AwardListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const reportRef = useRef(null);

  const [options, setOptions] = useState({
    academicyears: [],
    exams: [],
    programs: [],
    courses: []
  });

  const [filters, setFilters] = useState({
    academicyear: searchParams.get("academicyear") || "",
    examcode: searchParams.get("examcode") || "",
    programcode: searchParams.get("programcode") || "",
    coursecode: searchParams.get("coursecode") || "",
    valuationtype: searchParams.get("valuationtype") || "V1"
  });

  const [reportData, setReportData] = useState(null);
  const [examConfig, setExamConfig] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [error, setError] = useState("");

  // Load dropdown options & conduct exam configuration
  useEffect(() => {
    loadOptions();
    loadExamConfig();
  }, []);

  const loadExamConfig = async () => {
    try {
      const res = await ep1.get("/api/v2/conductexam/configuration", {
        params: { colid: global1.colid }
      });
      if (res.data?.success && res.data.data) {
        setExamConfig(res.data.data);
      }
    } catch (e) {
      console.error("Failed to load conduct exam configuration:", e);
    }
  };

  const loadOptions = async () => {
    try {
      setLoadingOptions(true);
      setError("");
      const res = await ep1.get("/api/v2/conductexam2/award-list-options", {
        params: { colid: global1.colid }
      });
      if (res.data?.success) {
        setOptions(res.data);
        const defaultYear = searchParams.get("academicyear") || res.data.academicyears?.[0] || "";
        const defaultExam = searchParams.get("examcode") || res.data.exams?.[0]?.examcode || "";
        const defaultCourse = searchParams.get("coursecode") || res.data.courses?.[0]?.coursecode || "";
        const defaultProgram = searchParams.get("programcode") || res.data.programs?.[0]?.programcode || "";
        const defaultValuationType = searchParams.get("valuationtype") || "V1";

        const initialFilters = {
          academicyear: defaultYear,
          examcode: defaultExam,
          programcode: defaultProgram,
          coursecode: defaultCourse,
          valuationtype: defaultValuationType
        };
        setFilters(initialFilters);

        if (defaultExam && defaultCourse) {
          generateReport(initialFilters);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load award list options.");
    } finally {
      setLoadingOptions(false);
    }
  };

  const generateReport = async (activeFilters = filters) => {
    if (!activeFilters.examcode || !activeFilters.coursecode) {
      setError("Please select both Exam and Course to generate the award list.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      const res = await ep1.get("/api/v2/conductexam2/award-list", {
        params: {
          colid: global1.colid,
          academicyear: activeFilters.academicyear,
          examcode: activeFilters.examcode,
          programcode: activeFilters.programcode,
          coursecode: activeFilters.coursecode,
          valuationtype: activeFilters.valuationtype || "V1"
        }
      });

      if (res.data?.success) {
        setReportData(res.data);
      } else {
        setError(res.data?.message || "No evaluation data found for the selected course.");
        setReportData(null);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Error generating award list report.");
      setReportData(null);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const meta = reportData?.meta || {};
  const students = reportData?.students || [];
  const stats = reportData?.stats || {};

  const isSameEvaluator =
    stats.highestEvaluator?.evaluatorid &&
    stats.lowestEvaluator?.evaluatorid &&
    stats.highestEvaluator.evaluatorid === stats.lowestEvaluator.evaluatorid;

  let institutionName = (examConfig?.institutionname || meta.institutionName || "PEOPLES UNIVERSITY, BHOPAL").toUpperCase();
  if (institutionName === "PEOPLE'S UNIVERSITY" || institutionName === "PEOPLES UNIVERSITY") {
    institutionName = "PEOPLE'S UNIVERSITY, BHOPAL";
  }
  const affiliatedBoard = examConfig?.affiliatedboard || meta.affiliatedboard || "";
  const address = examConfig?.address || meta.address || "";
  const logoUrl = examConfig?.logo || meta.logo || "/peoples_university_logo.jpg";

  return (
    <MenuPageShell title="Award List Report - Theory Exam">
      {/* Print Styles */}
      <style>{`
        @media print {
          body {
            background-color: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
            color: #000000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
          .award-list-print-container {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 10mm 12mm !important;
            box-shadow: none !important;
            border: none !important;
          }
          .print-avoid-break {
            page-break-inside: avoid !important;
          }
          .print-footer-container {
            page-break-inside: avoid !important;
          }
          table {
            border-collapse: collapse !important;
            width: 100% !important;
          }
          th, td {
            border: 1px solid #000000 !important;
            padding: 4px 6px !important;
            color: #000000 !important;
          }
          @page {
            size: A4 portrait;
            margin: 12mm 10mm;
          }
        }
      `}</style>

      <Box sx={{ p: { xs: 1.5, md: 3 } }}>
        <Stack spacing={2.5}>
          {/* Top Actions Bar (Hidden on print) */}
          <Paper elevation={0} className="no-print" sx={{ p: 2.5, border: "1px solid #e5e7eb", borderRadius: 2, bgcolor: "#fff" }}>
            <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2} alignItems={{ xs: "flex-start", md: "center" }}>
              <Box>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Box sx={{ bgcolor: "primary.main", color: "#fff", p: 1, borderRadius: 1.5, display: "flex" }}>
                    <AssessmentIcon fontSize="medium" />
                  </Box>
                  <Box>
                    <Typography variant="h5" fontWeight={900}>
                      Award List Report
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Computer Generated Theory Exam Award List with Unique CN, Marks (Figures & Words), and Evaluator Details
                    </Typography>
                  </Box>
                </Stack>
              </Box>
              <Stack direction="row" spacing={1.5}>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<PrintIcon />}
                  onClick={handlePrint}
                  disabled={!reportData || students.length === 0}
                  sx={{ fontWeight: 700 }}
                >
                  Print / Save PDF
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<ArrowBackIcon />}
                  onClick={() => navigate("/dashdashfacnew")}
                >
                  Dashboard
                </Button>
              </Stack>
            </Stack>
          </Paper>

          {/* Filter Bar (Hidden on print) */}
          <Paper elevation={0} className="no-print" sx={{ p: 2.5, border: "1px solid #e5e7eb", borderRadius: 2 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={6} md={2}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Academic Year"
                  value={filters.academicyear}
                  onChange={(e) => setFilters({ ...filters, academicyear: e.target.value })}
                >
                  <MenuItem value="">-- All Years --</MenuItem>
                  {(options.academicyears || []).map((yr) => (
                    <MenuItem key={yr} value={yr}>{yr}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6} md={2.5}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Exam"
                  value={filters.examcode}
                  onChange={(e) => setFilters({ ...filters, examcode: e.target.value })}
                >
                  <MenuItem value="">-- Select Exam --</MenuItem>
                  {(options.exams || []).map((ex) => (
                    <MenuItem key={ex.examcode} value={ex.examcode}>
                      {ex.exam} ({ex.examcode})
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Program"
                  value={filters.programcode}
                  onChange={(e) => setFilters({ ...filters, programcode: e.target.value })}
                >
                  <MenuItem value="">-- All Programs --</MenuItem>
                  {(options.programs || []).map((p) => (
                    <MenuItem key={p.programcode} value={p.programcode}>
                      {p.program} ({p.programcode})
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Course / Paper"
                  value={filters.coursecode}
                  onChange={(e) => setFilters({ ...filters, coursecode: e.target.value })}
                >
                  <MenuItem value="">-- Select Course --</MenuItem>
                  {(options.courses || []).map((c) => (
                    <MenuItem key={c.coursecode} value={c.coursecode}>
                      {c.course} ({c.coursecode})
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Valuation Type"
                  value={filters.valuationtype || "V1"}
                  onChange={(e) => setFilters({ ...filters, valuationtype: e.target.value })}
                >
                  <MenuItem value="V1">Initial Valuation (V1)</MenuItem>
                  <MenuItem value="V2">Re-evaluation 1 (V2)</MenuItem>
                  <MenuItem value="V3">Re-evaluation 2 (V3)</MenuItem>
                  <MenuItem value="V4">Re-evaluation 3 (V4)</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} md={1.5}>
                <Button
                  fullWidth
                  variant="contained"
                  color="primary"
                  startIcon={<FilterAltIcon />}
                  onClick={() => generateReport(filters)}
                  disabled={loading || !filters.examcode || !filters.coursecode}
                  sx={{ height: 40, fontWeight: 700 }}
                >
                  Generate
                </Button>
              </Grid>
            </Grid>
          </Paper>

          {/* Feedback & Loading */}
          {loading && (
            <Box sx={{ py: 6, textAlign: "center" }} className="no-print">
              <CircularProgress size={40} />
              <Typography variant="body2" sx={{ mt: 1.5 }} color="text.secondary">
                Generating Award List from evaluation database...
              </Typography>
            </Box>
          )}

          {error && (
            <Alert severity="error" className="no-print" onClose={() => setError("")}>
              {error}
            </Alert>
          )}

          {/* Official Printable Award List Document Sheet */}
          {reportData && !loading && (
            <Box sx={{ display: "flex", justifyContent: "center" }}>
              <Paper
                ref={reportRef}
                className="award-list-print-container"
                elevation={1}
                sx={{
                  width: "100%",
                  maxWidth: "920px",
                  p: { xs: 2.5, md: 5 },
                  bgcolor: "#ffffff",
                  color: "#000000",
                  borderRadius: 1,
                  border: "1px solid #d1d5db",
                  fontFamily: '"Times New Roman", Times, serif'
                }}
              >
                <style>{`
                  .award-list-print-container * {
                    font-family: "Times New Roman", Times, serif !important;
                  }
                  .award-list-report-title {
                    font-size: 11.5px !important;
                    font-weight: 800 !important;
                    font-family: "Times New Roman", Times, serif !important;
                    text-align: center !important;
                    text-transform: uppercase !important;
                    white-space: nowrap !important;
                    color: #000000 !important;
                    letter-spacing: 0.5px !important;
                    line-height: 1.2 !important;
                    margin: 4px 0 !important;
                  }
                `}</style>

                {/* Header: Large Logo & Institution Details from Conduct Exam Configuration */}
                <Box sx={{ mb: 2, pb: 1.5, borderBottom: "1.5px solid #000" }}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 2
                    }}
                  >
                    {/* Left: Large Logo */}
                    <Box
                      sx={{
                        width: { xs: 95, sm: 135 },
                        minWidth: { xs: 95, sm: 135 },
                        height: { xs: 95, sm: 135 },
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}
                    >
                      <Box
                        component="img"
                        src={logoUrl}
                        alt="University Logo"
                        onError={(e) => {
                          if (e.target.src !== "/peoples_university_logo.jpg") {
                            e.target.src = "/peoples_university_logo.jpg";
                          }
                        }}
                        sx={{
                          maxWidth: "100%",
                          maxHeight: "100%",
                          width: "auto",
                          height: "auto",
                          objectFit: "contain"
                        }}
                      />
                    </Box>

                    {/* Center: Large Institution Name, then Affiliation, Address, and Report Title */}
                    <Box sx={{ flex: 1, textAlign: "center", px: 1 }}>
                      <Typography
                        component="h1"
                        sx={{
                          fontWeight: 900,
                          letterSpacing: { xs: "0.8px", sm: "1.2px" },
                          textTransform: "uppercase",
                          fontSize: { xs: "22px", sm: "28px", md: "30px" },
                          fontFamily: 'inherit',
                          lineHeight: 1.15,
                          color: "#000000"
                        }}
                      >
                        {institutionName}
                      </Typography>

                      {affiliatedBoard && (
                        <Typography
                          sx={{
                            fontSize: { xs: "12px", sm: "14px" },
                            fontWeight: 600,
                            color: "#111827",
                            fontFamily: 'inherit',
                            mt: 0.5
                          }}
                        >
                          {affiliatedBoard}
                        </Typography>
                      )}

                      {address && (
                        <Typography
                          sx={{
                            fontSize: { xs: "11px", sm: "13px" },
                            fontWeight: 500,
                            color: "#374151",
                            fontFamily: 'inherit',
                            mt: 0.3,
                            lineHeight: 1.3
                          }}
                        >
                          {address}
                        </Typography>
                      )}
                    </Box>

                    {/* Right spacer with matching width so center text remains perfectly centered */}
                    <Box
                      sx={{
                        width: { xs: 95, sm: 135 },
                        minWidth: { xs: 95, sm: 135 },
                        display: { xs: "none", sm: "block" }
                      }}
                    />
                  </Box>

                  {/* Single Line Report Title directly below */}
                  <Box sx={{ textAlign: "center", mt: 1, mb: 0.5 }}>
                    <div
                      className="award-list-report-title"
                      style={{
                        fontWeight: 800,
                        fontSize: "11.5px",
                        fontFamily: '"Times New Roman", Times, serif',
                        color: "#000000",
                        letterSpacing: "0.5px",
                        textTransform: "uppercase",
                        whiteSpace: "nowrap",
                        margin: "0 auto",
                        display: "inline-block"
                      }}
                    >
                      {meta.reportTitle || "Award List - Theory Exam"}
                    </div>
                  </Box>
                </Box>

                {/* Metadata Table (Solid Black Borders) */}
                <Box sx={{ mb: 2 }}>
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      border: "1.5px solid #000",
                      fontSize: "13px",
                      fontFamily: "inherit"
                    }}
                  >
                    <tbody>
                      <tr>
                        <td style={{ border: "1px solid #000", padding: "5px 8px", width: "50%", verticalAlign: "top" }}>
                          <strong>Program : </strong> {meta.program || "-"}
                        </td>
                        <td style={{ border: "1px solid #000", padding: "5px 8px", width: "50%", verticalAlign: "top" }}>
                          <strong>Date : </strong> {meta.date || "-"}
                        </td>
                      </tr>
                      <tr>
                        <td style={{ border: "1px solid #000", padding: "5px 8px", verticalAlign: "top" }}>
                          <strong>Paper Code : </strong> {meta.paperCode || "-"}
                        </td>
                        <td style={{ border: "1px solid #000", padding: "5px 8px", verticalAlign: "top" }}>
                          <strong>Year : </strong> {meta.yearText || meta.exam || "-"}
                        </td>
                      </tr>
                      <tr>
                        <td colSpan={2} style={{ border: "1px solid #000", padding: "5px 8px", verticalAlign: "top" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span><strong>Paper Name : </strong> {meta.paperName || "-"}</span>
                            <span style={{ fontWeight: "bold", textTransform: "uppercase", fontSize: "12px", background: "#f3f4f6", padding: "2px 8px", borderRadius: "3px", border: "1px solid #999" }}>
                              {meta.valuationLabel || "Initial Valuation (V1)"}
                            </span>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </Box>

                {/* Main Marks Table */}
                <Box sx={{ mb: 3 }}>
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      border: "1.5px solid #000",
                      fontSize: "13px",
                      fontFamily: "inherit"
                    }}
                  >
                    <thead>
                      <tr style={{ backgroundColor: "#f9fafb", textAlign: "center" }}>
                        <th
                          style={{
                            border: "1px solid #000",
                            padding: "6px 4px",
                            width: "45px",
                            fontWeight: "bold"
                          }}
                        >
                          SN
                        </th>
                        <th
                          style={{
                            border: "1px solid #000",
                            padding: "6px 6px",
                            width: "90px",
                            fontWeight: "bold"
                          }}
                        >
                          CN
                        </th>
                        <th
                          colSpan={2}
                          style={{
                            border: "1px solid #000",
                            padding: "6px 8px",
                            fontWeight: "bold"
                          }}
                        >
                          Enrollment Number
                        </th>
                        <th
                          style={{
                            border: "1px solid #000",
                            padding: "6px 6px",
                            width: "90px",
                            fontWeight: "bold"
                          }}
                        >
                          In Figure
                        </th>
                        <th
                          style={{
                            border: "1px solid #000",
                            padding: "6px 8px",
                            fontWeight: "bold"
                          }}
                        >
                          <div style={{ fontSize: "11px", color: "#333", fontWeight: "normal" }}>
                            Maximum Marks : {meta.maxMarks || "75"}
                          </div>
                          In Words
                        </th>
                        <th
                          style={{
                            border: "1px solid #000",
                            padding: "6px 6px",
                            width: "120px",
                            fontWeight: "bold"
                          }}
                        >
                          Evaluator id
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.length === 0 ? (
                        <tr>
                          <td
                            colSpan={7}
                            style={{
                              border: "1px solid #000",
                              textAlign: "center",
                              padding: "20px",
                              color: "#666"
                            }}
                          >
                            No student marks found for this course. Ensure answer books have been uploaded and evaluations finalized.
                          </td>
                        </tr>
                      ) : (
                        students.map((st, idx) => {
                          const rawRegno = String(st.regno || "").trim();
                          let enrollPart1 = "";
                          let enrollPart2 = "";

                          if (rawRegno.length >= 2) {
                            enrollPart1 = rawRegno.slice(0, 2);
                            enrollPart2 = rawRegno.slice(2);
                          } else {
                            const rawNum = String(st.enrollmentNumber || "").trim();
                            const pfx = String(st.enrollmentPrefix || "PU").trim();
                            if (rawNum.startsWith(pfx)) {
                              enrollPart1 = pfx;
                              enrollPart2 = rawNum.slice(pfx.length);
                            } else if (rawNum.length >= 2) {
                              enrollPart1 = rawNum.slice(0, 2);
                              enrollPart2 = rawNum.slice(2);
                            } else {
                              enrollPart1 = pfx;
                              enrollPart2 = rawNum;
                            }
                          }

                          return (
                            <tr key={st.regno || idx} className="print-avoid-break" style={{ textAlign: "center" }}>
                              <td style={{ border: "1px solid #000", padding: "5px 4px" }}>
                                {st.sn || idx + 1}
                              </td>
                              <td style={{ border: "1px solid #000", padding: "5px 6px", fontWeight: "bold" }}>
                                {st.cn || "-"}
                              </td>
                              <td style={{ border: "1px solid #000", padding: "5px 4px", width: "45px", fontWeight: "bold" }}>
                                {enrollPart1}
                              </td>
                              <td style={{ border: "1px solid #000", padding: "5px 6px", textAlign: "left", fontWeight: 600 }}>
                                {enrollPart2}
                              </td>
                              <td style={{ border: "1px solid #000", padding: "5px 6px", fontWeight: "bold" }}>
                                {st.inFigure !== undefined && st.inFigure !== null ? st.inFigure : "-"}
                              </td>
                              <td style={{ border: "1px solid #000", padding: "5px 8px", textAlign: "left", textTransform: "capitalize" }}>
                                {st.inWords || "-"}
                              </td>
                              <td style={{ border: "1px solid #000", padding: "5px 6px" }}>
                                {st.evaluatorid || "-"}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </Box>

                {/* Footer Section: Summary & Evaluator Details */}
                <Box className="print-footer-container" sx={{ mt: 2 }}>
                  {/* Lowest & Highest Mark Bar */}
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      border: "1.5px solid #000",
                      marginBottom: "10px",
                      fontSize: "13px",
                      fontFamily: "inherit"
                    }}
                  >
                    <tbody>
                      <tr style={{ fontWeight: "bold" }}>
                        <td style={{ border: "1px solid #000", padding: "6px 12px", width: "50%" }}>
                          Lowest Mark : {stats.lowestMark !== undefined ? stats.lowestMark : "-"}
                        </td>
                        <td style={{ border: "1px solid #000", padding: "6px 12px", width: "50%" }}>
                          Highest Mark : {stats.highestMark !== undefined ? stats.highestMark : "-"}
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Evaluator Details Table */}
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      border: "1.5px solid #000",
                      fontSize: "13px",
                      fontFamily: "inherit",
                      marginBottom: "16px"
                    }}
                  >
                    {isSameEvaluator ? (
                      <tbody>
                        <tr>
                          <td style={{ border: "1px solid #000", padding: "5px 8px", width: "30%", fontWeight: "bold" }}>
                            Evaluator id :
                          </td>
                          <td style={{ border: "1px solid #000", padding: "5px 8px", width: "70%" }}>
                            {stats.highestEvaluator?.evaluatorid || "-"}
                          </td>
                        </tr>
                        <tr>
                          <td style={{ border: "1px solid #000", padding: "5px 8px", fontWeight: "bold" }}>
                            Name of Evaluator :
                          </td>
                          <td style={{ border: "1px solid #000", padding: "5px 8px", textTransform: "uppercase" }}>
                            {stats.highestEvaluator?.name || "-"}
                          </td>
                        </tr>
                        <tr>
                          <td style={{ border: "1px solid #000", padding: "8px 8px", fontWeight: "bold", height: "45px", verticalAlign: "middle" }}>
                            Signature :
                          </td>
                          <td style={{ border: "1px solid #000", padding: "8px 8px", height: "45px" }}>
                          </td>
                        </tr>
                        <tr>
                          <td style={{ border: "1px solid #000", padding: "5px 8px", fontWeight: "bold" }}>
                            Contact No. :
                          </td>
                          <td style={{ border: "1px solid #000", padding: "5px 8px" }}>
                            {stats.highestEvaluator?.contactno || "-"}
                          </td>
                        </tr>
                      </tbody>
                    ) : (
                      <tbody>
                        <tr style={{ backgroundColor: "#f3f4f6", fontWeight: "bold" }}>
                          <td style={{ border: "1px solid #000", padding: "5px 8px", width: "25%" }}>Detail</td>
                          <td style={{ border: "1px solid #000", padding: "5px 8px", width: "37.5%" }}>
                            Examiner (Highest Marks)
                          </td>
                          <td style={{ border: "1px solid #000", padding: "5px 8px", width: "37.5%" }}>
                            Examiner (Lowest Marks)
                          </td>
                        </tr>
                        <tr>
                          <td style={{ border: "1px solid #000", padding: "5px 8px", fontWeight: "bold" }}>
                            Evaluator id :
                          </td>
                          <td style={{ border: "1px solid #000", padding: "5px 8px" }}>
                            {stats.highestEvaluator?.evaluatorid || "-"}
                          </td>
                          <td style={{ border: "1px solid #000", padding: "5px 8px" }}>
                            {stats.lowestEvaluator?.evaluatorid || "-"}
                          </td>
                        </tr>
                        <tr>
                          <td style={{ border: "1px solid #000", padding: "5px 8px", fontWeight: "bold" }}>
                            Name of Evaluator :
                          </td>
                          <td style={{ border: "1px solid #000", padding: "5px 8px", textTransform: "uppercase" }}>
                            {stats.highestEvaluator?.name || "-"}
                          </td>
                          <td style={{ border: "1px solid #000", padding: "5px 8px", textTransform: "uppercase" }}>
                            {stats.lowestEvaluator?.name || "-"}
                          </td>
                        </tr>
                        <tr>
                          <td style={{ border: "1px solid #000", padding: "8px 8px", fontWeight: "bold", height: "45px", verticalAlign: "middle" }}>
                            Signature :
                          </td>
                          <td style={{ border: "1px solid #000", padding: "8px 8px", height: "45px" }}>
                          </td>
                          <td style={{ border: "1px solid #000", padding: "8px 8px", height: "45px" }}>
                          </td>
                        </tr>
                        <tr>
                          <td style={{ border: "1px solid #000", padding: "5px 8px", fontWeight: "bold" }}>
                            Contact No. :
                          </td>
                          <td style={{ border: "1px solid #000", padding: "5px 8px" }}>
                            {stats.highestEvaluator?.contactno || "-"}
                          </td>
                          <td style={{ border: "1px solid #000", padding: "5px 8px" }}>
                            {stats.lowestEvaluator?.contactno || "-"}
                          </td>
                        </tr>
                      </tbody>
                    )}
                  </table>

                  {/* Official Notice */}
                  <Typography
                    variant="body2"
                    sx={{
                      fontSize: "12px",
                      fontStyle: "italic",
                      fontFamily: "inherit",
                      mt: 2
                    }}
                  >
                    Note: Computer Generated Award List
                  </Typography>
                </Box>
              </Paper>
            </Box>
          )}
        </Stack>
      </Box>
    </MenuPageShell>
  );
}
