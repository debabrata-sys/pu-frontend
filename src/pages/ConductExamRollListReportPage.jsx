import React, { useEffect, useMemo, useState } from "react";
import { Alert, Autocomplete, Box, Button, Checkbox, Grid, LinearProgress, MenuItem, Paper, Stack, TextField, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import PrintIcon from "@mui/icons-material/Print";
import ep1 from "../api/ep1";
import global1 from "./global1";
import MenuPageShell from "./MenuPageShell";

const filterFields = [
  { key: "academicyear", label: "Academic Year" },
  { key: "regulation", label: "Regulation" },
  { key: "exam", label: "Exam" },
  { key: "examcode", label: "Exam Code" },
  { key: "program", label: "Program" },
  { key: "programcode", label: "Program Code" },
  { key: "type", label: "Type" },
  { key: "subject", label: "Subject" },
  { key: "semester", label: "Semester" },
  { key: "course", label: "Course" },
  { key: "coursecode", label: "Course Code" },
  { key: "section", label: "Section" },
  { key: "examsection", label: "Exam Section" },
  { key: "applied", label: "Applied" },
  { key: "admitcardeligible", label: "Admit Eligible" },
  { key: "attended", label: "Attended" },
  { key: "attendance", label: "Attendance" },
  { key: "fees", label: "Fees" },
  { key: "disciplinary", label: "Disciplinary" },
  { key: "examdate", label: "Exam Date" },
  { key: "examslot", label: "Exam Slot" },
  { key: "campus", label: "Campus" },
  { key: "building", label: "Building" },
  { key: "examroom", label: "Exam Room" },
  { key: "batch", label: "Batch / Admission Year" }
];

const blankFilter = { field: "academicyear", values: [] };
const fieldLabel = (key) => filterFields.find((item) => item.key === key)?.label || key;
const valueText = (value) => String(value || "").trim();

const courseComponents = (course) => (Array.isArray(course.components) && course.components.length ? course.components : ["Th"]);

function BatchRows({ students, courses }) {
  const grouped = useMemo(() => {
    const map = new Map();
    students.forEach((student) => {
      const parts = [];
      if (valueText(student.batch)) parts.push(valueText(student.batch));
      if (valueText(student.faculty)) parts.push(valueText(student.faculty));
      const groupKey = parts.join(" - ") || "General";
      if (!map.has(groupKey)) map.set(groupKey, []);
      map.get(groupKey).push(student);
    });
    return [...map.entries()];
  }, [students]);

  const totalCols = 5 + courses.reduce((sum, course) => sum + courseComponents(course).length, 0);

  return grouped.map(([groupName, groupStudents]) => (
    <React.Fragment key={groupName}>
      <tr className="batch-row">
        <td colSpan={totalCols}>{groupName}</td>
      </tr>
      {groupStudents.map((student) => (
        <tr key={student.id}>
          <td className="center">{student.serial}</td>
          <td>{student.enrollmentno}</td>
          <td>{student.student}</td>
          <td>{student.fathername}</td>
          <td>{student.faculty || "-"}</td>
          {courses.map((course) => {
            const courseKey = valueText(course.coursecode) || valueText(course.course);
            const marks = student.courses?.[courseKey] || {};
            return (
              <React.Fragment key={`${student.id}-${courseKey}`}>
                {courseComponents(course).map((component) => (
                  <td className="center" key={`${student.id}-${courseKey}-${component}`}>
                    {marks[component] || ""}
                  </td>
                ))}
              </React.Fragment>
            );
          })}
        </tr>
      ))}
    </React.Fragment>
  ));
}

function RollListPrint({ report }) {
  const header = report?.header || {};
  const courses = report?.courses || [];
  const students = report?.students || [];
  const totals = report?.totals || [];
  const totalMap = new Map(totals.map((item) => [valueText(item.coursecode), item]));

  return (
    <Box id="roll-list-report-print" sx={{ bgcolor: "#fff", color: "#000", p: 1.5, border: "1px solid #cbd5e1", mx: "auto", overflowX: "auto" }}>
      <style>{`
        #roll-list-report-print, #roll-list-report-print * { color: #000 !important; }
        #roll-list-report-print .roll-page { width: 277mm; min-height: 190mm; margin: 0 auto; font-family: Arial, sans-serif; font-size: 9.5px; line-height: 1.2; }
        #roll-list-report-print .inst-title { text-align: center !important; font-weight: 700 !important; font-size: 26px !important; margin: 0 !important; font-family: Arial, sans-serif !important; line-height: 1.3 !important; }
        #roll-list-report-print .inst-address { text-align: center !important; font-weight: 600 !important; font-size: 14px !important; margin: 3px 0 !important; font-family: Arial, sans-serif !important; line-height: 1.4 !important; }
        #roll-list-report-print .inst-subtitle { text-align: center !important; font-weight: 700 !important; font-size: 16px !important; margin: 4px 0 8px !important; font-family: Arial, sans-serif !important; line-height: 1.4 !important; }
        #roll-list-report-print .title { text-align: center; font-weight: 700; font-size: 20px; margin: 0; }
        #roll-list-report-print .address { text-align: center; font-weight: 600; font-size: 12px; margin: 2px 0; }
        #roll-list-report-print .subtitle { text-align: center; font-weight: 700; font-size: 14px; margin: 2px 0 8px; }
        #roll-list-report-print .meta { display: grid; grid-template-columns: 1fr; gap: 3px; font-size: 11px; margin-bottom: 6px; }
        #roll-list-report-print .meta-line { display: flex; align-items: flex-start; gap: 16px; flex-wrap: wrap; }
        #roll-list-report-print .meta strong { font-weight: 700; }
        #roll-list-report-print table { width: 100%; border-collapse: collapse; table-layout: fixed; }
        #roll-list-report-print th, #roll-list-report-print td { border: 1px solid #000; padding: 2px 3px; vertical-align: middle; word-break: break-word; }
        #roll-list-report-print th { font-weight: 700; text-align: center; font-size: 11px; }
        #roll-list-report-print td { font-size: 10px; }
        #roll-list-report-print .sno { width: 8mm; }
        #roll-list-report-print .enroll { width: 36mm; font-size: 8px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        #roll-list-report-print .student { width: 40mm; }
        #roll-list-report-print .guardian { width: 36mm; }
        #roll-list-report-print .faculty { width: 24mm; }
        #roll-list-report-print .component { width: 10mm; font-size: 10.5px; }
        #roll-list-report-print .course-head { height: 26mm; font-size: 10px; line-height: 1.15; }
        #roll-list-report-print .course-code { display: block; font-weight: 700; margin-bottom: 2px; font-size: 10.5px; }
        #roll-list-report-print .center { text-align: center; }
        #roll-list-report-print .batch-row td { font-weight: 700; background: #ffd600; text-align: center; font-size: 11px; padding: 4px; }
        #roll-list-report-print .total-label { font-weight: 700; text-align: right; font-size: 11px; }
        #roll-list-report-print .footer { display: flex; justify-content: space-between; margin-top: 15mm; font-size: 10.5px; font-weight: 700; }
        @media print {
          @page { size: A4 landscape; margin: 6mm; }
          header, nav, aside, .MuiAppBar-root, .MuiDrawer-root, .MuiDrawer-docked, .no-print, [role="navigation"] {
            display: none !important;
          }
          html, body { background: #fff !important; margin: 0 !important; padding: 0 !important; }
          body * { visibility: hidden; }
          #roll-list-report-print, #roll-list-report-print * { visibility: visible; }
          #roll-list-report-print { position: absolute; left: 0; top: 0; width: 285mm !important; max-width: 285mm !important; border: none !important; padding: 0 !important; overflow: visible !important; }
          #roll-list-report-print .roll-page { width: 285mm !important; max-width: 285mm !important; }
          .no-print { display: none !important; }
        }
      `}</style>
      <Box className="roll-page">
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
          <Box sx={{ width: "200px", display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
            {header.logolink ? (
              <img src={header.logolink} alt="Logo" style={{ maxHeight: "130px", maxWidth: "200px", objectFit: "contain" }} />
            ) : null}
          </Box>
          <Box sx={{ flex: 1, textAlign: "center" }}>
            <p className="inst-title" style={{ textAlign: "center", fontWeight: 700, fontSize: "26px", margin: 0, fontFamily: "Arial, sans-serif", color: "#000" }}>{header.institutionname || "PEOPLE'S UNIVERSITY, BHOPAL"}</p>
            {header.address ? (
              <p className="inst-address" style={{ textAlign: "center", fontWeight: 600, fontSize: "14px", margin: "3px 0", fontFamily: "Arial, sans-serif", color: "#000" }}>{header.address}</p>
            ) : null}
            <p className="inst-subtitle" style={{ textAlign: "center", fontWeight: 700, fontSize: "16px", margin: "4px 0 8px", fontFamily: "Arial, sans-serif", color: "#000" }}>Roll List</p>
          </Box>
          <Box sx={{ width: "200px" }} />
        </Box>

        <Box className="meta">
          <Box className="meta-line"><span><strong>Exam Name :</strong> {header.examName || "-"}</span></Box>
          <Box className="meta-line" sx={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap" }}>
            <span><strong>Course :</strong> {header.course || "-"}</span>
            <span><strong>Status :</strong> {header.status || "Main"}</span>
            <span><strong>Exam Centre :</strong> {header.examCentre || header.institute || "-"}</span>
          </Box>
        </Box>
        <table>
          <thead>
            <tr>
              <th rowSpan={2} className="sno">S. No.</th>
              <th rowSpan={2} className="enroll">Enrollment No</th>
              <th rowSpan={2} className="student">Name of Student's</th>
              <th rowSpan={2} className="guardian">S/D/W/O</th>
              <th rowSpan={2} className="faculty">Faculty</th>
              {courses.map((course) => (
                <th key={course.coursecode || course.course} colSpan={courseComponents(course).length} className="course-head">
                  <span className="course-code">{course.coursecode || "-"}</span>
                  {course.course || "-"}
                </th>
              ))}
            </tr>
            <tr>
              {courses.map((course) => (
                <React.Fragment key={`${course.coursecode || course.course}-sub`}>
                  {courseComponents(course).map((component) => <th className="component" key={`${course.coursecode || course.course}-${component}`}>{component}</th>)}
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            <BatchRows students={students} courses={courses} />
            <tr>
              <td colSpan={5} className="total-label">Theory</td>
              {courses.map((course) => {
                const total = totalMap.get(valueText(course.coursecode)) || {};
                return (
                  <React.Fragment key={`${course.coursecode || course.course}-theory`}>
                    {courseComponents(course).map((component) => (
                      <td className="center" key={`${course.coursecode || course.course}-theory-${component}`}>
                        {component === "Th" ? (total.components?.[component] ?? total.theory ?? "-") : "--"}
                      </td>
                    ))}
                  </React.Fragment>
                );
              })}
            </tr>
            <tr>
              <td colSpan={5} className="total-label">Practical</td>
              {courses.map((course) => {
                const total = totalMap.get(valueText(course.coursecode)) || {};
                return (
                  <React.Fragment key={`${course.coursecode || course.course}-practical`}>
                    {courseComponents(course).map((component) => (
                      <td className="center" key={`${course.coursecode || course.course}-practical-${component}`}>
                        {component === "Pr" ? (total.components?.[component] ?? total.practical ?? "-") : "--"}
                      </td>
                    ))}
                  </React.Fragment>
                );
              })}
            </tr>
          </tbody>
        </table>
        <Box className="footer">
          <span>Page No. 1 of 1</span>
          <span>In-charge (Conduct)</span>
        </Box>
      </Box>
    </Box>
  );
}

export default function ConductExamRollListReportPage() {
  const [options, setOptions] = useState({});
  const [filters, setFilters] = useState([{ ...blankFilter }]);
  const [report, setReport] = useState(null);
  const [headerInputs, setHeaderInputs] = useState({ institute: "", examCentre: "", statusLabel: "Main" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadOptions = async () => {
    const res = await ep1.get("/api/v2/conductexam/examroll-list-report-options", { params: { colid: global1.colid } });
    setOptions(res.data?.options || {});
  };

  useEffect(() => {
    loadOptions().catch((err) => setError(err.response?.data?.message || "Unable to load report filters."));
  }, []);

  const selectedFields = useMemo(() => filters.map((item) => item.field), [filters]);
  const canAddFilter = selectedFields.length < filterFields.length;
  const summary = report?.summary || {};

  const updateFilter = (index, patch) => {
    setFilters((prev) => prev.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)));
  };

  const addFilter = () => {
    const nextField = filterFields.find((item) => !selectedFields.includes(item.key))?.key || "academicyear";
    setFilters((prev) => [...prev, { field: nextField, values: [] }]);
  };

  const removeFilter = (index) => {
    setFilters((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  };

  const loadReport = async () => {
    try {
      setLoading(true);
      setError("");
      const activeFilters = filters
        .map((item) => ({ field: item.field, values: (item.values || []).map(valueText).filter(Boolean) }))
        .filter((item) => item.field && item.values.length);
      const res = await ep1.get("/api/v2/conductexam/examroll-list-report", {
        params: {
          colid: global1.colid,
          filters: JSON.stringify(activeFilters),
          institute: headerInputs.institute,
          examCentre: headerInputs.examCentre,
          statusLabel: headerInputs.statusLabel
        }
      });
      setReport(res.data || null);
      setOptions(res.data?.options || options);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to generate roll list report.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <MenuPageShell title="Roll List Report">
      <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: "#f6f7fb", minHeight: "100vh" }}>
        <Paper className="no-print" elevation={0} sx={{ p: 2.5, mb: 2, border: "1px solid #e5e7eb", borderRadius: 2 }}>
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2}>
            <Box>
              <Typography variant="h5" fontWeight={900}>Roll List Report</Typography>
              <Typography color="text.secondary">Generate the exam roll list with batch grouping, course-wise paper columns, totals, and A4 landscape print.</Typography>
            </Box>
            <Stack direction="row" spacing={1}>
              <Button variant="outlined" startIcon={<AddIcon />} onClick={addFilter} disabled={!canAddFilter || loading}>Add Filter</Button>
              <Button variant="contained" onClick={loadReport} disabled={loading}>{loading ? "Generating..." : "Generate"}</Button>
              <Button variant="outlined" startIcon={<PrintIcon />} onClick={() => window.print()} disabled={!report}>Print</Button>
            </Stack>
          </Stack>
          {loading && <LinearProgress sx={{ mt: 2 }} />}
        </Paper>

        {error && <Alert className="no-print" severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}

        <Paper className="no-print" elevation={0} sx={{ p: 2.5, mb: 2, border: "1px solid #e5e7eb", borderRadius: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}><TextField fullWidth label="Institute override" value={headerInputs.institute} onChange={(e) => setHeaderInputs({ ...headerInputs, institute: e.target.value })} /></Grid>
            <Grid item xs={12} md={5}><TextField fullWidth label="Exam Centre" value={headerInputs.examCentre} onChange={(e) => setHeaderInputs({ ...headerInputs, examCentre: e.target.value })} /></Grid>
            <Grid item xs={12} md={3}><TextField fullWidth label="Status label" value={headerInputs.statusLabel} onChange={(e) => setHeaderInputs({ ...headerInputs, statusLabel: e.target.value })} /></Grid>
          </Grid>
        </Paper>

        <Paper className="no-print" elevation={0} sx={{ p: 2.5, mb: 2, border: "1px solid #e5e7eb", borderRadius: 2 }}>
          <Grid container spacing={2}>
            {filters.map((item, index) => {
              const availableFields = filterFields.filter((field) => field.key === item.field || !selectedFields.includes(field.key));
              return (
                <React.Fragment key={`${item.field}-${index}`}>
                  <Grid item xs={12} md={3}>
                    <TextField
                      select
                      fullWidth
                      label="Filter Field"
                      value={item.field}
                      onChange={(event) => updateFilter(index, { field: event.target.value, values: [] })}
                    >
                      {availableFields.map((field) => <MenuItem key={field.key} value={field.key}>{field.label}</MenuItem>)}
                    </TextField>
                  </Grid>
                  <Grid item xs={12} md={8}>
                    <Autocomplete
                      multiple
                      disableCloseOnSelect
                      options={options[item.field] || []}
                      value={item.values || []}
                      onChange={(_, value) => updateFilter(index, { values: value })}
                      renderOption={(props, option, { selected }) => (
                        <li {...props}><Checkbox checked={selected} />{option}</li>
                      )}
                      renderInput={(params) => <TextField {...params} label={`${fieldLabel(item.field)} values`} />}
                    />
                  </Grid>
                  <Grid item xs={12} md={1}>
                    <Button fullWidth color="error" variant="outlined" onClick={() => removeFilter(index)} disabled={filters.length === 1} sx={{ height: 56 }}>
                      <DeleteIcon />
                    </Button>
                  </Grid>
                </React.Fragment>
              );
            })}
          </Grid>
        </Paper>

        {report && (
          <Grid className="no-print" container spacing={2} sx={{ mb: 2 }}>
            {[
              ["Students", summary.studentCount || 0],
              ["Courses", summary.courseCount || 0],
              ["Theory Entries", summary.theoryTotal || 0],
              ["Practical Entries", summary.practicalTotal || 0]
            ].map(([label, value]) => (
              <Grid item xs={12} sm={6} md={3} key={label}>
                <Paper elevation={0} sx={{ p: 2, border: "1px solid #e5e7eb", borderRadius: 2 }}>
                  <Typography color="text.secondary" variant="body2">{label}</Typography>
                  <Typography variant="h5" fontWeight={900}>{value}</Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        )}

        {report ? (
          <RollListPrint report={report} />
        ) : (
          <Paper className="no-print" elevation={0} sx={{ p: 4, textAlign: "center", border: "1px dashed #cbd5e1", borderRadius: 2 }}>
            <Typography fontWeight={800}>Add filters and click Generate to create the roll list.</Typography>
          </Paper>
        )}
      </Box>
    </MenuPageShell>
  );
}
