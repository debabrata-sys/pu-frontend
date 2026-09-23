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
    <div
      className="marksheet-security-frame"
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        boxSizing: "border-box",
        padding: isLandscape ? "6px 8px" : "6px 8px",
        border: "3px double #135497",
        outline: "1px solid #135497",
        outlineOffset: "-4px",
        backgroundColor: "#fff",
        color: "#000",
        overflow: "hidden"
      }}
    >
      {/* Decorative Corner Ornaments */}
      <div style={{ position: "absolute", top: 3, left: 3, width: 20, height: 20, borderTop: "3px solid #135497", borderLeft: "3px solid #135497", pointerEvents: "none" }} />
      <div style={{ position: "absolute", top: 3, right: 3, width: 20, height: 20, borderTop: "3px solid #135497", borderRight: "3px solid #135497", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: 3, left: 3, width: 20, height: 20, borderBottom: "3px solid #135497", borderLeft: "3px solid #135497", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: 3, right: 3, width: 20, height: 20, borderBottom: "3px solid #135497", borderRight: "3px solid #135497", pointerEvents: "none" }} />

      {/* Repeating Diagonal Watermark */}
      <div
        className="marksheet-watermark"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          opacity: 0.05,
          zIndex: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: "rotate(-25deg)",
          fontSize: isLandscape ? "28pt" : "24pt",
          fontWeight: 900,
          color: "#135497",
          lineHeight: 2.2,
          textAlign: "center",
          whiteSpace: "pre"
        }}
      >
        {`PEOPLE'S UNIVERSITY, BHOPAL    PEOPLE'S UNIVERSITY, BHOPAL\nPEOPLE'S UNIVERSITY, BHOPAL    PEOPLE'S UNIVERSITY, BHOPAL\nPEOPLE'S UNIVERSITY, BHOPAL    PEOPLE'S UNIVERSITY, BHOPAL\nPEOPLE'S UNIVERSITY, BHOPAL    PEOPLE'S UNIVERSITY, BHOPAL`}
      </div>

      {/* Content Layer */}
      <div style={{ position: "relative", zIndex: 1, width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", boxSizing: "border-box" }}>
        {children}
      </div>
    </div>
  );
}

// ==========================================
// UNIVERSITY CREST & TITLE HEADER
// ==========================================
export function UniversityHeader({
  logo,
  qr,
  photo,
  showPhoto = true,
  marksheetNo,
  subTitle = "STATEMENT OF MARKS",
  isLandscape = false
}) {
  const leftWidth = showPhoto ? "17%" : "15%";
  const centerWidth = showPhoto ? (isLandscape ? "66%" : "65%") : (isLandscape ? "73%" : "70%");
  const rightWidth = showPhoto ? "17%" : "15%";

  return (
    <div style={{ width: "100%", marginBottom: "4px", borderBottom: "1.5px solid #135497", paddingBottom: "3px", boxSizing: "border-box" }}>
      <div style={{ display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
        {/* Left: QR Code or Logo space */}
        <div style={{ width: leftWidth, display: "flex", justifyContent: "flex-start", alignItems: "center" }}>
          {qr ? (
            <div style={{ border: "1px solid #333", padding: "2px", backgroundColor: "#fff", display: "inline-block" }}>
              <img src={qr} alt="QR" style={{ width: isLandscape ? 54 : 48, height: isLandscape ? 54 : 48, display: "block" }} />
            </div>
          ) : (
            logo && <img src={logo} alt="Logo" style={{ maxHeight: 46, maxWidth: 75, objectFit: "contain" }} />
          )}
        </div>

        {/* Center: University Title & Crest */}
        <div style={{ width: centerWidth, textAlign: "center" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
            {logo && (
              <img src={logo} alt="" style={{ height: isLandscape ? 40 : 44, objectFit: "contain" }} />
            )}
            <span
              style={{
                fontSize: isLandscape ? "26pt" : "24pt",
                fontWeight: 950,
                color: "#135497",
                letterSpacing: isLandscape ? "2.5px" : "2.2px",
                lineHeight: 1.05,
                fontFamily: "Arial, Helvetica, sans-serif",
                textTransform: "uppercase",
                whiteSpace: "nowrap",
                display: "inline-block"
              }}
            >
              PEOPLE'S UNIVERSITY
            </span>
          </div>

          <div style={{ fontSize: isLandscape ? "7.0pt" : "6.6pt", fontWeight: 700, color: "#222", marginTop: "2px", lineHeight: 1.15, letterSpacing: "0.1px" }}>
            [Established under MP Act No. 17/2007, by Amendment Act No. 18/2011 and approved by UGC]
          </div>

          <div style={{ display: "inline-block", marginTop: "3px", padding: "1.5px 14px", border: "1.5px solid #135497", borderRadius: "3px" }}>
            <span style={{ fontSize: isLandscape ? "9.5pt" : "9.0pt", fontWeight: 900, color: "#135497", letterSpacing: "0.8px", textTransform: "uppercase" }}>
              {subTitle}
            </span>
          </div>
        </div>

        {/* Right: Photo & Marksheet No */}
        <div style={{ width: rightWidth, display: "flex", flexDirection: "column", alignItems: "flex-end", justifyContent: "center" }}>
          {showPhoto && (
            photo ? (
              <div style={{ border: "1.5px solid #c00", padding: "2px", backgroundColor: "#fff", marginBottom: "3px" }}>
                <img src={photo} alt="" style={{ width: isLandscape ? 50 : 44, height: isLandscape ? 60 : 54, objectFit: "cover", display: "block" }} />
              </div>
            ) : (
              <div style={{ width: 44, height: 54, border: "1px dashed #999", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "7.0pt", marginBottom: "3px", color: "#666" }}>
                Photo
              </div>
            )
          )}
          {marksheetNo && (
            <div style={{ fontSize: "6.8pt", fontWeight: 900, textAlign: "right", color: "#000", whiteSpace: "nowrap" }}>
              MARKSHEET NO. : <span style={{ fontWeight: 800 }}>{marksheetNo}</span>
            </div>
          )}
        </div>
      </div>
    </div>
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
  const courses = useMemo(() => {
    const map = new Map();
    (student.courses || []).forEach((c) => {
      const code = c.papercode || c.coursecode;
      if (!code) return;
      if (!map.has(code)) {
        map.set(code, { ...c, papercode: code, papername: c.papername || c.course || "" });
      } else {
        const prev = map.get(code);
        Object.assign(prev, c);
      }
    });
    return Array.from(map.values());
  }, [student.courses]);
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

  const demoLabel = { fontSize: "6.5pt", fontWeight: 900, color: "#000", lineHeight: 1.25 };
  const demoVal = { fontSize: "6.5pt", fontWeight: 700, color: "#000", lineHeight: 1.25 };

  return (
    <Box className="marksheet-page marksheet-landscape" sx={{ width: "100%", maxWidth: "297mm", height: "202mm", maxHeight: "202mm", p: 0, bgcolor: "#fff", boxSizing: "border-box", overflow: "hidden" }}>
      <MarksheetSecurityFrame isLandscape>
        <UniversityHeader
          logo={institution.logolink || institution.logo}
          qr={qr}
          photo={student.photo}
          showPhoto={true}
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
  const mergedCourses = useMemo(() => {
    const map = new Map();
    (student.courses || []).forEach((c) => {
      const code = c.papercode || c.coursecode;
      if (!code) return;
      if (!map.has(code)) {
        map.set(code, {
          papercode: code,
          papername: c.papername || c.course || "",
          theoryCreditsOff: c.theoryCreditsOff !== undefined ? c.theoryCreditsOff : (c.type === "T" ? c.creditsOff : "-"),
          practicalCreditsOff: c.practicalCreditsOff !== undefined ? c.practicalCreditsOff : (c.type === "P" ? c.creditsOff : "-"),
          theoryCreditsEarned: c.theoryCreditsEarned !== undefined ? c.theoryCreditsEarned : (c.type === "T" ? c.creditsEarned : "-"),
          practicalCreditsEarned: c.practicalCreditsEarned !== undefined ? c.practicalCreditsEarned : (c.type === "P" ? c.creditsEarned : "-"),
          theoryGrade: c.theoryGrade !== undefined ? c.theoryGrade : (c.type === "T" ? c.grade : "-"),
          practicalGrade: c.practicalGrade !== undefined ? c.practicalGrade : (c.type === "P" ? c.grade : "-"),
          creditsOff: Number(c.creditsOff) || 0,
          creditsEarned: Number(c.creditsEarned) || 0
        });
      } else {
        const existing = map.get(code);
        if (c.type === "T" || c.hasTheory) {
          existing.theoryCreditsOff = c.theoryCreditsOff !== undefined ? c.theoryCreditsOff : (c.creditsOff ?? existing.theoryCreditsOff);
          existing.theoryCreditsEarned = c.theoryCreditsEarned !== undefined ? c.theoryCreditsEarned : (c.creditsEarned ?? existing.theoryCreditsEarned);
          existing.theoryGrade = c.theoryGrade !== undefined ? c.theoryGrade : (c.grade ?? existing.theoryGrade);
        }
        if (c.type === "P" || c.hasPractical) {
          existing.practicalCreditsOff = c.practicalCreditsOff !== undefined ? c.practicalCreditsOff : (c.creditsOff ?? existing.practicalCreditsOff);
          existing.practicalCreditsEarned = c.practicalCreditsEarned !== undefined ? c.practicalCreditsEarned : (c.creditsEarned ?? existing.practicalCreditsEarned);
          existing.practicalGrade = c.practicalGrade !== undefined ? c.practicalGrade : (c.grade ?? existing.practicalGrade);
        }
        existing.creditsOff += Number(c.creditsOff) || 0;
        existing.creditsEarned += Number(c.creditsEarned) || 0;
      }
    });
    return Array.from(map.values());
  }, [student.courses]);

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

  const totalAllotted = student.grandTotal?.creditsOff || mergedCourses.reduce((s, c) => s + (Number(c.creditsOff) || 0), 0) || 26;
  const totalEarned = student.grandTotal?.creditsEarned || mergedCourses.reduce((s, c) => s + (Number(c.creditsEarned) || 0), 0) || 26;

  const thStyle = {
    border: "1px solid #000",
    padding: "4px 4px",
    fontSize: "7.5pt",
    fontWeight: 900,
    textAlign: "center",
    bgcolor: "#f9fafb"
  };

  const tdStyle = {
    border: "1px solid #000",
    padding: "4.5px 5px",
    fontSize: "7.6pt",
    lineHeight: 1.25
  };

  const demoLabel = { fontSize: "6.8pt", fontWeight: 900, color: "#000", lineHeight: 1.3 };
  const demoVal = { fontSize: "6.8pt", fontWeight: 700, color: "#000", lineHeight: 1.3 };

  return (
    <Box className="marksheet-page marksheet-portrait" sx={{ width: "100%", maxWidth: "210mm", height: "290mm", maxHeight: "290mm", p: 0, bgcolor: "#fff", boxSizing: "border-box", overflow: "hidden" }}>
      <MarksheetSecurityFrame isLandscape={false}>
        <UniversityHeader
          logo={institution.logolink || institution.logo}
          subTitle="STATEMENT OF GRADE"
          showPhoto={false}
          isLandscape={false}
        />

        {/* DEMOGRAPHICS GRID */}
        <Box sx={{ mb: 0.8, px: 0.5 }}>
          <Grid container spacing={0.8}>
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
        <Box sx={{ width: "100%", mb: 0.8 }}>
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
              {mergedCourses.map((c, i) => (
                <tr key={i}>
                  <td style={{ ...tdStyle, textAlign: "center", fontWeight: 700 }}>{fmt(c.papercode)}</td>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>{fmt(c.papername)}</td>
                  <td style={{ ...tdStyle, textAlign: "center" }}>{fmt(c.theoryCreditsOff)}</td>
                  <td style={{ ...tdStyle, textAlign: "center" }}>{fmt(c.practicalCreditsOff)}</td>
                  <td style={{ ...tdStyle, textAlign: "center" }}>{fmt(c.theoryCreditsEarned)}</td>
                  <td style={{ ...tdStyle, textAlign: "center" }}>{fmt(c.practicalCreditsEarned)}</td>
                  <td style={{ ...tdStyle, textAlign: "center", fontWeight: 800 }}>{fmt(c.theoryGrade)}</td>
                  <td style={{ ...tdStyle, textAlign: "center", fontWeight: 800 }}>{fmt(c.practicalGrade)}</td>
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
        <Box sx={{ width: "100%", mb: 0.8 }}>
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
  const courses = useMemo(() => {
    const map = new Map();
    (student.courses || []).forEach((c) => {
      const code = c.papercode || c.coursecode;
      if (!code) return;
      if (!map.has(code)) {
        map.set(code, { ...c, papercode: code, papername: c.papername || c.course || "" });
      } else {
        const prev = map.get(code);
        Object.assign(prev, c);
      }
    });
    return Array.from(map.values());
  }, [student.courses]);
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

  const demoLabel = { fontSize: "6.5pt", fontWeight: 900, color: "#000", lineHeight: 1.25 };
  const demoVal = { fontSize: "6.5pt", fontWeight: 700, color: "#000", lineHeight: 1.25 };

  return (
    <Box className="marksheet-page marksheet-landscape" sx={{ width: "100%", maxWidth: "297mm", height: "202mm", maxHeight: "202mm", p: 0, bgcolor: "#fff", boxSizing: "border-box", overflow: "hidden" }}>
      <MarksheetSecurityFrame isLandscape>
        <UniversityHeader
          logo={institution.logolink || institution.logo}
          subTitle="STATEMENT OF MARKS - PROVISIONAL"
          showPhoto={false}
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
  const mergedCourses = useMemo(() => {
    const map = new Map();
    (student.courses || []).forEach((c) => {
      const code = c.papercode || c.coursecode;
      if (!code) return;
      if (!map.has(code)) {
        map.set(code, {
          papercode: code,
          papername: c.papername || c.course || "",
          theoryCreditsOff: c.theoryCreditsOff !== undefined ? c.theoryCreditsOff : (c.type === "T" ? c.creditsOff : "-"),
          practicalCreditsOff: c.practicalCreditsOff !== undefined ? c.practicalCreditsOff : (c.type === "P" ? c.creditsOff : "-"),
          theoryCreditsEarned: c.theoryCreditsEarned !== undefined ? c.theoryCreditsEarned : (c.type === "T" ? c.creditsEarned : "-"),
          practicalCreditsEarned: c.practicalCreditsEarned !== undefined ? c.practicalCreditsEarned : (c.type === "P" ? c.creditsEarned : "-"),
          theoryGrade: c.theoryGrade !== undefined ? c.theoryGrade : (c.type === "T" ? c.grade : "-"),
          practicalGrade: c.practicalGrade !== undefined ? c.practicalGrade : (c.type === "P" ? c.grade : "-"),
          creditsOff: Number(c.creditsOff) || 0,
          creditsEarned: Number(c.creditsEarned) || 0
        });
      } else {
        const existing = map.get(code);
        if (c.type === "T" || c.hasTheory) {
          existing.theoryCreditsOff = c.theoryCreditsOff !== undefined ? c.theoryCreditsOff : (c.creditsOff ?? existing.theoryCreditsOff);
          existing.theoryCreditsEarned = c.theoryCreditsEarned !== undefined ? c.theoryCreditsEarned : (c.creditsEarned ?? existing.theoryCreditsEarned);
          existing.theoryGrade = c.theoryGrade !== undefined ? c.theoryGrade : (c.grade ?? existing.theoryGrade);
        }
        if (c.type === "P" || c.hasPractical) {
          existing.practicalCreditsOff = c.practicalCreditsOff !== undefined ? c.practicalCreditsOff : (c.creditsOff ?? existing.practicalCreditsOff);
          existing.practicalCreditsEarned = c.practicalCreditsEarned !== undefined ? c.practicalCreditsEarned : (c.creditsEarned ?? existing.practicalCreditsEarned);
          existing.practicalGrade = c.practicalGrade !== undefined ? c.practicalGrade : (c.grade ?? existing.practicalGrade);
        }
        existing.creditsOff += Number(c.creditsOff) || 0;
        existing.creditsEarned += Number(c.creditsEarned) || 0;
      }
    });
    return Array.from(map.values());
  }, [student.courses]);

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

  const totalAllotted = student.grandTotal?.creditsOff || mergedCourses.reduce((s, c) => s + (Number(c.creditsOff) || 0), 0) || 26;
  const totalEarned = student.grandTotal?.creditsEarned || mergedCourses.reduce((s, c) => s + (Number(c.creditsEarned) || 0), 0) || 26;

  const thStyle = {
    border: "1px solid #000",
    padding: "4px 4px",
    fontSize: "7.5pt",
    fontWeight: 900,
    textAlign: "center",
    bgcolor: "#f9fafb"
  };

  const tdStyle = {
    border: "1px solid #000",
    padding: "4.5px 5px",
    fontSize: "7.6pt",
    lineHeight: 1.25
  };

  const demoLabel = { fontSize: "6.8pt", fontWeight: 900, color: "#000", lineHeight: 1.3 };
  const demoVal = { fontSize: "6.8pt", fontWeight: 700, color: "#000", lineHeight: 1.3 };

  return (
    <Box className="marksheet-page marksheet-portrait" sx={{ width: "100%", maxWidth: "210mm", height: "290mm", maxHeight: "290mm", p: 0, bgcolor: "#fff", boxSizing: "border-box", overflow: "hidden" }}>
      <MarksheetSecurityFrame isLandscape={false}>
        <UniversityHeader
          logo={institution.logolink || institution.logo}
          qr={qr}
          photo={student.photo}
          showPhoto={true}
          marksheetNo={marksheetNo || student.marksheetNo || "PUBH26582985Y05M"}
          subTitle="STATEMENT OF MARKS"
          isLandscape={false}
        />

        {/* DEMOGRAPHICS */}
        <Box sx={{ mb: 0.8, px: 0.5 }}>
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
        <Box sx={{ width: "100%", mb: 0.8 }}>
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
              {mergedCourses.map((c, i) => (
                <tr key={i}>
                  <td style={{ ...tdStyle, textAlign: "center", fontWeight: 700 }}>{fmt(c.papercode)}</td>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>{fmt(c.papername)}</td>
                  <td style={{ ...tdStyle, textAlign: "center" }}>{fmt(c.theoryCreditsOff)}</td>
                  <td style={{ ...tdStyle, textAlign: "center" }}>{fmt(c.practicalCreditsOff)}</td>
                  <td style={{ ...tdStyle, textAlign: "center" }}>{fmt(c.theoryCreditsEarned)}</td>
                  <td style={{ ...tdStyle, textAlign: "center" }}>{fmt(c.practicalCreditsEarned)}</td>
                  <td style={{ ...tdStyle, textAlign: "center", fontWeight: 800 }}>{fmt(c.theoryGrade)}</td>
                  <td style={{ ...tdStyle, textAlign: "center", fontWeight: 800 }}>{fmt(c.practicalGrade)}</td>
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
        <Box sx={{ width: "100%", mb: 0.8 }}>
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
        <Box sx={{ mt: "auto", pt: 0.5, display: "flex", justifyContent: "space-between", alignItems: "flex-end", fontSize: "8pt", fontWeight: 900 }}>
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

  // Clone all head style and stylesheet tags
  let headStyles = "";
  try {
    const styleNodes = document.querySelectorAll("style, link[rel='stylesheet']");
    styleNodes.forEach((node) => {
      headStyles += node.outerHTML + "\n";
    });
  } catch (err) {
    console.warn("Could not copy stylesheets to print iframe", err);
  }

  const doc = iframe.contentWindow.document;
  doc.open();

  doc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Marksheet</title>
        ${headStyles}
        <style>
          @page {
            size: ${isLandscape ? "A4 landscape" : "A4 portrait"};
            margin: 2mm 3mm;
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
            height: 100% !important;
            max-width: 100% !important;
          }
          .marksheet-page {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 auto !important;
            padding: 0 !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
            page-break-before: avoid !important;
            break-before: avoid !important;
            page-break-after: avoid !important;
            break-after: avoid !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            background: #fff !important;
          }
          .marksheet-portrait {
            height: 290mm !important;
            max-height: 290mm !important;
          }
          .marksheet-landscape {
            height: 202mm !important;
            max-height: 202mm !important;
          }
          .marksheet-security-frame {
            position: relative !important;
            width: 100% !important;
            height: 100% !important;
            box-sizing: border-box !important;
            border: 3px double #135497 !important;
            outline: 1px solid #135497 !important;
            outline-offset: -4px !important;
            overflow: hidden !important;
            background-color: #fff !important;
            padding: 6px 8px !important;
          }
          .marksheet-watermark {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
            width: 100% !important;
            height: 100% !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            opacity: 0.05 !important;
            z-index: 0 !important;
            transform: rotate(-25deg) !important;
            pointer-events: none !important;
            color: #135497 !important;
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
  }, 450);
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
