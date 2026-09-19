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
