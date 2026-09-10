import React, { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Collapse,
  Divider,
  IconButton,
  Paper,
  Stack,
  Tooltip,
  Typography
} from "@mui/material";
import { HelpOutline, Search } from "@mui/icons-material";
import ep1 from "../api/ep1";
import global1 from "./global1";

const value = (source, key) => String(source?.[key] || "").trim();
const compact = (source = {}) => ({
  academicyear: value(source, "academicyear"),
  regulation: value(source, "regulation"),
  program: value(source, "program"),
  programcode: value(source, "programcode"),
  semester: value(source, "semester"),
  section: value(source, "section"),
  major: value(source, "major") || value(source, "subject"),
  specialization: value(source, "specialization"),
  course: value(source, "course"),
  coursecode: value(source, "coursecode")
});

export default function AttendanceDiagnosticHelp({ selectedClass, filters = {}, label = "Student or Class not showing?" }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const criteria = useMemo(() => compact({ ...filters, ...(selectedClass || {}) }), [filters, selectedClass]);

  const runDiagnostic = async () => {
    setOpen(true);
    setLoading(true);
    setError("");
    try {
      const res = await ep1.get("/api/v2/neplms/attendance/diagnostic", {
        params: { colid: global1.colid, user: global1.user, facultyemail: global1.user, role: global1.role, ...criteria }
      });
      setResult(res.data || null);
    } catch (err) {
      setResult(null);
      setError(err.response?.data?.message || "Unable to run attendance diagnostic");
    } finally {
      setLoading(false);
    }
  };

  const chips = Object.entries(criteria).filter(([, item]) => item);
  return (
    <Paper variant="outlined" sx={{ p: 1.5, mb: 2, bgcolor: "#f8fafc" }}>
      <Stack direction={{ xs: "column", md: "row" }} spacing={1} justifyContent="space-between" alignItems={{ xs: "stretch", md: "center" }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Tooltip title="Analyze why class or student may not be showing">
            <IconButton color="primary" onClick={runDiagnostic}><HelpOutline /></IconButton>
          </Tooltip>
          <Box>
            <Typography fontWeight={900}>{label}</Typography>
            <Typography variant="body2" color="text.secondary">Checks matching timetable classes and Student users for the selected criteria.</Typography>
          </Box>
        </Stack>
        <Button variant="outlined" startIcon={<Search />} onClick={runDiagnostic} disabled={loading}>
          {loading ? "Analyzing..." : "Analyze"}
        </Button>
      </Stack>
      <Collapse in={open}>
        <Divider sx={{ my: 1.5 }} />
        {error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}
        {!!chips.length && (
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
            {chips.map(([key, item]) => <Chip key={key} size="small" label={`${key}: ${item}`} />)}
          </Stack>
        )}
        {result && (
          <Stack spacing={1.5}>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip color={result.totals?.courses ? "primary" : "warning"} label={`Assigned courses: ${result.totals?.courses || 0}`} />
              <Chip color="success" label={`Green: ${result.totals?.ok || 0}`} />
              <Chip color={result.totals?.mismatch ? "error" : "success"} label={`Red: ${result.totals?.mismatch || 0}`} />
              <Chip color={result.timetable?.count ? "success" : "error"} label={`Total timetable matches: ${result.timetable?.count || 0}`} />
              <Chip color={result.students?.count ? "success" : "error"} label={`Total student matches: ${result.students?.count || 0}`} />
            </Stack>
            {result.mismatches?.length ? (
              <Alert severity="warning">
                <Typography fontWeight={900}>Actual mismatch</Typography>
                {result.mismatches.map((item) => <Typography key={item} variant="body2">{item}</Typography>)}
              </Alert>
            ) : (
              <Alert severity="success">All assigned courses have matching timetable classes and matching students.</Alert>
            )}
            <Box sx={{ overflowX: "auto" }}>
              <Box
                component="table"
                sx={{
                  width: "100%",
                  borderCollapse: "collapse",
                  bgcolor: "#fff",
                  "& th": {
                    bgcolor: "#0f172a",
                    color: "#fff",
                    fontWeight: 900,
                    textAlign: "left",
                    p: 1,
                    border: "1px solid #cbd5e1",
                    whiteSpace: "nowrap"
                  },
                  "& td": {
                    p: 1,
                    border: "1px solid #cbd5e1",
                    verticalAlign: "top",
                    fontSize: 13
                  }
                }}
              >
                <thead>
                  <tr>
                    <th>Course</th>
                    <th>Academic Details</th>
                    <th>Faculty</th>
                    <th>Matching Timetable</th>
                    <th>Matching Students</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(result.courseRows || []).map((row) => {
                    const healthy = Number(row.timetableCount || 0) > 0 && Number(row.studentCount || 0) > 0;
                    return (
                      <tr key={row.id} style={{ background: healthy ? "#ecfdf5" : "#fef2f2" }}>
                        <td>
                          <Typography variant="body2" fontWeight={900}>{row.course || "-"}</Typography>
                          <Typography variant="caption" color="text.secondary">{row.coursecode || ""}</Typography>
                        </td>
                        <td>
                          <Typography variant="body2">{row.academicyear || "-"} | {row.regulation || "-"}</Typography>
                          <Typography variant="body2">{row.program || "-"} ({row.programcode || "-"})</Typography>
                          <Typography variant="body2">Sem {row.semester || "-"} | {row.major || "-"}</Typography>
                        </td>
                        <td>
                          <Typography variant="body2">{row.faculty || "-"}</Typography>
                          <Typography variant="caption" color="text.secondary">{row.facultyemail || ""}</Typography>
                        </td>
                        <td>
                          <Chip size="small" color={row.timetableCount ? "success" : "error"} label={row.timetableCount || 0} />
                        </td>
                        <td>
                          <Chip size="small" color={row.studentCount ? "success" : "error"} label={row.studentCount || 0} />
                        </td>
                        <td>
                          <Typography variant="body2" fontWeight={900} color={healthy ? "success.main" : "error.main"}>
                            {healthy ? "OK" : "Mismatch"}
                          </Typography>
                          {(row.mismatches || []).map((item) => (
                            <Typography key={item} variant="caption" display="block" color="text.secondary">{item}</Typography>
                          ))}
                        </td>
                      </tr>
                    );
                  })}
                  {!(result.courseRows || []).length && (
                    <tr>
                      <td colSpan={6}>
                        <Typography variant="body2" color="text.secondary">No assigned courses found for the selected criteria.</Typography>
                      </td>
                    </tr>
                  )}
                </tbody>
              </Box>
            </Box>
          </Stack>
        )}
      </Collapse>
    </Paper>
  );
}
