import React, { useEffect, useState, useMemo } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  InputAdornment,
  MenuItem,
  Paper,
  Stack,
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
  Assessment,
  ArrowForward,
  Description
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import ep1 from "../api/ep1";
import global1 from "./global1";
import MenuPageShell from "./MenuPageShell";

export default function ConductExam2ValuationSummaryPage() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [reportRows, setReportRows] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  const [filters, setFilters] = useState({
    academicyear: "",
    examcode: "",
    programcode: "",
    coursecode: ""
  });

  const [options, setOptions] = useState({
    academicyears: [],
    exams: [],
    programs: [],
    courses: []
  });

  useEffect(() => {
    loadOptions();
    fetchReport();
  }, []);

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
      console.error("Error loading options:", err);
    }
  };

  const fetchReport = async (activeFilters = filters) => {
    try {
      setLoading(true);
      setError("");
      const res = await ep1.get("/api/v2/conductexam2/valuation-status-summary", {
        params: {
          colid: global1.colid,
          academicyear: activeFilters.academicyear,
          examcode: activeFilters.examcode,
          programcode: activeFilters.programcode,
          coursecode: activeFilters.coursecode
        }
      });
      if (res.data?.success) {
        setReportRows(res.data.rows || []);
      } else {
        setError(res.data?.message || "Failed to load valuation summary report.");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Error fetching valuation summary report.");
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field, value) => {
    const next = { ...filters, [field]: value };
    setFilters(next);
    fetchReport(next);
  };

  // Filter rows by search box
  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return reportRows;
    const q = searchQuery.toLowerCase();
    return reportRows.filter(
      (r) =>
        (r.courseName || "").toLowerCase().includes(q) ||
        (r.subjectCode || "").toLowerCase().includes(q) ||
        (r.subjectName || "").toLowerCase().includes(q) ||
        (r.programName || "").toLowerCase().includes(q) ||
        (r.examCode || "").toLowerCase().includes(q)
    );
  }, [reportRows, searchQuery]);

  // Export handlers
  const handleCopy = () => {
    const headers = [
      "Sno.", "Course Name", "Subject Code", "Subject Name", "No.Scripts",
      "Uploaded", "Pending Uploads", "V1 Valuated", "V1 AFV", "Reval Applied",
      "V2 Valuated", "V2 AFV (Pendency)", "V3 Valuated", "V3 AFV (Pendency)",
      "V4 Pendency", "V4 Valuated"
    ];
    const data = filteredRows.map((r) => [
      r.sno, r.courseName, r.subjectCode, r.subjectName, r.noScripts,
      r.uploaded, r.pendingUploads, r.v1Valuated, r.v1Afv ?? r.afv ?? 0, r.revalApplied,
      r.v2Valuated, r.v2Afv ?? r.v2Pendency ?? 0, r.v3Valuated, r.v3Afv ?? r.v3Pendency ?? 0,
      r.v4Pendency ?? 0, r.v4Valuated ?? 0
    ].join("\t"));
    navigator.clipboard.writeText([headers.join("\t"), ...data].join("\n"));
    setSuccessMsg("Summary table copied to clipboard!");
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  const handleExportCSV = () => {
    const headers = [
      "Sno.", "Course Name", "Subject Code", "Subject Name", "No.Scripts",
      "Uploaded", "Pending Uploads", "V1 Valuated", "V1 AFV", "Reval Applied",
      "V2 Valuated", "V2 AFV (Pendency)", "V3 Valuated", "V3 AFV (Pendency)",
      "V4 Pendency", "V4 Valuated"
    ];
    const rows = filteredRows.map((r) => [
      r.sno, `"${(r.courseName || "").replace(/"/g, '""')}"`, r.subjectCode,
      `"${(r.subjectName || "").replace(/"/g, '""')}"`, r.noScripts,
      r.uploaded, r.pendingUploads, r.v1Valuated, r.v1Afv ?? r.afv ?? 0, r.revalApplied,
      r.v2Valuated, r.v2Afv ?? r.v2Pendency ?? 0, r.v3Valuated, r.v3Afv ?? r.v3Pendency ?? 0,
      r.v4Pendency ?? 0, r.v4Valuated ?? 0
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Valuation_Summary_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <MenuPageShell title="Summary Report - Valuation & Re-evaluation Pipeline">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .summary-print-container { width: 100% !important; margin: 0 !important; padding: 0 !important; }
        }
      `}</style>

      <Box sx={{ p: { xs: 1.5, sm: 3 }, maxWidth: 1400, mx: "auto" }}>
        <Stack spacing={2.5}>
          {/* Top Banner Card */}
          <Card elevation={2} className="no-print">
            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                  <Box
                    sx={{
                      width: 44,
                      height: 44,
                      borderRadius: 1.5,
                      bgcolor: "primary.main",
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}
                  >
                    <Assessment fontSize="medium" />
                  </Box>
                  <Box>
                    <Typography variant="h5" sx={{ fontWeight: 800, color: "#111827" }}>
                      Summary Report
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Comprehensive tracking of all papers across Uploading, Initial Valuation (V1), and 3 Re-evaluation steps (V2, V3, V4)
                    </Typography>
                  </Box>
                </Box>

                <Stack direction="row" spacing={1.5}>
                  <Button
                    variant="outlined"
                    startIcon={<Refresh />}
                    onClick={() => fetchReport()}
                    disabled={loading}
                    size="small"
                  >
                    Refresh
                  </Button>
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<ArrowForward />}
                    onClick={() => navigate("/conduct-exam-2-reevaluation")}
                    size="small"
                  >
                    Re-evaluation Desk
                  </Button>
                </Stack>
              </Box>

              {/* Filter Row */}
              <Divider sx={{ my: 2 }} />
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={6} md={3}>
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

                <Grid item xs={12} sm={6} md={3}>
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
                      <MenuItem key={ex.examcode} value={ex.examcode}>{ex.exam} ({ex.examcode})</MenuItem>
                    ))}
                  </TextField>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
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
                      <MenuItem key={c.coursecode} value={c.coursecode}>{c.course} ({c.coursecode})</MenuItem>
                    ))}
                  </TextField>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <Button
                    variant="contained"
                    fullWidth
                    onClick={() => fetchReport()}
                    disabled={loading}
                    sx={{ height: 40, fontWeight: 700 }}
                  >
                    {loading ? <CircularProgress size={22} color="inherit" /> : "Apply Filter"}
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Alerts */}
          {error && <Alert severity="error" className="no-print" onClose={() => setError("")}>{error}</Alert>}
          {successMsg && <Alert severity="success" className="no-print" onClose={() => setSuccessMsg("")}>{successMsg}</Alert>}

          {/* Table Container Card (Matching Reference Layout) */}
          <Paper elevation={2} className="summary-print-container" sx={{ borderRadius: 1.5, overflow: "hidden" }}>
            {/* Action Toolbar Header (Copy, Excel, CSV, PDF, Print, Search) */}
            <Box
              className="no-print"
              sx={{
                p: 2,
                bgcolor: "#f9fafb",
                borderBottom: "1px solid #e5e7eb",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 1.5
              }}
            >
              {/* Export Buttons */}
              <Stack direction="row" spacing={1}>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<ContentCopy fontSize="small" />}
                  onClick={handleCopy}
                  sx={{ textTransform: "none", bgcolor: "#fff" }}
                >
                  Copy
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<FileDownload fontSize="small" />}
                  onClick={handleExportCSV}
                  sx={{ textTransform: "none", bgcolor: "#fff" }}
                >
                  Excel / CSV
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<Print fontSize="small" />}
                  onClick={handlePrint}
                  sx={{ textTransform: "none", bgcolor: "#fff" }}
                >
                  Print
                </Button>
              </Stack>

              {/* Search Bar */}
              <Box sx={{ width: { xs: "100%", sm: 260 } }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search fontSize="small" color="action" />
                      </InputAdornment>
                    )
                  }}
                  sx={{ bgcolor: "#fff" }}
                />
              </Box>
            </Box>

            {/* Main Summary Table */}
            <TableContainer sx={{ maxHeight: "75vh" }}>
              <Table stickyHeader size="small" sx={{ minWidth: 1100 }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800, bgcolor: "#f3f4f6", width: 50, textAlign: "center" }}>Sno.</TableCell>
                    <TableCell sx={{ fontWeight: 800, bgcolor: "#f3f4f6", minWidth: 180 }}>Course Name</TableCell>
                    <TableCell sx={{ fontWeight: 800, bgcolor: "#f3f4f6", minWidth: 110 }}>Subject Code</TableCell>
                    <TableCell sx={{ fontWeight: 800, bgcolor: "#f3f4f6", minWidth: 160 }}>Subject Name</TableCell>
                    <TableCell sx={{ fontWeight: 800, bgcolor: "#f3f4f6", textAlign: "center" }}>No.Scripts</TableCell>
                    <TableCell sx={{ fontWeight: 800, bgcolor: "#f3f4f6", textAlign: "center" }}>Uploaded</TableCell>
                    <TableCell sx={{ fontWeight: 800, bgcolor: "#f3f4f6", textAlign: "center" }}>Pending Uploads</TableCell>
                    <TableCell sx={{ fontWeight: 800, bgcolor: "#eff6ff", color: "#1e40af", textAlign: "center" }}>V1 Valuated</TableCell>
                    <TableCell sx={{ fontWeight: 800, bgcolor: "#fef3c7", color: "#92400e", textAlign: "center" }}>V1 AFV</TableCell>
                    <TableCell sx={{ fontWeight: 800, bgcolor: "#f3f4f6", textAlign: "center" }}>Reval Applied</TableCell>
                    <TableCell sx={{ fontWeight: 800, bgcolor: "#f0fdf4", color: "#166534", textAlign: "center" }}>V2 Valuated</TableCell>
                    <TableCell sx={{ fontWeight: 800, bgcolor: "#fef9c3", color: "#854d0e", textAlign: "center" }}>
                      V2 AFV
                      <Typography component="span" sx={{ fontSize: "10px", display: "block", color: "text.secondary", fontWeight: 600 }}>
                        (Pendency)
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 800, bgcolor: "#f0fdf4", color: "#166534", textAlign: "center" }}>V3 Valuated</TableCell>
                    <TableCell sx={{ fontWeight: 800, bgcolor: "#fef9c3", color: "#854d0e", textAlign: "center" }}>
                      V3 AFV
                      <Typography component="span" sx={{ fontSize: "10px", display: "block", color: "text.secondary", fontWeight: 600 }}>
                        (Pendency)
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 800, bgcolor: "#fff1f2", color: "#9f1239", textAlign: "center" }}>V4 Pendency</TableCell>
                    <TableCell sx={{ fontWeight: 800, bgcolor: "#fdf2f8", color: "#9d174d", textAlign: "center" }}>V4 Valuated</TableCell>
                    <TableCell sx={{ fontWeight: 800, bgcolor: "#f3f4f6", textAlign: "center", minWidth: 130 }}>Action</TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={17} sx={{ textAlign: "center", py: 5 }}>
                        <CircularProgress size={36} />
                        <Typography variant="body2" sx={{ mt: 1.5 }} color="text.secondary">
                          Loading Valuation Summary Report...
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : filteredRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={17} sx={{ textAlign: "center", py: 5, color: "#6b7280" }}>
                        No examination courses found matching the selected filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRows.map((row) => (
                      <TableRow key={row.sno} hover sx={{ "&:nth-of-type(even)": { bgcolor: "#fafafa" } }}>
                        <TableCell sx={{ textAlign: "center", fontWeight: 600 }}>{row.sno}</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: "#111827" }}>{row.courseName}</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: "#1f2937" }}>{row.subjectCode}</TableCell>
                        <TableCell>{row.subjectName}</TableCell>
                        <TableCell sx={{ textAlign: "center", fontWeight: 700 }}>{row.noScripts}</TableCell>
                        <TableCell sx={{ textAlign: "center", color: row.uploaded > 0 ? "success.main" : "text.secondary", fontWeight: 600 }}>
                          {row.uploaded}
                        </TableCell>
                        <TableCell sx={{ textAlign: "center", color: row.pendingUploads > 0 ? "error.main" : "text.secondary", fontWeight: 600 }}>
                          {row.pendingUploads}
                        </TableCell>
                        <TableCell sx={{ textAlign: "center", bgcolor: "#eff6ff", fontWeight: 700, color: "#1d4ed8" }}>
                          {row.v1Valuated}
                        </TableCell>
                        <TableCell sx={{ textAlign: "center", bgcolor: "#fef3c7", fontWeight: 700, color: "#b45309" }}>
                          {row.v1Afv ?? row.afv ?? 0}
                        </TableCell>
                        <TableCell sx={{ textAlign: "center", fontWeight: 600 }}>
                          {row.revalApplied > 0 ? (
                            <Chip label={row.revalApplied} size="small" color="secondary" sx={{ fontWeight: 700 }} />
                          ) : (
                            "0"
                          )}
                        </TableCell>
                        <TableCell sx={{ textAlign: "center", bgcolor: "#f0fdf4", fontWeight: 700, color: "#15803d" }}>
                          {row.v2Valuated}
                        </TableCell>
                        <TableCell sx={{ textAlign: "center", bgcolor: "#fef9c3", fontWeight: 700, color: "#854d0e" }}>
                          {row.v2Afv ?? row.v2Pendency ?? 0}
                        </TableCell>
                        <TableCell sx={{ textAlign: "center", bgcolor: "#f0fdf4", fontWeight: 700, color: "#15803d" }}>
                          {row.v3Valuated}
                        </TableCell>
                        <TableCell sx={{ textAlign: "center", bgcolor: "#fef9c3", fontWeight: 700, color: "#854d0e" }}>
                          {row.v3Afv ?? row.v3Pendency ?? 0}
                        </TableCell>
                        <TableCell sx={{ textAlign: "center", bgcolor: "#fff1f2", fontWeight: 700, color: "#be123c" }}>
                          {row.v4Pendency ?? 0}
                        </TableCell>
                        <TableCell sx={{ textAlign: "center", bgcolor: "#fdf2f8", fontWeight: 700, color: "#be185d" }}>
                          {row.v4Valuated}
                        </TableCell>
                        <TableCell sx={{ textAlign: "center" }}>
                          <Button
                            size="small"
                            variant="contained"
                            color="primary"
                            startIcon={<Description fontSize="small" />}
                            onClick={() => navigate(row.awardListUrl)}
                            sx={{
                              textTransform: "none",
                              fontSize: "11px",
                              fontWeight: 700,
                              py: 0.5,
                              px: 1.2,
                              whiteSpace: "nowrap"
                            }}
                          >
                            Award List
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Stack>
      </Box>
    </MenuPageShell>
  );
}
