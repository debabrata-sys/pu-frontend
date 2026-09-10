import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  FormControlLabel,
  Grid,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import { DataGrid, GridToolbar } from "@mui/x-data-grid";
import ep1 from "../api/ep1";
import global1 from "./global1";
import MentoringLayout from "./MentoringLayout";

const blankFilter = { field: "", operator: "equals", value: "" };
const componentOptions = ["Theory", "Practical", "Viva"];
const defaultSemesterPlans = Array.from({ length: 8 }, (_, index) => {
  const semester = String(index + 1);
  return {
    semester,
    selected: true,
    academicyear: "",
    exam: `Dummy Exam Sem ${semester}`,
    examcode: `DUMMY-EXAM-S${semester}`
  };
});

function fieldLabel(fields, field) {
  return fields.find((item) => item.field === field)?.label || field;
}

export default function DummyMarksDataPage() {
  const colid = Number(global1.colid || 0);
  const [fields, setFields] = useState([]);
  const [filterOptions, setFilterOptions] = useState({});
  const [filters, setFilters] = useState([{ ...blankFilter }]);
  const [students, setStudents] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [regulations, setRegulations] = useState([]);
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [components, setComponents] = useState(["Theory", "Practical"]);
  const [semesterPlans, setSemesterPlans] = useState(defaultSemesterPlans);
  const [resultSummary, setResultSummary] = useState(null);
  const [form, setForm] = useState({
    academicyear: "",
    regulation: "",
    modelType: "exammarks",
    createCourses: true
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const selectedProgramYears = useMemo(() => [...new Set(programs.map((p) => p.year).filter(Boolean))].sort(), [programs]);

  const loadFilterOptions = async () => {
    const res = await ep1.get("/api/v2/student-dynamic-filter/options", { params: { colid } });
    setFields(res.data?.fields || []);
    setFilterOptions(res.data?.options || {});
  };

  const loadPrograms = async () => {
    const res = await ep1.get("/api/v2/mprograms-management", { params: { colid } });
    setPrograms(res.data?.data || []);
  };

  const loadRegulations = async () => {
    const res = await ep1.get("/api/v2/regulationmaster", { params: { colid, isactive: "Yes" } });
    setRegulations(res.data?.data || []);
  };

  useEffect(() => {
    loadFilterOptions();
    loadPrograms();
    loadRegulations();
  }, []);

  const cleanFilters = () =>
    filters
      .map((filter) => ({
        field: filter.field,
        operator: filter.operator || "equals",
        value: String(filter.value || "").trim()
      }))
      .filter((filter) => filter.field && (filter.operator === "notempty" || filter.value));

  const searchStudents = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await ep1.post("/api/v2/student-dynamic-filter/search", { colid, filters: cleanFilters() });
      setStudents(res.data?.data || []);
      setSelectedStudents([]);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load students");
    } finally {
      setLoading(false);
    }
  };

  const updateFilter = (index, key, value) => {
    setFilters((prev) => prev.map((filter, itemIndex) => {
      if (itemIndex !== index) return filter;
      const next = { ...filter, [key]: value };
      if (key === "field" || (key === "operator" && value === "notempty")) next.value = "";
      return next;
    }));
  };

  const updateSemesterPlan = (semester, key, value) => {
    setSemesterPlans((prev) => prev.map((plan) => {
      if (plan.semester !== semester) return plan;
      return { ...plan, [key]: value };
    }));
  };

  const applyAcademicYearToAllSemesters = (academicyear) => {
    setSemesterPlans((prev) => prev.map((plan) => ({ ...plan, academicyear })));
  };

  const generate = async () => {
    try {
      setGenerating(true);
      setError("");
      setMessage("");
      setResultSummary(null);
      if (!selectedProgram?.programcode) return setError("Select a program");
      if (!components.length) return setError("Select at least one component");
      if (!selectedStudents.length) return setError("Select one or more students from the grid");
      const cleanSemesterPlans = semesterPlans.map((plan) => ({
        semester: plan.semester,
        selected: plan.selected !== false,
        academicyear: String(plan.academicyear || "").trim(),
        exam: String(plan.exam || "").trim() || `Dummy Exam Sem ${plan.semester}`,
        examcode: String(plan.examcode || "").trim() || `DUMMY-EXAM-S${plan.semester}`
      })).filter((plan) => plan.selected);
      if (!cleanSemesterPlans.length) return setError("Select at least one semester");
      if (cleanSemesterPlans.some((plan) => !plan.academicyear)) return setError("Enter academic year for every selected semester");
      const payload = {
        ...form,
        regulation: form.regulation || "Dummy Regulation",
        program: selectedProgram.program || selectedProgram.name || "",
        programcode: selectedProgram.programcode || "",
        components,
        semesterPlans: cleanSemesterPlans,
        studentIds: selectedStudents,
        filters: cleanFilters(),
        colid,
        user: global1.user
      };
      const res = await ep1.post("/api/v2/dummy-marks-data/generate", payload);
      setMessage(`Generated ${res.data?.examRollGenerated || 0} examroll rows and ${res.data?.generated || 0} marks rows for ${res.data?.students || 0} students and ${res.data?.courses || 0} courses. Attended Yes ${res.data?.attendedYesRows || 0}, Attended No ${res.data?.attendedNoRows || 0}. Admit eligible Yes ${res.data?.admitEligibleYesRows || 0}, No ${res.data?.admitEligibleNoRows || 0}. Inserted ${res.data?.upserted || 0}, updated ${res.data?.modified || 0}, skipped ${res.data?.skipped || 0} student-semesters.`);
      setResultSummary(res.data || null);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to generate dummy marks");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <MentoringLayout title="Dummy marks data">
      <Paper elevation={0} sx={{ p: 2, mb: 2, border: "1px solid #e5e7eb", borderRadius: 2 }}>
        <Typography variant="h5" fontWeight={900}>Dummy marks data</Typography>
        <Typography color="text.secondary">Create exam dummy data for selected students, courses, components and marks model.</Typography>
      </Paper>
      {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography fontWeight={900} sx={{ mb: 2 }}>1. Select students with dynamic filters</Typography>
        <Stack spacing={1.5}>
          {filters.map((filter, index) => (
            <Grid container spacing={2} key={index}>
              <Grid item xs={12} md={3}>
                <TextField select fullWidth size="small" label="Field" value={filter.field} onChange={(e) => updateFilter(index, "field", e.target.value)}>
                  <MenuItem value="">Select field</MenuItem>
                  {fields.map((item) => <MenuItem key={item.field} value={item.field}>{item.label}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={12} md={2}>
                <TextField select fullWidth size="small" label="Operator" value={filter.operator} onChange={(e) => updateFilter(index, "operator", e.target.value)}>
                  <MenuItem value="equals">Equals</MenuItem>
                  <MenuItem value="contains">Contains</MenuItem>
                  <MenuItem value="notempty">Not empty</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} md={4}>
                {filter.operator === "notempty" ? (
                  <TextField fullWidth size="small" label="Value" value="Not empty" disabled />
                ) : (
                  <Autocomplete
                    freeSolo
                    options={filter.field ? (filterOptions[filter.field]?.values || []) : []}
                    value={filter.value || ""}
                    onInputChange={(_, v) => updateFilter(index, "value", v || "")}
                    renderInput={(params) => <TextField {...params} size="small" label={filter.field ? fieldLabel(fields, filter.field) : "Value"} />}
                  />
                )}
              </Grid>
              <Grid item xs={12} md={3}>
                <Stack direction="row" spacing={1}>
                  <Button variant="outlined" onClick={() => setFilters((prev) => [...prev, { ...blankFilter }])}>Add filter</Button>
                  <Button color="error" variant="outlined" onClick={() => setFilters((prev) => prev.length === 1 ? [{ ...blankFilter }] : prev.filter((_, i) => i !== index))}>Remove</Button>
                </Stack>
              </Grid>
            </Grid>
          ))}
          <Box><Button variant="contained" onClick={searchStudents} disabled={loading}>{loading ? "Loading..." : "Apply filters"}</Button></Box>
        </Stack>
      </Paper>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12}>
          <Paper sx={{ p: 1 }}>
            <DataGrid
              rows={students}
              getRowId={(row) => row._id}
              checkboxSelection
              rowSelectionModel={selectedStudents}
              onRowSelectionModelChange={setSelectedStudents}
              autoHeight
              slots={{ toolbar: GridToolbar }}
              columns={[
                { field: "name", headerName: "Student", width: 180 },
                { field: "regno", headerName: "Reg no", width: 150 },
                { field: "email", headerName: "Email", width: 220 },
                { field: "academicyear", headerName: "Academic year", width: 140 },
                { field: "regulation", headerName: "Regulation", width: 150 },
                { field: "program", headerName: "Program", width: 200 },
                { field: "programcode", headerName: "Program code", width: 140 },
                { field: "semester", headerName: "Semester", width: 110 }
              ]}
            />
          </Paper>
        </Grid>
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography fontWeight={900} sx={{ mb: 2 }}>2. Marks generation setup</Typography>
            <Stack spacing={2}>
              <Autocomplete
                options={programs}
                value={selectedProgram}
                getOptionLabel={(option) => `${option.program || option.name || ""} - ${option.programcode || ""} (${option.year || ""})`}
                onChange={(_, value) => {
                  setSelectedProgram(value);
                  if (value?.year) {
                    setForm((prev) => ({ ...prev, academicyear: value.year }));
                    applyAcademicYearToAllSemesters(value.year);
                  }
                }}
                renderInput={(params) => <TextField {...params} size="small" label="Program" />}
              />
              <Autocomplete
                options={regulations.map((item) => item.regulation).filter(Boolean)}
                value={form.regulation || null}
                onChange={(_, value) => setForm((prev) => ({ ...prev, regulation: value || "" }))}
                renderInput={(params) => <TextField {...params} size="small" label="Regulation" />}
              />
              <Autocomplete
                freeSolo
                options={selectedProgramYears}
                value={form.academicyear || null}
                onInputChange={(_, value) => setForm((prev) => ({ ...prev, academicyear: value || "" }))}
                onChange={(_, value) => {
                  const year = value || "";
                  setForm((prev) => ({ ...prev, academicyear: year }));
                  if (year) applyAcademicYearToAllSemesters(year);
                }}
                renderInput={(params) => <TextField {...params} size="small" label="Set academic year for all semesters" />}
              />
              <Paper variant="outlined" sx={{ p: 1.5, bgcolor: "#f8fafc" }}>
                <Typography fontWeight={800} sx={{ mb: 1 }}>Semester academic year and dummy exam</Typography>
                <Stack spacing={1.25}>
                  {semesterPlans.map((plan) => (
                    <Grid container spacing={1} alignItems="center" key={plan.semester}>
                      <Grid item xs={12} sm={2}>
                        <FormControlLabel
                          control={<Checkbox checked={plan.selected !== false} onChange={(e) => updateSemesterPlan(plan.semester, "selected", e.target.checked)} />}
                          label={<Typography fontWeight={700}>Sem {plan.semester}</Typography>}
                        />
                      </Grid>
                      <Grid item xs={12} sm={3}>
                        <Autocomplete
                          freeSolo
                          options={selectedProgramYears}
                          value={plan.academicyear || null}
                          onInputChange={(_, value) => updateSemesterPlan(plan.semester, "academicyear", value || "")}
                          onChange={(_, value) => updateSemesterPlan(plan.semester, "academicyear", value || "")}
                          renderInput={(params) => <TextField {...params} size="small" label="Academic year" />}
                        />
                      </Grid>
                      <Grid item xs={12} sm={3}>
                        <TextField fullWidth size="small" label="Dummy exam" value={plan.exam} onChange={(e) => updateSemesterPlan(plan.semester, "exam", e.target.value)} />
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <TextField fullWidth size="small" label="Dummy exam code" value={plan.examcode} onChange={(e) => updateSemesterPlan(plan.semester, "examcode", e.target.value)} />
                      </Grid>
                    </Grid>
                  ))}
                </Stack>
              </Paper>
              <FormControlLabel control={<Checkbox checked={form.createCourses} onChange={(e) => setForm((prev) => ({ ...prev, createCourses: e.target.checked }))} />} label="Create 6 dummy courses for every semester 1 to 8" />
              <TextField select fullWidth size="small" label="Marks model" value={form.modelType} onChange={(e) => setForm((prev) => ({ ...prev, modelType: e.target.value }))}>
                <MenuItem value="exammarks">Exam marks</MenuItem>
                <MenuItem value="exammarks2">Exam marks 2</MenuItem>
              </TextField>
              <Autocomplete
                multiple
                disableCloseOnSelect
                options={componentOptions}
                value={components}
                onChange={(_, value) => setComponents(value)}
                renderOption={(props, option, { selected }) => <li {...props}><Checkbox checked={selected} />{option}</li>}
                renderInput={(params) => <TextField {...params} size="small" label="Components" />}
              />
              <Button variant="contained" onClick={generate} disabled={generating}>{generating ? "Generating..." : "Generate dummy marks"}</Button>
            </Stack>
          </Paper>
          <Grid container spacing={1} sx={{ mt: 1 }}>
            {[["Filtered", students.length], ["Selected", selectedStudents.length], ["Components", components.length]].map(([label, value]) => (
              <Grid item xs={4} key={label}>
                <Card><CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}><Typography variant="caption" color="text.secondary">{label}</Typography><Typography variant="h6" fontWeight={900}>{value}</Typography></CardContent></Card>
              </Grid>
            ))}
          </Grid>
          {resultSummary && (
            <Paper sx={{ p: 2, mt: 2 }}>
              <Typography fontWeight={900} sx={{ mb: 1 }}>Generation result</Typography>
              <Grid container spacing={1} sx={{ mb: 1 }}>
                {[
                  ["Students", resultSummary.students || 0],
                  ["Courses used", resultSummary.courses || 0],
                  ["Rows generated", resultSummary.generated || 0],
                  ["Inserted", resultSummary.upserted || 0],
                  ["Updated", resultSummary.modified || 0],
                  ["Skipped semesters", resultSummary.skipped || 0],
                  ["Dummy courses", resultSummary.createdCourseRows || 0]
                ].map(([label, value]) => (
                  <Grid item xs={6} sm={4} key={label}>
                    <Card variant="outlined"><CardContent sx={{ p: 1.25, "&:last-child": { pb: 1.25 } }}><Typography variant="caption" color="text.secondary">{label}</Typography><Typography fontWeight={900}>{value}</Typography></CardContent></Card>
                  </Grid>
                ))}
              </Grid>
              <DataGrid
                rows={resultSummary.semesterSummary || []}
                getRowId={(row) => row.semester}
                autoHeight
                hideFooter
                columns={[
                  { field: "semester", headerName: "Semester", width: 110 },
                  { field: "academicyear", headerName: "Academic year", width: 150 },
                  { field: "exam", headerName: "Exam", width: 180 },
                  { field: "examcode", headerName: "Exam code", width: 180 },
                  { field: "courses", headerName: "Courses", width: 110 },
                  { field: "marksRows", headerName: "Marks rows", width: 130 },
                  { field: "skippedStudents", headerName: "Skipped students", width: 150 }
                ]}
              />
              {!!resultSummary.skippedSemesters?.length && (
                <Box sx={{ mt: 2 }}>
                  <Typography fontWeight={800} sx={{ mb: 1 }}>Skipped details</Typography>
                  <DataGrid
                    rows={resultSummary.skippedSemesters || []}
                    getRowId={(row) => `${row.regno}-${row.academicyear}-${row.semester}`}
                    autoHeight
                    hideFooter
                    columns={[
                      { field: "student", headerName: "Student", width: 180 },
                      { field: "regno", headerName: "Reg no", width: 140 },
                      { field: "academicyear", headerName: "Academic year", width: 150 },
                      { field: "semester", headerName: "Semester", width: 110 },
                      { field: "existingMarks", headerName: "Existing marks", width: 140 },
                      { field: "reason", headerName: "Reason", flex: 1, minWidth: 220 }
                    ]}
                  />
                </Box>
              )}
            </Paper>
          )}
        </Grid>
      </Grid>
    </MentoringLayout>
  );
}
