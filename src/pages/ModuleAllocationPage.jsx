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
  ListItemText,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography
} from "@mui/material";
import { Add, Cancel, Delete, Edit, FileDownload, Print, Refresh, Save, UploadFile } from "@mui/icons-material";
import { DataGrid, GridToolbar } from "@mui/x-data-grid";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip as ChartTooltip, XAxis, YAxis } from "recharts";
import * as XLSX from "xlsx";
import MenuPageShell from "./MenuPageShell";
import ep1 from "../api/ep1";
import global1 from "./global1";

const colors = ["#2563eb", "#16a34a", "#f97316", "#7c3aed", "#dc2626", "#0891b2", "#ca8a04", "#4f46e5"];
const text = (value) => String(value || "").trim();
const uniqueSorted = (values = []) => [...new Set(values.map(text).filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
const makeFilter = () => ({ id: `${Date.now()}-${Math.random()}`, field: "academicyear", value: "" });

const blankForm = {
  order: "",
  academicyear: "",
  regulation: "",
  program: "",
  programcode: "",
  course: "",
  coursecode: "",
  facultyname: "",
  facultyemail: "",
  facultydepartment: "",
  modules: [],
  topics: [],
  weightage: "",
  refbook: "",
  description: "",
  status: "Active",
  workloadid: ""
};

const fieldLabels = {
  order: "Order",
  academicyear: "Academic Year",
  regulation: "Regulation",
  program: "Program",
  programcode: "Program Code",
  course: "Course",
  coursecode: "Course Code",
  facultyname: "Faculty",
  facultyemail: "Faculty Email",
  facultydepartment: "Department",
  module: "Module",
  topic: "Topic",
  weightage: "Weightage",
  refbook: "Ref Book",
  description: "Description",
  status: "Status"
};

const filterFields = [
  "academicyear",
  "regulation",
  "program",
  "programcode",
  "course",
  "coursecode",
  "facultyname",
  "facultyemail",
  "facultydepartment",
  "module",
  "topic",
  "status"
];

const normalizeHeader = (value) => text(value).toLowerCase().replace(/[^a-z0-9]/g, "");
const headerMap = {
  order: "order",
  academicyear: "academicyear",
  regulation: "regulation",
  program: "program",
  programcode: "programcode",
  course: "course",
  coursecode: "coursecode",
  faculty: "facultyname",
  facultyname: "facultyname",
  facultyemail: "facultyemail",
  department: "facultydepartment",
  facultydepartment: "facultydepartment",
  module: "modules",
  modules: "modules",
  topic: "topics",
  topics: "topics",
  weightage: "weightage",
  refbook: "refbook",
  referencebook: "refbook",
  description: "description",
  status: "status"
};

const splitList = (value) => Array.isArray(value) ? value : text(value).split(",").map(text).filter(Boolean);

function InstitutionPrintHeader({ institution, title }) {
  return (
    <Stack alignItems="center" spacing={0.5} sx={{ textAlign: "center", pb: 1.5, borderBottom: "2px solid #111827", mb: 2 }}>
      {institution?.logolink && <Box component="img" src={institution.logolink} alt="Logo" sx={{ width: 68, height: 68, objectFit: "contain" }} />}
      <Typography variant="h6" fontWeight={900}>{institution?.institutionname || institution?.insname || global1.insname || "Institution"}</Typography>
      <Typography variant="body2">{institution?.address || ""}</Typography>
      <Typography variant="subtitle1" fontWeight={900}>{title}</Typography>
    </Stack>
  );
}

function MultiAutocomplete({ label, options, value, onChange, disabled, getOptionLabel = (item) => item }) {
  return (
    <Autocomplete
      multiple
      disableCloseOnSelect
      options={options}
      value={value || []}
      disabled={disabled}
      onChange={(_, next) => onChange(next)}
      getOptionLabel={getOptionLabel}
      isOptionEqualToValue={(option, val) => getOptionLabel(option) === getOptionLabel(val)}
      renderOption={(props, option, { selected }) => (
        <li {...props}>
          <Checkbox sx={{ mr: 1 }} checked={selected} />
          <ListItemText primary={getOptionLabel(option)} />
        </li>
      )}
      renderInput={(params) => <TextField {...params} label={label} />}
    />
  );
}

function useInstitution() {
  const [institution, setInstitution] = useState(null);
  useEffect(() => {
    ep1.get("/vins", { params: { colid: global1.colid } }).then((res) => setInstitution(res.data || null)).catch(() => setInstitution(null));
  }, []);
  return institution;
}

export default function ModuleAllocationPage() {
  const institution = useInstitution();
  const [rows, setRows] = useState([]);
  const [options, setOptions] = useState({ workloads: [], syllabus: [] });
  const [form, setForm] = useState(blankForm);
  const [editingId, setEditingId] = useState("");
  const [selectedRowIds, setSelectedRowIds] = useState([]);
  const [uploadRows, setUploadRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadRows = async () => {
    try {
      setLoading(true);
      const res = await ep1.get("/api/v2/moduleallocation", { params: { colid: global1.colid } });
      setRows(res.data?.data || []);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load module allocations");
    } finally {
      setLoading(false);
    }
  };

  const loadOptions = async (source = form) => {
    try {
      const params = { colid: global1.colid };
      ["academicyear", "regulation", "program", "programcode", "course", "coursecode"].forEach((field) => {
        if (source[field]) params[field] = source[field];
      });
      const res = await ep1.get("/api/v2/moduleallocation/options", { params });
      setOptions(res.data || { workloads: [], syllabus: [] });
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load dropdown options");
    }
  };

  useEffect(() => {
    loadRows();
    loadOptions(blankForm);
  }, []);

  const selectedRows = useMemo(() => rows.filter((row) => selectedRowIds.includes(row._id)), [rows, selectedRowIds]);
  const moduleOptions = useMemo(() => uniqueSorted((options.syllabus || []).map((row) => row.module)), [options.syllabus]);
  const topicOptions = useMemo(() => {
    const selected = new Set(form.modules || []);
    const source = selected.size ? (options.syllabus || []).filter((row) => selected.has(row.module)) : (options.syllabus || []);
    return uniqueSorted(source.map((row) => row.syllabus));
  }, [options.syllabus, form.modules]);

  const selectWorkload = async (row) => {
    const next = {
      ...blankForm,
      academicyear: row?.academicyear || "",
      regulation: row?.regulation || "",
      program: row?.program || "",
      programcode: row?.programcode || "",
      course: row?.course || "",
      coursecode: row?.coursecode || "",
      facultyname: row?.facultyname || "",
      facultyemail: row?.facultyemail || "",
      facultydepartment: row?.facultydepartment || "",
      workloadid: row?._id || "",
      status: "Active"
    };
    setForm(next);
    await loadOptions(next);
  };

  const resetForm = () => {
    setForm(blankForm);
    setEditingId("");
    loadOptions(blankForm);
  };

  const save = async (event) => {
    event.preventDefault();
    try {
      setLoading(true);
      setError("");
      await ep1.post("/api/v2/moduleallocation", { ...form, id: editingId, colid: global1.colid, user: global1.user, name: global1.name });
      setMessage(editingId ? "Module allocation updated" : "Module allocation saved");
      resetForm();
      await loadRows();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to save module allocation");
    } finally {
      setLoading(false);
    }
  };

  const editRow = async (row) => {
    const next = {
      ...blankForm,
      ...row,
      modules: splitList(row.modules?.length ? row.modules : row.module),
      topics: splitList(row.topics?.length ? row.topics : row.topic),
      order: row.order ?? "",
      weightage: row.weightage ?? ""
    };
    setEditingId(row._id);
    setForm(next);
    await loadOptions(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteRows = async (ids) => {
    if (!ids.length) return setError("Select at least one row");
    if (!window.confirm(`Delete ${ids.length} module allocation row(s)?`)) return;
    try {
      setLoading(true);
      const res = await ep1.post("/api/v2/moduleallocation/delete", { ids, colid: global1.colid });
      setMessage(`Deleted ${res.data?.deleted || ids.length} row(s)`);
      setSelectedRowIds([]);
      await loadRows();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to delete module allocation");
    } finally {
      setLoading(false);
    }
  };

  const buildTemplate = () => {
    const workload = options.workloads?.[0] || {};
    const syllabus = options.syllabus?.[0] || {};
    const ws = XLSX.utils.json_to_sheet([{
      Order: 1,
      "Academic Year": workload.academicyear || "2026-27",
      Regulation: workload.regulation || "",
      Program: workload.program || "",
      "Program Code": workload.programcode || "",
      Course: workload.course || "",
      "Course Code": workload.coursecode || "",
      Faculty: workload.facultyname || "",
      "Faculty Email": workload.facultyemail || "",
      Department: workload.facultydepartment || "",
      Modules: syllabus.module || "Module 1",
      Topics: syllabus.syllabus || "Topic 1",
      Weightage: 20,
      "Ref Book": "Reference book",
      Description: "Module allocation description",
      Status: "Active"
    }]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Module Allocation");
    XLSX.writeFile(wb, "Module_Allocation_Template.xlsx");
  };

  const readExcel = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(new Uint8Array(e.target.result), { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const parsed = XLSX.utils.sheet_to_json(ws, { defval: "" }).map((row, index) => {
          const item = { rowNumber: index + 2 };
          Object.entries(row).forEach(([header, value]) => {
            const mapped = headerMap[normalizeHeader(header)];
            if (!mapped) return;
            item[mapped] = ["modules", "topics"].includes(mapped) ? splitList(value) : value;
          });
          return item;
        });
        setUploadRows(parsed);
        setMessage(`${parsed.length} rows ready for upload`);
      } catch (err) {
        setError("Unable to read Excel file");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const uploadExcelRows = async () => {
    if (!uploadRows.length) return setError("Choose an Excel file first");
    try {
      setLoading(true);
      const res = await ep1.post("/api/v2/moduleallocation/bulkupload", { colid: global1.colid, user: global1.user, name: global1.name, rows: uploadRows });
      const errors = res.data?.errors || [];
      setMessage(`Inserted ${res.data?.inserted || 0} row(s)${errors.length ? `, ${errors.length} error(s)` : ""}`);
      setUploadRows([]);
      await loadRows();
    } catch (err) {
      setError(err.response?.data?.message || "Bulk upload failed");
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      field: "actions",
      headerName: "Actions",
      width: 120,
      sortable: false,
      renderCell: (params) => (
        <Stack direction="row" spacing={0.5}>
          <Tooltip title="Edit"><Button size="small" onClick={() => editRow(params.row)}><Edit fontSize="small" /></Button></Tooltip>
          <Tooltip title="Delete"><Button size="small" color="error" onClick={() => deleteRows([params.row._id])}><Delete fontSize="small" /></Button></Tooltip>
        </Stack>
      )
    },
    { field: "order", headerName: "Order", width: 90, type: "number" },
    { field: "academicyear", headerName: "Academic Year", width: 140 },
    { field: "regulation", headerName: "Regulation", width: 140 },
    { field: "program", headerName: "Program", width: 180 },
    { field: "programcode", headerName: "Program Code", width: 140 },
    { field: "course", headerName: "Course", width: 220 },
    { field: "coursecode", headerName: "Course Code", width: 140 },
    { field: "facultyname", headerName: "Faculty", width: 180 },
    { field: "facultyemail", headerName: "Faculty Email", width: 220 },
    { field: "module", headerName: "Modules", width: 220 },
    { field: "topic", headerName: "Topics", width: 320 },
    { field: "weightage", headerName: "Weightage", width: 120, type: "number" },
    { field: "refbook", headerName: "Ref Book", width: 200 },
    { field: "description", headerName: "Description", width: 280 },
    { field: "status", headerName: "Status", width: 110 }
  ];

  return (
    <MenuPageShell title="Module Allocation">
      <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: "#f6f7fb", minHeight: "100vh" }}>
        <style>{`
          .module-allocation-grid .MuiDataGrid-cell { white-space: normal !important; line-height: 1.35 !important; align-items: flex-start !important; padding-top: 8px !important; padding-bottom: 8px !important; }
          @media print {
            @page { size: A4 portrait; margin: 10mm; }
            body * { visibility: hidden; }
            #module-allocation-print, #module-allocation-print * { visibility: visible; }
            #module-allocation-print { position: absolute; left: 0; top: 0; width: 190mm; box-shadow: none !important; border: 0 !important; }
            .no-print { display: none !important; }
          }
        `}</style>
        <Stack spacing={2}>
          <Paper className="no-print" elevation={0} sx={{ p: 2.5, borderRadius: 3, border: "1px solid #e5e7eb" }}>
            <Typography variant="h4" fontWeight={950}>Module Allocation</Typography>
            <Typography color="text.secondary">Allocate syllabus modules and topics to faculty from workload assignment.</Typography>
          </Paper>
          {message && <Alert className="no-print" severity="success" onClose={() => setMessage("")}>{message}</Alert>}
          {error && <Alert className="no-print" severity="error" onClose={() => setError("")}>{error}</Alert>}

          <Paper className="no-print" component="form" onSubmit={save} elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #e5e7eb" }}>
            <Grid container spacing={1.5}>
              <Grid item xs={12} md={6}>
                <Autocomplete
                  options={options.workloads || []}
                  value={(options.workloads || []).find((row) => row._id === form.workloadid) || null}
                  onChange={(_, value) => selectWorkload(value)}
                  getOptionLabel={(row) => row ? `${row.academicyear} | ${row.programcode} | ${row.coursecode} - ${row.course} | ${row.facultyname || row.facultyemail}` : ""}
                  renderInput={(params) => <TextField {...params} required label="Select workload / course allocation" />}
                />
              </Grid>
              <Grid item xs={12} md={2}><TextField fullWidth required type="number" label="Order" value={form.order} onChange={(e) => setForm((p) => ({ ...p, order: e.target.value }))} /></Grid>
              <Grid item xs={12} md={2}><TextField fullWidth label="Academic Year" value={form.academicyear} InputProps={{ readOnly: true }} /></Grid>
              <Grid item xs={12} md={2}><TextField fullWidth label="Regulation" value={form.regulation} InputProps={{ readOnly: true }} /></Grid>
              <Grid item xs={12} md={3}><TextField fullWidth label="Program" value={form.program} InputProps={{ readOnly: true }} /></Grid>
              <Grid item xs={12} md={2}><TextField fullWidth label="Program Code" value={form.programcode} InputProps={{ readOnly: true }} /></Grid>
              <Grid item xs={12} md={3}><TextField fullWidth label="Course" value={form.course} InputProps={{ readOnly: true }} /></Grid>
              <Grid item xs={12} md={2}><TextField fullWidth label="Course Code" value={form.coursecode} InputProps={{ readOnly: true }} /></Grid>
              <Grid item xs={12} md={3}><TextField fullWidth label="Faculty" value={form.facultyname} InputProps={{ readOnly: true }} /></Grid>
              <Grid item xs={12} md={3}><TextField fullWidth label="Faculty Email" value={form.facultyemail} InputProps={{ readOnly: true }} /></Grid>
              <Grid item xs={12} md={3}>
                <MultiAutocomplete
                  label="Modules"
                  options={moduleOptions}
                  value={form.modules}
                  disabled={!form.coursecode}
                  onChange={(value) => {
                    const available = new Set((options.syllabus || []).filter((row) => value.includes(row.module)).map((row) => row.syllabus));
                    setForm((p) => ({ ...p, modules: value, topics: p.topics.filter((topic) => available.has(topic)) }));
                  }}
                />
              </Grid>
              <Grid item xs={12} md={5}>
                <MultiAutocomplete
                  label="Topics"
                  options={topicOptions}
                  value={form.topics}
                  disabled={!form.modules.length}
                  onChange={(value) => setForm((p) => ({ ...p, topics: value }))}
                />
              </Grid>
              <Grid item xs={12} md={2}><TextField fullWidth type="number" label="Weightage" value={form.weightage} onChange={(e) => setForm((p) => ({ ...p, weightage: e.target.value }))} /></Grid>
              <Grid item xs={12} md={4}><TextField fullWidth label="Ref book" value={form.refbook} onChange={(e) => setForm((p) => ({ ...p, refbook: e.target.value }))} /></Grid>
              <Grid item xs={12} md={8}><TextField fullWidth multiline minRows={2} label="Description" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} /></Grid>
              <Grid item xs={12}>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  <Button type="submit" variant="contained" startIcon={<Save />} disabled={loading}>{editingId ? "Update" : "Save"}</Button>
                  <Button variant="outlined" startIcon={<Cancel />} onClick={resetForm}>Clear</Button>
                  <Button variant="outlined" startIcon={<Refresh />} onClick={() => { loadRows(); loadOptions(form); }}>Reload</Button>
                </Stack>
              </Grid>
            </Grid>
          </Paper>

          <Paper className="no-print" elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #e5e7eb" }}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <Chip label={`${rows.length} records`} />
              <Chip color={selectedRows.length ? "primary" : "default"} label={`${selectedRows.length} selected`} />
              <Button variant="outlined" startIcon={<FileDownload />} onClick={buildTemplate}>Template</Button>
              <Button variant="outlined" component="label" startIcon={<UploadFile />}>Choose Excel<input hidden type="file" accept=".xlsx,.xls,.csv" onChange={readExcel} /></Button>
              <Button variant="contained" startIcon={<Add />} disabled={!uploadRows.length || loading} onClick={uploadExcelRows}>Upload {uploadRows.length ? `(${uploadRows.length})` : ""}</Button>
              <Button variant="outlined" color="error" startIcon={<Delete />} disabled={!selectedRows.length || loading} onClick={() => deleteRows(selectedRows.map((row) => row._id))}>Bulk delete</Button>
              <Button variant="outlined" startIcon={<Print />} onClick={() => window.print()} disabled={!rows.length}>Print preview</Button>
            </Stack>
          </Paper>

          <Paper className="no-print module-allocation-grid" elevation={0} sx={{ p: 1, borderRadius: 3, border: "1px solid #e5e7eb" }}>
            <DataGrid
              rows={rows.map((row) => ({ ...row, id: row._id }))}
              columns={columns}
              loading={loading}
              checkboxSelection
              rowSelectionModel={selectedRowIds}
              onRowSelectionModelChange={(model) => setSelectedRowIds(Array.from(model))}
              disableRowSelectionOnClick
              getRowHeight={() => "auto"}
              autoHeight
              slots={{ toolbar: GridToolbar }}
              slotProps={{ toolbar: { showQuickFilter: true, csvOptions: { fileName: "module_allocation" } } }}
              pageSizeOptions={[10, 25, 50, 100]}
              initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 } } }}
              sx={{ minWidth: 2300 }}
            />
          </Paper>

          <Paper id="module-allocation-print" sx={{ maxWidth: "210mm", mx: "auto", p: 3, bgcolor: "#fff", color: "#111827", border: "1px solid #d1d5db" }}>
            <InstitutionPrintHeader institution={institution} title="Module Allocation" />
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
              <thead>
                <tr>{["Order", "Academic Year", "Program", "Course", "Faculty", "Modules", "Topics", "Weightage", "Ref Book"].map((head) => <th key={head} style={{ border: "1px solid #111", padding: 5, background: "#f3f4f6", textAlign: "left" }}>{head}</th>)}</tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row._id}>
                    {[row.order, row.academicyear, `${row.program || ""} ${row.programcode || ""}`, `${row.course || ""} ${row.coursecode || ""}`, row.facultyname, row.module, row.topic, row.weightage, row.refbook].map((value, index) => (
                      <td key={`${row._id}-${index}`} style={{ border: "1px solid #111", padding: 5, verticalAlign: "top" }}>{value || "-"}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </Paper>
        </Stack>
      </Box>
    </MenuPageShell>
  );
}

export function ModuleAllocationReportPage() {
  const institution = useInstitution();
  const [rows, setRows] = useState([]);
  const [report, setReport] = useState({ summary: {}, charts: {} });
  const [filters, setFilters] = useState([makeFilter()]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadReport = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await ep1.get("/api/v2/moduleallocation/report", { params: { colid: global1.colid } });
      setRows(res.data?.data || []);
      setReport({ summary: res.data?.summary || {}, charts: res.data?.charts || {} });
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load module allocation report");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadReport(); }, []);

  const valueOptions = (field) => uniqueSorted(rows.flatMap((row) => {
    if (field === "module") return row.modules || splitList(row.module);
    if (field === "topic") return row.topics || splitList(row.topic);
    return row[field];
  }));

  const filteredRows = useMemo(() => rows.filter((row) => filters.every((filter) => {
    if (!filter.field || !filter.value) return true;
    if (filter.field === "module") return (row.modules || splitList(row.module)).includes(filter.value);
    if (filter.field === "topic") return (row.topics || splitList(row.topic)).includes(filter.value);
    return text(row[filter.field]).toLowerCase() === text(filter.value).toLowerCase();
  })), [rows, filters]);

  const computed = useMemo(() => {
    const countBy = (field) => {
      const map = new Map();
      filteredRows.forEach((row) => {
        const key = text(row[field]) || "Not specified";
        map.set(key, (map.get(key) || 0) + 1);
      });
      return [...map.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 12);
    };
    return {
      summary: {
        allocations: filteredRows.length,
        totalWeightage: filteredRows.reduce((sum, row) => sum + (Number(row.weightage) || 0), 0),
        faculties: uniqueSorted(filteredRows.map((row) => row.facultyemail)).length,
        courses: uniqueSorted(filteredRows.map((row) => row.coursecode)).length,
        modules: uniqueSorted(filteredRows.flatMap((row) => row.modules || splitList(row.module))).length
      },
      charts: {
        faculty: countBy("facultyname"),
        course: countBy("coursecode"),
        program: countBy("programcode")
      }
    };
  }, [filteredRows]);

  const updateFilter = (id, key, value) => {
    setFilters((prev) => prev.map((item) => item.id === id ? { ...item, [key]: value, ...(key === "field" ? { value: "" } : {}) } : item));
  };
  const removeFilter = (id) => setFilters((prev) => prev.length === 1 ? [makeFilter()] : prev.filter((item) => item.id !== id));

  const columns = [
    { field: "order", headerName: "Order", width: 90 },
    { field: "academicyear", headerName: "Academic Year", width: 140 },
    { field: "program", headerName: "Program", width: 170 },
    { field: "programcode", headerName: "Program Code", width: 140 },
    { field: "course", headerName: "Course", width: 220 },
    { field: "coursecode", headerName: "Course Code", width: 140 },
    { field: "facultyname", headerName: "Faculty", width: 180 },
    { field: "module", headerName: "Modules", width: 220 },
    { field: "topic", headerName: "Topics", width: 340 },
    { field: "weightage", headerName: "Weightage", width: 120 },
    { field: "refbook", headerName: "Ref Book", width: 200 },
    { field: "description", headerName: "Description", width: 300 }
  ];

  const summary = computed.summary || report.summary || {};
  const charts = computed.charts || report.charts || {};

  return (
    <MenuPageShell title="Module Allocation Report">
      <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: "#f6f7fb", minHeight: "100vh" }}>
        <style>{`
          .module-report-grid .MuiDataGrid-cell { white-space: normal !important; line-height: 1.35 !important; align-items: flex-start !important; padding-top: 8px !important; padding-bottom: 8px !important; }
          @media print {
            @page { size: A4 portrait; margin: 10mm; }
            body * { visibility: hidden; }
            #module-allocation-report-print, #module-allocation-report-print * { visibility: visible; }
            #module-allocation-report-print { position: absolute; left: 0; top: 0; width: 190mm; box-shadow: none !important; border: 0 !important; }
            .no-print { display: none !important; }
          }
        `}</style>
        <Stack spacing={2}>
          <Paper className="no-print" elevation={0} sx={{ p: 2.5, borderRadius: 3, border: "1px solid #e5e7eb" }}>
            <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1}>
              <Box>
                <Typography variant="h4" fontWeight={950}>Module Allocation Report</Typography>
                <Typography color="text.secondary">Dynamic filters, charts, summary cards and printable view.</Typography>
              </Box>
              <Stack direction="row" spacing={1}>
                <Button variant="outlined" startIcon={<Refresh />} onClick={loadReport}>Reload</Button>
                <Button variant="contained" startIcon={<Print />} onClick={() => window.print()}>Print</Button>
              </Stack>
            </Stack>
          </Paper>
          {error && <Alert className="no-print" severity="error" onClose={() => setError("")}>{error}</Alert>}

          <Paper className="no-print" elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #e5e7eb" }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
              <Typography fontWeight={900}>Dynamic Filters</Typography>
              <Button variant="contained" startIcon={<Add />} onClick={() => setFilters((prev) => [...prev, makeFilter()])}>Add filter</Button>
            </Stack>
            <Grid container spacing={1.5}>
              {filters.map((filter) => (
                <React.Fragment key={filter.id}>
                  <Grid item xs={12} md={4}>
                    <Autocomplete
                      options={filterFields}
                      value={filter.field}
                      onChange={(_, value) => updateFilter(filter.id, "field", value || "")}
                      getOptionLabel={(field) => fieldLabels[field] || field}
                      renderInput={(params) => <TextField {...params} label="Field" />}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Autocomplete
                      options={valueOptions(filter.field)}
                      value={filter.value || null}
                      onChange={(_, value) => updateFilter(filter.id, "value", value || "")}
                      renderInput={(params) => <TextField {...params} label="Value" />}
                    />
                  </Grid>
                  <Grid item xs={12} md={2}><Button fullWidth color="error" variant="outlined" startIcon={<Delete />} sx={{ height: 56 }} onClick={() => removeFilter(filter.id)}>Remove</Button></Grid>
                </React.Fragment>
              ))}
            </Grid>
          </Paper>

          <Grid container spacing={2}>
            {[
              ["Allocations", summary.allocations || 0],
              ["Total Weightage", summary.totalWeightage || 0],
              ["Faculties", summary.faculties || 0],
              ["Courses", summary.courses || 0],
              ["Modules", summary.modules || 0]
            ].map(([label, value]) => (
              <Grid item xs={12} md={2.4} key={label}>
                <Card elevation={0} sx={{ border: "1px solid #e5e7eb", borderRadius: 3, background: "linear-gradient(135deg,#ffffff,#eef6ff)" }}>
                  <CardContent>
                    <Typography color="text.secondary">{label}</Typography>
                    <Typography variant="h4" fontWeight={950}>{value}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          <Grid className="no-print" container spacing={2}>
            <Grid item xs={12} md={7}>
              <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #e5e7eb", height: 360 }}>
                <Typography fontWeight={900} sx={{ mb: 1 }}>Course wise allocations</Typography>
                <ResponsiveContainer width="100%" height="88%">
                  <BarChart data={charts.course || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis allowDecimals={false} />
                    <ChartTooltip />
                    <Legend />
                    <Bar dataKey="value" name="Allocations" fill="#2563eb" />
                  </BarChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>
            <Grid item xs={12} md={5}>
              <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #e5e7eb", height: 360 }}>
                <Typography fontWeight={900} sx={{ mb: 1 }}>Program distribution</Typography>
                <ResponsiveContainer width="100%" height="88%">
                  <PieChart>
                    <Pie data={charts.program || []} dataKey="value" nameKey="name" outerRadius={105} label>
                      {(charts.program || []).map((entry, index) => <Cell key={entry.name} fill={colors[index % colors.length]} />)}
                    </Pie>
                    <ChartTooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>
          </Grid>

          <Paper className="no-print module-report-grid" elevation={0} sx={{ p: 1, borderRadius: 3, border: "1px solid #e5e7eb" }}>
            <DataGrid
              rows={filteredRows.map((row) => ({ ...row, id: row._id }))}
              columns={columns}
              loading={loading}
              getRowHeight={() => "auto"}
              autoHeight
              slots={{ toolbar: GridToolbar }}
              slotProps={{ toolbar: { showQuickFilter: true, csvOptions: { fileName: "module_allocation_report" } } }}
              pageSizeOptions={[10, 25, 50, 100]}
              initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 } } }}
              sx={{ minWidth: 2100 }}
            />
          </Paper>

          <Paper id="module-allocation-report-print" sx={{ maxWidth: "210mm", mx: "auto", p: 3, bgcolor: "#fff", color: "#111827", border: "1px solid #d1d5db" }}>
            <InstitutionPrintHeader institution={institution} title="Module Allocation Report" />
            <Grid container spacing={1} sx={{ mb: 2 }}>
              {[
                ["Allocations", summary.allocations || 0],
                ["Total Weightage", summary.totalWeightage || 0],
                ["Faculties", summary.faculties || 0],
                ["Courses", summary.courses || 0]
              ].map(([label, value]) => (
                <Grid item xs={3} key={label}><Chip label={`${label}: ${value}`} sx={{ width: "100%" }} /></Grid>
              ))}
            </Grid>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 9.5 }}>
              <thead><tr>{["Order", "Year", "Program", "Course", "Faculty", "Modules", "Topics", "Weightage"].map((head) => <th key={head} style={{ border: "1px solid #111", padding: 5, background: "#f3f4f6", textAlign: "left" }}>{head}</th>)}</tr></thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr key={row._id}>
                    {[row.order, row.academicyear, `${row.program || ""} ${row.programcode || ""}`, `${row.course || ""} ${row.coursecode || ""}`, row.facultyname, row.module, row.topic, row.weightage].map((value, index) => (
                      <td key={`${row._id}-${index}`} style={{ border: "1px solid #111", padding: 5, verticalAlign: "top" }}>{value || "-"}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </Paper>
        </Stack>
      </Box>
    </MenuPageShell>
  );
}
