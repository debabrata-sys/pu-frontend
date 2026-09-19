import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Box, Button, CircularProgress, Typography } from "@mui/material";
import PrintIcon from "@mui/icons-material/Print";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ep1 from "../api/ep1";
import global1 from "./global1";
import MenuPageShell from "./MenuPageShell";
import { useExamConfig } from "../components/conductExam/ExamDocumentHeader";

const money = (value) => Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

export default function ConductExam2RemunerationBillPrint() {
  const { id } = useParams();
  const navigate = useNavigate();
  const colid = global1.colid || 1;

  const [bill, setBill] = useState(null);
  const [institution, setInstitution] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const { config: examConfig } = useExamConfig(colid);

  useEffect(() => {
    loadBillData();
  }, [id]);

  const loadBillData = async () => {
    try {
      setLoading(true);
      const res = await ep1.get(`/api/v2/conductexam2/remuneration/bills/${id}`, { params: { colid } });
      if (res.data?.success) {
        setBill(res.data.data);
        setInstitution(res.data.institution);
      } else {
        setError(res.data?.message || "Bill not found.");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Error loading bill details.");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <MenuPageShell title="Remuneration Bill">
        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
          <CircularProgress />
        </Box>
      </MenuPageShell>
    );
  }

  if (error || !bill) {
    return (
      <MenuPageShell title="Remuneration Bill">
        <Box sx={{ p: 4, textAlign: "center" }}>
          <Typography color="error" variant="h6" gutterBottom>
            {error || "Unable to display bill."}
          </Typography>
          <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => navigate("/conduct-exam-remuneration-payment")}>
            Back to Payments
          </Button>
        </Box>
      </MenuPageShell>
    );
  }

  const effectiveInst = {
    institutionname: examConfig?.institutionname || institution?.institutionname || institution?.name || "PEOPLE’S UNIVERSITY",
    affiliatedboard: examConfig?.affiliatedboard || institution?.affiliatedboard || "Established Under MP Act 17 of 2007 & Covered u/s 2(f) UGC Act",
    address: examConfig?.address || institution?.address || "People’s Campus, Bhanpur, Bhopal-462037",
    phone: examConfig?.phone || institution?.phone || "0755-4005402",
    email: examConfig?.email || institution?.email || "coe@peoplesuniversity.edu.in",
    website: examConfig?.website || institution?.website || "www.peoplesuniversity.edu.in",
    logo: examConfig?.logo || institution?.logo || institution?.logolink || "",
    coename: examConfig?.coename || institution?.coename || "",
    coetitle: examConfig?.coetitle || institution?.coetitle || "Assistant Registrar(Confidential)"
  };

  const assignments = bill.assignments || [];
  const settingAssignment = assignments.find((a) => (a.name || "").toLowerCase().includes("setting") || (a.name || "").toLowerCase().includes("moderation")) || {};
  const evalAssignment = assignments.find((a) => (a.name || "").toLowerCase().includes("eval") || (a.name || "").toLowerCase().includes("valua")) || {};
  const practicalAssignment = assignments.find((a) => (a.name || "").toLowerCase().includes("pract") || (a.name || "").toLowerCase().includes("viva")) || {};
  const postalAssignment = assignments.find((a) => (a.name || "").toLowerCase().includes("post")) || {};

  const travelDetails = bill.travelDetails || [];
  const grandTotal = money(bill.grandTotal || bill.totalamount || 0);
  const grandTotalWords = bill.grandTotalWords || bill.totalamount_words || "Rupees Only";

  return (
    <MenuPageShell title={`Remuneration Bill - ${bill.billno || ""}`}>
      {/* Strict Single Page Print Styling */}
      <style>{`
        @page {
          size: A4 portrait;
          margin: 5mm 7mm;
        }

        @media print {
          header, nav, aside, .MuiAppBar-root, .MuiDrawer-root, .no-print, [role="navigation"] {
            display: none !important;
          }
          body, html {
            background: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
            font-family: Arial, Helvetica, sans-serif !important;
            color: #000000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .bill-print-container {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 auto !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }
          .exact-pdf-box {
            border: 2px solid #000000 !important;
            box-sizing: border-box !important;
            padding: 5px 8px !important;
          }
          .bill-page-1 {
            page-break-after: always !important;
            break-after: page !important;
          }
          .bill-page-2 {
            page-break-before: always !important;
            break-before: page !important;
            margin-top: 0 !important;
            padding: 24px 28px !important;
          }
        }

        .bill-print-container {
          max-width: 820px;
          margin: 0 auto;
          background: #ffffff;
          box-sizing: border-box;
          font-family: Arial, Helvetica, sans-serif;
          color: #000000;
        }
        .exact-pdf-box {
          border: 2px solid #000000;
          box-sizing: border-box;
          padding: 8px 12px;
          background: #ffffff;
        }
      `}</style>

      {/* Screen Toolbar */}
      <Box className="no-print" sx={{ p: 2, mb: 2, bgcolor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 1.5, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => navigate("/conduct-exam-remuneration-payment")}>
          Back to Remuneration List
        </Button>
        <Typography variant="subtitle1" fontWeight={700} sx={{ color: "#0f172a" }}>
          Official Remuneration / T.A. / Local Conveyance Bill
        </Typography>
        <Button variant="contained" color="primary" startIcon={<PrintIcon />} onClick={handlePrint} sx={{ fontWeight: 700, px: 3 }}>
          Print Bill
        </Button>
      </Box>

      {/* Printable Exact PDF Canvas */}
      <Box className="bill-print-container">
        <Box className="exact-pdf-box bill-page-1">
          {/* ======================= INSTITUTION NAME (EXTRA LARGE SO ALL BELOW PARTS COME UNDER IT) ======================= */}
          <Box sx={{ textAlign: "center", mb: 0.5, width: "100%" }}>
            <Typography
              component="h1"
              sx={{
                fontWeight: 900,
                fontSize: { xs: "28px", sm: "36px", md: "40px" },
                letterSpacing: "1.5px",
                textTransform: "uppercase",
                color: "#000000",
                lineHeight: 1.1,
                m: 0,
                textAlign: "center"
              }}
            >
              {effectiveInst.institutionname}
            </Typography>

            {effectiveInst.affiliatedboard && (
              <Typography sx={{ fontSize: "11px", fontWeight: 700, color: "#000000", mt: 0.3, textAlign: "center" }}>
                {effectiveInst.affiliatedboard.startsWith("(") ? effectiveInst.affiliatedboard : `(${effectiveInst.affiliatedboard})`}
              </Typography>
            )}

            {effectiveInst.address && (
              <Typography sx={{ fontSize: "12px", fontWeight: 700, color: "#000000", mt: 0.2, textAlign: "center" }}>
                {effectiveInst.address}
              </Typography>
            )}
          </Box>

          {/* Sub Header Row with Logo on Left, Title in Center, and V.No / OCOE on Right */}
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.5 }}>
            {/* Left: Logo */}
            <Box sx={{ width: "115px", textAlign: "left" }}>
              {effectiveInst.logo ? (
                <img
                  src={effectiveInst.logo}
                  alt="Logo"
                  style={{ maxHeight: "60px", maxWidth: "95px", objectFit: "contain" }}
                  onError={(e) => { e.target.style.display = "none"; }}
                />
              ) : null}
            </Box>

            {/* Center: Bill Title */}
            <Box sx={{ flex: 1, textAlign: "center" }}>
              <Typography sx={{ fontWeight: 900, fontSize: "14px", letterSpacing: "0.5px", textTransform: "uppercase", color: "#000000" }}>
                REMUNERATION BILL
              </Typography>
              <Typography sx={{ fontStyle: "italic", fontSize: "10.5px", color: "#000000", mt: 0.2 }}>
                Bill should be submitted separately for each Paper Code
              </Typography>
            </Box>

            {/* Right: V.No & Stamp Box */}
            <Box sx={{ width: "120px", textAlign: "right" }}>
              <Typography sx={{ fontSize: "10.5px", fontWeight: "bold", mb: 0.3 }}>
                V.No. <span style={{ borderBottom: "1px solid #000", display: "inline-block", minWidth: "55px", textAlign: "center" }}>{bill.vno || ""}</span>
              </Typography>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10px", border: "1.5px solid #000" }}>
                <tbody>
                  <tr>
                    <td style={{ border: "1.5px solid #000", padding: "3px 5px", fontWeight: "bold", width: "50%", textAlign: "left" }}>OCOE</td>
                    <td style={{ border: "1.5px solid #000", padding: "3px 5px", width: "50%" }}>&nbsp;</td>
                  </tr>
                  <tr>
                    <td style={{ border: "1.5px solid #000", padding: "3px 5px", fontWeight: "bold", textAlign: "left" }}>OCFAO</td>
                    <td style={{ border: "1.5px solid #000", padding: "3px 5px" }}>&nbsp;</td>
                  </tr>
                </tbody>
              </table>
            </Box>
          </Box>

          {/* Repeating Decorative / Divider Line */}
          <Box sx={{ borderBottom: "2px double #000000", my: 0.8 }} />

          {/* ======================= EXAMINER PARTICULARS ======================= */}
          <Box sx={{ fontSize: "11px", lineHeight: 1.9, mb: 1, color: "#000000" }}>
            {/* Name */}
            <Box sx={{ display: "flex", alignItems: "flex-end" }}>
              <span style={{ whiteSpace: "nowrap", fontWeight: "bold", minWidth: "100px" }}>Name -</span>
              <span style={{ flex: 1, borderBottom: "1px dotted #000", marginLeft: "6px", paddingLeft: "4px", fontWeight: "bold" }}>
                {bill.examinername || ""}{bill.examinercode ? ` (${bill.examinercode})` : ""}
              </span>
            </Box>

            {/* Designation */}
            <Box sx={{ display: "flex", alignItems: "flex-end" }}>
              <span style={{ whiteSpace: "nowrap", fontWeight: "bold", minWidth: "100px" }}>Designation -</span>
              <span style={{ flex: 1, borderBottom: "1px dotted #000", marginLeft: "6px", paddingLeft: "4px" }}>
                {bill.designation || ""}
              </span>
            </Box>

            {/* Address */}
            <Box sx={{ display: "flex", alignItems: "flex-end" }}>
              <span style={{ whiteSpace: "nowrap", fontWeight: "bold", minWidth: "100px" }}>Address -</span>
              <span style={{ flex: 1, borderBottom: "1px dotted #000", marginLeft: "6px", paddingLeft: "4px" }}>
                {bill.instituteaddress || bill.institute || ""}
              </span>
            </Box>

            {/* Program + Academic Session */}
            <Box sx={{ display: "flex", alignItems: "flex-end" }}>
              <span style={{ whiteSpace: "nowrap", fontWeight: "bold", minWidth: "100px" }}>Program -</span>
              <span style={{ minWidth: "220px", borderBottom: "1px dotted #000", marginLeft: "6px", paddingLeft: "4px" }}>
                {bill.program || bill.programcode || ""}
              </span>
              <span style={{ whiteSpace: "nowrap", fontWeight: "bold", marginLeft: "12px" }}>Acad. Session -</span>
              <span style={{ flex: 1, borderBottom: "1px dotted #000", marginLeft: "6px", paddingLeft: "4px" }}>
                {bill.academicyear || bill.acadsession || ""}
              </span>
            </Box>

            {/* Name of Exam + Year/Semester */}
            <Box sx={{ display: "flex", alignItems: "flex-end" }}>
              <span style={{ whiteSpace: "nowrap", fontWeight: "bold", minWidth: "100px" }}>Name of Exam. -</span>
              <span style={{ minWidth: "180px", borderBottom: "1px dotted #000", marginLeft: "6px", paddingLeft: "4px" }}>
                {bill.examname || ""}
              </span>
              <span style={{ whiteSpace: "nowrap", fontWeight: "bold", marginLeft: "12px" }}>Year/Semester -</span>
              <span style={{ flex: 1, borderBottom: "1px dotted #000", marginLeft: "6px", paddingLeft: "4px" }}>
                {bill.semester || ""}
              </span>
            </Box>

            {/* Paper Code */}
            <Box sx={{ display: "flex", alignItems: "flex-end" }}>
              <span style={{ whiteSpace: "nowrap", fontWeight: "bold", minWidth: "100px" }}>Paper Code -</span>
              <span style={{ flex: 1, borderBottom: "1px dotted #000", marginLeft: "6px", paddingLeft: "4px", fontWeight: "bold" }}>
                {bill.papercode || bill.coursecode || ""}
              </span>
            </Box>

            {/* Name of Paper */}
            <Box sx={{ display: "flex", alignItems: "flex-end" }}>
              <span style={{ whiteSpace: "nowrap", fontWeight: "bold", minWidth: "100px" }}>Name of Paper -</span>
              <span style={{ flex: 1, borderBottom: "1px dotted #000", marginLeft: "6px", paddingLeft: "4px" }}>
                {bill.papername || bill.course || ""}
              </span>
            </Box>
          </Box>

          {/* ======================= ADDRESS TO COE ======================= */}
          <Box sx={{ fontSize: "11px", lineHeight: 1.5, mb: 1, color: "#000000" }}>
            <Typography sx={{ fontWeight: 700, fontSize: "11.5px" }}>To,</Typography>
            <Box sx={{ pl: 1.5 }}>
              <Typography sx={{ fontSize: "11px", fontWeight: 600 }}>
                The Controller of Examinations
              </Typography>
              <Typography sx={{ fontSize: "11px", fontWeight: 600 }}>
                {effectiveInst.institutionname},
              </Typography>
              <Typography sx={{ fontSize: "11px", fontWeight: 600 }}>
                {effectiveInst.address?.includes("Bhopal") ? "Bhopal" : (effectiveInst.address?.split(",")[0] || "Bhopal")}
              </Typography>
            </Box>
            <Typography sx={{ fontWeight: 700, fontSize: "11px", mt: 0.5 }}>Sir,</Typography>
            <Typography sx={{ fontSize: "11px", pl: 1.5, textAlign: "justify" }}>
              I submit my bill for remuneration of the work done by me as under, payment of which may be made to me at your earliest convenience.
            </Typography>
          </Box>

          {/* ======================= TABLE 1: REMUNERATION WORK (PDF FORMAT) ======================= */}
          <table style={{ width: "100%", borderCollapse: "collapse", border: "1.5px solid #000000", fontSize: "10.5px", marginBottom: 0 }}>
            <thead>
              <tr style={{ background: "#f8fafc", textAlign: "center" }}>
                <th style={{ border: "1px solid #000", padding: "4px 6px", textAlign: "center", width: "50%", fontWeight: "bold" }}>
                  Assignment
                </th>
                <th style={{ border: "1px solid #000", padding: "4px 6px", textAlign: "center", width: "18%", fontWeight: "bold" }}>
                  No.of Examinees/<br />Answer Books/Days
                </th>
                <th style={{ border: "1px solid #000", padding: "4px 6px", textAlign: "center", width: "16%", fontWeight: "bold" }}>
                  Rate of<br />Remuneration
                </th>
                <th style={{ border: "1px solid #000", padding: "4px 6px", textAlign: "center", width: "16%", fontWeight: "bold" }}>
                  Total Amount (Rs.)
                </th>
              </tr>
            </thead>
            <tbody>
              {/* Row 1 - Evaluation (header-like, empty) */}
              <tr>
                <td style={{ border: "1px solid #000", padding: "3.5px 6px", fontWeight: "bold" }}>Evaluation</td>
                <td style={{ border: "1px solid #000", padding: "3.5px 6px" }}>&nbsp;</td>
                <td style={{ border: "1px solid #000", padding: "3.5px 6px" }}>&nbsp;</td>
                <td style={{ border: "1px solid #000", padding: "3.5px 6px" }}>&nbsp;</td>
              </tr>
              {/* Row 2 - Setting of Question Papers */}
              <tr>
                <td style={{ border: "1px solid #000", padding: "3.5px 6px" }}>Setting of Questions Papers and Translation</td>
                <td style={{ border: "1px solid #000", padding: "3.5px 6px", textAlign: "center" }}>&nbsp;</td>
                <td style={{ border: "1px solid #000", padding: "3.5px 6px" }}>&nbsp;</td>
                <td style={{ border: "1px solid #000", padding: "3.5px 6px" }}>&nbsp;</td>
              </tr>
              {/* Row 3 - Evaluation / Revaluation (filled with data) */}
              <tr>
                <td style={{ border: "1px solid #000", padding: "3.5px 6px", fontWeight: "bold" }}>Evaluation / Revaluation / U.F.M of answer book/thesis</td>
                <td style={{ border: "1px solid #000", padding: "3.5px 6px", textAlign: "center", fontWeight: "bold" }}>{evalAssignment.count || ""}</td>
                <td style={{ border: "1px solid #000", padding: "3.5px 6px", textAlign: "right", fontWeight: "bold" }}>{evalAssignment.rate ? money(evalAssignment.rate) : ""}</td>
                <td style={{ border: "1px solid #000", padding: "3.5px 6px", textAlign: "right", fontWeight: "bold" }}>{evalAssignment.amount ? `${money(evalAssignment.amount)}/-` : "-"}</td>
              </tr>
              {/* Row 4 - Tabulation Checking */}
              <tr>
                <td style={{ border: "1px solid #000", padding: "3.5px 6px" }}>Tabulation Checking / Retotaling / Coding / Decoding</td>
                <td style={{ border: "1px solid #000", padding: "3.5px 6px" }}>&nbsp;</td>
                <td style={{ border: "1px solid #000", padding: "3.5px 6px" }}>&nbsp;</td>
                <td style={{ border: "1px solid #000", padding: "3.5px 6px" }}>&nbsp;</td>
              </tr>
              {/* Row 5 - VFS/Moderation */}
              <tr>
                <td style={{ border: "1px solid #000", padding: "3.5px 6px" }}>VFS/Moderation/Scrutiny/Result Tabulation / Typing</td>
                <td style={{ border: "1px solid #000", padding: "3.5px 6px" }}>&nbsp;</td>
                <td style={{ border: "1px solid #000", padding: "3.5px 6px" }}>&nbsp;</td>
                <td style={{ border: "1px solid #000", padding: "3.5px 6px" }}>&nbsp;</td>
              </tr>
              {/* Row 6 - Dissertation */}
              <tr>
                <td style={{ border: "1px solid #000", padding: "3.5px 6px" }}>Evaluation of Dissertation / thesis</td>
                <td style={{ border: "1px solid #000", padding: "3.5px 6px" }}>&nbsp;</td>
                <td style={{ border: "1px solid #000", padding: "3.5px 6px" }}>&nbsp;</td>
                <td style={{ border: "1px solid #000", padding: "3.5px 6px" }}>&nbsp;</td>
              </tr>
              {/* Row 7 - Practical/Viva */}
              <tr>
                <td style={{ border: "1px solid #000", padding: "3.5px 6px" }}>Practical / Clinical Examination / Viva-Voce /Misc.</td>
                <td style={{ border: "1px solid #000", padding: "3.5px 6px" }}>&nbsp;</td>
                <td style={{ border: "1px solid #000", padding: "3.5px 6px" }}>&nbsp;</td>
                <td style={{ border: "1px solid #000", padding: "3.5px 6px" }}>&nbsp;</td>
              </tr>
              {/* Grand Total row */}
              <tr>
                <td style={{ border: "1px solid #000", padding: "3.5px 6px", fontSize: "9.5px", fontStyle: "italic" }}>
                  *Only for sending answer books/Marks/Question Paper
                </td>
                <td colSpan={2} style={{ border: "1px solid #000", padding: "3.5px 6px", textAlign: "center", fontWeight: "bold", fontSize: "11px" }}>
                  GRAND TOTAL
                </td>
                <td style={{ border: "1px solid #000", padding: "3.5px 6px", textAlign: "right", fontWeight: 900, fontSize: "11.5px" }}>
                  Rs. {grandTotal}/-
                </td>
              </tr>
              {/* Total in words */}
              <tr>
                <td colSpan={4} style={{ border: "1px solid #000", padding: "4px 8px", fontWeight: "bold", fontSize: "11px" }}>
                  Total (in Words) : &nbsp;&nbsp; {grandTotalWords}
                </td>
              </tr>
            </tbody>
          </table>

          {/* ======================= CERTIFICATION ======================= */}
          <Typography sx={{ fontSize: "10px", lineHeight: 1.4, my: 0.8, textAlign: "justify", color: "#000000" }}>
            Certified that the claim has been presented for the first time in accordance with the schedule of remuneration approved by the university.
          </Typography>

          {/* ======================= PERFORATION / CUT LINE ======================= */}
          <Box sx={{ textAlign: "center", fontSize: "10.5px", letterSpacing: "1px", my: 0.6, color: "#000000" }}>
            " ---------------------------------------------------- &amp; ---------------------------------------------------- &amp; ---------------------------------------------------- "
          </Box>

          {/* ======================= BANK PARTICULARS (RTGS/NEFT) ======================= */}
          <Box sx={{ my: 0.6 }}>
            <Typography sx={{ fontWeight: "bold", fontSize: "11.5px", letterSpacing: "0.5px", textAlign: "center", mb: 0.2 }}>
              Fund Transfer Through : RTGS/NEFT
            </Typography>
            <Typography sx={{ fontSize: "10px", textAlign: "center", mb: 0.4 }}>
              (Please fill all the detail Mandatorily as per your Bank Account)
            </Typography>

            <table style={{ width: "100%", borderCollapse: "collapse", border: "1.5px solid #000000", fontSize: "10.5px" }}>
              <tbody>
                {/* Row 1: Name | Mobile */}
                <tr>
                  <td style={{ border: "1px solid #000", padding: "3.5px 6px", width: "22%", fontWeight: "bold" }}>
                    Name
                  </td>
                  <td style={{ border: "1px solid #000", padding: "3.5px 6px", width: "28%", fontWeight: "bold" }}>
                    {bill.examinername || ""}
                  </td>
                  <td style={{ border: "1px solid #000", padding: "3.5px 6px", width: "22%", fontWeight: "bold" }}>
                    Mobile
                  </td>
                  <td style={{ border: "1px solid #000", padding: "3.5px 6px", width: "28%", fontWeight: "bold" }}>
                    {bill.contactno || bill.phone || ""}
                  </td>
                </tr>
                {/* Row 2: Amount | PAN No */}
                <tr>
                  <td style={{ border: "1px solid #000", padding: "3.5px 6px", fontWeight: "bold" }}>
                    Amount
                  </td>
                  <td style={{ border: "1px solid #000", padding: "3.5px 6px", fontWeight: "bold" }}>
                    {grandTotal}/-
                  </td>
                  <td style={{ border: "1px solid #000", padding: "3.5px 6px", fontWeight: "bold" }}>
                    PAN No.
                  </td>
                  <td style={{ border: "1px solid #000", padding: "3.5px 6px", fontWeight: "bold" }}>
                    {bill.panno || "-"}
                  </td>
                </tr>
                {/* Row 3: Account No (full row) */}
                <tr>
                  <td style={{ border: "1px solid #000", padding: "3.5px 6px", fontWeight: "bold" }}>
                    Account No.
                  </td>
                  <td colSpan={3} style={{ border: "1px solid #000", padding: "3.5px 6px", fontWeight: "bold" }}>
                    {bill.accountno || "-"}
                  </td>
                </tr>
                {/* Row 4: Banks' Name & Branch | IFSC Code */}
                <tr>
                  <td style={{ border: "1px solid #000", padding: "3.5px 6px", fontWeight: "bold" }}>
                    Banks' Name &amp; Branch
                  </td>
                  <td style={{ border: "1px solid #000", padding: "3.5px 6px" }}>
                    {bill.bankname || ""} {bill.bankbranch ? `(${bill.bankbranch})` : ""}
                  </td>
                  <td style={{ border: "1px solid #000", padding: "3.5px 6px", fontWeight: "bold" }}>
                    IFSC Code
                  </td>
                  <td style={{ border: "1px solid #000", padding: "3.5px 6px", fontWeight: "bold" }}>
                    {bill.ifsccode || "-"}
                  </td>
                </tr>
              </tbody>
            </table>
          </Box>

          {/* ======================= PLACE/DATE + CLAIMANT SIGNATURE ======================= */}
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", pt: 1.5, pb: 0.5, fontSize: "11px", color: "#000000" }}>
            {/* Left: Place and Date */}
            <Box>
              <Typography sx={{ fontSize: "11px", mb: 0.5 }}>
                Place : Bhopal
              </Typography>
              <Typography sx={{ fontSize: "11px" }}>
                Date :
              </Typography>
            </Box>
            {/* Right: Signature of Claimant box */}
            <Box sx={{ textAlign: "right" }}>
              <Box sx={{ border: "1px solid #000", width: "160px", height: "45px", mb: 0.3 }} />
              <Typography sx={{ fontSize: "10.5px", fontWeight: "bold" }}>
                Signature of the Claimant with Date
              </Typography>
            </Box>
          </Box>

          {/* ======================= BOTTOM SIGNATURES (AR + COE) ======================= */}
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", pt: 2, pb: 0.5 }}>
            <Typography sx={{ fontWeight: "bold", fontSize: "11.5px" }}>
              Signature of Assistant Registrar
            </Typography>
            <Typography sx={{ fontWeight: "bold", fontSize: "11.5px" }}>
              Signature of Controller of Examination
            </Typography>
          </Box>
        </Box>

        {/* Screen Page 2 Indicator */}
        <Box className="no-print" sx={{ my: 3, textAlign: "center" }}>
          <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: "bold", letterSpacing: 1.5, textTransform: "uppercase" }}>
            — Page 2 (Verification &amp; Passing) —
          </Typography>
        </Box>

        {/* ======================= PAGE 2: VERIFICATION & PASSING (BACK SIDE) ======================= */}
        <Box
          className="exact-pdf-box bill-page-2"
          sx={{
            minHeight: { xs: "850px", print: "calc(100vh - 20mm)" },
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            p: { xs: 3, sm: 4, md: 5 },
            boxSizing: "border-box"
          }}
        >
          <Box>
            {/* 1. First Certification statement */}
            <Typography sx={{ fontSize: "13.5px", lineHeight: 1.6, textAlign: "justify", mb: 6, color: "#000000" }}>
              Certified that the claimant has done the work assigned by the {effectiveInst.institutionname}, {effectiveInst.address?.includes("Bhopal") ? "Bhopal" : (effectiveInst.address?.split(",")[0] || "")} for which the bill has been preferred.
            </Typography>

            {/* 2. Signature of HOD with Seal (Left) */}
            <Box sx={{ mb: 7 }}>
              <Typography sx={{ fontWeight: "bold", fontStyle: "italic", fontSize: "13.5px", color: "#2e7d32" }}>
                Signature of HOD with Seal
              </Typography>
            </Box>

            {/* 3. Signature of HOI with Seal (Right) */}
            <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 7, pr: 2 }}>
              <Typography sx={{ fontWeight: "bold", fontStyle: "italic", fontSize: "13.5px", color: "#2e7d32" }}>
                Signature of HOI with Seal
              </Typography>
            </Box>

            {/* 4. Second Verification statement */}
            <Typography sx={{ fontSize: "13.5px", lineHeight: 1.6, textAlign: "justify", mb: 6, color: "#000000" }}>
              Verified and certified that the claimant has done the work assigned by the {effectiveInst.institutionname}, {effectiveInst.address?.includes("Bhopal") ? "Bhopal" : (effectiveInst.address?.split(",")[0] || "")} for which the bill has been preferred.
            </Typography>

            {/* 5. Incharge (Confidential / Conduct / Evaluation / Result) (Right-Center) */}
            <Box sx={{ display: "flex", justifyContent: "flex-end", pr: 4, mb: 7 }}>
              <Box sx={{ textAlign: "center" }}>
                <Typography sx={{ fontWeight: "bold", fontSize: "14px", color: "#2e7d32" }}>
                  DR/Incharge/AR
                </Typography>
                <Typography sx={{ fontWeight: "bold", fontSize: "13px", color: "#000000", backgroundColor: '#ffff00', px: 1 }}>
                  (Confidential / Conduct / Evaluation / Result)
                </Typography>
              </Box>
            </Box>

            {/* 6. Controller of Examinations (Right) */}
            <Box sx={{ display: "flex", justifyContent: "flex-end", pr: 4, mb: 6 }}>
              <Typography sx={{ fontWeight: "bold", fontSize: "14px", color: "#d32f2f" }}>
                Controller of Examinations
              </Typography>
            </Box>

            {/* 7. Passes for Payment */}
            <Box sx={{ fontSize: "13px", lineHeight: 1.8, mb: 4, color: "#000000" }}>
              <span>Passes for Payment of Rs. </span>
              <span style={{ borderBottom: "1px dotted #000", display: "inline-block", minWidth: "160px", padding: "0 6px", fontWeight: "bold" }}>
                {bill.grandTotal || bill.totalamount ? `Rs. ${money(bill.grandTotal || bill.totalamount)}` : "…………………………………"}
              </span>
              <span> (Rupees </span>
              <span style={{ borderBottom: "1px dotted #000", display: "inline-block", minWidth: "300px", padding: "0 6px", fontStyle: "italic" }}>
                {bill.grandTotalWords || bill.totalamount_words ? `${bill.grandTotalWords || bill.totalamount_words}` : "…………………………………………………………………………"}
              </span>
              <span>only)</span>
            </Box>

            {/* 8. Chief Finance & Account officer (Right) */}
            <Box sx={{ display: "flex", justifyContent: "flex-end", pr: 4, mb: 6 }}>
              <Typography sx={{ fontWeight: "bold", fontSize: "14px", color: "#00B0F0" }}>
                Chief Finance &amp; Account officer
              </Typography>
            </Box>

            {/* 9. Payment Details (Paid in Cash / by Cheque No ...) */}
            <Box sx={{ fontSize: "13px", lineHeight: 2.2, color: "#000000", mb: 6 }}>
              <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end" }}>
                <span>Paid in Cash / by Cheuqe No </span>
                <span style={{ borderBottom: "1px dotted #000", flex: 1, minWidth: "130px", margin: "0 6px" }}>&nbsp;</span>
                <span>Date </span>
                <span style={{ borderBottom: "1px dotted #000", minWidth: "120px", margin: "0 6px" }}>&nbsp;</span>
                <span>on </span>
                <span style={{ borderBottom: "1px dotted #000", flex: 1, minWidth: "160px", marginLeft: "6px" }}>&nbsp;</span>
              </Box>
              <Box sx={{ display: "flex", alignItems: "flex-end", mt: 1 }}>
                <span style={{ borderBottom: "1px dotted #000", minWidth: "200px", marginRight: "6px" }}>&nbsp;</span>
                <span>Bank, Bhopal for </span>
                <span style={{ borderBottom: "1px dotted #000", flex: 1, margin: "0 6px" }}>&nbsp;</span>
                <span>only.</span>
              </Box>
            </Box>
          </Box>

          {/* 10. Bottom Row: Cashier & Accountant */}
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", pt: 4, pb: 1 }}>
            <Typography sx={{ fontWeight: "bold", fontSize: "14.5px", color: "#2e7d32" }}>
              Cashier
            </Typography>
            <Typography sx={{ fontWeight: "bold", fontSize: "14.5px", color: "#2e7d32" }}>
              Accountant
            </Typography>
          </Box>
        </Box>
      </Box>
    </MenuPageShell>
  );
}
