import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Grid,
  LinearProgress,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import { DataGrid, GridToolbar } from "@mui/x-data-grid";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import SaveIcon from "@mui/icons-material/Save";
import SendIcon from "@mui/icons-material/Send";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import PaymentsIcon from "@mui/icons-material/Payments";
import ep1 from "../api/ep1";
import global1 from "./global1";
import MenuPageShell from "./MenuPageShell";
import ExamAcceptanceDialog from "../components/conductExam/ExamAcceptanceDialog";
import ExamDeclarationDialog from "../components/conductExam/ExamDeclarationDialog";
import ExamRemunerationBillDialog from "../components/conductExam/ExamRemunerationBillDialog";

const geminiModels = ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.0-flash", "gemini-1.5-flash"];
const uniq = (items) => [...new Set(items.map((item) => String(item || "").trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
const paperLabel = (row) => `${row.course || ""}${row.coursecode ? ` (${row.coursecode})` : ""} - ${row.programcode || ""}`;
const keyFor = (sectionIndex, questionIndex) => `${sectionIndex}-${questionIndex}`;

export default function ConductExam2ModerationPage() {
  const [papers, setPapers] = useState([]);
  const [selectedModeratorId, setSelectedModeratorId] = useState("");
  const [moderator, setModerator] = useState(null);
  const [paper, setPaper] = useState(null);
  const [sections, setSections] = useState([]);
  const [audit, setAudit] = useState([]);
  const [moderationDocuments, setModerationDocuments] = useState([]);
  const [supportDocTitle, setSupportDocTitle] = useState("");
  const [documentDialog, setDocumentDialog] = useState(false);
  const [selectedQuestionKeys, setSelectedQuestionKeys] = useState([]);
  const [filters, setFilters] = useState({ academicyear: "", examcode: "" });
  const [geminiModel, setGeminiModel] = useState("gemini-2.5-flash");
  const [rules, setRules] = useState("");
  const [comments, setComments] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [moderating, setModerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [acceptanceDialogOpen, setAcceptanceDialogOpen] = useState(false);
  const [declarationDialogOpen, setDeclarationDialogOpen] = useState(false);
  const [remunerationDialogOpen, setRemunerationDialogOpen] = useState(false);
  const [userProfile, setUserProfile] = useState({});
  const [institution, setInstitution] = useState({});

  const locked = /^Moderation Submitted$/i.test(paper?.status || moderator?.status || "");
  const selectedPaper = useMemo(() => papers.find((row) => row._id === selectedModeratorId) || null, [papers, selectedModeratorId]);
  const isAccepted = (moderator?.acceptancestatus === "Accepted") || (selectedPaper?.acceptancestatus === "Accepted");
  const filterOptions = useMemo(() => ({
    academicyear: uniq(papers.map((row) => row.academicyear)),
    examcode: uniq(papers.map((row) => row.examcode))
  }), [papers]);

  const loadPapers = async (nextFilters = filters) => {
    try {
      setLoading(true);
      setError("");
      const params = { colid: global1.colid, moderatoremail: global1.user };
      Object.entries(nextFilters).forEach(([key, value]) => { if (value) params[key] = value; });
      const res = await ep1.get("/api/v2/conductexam2/moderator-assigned-papers", { params });
      setPapers(res.data?.data || []);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load assigned moderation papers.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPapers();
  }, []);

  const loadPaper = async (moderatorId) => {
    if (!moderatorId) return;
    try {
      setLoading(true);
      setError("");
      setSelectedQuestionKeys([]);
      const res = await ep1.get("/api/v2/conductexam2/moderation-paper", { params: { colid: global1.colid, moderatorid: moderatorId } });
      setModerator(res.data?.moderator || null);
      setPaper(res.data?.paper || null);
      setSections(res.data?.paper?.sections || []);
      setModerationDocuments(res.data?.paper?.moderationdocuments || []);
      setAudit(res.data?.audit || []);
      setUserProfile(res.data?.userProfile || {});
      setInstitution(res.data?.institution || {});
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load moderation paper.");
      setModerator(null);
      setPaper(null);
      setSections([]);
      setAudit([]);
    } finally {
      setLoading(false);
    }
  };

  const uploadDocument = async (file) => {
    if (!file) return;
    try {
      setUploadingDoc(true);
      setError("");
      const formData = new FormData();
      formData.append("file", file);
      formData.append("colid", global1.colid);
      const res = await ep1.post("/api/v2/conductexam2/question-paper-upload", formData, { headers: { "Content-Type": "multipart/form-data" } });
      const data = res.data?.data || {};
      setModerationDocuments((prev) => [...prev, { title: supportDocTitle || file.name, filename: data.filename || file.name, url: data.url || "", uploadedby: global1.user, uploadeddate: new Date().toISOString() }]);
      setSupportDocTitle("");
      setMessage("Document uploaded. Click Save to persist with moderation.");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to upload document.");
    } finally {
      setUploadingDoc(false);
    }
  };

  const updateQuestion = (sectionIndex, questionIndex, patch) => {
    setSections((prev) => prev.map((section, sIndex) => {
      if (sIndex !== sectionIndex) return section;
      return {
        ...section,
        questions: (section.questions || []).map((question, qIndex) => qIndex === questionIndex ? { ...question, ...patch } : question)
      };
    }));
  };

  const toggleQuestion = (sectionIndex, questionIndex) => {
    const key = keyFor(sectionIndex, questionIndex);
    setSelectedQuestionKeys((prev) => prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]);
  };

  const selectedQuestionPayload = () => selectedQuestionKeys.map((key) => {
    const [sectionIndexText, questionIndexText] = key.split("-");
    const sectionIndex = Number(sectionIndexText);
    const questionIndex = Number(questionIndexText);
    const question = sections[sectionIndex]?.questions?.[questionIndex] || {};
    return {
      sectionindex: sectionIndex,
      questionindex: questionIndex,
      section: sections[sectionIndex]?.title || "",
      question: question.question || "",
      answer: question.answer || "",
      marks: question.marks || 0,
      conumber: question.conumber || "",
      co: question.co || "",
      bloomlevels: question.bloomlevels || []
    };
  }).filter((item) => item.question);

  const saveModeration = async () => {
    if (!selectedModeratorId) return setError("Select a paper.");
    if (!isAccepted) {
      setAcceptanceDialogOpen(true);
      return setError("You must accept the Acceptance Form before saving moderation.");
    }
    try {
      setSaving(true);
      setError("");
      setMessage("");
      const res = await ep1.post("/api/v2/conductexam2/moderation-paper", {
        colid: global1.colid,
        moderatorid: selectedModeratorId,
        sections,
        moderationdocuments: moderationDocuments,
        status: "Moderation In Progress",
        comments,
        actorname: global1.name,
        user: global1.user
      });
      setPaper(res.data?.data || paper);
      setSections(res.data?.data?.sections || sections);
      setAudit(res.data?.audit || audit);
      setMessage("Moderation changes saved with audit trail.");
      await loadPapers();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to save moderation.");
    } finally {
      setSaving(false);
    }
  };

  const runGeminiModeration = async () => {
    const questions = selectedQuestionPayload();
    if (!questions.length) return setError("Select one or more questions for Gemini moderation.");
    if (!isAccepted) {
      setAcceptanceDialogOpen(true);
      return setError("You must accept the Acceptance Form before running AI moderation.");
    }
    try {
      setModerating(true);
      setError("");
      setMessage("");
      const res = await ep1.post("/api/v2/conductexam2/moderation-gemini", {
        colid: global1.colid,
        moderatorid: selectedModeratorId,
        questions,
        rules,
        geminiModel,
        actorname: global1.name,
        user: global1.user
      });
      setPaper(res.data?.data || paper);
      setSections(res.data?.data?.sections || sections);
      setAudit(res.data?.audit || audit);
      setMessage("Gemini moderation completed and audit trail saved.");
      await loadPapers();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to moderate with Gemini.");
    } finally {
      setModerating(false);
    }
  };

  const submitModeration = () => {
    if (!selectedModeratorId) return setError("Select a paper.");
    if (!isAccepted) {
      setAcceptanceDialogOpen(true);
      return setError("You must accept the Acceptance Form before submitting moderation.");
    }
    setDeclarationDialogOpen(true);
  };

  const executeSubmitModeration = async (declarationdata) => {
    try {
      setSubmitting(true);
      setError("");
      setMessage("");
      const res = await ep1.post("/api/v2/conductexam2/moderation-submit", {
        colid: global1.colid,
        moderatorid: selectedModeratorId,
        comments,
        declarationdata,
        actorname: global1.name,
        user: global1.user
      });
      setPaper(res.data?.data || paper);
      setAudit(res.data?.audit || audit);
      if (res.data?.moderator) setModerator(res.data.moderator);
      setMessage("Moderation submitted. This paper is now locked.");
      setDeclarationDialogOpen(false);
      setRemunerationDialogOpen(true);
      await loadPapers();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to submit moderation.");
    } finally {
      setSubmitting(false);
    }
  };

  const paperColumns = [
    { field: "academicyear", headerName: "Year", width: 120 },
    { field: "exam", headerName: "Exam", minWidth: 180, flex: 1 },
    { field: "examcode", headerName: "Exam Code", width: 140 },
    { field: "program", headerName: "Program", width: 160 },
    { field: "course", headerName: "Course", minWidth: 220, flex: 1 },
    { field: "coursecode", headerName: "Course Code", width: 140 },
    { field: "startdate", headerName: "Start Date", width: 130, valueGetter: (params) => params.row.startdate ? String(params.row.startdate).slice(0, 10) : "" },
    { field: "enddate", headerName: "End Date", width: 130, valueGetter: (params) => params.row.enddate ? String(params.row.enddate).slice(0, 10) : "" },
    { field: "documents", headerName: "Documents", width: 120, sortable: false, renderCell: () => <Button size="small" onClick={(event) => { event.stopPropagation(); setDocumentDialog(true); }}>Documents</Button> },
    { field: "paperstatus", headerName: "Paper Status", width: 160 },
    { field: "status", headerName: "Moderator Status", width: 170 }
  ];

  const auditColumns = [
    { field: "createdAt", headerName: "Time", width: 190, valueGetter: (params) => params.row.createdAt ? new Date(params.row.createdAt).toLocaleString() : "" },
    { field: "action", headerName: "Action", width: 160 },
    { field: "sectionindex", headerName: "Section", width: 90 },
    { field: "questionindex", headerName: "Question", width: 100 },
    { field: "oldquestion", headerName: "Old Question", minWidth: 220, flex: 1 },
    { field: "newquestion", headerName: "New Question", minWidth: 220, flex: 1 },
    { field: "comments", headerName: "Comments", minWidth: 220, flex: 1 },
    { field: "actorname", headerName: "Actor", width: 160 }
  ];

  return (
    <MenuPageShell title="Moderate Question Paper">
      <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: "#f6f7fb", minHeight: "100vh" }}>
        <Paper elevation={0} sx={{ p: 2.5, mb: 2, border: "1px solid #e5e7eb", borderRadius: 2 }}>
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2}>
            <Box>
              <Typography variant="h5" fontWeight={900}>Moderate Question Paper</Typography>
              <Typography color="text.secondary">Review assigned papers, edit questions and answers, and keep the moderation audit trail.</Typography>
            </Box>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              {selectedModeratorId && locked && (
                <Button variant="contained" color="secondary" startIcon={<PaymentsIcon />} onClick={() => setRemunerationDialogOpen(true)}>
                  Remuneration Bill
                </Button>
              )}
              {selectedModeratorId && (
                <Button
                  variant={isAccepted ? "outlined" : "contained"}
                  color={isAccepted ? "primary" : "warning"}
                  startIcon={<AssignmentTurnedInIcon />}
                  onClick={() => setAcceptanceDialogOpen(true)}
                >
                  {isAccepted ? "View Acceptance" : "Fill Acceptance Form"}
                </Button>
              )}
              <Button variant="outlined" component="label" startIcon={<UploadFileIcon />} disabled={uploadingDoc || locked || !paper}>{uploadingDoc ? "Uploading..." : "Upload Document"}<input hidden type="file" onChange={(e) => uploadDocument(e.target.files?.[0])} /></Button>
              <Button variant="contained" startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />} disabled={saving || locked || !paper} onClick={saveModeration}>{saving ? "Saving..." : "Save"}</Button>
              <Button variant="contained" color="success" startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : <SendIcon />} disabled={submitting || locked || !paper} onClick={submitModeration}>{submitting ? "Submitting..." : "Final Submit"}</Button>
            </Stack>
          </Stack>
          {(loading || saving || moderating || submitting) && <LinearProgress sx={{ mt: 2 }} />}
        </Paper>

        {selectedModeratorId && !isAccepted && (
          <Alert
            severity="warning"
            sx={{ mb: 2 }}
            action={
              <Button color="inherit" size="small" onClick={() => setAcceptanceDialogOpen(true)}>
                Open Form
              </Button>
            }
          >
            <strong>Action Required — Acceptance Form:</strong> You cannot moderate or edit questions until you have submitted the Acceptance Form.
          </Alert>
        )}

        {message && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMessage("")}>{message}</Alert>}
        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}

        <Paper elevation={0} sx={{ p: 2.5, mb: 2, border: "1px solid #e5e7eb", borderRadius: 2 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={3}><TextField select fullWidth label="Academic Year" value={filters.academicyear} onChange={(e) => setFilters({ ...filters, academicyear: e.target.value })}><MenuItem value="">All</MenuItem>{filterOptions.academicyear.map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}</TextField></Grid>
            <Grid item xs={12} md={3}><TextField select fullWidth label="Exam" value={filters.examcode} onChange={(e) => setFilters({ ...filters, examcode: e.target.value })}><MenuItem value="">All</MenuItem>{filterOptions.examcode.map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}</TextField></Grid>
            <Grid item xs={12} md={2}><Button fullWidth variant="contained" disabled={loading} onClick={() => loadPapers()} sx={{ height: 56 }}>{loading ? "Loading..." : "Load Papers"}</Button></Grid>
            <Grid item xs={12} md={4}><TextField select fullWidth label="Assigned Paper" value={selectedModeratorId} onChange={(e) => { setSelectedModeratorId(e.target.value); loadPaper(e.target.value); }}><MenuItem value="">Select</MenuItem>{papers.map((item) => <MenuItem key={item._id} value={item._id}>{paperLabel(item)}</MenuItem>)}</TextField></Grid>
          </Grid>
        </Paper>

        <Paper elevation={0} sx={{ p: 2, mb: 2, border: "1px solid #e5e7eb", borderRadius: 2 }}>
          <Box sx={{ height: 280 }}>
            <DataGrid rows={papers} getRowId={(row) => row._id} columns={paperColumns} loading={loading} slots={{ toolbar: GridToolbar }} slotProps={{ toolbar: { showQuickFilter: true } }} onRowClick={(params) => { setSelectedModeratorId(params.row._id); loadPaper(params.row._id); }} pageSizeOptions={[5, 10, 25]} />
          </Box>
        </Paper>

        {paper && (
          <>
            <Paper elevation={0} sx={{ p: 2.5, mb: 2, border: "1px solid #e5e7eb", borderRadius: 2 }}>
              <Grid container spacing={1.5}>
                {[
                  ["Paper", paperLabel(paper)],
                  ["Exam", `${paper.exam} (${paper.examcode})`],
                  ["Program", `${paper.program} (${paper.programcode})`],
                  ["Subject", paper.subject],
                  ["Semester", paper.semester],
                  ["Paper Setter", `${paper.papersettername} (${paper.papersetteremail})`],
                  ["Moderator", `${moderator?.moderatorname || ""} (${moderator?.moderatoremail || ""})`],
                  ["Moderator Window", `${moderator?.startdate ? String(moderator.startdate).slice(0, 10) : "-"} to ${moderator?.enddate ? String(moderator.enddate).slice(0, 10) : "-"}`],
                  ["Status", paper.status]
                ].map(([label, value]) => <Grid item xs={12} md={3} key={label}><Typography variant="caption" color="text.secondary">{label}</Typography><Typography fontWeight={800}>{value || "-"}</Typography></Grid>)}
                <Grid item xs={12} md={4}><TextField fullWidth label="Document Title" value={supportDocTitle} disabled={locked} onChange={(e) => setSupportDocTitle(e.target.value)} /></Grid>
                <Grid item xs={12} md={8}><Stack direction="row" spacing={1} flexWrap="wrap">{moderationDocuments.map((doc, index) => <Button key={`${doc.url}-${index}`} size="small" href={doc.url} target="_blank" rel="noreferrer">{doc.title || doc.filename || `Document ${index + 1}`}</Button>)}</Stack></Grid>
                {locked && <Grid item xs={12}><Alert severity="info">Moderation is submitted. This paper is locked for editing.</Alert></Grid>}
              </Grid>
            </Paper>

            <Paper elevation={0} sx={{ p: 2.5, mb: 2, border: "1px solid #e5e7eb", borderRadius: 2 }}>
              <Typography variant="h6" fontWeight={900} sx={{ mb: 2 }}>Gemini Moderation</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={3}><TextField select fullWidth label="Gemini Model" value={geminiModel} onChange={(e) => setGeminiModel(e.target.value)}>{geminiModels.map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}</TextField></Grid>
                <Grid item xs={12} md={7}><TextField fullWidth multiline minRows={3} label="Moderation rules" value={rules} onChange={(e) => setRules(e.target.value)} placeholder="Example: Verify clarity, avoid out-of-syllabus questions, ensure marks match difficulty, and improve answer quality." /></Grid>
                <Grid item xs={12} md={2}><Button fullWidth variant="outlined" startIcon={moderating ? <CircularProgress size={18} /> : <AutoFixHighIcon />} disabled={moderating || locked || !selectedQuestionKeys.length} onClick={runGeminiModeration} sx={{ height: 92 }}>{moderating ? "Checking..." : "AI Moderate"}</Button></Grid>
                <Grid item xs={12}><TextField fullWidth label="Moderator comments" value={comments} onChange={(e) => setComments(e.target.value)} /></Grid>
              </Grid>
            </Paper>

            <Stack spacing={2}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Chip label={`${selectedQuestionKeys.length} selected`} color={selectedQuestionKeys.length ? "primary" : "default"} />
                <Button size="small" onClick={() => setSelectedQuestionKeys([])}>Clear Selection</Button>
              </Stack>
              {sections.map((section, sectionIndex) => (
                <Card key={section._id || sectionIndex} variant="outlined" sx={{ borderRadius: 2 }}>
                  <CardContent>
                    <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1} sx={{ mb: 2 }}>
                      <Box>
                        <Typography variant="h6" fontWeight={900}>{section.title || `Section ${sectionIndex + 1}`}</Typography>
                        {section.instructions && <Typography color="text.secondary">{section.instructions}</Typography>}
                      </Box>
                      <Chip label={`Marks: ${section.marks || 0}`} />
                    </Stack>
                    <Stack spacing={2}>
                      {(section.questions || []).map((question, questionIndex) => {
                        const selected = selectedQuestionKeys.includes(keyFor(sectionIndex, questionIndex));
                        return (
                          <Paper key={question._id || questionIndex} variant="outlined" sx={{ p: 2, bgcolor: selected ? "#eef6ff" : "#fbfdff" }}>
                            <Grid container spacing={2}>
                              <Grid item xs={12} md={1}>
                                <Checkbox checked={selected} disabled={locked} onChange={() => toggleQuestion(sectionIndex, questionIndex)} />
                              </Grid>
                              <Grid item xs={12} md={11}>
                                <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 1 }}>
                                  <Chip size="small" label={`Q${questionIndex + 1}`} />
                                  <Chip size="small" label={`${question.marks || 0} marks`} />
                                  <Chip size="small" label={question.questiontype || "Question"} />
                                  <Chip size="small" label={`CO: ${question.conumber || question.co || "-"}`} />
                                  <Chip size="small" label={`Bloom: ${(question.bloomlevels || []).join(", ") || "-"}`} />
                                </Stack>
                              </Grid>
                              <Grid item xs={12}><TextField fullWidth multiline minRows={3} label="Question" value={question.question || ""} disabled={locked} onChange={(e) => updateQuestion(sectionIndex, questionIndex, { question: e.target.value })} /></Grid>
                              <Grid item xs={12}><TextField fullWidth multiline minRows={3} label="Answer" value={question.answer || ""} disabled={locked} onChange={(e) => updateQuestion(sectionIndex, questionIndex, { answer: e.target.value })} /></Grid>
                              <Grid item xs={12} md={3}><TextField fullWidth label="CO Number" value={question.conumber || ""} disabled={locked} onChange={(e) => updateQuestion(sectionIndex, questionIndex, { conumber: e.target.value })} /></Grid>
                              <Grid item xs={12} md={5}><TextField fullWidth label="CO" value={question.co || ""} disabled={locked} onChange={(e) => updateQuestion(sectionIndex, questionIndex, { co: e.target.value })} /></Grid>
                              <Grid item xs={12} md={4}><TextField fullWidth label="Bloom Levels" value={(question.bloomlevels || []).join(", ")} disabled={locked} onChange={(e) => updateQuestion(sectionIndex, questionIndex, { bloomlevels: e.target.value.split(",").map((item) => item.trim()).filter(Boolean) })} /></Grid>
                              {question.aimappingcomments && <Grid item xs={12}><Alert severity="info">{question.aimappingcomments}</Alert></Grid>}
                            </Grid>
                          </Paper>
                        );
                      })}
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Stack>

            <Paper elevation={0} sx={{ p: 2, mt: 2, border: "1px solid #e5e7eb", borderRadius: 2 }}>
              <Typography variant="h6" fontWeight={900} sx={{ mb: 2 }}>Audit Trail</Typography>
              <Box sx={{ height: 420 }}>
                <DataGrid rows={audit} getRowId={(row) => row._id} columns={auditColumns} slots={{ toolbar: GridToolbar }} slotProps={{ toolbar: { showQuickFilter: true, csvOptions: { fileName: "moderation_audit" } } }} pageSizeOptions={[10, 25, 50]} />
              </Box>
            </Paper>
          </>
        )}
        <Dialog open={documentDialog} onClose={() => setDocumentDialog(false)} maxWidth="md" fullWidth>
          <DialogTitle>Paper Documents</DialogTitle>
          <DialogContent>
            <Stack spacing={1} sx={{ pt: 1 }}>
              {[...(moderator?.admindocuments || []), ...(paper?.paperdocuments || []), ...(paper?.moderationdocuments || [])].map((doc, index) => <Button key={`${doc.url}-${index}`} href={doc.url} target="_blank" rel="noreferrer" variant="outlined">{doc.title || doc.filename || `Document ${index + 1}`}</Button>)}
              {!moderator?.admindocuments?.length && !paper?.paperdocuments?.length && !paper?.moderationdocuments?.length && <Typography color="text.secondary">No documents uploaded.</Typography>}
            </Stack>
          </DialogContent>
        </Dialog>

        <ExamAcceptanceDialog
          open={acceptanceDialogOpen}
          onClose={() => setAcceptanceDialogOpen(false)}
          role="moderator"
          apiPrefix="/api/v2/conductexam2"
          assignment={moderator || selectedPaper}
          userProfile={userProfile}
          institution={institution}
          onAccepted={async () => {
            setAcceptanceDialogOpen(false);
            setMessage("Acceptance Form submitted successfully! You may now moderate questions.");
            await loadPaper(selectedModeratorId);
            await loadPapers();
          }}
        />

        <ExamDeclarationDialog
          open={declarationDialogOpen}
          onClose={() => setDeclarationDialogOpen(false)}
          role="moderator"
          assignment={moderator || selectedPaper}
          userProfile={userProfile}
          institution={institution}
          onSubmitDeclaration={executeSubmitModeration}
          submitting={submitting}
        />

        <ExamRemunerationBillDialog
          open={remunerationDialogOpen}
          onClose={() => setRemunerationDialogOpen(false)}
          role="moderator"
          apiPrefix="/api/v2/conductexam2"
          assignmentId={selectedModeratorId}
        />
      </Box>
    </MenuPageShell>
  );
}
