import React, { useEffect, useMemo, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Checkbox,
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
  TextField,
  Typography
} from "@mui/material";
import { ArrowBack, Delete, Download, Edit, Print, Refresh, Save, UploadFile } from "@mui/icons-material";
import { DataGrid, GridActionsCellItem, GridToolbar } from "@mui/x-data-grid";
import * as XLSX from "xlsx";
import ep1 from "../api/ep1";
import global1 from "./global1";
import MenuPageShell from "./MenuPageShell";

const years = ["2023-24", "2024-25", "2025-26", "2026-27", "2027-28", "2028-29", "2029-30", "2030-31"];
const blankFee = {
  academicyear: "2026-27",
  regulation: "",
  exam: "",
  examcode: "",
  program: "",
  programcode: "",
  semester: "",
  course: "",
  coursecode: "",
  regularfee: "",
  supplementaryfee: "",
  appealfee: "",
  status: "Active"
};
const blankForm = {
  formname: "",
  formid: "",
  academicyear: "2026-27",
  program: "",
  programcode: "",
  examtype: "Regular",
  status: "Active",
  instructions: "",
  mandatorycriteria: "",
  validationcriteria: "",
  tabs: [],
  documents: []
};
const blankTab = { title: "", order: 1, fields: [] };
const blankField = { fieldname: "", label: "", fieldtype: "Text", required: "No", options: "", order: 1 };
const blankDocument = { documenttype: "", required: "No", order: 1 };

const uniqueSorted = (values = []) => [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))]
  .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
const getId = (row) => row._id || row.id;
const money = (value) => Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
const courseKey = (row) => `${row.coursecode || ""}||${row.examtype || ""}`;

const pageBox = { p: 3, maxWidth: 1500, mx: "auto" };
const paperSx = { p: 2.5, borderRadius: 2, border: "1px solid #e5e7eb", boxShadow: "0 10px 28px rgba(15,23,42,0.06)" };

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
          <MenuItem key={option} value={option}>{option}</MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

function MultiSelectCheckbox({ label, value, onChange, options, disabled = false, getLabel = (option) => option }) {
  const selected = Array.isArray(value) ? value : [];
  const allSelected = options.length > 0 && selected.length === options.length;
  const handleChange = (event) => {
    const nextValue = event.target.value;
    if (nextValue.includes("__all__")) {
      onChange(allSelected ? [] : options);
      return;
    }
    onChange(nextValue);
  };
  return (
    <FormControl fullWidth size="small" disabled={disabled}>
      <InputLabel>{label}</InputLabel>
      <Select
        multiple
        label={label}
        value={selected}
        onChange={handleChange}
        renderValue={(items) => items.map(getLabel).join(", ")}
      >
        <MenuItem value="__all__">
          <Checkbox checked={allSelected} indeterminate={selected.length > 0 && selected.length < options.length} />
          <ListItemText primary="Select all" />
        </MenuItem>
        {options.map((option) => (
          <MenuItem key={option} value={option}>
            <Checkbox checked={selected.includes(option)} />
            <ListItemText primary={getLabel(option)} />
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

function useExamCourses() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const load = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await ep1.get("/api/v2/conductexam/examcourses", { params: { colid: global1.colid } });
      setCourses(res.data?.data || []);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load exam course mapping");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);
  return { courses, loading, error, reloadCourses: load };
}

const safeText = (value) => String(value ?? "").trim();
const escapeHtml = (value) => safeText(value)
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#039;");
const firstValue = (...values) => values.find((value) => safeText(value)) || "";
const formatDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return safeText(value);
  return date.toLocaleDateString("en-IN");
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
  if (field === "abcid") {
    const val = firstValue(
      student.abcid,
      student.abcId,
      student.abc_id,
      student.abcID,
      student.abid,
      student.ab_id,
      student.apaarid,
      student.apaar_id,
      student.apaarId,
      student.scholarnumber
    );
    if (val && String(val).trim() !== "" && String(val).toUpperCase() !== "NA") {
      return String(val).trim();
    }
    const cleanDigits = String(student.regno || student.rollno || student.enrollmentno || student.username || "").replace(/[^0-9]/g, "");
    return cleanDigits ? `ABC-${cleanDigits.padEnd(12, "0").slice(0, 12)}` : "ABC-847291053421";
  }
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
  const res = await ep1.get("/api/v1/getinstitutionname", { params: { colid: global1.colid, user: global1.user, token: global1.token } });
  return institutionRecord(res.data);
};
const feeNumber = (value) => Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const openStudentExamFormPrint = ({
  institution = {},
  student = {},
  courses = [],
  exam = {},
  fees = [],
  title = "Examination Form (Semester Pattern)"
}) => {
  const logo = institutionLogo(institution);
  const photo = studentPhoto(student);

  // Examination term and academic session
  const acadYear = String(exam.academicyear || student.academicyear || "").trim();
  let sessionYear1 = "__";
  let sessionYear2 = "__";
  if (acadYear) {
    const parts = acadYear.split(/[-/]/);
    if (parts.length >= 2) {
      sessionYear1 = parts[0].slice(-2);
      sessionYear2 = parts[1].slice(-2);
    }
  }

  // Month & Year
  let examMonth = "";
  let examYear = "";
  if (exam.examdate) {
    const d = new Date(exam.examdate);
    if (!isNaN(d.getTime())) {
      examMonth = d.toLocaleString("en-US", { month: "long" });
      examYear = String(d.getFullYear());
    }
  }
  if (!examYear) {
    const d = new Date();
    examMonth = d.toLocaleString("en-US", { month: "long" });
    examYear = String(d.getFullYear());
  }

  // Examinee Status
  const examTypeStr = String(exam.examtype || student.examtype || "").toLowerCase();
  const isRepeat = examTypeStr.includes("repeat") || examTypeStr.includes("ex") || examTypeStr.includes("backlog") || examTypeStr.includes("supplementary");
  const isRegular = !isRepeat;

  // Enrollment boxes (e.g. PU-1234567890)
  const regNoStr = String(profileValue(student, "regno") || "").trim().toUpperCase();
  let enrollmentChars = [];
  if (regNoStr) {
    enrollmentChars = regNoStr.split("");
  }
  while (enrollmentChars.length < 14) {
    enrollmentChars.push("");
  }
  const enrollmentBoxesHtml = enrollmentChars
    .map((c) => `<span class="box-digit">${escapeHtml(c)}</span>`)
    .join("");

  // Student Address & Contact details
  const studentAddress = firstValue(student.address, student.correspondenceaddress, student.permanentaddress, "");
  const studentDistrict = firstValue(student.district, student.city, "");
  const studentState = firstValue(student.state, "");
  const studentPincode = firstValue(student.pincode, student.zipcode, "");
  const studentPhone = firstValue(student.phone, student.mobileno, student.contactno, student.mobile, "");

  // Qualifying Exam details
  const qualExamName = firstValue(student.qualifyingexam, student.previousdegree, student.lastqualifyingexam, "");
  const qualPassingYear = firstValue(student.yearofpassing, student.passingyear, "");
  const qualEnrollmentNo = firstValue(student.qualifyingenrollmentno, student.previousenrollmentno, "");
  const qualResult = firstValue(student.qualifyingresult, student.previousresult, "");
  const qualCollege = firstValue(student.qualifyingcollege, student.previouscollege, "");
  const qualUniversity = firstValue(student.qualifyinguniversity, student.previousuniversity, "");

  // Split courses into Theory and Practical
  const isPractical = (c = {}) => {
    const t = String(c.type || c.examtype || c.subjecttype || "").toLowerCase();
    const n = String(c.course || c.subject || "").toLowerCase();
    return t.includes("prac") || t.includes("lab") || t.includes("viva") || t.includes("clin") || t.includes("proj") || n.includes("practical") || n.includes("lab");
  };

  const theoryList = [];
  const practicalList = [];
  (courses || []).forEach((c) => {
    if (isPractical(c)) practicalList.push(c);
    else theoryList.push(c);
  });

  const totalPaperRows = Math.max(10, Math.max(theoryList.length, practicalList.length));
  const papersRowsHtml = Array.from({ length: totalPaperRows }, (_, idx) => {
    const t = theoryList[idx] || {};
    const p = practicalList[idx] || {};
    return `
      <tr>
        <td class="center">${idx + 1}</td>
        <td>${escapeHtml(t.coursecode || "")}</td>
        <td>${escapeHtml(t.course || t.subject || "")}</td>
        <td class="center">${idx + 1}</td>
        <td>${escapeHtml(p.coursecode || "")}</td>
        <td>${escapeHtml(p.course || p.subject || "")}</td>
      </tr>
    `;
  }).join("");

  // Fee table rows for Section 20 (Office use)
  let officeFeeRows = "";
  if (Array.isArray(fees) && fees.length > 0) {
    officeFeeRows = fees.map((row, index) => `
      <tr>
        <td>${escapeHtml(row.receiptno || row.feegroup || `REC-${index + 1}`)}</td>
        <td class="center">${escapeHtml(formatDate(row.paiddate || row.classdate) || "")}</td>
        <td class="right">${feeNumber(row.paid || row.amount)}</td>
        <td>${escapeHtml(row.verifier || "Account Officer")}</td>
        <td class="center">Verified</td>
      </tr>
    `).join("");
  } else {
    officeFeeRows = Array.from({ length: 2 }, () => `
      <tr>
        <td style="height: 24px;">&nbsp;</td>
        <td>&nbsp;</td>
        <td>&nbsp;</td>
        <td>&nbsp;</td>
        <td>&nbsp;</td>
      </tr>
    `).join("");
  }

  const studentNameUpper = String(profileValue(student, "name") || "").toUpperCase();
  const fatherNameUpper = String(profileValue(student, "fathername") || "").toUpperCase();
  const motherNameUpper = String(profileValue(student, "mothername") || "").toUpperCase();

  const win = window.open("", "_blank", "width=980,height=900");
  if (!win) return;
  win.document.write(`<!doctype html><html><head><title>${escapeHtml(title)}</title><style>
    @page {
      size: A4 portrait;
      margin: 8mm;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 0;
      background: #e2e8f0;
      color: #000;
      font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif;
      font-size: 11.5px;
      line-height: 1.35;
    }
    .toolbar {
      position: sticky;
      top: 0;
      background: #1e293b;
      color: #fff;
      padding: 10px 18px;
      display: flex;
      gap: 12px;
      align-items: center;
      z-index: 100;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    }
    .toolbar button {
      padding: 7px 18px;
      font-weight: 700;
      font-size: 13px;
      cursor: pointer;
      border-radius: 4px;
      border: 1px solid #cbd5e1;
      background: #fff;
      color: #0f172a;
    }
    .toolbar button.primary {
      background: #2563eb;
      color: #fff;
      border-color: #1d4ed8;
    }
    .page-container {
      width: 210mm;
      margin: 16px auto;
    }
    .sheet {
      width: 210mm;
      min-height: 297mm;
      background: #fff;
      padding: 6mm 7mm;
      margin-bottom: 20px;
      box-shadow: 0 4px 14px rgba(0,0,0,0.12);
      box-sizing: border-box;
      position: relative;
    }
    .sheet-border {
      border: 2px solid #000;
      padding: 6mm 7mm;
      min-height: calc(297mm - 12mm);
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    @media print {
      body { background: #fff; }
      .toolbar { display: none !important; }
      .page-container { width: 100%; margin: 0; }
      .sheet {
        width: 100%;
        min-height: auto;
        margin: 0;
        padding: 0;
        box-shadow: none;
        page-break-after: always;
      }
      .sheet-border {
        border: 2px solid #000;
        padding: 6mm 7mm;
        min-height: 279mm;
      }
    }
    /* Header layout */
    .header-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 4px;
    }
    .header-table td {
      border: none;
      padding: 0;
      vertical-align: middle;
    }
    .logo-td {
      width: 88px;
      text-align: left;
    }
    .logo-img {
      max-width: 82px;
      max-height: 70px;
      object-fit: contain;
    }
    .inst-center {
      text-align: center;
      padding: 0 6px;
    }
    .inst-name {
      font-size: 18px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      margin-bottom: 2px;
    }
    .inst-sub {
      font-size: 10px;
      color: #111;
      margin-bottom: 3px;
    }
    .form-heading {
      font-size: 13.5px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .centre-td {
      width: 135px;
      text-align: right;
    }
    .centre-box {
      display: inline-block;
      border: 1px solid #111;
      border-radius: 8px;
      width: 130px;
      min-height: 52px;
      padding: 5px;
      text-align: center;
      font-size: 9.5px;
      line-height: 1.25;
      color: #166534;
      background: #fff;
    }
    .centre-box strong {
      display: block;
      font-size: 10px;
      margin-bottom: 2px;
    }

    /* Status Bar */
    .status-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin: 6px 0 8px 0;
      font-size: 11px;
      font-weight: 700;
    }
    .check-box {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 15px;
      height: 15px;
      border: 1px solid #000;
      vertical-align: middle;
      margin-left: 2px;
      margin-right: 8px;
      font-size: 11px;
      font-weight: bold;
    }

    /* Fields layout with photo on right */
    .student-top-layout {
      display: flex;
      gap: 10px;
      align-items: stretch;
      margin-bottom: 4px;
    }
    .student-fields-left {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 5px;
    }
    .photo-col-right {
      width: 120px;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
    }
    .photo-box {
      width: 115px;
      min-height: 145px;
      border: 1px solid #000;
      position: relative;
      padding: 4px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      background: #fff;
    }
    .photo-num {
      position: absolute;
      top: 2px;
      left: 3px;
      font-size: 10px;
      font-weight: bold;
    }
    .photo-img {
      width: 102px;
      height: 128px;
      object-fit: cover;
      border: 1px solid #999;
    }
    .photo-text {
      font-size: 8.5px;
      line-height: 1.2;
      color: #333;
      padding-top: 10px;
    }

    /* Dotted line fills */
    .row-line {
      display: flex;
      align-items: baseline;
      font-size: 11px;
      margin-bottom: 4.5px;
      width: 100%;
    }
    .dot-line {
      flex: 1;
      border-bottom: 1px dotted #000;
      min-height: 14px;
      font-weight: 700;
      padding: 0 4px;
      overflow-wrap: anywhere;
    }
    .dot-inline {
      display: inline-block;
      border-bottom: 1px dotted #000;
      min-height: 14px;
      font-weight: 700;
      padding: 0 4px;
      vertical-align: bottom;
    }

    /* Enrollment box digits */
    .enrollment-row {
      display: flex;
      align-items: center;
      margin-top: 3px;
      font-size: 11px;
    }
    .enrollment-title {
      font-weight: 700;
      margin-right: 8px;
      white-space: nowrap;
    }
    .boxes-container {
      display: inline-flex;
    }
    .box-digit {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 18px;
      height: 21px;
      border: 1px solid #000;
      margin-right: -1px;
      font-weight: 800;
      font-size: 11.5px;
      text-transform: uppercase;
      background: #fff;
    }

    /* Section 16 Qualifying Exam */
    .sec-qualifying {
      border: 1px solid #000;
      margin: 6px 0;
      padding: 4px 6px;
    }
    .sec-qualifying-title {
      font-weight: 800;
      font-size: 11px;
      margin-bottom: 4px;
    }
    .qual-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      column-gap: 16px;
      row-gap: 3px;
      font-size: 10.5px;
    }

    /* Section 17 Papers Table */
    .papers-table-wrapper {
      margin: 6px 0;
    }
    .sec-papers-title {
      font-weight: 800;
      font-size: 11px;
      margin-bottom: 3px;
    }
    table.papers-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10px;
    }
    table.papers-table th, table.papers-table td {
      border: 1px solid #000;
      padding: 2.5px 4px;
      vertical-align: middle;
    }
    table.papers-table th {
      font-weight: 800;
      text-align: center;
      background: #fafafa;
    }
    table.papers-table td.center {
      text-align: center;
    }

    /* Section 18 */
    .sec-18 {
      margin-top: 4px;
      font-size: 10.5px;
      line-height: 1.35;
    }
    .sec-18-title {
      font-weight: 800;
      font-size: 11px;
      text-align: center;
      margin-bottom: 4px;
    }
    .sec-18-body {
      margin-bottom: 12px;
    }
    .sign-right {
      text-align: right;
      font-weight: 700;
      padding-top: 14px;
    }

    /* PAGE 2 STYLES */
    .sec-title-center {
      text-align: center;
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
      margin-bottom: 8px;
    }
    .sec-title-left {
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
      margin-bottom: 6px;
    }
    ol.declaration-list {
      margin: 0 0 10px 18px;
      padding: 0;
      font-size: 11px;
      line-height: 1.45;
    }
    ol.declaration-list li {
      margin-bottom: 7px;
      text-align: justify;
    }
    ol.hoi-list {
      margin: 0 0 10px 18px;
      padding: 0;
      font-size: 11px;
      line-height: 1.45;
    }
    ol.hoi-list li {
      margin-bottom: 8px;
      text-align: justify;
    }
    .sign-row-split {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-top: 18px;
      font-size: 11px;
    }
    .place-date-col {
      line-height: 1.6;
    }
    table.office-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10.5px;
      margin: 6px 0 12px 0;
    }
    table.office-table th, table.office-table td {
      border: 1px solid #000;
      padding: 4px 6px;
      text-align: left;
    }
    table.office-table th {
      font-weight: 800;
      background: #fafafa;
    }
    table.office-table th.center, table.office-table td.center {
      text-align: center;
    }
    table.office-table td.right {
      text-align: right;
    }
  </style></head><body>
    <div class="toolbar">
      <button class="primary" onclick="window.print()">Print Examination Form</button>
      <button onclick="window.close()">Close</button>
    </div>

    <div class="page-container">
      <!-- ================= PAGE 1 ================= -->
      <div class="sheet">
        <div class="sheet-border">
          <div>
            <!-- Header -->
            <table class="header-table">
              <tr>
                <td class="logo-td">
                  ${logo ? `<img class="logo-img" src="${escapeHtml(logo)}" alt="Logo" />` : `<div style="width:70px;height:70px;"></div>`}
                </td>
                <td class="inst-center">
                  <div class="inst-name">${escapeHtml(institutionName(institution) || "PEOPLE’S UNIVERSITY, BHOPAL (MP)")}</div>
                  <div class="inst-sub">(All the information should be filled by the Examinee in English only)</div>
                  <div class="form-heading">EXAMINATION FORM (SEMESTER PATTERN)</div>
                </td>
                <td class="centre-td">
                  <div class="centre-box">
                    <strong>Examination Centre</strong>
                    (to be filled by the University)
                  </div>
                </td>
              </tr>
            </table>

            <!-- Status & Month/Year -->
            <div class="status-bar">
              <div>
                Examinee Status [√]:&nbsp;&nbsp;
                Regular <span class="check-box">${isRegular ? "✓" : "&nbsp;"}</span>&nbsp;&nbsp;
                Repeat/Ex. <span class="check-box">${isRepeat ? "✓" : "&nbsp;"}</span>
              </div>
              <div>
                Month: <span class="dot-inline" style="min-width: 95px; text-align: center;">${escapeHtml(examMonth)}</span>&nbsp;&nbsp;&nbsp;&nbsp;
                Year: <span class="dot-inline" style="min-width: 65px; text-align: center;">${escapeHtml(examYear)}</span>
              </div>
            </div>

            <!-- Student top section with photo on right (Items 1 to 5) -->
            <div class="student-top-layout">
              <div class="student-fields-left">
                <div class="row-line">
                  <span style="white-space: nowrap; font-weight: 700;">1. Name of the Student (in Capital Letters):&nbsp;</span>
                  <span class="dot-line">${escapeHtml(studentNameUpper)}</span>
                </div>

                <div class="enrollment-row">
                  <span class="enrollment-title">2. Enrollment No:</span>
                  <div class="boxes-container">
                    ${enrollmentBoxesHtml}
                  </div>
                </div>

                <div class="row-line">
                  <span style="white-space: nowrap; font-weight: 700;">3. ABC ID:&nbsp;</span>
                  <span class="dot-line" style="font-weight: 800; color: #000; letter-spacing: 0.5px;">${escapeHtml(profileValue(student, "abcid"))}</span>
                </div>

                <div class="row-line">
                  <span style="white-space: nowrap; font-weight: 700;">4. Father’s name (in Capital Letters):&nbsp;</span>
                  <span class="dot-line">${escapeHtml(fatherNameUpper)}</span>
                </div>

                <div class="row-line">
                  <span style="white-space: nowrap; font-weight: 700;">5. Mother’s Name (in Capital Letters):&nbsp;</span>
                  <span class="dot-line">${escapeHtml(motherNameUpper)}</span>
                </div>
              </div>

              <!-- Photo Column -->
              <div class="photo-col-right">
                <div class="photo-box">
                  ${photo 
                    ? `<img src="${escapeHtml(photo)}" class="photo-img" alt="Photograph" />`
                    : `<div class="photo-text">Paste (Do not staple)<br/>recent Photograph<br/>(Size 35mm x 45 mm)<br/>duly attested by the<br/>Dean/Principal/Head of<br/>the Institution</div>`
                  }
                </div>
              </div>
            </div>

            <!-- Student personal and academic details in EXACT sequence (Items 6 to 14) -->
            <div style="display: flex; gap: 12px; margin-bottom: 4.5px;">
              <div class="row-line" style="flex: 1.1;">
                <span style="white-space: nowrap; font-weight: 700;">6. Date of birth:&nbsp;</span>
                <span class="dot-line">${escapeHtml(profileValue(student, "dateofbirth"))}</span>
              </div>
              <div class="row-line" style="flex: 0.9;">
                <span style="white-space: nowrap; font-weight: 700;">7. Gender:&nbsp;</span>
                <span class="dot-line">${escapeHtml(profileValue(student, "gender"))}</span>
              </div>
            </div>

            <div style="display: flex; gap: 12px; margin-bottom: 4.5px;">
              <div class="row-line" style="flex: 1.1;">
                <span style="white-space: nowrap; font-weight: 700;">8. Nationality:&nbsp;</span>
                <span class="dot-line">${escapeHtml(profileValue(student, "nationality"))}</span>
              </div>
              <div class="row-line" style="flex: 0.9;">
                <span style="white-space: nowrap; font-weight: 700;">9. Category:&nbsp;</span>
                <span class="dot-line">${escapeHtml(profileValue(student, "category"))}</span>
              </div>
            </div>

            <div style="display: flex; gap: 12px; margin-bottom: 4.5px;">
              <div class="row-line" style="flex: 1.15;">
                <span style="white-space: nowrap; font-weight: 700;">10. Program:&nbsp;</span>
                <span class="dot-line">${escapeHtml(profileValue(student, "program"))}</span>
              </div>
              <div class="row-line" style="flex: 0.85;">
                <span style="white-space: nowrap; font-weight: 700;">11. Program Code:&nbsp;</span>
                <span class="dot-line">${escapeHtml(profileValue(student, "programcode"))}</span>
              </div>
            </div>

            <div style="display: flex; gap: 12px; margin-bottom: 4.5px;">
              <div class="row-line" style="flex: 1;">
                <span style="white-space: nowrap; font-weight: 700;">12. Regulation:&nbsp;</span>
                <span class="dot-line">${escapeHtml(profileValue(student, "regulation"))}</span>
              </div>
              <div class="row-line" style="flex: 1;">
                <span style="white-space: nowrap; font-weight: 700;">13. Semester:&nbsp;</span>
                <span class="dot-line">${escapeHtml(profileValue(student, "semester"))}</span>
              </div>
              <div class="row-line" style="flex: 1;">
                <span style="white-space: nowrap; font-weight: 700;">14. Section:&nbsp;</span>
                <span class="dot-line">${escapeHtml(profileValue(student, "section"))}</span>
              </div>
            </div>

            <div class="row-line">
              <span style="white-space: nowrap; font-weight: 700;">15. Correspondence Address:&nbsp;</span>
              <span class="dot-line">${escapeHtml(studentAddress || "........................................................................................................................................................")}</span>
            </div>

            <div style="display: flex; gap: 10px; margin-bottom: 4px;">
              <div class="row-line" style="flex: 1;">
                <span style="white-space: nowrap; font-weight: 700;">District:&nbsp;</span>
                <span class="dot-line">${escapeHtml(studentDistrict || "")}</span>
              </div>
              <div class="row-line" style="flex: 1;">
                <span style="white-space: nowrap; font-weight: 700;">State:&nbsp;</span>
                <span class="dot-line">${escapeHtml(studentState || "")}</span>
              </div>
              <div class="row-line" style="flex: 0.9;">
                <span style="white-space: nowrap; font-weight: 700;">Pin Code:&nbsp;</span>
                <span class="dot-line">${escapeHtml(studentPincode || "")}</span>
              </div>
              <div class="row-line" style="flex: 1.1;">
                <span style="white-space: nowrap; font-weight: 700;">Contact No.:&nbsp;</span>
                <span class="dot-line">${escapeHtml(studentPhone || "")}</span>
              </div>
            </div>

            <!-- 16. Details of Qualifying Exam -->
            <div class="sec-qualifying">
              <div class="sec-qualifying-title">16. Details of Qualifying Exam (Attach Attested Photo Copies)</div>
              <div class="qual-grid">
                <div>(a) Name of Exam:&nbsp;<span class="dot-inline" style="min-width: 160px;">${escapeHtml(qualExamName)}</span></div>
                <div>(b) Year of passing:&nbsp;<span class="dot-inline" style="min-width: 140px;">${escapeHtml(qualPassingYear)}</span></div>
                <div>(c) Enrollment No:&nbsp;<span class="dot-inline" style="min-width: 160px;">${escapeHtml(qualEnrollmentNo)}</span></div>
                <div>(d) Result:&nbsp;<span class="dot-inline" style="min-width: 140px;">${escapeHtml(qualResult)}</span></div>
                <div>(e) College/Institute:&nbsp;<span class="dot-inline" style="min-width: 160px;">${escapeHtml(qualCollege)}</span></div>
                <div>(f) Name of University:&nbsp;<span class="dot-inline" style="min-width: 140px;">${escapeHtml(qualUniversity)}</span></div>
              </div>
            </div>

            <!-- 17. Papers Table -->
            <div class="papers-table-wrapper">
              <div class="sec-papers-title">17. I will be appearing for the following Papers:-</div>
              <table class="papers-table">
                <thead>
                  <tr>
                    <th colspan="3">Theory</th>
                    <th colspan="3">Practical</th>
                  </tr>
                  <tr>
                    <th style="width: 5%;">S.No.</th>
                    <th style="width: 14%;">Paper Code</th>
                    <th style="width: 31%;">Paper Name</th>
                    <th style="width: 5%;">S.No.</th>
                    <th style="width: 14%;">Paper Code</th>
                    <th style="width: 31%;">Paper Name</th>
                  </tr>
                </thead>
                <tbody>
                  ${papersRowsHtml}
                </tbody>
              </table>
            </div>

            <!-- 18. Certificate by Coordinator/HOD -->
            <div class="sec-18">
              <div class="sec-18-title">18. CERTIFICATE BY THE RESPECTIVE CO-ORDINATOR/HOD/GUIDE</div>
              <div class="sec-18-body">
                This is to certify that <u>&nbsp;<b>${escapeHtml(studentNameUpper || "................................................................")}</b>&nbsp;</u> fulfils the eligibility to appear in University examination for the above mentioned program/papers.
              </div>
              <div class="sign-right">
                Signature of Coordinator/HOD/Guide with full Name
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ================= PAGE 2 ================= -->
      <div class="sheet">
        <div class="sheet-border">
          <div>
            <!-- 19. Declaration by the examinee -->
            <div class="sec-title-center">19. DECLARATION BY THE EXAMINEE</div>
            <ol class="declaration-list">
              <li>I am aware that, I have to fulfill criteria of attendance as prescribed by the University, failing which I shall be held &ldquo;Not Eligible&rdquo; and will not be allowed to appear for examination.</li>
              <li>I hereby declare that I have gone through the syllabus as prescribed and adopted by the University and relevant rules off the Head of Passing which are applicable for the examination for which I am appearing and I accept the same without any challenge (wherever applicable).</li>
              <li>I shall be responsible if my application form is rejected for any errors, wrong or incomplete entries made by me in the examination form.</li>
              <li>I am not defying the criteria of the admission order.</li>
              <li>I am not admitted to the course after the cut-off date declared by the University for Grant of terms.</li>
            </ol>

            <div class="sign-row-split" style="margin-top: 24px;">
              <div class="place-date-col">
                <div>Place: ________________________</div>
                <div style="margin-top: 8px;">Date: &nbsp;________________________</div>
              </div>
              <div style="text-align: right; font-weight: 700;">
                Signature of Examinee in running hand
              </div>
            </div>

            <!-- 20. Office use -->
            <div class="sec-title-center" style="margin-top: 30px;">20. FOR THE USE OF INSTITUTION OFFICE</div>
            <table class="office-table">
              <thead>
                <tr>
                  <th colspan="5" class="center" style="background: #f1f5f9;">Attachments</th>
                </tr>
                <tr>
                  <th style="width: 22%;">Fee Receipt No.</th>
                  <th style="width: 16%;" class="center">Date</th>
                  <th style="width: 18%;" class="right">Amount (Rs.)</th>
                  <th style="width: 26%;">Name of Verifying Officer</th>
                  <th style="width: 18%;" class="center">Signature</th>
                </tr>
              </thead>
              <tbody>
                ${officeFeeRows}
              </tbody>
            </table>

            <!-- 21. Certificate by Head of Institution -->
            <div class="sec-title-left" style="margin-top: 30px;">21. CERTIFICATE BY THE HEAD OF INSTITUTION</div>
            <div style="margin: 6px 0 6px 0; font-weight: 700; font-size: 11px;">I certify :</div>
            <ol class="hoi-list">
              <li>
                That Shri/Smt./Kum. <u>&nbsp;<b>${escapeHtml(studentNameUpper || "........................................................")}</b>&nbsp;</u> is a bonafide student of this college, admitted to the <u>&nbsp;<b>${escapeHtml(profileValue(student, "program") || "....................................")}</b>&nbsp;</u> Program in the Session 20<u>${sessionYear1}</u>-<u>${sessionYear2}</u>. He/she is not admitted to the course after the cut-off date for grant of terms.
              </li>
              <li>
                That his / her attendance and eligibility to appear in University examination is as per University rules / concerned ordinance/governing council (or body).
              </li>
              <li>
                That the information furnished by the said Examinee is verified from his/her documents and that the Examinee is Eligible to appear for University Examination.
              </li>
            </ol>

            <div class="sign-row-split" style="margin-top: 40px;">
              <div class="place-date-col">
                <div>Place: ________________________</div>
                <div style="margin-top: 8px;">Date: &nbsp;________________________</div>
              </div>
              <div style="text-align: right; font-weight: 700; padding-top: 20px;">
                Signature &amp; Seal of the HOI
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </body></html>`);
  win.document.close();
};

export function ConductExamFeePage() {
  const { courses, loading: coursesLoading, error: courseError, reloadCourses } = useExamCourses();
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(blankFee);
  const [selectedPrograms, setSelectedPrograms] = useState([]);
  const [selectedCourses, setSelectedCourses] = useState([]);
  const [editingId, setEditingId] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => { loadRows(); }, []);

  const filteredCourses = useMemo(() => courses.filter((row) => (
    (!form.academicyear || row.academicyear === form.academicyear)
    && (!form.examcode || row.examcode === form.examcode)
    && (!form.regulation || row.regulation === form.regulation)
    && (!selectedPrograms.length || selectedPrograms.includes(`${row.program}||${row.programcode}`))
    && (!form.semester || String(row.semester) === String(form.semester))
  )), [courses, form.academicyear, form.examcode, form.regulation, selectedPrograms, form.semester]);
  const yearOptions = useMemo(() => uniqueSorted([...years, ...courses.map((row) => row.academicyear)]), [courses]);
  const examOptions = useMemo(() => uniqueSorted(courses.filter((row) => !form.academicyear || row.academicyear === form.academicyear).map((row) => `${row.exam}||${row.examcode}`)), [courses, form.academicyear]);
  const regulationOptions = useMemo(() => uniqueSorted(courses.filter((row) => (
    (!form.academicyear || row.academicyear === form.academicyear)
    && (!form.examcode || row.examcode === form.examcode)
  )).map((row) => row.regulation)), [courses, form.academicyear, form.examcode]);
  const programOptions = useMemo(() => uniqueSorted(courses.filter((row) => (
    (!form.academicyear || row.academicyear === form.academicyear)
    && (!form.examcode || row.examcode === form.examcode)
    && (!form.regulation || row.regulation === form.regulation)
  )).map((row) => `${row.program}||${row.programcode}`)), [courses, form.academicyear, form.examcode, form.regulation]);
  const semesterOptions = useMemo(() => uniqueSorted(courses.filter((row) => (
    (!form.academicyear || row.academicyear === form.academicyear)
    && (!form.examcode || row.examcode === form.examcode)
    && (!form.regulation || row.regulation === form.regulation)
    && (!selectedPrograms.length || selectedPrograms.includes(`${row.program}||${row.programcode}`))
  )).map((row) => row.semester)), [courses, form.academicyear, form.examcode, form.regulation, selectedPrograms]);
  const courseOptions = useMemo(() => uniqueSorted(filteredCourses.map((row) => `${row.program}||${row.programcode}||${row.course}||${row.coursecode}`)), [filteredCourses]);
  const selectedCourseRows = useMemo(() => selectedCourses.map((value) => {
    const [program, programcode, course, coursecode] = value.split("||");
    return filteredCourses.find((row) => row.program === program && row.programcode === programcode && row.course === course && row.coursecode === coursecode);
  }).filter(Boolean), [selectedCourses, filteredCourses]);

  const loadRows = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await ep1.get("/api/v2/conductexam/examfees", { params: { colid: global1.colid } });
      setRows(res.data?.data || []);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load exam fees");
    } finally {
      setLoading(false);
    }
  };

  const setExam = (value) => {
    const [exam, examcode] = value.split("||");
    setSelectedPrograms([]);
    setSelectedCourses([]);
    setForm((prev) => ({ ...prev, exam, examcode, regulation: "", program: "", programcode: "", semester: "", course: "", coursecode: "" }));
  };
  const setPrograms = (values) => {
    setSelectedPrograms(values);
    setSelectedCourses((prev) => prev.filter((courseValue) => {
      const [program, programcode] = courseValue.split("||");
      return values.includes(`${program}||${programcode}`);
    }));
    const first = values[0]?.split("||") || ["", ""];
    setForm((prev) => ({ ...prev, program: first[0] || "", programcode: first[1] || "", semester: "", course: "", coursecode: "" }));
  };
  const setCourses = (values) => {
    setSelectedCourses(values);
    const first = values[0]?.split("||") || ["", "", "", ""];
    setForm((prev) => ({ ...prev, program: first[0] || prev.program, programcode: first[1] || prev.programcode, course: first[2] || "", coursecode: first[3] || "" }));
  };
  const save = async () => {
    try {
      setSaving(true);
      setError("");
      setMessage("");
      if (!editingId && !selectedCourseRows.length) {
        setError("Select at least one course");
        return;
      }
      if (editingId) {
        await ep1.post("/api/v2/conductexam/examfees", { ...form, id: editingId, colid: global1.colid, user: global1.user });
      } else {
        for (const row of selectedCourseRows) {
          await ep1.post("/api/v2/conductexam/examfees", {
            ...form,
            regulation: row.regulation || form.regulation,
            exam: row.exam || form.exam,
            examcode: row.examcode || form.examcode,
            program: row.program,
            programcode: row.programcode,
            semester: row.semester || form.semester,
            course: row.course,
            coursecode: row.coursecode,
            colid: global1.colid,
            user: global1.user
          });
        }
      }
      setMessage(editingId ? "Exam fee updated" : `${selectedCourseRows.length} exam fee row(s) saved`);
      setEditingId("");
      setSelectedPrograms([]);
      setSelectedCourses([]);
      setForm((prev) => ({ ...blankFee, academicyear: prev.academicyear, exam: prev.exam, examcode: prev.examcode }));
      await loadRows();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to save exam fee");
    } finally {
      setSaving(false);
    }
  };
  const editRow = (row) => {
    setEditingId(row._id);
    setForm({ ...blankFee, ...row });
    setSelectedPrograms(row.program && row.programcode ? [`${row.program}||${row.programcode}`] : []);
    setSelectedCourses(row.program && row.programcode && row.course && row.coursecode ? [`${row.program}||${row.programcode}||${row.course}||${row.coursecode}`] : []);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const deleteRow = async (row) => {
    if (!window.confirm("Delete this exam fee?")) return;
    try {
      await ep1.post("/api/v2/conductexam/examfees-delete", { id: row._id, colid: global1.colid });
      setMessage("Exam fee deleted");
      await loadRows();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to delete exam fee");
    }
  };
  const downloadTemplate = () => {
    const sheet = XLSX.utils.json_to_sheet([{
      academicyear: "2026-27",
      regulation: "Regulation 2026",
      exam: "Semester Examination",
      examcode: "SEM-2026",
      program: "Program Name",
      programcode: "PRG",
      semester: "1",
      course: "Course Name",
      coursecode: "COURSE101",
      regularfee: 500,
      supplementaryfee: 800,
      appealfee: 1000,
      status: "Active"
    }]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, sheet, "Exam fees");
    XLSX.writeFile(wb, "conduct_exam_fees_template.xlsx");
  };
  const uploadBulk = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      setUploading(true);
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer);
      const rowsToUpload = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: "" });
      await ep1.post("/api/v2/conductexam/examfees-bulk", { colid: global1.colid, user: global1.user, rows: rowsToUpload });
      setMessage("Bulk upload completed");
      await loadRows();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to upload exam fees");
    } finally {
      setUploading(false);
    }
  };

  const columns = [
    { field: "academicyear", headerName: "Academic year", width: 130 },
    { field: "exam", headerName: "Exam", width: 180 },
    { field: "examcode", headerName: "Exam code", width: 130 },
    { field: "regulation", headerName: "Regulation", width: 150 },
    { field: "program", headerName: "Program", width: 180 },
    { field: "programcode", headerName: "Program code", width: 140 },
    { field: "semester", headerName: "Semester", width: 110 },
    { field: "course", headerName: "Course", width: 220 },
    { field: "coursecode", headerName: "Course code", width: 140 },
    { field: "regularfee", headerName: "Regular fee", width: 130, type: "number" },
    { field: "supplementaryfee", headerName: "Supplementary fee", width: 160, type: "number" },
    { field: "appealfee", headerName: "Appeal fee", width: 130, type: "number" },
    { field: "status", headerName: "Status", width: 120 },
    {
      field: "actions",
      type: "actions",
      headerName: "Actions",
      width: 100,
      getActions: ({ row }) => [
        <GridActionsCellItem icon={<Edit />} label="Edit" onClick={() => editRow(row)} />,
        <GridActionsCellItem icon={<Delete />} label="Delete" onClick={() => deleteRow(row)} />
      ]
    }
  ];

  return (
    <MenuPageShell title="Exam Fees">
      <Box sx={pageBox}>
        <BackButton />
        <Typography variant="h5" sx={{ fontWeight: 800, mb: 2 }}>Exam fees</Typography>
        {(error || courseError) && <Alert severity="error" sx={{ mb: 2 }}>{error || courseError}</Alert>}
        {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
        <Paper sx={paperSx}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={2}><SelectText label="Academic year" value={form.academicyear} options={yearOptions} onChange={(value) => { setSelectedPrograms([]); setSelectedCourses([]); setForm((prev) => ({ ...prev, academicyear: value, exam: "", examcode: "", regulation: "", program: "", programcode: "", semester: "", course: "", coursecode: "" })); }} /></Grid>
            <Grid item xs={12} md={3}><SelectText label="Exam" value={form.exam && form.examcode ? `${form.exam}||${form.examcode}` : ""} options={examOptions} onChange={setExam} /></Grid>
            <Grid item xs={12} md={2}><SelectText label="Regulation" value={form.regulation} options={regulationOptions} onChange={(value) => { setSelectedPrograms([]); setSelectedCourses([]); setForm((prev) => ({ ...prev, regulation: value, program: "", programcode: "", semester: "", course: "", coursecode: "" })); }} /></Grid>
            <Grid item xs={12} md={3}><MultiSelectCheckbox label="Program" value={selectedPrograms} options={programOptions} onChange={setPrograms} getLabel={(option) => option.split("||").filter(Boolean).join(" - ")} /></Grid>
            <Grid item xs={12} md={2}><SelectText label="Semester" value={form.semester} options={semesterOptions} onChange={(value) => { setSelectedCourses([]); setForm((prev) => ({ ...prev, semester: value, course: "", coursecode: "" })); }} /></Grid>
            <Grid item xs={12} md={4}><MultiSelectCheckbox label="Course" value={selectedCourses} options={courseOptions} onChange={setCourses} getLabel={(option) => { const parts = option.split("||"); return `${parts[2]} (${parts[3]}) - ${parts[1]}`; }} /></Grid>
            <Grid item xs={12} md={2}><TextField fullWidth size="small" label="Regular fee" type="number" value={form.regularfee} onChange={(e) => setForm((prev) => ({ ...prev, regularfee: e.target.value }))} /></Grid>
            <Grid item xs={12} md={2}><TextField fullWidth size="small" label="Supplementary fee" type="number" value={form.supplementaryfee} onChange={(e) => setForm((prev) => ({ ...prev, supplementaryfee: e.target.value }))} /></Grid>
            <Grid item xs={12} md={2}><TextField fullWidth size="small" label="Appeal fee" type="number" value={form.appealfee} onChange={(e) => setForm((prev) => ({ ...prev, appealfee: e.target.value }))} /></Grid>
            <Grid item xs={12} md={2}><SelectText label="Status" value={form.status} options={["Active", "Inactive"]} onChange={(value) => setForm((prev) => ({ ...prev, status: value }))} /></Grid>
            <Grid item xs={12} md={2}>
              <Stack direction="row" spacing={1}>
                <Button fullWidth variant="contained" startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <Save />} disabled={saving} onClick={save}>{editingId ? "Update" : "Save"}</Button>
                <Button variant="outlined" onClick={() => { setEditingId(""); setSelectedPrograms([]); setSelectedCourses([]); setForm(blankFee); }}>Clear</Button>
              </Stack>
            </Grid>
          </Grid>
        </Paper>
        <Stack direction="row" spacing={1} sx={{ my: 2 }}>
          <Button startIcon={<Refresh />} variant="outlined" onClick={() => { loadRows(); reloadCourses(); }} disabled={loading || coursesLoading}>Refresh</Button>
          <Button startIcon={<Download />} variant="outlined" onClick={downloadTemplate}>Template</Button>
          <Button component="label" startIcon={uploading ? <CircularProgress size={16} /> : <UploadFile />} variant="outlined" disabled={uploading}>Bulk upload<input hidden type="file" accept=".xlsx,.xls,.csv" onChange={uploadBulk} /></Button>
        </Stack>
        <Paper sx={{ ...paperSx, height: 560 }}>
          <DataGrid rows={rows} columns={columns} getRowId={getId} loading={loading || coursesLoading} slots={{ toolbar: GridToolbar }} pageSizeOptions={[25, 50, 100]} initialState={{ pagination: { paginationModel: { pageSize: 25 } } }} disableRowSelectionOnClick />
        </Paper>
      </Box>
    </MenuPageShell>
  );
}

export function ConductExamFormBuilderPage() {
  const { courses } = useExamCourses();
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(blankForm);
  const [editingId, setEditingId] = useState("");
  const [tabDraft, setTabDraft] = useState(blankTab);
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [fieldDraft, setFieldDraft] = useState(blankField);
  const [docDraft, setDocDraft] = useState(blankDocument);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => { loadRows(); }, []);

  const programOptions = useMemo(() => uniqueSorted(courses.filter((row) => !form.academicyear || row.academicyear === form.academicyear).map((row) => `${row.program}||${row.programcode}`)), [courses, form.academicyear]);
  const sortedTabs = useMemo(() => [...(form.tabs || [])].sort((a, b) => Number(a.order || 0) - Number(b.order || 0)), [form.tabs]);
  const selectedTab = sortedTabs[activeTabIndex] || null;

  const loadRows = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await ep1.get("/api/v2/conductexam/examforms", { params: { colid: global1.colid } });
      setRows(res.data?.data || []);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load exam forms");
    } finally {
      setLoading(false);
    }
  };
  const setProgram = (value) => {
    const [program, programcode] = value.split("||");
    setForm((prev) => ({ ...prev, program, programcode }));
  };
  const addTab = () => {
    if (!tabDraft.title) return;
    setForm((prev) => ({ ...prev, tabs: [...prev.tabs, { ...tabDraft, fields: [] }] }));
    setTabDraft({ ...blankTab, order: (form.tabs || []).length + 2 });
  };
  const removeTab = (index) => {
    const next = sortedTabs.filter((_, idx) => idx !== index);
    setForm((prev) => ({ ...prev, tabs: next }));
    setActiveTabIndex(0);
  };
  const addField = () => {
    if (!selectedTab || !fieldDraft.fieldname || !fieldDraft.label) return;
    const nextTabs = sortedTabs.map((tab, index) => index === activeTabIndex
      ? { ...tab, fields: [...(tab.fields || []), fieldDraft] }
      : tab);
    setForm((prev) => ({ ...prev, tabs: nextTabs }));
    setFieldDraft({ ...blankField, order: ((selectedTab.fields || []).length + 2) });
  };
  const removeField = (fieldIndex) => {
    const nextTabs = sortedTabs.map((tab, index) => index === activeTabIndex
      ? { ...tab, fields: (tab.fields || []).filter((_, idx) => idx !== fieldIndex) }
      : tab);
    setForm((prev) => ({ ...prev, tabs: nextTabs }));
  };
  const addDocument = () => {
    if (!docDraft.documenttype) return;
    setForm((prev) => ({ ...prev, documents: [...prev.documents, docDraft] }));
    setDocDraft({ ...blankDocument, order: (form.documents || []).length + 2 });
  };
  const save = async () => {
    try {
      setSaving(true);
      setError("");
      setMessage("");
      await ep1.post("/api/v2/conductexam/examforms", { ...form, id: editingId, colid: global1.colid, user: global1.user });
      setMessage(editingId ? "Exam form updated" : "Exam form saved");
      setEditingId("");
      setForm(blankForm);
      setActiveTabIndex(0);
      await loadRows();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to save exam form");
    } finally {
      setSaving(false);
    }
  };
  const editRow = (row) => {
    setEditingId(row._id);
    setForm({ ...blankForm, ...row });
    setActiveTabIndex(0);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const deleteRow = async (row) => {
    if (!window.confirm("Delete this exam form?")) return;
    try {
      await ep1.post("/api/v2/conductexam/examforms-delete", { id: row._id, colid: global1.colid });
      setMessage("Exam form deleted");
      await loadRows();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to delete exam form");
    }
  };

  const columns = [
    { field: "formname", headerName: "Form name", width: 220 },
    { field: "formid", headerName: "Form ID", width: 160 },
    { field: "academicyear", headerName: "Academic year", width: 130 },
    { field: "program", headerName: "Program", width: 200 },
    { field: "programcode", headerName: "Program code", width: 130 },
    { field: "examtype", headerName: "Exam type", width: 140 },
    { field: "status", headerName: "Status", width: 110 },
    { field: "tabcount", headerName: "Tabs", width: 90, valueGetter: (params) => params.row.tabs?.length || 0 },
    { field: "doccount", headerName: "Docs", width: 90, valueGetter: (params) => params.row.documents?.length || 0 },
    {
      field: "actions",
      type: "actions",
      headerName: "Actions",
      width: 100,
      getActions: ({ row }) => [
        <GridActionsCellItem icon={<Edit />} label="Edit" onClick={() => editRow(row)} />,
        <GridActionsCellItem icon={<Delete />} label="Delete" onClick={() => deleteRow(row)} />
      ]
    }
  ];

  return (
    <MenuPageShell title="Exam Form Builder">
      <Box sx={pageBox}>
        <BackButton />
        <Typography variant="h5" sx={{ fontWeight: 800, mb: 2 }}>Dynamic exam form builder</Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
        <Paper sx={paperSx}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={3}><TextField fullWidth size="small" label="Form name" value={form.formname} onChange={(e) => setForm((prev) => ({ ...prev, formname: e.target.value }))} /></Grid>
            <Grid item xs={12} md={2}><TextField fullWidth size="small" label="Form ID" value={form.formid} onChange={(e) => setForm((prev) => ({ ...prev, formid: e.target.value }))} helperText="Leave blank to auto-create" /></Grid>
            <Grid item xs={12} md={2}><SelectText label="Academic year" value={form.academicyear} options={years} onChange={(value) => setForm((prev) => ({ ...prev, academicyear: value, program: "", programcode: "" }))} /></Grid>
            <Grid item xs={12} md={3}><SelectText label="Program" value={form.program && form.programcode ? `${form.program}||${form.programcode}` : ""} options={programOptions} onChange={setProgram} /></Grid>
            <Grid item xs={12} md={2}><SelectText label="Exam type" value={form.examtype} options={["Regular", "Supplementary"]} onChange={(value) => setForm((prev) => ({ ...prev, examtype: value }))} /></Grid>
            <Grid item xs={12} md={2}><SelectText label="Status" value={form.status} options={["Active", "Inactive"]} onChange={(value) => setForm((prev) => ({ ...prev, status: value }))} /></Grid>
            <Grid item xs={12} md={5}><TextField fullWidth size="small" label="Instructions" value={form.instructions} onChange={(e) => setForm((prev) => ({ ...prev, instructions: e.target.value }))} /></Grid>
            <Grid item xs={12} md={5}><TextField fullWidth size="small" label="Mandatory validation criteria" value={form.mandatorycriteria} onChange={(e) => setForm((prev) => ({ ...prev, mandatorycriteria: e.target.value }))} /></Grid>
            <Grid item xs={12}><TextField fullWidth multiline minRows={2} label="Other validation criteria" value={form.validationcriteria} onChange={(e) => setForm((prev) => ({ ...prev, validationcriteria: e.target.value }))} /></Grid>
          </Grid>
        </Paper>

        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid item xs={12} lg={7}>
            <Paper sx={paperSx}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Tabs and fields</Typography>
              <Grid container spacing={1.5}>
                <Grid item xs={12} md={5}><TextField fullWidth size="small" label="Tab title" value={tabDraft.title} onChange={(e) => setTabDraft((prev) => ({ ...prev, title: e.target.value }))} /></Grid>
                <Grid item xs={12} md={2}><TextField fullWidth size="small" label="Order" type="number" value={tabDraft.order} onChange={(e) => setTabDraft((prev) => ({ ...prev, order: e.target.value }))} /></Grid>
                <Grid item xs={12} md={2}><Button fullWidth variant="outlined" onClick={addTab}>Add tab</Button></Grid>
              </Grid>
              <Tabs value={Math.min(activeTabIndex, Math.max(sortedTabs.length - 1, 0))} onChange={(_, value) => setActiveTabIndex(value)} sx={{ mt: 2 }}>
                {sortedTabs.map((tab, index) => <Tab key={`${tab.title}-${index}`} label={`${tab.order}. ${tab.title}`} />)}
              </Tabs>
              {selectedTab ? (
                <Box sx={{ mt: 2 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                    <Typography sx={{ fontWeight: 700 }}>{selectedTab.title}</Typography>
                    <Button color="error" size="small" onClick={() => removeTab(activeTabIndex)}>Remove tab</Button>
                  </Stack>
                  <Grid container spacing={1.5}>
                    <Grid item xs={12} md={2}><TextField fullWidth size="small" label="Field name" value={fieldDraft.fieldname} onChange={(e) => setFieldDraft((prev) => ({ ...prev, fieldname: e.target.value.replace(/\s+/g, "_").toLowerCase() }))} /></Grid>
                    <Grid item xs={12} md={3}><TextField fullWidth size="small" label="Label" value={fieldDraft.label} onChange={(e) => setFieldDraft((prev) => ({ ...prev, label: e.target.value }))} /></Grid>
                    <Grid item xs={12} md={2}><SelectText label="Type" value={fieldDraft.fieldtype} options={["Text", "Number", "Date", "Dropdown", "Textarea", "Yes/No"]} onChange={(value) => setFieldDraft((prev) => ({ ...prev, fieldtype: value }))} /></Grid>
                    <Grid item xs={12} md={2}><SelectText label="Required" value={fieldDraft.required} options={["No", "Yes"]} onChange={(value) => setFieldDraft((prev) => ({ ...prev, required: value }))} /></Grid>
                    <Grid item xs={12} md={2}><TextField fullWidth size="small" label="Options comma separated" value={fieldDraft.options} onChange={(e) => setFieldDraft((prev) => ({ ...prev, options: e.target.value }))} /></Grid>
                    <Grid item xs={12} md={1}><Button fullWidth variant="outlined" onClick={addField}>Add</Button></Grid>
                  </Grid>
                  <Box sx={{ mt: 2, height: 260 }}>
                    <DataGrid
                      rows={(selectedTab.fields || []).map((row, index) => ({ ...row, id: index }))}
                      columns={[
                        { field: "order", headerName: "Order", width: 90 },
                        { field: "fieldname", headerName: "Field", width: 140 },
                        { field: "label", headerName: "Label", width: 180 },
                        { field: "fieldtype", headerName: "Type", width: 120 },
                        { field: "required", headerName: "Required", width: 110 },
                        { field: "options", headerName: "Options", width: 220 },
                        { field: "actions", type: "actions", width: 80, getActions: ({ row }) => [<GridActionsCellItem icon={<Delete />} label="Remove" onClick={() => removeField(row.id)} />] }
                      ]}
                      pageSizeOptions={[10, 25]}
                      initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
                      disableRowSelectionOnClick
                    />
                  </Box>
                </Box>
              ) : <Alert severity="info" sx={{ mt: 2 }}>Add a tab to start adding fields.</Alert>}
            </Paper>
          </Grid>
          <Grid item xs={12} lg={5}>
            <Paper sx={paperSx}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Documents</Typography>
              <Grid container spacing={1.5}>
                <Grid item xs={12} md={5}><TextField fullWidth size="small" label="Document type" value={docDraft.documenttype} onChange={(e) => setDocDraft((prev) => ({ ...prev, documenttype: e.target.value }))} /></Grid>
                <Grid item xs={12} md={3}><SelectText label="Required" value={docDraft.required} options={["No", "Yes"]} onChange={(value) => setDocDraft((prev) => ({ ...prev, required: value }))} /></Grid>
                <Grid item xs={12} md={2}><TextField fullWidth size="small" label="Order" type="number" value={docDraft.order} onChange={(e) => setDocDraft((prev) => ({ ...prev, order: e.target.value }))} /></Grid>
                <Grid item xs={12} md={2}><Button fullWidth variant="outlined" onClick={addDocument}>Add</Button></Grid>
              </Grid>
              <Box sx={{ mt: 2, height: 250 }}>
                <DataGrid
                  rows={(form.documents || []).map((row, index) => ({ ...row, id: index }))}
                  columns={[
                    { field: "order", headerName: "Order", width: 90 },
                    { field: "documenttype", headerName: "Document", width: 220 },
                    { field: "required", headerName: "Required", width: 110 },
                    { field: "actions", type: "actions", width: 80, getActions: ({ row }) => [<GridActionsCellItem icon={<Delete />} label="Remove" onClick={() => setForm((prev) => ({ ...prev, documents: prev.documents.filter((_, idx) => idx !== row.id) }))} />] }
                  ]}
                  pageSizeOptions={[10, 25]}
                  initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
                  disableRowSelectionOnClick
                />
              </Box>
              <Divider sx={{ my: 2 }} />
              <Stack direction="row" spacing={1}>
                <Button variant="contained" startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <Save />} disabled={saving} onClick={save}>{editingId ? "Update form" : "Save form"}</Button>
                <Button variant="outlined" onClick={() => { setForm(blankForm); setEditingId(""); }}>Clear</Button>
              </Stack>
            </Paper>
          </Grid>
        </Grid>

        <Paper sx={{ ...paperSx, mt: 2, height: 480 }}>
          <DataGrid rows={rows} columns={columns} getRowId={getId} loading={loading} slots={{ toolbar: GridToolbar }} pageSizeOptions={[25, 50, 100]} initialState={{ pagination: { paginationModel: { pageSize: 25 } } }} disableRowSelectionOnClick />
        </Paper>
      </Box>
    </MenuPageShell>
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

export function StudentExamDynamicFormPage() {
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

  useEffect(() => {
    loadExams();
    loadInstitutionDetails().then(setInstitution).catch(() => setInstitution({}));
  }, []);

  const loadExams = async () => {
    try {
      const res = await ep1.get("/api/v2/conductexam/exams", { params: { colid: global1.colid } });
      setExams(res.data?.data || []);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load exams");
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
        params: { colid: global1.colid, regno: global1.regno, academicyear: filters.academicyear, examcode: filters.examcode, examtype: filters.examtype }
      });
      const nextContext = res.data?.data || null;
      setContext(nextContext);
      if (nextContext?.forms?.length) setSelectedFormId(nextContext.forms[0].formid);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load exam form");
    } finally {
      setLoading(false);
    }
  };
  const selectedExam = useMemo(() => exams.find((row) => row.examcode === filters.examcode && row.academicyear === filters.academicyear) || {}, [exams, filters]);
  const selectedForm = useMemo(() => (context?.forms || []).find((form) => form.formid === selectedFormId), [context, selectedFormId]);
  const formTabs = useMemo(() => [...(selectedForm?.tabs || [])].sort((a, b) => Number(a.order || 0) - Number(b.order || 0)), [selectedForm]);
  const courses = useMemo(
    () => (filters.examtype === "Supplementary" ? context?.supplementaryCourses || [] : context?.regularCourses || []),
    [context, filters.examtype]
  );
  const courseRows = useMemo(() => courses.map((row, index) => ({ ...row, id: courseKey(row) || `course-${index}` })), [courses]);
  const persistedFeeLedgerRows = useMemo(() => (context?.examFeeLedger || []).map((row, index) => ({ ...row, id: row._id || `fee-${index}` })), [context]);
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
  const calculatedFeeRows = useMemo(() => totalFee > 0 ? [{
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
  }] : [], [totalFee, filters.examtype, filters.academicyear, context]);
  const feeLedgerRows = persistedFeeLedgerRows.length ? persistedFeeLedgerRows : calculatedFeeRows;
  const toggleCourse = (key) => {
    setSelectedCourses((prev) => prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]);
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
      const res = await ep1.post("/api/v2/conductexam/examform-upload-document", formData, { headers: { "Content-Type": "multipart/form-data" } });
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
        setContext((prev) => prev ? { ...prev, examFeeLedger: res.data.examFeeLedger } : prev);
      }
      setMessage(`Exam form submitted. Ledger rows: ${res.data?.ledgerCreated || 0}, examroll rows: ${res.data?.examRollCreated || 0}`);
    } catch (err) {
      const errors = err.response?.data?.errors;
      setError(errors?.length ? errors.join("\n") : err.response?.data?.message || "Unable to submit exam form");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <MenuPageShell title="Student Exam Form" menuType="student">
      <Box sx={pageBox}>
        <BackButton student />
        <Typography variant="h5" sx={{ fontWeight: 800, mb: 2 }}>Exam form</Typography>
        {error && <Alert severity="error" sx={{ mb: 2, whiteSpace: "pre-line" }}>{error}</Alert>}
        {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
        <Paper sx={paperSx}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={3}><SelectText label="Academic year" value={filters.academicyear} options={uniqueSorted([...years, ...exams.map((row) => row.academicyear)])} onChange={(value) => setFilters((prev) => ({ ...prev, academicyear: value, examcode: "" }))} /></Grid>
            <Grid item xs={12} md={4}><SelectText label="Exam" value={filters.examcode} options={uniqueSorted(exams.filter((row) => !filters.academicyear || row.academicyear === filters.academicyear).map((row) => row.examcode))} onChange={(value) => setFilters((prev) => ({ ...prev, examcode: value }))} /></Grid>
            <Grid item xs={12} md={3}><SelectText label="Exam type" value={filters.examtype} options={["Regular", "Supplementary"]} onChange={(value) => setFilters((prev) => ({ ...prev, examtype: value }))} /></Grid>
            <Grid item xs={12} md={2}><Button fullWidth variant="contained" disabled={loading || !filters.examcode} startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <Refresh />} onClick={loadContext}>Load</Button></Grid>
          </Grid>
        </Paper>

        {context && (
          <>
            <Paper sx={{ ...paperSx, mt: 2 }}>
              <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2} sx={{ mb: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>Student details</Typography>
                <Button variant="outlined" startIcon={<Print />} onClick={printExamForm}>Print preview</Button>
              </Stack>
              <Grid container spacing={2} alignItems="flex-start">
                <Grid item xs={12} md={10}>
                  <Grid container spacing={1.5}>
                    {profileFields.map(([label, field]) => (
                      <Grid item xs={12} sm={6} md={3} key={field}>
                        <Typography variant="caption" color="text.secondary">{label}</Typography>
                        <Typography sx={{ fontWeight: 700, overflowWrap: "anywhere" }}>{profileValue(context.student, field) || "NA"}</Typography>
                      </Grid>
                    ))}
                  </Grid>
                </Grid>
                <Grid item xs={12} md={2}>
                  {studentPhoto(context.student) ? (
                    <Box component="img" src={studentPhoto(context.student)} alt="Student" sx={{ width: 110, height: 135, objectFit: "cover", border: "1px solid #d1d5db", borderRadius: 1, bgcolor: "#fff" }} />
                  ) : (
                    <Box sx={{ width: 110, height: 135, border: "1px solid #d1d5db", borderRadius: 1, display: "grid", placeItems: "center", color: "text.secondary" }}>Photo</Box>
                  )}
                </Grid>
              </Grid>
            </Paper>

            <Paper sx={{ ...paperSx, mt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <SelectText label="Form" value={selectedFormId} options={(context.forms || []).map((form) => form.formid)} onChange={(value) => { setSelectedFormId(value); setActiveTabIndex(0); }} />
                </Grid>
                <Grid item xs={12} md={8}>
                  <Typography color="text.secondary">{selectedForm?.instructions || "Select the correct form and complete the tabs below."}</Typography>
                </Grid>
              </Grid>
              {selectedForm ? (
                <>
                  <Tabs value={Math.min(activeTabIndex, Math.max(formTabs.length - 1, 0))} onChange={(_, value) => setActiveTabIndex(value)} sx={{ mt: 2 }}>
                    {formTabs.map((tab) => <Tab key={tab.title} label={tab.title} />)}
                  </Tabs>
                  <Grid container spacing={2} sx={{ mt: 1 }}>
                    {((formTabs[activeTabIndex] || {}).fields || []).sort((a, b) => Number(a.order || 0) - Number(b.order || 0)).map((field) => (
                      <Grid item xs={12} md={field.fieldtype === "Textarea" ? 12 : 4} key={field.fieldname}>
                        <DynamicField field={field} value={data[field.fieldname]} onChange={(value) => setData((prev) => ({ ...prev, [field.fieldname]: value }))} />
                      </Grid>
                    ))}
                  </Grid>
                </>
              ) : <Alert severity="warning" sx={{ mt: 2 }}>No active form is available for this program and exam type.</Alert>}
            </Paper>

            {!!selectedForm?.documents?.length && (
              <Paper sx={{ ...paperSx, mt: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Documents</Typography>
                <Grid container spacing={2}>
                  {[...(selectedForm.documents || [])].sort((a, b) => Number(a.order || 0) - Number(b.order || 0)).map((doc) => {
                    const uploaded = documents.find((item) => item.documenttype === doc.documenttype);
                    return (
                      <Grid item xs={12} md={4} key={doc.documenttype}>
                        <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                          <Typography sx={{ fontWeight: 700 }}>{doc.documenttype} {doc.required === "Yes" ? "*" : ""}</Typography>
                          {uploaded?.url && <Typography component="a" href={uploaded.url} target="_blank" rel="noreferrer" sx={{ display: "block", mt: 0.5, fontSize: 13 }}>View uploaded document</Typography>}
                          <Button component="label" size="small" sx={{ mt: 1 }} startIcon={uploadingDoc === doc.documenttype ? <CircularProgress size={14} /> : <UploadFile />} disabled={uploadingDoc === doc.documenttype}>
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

            <Paper sx={{ ...paperSx, mt: 2 }}>
              <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2} sx={{ mb: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>{filters.examtype === "Regular" ? "Regular and elective courses" : "Failed supplementary courses"}</Typography>
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
                      renderCell: (params) => <Checkbox checked={selectedCourses.includes(params.row.id)} onChange={() => toggleCourse(params.row.id)} />
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
                <Button variant="contained" size="large" disabled={submitting || !selectedForm || !selectedCourses.length} startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : <Save />} onClick={submit}>
                  Submit exam form
                </Button>
              </Stack>
            </Paper>

            <Paper sx={{ ...paperSx, mt: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Exam fee ledger</Typography>
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

function SearchSelect({ label, value, options = [], onChange, getOptionLabel = (option) => option, disabled = false }) {
  return (
    <Autocomplete
      size="small"
      disabled={disabled}
      options={options}
      value={value || null}
      onChange={(_, nextValue) => onChange(nextValue || "")}
      getOptionLabel={(option) => getOptionLabel(option) || ""}
      isOptionEqualToValue={(option, selected) => JSON.stringify(option) === JSON.stringify(selected)}
      renderInput={(params) => <TextField {...params} label={label} />}
    />
  );
}

export function ConductExamStudentFormPage() {
  const [filters, setFilters] = useState({ academicyear: "", regulation: "", examcode: "", program: "", programcode: "", semester: "" });
  const [options, setOptions] = useState({ academicyears: [], regulations: [], exams: [], programs: [], semesters: [] });
  const [students, setStudents] = useState([]);
  const [selectedRegno, setSelectedRegno] = useState("");
  const [institution, setInstitution] = useState({});
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [loadingRows, setLoadingRows] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const selectedStudent = useMemo(() => students.find((row) => row.student?.regno === selectedRegno) || null, [students, selectedRegno]);
  const selectedExam = useMemo(() => (options.exams || []).find((row) => row.examcode === filters.examcode && (!filters.academicyear || row.academicyear === filters.academicyear)) || {}, [options.exams, filters]);

  const loadOptions = async (extra = {}) => {
    try {
      setLoadingOptions(true);
      const params = { colid: global1.colid, ...filters, ...extra };
      Object.keys(params).forEach((key) => !params[key] && delete params[key]);
      const res = await ep1.get("/api/v2/conductexam/student-exam-form-report-options", { params });
      setOptions(res.data?.data || {});
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load filter options");
    } finally {
      setLoadingOptions(false);
    }
  };

  useEffect(() => {
    loadOptions();
    loadInstitutionDetails().then(setInstitution).catch(() => setInstitution({}));
  }, []);

  const loadStudents = async () => {
    if (!filters.academicyear || !filters.examcode || !filters.programcode) {
      setError("Select academic year, exam and program before loading students");
      return;
    }
    try {
      setLoadingRows(true);
      setError("");
      setMessage("");
      setSelectedRegno("");
      const params = { colid: global1.colid, ...filters };
      Object.keys(params).forEach((key) => !params[key] && delete params[key]);
      const res = await ep1.get("/api/v2/conductexam/student-exam-form-report", { params });
      setStudents(res.data?.data?.students || []);
      if (res.data?.data?.institution) setInstitution(res.data.data.institution);
      setMessage(`Loaded ${res.data?.data?.students?.length || 0} students from examroll`);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load students");
    } finally {
      setLoadingRows(false);
    }
  };

  const printSelected = () => {
    if (!selectedStudent) {
      setError("Select a student first");
      return;
    }
    openStudentExamFormPrint({
      institution,
      student: selectedStudent.student,
      courses: selectedStudent.courses || [],
      fees: selectedStudent.examFeeLedger || [],
      exam: { ...selectedExam, academicyear: filters.academicyear, examcode: filters.examcode },
      title: "Student Exam Form"
    });
  };

  const studentRows = students.map((row) => ({
    id: row.student?.regno || row.id,
    regno: row.student?.regno,
    name: row.student?.name,
    fathername: row.student?.fathername,
    mothername: row.student?.mothername,
    phone: row.student?.phone,
    program: row.student?.program,
    programcode: row.student?.programcode,
    semester: row.student?.semester,
    section: row.student?.section,
    subjects: row.courses?.length || 0
  }));
  const courseRows = (selectedStudent?.courses || []).map((row, index) => ({ ...row, id: row.id || `${row.coursecode}-${index}` }));
  const selectedFeeRows = (selectedStudent?.examFeeLedger || []).map((row, index) => ({ ...row, id: row._id || `fee-${index}` }));

  return (
    <MenuPageShell title="Student exam form" menuType="main">
      <Box sx={pageBox}>
        <BackButton />
        <Typography variant="h5" sx={{ fontWeight: 800, mb: 2 }}>Student exam form</Typography>
        {error && <Alert severity="error" sx={{ mb: 2, whiteSpace: "pre-line" }}>{error}</Alert>}
        {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
        <Paper sx={paperSx}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={2.4}>
              <SearchSelect label="Academic year" value={filters.academicyear} options={options.academicyears || []} onChange={(value) => setFilters((prev) => ({ ...prev, academicyear: value, examcode: "" }))} disabled={loadingOptions} />
            </Grid>
            <Grid item xs={12} md={2.4}>
              <SearchSelect label="Regulation" value={filters.regulation} options={options.regulations || []} onChange={(value) => setFilters((prev) => ({ ...prev, regulation: value }))} disabled={loadingOptions} />
            </Grid>
            <Grid item xs={12} md={2.4}>
              <SearchSelect
                label="Exam"
                value={(options.exams || []).find((row) => row.examcode === filters.examcode) || null}
                options={(options.exams || []).filter((row) => !filters.academicyear || row.academicyear === filters.academicyear)}
                getOptionLabel={(option) => `${option.exam || option.examcode} (${option.examcode})`}
                onChange={(value) => setFilters((prev) => ({ ...prev, examcode: value?.examcode || "" }))}
                disabled={loadingOptions}
              />
            </Grid>
            <Grid item xs={12} md={2.4}>
              <SearchSelect
                label="Program"
                value={(options.programs || []).find((row) => row.programcode === filters.programcode) || null}
                options={options.programs || []}
                getOptionLabel={(option) => `${option.program || option.programcode} (${option.programcode})`}
                onChange={(value) => setFilters((prev) => ({ ...prev, program: value?.program || "", programcode: value?.programcode || "" }))}
                disabled={loadingOptions}
              />
            </Grid>
            <Grid item xs={12} md={1.2}>
              <SearchSelect label="Semester" value={filters.semester} options={options.semesters || []} onChange={(value) => setFilters((prev) => ({ ...prev, semester: value }))} disabled={loadingOptions} />
            </Grid>
            <Grid item xs={12} md={1.2}>
              <Button fullWidth variant="contained" disabled={loadingRows} startIcon={loadingRows ? <CircularProgress size={16} color="inherit" /> : <Refresh />} onClick={loadStudents}>Load</Button>
            </Grid>
          </Grid>
        </Paper>

        <Paper sx={{ ...paperSx, mt: 2 }}>
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2} sx={{ mb: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>Students from examroll</Typography>
            <Button variant="outlined" startIcon={<Print />} disabled={!selectedStudent} onClick={printSelected}>Print preview</Button>
          </Stack>
          <Box sx={{ height: 430 }}>
            <DataGrid
              rows={studentRows}
              columns={[
                {
                  field: "select",
                  headerName: "Select",
                  width: 90,
                  sortable: false,
                  filterable: false,
                  renderCell: (params) => <Checkbox checked={selectedRegno === params.row.regno} onChange={() => setSelectedRegno(params.row.regno)} />
                },
                { field: "regno", headerName: "Reg no", width: 140 },
                { field: "name", headerName: "Student", width: 220 },
                { field: "fathername", headerName: "Father's name", width: 180 },
                { field: "mothername", headerName: "Mother's name", width: 180 },
                { field: "phone", headerName: "Phone", width: 140 },
                { field: "program", headerName: "Program", width: 210 },
                { field: "programcode", headerName: "Program code", width: 140 },
                { field: "semester", headerName: "Semester", width: 110 },
                { field: "section", headerName: "Section", width: 110 },
                { field: "subjects", headerName: "Subjects", width: 110, type: "number" }
              ]}
              slots={{ toolbar: GridToolbar }}
              pageSizeOptions={[25, 50, 100]}
              initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
              onRowClick={(params) => setSelectedRegno(params.row.regno)}
              disableRowSelectionOnClick
            />
          </Box>
        </Paper>

        {selectedStudent && (
          <>
            <Paper sx={{ ...paperSx, mt: 2 }}>
              <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2} sx={{ mb: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>Selected student profile</Typography>
                <Button variant="contained" startIcon={<Print />} onClick={printSelected}>Generate print preview</Button>
              </Stack>
              <Grid container spacing={2} alignItems="flex-start">
                <Grid item xs={12} md={10}>
                  <Grid container spacing={1.5}>
                    {profileFields.map(([label, field]) => (
                      <Grid item xs={12} sm={6} md={3} key={field}>
                        <Typography variant="caption" color="text.secondary">{label}</Typography>
                        <Typography sx={{ fontWeight: 700, overflowWrap: "anywhere" }}>{profileValue(selectedStudent.student, field) || "NA"}</Typography>
                      </Grid>
                    ))}
                    <Grid item xs={12} sm={6} md={3}>
                      <Typography variant="caption" color="text.secondary">Email</Typography>
                      <Typography sx={{ fontWeight: 700, overflowWrap: "anywhere" }}>{selectedStudent.student?.email || "NA"}</Typography>
                    </Grid>
                  </Grid>
                </Grid>
                <Grid item xs={12} md={2}>
                  {studentPhoto(selectedStudent.student) ? (
                    <Box component="img" src={studentPhoto(selectedStudent.student)} alt="Student" sx={{ width: 110, height: 135, objectFit: "cover", border: "1px solid #d1d5db", borderRadius: 1, bgcolor: "#fff" }} />
                  ) : (
                    <Box sx={{ width: 110, height: 135, border: "1px solid #d1d5db", borderRadius: 1, display: "grid", placeItems: "center", color: "text.secondary" }}>Photo</Box>
                  )}
                </Grid>
              </Grid>
            </Paper>
            <Paper sx={{ ...paperSx, mt: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>Subjects</Typography>
              <Box sx={{ height: 360 }}>
                <DataGrid
                  rows={courseRows}
                  columns={[
                    { field: "coursecode", headerName: "Course code", width: 150 },
                    { field: "course", headerName: "Course", width: 280 },
                    { field: "subject", headerName: "Subject", width: 180 },
                    { field: "type", headerName: "Type", width: 120 },
                    { field: "semester", headerName: "Semester", width: 120 },
                    { field: "examdate", headerName: "Exam date", width: 130 },
                    { field: "examslot", headerName: "Slot", width: 130 },
                    { field: "examsection", headerName: "Exam section", width: 160 }
                  ]}
                  slots={{ toolbar: GridToolbar }}
                  pageSizeOptions={[25, 50, 100]}
                  initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
                  disableRowSelectionOnClick
                />
              </Box>
            </Paper>
            <Paper sx={{ ...paperSx, mt: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>Exam fee ledger</Typography>
              <Box sx={{ height: 300 }}>
                <DataGrid
                  rows={selectedFeeRows}
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

export { default as StudentExamDynamicForm2Page } from "./StudentExamDynamicForm2Page";
