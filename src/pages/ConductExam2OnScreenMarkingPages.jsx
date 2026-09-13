import React, { useEffect, useMemo, useState, useRef } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  Divider,
  Grid,
  IconButton,
  LinearProgress,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
  Slider,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Select,
  FormControl
} from "@mui/material";
import { DataGrid, GridActionsCellItem, GridToolbar } from "@mui/x-data-grid";
import {
  ArrowBack,
  ArrowForward,
  Close,
  Delete,
  Edit,
  OpenInNew,
  PictureAsPdf,
  ReceiptLong,
  Save,
  Visibility,
  Check,
  CheckCircle,
  ZoomIn,
  ZoomOut,
  Brightness6,
  Contrast,
  RestartAlt,
  MenuBook,
  Cancel,
  Send,
  Timer,
  FiberNew,
  Refresh,
  NavigateNext,
  NavigateBefore,
  Comment,
  NoteAlt,
  AssignmentTurnedIn
} from "@mui/icons-material";
import ep1 from "../api/ep1";
import global1 from "./global1";
import MenuPageShell from "./MenuPageShell";
import ExamAcceptanceDialog from "../components/conductExam/ExamAcceptanceDialog";
import ExamDeclarationDialog from "../components/conductExam/ExamDeclarationDialog";
import ExamRemunerationBillDialog from "../components/conductExam/ExamRemunerationBillDialog";

const labelPaper = (row) => `${row.academicyear} | ${row.exam} (${row.examcode}) | ${row.program} (${row.programcode}) | ${row.course} (${row.coursecode})`;
const uniq = (values = []) => [...new Set(values.map((item) => String(item || "").trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

export function ConductExam2ScoreRulePage() {
  const [options, setOptions] = useState({ papers: [] });
  const [rules, setRules] = useState([]);
  const [form, setForm] = useState({ paperid: "", sectionid: "", questionsconsider: "1", status: "Active" });
  const [editingId, setEditingId] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadOptions();
    loadRules();
  }, []);

  const selectedPaper = useMemo(() => (options.papers || []).find((row) => row._id === form.paperid), [options, form.paperid]);
  const selectedSection = useMemo(() => selectedPaper?.sections?.find((row) => row._id === form.sectionid), [selectedPaper, form.sectionid]);

  const loadOptions = async () => {
    const res = await ep1.get("/api/v2/conductexam2/score-rule-options", { params: { colid: global1.colid } });
    setOptions(res.data || { papers: [] });
  };

  const loadRules = async () => {
    try {
      setLoading(true);
      const res = await ep1.get("/api/v2/conductexam2/score-rules", { params: { colid: global1.colid } });
      setRules(res.data?.data || []);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load score rules.");
    } finally {
      setLoading(false);
    }
  };

  const saveRule = async () => {
    if (!selectedPaper || !selectedSection) {
      setError("Select accepted paper and section.");
      return;
    }
    try {
      setLoading(true);
      setError("");
      const payload = {
        ...selectedPaper,
        id: editingId,
        paperid: selectedPaper._id,
        sectionid: selectedSection._id,
        section: selectedSection.title || "Section",
        questionsconsider: form.questionsconsider,
        status: form.status,
        colid: global1.colid,
        user: global1.user
      };
      await ep1.post("/api/v2/conductexam2/score-rules", payload);
      setMessage(editingId ? "Score rule updated." : "Score rule saved.");
      setEditingId("");
      setForm({ paperid: "", sectionid: "", questionsconsider: "1", status: "Active" });
      await loadRules();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to save score rule.");
    } finally {
      setLoading(false);
    }
  };

  const deleteRule = async (row) => {
    if (!window.confirm("Delete this score rule?")) return;
    await ep1.post("/api/v2/conductexam2/score-rules-delete", { id: row._id, colid: global1.colid });
    setMessage("Score rule deleted.");
    await loadRules();
  };

  const columns = [
    { field: "academicyear", headerName: "Academic Year", width: 130 },
    { field: "exam", headerName: "Exam", width: 170 },
    { field: "examcode", headerName: "Exam Code", width: 130 },
    { field: "program", headerName: "Program", width: 180 },
    { field: "course", headerName: "Course", minWidth: 220, flex: 1 },
    { field: "section", headerName: "Section", width: 180 },
    { field: "questionsconsider", headerName: "Questions To Consider", width: 190, type: "number" },
    { field: "status", headerName: "Status", width: 110 },
    {
      field: "actions",
      type: "actions",
      headerName: "Actions",
      width: 110,
      getActions: (params) => [
        <GridActionsCellItem icon={<Edit />} label="Edit" onClick={() => { setEditingId(params.row._id); setForm({ paperid: params.row.paperid, sectionid: params.row.sectionid, questionsconsider: params.row.questionsconsider, status: params.row.status || "Active" }); window.scrollTo({ top: 0, behavior: "smooth" }); }} />,
        <GridActionsCellItem icon={<Delete />} label="Delete" onClick={() => deleteRule(params.row)} />
      ]
    }
  ];

  return (
    <MenuPageShell title="Exam Score Rule 2">
      <Box sx={{ p: 3 }}>
        <Stack spacing={2}>
          <Paper elevation={0} sx={{ p: 2.5, border: "1px solid #e5e7eb", borderRadius: 2 }}>
            <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2}>
              <Box><Typography variant="h5" fontWeight={900}>Exam Score Rule</Typography><Typography color="text.secondary">Define how many questions should be considered section-wise for accepted question papers.</Typography></Box>
              <Button variant="outlined" startIcon={<ArrowBack />} onClick={() => window.location.assign("/dashdashfacnew")}>Back</Button>
            </Stack>
          </Paper>
          {loading && <LinearProgress />}
          {message && <Alert severity="success" onClose={() => setMessage("")}>{message}</Alert>}
          {error && <Alert severity="error" onClose={() => setError("")}>{error}</Alert>}
          <Paper elevation={0} sx={{ p: 2.5, border: "1px solid #e5e7eb", borderRadius: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}><TextField select fullWidth label="Accepted Paper" value={form.paperid} onChange={(e) => setForm({ ...form, paperid: e.target.value, sectionid: "" })}>{(options.papers || []).map((paper) => <MenuItem key={paper._id} value={paper._id}>{labelPaper(paper)}</MenuItem>)}</TextField></Grid>
              <Grid item xs={12} md={3}><TextField select fullWidth label="Section" value={form.sectionid} onChange={(e) => setForm({ ...form, sectionid: e.target.value })}>{(selectedPaper?.sections || []).map((section) => <MenuItem key={section._id} value={section._id}>{section.title || "Section"} ({section.questions?.length || 0} questions)</MenuItem>)}</TextField></Grid>
              <Grid item xs={12} md={2}><TextField type="number" fullWidth label="Questions To Consider" value={form.questionsconsider} onChange={(e) => setForm({ ...form, questionsconsider: e.target.value })} /></Grid>
              <Grid item xs={12} md={1}><TextField select fullWidth label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>{["Active", "Inactive"].map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}</TextField></Grid>
              <Grid item xs={12}><Button variant="contained" startIcon={<Save />} onClick={saveRule} disabled={loading}>{editingId ? "Update Rule" : "Save Rule"}</Button></Grid>
            </Grid>
          </Paper>
          <Paper elevation={0} sx={{ p: 2, border: "1px solid #e5e7eb", borderRadius: 2 }}>
            <Box sx={{ height: 540 }}><DataGrid rows={rules} getRowId={(row) => row._id} columns={columns} loading={loading} slots={{ toolbar: GridToolbar }} slotProps={{ toolbar: { showQuickFilter: true, csvOptions: { fileName: "exam_score_rule" } } }} pageSizeOptions={[10, 25, 50, 100]} /></Box>
          </Paper>
        </Stack>
      </Box>
    </MenuPageShell>
  );
}

export function ConductExam2OnScreenMarkingPage() {
  // View mode: 'list' (Assigned courses grid) vs 'marking' (Dedicated scoring workspace)
  const [viewMode, setViewMode] = useState("list");

  const examineremail =
    global1.user ||
    global1.email ||
    (typeof window !== "undefined"
      ? localStorage.getItem("user") || localStorage.getItem("email") || ""
      : "");

  // Common notifications
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // ===================== VIEW 1: ASSIGNED COURSES =====================
  const [assignedCourses, setAssignedCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);

  const loadAssignedCourses = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await ep1.get("/api/v2/conductexam2/onscreen-assigned-courses", {
        params: { colid: global1.colid, examineremail }
      });
      setAssignedCourses(res.data?.data || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load assigned courses.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssignedCourses();
  }, []);

  // ===================== VIEW 2: MARKING WORKSPACE =====================
  const [paper, setPaper] = useState(null);
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [flatQuestions, setFlatQuestions] = useState([]);
  const [marksMap, setMarksMap] = useState({});
  const [mcqMap, setMcqMap] = useState({});
  const [commentMap, setCommentMap] = useState({});
  const [examinerRecord, setExaminerRecord] = useState(null);
  const [answerBook, setAnswerBook] = useState(null);

  // Timer: tracks evaluation elapsed time for active student
  const [timerSeconds, setTimerSeconds] = useState(0);
  const timerRef = useRef(null);

  // PDF controls
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [zoom, setZoom] = useState(100);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(42);
  const [verifiedPages, setVerifiedPages] = useState(new Set());

  // Dialogs
  const [qpModalOpen, setQpModalOpen] = useState(false);
  const [solutionModalOpen, setSolutionModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [commentDialogQuestion, setCommentDialogQuestion] = useState(null);
  const [tempComment, setTempComment] = useState("");

  // Compliance dialogs
  const [acceptanceOpen, setAcceptanceOpen] = useState(false);
  const [declarationOpen, setDeclarationOpen] = useState(false);
  const [billOpen, setBillOpen] = useState(false);
  const [declaring, setDeclaring] = useState(false);

  // Timer effect
  useEffect(() => {
    if (viewMode === "marking" && selectedStudent) {
      timerRef.current = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [viewMode, selectedStudent]);

  const formatTimer = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Start marking workspace for a specific course
  const handleStartMarking = async (course) => {
    setSelectedCourse(course);
    setViewMode("marking");
    await loadCourseStudentsAndPaper(course);
  };

  // Back to assigned courses grid
  const handleBackToList = () => {
    setViewMode("list");
    setSelectedCourse(null);
    setSelectedStudent(null);
    if (timerRef.current) clearInterval(timerRef.current);
    loadAssignedCourses();
  };

  // Load students & question paper for selected course
  const loadCourseStudentsAndPaper = async (course) => {
    try {
      setLoading(true);
      setError("");
      const res = await ep1.get("/api/v2/conductexam2/onscreen-students", {
        params: {
          colid: global1.colid,
          examineremail,
          paperid: course.paperid,
          examcode: course.examcode,
          coursecode: course.coursecode
        }
      });
      const loadedPaper = res.data?.paper || null;
      const loadedStudents = res.data?.students || [];
      const loadedQuestions = res.data?.flatQuestions || [];

      setPaper(loadedPaper);
      setStudents(loadedStudents);
      setExaminerRecord(res.data?.examiner || null);
      setFlatQuestions(loadedQuestions);

      // Find first pending student or fallback to first student
      const firstPending = loadedStudents.find((s) => (s.evaluationstatus || "").toLowerCase() !== "evaluated") || loadedStudents[0];
      if (firstPending) {
        await selectStudent(firstPending, course.paperid, loadedPaper, loadedQuestions);
      } else {
        setSelectedStudent(null);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load course students.");
    } finally {
      setLoading(false);
    }
  };

  const selectedStudentIndex = useMemo(() => {
    return students.findIndex((s) => s._id === selectedStudent?._id);
  }, [students, selectedStudent]);

  const hasAnyMCQ = useMemo(() => {
    return flatQuestions.some((q) => q.isMCQ);
  }, [flatQuestions]);

  // Select a student to evaluate
  const selectStudent = async (student, activePaperId, currentPaper, questionsList) => {
    setSelectedStudent(student);
    setTimerSeconds(0);
    setCurrentPage(1);
    const pCount = Number(student.pagescount) || 2;
    setTotalPages(pCount > 0 ? pCount : 2);
    setVerifiedPages(new Set(student.verifiedpages || []));
    setMarksMap({});
    setMcqMap({});
    setCommentMap({});
    setAnswerBook(student.answerbookurl ? { answerbookurl: student.answerbookurl, answerbookfilename: student.answerbookfilename } : null);

    try {
      const res = await ep1.get("/api/v2/conductexam2/onscreen-student-marks", {
        params: {
          colid: global1.colid,
          paperid: activePaperId || selectedCourse?.paperid,
          regno: student.regno
        }
      });
      const savedMarks = res.data?.marks || {};
      const nextMarks = {};
      const nextMcq = {};
      const nextComments = {};
      Object.values(savedMarks).forEach((row) => {
        nextMarks[row.questionid] = row.marks;
        if (row.mcq) nextMcq[row.questionid] = row.mcq;
        if (row.comment) nextComments[row.questionid] = row.comment;
      });
      setMarksMap(nextMarks);
      setMcqMap(nextMcq);
      setCommentMap(nextComments);
      if (res.data?.answerbook) {
        setAnswerBook(res.data.answerbook);
        if (Number(res.data.answerbook.pagescount) > 0) {
          setTotalPages(Number(res.data.answerbook.pagescount));
        }
      }
    } catch (e) {
      console.error("Error loading student marks:", e);
    }
  };

  // MCQ selection handler
  const handleMcqChange = (q, choice) => {
    setMcqMap((prev) => ({ ...prev, [q.questionid]: choice }));
    if (choice === "Correct") {
      setMarksMap((prev) => ({ ...prev, [q.questionid]: q.maxmarks }));
    } else if (choice === "Incorrect" || choice === "Not Answered") {
      setMarksMap((prev) => ({ ...prev, [q.questionid]: 0 }));
    }
  };

  // Manual marks input handler
  const handleMarksChange = (q, value) => {
    const val = value === "" ? "" : Number(value);
    if (val !== "" && (isNaN(val) || val < 0 || val > q.maxmarks)) {
      setError(`Marks for Q.${q.questionlabel || ""} must be between 0 and ${q.maxmarks}`);
      return;
    }
    setError("");
    setMarksMap((prev) => ({ ...prev, [q.questionid]: val }));
  };

  // Tick tool: mark current page as verified and advance
  const handleMarkPageVerified = () => {
    setVerifiedPages((prev) => {
      const next = new Set(prev);
      next.add(currentPage);
      return next;
    });
    if (currentPage < totalPages) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  // Save question marks only
  const handleSaveMarksOnly = async () => {
    if (!selectedStudent || !selectedCourse) return;
    try {
      setLoading(true);
      setError("");
      const marksPayload = flatQuestions.map((q) => ({
        ...q,
        marks: marksMap[q.questionid] !== undefined ? Number(marksMap[q.questionid]) : 0,
        mcq: mcqMap[q.questionid] || "",
        comment: commentMap[q.questionid] || ""
      }));
      await ep1.post("/api/v2/conductexam2/onscreen-marks-save", {
        colid: global1.colid,
        paperid: selectedCourse.paperid,
        student: selectedStudent,
        marks: marksPayload,
        user: examineremail
      });
      setMessage("Question marks saved successfully.");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save question marks.");
    } finally {
      setLoading(false);
    }
  };

  // Submit and Finalize: Strictly disabled until all pages are verified
  const handleSubmitEvaluation = async () => {
    if (!selectedStudent || !selectedCourse) return;
    if (verifiedPages.size < totalPages) {
      setError(`Cannot submit! All ${totalPages} pages must be verified (marked green). Currently verified: ${verifiedPages.size}/${totalPages}`);
      return;
    }
    try {
      setLoading(true);
      setError("");

      const marksPayload = flatQuestions.map((q) => ({
        ...q,
        marks: marksMap[q.questionid] !== undefined ? Number(marksMap[q.questionid]) : 0,
        mcq: mcqMap[q.questionid] || "",
        comment: commentMap[q.questionid] || ""
      }));

      await ep1.post("/api/v2/conductexam2/onscreen-marks-save", {
        colid: global1.colid,
        paperid: selectedCourse.paperid,
        student: selectedStudent,
        marks: marksPayload,
        user: examineremail
      });

      const finalizeRes = await ep1.post("/api/v2/conductexam2/onscreen-finalize", {
        colid: global1.colid,
        paperid: selectedCourse.paperid,
        student: selectedStudent,
        ...paper,
        evaluationTimeSeconds: timerSeconds,
        verifiedPages: Array.from(verifiedPages),
        user: examineremail
      });

      const nextStudentId = finalizeRes.data?.nextStudentId;
      const currentIdx = students.findIndex((s) => s._id === selectedStudent._id);
      const scriptLabel = `Answer Script #${currentIdx >= 0 ? currentIdx + 1 : 1}`;

      setMessage(`${scriptLabel} evaluated successfully! Total: ${finalizeRes.data?.total || 0}. Evaluation Time: ${formatTimer(timerSeconds)}.`);

      if (nextStudentId) {
        const refreshedRes = await ep1.get("/api/v2/conductexam2/onscreen-students", {
          params: {
            colid: global1.colid,
            examineremail,
            paperid: selectedCourse.paperid,
            examcode: selectedCourse.examcode,
            coursecode: selectedCourse.coursecode
          }
        });
        const updatedStudents = refreshedRes.data?.students || [];
        setStudents(updatedStudents);
        const nextTarget = updatedStudents.find((s) => s._id === nextStudentId);
        if (nextTarget) {
          const nextIdx = updatedStudents.findIndex((s) => s._id === nextStudentId);
          setMessage(`${scriptLabel} finalized! Automatically loaded Answer Script #${nextIdx + 1}`);
          await selectStudent(nextTarget, selectedCourse.paperid, paper, flatQuestions);
        }
      } else {
        alert("All answer scripts for this course have been evaluated!");
        handleBackToList();
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to finalize evaluation.");
    } finally {
      setLoading(false);
    }
  };

  // Reject answer script
  const handleConfirmReject = async () => {
    if (!rejectionReason.trim()) {
      setError("Please provide a reason for rejecting this answer script.");
      return;
    }
    try {
      setLoading(true);
      setError("");
      const res = await ep1.post("/api/v2/conductexam2/onscreen-reject", {
        colid: global1.colid,
        paperid: selectedCourse.paperid,
        student: selectedStudent,
        rejectionreason: rejectionReason,
        user: examineremail
      });
      const currentIdx = students.findIndex((s) => s._id === selectedStudent?._id);
      const scriptLabel = `Answer Script #${currentIdx >= 0 ? currentIdx + 1 : 1}`;
      setRejectModalOpen(false);
      setRejectionReason("");
      setMessage(`${scriptLabel} rejected: ${rejectionReason}`);

      const nextStudentId = res.data?.nextStudentId;
      if (nextStudentId) {
        const refreshedRes = await ep1.get("/api/v2/conductexam2/onscreen-students", {
          params: {
            colid: global1.colid,
            examineremail,
            paperid: selectedCourse.paperid,
            examcode: selectedCourse.examcode,
            coursecode: selectedCourse.coursecode
          }
        });
        const updatedStudents = refreshedRes.data?.students || [];
        setStudents(updatedStudents);
        const nextTarget = updatedStudents.find((s) => s._id === nextStudentId);
        if (nextTarget) {
          await selectStudent(nextTarget, selectedCourse.paperid, paper, flatQuestions);
        }
      } else {
        handleBackToList();
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to reject answer script.");
    } finally {
      setLoading(false);
    }
  };

  // Computed total marks
  const totalObtainedMarks = useMemo(() => {
    return flatQuestions.reduce((sum, q) => {
      const val = marksMap[q.questionid];
      return sum + (val !== "" && val !== undefined ? Number(val) : 0);
    }, 0);
  }, [flatQuestions, marksMap]);

  const maxTotalMarks = useMemo(() => {
    return flatQuestions.reduce((sum, q) => sum + (Number(q.maxmarks) || 0), 0);
  }, [flatQuestions]);

  const activeScriptUrl = answerBook?.answerbookurl || selectedStudent?.answerbookurl || "";
  const iframeUrl = activeScriptUrl ? `${activeScriptUrl}#page=${currentPage}` : "";

  // Compliance status
  const isAccepted = Boolean(examinerRecord?.acceptancestatus === "Accepted");
  const isDeclared = Boolean(examinerRecord?.declarationstatus === "Accepted" || examinerRecord?.declarationstatus === "Submitted");
  const canMark = isAccepted && isDeclared;

  const handleAccepted = (data) => {
    setMessage("Acceptance form verified and submitted successfully! Please submit the Declaration form to proceed with marking.");
    setAcceptanceOpen(false);
    setExaminerRecord((prev) => ({
      ...prev,
      acceptancestatus: "Accepted",
      acceptancedata: data?.acceptancedata || prev?.acceptancedata,
      bankdetails: data?.bankdetails || prev?.bankdetails
    }));
    setDeclarationOpen(true);
  };

  const handleSubmitDeclaration = async (declarationdata) => {
    try {
      setDeclaring(true);
      setError("");
      const res = await ep1.post("/api/v2/conductexam2/evaluator-declaration", {
        colid: global1.colid,
        examinerid: examinerRecord?._id,
        examineremail: examinerRecord?.examineremail || examineremail,
        declarationdata,
        user: examineremail
      });
      if (res.data?.success) {
        setMessage("Declaration submitted successfully! You may now begin evaluating scripts.");
        setDeclarationOpen(false);
        setExaminerRecord((prev) => ({
          ...prev,
          declarationstatus: "Accepted",
          declarationdata
        }));
      } else {
        setError(res.data?.message || "Failed to submit declaration.");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Error submitting declaration.");
    } finally {
      setDeclaring(false);
    }
  };

  // ===================== DATA GRID COLUMNS FOR VIEW 1 =====================
  const courseGridColumns = [
    {
      field: "srno",
      headerName: "Sr No",
      width: 70,
      headerAlign: "center",
      align: "center",
      renderCell: (params) => {
        const index = assignedCourses.findIndex((row) => row.key === params.row.key);
        return <Typography fontWeight={700} fontSize="0.875rem">{index + 1}</Typography>;
      }
    },
    {
      field: "coursecode",
      headerName: "Course Code",
      width: 140,
      renderCell: (params) => (
        <Stack direction="row" spacing={0.75} alignItems="center">
          <Typography fontWeight={800} color="primary.main" fontSize="0.875rem">
            {params.row.coursecode}
          </Typography>
          {params.row.isNew && (
            <Chip
              icon={<FiberNew sx={{ fontSize: "16px !important" }} />}
              label="NEW"
              size="small"
              color="error"
              sx={{ fontWeight: 900, height: 22, fontSize: "0.7rem", animation: "pulse 2s infinite" }}
            />
          )}
        </Stack>
      )
    },
    {
      field: "course",
      headerName: "Course Name",
      minWidth: 260,
      flex: 1,
      renderCell: (params) => (
        <Box sx={{ py: 1 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography fontWeight={800} fontSize="0.9rem">
              {params.row.course}
            </Typography>
            {params.row.isNew && (
              <Chip
                label="New Remark"
                size="small"
                sx={{
                  bgcolor: "#fef3c7",
                  color: "#b45309",
                  fontWeight: 800,
                  height: 20,
                  fontSize: "0.68rem",
                  border: "1px solid #fde68a"
                }}
              />
            )}
          </Stack>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
            {params.row.exam} ({params.row.examcode}) • Regulation: {params.row.regulation}
          </Typography>
        </Box>
      )
    },
    {
      field: "action",
      headerName: "Action",
      width: 190,
      headerAlign: "center",
      align: "center",
      renderCell: (params) => (
        <Button
          variant="contained"
          size="small"
          endIcon={<ArrowForward />}
          onClick={() => handleStartMarking(params.row)}
          sx={{
            fontWeight: 800,
            textTransform: "none",
            bgcolor: "#0284c7",
            borderRadius: 1.5,
            px: 2,
            py: 0.8,
            boxShadow: "0 2px 6px rgba(2,132,199,0.3)",
            "&:hover": { bgcolor: "#0369a1" }
          }}
        >
          Evaluate Scripts
        </Button>
      )
    },
    {
      field: "daysremaining",
      headerName: "Day Remaining",
      width: 160,
      renderCell: (params) => {
        const { isOverdue, daysRemaining, daysRemainingText, startdate, enddate } = params.row;
        return (
          <Box sx={{ py: 0.5 }}>
            <Chip
              label={daysRemainingText || `${daysRemaining} Days Left`}
              size="small"
              color={isOverdue ? "error" : daysRemaining <= 2 ? "warning" : "success"}
              sx={{ fontWeight: 800, height: 24, fontSize: "0.75rem" }}
            />
            {(startdate || enddate) && (
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.25, fontSize: "0.68rem" }}>
                {startdate || "-"} to {enddate || "-"}
              </Typography>
            )}
          </Box>
        );
      }
    },
    {
      field: "totalScripts",
      headerName: "Total Answer Script",
      width: 160,
      headerAlign: "center",
      align: "center",
      renderCell: (params) => (
        <Typography fontWeight={800} fontSize="0.95rem">
          {params.row.totalScripts}
        </Typography>
      )
    },
    {
      field: "evaluatedScripts",
      headerName: "Evaluated Answer Script",
      width: 180,
      headerAlign: "center",
      align: "center",
      renderCell: (params) => (
        <Chip
          label={params.row.evaluatedScripts}
          size="small"
          color={params.row.evaluatedScripts > 0 ? "success" : "default"}
          sx={{ fontWeight: 800, minWidth: 40 }}
        />
      )
    },
    {
      field: "balance",
      headerName: "Balance",
      width: 120,
      headerAlign: "center",
      align: "center",
      renderCell: (params) => (
        <Chip
          label={params.row.balance}
          size="small"
          color={params.row.balance > 0 ? "error" : "success"}
          variant={params.row.balance > 0 ? "filled" : "outlined"}
          sx={{ fontWeight: 900, minWidth: 40 }}
        />
      )
    }
  ];

  // ===================== RENDER VIEW 1: ASSIGNED COURSES GRID =====================
  if (viewMode === "list") {
    return (
      <MenuPageShell title="On Screen Marking 2">
        <Box sx={{ p: 3 }}>
          <Stack spacing={2.5}>
            {/* Header Box */}
            <Paper elevation={0} sx={{ p: 2.5, border: "1px solid #e2e8f0", borderRadius: 2.5, bgcolor: "#ffffff" }}>
              <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2} alignItems="center">
                <Box>
                  <Typography variant="h5" fontWeight={900} color="#0f172a">
                    Evaluator Management 2 — On-Screen Marking
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Select an assigned course to enter the dedicated on-screen marking workspace.
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1.5}>
                  <Button
                    variant="outlined"
                    startIcon={<Refresh />}
                    onClick={loadAssignedCourses}
                    disabled={loading}
                    sx={{ fontWeight: 700 }}
                  >
                    Refresh
                  </Button>
                  <Button
                    variant="contained"
                    color="secondary"
                    startIcon={<ReceiptLong />}
                    onClick={() => setBillOpen(true)}
                    sx={{ fontWeight: 700 }}
                  >
                    Remuneration Bill
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<ArrowBack />}
                    onClick={() => window.location.assign("/dashdashfacnew")}
                    sx={{ fontWeight: 700 }}
                  >
                    Dashboard
                  </Button>
                </Stack>
              </Stack>
            </Paper>

            {loading && <LinearProgress />}
            {message && <Alert severity="success" onClose={() => setMessage("")}>{message}</Alert>}
            {error && <Alert severity="error" onClose={() => setError("")}>{error}</Alert>}

            {/* Metric Summary Cards */}
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <Paper elevation={0} sx={{ p: 2, border: "1px solid #e2e8f0", borderRadius: 2, bgcolor: "#f8fafc" }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={700}>ASSIGNED COURSES</Typography>
                  <Typography variant="h4" fontWeight={900} color="#0f172a" sx={{ mt: 0.5 }}>{assignedCourses.length}</Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Paper elevation={0} sx={{ p: 2, border: "1px solid #e2e8f0", borderRadius: 2, bgcolor: "#eff6ff" }}>
                  <Typography variant="caption" color="#1d4ed8" fontWeight={700}>TOTAL ANSWER SCRIPTS</Typography>
                  <Typography variant="h4" fontWeight={900} color="#1d4ed8" sx={{ mt: 0.5 }}>
                    {assignedCourses.reduce((sum, c) => sum + (c.totalScripts || 0), 0)}
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Paper elevation={0} sx={{ p: 2, border: "1px solid #e2e8f0", borderRadius: 2, bgcolor: "#f0fdf4" }}>
                  <Typography variant="caption" color="#15803d" fontWeight={700}>EVALUATED SCRIPTS</Typography>
                  <Typography variant="h4" fontWeight={900} color="#15803d" sx={{ mt: 0.5 }}>
                    {assignedCourses.reduce((sum, c) => sum + (c.evaluatedScripts || 0), 0)}
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Paper elevation={0} sx={{ p: 2, border: "1px solid #e2e8f0", borderRadius: 2, bgcolor: "#fef2f2" }}>
                  <Typography variant="caption" color="#b91c1c" fontWeight={700}>PENDING BALANCE</Typography>
                  <Typography variant="h4" fontWeight={900} color="#b91c1c" sx={{ mt: 0.5 }}>
                    {assignedCourses.reduce((sum, c) => sum + (c.balance || 0), 0)}
                  </Typography>
                </Paper>
              </Grid>
            </Grid>

            {/* Courses DataGrid */}
            <Paper elevation={0} sx={{ p: 2, border: "1px solid #e2e8f0", borderRadius: 2.5 }}>
              <Box sx={{ height: 500, width: "100%" }}>
                <DataGrid
                  rows={assignedCourses}
                  getRowId={(row) => row.key}
                  columns={courseGridColumns}
                  loading={loading}
                  slots={{ toolbar: GridToolbar }}
                  slotProps={{
                    toolbar: {
                      showQuickFilter: true,
                      csvOptions: { fileName: "assigned_courses_onscreen" }
                    }
                  }}
                  pageSizeOptions={[10, 25, 50]}
                  initialState={{
                    pagination: { paginationModel: { pageSize: 10 } }
                  }}
                  rowHeight={64}
                />
              </Box>
            </Paper>
          </Stack>
        </Box>

        {/* Remuneration Bill Dialog */}
        <ExamRemunerationBillDialog
          open={billOpen}
          onClose={() => setBillOpen(false)}
          role="evaluator"
          assignmentId={assignedCourses[0]?.allotmentIds?.[0]}
          apiPrefix="/api/v2/conductexam2"
        />
      </MenuPageShell>
    );
  }

  // ===================== RENDER VIEW 2: DEDICATED MARKING WORKSPACE =====================
  return (
    <MenuPageShell
      title={`On-Screen Marking — ${selectedCourse?.course || "Course"}`}
      defaultCollapsed={true}
      hideDrawer={true}
      onBack={handleBackToList}
      backText="← Back to Courses"
    >
      <Box sx={{ display: "flex", flexDirection: "column", height: "calc(100vh - 70px)", overflow: "hidden", bgcolor: "#f1f5f9" }}>
        {/* Workspace Top Navigation Bar */}
        <Paper
          elevation={1}
          sx={{
            px: 2,
            py: 1,
            borderRadius: 0,
            borderBottom: "1px solid #cbd5e1",
            bgcolor: "#ffffff",
            flexShrink: 0
          }}
        >
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems="center" spacing={1.5}>
            {/* Back Button & Course Info */}
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Button
                variant="contained"
                size="small"
                startIcon={<ArrowBack />}
                onClick={handleBackToList}
                sx={{
                  fontWeight: 800,
                  borderRadius: 1.5,
                  bgcolor: "#0284c7",
                  color: "#ffffff",
                  px: 2,
                  py: 0.7,
                  textTransform: "none",
                  boxShadow: "0 2px 5px rgba(2,132,199,0.3)",
                  "&:hover": { bgcolor: "#0369a1" }
                }}
              >
                ← Back to Courses
              </Button>
              <Divider orientation="vertical" flexItem />
              <Box>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="subtitle1" fontWeight={900} color="#0f172a">
                    {selectedCourse?.course} ({selectedCourse?.coursecode})
                  </Typography>
                  {selectedCourse?.isNew && (
                    <Chip label="NEW" size="small" color="error" sx={{ fontWeight: 800, height: 20, fontSize: "0.65rem" }} />
                  )}
                </Stack>
                <Typography variant="caption" color="text.secondary">
                  Exam: {selectedCourse?.exam} ({selectedCourse?.examcode}) • Reg: {selectedCourse?.regulation}
                </Typography>
              </Box>
            </Stack>

            {/* Student Script Selector (Blind Evaluation - Masked) */}
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Typography variant="body2" fontWeight={800} color="#334155">
                Answer Script:
              </Typography>
              <Select
                size="small"
                value={selectedStudent?._id || ""}
                onChange={(e) => {
                  const target = students.find((s) => s._id === e.target.value);
                  if (target) selectStudent(target, selectedCourse.paperid, paper, flatQuestions);
                }}
                sx={{ minWidth: 210, height: 36, fontWeight: 800, bgcolor: "#f8fafc" }}
              >
                {students.map((st, idx) => {
                  const isDone = (st.evaluationstatus || "").toLowerCase() === "evaluated";
                  return (
                    <MenuItem key={st._id} value={st._id} sx={{ fontWeight: 700 }}>
                      <Stack direction="row" justifyContent="space-between" width="100%" spacing={1} alignItems="center">
                        <span>Answer Script #{idx + 1}</span>
                        {isDone ? (
                          <Chip label="Evaluated" size="small" color="success" sx={{ height: 18, fontSize: "0.65rem", fontWeight: 800 }} />
                        ) : (
                          <Chip label="Pending" size="small" color="warning" sx={{ height: 18, fontSize: "0.65rem", fontWeight: 700 }} />
                        )}
                      </Stack>
                    </MenuItem>
                  );
                })}
              </Select>

              {/* Progress Chip */}
              <Chip
                icon={<AssignmentTurnedIn sx={{ fontSize: "16px !important" }} />}
                label={`${students.filter((s) => (s.evaluationstatus || "").toLowerCase() === "evaluated").length} / ${students.length} Evaluated`}
                size="small"
                color="primary"
                sx={{ fontWeight: 800 }}
              />

              {/* Compliance Badges */}
              {!isAccepted && (
                <Button size="small" variant="contained" color="warning" onClick={() => setAcceptanceOpen(true)} sx={{ fontWeight: 700 }}>
                  Accept Appointment
                </Button>
              )}
              {isAccepted && !isDeclared && (
                <Button size="small" variant="contained" color="warning" onClick={() => setDeclarationOpen(true)} sx={{ fontWeight: 700 }}>
                  Submit Declaration
                </Button>
              )}
            </Stack>
          </Stack>
        </Paper>

        {loading && <LinearProgress />}
        {message && <Alert severity="success" onClose={() => setMessage("")} sx={{ py: 0.5, borderRadius: 0 }}>{message}</Alert>}
        {error && <Alert severity="error" onClose={() => setError("")} sx={{ py: 0.5, borderRadius: 0 }}>{error}</Alert>}

        {/* Main 3-Column Split Workspace */}
        <Box sx={{ display: "flex", flex: 1, overflow: "hidden" }}>
          {/* ================= COLUMN 1: QUESTION STRUCTURE & SCORING TABLE ================= */}
          <Box
            sx={{
              width: hasAnyMCQ ? 330 : 270,
              flexShrink: 0,
              display: "flex",
              flexDirection: "column",
              borderRight: "1px solid #cbd5e1",
              bgcolor: "#ffffff"
            }}
          >
            {/* Table Header Banner */}
            <Box sx={{ p: 1.25, borderBottom: "1px solid #e2e8f0", bgcolor: "#f8fafc" }}>
              <Typography variant="subtitle2" fontWeight={900} color="#0f172a">
                Question Structure &amp; Marks
              </Typography>
              <Typography variant="caption" color="text.secondary">
                From Paper Setter • {flatQuestions.length} Questions
              </Typography>
            </Box>

            {/* Questions Table */}
            <TableContainer sx={{ flex: 1, overflowY: "auto" }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow sx={{ "& th": { bgcolor: "#f1f5f9", fontWeight: 900, fontSize: "0.75rem", py: 0.75 } }}>
                    <TableCell sx={{ width: hasAnyMCQ ? "22%" : "28%" }}>Q.No.</TableCell>
                    <TableCell sx={{ width: hasAnyMCQ ? "20%" : "26%" }}>Max.</TableCell>
                    <TableCell sx={{ width: hasAnyMCQ ? "28%" : "46%" }}>Marks</TableCell>
                    {hasAnyMCQ && <TableCell sx={{ width: "30%" }}>MCQ</TableCell>}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {flatQuestions.map((q) => {
                    const currentMarks = marksMap[q.questionid] ?? "";
                    const currentMcq = mcqMap[q.questionid] || "";
                    const hasComment = Boolean(commentMap[q.questionid]);
                    return (
                      <TableRow key={q.questionid} hover sx={{ "& td": { py: 0.4, px: 0.75 } }}>
                        <TableCell sx={{ fontWeight: 800, fontSize: "0.8rem", color: "#1e293b" }}>
                          {q.questionlabel || "Q"}
                        </TableCell>
                        <TableCell sx={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 700 }}>
                          {q.maxmarks}
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={0.5} alignItems="center">
                            <TextField
                              size="small"
                              type="number"
                              value={currentMarks}
                              onChange={(e) => handleMarksChange(q, e.target.value)}
                              inputProps={{
                                min: 0,
                                max: q.maxmarks,
                                step: 0.5,
                                style: { padding: "3px 4px", fontSize: "0.8rem", fontWeight: 800, textAlign: "center" }
                              }}
                              sx={{ width: 48 }}
                            />
                            <Tooltip title={hasComment ? `Remark: ${commentMap[q.questionid]}` : "Add Question Remark"}>
                              <IconButton
                                size="small"
                                onClick={() => {
                                  setCommentDialogQuestion(q);
                                  setTempComment(commentMap[q.questionid] || "");
                                }}
                                sx={{ color: hasComment ? "#2563eb" : "#cbd5e1", p: 0.2 }}
                              >
                                <Comment sx={{ fontSize: 15 }} />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </TableCell>
                        {hasAnyMCQ && (
                          <TableCell>
                            {q.isMCQ ? (
                              <Select
                                size="small"
                                value={currentMcq}
                                onChange={(e) => handleMcqChange(q, e.target.value)}
                                displayEmpty
                                sx={{
                                  fontSize: "0.72rem",
                                  height: 26,
                                  "& .MuiSelect-select": { py: "2px", px: "4px" }
                                }}
                              >
                                <MenuItem value="" sx={{ fontSize: "0.72rem" }}>--Select--</MenuItem>
                                <MenuItem value="Correct" sx={{ fontSize: "0.72rem", color: "#16a34a", fontWeight: 800 }}>Correct</MenuItem>
                                <MenuItem value="Incorrect" sx={{ fontSize: "0.72rem", color: "#dc2626", fontWeight: 800 }}>Incorrect</MenuItem>
                                <MenuItem value="Not Answered" sx={{ fontSize: "0.72rem", color: "#64748b" }}>Not Answered</MenuItem>
                              </Select>
                            ) : (
                              <Typography variant="caption" sx={{ color: "#94a3b8", fontWeight: 700, pl: 1 }}>
                                —
                              </Typography>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                  {flatQuestions.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={hasAnyMCQ ? 4 : 3} align="center" sx={{ py: 3, color: "text.secondary" }}>
                        No questions found for this paper.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Bottom Dark Teal Bar matching screenshot */}
            <Box
              sx={{
                bgcolor: "#0f766e",
                color: "#ffffff",
                p: 1.25,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderTop: "1px solid #115e59",
                flexShrink: 0
              }}
            >
              <Chip
                label="NA"
                size="small"
                sx={{ bgcolor: "#134e4a", color: "#ccfbf1", fontWeight: 900, height: 24, fontSize: "0.75rem" }}
              />
              <Typography variant="body2" sx={{ fontWeight: 900, letterSpacing: 0.5, fontSize: "0.85rem" }}>
                Total: {totalObtainedMarks} / {maxTotalMarks}
              </Typography>
              <Button
                size="small"
                variant="contained"
                onClick={handleSaveMarksOnly}
                sx={{
                  bgcolor: "#14b8a6",
                  color: "#042f2e",
                  fontWeight: 900,
                  fontSize: "0.7rem",
                  py: 0.4,
                  px: 1.25,
                  minWidth: 0,
                  "&:hover": { bgcolor: "#2dd4bf" }
                }}
              >
                Save
              </Button>
            </Box>
          </Box>

          {/* ================= COLUMN 2: PDF VIEWER WITH MARGIN GUIDE ================= */}
          <Box
            sx={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              bgcolor: "#475569",
              overflow: "hidden",
              position: "relative"
            }}
          >
            {/* Script Info Top Banner (Masked - No Student Info) */}
            <Box
              sx={{
                px: 2,
                py: 0.75,
                bgcolor: "#1e293b",
                color: "#ffffff",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexShrink: 0
              }}
            >
              <Stack direction="row" spacing={1.5} alignItems="center">
                <PictureAsPdf sx={{ color: "#ef4444", fontSize: 20 }} />
                <Typography variant="subtitle2" fontWeight={800}>
                  {selectedStudent ? `Answer Script #${selectedStudentIndex + 1}` : "No Script Selected"}
                </Typography>
                <Typography variant="caption" sx={{ color: "#94a3b8" }}>
                  Course: {selectedCourse?.course} ({selectedCourse?.coursecode})
                </Typography>
              </Stack>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Typography variant="caption" sx={{ color: "#cbd5e1", fontWeight: 700 }}>
                  Page {currentPage} of {totalPages}
                </Typography>
                {activeScriptUrl && (
                  <IconButton size="small" sx={{ color: "#94a3b8" }} onClick={() => window.open(activeScriptUrl, "_blank")}>
                    <OpenInNew fontSize="small" />
                  </IconButton>
                )}
              </Stack>
            </Box>

            {/* Viewer Stage with Red Left Margin Guide */}
            <Box
              sx={{
                flex: 1,
                position: "relative",
                overflow: "hidden",
                display: "flex",
                justifyContent: "center",
                alignItems: "stretch",
                bgcolor: "#334155"
              }}
            >
              {/* Left Margin Indicator Line ("Not Write Anything Here") */}
              <Box
                sx={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: 34,
                  bgcolor: "rgba(239, 68, 68, 0.12)",
                  borderRight: "2px dashed #ef4444",
                  zIndex: 2,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  pointerEvents: "none"
                }}
              >
                <Typography
                  sx={{
                    writingMode: "vertical-rl",
                    transform: "rotate(180deg)",
                    color: "#f87171",
                    fontSize: "0.65rem",
                    fontWeight: 800,
                    letterSpacing: 2,
                    textTransform: "uppercase"
                  }}
                >
                  Do Not Write Anything Here
                </Typography>
              </Box>

              {/* PDF Viewer / Iframe Container with Brightness, Contrast & Zoom Filters */}
              {activeScriptUrl ? (
                <Box
                  sx={{
                    flex: 1,
                    height: "100%",
                    display: "flex",
                    justifyContent: "center",
                    overflow: "auto",
                    filter: `brightness(${brightness}%) contrast(${contrast}%)`,
                    transition: "filter 0.2s ease"
                  }}
                >
                  <iframe
                    key={`${selectedStudent?._id}_p${currentPage}`}
                    src={iframeUrl}
                    title="Student Answer Script"
                    width="100%"
                    height="100%"
                    style={{
                      border: "none",
                      transform: `scale(${zoom / 100})`,
                      transformOrigin: "top center",
                      transition: "transform 0.15s ease"
                    }}
                  />
                </Box>
              ) : (
                <Box sx={{ p: 6, textAlign: "center", color: "#cbd5e1", m: "auto" }}>
                  <PictureAsPdf sx={{ fontSize: 64, color: "#64748b", mb: 2 }} />
                  <Typography variant="h6" fontWeight={800}>No Answer Script Uploaded</Typography>
                  <Typography variant="body2" sx={{ color: "#94a3b8", mb: 2 }}>
                    Answer book has not been uploaded yet for roll {selectedStudent?.regno}.
                  </Typography>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => window.open("/conduct-exam-2-answer-book-upload", "_blank")}
                  >
                    Upload Script in Answer Book Upload
                  </Button>
                </Box>
              )}
            </Box>

            {/* Bottom Numbered Page Pills Bar (Red = Unverified, Green = Verified) */}
            <Box
              sx={{
                p: 1,
                bgcolor: "#1e293b",
                borderTop: "1px solid #334155",
                display: "flex",
                alignItems: "center",
                gap: 1,
                overflowX: "auto",
                flexShrink: 0
              }}
            >
              <Typography variant="caption" sx={{ color: "#94a3b8", fontWeight: 800, whiteSpace: "nowrap", pr: 1 }}>
                PAGES ({verifiedPages.size}/{totalPages} Verified):
              </Typography>
              <Stack direction="row" spacing={0.75} alignItems="center">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                  const isVerified = verifiedPages.has(pageNum);
                  const isActive = pageNum === currentPage;
                  return (
                    <Box
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      sx={{
                        width: 36,
                        height: 36,
                        flexShrink: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: 1,
                        cursor: "pointer",
                        fontWeight: 900,
                        fontSize: "0.85rem",
                        color: "#ffffff",
                        bgcolor: isVerified ? "#16a34a" : "#dc2626",
                        border: isActive ? "3px solid #38bdf8" : "1px solid rgba(255,255,255,0.15)",
                        boxShadow: isActive ? "0 0 10px rgba(56,189,248,0.8)" : "none",
                        transition: "all 0.15s ease",
                        "&:hover": {
                          transform: "scale(1.1)",
                          filter: "brightness(1.15)"
                        }
                      }}
                    >
                      {pageNum}
                    </Box>
                  );
                })}
              </Stack>
            </Box>
          </Box>

          {/* ================= COLUMN 3: RIGHT FLOATING TOOL RAIL ================= */}
          <Stack
            spacing={1.25}
            alignItems="center"
            sx={{
              width: 82,
              p: 1,
              bgcolor: "#ffffff",
              borderLeft: "1px solid #cbd5e1",
              height: "100%",
              overflowY: "auto",
              flexShrink: 0
            }}
          >
            {/* Red Timer Box */}
            <Box
              sx={{
                bgcolor: "#dc2626",
                color: "#ffffff",
                borderRadius: 1.5,
                px: 0.5,
                py: 0.75,
                width: "100%",
                textAlign: "center",
                boxShadow: "0 2px 5px rgba(220,38,38,0.3)"
              }}
            >
              <Typography variant="caption" sx={{ fontSize: "0.6rem", display: "block", opacity: 0.9, fontWeight: 800 }}>
                TIMER
              </Typography>
              <Typography variant="body2" sx={{ fontFamily: "monospace", fontWeight: 900, fontSize: "0.8rem", letterSpacing: 0.5 }}>
                {formatTimer(timerSeconds)}
              </Typography>
            </Box>

            {/* Brightness Slider */}
            <Tooltip title={`Brightness: ${brightness}%`} placement="left">
              <Box sx={{ width: "100%", textAlign: "center" }}>
                <Brightness6 fontSize="small" sx={{ color: "#64748b" }} />
                <Slider
                  size="small"
                  value={brightness}
                  min={50}
                  max={200}
                  onChange={(e, val) => setBrightness(val)}
                  sx={{ width: "80%", my: 0.2 }}
                />
              </Box>
            </Tooltip>

            {/* Contrast Slider */}
            <Tooltip title={`Contrast: ${contrast}%`} placement="left">
              <Box sx={{ width: "100%", textAlign: "center" }}>
                <Contrast fontSize="small" sx={{ color: "#64748b" }} />
                <Slider
                  size="small"
                  value={contrast}
                  min={50}
                  max={200}
                  onChange={(e, val) => setContrast(val)}
                  sx={{ width: "80%", my: 0.2 }}
                />
              </Box>
            </Tooltip>

            {/* Zoom Controls */}
            <Stack direction="row" spacing={0.5}>
              <Tooltip title="Zoom In (+)">
                <IconButton size="small" onClick={() => setZoom((z) => Math.min(z + 15, 200))} sx={{ bgcolor: "#f1f5f9" }}>
                  <ZoomIn fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Zoom Out (-)">
                <IconButton size="small" onClick={() => setZoom((z) => Math.max(z - 15, 60))} sx={{ bgcolor: "#f1f5f9" }}>
                  <ZoomOut fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>

            {/* Reset Controls */}
            <Tooltip title="Reset View" placement="left">
              <IconButton size="small" onClick={() => { setBrightness(100); setContrast(100); setZoom(100); }}>
                <RestartAlt fontSize="small" />
              </IconButton>
            </Tooltip>

            <Divider sx={{ width: "100%", my: 0.5 }} />

            {/* Tick Tool: Mark Page Checked & Advance */}
            <Tooltip title={`Mark Page ${currentPage} as Checked & Advance`} placement="left">
              <IconButton
                onClick={handleMarkPageVerified}
                sx={{
                  bgcolor: verifiedPages.has(currentPage) ? "#15803d" : "#16a34a",
                  color: "#ffffff",
                  width: 48,
                  height: 48,
                  boxShadow: "0 3px 6px rgba(22,163,74,0.4)",
                  "&:hover": { bgcolor: "#15803d", transform: "scale(1.06)" }
                }}
              >
                <Check sx={{ fontSize: 32, fontWeight: "bold" }} />
              </IconButton>
            </Tooltip>
            <Typography variant="caption" sx={{ fontSize: "0.65rem", fontWeight: 800, color: "#16a34a", textAlign: "center" }}>
              Verify Page
            </Typography>

            <Divider sx={{ width: "100%", my: 0.5 }} />

            {/* Question Paper Button (Blue) */}
            <Tooltip title="View Official Question Paper" placement="left">
              <Button
                fullWidth
                variant="contained"
                size="small"
                onClick={() => setQpModalOpen(true)}
                sx={{
                  bgcolor: "#2563eb",
                  color: "#ffffff",
                  fontSize: "0.62rem",
                  fontWeight: 800,
                  py: 0.75,
                  minWidth: 0,
                  textTransform: "none",
                  "&:hover": { bgcolor: "#1d4ed8" }
                }}
              >
                Question Paper
              </Button>
            </Tooltip>

            {/* Solution Button (Dark Blue) */}
            <Tooltip title="View Model Answers / Solutions" placement="left">
              <Button
                fullWidth
                variant="contained"
                size="small"
                onClick={() => setSolutionModalOpen(true)}
                sx={{
                  bgcolor: "#1e3a8a",
                  color: "#ffffff",
                  fontSize: "0.62rem",
                  fontWeight: 800,
                  py: 0.75,
                  minWidth: 0,
                  textTransform: "none",
                  "&:hover": { bgcolor: "#172554" }
                }}
              >
                Solution
              </Button>
            </Tooltip>

            {/* Reject Script Button (Red) */}
            <Tooltip title="Reject Answer Script" placement="left">
              <Button
                fullWidth
                variant="contained"
                size="small"
                onClick={() => setRejectModalOpen(true)}
                sx={{
                  bgcolor: "#dc2626",
                  color: "#ffffff",
                  fontSize: "0.62rem",
                  fontWeight: 800,
                  py: 0.75,
                  minWidth: 0,
                  textTransform: "none",
                  "&:hover": { bgcolor: "#b91c1c" }
                }}
              >
                Reject Script
              </Button>
            </Tooltip>

            {/* Submit Button (Green - Strictly Disabled until all pages are verified) */}
            <Tooltip
              title={
                verifiedPages.size < totalPages
                  ? `Must verify all ${totalPages} pages before submitting! (${verifiedPages.size}/${totalPages} verified)`
                  : "Submit and finalize evaluation"
              }
              placement="left"
            >
              <span>
                <Button
                  fullWidth
                  variant="contained"
                  size="small"
                  onClick={handleSubmitEvaluation}
                  disabled={verifiedPages.size < totalPages || loading}
                  sx={{
                    bgcolor: "#16a34a",
                    color: "#ffffff",
                    fontSize: "0.68rem",
                    fontWeight: 900,
                    py: 1,
                    minWidth: 0,
                    textTransform: "none",
                    "&:hover": { bgcolor: "#15803d" },
                    "&.Mui-disabled": {
                      bgcolor: "#e2e8f0",
                      color: "#94a3b8"
                    }
                  }}
                >
                  Submit
                </Button>
              </span>
            </Tooltip>
          </Stack>
        </Box>
      </Box>

      {/* ================= MODALS & DIALOGS ================= */}

      {/* Question Paper Dialog */}
      <Dialog open={qpModalOpen} onClose={() => setQpModalOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, bgcolor: "#f8fafc", py: 1.5 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="h6" fontWeight={900}>
                Question Paper: {selectedCourse?.course} ({selectedCourse?.coursecode})
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Exam: {selectedCourse?.exam} • Total Marks: {maxTotalMarks}
              </Typography>
            </Box>
            <IconButton size="small" onClick={() => setQpModalOpen(false)}><Close /></IconButton>
          </Stack>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ p: 2.5, maxHeight: "70vh" }}>
          <Stack spacing={2}>
            {(paper?.sections || []).map((sec, sIdx) => (
              <Paper key={sec._id || sIdx} elevation={0} sx={{ p: 2, border: "1px solid #e2e8f0", borderRadius: 2 }}>
                <Typography variant="subtitle1" fontWeight={800} color="primary.main" sx={{ mb: 1 }}>
                  Section {sIdx + 1}: {sec.title || "General"}
                </Typography>
                <Stack spacing={1.5}>
                  {(sec.questions || []).map((q, qIdx) => {
                    const matched = flatQuestions.find((fq) => fq.questionid === String(q._id));
                    const qMarks = Number(q.marks) > 0 ? Number(q.marks) : (Number(q.maxmarks) > 0 ? Number(q.maxmarks) : (Number(matched?.maxmarks) > 0 ? Number(matched.maxmarks) : 10));
                    const qLabel = matched?.questionlabel || q.questionlabel || (sec.questions.length > 1 ? `${sIdx + 1}${String.fromCharCode(97 + qIdx)}` : `Q${sIdx + 1}`);
                    return (
                      <Box key={q._id || qIdx} sx={{ p: 1.5, bgcolor: "#f8fafc", borderRadius: 1.5, border: "1px solid #f1f5f9" }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Box>
                            <Typography variant="body2" fontWeight={800} color="#1e293b">
                              {qLabel.startsWith("Q") ? qLabel : `Q${qLabel}`}. {q.question || "Question"}
                            </Typography>
                            {q.questiontype && (
                              <Typography variant="caption" color="text.secondary" sx={{ display: "inline-block", mt: 0.25 }}>
                                Type: <strong>{q.questiontype}</strong>
                              </Typography>
                            )}
                          </Box>
                          <Chip label={`${qMarks} Marks`} size="small" color="primary" variant="outlined" sx={{ fontWeight: 800 }} />
                        </Stack>
                      </Box>
                    );
                  })}
                </Stack>
              </Paper>
            ))}
            {(!paper?.sections || paper.sections.length === 0) && (
              <Typography color="text.secondary">No sections configured for this paper.</Typography>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2, bgcolor: "#f8fafc" }}>
          <Button onClick={() => setQpModalOpen(false)} variant="outlined">Close</Button>
        </DialogActions>
      </Dialog>

      {/* Solution / Model Answers Dialog */}
      <Dialog open={solutionModalOpen} onClose={() => setSolutionModalOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, bgcolor: "#f8fafc", py: 1.5 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="h6" fontWeight={900}>
                Model Answers &amp; Solutions: {selectedCourse?.course} ({selectedCourse?.coursecode})
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Official Answer Keys and Solutions from Question Paper Setter
              </Typography>
            </Box>
            <IconButton size="small" onClick={() => setSolutionModalOpen(false)}><Close /></IconButton>
          </Stack>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ p: 2.5, maxHeight: "70vh" }}>
          <Stack spacing={2}>
            {flatQuestions.map((q) => (
              <Paper key={q.questionid} elevation={0} sx={{ p: 2, border: "1px solid #e2e8f0", borderRadius: 2 }}>
                <Typography variant="subtitle2" fontWeight={800} color="#1e293b">
                  Q{q.questionlabel}. {q.question} ({q.maxmarks} Marks)
                </Typography>
                <Box sx={{ mt: 1, p: 1.5, bgcolor: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 1.5 }}>
                  <Typography variant="caption" fontWeight={800} color="#15803d" display="block" sx={{ mb: 0.5 }}>
                    MODEL ANSWER / SOLUTION:
                  </Typography>
                  <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", color: "#14532d" }}>
                    {q.answer || "No model answer provided by setter for this question."}
                  </Typography>
                </Box>
              </Paper>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2, bgcolor: "#f8fafc" }}>
          <Button onClick={() => setSolutionModalOpen(false)} variant="outlined">Close</Button>
        </DialogActions>
      </Dialog>

      {/* Reject Script Dialog */}
      <Dialog open={rejectModalOpen} onClose={() => setRejectModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, bgcolor: "#fef2f2", color: "#b91c1c", py: 1.5 }}>
          Reject Student Answer Script
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ p: 2.5 }}>
          <Typography variant="body2" sx={{ mb: 2, color: "#475569" }}>
            Are you sure you want to reject <strong>Answer Script #{selectedStudentIndex + 1}</strong>?
            Please provide a valid reason (e.g. illegible pages, mismatch, corrupted upload).
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Rejection Reason"
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="Enter specific reason for rejecting this script..."
          />
        </DialogContent>
        <DialogActions sx={{ p: 2, bgcolor: "#f8fafc" }}>
          <Button onClick={() => setRejectModalOpen(false)} variant="outlined">Cancel</Button>
          <Button onClick={handleConfirmReject} variant="contained" color="error" disabled={loading || !rejectionReason.trim()}>
            Confirm Rejection
          </Button>
        </DialogActions>
      </Dialog>

      {/* Question Comment Dialog */}
      <Dialog open={Boolean(commentDialogQuestion)} onClose={() => setCommentDialogQuestion(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, py: 1.5 }}>
          Remark for Q.{commentDialogQuestion?.questionlabel}
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ p: 2 }}>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Examiner Remark / Note"
            value={tempComment}
            onChange={(e) => setTempComment(e.target.value)}
            placeholder="Add specific comment or note for this question..."
          />
        </DialogContent>
        <DialogActions sx={{ p: 1.5 }}>
          <Button onClick={() => setCommentDialogQuestion(null)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => {
              if (commentDialogQuestion) {
                setCommentMap((prev) => ({ ...prev, [commentDialogQuestion.questionid]: tempComment }));
              }
              setCommentDialogQuestion(null);
            }}
          >
            Save Remark
          </Button>
        </DialogActions>
      </Dialog>

      {/* Compliance Acceptance Dialog */}
      <ExamAcceptanceDialog
        open={acceptanceOpen}
        onClose={() => setAcceptanceOpen(false)}
        role="evaluator"
        assignment={examinerRecord || (selectedCourse ? { ...selectedCourse, examinername: examineremail, examineremail } : {})}
        apiPrefix="/api/v2/conductexam2"
        onAccepted={handleAccepted}
      />

      {/* Compliance Declaration Dialog */}
      <ExamDeclarationDialog
        open={declarationOpen}
        onClose={() => setDeclarationOpen(false)}
        role="evaluator"
        assignment={examinerRecord || (selectedCourse ? { ...selectedCourse, examinername: examineremail, examineremail } : {})}
        onSubmitDeclaration={handleSubmitDeclaration}
        submitting={declaring}
      />

      {/* Remuneration Bill Dialog */}
      <ExamRemunerationBillDialog
        open={billOpen}
        onClose={() => setBillOpen(false)}
        role="evaluator"
        assignmentId={examinerRecord?._id || selectedCourse?.allotmentIds?.[0]}
        apiPrefix="/api/v2/conductexam2"
      />
    </MenuPageShell>
  );
}


