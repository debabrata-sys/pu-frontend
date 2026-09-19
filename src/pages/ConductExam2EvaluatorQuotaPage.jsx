import React, { useEffect, useState, useMemo } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
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
  Group,
  Person,
  Download as DownloadIcon
} from "@mui/icons-material";
import ep1 from "../api/ep1";
import global1 from "./global1";
import MenuPageShell from "./MenuPageShell";

export default function ConductExam2EvaluatorQuotaPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [reportRows, setReportRows] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  const [filters, setFilters] = useState({
    academicyear: "",
    examcode: "",
    coursecode: ""
  });

  const [options, setOptions] = useState({
    academicyears: [],
    exams: [],
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
      const res = await ep1.get("/api/v2/conductexam2/evaluator-quota-report", {
        params: {
          colid: global1.colid,
          academicyear: activeFilters.academicyear,
          examcode: activeFilters.examcode,
          coursecode: activeFilters.coursecode
        }
      });
      if (res.data?.success) {
        setReportRows(res.data.rows || []);
      } else {
        setError(res.data?.message || "Failed to load evaluator quota report.");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Error fetching evaluator quota report.");
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field, value) => {
    const next = { ...filters, [field]: value };
    setFilters(next);
    fetchReport(next);
  };

  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return reportRows;
    const q = searchQuery.toLowerCase();
    return reportRows.filter(
      (r) =>
        (r.evaluatorId || "").toLowerCase().includes(q) ||
        (r.evaluatorName || "").toLowerCase().includes(q) ||
        (r.institution || "").toLowerCase().includes(q) ||
        (r.subjectCode || "").toLowerCase().includes(q) ||
        (r.subjectName || "").toLowerCase().includes(q)
    );
  }, [reportRows, searchQuery]);

  const handleCopy = () => {
    const headers = [
      "S.No", "Valuator Userid", "Valuator Name", "Institution",
      "Subject Code", "Subject Name", "Total Scripts",
      "No.Scripts Evaluated", "Pending Scripts"
    ];
    const data = filteredRows.map((r) => [
      r.sno, r.evaluatorId, r.evaluatorName, r.institution,
      r.subjectCode, r.subjectName, r.totalScripts,
      r.noScriptsEvaluated, r.pendingScripts
    ].join("\t"));
    navigator.clipboard.writeText([headers.join("\t"), ...data].join("\n"));
    setSuccessMsg("Table copied to clipboard!");
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  const handleExportCSV = () => {
    const headers = [
      "S.No", "Valuator Userid", "Valuator Name", "Institution",
      "Subject Code", "Subject Name", "Total Scripts",
      "No.Scripts Evaluated", "Pending Scripts"
    ];
    const rows = filteredRows.map((r) => [
      r.sno, r.evaluatorId, `"${(r.evaluatorName || "").replace(/"/g, '""')}"`,
      `"${(r.institution || "").replace(/"/g, '""')}"`, r.subjectCode,
      `"${(r.subjectName || "").replace(/"/g, '""')}"`, r.totalScripts,
      r.noScriptsEvaluated, r.pendingScripts
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Evaluator_Workload_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadAwardList = (row, valuationtype) => {
    const params = new URLSearchParams({
      colid: global1.colid,
      examcode: row.examCode || "",
      coursecode: row.subjectCode || "",
      academicyear: row.academicyear || "",
      valuationtype
    });
    const url = `/api/v2/conductexam2/award-list/download?${params.toString()}`;
    window.open(url, "_blank");
  };

  return (
    <MenuPageShell title="Evaluator Quota Report">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .quota-print-container { width: 100% !important; margin: 0 !important; padding: 0 !important; }
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
                    <Group fontSize="medium" />
                  </Box>
                  <Box>
                    <Typography variant="h5" sx={{ fontWeight: 800, color: "#111827" }}>
                      Evaluator Quota
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Real-time evaluation quotas, completed scripts, and pending workloads by valuator
                    </Typography>
                  </Box>
                </Box>

                <Button
                  variant="outlined"
                  startIcon={<Refresh />}
                  onClick={() => fetchReport()}
                  disabled={loading}
                  size="small"
                >
                  Refresh
                </Button>
              </Box>

              <Divider sx={{ my: 2 }} />
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={4}>
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

                <Grid item xs={12} sm={4}>
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

                <Grid item xs={12} sm={4}>
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
              </Grid>
            </CardContent>
          </Card>

          {/* Alerts */}
          {error && <Alert severity="error" className="no-print" onClose={() => setError("")}>{error}</Alert>}
          {successMsg && <Alert severity="success" className="no-print" onClose={() => setSuccessMsg("")}>{successMsg}</Alert>}

          {/* Table Container Card (Matching Reference Layout) */}
          <Paper elevation={2} className="quota-print-container" sx={{ borderRadius: 1.5, overflow: "hidden" }}>
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

            <TableContainer sx={{ maxHeight: "75vh" }}>
              <Table stickyHeader size="small" sx={{ minWidth: 1350 }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800, bgcolor: "#f3f4f6", width: 60, textAlign: "center" }}>S.No</TableCell>
                    <TableCell sx={{ fontWeight: 800, bgcolor: "#f3f4f6", minWidth: 120 }}>Valuator Userid</TableCell>
                    <TableCell sx={{ fontWeight: 800, bgcolor: "#f3f4f6", minWidth: 160 }}>Valuator Name</TableCell>
                    <TableCell sx={{ fontWeight: 800, bgcolor: "#f3f4f6", minWidth: 180 }}>Institution</TableCell>
                    <TableCell sx={{ fontWeight: 800, bgcolor: "#f3f4f6", minWidth: 120 }}>Subject Code</TableCell>
                    <TableCell sx={{ fontWeight: 800, bgcolor: "#f3f4f6", minWidth: 160 }}>Subject Name</TableCell>
                    <TableCell sx={{ fontWeight: 800, bgcolor: "#f3f4f6", textAlign: "center" }}>Total Scripts</TableCell>
                    <TableCell sx={{ fontWeight: 800, bgcolor: "#f0fdf4", color: "#166534", textAlign: "center" }}>No.Scripts Evaluated</TableCell>
                    <TableCell sx={{ fontWeight: 800, bgcolor: "#fef3c7", color: "#92400e", textAlign: "center" }}>Pending Scripts</TableCell>
                    <TableCell sx={{ fontWeight: 800, bgcolor: "#eff6ff", color: "#1e40af", textAlign: "center", minWidth: 110 }}>V1 Award List</TableCell>
                    <TableCell sx={{ fontWeight: 800, bgcolor: "#f0fdf4", color: "#166534", textAlign: "center", minWidth: 110 }}>V2 Award List</TableCell>
                    <TableCell sx={{ fontWeight: 800, bgcolor: "#fdf4ff", color: "#7e22ce", textAlign: "center", minWidth: 110 }}>V3 Award List</TableCell>
                    <TableCell sx={{ fontWeight: 800, bgcolor: "#fff1f2", color: "#be123c", textAlign: "center", minWidth: 110 }}>V4 Award List</TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={13} sx={{ textAlign: "center", py: 5 }}>
                        <CircularProgress size={36} />
                        <Typography variant="body2" sx={{ mt: 1.5 }} color="text.secondary">
                          Loading Evaluator Quota Report...
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : filteredRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={13} sx={{ textAlign: "center", py: 5, color: "#6b7280" }}>
                        No evaluator quota allocations found matching the selected filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRows.map((row) => (
                      <TableRow key={row.sno} hover sx={{ "&:nth-of-type(even)": { bgcolor: "#fafafa" } }}>
                        <TableCell sx={{ textAlign: "center", fontWeight: 600 }}>{row.sno}</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: "#1f2937" }}>{row.evaluatorId}</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: "#111827" }}>{row.evaluatorName}</TableCell>
                        <TableCell>{row.institution}</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>{row.subjectCode}</TableCell>
                        <TableCell>{row.subjectName}</TableCell>
                        <TableCell sx={{ textAlign: "center", fontWeight: 700 }}>{row.totalScripts}</TableCell>
                        <TableCell sx={{ textAlign: "center", bgcolor: "#f0fdf4", fontWeight: 700, color: "#15803d" }}>
                          {row.noScriptsEvaluated}
                        </TableCell>
                        <TableCell sx={{ textAlign: "center", bgcolor: "#fef3c7", fontWeight: 700, color: "#b45309" }}>
                          {row.pendingScripts}
                        </TableCell>
                        {/* V1 Award List Download */}
                        <TableCell sx={{ textAlign: "center", bgcolor: "#eff6ff" }}>
                          <Button
                            size="small"
                            variant="contained"
                            color="primary"
                            startIcon={<DownloadIcon sx={{ fontSize: 14 }} />}
                            onClick={() => handleDownloadAwardList(row, "V1")}
                            disabled={row.noScriptsEvaluated === 0}
                            sx={{ minWidth: 90, fontSize: "11px", fontWeight: 700, textTransform: "none", py: 0.3 }}
                          >
                            V1 CSV
                          </Button>
                        </TableCell>
                        {/* V2 Award List Download */}
                        <TableCell sx={{ textAlign: "center", bgcolor: "#f0fdf4" }}>
                          <Button
                            size="small"
                            variant="outlined"
                            color="success"
                            startIcon={<DownloadIcon sx={{ fontSize: 14 }} />}
                            onClick={() => handleDownloadAwardList(row, "V2")}
                            sx={{ minWidth: 90, fontSize: "11px", fontWeight: 700, textTransform: "none", py: 0.3 }}
                          >
                            V2 CSV
                          </Button>
                        </TableCell>
                        {/* V3 Award List Download */}
                        <TableCell sx={{ textAlign: "center", bgcolor: "#fdf4ff" }}>
                          <Button
                            size="small"
                            variant="outlined"
                            color="secondary"
                            startIcon={<DownloadIcon sx={{ fontSize: 14 }} />}
                            onClick={() => handleDownloadAwardList(row, "V3")}
                            sx={{ minWidth: 90, fontSize: "11px", fontWeight: 700, textTransform: "none", py: 0.3 }}
                          >
                            V3 CSV
                          </Button>
                        </TableCell>
                        {/* V4 Award List Download */}
                        <TableCell sx={{ textAlign: "center", bgcolor: "#fff1f2" }}>
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            startIcon={<DownloadIcon sx={{ fontSize: 14 }} />}
                            onClick={() => handleDownloadAwardList(row, "V4")}
                            sx={{ minWidth: 90, fontSize: "11px", fontWeight: 700, textTransform: "none", py: 0.3 }}
                          >
                            V4 CSV
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
