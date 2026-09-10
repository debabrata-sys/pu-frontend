import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  Grid,
  MenuItem,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography
} from "@mui/material";
import { DataGrid, GridToolbar } from "@mui/x-data-grid";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import * as XLSX from "xlsx";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import PrintIcon from "@mui/icons-material/Print";
import SaveIcon from "@mui/icons-material/Save";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import ep1 from "../api/ep1";
import global1 from "./global1";
import MenuPageShell from "./MenuPageShell";

const emptyForm = {
  academicyear: "",
  regulation: "",
  program: "",
  programcode: "",
  semester: "",
  course: "",
  coursecode: "",
  module: [],
  topic: [],
  lectureno: "",
  planneddatefrom: "",
  planneddateto: "",
  actualdatefrom: "",
  actualdateto: "",
  status: "Active"
};

const fields = [
  "academicyear",
  "regulation",
  "program",
  "programcode",
  "semester",
  "course",
  "coursecode",
  "module",
  "topic",
  "lectureno",
  "planneddatefrom",
  "planneddateto",
  "actualdatefrom",
  "actualdateto",
  "status"
];

const labels = {
  academicyear: "Academic year",
  regulation: "Regulation",
  program: "Program",
  programcode: "Program code",
  semester: "Semester",
  course: "Course",
  coursecode: "Course code",
  module: "Module",
  topic: "Topic",
  lectureno: "Lecture no",
  planneddatefrom: "Planned date from",
  planneddateto: "Planned date to",
  actualdatefrom: "Actual date from",
  actualdateto: "Actual date to",
  status: "Status"
};

const clean = (value) => String(value || "").trim();
const splitList = (value) => clean(value).split(",").map((item) => item.trim()).filter(Boolean);
const uniq = (items) => [...new Set(items.map(clean).filter(Boolean))].sort((a, b) => a.localeCompare(b));

function MultiAutocomplete({ label, options, value, onChange, disabled }) {
  return (
    <Autocomplete
      multiple
      disableCloseOnSelect
      options={options}
      value={Array.isArray(value) ? value : splitList(value)}
      onChange={(_, next) => onChange(next)}
      disabled={disabled}
      renderOption={(props, option, { selected }) => (
        <li {...props}>
          <Checkbox size="small" checked={selected} sx={{ mr: 1 }} />
          <span style={{ whiteSpace: "normal" }}>{option}</span>
        </li>
      )}
      renderTags={(selected, getTagProps) => selected.slice(0, 2).map((option, index) => <Chip size="small" label={option} {...getTagProps({ index })} />)}
      renderInput={(params) => <TextField {...params} label={label} />}
    />
  );
}

function SearchableSelect({ label, options, value, onChange, getLabel = (item) => item, disabled }) {
  const selected = options.find((item) => getLabel(item) === getLabel(value) || item === value) || null;
  return (
    <Autocomplete
      options={options}
      value={selected}
      disabled={disabled}
      getOptionLabel={(option) => typeof option === "string" ? option : getLabel(option)}
      onChange={(_, next) => onChange(next)}
      renderInput={(params) => <TextField {...params} label={label} />}
    />
  );
}

function DynamicFilters({ options, filters, setFilters, onApply }) {
  const addFilter = () => setFilters((prev) => [...prev, { field: "", value: "" }]);
  const update = (index, patch) => setFilters((prev) => prev.map((item, i) => i === index ? { ...item, ...patch } : item));
  const remove = (index) => setFilters((prev) => prev.filter((_, i) => i !== index));
  return (
    <Paper elevation={0} sx={{ p: 2, border: "1px solid #e5e7eb", borderRadius: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
        <Typography fontWeight={900}>Dynamic filters</Typography>
        <Button size="small" variant="outlined" onClick={addFilter}>Add filter</Button>
      </Stack>
      <Grid container spacing={1}>
        {filters.map((filter, index) => (
          <React.Fragment key={index}>
            <Grid item xs={12} md={4}>
              <TextField select fullWidth size="small" label="Field" value={filter.field} onChange={(e) => update(index, { field: e.target.value, value: "" })}>
                {fields.map((field) => <MenuItem key={field} value={field}>{labels[field]}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <Autocomplete
                freeSolo
                options={options[filter.field] || []}
                value={filter.value || ""}
                onInputChange={(_, value) => update(index, { value })}
                renderInput={(params) => <TextField {...params} size="small" label="Value" />}
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <Button fullWidth color="error" variant="outlined" onClick={() => remove(index)}>Remove</Button>
            </Grid>
          </React.Fragment>
        ))}
        <Grid item xs={12}>
          <Button variant="contained" onClick={onApply}>Apply filters</Button>
        </Grid>
      </Grid>
    </Paper>
  );
}

function printHtml({ title, institution, content }) {
  const logo = institution?.logolink ? `<img src="${institution.logolink}" style="height:58px;object-fit:contain;margin-right:14px;" />` : "";
  const html = `
    <html>
      <head>
        <title>${title}</title>
        <style>
          @page { size: A4 portrait; margin: 14mm; }
          body { font-family: Arial, sans-serif; color: #111; background: #fff; }
          .toolbar { margin-bottom: 12px; }
          @media print { .toolbar { display:none; } }
          .header { display:flex; align-items:center; justify-content:center; border-bottom:2px solid #111; padding-bottom:10px; margin-bottom:12px; text-align:center; }
          h1,h2,h3 { margin: 4px 0; }
          table { width:100%; border-collapse:collapse; font-size:11px; }
          th,td { border:1px solid #444; padding:5px; text-align:left; vertical-align:top; }
          th { background:#f2f2f2; }
          tr { break-inside: avoid; }
          .cards { display:grid; grid-template-columns: repeat(3, 1fr); gap:8px; margin:10px 0; }
          .card { border:1px solid #555; padding:8px; }
        </style>
      </head>
      <body>
        <div class="toolbar"><button onclick="window.print()">Print</button> <button onclick="window.close()">Close</button></div>
        <div class="header">${logo}<div><h2>${institution?.institutionname || "Institution"}</h2><div>${institution?.address || ""}</div><div>${institution?.contactusdetails || ""}</div></div></div>
        <h3 style="text-align:center;">${title}</h3>
        ${content}
      </body>
    </html>`;
  const win = window.open("", "_blank", "width=1100,height=800");
  win.document.write(html);
  win.document.close();
}

export function NepLmsLessonPlan2ReportPage() {
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(null);
  const [filters, setFilters] = useState([{ field: "academicyear", value: "" }]);
  const [options, setOptions] = useState({});
  const [institution, setInstitution] = useState(null);
  const [error, setError] = useState("");

  const filterParams = () => filters.reduce((acc, item) => {
    if (item.field && item.value) acc[item.field] = item.value;
    return acc;
  }, { colid: global1.colid });

  const loadOptions = async () => {
    const [optRes, planRes, instRes] = await Promise.all([
      ep1.get("/api/v2/neplms/lesson-plan-2/options", { params: { colid: global1.colid } }),
      ep1.get("/api/v2/neplms/lesson-plan-2", { params: { colid: global1.colid } }),
      ep1.get("/vins", { params: { colid: global1.colid } }).catch(() => ({ data: null }))
    ]);
    const opt = optRes.data || {};
    const planRows = planRes.data?.data || [];
    setInstitution(instRes.data || null);
    setOptions({
      academicyear: opt.academicyears || [],
      regulation: opt.regulations || [],
      program: uniq(planRows.map((r) => r.program)),
      programcode: uniq(planRows.map((r) => r.programcode)),
      semester: opt.semesters || [],
      course: uniq(planRows.map((r) => r.course)),
      coursecode: uniq(planRows.map((r) => r.coursecode)),
      module: opt.modules || [],
      topic: opt.topics || [],
      lectureno: uniq(planRows.map((r) => r.lectureno)),
      planneddatefrom: uniq(planRows.map((r) => r.planneddatefrom)),
      planneddateto: uniq(planRows.map((r) => r.planneddateto)),
      actualdatefrom: uniq(planRows.map((r) => r.actualdatefrom)),
      actualdateto: uniq(planRows.map((r) => r.actualdateto)),
      status: opt.statuses || ["Active", "Inactive"]
    });
  };

  const loadReport = async () => {
    try {
      setError("");
      const res = await ep1.get("/api/v2/neplms/lesson-plan-2/report", { params: filterParams() });
      setSummary(res.data || null);
      setRows(res.data?.rows || []);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load report");
    }
  };

  useEffect(() => { loadOptions(); loadReport(); }, []);

  const printReport = () => {
    const cardHtml = `<div class="cards"><div class="card"><b>Total</b><br/>${summary?.total || 0}</div><div class="card"><b>Completed</b><br/>${summary?.completed || 0}</div><div class="card"><b>Pending</b><br/>${summary?.pending || 0}</div></div>`;
    const table = `<table><thead><tr>${fields.map((field) => `<th>${labels[field]}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${fields.map((field) => `<td>${row[field] ?? ""}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
    printHtml({ title: "Lesson Plans 2 Report", institution, content: `${cardHtml}${table}` });
  };

  const chartData = summary?.byCourse || [];

  return (
    <MenuPageShell title="Lesson Plans 2 Report">
      <Box sx={{ p: 2, bgcolor: "#f6f7fb", minHeight: "100vh" }}>
        <Stack spacing={2}>
          {error && <Alert severity="error">{error}</Alert>}
          <DynamicFilters options={options} filters={filters} setFilters={setFilters} onApply={loadReport} />
          <Grid container spacing={2}>
            {[["Total", summary?.total || 0], ["Completed", summary?.completed || 0], ["Pending", summary?.pending || 0]].map(([label, value]) => (
              <Grid item xs={12} md={4} key={label}><Card><CardContent><Typography color="text.secondary">{label}</Typography><Typography variant="h4" fontWeight={900}>{value}</Typography></CardContent></Card></Grid>
            ))}
          </Grid>
          <Paper elevation={0} sx={{ p: 2, borderRadius: 2 }}>
            <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
              <Typography variant="h6" fontWeight={900}>Coursewise progress</Typography>
              <Button startIcon={<PrintIcon />} variant="outlined" onClick={printReport}>Print preview</Button>
            </Stack>
            <Box sx={{ height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="planned" fill="#2563eb" />
                  <Bar dataKey="actual" fill="#16a34a" />
                  <Bar dataKey="pending" fill="#f97316" />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
          <Paper elevation={0} sx={{ p: 2, borderRadius: 2 }}>
            <DataGrid
              rows={rows.map((row) => ({ id: row._id, ...row }))}
              columns={fields.map((field) => ({ field, headerName: labels[field], minWidth: 150, flex: field === "topic" ? 1.6 : 1 }))}
              autoHeight
              slots={{ toolbar: GridToolbar }}
              pageSizeOptions={[10, 25, 50, 100]}
              sx={{ "& .MuiDataGrid-cell": { whiteSpace: "normal", lineHeight: 1.3, alignItems: "flex-start" } }}
            />
          </Paper>
        </Stack>
      </Box>
    </MenuPageShell>
  );
}

export default function NepLmsLessonPlan2Page() {
  const [tab, setTab] = useState(0);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState("");
  const [rows, setRows] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [options, setOptions] = useState({ academicyears: [], regulations: [], programs: [], semesters: [], courses: [], modules: [], topics: [] });
  const [filters, setFilters] = useState([{ field: "academicyear", value: "" }]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const selectedProgram = options.programs.find((item) => item.program === form.program && item.programcode === form.programcode) || null;
  const selectedCourse = options.courses.find((item) => item.course === form.course && item.coursecode === form.coursecode) || null;
  const selectedModules = Array.isArray(form.module) ? form.module : splitList(form.module);
  const topicOptions = selectedModules.length
    ? options.topics.filter((topic) => true)
    : options.topics;

  const paramsFromFilters = () => filters.reduce((acc, item) => {
    if (item.field && item.value) acc[item.field] = item.value;
    return acc;
  }, { colid: global1.colid });

  const loadOptions = async (extra = {}) => {
    const res = await ep1.get("/api/v2/neplms/lesson-plan-2/options", { params: { colid: global1.colid, ...extra } });
    setOptions({
      academicyears: res.data?.academicyears || [],
      regulations: res.data?.regulations || [],
      programs: res.data?.programs || [],
      semesters: res.data?.semesters || [],
      courses: res.data?.courses || [],
      modules: res.data?.modules || [],
      topics: res.data?.topics || [],
      statuses: res.data?.statuses || ["Active", "Inactive"]
    });
  };

  const loadRows = async () => {
    try {
      setError("");
      const res = await ep1.get("/api/v2/neplms/lesson-plan-2", { params: paramsFromFilters() });
      setRows(res.data?.data || []);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load lesson plans");
    }
  };

  useEffect(() => { loadOptions(); loadRows(); }, []);

  useEffect(() => {
    loadOptions({
      academicyear: form.academicyear,
      regulation: form.regulation,
      program: form.program,
      programcode: form.programcode,
      semester: form.semester,
      course: form.course,
      coursecode: form.coursecode,
      module: selectedModules.join(",")
    });
  }, [form.academicyear, form.regulation, form.program, form.programcode, form.semester, form.course, form.coursecode, form.module]);

  const save = async () => {
    try {
      setError("");
      setMessage("");
      const payload = {
        ...form,
        module: selectedModules.join(", "),
        topic: (Array.isArray(form.topic) ? form.topic : splitList(form.topic)).join(", "),
        colid: global1.colid,
        user: global1.user,
        name: global1.name
      };
      if (editingId) await ep1.post("/api/v2/neplms/lesson-plan-2/update", { ...payload, id: editingId });
      else await ep1.post("/api/v2/neplms/lesson-plan-2", payload);
      setMessage(editingId ? "Lesson plan updated" : "Lesson plan added");
      setForm(emptyForm);
      setEditingId("");
      loadRows();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to save lesson plan");
    }
  };

  const edit = (row) => {
    setEditingId(row._id);
    setForm({ ...emptyForm, ...row, module: splitList(row.module), topic: splitList(row.topic), lectureno: row.lectureno || "" });
    setTab(0);
  };

  const remove = async (row) => {
    if (!window.confirm("Delete this lesson plan?")) return;
    await ep1.post("/api/v2/neplms/lesson-plan-2/delete", { id: row._id, colid: global1.colid });
    loadRows();
  };

  const bulkDelete = async () => {
    if (!selectedIds.length) return setError("Select at least one row");
    if (!window.confirm(`Delete ${selectedIds.length} selected row(s)?`)) return;
    const res = await ep1.post("/api/v2/neplms/lesson-plan-2/bulk-delete", { ids: selectedIds, colid: global1.colid });
    setMessage(`Deleted ${res.data?.deleted || 0} row(s)`);
    setSelectedIds([]);
    loadRows();
  };

  const downloadTemplate = () => {
    const sample = [{
      academicyear: "2026-27",
      regulation: "R2026",
      program: "BDS",
      programcode: "BDS",
      semester: "1",
      course: "Dental Anatomy",
      coursecode: "BDS101",
      module: "Module 1",
      topic: "Introduction",
      lectureno: 1,
      planneddatefrom: "2026-08-01",
      planneddateto: "2026-08-01",
      actualdatefrom: "",
      actualdateto: "",
      status: "Active"
    }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sample), "LessonPlan2");
    XLSX.writeFile(wb, "lesson_plan_2_template.xlsx");
  };

  const bulkUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const uploadRows = XLSX.utils.sheet_to_json(sheet);
      const res = await ep1.post("/api/v2/neplms/lesson-plan-2/bulkupload", { colid: global1.colid, user: global1.user, name: global1.name, rows: uploadRows });
      setMessage(`Inserted ${res.data?.inserted || 0} row(s)${res.data?.errors?.length ? `, ${res.data.errors.length} error(s)` : ""}`);
      loadRows();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to bulk upload");
    } finally {
      event.target.value = "";
    }
  };

  const filterOptions = useMemo(() => {
    const data = {};
    fields.forEach((field) => { data[field] = uniq(rows.map((row) => row[field])); });
    data.academicyear = uniq([...data.academicyear || [], ...options.academicyears]);
    data.regulation = uniq([...data.regulation || [], ...options.regulations]);
    data.semester = uniq([...data.semester || [], ...options.semesters]);
    data.module = uniq([...data.module || [], ...options.modules]);
    data.topic = uniq([...data.topic || [], ...options.topics]);
    return data;
  }, [rows, options]);

  const columns = [
    { field: "actions", headerName: "Actions", width: 150, renderCell: (params) => <Stack direction="row" spacing={0.5}><Button size="small" startIcon={<EditIcon />} onClick={() => edit(params.row)}>Edit</Button><Button size="small" color="error" onClick={() => remove(params.row)}>Del</Button></Stack> },
    ...fields.map((field) => ({ field, headerName: labels[field], minWidth: field === "topic" ? 260 : 145, flex: field === "topic" ? 1.5 : 1 }))
  ];

  return (
    <MenuPageShell title="Lesson Plan 2">
      <Box sx={{ p: 2, bgcolor: "#f6f7fb", minHeight: "100vh" }}>
        <Stack spacing={2}>
          {message && <Alert severity="success" onClose={() => setMessage("")}>{message}</Alert>}
          {error && <Alert severity="error" onClose={() => setError("")}>{error}</Alert>}
          <Paper elevation={0} sx={{ borderRadius: 2, border: "1px solid #e5e7eb" }}>
            <Tabs value={tab} onChange={(_, value) => setTab(value)}>
              <Tab label="Entry" />
              <Tab label="Grid & filters" />
              <Tab label="Bulk upload" />
            </Tabs>
          </Paper>
          {tab === 0 && (
            <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: "1px solid #e5e7eb" }}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={2}><SearchableSelect label="Academic year" options={options.academicyears} value={form.academicyear} onChange={(v) => setForm((p) => ({ ...p, academicyear: clean(v), regulation: "", program: "", programcode: "", semester: "", course: "", coursecode: "", module: [], topic: [] }))} /></Grid>
                <Grid item xs={12} md={2}><SearchableSelect label="Regulation" options={options.regulations} value={form.regulation} onChange={(v) => setForm((p) => ({ ...p, regulation: clean(v), program: "", programcode: "", semester: "", course: "", coursecode: "", module: [], topic: [] }))} /></Grid>
                <Grid item xs={12} md={3}><SearchableSelect label="Program" options={options.programs} value={selectedProgram} getLabel={(p) => p ? `${p.program} (${p.programcode})` : ""} onChange={(v) => setForm((p) => ({ ...p, program: v?.program || "", programcode: v?.programcode || "", course: "", coursecode: "", module: [], topic: [] }))} /></Grid>
                <Grid item xs={12} md={1.5}><TextField fullWidth label="Program code" value={form.programcode} InputProps={{ readOnly: true }} /></Grid>
                <Grid item xs={12} md={1.5}><SearchableSelect label="Semester" options={options.semesters} value={form.semester} onChange={(v) => setForm((p) => ({ ...p, semester: clean(v), course: "", coursecode: "", module: [], topic: [] }))} /></Grid>
                <Grid item xs={12} md={2}><TextField select fullWidth label="Status" value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}>{["Active", "Inactive", "Completed", "Pending"].map((v) => <MenuItem key={v} value={v}>{v}</MenuItem>)}</TextField></Grid>
                <Grid item xs={12} md={4}><SearchableSelect label="Course" options={options.courses} value={selectedCourse} getLabel={(c) => c ? `${c.course} (${c.coursecode})` : ""} onChange={(v) => setForm((p) => ({ ...p, course: v?.course || "", coursecode: v?.coursecode || "", module: [], topic: [] }))} /></Grid>
                <Grid item xs={12} md={2}><TextField fullWidth label="Course code" value={form.coursecode} InputProps={{ readOnly: true }} /></Grid>
                <Grid item xs={12} md={3}><MultiAutocomplete label="Module" options={options.modules} value={form.module} onChange={(v) => setForm((p) => ({ ...p, module: v, topic: [] }))} /></Grid>
                <Grid item xs={12} md={3}><MultiAutocomplete label="Topic" options={topicOptions} value={form.topic} onChange={(v) => setForm((p) => ({ ...p, topic: v }))} disabled={!selectedModules.length} /></Grid>
                <Grid item xs={12} md={1.5}><TextField fullWidth type="number" label="Lecture no" value={form.lectureno} onChange={(e) => setForm((p) => ({ ...p, lectureno: e.target.value }))} /></Grid>
                <Grid item xs={12} md={2.5}><TextField fullWidth type="date" label="Planned date from" InputLabelProps={{ shrink: true }} value={form.planneddatefrom} onChange={(e) => setForm((p) => ({ ...p, planneddatefrom: e.target.value }))} /></Grid>
                <Grid item xs={12} md={2.5}><TextField fullWidth type="date" label="Planned date to" InputLabelProps={{ shrink: true }} value={form.planneddateto} onChange={(e) => setForm((p) => ({ ...p, planneddateto: e.target.value }))} /></Grid>
                <Grid item xs={12} md={2.5}><TextField fullWidth type="date" label="Actual date from" InputLabelProps={{ shrink: true }} value={form.actualdatefrom} onChange={(e) => setForm((p) => ({ ...p, actualdatefrom: e.target.value }))} /></Grid>
                <Grid item xs={12} md={2.5}><TextField fullWidth type="date" label="Actual date to" InputLabelProps={{ shrink: true }} value={form.actualdateto} onChange={(e) => setForm((p) => ({ ...p, actualdateto: e.target.value }))} /></Grid>
                <Grid item xs={12}>
                  <Stack direction="row" spacing={1}>
                    <Button variant="contained" startIcon={<SaveIcon />} onClick={save}>{editingId ? "Update" : "Save"}</Button>
                    <Button variant="outlined" onClick={() => { setForm(emptyForm); setEditingId(""); }}>Clear</Button>
                  </Stack>
                </Grid>
              </Grid>
            </Paper>
          )}
          {tab === 1 && (
            <Stack spacing={2}>
              <DynamicFilters options={filterOptions} filters={filters} setFilters={setFilters} onApply={loadRows} />
              <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: "1px solid #e5e7eb" }}>
                <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                  <Button color="error" variant="outlined" startIcon={<DeleteIcon />} onClick={bulkDelete}>Bulk delete</Button>
                </Stack>
                <DataGrid
                  rows={rows.map((row) => ({ id: row._id, ...row }))}
                  columns={columns}
                  checkboxSelection
                  onRowSelectionModelChange={(ids) => setSelectedIds(Array.from(ids))}
                  autoHeight
                  slots={{ toolbar: GridToolbar }}
                  pageSizeOptions={[10, 25, 50, 100]}
                  sx={{ "& .MuiDataGrid-cell": { whiteSpace: "normal", lineHeight: 1.3, alignItems: "flex-start" } }}
                />
              </Paper>
            </Stack>
          )}
          {tab === 2 && (
            <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: "1px solid #e5e7eb" }}>
              <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
                <Button variant="outlined" onClick={downloadTemplate}>Download template</Button>
                <Button variant="contained" component="label" startIcon={<UploadFileIcon />}>
                  Upload Excel
                  <input hidden type="file" accept=".xlsx,.xls,.csv" onChange={bulkUpload} />
                </Button>
              </Stack>
            </Paper>
          )}
        </Stack>
      </Box>
    </MenuPageShell>
  );
}
