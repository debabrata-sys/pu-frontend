import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  FormControl,
  Grid,
  InputLabel,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import DownloadIcon from "@mui/icons-material/Download";
import RefreshIcon from "@mui/icons-material/Refresh";
import SlideshowIcon from "@mui/icons-material/Slideshow";
import MenuPageShell from "./MenuPageShell";
import ep1 from "../api/ep1";
import global1 from "./global1";

const text = (value) => String(value || "").trim();
const uniq = (items) => Array.from(new Set(items.map(text).filter(Boolean))).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
const geminiModels = ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.0-flash", "gemini-2.0-flash-lite"];
const languages = [
  "English",
  "Hindi",
  "Bengali",
  "Telugu",
  "Marathi",
  "Tamil",
  "Urdu",
  "Gujarati",
  "Kannada",
  "Malayalam",
  "Odia",
  "Punjabi",
  "Assamese",
  "Maithili",
  "Santali",
  "Kashmiri",
  "Nepali",
  "Konkani",
  "Sindhi",
  "Dogri",
  "Manipuri",
  "Bodo",
  "Sanskrit",
  "French",
  "Spanish",
  "German",
  "Italian"
];

const optionLabel = (course) => course
  ? `${course.academicyear || ""} | Sem ${course.semester || ""} | ${course.course || ""} (${course.coursecode || ""}) | ${course.programcode || ""}`
  : "";

export default function NepLmsCreatePptPage() {
  const [courses, setCourses] = useState([]);
  const [syllabusRows, setSyllabusRows] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [filters, setFilters] = useState({ academicyear: "", semester: "" });
  const [selectedModules, setSelectedModules] = useState([]);
  const [selectedTopics, setSelectedTopics] = useState([]);
  const [form, setForm] = useState({
    title: "",
    order: "",
    language: "English",
    difficulty: "Medium",
    provider: "Gemini",
    geminiModel: "gemini-2.5-flash",
    ollamaConfigId: "",
    additionalprompt: ""
  });
  const [ollamaConfigs, setOllamaConfigs] = useState([]);
  const [generated, setGenerated] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadContext();
  }, []);

  useEffect(() => {
    if (selectedCourse) {
      loadSyllabus(selectedCourse);
      setForm((prev) => ({
        ...prev,
        title: prev.title || `PPT - ${selectedCourse.course}`
      }));
    } else {
      setSyllabusRows([]);
      setSelectedModules([]);
      setSelectedTopics([]);
    }
  }, [selectedCourse]);

  const filteredCourses = useMemo(() => courses.filter((course) => (
    (!filters.academicyear || course.academicyear === filters.academicyear)
    && (!filters.semester || course.semester === filters.semester)
  )), [courses, filters]);

  const filterOptions = useMemo(() => ({
    academicyear: uniq(courses.map((course) => course.academicyear)),
    semester: uniq(courses.map((course) => course.semester))
  }), [courses]);

  const moduleOptions = useMemo(() => uniq(syllabusRows.map((row) => row.module)), [syllabusRows]);
  const topicOptions = useMemo(() => {
    const modules = selectedModules.length ? selectedModules : moduleOptions;
    return uniq(syllabusRows.filter((row) => modules.includes(text(row.module))).map((row) => row.syllabus));
  }, [moduleOptions, selectedModules, syllabusRows]);

  const loadContext = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await ep1.get("/api/v2/neplms/ai-course-generation/context", {
        params: {
          colid: global1.colid,
          facultyemail: global1.user
        }
      });
      const nextCourses = res.data?.courses || [];
      setCourses(nextCourses);
      setOllamaConfigs(res.data?.ollamaConfigs || []);
      if (!selectedCourse && nextCourses.length) {
        setFilters((prev) => ({
          ...prev,
          academicyear: prev.academicyear || nextCourses[0].academicyear || "",
          semester: prev.semester || nextCourses[0].semester || ""
        }));
      }
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load assigned courses");
    } finally {
      setLoading(false);
    }
  };

  const loadSyllabus = async (course) => {
    try {
      setError("");
      const res = await ep1.get("/api/v2/neplms/ai-course-generation/context", {
        params: {
          colid: global1.colid,
          facultyemail: global1.user,
          academicyear: course.academicyear,
          regulation: course.regulation,
          program: course.program,
          programcode: course.programcode,
          type: course.type,
          subject: course.subject,
          semester: course.semester,
          course: course.course,
          coursecode: course.coursecode
        }
      });
      const rows = res.data?.modules || [];
      setSyllabusRows(rows);
      const modules = uniq(rows.map((row) => row.module));
      setSelectedModules(modules);
      setSelectedTopics(uniq(rows.map((row) => row.syllabus)));
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load syllabus for selected course");
    }
  };

  const downloadUrl = (url, name = "presentation.pptx") => {
    if (!url) return;
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const generatePpt = async () => {
    if (!selectedCourse) return setError("Please select a course allotted to you.");
    if (!selectedModules.length) return setError("Please select at least one module.");
    if (!selectedTopics.length) return setError("Please select at least one topic.");
    if (form.provider === "Ollama" && !form.ollamaConfigId) return setError("Please select an Ollama configuration.");
    try {
      setGenerating(true);
      setError("");
      setMessage("");
      const payload = {
        ...selectedCourse,
        colid: global1.colid,
        user: global1.user,
        faculty: selectedCourse.facultyname || global1.name,
        facultyemail: selectedCourse.facultyemail || global1.user,
        title: form.title || `PPT - ${selectedCourse.course}`,
        order: form.order,
        modules: selectedModules,
        topics: selectedTopics,
        language: form.language,
        difficulty: form.difficulty,
        provider: form.provider,
        model: form.geminiModel,
        geminiModel: form.geminiModel,
        ollamaConfigId: form.ollamaConfigId,
        additionalprompt: form.additionalprompt,
        description: `AI generated PPT for ${selectedCourse.course}`
      };
      const res = await ep1.post("/api/v2/neplms/resources/generate-ppt", payload);
      const data = res.data?.data;
      setGenerated(data);
      setMessage(`PPT created, uploaded to AWS, and added to Course Material. Slides: ${res.data?.slides || ""}`);
      setTimeout(() => downloadUrl(res.data?.url || data?.url, data?.originalname || data?.filename || "presentation.pptx"), 300);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to create PPT");
    } finally {
      setGenerating(false);
    }
  };

  const setModuleSelection = (value) => {
    const next = Array.isArray(value) ? value : [];
    setSelectedModules(next);
    const allowedTopics = uniq(syllabusRows.filter((row) => next.includes(text(row.module))).map((row) => row.syllabus));
    setSelectedTopics((prev) => prev.filter((topic) => allowedTopics.includes(topic)));
  };

  return (
    <MenuPageShell title="Create PPT">
      <Box sx={{ p: { xs: 2, md: 3 } }}>
        <Stack spacing={2}>
          <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: "1px solid #e5e7eb" }}>
            <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} justifyContent="space-between" alignItems={{ xs: "flex-start", md: "center" }}>
              <Box>
                <Typography variant="h4" fontWeight={950}>Create PPT</Typography>
                <Typography color="text.secondary">Generate a presentation from selected syllabus modules/topics and save it as course material.</Typography>
              </Box>
              <Button variant="outlined" startIcon={<RefreshIcon />} onClick={loadContext} disabled={loading}>Refresh</Button>
            </Stack>
          </Paper>

          {error && <Alert severity="error" onClose={() => setError("")}>{error}</Alert>}
          {message && <Alert severity="success" onClose={() => setMessage("")}>{message}</Alert>}

          <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: "1px solid #e5e7eb" }}>
            {loading && <LinearStrip />}
            <Grid container spacing={2}>
              <Grid item xs={12} md={3}>
                <Autocomplete
                  options={filterOptions.academicyear}
                  value={filters.academicyear || null}
                  onChange={(_, value) => {
                    setFilters((prev) => ({ ...prev, academicyear: value || "" }));
                    setSelectedCourse(null);
                  }}
                  renderInput={(params) => <TextField {...params} label="Academic Year" />}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <Autocomplete
                  options={filterOptions.semester}
                  value={filters.semester || null}
                  onChange={(_, value) => {
                    setFilters((prev) => ({ ...prev, semester: value || "" }));
                    setSelectedCourse(null);
                  }}
                  renderInput={(params) => <TextField {...params} label="Semester" />}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Autocomplete
                  options={filteredCourses}
                  value={selectedCourse}
                  onChange={(_, value) => setSelectedCourse(value)}
                  getOptionLabel={optionLabel}
                  isOptionEqualToValue={(option, value) => option._id === value._id}
                  renderInput={(params) => <TextField {...params} label="Course allotted to user" placeholder="Search course / code / program" />}
                />
              </Grid>

              {selectedCourse && (
                <Grid item xs={12}>
                  <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1}>
                    <Chip label={`Program: ${selectedCourse.program || ""}`} />
                    <Chip label={`Program Code: ${selectedCourse.programcode || ""}`} />
                    <Chip label={`Regulation: ${selectedCourse.regulation || ""}`} />
                    <Chip label={`Course Code: ${selectedCourse.coursecode || ""}`} />
                    <Chip label={`Faculty: ${selectedCourse.facultyname || global1.name || ""}`} />
                  </Stack>
                </Grid>
              )}

              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>Module</InputLabel>
                  <Select
                    multiple
                    label="Module"
                    value={selectedModules}
                    renderValue={(selected) => selected.join(", ")}
                    onChange={(event) => setModuleSelection(event.target.value)}
                  >
                    {moduleOptions.map((module) => (
                      <MenuItem key={module} value={module}>
                        <Checkbox checked={selectedModules.includes(module)} />
                        <ListItemText primary={module} primaryTypographyProps={{ whiteSpace: "normal" }} />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={5}>
                <FormControl fullWidth>
                  <InputLabel>Topic</InputLabel>
                  <Select
                    multiple
                    label="Topic"
                    value={selectedTopics}
                    renderValue={(selected) => selected.join(", ")}
                    onChange={(event) => setSelectedTopics(Array.isArray(event.target.value) ? event.target.value : [])}
                  >
                    {topicOptions.map((topic) => (
                      <MenuItem key={topic} value={topic}>
                        <Checkbox checked={selectedTopics.includes(topic)} />
                        <ListItemText primary={topic} primaryTypographyProps={{ whiteSpace: "normal" }} />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField fullWidth label="PPT title" value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} />
              </Grid>
              <Grid item xs={12} md={2}>
                <TextField fullWidth type="number" label="Course material order" value={form.order} onChange={(e) => setForm((prev) => ({ ...prev, order: e.target.value }))} />
              </Grid>
              <Grid item xs={12} md={2}>
                <TextField select fullWidth label="AI provider" value={form.provider} onChange={(e) => setForm((prev) => ({ ...prev, provider: e.target.value }))}>
                  <MenuItem value="Gemini">Gemini</MenuItem>
                  <MenuItem value="Ollama">Ollama</MenuItem>
                </TextField>
              </Grid>
              {form.provider === "Gemini" ? (
                <Grid item xs={12} md={3}>
                  <TextField select fullWidth label="Gemini model" value={form.geminiModel} onChange={(e) => setForm((prev) => ({ ...prev, geminiModel: e.target.value }))}>
                    {geminiModels.map((model) => <MenuItem key={model} value={model}>{model}</MenuItem>)}
                  </TextField>
                </Grid>
              ) : (
                <Grid item xs={12} md={3}>
                  <TextField select fullWidth label="Ollama" value={form.ollamaConfigId} onChange={(e) => setForm((prev) => ({ ...prev, ollamaConfigId: e.target.value }))}>
                    {ollamaConfigs.map((item) => <MenuItem key={item._id} value={item._id}>{item.name || item.modelname} - {item.modelname}</MenuItem>)}
                  </TextField>
                </Grid>
              )}
              <Grid item xs={12} md={2}>
                <TextField select fullWidth label="Language" value={form.language} onChange={(e) => setForm((prev) => ({ ...prev, language: e.target.value }))}>
                  {languages.map((language) => <MenuItem key={language} value={language}>{language}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField select fullWidth label="Difficulty" value={form.difficulty} onChange={(e) => setForm((prev) => ({ ...prev, difficulty: e.target.value }))}>
                  {["Easy", "Medium", "Hard", "Advanced"].map((level) => <MenuItem key={level} value={level}>{level}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  minRows={4}
                  label="Additional prompt / content"
                  value={form.additionalprompt}
                  onChange={(e) => setForm((prev) => ({ ...prev, additionalprompt: e.target.value }))}
                  placeholder="Example: Create a clinical case-based deck with diagrams, stepwise explanation, classroom discussion prompts, and a recap quiz."
                />
              </Grid>
              <Grid item xs={12}>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                  <Button
                    variant="contained"
                    size="large"
                    startIcon={generating ? <CircularProgress size={18} color="inherit" /> : <AutoAwesomeIcon />}
                    disabled={generating || !selectedCourse || !selectedModules.length || !selectedTopics.length}
                    onClick={generatePpt}
                  >
                    {generating ? "Creating PPT..." : "Create, Upload and Download PPT"}
                  </Button>
                  {generated?.url && (
                    <Button variant="outlined" size="large" startIcon={<DownloadIcon />} onClick={() => downloadUrl(generated.url, generated.originalname || generated.filename)}>
                      Download again
                    </Button>
                  )}
                </Stack>
              </Grid>
            </Grid>
          </Paper>

          {generated && (
            <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: "1px solid #dbeafe", bgcolor: "#f8fbff" }}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <SlideshowIcon color="primary" />
                <Box>
                  <Typography fontWeight={900}>{generated.title}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ wordBreak: "break-all" }}>{generated.url}</Typography>
                </Box>
              </Stack>
            </Paper>
          )}
        </Stack>
      </Box>
    </MenuPageShell>
  );
}

function LinearStrip() {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
      <CircularProgress size={18} />
      <Typography variant="body2" color="text.secondary">Loading assigned courses...</Typography>
    </Box>
  );
}
