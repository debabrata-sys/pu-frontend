import React, { useEffect, useMemo, useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Autocomplete,
  Box,
  Button,
  ButtonGroup,
  Card,
  Checkbox,
  Grid,
  LinearProgress,
  Paper,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import PrintIcon from "@mui/icons-material/Print";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import RefreshIcon from "@mui/icons-material/Refresh";
import DescriptionIcon from "@mui/icons-material/Description";
import AssessmentIcon from "@mui/icons-material/Assessment";
import { DataGrid, GridToolbar } from "@mui/x-data-grid";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import ep1 from "../api/ep1";
import global1 from "./global1";
import MenuPageShell from "./MenuPageShell";
import universityLogo from "../assets/peoples_university_logo.jpg";

const COLORS = ["#2563eb", "#16a34a", "#f97316", "#dc2626", "#7c3aed", "#0891b2", "#ca8a04", "#db2777"];

const DEFAULT_DEAN_ORDER_EXAMINERS = [
  {
    sno: 1,
    papercode: "BD-301",
    papername: "General Medicine",
    examinername: "Dr. Rakesh Singh Jagat",
    designation: "Professor",
    address: "GMC, Bhopal [MP].",
    examinerFull: "Dr. Rakesh Singh Jagat, Professor, GMC, Bhopal [MP].",
    contactno: "9425021367"
  },
  {
    sno: 2,
    papercode: "BD-302",
    papername: "General Surgery",
    examinername: "Dr. Rajesh Lonare",
    designation: "Professor",
    address: "RKDF, Bhopal [MP].",
    examinerFull: "Dr. Rajesh Lonare, Professor, RKDF, Bhopal [MP].",
    contactno: "9826362508"
  },
  {
    sno: 3,
    papercode: "BD-303",
    papername: "Oral Pathology & Oral Microbiology",
    examinername: "Dr. Medhini Singaraju",
    designation: "Professor",
    address: "Rishiraj College of Dental Sciences, Bhopal [MP].",
    examinerFull: "Dr. Medhini Singaraju, Professor, Rishiraj College of Dental Sciences, Bhopal [MP].",
    contactno: "9617389783"
  }
];

const DEFAULT_VC_APPROVAL_PAPERS = [
  {
    sno: 1,
    papercode: "BN-401",
    papername: "Midwifery and Obstetrical Nursing",
    examiners: [
      {
        name: "Ms. Divya Sharma",
        designation: "Assistant Professor",
        category: "I",
        expUg: "4",
        expPg: "4",
        address: "Jai Narayan College of Nursing, Bhopal [M.P]",
        remarks: ""
      },
      {
        name: "Ms. Ranjitha Rajesh",
        designation: "Professor",
        category: "",
        expUg: "22",
        expPg: "10",
        address: "MAR - Baselios College of Nursing Ayodhya Nagar, Bhopal [M.P]",
        remarks: ""
      },
      {
        name: "Ms. Dolly John",
        designation: "Principal",
        category: "",
        expUg: "14",
        expPg: "9",
        address: "Corporate College of Nursing, Bhopal [M.P]",
        remarks: ""
      },
      {
        name: "Jyoti Shah",
        designation: "Lecturer",
        category: "",
        expUg: "5",
        expPg: "12",
        address: "Bhopal Nursing College, BMHRC, Bhopal [M.P]",
        remarks: ""
      },
      {
        name: "Mrs Suman Singh Parihar",
        designation: "Principal",
        category: "",
        expUg: "10",
        expPg: "3",
        address: "Saudamini Institute of Nursing & Research Gaddi Road Khaur Rewa [M.P]",
        remarks: ""
      }
    ]
  },
  {
    sno: 2,
    papercode: "BN-402",
    papername: "Community Health Nursing-II",
    examiners: [
      {
        name: "Mr. Alan Smith Bernard",
        designation: "Associate Professor",
        category: "I",
        expUg: "2.5",
        expPg: "6",
        address: "Rajeev Gandhi College of Nursing, Bhopal [M.P]",
        remarks: ""
      },
      {
        name: "Mr. Preethish Krishan",
        designation: "Professor",
        category: "",
        expUg: "4",
        expPg: "11",
        address: "Sam Nursing College, Bhopal [M.P]",
        remarks: ""
      },
      {
        name: "Dr. Smiritilata Chakrawati",
        designation: "Principal",
        category: "",
        expUg: "39",
        expPg: "13",
        address: "VVM College of Nursing Raisen Road, Adampur, Bhopal [M.P]",
        remarks: ""
      },
      {
        name: "Mrs. Rakhi Patel",
        designation: "Assistant Professor",
        category: "",
        expUg: "4",
        expPg: "2",
        address: "Govt. School of Nursing, Hamidia Hospital. Bhopal [M.P]",
        remarks: ""
      },
      {
        name: "Mrs. Neha Soni",
        designation: "Assistant Professor",
        category: "",
        expUg: "4",
        expPg: "2",
        address: "Govt. School of Nursing, Hamidia Hospital. Bhopal, [M.P]",
        remarks: ""
      }
    ]
  }
];

const fieldOptions = [
  "academicyear", "regulation", "exam", "examcode", "program", "programcode", "type", "subject", "semester",
  "course", "coursecode", "examinername", "examineremail", "startdate", "enddate", "status", "evaluationstatus", "evaluationdate"
];

const labels = {
  academicyear: "Academic Year",
  regulation: "Regulation",
  exam: "Exam",
  examcode: "Exam Code",
  program: "Program",
  programcode: "Program Code",
  type: "Type",
  subject: "Subject",
  semester: "Semester",
  course: "Course",
  coursecode: "Course Code",
  examinername: "Examiner",
  examineremail: "Examiner Email",
  startdate: "Start Date",
  enddate: "End Date",
  status: "Status",
  evaluationstatus: "Evaluation Status",
  evaluationdate: "Evaluation Date"
};

const valueText = (value) => String(value || "Not specified").trim() || "Not specified";

export default function ConductExamExaminerAllotmentReportPage() {
  const colid = global1.colid || 1;
  const [reportFormat, setReportFormat] = useState("deanOrder");
  const [rows, setRows] = useState([]);
  const [dbExaminers, setDbExaminers] = useState([]);
  const [ins, setIns] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [filters] = useState({ academicyear: "", examcode: "", programcode: "", coursecode: "" });

  const [deanMeta, setDeanMeta] = useState({
    fromTitle: "Controller of Examinations",
    toTitle: "Dean-PDA",
    refNo: "PU/COE/EEP/Intra/D/2026/002/A/0020",
    date: "08/01/2026",
    examination: "[MAIN]",
    program: "BDS",
    profYear: "Third",
    fileType: "Confidential",
    fileNo: "",
    section: "Conduct",
    subject: "Approved list of External Examiners for Practical Examination",
    startDate: "17/01/2026",
    endDate: "31/01/2026",
    signatoryName: "(Dr. Himanshu Pandiya)",
    signatoryDesignation: "Controller of Examinations"
  });

  const [vcMeta, setVcMeta] = useState({
    fromTitle: "Controller of Examinations",
    toTitle: "Vice Chancellor",
    refNo: "PU/COE/PE/APP/N/2026/A/040",
    date: "06/07/2026",
    fileType: "Confidential",
    fileNo: "35E",
    exam: "Supplementary",
    program: "B.Sc Nur - Fourth Year",
    subject: "Approval of Practical Examiner[July-2026]",
    institute: "PCNRC"
  });

  const [pivotFields, setPivotFields] = useState(["academicyear", "examcode", "examinername"]);

  const loadInstitution = async () => {
    try {
      const cfgRes = await ep1.get("/api/v2/conductexam/configuration", { params: { colid } });
      if (cfgRes.data?.success && cfgRes.data.data) {
        const cfg = cfgRes.data.data;
        setIns(cfg);
        const prefix = (cfg.institutionname || "PU").split(" ").filter(Boolean).map(w => w[0]).join("").slice(0, 4).toUpperCase() || "EXAM";
        if (cfg.coename) {
          setDeanMeta(prev => ({
            ...prev,
            signatoryName: `(${cfg.coename})`,
            signatoryDesignation: cfg.coetitle || prev.signatoryDesignation,
            refNo: prev.refNo.replace(/^[A-Z0-9]+\/COE/, `${prefix}/COE`)
          }));
        }
        if (cfg.vcname) {
          setVcMeta(prev => ({
            ...prev,
            toTitle: cfg.vctitle ? `${cfg.vctitle} (${cfg.vcname})` : `Vice Chancellor (${cfg.vcname})`,
            refNo: prev.refNo.replace(/^[A-Z0-9]+\/COE/, `${prefix}/COE`)
          }));
        }
        return;
      }
      const res = await ep1.get("/vins", { params: { colid } });
      setIns(res.data || null);
    } catch {
      setIns(null);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");
      const [allotmentsRes, examinersRes] = await Promise.allSettled([
        ep1.get("/api/v2/conductexam/examiner-allotments", { params: { colid } }),
        ep1.get("/api/v2/conductexam/examiners", { params: { colid } })
      ]);
      if (allotmentsRes.status === "fulfilled" && allotmentsRes.value?.data?.data) setRows(allotmentsRes.value.data.data);
      if (examinersRes.status === "fulfilled" && examinersRes.value?.data?.data) setDbExaminers(examinersRes.value.data.data);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load examiner allotment report.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    loadInstitution();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const deanExaminers = useMemo(() => {
    const filtered = (dbExaminers.length > 0 ? dbExaminers : rows).filter((row) => {
      if (filters.examcode && (row.examcode !== filters.examcode && row.exam !== filters.examcode)) return false;
      if (filters.programcode && (row.programcode !== filters.programcode && row.program !== filters.programcode)) return false;
      if (filters.coursecode && (row.coursecode !== filters.coursecode && row.course !== filters.coursecode)) return false;
      return true;
    });
    if (filtered.length > 0) {
      return filtered.map((item, idx) => ({
        sno: idx + 1,
        papercode: item.coursecode || item.papercode || `P-${idx + 1}`,
        papername: item.course || item.papername || item.subject || "Subject",
        examinername: item.examinername || "Examiner",
        examinercode: item.examinercode || "",
        designation: item.designation || "Professor",
        address: item.instituteaddress || item.address || "Bhopal [MP]",
        examinerFull: `${item.examinername || "Examiner"}${item.designation ? `, ${item.designation}` : ""}${item.instituteaddress ? `, ${item.instituteaddress}` : ""}`,
        contactno: item.contactno || item.examinerphone || item.examineremail || "-"
      }));
    }
    return DEFAULT_DEAN_ORDER_EXAMINERS;
  }, [dbExaminers, rows, filters]);

  const vcPapers = useMemo(() => {
    const filtered = (dbExaminers.length > 0 ? dbExaminers : rows).filter((row) => {
      if (filters.examcode && (row.examcode !== filters.examcode && row.exam !== filters.examcode)) return false;
      if (filters.programcode && (row.programcode !== filters.programcode && row.program !== filters.programcode)) return false;
      return true;
    });
    if (filtered.length > 0) {
      const groups = new Map();
      filtered.forEach((item) => {
        const pcode = item.coursecode || item.papercode || "Course";
        if (!groups.has(pcode)) {
          groups.set(pcode, { papercode: pcode, papername: item.course || item.papername || item.subject || "Course Name", examiners: [] });
        }
        groups.get(pcode).examiners.push({
          name: item.examinername || "Examiner",
          examinercode: item.examinercode || "",
          designation: item.designation || "Professor",
          category: item.category || "I",
          expUg: item.experience_ug || item.expUg || "4",
          expPg: item.experience_pg || item.expPg || "2",
          address: item.instituteaddress || item.address || "Bhopal [MP]",
          remarks: item.remarks || ""
        });
      });
      return Array.from(groups.values()).map((grp, idx) => ({ sno: idx + 1, ...grp }));
    }
    return DEFAULT_VC_APPROVAL_PAPERS;
  }, [dbExaminers, rows, filters]);

  const pivotRows = useMemo(() => {
    const fields = pivotFields.length ? pivotFields : ["examinername"];
    const map = new Map();
    rows.forEach((row) => {
      const key = fields.map((field) => valueText(row[field])).join(" | ");
      if (!map.has(key)) {
        const item = { id: key, count: 0 };
        fields.forEach((field) => { item[field] = valueText(row[field]); });
        map.set(key, item);
      }
      map.get(key).count += 1;
    });
    return [...map.values()].sort((a, b) => b.count - a.count);
  }, [rows, pivotFields]);

  const chartRows = pivotRows.slice(0, 12).map((row) => ({ name: pivotFields.map((field) => row[field]).filter(Boolean).join(" / "), count: row.count }));
  const totalPapers = rows.length;
  const examinerCount = new Set(rows.map((row) => valueText(row.examineremail))).size;
  const courseCount = new Set(rows.map((row) => valueText(row.coursecode))).size;
  const columns = [
    ...pivotFields.map((field) => ({ field, headerName: labels[field] || field, minWidth: 150, flex: 1 })),
    { field: "count", headerName: "Allocated Papers", width: 170, type: "number" }
  ];

  const handlePrint = () => window.print();

  return (
    <MenuPageShell title="Examiner Allotment Report">
      <Box sx={{ p: { xs: 1.5, md: 3 }, bgcolor: "#f1f5f9", minHeight: "100vh" }}>
        <style>{`
          @media print {
            body * { visibility: hidden; }
            #printable-report-area, #printable-report-area * { visibility: visible; }
            #printable-report-area { position: absolute; left: 0; top: 0; width: 100% !important; margin: 0 !important; padding: 0 !important; background: #fff !important; }
            .screen-only { display: none !important; }
            .page-break-after { page-break-after: always !important; break-after: page !important; }
            table { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            th { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          }
          @page { size: ${reportFormat === "vcApproval" ? "A4 landscape" : "A4 portrait"}; margin: ${reportFormat === "vcApproval" ? "8mm 10mm" : "10mm 12mm"}; }
          .official-table { width: 100%; border-collapse: collapse; font-family: Arial, sans-serif; color: #000; }
          .official-table th, .official-table td { border: 1px solid #000; padding: 5px 7px; font-size: 11.5px; vertical-align: middle; }
          .official-table th { background-color: #ffff00 !important; font-weight: bold; color: #000; text-align: center; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .metadata-box-table { width: 100%; border-collapse: collapse; font-family: Arial, sans-serif; color: #000; margin-bottom: 12px; }
          .metadata-box-table td { border: 1px solid #000; padding: 4px 8px; font-size: 12.5px; font-weight: bold; }
        `}</style>
        <Box className="screen-only" sx={{ mb: 2.5 }}>
          <Paper elevation={1} sx={{ p: 2, borderRadius: 2, mb: 2, bgcolor: "#fff" }}>
            <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", md: "center" }} spacing={2}>
              <Box>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <DescriptionIcon color="primary" />
                  <Typography variant="h5" fontWeight={800} color="#1e293b">Examiner Report &amp; Appointment Orders</Typography>
                </Stack>
                <Typography variant="body2" color="text.secondary">Official university formatted print layouts matching COE approval &amp; appointment orders</Typography>
              </Box>
              <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
                <ButtonGroup variant="outlined" size="medium">
                  <Button variant={reportFormat === "deanOrder" ? "contained" : "outlined"} onClick={() => setReportFormat("deanOrder")} sx={{ fontWeight: 700 }}>Dean / HOD Order</Button>
                  <Button variant={reportFormat === "vcApproval" ? "contained" : "outlined"} onClick={() => setReportFormat("vcApproval")} sx={{ fontWeight: 700 }}>VC Approval Sheet</Button>
                  <Button variant={reportFormat === "analytics" ? "contained" : "outlined"} onClick={() => setReportFormat("analytics")} startIcon={<AssessmentIcon />} sx={{ fontWeight: 700 }}>Analytics</Button>
                </ButtonGroup>
                <Button variant="contained" color="error" startIcon={<PrintIcon />} onClick={handlePrint} sx={{ fontWeight: 800, px: 2.5, bgcolor: "#d32f2f", "&:hover": { bgcolor: "#b71c1c" } }}>Print Report</Button>
                <Button variant="outlined" startIcon={<RefreshIcon />} onClick={loadData} disabled={loading}>Refresh</Button>
              </Stack>
            </Stack>
            {loading && <LinearProgress sx={{ mt: 2 }} />}
          </Paper>
          {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}
          <Accordion sx={{ mb: 2, borderRadius: "8px !important", border: "1px solid #cbd5e1" }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography fontWeight={700} color="#334155">📝 Edit Document Details</Typography>
            </AccordionSummary>
            <AccordionDetails>
              {reportFormat === "deanOrder" && (
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} md={3}><TextField fullWidth size="small" label="From" value={deanMeta.fromTitle} onChange={(e) => setDeanMeta({ ...deanMeta, fromTitle: e.target.value })} /></Grid>
                  <Grid item xs={12} sm={6} md={3}><TextField fullWidth size="small" label="To" value={deanMeta.toTitle} onChange={(e) => setDeanMeta({ ...deanMeta, toTitle: e.target.value })} /></Grid>
                  <Grid item xs={12} sm={6} md={3}><TextField fullWidth size="small" label="Ref No." value={deanMeta.refNo} onChange={(e) => setDeanMeta({ ...deanMeta, refNo: e.target.value })} /></Grid>
                  <Grid item xs={12} sm={6} md={3}><TextField fullWidth size="small" label="Date" value={deanMeta.date} onChange={(e) => setDeanMeta({ ...deanMeta, date: e.target.value })} /></Grid>
                  <Grid item xs={12} sm={4} md={2}><TextField fullWidth size="small" label="Examination" value={deanMeta.examination} onChange={(e) => setDeanMeta({ ...deanMeta, examination: e.target.value })} /></Grid>
                  <Grid item xs={12} sm={4} md={2}><TextField fullWidth size="small" label="Program" value={deanMeta.program} onChange={(e) => setDeanMeta({ ...deanMeta, program: e.target.value })} /></Grid>
                  <Grid item xs={12} sm={4} md={2}><TextField fullWidth size="small" label="Prof./Year" value={deanMeta.profYear} onChange={(e) => setDeanMeta({ ...deanMeta, profYear: e.target.value })} /></Grid>
                  <Grid item xs={12} sm={4} md={2}><TextField fullWidth size="small" label="File Type" value={deanMeta.fileType} onChange={(e) => setDeanMeta({ ...deanMeta, fileType: e.target.value })} /></Grid>
                  <Grid item xs={12} sm={4} md={2}><TextField fullWidth size="small" label="File No" value={deanMeta.fileNo} onChange={(e) => setDeanMeta({ ...deanMeta, fileNo: e.target.value })} /></Grid>
                  <Grid item xs={12} sm={4} md={2}><TextField fullWidth size="small" label="Section" value={deanMeta.section} onChange={(e) => setDeanMeta({ ...deanMeta, section: e.target.value })} /></Grid>
                  <Grid item xs={12} md={6}><TextField fullWidth size="small" label="Subject" value={deanMeta.subject} onChange={(e) => setDeanMeta({ ...deanMeta, subject: e.target.value })} /></Grid>
                  <Grid item xs={12} sm={6} md={3}><TextField fullWidth size="small" label="Start Date" value={deanMeta.startDate} onChange={(e) => setDeanMeta({ ...deanMeta, startDate: e.target.value })} /></Grid>
                  <Grid item xs={12} sm={6} md={3}><TextField fullWidth size="small" label="End Date" value={deanMeta.endDate} onChange={(e) => setDeanMeta({ ...deanMeta, endDate: e.target.value })} /></Grid>
                </Grid>
              )}
              {reportFormat === "vcApproval" && (
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} md={3}><TextField fullWidth size="small" label="From" value={vcMeta.fromTitle} onChange={(e) => setVcMeta({ ...vcMeta, fromTitle: e.target.value })} /></Grid>
                  <Grid item xs={12} sm={6} md={3}><TextField fullWidth size="small" label="To" value={vcMeta.toTitle} onChange={(e) => setVcMeta({ ...vcMeta, toTitle: e.target.value })} /></Grid>
                  <Grid item xs={12} sm={6} md={3}><TextField fullWidth size="small" label="Ref No." value={vcMeta.refNo} onChange={(e) => setVcMeta({ ...vcMeta, refNo: e.target.value })} /></Grid>
                  <Grid item xs={12} sm={6} md={3}><TextField fullWidth size="small" label="Date" value={vcMeta.date} onChange={(e) => setVcMeta({ ...vcMeta, date: e.target.value })} /></Grid>
                  <Grid item xs={12} md={6}><TextField fullWidth size="small" label="Subject" value={vcMeta.subject} onChange={(e) => setVcMeta({ ...vcMeta, subject: e.target.value })} /></Grid>
                  <Grid item xs={12} sm={6} md={3}><TextField fullWidth size="small" label="Exam" value={vcMeta.exam} onChange={(e) => setVcMeta({ ...vcMeta, exam: e.target.value })} /></Grid>
                  <Grid item xs={12} sm={6} md={3}><TextField fullWidth size="small" label="Program" value={vcMeta.program} onChange={(e) => setVcMeta({ ...vcMeta, program: e.target.value })} /></Grid>
                </Grid>
              )}
            </AccordionDetails>
          </Accordion>
        </Box>
        <Box id="printable-report-area">
          {/* ----------------- FORMAT 1: DEAN / HOD ORDER (media_1788938491113.pdf) ----------------- */}
          {reportFormat === "deanOrder" && (
            <Card
              elevation={0}
              sx={{
                maxWidth: "210mm",
                margin: "0 auto",
                p: { xs: 2, sm: 3, md: 4 },
                bgcolor: "#fff",
                border: "1px solid #e2e8f0",
                borderRadius: 1
              }}
            >
              {/* University Header with Logo - Dynamic from Exam Configuration */}
              <Box sx={{ textAlign: "center", mb: 1.5 }}>
                {(ins?.logo || universityLogo) && (
                  <Box sx={{ display: "flex", justifyContent: "center", mb: 0.8 }}>
                    <Box
                      component="img"
                      src={ins?.logo || universityLogo}
                      alt="University Logo"
                      sx={{ maxHeight: 68, maxWidth: 130, objectFit: "contain" }}
                      onError={(e) => { e.target.style.display = "none"; }}
                    />
                  </Box>
                )}

                <Typography
                  component="h1"
                  sx={{
                    fontFamily: '"Times New Roman", Times, Georgia, serif',
                    fontWeight: 900,
                    fontSize: { xs: "24px", sm: "32px" },
                    letterSpacing: "1.2px",
                    color: "#1a237e",
                    textTransform: "uppercase",
                    lineHeight: 1.15,
                    m: 0
                  }}
                >
                  {ins?.institutionname || "INSTITUTION NAME"}
                </Typography>

                {ins?.affiliatedboard && (
                  <Typography
                    sx={{
                      fontFamily: '"Times New Roman", Times, Georgia, serif',
                      fontWeight: 700,
                      fontSize: "13px",
                      color: "#c2410c",
                      mt: 0.3,
                      letterSpacing: "0.5px"
                    }}
                  >
                    {ins.affiliatedboard.startsWith("(") ? ins.affiliatedboard : `(${ins.affiliatedboard})`}
                  </Typography>
                )}

                <Box sx={{ fontFamily: "Arial, sans-serif", fontSize: "11px", color: "#000", mt: 0.3 }}>
                  {ins?.address && <span>{ins.address}</span>}
                  {ins?.phone && <span> &nbsp;|&nbsp; Ph: {ins.phone}</span>}
                  {ins?.email && (
                    <span> &nbsp;|&nbsp; E-mail: <span style={{ color: "#2563eb" }}>{ins.email}</span></span>
                  )}
                </Box>

                <Typography
                  sx={{
                    fontFamily: '"Times New Roman", Times, Georgia, serif',
                    fontWeight: 900,
                    fontSize: "16px",
                    color: "#1e3a8a",
                    letterSpacing: "0.5px",
                    mt: 0.6,
                    textTransform: "uppercase"
                  }}
                >
                  {ins?.coetitle ? `OFFICE OF ${ins.coetitle.toUpperCase()}` : "OFFICE OF CONTROLLER OF EXAMINATIONS"}
                </Typography>

                <Box
                  sx={{
                    borderBottom: "2.5px dotted #1e3a8a",
                    my: 1.2,
                    width: "100%"
                  }}
                />
              </Box>

              {/* Document Details / Metadata Box */}
              <table className="metadata-box-table">
                <tbody>
                  <tr>
                    <td style={{ width: "50%" }}>From:- {deanMeta.fromTitle}</td>
                    <td style={{ width: "50%" }}>To:- {deanMeta.toTitle}</td>
                  </tr>
                  <tr>
                    <td>Ref No.:-{deanMeta.refNo}</td>
                    <td>Date: Date:-{deanMeta.date}</td>
                  </tr>
                  <tr>
                    <td>
                      Examination:- <span style={{ fontWeight: 800 }}>{deanMeta.examination}</span>
                    </td>
                    <td>
                      Program:- <span style={{ fontWeight: 800 }}>{deanMeta.program}</span> &nbsp;&nbsp;&nbsp;&nbsp; Prof./Year:-{" "}
                      <span style={{ fontWeight: 800 }}>{deanMeta.profYear}</span>
                    </td>
                  </tr>
                  <tr>
                    <td>
                      File Type:- {deanMeta.fileType} &nbsp;&nbsp;&nbsp;&nbsp; File No:- {deanMeta.fileNo}
                    </td>
                    <td>Section:- {deanMeta.section}</td>
                  </tr>
                  <tr>
                    <td colSpan={2} style={{ paddingTop: "6px", paddingBottom: "6px" }}>
                      <u>Subject: {deanMeta.subject}</u>
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Point 1 Intro */}
              <Typography
                sx={{
                  fontFamily: "Arial, sans-serif",
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "#000",
                  mb: 1,
                  pl: 2
                }}
              >
                1.&nbsp;&nbsp;The list of approved External Examiners are hereby being sent to you as:-
              </Typography>

              {/* Approved Examiners Table */}
              <Box sx={{ mb: 2 }}>
                <table className="official-table">
                  <thead>
                    <tr>
                      <th style={{ width: "45px" }}>S.No</th>
                      <th style={{ width: "100px" }}>Paper Code</th>
                      <th style={{ width: "220px" }}>Paper Name/Specialization</th>
                      <th>Name of External Examiner</th>
                      <th style={{ width: "100px" }}>Ex. Code</th>
                      <th style={{ width: "120px" }}>Contact No.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deanExaminers.map((row, idx) => (
                      <tr key={idx}>
                        <td style={{ textAlign: "center", fontWeight: 600 }}>{row.sno || idx + 1}.</td>
                        <td style={{ textAlign: "center", fontWeight: 700 }}>{row.papercode}</td>
                        <td style={{ textAlign: "left", fontWeight: 600 }}>{row.papername}</td>
                        <td style={{ textAlign: "left" }}>{row.examinerFull}</td>
                        <td style={{ textAlign: "center", fontWeight: 600 }}>{row.examinercode || "-"}</td>
                        <td style={{ textAlign: "center" }}>{row.contactno}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Box>

              {/* Points 2 through 10 Instructions */}
              <Box sx={{ pl: 2, pr: 1, my: 2.5 }}>
                <Typography sx={{ fontSize: "11.5px", color: "#000", mb: 0.6, lineHeight: 1.35 }}>
                  2.&nbsp;&nbsp;You are directed to provide this panel to the concerned HOD.
                </Typography>

                <Typography sx={{ fontSize: "11.5px", color: "#000", mb: 0.6, lineHeight: 1.35 }}>
                  3.&nbsp;&nbsp;You have to complete practical examination from{" "}
                  <span style={{ color: "#d32f2f", fontWeight: 700, textDecoration: "underline" }}>
                    {deanMeta.startDate} to {deanMeta.endDate}
                  </span>
                  .
                </Typography>

                <Typography sx={{ fontSize: "11.5px", color: "#000", mb: 0.6, lineHeight: 1.35 }}>
                  4.&nbsp;&nbsp;You are directed to contact them and get their consent as according to your schedule.
                </Typography>

                <Typography sx={{ fontSize: "11.5px", color: "#000", mb: 0.6, lineHeight: 1.35 }}>
                  5.&nbsp;&nbsp;In case of non-availability of any external examiner, you have to take the permission of the undersigned telephonically as well as in writing for substitution.
                </Typography>

                <Typography
                  sx={{
                    fontSize: "11.5px",
                    color: "#d32f2f",
                    fontWeight: 600,
                    mb: 0.6,
                    lineHeight: 1.35
                  }}
                >
                  6.&nbsp;&nbsp;Kindly ensure that the examination be conducted during the scheduled period as declare by university in point no.3, otherwise order may be issued for the re-examination and conducted examination will be treated as null and void.
                </Typography>

                <Typography sx={{ fontSize: "11.5px", color: "#000", mb: 0.6, lineHeight: 1.35 }}>
                  7.&nbsp;&nbsp;You are also directed to appoint Internal Examiners for the above mentioned paper as per the instruction &amp; guidelines of Regulatory Bodies and Statutes &amp; Ordinances of our University at your end.
                </Typography>

                <Typography
                  sx={{
                    fontSize: "11.5px",
                    color: "#2e7d32",
                    mb: 0.6,
                    lineHeight: 1.35
                  }}
                >
                  8.&nbsp;&nbsp;<u>You are also directed to provide the details of the approved rate of remunerations and TA as per the University Policy in appointment letter.</u>
                </Typography>

                <Typography
                  sx={{
                    fontSize: "11.5px",
                    color: "#1565c0",
                    fontWeight: 700,
                    mb: 0.6,
                    lineHeight: 1.35
                  }}
                >
                  9.&nbsp;&nbsp;<u>Further you are also directed to deposit all the practical examination copies with posting of marks, attendance sheet &amp; award list (duly signed by all External as well as Internal Examiners wherever required) to the Conduct Section on the last date of practical examination. Anything incomplete in any sense will not be entertained.</u>
                </Typography>

                <Typography
                  sx={{
                    fontSize: "11.5px",
                    color: "#2e7d32",
                    fontWeight: 700,
                    mb: 1,
                    lineHeight: 1.35
                  }}
                >
                  10.&nbsp;&nbsp;Further you are also directed to provide your exact practical schedule to DAA, PU.
                </Typography>
              </Box>

              {/* Signatory Section */}
              <Box sx={{ display: "flex", justifyContent: "flex-end", textAlign: "center", mt: 3, mb: 2, pr: 2 }}>
                <Box>
                  <Typography sx={{ fontWeight: 700, fontSize: "12px", mb: 0.5 }}>-Sd-</Typography>
                  <Typography
                    sx={{
                      fontWeight: 800,
                      fontSize: "13.5px",
                      color: "#d32f2f"
                    }}
                  >
                    {deanMeta.signatoryName}
                  </Typography>
                  <Typography sx={{ fontWeight: 700, fontSize: "12px" }}>
                    {deanMeta.signatoryDesignation}
                  </Typography>
                </Box>
              </Box>

              {/* Copy To Section */}
              <Box sx={{ pl: 1, mt: 1 }}>
                <Typography sx={{ fontWeight: 700, fontSize: "11px", mb: 0.3 }}>
                  Copy to:-
                </Typography>
                <Typography sx={{ fontSize: "11px", color: "#000", pl: 2, mb: 0.2 }}>
                  • &nbsp;<strong>In-Charge (Conduct)</strong> - for coordination with HOI/HOD of the institute.
                </Typography>
                <Typography sx={{ fontSize: "11px", color: "#000", pl: 2 }}>
                  • &nbsp;<strong>Assistant Registrar (Evaluation)</strong> - for coordination with HOI/HOD regarding Evaluation.
                </Typography>
              </Box>
            </Card>
          )}

          {/* ----------------- FORMAT 2: VC APPROVAL PROPOSAL (media_1788936481675.pdf) ----------------- */}
          {reportFormat === "vcApproval" && (
            <Box>
              {vcPapers.map((paperGroup, pageIdx) => (
                <Card
                  key={paperGroup.papercode || pageIdx}
                  elevation={0}
                  className={pageIdx < vcPapers.length - 1 ? "page-break-after" : ""}
                  sx={{
                    maxWidth: "297mm",
                    minHeight: "200mm",
                    margin: "0 auto 24px auto",
                    p: { xs: 2, sm: 3, md: 4 },
                    bgcolor: "#fff",
                    border: "1px solid #cbd5e1",
                    borderRadius: 1,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between"
                  }}
                >
                  <Box>
                    {/* Header: Dynamic from Exam Configuration */}
                    <Box sx={{ textAlign: "center", mb: 2 }}>
                      {(ins?.logo || universityLogo) && (
                        <Box sx={{ display: "flex", justifyContent: "center", mb: 0.8 }}>
                          <Box
                            component="img"
                            src={ins?.logo || universityLogo}
                            alt="University Logo"
                            sx={{ maxHeight: 65, maxWidth: 130, objectFit: "contain" }}
                            onError={(e) => { e.target.style.display = "none"; }}
                          />
                        </Box>
                      )}

                      <Typography
                        component="h1"
                        sx={{
                          fontFamily: '"Times New Roman", Times, Georgia, serif',
                          fontWeight: 900,
                          fontSize: { xs: "24px", sm: "32px" },
                          letterSpacing: "1.2px",
                          color: "#1a237e",
                          textTransform: "uppercase",
                          lineHeight: 1.15,
                          m: 0
                        }}
                      >
                        {ins?.institutionname || "INSTITUTION NAME"}
                      </Typography>

                      {ins?.affiliatedboard && (
                        <Typography
                          sx={{
                            fontFamily: '"Times New Roman", Times, Georgia, serif',
                            fontWeight: 700,
                            fontSize: "13px",
                            color: "#c2410c",
                            mt: 0.3,
                            letterSpacing: "0.5px"
                          }}
                        >
                          {ins.affiliatedboard.startsWith("(") ? ins.affiliatedboard : `(${ins.affiliatedboard})`}
                        </Typography>
                      )}

                      {ins?.address && (
                        <Typography
                          sx={{
                            fontFamily: "Arial, sans-serif",
                            fontSize: "11px",
                            color: "#475569",
                            mt: 0.2
                          }}
                        >
                          {ins.address}
                        </Typography>
                      )}
                    </Box>

                    {/* Metadata Box matching VC Approval Format */}
                    <table className="metadata-box-table">
                      <tbody>
                        <tr>
                          <td style={{ width: "35%" }}>From: {vcMeta.fromTitle}</td>
                          <td colSpan={5}>To: {vcMeta.toTitle}</td>
                        </tr>
                        <tr>
                          <td style={{ width: "25%" }}>{vcMeta.refNo}</td>
                          <td style={{ width: "15%" }}>Date: {vcMeta.date}</td>
                          <td style={{ width: "20%" }}>File Type: {vcMeta.fileType}</td>
                          <td style={{ width: "15%" }}>File No.- {vcMeta.fileNo}</td>
                          <td style={{ width: "12%" }}>Exam : {vcMeta.exam}</td>
                          <td style={{ width: "13%" }}>Program: {vcMeta.program}</td>
                        </tr>
                        <tr>
                          <td style={{ width: "15%", textAlign: "right", borderRight: "none" }}>
                            <span style={{ fontSize: "14px", fontWeight: 900 }}>Subject:</span>
                          </td>
                          <td colSpan={4} style={{ textAlign: "center", borderLeft: "none", borderRight: "none" }}>
                            <u style={{ fontSize: "14px", fontWeight: 900 }}>{vcMeta.subject}</u>
                          </td>
                          <td style={{ borderLeft: "none", whiteSpace: "nowrap" }}>
                            <span style={{ fontWeight: 800 }}>Institute:</span> {vcMeta.institute}
                          </td>
                        </tr>
                      </tbody>
                    </table>

                    {/* Main Approval Table with yellow headers */}
                    <table className="official-table">
                      <thead>
                        <tr>
                          <th rowSpan={2} style={{ width: "40px" }}>S.No.</th>
                          <th rowSpan={2} style={{ width: "80px" }}>Paper Code</th>
                          <th rowSpan={2} style={{ width: "140px" }}>Paper Name</th>
                          <th rowSpan={2} style={{ width: "150px" }}>Name of External Examiner</th>
                          <th rowSpan={2} style={{ width: "80px" }}>Ex. Code</th>
                          <th rowSpan={2} style={{ width: "110px" }}>Designation</th>
                          <th rowSpan={2} style={{ width: "60px" }}>Category</th>
                          <th colSpan={2} style={{ width: "90px" }}>
                            Experience<br />
                            (In Years)
                          </th>
                          <th rowSpan={2} style={{ minWidth: "200px" }}>Institute Address</th>
                          <th rowSpan={2} style={{ width: "80px" }}>Remarks</th>
                        </tr>
                        <tr>
                          <th style={{ width: "45px" }}>UG</th>
                          <th style={{ width: "45px" }}>PG</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paperGroup.examiners.map((examiner, exIdx) => (
                          <tr key={exIdx}>
                            {exIdx === 0 && (
                              <>
                                <td
                                  rowSpan={paperGroup.examiners.length}
                                  style={{ textAlign: "center", fontWeight: 700 }}
                                >
                                  {paperGroup.sno || pageIdx + 1}
                                </td>
                                <td
                                  rowSpan={paperGroup.examiners.length}
                                  style={{ textAlign: "center", fontWeight: 700 }}
                                >
                                  {paperGroup.papercode}
                                </td>
                                <td
                                  rowSpan={paperGroup.examiners.length}
                                  style={{ textAlign: "center", fontWeight: 700 }}
                                >
                                  {paperGroup.papername}
                                </td>
                              </>
                            )}
                            <td style={{ textAlign: "left", fontWeight: 600 }}>{examiner.name}</td>
                            <td style={{ textAlign: "center", fontWeight: 600 }}>{examiner.examinercode || "-"}</td>
                            <td style={{ textAlign: "left" }}>{examiner.designation}</td>
                            <td style={{ textAlign: "center" }}>{examiner.category}</td>
                            <td style={{ textAlign: "center" }}>{examiner.expUg}</td>
                            <td style={{ textAlign: "center" }}>{examiner.expPg}</td>
                            <td style={{ textAlign: "left" }}>{examiner.address}</td>
                            <td style={{ textAlign: "center" }}>{examiner.remarks}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </Box>

                  {/* Signatures at bottom of page */}
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-end",
                      mt: 6,
                      pt: 2,
                      px: 2
                    }}
                  >
                    <Box sx={{ textAlign: "left" }}>
                      <Typography sx={{ fontWeight: 900, fontSize: "14px", color: "#000" }}>
                        {ins?.vctitle || "Vice Chancellor"}
                      </Typography>
                      {ins?.vcname && (
                        <Typography sx={{ fontWeight: 700, fontSize: "12px", color: "#334155" }}>
                          ({ins.vcname})
                        </Typography>
                      )}
                    </Box>
                    <Box sx={{ textAlign: "right" }}>
                      <Typography sx={{ fontWeight: 900, fontSize: "14px", color: "#000" }}>
                        {ins?.coetitle || "Controller of Examinations"}
                      </Typography>
                      {ins?.coename && (
                        <Typography sx={{ fontWeight: 700, fontSize: "12px", color: "#334155" }}>
                          ({ins.coename})
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </Card>
              ))}
            </Box>
          )}

          {/* ----------------- FORMAT 3: PIVOT & ANALYTICS VIEW ----------------- */}
          {reportFormat === "analytics" && (
            <Paper elevation={0} sx={{ p: 2.5, mb: 2, border: "1px solid #d1d5db", borderRadius: 2, bgcolor: "#fff" }}>
              <Stack alignItems="center" spacing={0.5} sx={{ textAlign: "center", mb: 2 }}>
                {ins?.logo && (
                  <Box component="img" src={ins.logo} alt="Logo" sx={{ height: 64, objectFit: "contain" }} />
                )}
                <Typography variant="h6" fontWeight={900}>
                  {ins?.insname || ins?.name || "PEOPLE'S UNIVERSITY"}
                </Typography>
                <Typography variant="body2">{ins?.address || ins?.insaddress || ""}</Typography>
                <Typography variant="h6" fontWeight={900} sx={{ mt: 1 }}>
                  Examiner Allotment Report
                </Typography>
              </Stack>

              <Grid container spacing={1.5} sx={{ mb: 2 }}>
                {[
                  { label: "Allocated Papers", value: totalPapers },
                  { label: "Examiners", value: examinerCount },
                  { label: "Courses", value: courseCount }
                ].map((card) => (
                  <Grid item xs={12} md={4} key={card.label}>
                    <Paper variant="outlined" sx={{ p: 1.5, textAlign: "center", borderColor: "#cbd5e1" }}>
                      <Typography variant="body2" color="text.secondary">
                        {card.label}
                      </Typography>
                      <Typography variant="h5" fontWeight={900}>
                        {card.value}
                      </Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>

              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12} md={7}>
                  <Paper variant="outlined" sx={{ p: 1, height: 300 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartRows}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" hide />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="count" name="Allocated Papers" fill="#2563eb" />
                      </BarChart>
                    </ResponsiveContainer>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={5}>
                  <Paper variant="outlined" sx={{ p: 1, height: 300 }}>
                    <PieChart>
                      <Pie data={chartRows} dataKey="count" nameKey="name" outerRadius={90} label>
                        {chartRows.map((entry, index) => (
                          <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </Paper>
                </Grid>
              </Grid>

              <Box sx={{ mb: 2 }}>
                <Autocomplete
                  multiple
                  disableCloseOnSelect
                  options={fieldOptions}
                  value={pivotFields}
                  onChange={(event, value) => setPivotFields(value || [])}
                  getOptionLabel={(option) => labels[option] || option}
                  renderOption={(props, option, { selected }) => (
                    <li {...props}>
                      <Checkbox checked={selected} sx={{ mr: 1 }} />
                      {labels[option] || option}
                    </li>
                  )}
                  renderInput={(params) => (
                    <TextField {...params} label="Pivot Fields" placeholder="Select fields" />
                  )}
                />
              </Box>

              <Box sx={{ height: 520, width: "100%" }}>
                <DataGrid
                  rows={pivotRows}
                  columns={columns}
                  slots={{ toolbar: GridToolbar }}
                  slotProps={{
                    toolbar: {
                      showQuickFilter: true,
                      csvOptions: { fileName: "examiner_allotment_report" }
                    }
                  }}
                  pageSizeOptions={[10, 25, 50, 100]}
                  disableRowSelectionOnClick
                />
              </Box>
            </Paper>
          )}
        </Box>
      </Box>
    </MenuPageShell>
  );
}
