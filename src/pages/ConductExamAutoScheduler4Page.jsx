import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  Divider,
  FormControlLabel,
  Grid,
  IconButton,
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
  Tooltip,
  Typography
} from "@mui/material";
import { DataGrid, GridToolbar } from "@mui/x-data-grid";
import AutoModeIcon from "@mui/icons-material/AutoMode";
import PrintIcon from "@mui/icons-material/Print";
import GroupsIcon from "@mui/icons-material/Groups";
import RefreshIcon from "@mui/icons-material/Refresh";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import TuneIcon from "@mui/icons-material/Tune";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
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
  const pages = chunkRows(scheduledRows, 24);
  const win = window.open("", "_blank", "width=1200,height=900");
  if (!win) return;
  win.document.write(`<!doctype html>
    <html>
      <head>
        <title>Examination Schedule - ${htmlSafe(form.examcode || "Schedule")}</title>
        <style>
          *{box-sizing:border-box}
          body{margin:0;font-family:Arial,Helvetica,sans-serif;color:#111;background:#f3f4f6}
          .actions{position:sticky;top:0;background:#111827;padding:8px 14px;display:flex;gap:8px;z-index:99}
          .actions button{padding:6px 14px;font-weight:700;cursor:pointer}
          .sheet{background:#fff;width:210mm;min-height:297mm;margin:12px auto;padding:12mm 12mm 16mm;box-shadow:0 8px 24px rgba(0,0,0,0.12);position:relative}
          .topline{display:flex;justify-content:space-between;font-size:11px;font-weight:700;margin-bottom:6px}
          .inst-header{text-align:center;margin-bottom:8px}
          .logo{max-height:64px;max-width:180px;object-fit:contain;margin-bottom:4px}
          .inst-name{font-size:18px;font-weight:900;text-transform:uppercase}
          .inst-address{font-size:11px;color:#374151}
          .office{font-size:12px;font-weight:800;margin-top:4px}
          .ref-line{display:flex;justify-content:space-between;font-size:11.5px;font-weight:700;margin:6px 0}
          .title-bar{font-size:15px;font-weight:900;text-align:center;text-decoration:underline;text-transform:uppercase;margin:4px 0}
          .subtitle{font-size:12.5px;font-weight:800;text-align:center;margin-bottom:6px}
          .program-list{font-size:11px;margin-bottom:6px}
          .program-line{display:flex;gap:6px;margin-bottom:2px}
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

export default function ConductExamAutoScheduler4Page() {
  const [exams, setExams] = useState([]);
  const [rows, setRows] = useState([]);
  const [institution, setInstitution] = useState({});
  const [ollama, setOllama] = useState([]);
  const [slots, setSlots] = useState(["10:00 AM - 1:00 PM", "2:00 PM - 5:00 PM"]);
  const [form, setForm] = useState({
    academicyear: "",
    examcode: "",
    programs: [],
    fromdate: "",
    todate: "",
    useHrHolidayList: false,
    provider: "Gemini",
    geminiModel: "gemini-2.5-flash",
    ollamaConfigId: "",
    rules: ""
  });

  // Strength & Gap states
  const [strengthData, setStrengthData] = useState([]);
  const [strengthSummary, setStrengthSummary] = useState({ totalCourses: 0, totalStudents: 0, scheduledCourses: 0, unscheduledCourses: 0 });
  const [loadingStrength, setLoadingStrength] = useState(false);
  const [defaultGap, setDefaultGap] = useState(1);
  const [courseGaps, setCourseGaps] = useState({}); // { [coursecode]: number }
  const [searchQuery, setSearchQuery] = useState("");

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

  useEffect(() => {
    loadBase().catch((err) => setError(err.response?.data?.message || "Unable to load scheduler data."));
  }, []);

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
    setStrengthData([]);
  };

  const addSlot = () => setSlots((prev) => [...prev, `Slot ${prev.length + 1}`]);
  const updateSlot = (index, value) => setSlots((prev) => prev.map((slot, idx) => (idx === index ? value : slot)));
  const removeSlot = (index) => setSlots((prev) => prev.filter((_, idx) => idx !== index));

  // Fetch student strength for each course
  const checkStrength = async () => {
    if (!form.academicyear || !form.examcode) {
      setError("Please select Academic Year and Exam first to check course strength.");
      return;
    }
    setLoadingStrength(true);
    setError("");
    setMessage("");
    try {
      const params = {
        colid: global1.colid,
        academicyear: form.academicyear,
        examcode: form.examcode
      };
      if (form.programs.length) {
        params.programcodes = form.programs.map((p) => p.programcode).join(",");
      }
      const res = await ep1.get("/api/v2/conductexam/course-student-strength", { params });
      const list = res.data?.data || [];
      setStrengthData(list);
      setStrengthSummary(res.data?.summary || {
        totalCourses: list.length,
        totalStudents: list.reduce((sum, item) => sum + (item.studentStrength || 0), 0),
        scheduledCourses: list.filter((c) => c.examdate).length,
        unscheduledCourses: list.filter((c) => !c.examdate).length
      });
      setMessage(`Course strength analyzed: ${list.length} courses found.`);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to fetch student strength for courses.");
    } finally {
      setLoadingStrength(false);
    }
  };

  // Automatically check strength when exam is selected
  useEffect(() => {
    if (form.academicyear && form.examcode) {
      checkStrength();
    }
  }, [form.academicyear, form.examcode, form.programs]);

  // Update gap for an individual course
  const handleCourseGapChange = (coursecode, value) => {
    const num = Math.max(0, parseInt(value, 10) || 0);
    setCourseGaps((prev) => ({ ...prev, [coursecode]: num }));
  };

  // Apply default gap to all currently listed courses
  const applyDefaultGapToAll = () => {
    const next = {};
    strengthData.forEach((row) => {
      next[row.coursecode] = Math.max(0, Number(defaultGap) || 0);
    });
    setCourseGaps(next);
    setMessage(`Applied default gap of ${defaultGap} day(s) to all courses.`);
  };

  // Reset all custom gaps
  const resetAllGaps = () => {
    setCourseGaps({});
    setMessage("Reset all per-course gap overrides.");
  };

  // Filter strength data for table view
  const displayCourses = useMemo(() => {
    let list = strengthData.length ? strengthData : filteredRows.map((r) => ({
      _id: r._id,
      coursecode: r.coursecode,
      course: r.course || r.subject,
      program: r.program,
      programcode: r.programcode,
      semester: r.semester,
      regulation: r.regulation,
      coursetype: r.coursetype || "Theory",
      examdate: r.examdate || "",
      examslot: r.examslot || "",
      studentStrength: 0
    }));

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter((c) =>
        text(c.coursecode).toLowerCase().includes(q) ||
        text(c.course).toLowerCase().includes(q) ||
        text(c.program).toLowerCase().includes(q) ||
        text(c.programcode).toLowerCase().includes(q) ||
        text(c.semester).toLowerCase().includes(q)
      );
    }
    return list;
  }, [strengthData, filteredRows, searchQuery]);

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
      const payload = {
        ...form,
        colid: global1.colid,
        user: global1.user,
        programcodes: form.programs.map((row) => row.programcode),
        slots: activeSlots,
        slot1: activeSlots[0] || "",
        slot2: activeSlots[1] || "",
        courseGaps,
        defaultGap: Number(defaultGap) || 0
      };
      const endpoint = mode === "ai" ? "/api/v2/conductexam/examcourses-ai-schedule" : "/api/v2/conductexam/examcourses-autoschedule";
      const res = await ep1.post(endpoint, payload);
      setMessage(res.data?.message || "Time table generated successfully.");
      setAiNotes(res.data?.aiText || "");

      // Refresh rows & strength table
      const rowRes = await ep1.get("/api/v2/conductexam/examcourses", { params: { colid: global1.colid, academicyear: form.academicyear, examcode: form.examcode } });
      setRows(rowRes.data?.data || []);
      await checkStrength();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to generate exam timetable.");
    } finally {
      setLoading(false);
    }
  };

  const printPreview = () => {
    printExamSchedule({
      title: "Exam Schedule with Strength & Gap Analysis",
      institution,
      meta: {
        "Academic Year": form.academicyear || "All",
        "Exam": exams.find((row) => row.examcode === form.examcode)?.examname || "",
        "Exam Code": form.examcode || "All",
        "Programs": form.programs.length ? form.programs.map((row) => row.programcode).join(", ") : "All",
        "Start Date": form.fromdate || "",
        "End Date": form.todate || "",
        "Slots": activeSlots.join(", "),
        "Default Gap": `${defaultGap} day(s)`,
        "Total Student Strength": strengthSummary.totalStudents || "N/A",
        "HR Holiday List Considered": form.useHrHolidayList ? "Yes" : "No",
        "Generated On": new Date().toLocaleString()
      },
      sections: [{
        title: "Scheduled Courses & Student Strength",
        rows: filteredRows.map((r) => {
          const match = strengthData.find((s) => s.coursecode === r.coursecode && s.programcode === r.programcode);
          return {
            ...r,
            studentStrength: match ? match.studentStrength : "N/A",
            gapDays: courseGaps[r.coursecode] ?? defaultGap
          };
        }),
        columns: [
          { field: "academicyear", headerName: "Academic Year" },
          { field: "program", headerName: "Program" },
          { field: "semester", headerName: "Semester" },
          { field: "coursecode", headerName: "Course Code" },
          { field: "course", headerName: "Course Name" },
          { field: "studentStrength", headerName: "Student Strength" },
          { field: "gapDays", headerName: "Gap (Days)" },
          { field: "examdate", headerName: "Exam Date" },
          { field: "examslot", headerName: "Exam Slot" }
        ],
        summary: [
          { label: "Total Courses", value: filteredRows.length },
          { label: "Total Examinees", value: strengthSummary.totalStudents },
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

  const courseColumns = [
    { field: "academicyear", headerName: "Academic Year", width: 130 },
    { field: "program", headerName: "Program", minWidth: 180, flex: 1 },
    { field: "programcode", headerName: "Program Code", width: 130 },
    { field: "semester", headerName: "Semester", width: 95 },
    { field: "coursecode", headerName: "Course Code", width: 130 },
    { field: "course", headerName: "Course", minWidth: 200, flex: 1 },
    {
      field: "studentStrength",
      headerName: "Student Strength",
      width: 140,
      renderCell: (params) => {
        const match = strengthData.find((s) => s.coursecode === params.row.coursecode && s.programcode === params.row.programcode);
        const count = match ? match.studentStrength : params.row.studentStrength;
        return (
          <Chip
            size="small"
            icon={<GroupsIcon style={{ fontSize: 16 }} />}
            label={`${count ?? 0} Students`}
            color={count > 0 ? "primary" : "default"}
            variant="outlined"
            sx={{ fontWeight: 700 }}
          />
        );
      }
    },
    {
      field: "gap",
      headerName: "Gap (Days)",
      width: 110,
      renderCell: (params) => (
        <Typography fontWeight={700} color="secondary.main">
          {courseGaps[params.row.coursecode] ?? defaultGap} d
        </Typography>
      )
    },
    { field: "coursetype", headerName: "Course Type", width: 120 },
    {
      field: "examdate",
      headerName: "Exam Date",
      width: 130,
      renderCell: (params) => (
        <Typography fontWeight={params.value ? 700 : 400} color={params.value ? "success.dark" : "text.secondary"}>
          {params.value ? printDate(params.value) : "Not Scheduled"}
        </Typography>
      )
    },
    { field: "examslot", headerName: "Exam Slot", width: 160 }
  ];

  return (
    <MenuPageShell title="Exam auto scheduler 4">
      <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: "#f6f7fb", minHeight: "100vh" }}>
        {/* Header Section */}
        <Paper elevation={0} sx={{ p: 2.5, mb: 2.5, border: "1px solid #e5e7eb", borderRadius: 2 }}>
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2} alignItems={{ md: "center" }}>
            <Box>
              <Typography variant="h5" fontWeight={900}>
                Exam auto scheduler 4 (Strength &amp; Gap Analyzer)
              </Typography>
              <Typography color="text.secondary">
                Check student strength for each course, specify custom gap days between papers, and generate the examination timetable.
              </Typography>
            </Box>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={checkStrength}
                disabled={loadingStrength || !form.examcode}
              >
                {loadingStrength ? "Checking Strength..." : "Check Course Strength"}
              </Button>
              <Button variant="outlined" startIcon={<PrintIcon />} onClick={printPreview} disabled={!filteredRows.length}>
                Print Preview
              </Button>
              <Button variant="contained" startIcon={<PrintIcon />} onClick={printScheduleFormat} disabled={!filteredRows.length}>
                Schedule Format Print
              </Button>
            </Stack>
          </Stack>
        </Paper>

        {message && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMessage("")}>{message}</Alert>}
        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}

        {/* Configuration Filters & Parameters */}
        <Paper elevation={0} sx={{ p: 2.5, mb: 2.5, border: "1px solid #e5e7eb", borderRadius: 2 }}>
          <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 2, display: "flex", alignItems: "center", gap: 1 }}>
            <CalendarMonthIcon color="primary" /> 1. Select Exam &amp; Schedule Parameters
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={12} md={2.5}>
              <Autocomplete
                options={academicYears}
                value={form.academicyear}
                onChange={(_, value) => setForm((prev) => ({ ...prev, academicyear: value || "", examcode: "", programs: [] }))}
                renderInput={(params) => <TextField {...params} label="Academic Year" />}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <Autocomplete
                options={examOptions}
                value={examOptions.find((row) => row.examcode === form.examcode) || null}
                getOptionLabel={(row) => row?._id ? `${row.examname} (${row.examcode})` : ""}
                onChange={(_, value) => selectExam(value?.examcode || "")}
                renderInput={(params) => <TextField {...params} label="Exam / Exam Code" />}
              />
            </Grid>
            <Grid item xs={12} md={3.5}>
              <MultiSelect
                label="Programs"
                options={programOptions}
                value={form.programs}
                onChange={(value) => setForm((prev) => ({ ...prev, programs: value }))}
                getLabel={(item) => `${item.program} (${item.programcode})`}
                disabled={!form.examcode}
              />
            </Grid>
            <Grid item xs={12} md={1.5}>
              <TextField
                fullWidth
                type="date"
                label="Start Date"
                value={form.fromdate}
                onChange={(e) => setForm((p) => ({ ...p, fromdate: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={1.5}>
              <TextField
                fullWidth
                type="date"
                label="End Date"
                value={form.todate}
                onChange={(e) => setForm((p) => ({ ...p, todate: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12}>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }}>
                <FormControlLabel
                  control={<Checkbox checked={!!form.useHrHolidayList} onChange={(e) => setForm((p) => ({ ...p, useHrHolidayList: e.target.checked }))} />}
                  label="Consider HR holiday list while scheduling (skip holidays & Sundays)"
                />
                <Button variant="outlined" size="small" href="/hrleaveholidaylist">
                  Open holiday list
                </Button>
              </Stack>
            </Grid>

            {/* Exam Slots Section */}
            <Grid item xs={12}>
              <Paper variant="outlined" sx={{ p: 2, bgcolor: "#fbfcfe" }}>
                <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1} sx={{ mb: 1.5 }}>
                  <Box>
                    <Typography fontWeight={900} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <AccessTimeIcon fontSize="small" color="primary" /> Configured Exam Slots
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Controls how many slots per exam day are utilized for scheduling.
                    </Typography>
                  </Box>
                  <Button variant="contained" size="small" onClick={addSlot}>
                    Add Slot
                  </Button>
                </Stack>
                <Grid container spacing={1.5}>
                  {slots.map((slot, index) => (
                    <Grid item xs={12} md={4} key={`slot-${index}`}>
                      <Stack direction="row" spacing={1}>
                        <TextField fullWidth size="small" label={`Slot ${index + 1}`} value={slot} onChange={(e) => updateSlot(index, e.target.value)} />
                        <Button color="error" variant="outlined" disabled={slots.length <= 1} onClick={() => removeSlot(index)}>
                          Remove
                        </Button>
                      </Stack>
                    </Grid>
                  ))}
                </Grid>
              </Paper>
            </Grid>

            {/* Gap Configuration Toolbar */}
            <Grid item xs={12}>
              <Paper variant="outlined" sx={{ p: 2, bgcolor: "#fffdfa", borderColor: "#fde047" }}>
                <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ md: "center" }} spacing={2}>
                  <Box>
                    <Typography fontWeight={900} sx={{ display: "flex", alignItems: "center", gap: 1, color: "#854d0e" }}>
                      <TuneIcon fontSize="small" /> Inter-Course Gap Settings (Preparation Days)
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Set preparation days between consecutive papers for the same program &amp; semester. You can customize the gap for each course in the table below.
                    </Typography>
                  </Box>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems="center">
                    <TextField
                      type="number"
                      size="small"
                      label="Default Gap (Days)"
                      value={defaultGap}
                      onChange={(e) => setDefaultGap(Math.max(0, parseInt(e.target.value, 10) || 0))}
                      inputProps={{ min: 0, max: 14 }}
                      sx={{ width: 150 }}
                      InputProps={{
                        endAdornment: <InputAdornment position="end">days</InputAdornment>
                      }}
                    />
                    <Button variant="outlined" color="warning" size="small" onClick={applyDefaultGapToAll} disabled={!strengthData.length && !filteredRows.length}>
                      Apply to All Courses
                    </Button>
                    <Button variant="text" size="small" onClick={resetAllGaps} disabled={!Object.keys(courseGaps).length}>
                      Reset Overrides
                    </Button>
                  </Stack>
                </Stack>
              </Paper>
            </Grid>

            {/* AI Scheduling Settings */}
            <Grid item xs={12} md={2}>
              <TextField select fullWidth label="AI Provider" value={form.provider} onChange={(e) => setForm((p) => ({ ...p, provider: e.target.value }))}>
                <MenuItem value="Gemini">Gemini</MenuItem>
                <MenuItem value="Ollama">Ollama</MenuItem>
              </TextField>
            </Grid>
            {form.provider === "Gemini" ? (
              <Grid item xs={12} md={2}>
                <TextField select fullWidth label="Gemini Model" value={form.geminiModel} onChange={(e) => setForm((p) => ({ ...p, geminiModel: e.target.value }))}>
                  {geminiModels.map((model) => <MenuItem key={model} value={model}>{model}</MenuItem>)}
                </TextField>
              </Grid>
            ) : (
              <Grid item xs={12} md={2}>
                <TextField select fullWidth label="Ollama" value={form.ollamaConfigId} onChange={(e) => setForm((p) => ({ ...p, ollamaConfigId: e.target.value }))}>
                  {ollama.map((item) => <MenuItem key={item._id} value={item._id}>{item.name || item.modelname}</MenuItem>)}
                </TextField>
              </Grid>
            )}
            <Grid item xs={12} md={8}>
              <TextField fullWidth multiline minRows={1} label="AI scheduling rules / instructions" value={form.rules} onChange={(e) => setForm((p) => ({ ...p, rules: e.target.value }))} />
            </Grid>

            {/* Action Buttons */}
            <Grid item xs={12} md={3}>
              <Button
                fullWidth
                variant="contained"
                color="primary"
                disabled={loading || !form.examcode}
                startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <AutoModeIcon />}
                onClick={() => runSchedule("auto")}
                sx={{ height: 50, fontWeight: 800, fontSize: 15 }}
              >
                {loading ? "Generating Time Table..." : "Generate Time Table"}
              </Button>
            </Grid>
            <Grid item xs={12} md={2.5}>
              <Button
                fullWidth
                variant="outlined"
                disabled={loading || !form.examcode}
                onClick={() => runSchedule("ai")}
                sx={{ height: 50, fontWeight: 700 }}
              >
                Schedule with AI
              </Button>
            </Grid>

            {aiNotes && (
              <Grid item xs={12}>
                <Alert severity="info" sx={{ whiteSpace: "pre-wrap" }}>
                  <strong>AI Scheduling Guidance:</strong><br />{aiNotes}
                </Alert>
              </Grid>
            )}
          </Grid>
        </Paper>

        {/* 2. Course Strength & Gap Analysis Table */}
        <Paper elevation={0} sx={{ p: 2.5, mb: 2.5, border: "1px solid #e5e7eb", borderRadius: 2 }}>
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ md: "center" }} spacing={2} sx={{ mb: 2 }}>
            <Box>
              <Typography variant="h6" fontWeight={800} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <GroupsIcon color="primary" /> 2. Course Student Strength &amp; Gap Configuration
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Review examinee strength for each paper. Adjust the required preparation gap (in days) prior to generating the timetable.
              </Typography>
            </Box>
            <TextField
              size="small"
              placeholder="Search course code, title, program..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              sx={{ width: { xs: "100%", md: 320 } }}
            />
          </Stack>

          {/* Strength Summary Metric Cards */}
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={6} sm={3}>
              <Card variant="outlined" sx={{ bgcolor: "#f8fafc", borderColor: "#cbd5e1" }}>
                <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={700}>TOTAL COURSES</Typography>
                  <Typography variant="h5" fontWeight={900} color="#0f172a">{strengthSummary.totalCourses}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Card variant="outlined" sx={{ bgcolor: "#eff6ff", borderColor: "#bfdbfe" }}>
                <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
                  <Typography variant="caption" color="primary" fontWeight={700}>TOTAL EXAMINEES / STRENGTH</Typography>
                  <Typography variant="h5" fontWeight={900} color="primary.main">{strengthSummary.totalStudents}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Card variant="outlined" sx={{ bgcolor: "#f0fdf4", borderColor: "#bbf7d0" }}>
                <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
                  <Typography variant="caption" color="success.dark" fontWeight={700}>SCHEDULED PAPERS</Typography>
                  <Typography variant="h5" fontWeight={900} color="success.main">{strengthSummary.scheduledCourses}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Card variant="outlined" sx={{ bgcolor: "#fff7ed", borderColor: "#fed7aa" }}>
                <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
                  <Typography variant="caption" color="warning.dark" fontWeight={700}>UNSCHEDULED PAPERS</Typography>
                  <Typography variant="h5" fontWeight={900} color="warning.main">{strengthSummary.unscheduledCourses}</Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Interactive Course Strength & Gap Table */}
          <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 440, overflow: "auto" }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow sx={{ bgcolor: "#f1f5f9" }}>
                  <TableCell sx={{ fontWeight: 800 }}>#</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Course Code</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Course Name</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Program</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Semester</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Course Type</TableCell>
                  <TableCell sx={{ fontWeight: 800, textAlign: "center", bgcolor: "#eff6ff" }}>
                    Student Strength
                  </TableCell>
                  <TableCell sx={{ fontWeight: 800, textAlign: "center", bgcolor: "#fffdfa" }}>
                    Preparation Gap (Days)
                  </TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Scheduled Date</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Exam Slot</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {displayCourses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} sx={{ textAlign: "center", py: 4 }}>
                      <Typography color="text.secondary">
                        {form.examcode ? "No course records match your search or filter." : "Please select an Academic Year and Exam above to view course strength."}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  displayCourses.map((c, idx) => {
                    const currentGap = courseGaps[c.coursecode] !== undefined ? courseGaps[c.coursecode] : defaultGap;
                    const hasCustomGap = courseGaps[c.coursecode] !== undefined && courseGaps[c.coursecode] !== defaultGap;
                    return (
                      <TableRow key={c._id || `${c.coursecode}-${idx}`} hover sx={{ bgcolor: c.examdate ? "#f0fdf4" : undefined }}>
                        <TableCell sx={{ color: "text.secondary" }}>{idx + 1}</TableCell>
                        <TableCell sx={{ fontWeight: 800, color: "#1e3a8a" }}>{c.coursecode}</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{c.course}</TableCell>
                        <TableCell>{c.program} ({c.programcode})</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Sem {c.semester}</TableCell>
                        <TableCell>{c.coursetype || "Theory"}</TableCell>
                        <TableCell sx={{ textAlign: "center", bgcolor: "#eff6ff" }}>
                          <Chip
                            size="small"
                            icon={<GroupsIcon style={{ fontSize: 16 }} />}
                            label={`${c.studentStrength ?? 0} Students`}
                            color={(c.studentStrength ?? 0) > 0 ? "primary" : "default"}
                            sx={{ fontWeight: 800 }}
                          />
                        </TableCell>
                        <TableCell sx={{ textAlign: "center", bgcolor: "#fffdfa" }}>
                          <Stack direction="row" spacing={0.5} justifyContent="center" alignItems="center">
                            <TextField
                              type="number"
                              size="small"
                              value={currentGap}
                              onChange={(e) => handleCourseGapChange(c.coursecode, e.target.value)}
                              inputProps={{ min: 0, max: 14, style: { textAlign: "center", fontWeight: 800, padding: "4px" } }}
                              sx={{ width: 68, bgcolor: hasCustomGap ? "#fef08a" : "#fff" }}
                            />
                            <Typography variant="caption" color="text.secondary">days</Typography>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          {c.examdate ? (
                            <Chip
                              size="small"
                              icon={<CheckCircleIcon style={{ fontSize: 15 }} />}
                              label={printDate(c.examdate)}
                              color="success"
                              sx={{ fontWeight: 700 }}
                            />
                          ) : (
                            <Chip
                              size="small"
                              icon={<HourglassEmptyIcon style={{ fontSize: 14 }} />}
                              label="Unscheduled"
                              variant="outlined"
                              sx={{ color: "text.secondary" }}
                            />
                          )}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{c.examslot || "—"}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        {/* 3. Generated Timetable Full Grid */}
        <Paper elevation={0} sx={{ p: 2.5, border: "1px solid #e5e7eb", borderRadius: 2 }}>
          <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} spacing={1} sx={{ mb: 2 }}>
            <Typography variant="h6" fontWeight={800}>
              3. Complete Examination Timetable Schedule
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Showing {filteredRows.length} total scheduled papers. Filter and export using grid toolbar.
            </Typography>
          </Stack>
          <Box sx={{ height: 600 }}>
            <DataGrid
              rows={filteredRows}
              getRowId={(row) => row._id}
              columns={courseColumns}
              slots={{ toolbar: GridToolbar }}
              pageSizeOptions={[10, 25, 50, 100]}
            />
          </Box>
        </Paper>
      </Box>
    </MenuPageShell>
  );
}
