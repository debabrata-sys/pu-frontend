import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import { DataGrid, GridToolbar } from "@mui/x-data-grid";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import RuleIcon from "@mui/icons-material/Rule";
import HowToRegIcon from "@mui/icons-material/HowToReg";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import MenuPageShell from "./MenuPageShell";
import ep1 from "../api/ep1";
import global1 from "./global1";

export default function ConductExamFormEligibilityPage() {
  const [filters, setFilters] = useState({
    academicyear: "2026-27",
    regulation: "",
    programcode: "",
    semester: ""
  });
  const [programs, setPrograms] = useState([]);
  const [regulations, setRegulations] = useState([]);
  const [academicyears, setAcademicyears] = useState(["2024-25", "2025-26", "2026-27", "2027-28"]);

  const [rows, setRows] = useState([]);
  const [stats, setStats] = useState({
    totalStudents: 0,
    eligibleCount: 0,
    attendanceDefaultersCount: 0,
    feeDefaultersCount: 0,
    manualOverrideCount: 0,
    formFilledCount: 0
  });
  const [statusFilter, setStatusFilter] = useState("all");

  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Override dialog state
  const [overrideDialogOpen, setOverrideDialogOpen] = useState(false);
  const [targetStudent, setTargetStudent] = useState(null);
  const [overrideAction, setOverrideAction] = useState("grant"); // "grant" or "revoke"
  const [overrideReason, setOverrideReason] = useState("");

  // Bulk dialog state
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkReason, setBulkReason] = useState("Administrative approval / condonation granted");

  useEffect(() => {
    loadFilterOptions();
    loadStudents();
  }, []);

  const loadFilterOptions = async () => {
    try {
      const res = await ep1.get("/api/v2/conductexam/options", { params: { colid: global1.colid } });
      if (res.data?.options) {
        if (res.data.options.programs?.length) setPrograms(res.data.options.programs);
        if (res.data.options.regulations?.length) setRegulations(res.data.options.regulations);
        if (res.data.options.academicyears?.length) setAcademicyears(res.data.options.academicyears);
      }
    } catch {
      // Fallback
    }
  };

  const loadStudents = async () => {
    try {
      setLoading(true);
      setError("");
      setMessage("");
      const params = { colid: global1.colid };
      if (filters.academicyear) params.academicyear = filters.academicyear;
      if (filters.regulation) params.regulation = filters.regulation;
      if (filters.programcode) params.programcode = filters.programcode;
      if (filters.semester) params.semester = filters.semester;

      const res = await ep1.get("/api/v2/conductexam/form-eligibility/students", { params });
      setRows(res.data?.data || []);
      if (res.data?.stats) setStats(res.data.stats);
      setSelectedIds([]);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load students eligibility list");
    } finally {
      setLoading(false);
    }
  };

  const filteredRows = useMemo(() => {
    if (statusFilter === "eligible") return rows.filter((r) => r.isEligible);
    if (statusFilter === "not_eligible") return rows.filter((r) => !r.isEligible);
    if (statusFilter === "override") return rows.filter((r) => r.manualOverride);
    if (statusFilter === "filled") return rows.filter((r) => r.formFilled);
    if (statusFilter === "attendance_shortage") return rows.filter((r) => !r.attendanceMeetsThreshold);
    if (statusFilter === "fee_pending") return rows.filter((r) => r.feeBalance > 0);
    return rows;
  }, [rows, statusFilter]);

  const handleOpenOverride = (student, action) => {
    setTargetStudent(student);
    setOverrideAction(action);
    setOverrideReason(
      action === "grant"
        ? "Dean / COE approval - Condonation granted"
        : "Administrative review - Eligibility revoked"
    );
    setOverrideDialogOpen(true);
  };

  const handleConfirmOverride = async () => {
    if (!targetStudent) return;
    try {
      setActionLoading(true);
      setError("");
      const isEligible = overrideAction === "grant";
      const res = await ep1.post("/api/v2/conductexam/form-eligibility/override", {
        colid: global1.colid,
        regno: targetStudent.regno,
        student: targetStudent.student,
        academicyear: targetStudent.academicyear || filters.academicyear,
        regulation: targetStudent.regulation || filters.regulation,
        semester: targetStudent.semester || filters.semester,
        isEligible,
        reason: overrideReason,
        user: global1.user
      });

      setMessage(res.data?.message || "Student eligibility updated successfully.");
      setOverrideDialogOpen(false);
      setTargetStudent(null);
      await loadStudents();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update eligibility");
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmBulkOverride = async (isEligible) => {
    if (!selectedIds.length) return;
    try {
      setActionLoading(true);
      setError("");
      const selectedItems = rows.filter((r) => selectedIds.includes(r.regno || r._id));
      const res = await ep1.post("/api/v2/conductexam/form-eligibility/bulk-override", {
        colid: global1.colid,
        items: selectedItems,
        isEligible,
        reason: bulkReason,
        user: global1.user
      });

      setMessage(res.data?.message || "Bulk eligibility updated successfully.");
      setBulkDialogOpen(false);
      setSelectedIds([]);
      await loadStudents();
    } catch (err) {
      setError(err.response?.data?.message || "Bulk update failed");
    } finally {
      setActionLoading(false);
    }
  };

  const columns = [
    { field: "regno", headerName: "Reg No", width: 130, fontWeight: 700 },
    { field: "student", headerName: "Student Name", minWidth: 170, flex: 1 },
    { field: "programcode", headerName: "Program", width: 120 },
    { field: "semester", headerName: "Sem", width: 80 },
    {
      field: "attendancePercent",
      headerName: "Attendance (Min 75%)",
      width: 180,
      renderCell: (params) => {
        const row = params.row;
        const meets = row.attendanceMeetsThreshold;
        const total = row.attendanceTotal || 0;
        return (
          <Stack direction="row" spacing={0.5} alignItems="center">
            <Chip
              size="small"
              icon={meets ? <CheckCircleOutlineIcon /> : <WarningAmberIcon />}
              label={`${row.attendancePercent}% ${total ? `(${row.attendancePresent}/${total})` : "(No rec)"}`}
              color={meets ? "success" : total > 0 ? "error" : "default"}
              variant="outlined"
            />
          </Stack>
        );
      }
    },
    {
      field: "feeStatus",
      headerName: "Semester Fees",
      width: 160,
      renderCell: (params) => {
        const row = params.row;
        const cleared = row.feeBalance <= 0;
        return (
          <Chip
            size="small"
            icon={<AttachMoneyIcon />}
            label={cleared ? "Paid" : `Due ₹${Number(row.feeBalance).toLocaleString("en-IN")}`}
            color={cleared ? "success" : "error"}
            variant="outlined"
          />
        );
      }
    },
    {
      field: "status",
      headerName: "Exam Form Status",
      width: 180,
      renderCell: (params) => {
        const row = params.row;
        if (row.manualOverride) {
          return (
            <Chip
              size="small"
              label="Eligible (Override)"
              color="info"
              sx={{ fontWeight: 700 }}
            />
          );
        }
        return (
          <Chip
            size="small"
            label={row.isEligible ? "Eligible (Auto)" : "Not Eligible"}
            color={row.isEligible ? "success" : "error"}
            sx={{ fontWeight: 700 }}
          />
        );
      }
    },
    {
      field: "formFilled",
      headerName: "Form Fillup",
      width: 140,
      renderCell: (params) => {
        return (
          <Chip
            size="small"
            label={params.value ? "Filled" : "Pending"}
            color={params.value ? "primary" : "default"}
            variant={params.value ? "filled" : "outlined"}
          />
        );
      }
    },
    {
      field: "overrideReason",
      headerName: "Override Remarks",
      width: 200,
      renderCell: (params) => (
        <Typography variant="caption" color="text.secondary" noWrap>
          {params.value || "-"}
        </Typography>
      )
    },
    {
      field: "actions",
      headerName: "Action",
      width: 160,
      sortable: false,
      renderCell: (params) => {
        const row = params.row;
        return (
          <Button
            size="small"
            variant={row.isEligible ? "outlined" : "contained"}
            color={row.isEligible ? "warning" : "primary"}
            onClick={() => handleOpenOverride(row, row.isEligible ? "revoke" : "grant")}
          >
            {row.isEligible ? "Revoke" : "Make Eligible"}
          </Button>
        );
      }
    }
  ];

  return (
    <MenuPageShell title="Exam Form Eligibility">
      <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: "#f8fafc", minHeight: "100vh" }}>
        {/* Header */}
        <Paper elevation={0} sx={{ p: 2.5, mb: 2, border: "1px solid #e2e8f0", borderRadius: 2 }}>
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ md: "center" }} spacing={2}>
            <Box>
              <Typography variant="h5" fontWeight={900} color="text.primary">
                Exam Form Eligibility Management
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Students require <strong>&ge; 75% attendance</strong> and <strong>zero semester fee dues</strong> to fill up the exam form. Grant manual condonation / override here.
              </Typography>
            </Box>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              <Button
                variant="contained"
                color="success"
                startIcon={<HowToRegIcon />}
                disabled={!selectedIds.length || actionLoading}
                onClick={() => setBulkDialogOpen(true)}
              >
                Make Selected Eligible ({selectedIds.length})
              </Button>
              <Button variant="outlined" onClick={loadStudents} disabled={loading}>
                {loading ? <CircularProgress size={20} /> : "Refresh"}
              </Button>
            </Stack>
          </Stack>
        </Paper>

        {message && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMessage("")}>{message}</Alert>}
        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}

        {/* Metrics Cards */}
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={6} sm={4} md={2}>
            <Card elevation={0} sx={{ border: "1px solid #e2e8f0", borderRadius: 2 }}>
              <CardContent sx={{ p: 2, textAlign: "center" }}>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>Total Students</Typography>
                <Typography variant="h5" fontWeight={900}>{stats.totalStudents}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={4} md={2}>
            <Card elevation={0} sx={{ border: "1px solid #bbf7d0", bgcolor: "#f0fdf4", borderRadius: 2 }}>
              <CardContent sx={{ p: 2, textAlign: "center" }}>
                <Typography variant="caption" color="success.dark" fontWeight={600}>Form Eligible</Typography>
                <Typography variant="h5" fontWeight={900} color="success.main">{stats.eligibleCount}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={4} md={2}>
            <Card elevation={0} sx={{ border: "1px solid #fecdd3", bgcolor: "#fff1f2", borderRadius: 2 }}>
              <CardContent sx={{ p: 2, textAlign: "center" }}>
                <Typography variant="caption" color="error.dark" fontWeight={600}>Attendance &lt; 75%</Typography>
                <Typography variant="h5" fontWeight={900} color="error.main">{stats.attendanceDefaultersCount}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={4} md={2}>
            <Card elevation={0} sx={{ border: "1px solid #fed7aa", bgcolor: "#fff7ed", borderRadius: 2 }}>
              <CardContent sx={{ p: 2, textAlign: "center" }}>
                <Typography variant="caption" color="warning.dark" fontWeight={600}>Fee Defaulters</Typography>
                <Typography variant="h5" fontWeight={900} color="warning.main">{stats.feeDefaultersCount}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={4} md={2}>
            <Card elevation={0} sx={{ border: "1px solid #bae6fd", bgcolor: "#f0f9ff", borderRadius: 2 }}>
              <CardContent sx={{ p: 2, textAlign: "center" }}>
                <Typography variant="caption" color="info.dark" fontWeight={600}>Admin Overrides</Typography>
                <Typography variant="h5" fontWeight={900} color="info.main">{stats.manualOverrideCount}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={4} md={2}>
            <Card elevation={0} sx={{ border: "1px solid #e2e8f0", bgcolor: "#faf5ff", borderRadius: 2 }}>
              <CardContent sx={{ p: 2, textAlign: "center" }}>
                <Typography variant="caption" color="secondary.dark" fontWeight={600}>Forms Filled</Typography>
                <Typography variant="h5" fontWeight={900} color="secondary.main">{stats.formFilledCount}</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Filter Controls */}
        <Paper elevation={0} sx={{ p: 2.5, mb: 2, border: "1px solid #e2e8f0", borderRadius: 2 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={2.5}>
              <FormControl fullWidth size="small">
                <InputLabel>Academic Year</InputLabel>
                <Select
                  value={filters.academicyear}
                  label="Academic Year"
                  onChange={(e) => setFilters((p) => ({ ...p, academicyear: e.target.value }))}
                >
                  {academicyears.map((yr) => <MenuItem key={yr} value={yr}>{yr}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6} md={2.5}>
              <FormControl fullWidth size="small">
                <InputLabel>Program</InputLabel>
                <Select
                  value={filters.programcode}
                  label="Program"
                  onChange={(e) => setFilters((p) => ({ ...p, programcode: e.target.value }))}
                >
                  <MenuItem value="">All Programs</MenuItem>
                  {programs.map((prg) => (
                    <MenuItem key={prg.programcode || prg} value={prg.programcode || prg}>
                      {prg.program || prg.programcode || prg}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Semester</InputLabel>
                <Select
                  value={filters.semester}
                  label="Semester"
                  onChange={(e) => setFilters((p) => ({ ...p, semester: e.target.value }))}
                >
                  <MenuItem value="">All Semesters</MenuItem>
                  {["1", "2", "3", "4", "5", "6", "7", "8"].map((s) => (
                    <MenuItem key={s} value={s}>Semester {s}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6} md={2.5}>
              <FormControl fullWidth size="small">
                <InputLabel>Filter by Status</InputLabel>
                <Select
                  value={statusFilter}
                  label="Filter by Status"
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <MenuItem value="all">All Students ({rows.length})</MenuItem>
                  <MenuItem value="eligible">Eligible ({stats.eligibleCount})</MenuItem>
                  <MenuItem value="not_eligible">Not Eligible ({rows.length - stats.eligibleCount})</MenuItem>
                  <MenuItem value="override">Admin Override ({stats.manualOverrideCount})</MenuItem>
                  <MenuItem value="attendance_shortage">Attendance &lt; 75% ({stats.attendanceDefaultersCount})</MenuItem>
                  <MenuItem value="fee_pending">Fee Pending ({stats.feeDefaultersCount})</MenuItem>
                  <MenuItem value="filled">Form Filled ({stats.formFilledCount})</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6} md={2.5}>
              <Button fullWidth variant="contained" onClick={loadStudents} disabled={loading} sx={{ height: 40, fontWeight: 700 }}>
                {loading ? "Loading..." : "Apply Filters"}
              </Button>
            </Grid>
          </Grid>
        </Paper>

        {/* DataGrid Table */}
        <Paper elevation={0} sx={{ p: 2, border: "1px solid #e2e8f0", borderRadius: 2 }}>
          <DataGrid
            rows={filteredRows.map((row) => ({ ...row, id: row.regno || row._id }))}
            columns={columns}
            loading={loading}
            autoHeight
            checkboxSelection
            rowSelectionModel={selectedIds}
            onRowSelectionModelChange={(newModel) => setSelectedIds(newModel)}
            disableRowSelectionOnClick
            slots={{ toolbar: GridToolbar }}
            pageSizeOptions={[10, 25, 50, 100]}
            initialState={{ pagination: { paginationModel: { pageSize: 25, page: 0 } } }}
            sx={{
              "& .MuiDataGrid-columnHeaders": { bgcolor: "#f1f5f9", fontWeight: 700 },
              minHeight: 400
            }}
          />
        </Paper>

        {/* Single Override Dialog */}
        <Dialog open={overrideDialogOpen} onClose={() => setOverrideDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight: 800 }}>
            {overrideAction === "grant" ? "Make Student Eligible for Exam Form" : "Revoke Exam Form Eligibility"}
          </DialogTitle>
          <DialogContent>
            {targetStudent && (
              <Box sx={{ pt: 1 }}>
                <Typography variant="body2" sx={{ mb: 1.5 }}>
                  Student: <strong>{targetStudent.student}</strong> ({targetStudent.regno}) | {targetStudent.programcode} Sem {targetStudent.semester}
                </Typography>
                <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                  <Chip
                    size="small"
                    label={`Attendance: ${targetStudent.attendancePercent}%`}
                    color={targetStudent.attendanceMeetsThreshold ? "success" : "error"}
                  />
                  <Chip
                    size="small"
                    label={`Fee Balance: ₹${targetStudent.feeBalance}`}
                    color={targetStudent.feeBalance <= 0 ? "success" : "error"}
                  />
                </Stack>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Override Reason / Condonation Note"
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="e.g., Dean approval granted, Medical condonation, Fee extension allowed..."
                />
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setOverrideDialogOpen(false)} disabled={actionLoading}>Cancel</Button>
            <Button
              variant="contained"
              color={overrideAction === "grant" ? "success" : "warning"}
              onClick={handleConfirmOverride}
              disabled={actionLoading}
            >
              {actionLoading ? "Processing..." : overrideAction === "grant" ? "Confirm Eligibility" : "Revoke"}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Bulk Override Dialog */}
        <Dialog open={bulkDialogOpen} onClose={() => setBulkDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight: 800 }}>
            Make Selected Students Eligible ({selectedIds.length})
          </DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 1 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                This will grant manual exam form eligibility to the {selectedIds.length} selected students, allowing them to fill up and submit the examination form.
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Condonation / Approval Note"
                value={bulkReason}
                onChange={(e) => setBulkReason(e.target.value)}
              />
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setBulkDialogOpen(false)} disabled={actionLoading}>Cancel</Button>
            <Button
              variant="contained"
              color="success"
              onClick={() => handleConfirmBulkOverride(true)}
              disabled={actionLoading}
            >
              {actionLoading ? "Processing..." : `Make ${selectedIds.length} Eligible`}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </MenuPageShell>
  );
}
