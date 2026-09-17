import React, { useEffect, useState, useMemo } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  InputAdornment,
  MenuItem,
  Paper,
  Stack,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Alert
} from "@mui/material";
import {
  Search,
  ContentCopy,
  FileDownload,
  Print,
  Refresh,
  Today,
  CalendarMonth,
  People,
  LocationCity,
  ReceiptLong,
  ReportProblem,
  CheckCircle
} from "@mui/icons-material";
import { useSearchParams } from "react-router-dom";
import ep1 from "../api/ep1";
import global1 from "./global1";
import MenuPageShell from "./MenuPageShell";

export default function ConductExam2EvaluationReportsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Active tab index (0: Day, 1: Monthly, 2: Examiners, 3: Center-wise, 4: Series-wise, 5: Skipped)
  const initialTab = searchParams.get("tab") === "monthly" ? 1
    : searchParams.get("tab") === "examiners" ? 2
    : searchParams.get("tab") === "centerwise" ? 3
    : searchParams.get("tab") === "serieswise" ? 4
    : searchParams.get("tab") === "skipped" ? 5
    : 0;

  const [activeTab, setActiveTab] = useState(initialTab);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Filters
  const [filters, setFilters] = useState({
    academicyear: "",
    examcode: "",
    coursecode: "",
    date: new Date().toISOString().slice(0, 10),
    yearMonth: new Date().toISOString().slice(0, 7)
  });

  const [options, setOptions] = useState({
    academicyears: [],
    exams: [],
    programs: [],
    courses: []
  });

  // Report rows per tab
  const [reportData, setReportData] = useState([]);

  useEffect(() => {
    loadOptions();
  }, []);

  useEffect(() => {
    fetchActiveReport();
  }, [activeTab]);

  const loadOptions = async () => {
    try {
      const res = await ep1.get("/api/v2/conductexam2/award-list-options", {
        params: { colid: global1.colid }
      });
      if (res.data?.success) {
        setOptions({
          academicyears: res.data.academicyears || [],
          exams: res.data.exams || [],
          programs: res.data.programs || [],
          courses: res.data.courses || []
        });
      }
    } catch (err) {
      console.error("Error loading dropdown options:", err);
    }
  };

  const fetchActiveReport = async (overrideFilters = filters) => {
    try {
      setLoading(true);
      setError("");
      let endpoint = "";

      if (activeTab === 0) endpoint = "/api/v2/conductexam2/report-daily";
      else if (activeTab === 1) endpoint = "/api/v2/conductexam2/report-monthly";
      else if (activeTab === 2) endpoint = "/api/v2/conductexam2/report-examiners";
      else if (activeTab === 3) endpoint = "/api/v2/conductexam2/report-centerwise";
      else if (activeTab === 4) endpoint = "/api/v2/conductexam2/report-serieswise";
      else if (activeTab === 5) endpoint = "/api/v2/conductexam2/report-skipped";

      const params = {
        colid: global1.colid,
        academicyear: overrideFilters.academicyear,
        examcode: overrideFilters.examcode,
        coursecode: overrideFilters.coursecode
      };

      if (activeTab === 0 && overrideFilters.date) params.date = overrideFilters.date;
      if (activeTab === 1 && overrideFilters.yearMonth) params.yearMonth = overrideFilters.yearMonth;

      const res = await ep1.get(endpoint, { params });
      if (res.data?.success) {
        setReportData(res.data.rows || []);
      } else {
        setError(res.data?.message || "Failed to load report data.");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Error fetching report from server.");
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    setSearchQuery("");
    const tabParam = newValue === 1 ? "monthly"
      : newValue === 2 ? "examiners"
      : newValue === 3 ? "centerwise"
      : newValue === 4 ? "serieswise"
      : newValue === 5 ? "skipped"
      : "day";
    setSearchParams({ tab: tabParam });
  };

  const handleFilterChange = (field, value) => {
    const next = { ...filters, [field]: value };
    setFilters(next);
  };

  const handleApplyFilter = () => {
    fetchActiveReport(filters);
  };

  const handleResetFilter = () => {
    const defaultFilters = {
      academicyear: "",
      examcode: "",
      coursecode: "",
      date: "",
      yearMonth: ""
    };
    setFilters(defaultFilters);
    fetchActiveReport(defaultFilters);
  };

  // Search filtering
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return reportData;
    const q = searchQuery.toLowerCase();
    return reportData.filter((row) =>
      Object.values(row).some((val) =>
        String(val || "").toLowerCase().includes(q)
      )
    );
  }, [reportData, searchQuery]);

  // Export functions
  const handleCopy = () => {
    if (!filteredData.length) return;
    const headers = Object.keys(filteredData[0]).join("\t");
    const lines = filteredData.map((r) => Object.values(r).join("\t")).join("\n");
    navigator.clipboard.writeText(`${headers}\n${lines}`);
    setSuccessMsg("Table copied to clipboard!");
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  const handleExportCSV = () => {
    if (!filteredData.length) return;
    const headers = Object.keys(filteredData[0]).join(",");
    const rows = filteredData.map((r) =>
      Object.values(r)
        .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
        .join(",")
    );
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const tabNames = ["Day_Report", "Monthly_Report", "Examiners_Report", "Center_Wise_Report", "Series_Wise_Log", "Skipped_Scripts"];
    link.setAttribute("download", `${tabNames[activeTab] || "Evaluation_Report"}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <MenuPageShell title="Digital Evaluation Reports">
      <Box sx={{ p: { xs: 1.5, md: 3 }, bgcolor: "#f8fafc", minHeight: "100vh" }}>
        <style>{`
          @media print {
            .no-print, .no-print * {
              display: none !important;
            }
            .print-container {
              width: 100% !important;
              max-width: 100% !important;
              box-shadow: none !important;
              padding: 0 !important;
              margin: 0 !important;
            }
          }
        `}</style>

        <Stack spacing={2.5}>
          {/* Top Header matching OnMark branding */}
          <Box
            className="no-print"
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 1.5
            }}
          >
            <Box>
              <Typography variant="h5" fontWeight={800} color="#0f172a" sx={{ letterSpacing: "0.3px" }}>
                Evaluation Reports Suite
              </Typography>
              <Typography variant="body2" color="#64748b">
                Comprehensive Day, Monthly, Examiner Attendance, Center-wise, and Series Log Reports
              </Typography>
            </Box>

            <Button
              variant="outlined"
              size="small"
              startIcon={<Refresh />}
              onClick={() => fetchActiveReport()}
              disabled={loading}
              sx={{ textTransform: "none", fontWeight: 700, bgcolor: "#fff" }}
            >
              Refresh Data
            </Button>
          </Box>

          {/* Navigation Tabs */}
          <Paper elevation={0} className="no-print" sx={{ border: "1px solid #e2e8f0", borderRadius: 2 }}>
            <Tabs
              value={activeTab}
              onChange={handleTabChange}
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                bgcolor: "#fff",
                borderRadius: 2,
                "& .MuiTab-root": {
                  textTransform: "none",
                  fontWeight: 700,
                  fontSize: "13.5px",
                  minHeight: 48,
                  px: 2.5
                }
              }}
            >
              <Tab icon={<Today fontSize="small" />} iconPosition="start" label="Day Report (Daily Evaluation)" />
              <Tab icon={<CalendarMonth fontSize="small" />} iconPosition="start" label="Monthly Report (Valuator Valuations)" />
              <Tab icon={<People fontSize="small" />} iconPosition="start" label="Examiners Report & Attendance" />
              <Tab icon={<LocationCity fontSize="small" />} iconPosition="start" label="Center-wise Report" />
              <Tab icon={<ReceiptLong fontSize="small" />} iconPosition="start" label="Series-wise Script Log" />
              <Tab icon={<ReportProblem fontSize="small" />} iconPosition="start" label="Skipped / Pending Scripts" />
            </Tabs>
          </Paper>

          {/* Filter Card */}
          <Card elevation={0} className="no-print" sx={{ border: "1px solid #e2e8f0", borderRadius: 2, bgcolor: "#ffffff" }}>
            <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={6} md={activeTab === 0 || activeTab === 1 ? 2.4 : 3}>
                  <TextField
                    select
                    fullWidth
                    size="small"
                    label="Academic Year"
                    value={filters.academicyear}
                    onChange={(e) => handleFilterChange("academicyear", e.target.value)}
                  >
                    <MenuItem value="">All Academic Years</MenuItem>
                    {options.academicyears.map((yr) => (
                      <MenuItem key={yr} value={yr}>{yr}</MenuItem>
                    ))}
                  </TextField>
                </Grid>

                <Grid item xs={12} sm={6} md={activeTab === 0 || activeTab === 1 ? 2.4 : 3}>
                  <TextField
                    select
                    fullWidth
                    size="small"
                    label="Exam"
                    value={filters.examcode}
                    onChange={(e) => handleFilterChange("examcode", e.target.value)}
                  >
                    <MenuItem value="">All Exams</MenuItem>
                    {options.exams.map((ex) => (
                      <MenuItem key={ex.examcode} value={ex.examcode}>
                        {ex.exam} ({ex.examcode})
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>

                <Grid item xs={12} sm={6} md={activeTab === 0 || activeTab === 1 ? 2.4 : 3}>
                  <TextField
                    select
                    fullWidth
                    size="small"
                    label="Course / Subject"
                    value={filters.coursecode}
                    onChange={(e) => handleFilterChange("coursecode", e.target.value)}
                  >
                    <MenuItem value="">All Courses</MenuItem>
                    {options.courses.map((c) => (
                      <MenuItem key={c.coursecode} value={c.coursecode}>
                        {c.course} ({c.coursecode})
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>

                {/* Day Report: Date Filter */}
                {activeTab === 0 && (
                  <Grid item xs={12} sm={6} md={2.4}>
                    <TextField
                      fullWidth
                      size="small"
                      type="date"
                      label="Evaluation Date"
                      InputLabelProps={{ shrink: true }}
                      value={filters.date}
                      onChange={(e) => handleFilterChange("date", e.target.value)}
                    />
                  </Grid>
                )}

                {/* Monthly Report: Month Filter */}
                {activeTab === 1 && (
                  <Grid item xs={12} sm={6} md={2.4}>
                    <TextField
                      fullWidth
                      size="small"
                      type="month"
                      label="Valuation Month"
                      InputLabelProps={{ shrink: true }}
                      value={filters.yearMonth}
                      onChange={(e) => handleFilterChange("yearMonth", e.target.value)}
                    />
                  </Grid>
                )}

                <Grid item xs={12} sm={6} md={activeTab === 0 || activeTab === 1 ? 2.4 : 3}>
                  <Stack direction="row" spacing={1}>
                    <Button
                      variant="contained"
                      fullWidth
                      onClick={handleApplyFilter}
                      disabled={loading}
                      sx={{ height: 40, fontWeight: 700, textTransform: "none" }}
                    >
                      {loading ? <CircularProgress size={20} color="inherit" /> : "Apply"}
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={handleResetFilter}
                      sx={{ height: 40, textTransform: "none", fontWeight: 600 }}
                    >
                      Reset
                    </Button>
                  </Stack>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Alerts */}
          {error && <Alert severity="error" className="no-print" onClose={() => setError("")}>{error}</Alert>}
          {successMsg && <Alert severity="success" className="no-print" onClose={() => setSuccessMsg("")}>{successMsg}</Alert>}

          {/* Table Container Card */}
          <Paper elevation={0} className="print-container" sx={{ border: "1px solid #e2e8f0", borderRadius: 2, overflow: "hidden", bgcolor: "#fff" }}>
            {/* Toolbar */}
            <Box
              className="no-print"
              sx={{
                p: 2,
                bgcolor: "#f8fafc",
                borderBottom: "1px solid #e2e8f0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 1.5
              }}
            >
              <Stack direction="row" spacing={1}>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<ContentCopy fontSize="small" />}
                  onClick={handleCopy}
                  sx={{ textTransform: "none", bgcolor: "#fff", fontWeight: 600 }}
                >
                  Copy
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<FileDownload fontSize="small" />}
                  onClick={handleExportCSV}
                  sx={{ textTransform: "none", bgcolor: "#fff", fontWeight: 600 }}
                >
                  Excel / CSV
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<Print fontSize="small" />}
                  onClick={handlePrint}
                  sx={{ textTransform: "none", bgcolor: "#fff", fontWeight: 600 }}
                >
                  Print
                </Button>
              </Stack>

              <TextField
                size="small"
                placeholder="Search report records..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search fontSize="small" color="action" />
                    </InputAdornment>
                  )
                }}
                sx={{ bgcolor: "#fff", minWidth: 260 }}
              />
            </Box>

            {/* TAB 0: DAY REPORT */}
            {activeTab === 0 && (
              <TableContainer sx={{ maxHeight: "75vh" }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 800, bgcolor: "#f1f5f9", textAlign: "center", width: 50 }}>S.No</TableCell>
                      <TableCell sx={{ fontWeight: 800, bgcolor: "#f1f5f9" }}>Date</TableCell>
                      <TableCell sx={{ fontWeight: 800, bgcolor: "#f1f5f9" }}>Valuator ID</TableCell>
                      <TableCell sx={{ fontWeight: 800, bgcolor: "#f1f5f9" }}>Valuator Name</TableCell>
                      <TableCell sx={{ fontWeight: 800, bgcolor: "#f1f5f9" }}>Institution</TableCell>
                      <TableCell sx={{ fontWeight: 800, bgcolor: "#f1f5f9" }}>Subject Code</TableCell>
                      <TableCell sx={{ fontWeight: 800, bgcolor: "#f1f5f9" }}>Subject Name</TableCell>
                      <TableCell sx={{ fontWeight: 800, bgcolor: "#eff6ff", color: "#1e40af", textAlign: "center" }}>Scripts Evaluated</TableCell>
                      <TableCell sx={{ fontWeight: 800, bgcolor: "#f1f5f9", textAlign: "center" }}>Avg Marks</TableCell>
                      <TableCell sx={{ fontWeight: 800, bgcolor: "#f1f5f9", textAlign: "center" }}>Highest</TableCell>
                      <TableCell sx={{ fontWeight: 800, bgcolor: "#f1f5f9", textAlign: "center" }}>Lowest</TableCell>
                      <TableCell sx={{ fontWeight: 800, bgcolor: "#f1f5f9", textAlign: "center" }}>Valuation Type</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={12} sx={{ textAlign: "center", py: 4 }}><CircularProgress size={30} /></TableCell></TableRow>
                    ) : filteredData.length === 0 ? (
                      <TableRow><TableCell colSpan={12} sx={{ textAlign: "center", py: 4, color: "#64748b" }}>No daily evaluation records found for the selected criteria.</TableCell></TableRow>
                    ) : (
                      filteredData.map((row) => (
                        <TableRow key={row.sno} hover sx={{ "&:nth-of-type(even)": { bgcolor: "#f8fafc" } }}>
                          <TableCell sx={{ textAlign: "center", fontWeight: 600 }}>{row.sno}</TableCell>
                          <TableCell sx={{ fontWeight: 700, color: "#0f172a" }}>{row.date}</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>{row.evaluatorId}</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>{row.evaluatorName}</TableCell>
                          <TableCell>{row.institution}</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>{row.subjectCode}</TableCell>
                          <TableCell>{row.subjectName}</TableCell>
                          <TableCell sx={{ textAlign: "center", fontWeight: 800, color: "#1d4ed8", bgcolor: "#eff6ff" }}>{row.scriptsEvaluated}</TableCell>
                          <TableCell sx={{ textAlign: "center", fontWeight: 600 }}>{row.avgMark}</TableCell>
                          <TableCell sx={{ textAlign: "center", color: "#166534", fontWeight: 700 }}>{row.highestMark}</TableCell>
                          <TableCell sx={{ textAlign: "center", color: "#991b1b", fontWeight: 700 }}>{row.lowestMark}</TableCell>
                          <TableCell sx={{ textAlign: "center" }}><Chip label={row.valuationType} size="small" color="primary" variant="outlined" sx={{ fontWeight: 700 }} /></TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            {/* TAB 1: MONTHLY REPORT */}
            {activeTab === 1 && (
              <TableContainer sx={{ maxHeight: "75vh" }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 800, bgcolor: "#f1f5f9", textAlign: "center", width: 50 }}>S.No</TableCell>
                      <TableCell sx={{ fontWeight: 800, bgcolor: "#f1f5f9" }}>Month</TableCell>
                      <TableCell sx={{ fontWeight: 800, bgcolor: "#f1f5f9" }}>Valuator ID</TableCell>
                      <TableCell sx={{ fontWeight: 800, bgcolor: "#f1f5f9" }}>Valuator Name</TableCell>
                      <TableCell sx={{ fontWeight: 800, bgcolor: "#f1f5f9" }}>Institution</TableCell>
                      <TableCell sx={{ fontWeight: 800, bgcolor: "#f1f5f9", textAlign: "center" }}>Subjects</TableCell>
                      <TableCell sx={{ fontWeight: 800, bgcolor: "#f1f5f9", textAlign: "center" }}>Allotted</TableCell>
                      <TableCell sx={{ fontWeight: 800, bgcolor: "#eff6ff", color: "#1e40af", textAlign: "center" }}>V1 Valuated</TableCell>
                      <TableCell sx={{ fontWeight: 800, bgcolor: "#f0fdf4", color: "#166534", textAlign: "center" }}>Re-eval (V2/V3)</TableCell>
                      <TableCell sx={{ fontWeight: 800, bgcolor: "#f8fafc", textAlign: "center" }}>Total Done</TableCell>
                      <TableCell sx={{ fontWeight: 800, bgcolor: "#f1f5f9", textAlign: "center" }}>Pending</TableCell>
                      <TableCell sx={{ fontWeight: 800, bgcolor: "#f1f5f9", textAlign: "center" }}>Active Days</TableCell>
                      <TableCell sx={{ fontWeight: 800, bgcolor: "#f1f5f9", textAlign: "center" }}>Completion %</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={13} sx={{ textAlign: "center", py: 4 }}><CircularProgress size={30} /></TableCell></TableRow>
                    ) : filteredData.length === 0 ? (
                      <TableRow><TableCell colSpan={13} sx={{ textAlign: "center", py: 4, color: "#64748b" }}>No monthly valuation records found for the selected criteria.</TableCell></TableRow>
                    ) : (
                      filteredData.map((row) => (
                        <TableRow key={row.sno} hover sx={{ "&:nth-of-type(even)": { bgcolor: "#f8fafc" } }}>
                          <TableCell sx={{ textAlign: "center", fontWeight: 600 }}>{row.sno}</TableCell>
                          <TableCell sx={{ fontWeight: 700, color: "#0f172a" }}>{row.month}</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>{row.evaluatorId}</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>{row.evaluatorName}</TableCell>
                          <TableCell>{row.institution}</TableCell>
                          <TableCell sx={{ textAlign: "center", fontWeight: 600 }}>{row.subjectsCount}</TableCell>
                          <TableCell sx={{ textAlign: "center", fontWeight: 700 }}>{row.totalAllotted}</TableCell>
                          <TableCell sx={{ textAlign: "center", fontWeight: 800, color: "#1d4ed8", bgcolor: "#eff6ff" }}>{row.v1Evaluated}</TableCell>
                          <TableCell sx={{ textAlign: "center", fontWeight: 700, color: "#15803d", bgcolor: "#f0fdf4" }}>{row.revalEvaluated}</TableCell>
                          <TableCell sx={{ textAlign: "center", fontWeight: 800 }}>{row.totalEvaluated}</TableCell>
                          <TableCell sx={{ textAlign: "center", color: row.pendingScripts > 0 ? "error.main" : "text.secondary", fontWeight: 700 }}>{row.pendingScripts}</TableCell>
                          <TableCell sx={{ textAlign: "center", fontWeight: 600 }}>{row.activeDays}</TableCell>
                          <TableCell sx={{ textAlign: "center", fontWeight: 800, color: "#047857" }}>{row.completionRate}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            {/* TAB 2: EXAMINERS REPORT & ATTENDANCE */}
            {activeTab === 2 && (
              <TableContainer sx={{ maxHeight: "75vh" }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 800, bgcolor: "#f1f5f9", textAlign: "center", width: 50 }}>S.No</TableCell>
                      <TableCell sx={{ fontWeight: 800, bgcolor: "#f1f5f9" }}>Evaluator ID</TableCell>
                      <TableCell sx={{ fontWeight: 800, bgcolor: "#f1f5f9" }}>Evaluator Name</TableCell>
                      <TableCell sx={{ fontWeight: 800, bgcolor: "#f1f5f9" }}>Contact No</TableCell>
                      <TableCell sx={{ fontWeight: 800, bgcolor: "#f1f5f9" }}>Institution</TableCell>
                      <TableCell sx={{ fontWeight: 800, bgcolor: "#f1f5f9" }}>Allotted Courses</TableCell>
                      <TableCell sx={{ fontWeight: 800, bgcolor: "#f1f5f9", textAlign: "center" }}>Total Scripts</TableCell>
                      <TableCell sx={{ fontWeight: 800, bgcolor: "#eff6ff", color: "#1e40af", textAlign: "center" }}>Evaluated</TableCell>
                      <TableCell sx={{ fontWeight: 800, bgcolor: "#fef3c7", color: "#92400e", textAlign: "center" }}>Pending</TableCell>
                      <TableCell sx={{ fontWeight: 800, bgcolor: "#f1f5f9", textAlign: "center" }}>Avg Mark</TableCell>
                      <TableCell sx={{ fontWeight: 800, bgcolor: "#f1f5f9", textAlign: "center" }}>Active Days</TableCell>
                      <TableCell sx={{ fontWeight: 800, bgcolor: "#f1f5f9", textAlign: "center" }}>Last Active</TableCell>
                      <TableCell sx={{ fontWeight: 800, bgcolor: "#f1f5f9", textAlign: "center" }}>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={13} sx={{ textAlign: "center", py: 4 }}><CircularProgress size={30} /></TableCell></TableRow>
                    ) : filteredData.length === 0 ? (
                      <TableRow><TableCell colSpan={13} sx={{ textAlign: "center", py: 4, color: "#64748b" }}>No examiner records found.</TableCell></TableRow>
                    ) : (
                      filteredData.map((row) => (
                        <TableRow key={row.sno} hover sx={{ "&:nth-of-type(even)": { bgcolor: "#f8fafc" } }}>
                          <TableCell sx={{ textAlign: "center", fontWeight: 600 }}>{row.sno}</TableCell>
                          <TableCell sx={{ fontWeight: 700, color: "#0f172a" }}>{row.evaluatorId}</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>{row.evaluatorName}</TableCell>
                          <TableCell>{row.phone}</TableCell>
                          <TableCell>{row.institution}</TableCell>
                          <TableCell sx={{ maxWidth: 200, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{row.allottedCourses}</TableCell>
                          <TableCell sx={{ textAlign: "center", fontWeight: 700 }}>{row.totalScripts}</TableCell>
                          <TableCell sx={{ textAlign: "center", fontWeight: 800, color: "#1d4ed8", bgcolor: "#eff6ff" }}>{row.evaluatedScripts}</TableCell>
                          <TableCell sx={{ textAlign: "center", fontWeight: 800, color: "#b45309", bgcolor: "#fef3c7" }}>{row.pendingScripts}</TableCell>
                          <TableCell sx={{ textAlign: "center", fontWeight: 600 }}>{row.avgMark}</TableCell>
                          <TableCell sx={{ textAlign: "center", fontWeight: 700 }}>{row.activeValuationDays}</TableCell>
                          <TableCell sx={{ textAlign: "center", fontSize: "12px" }}>{row.lastActiveDate}</TableCell>
                          <TableCell sx={{ textAlign: "center" }}>
                            <Chip
                              label={row.status}
                              size="small"
                              color={row.status === "Completed" ? "success" : row.status === "In Progress" ? "primary" : "warning"}
                              sx={{ fontWeight: 700 }}
                            />
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            {/* TAB 3: CENTER-WISE REPORT */}
            {activeTab === 3 && (
              <TableContainer sx={{ maxHeight: "75vh" }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 800, bgcolor: "#f1f5f9", textAlign: "center", width: 50 }}>S.No</TableCell>
                      <TableCell sx={{ fontWeight: 800, bgcolor: "#f1f5f9" }}>Center / Department Name</TableCell>
                      <TableCell sx={{ fontWeight: 800, bgcolor: "#f1f5f9", textAlign: "center" }}>Subjects</TableCell>
                      <TableCell sx={{ fontWeight: 800, bgcolor: "#f1f5f9", textAlign: "center" }}>Total Scripts</TableCell>
                      <TableCell sx={{ fontWeight: 800, bgcolor: "#f0fdf4", color: "#166534", textAlign: "center" }}>Uploaded</TableCell>
                      <TableCell sx={{ fontWeight: 800, bgcolor: "#fef2f2", color: "#991b1b", textAlign: "center" }}>Pending Upload</TableCell>
                      <TableCell sx={{ fontWeight: 800, bgcolor: "#eff6ff", color: "#1e40af", textAlign: "center" }}>Valuated Scripts</TableCell>
                      <TableCell sx={{ fontWeight: 800, bgcolor: "#fef3c7", color: "#92400e", textAlign: "center" }}>Pending Valuation</TableCell>
                      <TableCell sx={{ fontWeight: 800, bgcolor: "#f1f5f9", textAlign: "center" }}>Completion %</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={9} sx={{ textAlign: "center", py: 4 }}><CircularProgress size={30} /></TableCell></TableRow>
                    ) : filteredData.length === 0 ? (
                      <TableRow><TableCell colSpan={9} sx={{ textAlign: "center", py: 4, color: "#64748b" }}>No center valuation records found.</TableCell></TableRow>
                    ) : (
                      filteredData.map((row) => (
                        <TableRow key={row.sno} hover sx={{ "&:nth-of-type(even)": { bgcolor: "#f8fafc" } }}>
                          <TableCell sx={{ textAlign: "center", fontWeight: 600 }}>{row.sno}</TableCell>
                          <TableCell sx={{ fontWeight: 700, color: "#0f172a" }}>{row.centerName}</TableCell>
                          <TableCell sx={{ textAlign: "center", fontWeight: 600 }}>{row.totalSubjects}</TableCell>
                          <TableCell sx={{ textAlign: "center", fontWeight: 700 }}>{row.totalScripts}</TableCell>
                          <TableCell sx={{ textAlign: "center", fontWeight: 700, color: "#166534", bgcolor: "#f0fdf4" }}>{row.uploadedScripts}</TableCell>
                          <TableCell sx={{ textAlign: "center", color: row.pendingUploads > 0 ? "error.main" : "text.secondary", fontWeight: 700 }}>{row.pendingUploads}</TableCell>
                          <TableCell sx={{ textAlign: "center", fontWeight: 800, color: "#1d4ed8", bgcolor: "#eff6ff" }}>{row.valuatedScripts}</TableCell>
                          <TableCell sx={{ textAlign: "center", fontWeight: 800, color: "#b45309", bgcolor: "#fef3c7" }}>{row.pendingValuation}</TableCell>
                          <TableCell sx={{ textAlign: "center", fontWeight: 800, color: "#047857" }}>{row.percentCompleted}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            {/* TAB 4: SERIES-WISE SCRIPT LOG */}
            {activeTab === 4 && (
              <TableContainer sx={{ maxHeight: "75vh" }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 800, bgcolor: "#f1f5f9", textAlign: "center", width: 50 }}>S.No</TableCell>
                      <TableCell sx={{ fontWeight: 800, bgcolor: "#f1f5f9", textAlign: "center" }}>CN</TableCell>
                      <TableCell sx={{ fontWeight: 800, bgcolor: "#f1f5f9" }}>Enrollment No</TableCell>
                      <TableCell sx={{ fontWeight: 800, bgcolor: "#f1f5f9" }}>Student Name</TableCell>
                      <TableCell sx={{ fontWeight: 800, bgcolor: "#f1f5f9" }}>Subject Code</TableCell>
                      <TableCell sx={{ fontWeight: 800, bgcolor: "#f1f5f9" }}>Subject Name</TableCell>
                      <TableCell sx={{ fontWeight: 800, bgcolor: "#f1f5f9" }}>Valuator ID</TableCell>
                      <TableCell sx={{ fontWeight: 800, bgcolor: "#f1f5f9" }}>Valuator Name</TableCell>
                      <TableCell sx={{ fontWeight: 800, bgcolor: "#f1f5f9", textAlign: "center" }}>Marks</TableCell>
                      <TableCell sx={{ fontWeight: 800, bgcolor: "#f1f5f9", textAlign: "center" }}>Valuation Type</TableCell>
                      <TableCell sx={{ fontWeight: 800, bgcolor: "#f1f5f9", textAlign: "center" }}>Date</TableCell>
                      <TableCell sx={{ fontWeight: 800, bgcolor: "#f1f5f9", textAlign: "center" }}>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={12} sx={{ textAlign: "center", py: 4 }}><CircularProgress size={30} /></TableCell></TableRow>
                    ) : filteredData.length === 0 ? (
                      <TableRow><TableCell colSpan={12} sx={{ textAlign: "center", py: 4, color: "#64748b" }}>No series log scripts found.</TableCell></TableRow>
                    ) : (
                      filteredData.map((row) => (
                        <TableRow key={row.sno} hover sx={{ "&:nth-of-type(even)": { bgcolor: "#f8fafc" } }}>
                          <TableCell sx={{ textAlign: "center", fontWeight: 600 }}>{row.sno}</TableCell>
                          <TableCell sx={{ textAlign: "center", fontWeight: 800, color: "#0284c7" }}>{row.cn}</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>{row.regno}</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>{row.student}</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>{row.subjectCode}</TableCell>
                          <TableCell>{row.subjectName}</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>{row.evaluatorId}</TableCell>
                          <TableCell>{row.evaluatorName}</TableCell>
                          <TableCell sx={{ textAlign: "center", fontWeight: 800, color: row.marks !== "-" ? "#047857" : "#94a3b8" }}>{row.marks}</TableCell>
                          <TableCell sx={{ textAlign: "center" }}><Chip label={row.valuationType} size="small" variant="outlined" sx={{ fontWeight: 700 }} /></TableCell>
                          <TableCell sx={{ textAlign: "center", fontSize: "12px" }}>{row.evaluationDate}</TableCell>
                          <TableCell sx={{ textAlign: "center" }}>
                            <Chip
                              label={row.status}
                              size="small"
                              color={row.status === "Valuated" ? "success" : "warning"}
                              sx={{ fontWeight: 700 }}
                            />
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            {/* TAB 5: SKIPPED / PENDING SCRIPTS */}
            {activeTab === 5 && (
              <TableContainer sx={{ maxHeight: "75vh" }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 800, bgcolor: "#f1f5f9", textAlign: "center", width: 50 }}>S.No</TableCell>
                      <TableCell sx={{ fontWeight: 800, bgcolor: "#f1f5f9", textAlign: "center" }}>CN</TableCell>
                      <TableCell sx={{ fontWeight: 800, bgcolor: "#f1f5f9" }}>Enrollment No</TableCell>
                      <TableCell sx={{ fontWeight: 800, bgcolor: "#f1f5f9" }}>Student Name</TableCell>
                      <TableCell sx={{ fontWeight: 800, bgcolor: "#f1f5f9" }}>Subject Code</TableCell>
                      <TableCell sx={{ fontWeight: 800, bgcolor: "#f1f5f9" }}>Subject Name</TableCell>
                      <TableCell sx={{ fontWeight: 800, bgcolor: "#f1f5f9" }}>Allotted Evaluator</TableCell>
                      <TableCell sx={{ fontWeight: 800, bgcolor: "#fef2f2", color: "#991b1b", textAlign: "center" }}>Issue Type</TableCell>
                      <TableCell sx={{ fontWeight: 800, bgcolor: "#f1f5f9", textAlign: "center" }}>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={9} sx={{ textAlign: "center", py: 4 }}><CircularProgress size={30} /></TableCell></TableRow>
                    ) : filteredData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} sx={{ textAlign: "center", py: 5, color: "#166534" }}>
                          <CheckCircle color="success" sx={{ fontSize: 40, mb: 1 }} />
                          <Typography variant="body1" fontWeight={700}>All Answer Scripts Valuated!</Typography>
                          <Typography variant="body2" color="text.secondary">No skipped, unassigned, or pending scripts detected.</Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredData.map((row) => (
                        <TableRow key={row.sno} hover sx={{ "&:nth-of-type(even)": { bgcolor: "#f8fafc" } }}>
                          <TableCell sx={{ textAlign: "center", fontWeight: 600 }}>{row.sno}</TableCell>
                          <TableCell sx={{ textAlign: "center", fontWeight: 800, color: "#0284c7" }}>{row.cn}</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>{row.regno}</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>{row.student}</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>{row.subjectCode}</TableCell>
                          <TableCell>{row.subjectName}</TableCell>
                          <TableCell>{row.evaluatorName} ({row.evaluatorId})</TableCell>
                          <TableCell sx={{ textAlign: "center" }}>
                            <Chip label={row.issueType} size="small" color="error" sx={{ fontWeight: 700 }} />
                          </TableCell>
                          <TableCell sx={{ textAlign: "center" }}>
                            <Chip label={row.status} size="small" variant="outlined" color="warning" sx={{ fontWeight: 700 }} />
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        </Stack>
      </Box>
    </MenuPageShell>
  );
}
