import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
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
import { DataGrid, GridToolbar } from "@mui/x-data-grid";
import PrintIcon from "@mui/icons-material/Print";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import InfoIcon from "@mui/icons-material/Info";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import PaymentsIcon from "@mui/icons-material/Payments";
import DescriptionIcon from "@mui/icons-material/Description";
import ep1 from "../api/ep1";
import global1 from "./global1";
import MenuPageShell from "./MenuPageShell";

const money = (value) => Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

export default function ConductExam2RemunerationPaymentPage() {
  const colid = global1.colid || 1;
  const navigate = useNavigate();

  const [options, setOptions] = useState({
    academicyears: [],
    examcodes: [],
    roleCategories: ["Evaluator", "Paper Setter", "Moderator", "Invigilator"],
    staffTypes: ["Internal", "External"]
  });

  const [filters, setFilters] = useState({
    academicyear: "",
    examcode: "",
    rolecategory: "",
    stafftype: ""
  });

  const [data, setData] = useState([]);
  const [totals, setTotals] = useState({
    totalPayableAmount: 0,
    totalNonPayableAmount: 0,
    payableCount: 0,
    nonPayableCount: 0,
    totalStaff: 0,
    evaluatorsPayable: 0,
    externalSettersPayable: 0,
    externalModeratorsPayable: 0
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // Bill Generation Modal State
  const [billModalOpen, setBillModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [travelRows, setTravelRows] = useState([
    { date: "", from: "", to: "", mode: "", amount: 0 }
  ]);
  const [postalCharges, setPostalCharges] = useState(0);
  const [generatingBill, setGeneratingBill] = useState(false);

  useEffect(() => {
    loadOptions();
  }, []);

  const loadOptions = async () => {
    try {
      const res = await ep1.get("/api/v2/conductexam2/remuneration/options", { params: { colid } });
      if (res.data?.success) {
        setOptions(res.data);
        const defaultYear = res.data.academicyears?.[0] || "2026-27";
        setFilters((prev) => ({ ...prev, academicyear: defaultYear }));
        loadPaymentData({ academicyear: defaultYear });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadPaymentData = async (activeFilters = filters) => {
    try {
      setLoading(true);
      setError("");
      const params = { colid };
      if (activeFilters.academicyear) params.academicyear = activeFilters.academicyear;
      if (activeFilters.examcode) params.examcode = activeFilters.examcode;
      if (activeFilters.rolecategory) params.rolecategory = activeFilters.rolecategory;
      if (activeFilters.stafftype) params.stafftype = activeFilters.stafftype;

      const res = await ep1.get("/api/v2/conductexam2/remuneration/payment-summary", { params });
      if (res.data?.success) {
        setData(res.data.data || []);
        setTotals(res.data.totals || {});
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to calculate payment summary.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenBillModal = (row) => {
    setSelectedStaff(row);
    setTravelRows([
      { date: row.examdate || "", from: row.instituteaddress || "", to: "People's University, Bhopal", mode: "Car / Taxi", amount: row.stafftype === "External" ? 500 : 0 }
    ]);
    setPostalCharges(row.stafftype === "External" ? 100 : 0);
    setBillModalOpen(true);
  };

  const handleAddTravelRow = () => {
    setTravelRows([...travelRows, { date: "", from: "", to: "", mode: "", amount: 0 }]);
  };

  const handleRemoveTravelRow = (index) => {
    setTravelRows(travelRows.filter((_, i) => i !== index));
  };

  const handleTravelRowChange = (index, field, val) => {
    const next = [...travelRows];
    next[index][field] = field === "amount" ? Number(val || 0) : val;
    setTravelRows(next);
  };

  const handleGenerateBillSubmit = async () => {
    if (!selectedStaff) return;
    try {
      setGeneratingBill(true);
      setError("");

      const payload = {
        colid,
        staffId: selectedStaff._id,
        travelDetails: travelRows.filter((r) => r.from || r.to || r.amount > 0),
        postalCharges: Number(postalCharges || 0),
        user: global1.user || "admin"
      };

      const res = await ep1.post("/api/v2/conductexam2/remuneration/generate-bill", payload);
      if (res.data?.success) {
        setMessage(`Bill #${res.data.data.billno} generated successfully!`);
        setBillModalOpen(false);
        loadPaymentData();
        // Redirect or open print view
        navigate(`/conduct-exam-2-remuneration-bill/${res.data.data._id}`);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to generate bill.");
    } finally {
      setGeneratingBill(false);
    }
  };

  const handlePrintBillReport = () => {
    const params = new URLSearchParams();
    if (filters.academicyear) params.set("academicyear", filters.academicyear);
    if (filters.examcode) params.set("examcode", filters.examcode);
    if (filters.rolecategory) params.set("rolecategory", filters.rolecategory);
    if (filters.stafftype) params.set("stafftype", filters.stafftype);
    navigate(`/conduct-exam-2-remuneration-report?${params.toString()}`);
  };

  const columns = useMemo(
    () => [
      {
        field: "stafftype",
        headerName: "Staff Type",
        width: 120,
        renderCell: (params) => (
          <Chip
            label={params.value}
            color={params.value === "Internal" ? "primary" : "secondary"}
            size="small"
            sx={{ fontWeight: 700 }}
          />
        )
      },
      {
        field: "rolecategory",
        headerName: "Category / Role",
        width: 140,
        renderCell: (params) => (
          <Chip
            label={params.value}
            variant="outlined"
            size="small"
            color={params.value === "Evaluator" ? "success" : "info"}
            sx={{ fontWeight: 600 }}
          />
        )
      },
      { field: "examinername", headerName: "Examiner / Staff", width: 180, fontWeight: 700 },
      { field: "examineremail", headerName: "Email", width: 190 },
      {
        field: "papername",
        headerName: "Subject / Paper",
        width: 200,
        renderCell: (params) => {
          const r = params?.row || {};
          const name = (r && r.papername) || (r && r.course) || "";
          const code = (r && r.papercode) || (r && r.coursecode) || "";
          return code ? `${name} (${code})` : name;
        },
        valueGetter: (params) => {
          const r = (params && params.row) ? params.row : (params || {});
          const name = (r && r.papername) || (r && r.course) || "";
          const code = (r && r.papercode) || (r && r.coursecode) || "";
          return code ? `${name} (${code})` : name;
        }
      },
      { field: "count", headerName: "Count", width: 90, type: "number" },
      {
        field: "unitRate",
        headerName: "Rate (Rs.)",
        width: 110,
        type: "number",
        valueFormatter: (params) => money(params.value)
      },
      {
        field: "grossAmount",
        headerName: "Gross (Rs.)",
        width: 120,
        type: "number",
        valueFormatter: (params) => money(params.value)
      },
      {
        field: "netPayableAmount",
        headerName: "Payable (Rs.)",
        width: 130,
        type: "number",
        renderCell: (params) => (
          <Typography
            fontWeight={800}
            color={params.row.isPayable ? "#16a34a" : "#64748b"}
            sx={{ fontSize: "0.95rem" }}
          >
            Rs. {money(params.value)}
          </Typography>
        )
      },
      {
        field: "isPayable",
        headerName: "Payment Status",
        width: 220,
        renderCell: (params) => {
          const row = params.row;
          if (row.rolecategory === "Evaluator") {
            return (
              <Chip
                icon={<CheckCircleIcon />}
                label="Payable (Evaluator - All)"
                color="success"
                size="small"
                sx={{ fontWeight: 700 }}
              />
            );
          }
          if (row.isPayable) {
            return (
              <Chip
                icon={<CheckCircleIcon />}
                label="Payable (External Staff)"
                color="success"
                size="small"
                sx={{ fontWeight: 700 }}
              />
            );
          }
          return (
            <Tooltip title={row.nonPayableReason}>
              <Chip
                icon={<CancelIcon />}
                label="Non-Payable (Internal Staff)"
                color="default"
                size="small"
                sx={{ bgcolor: "#e2e8f0", color: "#475569", fontWeight: 600 }}
              />
            </Tooltip>
          );
        }
      },
      {
        field: "billAction",
        headerName: "Bill Generation",
        width: 160,
        sortable: false,
        renderCell: (params) => {
          const row = params.row;
          if (row.billGenerated) {
            return (
              <Button
                variant="outlined"
                size="small"
                color="success"
                startIcon={<DescriptionIcon />}
                onClick={() => handleOpenBillModal(row)}
                sx={{ textTransform: "none", fontWeight: 700 }}
              >
                {row.billno ? "Re-Generate" : "View Bill"}
              </Button>
            );
          }
          return (
            <Button
              variant="contained"
              size="small"
              color={row.isPayable ? "primary" : "inherit"}
              startIcon={<ReceiptLongIcon />}
              onClick={() => handleOpenBillModal(row)}
              sx={{ textTransform: "none", fontWeight: 700 }}
            >
              Generate Bill
            </Button>
          );
        }
      }
    ],
    []
  );

  return (
    <MenuPageShell title="Examiner Remuneration & Payments">
      <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: "#f8fafc", minHeight: "100vh" }}>
        {/* Top Header Card */}
        <Paper elevation={0} sx={{ p: 2.5, mb: 2.5, borderRadius: 2, border: "1px solid #e2e8f0" }}>
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", md: "center" }} spacing={2}>
            <Box>
              <Typography variant="h5" fontWeight={800} color="#1e293b" sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <PaymentsIcon color="primary" /> Examiner Remuneration & Bill Processing
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Payment flow: <strong>Evaluators</strong> are paid for all (Internal & External). <strong>Paper Setters</strong> and <strong>Moderators</strong> are paid only if External (Internal staff receive Rs. 0 as per university policy).
              </Typography>
            </Box>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Button
                variant="outlined"
                color="primary"
                startIcon={<PrintIcon />}
                onClick={handlePrintBillReport}
                sx={{
                  fontWeight: 700,
                  textTransform: "none",
                  borderWidth: "1.5px",
                  bgcolor: "#ffffff"
                }}
              >
                Print Bill Report (RTGS/NEFT)
              </Button>
              <Button
                variant="contained"
                onClick={() => navigate("/conduct-exam-examiner-registration-new")}
                sx={{ fontWeight: 700 }}
              >
                Register More Staff
              </Button>
            </Stack>
          </Stack>
        </Paper>

        {/* Alerts */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
            {error}
          </Alert>
        )}
        {message && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMessage("")}>
            {message}
          </Alert>
        )}

        {/* KPI Cards */}
        <Grid container spacing={2} sx={{ mb: 2.5 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card elevation={0} sx={{ border: "1px solid #bbf7d0", bgcolor: "#f0fdf4", borderRadius: 2 }}>
              <CardContent sx={{ p: 2 }}>
                <Typography variant="caption" fontWeight={700} color="#166534">
                  TOTAL INSTITUTION PAYABLE
                </Typography>
                <Typography variant="h5" fontWeight={900} color="#15803d">
                  Rs. {money(totals.totalPayableAmount)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Across {totals.payableCount || 0} eligible claims
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card elevation={0} sx={{ border: "1px solid #fed7aa", bgcolor: "#fff7ed", borderRadius: 2 }}>
              <CardContent sx={{ p: 2 }}>
                <Typography variant="caption" fontWeight={700} color="#9a3412">
                  INTERNAL EXCLUDED (POLICY)
                </Typography>
                <Typography variant="h5" fontWeight={900} color="#c2410c">
                  Rs. {money(totals.totalNonPayableAmount)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {totals.nonPayableCount || 0} internal setters/moderators
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card elevation={0} sx={{ border: "1px solid #bfdbfe", bgcolor: "#eff6ff", borderRadius: 2 }}>
              <CardContent sx={{ p: 2 }}>
                <Typography variant="caption" fontWeight={700} color="#1e40af">
                  EVALUATORS PAYABLE (ALL)
                </Typography>
                <Typography variant="h5" fontWeight={900} color="#1d4ed8">
                  Rs. {money(totals.evaluatorsPayable)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Internal + External fully paid
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card elevation={0} sx={{ border: "1px solid #e2e8f0", bgcolor: "#ffffff", borderRadius: 2 }}>
              <CardContent sx={{ p: 2 }}>
                <Typography variant="caption" fontWeight={700} color="#475569">
                  EXTERNAL SETTERS & MODERATORS
                </Typography>
                <Typography variant="h5" fontWeight={900} color="#334155">
                  Rs. {money((totals.externalSettersPayable || 0) + (totals.externalModeratorsPayable || 0))}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  External expert remuneration
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Filters Card */}
        <Paper elevation={0} sx={{ p: 2, mb: 2.5, borderRadius: 2, border: "1px solid #e2e8f0" }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={3}>
              <TextField
                select
                fullWidth
                size="small"
                label="Academic Year"
                value={filters.academicyear}
                onChange={(e) => {
                  const next = { ...filters, academicyear: e.target.value };
                  setFilters(next);
                  loadPaymentData(next);
                }}
              >
                <MenuItem value="">All Academic Years</MenuItem>
                {options.academicyears.map((yr) => (
                  <MenuItem key={yr} value={yr}>
                    {yr}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                select
                fullWidth
                size="small"
                label="Exam Code"
                value={filters.examcode}
                onChange={(e) => {
                  const next = { ...filters, examcode: e.target.value };
                  setFilters(next);
                  loadPaymentData(next);
                }}
              >
                <MenuItem value="">All Exams</MenuItem>
                {options.examcodes.map((code) => (
                  <MenuItem key={code} value={code}>
                    {code}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                select
                fullWidth
                size="small"
                label="Category / Role"
                value={filters.rolecategory}
                onChange={(e) => {
                  const next = { ...filters, rolecategory: e.target.value };
                  setFilters(next);
                  loadPaymentData(next);
                }}
              >
                <MenuItem value="">All Categories</MenuItem>
                {options.roleCategories.map((cat) => (
                  <MenuItem key={cat} value={cat}>
                    {cat}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                select
                fullWidth
                size="small"
                label="Staff Type"
                value={filters.stafftype}
                onChange={(e) => {
                  const next = { ...filters, stafftype: e.target.value };
                  setFilters(next);
                  loadPaymentData(next);
                }}
              >
                <MenuItem value="">All (Internal & External)</MenuItem>
                <MenuItem value="Internal">Internal Only</MenuItem>
                <MenuItem value="External">External Only</MenuItem>
              </TextField>
            </Grid>
          </Grid>
        </Paper>

        {/* DataGrid */}
        <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: "1px solid #e2e8f0" }}>
          {loading && <LinearProgress sx={{ mb: 1 }} />}
          <Box sx={{ height: 580, width: "100%" }}>
            <DataGrid
              rows={data}
              getRowId={(row) => row._id}
              columns={columns}
              loading={loading}
              pageSizeOptions={[10, 25, 50, 100]}
              initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
              slots={{ toolbar: GridToolbar }}
              slotProps={{ toolbar: { showQuickFilter: true } }}
              disableRowSelectionOnClick
            />
          </Box>
        </Paper>

        {/* Bill Generation Confirmation & Travel Dialog */}
        <Dialog open={billModalOpen} onClose={() => setBillModalOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle sx={{ fontWeight: 800, bgcolor: "#f1f5f9", py: 2 }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <ReceiptLongIcon color="primary" />
              <span>Generate Remuneration &amp; T.A. Bill</span>
            </Stack>
          </DialogTitle>
          <DialogContent dividers sx={{ p: 3 }}>
            {selectedStaff && (
              <Box>
                {/* Staff Summary */}
                <Paper elevation={0} sx={{ p: 2, mb: 3, bgcolor: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: 2 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary">
                        Examiner Name:
                      </Typography>
                      <Typography variant="subtitle1" fontWeight={700}>
                        {selectedStaff.examinername}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {selectedStaff.designation || "Examiner"} | {selectedStaff.instituteaddress || "People's University"}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={3}>
                      <Typography variant="body2" color="text.secondary">
                        Category &amp; Type:
                      </Typography>
                      <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                        <Chip label={selectedStaff.rolecategory} size="small" color="primary" />
                        <Chip
                          label={selectedStaff.stafftype}
                          size="small"
                          color={selectedStaff.stafftype === "Internal" ? "default" : "secondary"}
                        />
                      </Stack>
                    </Grid>
                    <Grid item xs={12} sm={3}>
                      <Typography variant="body2" color="text.secondary">
                        Net Payable:
                      </Typography>
                      <Typography variant="h6" fontWeight={800} color={selectedStaff.isPayable ? "#15803d" : "#64748b"}>
                        Rs. {money(selectedStaff.netPayableAmount)}
                      </Typography>
                      {!selectedStaff.isPayable && (
                        <Typography variant="caption" color="error">
                          Internal Staff (Excluded)
                        </Typography>
                      )}
                    </Grid>
                    <Grid item xs={12}>
                      <Divider sx={{ my: 1 }} />
                      <Typography variant="body2">
                        <strong>Paper:</strong> {selectedStaff.papername} ({selectedStaff.papercode}) &nbsp;|&nbsp;
                        <strong>Exam:</strong> {selectedStaff.examcode} &nbsp;|&nbsp;
                        <strong>Bank A/C:</strong> {selectedStaff.accountno || "Not provided"} ({selectedStaff.bankname || "Bank"}) &nbsp;|&nbsp;
                        <strong>IFSC:</strong> {selectedStaff.ifsccode || "N/A"}
                      </Typography>
                    </Grid>
                  </Grid>
                </Paper>

                {/* Additional Postal Charges */}
                <Typography variant="subtitle1" fontWeight={700} color="primary" sx={{ mb: 1 }}>
                  Additional Postal / Dispatch Charges (Rs.)
                </Typography>
                <TextField
                  type="number"
                  size="small"
                  label="Postal Charges (Receipt to be enclosed)"
                  value={postalCharges}
                  onChange={(e) => setPostalCharges(e.target.value)}
                  sx={{ width: 300, mb: 3 }}
                />

                {/* Travel Details Table */}
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                  <Typography variant="subtitle1" fontWeight={700} color="primary">
                    Details of Traveling for Meeting / Examination Work
                  </Typography>
                  <Button
                    size="small"
                    startIcon={<AddCircleOutlineIcon />}
                    onClick={handleAddTravelRow}
                  >
                    Add Journey
                  </Button>
                </Stack>

                <TableContainer component={Paper} elevation={0} sx={{ border: "1px solid #e2e8f0", borderRadius: 1.5, mb: 2 }}>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: "#f1f5f9" }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>From</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>To</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Mode of Traveling</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Amount (Rs.)</TableCell>
                        <TableCell sx={{ width: 40 }}></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {travelRows.map((row, idx) => (
                        <TableRow key={idx}>
                          <TableCell sx={{ p: 1 }}>
                            <TextField
                              type="date"
                              size="small"
                              fullWidth
                              value={row.date}
                              onChange={(e) => handleTravelRowChange(idx, "date", e.target.value)}
                            />
                          </TableCell>
                          <TableCell sx={{ p: 1 }}>
                            <TextField
                              size="small"
                              fullWidth
                              placeholder="e.g. Bhopal Station"
                              value={row.from}
                              onChange={(e) => handleTravelRowChange(idx, "from", e.target.value)}
                            />
                          </TableCell>
                          <TableCell sx={{ p: 1 }}>
                            <TextField
                              size="small"
                              fullWidth
                              placeholder="e.g. People's Campus"
                              value={row.to}
                              onChange={(e) => handleTravelRowChange(idx, "to", e.target.value)}
                            />
                          </TableCell>
                          <TableCell sx={{ p: 1 }}>
                            <TextField
                              size="small"
                              fullWidth
                              placeholder="e.g. Auto / Taxi"
                              value={row.mode}
                              onChange={(e) => handleTravelRowChange(idx, "mode", e.target.value)}
                            />
                          </TableCell>
                          <TableCell sx={{ p: 1 }}>
                            <TextField
                              type="number"
                              size="small"
                              fullWidth
                              value={row.amount}
                              onChange={(e) => handleTravelRowChange(idx, "amount", e.target.value)}
                            />
                          </TableCell>
                          <TableCell sx={{ p: 1 }}>
                            <IconButton
                              size="small"
                              color="error"
                              disabled={travelRows.length <= 1}
                              onClick={() => handleRemoveTravelRow(idx)}
                            >
                              <DeleteOutlineIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                <Alert severity="info" icon={<InfoIcon />}>
                  Generating this bill will create the official 2-page print layout as per People's University format with bank RTGS details and verification seals.
                </Alert>
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 2, bgcolor: "#f8fafc" }}>
            <Button onClick={() => setBillModalOpen(false)} color="inherit">
              Cancel
            </Button>
            <Button
              variant="contained"
              color="primary"
              disabled={generatingBill}
              onClick={handleGenerateBillSubmit}
              startIcon={<ReceiptLongIcon />}
              sx={{ fontWeight: 700, px: 3 }}
            >
              {generatingBill ? "Generating..." : "Generate Official 2-Page Bill"}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </MenuPageShell>
  );
}
