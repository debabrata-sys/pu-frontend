import React, { useEffect, useMemo, useState, useRef } from "react";
import QRCode from "qrcode";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  ButtonGroup,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography
} from "@mui/material";
import PrintIcon from "@mui/icons-material/Print";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import ZoomOutIcon from "@mui/icons-material/ZoomOut";
import FitScreenIcon from "@mui/icons-material/FitScreen";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import NavigateBeforeIcon from "@mui/icons-material/NavigateBefore";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import ArticleIcon from "@mui/icons-material/Article";

import MenuPageShell from "./MenuPageShell";
import ep1 from "../api/ep1";
import global1 from "./global1";

// ==========================================
// UTILITY: NUMBER TO WORDS
// ==========================================
export function numberToWords(num) {
  if (!num || isNaN(num)) return "";
  const a = ["", "ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT", "NINE", "TEN", "ELEVEN", "TWELVE", "THIRTEEN", "FOURTEEN", "FIFTEEN", "SIXTEEN", "SEVENTEEN", "EIGHTEEN", "NINETEEN"];
  const b = ["", "", "TWENTY", "THIRTY", "FORTY", "FIFTY", "SIXTY", "SEVENTY", "EIGHTY", "NINETY"];
  const n = Math.floor(Math.abs(Number(num)));
  if (n === 0) return "ZERO";

  function convert(val) {
    if (val < 20) return a[val];
    if (val < 100) return b[Math.floor(val / 10)] + (val % 10 !== 0 ? " " + a[val % 10] : "");
    if (val < 1000) return a[Math.floor(val / 100)] + " HUNDRED" + (val % 100 !== 0 ? " " + convert(val % 100) : "");
    if (val < 100000) return convert(Math.floor(val / 1000)) + " THOUSAND" + (val % 1000 !== 0 ? " " + convert(val % 1000) : "");
    if (val < 10000000) return convert(Math.floor(val / 100000)) + " LAKH" + (val % 100000 !== 0 ? " " + convert(val % 100000) : "");
    return convert(Math.floor(val / 10000000)) + " CRORE" + (val % 10000000 !== 0 ? " " + convert(val % 10000000) : "");
  }

  return convert(n).trim();
}

export const fmt = (v) => (v === null || v === undefined || v === "" ? "-" : v);

const uniqueSorted = (arr) => Array.from(new Set((arr || []).filter(Boolean).map((v) => String(v).trim()))).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

// ==========================================
// AUTHENTIC SECURITY BORDER & WATERMARK
// ==========================================
export function MarksheetSecurityFrame({ children, isLandscape = false }) {
  return (
    <Box
      className="marksheet-security-frame"
      sx={{
        width: "100%",
        height: "100%",
        position: "relative",
        boxSizing: "border-box",
        p: { xs: "8px", md: "11px" },
        border: "3px double #135497",
        outline: "1px solid #135497",
        outlineOffset: "-6px",
        bgcolor: "#fff",
        color: "#000",
        overflow: "hidden"
      }}
    >
      {/* Decorative Corner Ornaments */}
      <Box sx={{ position: "absolute", top: 4, left: 4, width: 22, height: 22, borderTop: "3px solid #135497", borderLeft: "3px solid #135497", pointerEvents: "none" }} />
      <Box sx={{ position: "absolute", top: 4, right: 4, width: 22, height: 22, borderTop: "3px solid #135497", borderRight: "3px solid #135497", pointerEvents: "none" }} />
      <Box sx={{ position: "absolute", bottom: 4, left: 4, width: 22, height: 22, borderBottom: "3px solid #135497", borderLeft: "3px solid #135497", pointerEvents: "none" }} />
      <Box sx={{ position: "absolute", bottom: 4, right: 4, width: 22, height: 22, borderBottom: "3px solid #135497", borderRight: "3px solid #135497", pointerEvents: "none" }} />

      {/* Repeating Diagonal Watermark */}
      <Box
        className="marksheet-watermark"
        sx={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          opacity: 0.05,
          zIndex: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: "rotate(-25deg)",
          fontSize: isLandscape ? "28pt" : "24pt",
          fontWeight: 950,
          color: "#135497",
          lineHeight: 2.2,
          textAlign: "center",
          whiteSpace: "pre"
        }}
      >
        {`PEOPLE'S UNIVERSITY, BHOPAL    PEOPLE'S UNIVERSITY, BHOPAL\nPEOPLE'S UNIVERSITY, BHOPAL    PEOPLE'S UNIVERSITY, BHOPAL\nPEOPLE'S UNIVERSITY, BHOPAL    PEOPLE'S UNIVERSITY, BHOPAL\nPEOPLE'S UNIVERSITY, BHOPAL    PEOPLE'S UNIVERSITY, BHOPAL`}
      </Box>

      {/* Content Layer */}
      <Box sx={{ position: "relative", zIndex: 1, width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
        {children}
      </Box>
    </Box>
  );
}

// ==========================================
// UNIVERSITY CREST & TITLE HEADER
// ==========================================
export function UniversityHeader({
  logo,
  qr,
  photo,
  marksheetNo,
  subTitle = "STATEMENT OF MARKS",
  isLandscape = false
}) {
  return (
    <Box sx={{ mb: 1, borderBottom: "1.5px solid #135497", pb: 0.8 }}>
      <Grid container alignItems="center" justifyContent="space-between">
        {/* Left: QR Code or Logo space */}
        <Grid item xs={2} sx={{ display: "flex", justifyContent: "flex-start", alignItems: "center" }}>
          {qr ? (
            <Box sx={{ border: "1px solid #333", p: 0.3, bgcolor: "#fff", display: "inline-block" }}>
              <Box component="img" src={qr} alt="QR" sx={{ width: isLandscape ? 58 : 52, height: isLandscape ? 58 : 52, display: "block" }} />
            </Box>
          ) : (
            logo && <Box component="img" src={logo} alt="Logo" sx={{ maxHeight: 52, maxWidth: 80, objectFit: "contain" }} />
          )}
        </Grid>

        {/* Center: University Title & Crest */}
        <Grid item xs={8} sx={{ textAlign: "center" }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1 }}>
            {logo && (
              <Box component="img" src={logo} alt="" sx={{ height: isLandscape ? 40 : 44, objectFit: "contain" }} />
            )}
            <Typography
              sx={{
                fontSize: isLandscape ? "21pt" : "20pt",
                fontWeight: 950,
                color: "#135497",
                letterSpacing: 1.2,
                lineHeight: 1.05,
                fontFamily: "Arial, sans-serif"
              }}
            >
              PEOPLE'S UNIVERSITY
            </Typography>
          </Box>

          <Typography sx={{ fontSize: isLandscape ? "7.2pt" : "7.0pt", fontWeight: 700, color: "#222", mt: 0.3, lineHeight: 1.1 }}>
            [Established under MP Act No. 17/2007, by Amendment Act No. 18/2011 and approved by UGC]
          </Typography>

          <Box sx={{ display: "inline-block", mt: 0.6, px: 2, py: 0.2, border: "1.5px solid #135497", borderRadius: 1 }}>
            <Typography sx={{ fontSize: isLandscape ? "9.5pt" : "9.0pt", fontWeight: 900, color: "#135497", letterSpacing: 0.8, textTransform: "uppercase" }}>
              {subTitle}
            </Typography>
          </Box>
        </Grid>

        {/* Right: Photo & Marksheet No */}
        <Grid item xs={2} sx={{ display: "flex", flexDirection: "column", alignItems: "flex-end", justifyContent: "center" }}>
          {photo ? (
            <Box sx={{ border: "1.5px solid #c00", p: 0.2, bgcolor: "#fff", mb: 0.3 }}>
              <Box component="img" src={photo} alt="" sx={{ width: isLandscape ? 54 : 48, height: isLandscape ? 64 : 58, objectFit: "cover", display: "block" }} />
            </Box>
          ) : (
            <Box sx={{ width: 50, height: 60, border: "1px dashed #999", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, mb: 0.3 }}>
              Photo
            </Box>
          )}
          {marksheetNo && (
            <Typography sx={{ fontSize: "7.2pt", fontWeight: 900, textAlign: "right" }}>
              MARKSHEET NO. : <span style={{ fontWeight: 800 }}>{marksheetNo}</span>
            </Typography>
          )}
        </Grid>
      </Grid>
    </Box>
  );
}

// ==========================================
// 1. ANNUAL MAIN MARKSHEET (MBBS_B474_0313...)
// ==========================================
export function AnnualMainMarksheetPrint({
  student = {},
  institution = {},
  qr = "",
  issueDate = "",
  marksheetNo = ""
}) {
  const courses = student.courses || [];
  const grandTotal = student.grandTotal || {};
  const consolidated = student.consolidatedProf || [
    { prof: "I - PROF.", marks: "871/1500" },
    { prof: "II - PROF.", marks: "783/1500" },
    { prof: "III - PROF.(I)", marks: "999/1700" },
    { prof: "III - PROF.(II)", marks: "1573/2800" }
  ];

  const totalObt = Number(grandTotal.totalObtained || 1573);
  const totalMax = Number(grandTotal.totalMax || 2800);
  const passingObt = Number(grandTotal.passingObtained || 821);
  const passingMax = Number(grandTotal.passingMax || 1400);

  const thStyle = {
    border: "1px solid #000",
    padding: "2px 2px",
    fontSize: "6.5pt",
    fontWeight: 900,
    textAlign: "center",
    bgcolor: "#f3f4f6",
    lineHeight: 1.1
  };

  const tdStyle = {
    border: "1px solid #000",
    padding: "2px 3px",
    fontSize: "6.8pt",
    lineHeight: 1.15
  };

  const demoLabel = { fontSize: "7.2pt", fontWeight: 900, color: "#000" };
  const demoVal = { fontSize: "7.2pt", fontWeight: 700, color: "#000" };

  return (
    <Box className="marksheet-page marksheet-landscape" sx={{ width: "297mm", minHeight: "208mm", p: 1, bgcolor: "#fff", boxSizing: "border-box" }}>
      <MarksheetSecurityFrame isLandscape>
        <UniversityHeader
          logo={institution.logolink || institution.logo}
          qr={qr}
          photo={student.photo}
          marksheetNo={marksheetNo || student.marksheetNo || "PUBH26232445M43M"}
          subTitle="STATEMENT OF MARKS"
          isLandscape
        />

        {/* 3-COLUMN DEMOGRAPHICS */}
        <Box sx={{ mb: 1, px: 0.5 }}>
          <Grid container spacing={0.5}>
            <Grid item xs={4.2}>
              <Typography sx={demoLabel}>ENROLLMENT NO. : <span style={demoVal}>{fmt(student.enrolmentno || student.regno)}</span></Typography>
              <Typography sx={demoLabel}>NAME : <span style={demoVal}>{fmt(student.name)}</span></Typography>
              <Typography sx={demoLabel}>FATHER'S NAME : <span style={demoVal}>{fmt(student.fathername)}</span></Typography>
              <Typography sx={demoLabel}>MOTHER'S NAME : <span style={demoVal}>{fmt(student.mothername)}</span></Typography>
            </Grid>
            <Grid item xs={4.6}>
              <Typography sx={demoLabel}>PROGRAM : <span style={demoVal}>{fmt(student.program || "BACHELOR OF MEDICINE & BACHELOR OF SURGERY")}</span></Typography>
              <Typography sx={demoLabel}>EXAMINATION : <span style={demoVal}>{fmt(student.exam || "MARCH - 2026")}</span></Typography>
              <Typography sx={demoLabel}>INSTITUTE : <span style={demoVal}>{fmt(student.institute || institution.name || "PEOPLE'S COLLEGE OF MEDICAL SCIENCES AND RESEARCH CENTRE, BHOPAL")}</span></Typography>
            </Grid>
            <Grid item xs={3.2}>
              <Typography sx={demoLabel}>PROFESSIONAL : <span style={demoVal}>{fmt(student.professional || "III PROF (PART-II)")}</span></Typography>
              <Typography sx={demoLabel}>STATUS : <span style={demoVal}>{fmt(student.status || "REGULAR")}</span></Typography>
              <Typography sx={demoLabel}>ATTEMPT : <span style={demoVal}>{fmt(student.attempt || "FIRST")}</span></Typography>
            </Grid>
          </Grid>
        </Box>

        {/* COMPONENT-WISE MARKS TABLE */}
        <Box sx={{ width: "100%", mb: 1 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", border: "1.5px solid #000", tableLayout: "fixed" }}>
            <thead>
              <tr>
                <th rowSpan={3} style={{ ...thStyle, width: "6.5%" }}>PAPER CODE</th>
                <th rowSpan={3} style={{ ...thStyle, width: "23.5%", textAlign: "left", pl: 0.5 }}>NAME OF PAPER</th>
                <th colSpan={9} style={thStyle}>MAXIMUM MARKS</th>
                <th colSpan={9} style={thStyle}>MARKS OBTAINED</th>
              </tr>
              <tr>
                <th colSpan={3} style={thStyle}>THEORY</th>
                <th colSpan={3} style={thStyle}>PRACTICAL</th>
                <th colSpan={2} style={thStyle}>IA</th>
                <th rowSpan={2} style={{ ...thStyle, width: "4.5%" }}>TOTAL WITH TH+PR+IA</th>
                <th colSpan={3} style={thStyle}>THEORY</th>
                <th colSpan={3} style={thStyle}>PRACTICAL</th>
                <th colSpan={2} style={thStyle}>IA</th>
                <th rowSpan={2} style={{ ...thStyle, width: "4.5%" }}>TOTAL WITH TH+PR+IA</th>
              </tr>
              <tr>
                <th style={{ ...thStyle, width: "3.2%" }}>P-I</th>
                <th style={{ ...thStyle, width: "3.2%" }}>P-II</th>
                <th style={{ ...thStyle, width: "3.8%" }}>Total</th>
                <th style={{ ...thStyle, width: "3.2%" }}>AE</th>
                <th style={{ ...thStyle, width: "3.2%" }}>VV</th>
                <th style={{ ...thStyle, width: "3.8%" }}>Total</th>
                <th style={{ ...thStyle, width: "3.0%" }}>TH</th>
                <th style={{ ...thStyle, width: "3.0%" }}>PR</th>

                <th style={{ ...thStyle, width: "3.2%" }}>P-I</th>
                <th style={{ ...thStyle, width: "3.2%" }}>P-II</th>
                <th style={{ ...thStyle, width: "3.8%" }}>Total</th>
                <th style={{ ...thStyle, width: "3.2%" }}>AE</th>
                <th style={{ ...thStyle, width: "3.2%" }}>VV</th>
                <th style={{ ...thStyle, width: "3.8%" }}>Total</th>
                <th style={{ ...thStyle, width: "3.0%" }}>TH</th>
                <th style={{ ...thStyle, width: "3.0%" }}>PR</th>
              </tr>
            </thead>
            <tbody>
              {courses.map((c, idx) => (
                <tr key={idx}>
                  <td style={{ ...tdStyle, textAlign: "center", fontWeight: 700 }}>{fmt(c.papercode)}</td>
                  <td style={{ ...tdStyle, fontWeight: 700 }}>{fmt(c.papername)}</td>
                  {/* MAX */}
                  <td style={{ ...tdStyle, textAlign: "center" }}>{fmt(c.theoryPI_Max || 100)}</td>
                  <td style={{ ...tdStyle, textAlign: "center" }}>{fmt(c.theoryPII_Max || (c.papercode?.includes("1308") ? "-" : 100))}</td>
                  <td style={{ ...tdStyle, textAlign: "center", fontWeight: 700 }}>{fmt(c.theoryTotal_Max || 200)}</td>
                  <td style={{ ...tdStyle, textAlign: "center" }}>{fmt(c.practicalAE_Max || 160)}</td>
                  <td style={{ ...tdStyle, textAlign: "center" }}>{fmt(c.practicalVV_Max || 40)}</td>
                  <td style={{ ...tdStyle, textAlign: "center", fontWeight: 700 }}>{fmt(c.practicalTotal_Max || 200)}</td>
                  <td style={{ ...tdStyle, textAlign: "center" }}>{fmt(c.iaTH_Max || 200)}</td>
                  <td style={{ ...tdStyle, textAlign: "center" }}>{fmt(c.iaPR_Max || 200)}</td>
                  <td style={{ ...tdStyle, textAlign: "center", fontWeight: 800 }}>{fmt(c.totalWithIA_Max || 800)}</td>
                  {/* OBT */}
                  <td style={{ ...tdStyle, textAlign: "center" }}>{fmt(c.theoryPI_Obt || "-")}</td>
                  <td style={{ ...tdStyle, textAlign: "center" }}>{fmt(c.theoryPII_Obt || "-")}</td>
                  <td style={{ ...tdStyle, textAlign: "center", fontWeight: 700 }}>{fmt(c.theoryTotal_Obt || "-")}</td>
                  <td style={{ ...tdStyle, textAlign: "center" }}>{fmt(c.practicalAE_Obt || "-")}</td>
                  <td style={{ ...tdStyle, textAlign: "center" }}>{fmt(c.practicalVV_Obt || "-")}</td>
                  <td style={{ ...tdStyle, textAlign: "center", fontWeight: 700 }}>{fmt(c.practicalTotal_Obt || "-")}</td>
                  <td style={{ ...tdStyle, textAlign: "center" }}>{fmt(c.iaTH_Obt || "-")}</td>
                  <td style={{ ...tdStyle, textAlign: "center" }}>{fmt(c.iaPR_Obt || "-")}</td>
                  <td style={{ ...tdStyle, textAlign: "center", fontWeight: 800 }}>{fmt(c.totalWithIA_Obt || "-")}</td>
                </tr>
              ))}
              <tr>
                <td colSpan={20} style={{ ...tdStyle, textAlign: "center", fontStyle: "italic", fontWeight: 700 }}>
                  ***End of Statement***
                </td>
              </tr>
              {/* TOTAL ROW */}
              <tr style={{ bgcolor: "#f9fafb", fontWeight: 900 }}>
                <td colSpan={2} style={{ ...tdStyle, textAlign: "right", fontWeight: 900 }}>TOTAL</td>
                <td colSpan={3} style={{ ...tdStyle, textAlign: "center", fontWeight: 900 }}>700</td>
                <td colSpan={3} style={{ ...tdStyle, textAlign: "center", fontWeight: 900 }}>700</td>
                <td colSpan={2} style={{ ...tdStyle, textAlign: "center", fontWeight: 900 }}>1400</td>
                <td style={{ ...tdStyle, textAlign: "center", fontWeight: 900 }}>{totalMax}</td>
                <td colSpan={3} style={{ ...tdStyle, textAlign: "center", fontWeight: 900 }}>378</td>
                <td colSpan={3} style={{ ...tdStyle, textAlign: "center", fontWeight: 900 }}>443</td>
                <td colSpan={2} style={{ ...tdStyle, textAlign: "center", fontWeight: 900 }}>752</td>
                <td style={{ ...tdStyle, textAlign: "center", fontWeight: 900 }}>{totalObt}</td>
              </tr>
            </tbody>
          </table>
        </Box>

        {/* SUMMARY, WORDS & CONSOLIDATED SECTION */}
        <Box sx={{ width: "100%", mb: 1, border: "1.5px solid #000", p: 0.5, bgcolor: "#fff" }}>
          <Grid container spacing={0.5}>
            <Grid item xs={6}>
              <Typography sx={demoLabel}>PASSING TOTAL MAXIMUM MARKS : <span style={demoVal}>{passingMax}</span> &nbsp;&nbsp;&nbsp;&nbsp; MARKS OBTAINED : <span style={demoVal}>{passingObt}</span></Typography>
              <Typography sx={demoLabel}>GRAND TOTAL MAXIMUM MARKS : <span style={demoVal}>{totalMax}</span> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; MARKS OBTAINED : <span style={demoVal}>{totalObt}</span></Typography>
              <Typography sx={demoLabel}>IN WORDS : <span style={{ ...demoVal, textDecoration: "underline" }}>{numberToWords(passingObt)}</span></Typography>
              <Typography sx={demoLabel}>IN WORDS : <span style={{ ...demoVal, textDecoration: "underline" }}>{numberToWords(totalObt)}</span></Typography>
              <Typography sx={{ ...demoLabel, mt: 0.3 }}>
                RESULT : <span style={{ fontWeight: 950, color: student.result === "FAIL" ? "#c00" : "#000" }}>{fmt(student.result || "PASS")}</span> &nbsp;&nbsp;&nbsp;&nbsp;
                OVER ALL PERCENTAGE : <span style={demoVal}>{fmt(student.overallPercentage || "56.18")}</span> &nbsp;&nbsp;&nbsp;&nbsp;
                PASSING PERCENTAGE : <span style={demoVal}>{fmt(student.passingPercentage || "58.64")}</span>
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography sx={{ fontSize: "7.2pt", fontWeight: 900, textAlign: "center", mb: 0.2 }}>CONSOLIDATED</Typography>
              <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #000", fontSize: "6.8pt" }}>
                <thead>
                  <tr style={{ bgcolor: "#f3f4f6" }}>
                    <th style={thStyle}>I - PROF.</th>
                    <th style={thStyle}>II - PROF.</th>
                    <th style={thStyle}>III - PROF.(I)</th>
                    <th style={thStyle}>III - PROF.(II)</th>
                    <th style={thStyle}>TOTAL</th>
                    <th style={thStyle}>RESULT</th>
                    <th style={thStyle}>%</th>
                    <th style={thStyle}>DIVISION</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ ...tdStyle, textAlign: "center" }}>871/1500</td>
                    <td style={{ ...tdStyle, textAlign: "center" }}>783/1500</td>
                    <td style={{ ...tdStyle, textAlign: "center" }}>999/1700</td>
                    <td style={{ ...tdStyle, textAlign: "center" }}>{totalObt}/{totalMax}</td>
                    <td style={{ ...tdStyle, textAlign: "center", fontWeight: 800 }}>4226/7500</td>
                    <td style={{ ...tdStyle, textAlign: "center", fontWeight: 800 }}>PASS</td>
                    <td style={{ ...tdStyle, textAlign: "center" }}>56.35</td>
                    <td style={{ ...tdStyle, textAlign: "center", fontWeight: 800 }}>SECOND DIVISION</td>
                  </tr>
                </tbody>
              </table>
            </Grid>
          </Grid>
        </Box>

        {/* SIGNATURES & ISSUE DATE */}
        <Box sx={{ mt: "auto", pt: 1, display: "flex", justifyContent: "space-between", alignItems: "flex-end", fontSize: "7.5pt", fontWeight: 900 }}>
          <Box>
            <div>PREPARED BY : ____________________</div>
            <div style={{ marginTop: 6 }}>ISSUE DATE : <span style={{ fontWeight: 800 }}>{issueDate || new Date().toLocaleDateString("en-GB")}</span></div>
          </Box>
          <Box>
            <div>CHECKED BY : 1. ____________________</div>
            <div style={{ marginTop: 6, paddingLeft: 72 }}>2. ____________________</div>
          </Box>
          <Box sx={{ textAlign: "right" }}>
            <div>CONTROLLER OF EXAMINATIONS</div>
          </Box>
        </Box>
      </MarksheetSecurityFrame>
    </Box>
  );
}

// ==========================================
// 2. SEMESTER PROVISIONAL MARKSHEET (Document-12)
// ==========================================
export function SemesterProvisionalMarksheetPrint({
  student = {},
  institution = {},
  issueDate = ""
}) {
  const courses = student.courses || [];
  const semHistory = student.semHistory || [
    { sem: "I", exam: "Jan-24", result: "FAIL / 5.42" },
    { sem: "II", exam: "Feb-25", result: "PASS / 6" },
    { sem: "III", exam: "Jul-25", result: "PASS / 6.65" },
    { sem: "IV", exam: "-", result: "-" },
    { sem: "V", exam: "-", result: "-" },
    { sem: "VI", exam: "-", result: "-" },
    { sem: "VII", exam: "-", result: "-" },
    { sem: "VIII", exam: "-", result: "-" }
  ];

  const totalAllotted = courses.reduce((s, c) => s + (Number(c.creditsOff) || 0), 0) || 26;
  const totalEarned = courses.reduce((s, c) => s + (Number(c.creditsEarned) || 0), 0) || 26;

  const thStyle = {
    border: "1px solid #000",
    padding: "3px 4px",
    fontSize: "7.5pt",
    fontWeight: 900,
    textAlign: "center",
    bgcolor: "#f9fafb"
  };

  const tdStyle = {
    border: "1px solid #000",
    padding: "3px 5px",
    fontSize: "7.8pt",
    lineHeight: 1.2
  };

  const demoLabel = { fontSize: "8pt", fontWeight: 900, color: "#000" };
  const demoVal = { fontSize: "8pt", fontWeight: 700, color: "#000" };

  return (
    <Box className="marksheet-page marksheet-portrait" sx={{ width: "210mm", minHeight: "292mm", p: 1, bgcolor: "#fff", boxSizing: "border-box" }}>
      <MarksheetSecurityFrame isLandscape={false}>
        <UniversityHeader
          logo={institution.logolink || institution.logo}
          subTitle="STATEMENT OF GRADE"
          isLandscape={false}
        />

        {/* DEMOGRAPHICS GRID */}
        <Box sx={{ mb: 1.5, px: 0.5 }}>
          <Grid container spacing={1}>
            <Grid item xs={6}>
              <Typography sx={demoLabel}>ENROLLMENT NO. : <span style={demoVal}>{fmt(student.enrolmentno || student.regno)}</span></Typography>
              <Typography sx={demoLabel}>NAME : <span style={demoVal}>{fmt(student.name)}</span></Typography>
              <Typography sx={demoLabel}>FATHER'S NAME : <span style={demoVal}>{fmt(student.fathername)}</span></Typography>
              <Typography sx={demoLabel}>MOTHER'S NAME : <span style={demoVal}>{fmt(student.mothername)}</span></Typography>
              <Typography sx={demoLabel}>INST. / FACULTY : <span style={demoVal}>{fmt(student.institute || institution.name || "SCHOOL OF RESEARCH & TECHNOLOGY, BHOPAL")}</span></Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography sx={demoLabel}>PROGRAM : <span style={demoVal}>{fmt(student.program || "DIPLOMA")}</span></Typography>
              <Typography sx={demoLabel}>BRANCH / SPL : <span style={demoVal}>{fmt(student.branchname || "COMPUTER SCIENCE ENGINEERING")}</span></Typography>
              <Typography sx={demoLabel}>SEMESTER : <span style={demoVal}>{fmt(student.semester || "FIFTH")}</span></Typography>
              <Typography sx={demoLabel}>EXAMINATION : <span style={demoVal}>{fmt(student.exam || "MAY-2026")}</span></Typography>
              <Typography sx={demoLabel}>STATUS : <span style={demoVal}>{fmt(student.status || "REGULAR")}</span></Typography>
            </Grid>
          </Grid>
        </Box>

        {/* CREDITS & GRADE TABLE */}
        <Box sx={{ width: "100%", mb: 1.5 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", border: "1.5px solid #000" }}>
            <thead>
              <tr>
                <th rowSpan={2} style={{ ...thStyle, width: "16%" }}>PAPER CODE</th>
                <th rowSpan={2} style={{ ...thStyle, width: "48%", textAlign: "left", pl: 1 }}>NAME OF PAPER</th>
                <th colSpan={4} style={{ ...thStyle, width: "22%" }}>CREDITS</th>
                <th colSpan={2} style={{ ...thStyle, width: "14%" }}>GRADE</th>
              </tr>
              <tr>
                <th colSpan={2} style={thStyle}>ALLOTTED</th>
                <th colSpan={2} style={thStyle}>EARNED</th>
                <th style={{ ...thStyle, width: "7%" }}>T</th>
                <th style={{ ...thStyle, width: "7%" }}>P</th>
              </tr>
              <tr style={{ bgcolor: "#f3f4f6" }}>
                <th style={thStyle}></th>
                <th style={thStyle}></th>
                <th style={{ ...thStyle, width: "5.5%" }}>T</th>
                <th style={{ ...thStyle, width: "5.5%" }}>P</th>
                <th style={{ ...thStyle, width: "5.5%" }}>T</th>
                <th style={{ ...thStyle, width: "5.5%" }}>P</th>
                <th style={thStyle}></th>
                <th style={thStyle}></th>
              </tr>
            </thead>
            <tbody>
              {courses.map((c, i) => (
                <tr key={i}>
                  <td style={{ ...tdStyle, textAlign: "center", fontWeight: 700 }}>{fmt(c.papercode)}</td>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>{fmt(c.papername)}</td>
                  <td style={{ ...tdStyle, textAlign: "center" }}>{c.type === "T" ? fmt(c.creditsOff) : "-"}</td>
                  <td style={{ ...tdStyle, textAlign: "center" }}>{c.type === "P" ? fmt(c.creditsOff) : "-"}</td>
                  <td style={{ ...tdStyle, textAlign: "center" }}>{c.type === "T" ? fmt(c.creditsEarned) : "-"}</td>
                  <td style={{ ...tdStyle, textAlign: "center" }}>{c.type === "P" ? fmt(c.creditsEarned) : "-"}</td>
                  <td style={{ ...tdStyle, textAlign: "center", fontWeight: 800 }}>{c.type === "T" ? fmt(c.grade) : "-"}</td>
                  <td style={{ ...tdStyle, textAlign: "center", fontWeight: 800 }}>{c.type === "P" ? fmt(c.grade) : "-"}</td>
                </tr>
              ))}
              {/* SUMMARY ROW */}
              <tr style={{ bgcolor: "#f9fafb", fontWeight: 900 }}>
                <td colSpan={2} style={{ ...tdStyle, fontWeight: 900 }}>
                  RESULT : <span style={{ color: student.result === "FAIL" ? "#c00" : "#000" }}>{fmt(student.result || "PASS")}</span>
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; SGPA : {fmt(student.sgpa || "7.00")}
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; TOTAL
                </td>
                <td colSpan={2} style={{ ...tdStyle, textAlign: "center", fontWeight: 900 }}>{totalAllotted}</td>
                <td colSpan={2} style={{ ...tdStyle, textAlign: "center", fontWeight: 900 }}>{totalEarned}</td>
                <td colSpan={2} style={tdStyle}></td>
              </tr>
            </tbody>
          </table>
        </Box>

        {/* CONSOLIDATED SEMESTER TABLE */}
        <Box sx={{ width: "100%", mb: 2 }}>
          <Typography sx={{ fontSize: "8pt", fontWeight: 900, textAlign: "center", mb: 0.3 }}>CONSOLIDATED</Typography>
          <table style={{ width: "100%", borderCollapse: "collapse", border: "1.5px solid #000" }}>
            <thead>
              <tr style={{ bgcolor: "#f3f4f6" }}>
                <th style={{ ...thStyle, width: "16%" }}>SEMESTER</th>
                {["I", "II", "III", "IV", "V", "VI", "VII", "VIII"].map((s) => (
                  <th key={s} style={{ ...thStyle, width: "10.5%" }}>{s}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ ...tdStyle, fontWeight: 800, textAlign: "center" }}>EXAM</td>
                {semHistory.map((h, i) => (
                  <td key={i} style={{ ...tdStyle, textAlign: "center" }}>{fmt(h.exam)}</td>
                ))}
              </tr>
              <tr>
                <td style={{ ...tdStyle, fontWeight: 800, textAlign: "center" }}>RESULT / SGPA</td>
                {semHistory.map((h, i) => (
                  <td key={i} style={{ ...tdStyle, textAlign: "center", fontWeight: 700 }}>{fmt(h.result)}</td>
                ))}
              </tr>
              <tr style={{ bgcolor: "#f9fafb" }}>
                <td colSpan={3} style={{ ...tdStyle, fontWeight: 900 }}>CGPA : {fmt(student.cgpa || "-")}</td>
                <td colSpan={3} style={{ ...tdStyle, fontWeight: 900 }}>RESULT : {fmt(student.result || "-")}</td>
                <td colSpan={3} style={{ ...tdStyle, fontWeight: 900 }}>DIVISION : {fmt(student.division || "-")}</td>
              </tr>
            </tbody>
          </table>
        </Box>

        {/* SIGNATURES */}
        <Box sx={{ mt: "auto", pt: 1, display: "flex", justifyContent: "space-between", alignItems: "flex-end", fontSize: "8pt", fontWeight: 900 }}>
          <Box>
            <div>PREPARED BY : ____________________</div>
            <div style={{ marginTop: 8 }}>ISSUE DATE : <span style={{ fontWeight: 800 }}>{issueDate || new Date().toLocaleDateString("en-GB")}</span></div>
          </Box>
          <Box>
            <div>CHECKED BY : 1. ____________________</div>
            <div style={{ marginTop: 8, paddingLeft: 72 }}>2. ____________________</div>
          </Box>
          <Box sx={{ textAlign: "right" }}>
            <div>CONTROLLER OF EXAMINATIONS</div>
          </Box>
        </Box>
      </MarksheetSecurityFrame>
    </Box>
  );
}

// ==========================================
// 3. ANNUAL PROVISIONAL MARKSHEET (MBBS_III_PII_Main_Provisional...)
// ==========================================
export function AnnualProvisionalMarksheetPrint({
  student = {},
  institution = {},
  issueDate = ""
}) {
  const courses = student.courses || [];
  const grandTotal = student.grandTotal || {};
  const totalObt = Number(grandTotal.totalObtained || 1573);
  const totalMax = Number(grandTotal.totalMax || 2800);

  const thStyle = {
    border: "1px solid #000",
    padding: "2px 2px",
    fontSize: "6.8pt",
    fontWeight: 900,
    textAlign: "center",
    bgcolor: "#f3f4f6"
  };

  const tdStyle = {
    border: "1px solid #000",
    padding: "2px 3px",
    fontSize: "7.0pt",
    lineHeight: 1.15
  };

  const demoLabel = { fontSize: "7.5pt", fontWeight: 900, color: "#000" };
  const demoVal = { fontSize: "7.5pt", fontWeight: 700, color: "#000" };

  return (
    <Box className="marksheet-page marksheet-landscape" sx={{ width: "297mm", minHeight: "208mm", p: 1, bgcolor: "#fff", boxSizing: "border-box" }}>
      <MarksheetSecurityFrame isLandscape>
        <UniversityHeader
          logo={institution.logolink || institution.logo}
          subTitle="STATEMENT OF MARKS - PROVISIONAL"
          isLandscape
        />

        {/* DEMOGRAPHICS */}
        <Box sx={{ mb: 1, px: 0.5 }}>
          <Grid container spacing={0.5}>
            <Grid item xs={6}>
              <Typography sx={demoLabel}>Enrollment No : <span style={demoVal}>{fmt(student.enrolmentno || student.regno)}</span></Typography>
              <Typography sx={demoLabel}>Name : <span style={demoVal}>{fmt(student.name)}</span></Typography>
              <Typography sx={demoLabel}>Father Name: <span style={demoVal}>{fmt(student.fathername)}</span></Typography>
              <Typography sx={demoLabel}>Program : <span style={demoVal}>{fmt(student.program || "BACHELOR OF MEDICINE & BACHELOR OF SURGERY")}</span></Typography>
              <Typography sx={demoLabel}>Exam (Month & Year) : <span style={demoVal}>{fmt(student.exam || "MARCH-2026")}</span></Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography sx={demoLabel}>Year / Prof : <span style={demoVal}>{fmt(student.professional || "III PROF(P-II)")}</span></Typography>
              <Typography sx={demoLabel}>Status : <span style={demoVal}>{fmt(student.status || "REGULAR")}</span></Typography>
              <Typography sx={demoLabel}>Mother Name: <span style={demoVal}>{fmt(student.mothername)}</span></Typography>
            </Grid>
          </Grid>
        </Box>

        {/* TABLE */}
        <Box sx={{ width: "100%", mb: 1 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", border: "1.5px solid #000" }}>
            <thead>
              <tr>
                <th rowSpan={3} style={{ ...thStyle, width: "8%" }}>Paper Code</th>
                <th rowSpan={3} style={{ ...thStyle, width: "24%", textAlign: "left", pl: 0.5 }}>Paper Name</th>
                <th colSpan={8} style={thStyle}>MAXIMUM MARKS</th>
                <th colSpan={8} style={thStyle}>MARKS OBTAINED</th>
              </tr>
              <tr>
                <th colSpan={3} style={thStyle}>Theory</th>
                <th colSpan={3} style={thStyle}>Practical</th>
                <th colSpan={2} style={thStyle}>IA</th>
                <th rowSpan={2} style={{ ...thStyle, width: "5%" }}>Total with IA</th>
                <th colSpan={3} style={thStyle}>Theory</th>
                <th colSpan={3} style={thStyle}>Practical</th>
                <th colSpan={2} style={thStyle}>IA</th>
                <th rowSpan={2} style={{ ...thStyle, width: "5%" }}>Total with IA</th>
              </tr>
              <tr>
                <th style={{ ...thStyle, width: "3.5%" }}>P-I</th>
                <th style={{ ...thStyle, width: "3.5%" }}>P-II</th>
                <th style={{ ...thStyle, width: "4%" }}>TH Total</th>
                <th style={{ ...thStyle, width: "3.5%" }}>VV</th>
                <th style={{ ...thStyle, width: "3.5%" }}>PR</th>
                <th style={{ ...thStyle, width: "4%" }}>PR Total</th>
                <th style={{ ...thStyle, width: "3.2%" }}>TH</th>
                <th style={{ ...thStyle, width: "3.2%" }}>PR</th>

                <th style={{ ...thStyle, width: "3.5%" }}>P-I</th>
                <th style={{ ...thStyle, width: "3.5%" }}>P-II</th>
                <th style={{ ...thStyle, width: "4%" }}>TH Total</th>
                <th style={{ ...thStyle, width: "3.5%" }}>VV</th>
                <th style={{ ...thStyle, width: "3.5%" }}>PR</th>
                <th style={{ ...thStyle, width: "4%" }}>PR Total</th>
                <th style={{ ...thStyle, width: "3.2%" }}>TH</th>
                <th style={{ ...thStyle, width: "3.2%" }}>PR</th>
              </tr>
            </thead>
            <tbody>
              {courses.map((c, idx) => (
                <tr key={idx}>
                  <td style={{ ...tdStyle, textAlign: "center", fontWeight: 700 }}>{fmt(c.papercode)}</td>
                  <td style={{ ...tdStyle, fontWeight: 700 }}>{fmt(c.papername)}</td>
                  {/* MAX */}
                  <td style={{ ...tdStyle, textAlign: "center" }}>{fmt(c.theoryPI_Max || 100)}</td>
                  <td style={{ ...tdStyle, textAlign: "center" }}>{fmt(c.theoryPII_Max || (c.papercode?.includes("1308") ? "-" : 100))}</td>
                  <td style={{ ...tdStyle, textAlign: "center", fontWeight: 700 }}>{fmt(c.theoryTotal_Max || 200)}</td>
                  <td style={{ ...tdStyle, textAlign: "center" }}>{fmt(c.practicalVV_Max || 40)}</td>
                  <td style={{ ...tdStyle, textAlign: "center" }}>{fmt(c.practicalPR_Max || 160)}</td>
                  <td style={{ ...tdStyle, textAlign: "center", fontWeight: 700 }}>{fmt(c.practicalTotal_Max || 200)}</td>
                  <td style={{ ...tdStyle, textAlign: "center" }}>{fmt(c.iaTH_Max || 200)}</td>
                  <td style={{ ...tdStyle, textAlign: "center" }}>{fmt(c.iaPR_Max || 200)}</td>
                  <td style={{ ...tdStyle, textAlign: "center", fontWeight: 800 }}>{fmt(c.totalWithIA_Max || 800)}</td>
                  {/* OBT */}
                  <td style={{ ...tdStyle, textAlign: "center" }}>{fmt(c.theoryPI_Obt || "-")}</td>
                  <td style={{ ...tdStyle, textAlign: "center" }}>{fmt(c.theoryPII_Obt || "-")}</td>
                  <td style={{ ...tdStyle, textAlign: "center", fontWeight: 700 }}>{fmt(c.theoryTotal_Obt || "-")}</td>
                  <td style={{ ...tdStyle, textAlign: "center" }}>{fmt(c.practicalVV_Obt || "-")}</td>
                  <td style={{ ...tdStyle, textAlign: "center" }}>{fmt(c.practicalPR_Obt || "-")}</td>
                  <td style={{ ...tdStyle, textAlign: "center", fontWeight: 700 }}>{fmt(c.practicalTotal_Obt || "-")}</td>
                  <td style={{ ...tdStyle, textAlign: "center" }}>{fmt(c.iaTH_Obt || "-")}</td>
                  <td style={{ ...tdStyle, textAlign: "center" }}>{fmt(c.iaPR_Obt || "-")}</td>
                  <td style={{ ...tdStyle, textAlign: "center", fontWeight: 800 }}>{fmt(c.totalWithIA_Obt || "-")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Box>

        {/* SUMMARY & IN WORDS */}
        <Box sx={{ width: "100%", mb: 1, border: "1.5px solid #000", p: 0.8, bgcolor: "#fff" }}>
          <Grid container spacing={1}>
            <Grid item xs={4}>
              <Typography sx={demoLabel}>RESULT : <span style={{ fontWeight: 950, color: student.result === "FAIL" ? "#c00" : "#000" }}>{fmt(student.result || "PASS")}</span></Typography>
            </Grid>
            <Grid item xs={4}>
              <Typography sx={demoLabel}>PERCENTAGE : <span style={demoVal}>{fmt(student.overallPercentage || "58.64")}</span></Typography>
            </Grid>
            <Grid item xs={4}>
              <Typography sx={demoLabel}>TOTAL : <span style={demoVal}>{totalObt}/{totalMax}</span></Typography>
            </Grid>
            <Grid item xs={12} sx={{ mt: 0.5 }}>
              <Typography sx={demoLabel}>TOTAL IN WORD : <span style={{ ...demoVal, textDecoration: "underline" }}>{numberToWords(totalObt)}.</span></Typography>
            </Grid>
          </Grid>
        </Box>

        {/* SIGNATURES */}
        <Box sx={{ mt: "auto", pt: 1, display: "flex", justifyContent: "space-between", alignItems: "flex-end", fontSize: "7.5pt", fontWeight: 900 }}>
          <Box>
            <div>PREPARED BY : ____________________</div>
            <div style={{ marginTop: 6 }}>DATE : <span style={{ fontWeight: 800 }}>{issueDate || new Date().toLocaleDateString("en-GB")}</span></div>
          </Box>
          <Box>
            <div>CHECKED BY : ____________________</div>
          </Box>
          <Box sx={{ textAlign: "right" }}>
            <div>CONTROLLER OF EXAMINATIONS</div>
          </Box>
        </Box>
      </MarksheetSecurityFrame>
    </Box>
  );
}

// ==========================================
// 4. SEMESTER MAIN MARKSHEET (SEM_B474_0360... FRONT + BACK)
// ==========================================
export function SemesterMainMarksheetPrint({
  student = {},
  institution = {},
  qr = "",
  issueDate = "",
  marksheetNo = ""
}) {
  const courses = student.courses || [];
  const semHistory = student.semHistory || [
    { sem: "I", exam: "FEB-2025", result: "PASS/7.03" },
    { sem: "II", exam: "FEB-2025", result: "PASS/6.00" },
    { sem: "III", exam: "JUL-2025", result: "PASS/6.65" },
    { sem: "IV", exam: "JAN-2026", result: "PASS/6.46" },
    { sem: "V", exam: "-", result: "-" },
    { sem: "VI", exam: "-", result: "-" },
    { sem: "VII", exam: "-", result: "-" },
    { sem: "VIII", exam: "-", result: "-" }
  ];

  const totalAllotted = courses.reduce((s, c) => s + (Number(c.creditsOff) || 0), 0) || 26;
  const totalEarned = courses.reduce((s, c) => s + (Number(c.creditsEarned) || 0), 0) || 26;

  const thStyle = {
    border: "1px solid #000",
    padding: "3px 4px",
    fontSize: "7.5pt",
    fontWeight: 900,
    textAlign: "center",
    bgcolor: "#f9fafb"
  };

  const tdStyle = {
    border: "1px solid #000",
    padding: "3px 5px",
    fontSize: "7.8pt",
    lineHeight: 1.2
  };

  const demoLabel = { fontSize: "8pt", fontWeight: 900, color: "#000" };
  const demoVal = { fontSize: "8pt", fontWeight: 700, color: "#000" };

  return (
    <Box className="semester-main-sheet-wrapper">
      {/* ================= PAGE 1 (FRONT) ================= */}
      <Box className="marksheet-page marksheet-portrait marksheet-page-front" sx={{ width: "210mm", minHeight: "292mm", p: 1, bgcolor: "#fff", boxSizing: "border-box" }}>
        <MarksheetSecurityFrame isLandscape={false}>
          <UniversityHeader
            logo={institution.logolink || institution.logo}
            qr={qr}
            photo={student.photo}
            marksheetNo={marksheetNo || student.marksheetNo || "PUBH26582985Y05M"}
            subTitle="STATEMENT OF MARKS"
            isLandscape={false}
          />

          {/* DEMOGRAPHICS */}
          <Box sx={{ mb: 1.2, px: 0.5 }}>
            <Grid container spacing={0.8}>
              <Grid item xs={6}>
                <Typography sx={demoLabel}>ENROLLMENT NO. : <span style={demoVal}>{fmt(student.enrolmentno || student.regno)}</span></Typography>
                <Typography sx={demoLabel}>NAME : <span style={demoVal}>{fmt(student.name)}</span></Typography>
                <Typography sx={demoLabel}>FATHER'S NAME : <span style={demoVal}>{fmt(student.fathername)}</span></Typography>
                <Typography sx={demoLabel}>MOTHER'S NAME : <span style={demoVal}>{fmt(student.mothername)}</span></Typography>
                <Typography sx={demoLabel}>INST. / FACULTY : <span style={demoVal}>{fmt(student.institute || institution.name || "SCHOOL OF RESEARCH & TECHNOLOGY, BHOPAL")}</span></Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography sx={demoLabel}>PROGRAM : <span style={demoVal}>{fmt(student.program || "DIPLOMA IN ENGINEERING")}</span></Typography>
                <Typography sx={demoLabel}>BRANCH / SPL. : <span style={demoVal}>{fmt(student.branchname || "COMPUTER SCIENCE ENGINEERING")}</span></Typography>
                <Typography sx={demoLabel}>SEMESTER : <span style={demoVal}>{fmt(student.semester || "FIFTH")}</span></Typography>
                <Typography sx={demoLabel}>EXAMINATION : <span style={demoVal}>{fmt(student.exam || "MAY-2026")}</span></Typography>
                <Typography sx={demoLabel}>STATUS : <span style={demoVal}>{fmt(student.status || "REGULAR")}</span></Typography>
              </Grid>
            </Grid>
          </Box>

          {/* TABLE */}
          <Box sx={{ width: "100%", mb: 1.2 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", border: "1.5px solid #000" }}>
              <thead>
                <tr>
                  <th rowSpan={2} style={{ ...thStyle, width: "16%" }}>PAPER CODE</th>
                  <th rowSpan={2} style={{ ...thStyle, width: "48%", textAlign: "left", pl: 1 }}>NAME OF PAPER</th>
                  <th colSpan={4} style={{ ...thStyle, width: "22%" }}>CREDITS</th>
                  <th colSpan={2} style={{ ...thStyle, width: "14%" }}>GRADE</th>
                </tr>
                <tr>
                  <th colSpan={2} style={thStyle}>ALLOTED</th>
                  <th colSpan={2} style={thStyle}>EARNED</th>
                  <th style={{ ...thStyle, width: "7%" }}>T</th>
                  <th style={{ ...thStyle, width: "7%" }}>P</th>
                </tr>
                <tr style={{ bgcolor: "#f3f4f6" }}>
                  <th style={thStyle}></th>
                  <th style={thStyle}></th>
                  <th style={{ ...thStyle, width: "5.5%" }}>T</th>
                  <th style={{ ...thStyle, width: "5.5%" }}>P</th>
                  <th style={{ ...thStyle, width: "5.5%" }}>T</th>
                  <th style={{ ...thStyle, width: "5.5%" }}>P</th>
                  <th style={thStyle}></th>
                  <th style={thStyle}></th>
                </tr>
              </thead>
              <tbody>
                {courses.map((c, i) => (
                  <tr key={i}>
                    <td style={{ ...tdStyle, textAlign: "center", fontWeight: 700 }}>{fmt(c.papercode)}</td>
                    <td style={{ ...tdStyle, fontWeight: 600 }}>{fmt(c.papername)}</td>
                    <td style={{ ...tdStyle, textAlign: "center" }}>{c.type === "T" ? fmt(c.creditsOff) : "-"}</td>
                    <td style={{ ...tdStyle, textAlign: "center" }}>{c.type === "P" ? fmt(c.creditsOff) : "-"}</td>
                    <td style={{ ...tdStyle, textAlign: "center" }}>{c.type === "T" ? fmt(c.creditsEarned) : "-"}</td>
                    <td style={{ ...tdStyle, textAlign: "center" }}>{c.type === "P" ? fmt(c.creditsEarned) : "-"}</td>
                    <td style={{ ...tdStyle, textAlign: "center", fontWeight: 800 }}>{c.type === "T" ? fmt(c.grade) : "-"}</td>
                    <td style={{ ...tdStyle, textAlign: "center", fontWeight: 800 }}>{c.type === "P" ? fmt(c.grade) : "-"}</td>
                  </tr>
                ))}
                <tr>
                  <td colSpan={8} style={{ ...tdStyle, textAlign: "center", fontStyle: "italic", fontWeight: 700 }}>
                    ***End of Statement***
                  </td>
                </tr>
                {/* SUMMARY ROW */}
                <tr style={{ bgcolor: "#f9fafb", fontWeight: 900 }}>
                  <td colSpan={2} style={{ ...tdStyle, fontWeight: 900 }}>
                    RESULT : <span style={{ color: student.result === "FAIL" ? "#c00" : "#000" }}>{fmt(student.result || "PASS")}</span>
                    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; SGPA : {fmt(student.sgpa || "7.00")}
                    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; TOTAL
                  </td>
                  <td colSpan={2} style={{ ...tdStyle, textAlign: "center", fontWeight: 900 }}>{totalAllotted}</td>
                  <td colSpan={2} style={{ ...tdStyle, textAlign: "center", fontWeight: 900 }}>{totalEarned}</td>
                  <td colSpan={2} style={tdStyle}></td>
                </tr>
              </tbody>
            </table>
          </Box>

          {/* CONSOLIDATED */}
          <Box sx={{ width: "100%", mb: 1.5 }}>
            <Typography sx={{ fontSize: "8pt", fontWeight: 900, textAlign: "center", mb: 0.2 }}>CONSOLIDATED</Typography>
            <table style={{ width: "100%", borderCollapse: "collapse", border: "1.5px solid #000" }}>
              <thead>
                <tr style={{ bgcolor: "#f3f4f6" }}>
                  <th style={{ ...thStyle, width: "16%" }}>SEMESTER</th>
                  {["I", "II", "III", "IV", "V", "VI", "VII", "VIII"].map((s) => (
                    <th key={s} style={{ ...thStyle, width: "10.5%" }}>{s}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ ...tdStyle, fontWeight: 800, textAlign: "center" }}>EXAM</td>
                  {semHistory.map((h, i) => (
                    <td key={i} style={{ ...tdStyle, textAlign: "center" }}>{fmt(h.exam)}</td>
                  ))}
                </tr>
                <tr>
                  <td style={{ ...tdStyle, fontWeight: 800, textAlign: "center" }}>RESULT/SGPA</td>
                  {semHistory.map((h, i) => (
                    <td key={i} style={{ ...tdStyle, textAlign: "center", fontWeight: 700 }}>{fmt(h.result)}</td>
                  ))}
                </tr>
                <tr style={{ bgcolor: "#f9fafb" }}>
                  <td colSpan={3} style={{ ...tdStyle, fontWeight: 900 }}>CGPA : {fmt(student.cgpa || "-")}</td>
                  <td colSpan={3} style={{ ...tdStyle, fontWeight: 900 }}>RESULT : {fmt(student.result || "-")}</td>
                  <td colSpan={3} style={{ ...tdStyle, fontWeight: 900 }}>DIVISION : {fmt(student.division || "-")}</td>
                </tr>
              </tbody>
            </table>
          </Box>

          {/* SIGNATURES */}
          <Box sx={{ mt: "auto", pt: 1, display: "flex", justifyContent: "space-between", alignItems: "flex-end", fontSize: "8pt", fontWeight: 900 }}>
            <Box>
              <div>PREPARED BY : ____________________</div>
              <div style={{ marginTop: 6 }}>ISSUE DATE : <span style={{ fontWeight: 800 }}>{issueDate || new Date().toLocaleDateString("en-GB")}</span></div>
            </Box>
            <Box>
              <div>CHECKED BY : 1. ____________________</div>
              <div style={{ marginTop: 6, paddingLeft: 72 }}>2. ____________________</div>
            </Box>
            <Box sx={{ textAlign: "right" }}>
              <div>CONTROLLER OF EXAMINATIONS</div>
            </Box>
          </Box>
        </MarksheetSecurityFrame>
      </Box>

      {/* ================= PAGE 2 (BACK: PARAMETERS APPLICABLE) ================= */}
      <Box className="marksheet-page marksheet-portrait marksheet-page-back" sx={{ width: "210mm", minHeight: "292mm", p: "12mm 15mm", bgcolor: "#fff", boxSizing: "border-box", color: "#000", border: "1px solid #ccc", mt: { xs: 2, md: 3 } }}>
        <Typography sx={{ textAlign: "center", fontSize: "14pt", fontWeight: 900, textDecoration: "underline", mb: 2 }}>
          Parameters Applicable
        </Typography>

        <Box sx={{ fontSize: "8.5pt", lineHeight: 1.45, mb: 1.5 }}>
          <Typography sx={{ fontSize: "8.5pt", mb: 0.8, fontStyle: "italic" }}>
            1. In case of any error in the Gradesheet, please refer it back to the Controller of Examinations, People's University within 10 days along with the original Gradesheet, from the issue date of gradesheet.
          </Typography>
          <Typography sx={{ fontSize: "8.5pt", mb: 0.8, fontStyle: "italic" }}>
            2. Revaluation shall be allowed in Theory papers only.
          </Typography>
          <Typography sx={{ fontSize: "8.5pt", mb: 0.3, fontStyle: "italic" }}>
            3. (#) Indicates Pass by Grace in the subject/paper.<br />
            (&gt;&gt;) Indicates Carried forward.<br />
            (Ø) Indicates Cancelled under Unfair Means (UFM).<br />
            (F) Indicates Fail in the subject/paper.
          </Typography>
        </Box>

        <Typography sx={{ fontSize: "8.5pt", fontWeight: 700, mb: 0.5, fontStyle: "italic" }}>
          4. Grade and their numeric equivalent :
        </Typography>

        {/* GRADE TABLE */}
        <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #555", fontSize: "7.8pt", marginBottom: 8 }}>
          <thead>
            <tr style={{ bgcolor: "#f9fafb" }}>
              <th style={{ border: "1px solid #555", padding: "4px 6px", width: "9%", textAlign: "center" }}>Grade</th>
              <th style={{ border: "1px solid #555", padding: "4px 6px", width: "11%", textAlign: "center" }}>%Marks</th>
              <th style={{ border: "1px solid #555", padding: "4px 6px", width: "10%", textAlign: "center" }}>*Grade Point</th>
              <th style={{ border: "1px solid #555", padding: "4px 6px", width: "16%", textAlign: "center" }}>Description of Performance</th>
              <th style={{ border: "1px solid #555", padding: "4px 6px", width: "54%", textAlign: "center" }}>Remark</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ border: "1px solid #555", padding: "3px 6px", textAlign: "center", fontWeight: 800 }}>A<sup>+</sup></td>
              <td style={{ border: "1px solid #555", padding: "3px 6px", textAlign: "center" }}>91-100</td>
              <td style={{ border: "1px solid #555", padding: "3px 6px", textAlign: "center" }}>10</td>
              <td style={{ border: "1px solid #555", padding: "3px 6px", textAlign: "center" }}>Outstanding</td>
              <td style={{ border: "1px solid #555", padding: "3px 6px" }}>M.Tech, M.Pharm, MBA, MBA{`{HA}`}, MHM, M.Sc, M.Stat., B.Tech, B.Sc, B.Sc{`{H}`}, BHMCT, B.Pharm, BHM, BBA, BA, BA{`{H}`}, B.Com, B.Com{`{H}`}, B.Com{`{A/F}`}, DE</td>
            </tr>
            <tr>
              <td style={{ border: "1px solid #555", padding: "3px 6px", textAlign: "center", fontWeight: 800 }}>A</td>
              <td style={{ border: "1px solid #555", padding: "3px 6px", textAlign: "center" }}>81-90</td>
              <td style={{ border: "1px solid #555", padding: "3px 6px", textAlign: "center" }}>9</td>
              <td style={{ border: "1px solid #555", padding: "3px 6px", textAlign: "center" }}>Excellent</td>
              <td style={{ border: "1px solid #555", padding: "3px 6px", textAlign: "center" }}>-do-</td>
            </tr>
            <tr>
              <td style={{ border: "1px solid #555", padding: "3px 6px", textAlign: "center", fontWeight: 800 }}>B<sup>+</sup></td>
              <td style={{ border: "1px solid #555", padding: "3px 6px", textAlign: "center" }}>71-80</td>
              <td style={{ border: "1px solid #555", padding: "3px 6px", textAlign: "center" }}>8</td>
              <td style={{ border: "1px solid #555", padding: "3px 6px", textAlign: "center" }}>Very Good</td>
              <td style={{ border: "1px solid #555", padding: "3px 6px", textAlign: "center" }}>-do-</td>
            </tr>
            <tr>
              <td style={{ border: "1px solid #555", padding: "3px 6px", textAlign: "center", fontWeight: 800 }}>B</td>
              <td style={{ border: "1px solid #555", padding: "3px 6px", textAlign: "center" }}>61-70</td>
              <td style={{ border: "1px solid #555", padding: "3px 6px", textAlign: "center" }}>7</td>
              <td style={{ border: "1px solid #555", padding: "3px 6px", textAlign: "center" }}>Good</td>
              <td style={{ border: "1px solid #555", padding: "3px 6px", textAlign: "center" }}>-do-</td>
            </tr>
            <tr>
              <td style={{ border: "1px solid #555", padding: "3px 6px", textAlign: "center", fontWeight: 800 }}>C<sup>+</sup></td>
              <td style={{ border: "1px solid #555", padding: "3px 6px", textAlign: "center" }}>51-60</td>
              <td style={{ border: "1px solid #555", padding: "3px 6px", textAlign: "center" }}>6</td>
              <td style={{ border: "1px solid #555", padding: "3px 6px", textAlign: "center" }}>Average</td>
              <td style={{ border: "1px solid #555", padding: "3px 6px", textAlign: "center" }}>-do-</td>
            </tr>
            <tr>
              <td rowSpan={2} style={{ border: "1px solid #555", padding: "3px 6px", textAlign: "center", fontWeight: 800 }}>C</td>
              <td rowSpan={2} style={{ border: "1px solid #555", padding: "3px 6px", textAlign: "center" }}>41-50</td>
              <td rowSpan={2} style={{ border: "1px solid #555", padding: "3px 6px", textAlign: "center" }}>5</td>
              <td style={{ border: "1px solid #555", padding: "3px 6px", textAlign: "center" }}>Satisfactory</td>
              <td style={{ border: "1px solid #555", padding: "3px 6px" }}>M.Pharm, MBA, MBA{`{HA}`}, MHM, M.Sc, M.Stat., B.Tech, B.Sc, B.Sc{`{H}`}, B.Pharm, BHM, BBA, BA, BA{`{H}`}, B.Com, B.Com{`{H}`}, B.Com{`{A/F}`}</td>
            </tr>
            <tr>
              <td style={{ border: "1px solid #555", padding: "3px 6px", textAlign: "center" }}>Marginal</td>
              <td style={{ border: "1px solid #555", padding: "3px 6px" }}>M.Tech, DE</td>
            </tr>
            <tr>
              <td style={{ border: "1px solid #555", padding: "3px 6px", textAlign: "center", fontWeight: 800 }}>D</td>
              <td style={{ border: "1px solid #555", padding: "3px 6px", textAlign: "center" }}>35-40</td>
              <td style={{ border: "1px solid #555", padding: "3px 6px", textAlign: "center" }}>4</td>
              <td style={{ border: "1px solid #555", padding: "3px 6px", textAlign: "center" }}>Pass</td>
              <td style={{ border: "1px solid #555", padding: "3px 6px" }}>MBA, MBA{`{HA}`}, MHM, BHM, B.Com, B.Com{`{H}`}, B.Com{`{A/F}`}</td>
            </tr>
            <tr>
              <td style={{ border: "1px solid #555", padding: "3px 6px", textAlign: "center", fontWeight: 800 }}>D</td>
              <td style={{ border: "1px solid #555", padding: "3px 6px", textAlign: "center" }}>40 Only</td>
              <td style={{ border: "1px solid #555", padding: "3px 6px", textAlign: "center" }}>4</td>
              <td style={{ border: "1px solid #555", padding: "3px 6px", textAlign: "center" }}>Pass</td>
              <td style={{ border: "1px solid #555", padding: "3px 6px" }}>M.Tech, M.Pharm, M.Sc, M.Stat., B.Tech, B.Sc, B.Sc{`{H}`}, BHMCT, B.Pharm, BA, BA{`{H}`}, DE</td>
            </tr>
            <tr>
              <td style={{ border: "1px solid #555", padding: "3px 6px", textAlign: "center", fontWeight: 800 }}>F</td>
              <td style={{ border: "1px solid #555", padding: "3px 6px", textAlign: "center" }}>Below 40</td>
              <td style={{ border: "1px solid #555", padding: "3px 6px", textAlign: "center" }}>0</td>
              <td style={{ border: "1px solid #555", padding: "3px 6px", textAlign: "center" }}>Fail</td>
              <td style={{ border: "1px solid #555", padding: "3px 6px" }}>M.Tech, M.Pharm, M.Sc, M.Stat., B.Tech, B.Sc, B.Sc{`{H}`}, BHMCT, B.Pharm, BA, BA{`{H}`}, DE</td>
            </tr>
            <tr>
              <td style={{ border: "1px solid #555", padding: "3px 6px", textAlign: "center", fontWeight: 800 }}>F</td>
              <td style={{ border: "1px solid #555", padding: "3px 6px", textAlign: "center" }}>Below 35</td>
              <td style={{ border: "1px solid #555", padding: "3px 6px", textAlign: "center" }}>0</td>
              <td style={{ border: "1px solid #555", padding: "3px 6px", textAlign: "center" }}>Fail</td>
              <td style={{ border: "1px solid #555", padding: "3px 6px" }}>MBA, MBA{`{HA}`}, MHM, BHM, B.Com, B.Com{`{H}`}, B.Com{`{A/F}`}</td>
            </tr>
            <tr>
              <td style={{ border: "1px solid #555", padding: "3px 6px", textAlign: "center", fontWeight: 800 }}>W</td>
              <td style={{ border: "1px solid #555", padding: "3px 6px", textAlign: "center" }}>-</td>
              <td style={{ border: "1px solid #555", padding: "3px 6px", textAlign: "center" }}>0</td>
              <td style={{ border: "1px solid #555", padding: "3px 6px", textAlign: "center" }}>Withheld</td>
              <td style={{ border: "1px solid #555", padding: "3px 6px" }}>B.Tech, DE</td>
            </tr>
          </tbody>
        </table>
        <Typography sx={{ fontSize: "7.2pt", fontStyle: "italic", mb: 2 }}>
          *Based on absolute marking system rounded to nearest integer.
        </Typography>

        {/* FORMULAS */}
        <Box sx={{ fontSize: "8.2pt", lineHeight: 1.4 }}>
          <Typography sx={{ fontSize: "8.2pt", fontStyle: "italic", mb: 0.5 }}>
            5. The Semester Grade Point Average (SGPA) is calculated as under:-
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 3, my: 1, pl: 2 }}>
            <Box sx={{ display: "inline-flex", alignItems: "center", gap: 1, fontStyle: "italic" }}>
              <span>SGPA =</span>
              <Box sx={{ display: "inline-flex", flexDirection: "column", alignItems: "center" }}>
                <span style={{ borderBottom: "1px solid #000", paddingBottom: 2 }}>&sum;<sub>i=1</sub><sup>n</sup> C<sub>i</sub>P<sub>i</sub></span>
                <span>&sum;<sub>i=1</sub><sup>n</sup> C<sub>i</sub></span>
              </Box>
            </Box>
            <Typography sx={{ fontSize: "7.8pt", fontStyle: "italic" }}>
              Where Ci is the number of credits offered in the ith subject of a Semester for which SGPA is to be calculated, Pi is the corresponding grade earned in the ith subject and n is number of subject in the semester.
            </Typography>
          </Box>

          <Typography sx={{ fontSize: "8.2pt", fontStyle: "italic", mt: 1.5, mb: 0.5 }}>
            6. The Cumulative Grade Point Average (CGPA) is calculated as under:
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 3, my: 1, pl: 2 }}>
            <Box sx={{ display: "inline-flex", alignItems: "center", gap: 1, fontStyle: "italic" }}>
              <span>CGPA =</span>
              <Box sx={{ display: "inline-flex", flexDirection: "column", alignItems: "center" }}>
                <span style={{ borderBottom: "1px solid #000", paddingBottom: 2 }}>&sum;<sub>j=1</sub><sup>m</sup> SG<sub>j</sub>NC<sub>j</sub></span>
                <span>&sum;<sub>j=1</sub><sup>m</sup> NC<sub>j</sub></span>
              </Box>
            </Box>
            <Typography sx={{ fontSize: "7.8pt", fontStyle: "italic" }}>
              Where SGj is SGPA earned in the jth semester, NCj is total credit allotted to the jth semester and m is the number of semester till which CGPA is calculated.
            </Typography>
          </Box>

          <Typography sx={{ fontSize: "8.2pt", fontStyle: "italic", mt: 1.5, mb: 0.5 }}>
            7. The conversion from CGPA to equivalent percentage is calculated as under :
          </Typography>
          <Typography sx={{ fontSize: "8.2pt", fontStyle: "italic", pl: 2, fontWeight: 700 }}>
            Equivalent percentage marks = CGPA obtained x 10.
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

// ==========================================
// UNIFIED PRINT DISPATCHER
// ==========================================
export function printMarksheetDoc(elementId, isLandscape = false) {
  const container = document.getElementById(elementId);
  if (!container) {
    window.print();
    return;
  }

  const iframeId = "marksheet-print-iframe";
  let iframe = document.getElementById(iframeId);
  if (iframe) iframe.remove();

  iframe = document.createElement("iframe");
  iframe.id = iframeId;
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow.document;
  doc.open();

  doc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Marksheet</title>
        <style>
          @page {
            size: ${isLandscape ? "A4 landscape" : "A4 portrait"};
            margin: ${isLandscape ? "3mm 4mm" : "4mm 5mm"};
          }
          * {
            box-sizing: border-box !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            font-family: Arial, Helvetica, "Segoe UI", sans-serif;
            color: #000 !important;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
            width: 100% !important;
            max-width: 100% !important;
          }
          .marksheet-page {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 auto !important;
            box-sizing: border-box !important;
            page-break-before: always !important;
            break-before: page !important;
            page-break-after: avoid !important;
            break-after: avoid !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            background: #fff !important;
          }
          .marksheet-page:first-of-type {
            page-break-before: avoid !important;
            break-before: avoid !important;
          }
          .marksheet-page-front {
            page-break-after: always !important;
            break-after: page !important;
          }
          .marksheet-page-back {
            page-break-before: always !important;
            break-before: page !important;
            page-break-after: avoid !important;
            break-after: avoid !important;
          }
          table {
            border-collapse: collapse !important;
            width: 100% !important;
          }
          th, td {
            box-sizing: border-box !important;
          }
          .screen-only {
            display: none !important;
          }
        </style>
      </head>
      <body>
        ${container.innerHTML}
      </body>
    </html>
  `);
  doc.close();

  setTimeout(() => {
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
  }, 350);
}

// ==========================================
// UNIFIED MARKSHEET GENERATOR PAGE BASE
// ==========================================
export function ExaminationModelMarksheetPageBase({ isMain = false, modelNumber = 3 }) {
  const modelPrefix = `examination-model${modelNumber}`;
  const pageTitle = isMain ? "Main Marksheet" : "Provisional Marksheet";
  const pageSubtitle = isMain
    ? "Generate official university main marksheets with Annual (MBBS consolidated) and Semester (2-Page Front+Back) layouts."
    : "Generate official provisional marksheets for Annual (MBBS breakdown) and Semester programs.";

  const [options, setOptions] = useState({});
  const [filters, setFilters] = useState({
    academicyear: "2026-27",
    regulation: "",
    exam: "",
    examcode: "",
    program: "",
    programcode: "",
    semester: ""
  });
  const [formatType, setFormatType] = useState("auto"); // "auto" | "semester" | "annual"
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedStudentIdx, setSelectedStudentIdx] = useState(0);
  const [issueDate, setIssueDate] = useState(() => {
    const d = new Date();
    return `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;
  });
  const [marksheetNo, setMarksheetNo] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [zoom, setZoom] = useState(0.9);
  const workspaceRef = useRef(null);

  // Load cascading filter options
  useEffect(() => {
    const loadOpts = async () => {
      try {
        const res = await ep1.get(`/api/v2/${modelPrefix}/options`, { params: { colid: global1.colid } });
        const opts = res.data?.options || {};
        const progs = res.data?.programs || [];
        const examList = res.data?.examList || [];
        setOptions({
          ...opts,
          programs: progs,
          examList,
          academicyear: uniqueSorted(["2026-27", ...(opts.academicyear || [])]),
          program: uniqueSorted([...(opts.program || []), ...progs.map((p) => p.program)]),
          programcode: uniqueSorted([...(opts.programcode || []), ...progs.map((p) => p.programcode)])
        });
      } catch (_) {}
    };
    loadOpts();
  }, [modelPrefix]);

  const academicYearChoices = useMemo(() => {
    return uniqueSorted([
      "2026-27",
      ...(options.academicyear || []),
      "2025-26",
      "2024-25"
    ]);
  }, [options.academicyear]);

  const programChoices = useMemo(() => {
    const map = new Map();
    (options.programs || []).forEach((p) => {
      if (p.programcode) {
        map.set(p.programcode, p.program || p.name || p.programcode);
      }
    });
    (options.programcode || []).forEach((code, idx) => {
      if (!map.has(code)) {
        map.set(code, options.program?.[idx] || code);
      }
    });
    return Array.from(map.entries()).map(([code, name]) => ({ code, name }));
  }, [options.programs, options.programcode, options.program]);

  const semesterChoices = useMemo(() => {
    const defaults = [
      "1", "2", "3", "4", "5", "6", "7", "8",
      "SEM I", "SEM II", "SEM III", "SEM IV", "SEM V", "SEM VI", "SEM VII", "SEM VIII",
      "I SEM", "II SEM", "III SEM", "IV SEM", "V SEM", "VI SEM", "VII SEM", "VIII SEM",
      "I PROF", "II PROF", "III PROF(P-I)", "III PROF(P-II)", "IV PROF"
    ];
    return uniqueSorted([
      ...(options.semester || []),
      ...defaults,
      ...(filters.semester ? [filters.semester] : [])
    ]);
  }, [options.semester, filters.semester]);

  const examChoices = useMemo(() => {
    const map = new Map();
    (options.examList || []).forEach((item) => {
      const code = item.examcode || item.exam;
      if (code) {
        map.set(code, {
          examcode: code,
          exam: item.exam || item.examcode,
          label: item.exam && item.exam !== code ? `${item.exam} (${code})` : (item.exam || code)
        });
      }
    });
    (options.examcode || []).forEach((code, idx) => {
      if (!map.has(code)) {
        const examName = options.exam?.[idx] || code;
        map.set(code, {
          examcode: code,
          exam: examName,
          label: examName && examName !== code ? `${examName} (${code})` : code
        });
      }
    });
    (options.exam || []).forEach((ex) => {
      if (!map.has(ex)) {
        map.set(ex, {
          examcode: ex,
          exam: ex,
          label: ex
        });
      }
    });
    if (map.size === 0) {
      const fallbackExams = [
        { examcode: "EXAM-JUNE-2026", exam: "JUNE-2026" },
        { examcode: "EXAM-Feb-26", exam: "Feb-26" },
        { examcode: "EXAM-Jan-26", exam: "Jan-26" },
        { examcode: "EXAM-Aug-25", exam: "Aug-25" },
        { examcode: "EXAM-Feb-25", exam: "Feb-25" },
        { examcode: "MBBS-PROF1-2026", exam: "Theory Examination, SEPTEMBER-2026" },
        { examcode: "MAY-2026", exam: "MAY-2026" }
      ];
      fallbackExams.forEach((f) => {
        map.set(f.examcode, {
          examcode: f.examcode,
          exam: f.exam,
          label: `${f.exam} (${f.examcode})`
        });
      });
    }
    if (filters.examcode && !map.has(filters.examcode)) {
      map.set(filters.examcode, {
        examcode: filters.examcode,
        exam: filters.exam || filters.examcode,
        label: filters.exam && filters.exam !== filters.examcode ? `${filters.exam} (${filters.examcode})` : filters.examcode
      });
    }
    return Array.from(map.values());
  }, [options.examList, options.examcode, options.exam, filters.examcode, filters.exam]);

  const students = report?.students || [];
  const currentStudent = students[selectedStudentIdx] || null;

  // Auto-detect Annual vs Semester
  const isAnnualResolved = useMemo(() => {
    if (formatType === "annual") return true;
    if (formatType === "semester") return false;
    // Auto detection
    const progText = `${filters.program} ${filters.programcode} ${currentStudent?.program || ""}`.toUpperCase();
    const semText = `${filters.semester} ${currentStudent?.semester || ""}`.toUpperCase();
    if (progText.includes("MBBS") || progText.includes("MEDICINE") || progText.includes("SURGERY") || semText.includes("PROF") || progText.includes("PROF")) {
      return true;
    }
    return false;
  }, [formatType, filters, currentStudent]);

  // Load TR / Marksheet report
  const loadReport = async () => {
    try {
      setLoading(true);
      setError("");
      setReport(null);
      setSelectedStudentIdx(0);
      const res = await ep1.get(`/api/v2/${modelPrefix}/tr-report`, {
        params: { colid: global1.colid, ...filters }
      });
      setReport(res.data);
      if (res.data?.students?.length) {
        setSelectedStudentIdx(0);
      }
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Unable to generate marksheet report. Please check your filter criteria.");
    } finally {
      setLoading(false);
    }
  };

  // Update QR & Marksheet Number when student changes
  useEffect(() => {
    if (!currentStudent) {
      setQrDataUrl("");
      return;
    }
    const regno = currentStudent.enrolmentno || currentStudent.regno || "";
    const cleanNum = regno.replace(/\D/g, "").slice(-6) || "265829";
    const generatedNo = `PUBH26${cleanNum}Y05M`;
    setMarksheetNo(generatedNo);

    const qrText = `PEOPLE'S UNIVERSITY\nMarksheet: ${generatedNo}\nReg: ${regno}\nName: ${currentStudent.name}\nResult: ${currentStudent.result || "PASS"}`;
    QRCode.toDataURL(qrText, { width: 120, margin: 1 })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(""));
  }, [currentStudent]);

  // Fit width handler
  const handleFitWidth = () => {
    if (workspaceRef.current) {
      const avail = workspaceRef.current.clientWidth - 48;
      const target = isAnnualResolved ? 1123 : 794;
      const fitZ = Math.min(1.2, Math.max(0.4, Math.round((avail / target) * 100) / 100));
      setZoom(fitZ);
    }
  };

  return (
    <MenuPageShell
      title={pageTitle}
      subtitle={pageSubtitle}
      breadcrumbs={[
        { label: "Dashboard", to: "/" },
        { label: `Result Processing ${modelNumber}`, to: `/exammodel${modelNumber}marks` },
        { label: pageTitle }
      ]}
    >
      <Box sx={{ width: "100%", pb: 5 }}>
        {/* FILTER BAR - ALL FILTERS ARE DROPDOWNS */}
        <Paper elevation={0} sx={{ p: 2, mb: 2.5, borderRadius: 2.5, border: "1px solid #e5e7eb" }}>
          <Grid container spacing={1.5} alignItems="center">
            {/* 1. Academic Year Dropdown */}
            <Grid item xs={12} sm={6} md={2}>
              <TextField
                select
                fullWidth
                size="small"
                label="Academic Year"
                value={filters.academicyear}
                onChange={(e) => setFilters({ ...filters, academicyear: e.target.value })}
              >
                {academicYearChoices.map((y) => (
                  <MenuItem key={y} value={y}>{y}</MenuItem>
                ))}
              </TextField>
            </Grid>

            {/* 2. Regulation Dropdown */}
            <Grid item xs={12} sm={6} md={2}>
              <TextField
                select
                fullWidth
                size="small"
                label="Regulation"
                value={filters.regulation}
                onChange={(e) => setFilters({ ...filters, regulation: e.target.value })}
              >
                <MenuItem value="">All Regulations</MenuItem>
                {(options.regulation || []).map((r) => (
                  <MenuItem key={r} value={r}>{r}</MenuItem>
                ))}
              </TextField>
            </Grid>

            {/* 3. Program Dropdown */}
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                select
                fullWidth
                size="small"
                label="Program"
                value={filters.programcode}
                onChange={(e) => {
                  const pcode = e.target.value;
                  const item = programChoices.find((p) => p.code === pcode);
                  setFilters({ ...filters, programcode: pcode, program: item?.name || "" });
                }}
              >
                <MenuItem value="">Select Program</MenuItem>
                {programChoices.map((p) => (
                  <MenuItem key={p.code} value={p.code}>
                    {p.name !== p.code ? `${p.name} (${p.code})` : p.code}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            {/* 4. Semester / Prof Dropdown */}
            <Grid item xs={12} sm={6} md={2}>
              <TextField
                select
                fullWidth
                size="small"
                label="Semester / Prof"
                value={filters.semester}
                onChange={(e) => setFilters({ ...filters, semester: e.target.value })}
              >
                <MenuItem value="">Select Semester / Prof</MenuItem>
                {semesterChoices.map((s) => (
                  <MenuItem key={s} value={s}>{s}</MenuItem>
                ))}
              </TextField>
            </Grid>

            {/* 5. Exam / Exam Code Dropdown */}
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                select
                fullWidth
                size="small"
                label="Exam / Exam Code"
                value={filters.examcode || ""}
                onChange={(e) => {
                  const val = e.target.value;
                  const item = examChoices.find((x) => x.examcode === val);
                  setFilters({
                    ...filters,
                    examcode: val,
                    exam: item?.exam || val
                  });
                }}
              >
                <MenuItem value="">Select Exam / Exam Code</MenuItem>
                {examChoices.map((item) => (
                  <MenuItem key={item.examcode} value={item.examcode}>
                    {item.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            {/* FORMAT TOGGLE & ACTION BUTTONS */}
            <Grid item xs={12}>
              <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 800, color: "#374151" }}>
                    Layout Format:
                  </Typography>
                  <ButtonGroup size="small">
                    <Button
                      variant={formatType === "auto" ? "contained" : "outlined"}
                      onClick={() => setFormatType("auto")}
                      sx={{ textTransform: "none", fontWeight: 700 }}
                    >
                      Auto ({isAnnualResolved ? "Annual" : "Semester"})
                    </Button>
                    <Button
                      variant={formatType === "semester" ? "contained" : "outlined"}
                      onClick={() => setFormatType("semester")}
                      sx={{ textTransform: "none", fontWeight: 700 }}
                    >
                      Semester (Portrait)
                    </Button>
                    <Button
                      variant={formatType === "annual" ? "contained" : "outlined"}
                      onClick={() => setFormatType("annual")}
                      sx={{ textTransform: "none", fontWeight: 700 }}
                    >
                      Annual (Landscape)
                    </Button>
                  </ButtonGroup>
                </Box>

                <Box sx={{ flex: 1 }} />

                <Button
                  variant="contained"
                  color="primary"
                  onClick={loadReport}
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <ArticleIcon />}
                  sx={{ textTransform: "none", fontWeight: 800, px: 3 }}
                >
                  {loading ? "Generating..." : "Generate Marksheet"}
                </Button>
              </Stack>
            </Grid>
          </Grid>
        </Paper>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
            {error}
          </Alert>
        )}

        {/* WORKSPACE & CONTROLS */}
        {students.length > 0 && (
          <Paper elevation={0} sx={{ p: 2, mb: 2, borderRadius: 2.5, border: "1px solid #e5e7eb" }}>
            <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between" flexWrap="wrap">
              {/* Student navigation */}
              <Stack direction="row" spacing={1} alignItems="center">
                <IconButton
                  size="small"
                  disabled={selectedStudentIdx <= 0}
                  onClick={() => setSelectedStudentIdx((i) => Math.max(0, i - 1))}
                  title="Previous Student"
                >
                  <NavigateBeforeIcon />
                </IconButton>
                <Chip
                  label={`Student ${selectedStudentIdx + 1} of ${students.length}`}
                  color="primary"
                  size="small"
                  sx={{ fontWeight: 800 }}
                />
                <IconButton
                  size="small"
                  disabled={selectedStudentIdx >= students.length - 1}
                  onClick={() => setSelectedStudentIdx((i) => Math.min(students.length - 1, i + 1))}
                  title="Next Student"
                >
                  <NavigateNextIcon />
                </IconButton>

                <Autocomplete
                  size="small"
                  options={students}
                  getOptionLabel={(st) => `${st.enrolmentno || st.regno || ""} - ${st.name || ""}`}
                  value={currentStudent}
                  onChange={(_, val) => {
                    if (val) {
                      const idx = students.findIndex((s) => s.enrolmentno === val.enrolmentno || s.regno === val.regno);
                      if (idx >= 0) setSelectedStudentIdx(idx);
                    }
                  }}
                  sx={{ width: 280, ml: 1 }}
                  renderInput={(params) => <TextField {...params} label="Select Examinee" />}
                />
              </Stack>

              {/* Editable Issue Date & Marksheet No */}
              <Stack direction="row" spacing={1.5} alignItems="center">
                <TextField
                  size="small"
                  label="Marksheet No."
                  value={marksheetNo}
                  onChange={(e) => setMarksheetNo(e.target.value)}
                  sx={{ width: 180 }}
                />
                <TextField
                  size="small"
                  label="Issue Date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  sx={{ width: 130 }}
                />
              </Stack>

              {/* Zoom & Print */}
              <Stack direction="row" spacing={1} alignItems="center">
                <Stack direction="row" spacing={0.5} alignItems="center" sx={{ bgcolor: "#f3f4f6", px: 1, py: 0.25, borderRadius: 1.5 }}>
                  <IconButton size="small" onClick={() => setZoom((z) => Math.max(0.4, Number((z - 0.1).toFixed(2))))}>
                    <ZoomOutIcon fontSize="small" />
                  </IconButton>
                  <Typography variant="body2" sx={{ fontWeight: 800, minWidth: 42, textAlign: "center", fontSize: 12 }}>
                    {Math.round(zoom * 100)}%
                  </Typography>
                  <IconButton size="small" onClick={() => setZoom((z) => Math.min(1.4, Number((z + 0.1).toFixed(2))))}>
                    <ZoomInIcon fontSize="small" />
                  </IconButton>
                  <Button size="small" variant="text" startIcon={<FitScreenIcon fontSize="small" />} onClick={handleFitWidth} sx={{ minWidth: "auto", px: 1, textTransform: "none", fontSize: 11, fontWeight: 700 }}>
                    Fit
                  </Button>
                  <Button size="small" variant="text" startIcon={<RestartAltIcon fontSize="small" />} onClick={() => setZoom(1)} sx={{ minWidth: "auto", px: 1, textTransform: "none", fontSize: 11, fontWeight: 700 }}>
                    100%
                  </Button>
                </Stack>

                <Button
                  variant="contained"
                  color="primary"
                  size="small"
                  startIcon={<PrintIcon />}
                  onClick={() => printMarksheetDoc("marksheet-current-preview", isAnnualResolved)}
                  sx={{ textTransform: "none", fontWeight: 800 }}
                >
                  Print Marksheet
                </Button>

                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<PictureAsPdfIcon />}
                  onClick={() => printMarksheetDoc("marksheet-bulk-preview", isAnnualResolved)}
                  sx={{ textTransform: "none", fontWeight: 700 }}
                >
                  Print All ({students.length})
                </Button>
              </Stack>
            </Stack>
          </Paper>
        )}

        {/* MARKSHEET PREVIEW WORKSPACE */}
        {currentStudent ? (
          <Box
            ref={workspaceRef}
            sx={{
              width: "100%",
              minHeight: "75vh",
              bgcolor: "#374151",
              borderRadius: 2.5,
              p: { xs: 1.5, md: 3 },
              overflowX: "auto",
              display: "flex",
              justifyContent: "center",
              boxShadow: "inset 0 2px 8px rgba(0,0,0,0.4)"
            }}
          >
            <Box
              sx={{
                width: isAnnualResolved ? `${297 * zoom}mm` : `${210 * zoom}mm`,
                display: "flex",
                justifyContent: "center"
              }}
            >
              <Box
                id="marksheet-current-preview"
                sx={{
                  width: isAnnualResolved ? "297mm" : "210mm",
                  transform: `scale(${zoom})`,
                  transformOrigin: "top center",
                  transition: "transform 0.12s ease-out",
                  mb: zoom !== 1 ? `${(zoom - 1) * (isAnnualResolved ? 210 : 297)}mm` : 0
                }}
              >
                {/* RENDER THE EXACT SELECTED FORMAT */}
                {isMain ? (
                  isAnnualResolved ? (
                    <AnnualMainMarksheetPrint
                      student={currentStudent}
                      institution={report.institution || {}}
                      qr={qrDataUrl}
                      issueDate={issueDate}
                      marksheetNo={marksheetNo}
                    />
                  ) : (
                    <SemesterMainMarksheetPrint
                      student={currentStudent}
                      institution={report.institution || {}}
                      qr={qrDataUrl}
                      issueDate={issueDate}
                      marksheetNo={marksheetNo}
                    />
                  )
                ) : (
                  isAnnualResolved ? (
                    <AnnualProvisionalMarksheetPrint
                      student={currentStudent}
                      institution={report.institution || {}}
                      issueDate={issueDate}
                    />
                  ) : (
                    <SemesterProvisionalMarksheetPrint
                      student={currentStudent}
                      institution={report.institution || {}}
                      issueDate={issueDate}
                    />
                  )
                )}
              </Box>
            </Box>
          </Box>
        ) : (
          !loading && (
            <Paper elevation={0} sx={{ p: 5, textAlign: "center", borderRadius: 2.5, border: "1px dashed #d1d5db" }}>
              <ArticleIcon sx={{ fontSize: 54, color: "#9ca3af", mb: 1 }} />
              <Typography variant="h6" fontWeight={800} color="text.secondary">
                Select filters and click "Generate Marksheet"
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Generates authentic university marksheets for Annual (MBBS) and Semester programs.
              </Typography>
            </Paper>
          )
        )}

        {/* HIDDEN BULK CONTAINER FOR PRINTING ALL STUDENTS */}
        <Box id="marksheet-bulk-preview" sx={{ display: "none" }}>
          {students.map((st, idx) => (
            <Box key={idx} sx={{ pageBreakAfter: "always", breakAfter: "page" }}>
              {isMain ? (
                isAnnualResolved ? (
                  <AnnualMainMarksheetPrint
                    student={st}
                    institution={report?.institution || {}}
                    qr={qrDataUrl}
                    issueDate={issueDate}
                    marksheetNo={`PUBH26${String(st.enrolmentno || st.regno || idx).replace(/\D/g, "").slice(-6)}Y05M`}
                  />
                ) : (
                  <SemesterMainMarksheetPrint
                    student={st}
                    institution={report?.institution || {}}
                    qr={qrDataUrl}
                    issueDate={issueDate}
                    marksheetNo={`PUBH26${String(st.enrolmentno || st.regno || idx).replace(/\D/g, "").slice(-6)}Y05M`}
                  />
                )
              ) : (
                isAnnualResolved ? (
                  <AnnualProvisionalMarksheetPrint
                    student={st}
                    institution={report?.institution || {}}
                    issueDate={issueDate}
                  />
                ) : (
                  <SemesterProvisionalMarksheetPrint
                    student={st}
                    institution={report?.institution || {}}
                    issueDate={issueDate}
                  />
                )
              )}
            </Box>
          ))}
        </Box>
      </Box>
    </MenuPageShell>
  );
}
