import React, { useEffect, useState, useMemo } from "react";
import {
  Autocomplete,
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
  Divider,
  Grid,
  InputAdornment,
  MenuItem,
  Paper,
  Stack,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Checkbox,
  Alert
} from "@mui/material";
import {
  RateReview,
  Refresh,
  PersonAdd,
  GroupAdd,
  CheckCircle,
  Warning,
  HourglassEmpty,
  ArrowForward,
  TrendingUp,
  Rule,
  Search,
  BarChart as BarChartIcon,
  PieChart as PieChartIcon,
  InfoOutlined
} from "@mui/icons-material";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ReferenceLine,
  Cell
} from "recharts";
import ep1 from "../api/ep1";
import global1 from "./global1";
import MenuPageShell from "./MenuPageShell";

export default function ConductExam2ReevaluationPage() {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [filters, setFilters] = useState({
    academicyear: "",
    examcode: "",
    coursecode: ""
  });

  const [options, setOptions] = useState({
    academicyears: [],
    exams: [],
    courses: [],
    evaluators: []
  });

  // Eligible students for re-evaluation
  const [eligibleStudents, setEligibleStudents] = useState([]);
  const [selectedEligible, setSelectedEligible] = useState([]);

  // Active re-evaluation records
  const [revaluations, setRevaluations] = useState([]);
  const [selectedRevals, setSelectedRevals] = useState([]);

  // Allotment modal / inputs
  const [allot12Open, setAllot12Open] = useState(false);
  const [allot3Open, setAllot3Open] = useState(false);
  const [selectedEval1, setSelectedEval1] = useState("");
  const [selectedEval2, setSelectedEval2] = useState("");
  const [selectedEval3, setSelectedEval3] = useState("");

  // Variation chart filter states
  const [variationSearch, setVariationSearch] = useState("");
  const [variationBracketFilter, setVariationBracketFilter] = useState("all");
  const [chartViewMode, setChartViewMode] = useState("both"); // 'both' | 'script' | 'distribution'

  useEffect(() => {
    loadOptions();
  }, []);

  useEffect(() => {
    if (filters.examcode && filters.coursecode) {
      fetchEligibleStudents();
      fetchRevaluations();
    }
  }, [filters.examcode, filters.coursecode]);

  const loadOptions = async () => {
    try {
      const res = await ep1.get("/api/v2/conductexam2/reevaluation-options", {
        params: { colid: global1.colid }
      });
      if (res.data?.success) {
        setOptions({
          academicyears: res.data.academicyears || [],
          exams: res.data.exams || [],
          courses: res.data.courses || [],
          evaluators: res.data.evaluators || []
        });
        if (res.data.exams?.length && !filters.examcode) {
          const firstExam = res.data.exams[0].examcode;
          const matchingCourse = res.data.courses.find((c) => c.examcode === firstExam);
          setFilters({
            academicyear: res.data.academicyears[0] || "",
            examcode: firstExam,
            coursecode: matchingCourse?.coursecode || res.data.courses[0]?.coursecode || ""
          });
        }
      }
    } catch (err) {
      console.error("Error loading re-evaluation options:", err);
    }
  };

  const fetchEligibleStudents = async () => {
    if (!filters.examcode || !filters.coursecode) return;
    try {
      setLoading(true);
      const res = await ep1.get("/api/v2/conductexam2/reevaluation-eligible-students", {
        params: {
          colid: global1.colid,
          examcode: filters.examcode,
          coursecode: filters.coursecode
        }
      });
      if (res.data?.success) {
        setEligibleStudents(res.data.students || []);
        setSelectedEligible([]);
      }
    } catch (err) {
      console.error("Error fetching eligible students:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRevaluations = async () => {
    if (!filters.examcode || !filters.coursecode) return;
    try {
      const res = await ep1.get("/api/v2/conductexam2/reevaluation-list", {
        params: {
          colid: global1.colid,
          examcode: filters.examcode,
          coursecode: filters.coursecode
        }
      });
      if (res.data?.success) {
        setRevaluations(res.data.reevaluations || []);
        setSelectedRevals([]);
      }
    } catch (err) {
      console.error("Error fetching re-evaluations:", err);
    }
  };

  // Apply students for re-evaluation
  const handleApplyReevaluation = async () => {
    if (!selectedEligible.length) {
      setError("Please select at least one student to apply for re-evaluation.");
      return;
    }
    try {
      setLoading(true);
      setError("");
      const res = await ep1.post("/api/v2/conductexam2/reevaluation-apply", {
        colid: global1.colid,
        examcode: filters.examcode,
        coursecode: filters.coursecode,
        students: selectedEligible,
        user: global1.user
      });
      if (res.data?.success) {
        setSuccessMsg(`Successfully applied ${selectedEligible.length} student(s) for re-evaluation.`);
        fetchEligibleStudents();
        fetchRevaluations();
        setActiveTab(1); // switch to allotment tab
      } else {
        setError(res.data?.message || "Failed to apply students for re-evaluation.");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Error applying for re-evaluation.");
    } finally {
      setLoading(false);
    }
  };

  // Allot Re-evaluator 1 & 2 in Parallel
  const handleAllot12 = async () => {
    if (!selectedRevals.length) {
      setError("Please select students to allot re-evaluators.");
      return;
    }
    if (!selectedEval1 || !selectedEval2) {
      setError("Please select both Re-evaluator 1 and Re-evaluator 2.");
      return;
    }
    if (selectedEval1 === selectedEval2) {
      setError("Re-evaluator 1 and Re-evaluator 2 must be different evaluators.");
      return;
    }

    const eval1Obj = options.evaluators.find((e) => e.email === selectedEval1);
    const eval2Obj = options.evaluators.find((e) => e.email === selectedEval2);

    try {
      setLoading(true);
      setError("");
      const res = await ep1.post("/api/v2/conductexam2/reevaluation-allot", {
        colid: global1.colid,
        regnos: selectedRevals,
        reevaluator1: eval1Obj,
        reevaluator2: eval2Obj
      });
      if (res.data?.success) {
        setSuccessMsg("Successfully allotted Re-evaluator 1 and Re-evaluator 2 in parallel!");
        setAllot12Open(false);
        fetchRevaluations();
      } else {
        setError(res.data?.message || "Failed to allot re-evaluators.");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Error allotting re-evaluators.");
    } finally {
      setLoading(false);
    }
  };

  // Allot Re-evaluator 3
  const handleAllot3 = async () => {
    if (!selectedRevals.length) {
      setError("Please select students to allot Re-evaluator 3.");
      return;
    }
    if (!selectedEval3) {
      setError("Please select Re-evaluator 3.");
      return;
    }

    const eval3Obj = options.evaluators.find((e) => e.email === selectedEval3);

    try {
      setLoading(true);
      setError("");
      const res = await ep1.post("/api/v2/conductexam2/reevaluation-allot-3", {
        colid: global1.colid,
        regnos: selectedRevals,
        reevaluator3: eval3Obj
      });
      if (res.data?.success) {
        setSuccessMsg("Successfully allotted Re-evaluator 3!");
        setAllot3Open(false);
        fetchRevaluations();
      } else {
        setError(res.data?.message || "Failed to allot Re-evaluator 3.");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Error allotting Re-evaluator 3.");
    } finally {
      setLoading(false);
    }
  };

  // Re-evaluations needing Re-evaluator 1 & 2 allotment
  const pending12Allotment = useMemo(
    () => revaluations.filter((r) => r.status === "Applied" || !r.reevaluator1?.email),
    [revaluations]
  );

  // Re-evaluations referred to Re-evaluator 3 (>20% increase)
  const referredTo3List = useMemo(
    () => revaluations.filter((r) => r.status === "ReferredTo_3" || (r.percentageChange > 20 && r.status !== "Completed")),
    [revaluations]
  );

  // Percentage Variation records across V2 (M1) and V3 (M2) relative to Original (M0)
  const variationData = useMemo(() => {
    return revaluations
      .filter((r) => r.reevaluator1?.marks !== null && r.reevaluator1?.marks !== undefined && r.reevaluator2?.marks !== null && r.reevaluator2?.marks !== undefined)
      .map((r) => {
        const m0 = Number(r.originalmarks || 0);
        const m1 = Number(r.reevaluator1.marks || 0);
        const m2 = Number(r.reevaluator2.marks || 0);
        const avg12 = Number(r.reval12Avg !== null && r.reval12Avg !== undefined ? r.reval12Avg : ((m1 + m2) / 2).toFixed(2));
        const maxMarks = Number(r.maxmarks || 75);
        const marksDiff = Number((avg12 - m0).toFixed(2));
        const pctVariation = r.percentageChange !== null && r.percentageChange !== undefined
          ? Number(r.percentageChange)
          : Number(((marksDiff / (maxMarks || 100)) * 100).toFixed(2));

        let bracket = "0% - 10%";
        let bracketColor = "#3b82f6"; // Blue
        let action = "0% to 10%: No Marks Change (Original Maintained)";

        if (pctVariation < 0) {
          bracket = "< 0%";
          bracketColor = "#64748b"; // Slate/Grey
          action = "Marks Decreased (Original Maintained)";
        } else if (pctVariation <= 10) {
          bracket = "0% - 10%";
          bracketColor = "#3b82f6"; // Blue
          action = "0% to 10%: No Marks Change";
        } else if (pctVariation <= 20) {
          bracket = "10% - 20%";
          bracketColor = "#16a34a"; // Green
          action = "10% to 20%: Revised to Avg(V2, V3)";
        } else {
          bracket = "> 20%";
          bracketColor = "#dc2626"; // Red
          action = "> 20%: Referred to Re-evaluator 3";
        }

        return {
          id: r._id,
          regno: r.regno,
          cn: r.cn || "-",
          student: r.student,
          m0,
          m1,
          m2,
          avg12,
          marksDiff,
          pctVariation,
          bracket,
          bracketColor,
          action,
          status: r.status,
          decision: r.finaldecision,
          examcode: r.examcode,
          coursecode: r.coursecode
        };
      });
  }, [revaluations]);

  // Summary counts across official decision brackets
  const variationSummary = useMemo(() => {
    const total = variationData.length;
    let negative = 0;
    let zeroToTen = 0;
    let tenToTwenty = 0;
    let aboveTwenty = 0;
    let sumPct = 0;

    variationData.forEach((d) => {
      sumPct += d.pctVariation;
      if (d.pctVariation < 0) negative++;
      else if (d.pctVariation <= 10) zeroToTen++;
      else if (d.pctVariation <= 20) tenToTwenty++;
      else aboveTwenty++;
    });

    const avgPct = total > 0 ? Number((sumPct / total).toFixed(2)) : 0;
    return { total, negative, zeroToTen, tenToTwenty, aboveTwenty, avgPct };
  }, [variationData]);

  // Distribution chart data
  const distributionChartData = useMemo(() => [
    { name: "< 0% (Negative)", count: variationSummary.negative, fill: "#64748b" },
    { name: "0% - 10% (No Change)", count: variationSummary.zeroToTen, fill: "#3b82f6" },
    { name: "10% - 20% (Avg Awarded)", count: variationSummary.tenToTwenty, fill: "#16a34a" },
    { name: "> 20% (Referred V4)", count: variationSummary.aboveTwenty, fill: "#dc2626" }
  ], [variationSummary]);

  // Filtered variation records for data table
  const filteredVariationData = useMemo(() => {
    return variationData.filter((d) => {
      const matchesSearch =
        !variationSearch.trim() ||
        (d.regno || "").toLowerCase().includes(variationSearch.toLowerCase()) ||
        (d.student || "").toLowerCase().includes(variationSearch.toLowerCase()) ||
        (d.cn || "").toLowerCase().includes(variationSearch.toLowerCase());

      const matchesBracket =
        variationBracketFilter === "all" ||
        (variationBracketFilter === "negative" && d.pctVariation < 0) ||
        (variationBracketFilter === "zeroToTen" && d.pctVariation >= 0 && d.pctVariation <= 10) ||
        (variationBracketFilter === "tenToTwenty" && d.pctVariation > 10 && d.pctVariation <= 20) ||
        (variationBracketFilter === "aboveTwenty" && d.pctVariation > 20);

      return matchesSearch && matchesBracket;
    });
  }, [variationData, variationSearch, variationBracketFilter]);

  return (
    <MenuPageShell title="Re-evaluation Management & Allotment Desk">
      <Box sx={{ p: { xs: 1.5, sm: 3 }, maxWidth: 1400, mx: "auto" }}>
        <Stack spacing={2.5}>
          {/* Header Banner */}
          <Card elevation={2}>
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
                    <RateReview fontSize="medium" />
                  </Box>
                  <Box>
                    <Typography variant="h5" sx={{ fontWeight: 800, color: "#111827" }}>
                      Re-evaluation Desk
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Manage re-evaluations with parallel 2-evaluator assignment and automated 0-10%, 10-20%, &gt;20% revision logic
                    </Typography>
                  </Box>
                </Box>

                <Button
                  variant="outlined"
                  startIcon={<Refresh />}
                  onClick={() => {
                    fetchEligibleStudents();
                    fetchRevaluations();
                  }}
                  disabled={loading}
                  size="small"
                >
                  Refresh
                </Button>
              </Box>

              {/* Course Selection Filter */}
              <Divider sx={{ my: 2 }} />
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <TextField
                    select
                    fullWidth
                    size="small"
                    label="Academic Year"
                    value={filters.academicyear}
                    onChange={(e) => setFilters({ ...filters, academicyear: e.target.value })}
                  >
                    <MenuItem value="">All Academic Years</MenuItem>
                    {options.academicyears.map((yr) => (
                      <MenuItem key={yr} value={yr}>{yr}</MenuItem>
                    ))}
                  </TextField>
                </Grid>

                <Grid item xs={12} sm={4}>
                  <TextField
                    select
                    fullWidth
                    size="small"
                    label="Exam"
                    value={filters.examcode}
                    onChange={(e) => setFilters({ ...filters, examcode: e.target.value })}
                  >
                    {options.exams.map((ex) => (
                      <MenuItem key={ex.examcode} value={ex.examcode}>{ex.exam} ({ex.examcode})</MenuItem>
                    ))}
                  </TextField>
                </Grid>

                <Grid item xs={12} sm={4}>
                  <TextField
                    select
                    fullWidth
                    size="small"
                    label="Course / Subject"
                    value={filters.coursecode}
                    onChange={(e) => setFilters({ ...filters, coursecode: e.target.value })}
                  >
                    {options.courses.map((c) => (
                      <MenuItem key={c.coursecode} value={c.coursecode}>{c.course} ({c.coursecode})</MenuItem>
                    ))}
                  </TextField>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Logic Summary Banner */}
          <Paper sx={{ p: 2, bgcolor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 1.5 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#1e293b", mb: 0.5 }}>
              Official Re-evaluation Marks Change Rule:
            </Typography>
            <Typography variant="body2" sx={{ color: "#475569", fontSize: "13px" }}>
              • Subject goes to <b>Re-evaluator 1 & 2 in parallel</b> (blind marking on clean copy).<br />
              • <b>0% to 10% Increase</b>: No marks will be changed (original marks maintained).<br />
              • <b>10% to 20% Increase</b>: Marks revised to the <b>Average of Re-evaluator 1 and 2</b>.<br />
              • <b>&gt; 20% Increase</b>: Automatically referred to <b>Re-evaluator 3</b>; final marks = <b>Average of all 3 Re-evaluators</b>.
            </Typography>
          </Paper>

          {/* Feedback */}
          {error && <Alert severity="error" onClose={() => setError("")}>{error}</Alert>}
          {successMsg && <Alert severity="success" onClose={() => setSuccessMsg("")}>{successMsg}</Alert>}

          {/* Tabs */}
          <Paper elevation={1} sx={{ borderRadius: 1.5, overflow: "hidden" }}>
            <Tabs
              value={activeTab}
              onChange={(e, val) => setActiveTab(val)}
              textColor="primary"
              indicatorColor="primary"
              sx={{ borderBottom: 1, borderColor: "divider", bgcolor: "#fff" }}
            >
              <Tab label={`1. Eligible Students (${eligibleStudents.filter((s) => !s.alreadyApplied).length})`} />
              <Tab label={`2. Parallel Allotment V2 & V3 (${pending12Allotment.length})`} />
              <Tab
                label={
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <TrendingUp fontSize="small" sx={{ mr: 0.5 }} />
                    3. Percentage Variation Chart
                    {variationData.length > 0 && (
                      <Chip label={variationData.length} color="primary" size="small" sx={{ height: 20, fontSize: 11 }} />
                    )}
                  </Box>
                }
              />
              <Tab
                label={
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    4. Referred to Re-evaluator 3
                    {referredTo3List.length > 0 && (
                      <Chip label={referredTo3List.length} color="error" size="small" sx={{ height: 20, fontSize: 11 }} />
                    )}
                  </Box>
                }
              />
              <Tab label={`5. Live Tracking & Decision (${revaluations.length})`} />
            </Tabs>

            {/* TAB 0: Eligible Students to Apply */}
            {activeTab === 0 && (
              <Box sx={{ p: 2.5 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    Select students to apply for Re-evaluation:
                  </Typography>
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<PersonAdd />}
                    disabled={!selectedEligible.length || loading}
                    onClick={handleApplyReevaluation}
                    size="small"
                  >
                    Apply Selected ({selectedEligible.length})
                  </Button>
                </Box>

                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: "#f3f4f6" }}>
                        <TableCell padding="checkbox">
                          <Checkbox
                            size="small"
                            indeterminate={
                              selectedEligible.length > 0 &&
                              selectedEligible.length < eligibleStudents.filter((s) => !s.alreadyApplied).length
                            }
                            checked={
                              eligibleStudents.filter((s) => !s.alreadyApplied).length > 0 &&
                              selectedEligible.length === eligibleStudents.filter((s) => !s.alreadyApplied).length
                            }
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedEligible(eligibleStudents.filter((s) => !s.alreadyApplied).map((s) => s.regno));
                              } else {
                                setSelectedEligible([]);
                              }
                            }}
                          />
                        </TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Reg No</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>CN</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Student Name</TableCell>
                        <TableCell sx={{ fontWeight: 700, textAlign: "center" }}>V1 Marks (M0)</TableCell>
                        <TableCell sx={{ fontWeight: 700, textAlign: "center" }}>Max Marks</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {eligibleStudents.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} sx={{ textAlign: "center", py: 4, color: "#666" }}>
                            No evaluated students found for this course. Ensure V1 evaluation is finalized first.
                          </TableCell>
                        </TableRow>
                      ) : (
                        eligibleStudents.map((s) => {
                          const isSelected = selectedEligible.includes(s.regno);
                          return (
                            <TableRow key={s.regno} hover selected={isSelected}>
                              <TableCell padding="checkbox">
                                <Checkbox
                                  size="small"
                                  disabled={s.alreadyApplied}
                                  checked={isSelected || s.alreadyApplied}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedEligible([...selectedEligible, s.regno]);
                                    } else {
                                      setSelectedEligible(selectedEligible.filter((id) => id !== s.regno));
                                    }
                                  }}
                                />
                              </TableCell>
                              <TableCell sx={{ fontWeight: 700 }}>{s.regno}</TableCell>
                              <TableCell>{s.cn || "-"}</TableCell>
                              <TableCell>{s.student}</TableCell>
                              <TableCell sx={{ textAlign: "center", fontWeight: 700, color: "primary.main" }}>
                                {s.originalmarks}
                              </TableCell>
                              <TableCell sx={{ textAlign: "center" }}>{s.maxmarks}</TableCell>
                              <TableCell>
                                {s.alreadyApplied ? (
                                  <Chip label="Already Applied" color="success" size="small" variant="outlined" />
                                ) : (
                                  <Chip label="Eligible" size="small" color="primary" />
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}

            {/* TAB 1: Parallel Allotment of Re-evaluators 1 & 2 */}
            {activeTab === 1 && (
              <Box sx={{ p: 2.5 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    Select applied students to assign Re-evaluator 1 &amp; 2 concurrently:
                  </Typography>
                  <Button
                    variant="contained"
                    color="secondary"
                    startIcon={<GroupAdd />}
                    disabled={!selectedRevals.length}
                    onClick={() => setAllot12Open(true)}
                    size="small"
                  >
                    Allot Re-evaluator 1 &amp; 2 ({selectedRevals.length})
                  </Button>
                </Box>

                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: "#f3f4f6" }}>
                        <TableCell padding="checkbox">
                          <Checkbox
                            size="small"
                            indeterminate={
                              selectedRevals.length > 0 &&
                              selectedRevals.length < pending12Allotment.length
                            }
                            checked={
                              pending12Allotment.length > 0 &&
                              selectedRevals.length === pending12Allotment.length
                            }
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedRevals(pending12Allotment.map((r) => r.regno));
                              } else {
                                setSelectedRevals([]);
                              }
                            }}
                          />
                        </TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Reg No</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Student Name</TableCell>
                        <TableCell sx={{ fontWeight: 700, textAlign: "center" }}>V1 Marks (M0)</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Re-evaluator 1 (V2)</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Re-evaluator 2 (V3)</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Allotment Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {pending12Allotment.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} sx={{ textAlign: "center", py: 4, color: "#666" }}>
                            All applied students have been assigned to Re-evaluators 1 &amp; 2.
                          </TableCell>
                        </TableRow>
                      ) : (
                        pending12Allotment.map((r) => {
                          const isSelected = selectedRevals.includes(r.regno);
                          return (
                            <TableRow key={r._id} hover selected={isSelected}>
                              <TableCell padding="checkbox">
                                <Checkbox
                                  size="small"
                                  checked={isSelected}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedRevals([...selectedRevals, r.regno]);
                                    } else {
                                      setSelectedRevals(selectedRevals.filter((id) => id !== r.regno));
                                    }
                                  }}
                                />
                              </TableCell>
                              <TableCell sx={{ fontWeight: 700 }}>{r.regno}</TableCell>
                              <TableCell>{r.student}</TableCell>
                              <TableCell sx={{ textAlign: "center", fontWeight: 700 }}>{r.originalmarks}</TableCell>
                              <TableCell>{r.reevaluator1?.name || "Unassigned"}</TableCell>
                              <TableCell>{r.reevaluator2?.name || "Unassigned"}</TableCell>
                              <TableCell>
                                <Chip label={r.status} size="small" color="warning" />
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>

                {/* Quick Link Banner to Percentage Variation Chart */}
                <Box
                  sx={{
                    mt: 3,
                    p: 2,
                    borderRadius: 1.5,
                    bgcolor: "#eff6ff",
                    border: "1px solid #bfdbfe",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: 1.5
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    <Box sx={{ p: 1, borderRadius: 1, bgcolor: "#dbeafe", color: "#1d4ed8", display: "flex" }}>
                      <TrendingUp />
                    </Box>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#1e3a8a" }}>
                        Percentage Variation Analysis (V2 &amp; V3 vs Original V1)
                      </Typography>
                      <Typography variant="caption" sx={{ color: "#3b82f6" }}>
                        {variationData.length > 0
                          ? `${variationData.length} evaluated script(s) ready for threshold analysis and statutory referral review.`
                          : "Once Re-evaluators 1 & 2 enter evaluation marks, % variation analysis is charted automatically."}
                      </Typography>
                    </Box>
                  </Box>
                  <Button
                    variant="contained"
                    size="small"
                    color="primary"
                    onClick={() => setActiveTab(2)}
                    endIcon={<ArrowForward />}
                  >
                    View Variation Chart
                  </Button>
                </Box>
              </Box>
            )}

            {/* TAB 2: Percentage Variation Chart (Avg(V2, V3) vs Original V1) */}
            {activeTab === 2 && (
              <Box sx={{ p: 2.5 }}>
                <Stack spacing={2.5}>
                  {/* KPI Summary Cards */}
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6} md={2.4}>
                      <Paper
                        elevation={0}
                        sx={{
                          p: 2,
                          bgcolor: "#f8fafc",
                          border: "1px solid #e2e8f0",
                          borderRadius: 1.5,
                          height: "100%"
                        }}
                      >
                        <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>
                          Total Evaluated
                        </Typography>
                        <Typography variant="h4" sx={{ fontWeight: 800, color: "#0f172a", mt: 0.5 }}>
                          {variationSummary.total}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Both V2 &amp; V3 completed
                        </Typography>
                      </Paper>
                    </Grid>

                    <Grid item xs={12} sm={6} md={2.4}>
                      <Paper
                        elevation={0}
                        sx={{
                          p: 2,
                          bgcolor: "#eff6ff",
                          border: "1px solid #bfdbfe",
                          borderRadius: 1.5,
                          height: "100%"
                        }}
                      >
                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <Typography variant="caption" sx={{ color: "#1e40af", fontWeight: 700, textTransform: "uppercase" }}>
                            0% - 10% Increase
                          </Typography>
                          <Chip label="No Change" size="small" sx={{ height: 18, fontSize: 10, bgcolor: "#dbeafe", color: "#1e40af", fontWeight: 700 }} />
                        </Box>
                        <Typography variant="h4" sx={{ fontWeight: 800, color: "#1d4ed8", mt: 0.5 }}>
                          {variationSummary.zeroToTen}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "#3b82f6" }}>
                          {variationSummary.total > 0
                            ? `${((variationSummary.zeroToTen / variationSummary.total) * 100).toFixed(1)}% of scripts`
                            : "Original maintained"}
                        </Typography>
                      </Paper>
                    </Grid>

                    <Grid item xs={12} sm={6} md={2.4}>
                      <Paper
                        elevation={0}
                        sx={{
                          p: 2,
                          bgcolor: "#f0fdf4",
                          border: "1px solid #bbf7d0",
                          borderRadius: 1.5,
                          height: "100%"
                        }}
                      >
                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <Typography variant="caption" sx={{ color: "#166534", fontWeight: 700, textTransform: "uppercase" }}>
                            10% - 20% Increase
                          </Typography>
                          <Chip label="Avg Awarded" size="small" sx={{ height: 18, fontSize: 10, bgcolor: "#dcfce7", color: "#15803d", fontWeight: 700 }} />
                        </Box>
                        <Typography variant="h4" sx={{ fontWeight: 800, color: "#15803d", mt: 0.5 }}>
                          {variationSummary.tenToTwenty}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "#16a34a" }}>
                          {variationSummary.total > 0
                            ? `${((variationSummary.tenToTwenty / variationSummary.total) * 100).toFixed(1)}% of scripts`
                            : "Revised to Avg(V2, V3)"}
                        </Typography>
                      </Paper>
                    </Grid>

                    <Grid item xs={12} sm={6} md={2.4}>
                      <Paper
                        elevation={0}
                        sx={{
                          p: 2,
                          bgcolor: "#fef2f2",
                          border: "1px solid #fecaca",
                          borderRadius: 1.5,
                          height: "100%"
                        }}
                      >
                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <Typography variant="caption" sx={{ color: "#991b1b", fontWeight: 700, textTransform: "uppercase" }}>
                            &gt; 20% Increase
                          </Typography>
                          <Chip label="V4 Referral" size="small" sx={{ height: 18, fontSize: 10, bgcolor: "#fee2e2", color: "#b91c1c", fontWeight: 700 }} />
                        </Box>
                        <Typography variant="h4" sx={{ fontWeight: 800, color: "#dc2626", mt: 0.5 }}>
                          {variationSummary.aboveTwenty}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "#ef4444" }}>
                          {variationSummary.total > 0
                            ? `${((variationSummary.aboveTwenty / variationSummary.total) * 100).toFixed(1)}% of scripts`
                            : "Referred to Reval 3"}
                        </Typography>
                      </Paper>
                    </Grid>

                    <Grid item xs={12} sm={6} md={2.4}>
                      <Paper
                        elevation={0}
                        sx={{
                          p: 2,
                          bgcolor: "#faf5ff",
                          border: "1px solid #e9d5ff",
                          borderRadius: 1.5,
                          height: "100%"
                        }}
                      >
                        <Typography variant="caption" sx={{ color: "#6b21a8", fontWeight: 700, textTransform: "uppercase" }}>
                          Mean % Variation
                        </Typography>
                        <Typography variant="h4" sx={{ fontWeight: 800, color: variationSummary.avgPct >= 0 ? "#7e22ce" : "#dc2626", mt: 0.5 }}>
                          {variationSummary.avgPct > 0 ? `+${variationSummary.avgPct}%` : `${variationSummary.avgPct}%`}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "#9333ea" }}>
                          Avg shift across cohort
                        </Typography>
                      </Paper>
                    </Grid>
                  </Grid>

                  {/* Chart Card */}
                  <Card variant="outlined" sx={{ borderRadius: 1.5 }}>
                    <CardContent sx={{ p: 2.5 }}>
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2, flexWrap: "wrap", gap: 1 }}>
                        <Box>
                          <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "#1e293b", display: "flex", alignItems: "center", gap: 1 }}>
                            <TrendingUp color="primary" />
                            {chartViewMode === "script"
                              ? "Script-wise Percentage Variation (Avg(V2, V3) vs Original V1)"
                              : "Threshold Bracket Distribution"}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {chartViewMode === "script"
                              ? "Dashed lines represent statutory decision cutoffs: 10% (No Change upper limit) and 20% (Referral to Re-evaluator 3 threshold)."
                              : "Distribution of evaluated scripts across statutory decision categories."}
                          </Typography>
                        </Box>
                        <Stack direction="row" spacing={1}>
                          <Button
                            size="small"
                            variant={chartViewMode === "script" ? "contained" : "outlined"}
                            startIcon={<BarChartIcon />}
                            onClick={() => setChartViewMode("script")}
                            sx={{ textTransform: "none", fontSize: "12px" }}
                          >
                            Script-wise Bar Chart
                          </Button>
                          <Button
                            size="small"
                            variant={chartViewMode === "distribution" ? "contained" : "outlined"}
                            startIcon={<PieChartIcon />}
                            onClick={() => setChartViewMode("distribution")}
                            sx={{ textTransform: "none", fontSize: "12px" }}
                          >
                            Threshold Distribution
                          </Button>
                        </Stack>
                      </Box>

                      {/* Empty State when no evaluated scripts */}
                      {variationData.length === 0 ? (
                        <Box
                          sx={{
                            p: 5,
                            textAlign: "center",
                            bgcolor: "#f8fafc",
                            borderRadius: 1.5,
                            border: "1px dashed #cbd5e1"
                          }}
                        >
                          <TrendingUp sx={{ fontSize: 48, color: "#94a3b8", mb: 1 }} />
                          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "#334155" }}>
                            No Completed V2 &amp; V3 Evaluations Yet
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 620, mx: "auto", mt: 0.5 }}>
                            Answer scripts allotted to Re-evaluators 1 and 2 must be evaluated via On-Screen Marking. Once both evaluators complete marking, percentage variations and statutory decision recommendations will be automatically visualized here.
                          </Typography>
                          <Button
                            variant="outlined"
                            size="small"
                            sx={{ mt: 2, textTransform: "none" }}
                            onClick={() => setActiveTab(1)}
                          >
                            Go to Parallel Allotment Tab
                          </Button>
                        </Box>
                      ) : chartViewMode === "script" ? (
                        <Box sx={{ width: "100%", height: 380, pt: 1 }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={variationData} margin={{ top: 20, right: 30, left: 10, bottom: 40 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                              <XAxis
                                dataKey="regno"
                                angle={-35}
                                textAnchor="end"
                                interval={0}
                                height={50}
                                tick={{ fontSize: 11, fill: "#475569" }}
                              />
                              <YAxis
                                unit="%"
                                tick={{ fontSize: 12, fill: "#475569" }}
                                domain={[(dataMin) => Math.min(Math.floor(dataMin - 5), -5), (dataMax) => Math.max(Math.ceil(dataMax + 5), 25)]}
                              />
                              <RechartsTooltip
                                content={({ active, payload }) => {
                                  if (active && payload && payload.length) {
                                    const d = payload[0].payload;
                                    return (
                                      <Paper elevation={3} sx={{ p: 1.5, bgcolor: "#ffffff", border: "1px solid #e2e8f0", minWidth: 230 }}>
                                        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#0f172a" }}>
                                          Reg No: {d.regno}
                                        </Typography>
                                        <Typography variant="caption" sx={{ color: "#64748b", display: "block" }}>
                                          {d.student}
                                        </Typography>
                                        <Divider sx={{ my: 0.8 }} />
                                        <Box sx={{ display: "flex", justifyContent: "space-between", py: 0.2 }}>
                                          <Typography variant="caption">Original (M0):</Typography>
                                          <Typography variant="caption" sx={{ fontWeight: 700 }}>{d.m0}</Typography>
                                        </Box>
                                        <Box sx={{ display: "flex", justifyContent: "space-between", py: 0.2 }}>
                                          <Typography variant="caption">Reval 1 (V2) / Reval 2 (V3):</Typography>
                                          <Typography variant="caption" sx={{ fontWeight: 700 }}>{d.m1} / {d.m2}</Typography>
                                        </Box>
                                        <Box sx={{ display: "flex", justifyContent: "space-between", py: 0.2 }}>
                                          <Typography variant="caption">Avg(V2, V3):</Typography>
                                          <Typography variant="caption" sx={{ fontWeight: 700 }}>{d.avg12} ({d.marksDiff > 0 ? `+${d.marksDiff}` : d.marksDiff} marks)</Typography>
                                        </Box>
                                        <Divider sx={{ my: 0.8 }} />
                                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                          <Typography variant="body2" sx={{ fontWeight: 800 }}>% Variation:</Typography>
                                          <Typography variant="body2" sx={{ fontWeight: 800, color: d.bracketColor }}>
                                            {d.pctVariation > 0 ? `+${d.pctVariation}%` : `${d.pctVariation}%`}
                                          </Typography>
                                        </Box>
                                        <Typography variant="caption" sx={{ display: "block", color: "#475569", mt: 0.5, fontStyle: "italic" }}>
                                          {d.action}
                                        </Typography>
                                      </Paper>
                                    );
                                  }
                                  return null;
                                }}
                              />
                              <ReferenceLine
                                y={10}
                                stroke="#f59e0b"
                                strokeDasharray="4 4"
                                strokeWidth={2}
                                label={{ value: "10% (No Change Limit)", fill: "#d97706", fontSize: 11, position: "top" }}
                              />
                              <ReferenceLine
                                y={20}
                                stroke="#dc2626"
                                strokeDasharray="4 4"
                                strokeWidth={2}
                                label={{ value: "20% (Referred to Reval 3)", fill: "#dc2626", fontSize: 11, position: "top" }}
                              />
                              <Bar dataKey="pctVariation" name="% Variation" radius={[4, 4, 0, 0]}>
                                {variationData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.bracketColor} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </Box>
                      ) : (
                        <Box sx={{ width: "100%", height: 340, pt: 1 }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={distributionChartData} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                              <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#475569" }} />
                              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#475569" }} />
                              <RechartsTooltip
                                formatter={(value) => [`${value} Scripts`, "Count"]}
                              />
                              <Bar dataKey="count" name="Scripts Count" radius={[4, 4, 0, 0]}>
                                {distributionChartData.map((entry, index) => (
                                  <Cell key={`dist-cell-${index}`} fill={entry.fill} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </Box>
                      )}

                      {/* Legend / Guidance Bar */}
                      <Box sx={{ mt: 2, pt: 1.5, borderTop: "1px solid #f1f5f9", display: "flex", flexWrap: "wrap", gap: 3, alignItems: "center" }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <Box sx={{ width: 12, height: 12, bgcolor: "#64748b", borderRadius: "2px" }} />
                          <Typography variant="caption" sx={{ color: "#475569" }}>
                            &lt; 0% (Marks Decreased - Original Kept)
                          </Typography>
                        </Box>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <Box sx={{ width: 12, height: 12, bgcolor: "#3b82f6", borderRadius: "2px" }} />
                          <Typography variant="caption" sx={{ color: "#475569" }}>
                            0% - 10% (No Change - Original Kept)
                          </Typography>
                        </Box>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <Box sx={{ width: 12, height: 12, bgcolor: "#16a34a", borderRadius: "2px" }} />
                          <Typography variant="caption" sx={{ color: "#475569" }}>
                            10% - 20% (Award Avg(V2, V3))
                          </Typography>
                        </Box>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <Box sx={{ width: 12, height: 12, bgcolor: "#dc2626", borderRadius: "2px" }} />
                          <Typography variant="caption" sx={{ color: "#475569", fontWeight: 700 }}>
                            &gt; 20% (Refer to Re-evaluator 3)
                          </Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>

                  {/* Filterable Data Audit Table */}
                  <Card variant="outlined" sx={{ borderRadius: 1.5 }}>
                    <CardContent sx={{ p: 2.5 }}>
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2, flexWrap: "wrap", gap: 1.5 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                          Evaluated Scripts Variation Records ({filteredVariationData.length}):
                        </Typography>
                        <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
                          <TextField
                            size="small"
                            placeholder="Search student or Reg No..."
                            value={variationSearch}
                            onChange={(e) => setVariationSearch(e.target.value)}
                            InputProps={{
                              startAdornment: (
                                <InputAdornment position="start">
                                  <Search fontSize="small" sx={{ color: "#94a3b8" }} />
                                </InputAdornment>
                              )
                            }}
                            sx={{ width: 220 }}
                          />
                          <TextField
                            select
                            size="small"
                            value={variationBracketFilter}
                            onChange={(e) => setVariationBracketFilter(e.target.value)}
                            sx={{ width: 190 }}
                          >
                            <MenuItem value="all">All Decision Brackets</MenuItem>
                            <MenuItem value="negative">&lt; 0% (Marks Reduced)</MenuItem>
                            <MenuItem value="zeroToTen">0% - 10% (No Change)</MenuItem>
                            <MenuItem value="tenToTwenty">10% - 20% (Avg Awarded)</MenuItem>
                            <MenuItem value="aboveTwenty">&gt; 20% (Referred V4)</MenuItem>
                          </TextField>
                        </Stack>
                      </Box>

                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow sx={{ bgcolor: "#f8fafc" }}>
                              <TableCell sx={{ fontWeight: 700 }}>Reg No</TableCell>
                              <TableCell sx={{ fontWeight: 700 }}>Student Name</TableCell>
                              <TableCell sx={{ fontWeight: 700, textAlign: "center" }}>V1 Marks (M0)</TableCell>
                              <TableCell sx={{ fontWeight: 700, textAlign: "center" }}>Reval 1 (M1)</TableCell>
                              <TableCell sx={{ fontWeight: 700, textAlign: "center" }}>Reval 2 (M2)</TableCell>
                              <TableCell sx={{ fontWeight: 700, textAlign: "center" }}>Avg (M1, M2)</TableCell>
                              <TableCell sx={{ fontWeight: 700, textAlign: "center" }}>Diff</TableCell>
                              <TableCell sx={{ fontWeight: 700, textAlign: "center" }}>% Variation</TableCell>
                              <TableCell sx={{ fontWeight: 700 }}>Statutory Action</TableCell>
                              <TableCell sx={{ fontWeight: 700, textAlign: "center" }}>Actions</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {filteredVariationData.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={10} sx={{ textAlign: "center", py: 3, color: "#666" }}>
                                  No records found matching current search and bracket filters.
                                </TableCell>
                              </TableRow>
                            ) : (
                              filteredVariationData.map((d) => (
                                <TableRow key={d.id} hover>
                                  <TableCell sx={{ fontWeight: 700 }}>{d.regno}</TableCell>
                                  <TableCell>{d.student}</TableCell>
                                  <TableCell sx={{ textAlign: "center", fontWeight: 700 }}>{d.m0}</TableCell>
                                  <TableCell sx={{ textAlign: "center" }}>{d.m1}</TableCell>
                                  <TableCell sx={{ textAlign: "center" }}>{d.m2}</TableCell>
                                  <TableCell sx={{ textAlign: "center", fontWeight: 700 }}>{d.avg12}</TableCell>
                                  <TableCell sx={{ textAlign: "center" }}>
                                    <Typography
                                      variant="body2"
                                      sx={{
                                        fontWeight: 700,
                                        color: d.marksDiff > 0 ? "success.main" : d.marksDiff < 0 ? "text.secondary" : "text.primary"
                                      }}
                                    >
                                      {d.marksDiff > 0 ? `+${d.marksDiff}` : d.marksDiff}
                                    </Typography>
                                  </TableCell>
                                  <TableCell sx={{ textAlign: "center" }}>
                                    <Chip
                                      label={`${d.pctVariation > 0 ? "+" : ""}${d.pctVariation}%`}
                                      size="small"
                                      sx={{
                                        fontWeight: 800,
                                        bgcolor: `${d.bracketColor}15`,
                                        color: d.bracketColor,
                                        border: `1px solid ${d.bracketColor}50`
                                      }}
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <Typography variant="body2" sx={{ fontSize: "12.5px", fontWeight: 600, color: d.bracketColor }}>
                                      {d.action}
                                    </Typography>
                                  </TableCell>
                                  <TableCell sx={{ textAlign: "center" }}>
                                    <Stack direction="row" spacing={0.5} justifyContent="center">
                                      <Button
                                        size="small"
                                        variant="outlined"
                                        color="primary"
                                        sx={{ fontSize: "10.5px", py: 0.2, px: 0.8, textTransform: "none", minWidth: 60 }}
                                        onClick={() => window.open(`/conduct-exam-2-reevaluation-on-screen-marking?examcode=${d.examcode}&coursecode=${d.coursecode}&regno=${d.regno}&valuationtype=V2`, "_blank")}
                                      >
                                        View V2
                                      </Button>
                                      <Button
                                        size="small"
                                        variant="outlined"
                                        color="secondary"
                                        sx={{ fontSize: "10.5px", py: 0.2, px: 0.8, textTransform: "none", minWidth: 60 }}
                                        onClick={() => window.open(`/conduct-exam-2-reevaluation-on-screen-marking?examcode=${d.examcode}&coursecode=${d.coursecode}&regno=${d.regno}&valuationtype=V3`, "_blank")}
                                      >
                                        View V3
                                      </Button>
                                    </Stack>
                                  </TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </CardContent>
                  </Card>
                </Stack>
              </Box>
            )}

            {/* TAB 3: Referred to Re-evaluator 3 (>20% Increase) */}
            {activeTab === 3 && (
              <Box sx={{ p: 2.5 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "error.main" }}>
                      Papers with &gt;20% Increase Referred to 3rd Re-evaluator:
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Average of Re-evaluator 1 &amp; 2 exceeded 20% increase. Allot Re-evaluator 3 to calculate final average across all 3 evaluators.
                    </Typography>
                  </Box>
                  <Button
                    variant="contained"
                    color="error"
                    startIcon={<GroupAdd />}
                    disabled={!selectedRevals.length}
                    onClick={() => setAllot3Open(true)}
                    size="small"
                  >
                    Allot Re-evaluator 3 ({selectedRevals.length})
                  </Button>
                </Box>

                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: "#fef2f2" }}>
                        <TableCell padding="checkbox">
                          <Checkbox
                            size="small"
                            indeterminate={
                              selectedRevals.length > 0 &&
                              selectedRevals.length < referredTo3List.length
                            }
                            checked={
                              referredTo3List.length > 0 &&
                              selectedRevals.length === referredTo3List.length
                            }
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedRevals(referredTo3List.map((r) => r.regno));
                              } else {
                                setSelectedRevals([]);
                              }
                            }}
                          />
                        </TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Reg No</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Student Name</TableCell>
                        <TableCell sx={{ fontWeight: 700, textAlign: "center" }}>V1 Marks</TableCell>
                        <TableCell sx={{ fontWeight: 700, textAlign: "center" }}>Reval 1 (M1)</TableCell>
                        <TableCell sx={{ fontWeight: 700, textAlign: "center" }}>Reval 2 (M2)</TableCell>
                        <TableCell sx={{ fontWeight: 700, textAlign: "center" }}>Avg (M1, M2)</TableCell>
                        <TableCell sx={{ fontWeight: 700, textAlign: "center" }}>% Increase</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Re-evaluator 3</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {referredTo3List.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={10} sx={{ textAlign: "center", py: 4, color: "#666" }}>
                            No papers currently referred to Re-evaluator 3.
                          </TableCell>
                        </TableRow>
                      ) : (
                        referredTo3List.map((r) => {
                          const isSelected = selectedRevals.includes(r.regno);
                          return (
                            <TableRow key={r._id} hover selected={isSelected}>
                              <TableCell padding="checkbox">
                                <Checkbox
                                  size="small"
                                  checked={isSelected}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedRevals([...selectedRevals, r.regno]);
                                    } else {
                                      setSelectedRevals(selectedRevals.filter((id) => id !== r.regno));
                                    }
                                  }}
                                />
                              </TableCell>
                              <TableCell sx={{ fontWeight: 700 }}>{r.regno}</TableCell>
                              <TableCell>{r.student}</TableCell>
                              <TableCell sx={{ textAlign: "center", fontWeight: 700 }}>{r.originalmarks}</TableCell>
                              <TableCell sx={{ textAlign: "center" }}>{r.reevaluator1?.marks ?? "-"}</TableCell>
                              <TableCell sx={{ textAlign: "center" }}>{r.reevaluator2?.marks ?? "-"}</TableCell>
                              <TableCell sx={{ textAlign: "center", fontWeight: 700 }}>{r.reval12Avg ?? "-"}</TableCell>
                              <TableCell sx={{ textAlign: "center", fontWeight: 800, color: "error.main" }}>
                                +{r.percentageChange}%
                              </TableCell>
                              <TableCell>{r.reevaluator3?.name || "Awaiting Allotment"}</TableCell>
                              <TableCell>
                                <Chip label={r.status} size="small" color="error" />
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}

            {/* TAB 4: Live Tracking & Final Decisions */}
            {activeTab === 4 && (
              <Box sx={{ p: 2.5 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
                  Full Re-evaluation Pipeline &amp; Decision Audit:
                </Typography>

                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: "#f8fafc" }}>
                        <TableCell sx={{ fontWeight: 700 }}>Reg No</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Student Name</TableCell>
                        <TableCell sx={{ fontWeight: 700, textAlign: "center" }}>Original (M0)</TableCell>
                        <TableCell sx={{ fontWeight: 700, textAlign: "center" }}>Reval 1 (M1)</TableCell>
                        <TableCell sx={{ fontWeight: 700, textAlign: "center" }}>Reval 2 (M2)</TableCell>
                        <TableCell sx={{ fontWeight: 700, textAlign: "center" }}>Avg (M1, M2)</TableCell>
                        <TableCell sx={{ fontWeight: 700, textAlign: "center" }}>% Change</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Decision Rule</TableCell>
                        <TableCell sx={{ fontWeight: 700, textAlign: "center" }}>Reval 3 (M3)</TableCell>
                        <TableCell sx={{ fontWeight: 700, textAlign: "center" }}>Final Marks</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {revaluations.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={11} sx={{ textAlign: "center", py: 4, color: "#666" }}>
                            No re-evaluation applications found for this course.
                          </TableCell>
                        </TableRow>
                      ) : (
                        revaluations.map((r) => {
                          let decisionChip = <Chip label="In Progress" size="small" variant="outlined" />;
                          if (r.finaldecision?.includes("NoChange")) {
                            decisionChip = <Chip label="0-10%: No Change" size="small" color="default" sx={{ fontWeight: 700 }} />;
                          } else if (r.finaldecision?.includes("Avg12")) {
                            decisionChip = <Chip label="10-20%: Avg(1,2)" size="small" color="success" sx={{ fontWeight: 700 }} />;
                          } else if (r.finaldecision?.includes("Avg123")) {
                            decisionChip = <Chip label=">20%: Avg(1,2,3)" size="small" color="primary" sx={{ fontWeight: 700 }} />;
                          } else if (r.status === "ReferredTo_3" || r.status === "UnderReval_3") {
                            decisionChip = <Chip label=">20%: Referred to 3" size="small" color="error" sx={{ fontWeight: 700 }} />;
                          }

                          return (
                            <TableRow key={r._id} hover>
                              <TableCell sx={{ fontWeight: 700 }}>{r.regno}</TableCell>
                              <TableCell>{r.student}</TableCell>
                              <TableCell sx={{ textAlign: "center", fontWeight: 700 }}>{r.originalmarks}</TableCell>
                              <TableCell sx={{ textAlign: "center" }}>
                                <Stack spacing={0.5} alignItems="center" justifyContent="center">
                                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                    {r.reevaluator1?.status === "Evaluated" ? (
                                      <span style={{ color: "#16a34a" }}>{r.reevaluator1.marks}</span>
                                    ) : r.reevaluator1?.email ? (
                                      <Chip label="Pending" size="small" variant="outlined" color="warning" sx={{ height: 20, fontSize: "0.7rem" }} />
                                    ) : (
                                      <Typography variant="caption" color="text.secondary">Unassigned</Typography>
                                    )}
                                  </Typography>
                                  {r.reevaluator1?.email && (
                                    <Button
                                      size="small"
                                      variant="outlined"
                                      color="primary"
                                      sx={{ fontSize: "10.5px", py: 0.1, px: 0.8, textTransform: "none", minWidth: 65, height: 22 }}
                                      onClick={() => window.open(`/conduct-exam-2-reevaluation-on-screen-marking?examcode=${r.examcode}&coursecode=${r.coursecode}&regno=${r.regno}&valuationtype=V2`, "_blank")}
                                    >
                                      {r.reevaluator1?.status === "Evaluated" ? "Review V2" : "Mark V2"}
                                    </Button>
                                  )}
                                </Stack>
                              </TableCell>
                              <TableCell sx={{ textAlign: "center" }}>
                                <Stack spacing={0.5} alignItems="center" justifyContent="center">
                                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                    {r.reevaluator2?.status === "Evaluated" ? (
                                      <span style={{ color: "#16a34a" }}>{r.reevaluator2.marks}</span>
                                    ) : r.reevaluator2?.email ? (
                                      <Chip label="Pending" size="small" variant="outlined" color="warning" sx={{ height: 20, fontSize: "0.7rem" }} />
                                    ) : (
                                      <Typography variant="caption" color="text.secondary">Unassigned</Typography>
                                    )}
                                  </Typography>
                                  {r.reevaluator2?.email && (
                                    <Button
                                      size="small"
                                      variant="outlined"
                                      color="secondary"
                                      sx={{ fontSize: "10.5px", py: 0.1, px: 0.8, textTransform: "none", minWidth: 65, height: 22 }}
                                      onClick={() => window.open(`/conduct-exam-2-reevaluation-on-screen-marking?examcode=${r.examcode}&coursecode=${r.coursecode}&regno=${r.regno}&valuationtype=V3`, "_blank")}
                                    >
                                      {r.reevaluator2?.status === "Evaluated" ? "Review V3" : "Mark V3"}
                                    </Button>
                                  )}
                                </Stack>
                              </TableCell>
                              <TableCell sx={{ textAlign: "center", fontWeight: 700 }}>
                                {r.reval12Avg !== null ? r.reval12Avg : "-"}
                              </TableCell>
                              <TableCell sx={{ textAlign: "center", fontWeight: 700 }}>
                                {r.percentageChange !== null ? `${r.percentageChange > 0 ? "+" : ""}${r.percentageChange}%` : "-"}
                              </TableCell>
                              <TableCell>{decisionChip}</TableCell>
                              <TableCell sx={{ textAlign: "center" }}>
                                <Stack spacing={0.5} alignItems="center" justifyContent="center">
                                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                    {r.reevaluator3?.status === "Evaluated" ? (
                                      <span style={{ color: "#16a34a" }}>{r.reevaluator3.marks}</span>
                                    ) : r.reevaluator3?.email ? (
                                      <Chip label="Pending" size="small" variant="outlined" color="warning" sx={{ height: 20, fontSize: "0.7rem" }} />
                                    ) : (
                                      "-"
                                    )}
                                  </Typography>
                                  {r.reevaluator3?.email && (
                                    <Button
                                      size="small"
                                      variant="outlined"
                                      color="error"
                                      sx={{ fontSize: "10.5px", py: 0.1, px: 0.8, textTransform: "none", minWidth: 65, height: 22 }}
                                      onClick={() => window.open(`/conduct-exam-2-reevaluation-on-screen-marking?examcode=${r.examcode}&coursecode=${r.coursecode}&regno=${r.regno}&valuationtype=V4`, "_blank")}
                                    >
                                      {r.reevaluator3?.status === "Evaluated" ? "Review V4" : "Mark V4"}
                                    </Button>
                                  )}
                                </Stack>
                              </TableCell>
                              <TableCell sx={{ textAlign: "center", fontWeight: 800, color: "success.dark" }}>
                                {r.finalrevalmarks !== null ? r.finalrevalmarks : r.originalmarks}
                              </TableCell>
                              <TableCell>
                                <Chip
                                  label={r.status}
                                  size="small"
                                  color={r.status === "Completed" ? "success" : "primary"}
                                />
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}
          </Paper>
        </Stack>
      </Box>

      {/* DIALOG 1: Allot Re-evaluator 1 & 2 in Parallel */}
      <Dialog open={allot12Open} onClose={() => setAllot12Open(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>
          Allot Re-evaluator 1 &amp; 2 (Parallel Allotment)
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Selected <b>{selectedRevals.length}</b> student script(s). The answer scripts will be allotted in parallel. Re-evaluators will evaluate fresh digital copies without viewing earlier marks.
          </Typography>

          <Stack spacing={2.5}>
            <Autocomplete
              options={options.evaluators}
              getOptionLabel={(option) =>
                typeof option === "string"
                  ? option
                  : `${option.name} (${option.evaluatorid}) - ${option.institution}`
              }
              value={options.evaluators.find((e) => e.email === selectedEval1) || null}
              onChange={(_, val) => setSelectedEval1(val ? val.email : "")}
              getOptionDisabled={(option) => option.email === selectedEval2}
              renderInput={(params) => (
                <TextField
                  {...params}
                  size="small"
                  label="Select Re-evaluator 1 (V2)"
                  placeholder="Search evaluator by name, department..."
                />
              )}
            />

            <Autocomplete
              options={options.evaluators}
              getOptionLabel={(option) =>
                typeof option === "string"
                  ? option
                  : `${option.name} (${option.evaluatorid}) - ${option.institution}`
              }
              value={options.evaluators.find((e) => e.email === selectedEval2) || null}
              onChange={(_, val) => setSelectedEval2(val ? val.email : "")}
              getOptionDisabled={(option) => option.email === selectedEval1}
              renderInput={(params) => (
                <TextField
                  {...params}
                  size="small"
                  label="Select Re-evaluator 2 (V3)"
                  placeholder="Search evaluator by name, department..."
                />
              )}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setAllot12Open(false)}>Cancel</Button>
          <Button variant="contained" color="secondary" onClick={handleAllot12} disabled={loading}>
            {loading ? <CircularProgress size={20} color="inherit" /> : "Confirm Parallel Allotment"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* DIALOG 2: Allot Re-evaluator 3 (>20% Increase) */}
      <Dialog open={allot3Open} onClose={() => setAllot3Open(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, color: "error.main" }}>
          Allot Re-evaluator 3 (Valuation 4)
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Selected <b>{selectedRevals.length}</b> script(s) where average marks from Re-evaluators 1 &amp; 2 increased by &gt;20%. Assign Re-evaluator 3 to calculate final average across all 3 evaluators.
          </Typography>

          <Autocomplete
            options={options.evaluators}
            getOptionLabel={(option) =>
              typeof option === "string"
                ? option
                : `${option.name} (${option.evaluatorid}) - ${option.institution}`
            }
            value={options.evaluators.find((e) => e.email === selectedEval3) || null}
            onChange={(_, val) => setSelectedEval3(val ? val.email : "")}
            renderInput={(params) => (
              <TextField
                {...params}
                size="small"
                label="Select Re-evaluator 3 (V4)"
                placeholder="Search evaluator by name, department..."
              />
            )}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setAllot3Open(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleAllot3} disabled={loading}>
            {loading ? <CircularProgress size={20} color="inherit" /> : "Confirm Allotment of Re-evaluator 3"}
          </Button>
        </DialogActions>
      </Dialog>
    </MenuPageShell>
  );
}
