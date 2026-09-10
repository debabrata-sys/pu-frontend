import React, { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { Alert, Box, Button, CircularProgress, FormControl, Grid, InputLabel, MenuItem, Paper, Select, Stack, Typography } from "@mui/material";
import { DataGrid, GridToolbar } from "@mui/x-data-grid";
import PrintIcon from "@mui/icons-material/Print";
import VerifiedIcon from "@mui/icons-material/Verified";
import MenuPageShell from "./MenuPageShell";
import ep1 from "../api/ep1";
import global1 from "./global1";

const filterFields = ["academicyear", "exam", "examcode", "regulation", "program", "programcode", "semester", "section", "student", "regno"];
const labels = { academicyear: "Academic Year", exam: "Exam", examcode: "Exam Code", regulation: "Regulation", program: "Program", programcode: "Program Code", semester: "Semester", section: "Section", student: "Student", regno: "Reg No" };
const origin = () => window.location.origin;
const verificationUrl = ({ colid, regno, hash }) => `${origin()}/verify-hallticket-blockchain?colid=${encodeURIComponent(colid)}&regno=${encodeURIComponent(regno || "")}&hash=${encodeURIComponent(hash || "")}`;
const valueText = (...values) => values.map((value) => String(value || "").trim()).find(Boolean) || "-";
const formatAdmitDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" }).replace(/ /g, "-");
};
const romanSemester = (value) => {
  const map = { "1": "I", "2": "II", "3": "III", "4": "IV", "5": "V", "6": "VI", "7": "VII", "8": "VIII", "9": "IX", "10": "X" };
  const cleaned = String(value || "").trim();
  return map[cleaned] || cleaned || "-";
};
const photoUrl = (student = {}) => valueText(student.photo, student.photolink, student.profilephoto, "").replace(/^-$/, "");

function HallTicketPrint({ ticket, qr }) {
  if (!ticket) return null;
  const institution = ticket.institution || {};
  const student = ticket.student || {};
  const exam = ticket.exam || {};
  const rows = ticket.rows || [];
  return (
    <Box id="hall-ticket-print" sx={{ bgcolor: "#fff", color: "#111827", p: 3, maxWidth: 900, mx: "auto", border: "1px solid #d1d5db", "@media print": { border: 0, p: 1.5, maxWidth: "100%" } }}>
      <style>{`@media print{body *{visibility:hidden}#hall-ticket-print,#hall-ticket-print *{visibility:visible}#hall-ticket-print{position:absolute;left:0;top:0;width:100%}.no-print{display:none!important}}`}</style>
      <Stack direction="row" spacing={2} alignItems="center" justifyContent="center" sx={{ borderBottom: "2px solid #111827", pb: 1.5, mb: 2, textAlign: "center" }}>
        {institution.logolink && <Box component="img" src={institution.logolink} alt="Logo" sx={{ width: 72, height: 72, objectFit: "contain" }} />}
        <Box>
          <Typography variant="h5" fontWeight={900}>{institution.institutionname || global1.insname || "Institution"}</Typography>
          <Typography variant="body2">{institution.address || ""}</Typography>
          <Typography variant="h6" fontWeight={900} sx={{ mt: 1 }}>HALL TICKET</Typography>
        </Box>
      </Stack>
      <Grid container spacing={1.2} sx={{ mb: 2 }}>
        {[
          ["Student", student.name || rows[0]?.student],
          ["Reg No", student.regno || rows[0]?.regno],
          ["Email", student.email || rows[0]?.email],
          ["Phone", student.phone || rows[0]?.phone],
          ["Academic Year", exam.academicyear],
          ["Exam", `${exam.exam || ""} (${exam.examcode || ""})`],
          ["Program", `${exam.program || ""} (${exam.programcode || ""})`],
          ["Regulation", exam.regulation],
          ["Semester", rows[0]?.semester],
          ["Section", student.section || rows[0]?.section]
        ].map(([label, value]) => (
          <Grid item xs={12} sm={6} md={4} key={label}>
            <Typography variant="caption" color="text.secondary">{label}</Typography>
            <Typography fontWeight={800}>{value || "-"}</Typography>
          </Grid>
        ))}
      </Grid>
      <Box sx={{ overflowX: "auto", mb: 2 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr>
              {["Course", "Course Code", "Date", "Slot", "Campus", "Building", "Room", "Seat"].map((head) => <th key={head} style={{ border: "1px solid #9ca3af", padding: 8, background: "#f3f4f6", textAlign: "left" }}>{head}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row._id}>
                <td style={{ border: "1px solid #d1d5db", padding: 8 }}>{row.course}</td>
                <td style={{ border: "1px solid #d1d5db", padding: 8 }}>{row.coursecode}</td>
                <td style={{ border: "1px solid #d1d5db", padding: 8 }}>{row.examdate || "-"}</td>
                <td style={{ border: "1px solid #d1d5db", padding: 8 }}>{row.examslot || "-"}</td>
                <td style={{ border: "1px solid #d1d5db", padding: 8 }}>{row.campus || "-"}</td>
                <td style={{ border: "1px solid #d1d5db", padding: 8 }}>{row.building || "-"}</td>
                <td style={{ border: "1px solid #d1d5db", padding: 8 }}>{row.examroom || "-"}</td>
                <td style={{ border: "1px solid #d1d5db", padding: 8 }}>{row.seatno || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Box>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-end" sx={{ mt: 4 }}>
        <Box>
          <Typography variant="body2" fontWeight={800}>Instructions</Typography>
          <Typography variant="caption" display="block">Carry institution ID card and this hall ticket. Report before the scheduled time.</Typography>
        </Box>
        {qr && <Box sx={{ textAlign: "center" }}><Box component="img" src={qr} alt="Blockchain QR" sx={{ width: 110, height: 110 }} /><Typography variant="caption">Blockchain verify</Typography></Box>}
        <Box sx={{ textAlign: "center", minWidth: 180, borderTop: "1px solid #111827", pt: 1 }}>Controller of Examinations</Box>
      </Stack>
    </Box>
  );
}

function HallTicketPrint2({ ticket, qr, printId = "hall-ticket-print-2", bulk = false }) {
  if (!ticket) return null;
  const institution = ticket.institution || {};
  const student = ticket.student || {};
  const exam = ticket.exam || {};
  const rows = ticket.rows || [];
  const first = rows[0] || {};
  const logo = valueText(institution.logolink, institution.logo, global1.logo, "").replace(/^-$/, "");
  const photo = photoUrl(student);
  const examName = valueText(exam.exam, first.exam);
  const examCode = valueText(exam.examcode, first.examcode, "");
  const institute = valueText(student.institution, institution.institutionname, global1.insname, "Institution");
  const centre = valueText(first.examcentre, first.examcenter, first.campus && first.building ? `${first.campus}, ${first.building}` : "", first.campus, institution.institutionname);
  const batch = valueText(student.admissionyear, first.admissionyear, student.academicyear, first.academicyear);
  const mainSupp = /supp/i.test(valueText(first.examtype, first.type, exam.exam, "")) ? "Suppl." : "Main";
  return (
    <Box id={printId} className={bulk ? "hall-ticket-print-2-page" : ""} sx={{
      bgcolor: "#fff",
      color: "#000",
      width: "210mm",
      minHeight: "297mm",
      mx: "auto",
      p: "9mm 9mm",
      fontFamily: "Arial, Helvetica, sans-serif",
      fontSize: "13px",
      lineHeight: 1.18,
      boxSizing: "border-box",
      position: "relative",
      "@media print": {
        position: "absolute",
        left: 0,
        top: 0,
        width: "210mm",
        minHeight: "297mm",
        p: "9mm 9mm",
        boxShadow: "none"
      }
    }}>
      <style>{`
        @page{size:A4;margin:0}
        @media print{body *{visibility:hidden}#${printId},#${printId} *{visibility:visible}.no-print{display:none!important}}
        #${printId} table{border-collapse:collapse}
        #${printId} th,#${printId} td{color:#000}
      `}</style>
      <Box sx={{ display: "grid", gridTemplateColumns: "105px 1fr 92px", alignItems: "start", columnGap: 2, mb: 1.2 }}>
        <Box>{logo && <Box component="img" src={logo} alt="Logo" sx={{ width: 78, maxHeight: 82, objectFit: "contain" }} />}</Box>
        <Box sx={{ textAlign: "center", pt: 0.5 }}>
          <Typography sx={{ fontSize: 24, color: "#000", fontWeight: 500, letterSpacing: 0, mb: 2.6 }}>ADMIT CARD</Typography>
          <Typography sx={{ fontSize: 16, color: "#000", textAlign: "left", pl: 1 }}>
            <Box component="span" sx={{ mr: 1.5 }}>Exam Name:</Box>
            <Box component="span">{examName}{examCode && examName !== examCode ? `, ${examCode}` : ""}</Box>
          </Typography>
        </Box>
        <Box sx={{ textAlign: "right" }}>
          {photo ? (
            <Box component="img" src={photo} alt="Student" sx={{ width: 68, height: 84, objectFit: "cover" }} />
          ) : (
            <Box sx={{ width: 68, height: 84, ml: "auto", border: "1px solid #000", display: "grid", placeItems: "center", fontSize: 10 }}>Photo</Box>
          )}
        </Box>
      </Box>

      <Box sx={{ borderTop: "2px solid #000", borderBottom: "1px solid #000", py: 0.8, mb: 1.4 }}>
        <Typography sx={{ fontSize: 16, color: "#000" }}>
          <Box component="span" sx={{ mr: 2 }}>Examination Centre:</Box>
          <Box component="span">{centre}</Box>
        </Typography>
      </Box>

      <Box sx={{ borderBottom: "1px solid #000", pb: 1.2, mb: 1 }}>
        <Box sx={{ display: "grid", gridTemplateColumns: "1.15fr 1fr 1.2fr 0.8fr 1.1fr 1.15fr", rowGap: 1, textAlign: "center" }}>
          {["Enrollment No:", "Course", "Specialization", "Year", "Main/Suppl.", "Academic Batch"].map((item) => (
            <Typography key={item} sx={{ fontSize: 14, color: "#000" }}>{item}</Typography>
          ))}
          {[valueText(student.regno, first.regno), valueText(exam.programcode, first.programcode, exam.program, first.program), valueText(student.specialization1, student.specialization, first.subject, "-"), romanSemester(first.semester || student.semester), mainSupp, batch].map((item, index) => (
            <Typography key={`${item}-${index}`} sx={{ fontSize: 14, color: "#000" }}>{item}</Typography>
          ))}
        </Box>
      </Box>

      <Box sx={{ borderBottom: "2px solid #000", pb: 0.8, mb: 0.8 }}>
        {[
          ["Examinee Name:", valueText(student.name, first.student)],
          ["Father's Name:", valueText(student.fathername, student.guardianname)],
          ["Institute :", institute]
        ].map(([label, value]) => (
          <Box key={label} sx={{ display: "grid", gridTemplateColumns: "155px 1fr", mb: 0.8 }}>
            <Typography sx={{ fontSize: 14, color: "#000" }}>{label}</Typography>
            <Typography sx={{ fontSize: 14, color: "#000" }}>{value}</Typography>
          </Box>
        ))}
      </Box>

      <Typography sx={{ textAlign: "center", fontSize: 14, color: "#000", mb: 0.5 }}>
        The above examinee appear in following Paper (s)
      </Typography>
      <table style={{ width: "100%", border: "1px solid #000", fontSize: 13, marginBottom: 0 }}>
        <thead>
          <tr>
            <th style={{ border: "1px solid #000", padding: "3px 7px", fontSize: 15, fontWeight: 500 }}>DOTE</th>
            <th style={{ border: "1px solid #000", padding: "3px 7px", fontSize: 15, fontWeight: 500 }}>TIME</th>
            <th style={{ border: "1px solid #000", padding: "3px 7px", fontSize: 15, fontWeight: 500 }}>Subject Code</th>
            <th style={{ border: "1px solid #000", padding: "3px 7px", fontSize: 15, fontWeight: 500 }}>Subject Name</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row._id || `${row.coursecode}-${row.examdate}`}>
              <td style={{ border: "1px solid #000", padding: "3px 8px", textAlign: "center" }}>{formatAdmitDate(row.examdate)}</td>
              <td style={{ border: "1px solid #000", padding: "3px 8px", textAlign: "center" }}>{valueText(row.examtime, row.examslot)}</td>
              <td style={{ border: "1px solid #000", padding: "3px 8px", textAlign: "center" }}>{valueText(row.coursecode)}</td>
              <td style={{ border: "1px solid #000", padding: "3px 8px" }}>{valueText(row.course)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {qr && (
        <Box sx={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 1, mt: 1 }}>
          <Typography sx={{ fontSize: 10, color: "#000" }}>Blockchain verification</Typography>
          <Box component="img" src={qr} alt="Blockchain QR" sx={{ width: 58, height: 58 }} />
        </Box>
      )}

      <Box sx={{ mt: 2 }}>
        <Typography sx={{ fontSize: 13, color: "#000", textDecoration: "underline", mb: 1 }}>Instructions for Examinee</Typography>
        {[
          "Examinee has to report 15 minutes before, in the Examination room of the given schedule time.",
          "Examinee can leave the Examination room with due permission of the Invigilator.",
          "If Examinee is out of Examination room for more than 5 (Five) minutes for any specified reasons recorded by the Invigilator. After this period the answer book will be collected by the Invigilator.",
          "No Examinee will be permitted to leave the Examination room in first hour and last half an hour of Examination.",
          "For any type of copying, Examinee will be covered under Un-fair means (UFM).",
          "Maintain discipline, decorum and peace in the Examination room.",
          "Mobile / Calculator / Any electronic device is not permitted. Calculator will be permitted only as per requirement.",
          "No provision of Supplementary sheet.[ only 40 pages & 20 pages Answer book where applicable]",
          "Examinee must carry a valid PHOTO IDENTITY CARD.",
          "If in case of any deficiency in Date Of Theory Exam (DOTE) then circulated examination Schedule DOTE will be final."
        ].map((item, index) => (
          <Typography key={item} sx={{ fontSize: 12.5, color: "#000", lineHeight: 1.18 }}>{index + 1}. {item}</Typography>
        ))}
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", alignItems: "end", mt: 5, fontSize: 14, color: "#000" }}>
        <Typography sx={{ fontSize: 14, color: "#000" }}>Signature of Examinee</Typography>
        <Typography sx={{ fontSize: 14, color: "#000", textAlign: "center" }}>Signature of COE with Seal</Typography>
        <Typography sx={{ fontSize: 14, color: "#000", textAlign: "right" }}>Signature of VFS with Seal</Typography>
      </Box>
    </Box>
  );
}

function HallTicketBulkPrint2({ tickets }) {
  if (!tickets.length) return null;
  return (
    <Box id="hall-ticket-print-2-bulk" sx={{ bgcolor: "#fff" }}>
      <style>{`
        @page{size:A4 portrait;margin:0}
        @media print{
          body *{visibility:hidden}
          #hall-ticket-print-2-bulk,#hall-ticket-print-2-bulk *{visibility:visible}
          #hall-ticket-print-2-bulk{position:absolute;left:0;top:0;width:210mm;background:#fff}
          .no-print{display:none!important}
          .hall-ticket-print-2-page{page-break-after:always;break-after:page;box-shadow:none!important}
          .hall-ticket-print-2-page:last-child{page-break-after:auto;break-after:auto}
        }
      `}</style>
      {tickets.map((item, index) => (
        <HallTicketPrint2 key={`${item.ticket?.student?.regno || index}-${item.ticket?.exam?.examcode || index}`} ticket={item.ticket} qr={item.qr} printId={`hall-ticket-print-2-bulk-${index}`} bulk />
      ))}
    </Box>
  );
}

function useHallTicketCommon() {
  const [ticket, setTicket] = useState(null);
  const [block, setBlock] = useState(null);
  const [qr, setQr] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const generateQr = async (nextBlock, regno) => {
    const url = verificationUrl({ colid: global1.colid, regno, hash: nextBlock?.hash });
    setQr(await QRCode.toDataURL(url, { width: 180, margin: 1 }));
    return url;
  };
  const print = () => window.print();
  return { ticket, setTicket, block, setBlock, qr, setQr, message, setMessage, error, setError, generateQr, print };
}

export default function ConductExamHallTicketPage() {
  const [options, setOptions] = useState({});
  const [filters, setFilters] = useState({});
  const [students, setStudents] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [storing, setStoring] = useState(false);
  const common = useHallTicketCommon();

  useEffect(() => { loadOptions(); loadStudents(); }, []);

  const params = (source = filters) => {
    const next = { colid: global1.colid };
    filterFields.forEach((field) => { if (source[field]) next[field] = source[field]; });
    return next;
  };
  const loadOptions = async () => {
    const res = await ep1.get("/api/v2/conductexam/hallticket-options", { params: { colid: global1.colid } });
    setOptions(res.data?.options || {});
  };
  const loadStudents = async (nextFilters = filters) => {
    try {
      setLoading(true);
      common.setError("");
      const res = await ep1.get("/api/v2/conductexam/hallticket-eligible-students", { params: params(nextFilters) });
      setStudents(res.data?.data || []);
    } catch (err) {
      common.setError(err.response?.data?.message || "Unable to load eligible students");
    } finally {
      setLoading(false);
    }
  };
  const loadTicket = async (row) => {
    setSelected(row);
    common.setBlock(null);
    common.setQr("");
    const res = await ep1.get("/api/v2/conductexam/hallticket", { params: { colid: global1.colid, academicyear: row.academicyear, examcode: row.examcode, regno: row.regno } });
    common.setTicket(res.data?.data || null);
  };
  const storeBlockchain = async () => {
    if (!selected) return;
    try {
      setStoring(true);
      const res = await ep1.post("/api/v2/conductexam/hallticket-blockchain-store", { colid: global1.colid, academicyear: selected.academicyear, examcode: selected.examcode, regno: selected.regno, user: global1.user });
      common.setBlock(res.data?.data || null);
      const url = await common.generateQr(res.data?.data, selected.regno);
      common.setMessage(`Stored in blockchain. Verification: ${url}`);
    } catch (err) {
      common.setError(err.response?.data?.message || "Unable to store hall ticket in blockchain");
    } finally {
      setStoring(false);
    }
  };
  const columns = [
    { field: "student", headerName: "Student", width: 180 },
    { field: "regno", headerName: "Reg No", width: 130 },
    { field: "academicyear", headerName: "Academic Year", width: 130 },
    { field: "exam", headerName: "Exam", width: 180 },
    { field: "examcode", headerName: "Exam Code", width: 130 },
    { field: "program", headerName: "Program", width: 190 },
    { field: "programcode", headerName: "Program Code", width: 130 },
    { field: "coursecount", headerName: "Courses", width: 100 }
  ];
  return (
    <MenuPageShell title="Generate hall ticket">
      <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: "#f6f7fb", minHeight: "100vh" }}>
        <Paper elevation={0} sx={{ p: 2.5, mb: 2, border: "1px solid #e5e7eb", borderRadius: 2 }}>
          <Typography variant="h5" fontWeight={900}>Generate Hall Ticket</Typography>
          <Typography color="text.secondary">Only students with Attendance, Fees, ATKT and Disciplinary marked Yes are listed.</Typography>
        </Paper>
        {common.message && <Alert severity="success" sx={{ mb: 2 }}>{common.message}</Alert>}
        {common.error && <Alert severity="error" sx={{ mb: 2 }}>{common.error}</Alert>}
        <Paper elevation={0} sx={{ p: 2.5, mb: 2, border: "1px solid #e5e7eb", borderRadius: 2 }}>
          <Grid container spacing={2}>
            {filterFields.slice(0, 6).map((field) => (
              <Grid item xs={12} sm={6} md={2} key={field}>
                <FormControl fullWidth>
                  <InputLabel>{labels[field]}</InputLabel>
                  <Select label={labels[field]} value={filters[field] || ""} onChange={(e) => setFilters((prev) => ({ ...prev, [field]: e.target.value }))}>
                    <MenuItem value="">All</MenuItem>
                    {(options[field] || []).map((value) => <MenuItem key={value} value={value}>{value}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
            ))}
            <Grid item xs={12} md={2}><Button fullWidth variant="contained" onClick={() => loadStudents()} disabled={loading} sx={{ height: 56 }}>{loading ? "Loading..." : "Apply"}</Button></Grid>
          </Grid>
        </Paper>
        <Paper elevation={0} sx={{ p: 1.5, mb: 2, border: "1px solid #e5e7eb", borderRadius: 2, overflowX: "auto" }}>
          <DataGrid rows={students.map((row) => ({ ...row, id: `${row.regno}-${row.academicyear}-${row.examcode}` }))} columns={columns} loading={loading} autoHeight slots={{ toolbar: GridToolbar }} pageSizeOptions={[10, 25, 50, 100]} onRowClick={(params) => loadTicket(params.row)} sx={{ minWidth: 1100 }} />
        </Paper>
        {common.ticket && (
          <Stack direction="row" spacing={1} sx={{ mb: 2 }} className="no-print">
            <Button variant="contained" startIcon={<PrintIcon />} onClick={common.print}>Print</Button>
            <Button variant="outlined" startIcon={storing ? <CircularProgress size={18} /> : <VerifiedIcon />} disabled={storing} onClick={storeBlockchain}>{storing ? "Storing..." : "Store in Blockchain"}</Button>
          </Stack>
        )}
        <HallTicketPrint ticket={common.ticket} qr={common.qr} />
      </Box>
    </MenuPageShell>
  );
}

export function ConductExamHallTicket2Page() {
  const [options, setOptions] = useState({});
  const [filters, setFilters] = useState({});
  const [students, setStudents] = useState([]);
  const [selected, setSelected] = useState(null);
  const [selectedRows, setSelectedRows] = useState([]);
  const [bulkTickets, setBulkTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [storing, setStoring] = useState(false);
  const common = useHallTicketCommon();

  useEffect(() => { loadOptions(); loadStudents(); }, []);

  const params = (source = filters) => {
    const next = { colid: global1.colid };
    filterFields.forEach((field) => { if (source[field]) next[field] = source[field]; });
    return next;
  };
  const loadOptions = async () => {
    const res = await ep1.get("/api/v2/conductexam/hallticket-options", { params: { colid: global1.colid } });
    setOptions(res.data?.options || {});
  };
  const loadStudents = async (nextFilters = filters) => {
    try {
      setLoading(true);
      common.setError("");
      const res = await ep1.get("/api/v2/conductexam/hallticket-eligible-students", { params: params(nextFilters) });
      setStudents(res.data?.data || []);
    } catch (err) {
      common.setError(err.response?.data?.message || "Unable to load eligible students");
    } finally {
      setLoading(false);
    }
  };
  const loadTicket = async (row) => {
    setSelected(row);
    common.setBlock(null);
    common.setQr("");
    const res = await ep1.get("/api/v2/conductexam/hallticket", { params: { colid: global1.colid, academicyear: row.academicyear, examcode: row.examcode, regno: row.regno } });
    common.setTicket(res.data?.data || null);
    setBulkTickets([]);
  };
  const loadBulkTickets = async () => {
    try {
      setBulkLoading(true);
      common.setError("");
      common.setMessage("");
      common.setTicket(null);
      const selectedSet = new Set(selectedRows);
      const rows = students
        .map((row) => ({ ...row, id: `${row.regno}-${row.academicyear}-${row.examcode}` }))
        .filter((row) => selectedSet.has(row.id));
      if (!rows.length) {
        common.setError("Please select at least one student");
        return;
      }
      const payloads = [];
      for (const row of rows) {
        const res = await ep1.get("/api/v2/conductexam/hallticket", { params: { colid: global1.colid, academicyear: row.academicyear, examcode: row.examcode, regno: row.regno } });
        payloads.push({ ticket: res.data?.data || null, qr: "" });
      }
      setBulkTickets(payloads.filter((item) => item.ticket));
      common.setMessage(`${payloads.filter((item) => item.ticket).length} admit card(s) generated for print.`);
    } catch (err) {
      common.setError(err.response?.data?.message || "Unable to generate selected admit cards");
    } finally {
      setBulkLoading(false);
    }
  };
  const storeBlockchain = async () => {
    if (!selected) return;
    try {
      setStoring(true);
      const res = await ep1.post("/api/v2/conductexam/hallticket-blockchain-store", { colid: global1.colid, academicyear: selected.academicyear, examcode: selected.examcode, regno: selected.regno, user: global1.user });
      common.setBlock(res.data?.data || null);
      const url = await common.generateQr(res.data?.data, selected.regno);
      common.setMessage(`Stored in blockchain. Verification: ${url}`);
    } catch (err) {
      common.setError(err.response?.data?.message || "Unable to store hall ticket in blockchain");
    } finally {
      setStoring(false);
    }
  };
  const columns = [
    { field: "student", headerName: "Student", width: 180 },
    { field: "regno", headerName: "Reg No", width: 130 },
    { field: "academicyear", headerName: "Academic Year", width: 130 },
    { field: "exam", headerName: "Exam", width: 180 },
    { field: "examcode", headerName: "Exam Code", width: 130 },
    { field: "program", headerName: "Program", width: 190 },
    { field: "programcode", headerName: "Program Code", width: 130 },
    { field: "semester", headerName: "Semester", width: 110 },
    { field: "coursecount", headerName: "Courses", width: 100 }
  ];
  return (
    <MenuPageShell title="Generate hall ticket 2">
      <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: "#f6f7fb", minHeight: "100vh" }}>
        <Paper elevation={0} sx={{ p: 2.5, mb: 2, border: "1px solid #e5e7eb", borderRadius: 2 }}>
          <Typography variant="h5" fontWeight={900}>Generate Admit Card 2</Typography>
          <Typography color="text.secondary">Select one or many eligible students and generate admit cards one after another in A4 format.</Typography>
        </Paper>
        {common.message && <Alert severity="success" sx={{ mb: 2 }}>{common.message}</Alert>}
        {common.error && <Alert severity="error" sx={{ mb: 2 }}>{common.error}</Alert>}
        <Paper elevation={0} sx={{ p: 2.5, mb: 2, border: "1px solid #e5e7eb", borderRadius: 2 }}>
          <Grid container spacing={2}>
            {filterFields.slice(0, 8).map((field) => (
              <Grid item xs={12} sm={6} md={2} key={field}>
                <FormControl fullWidth>
                  <InputLabel>{labels[field]}</InputLabel>
                  <Select label={labels[field]} value={filters[field] || ""} onChange={(e) => setFilters((prev) => ({ ...prev, [field]: e.target.value }))}>
                    <MenuItem value="">All</MenuItem>
                    {(options[field] || []).map((value) => <MenuItem key={value} value={value}>{value}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
            ))}
            <Grid item xs={12} md={2}><Button fullWidth variant="contained" onClick={() => loadStudents()} disabled={loading} sx={{ height: 56 }}>{loading ? "Loading..." : "Apply"}</Button></Grid>
          </Grid>
        </Paper>
        <Paper elevation={0} sx={{ p: 1.5, mb: 2, border: "1px solid #e5e7eb", borderRadius: 2, overflowX: "auto" }}>
          <DataGrid
            rows={students.map((row) => ({ ...row, id: `${row.regno}-${row.academicyear}-${row.examcode}` }))}
            columns={columns}
            loading={loading}
            checkboxSelection
            rowSelectionModel={selectedRows}
            onRowSelectionModelChange={(model) => setSelectedRows(model)}
            autoHeight
            slots={{ toolbar: GridToolbar }}
            pageSizeOptions={[10, 25, 50, 100]}
            onRowClick={(params) => loadTicket(params.row)}
            sx={{ minWidth: 1200 }}
          />
        </Paper>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mb: 2 }} className="no-print">
          <Button variant="contained" disabled={bulkLoading || !selectedRows.length} onClick={loadBulkTickets}>{bulkLoading ? "Generating..." : "Generate selected admit cards"}</Button>
          <Button variant="outlined" startIcon={<PrintIcon />} disabled={!bulkTickets.length} onClick={() => window.print()}>Print selected</Button>
        </Stack>
        {common.ticket && (
          <Stack direction="row" spacing={1} sx={{ mb: 2 }} className="no-print">
            <Button variant="contained" startIcon={<PrintIcon />} onClick={common.print}>Print</Button>
            <Button variant="outlined" startIcon={storing ? <CircularProgress size={18} /> : <VerifiedIcon />} disabled={storing} onClick={storeBlockchain}>{storing ? "Storing..." : "Store in Blockchain"}</Button>
          </Stack>
        )}
        {bulkTickets.length ? <HallTicketBulkPrint2 tickets={bulkTickets} /> : <HallTicketPrint2 ticket={common.ticket} qr={common.qr} />}
      </Box>
    </MenuPageShell>
  );
}

export function StudentAdmitCardNewPage() {
  const [options, setOptions] = useState({});
  const [filters, setFilters] = useState({});
  const [loading, setLoading] = useState(false);
  const common = useHallTicketCommon();
  useEffect(() => { loadOptions(); }, []);
  const loadOptions = async () => {
    const res = await ep1.get("/api/v2/conductexam/student-admitcard-options", { params: { colid: global1.colid, regno: global1.regno } });
    setOptions(res.data?.options || {});
  };
  const loadTicket = async () => {
    try {
      setLoading(true);
      common.setError("");
      common.setQr("");
      common.setBlock(null);
      const res = await ep1.get("/api/v2/conductexam/hallticket", { params: { colid: global1.colid, regno: global1.regno, academicyear: filters.academicyear, examcode: filters.examcode, requireControl: "Yes" } });
      common.setTicket(res.data?.data || null);
    } catch (err) {
      common.setError(err.response?.data?.message || "Unable to load admit card");
    } finally {
      setLoading(false);
    }
  };
  return (
    <MenuPageShell title="Admit card new" menuType="student">
      <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: "#f6f7fb", minHeight: "100vh" }}>
        <Paper elevation={0} sx={{ p: 2.5, mb: 2, border: "1px solid #e5e7eb", borderRadius: 2 }}>
          <Typography variant="h5" fontWeight={900}>Admit Card</Typography>
          <Typography color="text.secondary">Download admit card only when it is enabled by examination office.</Typography>
        </Paper>
        {common.error && <Alert severity="error" sx={{ mb: 2 }}>{common.error}</Alert>}
        <Paper elevation={0} sx={{ p: 2.5, mb: 2, border: "1px solid #e5e7eb", borderRadius: 2 }}>
          <Grid container spacing={2}>
            {["academicyear", "exam", "examcode"].map((field) => (
              <Grid item xs={12} md={3} key={field}>
                <FormControl fullWidth>
                  <InputLabel>{labels[field]}</InputLabel>
                  <Select label={labels[field]} value={filters[field] || ""} onChange={(e) => setFilters((prev) => ({ ...prev, [field]: e.target.value }))}>
                    <MenuItem value="">Select</MenuItem>
                    {(options[field] || []).map((value) => <MenuItem key={value} value={value}>{value}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
            ))}
            <Grid item xs={12} md={2}><Button fullWidth variant="contained" onClick={loadTicket} disabled={loading} sx={{ height: 56 }}>{loading ? "Loading..." : "Load"}</Button></Grid>
            {common.ticket && <Grid item xs={12} md={2}><Button fullWidth variant="outlined" startIcon={<PrintIcon />} onClick={common.print} sx={{ height: 56 }}>Print</Button></Grid>}
          </Grid>
        </Paper>
        <HallTicketPrint ticket={common.ticket} qr={common.qr} />
      </Box>
    </MenuPageShell>
  );
}

export function PublicHallTicketBlockchainVerifyPage() {
  const [params] = useState(() => new URLSearchParams(window.location.search));
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    ep1.get("/api/v2/public/hallticket-blockchain-verify", { params: Object.fromEntries(params.entries()) })
      .then((res) => setResult(res.data))
      .catch((err) => setError(err.response?.data?.message || "Unable to verify hall ticket"));
  }, [params]);
  const block = result?.data?.[0];
  return (
    <Box sx={{ p: { xs: 2, md: 4 }, bgcolor: "#f6f7fb", minHeight: "100vh" }}>
      {error && <Alert severity="error">{error}</Alert>}
      {result && <Alert severity={result.verified ? "success" : "warning"} sx={{ mb: 2 }}>{result.verified ? "Hall ticket verified from blockchain." : "No matching blockchain record found."}</Alert>}
      {block && <HallTicketPrint ticket={block.payload} />}
    </Box>
  );
}
