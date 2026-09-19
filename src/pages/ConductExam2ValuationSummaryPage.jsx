import React, { useEffect, useState, useMemo } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Grid,
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
  Typography,
  Alert,
  Tooltip
} from "@mui/material";
import {
  Search,
  ContentCopy,
  FileDownload,
  Print,
  Refresh,
  Assessment,
  ArrowForward,
  Description,
  PictureAsPdf,
  TableChart
} from "@mui/icons-material";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { useNavigate } from "react-router-dom";
import ep1 from "../api/ep1";
import global1 from "./global1";
import MenuPageShell from "./MenuPageShell";

export default function ConductExam2ValuationSummaryPage() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [reportRows, setReportRows] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  const [filters, setFilters] = useState({
    academicyear: "",
    examcode: "",
    programcode: "",
    coursecode: ""
  });

  const [options, setOptions] = useState({
    academicyears: [],
    exams: [],
    programs: [],
    courses: []
  });

  useEffect(() => {
    loadOptions();
    fetchReport();
  }, []);

  const loadOptions = async () => {
    try {
      const res = await ep1.get("/api/v2/conductexam2/award-list-options", {
        params: { colid: global1.colid }
      });
      if (res.data?.success) {
        setOptions({
          academicyears: res.data.academicyears || [],
          exams: res.data.exams || [],
          programs: res.data.programs || [],
          courses: res.data.courses || []
        });
      }
    } catch (err) {
      console.error("Error loading options:", err);
    }
  };

  const fetchReport = async (activeFilters = filters) => {
    try {
      setLoading(true);
      setError("");
      const res = await ep1.get("/api/v2/conductexam2/valuation-status-summary", {
        params: {
          colid: global1.colid,
          academicyear: activeFilters.academicyear,
          examcode: activeFilters.examcode,
          programcode: activeFilters.programcode,
          coursecode: activeFilters.coursecode
        }
      });
      if (res.data?.success) {
        setReportRows(res.data.rows || []);
      } else {
        setError(res.data?.message || "Failed to load valuation summary report.");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Error fetching valuation summary report.");
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field, value) => {
    const next = { ...filters, [field]: value };
    setFilters(next);
    fetchReport(next);
  };

  // Filter rows by search box
  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return reportRows;
    const q = searchQuery.toLowerCase();
    return reportRows.filter(
      (r) =>
        (r.courseName || "").toLowerCase().includes(q) ||
        (r.subjectCode || "").toLowerCase().includes(q) ||
        (r.subjectName || "").toLowerCase().includes(q) ||
        (r.programName || "").toLowerCase().includes(q) ||
        (r.examCode || "").toLowerCase().includes(q)
    );
  }, [reportRows, searchQuery]);

  // Export handlers
  // Export handlers for Valuation Summary Report
  const handleCopy = () => {
    const headers = [
      "Sno.", "Course Name", "Subject Code", "Subject Name", "No.Scripts",
      "Uploaded", "Pending Uploads", "V1 Valuated", "V1 AFV", "Reval Applied",
      "V2 Valuated", "V2 AFV (Pendency)", "V3 Valuated", "V3 AFV (Pendency)",
      "V4 Pendency", "V4 Valuated", "V1 Avg Marks", "V2 Avg Marks", "V3 Avg Marks", "V4 Avg Marks"
    ];
    const data = filteredRows.map((r) => [
      r.sno, r.courseName, r.subjectCode, r.subjectName, r.noScripts,
      r.uploaded, r.pendingUploads, r.v1Valuated, r.v1Afv ?? r.afv ?? 0, r.revalApplied,
      r.v2Valuated, r.v2Afv ?? r.v2Pendency ?? 0, r.v3Valuated, r.v3Afv ?? r.v3Pendency ?? 0,
      r.v4Pendency ?? 0, r.v4Valuated ?? 0,
      r.v1AvgMarks ?? "-", r.v2AvgMarks ?? "-", r.v3AvgMarks ?? "-", r.v4AvgMarks ?? "-"
    ].join("\t"));
    navigator.clipboard.writeText([headers.join("\t"), ...data].join("\n"));
    setSuccessMsg("Summary table copied to clipboard!");
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  // 1. Download Valuation Summary Report as formatted Excel (.xlsx)
  const handleExportExcel = () => {
    try {
      const wb = XLSX.utils.book_new();
      const examObj = options.exams.find((e) => e.examcode === filters.examcode);
      const examName = examObj ? `${examObj.exam} (${examObj.examcode})` : filters.examcode || "All Examinations";
      const acadYear = filters.academicyear || "All Academic Years";

      const sheetData = [
        ["PEOPLE'S UNIVERSITY, BHOPAL"],
        ["VALUATION & RE-EVALUATION PIPELINE SUMMARY REPORT"],
        [`Academic Year: ${acadYear}`, `Examination: ${examName}`, `Generated: ${new Date().toLocaleString("en-GB")}`],
        [],
        [
          "S.No.",
          "Course Name",
          "Subject Code",
          "Subject Name",
          "Total Scripts",
          "Uploaded",
          "Pending Uploads",
          "V1 Valuated",
          "V1 AFV",
          "Reval Applied",
          "V2 Valuated",
          "V2 AFV (Pendency)",
          "V3 Valuated",
          "V3 AFV (Pendency)",
          "V4 Pendency",
          "V4 Valuated",
          "V1 Avg Marks",
          "V2 Avg Marks",
          "V3 Avg Marks",
          "V4 Avg Marks"
        ]
      ];

      let totalScripts = 0;
      let totalUploaded = 0;
      let totalPending = 0;
      let totalV1 = 0;
      let totalV1Afv = 0;
      let totalReval = 0;
      let totalV2 = 0;
      let totalV2Afv = 0;
      let totalV3 = 0;
      let totalV3Afv = 0;
      let totalV4Pend = 0;
      let totalV4 = 0;

      filteredRows.forEach((r, idx) => {
        const s = Number(r.noScripts) || 0;
        const u = Number(r.uploaded) || 0;
        const p = Number(r.pendingUploads) || 0;
        const v1 = Number(r.v1Valuated) || 0;
        const v1a = Number(r.v1Afv ?? r.afv) || 0;
        const rev = Number(r.revalApplied) || 0;
        const v2 = Number(r.v2Valuated) || 0;
        const v2a = Number(r.v2Afv ?? r.v2Pendency) || 0;
        const v3 = Number(r.v3Valuated) || 0;
        const v3a = Number(r.v3Afv ?? r.v3Pendency) || 0;
        const v4p = Number(r.v4Pendency) || 0;
        const v4 = Number(r.v4Valuated) || 0;

        totalScripts += s;
        totalUploaded += u;
        totalPending += p;
        totalV1 += v1;
        totalV1Afv += v1a;
        totalReval += rev;
        totalV2 += v2;
        totalV2Afv += v2a;
        totalV3 += v3;
        totalV3Afv += v3a;
        totalV4Pend += v4p;
        totalV4 += v4;

        sheetData.push([
          idx + 1,
          r.courseName || "",
          r.subjectCode || "",
          r.subjectName || "",
          s,
          u,
          p,
          v1,
          v1a,
          rev,
          v2,
          v2a,
          v3,
          v3a,
          v4p,
          v4,
          r.v1AvgMarks !== undefined && r.v1AvgMarks !== null ? r.v1AvgMarks : "-",
          r.v2AvgMarks !== undefined && r.v2AvgMarks !== null ? r.v2AvgMarks : "-",
          r.v3AvgMarks !== undefined && r.v3AvgMarks !== null ? r.v3AvgMarks : "-",
          r.v4AvgMarks !== undefined && r.v4AvgMarks !== null ? r.v4AvgMarks : "-"
        ]);
      });

      // Bottom Totals Row
      sheetData.push([
        "TOTAL",
        "",
        "",
        "",
        totalScripts,
        totalUploaded,
        totalPending,
        totalV1,
        totalV1Afv,
        totalReval,
        totalV2,
        totalV2Afv,
        totalV3,
        totalV3Afv,
        totalV4Pend,
        totalV4,
        "",
        "",
        "",
        ""
      ]);

      const ws = XLSX.utils.aoa_to_sheet(sheetData);

      ws["!cols"] = [
        { wch: 8 },
        { wch: 28 },
        { wch: 15 },
        { wch: 30 },
        { wch: 13 },
        { wch: 12 },
        { wch: 16 },
        { wch: 13 },
        { wch: 12 },
        { wch: 14 },
        { wch: 13 },
        { wch: 18 },
        { wch: 13 },
        { wch: 18 },
        { wch: 14 },
        { wch: 13 },
        { wch: 13 },
        { wch: 13 },
        { wch: 13 },
        { wch: 13 }
      ];

      XLSX.utils.book_append_sheet(wb, ws, "Valuation Summary");
      const fname = `Valuation_Summary_Report_${filters.examcode || "ALL"}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(wb, fname);
      setSuccessMsg("Valuation Summary Report downloaded in Excel successfully!");
      setTimeout(() => setSuccessMsg(""), 3500);
    } catch (err) {
      console.error("Error exporting Excel:", err);
      setError("Failed to export Excel report.");
    }
  };

  // 2. Download Valuation Summary Report as formatted PDF
  const handleExportPDF = () => {
    try {
      const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
      const examObj = options.exams.find((e) => e.examcode === filters.examcode);
      const examName = examObj ? `${examObj.exam} (${examObj.examcode})` : filters.examcode || "All Examinations";
      const acadYear = filters.academicyear || "All Academic Years";

      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(30, 58, 138);
      doc.text("PEOPLE'S UNIVERSITY, BHOPAL", doc.internal.pageSize.getWidth() / 2, 26, { align: "center" });

      doc.setFontSize(10.5);
      doc.setTextColor(17, 24, 39);
      doc.text("VALUATION & RE-EVALUATION PIPELINE SUMMARY REPORT", doc.internal.pageSize.getWidth() / 2, 40, { align: "center" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(107, 114, 128);
      const metaLine = `Academic Year: ${acadYear}   |   Exam: ${examName}   |   Generated: ${new Date().toLocaleString("en-GB")}`;
      doc.text(metaLine, doc.internal.pageSize.getWidth() / 2, 53, { align: "center" });

      const headers = [
        [
          "S#",
          "Course",
          "Code",
          "Subject",
          "Scripts",
          "Upld",
          "Pend",
          "V1 Val",
          "V1 AFV",
          "Reval",
          "V2 Val",
          "V2 Pend",
          "V3 Val",
          "V3 Pend",
          "V4 Pend",
          "V4 Val",
          "V1 Avg",
          "V2 Avg",
          "V3 Avg",
          "V4 Avg"
        ]
      ];

      let totalScripts = 0;
      let totalUploaded = 0;
      let totalPending = 0;
      let totalV1 = 0;
      let totalV1Afv = 0;
      let totalReval = 0;
      let totalV2 = 0;
      let totalV2Afv = 0;
      let totalV3 = 0;
      let totalV3Afv = 0;
      let totalV4Pend = 0;
      let totalV4 = 0;

      const body = filteredRows.map((r, idx) => {
        const s = Number(r.noScripts) || 0;
        const u = Number(r.uploaded) || 0;
        const p = Number(r.pendingUploads) || 0;
        const v1 = Number(r.v1Valuated) || 0;
        const v1a = Number(r.v1Afv ?? r.afv) || 0;
        const rev = Number(r.revalApplied) || 0;
        const v2 = Number(r.v2Valuated) || 0;
        const v2a = Number(r.v2Afv ?? r.v2Pendency) || 0;
        const v3 = Number(r.v3Valuated) || 0;
        const v3a = Number(r.v3Afv ?? r.v3Pendency) || 0;
        const v4p = Number(r.v4Pendency) || 0;
        const v4 = Number(r.v4Valuated) || 0;

        totalScripts += s;
        totalUploaded += u;
        totalPending += p;
        totalV1 += v1;
        totalV1Afv += v1a;
        totalReval += rev;
        totalV2 += v2;
        totalV2Afv += v2a;
        totalV3 += v3;
        totalV3Afv += v3a;
        totalV4Pend += v4p;
        totalV4 += v4;

        return [
          idx + 1,
          r.courseName || "",
          r.subjectCode || "",
          r.subjectName || "",
          s,
          u,
          p,
          v1,
          v1a,
          rev,
          v2,
          v2a,
          v3,
          v3a,
          v4p,
          v4,
          r.v1AvgMarks !== undefined && r.v1AvgMarks !== null ? r.v1AvgMarks : "-",
          r.v2AvgMarks !== undefined && r.v2AvgMarks !== null ? r.v2AvgMarks : "-",
          r.v3AvgMarks !== undefined && r.v3AvgMarks !== null ? r.v3AvgMarks : "-",
          r.v4AvgMarks !== undefined && r.v4AvgMarks !== null ? r.v4AvgMarks : "-"
        ];
      });

      body.push([
        "TOTAL",
        "",
        "",
        "",
        totalScripts,
        totalUploaded,
        totalPending,
        totalV1,
        totalV1Afv,
        totalReval,
        totalV2,
        totalV2Afv,
        totalV3,
        totalV3Afv,
        totalV4Pend,
        totalV4,
        "",
        "",
        "",
        ""
      ]);

      autoTable(doc, {
        head: headers,
        body: body,
        startY: 62,
        theme: "grid",
        styles: {
          fontSize: 7,
          cellPadding: 2.5,
          valign: "middle",
          halign: "center",
          overflow: "linebreak"
        },
        columnStyles: {
          0: { cellWidth: 20 },
          1: { cellWidth: 72, halign: "left" },
          2: { cellWidth: 42, halign: "left" },
          3: { cellWidth: 78, halign: "left" },
          4: { cellWidth: 32 },
          5: { cellWidth: 28 },
          6: { cellWidth: 28 },
          7: { cellWidth: 32 },
          8: { cellWidth: 32 },
          9: { cellWidth: 28 },
          10: { cellWidth: 30 },
          11: { cellWidth: 34 },
          12: { cellWidth: 30 },
          13: { cellWidth: 34 },
          14: { cellWidth: 34 },
          15: { cellWidth: 30 },
          16: { cellWidth: 32 },
          17: { cellWidth: 32 },
          18: { cellWidth: 32 },
          19: { cellWidth: 32 }
        },
        headStyles: {
          fillColor: [30, 64, 175],
          textColor: 255,
          fontStyle: "bold",
          fontSize: 7
        },
        alternateRowStyles: {
          fillColor: [249, 250, 251]
        },
        didParseCell: function (data) {
          if (data.row.index === body.length - 1) {
            data.cell.styles.fontStyle = "bold";
            data.cell.styles.fillColor = [224, 231, 255];
            data.cell.styles.textColor = [30, 58, 138];
          }
        },
        didDrawPage: function (data) {
          const pageCount = doc.internal.getNumberOfPages();
          doc.setFontSize(8);
          doc.setTextColor(156, 163, 175);
          doc.text(
            `Page ${data.pageNumber} of ${pageCount}`,
            doc.internal.pageSize.getWidth() - 40,
            doc.internal.pageSize.getHeight() - 14,
            { align: "right" }
          );
        }
      });

      const fname = `Valuation_Summary_Report_${filters.examcode || "ALL"}_${new Date().toISOString().slice(0, 10)}.pdf`;
      doc.save(fname);
      setSuccessMsg("Valuation Summary Report downloaded in PDF successfully!");
      setTimeout(() => setSuccessMsg(""), 3500);
    } catch (err) {
      console.error("Error exporting PDF:", err);
      setError("Failed to export PDF report.");
    }
  };

  const handleExportCSV = () => {
    const headers = [
      "Sno.", "Course Name", "Subject Code", "Subject Name", "No.Scripts",
      "Uploaded", "Pending Uploads", "V1 Valuated", "V1 AFV", "Reval Applied",
      "V2 Valuated", "V2 AFV (Pendency)", "V3 Valuated", "V3 AFV (Pendency)",
      "V4 Pendency", "V4 Valuated", "V1 Avg Marks", "V2 Avg Marks", "V3 Avg Marks", "V4 Avg Marks"
    ];
    const rows = filteredRows.map((r) => [
      r.sno, `"${(r.courseName || "").replace(/"/g, '""')}"`, r.subjectCode,
      `"${(r.subjectName || "").replace(/"/g, '""')}"`, r.noScripts,
      r.uploaded, r.pendingUploads, r.v1Valuated, r.v1Afv ?? r.afv ?? 0, r.revalApplied,
      r.v2Valuated, r.v2Afv ?? r.v2Pendency ?? 0, r.v3Valuated, r.v3Afv ?? r.v3Pendency ?? 0,
      r.v4Pendency ?? 0, r.v4Valuated ?? 0,
      r.v1AvgMarks ?? "-", r.v2AvgMarks ?? "-", r.v3AvgMarks ?? "-", r.v4AvgMarks ?? "-"
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Valuation_Summary_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  // 3. Download Award List as formatted Excel (.xlsx)
  const handleDownloadAwardListExcel = async (row, valuationtype = "V1") => {
    try {
      setSuccessMsg(`Preparing formatted Excel award list for ${row.subjectCode} (${valuationtype})...`);
      const res = await ep1.get("/api/v2/conductexam2/award-list", {
        params: {
          colid: global1.colid,
          examcode: row.examCode || "",
          coursecode: row.subjectCode || "",
          academicyear: row.academicyear || "",
          valuationtype
        }
      });

      if (!res.data?.success) {
        setError(res.data?.message || `No ${valuationtype} award list data found for this course.`);
        return;
      }

      const { meta, students } = res.data;
      if (!students || students.length === 0) {
        setError(`No evaluated students found for ${valuationtype} in ${row.subjectCode}.`);
        return;
      }

      const wb = XLSX.utils.book_new();

      const sheetData = [
        [meta.institutionName || "PEOPLE'S UNIVERSITY, BHOPAL"],
        ["AWARD LIST - THEORY EXAM"],
        [`Valuation Stage: ${meta.valuationLabel || valuationtype}`],
        [],
        ["Program:", meta.program || "", "Exam:", meta.exam || "", "Paper Code:", meta.paperCode || row.subjectCode],
        ["Paper Name:", meta.paperName || row.subjectName, "Max Marks:", meta.maxMarks || 75, "Date:", meta.date || new Date().toLocaleDateString("en-GB")],
        [],
        ["S.No.", "Control No. (C.N.)", "Enrollment No.", "Student Name", "Marks (In Figures)", "Marks (In Words)", "Evaluator ID", "Evaluator Name"]
      ];

      students.forEach((st, idx) => {
        sheetData.push([
          idx + 1,
          st.cn || "-",
          st.regno || "",
          st.student || "",
          st.inFigure !== undefined && st.inFigure !== null ? st.inFigure : "-",
          st.inWords || "-",
          st.evaluatorid || "-",
          st.evaluatorname || "-"
        ]);
      });

      sheetData.push([]);
      const firstSt = students[0] || {};
      sheetData.push(["Examiner Particulars:"]);
      sheetData.push(["Examiner ID:", firstSt.evaluatorid || "-", "Name:", firstSt.evaluatorname || "-", "Contact:", firstSt.evaluatorcontact || "-"]);
      sheetData.push([]);
      sheetData.push(["Signature of Examiner with Date:", "____________________", "", "Signature of Controller of Examination:", "____________________"]);

      const ws = XLSX.utils.aoa_to_sheet(sheetData);

      ws["!cols"] = [
        { wch: 8 },
        { wch: 18 },
        { wch: 22 },
        { wch: 28 },
        { wch: 18 },
        { wch: 28 },
        { wch: 18 },
        { wch: 26 }
      ];

      XLSX.utils.book_append_sheet(wb, ws, "Award List");
      const fname = `AwardList_${valuationtype}_${row.examCode || ""}_${row.subjectCode || ""}.xlsx`;
      XLSX.writeFile(wb, fname);
      setSuccessMsg(`${valuationtype} Award List downloaded in Excel successfully!`);
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err) {
      console.error("Error downloading award list Excel:", err);
      setError(err.response?.data?.message || "Failed to download Award List in Excel.");
      setTimeout(() => setError(""), 4000);
    }
  };

  // 4. Download Award List as formatted PDF
  const handleDownloadAwardListPdf = async (row, valuationtype = "V1") => {
    try {
      setSuccessMsg(`Preparing formatted PDF award list for ${row.subjectCode} (${valuationtype})...`);
      const res = await ep1.get("/api/v2/conductexam2/award-list", {
        params: {
          colid: global1.colid,
          examcode: row.examCode || "",
          coursecode: row.subjectCode || "",
          academicyear: row.academicyear || "",
          valuationtype
        }
      });

      if (!res.data?.success) {
        setError(res.data?.message || `No ${valuationtype} award list data found for this course.`);
        return;
      }

      const { meta, students } = res.data;
      if (!students || students.length === 0) {
        setError(`No evaluated students found for ${valuationtype} in ${row.subjectCode}.`);
        return;
      }

      const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();

      // University Header
      doc.setFont("helvetica", "bold");
      doc.setFontSize(15);
      doc.setTextColor(17, 24, 39);
      doc.text(meta.institutionName || "PEOPLE'S UNIVERSITY, BHOPAL", pageWidth / 2, 34, { align: "center" });

      doc.setFont("helvetica", "italic");
      doc.setFontSize(8.5);
      doc.setTextColor(107, 114, 128);
      doc.text("(Established Under MP Act 17 of 2007 Covered u/s 2(f) UGC Act)", pageWidth / 2, 48, { align: "center" });

      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(30, 64, 175);
      doc.text("AWARD LIST - THEORY EXAM", pageWidth / 2, 66, { align: "center" });

      doc.setFontSize(10);
      doc.setTextColor(15, 118, 110);
      doc.text(meta.valuationLabel || `Valuation Stage: ${valuationtype}`, pageWidth / 2, 80, { align: "center" });

      // Particulars Box
      doc.setDrawColor(209, 213, 219);
      doc.setFillColor(249, 250, 251);
      doc.roundedRect(36, 92, pageWidth - 72, 54, 3, 3, "FD");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(17, 24, 39);

      doc.text("Program:", 46, 108);
      doc.text("Subject:", 46, 124);
      doc.text("Paper Code:", 46, 140);

      doc.setFont("helvetica", "normal");
      doc.text(String(meta.program || "-"), 105, 108);
      doc.text(String(meta.paperName || row.subjectName || "-"), 105, 124);
      doc.text(String(meta.paperCode || row.subjectCode || "-"), 105, 140);

      doc.setFont("helvetica", "bold");
      doc.text("Exam Session:", 310, 108);
      doc.text("Max Marks:", 310, 124);
      doc.text("Date:", 310, 140);

      doc.setFont("helvetica", "normal");
      doc.text(String(meta.exam || "-"), 380, 108);
      doc.text(String(meta.maxMarks || 75), 380, 124);
      doc.text(String(meta.date || new Date().toLocaleDateString("en-GB")), 380, 140);

      // Student Marks Table
      const headers = [["S.N.", "C.N.", "Enrollment No.", "Student Name", "In Figure", "In Words"]];
      const body = students.map((st, idx) => [
        idx + 1,
        st.cn || "-",
        st.regno || "-",
        st.student || "-",
        st.inFigure !== undefined && st.inFigure !== null ? st.inFigure : "-",
        st.inWords || "-"
      ]);

      autoTable(doc, {
        head: headers,
        body: body,
        startY: 156,
        theme: "grid",
        styles: {
          fontSize: 8.5,
          cellPadding: 4,
          valign: "middle",
          textColor: [17, 24, 39]
        },
        columnStyles: {
          0: { cellWidth: 32, halign: "center" },
          1: { cellWidth: 55, halign: "center", fontStyle: "bold" },
          2: { cellWidth: 95, halign: "center" },
          3: { cellWidth: 155, halign: "left" },
          4: { cellWidth: 55, halign: "center", fontStyle: "bold" },
          5: { cellWidth: 130, halign: "left" }
        },
        headStyles: {
          fillColor: [243, 244, 246],
          textColor: [17, 24, 39],
          fontStyle: "bold",
          fontSize: 8.5,
          lineColor: [156, 163, 175],
          lineWidth: 0.5
        },
        alternateRowStyles: {
          fillColor: [255, 255, 255]
        },
        didDrawPage: function (data) {
          const pageCount = doc.internal.getNumberOfPages();
          doc.setFontSize(8);
          doc.setTextColor(156, 163, 175);
          doc.text(
            `Page ${data.pageNumber} of ${pageCount}`,
            pageWidth - 40,
            doc.internal.pageSize.getHeight() - 15,
            { align: "right" }
          );
        }
      });

      // Verification & Signatures section at bottom
      const finalY = doc.lastAutoTable?.finalY || 220;
      const signatureY = Math.min(finalY + 36, doc.internal.pageSize.getHeight() - 80);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(17, 24, 39);

      const firstSt = students[0] || {};
      doc.text(`Examiner: ${firstSt.evaluatorname || "-"} (${firstSt.evaluatorid || "-"})`, 36, signatureY);
      doc.text("Signature of Examiner with Date", 36, signatureY + 28);
      doc.text("Signature of Assistant Registrar", pageWidth / 2 - 40, signatureY + 28);
      doc.text("Signature of Controller of Examination", pageWidth - 190, signatureY + 28);

      const fname = `AwardList_${valuationtype}_${row.examCode || ""}_${row.subjectCode || ""}.pdf`;
      doc.save(fname);
      setSuccessMsg(`${valuationtype} Award List downloaded in PDF successfully!`);
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err) {
      console.error("Error downloading award list PDF:", err);
      setError(err.response?.data?.message || "Failed to download Award List in PDF.");
      setTimeout(() => setError(""), 4000);
    }
  };

  const handleDownloadAwardList = (row, valuationtype = "V1") => {
    handleDownloadAwardListPdf(row, valuationtype);
  };

  return (
    <MenuPageShell title="Summary Report - Valuation & Re-evaluation Pipeline">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .summary-print-container { width: 100% !important; margin: 0 !important; padding: 0 !important; }
        }
      `}</style>

      <Box sx={{ p: { xs: 1.5, sm: 3 }, maxWidth: 1400, mx: "auto" }}>
        <Stack spacing={2.5}>
          {/* Top Banner Card */}
          <Card elevation={2} className="no-print">
            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                  <Box
                    sx={{
                      width: 44,
                      height: 44,
                      borderRadius: 1.5,
                      bgcolor: "primary.main",
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}
                  >
                    <Assessment fontSize="medium" />
                  </Box>
                  <Box>
                    <Typography variant="h5" sx={{ fontWeight: 800, color: "#111827" }}>
                      Summary Report
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Comprehensive tracking of all papers across Uploading, Initial Valuation (V1), and 3 Re-evaluation steps (V2, V3, V4)
                    </Typography>
                  </Box>
                </Box>

                <Stack direction="row" spacing={1.5}>
                  <Button
                    variant="outlined"
                    startIcon={<Refresh />}
                    onClick={() => fetchReport()}
                    disabled={loading}
                    size="small"
                  >
                    Refresh
                  </Button>
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<ArrowForward />}
                    onClick={() => navigate("/conduct-exam-2-reevaluation")}
                    size="small"
                  >
                    Re-evaluation Desk
                  </Button>
                </Stack>
              </Box>

              {/* Filter Row */}
              <Divider sx={{ my: 2 }} />
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={6} md={3}>
                  <TextField
                    select
                    fullWidth
                    size="small"
                    label="Academic Year"
                    value={filters.academicyear}
                    onChange={(e) => handleFilterChange("academicyear", e.target.value)}
                  >
                    <MenuItem value="">All Academic Years</MenuItem>
                    {options.academicyears.map((yr) => (
                      <MenuItem key={yr} value={yr}>{yr}</MenuItem>
                    ))}
                  </TextField>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <TextField
                    select
                    fullWidth
                    size="small"
                    label="Exam"
                    value={filters.examcode}
                    onChange={(e) => handleFilterChange("examcode", e.target.value)}
                  >
                    <MenuItem value="">All Exams</MenuItem>
                    {options.exams.map((ex) => (
                      <MenuItem key={ex.examcode} value={ex.examcode}>{ex.exam} ({ex.examcode})</MenuItem>
                    ))}
                  </TextField>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <TextField
                    select
                    fullWidth
                    size="small"
                    label="Course / Subject"
                    value={filters.coursecode}
                    onChange={(e) => handleFilterChange("coursecode", e.target.value)}
                  >
                    <MenuItem value="">All Courses</MenuItem>
                    {options.courses.map((c) => (
                      <MenuItem key={c.coursecode} value={c.coursecode}>{c.course} ({c.coursecode})</MenuItem>
                    ))}
                  </TextField>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <Button
                    variant="contained"
                    fullWidth
                    onClick={() => fetchReport()}
                    disabled={loading}
                    sx={{ height: 40, fontWeight: 700 }}
                  >
                    {loading ? <CircularProgress size={22} color="inherit" /> : "Apply Filter"}
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Alerts */}
          {error && <Alert severity="error" className="no-print" onClose={() => setError("")}>{error}</Alert>}
          {successMsg && <Alert severity="success" className="no-print" onClose={() => setSuccessMsg("")}>{successMsg}</Alert>}

          {/* Table Container Card (Matching Reference Layout) */}
          <Paper elevation={2} className="summary-print-container" sx={{ borderRadius: 1.5, overflow: "hidden" }}>
            {/* Action Toolbar Header (Copy, Excel, CSV, PDF, Print, Search) */}
            <Box
              className="no-print"
              sx={{
                p: 2,
                bgcolor: "#f9fafb",
                borderBottom: "1px solid #e5e7eb",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 1.5
              }}
            >
              {/* Export Buttons */}
              <Stack direction="row" spacing={1} alignItems="center">
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<ContentCopy fontSize="small" />}
                  onClick={handleCopy}
                  sx={{ textTransform: "none", bgcolor: "#fff" }}
                >
                  Copy
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  color="success"
                  startIcon={<TableChart fontSize="small" />}
                  onClick={handleExportExcel}
                  sx={{ textTransform: "none", fontWeight: 700 }}
                >
                  Excel (.xlsx)
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  color="error"
                  startIcon={<PictureAsPdf fontSize="small" />}
                  onClick={handleExportPDF}
                  sx={{ textTransform: "none", fontWeight: 700 }}
                >
                  PDF
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<FileDownload fontSize="small" />}
                  onClick={handleExportCSV}
                  sx={{ textTransform: "none", bgcolor: "#fff" }}
                >
                  CSV
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<Print fontSize="small" />}
                  onClick={handlePrint}
                  sx={{ textTransform: "none", bgcolor: "#fff" }}
                >
                  Print
                </Button>
              </Stack>

              {/* Search Bar */}
              <Box sx={{ width: { xs: "100%", sm: 260 } }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search fontSize="small" color="action" />
                      </InputAdornment>
                    )
                  }}
                  sx={{ bgcolor: "#fff" }}
                />
              </Box>
            </Box>

            {/* Main Summary Table */}
            <TableContainer sx={{ maxHeight: "75vh" }}>
              <Table stickyHeader size="small" sx={{ minWidth: 1100 }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800, bgcolor: "#f3f4f6", width: 50, textAlign: "center" }}>Sno.</TableCell>
                    <TableCell sx={{ fontWeight: 800, bgcolor: "#f3f4f6", minWidth: 180 }}>Course Name</TableCell>
                    <TableCell sx={{ fontWeight: 800, bgcolor: "#f3f4f6", minWidth: 110 }}>Subject Code</TableCell>
                    <TableCell sx={{ fontWeight: 800, bgcolor: "#f3f4f6", minWidth: 160 }}>Subject Name</TableCell>
                    <TableCell sx={{ fontWeight: 800, bgcolor: "#f3f4f6", textAlign: "center" }}>No.Scripts</TableCell>
                    <TableCell sx={{ fontWeight: 800, bgcolor: "#f3f4f6", textAlign: "center" }}>Uploaded</TableCell>
                    <TableCell sx={{ fontWeight: 800, bgcolor: "#f3f4f6", textAlign: "center" }}>Pending Uploads</TableCell>
                    <TableCell sx={{ fontWeight: 800, bgcolor: "#eff6ff", color: "#1e40af", textAlign: "center" }}>V1 Valuated</TableCell>
                    <TableCell sx={{ fontWeight: 800, bgcolor: "#fef3c7", color: "#92400e", textAlign: "center" }}>V1 AFV</TableCell>
                    <TableCell sx={{ fontWeight: 800, bgcolor: "#f3f4f6", textAlign: "center" }}>Reval Applied</TableCell>
                    <TableCell sx={{ fontWeight: 800, bgcolor: "#f0fdf4", color: "#166534", textAlign: "center" }}>V2 Valuated</TableCell>
                    <TableCell sx={{ fontWeight: 800, bgcolor: "#fef9c3", color: "#854d0e", textAlign: "center" }}>
                      V2 AFV
                      <Typography component="span" sx={{ fontSize: "10px", display: "block", color: "text.secondary", fontWeight: 600 }}>
                        (Pendency)
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 800, bgcolor: "#f0fdf4", color: "#166534", textAlign: "center" }}>V3 Valuated</TableCell>
                    <TableCell sx={{ fontWeight: 800, bgcolor: "#fef9c3", color: "#854d0e", textAlign: "center" }}>
                      V3 AFV
                      <Typography component="span" sx={{ fontSize: "10px", display: "block", color: "text.secondary", fontWeight: 600 }}>
                        (Pendency)
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 800, bgcolor: "#fff1f2", color: "#9f1239", textAlign: "center" }}>V4 Pendency</TableCell>
                    <TableCell sx={{ fontWeight: 800, bgcolor: "#fdf2f8", color: "#9d174d", textAlign: "center" }}>V4 Valuated</TableCell>
                    <TableCell sx={{ fontWeight: 800, bgcolor: "#eff6ff", color: "#1e40af", textAlign: "center", minWidth: 145 }}>
                      V1 Award List
                    </TableCell>
                    <TableCell sx={{ fontWeight: 800, bgcolor: "#f0fdf4", color: "#166534", textAlign: "center", minWidth: 145 }}>
                      V2 Award List
                    </TableCell>
                    <TableCell sx={{ fontWeight: 800, bgcolor: "#f0fdf4", color: "#166534", textAlign: "center", minWidth: 145 }}>
                      V3 Award List
                    </TableCell>
                    <TableCell sx={{ fontWeight: 800, bgcolor: "#fdf2f8", color: "#9d174d", textAlign: "center", minWidth: 145 }}>
                      V4 Award List
                    </TableCell>
                    <TableCell sx={{ fontWeight: 800, bgcolor: "#eff6ff", color: "#1e40af", textAlign: "center", minWidth: 100 }}>V1 Marks (Avg)</TableCell>
                    <TableCell sx={{ fontWeight: 800, bgcolor: "#f0fdf4", color: "#166534", textAlign: "center", minWidth: 100 }}>V2 Marks (Avg)</TableCell>
                    <TableCell sx={{ fontWeight: 800, bgcolor: "#fdf4ff", color: "#7e22ce", textAlign: "center", minWidth: 100 }}>V3 Marks (Avg)</TableCell>
                    <TableCell sx={{ fontWeight: 800, bgcolor: "#fff1f2", color: "#be123c", textAlign: "center", minWidth: 100 }}>V4 Marks (Avg)</TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={24} sx={{ textAlign: "center", py: 5 }}>
                        <CircularProgress size={36} />
                        <Typography variant="body2" sx={{ mt: 1.5 }} color="text.secondary">
                          Loading Valuation Summary Report...
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : filteredRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={24} sx={{ textAlign: "center", py: 5, color: "#6b7280" }}>
                        No examination courses found matching the selected filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRows.map((row) => {
                      const v1Disabled = (row.v1Valuated ?? 0) === 0;
                      const hasReval = (row.revalApplied ?? 0) > 0;
                      const v2Disabled = !hasReval || (row.v2Valuated ?? 0) === 0;
                      const v3Disabled = !hasReval || (row.v3Valuated ?? 0) === 0;
                      const v4Disabled = !hasReval || (row.v4Valuated ?? 0) === 0;

                      const v1Tooltip = v1Disabled
                        ? "No V1 initial valuation marks entered yet"
                        : "Download V1 Award List (CSV)";
                      const v2Tooltip = !hasReval
                        ? "No student applied for re-evaluation in this course"
                        : (row.v2Valuated ?? 0) === 0
                        ? "Re-evaluation 1 (V2) marks not evaluated yet"
                        : "Download V2 Award List (CSV)";
                      const v3Tooltip = !hasReval
                        ? "No student applied for re-evaluation in this course"
                        : (row.v3Valuated ?? 0) === 0
                        ? "Re-evaluation 2 (V3) marks not evaluated yet"
                        : "Download V3 Award List (CSV)";
                      const v4Tooltip = !hasReval
                        ? "No student applied for re-evaluation in this course"
                        : (row.v4Valuated ?? 0) === 0
                        ? "Re-evaluation 3 (V4) marks not evaluated / not required"
                        : "Download V4 Award List (CSV)";

                      return (
                        <TableRow key={row.sno} hover sx={{ "&:nth-of-type(even)": { bgcolor: "#fafafa" } }}>
                          <TableCell sx={{ textAlign: "center", fontWeight: 600 }}>{row.sno}</TableCell>
                          <TableCell sx={{ fontWeight: 600, color: "#111827" }}>{row.courseName}</TableCell>
                          <TableCell sx={{ fontWeight: 700, color: "#1f2937" }}>{row.subjectCode}</TableCell>
                          <TableCell>{row.subjectName}</TableCell>
                          <TableCell sx={{ textAlign: "center", fontWeight: 700 }}>{row.noScripts}</TableCell>
                          <TableCell sx={{ textAlign: "center", color: row.uploaded > 0 ? "success.main" : "text.secondary", fontWeight: 600 }}>
                            {row.uploaded}
                          </TableCell>
                          <TableCell sx={{ textAlign: "center", color: row.pendingUploads > 0 ? "error.main" : "text.secondary", fontWeight: 600 }}>
                            {row.pendingUploads}
                          </TableCell>
                          <TableCell sx={{ textAlign: "center", bgcolor: "#eff6ff", fontWeight: 700, color: "#1d4ed8" }}>
                            {row.v1Valuated > 0 ? (
                              <Tooltip title="Download V1 Award List (PDF)" arrow>
                                <Typography
                                  component="span"
                                  onClick={() => handleDownloadAwardListPdf(row, "V1")}
                                  sx={{
                                    cursor: "pointer",
                                    fontWeight: 800,
                                    textDecoration: "underline",
                                    "&:hover": { color: "#1e3a8a" }
                                  }}
                                >
                                  {row.v1Valuated}
                                </Typography>
                              </Tooltip>
                            ) : (
                              row.v1Valuated
                            )}
                          </TableCell>
                          <TableCell sx={{ textAlign: "center", bgcolor: "#fef3c7", fontWeight: 700, color: "#b45309" }}>
                            {row.v1Afv ?? row.afv ?? 0}
                          </TableCell>
                          <TableCell sx={{ textAlign: "center", fontWeight: 600 }}>
                            {row.revalApplied > 0 ? (
                              <Chip label={row.revalApplied} size="small" color="secondary" sx={{ fontWeight: 700 }} />
                            ) : (
                              "0"
                            )}
                          </TableCell>
                          <TableCell sx={{ textAlign: "center", bgcolor: "#f0fdf4", fontWeight: 700, color: "#15803d" }}>
                            {row.v2Valuated > 0 ? (
                              <Tooltip title="Download V2 Award List (PDF)" arrow>
                                <Typography
                                  component="span"
                                  onClick={() => handleDownloadAwardListPdf(row, "V2")}
                                  sx={{
                                    cursor: "pointer",
                                    fontWeight: 800,
                                    textDecoration: "underline",
                                    "&:hover": { color: "#14532d" }
                                  }}
                                >
                                  {row.v2Valuated}
                                </Typography>
                              </Tooltip>
                            ) : (
                              row.v2Valuated
                            )}
                          </TableCell>
                          <TableCell sx={{ textAlign: "center", bgcolor: "#fef9c3", fontWeight: 700, color: "#854d0e" }}>
                            {row.v2Afv ?? row.v2Pendency ?? 0}
                          </TableCell>
                          <TableCell sx={{ textAlign: "center", bgcolor: "#f0fdf4", fontWeight: 700, color: "#15803d" }}>
                            {row.v3Valuated > 0 ? (
                              <Tooltip title="Download V3 Award List (PDF)" arrow>
                                <Typography
                                  component="span"
                                  onClick={() => handleDownloadAwardListPdf(row, "V3")}
                                  sx={{
                                    cursor: "pointer",
                                    fontWeight: 800,
                                    textDecoration: "underline",
                                    "&:hover": { color: "#14532d" }
                                  }}
                                >
                                  {row.v3Valuated}
                                </Typography>
                              </Tooltip>
                            ) : (
                              row.v3Valuated
                            )}
                          </TableCell>
                          <TableCell sx={{ textAlign: "center", bgcolor: "#fef9c3", fontWeight: 700, color: "#854d0e" }}>
                            {row.v3Afv ?? row.v3Pendency ?? 0}
                          </TableCell>
                          <TableCell sx={{ textAlign: "center", bgcolor: "#fff1f2", fontWeight: 700, color: "#be123c" }}>
                            {row.v4Pendency ?? 0}
                          </TableCell>
                          <TableCell sx={{ textAlign: "center", bgcolor: "#fdf2f8", fontWeight: 700, color: "#be185d" }}>
                            {row.v4Valuated > 0 ? (
                              <Tooltip title="Download V4 Award List (PDF)" arrow>
                                <Typography
                                  component="span"
                                  onClick={() => handleDownloadAwardListPdf(row, "V4")}
                                  sx={{
                                    cursor: "pointer",
                                    fontWeight: 800,
                                    textDecoration: "underline",
                                    "&:hover": { color: "#831843" }
                                  }}
                                >
                                  {row.v4Valuated}
                                </Typography>
                              </Tooltip>
                            ) : (
                              row.v4Valuated
                            )}
                          </TableCell>
                          {/* V1 Award List */}
                          <TableCell sx={{ textAlign: "center", bgcolor: "#f8fafc" }}>
                            <Stack direction="row" spacing={0.6} justifyContent="center" alignItems="center">
                              <Tooltip title={v1Disabled ? v1Tooltip : "Download V1 Award List in Excel (.xlsx)"} arrow>
                                <span>
                                  <Button
                                    size="small"
                                    variant={v1Disabled ? "outlined" : "contained"}
                                    color="success"
                                    disabled={v1Disabled}
                                    startIcon={<TableChart sx={{ fontSize: "13px !important" }} />}
                                    onClick={() => handleDownloadAwardListExcel(row, "V1")}
                                    sx={{
                                      minWidth: 54,
                                      px: 0.8,
                                      py: 0.3,
                                      fontSize: "11px",
                                      fontWeight: 700,
                                      textTransform: "none",
                                      boxShadow: v1Disabled ? "none" : undefined
                                    }}
                                  >
                                    Excel
                                  </Button>
                                </span>
                              </Tooltip>
                              <Tooltip title={v1Disabled ? v1Tooltip : "Download V1 Award List in PDF"} arrow>
                                <span>
                                  <Button
                                    size="small"
                                    variant={v1Disabled ? "outlined" : "contained"}
                                    color="error"
                                    disabled={v1Disabled}
                                    startIcon={<PictureAsPdf sx={{ fontSize: "13px !important" }} />}
                                    onClick={() => handleDownloadAwardListPdf(row, "V1")}
                                    sx={{
                                      minWidth: 50,
                                      px: 0.8,
                                      py: 0.3,
                                      fontSize: "11px",
                                      fontWeight: 700,
                                      textTransform: "none",
                                      boxShadow: v1Disabled ? "none" : undefined
                                    }}
                                  >
                                    PDF
                                  </Button>
                                </span>
                              </Tooltip>
                            </Stack>
                          </TableCell>

                          {/* V2 Award List */}
                          <TableCell sx={{ textAlign: "center", bgcolor: "#f8fafc" }}>
                            <Stack direction="row" spacing={0.6} justifyContent="center" alignItems="center">
                              <Tooltip title={v2Disabled ? v2Tooltip : "Download V2 Award List in Excel (.xlsx)"} arrow>
                                <span>
                                  <Button
                                    size="small"
                                    variant={v2Disabled ? "outlined" : "contained"}
                                    color="success"
                                    disabled={v2Disabled}
                                    startIcon={<TableChart sx={{ fontSize: "13px !important" }} />}
                                    onClick={() => handleDownloadAwardListExcel(row, "V2")}
                                    sx={{
                                      minWidth: 54,
                                      px: 0.8,
                                      py: 0.3,
                                      fontSize: "11px",
                                      fontWeight: 700,
                                      textTransform: "none",
                                      boxShadow: v2Disabled ? "none" : undefined
                                    }}
                                  >
                                    Excel
                                  </Button>
                                </span>
                              </Tooltip>
                              <Tooltip title={v2Disabled ? v2Tooltip : "Download V2 Award List in PDF"} arrow>
                                <span>
                                  <Button
                                    size="small"
                                    variant={v2Disabled ? "outlined" : "contained"}
                                    color="error"
                                    disabled={v2Disabled}
                                    startIcon={<PictureAsPdf sx={{ fontSize: "13px !important" }} />}
                                    onClick={() => handleDownloadAwardListPdf(row, "V2")}
                                    sx={{
                                      minWidth: 50,
                                      px: 0.8,
                                      py: 0.3,
                                      fontSize: "11px",
                                      fontWeight: 700,
                                      textTransform: "none",
                                      boxShadow: v2Disabled ? "none" : undefined
                                    }}
                                  >
                                    PDF
                                  </Button>
                                </span>
                              </Tooltip>
                            </Stack>
                          </TableCell>

                          {/* V3 Award List */}
                          <TableCell sx={{ textAlign: "center", bgcolor: "#f8fafc" }}>
                            <Stack direction="row" spacing={0.6} justifyContent="center" alignItems="center">
                              <Tooltip title={v3Disabled ? v3Tooltip : "Download V3 Award List in Excel (.xlsx)"} arrow>
                                <span>
                                  <Button
                                    size="small"
                                    variant={v3Disabled ? "outlined" : "contained"}
                                    color="success"
                                    disabled={v3Disabled}
                                    startIcon={<TableChart sx={{ fontSize: "13px !important" }} />}
                                    onClick={() => handleDownloadAwardListExcel(row, "V3")}
                                    sx={{
                                      minWidth: 54,
                                      px: 0.8,
                                      py: 0.3,
                                      fontSize: "11px",
                                      fontWeight: 700,
                                      textTransform: "none",
                                      boxShadow: v3Disabled ? "none" : undefined
                                    }}
                                  >
                                    Excel
                                  </Button>
                                </span>
                              </Tooltip>
                              <Tooltip title={v3Disabled ? v3Tooltip : "Download V3 Award List in PDF"} arrow>
                                <span>
                                  <Button
                                    size="small"
                                    variant={v3Disabled ? "outlined" : "contained"}
                                    color="error"
                                    disabled={v3Disabled}
                                    startIcon={<PictureAsPdf sx={{ fontSize: "13px !important" }} />}
                                    onClick={() => handleDownloadAwardListPdf(row, "V3")}
                                    sx={{
                                      minWidth: 50,
                                      px: 0.8,
                                      py: 0.3,
                                      fontSize: "11px",
                                      fontWeight: 700,
                                      textTransform: "none",
                                      boxShadow: v3Disabled ? "none" : undefined
                                    }}
                                  >
                                    PDF
                                  </Button>
                                </span>
                              </Tooltip>
                            </Stack>
                          </TableCell>

                          {/* V4 Award List */}
                          <TableCell sx={{ textAlign: "center", bgcolor: "#f8fafc" }}>
                            <Stack direction="row" spacing={0.6} justifyContent="center" alignItems="center">
                              <Tooltip title={v4Disabled ? v4Tooltip : "Download V4 Award List in Excel (.xlsx)"} arrow>
                                <span>
                                  <Button
                                    size="small"
                                    variant={v4Disabled ? "outlined" : "contained"}
                                    color="success"
                                    disabled={v4Disabled}
                                    startIcon={<TableChart sx={{ fontSize: "13px !important" }} />}
                                    onClick={() => handleDownloadAwardListExcel(row, "V4")}
                                    sx={{
                                      minWidth: 54,
                                      px: 0.8,
                                      py: 0.3,
                                      fontSize: "11px",
                                      fontWeight: 700,
                                      textTransform: "none",
                                      boxShadow: v4Disabled ? "none" : undefined
                                    }}
                                  >
                                    Excel
                                  </Button>
                                </span>
                              </Tooltip>
                              <Tooltip title={v4Disabled ? v4Tooltip : "Download V4 Award List in PDF"} arrow>
                                <span>
                                  <Button
                                    size="small"
                                    variant={v4Disabled ? "outlined" : "contained"}
                                    color="error"
                                    disabled={v4Disabled}
                                    startIcon={<PictureAsPdf sx={{ fontSize: "13px !important" }} />}
                                    onClick={() => handleDownloadAwardListPdf(row, "V4")}
                                    sx={{
                                      minWidth: 50,
                                      px: 0.8,
                                      py: 0.3,
                                      fontSize: "11px",
                                      fontWeight: 700,
                                      textTransform: "none",
                                      boxShadow: v4Disabled ? "none" : undefined
                                    }}
                                  >
                                    PDF
                                  </Button>
                                </span>
                              </Tooltip>
                            </Stack>
                          </TableCell>
                          <TableCell sx={{ textAlign: "center", fontWeight: 700 }}>{row.v1AvgMarks ?? "–"}</TableCell>
                          <TableCell sx={{ textAlign: "center", fontWeight: 700 }}>{row.v2AvgMarks ?? "–"}</TableCell>
                          <TableCell sx={{ textAlign: "center", fontWeight: 700 }}>{row.v3AvgMarks ?? "–"}</TableCell>
                          <TableCell sx={{ textAlign: "center", fontWeight: 700 }}>{row.v4AvgMarks ?? "–"}</TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Stack>
      </Box>
    </MenuPageShell>
  );
}
