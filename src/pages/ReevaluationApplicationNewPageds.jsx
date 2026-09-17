import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  TextField,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  MenuItem,
  Alert,
  Chip,
  Checkbox,
  TableContainer,
  Paper,
} from "@mui/material";
import ep1 from "../api/ep1";
import global1 from "./global1";
import { ArrowBack } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import MenuPageShell from "./MenuPageShell";

function ReevaluationApplicationNewPageds() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useState({
    regno: global1.regno || "",
    colid: Number(global1.colid) || "",
    program: global1.program || global1.programcode || "",
    branch: global1.branch || global1.department || "",
    regulation: global1.regulation || "",
    semester: global1.semester || "1",
    year: global1.academicyear ? global1.academicyear.split("-")[0] : (global1.year || "2026"),
  });
  const [allPapers, setAllPapers] = useState([]);
  const [selectedPapers, setSelectedPapers] = useState([]);
  const [myApplications, setMyApplications] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [filterOptions, setFilterOptions] = useState({
    programs: [global1.program, global1.programcode].filter(Boolean),
    branches: [global1.branch, global1.department, "General"].filter(Boolean),
    regulations: [global1.regulation, "R2020"].filter(Boolean),
    semesters: [global1.semester || "1"].filter(Boolean),
    years: [global1.academicyear ? global1.academicyear.split("-")[0] : "2026"],
  });

  useEffect(() => {
    fetchFilterOptions();
    fetchMyApplications();
    if (global1.regno) {
      handleSearchPapers({
        regno: global1.regno,
        colid: Number(global1.colid),
        program: global1.program || global1.programcode || "",
        semester: global1.semester || "1",
        year: global1.academicyear ? global1.academicyear.split("-")[0] : "2026",
      });
    }
  }, []);

  const fetchFilterOptions = async () => {
    try {
      const res = await ep1.get("/api/v2/reevaluationnew/getfilteroptionsforstudentds1", {
        params: { colid: Number(global1.colid), regno: global1.regno },
      });
      const enrolledPrograms = [global1.program, global1.programcode].filter(Boolean);
      const backendProgs = (res.data.programs || []).filter(Boolean);

      // In student login, ONLY display the program(s) in which this student is enrolled
      let finalPrograms = [];
      if (enrolledPrograms.length > 0) {
        const matched = backendProgs.filter(p => enrolledPrograms.some(ep => String(ep).toLowerCase() === String(p).toLowerCase()));
        finalPrograms = matched.length > 0 ? matched : enrolledPrograms;
      } else {
        finalPrograms = backendProgs;
      }

      setFilterOptions({
        programs: [...new Set(finalPrograms)],
        branches: res.data.branches?.length ? res.data.branches : [global1.branch || "General"].filter(Boolean),
        regulations: res.data.regulations?.length ? res.data.regulations : [global1.regulation || "R2020"].filter(Boolean),
        semesters: res.data.semesters?.length ? res.data.semesters : [global1.semester || "1"].filter(Boolean),
        years: res.data.years?.length ? res.data.years : ["2026"],
      });

      setSearchParams(prev => ({
        ...prev,
        program: prev.program || finalPrograms[0] || "",
        regulation: prev.regulation || res.data.regulations?.[0] || global1.regulation || "R2020",
        semester: prev.semester || res.data.semesters?.[0] || global1.semester || "1",
        year: prev.year || res.data.years?.[0] || "2026",
        branch: prev.branch || res.data.branches?.[0] || global1.branch || "General"
      }));
    } catch (err) {
      console.error(err);
    }
  };

  const handleChange = (e) => {
    setSearchParams({ ...searchParams, [e.target.name]: e.target.value });
  };

  const handleSearchPapers = async (overrideParams = null) => {
    const paramsToQuery = overrideParams || searchParams;
    if (!paramsToQuery.regno) {
      setError("Please provide registration number");
      return;
    }
    try {
      const res = await ep1.get("/api/v2/reevaluationnew/getallpapersforstudentds1", {
        params: paramsToQuery,
      });
      
      if (!res.data || res.data.length === 0) {
        setError("No evaluated papers found for the selected criteria");
        setAllPapers([]);
      } else {
        setError("");
        setAllPapers(res.data);
      }
      setSelectedPapers([]);
    } catch (err) {
      setError(err.response?.data?.error || "Error fetching papers");
    }
  };

  const handleSelectPaper = (paper) => {
    const isSelected = selectedPapers.find(p => p.papercode === paper.papercode);
    if (isSelected) {
      setSelectedPapers(selectedPapers.filter(p => p.papercode !== paper.papercode));
    } else {
      if (selectedPapers.length >= 2) {
        setError("you can select maximum 2 papers only");
        return;
      }
      setSelectedPapers([...selectedPapers, paper]);
      setError("");
    }
  };

  const handleApplyReevaluation = async () => {
    if (selectedPapers.length === 0) {
      setError("please select at least one paper");
      return;
    }
    try {
      const applicationData = {
        name: global1.name,
        user: global1.user,
        colid: Number(global1.colid),
        student: global1.student || global1.name,
        regno: searchParams.regno,
        program: searchParams.program,
        papers: selectedPapers.map(paper => ({
          examcode: paper.examcode,
          month: paper.month,
          year: paper.year,
          regulation: paper.regulation,
          semester: paper.semester,
          branch: paper.branch,
          papercode: paper.papercode,
          papername: paper.papername,
          originalmarks: paper.thobtained,
          maxmarks: paper.thmax,
        })),
      };
      await ep1.post("/api/v2/reevaluationnew/applyreevaluationds1", applicationData);
      setSuccess("reevaluation application submitted successfully!");
      setError("");
      setSelectedPapers([]);
      setAllPapers([]);
      fetchMyApplications();
    } catch (err) {
      setError(err.response?.data?.error || "error applying for reevaluation");
    }
  };

  const fetchMyApplications = async () => {
    try {
      const res = await ep1.get("/api/v2/reevaluationnew/getmyapplicationsds1", {
        params: { regno: global1.regno, colid: Number(global1.colid) },
      });
      setMyApplications(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "pending":
        return "warning";
      case "allocated":
        return "info";
      case "stage1":
        return "secondary";
      case "stage2":
        return "error";
      case "completed":
        return "success";
      default:
        return "default";
    }
  };

  return (
    <MenuPageShell title="Student Re-evaluation Application" menuType="student">
      <Box p={{ xs: 1.5, sm: 3 }} maxWidth={1200} mx="auto">
        <Box sx={{ mb: 3, display: "flex", alignItems: "center", gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<ArrowBack />}
            onClick={() => navigate("/studentdashboard")}
          >
            Back to Dashboard
          </Button>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>
            Re-evaluation Application (Student Portal)
          </Typography>
        </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            search papers (select up to 2 papers)
          </Typography>
          <Box display="grid" gridTemplateColumns="repeat(3, 1fr)" gap={2}>
            <TextField
              label="registration number"
              name="regno"
              value={searchParams.regno}
              onChange={handleChange}
              fullWidth
              required
              InputProps={{
                readOnly: Boolean(global1.regno),
              }}
              helperText={global1.regno ? "Enrolled Student" : ""}
            />
            <TextField
              select
              label="program"
              name="program"
              value={searchParams.program}
              onChange={handleChange}
              fullWidth
              required
              helperText={filterOptions.programs.length === 1 ? "Enrolled Program" : ""}
            >
              {filterOptions.programs.map((prog) => (
                <MenuItem key={prog} value={prog}>
                  {prog}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="branch"
              name="branch"
              value={searchParams.branch}
              onChange={handleChange}
              fullWidth
              required
            >
              {filterOptions.branches.map((br) => (
                <MenuItem key={br} value={br}>
                  {br}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="regulation"
              name="regulation"
              value={searchParams.regulation}
              onChange={handleChange}
              fullWidth
              required
            >
              {filterOptions.regulations.map((reg) => (
                <MenuItem key={reg} value={reg}>
                  {reg}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="semester"
              name="semester"
              value={searchParams.semester}
              onChange={handleChange}
              fullWidth
              required
            >
              {filterOptions.semesters.map((sem) => (
                <MenuItem key={sem} value={sem}>
                  {sem}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="year"
              name="year"
              value={searchParams.year}
              onChange={handleChange}
              fullWidth
              required
            >
              {filterOptions.years.map((yr) => (
                <MenuItem key={yr} value={yr}>
                  {yr}
                </MenuItem>
              ))}
            </TextField>
          </Box>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSearchPapers}
            sx={{ mt: 2 }}
          >
            search papers
          </Button>
        </CardContent>
      </Card>

      {allPapers.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              available papers (select maximum 2)
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
              selected: {selectedPapers.length} / 2
            </Typography>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>select</TableCell>
                    <TableCell>paper code</TableCell>
                    <TableCell>paper name</TableCell>
                    <TableCell>theory marks (obtained/max)</TableCell>
                    <TableCell>theory %</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {allPapers.map((paper, index) => {
                    const isSelected = selectedPapers.find(p => p.papercode === paper.papercode);
                    const theoryPercentage = paper.thmax > 0
                      ? ((paper.thobtained / paper.thmax) * 100).toFixed(2)
                      : "n/a";
                    return (
                      <TableRow key={index}>
                        <TableCell>
                          <Checkbox
                            checked={!!isSelected}
                            onChange={() => handleSelectPaper(paper)}
                            disabled={!isSelected && selectedPapers.length >= 2}
                          />
                        </TableCell>
                        <TableCell>{paper.papercode}</TableCell>
                        <TableCell>{paper.papername}</TableCell>
                        <TableCell>
                          {paper.thobtained} / {paper.thmax}
                        </TableCell>
                        <TableCell>{theoryPercentage}%</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
            <Button
              variant="contained"
              color="success"
              onClick={handleApplyReevaluation}
              disabled={selectedPapers.length === 0}
              sx={{ mt: 2 }}
            >
              apply for reevaluation
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            my reevaluation applications
          </Typography>
          {myApplications.length === 0 ? (
            <Typography variant="body2" color="textSecondary">
              no applications found
            </Typography>
          ) : (
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>paper code</TableCell>
                    <TableCell>paper name</TableCell>
                    <TableCell>original marks</TableCell>
                    <TableCell>max marks</TableCell>
                    <TableCell>examiner 1 marks</TableCell>
                    <TableCell>examiner 2 marks</TableCell>
                    <TableCell>examiner 3 marks</TableCell>
                    <TableCell>final marks</TableCell>
                    <TableCell>status</TableCell>
                    <TableCell>remarks</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {myApplications.map((app) => (
                    <TableRow key={app._id}>
                      <TableCell>{app.papercode}</TableCell>
                      <TableCell>{app.papername}</TableCell>
                      <TableCell>{app.originalmarks}</TableCell>
                      <TableCell>{app.maxmarks}</TableCell>
                      <TableCell>{app.examiner1marks || "-"}</TableCell>
                      <TableCell>{app.examiner2marks || "-"}</TableCell>
                      <TableCell>{app.examiner3marks || "-"}</TableCell>
                      <TableCell>
                        <strong>{app.finalmarks || "-"}</strong>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={app.status || "pending"}
                          color={getStatusColor(app.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{app.remarksds || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </Box>
    </MenuPageShell>
  );
}

export default ReevaluationApplicationNewPageds;
