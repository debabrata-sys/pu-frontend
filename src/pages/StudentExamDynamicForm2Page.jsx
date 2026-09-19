import React, { useEffect, useMemo, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
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
  FormControl,
  Grid,
  InputLabel,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  Stack,
  Tab,
  Tabs,
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
import {
  ArrowBack,
  CalendarMonth,
  EventAvailable,
  AccessTime,
  Schedule,
  Payments,
  CheckCircle,
  Warning,
  Print,
  Refresh,
  Save,
  UploadFile,
  InfoOutlined
} from "@mui/icons-material";
import { DataGrid, GridToolbar } from "@mui/x-data-grid";
import ep1 from "../api/ep1";
import global1 from "./global1";
import MenuPageShell from "./MenuPageShell";

const years = ["2023-24", "2024-25", "2025-26", "2026-27", "2027-28", "2028-29", "2029-30", "2030-31"];

const uniqueSorted = (values = []) =>
  [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true })
  );

const money = (value) => Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
const courseKey = (row) => `${row.coursecode || ""}||${row.examtype || ""}`;

const pageBox = { p: { xs: 1.5, sm: 3 }, maxWidth: 1500, mx: "auto" };
const paperSx = { p: 2.5, borderRadius: 2, border: "1px solid #e5e7eb", boxShadow: "0 10px 28px rgba(15,23,42,0.06)" };

const safeText = (value) => String(value ?? "").trim();
const escapeHtml = (value) =>
  safeText(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const firstValue = (...values) => values.find((value) => safeText(value)) || "";

const formatDate = (value) => {
  if (!value) return "–";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return safeText(value);
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const studentPhoto = (student = {}) => firstValue(student.photo, student.photolink, student.photoUrl, student.image, student.profilephoto);
const studentDob = (student = {}) => firstValue(student.dateofbirth, student.dob, student.birthdate);

const institutionRecord = (payload) => {
  const data = payload?.data?.classes || payload?.classes || payload?.data || payload || [];
  return Array.isArray(data) ? data[0] || {} : data;
};

const institutionName = (institution = {}) => firstValue(institution.institutionname, institution.name, global1.insname, "Institution");
const institutionLogo = (institution = {}) => firstValue(institution.logolink, institution.logo, institution.inslogo, global1.logo);
const institutionAddress = (institution = {}) => firstValue(institution.address, global1.address);

const profileFields = [
  ["Name of the Student", "name"],
  ["Enrollment No", "regno"],
  ["ABC ID", "abcid"],
  ["Father's name", "fathername"],
  ["Mother's Name", "mothername"],
  ["Date of birth", "dateofbirth"],
  ["Gender", "gender"],
  ["Nationality", "nationality"],
  ["Category", "category"],
  ["Program", "program"],
  ["Program Code", "programcode"],
  ["Regulation", "regulation"],
  ["Semester", "semester"],
  ["Section", "section"]
];

const profileValue = (student = {}, field) => {
  if (field === "dateofbirth") return formatDate(studentDob(student));
  if (field === "abcid") return firstValue(student.abcid, student.abcID, student.abc_id, student.abcId);
  if (field === "regno") return firstValue(student.regno, student.enrollmentno, student.enrollment_no, student.rollno);
  if (field === "name") return firstValue(student.name, student.studentname, student.student_name);
  if (field === "fathername") return firstValue(student.fathername, student.father_name, student.guardianname);
  if (field === "mothername") return firstValue(student.mothername, student.mother_name);
  if (field === "gender") return firstValue(student.gender, student.sex);
  if (field === "nationality") return firstValue(student.nationality, "Indian");
  if (field === "category") return firstValue(student.category, "General");
  if (field === "program") return firstValue(student.program, student.department);
  if (field === "programcode") return firstValue(student.programcode, student.department);
  if (field === "regulation") return firstValue(student.regulation);
  if (field === "semester") return firstValue(student.semester);
  if (field === "section") return firstValue(student.section);
  return firstValue(student[field]);
};

const loadInstitutionDetails = async () => {
  const res = await ep1.get("/api/v1/getinstitutionname", {
    params: { colid: global1.colid, user: global1.user, token: global1.token }
  });
  return institutionRecord(res.data);
};

const feeNumber = (value) => Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const openStudentExamFormPrint = ({
  institution = {},
  student = {},
  courses = [],
  exam = {},
  fees = [],
  title = "Student Exam Form"
}) => {
  const logo = institutionLogo(institution);
  const photo = studentPhoto(student);
  const today = formatDate(new Date());
  const profileHtml = profileFields
    .map(
      ([label, field]) => `
    <div class="profile-item"><span>${escapeHtml(label)}</span><strong>${escapeHtml(profileValue(student, field) || "NA")}</strong></div>
  `
    )
    .join("");

  const courseHtml = (courses || [])
    .map(
      (row, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${escapeHtml(row.coursecode)}</td>
      <td>${escapeHtml(row.course)}</td>
      <td>${escapeHtml(row.subject)}</td>
      <td>${escapeHtml(row.type || row.examtype)}</td>
      <td>${escapeHtml(row.semester)}</td>
      <td>${escapeHtml(row.examdate)}</td>
      <td>${escapeHtml(row.examslot)}</td>
    </tr>
  `
    )
    .join("");

  const feeHtml = (fees || [])
    .map(
      (row, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${escapeHtml(row.feegroup)}</td>
      <td>${escapeHtml(row.feeitem)}</td>
      <td>${escapeHtml(formatDate(row.classdate))}</td>
      <td class="num">${feeNumber(row.amount)}</td>
      <td class="num">${feeNumber(row.paid)}</td>
      <td class="num">${feeNumber(row.concession)}</td>
      <td class="num">${feeNumber(row.balance)}</td>
      <td>${escapeHtml(formatDate(row.paiddate))}</td>
      <td>${escapeHtml(row.status)}</td>
    </tr>
  `
    )
    .join("");

  const win = window.open("", "_blank", "width=980,height=900");
  if (!win) return;
  win.document.write(`<!doctype html><html><head><title>${escapeHtml(title)}</title><style>
    @page { size: A4 portrait; margin: 12mm; }
    * { box-sizing: border-box; }
    body { margin: 0; background: #fff; color: #000; font-family: Arial, Helvetica, sans-serif; font-size: 12px; }
    .toolbar { padding: 10px; background: #f3f4f6; border-bottom: 1px solid #d1d5db; position: sticky; top: 0; z-index: 2; }
    .toolbar button { margin-right: 8px; padding: 7px 14px; border: 1px solid #111; background: #fff; cursor: pointer; }
    .page { width: 210mm; min-height: 297mm; margin: 0 auto; padding: 10mm; background: #fff; color: #000; }
    .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 10px; }
    .header img { max-height: 58px; max-width: 120px; object-fit: contain; margin-bottom: 4px; }
    .inst { font-size: 18px; font-weight: 800; }
    .title { text-align: center; font-size: 16px; font-weight: 800; text-transform: uppercase; margin: 10px 0; }
    .meta { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin-bottom: 10px; }
    .meta div, .profile-item { border: 1px solid #111; padding: 5px; min-height: 30px; }
    .meta span, .profile-item span { display: block; font-size: 10px; color: #111; text-transform: uppercase; }
    .meta strong, .profile-item strong { display: block; font-size: 12px; overflow-wrap: anywhere; }
    .student { display: grid; grid-template-columns: 1fr 96px; gap: 10px; align-items: start; }
    .profile { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; }
    .photo { width: 96px; height: 118px; border: 1px solid #111; object-fit: cover; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th, td { border: 1px solid #111; padding: 5px; text-align: left; vertical-align: top; }
    .num { text-align: right; }
    th { font-weight: 800; background: #f5f5f5; }
    thead { display: table-header-group; }
    tr { page-break-inside: avoid; }
    .section-title { font-size: 12px; font-weight: 800; text-transform: uppercase; text-align: center; margin: 12px 0 5px; }
    .declaration { margin-top: 10px; font-size: 11px; line-height: 1.35; }
    .declaration ol { margin: 4px 0 0 18px; padding: 0; }
    .declaration li { margin-bottom: 3px; }
    .student-sign { text-align: right; margin-top: 16px; }
    .office { margin-top: 8px; font-size: 11px; line-height: 1.35; }
    .footer-sign { display: grid; grid-template-columns: 1fr 1fr; gap: 26px; margin-top: 26px; align-items: end; }
    .hoi-sign { text-align: right; min-height: 54px; }
    .place-date div { margin-bottom: 10px; }
    @media print { .toolbar { display: none; } .page { width: auto; min-height: auto; margin: 0; padding: 0; } }
  </style></head><body>
    <div class="toolbar"><button onclick="window.print()">Print</button><button onclick="window.close()">Close</button></div>
    <div class="page">
      <div class="header">${logo ? `<img src="${escapeHtml(logo)}" alt="Logo" />` : ""}<div class="inst">${escapeHtml(institutionName(institution))}</div><div>${escapeHtml(institutionAddress(institution))}</div></div>
      <div class="title">${escapeHtml(title)}</div>
      <div class="meta">
        <div><span>Academic Year</span><strong>${escapeHtml(exam.academicyear || student.academicyear)}</strong></div>
        <div><span>Exam</span><strong>${escapeHtml(exam.exam || exam.examname || "")}</strong></div>
        <div><span>Exam Code</span><strong>${escapeHtml(exam.examcode || "")}</strong></div>
        <div><span>Date</span><strong>${today}</strong></div>
      </div>
      <div class="student">
        <div class="profile">${profileHtml}</div>
        ${photo ? `<img class="photo" src="${escapeHtml(photo)}" alt="Student photo" />` : `<div class="photo"></div>`}
      </div>
      <table>
        <thead><tr><th>Sr</th><th>Course Code</th><th>Course</th><th>Subject</th><th>Type</th><th>Semester</th><th>Exam Date</th><th>Slot</th></tr></thead>
        <tbody>${courseHtml || `<tr><td colspan="8" style="text-align:center">No subjects found</td></tr>`}</tbody>
      </table>
      <div class="section-title">Exam Fee Details</div>
      <table>
        <thead><tr><th>Sr</th><th>Fee Group</th><th>Fee Item</th><th>Date</th><th>Amount</th><th>Paid</th><th>Concession</th><th>Balance</th><th>Paid Date</th><th>Status</th></tr></thead>
        <tbody>${feeHtml || `<tr><td colspan="10" style="text-align:center">No exam fee ledger rows found</td></tr>`}</tbody>
      </table>
      <div class="declaration">
        <div class="section-title">Declaration by the Examinee</div>
        <ol>
          <li>I have read and understood the ordinance, rules and instructions for the examination and undertake to abide by them.</li>
          <li>I hereby declare that I have fulfilled the required attendance and eligibility criteria prescribed for appearing in this examination.</li>
          <li>I have not been debarred, rusticated, detained or declared not eligible by the Institution/University for this examination.</li>
          <li>The information furnished in this form is correct to the best of my knowledge and belief.</li>
        </ol>
        <div class="student-sign">Signature of Examinee / Student</div>
      </div>
      <div class="office">
        <div class="section-title">Certificate from Institution / Department</div>
        <p>Certified that the student has fulfilled attendance, internal assessment and academic prerequisites prescribed under examination ordinances.</p>
        <div class="footer-sign">
          <div class="place-date"><div>Place: _________________</div><div>Date: __________________</div></div>
          <div class="hoi-sign">Signature &amp; Seal of Head of Institution / Department</div>
        </div>
      </div>
    </div>
  </body></html>`);
  win.document.close();
};

function BackButton({ student = false }) {
  return (
    <Button
      component={RouterLink}
      to={student ? "/dashmclassenr1stud" : "/dashdashfacnew"}
      startIcon={<ArrowBack />}
      variant="outlined"
      sx={{ mb: 2 }}
    >
      Back
    </Button>
  );
}

function SelectText({ label, value, onChange, options, disabled = false }) {
  return (
    <FormControl fullWidth size="small" disabled={disabled}>
      <InputLabel>{label}</InputLabel>
      <Select label={label} value={value || ""} onChange={(event) => onChange(event.target.value)}>
        <MenuItem value="">Select</MenuItem>
        {options.map((option) => (
          <MenuItem key={option} value={option}>
            {option}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

function DynamicField({ field, value, onChange }) {
  const options = String(field.options || "").split(",").map((item) => item.trim()).filter(Boolean);
  if (field.fieldtype === "Dropdown" || field.fieldtype === "Yes/No") {
    return <SelectText label={field.label} value={value} options={field.fieldtype === "Yes/No" ? ["Yes", "No"] : options} onChange={onChange} />;
  }
  if (field.fieldtype === "Textarea") {
    return <TextField fullWidth multiline minRows={3} size="small" label={field.label} value={value || ""} onChange={(e) => onChange(e.target.value)} required={/^yes$/i.test(field.required)} />;
  }
  return <TextField fullWidth size="small" type={field.fieldtype === "Date" ? "date" : field.fieldtype === "Number" ? "number" : "text"} label={field.label} value={value || ""} onChange={(e) => onChange(e.target.value)} InputLabelProps={field.fieldtype === "Date" ? { shrink: true } : undefined} required={/^yes$/i.test(field.required)} />;
}

// Calculate window status for a fill-up date record
function computeWindowStatus(item) {
  if (!item) return { label: "Not Scheduled", color: "default", isClosed: false, isLate: false };
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const lastDate = item.lastdate ? new Date(item.lastdate) : null;
  const fine1Date = item.lastdatefine1 ? new Date(item.lastdatefine1) : null;
  const fine2Date = item.lastdatefine2 ? new Date(item.lastdatefine2) : null;
  const fine3Date = item.lastdatefine3 ? new Date(item.lastdatefine3) : null;

  if (lastDate && now <= lastDate) {
    return { label: "Normal Fee Window Open (No Late Fee)", color: "success", isClosed: false, isLate: false, fine: 0 };
  }
  if (fine1Date && now <= fine1Date) {
    return { label: `Late Fine 1 Applicable (+₹${money(item.lastdatefine1amount)})`, color: "warning", isClosed: false, isLate: true, fine: item.lastdatefine1amount };
  }
  if (fine2Date && now <= fine2Date) {
    return { label: `Late Fine 2 Applicable (+₹${money(item.lastdatefine2amount)})`, color: "warning", isClosed: false, isLate: true, fine: item.lastdatefine2amount };
  }
  if (fine3Date && now <= fine3Date) {
    return { label: `Late Fine 3 Applicable (+₹${money(item.lastdatefine3amount)})`, color: "error", isClosed: false, isLate: true, fine: item.lastdatefine3amount };
  }
  if (fine3Date || fine2Date || fine1Date || lastDate) {
    return { label: "Submission Window Closed", color: "error", isClosed: true, isLate: true, fine: 0 };
  }
  return { label: "Schedule Announced", color: "info", isClosed: false, isLate: false, fine: 0 };
}

export default function StudentExamDynamicForm2Page() {
  const [filters, setFilters] = useState({ academicyear: "2026-27", examcode: "", examtype: "Regular" });
  const [exams, setExams] = useState([]);
  const [context, setContext] = useState(null);
  const [selectedFormId, setSelectedFormId] = useState("");
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [data, setData] = useState({});
  const [documents, setDocuments] = useState([]);
  const [selectedCourses, setSelectedCourses] = useState([]);
  const [institution, setInstitution] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Exam Form Fill-up Dates states
  const [fillupDates, setFillupDates] = useState([]);
  const [loadingDates, setLoadingDates] = useState(false);

  useEffect(() => {
    loadExams();
    loadInstitutionDetails().then(setInstitution).catch(() => setInstitution({}));
    loadFillupDates(filters.academicyear);
  }, []);

  const loadExams = async () => {
    try {
      const res = await ep1.get("/api/v2/conductexam/exams", { params: { colid: global1.colid } });
      setExams(res.data?.data || []);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load exams");
    }
  };

  const loadFillupDates = async (acadYear) => {
    try {
      setLoadingDates(true);
      const params = { colid: global1.colid };
      if (acadYear) params.academicyear = acadYear;
      const res = await ep1.get("/api/v2/conductexam/form-fillup-dates", { params });
      setFillupDates(res.data?.data || []);
    } catch (err) {
      console.error("Unable to load form fill-up dates:", err);
    } finally {
      setLoadingDates(false);
    }
  };

  const loadContext = async () => {
    try {
      setLoading(true);
      setError("");
      setMessage("");
      setContext(null);
      setSelectedCourses([]);
      setSelectedFormId("");
      const res = await ep1.get("/api/v2/conductexam/student-exam-form-context", {
        params: {
          colid: global1.colid,
          regno: global1.regno,
          academicyear: filters.academicyear,
          examcode: filters.examcode,
          examtype: filters.examtype
        }
      });
      const nextContext = res.data?.data || null;
      setContext(nextContext);
      if (nextContext?.forms?.length) setSelectedFormId(nextContext.forms[0].formid);

      // Refresh fill-up dates for student's academic year
      loadFillupDates(filters.academicyear);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load exam form");
    } finally {
      setLoading(false);
    }
  };

  const selectedExam = useMemo(
    () => exams.find((row) => row.examcode === filters.examcode && row.academicyear === filters.academicyear) || {},
    [exams, filters]
  );
  const selectedForm = useMemo(
    () => (context?.forms || []).find((form) => form.formid === selectedFormId),
    [context, selectedFormId]
  );
  const formTabs = useMemo(
    () => [...(selectedForm?.tabs || [])].sort((a, b) => Number(a.order || 0) - Number(b.order || 0)),
    [selectedForm]
  );
  const courses = useMemo(
    () => (filters.examtype === "Supplementary" ? context?.supplementaryCourses || [] : context?.regularCourses || []),
    [context, filters.examtype]
  );
  const courseRows = useMemo(
    () => courses.map((row, index) => ({ ...row, id: courseKey(row) || `course-${index}` })),
    [courses]
  );
  const persistedFeeLedgerRows = useMemo(
    () => (context?.examFeeLedger || []).map((row, index) => ({ ...row, id: row._id || `fee-${index}` })),
    [context]
  );
  const allCourseIds = useMemo(() => courseRows.map((row) => row.id), [courseRows]);
  const allCoursesSelected = allCourseIds.length > 0 && allCourseIds.every((id) => selectedCourses.includes(id));
  const someCoursesSelected = allCourseIds.some((id) => selectedCourses.includes(id));

  useEffect(() => {
    setSelectedCourses(allCourseIds);
  }, [allCourseIds]);

  const totalFee = selectedCourses.reduce((sum, key) => {
    const course = courseRows.find((row) => row.id === key);
    return sum + Number(course?.fee || 0);
  }, 0);

  const calculatedFeeRows = useMemo(
    () =>
      totalFee > 0
        ? [
            {
              id: "calculated-exam-fee",
              feegroup: "Exam Fee",
              feeitem: "Exam Fee",
              feecategory: "Exam Fee",
              feetype: filters.examtype,
              academicyear: filters.academicyear,
              regulation: context?.student?.regulation,
              program: context?.student?.program,
              programcode: context?.student?.programcode,
              semester: context?.student?.semester,
              amount: totalFee,
              paid: 0,
              concession: 0,
              balance: totalFee,
              classdate: new Date().toISOString(),
              status: "Calculated"
            }
          ]
        : [],
    [totalFee, filters.examtype, filters.academicyear, context]
  );
  const feeLedgerRows = persistedFeeLedgerRows.length ? persistedFeeLedgerRows : calculatedFeeRows;

  const toggleCourse = (key) => {
    setSelectedCourses((prev) => (prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]));
  };
  const toggleAllCourses = () => {
    setSelectedCourses(allCoursesSelected ? [] : allCourseIds);
  };

  const printExamForm = () => {
    const selectedCourseRows = selectedCourses.map((key) => courseRows.find((row) => row.id === key)).filter(Boolean);
    openStudentExamFormPrint({
      institution,
      student: context?.student || {},
      courses: selectedCourseRows.length ? selectedCourseRows : courseRows,
      fees: feeLedgerRows,
      exam: { ...selectedExam, academicyear: filters.academicyear, examcode: filters.examcode },
      title: "Student Exam Form"
    });
  };

  const uploadDocument = async (doc, file) => {
    if (!file) return;
    try {
      setUploadingDoc(doc.documenttype);
      setError("");
      const formData = new FormData();
      formData.append("document", file);
      formData.append("documenttype", doc.documenttype);
      formData.append("colid", global1.colid);
      const res = await ep1.post("/api/v2/conductexam/examform-upload-document", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      const uploaded = res.data?.data;
      setDocuments((prev) => [...prev.filter((item) => item.documenttype !== doc.documenttype), uploaded]);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to upload document");
    } finally {
      setUploadingDoc("");
    }
  };

  const submit = async () => {
    try {
      setSubmitting(true);
      setError("");
      setMessage("");
      const selectedCourseRows = selectedCourses.map((key) => courseRows.find((row) => row.id === key)).filter(Boolean);
      const res = await ep1.post("/api/v2/conductexam/student-exam-form-submit", {
        colid: global1.colid,
        regno: global1.regno,
        formid: selectedFormId,
        academicyear: filters.academicyear,
        exam: selectedExam.exam || selectedExam.examname || filters.examcode,
        examcode: filters.examcode,
        examtype: filters.examtype,
        regulation: context?.student?.regulation,
        semester: context?.student?.semester,
        data,
        documents,
        courses: selectedCourseRows
      });
      if (Array.isArray(res.data?.examFeeLedger)) {
        setContext((prev) => (prev ? { ...prev, examFeeLedger: res.data.examFeeLedger } : prev));
      }
      setMessage(
        `Exam form submitted. Ledger rows: ${res.data?.ledgerCreated || 0}, examroll rows: ${
          res.data?.examRollCreated || 0
        }`
      );
    } catch (err) {
      const errors = err.response?.data?.errors;
      setError(errors?.length ? errors.join("\n") : err.response?.data?.message || "Unable to submit exam form");
    } finally {
      setSubmitting(false);
    }
  };

  // Matching fill-up dates for student's program
  const studentProgCode = String(context?.student?.programcode || "").trim();
  const studentProgName = String(context?.student?.program || "").trim();

  const matchedSchedule = useMemo(() => {
    if (!fillupDates.length) return null;
    if (studentProgCode) {
      const found = fillupDates.find((r) => String(r.programcode || "").trim() === studentProgCode);
      if (found) return found;
    }
    if (studentProgName) {
      const found = fillupDates.find((r) => String(r.program || "").trim().toLowerCase() === studentProgName.toLowerCase());
      if (found) return found;
    }
    return fillupDates[0] || null;
  }, [fillupDates, studentProgCode, studentProgName]);

  const scheduleStatus = useMemo(() => computeWindowStatus(matchedSchedule), [matchedSchedule]);

  return (
    <MenuPageShell title="Dynamic Exam Form 2" menuType="student">
      <Box sx={pageBox}>
        <BackButton student />
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} spacing={1} sx={{ mb: 2 }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800 }}>Dynamic Exam Form 2</Typography>
            <Typography variant="body2" color="text.secondary">
              Exam form submission portal with active fill-up dates and fee schedule.
            </Typography>
          </Box>
        </Stack>

        {error && <Alert severity="error" sx={{ mb: 2, whiteSpace: "pre-line" }}>{error}</Alert>}
        {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}

        {/* 1. Exam Selection Filter Row */}
        <Paper sx={paperSx}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={3}>
              <SelectText
                label="Academic year"
                value={filters.academicyear}
                options={uniqueSorted([...years, ...exams.map((row) => row.academicyear)])}
                onChange={(value) => {
                  setFilters((prev) => ({ ...prev, academicyear: value, examcode: "" }));
                  loadFillupDates(value);
                }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <SelectText
                label="Exam"
                value={filters.examcode}
                options={uniqueSorted(
                  exams
                    .filter((row) => !filters.academicyear || row.academicyear === filters.academicyear)
                    .map((row) => row.examcode)
                )}
                onChange={(value) => setFilters((prev) => ({ ...prev, examcode: value }))}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <SelectText
                label="Exam type"
                value={filters.examtype}
                options={["Regular", "Supplementary"]}
                onChange={(value) => setFilters((prev) => ({ ...prev, examtype: value }))}
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <Button
                fullWidth
                variant="contained"
                disabled={loading || !filters.examcode}
                startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <Refresh />}
                onClick={loadContext}
                sx={{ height: 40, fontWeight: 700 }}
              >
                Load Form
              </Button>
            </Grid>
          </Grid>
        </Paper>

        {/* 2. EXAM FORM FILL-UP DATES SECTION (NEW IN FORM 2) */}
        <Paper sx={{ ...paperSx, mt: 2.5, bgcolor: "#fafafa", border: "1.5px solid #cbd5e1" }}>
          <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} spacing={1.5} sx={{ mb: 1.5 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <CalendarMonth color="primary" />
              <Typography variant="h6" sx={{ fontWeight: 800, color: "#0f172a" }}>
                Exam Form Fill-up Dates &amp; Fee Schedule
              </Typography>
            </Box>
            {matchedSchedule && (
              <Chip
                icon={scheduleStatus.isClosed ? <Warning /> : <CheckCircle />}
                label={scheduleStatus.label}
                color={scheduleStatus.color}
                sx={{ fontWeight: 800, fontSize: "12px", py: 0.5 }}
              />
            )}
          </Stack>

          {loadingDates ? (
            <Box sx={{ py: 3, textAlign: "center" }}>
              <CircularProgress size={28} />
              <Typography variant="body2" sx={{ mt: 1 }} color="text.secondary">
                Loading exam form submission dates...
              </Typography>
            </Box>
          ) : matchedSchedule ? (
            <>
              {/* Highlight Cards for Matched Program */}
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#475569", mb: 1 }}>
                  Schedule for: <span style={{ color: "#0f172a" }}>{matchedSchedule.program} ({matchedSchedule.programcode})</span> — Academic Year: <span style={{ color: "#0f172a" }}>{matchedSchedule.academicyear}</span>
                </Typography>

                <Grid container spacing={1.5}>
                  {/* Regular Exam Fee & Normal Last Date */}
                  <Grid item xs={12} sm={6} md={3}>
                    <Card variant="outlined" sx={{ bgcolor: "#f0fdf4", borderColor: "#86efac", height: "100%" }}>
                      <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
                        <Typography variant="caption" sx={{ color: "#166534", fontWeight: 700, textTransform: "uppercase" }}>
                          Last Date (Without Late Fee)
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: 900, color: "#15803d", my: 0.5 }}>
                          {formatDate(matchedSchedule.lastdate)}
                        </Typography>
                        <Typography variant="body2" sx={{ color: "#166534", fontWeight: 600 }}>
                          Regular Exam Fee: ₹{money(matchedSchedule.examfee)}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>

                  {/* Late Fine 1 */}
                  <Grid item xs={12} sm={6} md={3}>
                    <Card variant="outlined" sx={{ bgcolor: "#fefce8", borderColor: "#fde047", height: "100%" }}>
                      <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
                        <Typography variant="caption" sx={{ color: "#854d0e", fontWeight: 700, textTransform: "uppercase" }}>
                          Last Date with Fine 1
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: 900, color: "#a16207", my: 0.5 }}>
                          {formatDate(matchedSchedule.lastdatefine1)}
                        </Typography>
                        <Typography variant="body2" sx={{ color: "#854d0e", fontWeight: 600 }}>
                          Fine Amount: +₹{money(matchedSchedule.lastdatefine1amount)}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>

                  {/* Late Fine 2 */}
                  <Grid item xs={12} sm={6} md={3}>
                    <Card variant="outlined" sx={{ bgcolor: "#fff7ed", borderColor: "#fdba74", height: "100%" }}>
                      <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
                        <Typography variant="caption" sx={{ color: "#9a3412", fontWeight: 700, textTransform: "uppercase" }}>
                          Last Date with Fine 2
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: 900, color: "#c2410c", my: 0.5 }}>
                          {formatDate(matchedSchedule.lastdatefine2)}
                        </Typography>
                        <Typography variant="body2" sx={{ color: "#9a3412", fontWeight: 600 }}>
                          Fine Amount: +₹{money(matchedSchedule.lastdatefine2amount)}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>

                  {/* Late Fine 3 */}
                  <Grid item xs={12} sm={6} md={3}>
                    <Card variant="outlined" sx={{ bgcolor: "#fff1f2", borderColor: "#fca5a5", height: "100%" }}>
                      <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
                        <Typography variant="caption" sx={{ color: "#9f1239", fontWeight: 700, textTransform: "uppercase" }}>
                          Last Date with Fine 3
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: 900, color: "#be123c", my: 0.5 }}>
                          {formatDate(matchedSchedule.lastdatefine3)}
                        </Typography>
                        <Typography variant="body2" sx={{ color: "#9f1239", fontWeight: 600 }}>
                          Fine Amount: +₹{money(matchedSchedule.lastdatefine3amount)}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>

                {/* Additional Note about Internal Assessment */}
                {matchedSchedule.iafillingdate && (
                  <Box sx={{ mt: 1.5, display: "flex", alignItems: "center", gap: 1 }}>
                    <InfoOutlined fontSize="small" color="primary" />
                    <Typography variant="body2" sx={{ color: "#334155", fontWeight: 600 }}>
                      Internal Assessment (IA) Marks Submission End Date:{" "}
                      <strong>{formatDate(matchedSchedule.iafillingdate)}</strong>
                    </Typography>
                  </Box>
                )}
              </Box>

              {/* Collapsible / Multi-program Schedule Table if multiple entries */}
              {fillupDates.length > 1 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: "#475569" }}>
                    All Programs Form Filling Schedule ({filters.academicyear}):
                  </Typography>
                  <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 240, overflow: "auto" }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow sx={{ bgcolor: "#f1f5f9" }}>
                          <TableCell sx={{ fontWeight: 800 }}>Program</TableCell>
                          <TableCell sx={{ fontWeight: 800 }}>Code</TableCell>
                          <TableCell sx={{ fontWeight: 800 }}>Exam Fee</TableCell>
                          <TableCell sx={{ fontWeight: 800 }}>Last Date (No Fine)</TableCell>
                          <TableCell sx={{ fontWeight: 800 }}>Last Date (Fine 1)</TableCell>
                          <TableCell sx={{ fontWeight: 800 }}>Last Date (Fine 2)</TableCell>
                          <TableCell sx={{ fontWeight: 800 }}>Last Date (Fine 3)</TableCell>
                          <TableCell sx={{ fontWeight: 800 }}>IA End Date</TableCell>
                          <TableCell sx={{ fontWeight: 800 }}>Status</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {fillupDates.map((row) => {
                          const isCurrent = (studentProgCode && row.programcode === studentProgCode) || row._id === matchedSchedule._id;
                          const st = computeWindowStatus(row);
                          return (
                            <TableRow key={row._id} sx={{ bgcolor: isCurrent ? "#f0fdf4" : undefined }}>
                              <TableCell sx={{ fontWeight: isCurrent ? 800 : 500 }}>
                                {row.program} {isCurrent && <Chip label="Your Program" size="small" color="success" sx={{ ml: 1, height: 20, fontSize: 10 }} />}
                              </TableCell>
                              <TableCell sx={{ fontWeight: 700 }}>{row.programcode}</TableCell>
                              <TableCell>₹{money(row.examfee)}</TableCell>
                              <TableCell sx={{ color: "#15803d", fontWeight: 700 }}>{formatDate(row.lastdate)}</TableCell>
                              <TableCell>{formatDate(row.lastdatefine1)} (+₹{money(row.lastdatefine1amount)})</TableCell>
                              <TableCell>{formatDate(row.lastdatefine2)} (+₹{money(row.lastdatefine2amount)})</TableCell>
                              <TableCell>{formatDate(row.lastdatefine3)} (+₹{money(row.lastdatefine3amount)})</TableCell>
                              <TableCell>{formatDate(row.iafillingdate)}</TableCell>
                              <TableCell>
                                <Chip label={st.label} color={st.color} size="small" sx={{ fontWeight: 700, fontSize: 10 }} />
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}
            </>
          ) : (
            <Alert severity="info" sx={{ mt: 1 }}>
              No exam form fill-up dates have been configured for academic year {filters.academicyear} yet. Forms can be submitted as per general examination guidelines.
            </Alert>
          )}
        </Paper>

        {/* 3. Student Details, Dynamic Form Tabs, Documents, Courses & Ledger */}
        {context && (
          <>
            {/* Student Details Card */}
            <Paper sx={{ ...paperSx, mt: 2.5 }}>
              <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2} sx={{ mb: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>Student details</Typography>
                <Button variant="outlined" startIcon={<Print />} onClick={printExamForm}>
                  Print preview
                </Button>
              </Stack>
              <Grid container spacing={2} alignItems="flex-start">
                <Grid item xs={12} md={10}>
                  <Grid container spacing={1.5}>
                    {profileFields.map(([label, field]) => (
                      <Grid item xs={12} sm={6} md={3} key={field}>
                        <Typography variant="caption" color="text.secondary">{label}</Typography>
                        <Typography sx={{ fontWeight: 700, overflowWrap: "anywhere" }}>
                          {profileValue(context.student, field) || "NA"}
                        </Typography>
                      </Grid>
                    ))}
                  </Grid>
                </Grid>
                <Grid item xs={12} md={2}>
                  {studentPhoto(context.student) ? (
                    <Box
                      component="img"
                      src={studentPhoto(context.student)}
                      alt="Student"
                      sx={{
                        width: 110,
                        height: 135,
                        objectFit: "cover",
                        border: "1px solid #d1d5db",
                        borderRadius: 1,
                        bgcolor: "#fff"
                      }}
                    />
                  ) : (
                    <Box
                      sx={{
                        width: 110,
                        height: 135,
                        border: "1px solid #d1d5db",
                        borderRadius: 1,
                        display: "grid",
                        placeItems: "center",
                        color: "text.secondary"
                      }}
                    >
                      Photo
                    </Box>
                  )}
                </Grid>
              </Grid>
            </Paper>

            {/* Dynamic Form Tabs & Fields */}
            <Paper sx={{ ...paperSx, mt: 2.5 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <SelectText
                    label="Form"
                    value={selectedFormId}
                    options={(context.forms || []).map((form) => form.formid)}
                    onChange={(value) => {
                      setSelectedFormId(value);
                      setActiveTabIndex(0);
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={8}>
                  <Typography color="text.secondary">
                    {selectedForm?.instructions || "Select the correct form and complete the tabs below."}
                  </Typography>
                </Grid>
              </Grid>
              {selectedForm ? (
                <>
                  <Tabs
                    value={Math.min(activeTabIndex, Math.max(formTabs.length - 1, 0))}
                    onChange={(_, value) => setActiveTabIndex(value)}
                    sx={{ mt: 2 }}
                  >
                    {formTabs.map((tab) => (
                      <Tab key={tab.title} label={tab.title} />
                    ))}
                  </Tabs>
                  <Grid container spacing={2} sx={{ mt: 1 }}>
                    {((formTabs[activeTabIndex] || {}).fields || [])
                      .sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
                      .map((field) => (
                        <Grid item xs={12} md={field.fieldtype === "Textarea" ? 12 : 4} key={field.fieldname}>
                          <DynamicField
                            field={field}
                            value={data[field.fieldname]}
                            onChange={(value) => setData((prev) => ({ ...prev, [field.fieldname]: value }))}
                          />
                        </Grid>
                      ))}
                  </Grid>
                </>
              ) : (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  No active form is available for this program and exam type.
                </Alert>
              )}
            </Paper>

            {/* Documents Upload Section */}
            {!!selectedForm?.documents?.length && (
              <Paper sx={{ ...paperSx, mt: 2.5 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                  Documents
                </Typography>
                <Grid container spacing={2}>
                  {[...(selectedForm.documents || [])]
                    .sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
                    .map((doc) => {
                      const uploaded = documents.find((item) => item.documenttype === doc.documenttype);
                      return (
                        <Grid item xs={12} md={4} key={doc.documenttype}>
                          <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                            <Typography sx={{ fontWeight: 700 }}>
                              {doc.documenttype} {doc.required === "Yes" ? "*" : ""}
                            </Typography>
                            {uploaded?.url && (
                              <Typography
                                component="a"
                                href={uploaded.url}
                                target="_blank"
                                rel="noreferrer"
                                sx={{ display: "block", mt: 0.5, fontSize: 13 }}
                              >
                                View uploaded document
                              </Typography>
                            )}
                            <Button
                              component="label"
                              size="small"
                              sx={{ mt: 1 }}
                              startIcon={uploadingDoc === doc.documenttype ? <CircularProgress size={14} /> : <UploadFile />}
                              disabled={uploadingDoc === doc.documenttype}
                            >
                              Upload
                              <input hidden type="file" onChange={(event) => uploadDocument(doc, event.target.files?.[0])} />
                            </Button>
                          </Paper>
                        </Grid>
                      );
                    })}
                </Grid>
              </Paper>
            )}

            {/* Courses & Fee Calculation */}
            <Paper sx={{ ...paperSx, mt: 2.5 }}>
              <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2} sx={{ mb: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  {filters.examtype === "Regular" ? "Regular and elective courses" : "Failed supplementary courses"}
                </Typography>
                <Typography sx={{ fontWeight: 800 }}>Total fee: Rs. {money(totalFee)}</Typography>
              </Stack>
              <Box sx={{ height: 420 }}>
                <DataGrid
                  rows={courseRows}
                  columns={[
                    {
                      field: "select",
                      headerName: "",
                      width: 70,
                      sortable: false,
                      filterable: false,
                      disableColumnMenu: true,
                      renderHeader: () => (
                        <Checkbox
                          checked={allCoursesSelected}
                          indeterminate={someCoursesSelected && !allCoursesSelected}
                          disabled={!allCourseIds.length}
                          onChange={toggleAllCourses}
                          inputProps={{ "aria-label": "Select all courses" }}
                        />
                      ),
                      renderCell: (params) => (
                        <Checkbox
                          checked={selectedCourses.includes(params.row.id)}
                          onChange={() => toggleCourse(params.row.id)}
                        />
                      )
                    },
                    { field: "course", headerName: "Course", width: 260 },
                    { field: "coursecode", headerName: "Course code", width: 150 },
                    { field: "subject", headerName: "Subject", width: 170 },
                    { field: "type", headerName: "Type", width: 110 },
                    { field: "fee", headerName: "Fee", width: 120, type: "number" }
                  ]}
                  slots={{ toolbar: GridToolbar }}
                  pageSizeOptions={[25, 50, 100]}
                  initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
                  disableRowSelectionOnClick
                />
              </Box>
              <Stack direction={{ xs: "column", sm: "row" }} justifyContent="flex-end" spacing={1.5} sx={{ mt: 2 }}>
                <Button variant="outlined" size="large" startIcon={<Print />} onClick={printExamForm}>
                  Print preview
                </Button>
                <Button
                  variant="contained"
                  size="large"
                  disabled={submitting || !selectedForm || !selectedCourses.length}
                  startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : <Save />}
                  onClick={submit}
                >
                  Submit exam form
                </Button>
              </Stack>
            </Paper>

            {/* Exam Fee Ledger */}
            <Paper sx={{ ...paperSx, mt: 2.5 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                Exam fee ledger
              </Typography>
              <Box sx={{ height: 300 }}>
                <DataGrid
                  rows={feeLedgerRows}
                  columns={[
                    { field: "feegroup", headerName: "Fee group", width: 150 },
                    { field: "feeitem", headerName: "Fee item", width: 280 },
                    { field: "classdate", headerName: "Date", width: 130, valueGetter: (params) => formatDate(params.row.classdate) },
                    { field: "amount", headerName: "Amount", width: 120, type: "number" },
                    { field: "paid", headerName: "Paid", width: 120, type: "number" },
                    { field: "concession", headerName: "Concession", width: 130, type: "number" },
                    { field: "balance", headerName: "Balance", width: 120, type: "number" },
                    { field: "paiddate", headerName: "Paid date", width: 130, valueGetter: (params) => formatDate(params.row.paiddate) },
                    { field: "status", headerName: "Status", width: 120 }
                  ]}
                  slots={{ toolbar: GridToolbar }}
                  pageSizeOptions={[10, 25, 50]}
                  initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
                  disableRowSelectionOnClick
                />
              </Box>
            </Paper>
          </>
        )}
      </Box>
    </MenuPageShell>
  );
}
