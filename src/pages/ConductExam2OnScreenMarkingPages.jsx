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
  FormControl,
  CircularProgress
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
import * as pdfjsLib from "pdfjs-dist/build/pdf.mjs";

if (typeof window !== "undefined" && pdfjsLib?.GlobalWorkerOptions) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
}

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

// Isolated TimerBadge to avoid re-rendering parent tree on 1-second interval
const TimerBadge = React.memo(function TimerBadge({ activeStudentId, timerSecondsRef }) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    setSeconds(0);
    if (timerSecondsRef) timerSecondsRef.current = 0;
    if (!activeStudentId) return;

    const interval = setInterval(() => {
      setSeconds((prev) => {
        const next = prev + 1;
        if (timerSecondsRef) timerSecondsRef.current = next;
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [activeStudentId, timerSecondsRef]);

  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  const timeStr = `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;

  return (
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
        {timeStr}
      </Typography>
    </Box>
  );
});

// Single PDF Page Component: Renders an individual page to canvas and manages annotations
const SinglePdfPage = React.memo(function SinglePdfPage({
  pdfDoc,
  pageNumber,
  zoom = 100,
  activeMarkTool = "stamp_right",
  pageStamps = [],
  onAddStamp,
  onDeleteStamp,
  isVerified = false,
  onPageVisible
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const renderTaskRef = useRef(null);
  const [rendered, setRendered] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 750, height: 1060 });
  // First 2 pages render immediately, subsequent pages are observed
  const [isVisible, setIsVisible] = useState(pageNumber <= 2);

  // Lazy render when scrolled within 800px of viewport
  useEffect(() => {
    if (pageNumber <= 2) return;
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "800px 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [pageNumber]);

  // Viewport center detection to report current active page
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !onPageVisible || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting && entry.intersectionRatio >= 0.35) {
          onPageVisible(pageNumber);
        }
      },
      { threshold: [0.35, 0.7] }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [pageNumber, onPageVisible]);

  // Render to canvas when isVisible and pdfDoc are available
  useEffect(() => {
    if (!pdfDoc || !isVisible) return;
    let isCancelled = false;

    const renderPage = async () => {
      try {
        setRendering(true);
        if (renderTaskRef.current) {
          try {
            await renderTaskRef.current.cancel();
          } catch (e) {}
        }

        const page = await pdfDoc.getPage(pageNumber);
        if (isCancelled) return;

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");

        // Scale: 100% zoom = 1.32x base A4 (approx ~790px width)
        const scale = (zoom / 100) * 1.32;
        const viewport = page.getViewport({ scale });

        const pixelRatio = window.devicePixelRatio || 1;
        canvas.width = Math.floor(viewport.width * pixelRatio);
        canvas.height = Math.floor(viewport.height * pixelRatio);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

        setDimensions({
          width: Math.floor(viewport.width),
          height: Math.floor(viewport.height)
        });

        const renderTask = page.render({
          canvasContext: ctx,
          viewport: viewport
        });
        renderTaskRef.current = renderTask;
        await renderTask.promise;

        if (!isCancelled) {
          setRendered(true);
          setRendering(false);
        }
      } catch (err) {
        if (!isCancelled && err.name !== "RenderingCancelledException") {
          console.error(`Page ${pageNumber} render error:`, err);
          setRendering(false);
        }
      }
    };

    renderPage();

    return () => {
      isCancelled = true;
    };
  }, [pdfDoc, pageNumber, zoom, isVisible]);

  // Click on page to stamp
  const handlePageClick = (e) => {
    if (activeMarkTool === "view") return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const newStamp = {
      id: Date.now() + "_" + Math.random().toString(36).substr(2, 5),
      page: pageNumber,
      type: activeMarkTool === "stamp_wrong" ? "wrong" : "right",
      x: Math.max(1, Math.min(99, Number(x.toFixed(2)))),
      y: Math.max(1, Math.min(99, Number(y.toFixed(2)))),
      timestamp: new Date().toISOString()
    };

    if (onAddStamp) {
      onAddStamp(newStamp);
    }
  };

  const stampsOnThisPage = (pageStamps || []).filter((s) => s.page === pageNumber);

  return (
    <Box
      ref={containerRef}
      id={`pdf-page-${pageNumber}`}
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        mb: 3,
        position: "relative"
      }}
    >
      {/* Page Header Bar */}
      <Box
        sx={{
          width: dimensions.width,
          maxWidth: "100%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          px: 1.5,
          py: 0.6,
          bgcolor: "rgba(15, 23, 42, 0.95)",
          borderRadius: "4px 4px 0 0",
          color: "#cbd5e1"
        }}
      >
        <Typography variant="caption" sx={{ fontWeight: 800, fontSize: "0.78rem", letterSpacing: 0.5 }}>
          PAGE {pageNumber}
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          {isVerified ? (
            <Chip
              size="small"
              icon={<Check sx={{ fontSize: "14px !important", color: "#ffffff !important" }} />}
              label="Verified"
              sx={{ bgcolor: "#16a34a", color: "#ffffff", fontWeight: 800, height: 20, fontSize: "0.68rem" }}
            />
          ) : (
            <Chip
              size="small"
              label="Unverified"
              sx={{ bgcolor: "#dc2626", color: "#ffffff", fontWeight: 800, height: 20, fontSize: "0.68rem" }}
            />
          )}
          <Typography variant="caption" sx={{ color: "#94a3b8", fontSize: "0.68rem" }}>
            {stampsOnThisPage.length} mark{stampsOnThisPage.length !== 1 ? "s" : ""}
          </Typography>
        </Stack>
      </Box>

      {/* Page Canvas + Stamping Container */}
      <Box
        sx={{
          position: "relative",
          width: dimensions.width,
          height: dimensions.height,
          boxShadow: "0 8px 30px rgba(0,0,0,0.5)",
          borderRadius: "0 0 4px 4px",
          bgcolor: "#ffffff",
          overflow: "hidden"
        }}
      >
        <canvas
          ref={canvasRef}
          style={{
            display: "block",
            width: dimensions.width,
            height: dimensions.height
          }}
        />

        {/* Loading Spinner for this page */}
        {rendering && !rendered && (
          <Box
            sx={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              display: "flex",
              alignItems: "center",
              gap: 1,
              bgcolor: "rgba(15,23,42,0.75)",
              color: "#ffffff",
              px: 2,
              py: 1,
              borderRadius: 2
            }}
          >
            <CircularProgress size={20} sx={{ color: "#38bdf8" }} />
            <Typography variant="caption" fontWeight={700}>Loading Page {pageNumber}...</Typography>
          </Box>
        )}

        {/* Stamping Overlay */}
        <Box
          onClick={handlePageClick}
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            zIndex: 10,
            cursor:
              activeMarkTool === "stamp_right" || activeMarkTool === "stamp_wrong"
                ? "crosshair"
                : "default",
            pointerEvents: activeMarkTool === "view" ? "none" : "auto"
          }}
        >
          {stampsOnThisPage.map((stamp) => {
            const isRight = stamp.type === "right";
            return (
              <Tooltip
                key={stamp.id}
                title={`Click to remove this ${isRight ? "Right (✔)" : "Wrong (✘)"} mark`}
                arrow
              >
                <Box
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onDeleteStamp) onDeleteStamp(stamp.id);
                  }}
                  sx={{
                    position: "absolute",
                    left: `${stamp.x}%`,
                    top: `${stamp.y}%`,
                    transform: "translate(-50%, -50%)",
                    bgcolor: isRight ? "#16a34a" : "#dc2626",
                    color: "#ffffff",
                    borderRadius: "50%",
                    width: 32,
                    height: 32,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: isRight
                      ? "0 2px 10px rgba(22,163,74,0.7)"
                      : "0 2px 10px rgba(220,38,38,0.7)",
                    border: "2px solid #ffffff",
                    cursor: "pointer",
                    userSelect: "none",
                    pointerEvents: "auto",
                    transition: "transform 0.15s ease",
                    "&:hover": {
                      transform: "translate(-50%, -50%) scale(1.2)",
                      filter: "brightness(1.15)"
                    }
                  }}
                >
                  {isRight ? (
                    <Check sx={{ fontSize: 22, fontWeight: 900 }} />
                  ) : (
                    <Close sx={{ fontSize: 22, fontWeight: 900 }} />
                  )}
                </Box>
              </Tooltip>
            );
          })}
        </Box>
      </Box>
    </Box>
  );
});

// Canvas-based Continuous Scrollable PDF viewer
const AnswerScriptCanvasViewer = React.memo(function AnswerScriptCanvasViewer({
  pdfUrl,
  currentPage,
  totalPages,
  onTotalPagesDetected,
  onCurrentPageChange,
  brightness = 100,
  contrast = 100,
  zoom = 100,
  activeMarkTool = "stamp_right",
  pageStamps = [],
  verifiedPages = new Set(),
  onAddStamp,
  onDeleteStamp,
  onUndoStamp,
  setActiveMarkTool
}) {
  const [pdfDoc, setPdfDoc] = useState(null);
  const [loadingDoc, setLoadingDoc] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const containerRef = useRef(null);

  // 1. Load PDF Document via PDF.js
  useEffect(() => {
    if (!pdfUrl) {
      setPdfDoc(null);
      setLoadError(null);
      return;
    }
    let isCancelled = false;
    setLoadingDoc(true);
    setLoadError(null);

    const loadingTask = pdfjsLib.getDocument({
      url: pdfUrl,
      cMapUrl: "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/cmaps/",
      cMapPacked: true
    });

    loadingTask.promise
      .then((doc) => {
        if (!isCancelled) {
          setPdfDoc(doc);
          setLoadingDoc(false);
          if (onTotalPagesDetected && doc.numPages > 0) {
            onTotalPagesDetected(doc.numPages);
          }
        }
      })
      .catch((err) => {
        if (!isCancelled) {
          console.error("PDF.js load error:", err);
          setLoadError(err.message || "Failed to load PDF");
          setLoadingDoc(false);
        }
      });

    return () => {
      isCancelled = true;
      try {
        loadingTask.destroy();
      } catch (e) {}
    };
  }, [pdfUrl]);

  const pageCount = pdfDoc ? pdfDoc.numPages : (totalPages || 1);
  const pageNumbers = useMemo(() => Array.from({ length: pageCount }, (_, i) => i + 1), [pageCount]);

  return (
    <Box
      ref={containerRef}
      sx={{
        flex: 1,
        height: "100%",
        width: "100%",
        overflowY: "auto",
        overflowX: "auto",
        bgcolor: "#1e293b",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        position: "relative",
        p: 2,
        filter: `brightness(${brightness}%) contrast(${contrast}%)`,
        transition: "filter 0.2s ease"
      }}
    >
      {/* Sticky Top Tool Floating Bar */}
      <Box
        sx={{
          position: "sticky",
          top: 0,
          zIndex: 30,
          bgcolor: "rgba(15, 23, 42, 0.94)",
          backdropFilter: "blur(8px)",
          borderRadius: 2,
          px: 1.5,
          py: 0.6,
          mb: 2,
          display: "flex",
          alignItems: "center",
          gap: 1,
          border: "1px solid rgba(255,255,255,0.18)",
          boxShadow: "0 4px 16px rgba(0,0,0,0.45)"
        }}
      >
        <Typography variant="caption" sx={{ color: "#94a3b8", fontWeight: 800, fontSize: "0.68rem" }}>
          MARK TOOL:
        </Typography>
        <Chip
          icon={<Check sx={{ fontSize: "14px !important", color: "#ffffff !important" }} />}
          label="Right (✔)"
          size="small"
          onClick={() => setActiveMarkTool("stamp_right")}
          sx={{
            bgcolor: activeMarkTool === "stamp_right" ? "#16a34a" : "rgba(255,255,255,0.12)",
            color: "#ffffff",
            fontWeight: 800,
            fontSize: "0.72rem",
            cursor: "pointer",
            border: activeMarkTool === "stamp_right" ? "2px solid #86efac" : "1px solid transparent"
          }}
        />
        <Chip
          icon={<Close sx={{ fontSize: "14px !important", color: "#ffffff !important" }} />}
          label="Wrong (✘)"
          size="small"
          onClick={() => setActiveMarkTool("stamp_wrong")}
          sx={{
            bgcolor: activeMarkTool === "stamp_wrong" ? "#dc2626" : "rgba(255,255,255,0.12)",
            color: "#ffffff",
            fontWeight: 800,
            fontSize: "0.72rem",
            cursor: "pointer",
            border: activeMarkTool === "stamp_wrong" ? "2px solid #fca5a5" : "1px solid transparent"
          }}
        />
        <Chip
          label="Scroll / View"
          size="small"
          onClick={() => setActiveMarkTool("view")}
          sx={{
            bgcolor: activeMarkTool === "view" ? "#2563eb" : "rgba(255,255,255,0.12)",
            color: "#ffffff",
            fontWeight: 700,
            fontSize: "0.72rem",
            cursor: "pointer",
            border: activeMarkTool === "view" ? "2px solid #93c5fd" : "1px solid transparent"
          }}
        />
        {pageStamps.length > 0 && (
          <Tooltip title="Undo last mark">
            <IconButton size="small" onClick={onUndoStamp} sx={{ color: "#f87171", p: 0.4 }}>
              <RestartAlt sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        )}
        <Typography variant="caption" sx={{ color: "#cbd5e1", fontSize: "0.68rem", ml: 0.5, fontWeight: 700 }}>
          {activeMarkTool === "view"
            ? "• Scroll Mode (Marks Disabled)"
            : "• Click anywhere on any page to mark"}
        </Typography>
      </Box>

      {/* Loading Document Indicator */}
      {loadingDoc && (
        <Box sx={{ p: 6, textAlign: "center", color: "#ffffff" }}>
          <CircularProgress size={36} sx={{ color: "#38bdf8", mb: 2 }} />
          <Typography variant="body2" fontWeight={800} sx={{ color: "#cbd5e1" }}>
            Loading Answer Script...
          </Typography>
        </Box>
      )}

      {/* Load Error Fallback */}
      {loadError && (
        <Alert
          severity="warning"
          sx={{ mb: 2, maxWidth: 600 }}
          action={
            <Button size="small" color="inherit" onClick={() => window.open(pdfUrl, "_blank")}>
              Open in Tab
            </Button>
          }
        >
          Could not preview script via canvas: {loadError}. Click to open directly.
        </Alert>
      )}

      {/* Continuous Vertical Scroll of All Pages */}
      {pdfDoc &&
        pageNumbers.map((pNum) => (
          <SinglePdfPage
            key={pNum}
            pdfDoc={pdfDoc}
            pageNumber={pNum}
            zoom={zoom}
            activeMarkTool={activeMarkTool}
            pageStamps={pageStamps}
            onAddStamp={onAddStamp}
            onDeleteStamp={onDeleteStamp}
            isVerified={verifiedPages.has(pNum)}
            onPageVisible={onCurrentPageChange}
          />
        ))}
    </Box>
  );
});

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
  const [valuationType, setValuationType] = useState("V1");

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
    const urlParams = new URLSearchParams(window.location.search);
    const qpValuation = urlParams.get("valuationtype") || "V1";
    const qpExam = urlParams.get("examcode");
    const qpCourse = urlParams.get("coursecode");
    const qpRegno = urlParams.get("regno");

    if (qpValuation) {
      setValuationType(qpValuation);
    }

    if (qpExam && qpCourse) {
      const targetCourse = {
        examcode: qpExam,
        coursecode: qpCourse,
        paperid: qpCourse,
        course: qpCourse,
        valuationtype: qpValuation
      };
      setSelectedCourse(targetCourse);
      setViewMode("marking");
      loadCourseStudentsAndPaper(targetCourse, qpValuation, qpRegno);
    } else {
      loadAssignedCourses();
    }
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

  // Timer: tracks evaluation elapsed time for active student without parent re-renders
  const timerSecondsRef = useRef(0);

  // PDF controls
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [zoom, setZoom] = useState(100);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(42);
  const [verifiedPages, setVerifiedPages] = useState(new Set());
  const [pageStamps, setPageStamps] = useState([]);
  const [activeMarkTool, setActiveMarkTool] = useState("stamp_right");

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

  const formatTimer = (seconds) => {
    const hrs = Math.floor((seconds || 0) / 3600);
    const mins = Math.floor(((seconds || 0) % 3600) / 60);
    const secs = (seconds || 0) % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Start marking workspace for a specific course
  const handleStartMarking = async (course) => {
    setSelectedCourse(course);
    setViewMode("marking");
    const activeVal = course.valuationtype || "V1";
    setValuationType(activeVal);
    await loadCourseStudentsAndPaper(course, activeVal);
  };

  // Back to assigned courses grid
  const handleBackToList = () => {
    setViewMode("list");
    setSelectedCourse(null);
    setSelectedStudent(null);
    setValuationType("V1");
    if (timerSecondsRef) timerSecondsRef.current = 0;
    if (typeof window !== "undefined" && window.history?.replaceState) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    loadAssignedCourses();
  };

  // Load students & question paper for selected course
  const loadCourseStudentsAndPaper = async (course, forcedValuationType, targetRegno) => {
    const activeValType = forcedValuationType || course.valuationtype || valuationType || "V1";
    setValuationType(activeValType);
    try {
      setLoading(true);
      setError("");
      const res = await ep1.get("/api/v2/conductexam2/onscreen-students", {
        params: {
          colid: global1.colid,
          examineremail,
          paperid: course.paperid,
          examcode: course.examcode,
          coursecode: course.coursecode,
          valuationtype: activeValType,
          regno: targetRegno || undefined
        }
      });
      const loadedPaper = res.data?.paper || null;
      const loadedStudents = res.data?.students || [];
      const loadedQuestions = res.data?.flatQuestions || [];

      setPaper(loadedPaper);
      setStudents(loadedStudents);
      setExaminerRecord(res.data?.examiner || null);
      setFlatQuestions(loadedQuestions);

      // Find target student or first pending or first
      let studentToSelect = null;
      if (targetRegno) {
        studentToSelect = loadedStudents.find((s) => s.regno === targetRegno);
      }
      if (!studentToSelect) {
        studentToSelect = loadedStudents.find((s) => (s.evaluationstatus || "").toLowerCase() !== "evaluated") || loadedStudents[0];
      }

      if (studentToSelect) {
        await selectStudent(studentToSelect, course.paperid, loadedPaper, loadedQuestions, activeValType);
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
  const selectStudent = async (student, activePaperId, currentPaper, questionsList, forcedValuationType) => {
    const activeValType = forcedValuationType || valuationType || "V1";
    setSelectedStudent(student);
    if (timerSecondsRef) timerSecondsRef.current = 0;
    setCurrentPage(1);
    const pCount = Number(student.pagescount) || 2;
    setTotalPages(pCount > 0 ? pCount : 2);
    // Blind marking: for re-evaluations (V2, V3, V4), start with completely fresh verified pages and empty stamps
    setVerifiedPages(activeValType === "V1" ? new Set(student.verifiedpages || []) : new Set());
    setPageStamps(activeValType === "V1" && Array.isArray(student.pagestamps) ? student.pagestamps : []);
    setMarksMap({});
    setMcqMap({});
    setCommentMap({});
    setAnswerBook(student.answerbookurl ? { answerbookurl: student.answerbookurl, answerbookfilename: student.answerbookfilename } : null);

    try {
      const res = await ep1.get("/api/v2/conductexam2/onscreen-student-marks", {
        params: {
          colid: global1.colid,
          paperid: activePaperId || selectedCourse?.paperid,
          regno: student.regno,
          valuationtype: activeValType
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
      if (Array.isArray(res.data?.verifiedpages) && res.data.verifiedpages.length > 0) {
        setVerifiedPages(new Set(res.data.verifiedpages));
      }
      if (Array.isArray(res.data?.pagestamps) && res.data.pagestamps.length > 0) {
        setPageStamps(res.data.pagestamps);
      }
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

  // Right marking action: mark active page verified & place Right mark
  const handleMarkRight = (autoAdvance = false) => {
    setActiveMarkTool("stamp_right");
    const existingOnPage = pageStamps.filter((s) => s.page === currentPage);
    const newStamp = {
      id: Date.now() + "_" + Math.random().toString(36).substr(2, 5),
      page: currentPage,
      type: "right",
      x: 88,
      y: 12 + Math.min(existingOnPage.length * 10, 70),
      timestamp: new Date().toISOString()
    };
    setPageStamps((prev) => [...prev, newStamp]);
    setVerifiedPages((prev) => {
      const next = new Set(prev);
      next.add(currentPage);
      return next;
    });
    if (autoAdvance && currentPage < totalPages) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  // Wrong marking action: mark active page verified & place Wrong mark
  const handleMarkWrong = (autoAdvance = false) => {
    setActiveMarkTool("stamp_wrong");
    const existingOnPage = pageStamps.filter((s) => s.page === currentPage);
    const newStamp = {
      id: Date.now() + "_" + Math.random().toString(36).substr(2, 5),
      page: currentPage,
      type: "wrong",
      x: 88,
      y: 12 + Math.min(existingOnPage.length * 10, 70),
      timestamp: new Date().toISOString()
    };
    setPageStamps((prev) => [...prev, newStamp]);
    setVerifiedPages((prev) => {
      const next = new Set(prev);
      next.add(currentPage);
      return next;
    });
    if (autoAdvance && currentPage < totalPages) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  // Interactive click on PDF overlay to place a mark at exact click coordinates
  const handleOverlayClick = (e) => {
    if (activeMarkTool === "view") return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const newStamp = {
      id: Date.now() + "_" + Math.random().toString(36).substr(2, 5),
      page: currentPage,
      type: activeMarkTool === "stamp_wrong" ? "wrong" : "right",
      x: Math.max(2, Math.min(96, Number(x.toFixed(2)))),
      y: Math.max(2, Math.min(96, Number(y.toFixed(2)))),
      timestamp: new Date().toISOString()
    };

    setPageStamps((prev) => [...prev, newStamp]);
    setVerifiedPages((prev) => {
      const next = new Set(prev);
      next.add(currentPage);
      return next;
    });
  };

  const handleDeleteStamp = (id) => {
    setPageStamps((prev) => prev.filter((s) => s.id !== id));
  };

  const handleUndoStamp = () => {
    setPageStamps((prev) => {
      const pageStampsCurrent = prev.filter((s) => s.page === currentPage);
      if (!pageStampsCurrent.length) return prev;
      const last = pageStampsCurrent[pageStampsCurrent.length - 1];
      return prev.filter((s) => s.id !== last.id);
    });
  };

  const handleClearPageStamps = () => {
    setPageStamps((prev) => prev.filter((s) => s.page !== currentPage));
  };

  // Tick tool legacy alias
  const handleMarkPageVerified = () => handleMarkRight(true);

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
        valuationtype: valuationType,
        verifiedpages: Array.from(verifiedPages),
        pagestamps: pageStamps,
        user: examineremail
      });
      setMessage("Question marks and page stamps saved successfully.");
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
        valuationtype: valuationType,
        verifiedpages: Array.from(verifiedPages),
        pagestamps: pageStamps,
        user: examineremail
      });

      const finalizeRes = await ep1.post("/api/v2/conductexam2/onscreen-finalize", {
        colid: global1.colid,
        paperid: selectedCourse.paperid,
        student: selectedStudent,
        ...paper,
        valuationtype: valuationType,
        evaluationTimeSeconds: timerSecondsRef.current || 0,
        verifiedPages: Array.from(verifiedPages),
        verifiedpages: Array.from(verifiedPages),
        pagestamps: pageStamps,
        user: examineremail
      });

      const nextStudentId = finalizeRes.data?.nextStudentId;
      const currentIdx = students.findIndex((s) => s._id === selectedStudent._id);
      const scriptLabel = `Answer Script #${currentIdx >= 0 ? currentIdx + 1 : 1}`;

      setMessage(`${scriptLabel} evaluated successfully! Total: ${finalizeRes.data?.total || 0}. Evaluation Time: ${formatTimer(timerSecondsRef.current || 0)}.`);

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
  const resolvedPdfUrl = useMemo(() => {
    if (!activeScriptUrl) return "";
    if (activeScriptUrl.startsWith("blob:") || activeScriptUrl.startsWith("data:")) return activeScriptUrl;
    const backendBase = (ep1.defaults.baseURL || window.location.origin).replace(/\/+$/, "");
    if (activeScriptUrl.startsWith("/")) {
      return `${backendBase}${activeScriptUrl}`;
    }
    return `${backendBase}/api/v2/conductexam2/proxy-pdf?url=${encodeURIComponent(activeScriptUrl)}`;
  }, [activeScriptUrl]);

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
                  {valuationType !== "V1" && (
                    <Chip
                      label={`Blind Re-evaluation (${valuationType === "V2" ? "Re-evaluator 1" : valuationType === "V3" ? "Re-evaluator 2" : "Re-evaluator 3"})`}
                      size="small"
                      color="warning"
                      sx={{ fontWeight: 800, height: 22, fontSize: "0.75rem", bgcolor: "#f59e0b", color: "#ffffff" }}
                    />
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
          {/* ================= COLUMN 1: QUESTION STRUCTURE & SCORING TABLE (20%) ================= */}
          <Box
            sx={{
              width: "20%",
              flex: "0 0 20%",
              flexShrink: 0,
              display: "flex",
              flexDirection: "column",
              borderRight: "1px solid #cbd5e1",
              bgcolor: "#ffffff"
            }}
          >
            {/* Table Header Banner */}
            <Box sx={{ p: 1.25, borderBottom: "1px solid #e2e8f0", bgcolor: "#f8fafc" }}>
              <Typography variant="subtitle2" fontWeight={900} color="#0f172a" sx={{ fontSize: "0.88rem" }}>
                Question Structure &amp; Marks
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, fontSize: "0.72rem" }}>
                From Paper Setter • {flatQuestions.length} Questions
              </Typography>
            </Box>

            {/* Questions Table */}
            <TableContainer sx={{ flex: 1, overflowY: "auto" }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow sx={{ "& th": { bgcolor: "#f1f5f9", fontWeight: 900, fontSize: "0.74rem", py: 0.75, px: 0.5 } }}>
                    <TableCell sx={{ width: hasAnyMCQ ? "22%" : "25%", px: 0.5 }}>Q.No.</TableCell>
                    <TableCell sx={{ width: hasAnyMCQ ? "16%" : "20%", px: 0.5 }}>Max</TableCell>
                    <TableCell sx={{ width: hasAnyMCQ ? "32%" : "55%", px: 0.5 }}>Marks</TableCell>
                    {hasAnyMCQ && <TableCell sx={{ width: "30%", px: 0.5 }}>MCQ</TableCell>}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {flatQuestions.map((q) => {
                    const currentMarks = marksMap[q.questionid] ?? "";
                    const currentMcq = mcqMap[q.questionid] || "";
                    const hasComment = Boolean(commentMap[q.questionid]);
                    return (
                      <TableRow key={q.questionid} hover sx={{ "& td": { py: 0.7, px: 0.5 } }}>
                        <TableCell sx={{ fontWeight: 900, fontSize: "0.78rem", color: "#1e293b", px: 0.5 }}>
                          <Tooltip title={q.question || "Question"} placement="right" arrow>
                            <Box sx={{ cursor: "default", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {q.questionlabel || "Q"}
                            </Box>
                          </Tooltip>
                        </TableCell>
                        <TableCell sx={{ fontSize: "0.8rem", color: "#475569", fontWeight: 800, px: 0.5 }}>
                          {q.maxmarks}
                        </TableCell>
                        <TableCell sx={{ px: 0.5 }}>
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
                                style: { padding: "3px 4px", fontSize: "0.8rem", fontWeight: 900, textAlign: "center" }
                              }}
                              sx={{ width: 44 }}
                            />
                            <Tooltip title={hasComment ? `Remark: ${commentMap[q.questionid]}` : "Add Question Remark"}>
                              <IconButton
                                size="small"
                                onClick={() => {
                                  setCommentDialogQuestion(q);
                                  setTempComment(commentMap[q.questionid] || "");
                                }}
                                sx={{ color: hasComment ? "#2563eb" : "#94a3b8", p: 0.2 }}
                              >
                                <Comment sx={{ fontSize: 15 }} />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </TableCell>
                        {hasAnyMCQ && (
                          <TableCell sx={{ px: 0.5 }}>
                            {q.isMCQ ? (
                              <Select
                                size="small"
                                value={currentMcq}
                                onChange={(e) => handleMcqChange(q, e.target.value)}
                                displayEmpty
                                sx={{
                                  fontSize: "0.68rem",
                                  height: 26,
                                  width: "100%",
                                  "& .MuiSelect-select": { py: "2px", px: "3px" }
                                }}
                              >
                                <MenuItem value="" sx={{ fontSize: "0.68rem" }}>-</MenuItem>
                                <MenuItem value="Correct" sx={{ fontSize: "0.68rem", color: "#16a34a", fontWeight: 800 }}>Correct</MenuItem>
                                <MenuItem value="Incorrect" sx={{ fontSize: "0.68rem", color: "#dc2626", fontWeight: 800 }}>Incorrect</MenuItem>
                                <MenuItem value="Not Answered" sx={{ fontSize: "0.68rem", color: "#64748b" }}>Not Answered</MenuItem>
                              </Select>
                            ) : (
                              <Typography variant="caption" sx={{ color: "#94a3b8", fontWeight: 700, pl: 0.5 }}>
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

            {/* Bottom Dark Teal Bar */}
            <Box
              sx={{
                bgcolor: "#0f766e",
                color: "#ffffff",
                p: 1,
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
                sx={{ bgcolor: "#134e4a", color: "#ccfbf1", fontWeight: 900, height: 22, fontSize: "0.72rem" }}
              />
              <Typography variant="body2" sx={{ fontWeight: 900, letterSpacing: 0.5, fontSize: "0.82rem" }}>
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
                  py: 0.3,
                  px: 1,
                  minWidth: 0,
                  "&:hover": { bgcolor: "#2dd4bf" }
                }}
              >
                Save
              </Button>
            </Box>
          </Box>

          {/* ================= COLUMN 2: PDF VIEWER WITH MARGIN GUIDE (65%) ================= */}
          <Box
            sx={{
              width: "65%",
              flex: "0 0 65%",
              flexShrink: 0,
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
                  width: 22,
                  bgcolor: "rgba(239, 68, 68, 0.08)",
                  borderRight: "2px dashed #ef4444",
                  zIndex: 6,
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
                    fontSize: "0.58rem",
                    fontWeight: 800,
                    letterSpacing: 1.5,
                    textTransform: "uppercase"
                  }}
                >
                  Do Not Write Anything Here
                </Typography>
              </Box>

              {/* Continuous Scrollable PDF Viewer Container */}
              {activeScriptUrl ? (
                <AnswerScriptCanvasViewer
                  pdfUrl={resolvedPdfUrl}
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onTotalPagesDetected={(num) => {
                    if (num && num !== totalPages) setTotalPages(num);
                  }}
                  onCurrentPageChange={(pageNum) => {
                    if (pageNum && pageNum !== currentPage) setCurrentPage(pageNum);
                  }}
                  brightness={brightness}
                  contrast={contrast}
                  zoom={zoom}
                  activeMarkTool={activeMarkTool}
                  pageStamps={pageStamps}
                  verifiedPages={verifiedPages}
                  onAddStamp={(newStamp) => {
                    setPageStamps((prev) => [...prev, newStamp]);
                    setVerifiedPages((prev) => {
                      const next = new Set(prev);
                      next.add(newStamp.page);
                      return next;
                    });
                  }}
                  onDeleteStamp={(id) => {
                    setPageStamps((prev) => prev.filter((s) => s.id !== id));
                  }}
                  onUndoStamp={handleUndoStamp}
                  setActiveMarkTool={setActiveMarkTool}
                />
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

            {/* Bottom Numbered Page Pills Bar */}
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
                      onClick={() => {
                        setCurrentPage(pageNum);
                        const el = document.getElementById(`pdf-page-${pageNum}`);
                        if (el) {
                          el.scrollIntoView({ behavior: "smooth", block: "start" });
                        }
                      }}
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

          {/* ================= COLUMN 3: RIGHT FLOATING TOOL RAIL (15%) ================= */}
          <Stack
            spacing={1.5}
            alignItems="center"
            sx={{
              width: "15%",
              flex: "0 0 15%",
              p: 1.25,
              bgcolor: "#ffffff",
              borderLeft: "1px solid #cbd5e1",
              height: "100%",
              overflowY: "auto",
              flexShrink: 0
            }}
          >
            {/* Red Timer Box - Isolated component to avoid re-rendering entire page on 1s interval */}
            <TimerBadge activeStudentId={selectedStudent?._id} timerSecondsRef={timerSecondsRef} />

            {/* Brightness Control */}
            <Box sx={{ width: "100%", px: 0.5 }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Tooltip title="Brightness">
                  <Brightness6 fontSize="small" sx={{ color: "#64748b" }} />
                </Tooltip>
                <Slider
                  size="small"
                  value={brightness}
                  min={50}
                  max={200}
                  onChange={(e, val) => setBrightness(val)}
                  sx={{ my: 0.2 }}
                />
              </Stack>
            </Box>

            {/* Contrast Control */}
            <Box sx={{ width: "100%", px: 0.5 }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Tooltip title="Contrast">
                  <Contrast fontSize="small" sx={{ color: "#64748b" }} />
                </Tooltip>
                <Slider
                  size="small"
                  value={contrast}
                  min={50}
                  max={200}
                  onChange={(e, val) => setContrast(val)}
                  sx={{ my: 0.2 }}
                />
              </Stack>
            </Box>

            {/* Zoom Controls */}
            <Stack direction="row" spacing={0.75} alignItems="center" justifyContent="center">
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
              <Tooltip title="Reset View">
                <IconButton size="small" onClick={() => { setBrightness(100); setContrast(100); setZoom(100); }} sx={{ bgcolor: "#f1f5f9" }}>
                  <RestartAlt fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>

            <Divider sx={{ width: "100%", my: 0.5 }} />

            {/* ================= TWO MARKING BUTTONS: RIGHT (✔) & WRONG (✘) ================= */}
            <Box sx={{ width: "100%", textAlign: "center" }}>
              <Typography variant="caption" sx={{ fontSize: "0.68rem", fontWeight: 900, color: "#475569", textTransform: "uppercase", letterSpacing: 0.5, display: "block", mb: 0.75 }}>
                Mark Script Page
              </Typography>
              <Stack direction="row" spacing={1.5} justifyContent="center" alignItems="center">
                {/* Button 1: Right (✔) */}
                <Tooltip title="Activate Right (✔) Tool — Click anywhere on script to mark" placement="left">
                  <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <IconButton
                      onClick={() => {
                        setActiveMarkTool("stamp_right");
                        setMessage("Right (✔) tool active. Click anywhere on the script page to place the mark.");
                      }}
                      sx={{
                        bgcolor: activeMarkTool === "stamp_right" ? "#15803d" : "#16a34a",
                        color: "#ffffff",
                        width: 48,
                        height: 48,
                        boxShadow: activeMarkTool === "stamp_right"
                          ? "0 0 14px rgba(22,163,74,0.9)"
                          : "0 3px 8px rgba(22,163,74,0.4)",
                        border: activeMarkTool === "stamp_right" ? "3px solid #86efac" : "2px solid transparent",
                        transition: "all 0.15s ease",
                        "&:hover": { bgcolor: "#15803d", transform: "scale(1.06)" }
                      }}
                    >
                      <Check sx={{ fontSize: 30, fontWeight: "bold" }} />
                    </IconButton>
                    <Typography variant="caption" sx={{ fontSize: "0.72rem", fontWeight: 900, color: "#16a34a", mt: 0.5 }}>
                      Right (✔)
                    </Typography>
                  </Box>
                </Tooltip>

                {/* Button 2: Wrong (✘) */}
                <Tooltip title="Activate Wrong (✘) Tool — Click anywhere on script to mark" placement="left">
                  <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <IconButton
                      onClick={() => {
                        setActiveMarkTool("stamp_wrong");
                        setMessage("Wrong (✘) tool active. Click anywhere on the script page to place the mark.");
                      }}
                      sx={{
                        bgcolor: activeMarkTool === "stamp_wrong" ? "#b91c1c" : "#dc2626",
                        color: "#ffffff",
                        width: 48,
                        height: 48,
                        boxShadow: activeMarkTool === "stamp_wrong"
                          ? "0 0 14px rgba(220,38,38,0.9)"
                          : "0 3px 8px rgba(220,38,38,0.4)",
                        border: activeMarkTool === "stamp_wrong" ? "3px solid #fca5a5" : "2px solid transparent",
                        transition: "all 0.15s ease",
                        "&:hover": { bgcolor: "#b91c1c", transform: "scale(1.06)" }
                      }}
                    >
                      <Close sx={{ fontSize: 30, fontWeight: "bold" }} />
                    </IconButton>
                    <Typography variant="caption" sx={{ fontSize: "0.72rem", fontWeight: 900, color: "#dc2626", mt: 0.5 }}>
                      Wrong (✘)
                    </Typography>
                  </Box>
                </Tooltip>
              </Stack>
            </Box>

            <Divider sx={{ width: "100%", my: 0.5 }} />

            {/* Action Buttons with icons & full readable text */}
            <Tooltip title="View Official Question Paper" placement="left">
              <Button
                fullWidth
                variant="contained"
                size="small"
                startIcon={<MenuBook sx={{ fontSize: 18 }} />}
                onClick={() => setQpModalOpen(true)}
                sx={{
                  bgcolor: "#2563eb",
                  color: "#ffffff",
                  fontSize: "0.75rem",
                  fontWeight: 800,
                  py: 0.8,
                  minWidth: 0,
                  textTransform: "none",
                  "&:hover": { bgcolor: "#1d4ed8" }
                }}
              >
                Question Paper
              </Button>
            </Tooltip>

            <Tooltip title="View Model Answers / Solutions" placement="left">
              <Button
                fullWidth
                variant="contained"
                size="small"
                startIcon={<AssignmentTurnedIn sx={{ fontSize: 18 }} />}
                onClick={() => setSolutionModalOpen(true)}
                sx={{
                  bgcolor: "#1e3a8a",
                  color: "#ffffff",
                  fontSize: "0.75rem",
                  fontWeight: 800,
                  py: 0.8,
                  minWidth: 0,
                  textTransform: "none",
                  "&:hover": { bgcolor: "#172554" }
                }}
              >
                Solutions
              </Button>
            </Tooltip>

            <Tooltip title="Reject Answer Script" placement="left">
              <Button
                fullWidth
                variant="contained"
                size="small"
                startIcon={<Cancel sx={{ fontSize: 18 }} />}
                onClick={() => setRejectModalOpen(true)}
                sx={{
                  bgcolor: "#dc2626",
                  color: "#ffffff",
                  fontSize: "0.75rem",
                  fontWeight: 800,
                  py: 0.8,
                  minWidth: 0,
                  textTransform: "none",
                  "&:hover": { bgcolor: "#b91c1c" }
                }}
              >
                Reject Script
              </Button>
            </Tooltip>

            <Tooltip
              title={
                verifiedPages.size < totalPages
                  ? `Must verify all ${totalPages} pages before submitting! (${verifiedPages.size}/${totalPages} verified)`
                  : "Submit and finalize evaluation"
              }
              placement="left"
            >
              <Box sx={{ width: "100%" }}>
                <Button
                  fullWidth
                  variant="contained"
                  size="small"
                  startIcon={<CheckCircle sx={{ fontSize: 18 }} />}
                  onClick={handleSubmitEvaluation}
                  disabled={verifiedPages.size < totalPages || loading}
                  sx={{
                    bgcolor: "#16a34a",
                    color: "#ffffff",
                    fontSize: "0.8rem",
                    fontWeight: 900,
                    py: 1.1,
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
              </Box>
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


