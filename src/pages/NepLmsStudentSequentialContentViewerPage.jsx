import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Divider,
  FormControl,
  Grid,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Stack,
  Tab,
  Tabs,
  Typography
} from "@mui/material";
import { CheckCircle, Dashboard, ExpandMore, Lock, Logout, PlayArrow, Refresh } from "@mui/icons-material";
import ep1 from "../api/ep1";
import global1 from "./global1";
import {
  completeStudentSequentialContent,
  groupSequentialContent,
  loadStudentSequentialContent
} from "../utils/nepLmsSequentialContentTools";

const uniqueSorted = (values = []) => [...new Set(values.map((item) => String(item || "").trim()).filter(Boolean))]
  .sort((a, b) => a.localeCompare(b));

const getYouTubeId = (url = "") => {
  const value = String(url || "");
  const patterns = [
    /youtu\.be\/([^?&#/]+)/i,
    /youtube\.com\/watch\?[^#]*v=([^?&#]+)/i,
    /youtube\.com\/embed\/([^?&#/]+)/i,
    /youtube\.com\/shorts\/([^?&#/]+)/i
  ];
  for (const pattern of patterns) {
    const match = value.match(pattern);
    if (match?.[1]) return match[1];
  }
  return "";
};

const mediaKind = (url = "", mimetype = "") => {
  const value = String(url || "");
  const mime = String(mimetype || "").toLowerCase();
  if (getYouTubeId(value)) return "youtube";
  if (mime.includes("video") || /\.(mp4|webm|ogg|mov)(\?|$)/i.test(value)) return "video";
  if (mime.includes("image") || /\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(value)) return "image";
  return "frame";
};

export default function NepLmsStudentSequentialContentViewerPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [student, setStudent] = useState(null);
  const [courses, setCourses] = useState([]);
  const [filters, setFilters] = useState({ academicyear: "", semester: "" });
  const [courseId, setCourseId] = useState("");
  const [lessonContent, setLessonContent] = useState([]);
  const [activeQuizzes, setActiveQuizzes] = useState([]);
  const [quizAttempts, setQuizAttempts] = useState([]);
  const [sequenceTab, setSequenceTab] = useState(0);
  const [selectedSequenceId, setSelectedSequenceId] = useState("");
  const [expandedSection, setExpandedSection] = useState("");
  const [selectedContentId, setSelectedContentId] = useState("");
  const [quizAnswers, setQuizAnswers] = useState({});
  const [flippedCards, setFlippedCards] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const selectedCourse = useMemo(() => courses.find((row) => row._id === courseId) || null, [courses, courseId]);
  const years = useMemo(() => uniqueSorted(courses.map((row) => row.academicyear)), [courses]);
  const semesters = useMemo(() => uniqueSorted(courses.filter((row) => !filters.academicyear || row.academicyear === filters.academicyear).map((row) => row.semester)), [courses, filters.academicyear]);
  const filteredCourses = useMemo(() => courses.filter((row) => (
    (!filters.academicyear || row.academicyear === filters.academicyear)
    && (!filters.semester || row.semester === filters.semester)
  )), [courses, filters]);

  const sequences = useMemo(() => {
    return groupSequentialContent(lessonContent);
  }, [lessonContent]);

  const selectedContent = useMemo(
    () => lessonContent.find((row) => String(row._id) === String(selectedContentId)) || null,
    [lessonContent, selectedContentId]
  );

  const pendingSequences = useMemo(
    () => sequences.filter((sequence) => sequence.status.key !== "completed"),
    [sequences]
  );

  const completedSequences = useMemo(
    () => sequences.filter((sequence) => sequence.status.key === "completed"),
    [sequences]
  );

  const visibleSequences = sequenceTab === 0 ? pendingSequences : completedSequences;

  const selectedSequence = useMemo(
    () => sequences.find((sequence) => String(sequence.id) === String(selectedSequenceId)) || null,
    [sequences, selectedSequenceId]
  );

  const selectedSequenceSections = useMemo(() => {
    if (!selectedSequence) return [];
    const map = new Map();
    selectedSequence.rows.forEach((item) => {
      const key = String(item.section || "General").trim() || "General";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(item);
    });
    return [...map.entries()].map(([section, rows]) => ({ section, rows }));
  }, [selectedSequence]);

  const selectedQuiz = useMemo(() => {
    if (!selectedContent?.quizid) return null;
    return activeQuizzes.find((quiz) => String(quiz._id) === String(selectedContent.quizid)) || null;
  }, [activeQuizzes, selectedContent]);

  const selectedQuizAttempt = useMemo(() => {
    if (!selectedContent?.quizid) return null;
    return quizAttempts.find((attempt) => String(attempt.quizid) === String(selectedContent.quizid)) || null;
  }, [quizAttempts, selectedContent]);

  const baseParams = (extra = {}) => ({
    colid: global1.colid,
    regno: global1.regno,
    user: global1.user,
    ...extra
  });

  useEffect(() => {
    loadCourses();
  }, []);

  useEffect(() => {
    if (selectedCourse) loadCourseContent(selectedCourse);
    else {
      setLessonContent([]);
      setActiveQuizzes([]);
      setQuizAttempts([]);
      setSelectedContentId("");
      setSelectedSequenceId("");
    }
  }, [courseId]);

  useEffect(() => {
    if (selectedContent) setExpandedSection(String(selectedContent.section || "General").trim() || "General");
  }, [selectedContent?._id]);

  const loadCourses = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await ep1.get("/api/v2/neplms/student-workspace/courses", { params: baseParams() });
      const nextCourses = res.data?.courses || [];
      const nextStudent = res.data?.student || null;
      setStudent(nextStudent);
      setCourses(nextCourses);
      const requestedCourseId = searchParams.get("courseid") || "";
      const requestedCourseCode = searchParams.get("coursecode") || "";
      const defaultYear = nextStudent?.academicyear || uniqueSorted(nextCourses.map((row) => row.academicyear))[0] || "";
      const defaultSemester = nextStudent?.semester || uniqueSorted(nextCourses.filter((row) => !defaultYear || row.academicyear === defaultYear).map((row) => row.semester))[0] || "";
      const requestedCourse = nextCourses.find((row) => (
        (requestedCourseId && String(row._id) === requestedCourseId)
        || (requestedCourseCode && String(row.coursecode || "").toLowerCase() === requestedCourseCode.toLowerCase())
      ));
      const defaultCourse = requestedCourse || nextCourses.find((row) => (!defaultYear || row.academicyear === defaultYear) && (!defaultSemester || row.semester === defaultSemester)) || nextCourses[0];
      setFilters({ academicyear: defaultYear, semester: defaultSemester });
      setCourseId(defaultCourse?._id || "");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load student courses");
    } finally {
      setLoading(false);
    }
  };

  const loadCourseContent = async (course = selectedCourse) => {
    if (!course) return;
    try {
      setLoading(true);
      setError("");
      const params = baseParams({
        academicyear: course.academicyear,
        semester: course.semester,
        coursecode: course.coursecode
      });
      const [contentRows, quizRes] = await Promise.all([
        loadStudentSequentialContent(params),
        ep1.get("/api/v2/neplms/student-workspace/active-quizzes", { params })
      ]);
      setLessonContent(contentRows);
      setActiveQuizzes(quizRes.data?.data || []);
      setQuizAttempts(quizRes.data?.attempts || []);
      const requestedContentId = searchParams.get("contentid") || "";
      const nextSelected = contentRows.find((row) => String(row._id) === String(requestedContentId))
        || contentRows.find((row) => !row.completed && !row.locked)
        || contentRows[0];
      setSelectedContentId(nextSelected?._id || "");
      setSelectedSequenceId(nextSelected ? String(nextSelected.lessonresourceid || "general") : "");
      setExpandedSection(nextSelected ? (String(nextSelected.section || "General").trim() || "General") : "");
      const selectedSequenceRows = contentRows.filter((row) => String(row.lessonresourceid || "general") === String(nextSelected?.lessonresourceid || "general"));
      setSequenceTab(nextSelected && selectedSequenceRows.length && selectedSequenceRows.every((row) => row.completed) ? 1 : 0);
      setQuizAnswers({});
    } catch (err) {
      setLessonContent([]);
      setActiveQuizzes([]);
      setQuizAttempts([]);
      setSelectedSequenceId("");
      setError(err.response?.data?.message || "Unable to load sequential content");
    } finally {
      setLoading(false);
    }
  };

  const updateFilter = (field, value) => {
    const nextFilters = { ...filters, [field]: value };
    if (field === "academicyear") {
      nextFilters.semester = uniqueSorted(courses.filter((row) => row.academicyear === value).map((row) => row.semester))[0] || "";
    }
    setFilters(nextFilters);
    const nextCourse = courses.find((row) => (
      (!nextFilters.academicyear || row.academicyear === nextFilters.academicyear)
      && (!nextFilters.semester || row.semester === nextFilters.semester)
    ));
    setCourseId(nextCourse?._id || "");
  };

  const selectSequence = (sequence) => {
    setSelectedSequenceId(sequence.id);
    const nextContent = sequence.rows.find((row) => !row.completed && !row.locked) || sequence.rows[0];
    setSelectedContentId(nextContent?._id || "");
    setExpandedSection(nextContent ? (String(nextContent.section || "General").trim() || "General") : "");
    setQuizAnswers({});
  };

  const completeContent = async (content = selectedContent) => {
    if (!content?._id) return;
    try {
      setSubmitting(true);
      setError("");
      setMessage("");
      const res = await completeStudentSequentialContent({
        colid: global1.colid,
        regno: global1.regno,
        user: global1.user,
        contentid: content._id
      });
      const progress = res?.progress;
      setMessage(progress
        ? `Step completed. Progress: ${progress.completedsteps}/${progress.totalsteps} (${progress.progresspercentage}%).`
        : "Content marked completed.");
      await loadCourseContent();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to mark content completed");
    } finally {
      setSubmitting(false);
    }
  };

  const updateQuizAnswer = (questionId, optionText, checked) => {
    setQuizAnswers((prev) => {
      const current = new Set(prev[questionId] || []);
      if (checked) current.add(optionText);
      else current.delete(optionText);
      return { ...prev, [questionId]: [...current] };
    });
  };

  const submitQuiz = async () => {
    if (!selectedQuiz) return setError("Linked quiz is not active now or already submitted.");
    try {
      setSubmitting(true);
      setError("");
      setMessage("");
      const answers = [];
      (selectedQuiz.sections || []).forEach((section) => {
        (section.questions || []).forEach((question) => {
          answers.push({ questionid: question._id, selectedoptions: quizAnswers[question._id] || [] });
        });
      });
      await ep1.post("/api/v2/neplms/student-workspace/quiz-submit", {
        colid: global1.colid,
        regno: global1.regno,
        user: global1.user,
        quizid: selectedQuiz._id,
        answers
      });
      setQuizAnswers({});
      setMessage("Quiz submitted successfully. Marking this sequence step complete.");
      await completeContent(selectedContent);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to submit quiz");
    } finally {
      setSubmitting(false);
    }
  };

  const renderSelect = (label, value, onChange, options) => (
    <FormControl fullWidth size="small">
      <InputLabel>{label}</InputLabel>
      <Select
        label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        size="small"
        sx={{
          bgcolor: "#fff",
          ".MuiSelect-select": { py: 0.85, fontSize: 13 }
        }}
      >
        {options.map((option) => (
          <MenuItem key={option.value || option} value={option.value || option} dense>
            {option.label || option}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );

  const renderSequenceSelect = () => {
    const activeValue = visibleSequences.some((sequence) => String(sequence.id) === String(selectedSequenceId)) ? selectedSequenceId : "";
    return (
      <FormControl fullWidth size="small">
        <InputLabel>Sequence</InputLabel>
        <Select
          label="Sequence"
          value={activeValue}
          onChange={(event) => {
            const sequence = visibleSequences.find((item) => String(item.id) === String(event.target.value));
            if (sequence) selectSequence(sequence);
          }}
          displayEmpty={false}
          renderValue={(value) => {
            const sequence = visibleSequences.find((item) => String(item.id) === String(value));
            return sequence ? sequence.title : "";
          }}
          MenuProps={{
            PaperProps: {
              sx: { maxHeight: 420, maxWidth: 520 }
            }
          }}
          sx={{
            bgcolor: "#fff",
            ".MuiSelect-select": {
              py: 0.85,
              fontSize: 13,
              whiteSpace: "normal",
              lineHeight: 1.35,
              minHeight: 22
            }
          }}
        >
          {visibleSequences.map((sequence) => (
            <MenuItem
              key={sequence.id}
              value={sequence.id}
              sx={{
                alignItems: "flex-start",
                whiteSpace: "normal",
                py: 1,
                pr: 1.5
              }}
            >
              <Stack spacing={0.35} sx={{ width: "100%", minWidth: 0 }}>
                <Stack direction="row" spacing={1} alignItems="flex-start" justifyContent="space-between">
                  <Typography variant="body2" fontWeight={900} sx={{ whiteSpace: "normal", wordBreak: "break-word", lineHeight: 1.35 }}>
                    {sequence.title}
                  </Typography>
                  <Chip size="small" color={sequence.status.color} label={sequence.status.label} sx={{ flexShrink: 0 }} />
                </Stack>
                <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: "normal", wordBreak: "break-word", lineHeight: 1.3 }}>
                  {sequence.topic || sequence.module || "Sequential unit"}
                </Typography>
              </Stack>
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    );
  };

  const renderTextContent = () => {
    const body = String(selectedContent?.textcontent || selectedContent?.description || selectedContent?.content || "").trim();
    const htmlLike = /<\/?[a-z][\s\S]*>/i.test(body);
    return (
      <Box sx={{ width: "100%", height: "100%", overflow: "hidden", bgcolor: "#111827", p: 2, boxSizing: "border-box" }}>
        <Paper sx={{ maxWidth: 980, height: "100%", mx: "auto", p: 2.25, bgcolor: "#fff", color: "#111827", borderRadius: 1.5, boxSizing: "border-box", overflow: "hidden" }}>
          <Stack spacing={1.25} sx={{ height: "100%", minHeight: 0 }}>
            <Box>
              <Typography variant="h6" fontWeight={950}>{selectedContent?.title || "Text content"}</Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                {selectedContent?.module && <Chip size="small" label={selectedContent.module} />}
                {selectedContent?.topics && <Chip size="small" label={selectedContent.topics} />}
              </Stack>
            </Box>
            {body ? (
              htmlLike
                ? <Box sx={{ flex: 1, minHeight: 0, overflow: "hidden", fontSize: 13, lineHeight: 1.5, "& p": { mt: 0, mb: 1 }, "& *": { maxWidth: "100%" } }} dangerouslySetInnerHTML={{ __html: body }} />
                : <Typography component="div" sx={{ flex: 1, minHeight: 0, overflow: "hidden", whiteSpace: "pre-wrap", fontSize: 13, lineHeight: 1.5 }}>{body}</Typography>
            ) : (
              <Alert severity="info">No text has been added for this content.</Alert>
            )}
          </Stack>
        </Paper>
      </Box>
    );
  };

  const renderMedia = (url, mimetype = "", title = "Sequential content") => {
    if (!url) return <Alert severity="info">No file, link, or video is attached for this content.</Alert>;
    const kind = mediaKind(url, mimetype);
    if (kind === "youtube") {
      return (
        <Box
          component="iframe"
          title={title}
          src={`https://www.youtube.com/embed/${getYouTubeId(url)}?rel=0&modestbranding=1`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          sx={{ width: "100%", height: "100%", border: 0, bgcolor: "#000" }}
        />
      );
    }
    if (kind === "video") {
      return <Box component="video" src={url} controls controlsList="nodownload noplaybackrate" sx={{ width: "100%", height: "100%", bgcolor: "#000" }} />;
    }
    if (kind === "image") {
      return <Box component="img" src={url} alt={title} sx={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />;
    }
    return <Box component="iframe" title={title} src={url} sx={{ width: "100%", height: "100%", border: 0, bgcolor: "#fff" }} />;
  };

  const renderQuiz = () => {
    if (selectedQuizAttempt) {
      return (
        <Stack spacing={2} sx={{ p: 3 }}>
          <Alert severity="success">This quiz has already been submitted.</Alert>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip color="success" label={`Marks: ${selectedQuizAttempt.obtainedmarks || 0}/${selectedQuizAttempt.totalmarks || 0}`} />
            <Chip label={`Submitted: ${selectedQuizAttempt.submitteddate ? new Date(selectedQuizAttempt.submitteddate).toLocaleString() : "-"}`} />
          </Stack>
          {!selectedContent?.completed && (
            <Button variant="contained" disabled={submitting} onClick={() => completeContent(selectedContent)}>Mark sequence step complete</Button>
          )}
        </Stack>
      );
    }
    if (!selectedQuiz) {
      return (
        <Stack spacing={2} sx={{ p: 3 }}>
          <Alert severity="warning">Linked quiz is not active now, or it is no longer available for submission.</Alert>
          <Typography variant="body2" color="text.secondary">Quiz: {selectedContent?.quiztitle || "Linked quiz"}</Typography>
        </Stack>
      );
    }
    return (
      <Box sx={{ p: 3, overflow: "auto", height: "100%", bgcolor: "#fff" }}>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
          <Chip color="primary" label={`Quiz: ${selectedQuiz.title}`} />
          <Chip label={`Ends: ${selectedQuiz.enddatetime ? new Date(selectedQuiz.enddatetime).toLocaleString() : "-"}`} />
        </Stack>
        {(selectedQuiz.sections || []).map((section) => (
          <Paper key={section._id} variant="outlined" sx={{ p: 2, mb: 2 }}>
            <Typography fontWeight={900} sx={{ mb: 1 }}>{section.title}</Typography>
            {(section.questions || []).map((question, index) => (
              <Box key={question._id} sx={{ p: 1.5, mb: 1, bgcolor: "#f8fafc", borderRadius: 1 }}>
                <Typography variant="body2" fontWeight={800} sx={{ mb: 1 }}>
                  Q{index + 1}. {question.question} ({question.score || 0} marks)
                </Typography>
                {question.imageLink && <Box component="img" src={question.imageLink} alt="Question" sx={{ maxWidth: 360, maxHeight: 240, objectFit: "contain", mb: 1 }} />}
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
                  {question.fileLink && <Button size="small" variant="outlined" href={question.fileLink} target="_blank" rel="noreferrer">Open file</Button>}
                  {question.videoLink && <Button size="small" variant="outlined" href={question.videoLink} target="_blank" rel="noreferrer">Open video</Button>}
                </Stack>
                <Grid container spacing={1}>
                  {(question.options || []).map((option) => (
                    <Grid item xs={12} md={6} key={`${question._id}-${option.text}`}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Checkbox
                          checked={(quizAnswers[question._id] || []).includes(option.text)}
                          onChange={(event) => updateQuizAnswer(question._id, option.text, event.target.checked)}
                        />
                        <Typography variant="body2">{option.text}</Typography>
                      </Stack>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            ))}
          </Paper>
        ))}
        <Button variant="contained" disabled={submitting || selectedContent?.locked} onClick={submitQuiz}>Submit quiz</Button>
      </Box>
    );
  };

  const renderFlashCards = () => (
    <Grid container spacing={2} sx={{ p: 3, overflow: "auto", height: "100%", alignContent: "flex-start" }}>
      {(selectedContent?.flashcards || []).map((card, index) => {
        const key = `${selectedContent?._id}-${card?._id || index}`;
        const flipped = Boolean(flippedCards[key]);
        return (
          <Grid item xs={12} md={6} key={key}>
            <Box onClick={() => setFlippedCards((prev) => ({ ...prev, [key]: !prev[key] }))} sx={{ perspective: "1200px", cursor: "pointer" }}>
              <Box sx={{ position: "relative", minHeight: 240, transformStyle: "preserve-3d", transition: "transform 0.6s ease", transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)" }}>
                <Paper sx={{ position: "absolute", inset: 0, p: 2, backfaceVisibility: "hidden", borderRadius: 2, border: "1px solid #bfdbfe", bgcolor: "#eff6ff" }}>
                  <Chip size="small" color="primary" label={`Card ${index + 1}`} sx={{ mb: 1 }} />
                  <Typography variant="overline">Question</Typography>
                  <Typography fontWeight={900}>{card.question}</Typography>
                  {card.questionimage && <Box component="img" src={card.questionimage} alt="Flash card" sx={{ maxWidth: "100%", maxHeight: 120, objectFit: "contain", mt: 1 }} />}
                </Paper>
                <Paper sx={{ position: "absolute", inset: 0, p: 2, backfaceVisibility: "hidden", transform: "rotateY(180deg)", borderRadius: 2, border: "1px solid #bbf7d0", bgcolor: "#f0fdf4" }}>
                  <Chip size="small" color="success" label={`Card ${index + 1}`} sx={{ mb: 1 }} />
                  <Typography variant="overline">Answer</Typography>
                  <Typography fontWeight={900}>{card.answer}</Typography>
                </Paper>
              </Box>
            </Box>
          </Grid>
        );
      })}
      {!selectedContent?.flashcards?.length && <Grid item xs={12}><Alert severity="info">No flash cards attached.</Alert></Grid>}
    </Grid>
  );

  const renderLeftContent = () => {
    if (!selectedContent) {
      return <Stack alignItems="center" justifyContent="center" sx={{ height: "100%", color: "grey.500" }}><Typography variant="h5" fontWeight={900}>Select sequential content</Typography></Stack>;
    }
    if (selectedContent.locked) {
      return <Stack alignItems="center" justifyContent="center" sx={{ height: "100%", p: 3 }}><Alert severity="info">Complete the previous task in this sequence to unlock this content.</Alert></Stack>;
    }
    if (selectedContent.contenttype === "Quiz") return renderQuiz();
    if (selectedContent.contenttype === "Flash Card") return renderFlashCards();
    if (selectedContent.contenttype === "Text" && !selectedContent.filelink) return renderTextContent();
    if (selectedContent.contenttype === "Video Link") return renderMedia(selectedContent.videolink, selectedContent.mimetype, selectedContent.title);
    return renderMedia(selectedContent.filelink, selectedContent.mimetype, selectedContent.title);
  };

  const canComplete = selectedContent && !selectedContent.locked && !selectedContent.completed && selectedContent.contenttype !== "Quiz";

  return (
    <Box sx={{ height: "100vh", bgcolor: "#eef3f8", overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <Paper square elevation={0} sx={{ px: 2.5, py: 1.25, bgcolor: "#0f172a", color: "#fff" }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h6" fontWeight={950} noWrap>Sequential Content Viewer</Typography>
            <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.72)" }} noWrap>{student?.name || global1.name} {student?.regno ? `| ${student.regno}` : ""}</Typography>
          </Box>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ flex: 1, maxWidth: 720 }}>
            <Box sx={{ width: 165 }}>{renderSelect("Academic Year", filters.academicyear, (value) => updateFilter("academicyear", value), years)}</Box>
            <Box sx={{ width: 130 }}>{renderSelect("Semester", filters.semester, (value) => updateFilter("semester", value), semesters)}</Box>
            <Box sx={{ flex: 1, minWidth: 220 }}>{renderSelect("Course", courseId, setCourseId, filteredCourses.map((course) => ({
              value: course._id,
              label: `${course.coursecode} - ${course.course}`
            })))}</Box>
          </Stack>
          <Stack direction="row" spacing={1}>
            <Button color="inherit" variant="outlined" startIcon={<Refresh />} onClick={loadCourses} sx={{ borderColor: "rgba(255,255,255,0.35)" }}>Refresh</Button>
            <Button color="inherit" variant="outlined" startIcon={<Dashboard />} onClick={() => navigate("/studentdashboard")} sx={{ borderColor: "rgba(255,255,255,0.35)" }}>Home</Button>
            <Button color="inherit" variant="outlined" startIcon={<Logout />} onClick={() => { localStorage.clear(); window.location.href = "/"; }} sx={{ borderColor: "rgba(255,255,255,0.35)" }}>Logout</Button>
          </Stack>
        </Stack>
      </Paper>
      {loading && <LinearProgress />}
      <Box sx={{ flex: 1, minHeight: 0, display: "flex", gap: 1.5, p: 1.5, boxSizing: "border-box" }}>
        <Paper sx={{ width: "76%", minWidth: 0, overflow: "hidden", borderRadius: 2, display: "flex", flexDirection: "column" }}>
          <Box sx={{ px: 2, py: 1.25, borderBottom: "1px solid", borderColor: "divider", bgcolor: "#fff" }}>
            <Stack direction="row" spacing={1.5} alignItems="flex-start" justifyContent="space-between">
              <Box sx={{ minWidth: 0 }}>
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                  <Typography fontWeight={950}>{selectedContent?.title || "Sequential content"}</Typography>
                  {selectedContent?.contenttype && <Chip size="small" color="primary" label={selectedContent.contenttype} />}
                  {selectedContent?.completed && <Chip size="small" color="success" icon={<CheckCircle fontSize="small" />} label="Completed" />}
                  {selectedContent?.locked && <Chip size="small" icon={<Lock fontSize="small" />} label="Locked" />}
                </Stack>
                {selectedContent?.description && <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{selectedContent.description}</Typography>}
              </Box>
              {selectedContent && selectedContent.contenttype !== "Quiz" && (
                <Button
                  variant="contained"
                  disabled={!canComplete || submitting}
                  onClick={() => completeContent(selectedContent)}
                  sx={{ flexShrink: 0, whiteSpace: "nowrap" }}
                >
                  {selectedContent?.completed ? "Completed" : "Mark this step complete"}
                </Button>
              )}
            </Stack>
          </Box>
          {(error || message) && (
            <Box sx={{ p: 1.5, pb: 0 }}>
              {error && <Alert severity="error" onClose={() => setError("")}>{error}</Alert>}
              {message && <Alert severity="success" onClose={() => setMessage("")}>{message}</Alert>}
            </Box>
          )}
          <Box sx={{ flex: 1, minHeight: 0, bgcolor: "#111827", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {renderLeftContent()}
          </Box>
        </Paper>

        <Paper sx={{ width: "24%", minWidth: 330, borderRadius: 2, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <Box sx={{ p: 1, borderBottom: "1px solid", borderColor: "divider" }}>
            <Typography fontWeight={950}>Title and content list</Typography>
          </Box>
          <Box sx={{ overflow: "auto", flex: 1, p: 1.5 }}>
            <Stack spacing={1.5}>
              <Tabs
                value={sequenceTab}
                onChange={(_, value) => {
                  setSequenceTab(value);
                  setSelectedSequenceId("");
                  setSelectedContentId("");
                }}
                variant="fullWidth"
                sx={{ minHeight: 38, "& .MuiTab-root": { minHeight: 38, py: 0.6, fontSize: 12, fontWeight: 900 } }}
              >
                <Tab label={`Pending (${pendingSequences.length})`} />
                <Tab label={`Completed (${completedSequences.length})`} />
              </Tabs>
              {visibleSequences.length ? renderSequenceSelect() : <Alert severity="info">{sequenceTab === 0 ? "No pending sequences." : "No completed sequences."}</Alert>}
              {selectedSequence && (
                <>
                  <Divider />
                  <Box>
                    <Typography variant="body2" fontWeight={950} sx={{ mb: 1 }}>Sequence content</Typography>
                    <Stack spacing={1}>
                      {selectedSequenceSections.map((group) => (
                        <Accordion
                          key={group.section}
                          disableGutters
                          expanded={expandedSection === group.section}
                          onChange={(_, expanded) => setExpandedSection(expanded ? group.section : "")}
                          sx={{ border: "1px solid", borderColor: "divider", boxShadow: "none", "&:before": { display: "none" } }}
                        >
                          <AccordionSummary expandIcon={<ExpandMore />}>
                            <Typography variant="body2" fontWeight={950} sx={{ wordBreak: "break-word" }}>{group.section}</Typography>
                            <Chip size="small" label={group.rows.length} sx={{ ml: 1 }} />
                          </AccordionSummary>
                          <AccordionDetails sx={{ p: 1, pt: 0 }}>
                            <Stack spacing={0.8}>
                              {group.rows.map((item) => {
                                const active = String(item._id) === String(selectedContentId);
                                return (
                                  <Box
                                    key={item._id}
                                    onClick={() => {
                                      setSelectedContentId(item._id);
                                      setQuizAnswers({});
                                    }}
                                    sx={{
                                      p: 1.1,
                                      cursor: "pointer",
                                      borderBottom: "1px solid",
                                      borderColor: "divider",
                                      bgcolor: active ? "#eff6ff" : "#fff",
                                      "&:hover": { bgcolor: active ? "#eff6ff" : "#f9fafb" }
                                    }}
                                  >
                                    <Stack direction="row" spacing={1} alignItems="flex-start">
                                      {item.completed ? <CheckCircle color="success" fontSize="small" /> : item.locked ? <Lock color="disabled" fontSize="small" /> : <PlayArrow color="primary" fontSize="small" />}
                                      <Box sx={{ minWidth: 0, flex: 1 }}>
                                        <Typography variant="body2" fontWeight={900}>{item.sequence ? `${item.sequence}. ` : ""}{item.title || "Content"}</Typography>
                                        <Typography variant="caption" color="text.secondary">{item.contenttype || "Content"}</Typography>
                                      </Box>
                                    </Stack>
                                  </Box>
                                );
                              })}
                            </Stack>
                          </AccordionDetails>
                        </Accordion>
                      ))}
                    </Stack>
                  </Box>
                </>
              )}
              {!sequences.length && <Alert severity="info">No sequential content uploaded for this course.</Alert>}
            </Stack>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
}
