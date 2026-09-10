import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  Grid,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import { DataGrid, GridToolbar } from "@mui/x-data-grid";
import AutoModeIcon from "@mui/icons-material/AutoMode";
import PrintIcon from "@mui/icons-material/Print";
import ep1 from "../api/ep1";
import global1 from "./global1";
import MenuPageShell from "./MenuPageShell";
import { normalizeInstitution, printExamSchedule } from "./ConductExamSchedulePrintUtils";

const SELECT_ALL = { value: "__all__", label: "Select All" };
const geminiModels = ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.0-flash", "gemini-1.5-flash"];
const text = (value) => String(value || "").trim();
const uniq = (items) => [...new Set((items || []).map(text).filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
const byCode = (row) => `${row.programcode || ""}||${row.program || ""}`;

const htmlSafe = (value) => String(value ?? "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#039;");

const parseDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const printDate = (value) => {
  const date = parseDate(value);
  if (!date) return "";
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" }).replace(/ /g, "-");
};

const fullPrintDate = (value = new Date()) => {
  const date = parseDate(value) || new Date();
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
};

const dayName = (value) => {
  const date = parseDate(value);
  return date ? date.toLocaleDateString("en-US", { weekday: "long" }) : "";
};

const chunkRows = (rows, size = 24) => {
  const chunks = [];
  for (let index = 0; index < rows.length; index += size) chunks.push(rows.slice(index, index + size));
  return chunks.length ? chunks : [[]];
};

const scheduleExamTitle = (row) => [
  row.program,
  row.semester ? `Semester ${row.semester}` : "",
  row.type ? `[${row.type}]` : "",
  row.regulation ? `(${row.regulation})` : ""
].filter(Boolean).join(" ");

const examMonthYear = (rows, fallbackDate) => {
  const date = parseDate(rows.find((row) => row.examdate)?.examdate) || parseDate(fallbackDate);
  return date ? date.toLocaleDateString("en-US", { month: "long", year: "numeric" }).toUpperCase() : "";
};

const uniqueScheduleLines = (rows) => {
  const map = new Map();
  rows.forEach((row) => {
    const label = scheduleExamTitle(row);
    if (label) map.set(label, label);
  });
  return [...map.values()];
};

const dynamicCenterLabel = (rows) => {
  const fields = ["examcenter", "examinationcenter", "center", "centre", "room", "campus"];
  for (const row of rows) {
    for (const field of fields) {
      if (text(row[field])) return text(row[field]);
    }
  }
  return "";
};

const scheduleTableHtml = (rows) => {
  const counts = rows.reduce((map, row) => {
    const key = printDate(row.examdate) || "-";
    map.set(key, (map.get(key) || 0) + 1);
    return map;
  }, new Map());
  const usedDates = new Set();
  if (!rows.length) {
    return `<tr><td colspan="5" class="empty-row">No scheduled rows found</td></tr>`;
  }
  return rows.map((row) => {
    const key = printDate(row.examdate) || "-";
    const firstForDate = !usedDates.has(key);
    usedDates.add(key);
    return `
      <tr>
        ${firstForDate ? `<td rowspan="${counts.get(key)}" class="date-cell">${htmlSafe(key)}</td><td rowspan="${counts.get(key)}" class="day-cell">${htmlSafe(dayName(row.examdate))}</td>` : ""}
        <td>${htmlSafe(row.coursecode)}</td>
        <td>${htmlSafe(row.course || row.subject)}</td>
        <td>${htmlSafe(scheduleExamTitle(row))}</td>
      </tr>
    `;
  }).join("");
};

const printAttachedScheduleFormat = ({ institution, rows, form, exams, slots }) => {
  const scheduledRows = [...(rows || [])]
    .filter((row) => row.examdate)
    .sort((a, b) => {
      const dateCompare = text(a.examdate).localeCompare(text(b.examdate));
      if (dateCompare) return dateCompare;
      const slotCompare = text(a.examslot).localeCompare(text(b.examslot), undefined, { numeric: true });
      if (slotCompare) return slotCompare;
      return `${text(a.programcode)}${text(a.semester)}${text(a.coursecode)}`.localeCompare(`${text(b.programcode)}${text(b.semester)}${text(b.coursecode)}`, undefined, { numeric: true });
    });
  if (!scheduledRows.length) {
    alert("No scheduled rows are available for this print format.");
    return;
  }
  const inst = normalizeInstitution(institution);
  const exam = exams.find((item) => item.examcode === form.examcode) || {};
  const center = dynamicCenterLabel(scheduledRows);
  const monthYear = examMonthYear(scheduledRows, form.fromdate);
  const programLines = uniqueScheduleLines(scheduledRows);
  const pages = chunkRows(scheduledRows);
  const win = window.open("", "_blank", "width=1100,height=850");
  if (!win) {
    alert("Popup blocked. Please allow popups for print preview.");
    return;
  }
  win.document.write(`<!doctype html>
    <html>
      <head>
        <title>${htmlSafe(exam.examname || "Examination Schedule")}</title>
        <style>
          *{box-sizing:border-box}
          body{margin:0;background:#e5e7eb;color:#000;font-family:"Times New Roman",Times,serif}
          .actions{padding:10px 14px;background:#f8fafc;border-bottom:1px solid #999;position:sticky;top:0;z-index:2}
          .actions button{margin-right:8px;padding:7px 15px;border:1px solid #111;background:#fff;color:#000;cursor:pointer}
          .sheet{width:210mm;min-height:297mm;margin:12px auto;padding:9mm 12mm;background:#fff;page-break-after:always;position:relative}
          .topline{display:flex;justify-content:space-between;font-size:11px;font-weight:700;margin-bottom:4px}
          .inst-header{text-align:center;position:relative;padding:0 28mm 4px;min-height:58px}
          .logo{position:absolute;left:3mm;top:0;max-width:23mm;max-height:22mm;object-fit:contain}
          .inst-name{font-size:24px;font-weight:900;letter-spacing:1px;line-height:1.05;text-transform:uppercase}
          .inst-address{font-size:10.5px;line-height:1.25;margin-top:2px}
          .red-rule{height:2px;background:#8b1e1e;margin-top:4px}
          .office{font-size:14px;color:#1f4e9a;font-weight:900;text-transform:uppercase;border-top:1px solid #8b1e1e;border-bottom:1px solid #8b1e1e;margin-top:2px;padding:2px 0;letter-spacing:.4px}
          .ref-line{display:flex;justify-content:space-between;font-size:11.5px;margin:8px 0 7px}
          .title-bar{background:#ffe766;border:1px solid #111;text-align:center;font-size:15px;font-weight:900;padding:4px;text-transform:uppercase}
          .subtitle{text-align:center;font-weight:900;font-size:13px;margin:8px 0 6px;text-transform:uppercase}
          .program-list{font-size:11.5px;line-height:1.35;margin:0 auto 8px;max-width:168mm}
          .program-line{display:flex;gap:8px;padding:1px 3px}
          .program-line:nth-child(even){background:#fff8b3}
          .notice{font-size:11px;line-height:1.35;margin:5px 0 8px;text-align:justify}
          table.schedule{width:100%;border-collapse:collapse;font-size:10.5px;line-height:1.25;table-layout:fixed;border:1.5px solid #111}
          .schedule th,.schedule td{border:1px solid #111;padding:4px 5px;vertical-align:middle;text-align:left;word-break:break-word}
          .schedule th{background:#ffe766;text-align:center;font-weight:900}
          .schedule .date-cell,.schedule .day-cell{text-align:center;font-weight:700;width:22mm}
          .schedule .empty-row{text-align:center;padding:14px}
          .notes{font-size:11.5px;line-height:1.35;margin-top:10px}
          .notes .label{font-weight:900;text-decoration:underline}
          .signature-row{display:grid;grid-template-columns:1fr 1fr;gap:30mm;margin-top:18mm;font-size:12px;text-align:center;font-weight:700}
          .page-no{position:absolute;bottom:7mm;right:12mm;font-size:10.5px}
          .compact-header{display:flex;justify-content:space-between;font-size:11px;font-weight:700;margin-bottom:7px}
          @page{size:A4 portrait;margin:8mm}
          @media print{
            body{background:#fff}
            .actions{display:none}
            .sheet{margin:0;width:auto;min-height:281mm;padding:0;box-shadow:none}
            tr{break-inside:avoid;page-break-inside:avoid}
            thead{display:table-header-group}
          }
        </style>
      </head>
      <body>
        <div class="actions"><button onclick="window.print()">Print</button><button onclick="window.close()">Close</button></div>
        ${pages.map((pageRows, pageIndex) => `
          <section class="sheet">
            ${pageIndex === 0 ? `
              <div class="topline"><span>${htmlSafe(form.examcode || exam.examcode || "")}</span><span>${htmlSafe(center ? `Examination Center-${center}` : "Examination Center")}</span></div>
              <div class="inst-header">
                ${inst.logo ? `<img class="logo" src="${htmlSafe(inst.logo)}" alt="Logo" />` : ""}
                <div class="inst-name">${htmlSafe(inst.name)}</div>
                <div class="inst-address">${htmlSafe(inst.address)}</div>
                <div class="inst-address">${htmlSafe([inst.phone, inst.email, inst.website].filter(Boolean).join(" | "))}</div>
                <div class="office">Office of Controller of Examinations</div>
              </div>
              <div class="ref-line"><span>Ref: ${htmlSafe(form.examcode || exam.examcode || "-")}</span><span>Date: ${htmlSafe(fullPrintDate())}</span></div>
              <div class="title-bar">Revised Examination Schedule</div>
              <div class="subtitle">${htmlSafe([exam.examname || "Examination", monthYear].filter(Boolean).join(", "))}</div>
              <div class="program-list">
                ${programLines.map((line, index) => `<div class="program-line"><strong>${index + 1}.</strong><span>${htmlSafe(line)}</span></div>`).join("")}
              </div>
              <div class="notice">The examination schedule for the selected academic year, exam and program filters is published below from the ERP schedule data.</div>
            ` : `
              <div class="compact-header"><span>${htmlSafe(form.examcode || exam.examcode || "")}</span><span>${htmlSafe(center ? `Examination Center-${center}` : "Examination Center")}</span></div>
            `}
            <table class="schedule">
              <thead>
                <tr>
                  <th style="width:24mm">Date</th>
                  <th style="width:24mm">Day</th>
                  <th style="width:28mm">Paper Code</th>
                  <th>Paper Name</th>
                  <th style="width:48mm">Name of Examination</th>
                </tr>
              </thead>
              <tbody>${scheduleTableHtml(pageRows)}</tbody>
            </table>
            ${pageIndex === pages.length - 1 ? `
              <div class="notes">
                <div><span class="label">Note:</span></div>
                <div>1. Examination time slot${slots.length > 1 ? "s" : ""} will be ${htmlSafe(slots.join(", ") || "as scheduled")}.</div>
                <div>2. The examination center will be ${htmlSafe(center || "as notified by the institution")}.</div>
                <div>3. Examinees should note the dates and sequence of papers carefully.</div>
                <div>4. Schedule of practical examination, if applicable, will be announced by the institute.</div>
              </div>
              <div class="signature-row">
                <div>SD<br />Incharge (Conduct)</div>
                <div>SD<br />Controller of Examinations</div>
              </div>
            ` : ""}
            <div class="page-no">Page No. ${pageIndex + 1} of ${pages.length}</div>
          </section>
        `).join("")}
      </body>
    </html>`);
  win.document.close();
  win.focus();
};

function MultiSelect({ label, options, value, onChange, getLabel = (item) => item, disabled = false }) {
  const allOptions = [SELECT_ALL, ...options];
  const selectedAll = options.length > 0 && value.length === options.length;
  return (
    <Autocomplete
      multiple
      disableCloseOnSelect
      disabled={disabled}
      options={allOptions}
      value={value}
      isOptionEqualToValue={(option, val) => option.value ? option.value === val.value : getLabel(option) === getLabel(val)}
      getOptionLabel={(option) => option.label || getLabel(option)}
      onChange={(_, next, reason, details) => {
        if (details?.option?.value === SELECT_ALL.value) onChange(selectedAll ? [] : options);
        else onChange(next.filter((item) => item.value !== SELECT_ALL.value));
      }}
      renderOption={(props, option, { selected }) => <li {...props}><Checkbox checked={option.value === SELECT_ALL.value ? selectedAll : selected} />{option.label || getLabel(option)}</li>}
      renderInput={(params) => <TextField {...params} label={label} />}
    />
  );
}

const courseColumns = [
  { field: "academicyear", headerName: "Academic Year", width: 140 },
  { field: "regulation", headerName: "Regulation", width: 150 },
  { field: "exam", headerName: "Exam", minWidth: 210, flex: 1 },
  { field: "examcode", headerName: "Exam Code", width: 160 },
  { field: "program", headerName: "Program", minWidth: 190, flex: 1 },
  { field: "programcode", headerName: "Program Code", width: 140 },
  { field: "type", headerName: "Subject Type", width: 130 },
  { field: "subject", headerName: "Subject", minWidth: 170, flex: 1 },
  { field: "semester", headerName: "Semester", width: 110 },
  { field: "course", headerName: "Course", minWidth: 220, flex: 1 },
  { field: "coursecode", headerName: "Course Code", width: 150 },
  { field: "coursetype", headerName: "Course Type", width: 140 },
  { field: "deliverytype", headerName: "Regular/Elective", width: 150 },
  { field: "examdate", headerName: "Exam Date", width: 130 },
  { field: "examslot", headerName: "Exam Slot", width: 160 }
];

export function ConductExamPopulateCoursesPage() {
  const [exams, setExams] = useState([]);
  const [courseMapRows, setCourseMapRows] = useState([]);
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({ examId: "", academicyear: "", exam: "", examcode: "", regulation: "", programs: [], subjects: [], courses: [] });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const loadBase = async () => {
    const [examRes, mapRes, rowRes] = await Promise.all([
      ep1.get("/api/v2/conductexam/exams", { params: { colid: global1.colid } }),
      ep1.get("/api/v2/conductexam/course-options", { params: { colid: global1.colid } }),
      ep1.get("/api/v2/conductexam/examcourses", { params: { colid: global1.colid } })
    ]);
    setExams(examRes.data?.data || []);
    setCourseMapRows(mapRes.data?.data || []);
    setRows(rowRes.data?.data || []);
  };

  useEffect(() => { loadBase().catch((err) => setError(err.response?.data?.message || "Unable to load data.")); }, []);

  const regulationOptions = useMemo(() => uniq(courseMapRows.filter((row) => !form.academicyear || row.academicyear === form.academicyear).map((row) => row.regulation)), [courseMapRows, form.academicyear]);
  const programOptions = useMemo(() => {
    const map = new Map();
    courseMapRows.filter((row) => row.academicyear === form.academicyear && row.regulation === form.regulation).forEach((row) => {
      if (row.programcode) map.set(byCode(row), { program: row.program, programcode: row.programcode });
    });
    return [...map.values()].sort((a, b) => text(a.program).localeCompare(text(b.program)));
  }, [courseMapRows, form.academicyear, form.regulation]);
  const selectedProgramCodes = useMemo(() => form.programs.map((row) => row.programcode), [form.programs]);
  const subjectOptions = useMemo(() => uniq(courseMapRows.filter((row) => row.academicyear === form.academicyear && row.regulation === form.regulation && selectedProgramCodes.includes(row.programcode)).map((row) => row.subject)), [courseMapRows, form.academicyear, form.regulation, selectedProgramCodes]);
  const courseOptions = useMemo(() => {
    const map = new Map();
    courseMapRows.filter((row) => row.academicyear === form.academicyear && row.regulation === form.regulation && selectedProgramCodes.includes(row.programcode) && (!form.subjects.length || form.subjects.includes(row.subject))).forEach((row) => {
      if (row.coursecode) map.set(`${row.programcode}||${row.coursecode}||${row.subject}||${row.semester}`, row);
    });
    return [...map.values()].sort((a, b) => `${a.programcode}${a.semester}${a.course}`.localeCompare(`${b.programcode}${b.semester}${b.course}`, undefined, { numeric: true }));
  }, [courseMapRows, form.academicyear, form.regulation, selectedProgramCodes, form.subjects]);

  const selectExam = (id) => {
    const exam = exams.find((item) => item._id === id);
    setForm({ examId: id, academicyear: exam?.academicyear || "", exam: exam?.examname || "", examcode: exam?.examcode || "", regulation: "", programs: [], subjects: [], courses: [] });
  };

  const populate = async () => {
    if (!form.examcode || !form.regulation || !form.programs.length || !form.courses.length) {
      setError("Select exam, regulation, program and courses.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const items = form.courses.map((course) => ({
        academicyear: form.academicyear,
        regulation: form.regulation,
        exam: form.exam,
        examcode: form.examcode,
        program: course.program,
        programcode: course.programcode,
        type: course.type || "Major",
        subject: course.subject,
        semester: course.semester,
        course: course.course,
        coursecode: course.coursecode,
        coursetype: course.coursetype || "Theory",
        deliverytype: course.deliverytype || "",
        coursemastercode: course.coursemastercode || ""
      }));
      const res = await ep1.post("/api/v2/conductexam/examcourses-bulk", { colid: global1.colid, user: global1.user, items });
      setMessage(`${res.data?.saved || 0} exam course rows populated.`);
      const rowRes = await ep1.get("/api/v2/conductexam/examcourses", { params: { colid: global1.colid, examcode: form.examcode } });
      setRows(rowRes.data?.data || []);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to populate exam courses.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <MenuPageShell title="Populate exam courses">
      <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: "#f6f7fb", minHeight: "100vh" }}>
        <Paper elevation={0} sx={{ p: 2.5, mb: 2, border: "1px solid #e5e7eb", borderRadius: 2 }}>
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2}>
            <Box><Typography variant="h5" fontWeight={900}>Populate exam courses</Typography><Typography color="text.secondary">Create exam-course rows without exam date and slot. Semester and regular/elective values are picked from Regulation Course Map.</Typography></Box>
            <Button variant="contained" startIcon={<AutoModeIcon />} disabled={loading} onClick={populate}>{loading ? "Populating..." : "Populate"}</Button>
          </Stack>
        </Paper>
        {message && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMessage("")}>{message}</Alert>}
        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}
        <Paper elevation={0} sx={{ p: 2.5, mb: 2, border: "1px solid #e5e7eb", borderRadius: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}><Autocomplete options={exams} value={exams.find((item) => item._id === form.examId) || null} getOptionLabel={(item) => item?._id ? `${item.academicyear} - ${item.examname} (${item.examcode})` : ""} onChange={(_, value) => selectExam(value?._id || "")} renderInput={(params) => <TextField {...params} label="Exam" />} /></Grid>
            <Grid item xs={12} md={2}><TextField fullWidth label="Academic Year" value={form.academicyear} InputProps={{ readOnly: true }} /></Grid>
            <Grid item xs={12} md={3}><Autocomplete options={regulationOptions} value={form.regulation} onChange={(_, value) => setForm((prev) => ({ ...prev, regulation: value || "", programs: [], subjects: [], courses: [] }))} renderInput={(params) => <TextField {...params} label="Regulation" />} /></Grid>
            <Grid item xs={12} md={3}><MultiSelect label="Programs" options={programOptions} value={form.programs} onChange={(value) => setForm((prev) => ({ ...prev, programs: value, subjects: [], courses: [] }))} getLabel={(item) => `${item.program} (${item.programcode})`} disabled={!form.regulation} /></Grid>
            <Grid item xs={12} md={4}><MultiSelect label="Subjects" options={subjectOptions} value={form.subjects} onChange={(value) => setForm((prev) => ({ ...prev, subjects: value, courses: [] }))} disabled={!form.programs.length} /></Grid>
            <Grid item xs={12} md={8}><MultiSelect label="Courses" options={courseOptions} value={form.courses} onChange={(value) => setForm((prev) => ({ ...prev, courses: value }))} getLabel={(item) => `${item.programcode} | Sem ${item.semester} | ${item.subject} | ${item.course} (${item.coursecode}) | ${item.deliverytype || "-"}`} disabled={!form.programs.length} /></Grid>
          </Grid>
        </Paper>
        <Paper elevation={0} sx={{ p: 2, border: "1px solid #e5e7eb", borderRadius: 2 }}>
          <Box sx={{ height: 580 }}><DataGrid rows={rows} getRowId={(row) => row._id} columns={courseColumns} slots={{ toolbar: GridToolbar }} pageSizeOptions={[10, 25, 50, 100]} /></Box>
        </Paper>
      </Box>
    </MenuPageShell>
  );
}

export function ConductExamAutoScheduler2Page() {
  const [exams, setExams] = useState([]);
  const [rows, setRows] = useState([]);
  const [institution, setInstitution] = useState({});
  const [ollama, setOllama] = useState([]);
  const [form, setForm] = useState({ academicyear: "", examcode: "", programs: [], fromdate: "", todate: "", slot1: "10:00 AM - 1:00 PM", slot2: "2:00 PM - 5:00 PM", provider: "Gemini", geminiModel: "gemini-2.5-flash", ollamaConfigId: "", rules: "" });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [aiNotes, setAiNotes] = useState("");

  const loadBase = async () => {
    const [examRes, rowRes, ollamaRes, institutionRes] = await Promise.all([
      ep1.get("/api/v2/conductexam/exams", { params: { colid: global1.colid } }),
      ep1.get("/api/v2/conductexam/examcourses", { params: { colid: global1.colid } }),
      ep1.get("/api/v2/ollama-configuration", { params: { colid: global1.colid } }).catch(() => ({ data: { data: [] } })),
      ep1.get("/vins", { params: { colid: global1.colid } }).catch(() => ({ data: {} }))
    ]);
    setExams(examRes.data?.data || []);
    setRows(rowRes.data?.data || []);
    setOllama(ollamaRes.data?.data || ollamaRes.data?.ollama || []);
    setInstitution(institutionRes.data || {});
  };

  useEffect(() => { loadBase().catch((err) => setError(err.response?.data?.message || "Unable to load scheduler data.")); }, []);

  const academicYears = useMemo(() => uniq([...exams.map((row) => row.academicyear), ...rows.map((row) => row.academicyear)]), [exams, rows]);
  const examOptions = useMemo(() => exams.filter((row) => !form.academicyear || row.academicyear === form.academicyear), [exams, form.academicyear]);
  const programOptions = useMemo(() => {
    const map = new Map();
    rows.filter((row) => row.academicyear === form.academicyear && row.examcode === form.examcode).forEach((row) => {
      if (row.programcode) map.set(byCode(row), { program: row.program, programcode: row.programcode });
    });
    return [...map.values()].sort((a, b) => text(a.program).localeCompare(text(b.program)));
  }, [rows, form.academicyear, form.examcode]);
  const filteredRows = useMemo(() => rows.filter((row) => row.academicyear === form.academicyear && row.examcode === form.examcode && (!form.programs.length || form.programs.some((p) => p.programcode === row.programcode))), [rows, form]);

  const selectExam = (examcode) => {
    const exam = exams.find((row) => row.examcode === examcode);
    setForm((prev) => ({ ...prev, examcode, academicyear: exam?.academicyear || prev.academicyear, programs: [] }));
  };

  const runSchedule = async (mode) => {
    if (!form.academicyear || !form.examcode || !form.fromdate || !form.todate) {
      setError("Select academic year, exam, start date and end date.");
      return;
    }
    if (mode === "ai" && form.provider === "Ollama" && !form.ollamaConfigId) {
      setError("Select Ollama configuration.");
      return;
    }
    setLoading(true);
    setError("");
    setMessage("");
    setAiNotes("");
    try {
      const payload = { ...form, colid: global1.colid, user: global1.user, programcodes: form.programs.map((row) => row.programcode) };
      const endpoint = mode === "ai" ? "/api/v2/conductexam/examcourses-ai-schedule" : "/api/v2/conductexam/examcourses-autoschedule";
      const res = await ep1.post(endpoint, payload);
      setMessage(res.data?.message || "Schedule updated.");
      setAiNotes(res.data?.aiText || "");
      const rowRes = await ep1.get("/api/v2/conductexam/examcourses", { params: { colid: global1.colid, academicyear: form.academicyear, examcode: form.examcode } });
      setRows(rowRes.data?.data || []);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to schedule exam courses.");
    } finally {
      setLoading(false);
    }
  };

  const printPreview = () => {
    printExamSchedule({
      title: "Exam Auto Schedule",
      institution,
      meta: {
        "Academic Year": form.academicyear || "All",
        "Exam Code": form.examcode || "All",
        "Programs": form.programs.length ? form.programs.map((row) => row.programcode).join(", ") : "All",
        "Start Date": form.fromdate || "",
        "End Date": form.todate || "",
        "Generated On": new Date().toLocaleString()
      },
      sections: [{
        title: "Scheduled Courses",
        rows: filteredRows,
        columns: courseColumns.map((column) => ({ field: column.field, headerName: column.headerName })),
        summary: [
          { label: "Total Rows", value: filteredRows.length },
          { label: "Scheduled Rows", value: filteredRows.filter((row) => row.examdate).length },
          { label: "Unscheduled Rows", value: filteredRows.filter((row) => !row.examdate).length }
        ]
      }]
    });
  };

  return (
    <MenuPageShell title="Exam auto scheduler 2">
      <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: "#f6f7fb", minHeight: "100vh" }}>
        <Paper elevation={0} sx={{ p: 2.5, mb: 2, border: "1px solid #e5e7eb", borderRadius: 2 }}>
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2}>
            <Box>
              <Typography variant="h5" fontWeight={900}>Exam auto scheduler 2</Typography>
              <Typography color="text.secondary">Select programs in bulk and allocate exam dates and slots after course population.</Typography>
            </Box>
            <Button variant="outlined" startIcon={<PrintIcon />} onClick={printPreview} disabled={!filteredRows.length}>Print Preview</Button>
          </Stack>
        </Paper>
        {message && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMessage("")}>{message}</Alert>}
        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}
        <Paper elevation={0} sx={{ p: 2.5, mb: 2, border: "1px solid #e5e7eb", borderRadius: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={2.5}><Autocomplete options={academicYears} value={form.academicyear} onChange={(_, value) => setForm((prev) => ({ ...prev, academicyear: value || "", examcode: "", programs: [] }))} renderInput={(params) => <TextField {...params} label="Academic Year" />} /></Grid>
            <Grid item xs={12} md={3}><Autocomplete options={examOptions} value={examOptions.find((row) => row.examcode === form.examcode) || null} getOptionLabel={(row) => row?._id ? `${row.examname} (${row.examcode})` : ""} onChange={(_, value) => selectExam(value?.examcode || "")} renderInput={(params) => <TextField {...params} label="Exam / Exam Code" />} /></Grid>
            <Grid item xs={12} md={3.5}><MultiSelect label="Programs" options={programOptions} value={form.programs} onChange={(value) => setForm((prev) => ({ ...prev, programs: value }))} getLabel={(item) => `${item.program} (${item.programcode})`} disabled={!form.examcode} /></Grid>
            <Grid item xs={12} md={1.5}><TextField fullWidth type="date" label="Start Date" value={form.fromdate} onChange={(e) => setForm((p) => ({ ...p, fromdate: e.target.value }))} InputLabelProps={{ shrink: true }} /></Grid>
            <Grid item xs={12} md={1.5}><TextField fullWidth type="date" label="End Date" value={form.todate} onChange={(e) => setForm((p) => ({ ...p, todate: e.target.value }))} InputLabelProps={{ shrink: true }} /></Grid>
            <Grid item xs={12} md={3}><TextField fullWidth label="Slot 1" value={form.slot1} onChange={(e) => setForm((p) => ({ ...p, slot1: e.target.value }))} /></Grid>
            <Grid item xs={12} md={3}><TextField fullWidth label="Slot 2" value={form.slot2} onChange={(e) => setForm((p) => ({ ...p, slot2: e.target.value }))} /></Grid>
            <Grid item xs={12} md={2}><TextField select fullWidth label="AI Provider" value={form.provider} onChange={(e) => setForm((p) => ({ ...p, provider: e.target.value }))}><MenuItem value="Gemini">Gemini</MenuItem><MenuItem value="Ollama">Ollama</MenuItem></TextField></Grid>
            {form.provider === "Gemini" ? <Grid item xs={12} md={2}><TextField select fullWidth label="Gemini Model" value={form.geminiModel} onChange={(e) => setForm((p) => ({ ...p, geminiModel: e.target.value }))}>{geminiModels.map((model) => <MenuItem key={model} value={model}>{model}</MenuItem>)}</TextField></Grid> : <Grid item xs={12} md={2}><TextField select fullWidth label="Ollama" value={form.ollamaConfigId} onChange={(e) => setForm((p) => ({ ...p, ollamaConfigId: e.target.value }))}>{ollama.map((item) => <MenuItem key={item._id} value={item._id}>{item.name || item.modelname}</MenuItem>)}</TextField></Grid>}
            <Grid item xs={12} md={8}><TextField fullWidth multiline minRows={2} label="AI scheduling rules / prompt" value={form.rules} onChange={(e) => setForm((p) => ({ ...p, rules: e.target.value }))} /></Grid>
            <Grid item xs={12} md={2}><Button fullWidth variant="contained" disabled={loading} onClick={() => runSchedule("auto")} sx={{ height: 56 }}>{loading ? <CircularProgress size={22} color="inherit" /> : "Auto Schedule"}</Button></Grid>
            <Grid item xs={12} md={2}><Button fullWidth variant="outlined" disabled={loading} onClick={() => runSchedule("ai")} sx={{ height: 56 }}>Schedule with AI</Button></Grid>
            {aiNotes && <Grid item xs={12}><Alert severity="info" sx={{ whiteSpace: "pre-wrap" }}>{aiNotes}</Alert></Grid>}
          </Grid>
        </Paper>
        <Paper elevation={0} sx={{ p: 2, border: "1px solid #e5e7eb", borderRadius: 2 }}>
          <Box sx={{ height: 620 }}><DataGrid rows={filteredRows} getRowId={(row) => row._id} columns={courseColumns} slots={{ toolbar: GridToolbar }} pageSizeOptions={[10, 25, 50, 100]} /></Box>
        </Paper>
      </Box>
    </MenuPageShell>
  );
}

export function ConductExamAutoScheduler3Page() {
  const [exams, setExams] = useState([]);
  const [rows, setRows] = useState([]);
  const [institution, setInstitution] = useState({});
  const [ollama, setOllama] = useState([]);
  const [slots, setSlots] = useState(["10:00 AM - 1:00 PM", "2:00 PM - 5:00 PM"]);
  const [form, setForm] = useState({ academicyear: "", examcode: "", programs: [], fromdate: "", todate: "", useHrHolidayList: false, provider: "Gemini", geminiModel: "gemini-2.5-flash", ollamaConfigId: "", rules: "" });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [aiNotes, setAiNotes] = useState("");

  const loadBase = async () => {
    const [examRes, rowRes, ollamaRes, institutionRes] = await Promise.all([
      ep1.get("/api/v2/conductexam/exams", { params: { colid: global1.colid } }),
      ep1.get("/api/v2/conductexam/examcourses", { params: { colid: global1.colid } }),
      ep1.get("/api/v2/ollama-configuration", { params: { colid: global1.colid } }).catch(() => ({ data: { data: [] } })),
      ep1.get("/vins", { params: { colid: global1.colid } }).catch(() => ({ data: {} }))
    ]);
    setExams(examRes.data?.data || []);
    setRows(rowRes.data?.data || []);
    setOllama(ollamaRes.data?.data || ollamaRes.data?.ollama || []);
    setInstitution(institutionRes.data || {});
  };

  useEffect(() => { loadBase().catch((err) => setError(err.response?.data?.message || "Unable to load scheduler data.")); }, []);

  const academicYears = useMemo(() => uniq([...exams.map((row) => row.academicyear), ...rows.map((row) => row.academicyear)]), [exams, rows]);
  const examOptions = useMemo(() => exams.filter((row) => !form.academicyear || row.academicyear === form.academicyear), [exams, form.academicyear]);
  const programOptions = useMemo(() => {
    const map = new Map();
    rows.filter((row) => row.academicyear === form.academicyear && row.examcode === form.examcode).forEach((row) => {
      if (row.programcode) map.set(byCode(row), { program: row.program, programcode: row.programcode });
    });
    return [...map.values()].sort((a, b) => text(a.program).localeCompare(text(b.program)));
  }, [rows, form.academicyear, form.examcode]);
  const filteredRows = useMemo(() => rows.filter((row) => row.academicyear === form.academicyear && row.examcode === form.examcode && (!form.programs.length || form.programs.some((p) => p.programcode === row.programcode))), [rows, form]);
  const activeSlots = useMemo(() => slots.map(text).filter(Boolean), [slots]);

  const selectExam = (examcode) => {
    const exam = exams.find((row) => row.examcode === examcode);
    setForm((prev) => ({ ...prev, examcode, academicyear: exam?.academicyear || prev.academicyear, programs: [] }));
  };

  const addSlot = () => setSlots((prev) => [...prev, `Slot ${prev.length + 1}`]);
  const updateSlot = (index, value) => setSlots((prev) => prev.map((slot, idx) => idx === index ? value : slot));
  const removeSlot = (index) => setSlots((prev) => prev.filter((_, idx) => idx !== index));

  const runSchedule = async (mode) => {
    if (!form.academicyear || !form.examcode || !form.fromdate || !form.todate) {
      setError("Select academic year, exam, start date and end date.");
      return;
    }
    if (!activeSlots.length) {
      setError("Add at least one exam slot.");
      return;
    }
    if (mode === "ai" && form.provider === "Ollama" && !form.ollamaConfigId) {
      setError("Select Ollama configuration.");
      return;
    }
    setLoading(true);
    setError("");
    setMessage("");
    setAiNotes("");
    try {
      const payload = { ...form, colid: global1.colid, user: global1.user, programcodes: form.programs.map((row) => row.programcode), slots: activeSlots, slot1: activeSlots[0] || "", slot2: activeSlots[1] || "" };
      const endpoint = mode === "ai" ? "/api/v2/conductexam/examcourses-ai-schedule" : "/api/v2/conductexam/examcourses-autoschedule";
      const res = await ep1.post(endpoint, payload);
      setMessage(res.data?.message || "Schedule updated.");
      setAiNotes(res.data?.aiText || "");
      const rowRes = await ep1.get("/api/v2/conductexam/examcourses", { params: { colid: global1.colid, academicyear: form.academicyear, examcode: form.examcode } });
      setRows(rowRes.data?.data || []);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to schedule exam courses.");
    } finally {
      setLoading(false);
    }
  };

  const printPreview = () => {
    printExamSchedule({
      title: "Exam Auto Schedule 3",
      institution,
      meta: {
        "Academic Year": form.academicyear || "All",
        "Exam": exams.find((row) => row.examcode === form.examcode)?.examname || "",
        "Exam Code": form.examcode || "All",
        "Programs": form.programs.length ? form.programs.map((row) => row.programcode).join(", ") : "All",
        "Start Date": form.fromdate || "",
        "End Date": form.todate || "",
        "Slots": activeSlots.join(", "),
        "HR Holiday List Considered": form.useHrHolidayList ? "Yes" : "No",
        "Generated On": new Date().toLocaleString()
      },
      sections: [{
        title: "Scheduled Courses",
        rows: filteredRows,
        columns: courseColumns.map((column) => ({ field: column.field, headerName: column.headerName })),
        summary: [
          { label: "Total Rows", value: filteredRows.length },
          { label: "Scheduled Rows", value: filteredRows.filter((row) => row.examdate).length },
          { label: "Unscheduled Rows", value: filteredRows.filter((row) => !row.examdate).length },
          { label: "Configured Slots", value: activeSlots.length }
        ]
      }]
    });
  };

  const printScheduleFormat = () => {
    printAttachedScheduleFormat({
      institution,
      rows: filteredRows,
      form,
      exams,
      slots: activeSlots
    });
  };

  return (
    <MenuPageShell title="Exam auto scheduler 3">
      <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: "#f6f7fb", minHeight: "100vh" }}>
        <Paper elevation={0} sx={{ p: 2.5, mb: 2, border: "1px solid #e5e7eb", borderRadius: 2 }}>
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2}>
            <Box>
              <Typography variant="h5" fontWeight={900}>Exam auto scheduler 3</Typography>
              <Typography color="text.secondary">Add any number of exam slots. Scheduling will use only the configured slots within the selected date range.</Typography>
            </Box>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
              <Button variant="outlined" startIcon={<PrintIcon />} onClick={printPreview} disabled={!filteredRows.length}>Print Preview</Button>
              <Button variant="contained" startIcon={<PrintIcon />} onClick={printScheduleFormat} disabled={!filteredRows.length}>Schedule Format Print</Button>
            </Stack>
          </Stack>
        </Paper>
        {message && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMessage("")}>{message}</Alert>}
        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}
        <Paper elevation={0} sx={{ p: 2.5, mb: 2, border: "1px solid #e5e7eb", borderRadius: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={2.5}><Autocomplete options={academicYears} value={form.academicyear} onChange={(_, value) => setForm((prev) => ({ ...prev, academicyear: value || "", examcode: "", programs: [] }))} renderInput={(params) => <TextField {...params} label="Academic Year" />} /></Grid>
            <Grid item xs={12} md={3}><Autocomplete options={examOptions} value={examOptions.find((row) => row.examcode === form.examcode) || null} getOptionLabel={(row) => row?._id ? `${row.examname} (${row.examcode})` : ""} onChange={(_, value) => selectExam(value?.examcode || "")} renderInput={(params) => <TextField {...params} label="Exam / Exam Code" />} /></Grid>
            <Grid item xs={12} md={3.5}><MultiSelect label="Programs" options={programOptions} value={form.programs} onChange={(value) => setForm((prev) => ({ ...prev, programs: value }))} getLabel={(item) => `${item.program} (${item.programcode})`} disabled={!form.examcode} /></Grid>
            <Grid item xs={12} md={1.5}><TextField fullWidth type="date" label="Start Date" value={form.fromdate} onChange={(e) => setForm((p) => ({ ...p, fromdate: e.target.value }))} InputLabelProps={{ shrink: true }} /></Grid>
            <Grid item xs={12} md={1.5}><TextField fullWidth type="date" label="End Date" value={form.todate} onChange={(e) => setForm((p) => ({ ...p, todate: e.target.value }))} InputLabelProps={{ shrink: true }} /></Grid>
            <Grid item xs={12}>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }}>
                <FormControlLabel
                  control={<Checkbox checked={!!form.useHrHolidayList} onChange={(e) => setForm((p) => ({ ...p, useHrHolidayList: e.target.checked }))} />}
                  label="Consider HR holiday list while scheduling"
                />
                <Button variant="outlined" href="/hrleaveholidaylist">Open holiday list</Button>
              </Stack>
            </Grid>
            <Grid item xs={12}>
              <Paper variant="outlined" sx={{ p: 2, bgcolor: "#fbfcfe" }}>
                <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1} sx={{ mb: 2 }}>
                  <Box>
                    <Typography fontWeight={900}>Exam slots</Typography>
                    <Typography variant="body2" color="text.secondary">The number of slots added here controls how many slots per exam day are used.</Typography>
                  </Box>
                  <Button variant="contained" onClick={addSlot}>Add Slot</Button>
                </Stack>
                <Grid container spacing={1.5}>
                  {slots.map((slot, index) => (
                    <Grid item xs={12} md={4} key={`slot-${index}`}>
                      <Stack direction="row" spacing={1}>
                        <TextField fullWidth size="small" label={`Slot ${index + 1}`} value={slot} onChange={(e) => updateSlot(index, e.target.value)} />
                        <Button color="error" variant="outlined" disabled={slots.length <= 1} onClick={() => removeSlot(index)}>Remove</Button>
                      </Stack>
                    </Grid>
                  ))}
                </Grid>
              </Paper>
            </Grid>
            <Grid item xs={12} md={2}><TextField select fullWidth label="AI Provider" value={form.provider} onChange={(e) => setForm((p) => ({ ...p, provider: e.target.value }))}><MenuItem value="Gemini">Gemini</MenuItem><MenuItem value="Ollama">Ollama</MenuItem></TextField></Grid>
            {form.provider === "Gemini" ? <Grid item xs={12} md={2}><TextField select fullWidth label="Gemini Model" value={form.geminiModel} onChange={(e) => setForm((p) => ({ ...p, geminiModel: e.target.value }))}>{geminiModels.map((model) => <MenuItem key={model} value={model}>{model}</MenuItem>)}</TextField></Grid> : <Grid item xs={12} md={2}><TextField select fullWidth label="Ollama" value={form.ollamaConfigId} onChange={(e) => setForm((p) => ({ ...p, ollamaConfigId: e.target.value }))}>{ollama.map((item) => <MenuItem key={item._id} value={item._id}>{item.name || item.modelname}</MenuItem>)}</TextField></Grid>}
            <Grid item xs={12} md={8}><TextField fullWidth multiline minRows={2} label="AI scheduling rules / prompt" value={form.rules} onChange={(e) => setForm((p) => ({ ...p, rules: e.target.value }))} /></Grid>
            <Grid item xs={12} md={2}><Button fullWidth variant="contained" disabled={loading} onClick={() => runSchedule("auto")} sx={{ height: 56 }}>{loading ? <CircularProgress size={22} color="inherit" /> : "Auto Schedule"}</Button></Grid>
            <Grid item xs={12} md={2}><Button fullWidth variant="outlined" disabled={loading} onClick={() => runSchedule("ai")} sx={{ height: 56 }}>Schedule with AI</Button></Grid>
            {aiNotes && <Grid item xs={12}><Alert severity="info" sx={{ whiteSpace: "pre-wrap" }}>{aiNotes}</Alert></Grid>}
          </Grid>
        </Paper>
        <Paper elevation={0} sx={{ p: 2, border: "1px solid #e5e7eb", borderRadius: 2 }}>
          <Box sx={{ height: 620 }}><DataGrid rows={filteredRows} getRowId={(row) => row._id} columns={courseColumns} slots={{ toolbar: GridToolbar }} pageSizeOptions={[10, 25, 50, 100]} /></Box>
        </Paper>
      </Box>
    </MenuPageShell>
  );
}
