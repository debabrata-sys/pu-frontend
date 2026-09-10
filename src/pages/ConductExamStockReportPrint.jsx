import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Grid,
  MenuItem,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import PrintIcon from "@mui/icons-material/Print";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import RefreshIcon from "@mui/icons-material/Refresh";
import { useNavigate } from "react-router-dom";
import ep1 from "../api/ep1";
import global1 from "./global1";
import MenuPageShell from "./MenuPageShell";
import universityLogo from "../assets/peoples_university_logo.jpg";

export default function ConductExamStockReportPrint() {
  const navigate = useNavigate();
  const colid = global1.colid || 1;

  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [institution, setInstitution] = useState(null);

  // Filters
  const [filters, setFilters] = useState({
    fromDate: "",
    toDate: "",
    itemname: "",
    institute: "",
    hos: "",
    type: "ISSUE" // Default to ISSUE as per standard Issue of Answer Books report
  });

  const [options, setOptions] = useState({
    institutes: [],
    hosList: [],
    items: []
  });

  useEffect(() => {
    loadOptions();
  }, []);

  useEffect(() => {
    loadReportData();
  }, [filters]);

  const loadOptions = async () => {
    try {
      const res = await ep1.get("/api/v2/conductexam/stock/options", { params: { colid } });
      if (res.data?.success) {
        setOptions({
          institutes: res.data.data.institutes || [],
          hosList: res.data.data.hos || [],
          items: res.data.data.items || []
        });
      }
    } catch (e) {
      console.error("Error loading stock options:", e);
    }
  };

  const loadReportData = async () => {
    try {
      setLoading(true);
      const params = { colid };
      if (filters.fromDate) params.from_date = filters.fromDate;
      if (filters.toDate) params.to_date = filters.toDate;
      if (filters.itemname) params.itemname = filters.itemname;
      if (filters.institute) params.institute = filters.institute;
      if (filters.hos) params.hos = filters.hos;
      if (filters.type && filters.type !== "ALL") params.type = filters.type;

      const res = await ep1.get("/api/v2/conductexam/stock/transactions", { params });
      if (res.data?.success) {
        setTransactions(res.data.data || []);
        if (res.data.institution) {
          setInstitution(res.data.institution);
        }
      }
    } catch (e) {
      console.error("Error loading stock report data:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const handleResetFilters = () => {
    setFilters({
      fromDate: "",
      toDate: "",
      itemname: "",
      institute: "",
      hos: "",
      type: "ISSUE"
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const grandTotal = transactions.reduce((sum, item) => sum + Number(item.totalitems || 0), 0);

  const institutionDisplayName = (institution?.institutionname || "PEOPLE'S UNIVERSITY").toUpperCase();

  const logoSrc = institution?.logo || institution?.logolink || universityLogo || "/peoples_university_logo.jpg";

  return (
    <MenuPageShell title="Stock Report Print">
      {/* Print Stylesheet */}
      <style>{`
        @page {
          size: A4 landscape;
          margin: 8mm 10mm;
        }

        @media print {
          header, nav, aside, .MuiAppBar-root, .MuiDrawer-root, .no-print, [role="navigation"] {
            display: none !important;
          }
          body, html {
            background: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
            font-family: Arial, "Times New Roman", Times, serif !important;
            color: #000000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .stock-print-container {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }
          .stock-print-page {
            border: none !important;
            margin: 0 !important;
            padding: 0 !important;
            min-height: auto !important;
          }
          .stock-report-table {
            page-break-inside: auto !important;
          }
          .stock-report-table tr {
            page-break-inside: avoid !important;
            page-break-after: auto !important;
          }
          .stock-report-table thead {
            display: table-header-group !important;
          }
          .stock-report-table tfoot {
            display: table-footer-group !important;
          }
        }

        /* Screen Preview Styles */
        .stock-print-container {
          max-width: 297mm;
          margin: 0 auto;
          background: #ffffff;
          box-sizing: border-box;
          font-family: Arial, "Times New Roman", Times, serif;
          color: #000000;
        }

        .stock-print-page {
          padding: 8mm 12mm;
          background: #ffffff;
          min-height: 200mm;
          box-sizing: border-box;
          position: relative;
          border: 1px solid #dcdcdc;
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
          margin-bottom: 24px;
        }

        .stock-report-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
          margin-top: 14px;
        }

        .stock-report-table th, .stock-report-table td {
          border: 1px solid #000000;
          padding: 5px 7px;
          color: #000000 !important;
        }

        .stock-report-table th {
          background-color: #f7f7f7;
          font-weight: 700;
          text-align: center;
        }

        @media print {
          .stock-report-table th {
            background-color: transparent !important;
          }
        }
      `}</style>

      {/* Screen Controls & Filters Bar */}
      <Box className="no-print" sx={{ mb: 3 }}>
        <Card sx={{ mb: 2 }}>
          <CardContent sx={{ pb: "16px !important" }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
              <Button
                variant="outlined"
                startIcon={<ArrowBackIcon />}
                onClick={() => navigate("/conduct-exam-stock-issue-receive")}
              >
                Back to Issue / Receive
              </Button>

              <Typography variant="h6" fontWeight={700} color="primary">
                Stock Issue / Receive Report Preview
              </Typography>

              <Stack direction="row" spacing={1}>
                <Button variant="outlined" startIcon={<RefreshIcon />} onClick={handleResetFilters}>
                  Reset
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<PrintIcon />}
                  onClick={handlePrint}
                  sx={{ px: 3, fontWeight: 700 }}
                >
                  Print Report
                </Button>
              </Stack>
            </Box>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={2}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Report Type"
                  value={filters.type}
                  onChange={(e) => handleFilterChange("type", e.target.value)}
                >
                  <MenuItem value="ALL">All Transactions</MenuItem>
                  <MenuItem value="ISSUE">ISSUE Only</MenuItem>
                  <MenuItem value="RECEIVE">RECEIVE Only</MenuItem>
                </TextField>
              </Grid>

              <Grid item xs={12} sm={6} md={2}>
                <TextField
                  fullWidth
                  size="small"
                  type="date"
                  label="From Date"
                  value={filters.fromDate}
                  onChange={(e) => handleFilterChange("fromDate", e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              <Grid item xs={12} sm={6} md={2}>
                <TextField
                  fullWidth
                  size="small"
                  type="date"
                  label="To Date"
                  value={filters.toDate}
                  onChange={(e) => handleFilterChange("toDate", e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              <Grid item xs={12} sm={6} md={2}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Filter Item"
                  value={filters.itemname}
                  onChange={(e) => handleFilterChange("itemname", e.target.value)}
                >
                  <MenuItem value="">All Items</MenuItem>
                  {options.items.map((it) => (
                    <MenuItem key={it} value={it}>
                      {it}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              <Grid item xs={12} sm={6} md={2}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Filter Institute"
                  value={filters.institute}
                  onChange={(e) => handleFilterChange("institute", e.target.value)}
                >
                  <MenuItem value="">All Institutes</MenuItem>
                  {options.institutes.map((inst) => (
                    <MenuItem key={inst.code} value={inst.code}>
                      {inst.name} ({inst.code})
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              <Grid item xs={12} sm={6} md={2}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Filter HOS"
                  value={filters.hos}
                  onChange={(e) => handleFilterChange("hos", e.target.value)}
                >
                  <MenuItem value="">All HOS</MenuItem>
                  {options.hosList.map((h) => (
                    <MenuItem key={h.code} value={h.code}>
                      {h.name} ({h.code})
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Box>

      {/* Loading indicator */}
      {loading && (
        <Box className="no-print" sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Printable Report Document */}
      <Box className="stock-print-container">
        <Box className="stock-print-page">
          {/* Header section */}
          <Box sx={{ display: "flex", alignItems: "center", mb: 2, position: "relative", minHeight: "125px" }}>
            {/* Logo on the left - enlarged and sharp */}
            <Box
              sx={{
                position: "absolute",
                left: 0,
                top: 0,
                width: "135px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "flex-start"
              }}
            >
              <img
                src={logoSrc}
                alt="People's University Logo"
                style={{
                  height: "120px",
                  maxWidth: "130px",
                  objectFit: "contain",
                  display: "block"
                }}
                onError={(e) => {
                  if (e.target.src !== window.location.origin + "/peoples_university_logo.jpg") {
                    e.target.src = "/peoples_university_logo.jpg";
                  }
                }}
              />
            </Box>

            {/* University & Report Title in Center */}
            <Box sx={{ width: "100%", textAlign: "center", pt: 1, px: "140px" }}>
              <Typography
                component="h1"
                sx={{
                  fontFamily: '"Times New Roman", Times, Georgia, serif',
                  fontWeight: 900,
                  fontSize: "34px",
                  letterSpacing: "1.2px",
                  textTransform: "uppercase",
                  color: "#000000",
                  lineHeight: 1.15,
                  mb: 0.5
                }}
              >
                {institutionDisplayName}
              </Typography>
              {institution?.affiliatedboard && (
                <Typography
                  sx={{
                    fontFamily: '"Times New Roman", Times, Georgia, serif',
                    fontWeight: 700,
                    fontSize: "14px",
                    color: "#1e3a8a",
                    mb: 0.5
                  }}
                >
                  {institution.affiliatedboard.startsWith("(") ? institution.affiliatedboard : `(${institution.affiliatedboard})`}
                </Typography>
              )}
              {institution?.address && (
                <Typography
                  sx={{
                    fontFamily: '"Times New Roman", Times, Georgia, serif',
                    fontSize: "12px",
                    color: "#475569",
                    mb: 0.8
                  }}
                >
                  {institution.address}
                </Typography>
              )}

              <Typography
                component="h2"
                sx={{
                  fontFamily: '"Times New Roman", Times, Georgia, serif',
                  fontWeight: 700,
                  fontSize: "21px",
                  color: "#000000",
                  lineHeight: 1.2
                }}
              >
                Issue of Answer Books for Theory/Practical Examination
              </Typography>
            </Box>
          </Box>

          {/* Table */}
          <table className="stock-report-table">
            <thead>
              <tr>
                <th style={{ width: "45px" }}>SNo</th>
                <th style={{ minWidth: "180px" }}>Select Item</th>
                <th style={{ width: "120px" }}>Institute</th>
                <th style={{ width: "80px" }}>HOS</th>
                <th style={{ width: "90px" }}>TYPE</th>
                <th style={{ width: "110px" }}>DATE</th>
                <th style={{ width: "100px" }}>FROM</th>
                <th style={{ width: "100px" }}>TO</th>
                <th style={{ width: "90px" }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: "center", padding: "20px", color: "#666" }}>
                    No stock records found for the selected criteria.
                  </td>
                </tr>
              ) : (
                transactions.map((row, idx) => (
                  <tr key={row._id || idx}>
                    <td style={{ textAlign: "center" }}>{idx + 1}</td>
                    <td style={{ textAlign: "left", paddingLeft: "10px" }}>{row.itemname}</td>
                    <td style={{ textAlign: "center" }}>{row.institute || "-"}</td>
                    <td style={{ textAlign: "center" }}>{row.hos || "-"}</td>
                    <td style={{ textAlign: "center", fontWeight: 600 }}>{row.type}</td>
                    <td style={{ textAlign: "center" }}>{row.date ? String(row.date).slice(0, 10) : "-"}</td>
                    <td style={{ textAlign: "center" }}>{row.srno_from || "-"}</td>
                    <td style={{ textAlign: "center" }}>{row.srno_to || "-"}</td>
                    <td style={{ textAlign: "right", paddingRight: "12px" }}>
                      {Number(row.totalitems || 0).toLocaleString("en-IN")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr>
                <td
                  colSpan={8}
                  style={{
                    textAlign: "center",
                    fontWeight: 700,
                    fontSize: "14px",
                    letterSpacing: "0.5px"
                  }}
                >
                  Grand Total
                </td>
                <td
                  style={{
                    textAlign: "right",
                    paddingRight: "12px",
                    fontWeight: 700,
                    fontSize: "14px"
                  }}
                >
                  {grandTotal.toLocaleString("en-IN")}
                </td>
              </tr>
            </tfoot>
          </table>

          {/* Signatures Area */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              mt: 10,
              px: 3,
              pb: 4
            }}
          >
            <Box>
              <Typography
                sx={{
                  fontFamily: '"Times New Roman", Times, serif',
                  fontStyle: "italic",
                  fontWeight: 700,
                  fontSize: "15px",
                  color: "#000000"
                }}
              >
                Prepared By
              </Typography>
            </Box>

            <Box>
              <Typography
                sx={{
                  fontFamily: '"Times New Roman", Times, serif',
                  fontStyle: "italic",
                  fontWeight: 700,
                  fontSize: "15px",
                  color: "#000000"
                }}
              >
                Incharge(Conduct)
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>
    </MenuPageShell>
  );
}
