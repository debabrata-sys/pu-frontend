import React, { useEffect, useMemo, useState, useRef } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  LinearProgress,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography
} from "@mui/material";
import { DataGrid, GridToolbar } from "@mui/x-data-grid";
import {
  CloudUpload,
  PictureAsPdf,
  Visibility,
  Delete,
  Refresh,
  CheckCircle,
  HourglassEmpty,
  School,
  Close,
  OpenInNew,
  Download,
  FilterAlt,
  InfoOutlined
} from "@mui/icons-material";
import ep1 from "../api/ep1";
import global1 from "./global1";
import MenuPageShell from "./MenuPageShell";

const formatBytes = (bytes) => {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
};

const formatDate = (dateStr) => {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return Number.isNaN(d.getTime()) ? dateStr : d.toLocaleDateString("en-IN") + " " + d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
};

export default function ConductExam2AnswerBookUploadPage() {
  const [options, setOptions] = useState({
    academicyears: [],
    exams: [],
    regulations: [],
    programs: [],
    courses: [],
    examdates: [],
    slots: []
  });

  const [filters, setFilters] = useState({
    academicyear: "",
    examcode: "",
    regulation: "",
    programcode: "",
    coursecode: ""
  });

  const [students, setStudents] = useState([]);
  const [stats, setStats] = useState({ totalAttended: 0, totalUploaded: 0, totalPending: 0 });
  const [loading, setLoading] = useState(false);
  const [uploadingSingle, setUploadingSingle] = useState(false);
  const [singleStudentTarget, setSingleStudentTarget] = useState(null);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Bulk Upload Dialog State
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkFiles, setBulkFiles] = useState([]);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkResult, setBulkResult] = useState(null);

  // Document Viewer Dialog State
  const [viewOpen, setViewOpen] = useState(false);
  const [viewingStudent, setViewingStudent] = useState(null);

  const singleFileInputRef = useRef(null);
  const bulkFileInputRef = useRef(null);

  useEffect(() => {
    loadOptions();
  }, []);

  const loadOptions = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await ep1.get("/api/v2/conductexam2/answerbook-options", {
        params: { colid: global1.colid }
      });
      if (res.data?.success) {
        setOptions(res.data);
        if (res.data.academicyears?.length) {
          const defaultYear = res.data.academicyears[0];
          const defaultExam = res.data.exams?.[0]?.examcode || "";
          setFilters((prev) => ({
            ...prev,
            academicyear: defaultYear,
            examcode: defaultExam
          }));
          // Auto load students with defaults
          loadStudents({ academicyear: defaultYear, examcode: defaultExam });
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load filter options.");
    } finally {
      setLoading(false);
    }
  };

  const loadStudents = async (activeFilters = filters) => {
    try {
      setLoading(true);
      setError("");
      setMessage("");
      const res = await ep1.get("/api/v2/conductexam2/answerbook-students", {
        params: {
          colid: global1.colid,
          academicyear: activeFilters.academicyear,
          examcode: activeFilters.examcode,
          regulation: activeFilters.regulation,
          programcode: activeFilters.programcode,
          coursecode: activeFilters.coursecode
        }
      });
      if (res.data?.success) {
        setStudents(res.data.data || []);
        setStats(res.data.stats || { totalAttended: 0, totalUploaded: 0, totalPending: 0 });
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load attended students.");
    } finally {
      setLoading(false);
    }
  };

  // Trigger single file selection
  const handleSingleUploadClick = (studentRow) => {
    setSingleStudentTarget(studentRow);
    if (singleFileInputRef.current) {
      singleFileInputRef.current.value = "";
      singleFileInputRef.current.click();
    }
  };

  // Process single file upload
  const handleSingleFileSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !singleStudentTarget) return;

    try {
      setUploadingSingle(true);
      setError("");
      setMessage("");

      const formData = new FormData();
      formData.append("colid", global1.colid);
      formData.append("academicyear", singleStudentTarget.academicyear);
      formData.append("regulation", singleStudentTarget.regulation || "");
      formData.append("exam", singleStudentTarget.exam);
      formData.append("examcode", singleStudentTarget.examcode);
      formData.append("program", singleStudentTarget.program || "");
      formData.append("programcode", singleStudentTarget.programcode);
      formData.append("course", singleStudentTarget.course);
      formData.append("coursecode", singleStudentTarget.coursecode);
      formData.append("student", singleStudentTarget.student);
      formData.append("regno", singleStudentTarget.regno);
      formData.append("seatno", singleStudentTarget.seatno || "");
      formData.append("examdate", singleStudentTarget.examdate || "");
      formData.append("examslot", singleStudentTarget.examslot || "");
      formData.append("user", global1.user || global1.email || "evaluator");
      formData.append("file", file);

      const res = await ep1.post("/api/v2/conductexam2/upload-answerbook", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      if (res.data?.success) {
        setMessage(`Answer book uploaded successfully for ${singleStudentTarget.student} (${singleStudentTarget.regno})!`);
        await loadStudents();
      } else {
        setError(res.data?.message || "Failed to upload answer book.");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Error uploading file.");
    } finally {
      setUploadingSingle(false);
      setSingleStudentTarget(null);
    }
  };

  // Process Bulk Upload
  const handleBulkUploadSubmit = async () => {
    if (!bulkFiles.length) {
      setError("Please select at least one file to upload.");
      return;
    }
    if (!filters.examcode || !filters.coursecode) {
      setError("Please select both Exam and Course from the filter bar to perform bulk upload.");
      return;
    }

    try {
      setBulkUploading(true);
      setError("");
      setMessage("");

      const formData = new FormData();
      formData.append("colid", global1.colid);
      formData.append("examcode", filters.examcode);
      formData.append("coursecode", filters.coursecode);
      formData.append("academicyear", filters.academicyear);
      formData.append("user", global1.user || global1.email || "evaluator");

      for (let i = 0; i < bulkFiles.length; i++) {
        formData.append("files", bulkFiles[i]);
      }

      const res = await ep1.post("/api/v2/conductexam2/bulk-upload-answerbooks", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      if (res.data?.success) {
        setBulkResult(res.data);
        setMessage(res.data.message || "Bulk upload completed successfully.");
        await loadStudents();
      } else {
        setError(res.data?.message || "Bulk upload failed.");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Error during bulk upload.");
    } finally {
      setBulkUploading(false);
    }
  };

  // Delete answer book
  const handleDeleteAnswerBook = async (studentRow) => {
    if (!window.confirm(`Are you sure you want to delete the uploaded answer book for ${studentRow.student} (${studentRow.regno})?`)) {
      return;
    }

    try {
      setLoading(true);
      setError("");
      const res = await ep1.post("/api/v2/conductexam2/delete-answerbook", {
        colid: global1.colid,
        examcode: studentRow.examcode,
        coursecode: studentRow.coursecode,
        regno: studentRow.regno
      });
      if (res.data?.success) {
        setMessage(`Answer book deleted for ${studentRow.student}.`);
        await loadStudents();
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete answer book.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenViewer = (studentRow) => {
    setViewingStudent(studentRow);
    setViewOpen(true);
  };

  // Reset Filters
  const handleResetFilters = () => {
    const defaultYear = options.academicyears?.[0] || "";
    const nextFilters = {
      academicyear: defaultYear,
      examcode: "",
      regulation: "",
      programcode: "",
      coursecode: ""
    };
    setFilters(nextFilters);
    loadStudents(nextFilters);
  };

  const columns = [
    {
      field: "student",
      headerName: "Student Name",
      minWidth: 190,
      flex: 1,
      renderCell: (params) => (
        <Box>
          <Typography variant="body2" fontWeight={700}>
            {params.value}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Seat: {params.row.seatno || "-"} | Room: {params.row.examroom || "-"}
          </Typography>
        </Box>
      )
    },
    {
      field: "regno",
      headerName: "Reg No / Roll No",
      width: 140,
      renderCell: (params) => (
        <Chip label={params.value} size="small" variant="outlined" sx={{ fontWeight: 600 }} />
      )
    },
    {
      field: "course",
      headerName: "Course",
      minWidth: 200,
      flex: 1,
      renderCell: (params) => (
        <Box>
          <Typography variant="body2" noWrap>
            {params.value}
          </Typography>
          <Typography variant="caption" color="primary" fontWeight={600}>
            {params.row.coursecode}
          </Typography>
        </Box>
      )
    },
    {
      field: "attended",
      headerName: "Attendance",
      width: 130,
      renderCell: (params) => (
        <Chip
          icon={<CheckCircle sx={{ fontSize: "16px !important" }} />}
          label="Attended"
          color="success"
          size="small"
          sx={{ fontWeight: 600 }}
        />
      )
    },
    {
      field: "uploadstatus",
      headerName: "Answer Book",
      width: 140,
      renderCell: (params) => {
        const isUploaded = params.value === "Uploaded" || params.value === "Verified";
        return (
          <Chip
            icon={isUploaded ? <CheckCircle sx={{ fontSize: "16px !important" }} /> : <HourglassEmpty sx={{ fontSize: "16px !important" }} />}
            label={isUploaded ? "Uploaded" : "Pending"}
            color={isUploaded ? "primary" : "warning"}
            variant={isUploaded ? "filled" : "outlined"}
            size="small"
            sx={{ fontWeight: 600 }}
          />
        );
      }
    },
    {
      field: "answerbookfilename",
      headerName: "Script File Details",
      minWidth: 180,
      renderCell: (params) => {
        if (!params.row.answerbookurl) {
          return <Typography variant="caption" color="text.secondary">No script uploaded</Typography>;
        }
        return (
          <Box>
            <Stack direction="row" spacing={0.5} alignItems="center">
              <PictureAsPdf color="error" sx={{ fontSize: 16 }} />
              <Typography variant="body2" noWrap sx={{ maxWidth: 140, fontWeight: 500 }}>
                {params.value || "Answer_Script.pdf"}
              </Typography>
            </Stack>
            <Typography variant="caption" color="text.secondary">
              {formatBytes(params.row.filesize)} • {formatDate(params.row.uploaddate)}
            </Typography>
          </Box>
        );
      }
    },
    {
      field: "preview",
      headerName: "View Script",
      width: 120,
      sortable: false,
      renderCell: (params) => {
        const hasUrl = Boolean(params.row.answerbookurl);
        return (
          <Button
            size="small"
            variant={hasUrl ? "contained" : "outlined"}
            color="info"
            disabled={!hasUrl}
            startIcon={<Visibility />}
            onClick={() => handleOpenViewer(params.row)}
            sx={{ textTransform: "none", fontSize: 12 }}
          >
            View
          </Button>
        );
      }
    },
    {
      field: "actions",
      headerName: "Actions",
      width: 170,
      sortable: false,
      renderCell: (params) => {
        const hasUrl = Boolean(params.row.answerbookurl);
        return (
          <Stack direction="row" spacing={1} alignItems="center">
            <Button
              size="small"
              variant="outlined"
              color={hasUrl ? "secondary" : "primary"}
              startIcon={<CloudUpload />}
              onClick={() => handleSingleUploadClick(params.row)}
              sx={{ textTransform: "none", fontSize: 12 }}
            >
              {hasUrl ? "Replace" : "Upload"}
            </Button>
            {hasUrl && (
              <Tooltip title="Delete Answer Book">
                <IconButton size="small" color="error" onClick={() => handleDeleteAnswerBook(params.row)}>
                  <Delete fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Stack>
        );
      }
    }
  ];

  return (
    <MenuPageShell title="Upload Student Answer Book - Evaluator Management 2">
      <Box sx={{ p: 3 }}>
        <Stack spacing={3}>
          {/* Header Card */}
          <Paper elevation={0} sx={{ p: 2.5, border: "1px solid #e5e7eb", borderRadius: 2, bgcolor: "#fff" }}>
            <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2} alignItems={{ xs: "flex-start", md: "center" }}>
              <Box>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Box sx={{ bgcolor: "primary.main", color: "#fff", p: 1, borderRadius: 1.5, display: "flex" }}>
                    <PictureAsPdf fontSize="medium" />
                  </Box>
                  <Box>
                    <Typography variant="h5" fontWeight={900}>
                      Student Answer Book Upload
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Evaluator Management 2 • Attended students populated automatically from Invigilator Management (Mark Student Attendance)
                    </Typography>
                  </Box>
                </Stack>
              </Box>
              <Stack direction="row" spacing={1.5}>
                <Button
                  variant="contained"
                  color="secondary"
                  startIcon={<CloudUpload />}
                  onClick={() => {
                    setBulkFiles([]);
                    setBulkResult(null);
                    setBulkOpen(true);
                  }}
                  sx={{ fontWeight: 700 }}
                >
                  Bulk Upload Scripts
                </Button>
                <Button variant="outlined" startIcon={<Refresh />} onClick={() => loadStudents()} disabled={loading}>
                  Refresh
                </Button>
              </Stack>
            </Stack>
          </Paper>

          {/* Feedback Messages */}
          {loading && <LinearProgress />}
          {uploadingSingle && <LinearProgress color="secondary" />}
          {message && <Alert severity="success" onClose={() => setMessage("")}>{message}</Alert>}
          {error && <Alert severity="error" onClose={() => setError("")}>{error}</Alert>}

          {/* Summary Metrics Bar */}
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <Card elevation={0} sx={{ border: "1px solid #e5e7eb", borderRadius: 2 }}>
                <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase">
                    Attended Students
                  </Typography>
                  <Typography variant="h4" fontWeight={900} color="primary.main">
                    {stats.totalAttended}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Marked present by invigilator
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card elevation={0} sx={{ border: "1px solid #e5e7eb", borderRadius: 2 }}>
                <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase">
                    Scripts Uploaded
                  </Typography>
                  <Typography variant="h4" fontWeight={900} color="success.main">
                    {stats.totalUploaded}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Ready for On-Screen Marking
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card elevation={0} sx={{ border: "1px solid #e5e7eb", borderRadius: 2 }}>
                <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase">
                    Pending Uploads
                  </Typography>
                  <Typography variant="h4" fontWeight={900} color="warning.main">
                    {stats.totalPending}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Requires scanned answer book
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card elevation={0} sx={{ border: "1px solid #e5e7eb", borderRadius: 2, bgcolor: "#f8fafc" }}>
                <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <InfoOutlined color="info" fontSize="small" />
                    <Typography variant="caption" color="info.main" fontWeight={700} textTransform="uppercase">
                      Source Workflow
                    </Typography>
                  </Stack>
                  <Typography variant="body2" fontWeight={600} sx={{ mt: 0.5 }}>
                    Invigilator Attendance
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    /conduct-exam-student-attendance
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Filter Bar */}
          <Paper elevation={0} sx={{ p: 2.5, border: "1px solid #e5e7eb", borderRadius: 2 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={6} md={2.4}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Academic Year"
                  value={filters.academicyear}
                  onChange={(e) => setFilters({ ...filters, academicyear: e.target.value })}
                >
                  <MenuItem value="">-- All Academic Years --</MenuItem>
                  {(options.academicyears || []).map((y) => (
                    <MenuItem key={y} value={y}>{y}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6} md={2.4}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Exam"
                  value={filters.examcode}
                  onChange={(e) => setFilters({ ...filters, examcode: e.target.value })}
                >
                  <MenuItem value="">-- All Exams --</MenuItem>
                  {(options.exams || []).map((ex) => (
                    <MenuItem key={ex.examcode} value={ex.examcode}>
                      {ex.exam} ({ex.examcode})
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6} md={2.4}>
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
              <Grid item xs={12} sm={6} md={2.4}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Course"
                  value={filters.coursecode}
                  onChange={(e) => setFilters({ ...filters, coursecode: e.target.value })}
                >
                  <MenuItem value="">-- All Courses --</MenuItem>
                  {(options.courses || []).map((c) => (
                    <MenuItem key={c.coursecode} value={c.coursecode}>
                      {c.course} ({c.coursecode})
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={12} md={2.4}>
                <Stack direction="row" spacing={1}>
                  <Button
                    fullWidth
                    variant="contained"
                    startIcon={<FilterAlt />}
                    onClick={() => loadStudents()}
                    disabled={loading}
                    sx={{ height: 40 }}
                  >
                    Filter
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={handleResetFilters}
                    disabled={loading}
                    sx={{ height: 40, minWidth: 80 }}
                  >
                    Reset
                  </Button>
                </Stack>
              </Grid>
            </Grid>
          </Paper>

          {/* Students DataGrid */}
          <Paper elevation={0} sx={{ p: 2, border: "1px solid #e5e7eb", borderRadius: 2 }}>
            <Box sx={{ height: 560, width: "100%" }}>
              <DataGrid
                rows={students}
                getRowId={(row) => row._id || row.regno}
                columns={columns}
                loading={loading}
                slots={{ toolbar: GridToolbar }}
                slotProps={{
                  toolbar: {
                    showQuickFilter: true,
                    quickFilterProps: { debounceMs: 400 },
                    csvOptions: { fileName: "attended_students_answer_books" }
                  }
                }}
                pageSizeOptions={[10, 25, 50, 100]}
                initialState={{
                  pagination: { paginationModel: { pageSize: 25, page: 0 } }
                }}
                disableRowSelectionOnClick
              />
            </Box>
          </Paper>
        </Stack>
      </Box>

      {/* Hidden File Input for Single Upload */}
      <input
        type="file"
        ref={singleFileInputRef}
        style={{ display: "none" }}
        accept=".pdf,image/png,image/jpeg,image/jpg"
        onChange={handleSingleFileSelected}
      />

      {/* Bulk Upload Dialog */}
      <Dialog open={bulkOpen} onClose={() => !bulkUploading && setBulkOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6" fontWeight={800}>
              Bulk Upload Student Answer Books
            </Typography>
            <IconButton onClick={() => setBulkOpen(false)} disabled={bulkUploading} size="small">
              <Close />
            </IconButton>
          </Stack>
        </DialogTitle>
        <Divider />
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <Alert severity="info">
              <strong>Filename Matching Instructions:</strong>
              <br />
              1. Ensure the selected <strong>Exam</strong> and <strong>Course</strong> match the batch you are uploading.
              <br />
              2. Name each script file with the student's <strong>Registration Number</strong> (e.g. <code>2426001.pdf</code>, <code>2426002_script.pdf</code>).
              <br />
              3. The system will automatically map each file to the corresponding attended student record!
            </Alert>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="Selected Exam Code"
                  value={filters.examcode || "Not selected (select in filter bar)"}
                  disabled
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="Selected Course Code"
                  value={filters.coursecode || "Not selected (select in filter bar)"}
                  disabled
                />
              </Grid>
            </Grid>

            {(!filters.examcode || !filters.coursecode) && (
              <Alert severity="warning">
                Please select both an <strong>Exam</strong> and a <strong>Course</strong> from the main filter bar before uploading files.
              </Alert>
            )}

            {/* Drop Zone Box */}
            <Box
              onClick={() => bulkFileInputRef.current?.click()}
              sx={{
                p: 4,
                border: "2px dashed #3b82f6",
                borderRadius: 2,
                textAlign: "center",
                cursor: "pointer",
                bgcolor: "#eff6ff",
                "&:hover": { bgcolor: "#dbeafe" }
              }}
            >
              <CloudUpload color="primary" sx={{ fontSize: 48, mb: 1 }} />
              <Typography variant="h6" fontWeight={700}>
                Click to select PDF or image files
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Supports multiple .pdf, .jpg, .png files up to 50MB each
              </Typography>
              <input
                type="file"
                ref={bulkFileInputRef}
                style={{ display: "none" }}
                multiple
                accept=".pdf,image/png,image/jpeg,image/jpg"
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  setBulkFiles(files);
                  setBulkResult(null);
                }}
              />
            </Box>

            {/* Selected files count */}
            {bulkFiles.length > 0 && (
              <Box>
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
                  Selected Files ({bulkFiles.length}):
                </Typography>
                <Paper variant="outlined" sx={{ maxHeight: 180, overflowY: "auto", p: 1 }}>
                  {bulkFiles.map((file, idx) => (
                    <Stack key={idx} direction="row" justifyContent="space-between" sx={{ py: 0.5, borderBottom: "1px solid #f1f5f9" }}>
                      <Typography variant="body2" noWrap sx={{ maxWidth: "70%" }}>
                        {file.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatBytes(file.size)}
                      </Typography>
                    </Stack>
                  ))}
                </Paper>
              </Box>
            )}

            {bulkUploading && (
              <Box>
                <LinearProgress />
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block", textAlign: "center" }}>
                  Uploading and processing {bulkFiles.length} files...
                </Typography>
              </Box>
            )}

            {/* Bulk Result Summary */}
            {bulkResult && (
              <Box sx={{ mt: 2 }}>
                <Alert severity="success" sx={{ mb: 2 }}>
                  Successfully matched and attached <strong>{bulkResult.matchedCount}</strong> out of {bulkResult.totalFiles} files!
                </Alert>

                {bulkResult.unmatchedFiles?.length > 0 && (
                  <Alert severity="warning">
                    <strong>{bulkResult.unmatchedFiles.length} Unmatched Files:</strong>
                    <ul style={{ margin: "4px 0", paddingLeft: 20 }}>
                      {bulkResult.unmatchedFiles.map((u, i) => (
                        <li key={i}>
                          <code>{u.filename}</code>: {u.reason}
                        </li>
                      ))}
                    </ul>
                  </Alert>
                )}
              </Box>
            )}
          </Stack>
        </DialogContent>
        <Divider />
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setBulkOpen(false)} disabled={bulkUploading}>
            {bulkResult ? "Done" : "Cancel"}
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<CloudUpload />}
            onClick={handleBulkUploadSubmit}
            disabled={bulkUploading || !bulkFiles.length || !filters.examcode || !filters.coursecode}
          >
            {bulkUploading ? "Uploading..." : `Upload ${bulkFiles.length} File${bulkFiles.length === 1 ? "" : "s"}`}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Answer Book Document Viewer Dialog */}
      <Dialog open={viewOpen} onClose={() => setViewOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, bgcolor: "#f8fafc", py: 1.5 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="h6" fontWeight={800}>
                Answer Book: {viewingStudent?.student} ({viewingStudent?.regno})
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Course: {viewingStudent?.course} ({viewingStudent?.coursecode}) • Seat: {viewingStudent?.seatno || "-"}
              </Typography>
            </Box>
            <Stack direction="row" spacing={1} alignItems="center">
              {viewingStudent?.answerbookurl && (
                <>
                  <Tooltip title="Open in New Tab">
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={() => window.open(viewingStudent.answerbookurl, "_blank")}
                    >
                      <OpenInNew />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Download Script">
                    <IconButton
                      size="small"
                      color="primary"
                      component="a"
                      href={viewingStudent.answerbookurl}
                      download={viewingStudent.answerbookfilename || `${viewingStudent.regno}_answer_book.pdf`}
                    >
                      <Download />
                    </IconButton>
                  </Tooltip>
                </>
              )}
              <IconButton size="small" onClick={() => setViewOpen(false)}>
                <Close />
              </IconButton>
            </Stack>
          </Stack>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ p: 0, height: "80vh", bgcolor: "#334155" }}>
          {viewingStudent?.answerbookurl ? (
            <iframe
              src={viewingStudent.answerbookurl}
              title={`Answer Book - ${viewingStudent.student}`}
              width="100%"
              height="100%"
              style={{ border: "none" }}
            />
          ) : (
            <Box sx={{ p: 4, textAlign: "center", color: "#fff" }}>
              <Typography>No document URL available for this student.</Typography>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </MenuPageShell>
  );
}
