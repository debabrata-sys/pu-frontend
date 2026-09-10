import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Typography
} from "@mui/material";
import PrintIcon from "@mui/icons-material/Print";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ep1 from "../api/ep1";
import global1 from "./global1";
import MenuPageShell from "./MenuPageShell";

const money = (val) => Number(val || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

export default function ConductExamRemunerationReportPrint() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const colid = global1.colid || 1;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState([]);
  const [institution, setInstitution] = useState(null);
  const [options, setOptions] = useState({ academicyears: [], exams: [] });

  const academicyear = searchParams.get("academicyear") || "";
  const examcode = searchParams.get("examcode") || "";
  const rolecategory = searchParams.get("rolecategory") || "";
  const stafftype = searchParams.get("stafftype") || "";
  const [onlyPayable, setOnlyPayable] = useState(true);

  useEffect(() => {
    loadOptions();
  }, []);

  useEffect(() => {
    loadReportData();
  }, [academicyear, examcode, rolecategory, stafftype]);

  const loadOptions = async () => {
    try {
      const res = await ep1.get("/api/v2/conductexam/remuneration/options", { params: { colid } });
      if (res.data?.success) {
        setOptions(res.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadReportData = async () => {
    try {
      setLoading(true);
      setError("");
      const params = { colid };
      if (academicyear) params.academicyear = academicyear;
      if (examcode) params.examcode = examcode;
      if (rolecategory) params.rolecategory = rolecategory;
      if (stafftype) params.stafftype = stafftype;

      const res = await ep1.get("/api/v2/conductexam/remuneration/payment-summary", { params });
      if (res.data?.success) {
        setData(res.data.data || []);
        setInstitution(res.data.institution || null);
      } else {
        setError(res.data?.message || "Failed to load report data.");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Error loading payment summary report.");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const displayedList = onlyPayable ? data.filter((item) => item.isPayable) : data;
  const grandTotal = displayedList.reduce((acc, item) => acc + Number(item.netPayableAmount || 0), 0);

  const logoSrc = institution?.logo || institution?.logolink || "";
  const institutionName = institution?.institutionname || institution?.name || "";
  const currentYear = new Date().getFullYear();
  const instPrefix = (institutionName || 'PU').split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 4).toUpperCase() || 'EXAM';
  const refNo = `Ref:${instPrefix}/COE/GC/C/${academicyear ? academicyear.split("-")[0] : currentYear}/`;

  return (
    <MenuPageShell title="Remuneration Bill Report (RTGS/NEFT)">
      {/* Print Stylesheet */}
      <style>{`
        @page {
          size: A4 landscape;
          margin: 8mm 8mm 8mm 8mm;
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
          }
          .report-container {
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }
          .report-page {
            border: none !important;
            margin: 0 !important;
            padding: 0 !important;
          }
        }

        /* Screen Preview */
        .report-container {
          max-width: 297mm;
          margin: 0 auto;
          background: #ffffff;
          box-sizing: border-box;
          font-family: Arial, Helvetica, sans-serif;
          color: #000000;
        }
        .report-page {
          padding: 8mm 10mm;
          background: #ffffff;
          box-sizing: border-box;
          min-height: 200mm;
          border: 1px solid #e2e8f0;
          border-radius: 4px;
        }

        .report-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 10px;
          line-height: 1.25;
        }
        .report-table th, .report-table td {
          border: 1px solid #000000;
          padding: 4px 5px;
          vertical-align: top;
          box-sizing: border-box;
        }
        .report-table th {
          background-color: #f8fafc;
          font-weight: 700;
          text-align: center;
          font-size: 9.5px;
        }
        @media print {
          .report-table th {
            background-color: #f0f0f0 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>

      {/* Screen Toolbar */}
      <Paper elevation={0} className="no-print" sx={{ p: 2, mb: 2.5, bgcolor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 2 }}>
        <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems="center" spacing={2}>
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate("/conduct-exam-remuneration-payment")}
            sx={{ fontWeight: 700, textTransform: "none" }}
          >
            Back to Payments
          </Button>

          {/* Quick Filters on Screen */}
          <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Academic Year</InputLabel>
              <Select
                value={academicyear}
                label="Academic Year"
                onChange={(e) => {
                  const p = new URLSearchParams(searchParams);
                  if (e.target.value) p.set("academicyear", e.target.value);
                  else p.delete("academicyear");
                  setSearchParams(p);
                }}
              >
                <MenuItem value="">All Academic Years</MenuItem>
                {options.academicyears?.map((yr) => (
                  <MenuItem key={yr} value={yr}>{yr}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>Exam Code</InputLabel>
              <Select
                value={examcode}
                label="Exam Code"
                onChange={(e) => {
                  const p = new URLSearchParams(searchParams);
                  if (e.target.value) p.set("examcode", e.target.value);
                  else p.delete("examcode");
                  setSearchParams(p);
                }}
              >
                <MenuItem value="">All Exams</MenuItem>
                {options.exams?.map((ex) => (
                  <MenuItem key={ex.examcode} value={ex.examcode}>{ex.examcode} - {ex.exam}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <Button
              variant={onlyPayable ? "contained" : "outlined"}
              size="small"
              color="primary"
              onClick={() => setOnlyPayable(!onlyPayable)}
              sx={{ textTransform: "none", fontWeight: 700 }}
            >
              {onlyPayable ? "Showing Payable Only (RTGS/NEFT)" : "Showing All Staff"}
            </Button>
          </Stack>

          <Button
            variant="contained"
            color="primary"
            startIcon={<PrintIcon />}
            onClick={handlePrint}
            sx={{ fontWeight: 800, px: 3, textTransform: "none", bgcolor: "#1e293b", "&:hover": { bgcolor: "#0f172a" } }}
          >
            Print Report
          </Button>
        </Stack>
      </Paper>

      {/* Loading & Error States */}
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Box sx={{ p: 4, textAlign: "center", color: "error.main" }}>
          <Typography variant="h6">{error}</Typography>
        </Box>
      ) : (
        /* Printable Report Container */
        <Box className="report-container">
          <Box className="report-page">
            {/* Header: 100% Zoomed Logo, Big Bold Institution Name, Subtitles, Title, Ref */}
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5, pb: 1, borderBottom: "1.5px solid #000" }}>
              {/* Logo on top-left (100% Zoomed - 2x size: 115px max-height) */}
              <Box sx={{ width: "135px", display: "flex", justifyContent: "center", alignItems: "center" }}>
                <img
                  src={logoSrc}
                  alt="University Logo"
                  style={{ maxHeight: "115px", maxWidth: "125px", objectFit: "contain" }}
                  onError={(e) => { e.target.style.display = "none"; }}
                />
              </Box>

              {/* Centered Institution Name (Big & Bold) & Subtitles */}
              <Box sx={{ flex: 1, textAlign: "center", px: 2 }}>
                <Typography
                  variant="h4"
                  sx={{
                    fontWeight: 900,
                    fontSize: "30px",
                    letterSpacing: "1.2px",
                    textTransform: "uppercase",
                    color: "#000000",
                    lineHeight: 1.15,
                    fontFamily: "Arial, Helvetica, sans-serif"
                  }}
                >
                  {institutionName}
                </Typography>
                {institution?.affiliatedboard && (
                  <Typography variant="body2" sx={{ fontSize: "12.5px", fontWeight: 700, color: "#1e3a8a", mt: 0.4 }}>
                    {institution.affiliatedboard.startsWith("(") ? institution.affiliatedboard : `(${institution.affiliatedboard})`}
                  </Typography>
                )}
                {institution?.address && (
                  <Typography variant="body2" sx={{ fontSize: "11px", fontWeight: 600, color: "#374151", mt: 0.2 }}>
                    {institution.address}
                  </Typography>
                )}

                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 900,
                    fontSize: "17px",
                    letterSpacing: "0.5px",
                    textTransform: "uppercase",
                    color: "#000000",
                    mt: 1,
                    textDecoration: "underline"
                  }}
                >
                  LIST OF REMUNERATION BILL(RTGS/NEFT)
                </Typography>
              </Box>

              {/* Right spacer box matching logo width for balanced centering */}
              <Box sx={{ width: "135px", textAlign: "right" }}>
                <Typography variant="caption" sx={{ fontSize: "10px", color: "#64748b", display: "block" }}>
                  Print Date:
                </Typography>
                <Typography variant="caption" sx={{ fontSize: "11px", fontWeight: 700, color: "#000000" }}>
                  {new Date().toLocaleDateString("en-IN")}
                </Typography>
              </Box>
            </Box>

            {/* Reference Number & Exam Line */}
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 800, fontSize: "11.5px" }}>
                {refNo}
              </Typography>
              {examcode && (
                <Typography variant="body2" sx={{ fontWeight: 700, fontSize: "11px" }}>
                  Exam: {examcode}
                </Typography>
              )}
            </Box>

            {/* Report Table */}
            <table className="report-table">
              <thead>
                <tr>
                  <th style={{ width: "3%" }}>SNo</th>
                  <th style={{ width: "13%" }}>Examiner<br />Name</th>
                  <th style={{ width: "11%" }}>A/C No/BANK</th>
                  <th style={{ width: "10%" }}>Branch/IFSC</th>
                  <th style={{ width: "11%" }}>Institute/Course/<br />Branch/Sem</th>
                  <th style={{ width: "12%" }}>Subject<br />Code/Name</th>
                  <th style={{ width: "7%" }}>Examination</th>
                  <th style={{ width: "4%" }}>No.of<br />Std.</th>
                  <th style={{ width: "7%" }}>Date of<br />Wor/Rec/Dip</th>
                  <th style={{ width: "6%" }}>Rim<br />No./Con<br />No.</th>
                  <th style={{ width: "3%" }}>NOD</th>
                  <th style={{ width: "4%" }}>R/C<br />Bill</th>
                  <th style={{ width: "4%" }}>Total(Rs.)</th>
                  <th style={{ width: "5%" }}>Remark(Payment<br />Via RTGS)</th>
                  <th style={{ width: "4%" }}>Balance(Rs.)</th>
                </tr>
              </thead>
              <tbody>
                {displayedList.length === 0 ? (
                  <tr>
                    <td colSpan={15} style={{ textAlign: "center", padding: "20px", color: "#64748b" }}>
                      No remuneration bill records found for the selected filter criteria.
                    </td>
                  </tr>
                ) : (
                  displayedList.map((item, index) => {
                    const rimNo = item.billno
                      ? item.billno
                      : `REM-${String(index + 761).padStart(4, "0")} +\nCOE-${String(index + 761).padStart(4, "0")}`;

                    return (
                      <tr key={item._id || index}>
                        {/* 1. SNo */}
                        <td style={{ textAlign: "center" }}>{index + 1}</td>

                        {/* 2. Examiner Name */}
                        <td>
                          <div style={{ fontWeight: 800, textTransform: "uppercase" }}>
                            {item.examinername || ""} ,
                          </div>
                          {item.designation && (
                            <div style={{ textTransform: "uppercase" }}>{item.designation} ,</div>
                          )}
                          <div style={{ textTransform: "uppercase" }}>
                            {item.instituteaddress || "PEOPLE'S UNIVERSITY, BHOPAL"} [MP].
                          </div>
                        </td>

                        {/* 3. A/C No / BANK */}
                        <td>
                          <div>{item.accountno ? `${item.accountno},` : "-"}</div>
                          <div style={{ fontWeight: 700, textTransform: "uppercase" }}>
                            {item.bankname || ""}
                          </div>
                          <div style={{ textTransform: "uppercase" }}>
                            {item.bankbranch || "BHOPAL"}
                          </div>
                        </td>

                        {/* 4. Branch / IFSC */}
                        <td>
                          <div style={{ textTransform: "uppercase" }}>
                            {item.bankbranch ? `${item.bankbranch},` : "BERASIA ROAD, BHOPAL,"}
                          </div>
                          <div style={{ fontWeight: 700 }}>
                            {item.ifsccode || "-"}
                          </div>
                        </td>

                        {/* 5. Institute / Course / Branch / Sem */}
                        <td>
                          <div>{item.department || "PCNRC"} ,</div>
                          <div>{item.programcode || item.program || "B.SC.NUR"} ,</div>
                          <div>
                            {item.programcode || item.program || "B.SC.NUR"} ,{" "}
                            {item.semester ? (/^[0-9]+$/.test(String(item.semester)) ? `Sem-${item.semester}` : item.semester) : "Sem-1"}
                          </div>
                        </td>

                        {/* 6. Subject Code / Name */}
                        <td>
                          <div style={{ fontWeight: 700 }}>
                            {(item.papercode || item.coursecode || "")} :
                          </div>
                          <div style={{ textTransform: "uppercase" }}>
                            {item.papername || item.course || ""}
                          </div>
                        </td>

                        {/* 7. Examination */}
                        <td style={{ textTransform: "uppercase" }}>
                          {item.exam || (item.academicyear ? `${item.academicyear} EXAM` : "AUGUST 2026")}
                        </td>

                        {/* 8. No. of Std. */}
                        <td style={{ textAlign: "center" }}>
                          {item.count || 1}
                        </td>

                        {/* 9. Date of Wor/Rec/Dip */}
                        <td style={{ whiteSpace: "pre-line" }}>
                          {item.examdate || new Date().toISOString().slice(0, 10)}
                        </td>

                        {/* 10. Rim No. / Con No. */}
                        <td style={{ whiteSpace: "pre-line", fontSize: "9px" }}>
                          {rimNo}
                        </td>

                        {/* 11. NOD */}
                        <td style={{ textAlign: "center" }}>
                          {item.count > 10 ? 2 : 1}
                        </td>

                        {/* 12. R/C Bill */}
                        <td style={{ textAlign: "right" }}>
                          {money(item.netPayableAmount)}
                        </td>

                        {/* 13. Total (Rs.) */}
                        <td style={{ textAlign: "right", fontWeight: 700 }}>
                          {money(item.netPayableAmount)}
                        </td>

                        {/* 14. Remark (Payment Via RTGS) */}
                        <td style={{ textAlign: "center" }}>
                          0
                        </td>

                        {/* 15. Balance (Rs.) */}
                        <td style={{ textAlign: "right", fontWeight: 800 }}>
                          {money(item.netPayableAmount)}
                        </td>
                      </tr>
                    );
                  })
                )}

                {/* Total Amount Row */}
                <tr>
                  <td colSpan={12} style={{ textAlign: "right", fontWeight: 900, fontSize: "11px", padding: "6px" }}>
                    Total Amount
                  </td>
                  <td colSpan={3} style={{ textAlign: "center", fontWeight: 900, fontSize: "11px", padding: "6px" }}>
                    {money(grandTotal)}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Signature Area */}
            <Box sx={{ mt: 7, pt: 2, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
              <Box sx={{ textAlign: "left", width: "25%" }}>
                <Typography variant="body2" sx={{ fontWeight: 800, fontSize: "11.5px" }}>
                  Prepared By
                </Typography>
              </Box>

              <Box sx={{ textAlign: "center", width: "35%" }}>
                <Typography variant="body2" sx={{ fontWeight: 800, fontSize: "11.5px" }}>
                  Incharge-Conduct
                </Typography>
              </Box>

              <Box sx={{ textAlign: "right", width: "35%" }}>
                <Typography variant="body2" sx={{ fontWeight: 900, fontStyle: "italic", fontSize: "11.5px" }}>
                  {institution?.coetitle || "Controller of Examinations"}
                </Typography>
                {institution?.coename && (
                  <Typography variant="caption" sx={{ fontWeight: 700, display: "block", color: "#334155" }}>
                    ({institution.coename})
                  </Typography>
                )}
              </Box>
            </Box>
          </Box>
        </Box>
      )}
    </MenuPageShell>
  );
}
