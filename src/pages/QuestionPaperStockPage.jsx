import React, { useCallback, useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import {
  Alert,
  Box,
  Button,
  ButtonGroup,
  Card,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  LinearProgress,
  MenuItem,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography
} from "@mui/material";
import { DataGrid, GridToolbar } from "@mui/x-data-grid";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import PrintIcon from "@mui/icons-material/Print";
import RefreshIcon from "@mui/icons-material/Refresh";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import DownloadIcon from "@mui/icons-material/Download";
import InventoryIcon from "@mui/icons-material/Inventory";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ep1 from "../api/ep1";
import global1 from "./global1";
import MenuPageShell from "./MenuPageShell";

/* ─── helpers ─────────────────────────────────────────── */
const colid = () => global1.colid || 3090;
const uniq = (arr) => [...new Set(arr.map((v) => String(v || "").trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));

const BLANK = {
  academicyear: "",
  regulation: "",
  program: "",
  programcode: "",
  branch: "",
  semester: "",
  dateoflastexam: "",
  sno: "",
  papercode: "",
  papername: "",
  papersettername: "",
  papercategory: "",
  address: "",
  mainusedstatus: "",
  atktusedstatus: "",
  stockmonth: "",
  stockyear: "",
  stockmonthyear: "",
  contactnumber: "",
  submissionmode: "Soft Copy",
  examinercode: "",
  email: "",
  papertype: "Main",
  status: "Available Soft copy",
  faculty: "",
  remarks: ""
};

const CATEGORY_OPTIONS = ["A", "B", "C", "D"];
const SUBMISSION_OPTIONS = ["Hard Copy", "Soft Copy", "Both", "Email", "Other"];
const PAPERTYPE_OPTIONS = ["Main", "ATKT"];
const STATUS_OPTIONS = ["Available Soft copy", "Moderated Available", "Moderated Main", "Moderated ATKT", "Used"];

/* ─── Excel template headers ───────────────────────────── */
const TEMPLATE_HEADERS = [
  "academicyear", "regulation", "program", "programcode", "semester",
  "sno", "papercode", "papername", "papersettername", "papercategory",
  "address", "mainusedstatus", "atktusedstatus", "stockmonthyear",
  "contactnumber", "submissionmode", "examinercode", "email", "papertype", "status"
];

/* ─── Component ─────────────────────────────────────────── */
export default function QuestionPaperStockPage() {
  const [tab, setTab] = useState(0);  // 0=List, 1=Add/Edit, 2=Bulk Upload, 3=Stock Report
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({ ...BLANK });
  const [editId, setEditId] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [options, setOptions] = useState({ academicyears: [], regulations: [], programs: [], semesters: [] });

  /* filters for list/report */
  const [filterAY, setFilterAY] = useState("");
  const [filterProg, setFilterProg] = useState("");
  const [filterSem, setFilterSem] = useState("");
  const [filterFaculty, setFilterFaculty] = useState("Mgmt");

  /* bulk upload state */
  const [bulkRows, setBulkRows] = useState([]);
  const [bulkError, setBulkError] = useState("");
  const [bulkSuccess, setBulkSuccess] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);

  /* ── Unused report state ── */
  const [unusedRows, setUnusedRows] = useState([]);
  const [loadingUnused, setLoadingUnused] = useState(false);

  /* ── Mark as Used Dialog state ── */
  const [markUsedDialog, setMarkUsedDialog] = useState(false);
  const [markUsedRow, setMarkUsedRow] = useState(null);
  const [markUsedForm, setMarkUsedForm] = useState({
    usedtype: "Main",
    examdate: "",
    dateoflastexam: "",
    remarks: ""
  });
  const [savingMarkUsed, setSavingMarkUsed] = useState(false);

  /* ── data loading ── */
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const res = await ep1.get("/api/v2/conductexam/question-paper-stock", { params: { colid: colid() } });
      setRows(res.data?.data || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load data.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadOptions = useCallback(async () => {
    try {
      const res = await ep1.get("/api/v2/conductexam/question-paper-stock-options", { params: { colid: colid() } });
      setOptions(res.data || {});
    } catch { /* ignore */ }
  }, []);

  const loadUnusedReport = useCallback(async () => {
    try {
      setLoadingUnused(true);
      const params = { colid: colid() };
      if (filterAY) params.academicyear = filterAY;
      if (filterProg) params.program = filterProg;
      if (filterSem) params.semester = filterSem;
      if (filterFaculty) params.faculty = filterFaculty;
      const res = await ep1.get("/api/v2/conductexam/question-paper-stock-unused-report", { params });
      setUnusedRows(res.data?.data || []);
    } catch (err) {
      console.error("Failed to load unused stock report:", err.message);
    } finally {
      setLoadingUnused(false);
    }
  }, [filterAY, filterProg, filterSem, filterFaculty]);

  useEffect(() => {
    loadData();
    loadOptions();
  }, [loadData, loadOptions]);

  useEffect(() => {
    if (tab === 4) {
      loadUnusedReport();
    }
  }, [tab, loadUnusedReport]);

  /* ── mark as used handlers ── */
  const handleOpenMarkUsed = (row) => {
    setMarkUsedRow(row);
    setMarkUsedForm({
      usedtype: row.papertype === "ATKT" ? "ATKT" : "Main",
      examdate: "",
      dateoflastexam: row.dateoflastexam || "",
      remarks: row.remarks || row.examinercode || ""
    });
    setMarkUsedDialog(true);
  };

  const handleSaveMarkUsed = async () => {
    if (!markUsedRow) return;
    try {
      setSavingMarkUsed(true);
      await ep1.post("/api/v2/conductexam/question-paper-stock-mark-used", {
        _id: markUsedRow._id,
        colid: colid(),
        usedtype: markUsedForm.usedtype,
        examdate: markUsedForm.examdate,
        dateoflastexam: markUsedForm.dateoflastexam,
        remarks: markUsedForm.remarks,
        user: global1.name || ""
      });
      setSuccess("Question paper stock marked successfully.");
      setMarkUsedDialog(false);
      loadData();
      if (tab === 4) loadUnusedReport();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update stock status.");
    } finally {
      setSavingMarkUsed(false);
    }
  };

  /* ── Excel export for Unused Stock Report matching E:/unused_stock_report.xlsx ── */
  const handleExportUnusedExcel = () => {
    const headerRow0 = ["Status of Unused Question Paper Stock after every Examination"];
    const headerRow1 = ["Faculty", "", filterFaculty || "Mgmt", "", "", "", "", " -", "", "Stock Updated on ", "", new Date().toLocaleDateString("en-GB")];
    const headerRow2 = [
      "S No", "Program", "Scheme", "Branch/Speciality", "Year/Semester", "Date of Last Exam",
      "Paper Code", "Month", "Year", "Category", "Main", "Suppl", "Mode", "Remark"
    ];
    const headerRow3 = ["", "", "", "", "", "", "", "", "", "", "", "", "Soft/Hard Copy", ""];

    const list = unusedRows.length > 0 ? unusedRows : rows;
    const dataRows = list.map((r, i) => [
      r.sno || i + 1,
      r.program || "",
      r.scheme || r.academicyear || "",
      r.branch || "N/A",
      r.semester || "",
      r.dateoflastexam || " -",
      r.papercode || "",
      r.month || (r.stockmonthyear ? r.stockmonthyear.split("-")[0] : " -"),
      r.year || (r.stockmonthyear ? (r.stockmonthyear.includes("-") ? ("20" + r.stockmonthyear.split("-")[1]) : r.stockmonthyear) : (r.scheme || r.academicyear || " -")),
      r.category || r.papercategory || " -",
      r.mainusedstatus || (r.status?.includes("Main") ? r.status : "Available Main"),
      r.atktusedstatus || (r.status?.includes("ATKT") ? r.status : "Available Suppl."),
      r.mode || r.submissionmode || "Soft Copy",
      r.remark || r.remarks || r.examinercode || " -"
    ]);

    const aoa = [headerRow0, headerRow1, headerRow2, headerRow3, ...dataRows];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws["!merges"] = [
      { s: { c: 0, r: 0 }, e: { c: 13, r: 0 } },
      { s: { c: 0, r: 1 }, e: { c: 1, r: 1 } },
      { s: { c: 9, r: 1 }, e: { c: 10, r: 1 } },
      { s: { c: 0, r: 2 }, e: { c: 0, r: 3 } },
      { s: { c: 1, r: 2 }, e: { c: 1, r: 3 } },
      { s: { c: 2, r: 2 }, e: { c: 2, r: 3 } },
      { s: { c: 3, r: 2 }, e: { c: 3, r: 3 } },
      { s: { c: 4, r: 2 }, e: { c: 4, r: 3 } },
      { s: { c: 5, r: 2 }, e: { c: 5, r: 3 } },
      { s: { c: 6, r: 2 }, e: { c: 6, r: 3 } },
      { s: { c: 7, r: 2 }, e: { c: 7, r: 3 } },
      { s: { c: 8, r: 2 }, e: { c: 8, r: 3 } },
      { s: { c: 9, r: 2 }, e: { c: 9, r: 3 } },
      { s: { c: 10, r: 2 }, e: { c: 10, r: 3 } },
      { s: { c: 11, r: 2 }, e: { c: 11, r: 3 } },
      { s: { c: 13, r: 2 }, e: { c: 13, r: 3 } }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "UnusedStockReport");
    XLSX.writeFile(wb, "unused_question_paper_stock_report.xlsx");
  };

  /* ── form helpers ── */
  const handleFormChange = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleEdit = (row) => {
    setForm({
      academicyear: row.academicyear || "",
      regulation: row.regulation || "",
      program: row.program || "",
      programcode: row.programcode || "",
      branch: row.branch || "",
      semester: row.semester || "",
      dateoflastexam: row.dateoflastexam || "",
      sno: row.sno || "",
      papercode: row.papercode || "",
      papername: row.papername || "",
      papersettername: row.papersettername || "",
      papercategory: row.papercategory || "",
      address: row.address || "",
      mainusedstatus: row.mainusedstatus || "",
      atktusedstatus: row.atktusedstatus || "",
      stockmonth: row.stockmonth || "",
      stockyear: row.stockyear || "",
      stockmonthyear: row.stockmonthyear || "",
      contactnumber: row.contactnumber || "",
      submissionmode: row.submissionmode || "",
      examinercode: row.examinercode || "",
      email: row.email || "",
      papertype: row.papertype || "",
      status: row.status || "Available Soft copy",
      faculty: row.faculty || "",
      remarks: row.remarks || ""
    });
    setEditId(row._id);
    setTab(1);
  };

  const handleClearForm = () => { setForm({ ...BLANK }); setEditId(null); };

  /* ── save ── */
  const handleSave = async () => {
    if (!form.academicyear || !form.program || !form.semester || !form.papername) {
      setError("Academic Year, Program, Semester, and Paper Name are required.");
      return;
    }
    try {
      setSaving(true);
      setError("");
      setSuccess("");
      const payload = { ...form, colid: colid(), user: global1.name || "" };
      if (editId) payload._id = editId;
      await ep1.post("/api/v2/conductexam/question-paper-stock", payload);
      setSuccess(editId ? "Record updated successfully." : "Record saved successfully.");
      handleClearForm();
      loadData();
      loadOptions();
      setTab(0);
    } catch (err) {
      setError(err.response?.data?.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  /* ── delete ── */
  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      setLoading(true);
      await ep1.post("/api/v2/conductexam/question-paper-stock-delete", { _id: deleteConfirm, colid: colid() });
      setSuccess("Record deleted.");
      setDeleteConfirm(null);
      loadData();
      loadOptions();
    } catch (err) {
      setError(err.response?.data?.message || "Delete failed.");
    } finally {
      setLoading(false);
    }
  };

  /* ── filtered rows ── */
  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (filterAY && r.academicyear !== filterAY) return false;
      if (filterProg && r.program !== filterProg) return false;
      if (filterSem && r.semester !== filterSem) return false;
      return true;
    });
  }, [rows, filterAY, filterProg, filterSem]);

  /* ── DataGrid columns ── */
  const columns = [
    { field: "sno", headerName: "S.No", width: 60, type: "number" },
    { field: "academicyear", headerName: "Acad. Year", width: 110 },
    { field: "program", headerName: "Program", width: 170 },
    { field: "semester", headerName: "Semester", width: 100 },
    { field: "papercode", headerName: "Paper Code", width: 110 },
    { field: "papername", headerName: "Paper Name", width: 220, flex: 1 },
    { field: "papertype", headerName: "Paper Type", width: 100 },
    {
      field: "status",
      headerName: "Status",
      width: 170,
      renderCell: (params) => {
        const val = params.value || "Available Soft copy";
        const color = val.includes("Used") ? "success" : val.includes("Moderated") ? "secondary" : "info";
        return <Chip label={val} color={color} size="small" variant="outlined" sx={{ fontWeight: 600 }} />;
      }
    },
    { field: "papersettername", headerName: "Paper Setter", width: 160 },
    { field: "examinercode", headerName: "Examiner Code", width: 120 },
    { field: "papercategory", headerName: "Category", width: 80 },
    { field: "mainusedstatus", headerName: "Main Used/Unused", width: 180 },
    { field: "atktusedstatus", headerName: "ATKT Used/Unused", width: 180 },
    { field: "stockmonthyear", headerName: "Stock Month/Year", width: 140 },
    { field: "submissionmode", headerName: "Submission", width: 120 },
    {
      field: "_actions",
      headerName: "Actions",
      width: 135,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <Stack direction="row" spacing={0.5}>
          <Tooltip title="Mark as Used / Update Status">
            <IconButton size="small" color="success" onClick={() => handleOpenMarkUsed(params.row)}>
              <EventAvailableIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Edit">
            <IconButton size="small" color="primary" onClick={() => handleEdit(params.row)}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton size="small" color="error" onClick={() => setDeleteConfirm(params.row._id)}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      )
    }
  ];

  /* ── Excel template download ── */
  const handleDownloadTemplate = () => {
    const sampleRow = {
      academicyear: "2021-22", regulation: "CBCS 2018", program: "B.Sc. Biotechnology",
      programcode: "BSC-BT", semester: "I Sem", sno: 1,
      papercode: "BT-101", papername: "Cell Biology", papersettername: "Dr. A. Sharma",
      papercategory: "A", address: "Bhopal, MP",
      mainusedstatus: "Used in Exam Sep, 2020", atktusedstatus: "Unused",
      stockmonthyear: "Jan-22", contactnumber: "9876543210",
      submissionmode: "Hard Copy", examinercode: "EX001", email: "examiner@example.com"
    };
    const ws = XLSX.utils.json_to_sheet([sampleRow], { header: TEMPLATE_HEADERS });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "QuestionPaperStock");
    XLSX.writeFile(wb, "question_paper_stock_template.xlsx");
  };

  /* ── Bulk upload parse ── */
  const handleBulkFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setBulkError("");
    setBulkSuccess("");
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target.result, { type: "array" });
        const all = [];
        wb.SheetNames.forEach((sheetName) => {
          const ws = wb.Sheets[sheetName];
          const json = XLSX.utils.sheet_to_json(ws, { defval: "" });
          // Detect if first row is header-like (template format) or data
          json.forEach((row) => {
            const mapped = {};
            TEMPLATE_HEADERS.forEach((h) => { mapped[h] = String(row[h] || row[h.toUpperCase()] || "").trim(); });
            // Inherit sheet name as semester if semester is blank
            if (!mapped.semester && sheetName.toLowerCase() !== "sheet1") mapped.semester = sheetName;
            if (mapped.papername) all.push(mapped);  // skip rows with no paper name
          });
        });
        setBulkRows(all);
        if (all.length === 0) setBulkError("No valid rows found. Ensure 'papername' column is filled.");
        else setBulkSuccess(`${all.length} rows parsed. Click 'Upload' to save.`);
      } catch (err) {
        setBulkError("Failed to parse file: " + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  };

  const handleBulkUpload = async () => {
    if (bulkRows.length === 0) { setBulkError("No rows to upload."); return; }
    try {
      setBulkLoading(true);
      setBulkError("");
      setBulkSuccess("");
      const payload = bulkRows.map((row) => ({ ...row, colid: colid(), user: global1.name || "" }));
      const res = await ep1.post("/api/v2/conductexam/question-paper-stock-bulk", payload);
      const d = res.data;
      setBulkSuccess(`Done: ${d.inserted || 0} inserted, ${d.updated || 0} updated${d.errors?.length ? `, ${d.errors.length} errors.` : "."}`);
      setBulkRows([]);
      loadData();
      loadOptions();
    } catch (err) {
      setBulkError(err.response?.data?.message || "Bulk upload failed.");
    } finally {
      setBulkLoading(false);
    }
  };

  /* ── Report grouped data ── */
  const reportGroups = useMemo(() => {
    const map = new Map();
    filteredRows.forEach((r) => {
      const key = `${r.academicyear}||${r.program}||${r.semester}`;
      if (!map.has(key)) map.set(key, { academicyear: r.academicyear, program: r.program, regulation: r.regulation, semester: r.semester, rows: [] });
      map.get(key).rows.push(r);
    });
    return [...map.values()].sort((a, b) => `${a.program}${a.semester}`.localeCompare(`${b.program}${b.semester}`));
  }, [filteredRows]);

  /* ── Print ── */
  const handlePrint = () => window.print();

  /* ── Render Print Area Component ── */
  const renderPrintArea = () => (
    <div id="qps-print-area">
      {reportGroups.map((group, gIdx) => (
        <Box key={gIdx} className={gIdx < reportGroups.length - 1 ? "page-break" : ""} sx={{ mb: 4 }}>
          {/* Group header */}
          <Box sx={{ textAlign: "center", mb: 1.5 }}>
            <Typography sx={{ fontFamily: '"Times New Roman", serif', fontWeight: 900, fontSize: "18px", textTransform: "uppercase", color: "#1a237e" }}>
              QUESTION PAPER STOCK REGISTER
            </Typography>
            <Typography sx={{ fontFamily: '"Times New Roman", serif', fontWeight: 700, fontSize: "14px" }}>
              {group.program}{group.regulation ? ` — ${group.regulation}` : ""}
            </Typography>
            <Typography sx={{ fontFamily: '"Times New Roman", serif', fontWeight: 700, fontSize: "13px" }}>
              {group.semester} &nbsp;|&nbsp; Academic Year: {group.academicyear}
            </Typography>
          </Box>

          <table className="qps-table">
            <thead>
              <tr>
                <th style={{ width: 35 }}>S.No</th>
                <th style={{ width: 80 }}>Paper Code</th>
                <th style={{ minWidth: 180, textAlign: "left" }}>Name of Paper</th>
                <th style={{ width: 60 }}>Type</th>
                <th style={{ width: 100 }}>Status</th>
                <th style={{ minWidth: 140, textAlign: "left" }}>Paper Setter Name</th>
                <th style={{ width: 70 }}>Category</th>
                <th style={{ minWidth: 120, textAlign: "left" }}>Address</th>
                <th style={{ minWidth: 140 }}>Main Used/Unused<br />(Month-Year)</th>
                <th style={{ minWidth: 140 }}>ATKT Used/Unused<br />(Month-Year)</th>
                <th style={{ width: 90 }}>Stock<br />Month/Year</th>
                <th style={{ width: 100 }}>Contact<br />Number</th>
                <th style={{ width: 90 }}>Submission<br />Mode</th>
                <th style={{ width: 80 }}>Examiner<br />Code</th>
                <th style={{ minWidth: 120 }}>Email ID</th>
              </tr>
            </thead>
            <tbody>
              {group.rows.map((row, rIdx) => (
                <tr key={rIdx}>
                  <td>{row.sno || rIdx + 1}</td>
                  <td>{row.papercode || ""}</td>
                  <td className="left">{row.papername}</td>
                  <td>{row.papertype || ""}</td>
                  <td>{row.status || ""}</td>
                  <td className="left">{row.papersettername || ""}</td>
                  <td>{row.papercategory || ""}</td>
                  <td className="left">{row.address || ""}</td>
                  <td>{row.mainusedstatus || ""}</td>
                  <td>{row.atktusedstatus || ""}</td>
                  <td>{row.stockmonthyear || ""}</td>
                  <td>{row.contactnumber || ""}</td>
                  <td>{row.submissionmode || ""}</td>
                  <td>{row.examinercode || ""}</td>
                  <td className="left">{row.email || ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Box>
      ))}
      {reportGroups.length === 0 && (
        <Typography sx={{ textAlign: "center", py: 6, color: "text.secondary" }}>
          No records found. Add data or adjust filters.
        </Typography>
      )}
    </div>
  );

  /* ── Render Unused Stock Report Print Area ── */
  const renderUnusedPrintArea = () => {
    const list = unusedRows.length > 0 ? unusedRows : rows;
    const today = new Date().toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    }).replace(/\//g, ".");

    return (
      <div id="qps-unused-print-area">
        <Box sx={{ mb: 2 }}>
          <table className="qps-table" style={{ width: "100%", marginBottom: 0 }}>
            <thead>
              <tr>
                <th
                  colSpan={14}
                  style={{
                    backgroundColor: "#ffff00",
                    fontWeight: 900,
                    fontSize: "13px",
                    padding: "6px",
                    textAlign: "center",
                    textTransform: "uppercase"
                  }}
                >
                  Status of Unused Question Paper Stock after every Examination
                </th>
              </tr>
              <tr style={{ backgroundColor: "#ffff00" }}>
                <th colSpan={2} style={{ textAlign: "left", paddingLeft: "8px", fontWeight: "bold" }}>
                  Faculty
                </th>
                <th colSpan={5} style={{ textAlign: "left", paddingLeft: "8px", fontWeight: "bold" }}>
                  {filterFaculty || "Mgmt"}
                </th>
                <th colSpan={3} style={{ textAlign: "center", fontWeight: "bold" }}>
                  -
                </th>
                <th colSpan={2} style={{ textAlign: "right", paddingRight: "8px", fontWeight: "bold" }}>
                  Stock Updated on
                </th>
                <th colSpan={2} style={{ textAlign: "center", fontWeight: "bold" }}>
                  {today}
                </th>
              </tr>
              <tr style={{ backgroundColor: "#ffff00" }}>
                <th rowSpan={2} style={{ width: 35 }}>S No</th>
                <th rowSpan={2} style={{ minWidth: 100 }}>Program</th>
                <th rowSpan={2} style={{ width: 65 }}>Scheme</th>
                <th rowSpan={2} style={{ minWidth: 90 }}>Branch/Speciality</th>
                <th rowSpan={2} style={{ width: 75 }}>Year/Semester</th>
                <th rowSpan={2} style={{ width: 85 }}>Date of Last Exam</th>
                <th rowSpan={2} style={{ width: 75 }}>Paper Code</th>
                <th rowSpan={2} style={{ width: 50 }}>Month</th>
                <th rowSpan={2} style={{ width: 55 }}>Year</th>
                <th rowSpan={2} style={{ width: 60 }}>Category</th>
                <th rowSpan={2} style={{ minWidth: 90 }}>Main</th>
                <th rowSpan={2} style={{ minWidth: 90 }}>Suppl</th>
                <th style={{ minWidth: 90 }}>Mode</th>
                <th rowSpan={2} style={{ minWidth: 100 }}>Remark</th>
              </tr>
              <tr style={{ backgroundColor: "#ffff00" }}>
                <th style={{ fontSize: "9px" }}>Soft/Hard Copy</th>
              </tr>
            </thead>
            <tbody>
              {list.map((row, idx) => {
                const month = row.month || (row.stockmonthyear ? row.stockmonthyear.split("-")[0] : " -");
                const year = row.year || (row.stockmonthyear ? (row.stockmonthyear.includes("-") ? ("20" + row.stockmonthyear.split("-")[1]) : row.stockmonthyear) : (row.scheme || row.academicyear || " -"));
                return (
                  <tr key={row._id || idx}>
                    <td>{row.sno || idx + 1}</td>
                    <td className="left">{row.program || ""}</td>
                    <td>{row.scheme || row.academicyear || ""}</td>
                    <td className="left">{row.branch || "N/A"}</td>
                    <td>{row.semester || ""}</td>
                    <td>{row.dateoflastexam || " -"}</td>
                    <td>{row.papercode || ""}</td>
                    <td>{month}</td>
                    <td>{year}</td>
                    <td>{row.category || row.papercategory || " -"}</td>
                    <td>{row.mainusedstatus || (row.status?.includes("Main") ? row.status : "Available Main")}</td>
                    <td>{row.atktusedstatus || (row.status?.includes("ATKT") ? row.status : "Available Suppl.")}</td>
                    <td>{row.mode || row.submissionmode || "Soft Copy"}</td>
                    <td className="left">{row.remark || row.remarks || row.examinercode || " -"}</td>
                  </tr>
                );
              })}
              {list.length === 0 && (
                <tr>
                  <td colSpan={14} style={{ padding: "20px", color: "#666" }}>
                    No unused stock records found for the selected criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Box>
      </div>
    );
  };

  /* ─────────────────── JSX ─────────────────── */
  return (
    <MenuPageShell title="Question Paper Stock">
      <Box className="qps-root-box" sx={{ p: { xs: 1.5, md: 3 }, bgcolor: "#f1f5f9", minHeight: "100vh" }}>
        <style>{`
          @media print {
            header, nav, aside, .MuiAppBar-root, .MuiDrawer-root, .screen-only, [role="navigation"] {
              display: none !important;
            }
            body, html {
              background: #ffffff !important;
              margin: 0 !important;
              padding: 0 !important;
              height: auto !important;
              overflow: visible !important;
              font-family: Arial, sans-serif !important;
              color: #000000 !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            main, [role="main"] {
              height: auto !important;
              overflow: visible !important;
              position: static !important;
              margin: 0 !important;
              padding: 0 !important;
              background: transparent !important;
            }
            .MuiToolbar-root {
              display: none !important;
            }
            .screen-only {
              display: none !important;
            }
            .print-only {
              display: block !important;
            }
            .qps-root-box {
              background: #ffffff !important;
              padding: 0 !important;
              margin: 0 !important;
              min-height: auto !important;
            }
            .qps-content-paper {
              border: none !important;
              box-shadow: none !important;
              padding: 0 !important;
              margin: 0 !important;
              background: transparent !important;
            }
            #qps-print-area, #qps-unused-print-area {
              display: block !important;
              visibility: visible !important;
              width: 100% !important;
              position: static !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            #qps-print-area *, #qps-unused-print-area * {
              visibility: visible !important;
            }
            .page-break {
              page-break-after: always !important;
              break-after: page !important;
            }
            @page {
              size: A3 landscape;
              margin: 8mm 10mm;
            }
          }
          @media screen {
            .print-only {
              display: none !important;
            }
          }
          .qps-table { width: 100%; border-collapse: collapse; font-family: Arial, sans-serif; font-size: 10px; }
          .qps-table th, .qps-table td { border: 1px solid #000; padding: 3px 5px; vertical-align: middle; }
          .qps-table th { background-color: #ffff00 !important; font-weight: bold; text-align: center;
            -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .qps-table td { text-align: center; }
          .qps-table td.left { text-align: left; }
        `}</style>

        {/* ── Header ── */}
        <Paper elevation={1} sx={{ p: 2, mb: 2, borderRadius: 2, bgcolor: "#fff" }} className="screen-only">
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", md: "center" }} spacing={2}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <InventoryIcon color="primary" />
              <Box>
                <Typography variant="h5" fontWeight={800} color="#1e293b">Question Paper Stock Register</Typography>
                <Typography variant="body2" color="text.secondary">Manage and generate stock reports for question papers</Typography>
              </Box>
            </Stack>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              <Button variant="contained" startIcon={<AddIcon />} onClick={() => { handleClearForm(); setTab(1); }}>Add Entry</Button>
              <Button variant="outlined" startIcon={<UploadFileIcon />} onClick={() => setTab(2)}>Bulk Upload</Button>
              <Button variant="outlined" startIcon={<InventoryIcon />} onClick={() => setTab(4)}>Unused Stock Report</Button>
              <Button variant="outlined" startIcon={<PrintIcon />} color="error" onClick={handlePrint}>Print Report</Button>
              <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => { loadData(); if (tab === 4) loadUnusedReport(); }} disabled={loading}>Refresh</Button>
            </Stack>
          </Stack>
          {loading && <LinearProgress sx={{ mt: 1.5 }} />}
        </Paper>

        {(error || success) && (
          <Box className="screen-only" sx={{ mb: 1.5 }}>
            {error && <Alert severity="error" onClose={() => setError("")}>{error}</Alert>}
            {success && <Alert severity="success" onClose={() => setSuccess("")}>{success}</Alert>}
          </Box>
        )}

        {/* ── Tabs & Content ── */}
        <Paper elevation={0} className="qps-content-paper" sx={{ border: "1px solid #e2e8f0", borderRadius: 2, overflow: "hidden", bgcolor: "#fff" }}>
          <Tabs className="screen-only" value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: "1px solid #e2e8f0", px: 2 }}>
            <Tab label="📋 Records List" />
            <Tab label="➕ Add / Edit Entry" />
            <Tab label="📤 Bulk Upload" />
            <Tab label="📊 Stock Register" />
            <Tab label="📑 Unused Stock Report" />
          </Tabs>

          {/* ── Tab 0: List ── */}
          {tab === 0 && (
            <Box className="screen-only" sx={{ p: 2 }}>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 2 }} flexWrap="wrap">
                <TextField select label="Academic Year" size="small" value={filterAY} onChange={(e) => setFilterAY(e.target.value)} sx={{ minWidth: 140 }}>
                  <MenuItem value="">All Years</MenuItem>
                  {uniq(rows.map((r) => r.academicyear)).map((v) => <MenuItem key={v} value={v}>{v}</MenuItem>)}
                </TextField>
                <TextField select label="Program" size="small" value={filterProg} onChange={(e) => setFilterProg(e.target.value)} sx={{ minWidth: 180 }}>
                  <MenuItem value="">All Programs</MenuItem>
                  {uniq(rows.map((r) => r.program)).map((v) => <MenuItem key={v} value={v}>{v}</MenuItem>)}
                </TextField>
                <TextField select label="Semester" size="small" value={filterSem} onChange={(e) => setFilterSem(e.target.value)} sx={{ minWidth: 130 }}>
                  <MenuItem value="">All Semesters</MenuItem>
                  {uniq(rows.map((r) => r.semester)).map((v) => <MenuItem key={v} value={v}>{v}</MenuItem>)}
                </TextField>
                <Chip label={`${filteredRows.length} records`} color="primary" size="small" sx={{ alignSelf: "center" }} />
              </Stack>
              <DataGrid
                rows={filteredRows}
                columns={columns}
                getRowId={(r) => r._id}
                autoHeight
                pageSizeOptions={[25, 50, 100]}
                initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
                slots={{ toolbar: GridToolbar }}
                slotProps={{ toolbar: { showQuickFilter: true } }}
                density="compact"
                disableRowSelectionOnClick
                sx={{ border: "1px solid #e2e8f0", borderRadius: 2 }}
              />
            </Box>
          )}

          {/* ── Tab 1: Add / Edit ── */}
          {tab === 1 && (
            <Box className="screen-only" sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={700} color="#1e293b" sx={{ mb: 2 }}>
                {editId ? "Edit Stock Entry" : "Add New Stock Entry"}
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <TextField fullWidth size="small" label="Academic Year *" value={form.academicyear} onChange={handleFormChange("academicyear")} placeholder="2021-22" />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <TextField fullWidth size="small" label="Regulation" value={form.regulation} onChange={handleFormChange("regulation")} />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <TextField fullWidth size="small" label="Program *" value={form.program} onChange={handleFormChange("program")} />
                </Grid>
                <Grid item xs={12} sm={6} md={2}>
                  <TextField fullWidth size="small" label="Program Code" value={form.programcode} onChange={handleFormChange("programcode")} />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <TextField fullWidth size="small" label="Semester *" value={form.semester} onChange={handleFormChange("semester")} placeholder="I Sem" />
                </Grid>
                <Grid item xs={12} sm={6} md={1}>
                  <TextField fullWidth size="small" label="S.No" type="number" value={form.sno} onChange={handleFormChange("sno")} />
                </Grid>
                <Grid item xs={12} sm={6} md={2}>
                  <TextField fullWidth size="small" label="Paper Code" value={form.papercode} onChange={handleFormChange("papercode")} />
                </Grid>
                <Grid item xs={12} sm={6} md={6}>
                  <TextField fullWidth size="small" label="Paper Name *" value={form.papername} onChange={handleFormChange("papername")} />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <TextField fullWidth size="small" label="Paper Setter Name" value={form.papersettername} onChange={handleFormChange("papersettername")} />
                </Grid>
                <Grid item xs={12} sm={6} md={2}>
                  <TextField select fullWidth size="small" label="Paper Category" value={form.papercategory} onChange={handleFormChange("papercategory")}>
                    <MenuItem value="">None</MenuItem>
                    {CATEGORY_OPTIONS.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={6} md={2}>
                  <TextField fullWidth size="small" label="Examiner Code" value={form.examinercode} onChange={handleFormChange("examinercode")} />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <TextField fullWidth size="small" label="Email" value={form.email} onChange={handleFormChange("email")} />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <TextField fullWidth size="small" label="Address" value={form.address} onChange={handleFormChange("address")} />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <TextField fullWidth size="small" label="Contact Number" value={form.contactnumber} onChange={handleFormChange("contactnumber")} />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <TextField select fullWidth size="small" label="Submission Mode" value={form.submissionmode} onChange={handleFormChange("submissionmode")}>
                    <MenuItem value="">Not set</MenuItem>
                    {SUBMISSION_OPTIONS.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <TextField select fullWidth size="small" label="Paper Type" value={form.papertype} onChange={handleFormChange("papertype")}>
                    <MenuItem value="">Not set</MenuItem>
                    {PAPERTYPE_OPTIONS.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={6} md={5}>
                  <TextField select fullWidth size="small" label="Status" value={form.status} onChange={handleFormChange("status")}>
                    <MenuItem value="">Not set</MenuItem>
                    {STATUS_OPTIONS.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <TextField fullWidth size="small" label="Branch / Speciality" value={form.branch} onChange={handleFormChange("branch")} placeholder="Management" />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <TextField fullWidth size="small" label="Faculty" value={form.faculty} onChange={handleFormChange("faculty")} placeholder="Mgmt" />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <TextField fullWidth size="small" label="Date of Last Exam" value={form.dateoflastexam} onChange={handleFormChange("dateoflastexam")} placeholder="26.07.2021" />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <TextField fullWidth size="small" label="Remarks" value={form.remarks} onChange={handleFormChange("remarks")} placeholder="Optional remarks" />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <TextField fullWidth size="small" label="Stock Month/Year" value={form.stockmonthyear} onChange={handleFormChange("stockmonthyear")} placeholder="Jan-22" />
                </Grid>
                <Grid item xs={12} sm={6} md={6}>
                  <TextField fullWidth size="small" label="Main Exam Used/Unused Status" value={form.mainusedstatus} onChange={handleFormChange("mainusedstatus")} placeholder="Used in Exam Sep, 2020" />
                </Grid>
                <Grid item xs={12} sm={6} md={6}>
                  <TextField fullWidth size="small" label="ATKT Used/Unused Status" value={form.atktusedstatus} onChange={handleFormChange("atktusedstatus")} placeholder="Used in Exam March, 2023" />
                </Grid>
              </Grid>
              <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
                <Button variant="contained" onClick={handleSave} disabled={saving}>
                  {saving ? "Saving..." : editId ? "Update Entry" : "Save Entry"}
                </Button>
                <Button variant="outlined" onClick={() => { handleClearForm(); setTab(0); }}>Cancel</Button>
              </Stack>
            </Box>
          )}

          {/* ── Tab 2: Bulk Upload ── */}
          {tab === 2 && (
            <Box className="screen-only" sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={700} color="#1e293b" sx={{ mb: 1 }}>Bulk Upload from Excel</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Upload an Excel file (.xlsx / .xls). Each sheet name is used as the Semester if the semester column is blank.
                Multi-sheet Excel files (one sheet per semester) are fully supported.
              </Typography>
              <Stack direction="row" spacing={2} sx={{ mb: 2 }} flexWrap="wrap">
                <Button variant="outlined" startIcon={<DownloadIcon />} onClick={handleDownloadTemplate}>
                  Download Template
                </Button>
                <Button variant="contained" component="label" startIcon={<UploadFileIcon />}>
                  Select Excel File
                  <input type="file" accept=".xlsx,.xls" hidden onChange={handleBulkFile} />
                </Button>
                {bulkRows.length > 0 && (
                  <Button variant="contained" color="success" onClick={handleBulkUpload} disabled={bulkLoading}>
                    {bulkLoading ? "Uploading..." : `Upload ${bulkRows.length} Rows`}
                  </Button>
                )}
              </Stack>
              {bulkLoading && <LinearProgress sx={{ mb: 1 }} />}
              {bulkError && <Alert severity="error" sx={{ mb: 1 }}>{bulkError}</Alert>}
              {bulkSuccess && <Alert severity="success" sx={{ mb: 1 }}>{bulkSuccess}</Alert>}
              {bulkRows.length > 0 && (
                <Box>
                  <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>Preview ({bulkRows.length} rows):</Typography>
                  <Box sx={{ maxHeight: 400, overflow: "auto", border: "1px solid #e2e8f0", borderRadius: 1 }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                      <thead>
                        <tr>
                          {TEMPLATE_HEADERS.map((h) => (
                            <th key={h} style={{ border: "1px solid #ccc", padding: "4px 6px", background: "#f8fafc", whiteSpace: "nowrap" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {bulkRows.slice(0, 20).map((row, idx) => (
                          <tr key={idx}>
                            {TEMPLATE_HEADERS.map((h) => (
                              <td key={h} style={{ border: "1px solid #e2e8f0", padding: "3px 5px", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row[h]}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {bulkRows.length > 20 && (
                      <Typography variant="caption" sx={{ p: 1, display: "block", color: "text.secondary" }}>
                        ... and {bulkRows.length - 20} more rows (not shown in preview)
                      </Typography>
                    )}
                  </Box>
                </Box>
              )}
            </Box>
          )}

          {/* ── Tab 3: Stock Register Report ── */}
          {tab === 3 && (
            <Box sx={{ p: 2 }}>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 2 }} flexWrap="wrap" className="screen-only">
                <TextField select label="Academic Year" size="small" value={filterAY} onChange={(e) => setFilterAY(e.target.value)} sx={{ minWidth: 140 }}>
                  <MenuItem value="">All Years</MenuItem>
                  {uniq(rows.map((r) => r.academicyear)).map((v) => <MenuItem key={v} value={v}>{v}</MenuItem>)}
                </TextField>
                <TextField select label="Program" size="small" value={filterProg} onChange={(e) => setFilterProg(e.target.value)} sx={{ minWidth: 180 }}>
                  <MenuItem value="">All Programs</MenuItem>
                  {uniq(rows.map((r) => r.program)).map((v) => <MenuItem key={v} value={v}>{v}</MenuItem>)}
                </TextField>
                <TextField select label="Semester" size="small" value={filterSem} onChange={(e) => setFilterSem(e.target.value)} sx={{ minWidth: 130 }}>
                  <MenuItem value="">All Semesters</MenuItem>
                  {uniq(rows.map((r) => r.semester)).map((v) => <MenuItem key={v} value={v}>{v}</MenuItem>)}
                </TextField>
                <Button variant="contained" color="error" startIcon={<PrintIcon />} onClick={handlePrint}>Print Report</Button>
              </Stack>

              {renderPrintArea()}
            </Box>
          )}

          {/* ── Tab 4: Unused Stock Report ── */}
          {tab === 4 && (
            <Box sx={{ p: 2 }}>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 2 }} flexWrap="wrap" className="screen-only">
                <TextField select label="Academic Year" size="small" value={filterAY} onChange={(e) => setFilterAY(e.target.value)} sx={{ minWidth: 140 }}>
                  <MenuItem value="">All Years</MenuItem>
                  {uniq(rows.map((r) => r.academicyear)).map((v) => <MenuItem key={v} value={v}>{v}</MenuItem>)}
                </TextField>
                <TextField select label="Program" size="small" value={filterProg} onChange={(e) => setFilterProg(e.target.value)} sx={{ minWidth: 180 }}>
                  <MenuItem value="">All Programs</MenuItem>
                  {uniq(rows.map((r) => r.program)).map((v) => <MenuItem key={v} value={v}>{v}</MenuItem>)}
                </TextField>
                <TextField select label="Semester" size="small" value={filterSem} onChange={(e) => setFilterSem(e.target.value)} sx={{ minWidth: 130 }}>
                  <MenuItem value="">All Semesters</MenuItem>
                  {uniq(rows.map((r) => r.semester)).map((v) => <MenuItem key={v} value={v}>{v}</MenuItem>)}
                </TextField>
                <TextField
                  label="Faculty"
                  size="small"
                  value={filterFaculty}
                  onChange={(e) => setFilterFaculty(e.target.value)}
                  placeholder="e.g. Mgmt, Engg"
                  sx={{ minWidth: 130 }}
                />
                <Button variant="contained" color="error" startIcon={<PrintIcon />} onClick={handlePrint}>
                  Print Unused Report
                </Button>
                <Button variant="outlined" color="success" startIcon={<DownloadIcon />} onClick={handleExportUnusedExcel}>
                  Export to Excel
                </Button>
                <Button variant="outlined" startIcon={<RefreshIcon />} onClick={loadUnusedReport} disabled={loadingUnused}>
                  Refresh
                </Button>
              </Stack>

              {loadingUnused && <LinearProgress sx={{ mb: 2 }} className="screen-only" />}

              {renderUnusedPrintArea()}
            </Box>
          )}

          {/* When not on Tab 3 or Tab 4, render print area for print media */}
          {tab !== 3 && tab !== 4 && (
            <div className="print-only">
              {renderPrintArea()}
            </div>
          )}
        </Paper>

        {/* ── Mark as Used Dialog ── */}
        <Dialog open={markUsedDialog} onClose={() => setMarkUsedDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight: 700, bgcolor: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
            Mark Question Paper Stock Usage
          </DialogTitle>
          <DialogContent sx={{ pt: 2.5 }}>
            {markUsedRow && (
              <Stack spacing={2.5} sx={{ mt: 1 }}>
                <Box sx={{ p: 1.5, bgcolor: "#f1f5f9", borderRadius: 1.5 }}>
                  <Typography variant="subtitle2" fontWeight={700} color="#1e293b">
                    {markUsedRow.papercode ? `[${markUsedRow.papercode}] ` : ""}{markUsedRow.papername}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Program: {markUsedRow.program} &bull; Sem: {markUsedRow.semester} &bull; Setter: {markUsedRow.papersettername || "N/A"}
                  </Typography>
                  <Stack direction="row" spacing={1} sx={{ mt: 1 }} alignItems="center">
                    <Typography variant="caption" fontWeight={600}>Current Status:</Typography>
                    <Chip label={markUsedRow.status || "Available Soft copy"} size="small" color={markUsedRow.status === "Used" ? "default" : "primary"} />
                  </Stack>
                </Box>

                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Usage Type *"
                  value={markUsedForm.usedtype}
                  onChange={(e) => setMarkUsedForm((prev) => ({ ...prev, usedtype: e.target.value }))}
                >
                  <MenuItem value="Main">Main Exam (Mark as Used in Main)</MenuItem>
                  <MenuItem value="ATKT">ATKT / Supplementary Exam (Mark as Used in ATKT)</MenuItem>
                  <MenuItem value="Both">Both Main &amp; ATKT Exam (Mark Used in Both)</MenuItem>
                  <MenuItem value="Unused">Reset to Unused / Available Soft copy</MenuItem>
                </TextField>

                <TextField
                  fullWidth
                  size="small"
                  label="Exam Session / Month-Year"
                  placeholder="e.g. Sep, 2020 or Nov 2023"
                  value={markUsedForm.examdate}
                  onChange={(e) => setMarkUsedForm((prev) => ({ ...prev, examdate: e.target.value }))}
                  helperText="Session when the paper was consumed/examined"
                />

                <TextField
                  fullWidth
                  size="small"
                  label="Date of Last Exam"
                  placeholder="e.g. 26.07.2021"
                  value={markUsedForm.dateoflastexam}
                  onChange={(e) => setMarkUsedForm((prev) => ({ ...prev, dateoflastexam: e.target.value }))}
                />

                <TextField
                  fullWidth
                  size="small"
                  label="Remarks"
                  multiline
                  rows={2}
                  placeholder="Optional notes or examiner reference"
                  value={markUsedForm.remarks}
                  onChange={(e) => setMarkUsedForm((prev) => ({ ...prev, remarks: e.target.value }))}
                />
              </Stack>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 2, borderTop: "1px solid #e2e8f0" }}>
            <Button onClick={() => setMarkUsedDialog(false)} disabled={savingMarkUsed}>Cancel</Button>
            <Button variant="contained" color="primary" onClick={handleSaveMarkUsed} disabled={savingMarkUsed}>
              {savingMarkUsed ? "Saving..." : "Save Usage Status"}
            </Button>
          </DialogActions>
        </Dialog>

        {/* ── Delete confirmation dialog ── */}
        <Dialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)}>
          <DialogTitle>Confirm Delete</DialogTitle>
          <DialogContent>Are you sure you want to delete this stock entry? This action cannot be undone.</DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button color="error" variant="contained" onClick={handleDelete}>Delete</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </MenuPageShell>
  );
}
