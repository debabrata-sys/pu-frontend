import React, { useEffect, useMemo, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import * as XLSX from "xlsx";
import { Alert, Autocomplete, Box, Button, Checkbox, Chip, CircularProgress, Grid, IconButton, MenuItem, Paper, Stack, TextField, Tooltip, Typography } from "@mui/material";
import { Add, ArrowBack, Cancel, Delete, Download, Edit, Print, Refresh, Save, UploadFile } from "@mui/icons-material";
import { DataGrid, GridToolbar } from "@mui/x-data-grid";
import MenuPageShell from "./MenuPageShell";
import ep1 from "../api/ep1";
import global1 from "./global1";

const fields = ["academicyear", "program", "programcode", "examfee", "lastdate", "lastdatefine1", "lastdatefine1amount", "lastdatefine2", "lastdatefine2amount", "lastdatefine3", "lastdatefine3amount", "iafillingdate"];
const dateFields = ["lastdate", "lastdatefine1", "lastdatefine2", "lastdatefine3", "iafillingdate"];
const amountFields = ["examfee", "lastdatefine1amount", "lastdatefine2amount", "lastdatefine3amount"];
const labels = {
  academicyear: "Academic Year",
  program: "Program",
  programcode: "Program Code",
  examfee: "Exam Fee",
  lastdate: "Last Date",
  lastdatefine1: "Last Date Fine 1",
  lastdatefine1amount: "Fine 1 Amount",
  lastdatefine2: "Last Date Fine 2",
  lastdatefine2amount: "Fine 2 Amount",
  lastdatefine3: "Last Date Fine 3",
  lastdatefine3amount: "Fine 3 Amount",
  iafillingdate: "Internal Assessment Filling End Date"
};
const blank = { academicyear: "2026-27", program: "", programcode: "", examfee: "", lastdate: "", lastdatefine1: "", lastdatefine1amount: "", lastdatefine2: "", lastdatefine2amount: "", lastdatefine3: "", lastdatefine3amount: "", iafillingdate: "" };
const blankFilter = { field: "academicyear", value: "" };
const safe = (value) => String(value ?? "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#039;");
const unique = (values = []) => [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
const dateText = (value) => value ? new Date(value).toISOString().slice(0, 10) : "";
const displayDate = (value) => value ? new Date(value).toLocaleDateString("en-IN") : "";
const money = (value) => Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const normalizeInstitution = (institution = {}) => ({
  logo: institution.logolink || institution.logo || global1.logo || "",
  name: institution.institutionname || institution.name || global1.insname || "Institution",
  address: institution.address || global1.address || "",
  phone: institution.phone || global1.phone || "",
  email: institution.email || global1.email || ""
});
const normalizedHeader = (key) => String(key || "").toLowerCase().replace(/[^a-z0-9]/g, "");
const headerLookup = Object.fromEntries(fields.flatMap((field) => [[normalizedHeader(field), field], [normalizedHeader(labels[field]), field]]));

function SearchSelect({ label, value, options, onChange, getOptionLabel = (option) => option, disabled = false }) {
  return (
    <Autocomplete
      size="small"
      disabled={disabled}
      options={options || []}
      value={value || null}
      onChange={(_, nextValue) => onChange(nextValue || "")}
      getOptionLabel={(option) => getOptionLabel(option) || ""}
      isOptionEqualToValue={(option, selected) => JSON.stringify(option) === JSON.stringify(selected)}
      renderInput={(params) => <TextField {...params} label={label} />}
    />
  );
}

function printHtml({ title, institution, rows, notification = false }) {
  const inst = normalizeInstitution(institution);
  const today = new Date().toLocaleDateString("en-IN");
  const headerRow = rows[0] || {};
  const fineHeader = (label, amount) => amount || amount === 0 ? `${label}<br/>Rs. ${money(amount)} per form` : label;
  const bodyRows = rows.map((row, index) => notification ? `
    <tr>
      <td>${index + 1}</td>
      <td>${safe(row.program)}</td>
      <td>${safe(row.programcode)}</td>
      <td>${money(row.examfee)} per form</td>
      <td>${displayDate(row.lastdate)}</td>
      <td>${displayDate(row.lastdatefine1)}</td>
      <td>${displayDate(row.lastdatefine2)}</td>
      <td>${displayDate(row.lastdatefine3)}</td>
      <td>${displayDate(row.iafillingdate)}</td>
    </tr>
  ` : `
    <tr>
      <td>${index + 1}</td>
      ${fields.map((field) => `<td>${dateFields.includes(field) ? displayDate(row[field]) : amountFields.includes(field) ? money(row[field]) : safe(row[field])}</td>`).join("")}
    </tr>
  `).join("");
  const win = window.open("", "_blank", "width=1100,height=850");
  if (!win) return;
  win.document.write(`<!doctype html><html><head><title>${safe(title)}</title><style>
    @page{size:A4 portrait;margin:10mm}
    *{box-sizing:border-box}
    body{margin:0;background:#fff;color:#000;font-family:"Times New Roman",serif;font-size:12px}
    .toolbar{padding:10px;background:#f3f4f6;border-bottom:1px solid #bbb}
    .toolbar button{margin-right:8px;padding:7px 14px;border:1px solid #111;background:#fff;color:#000;cursor:pointer}
    .page{width:210mm;min-height:297mm;margin:0 auto;padding:12mm;background:#fff}
    .header{text-align:center;border-bottom:${notification ? "3px dotted #111" : "2px solid #111"};padding-bottom:8px;margin-bottom:12px;position:relative}
    .logo{max-height:68px;max-width:120px;object-fit:contain}
    h1{font-size:22px;letter-spacing:2px;margin:2px 0;text-transform:uppercase}
    h2{font-size:15px;margin:10px 0 4px;text-transform:uppercase}
    .sub{font-size:11px;line-height:1.35}
    .date{text-align:right;margin:6px 0 12px}
    .intro{text-align:center;margin:8px 0 12px}
    table{width:100%;border-collapse:collapse;font-size:11px;line-height:1.25}
    th,td{border:1px solid #111;padding:5px;text-align:left;vertical-align:top;word-break:break-word}
    th{font-weight:800;background:#f4f4f4}
    .note{margin-top:18px;font-size:11px;line-height:1.45}
    .note b{text-transform:uppercase}
    .sign{text-align:right;margin-top:18px;font-weight:800}
    @media print{.toolbar{display:none}.page{width:auto;min-height:auto;margin:0;padding:0}}
  </style></head><body>
    <div class="toolbar"><button onclick="window.print()">Print</button><button onclick="window.close()">Close</button></div>
    <div class="page">
      <div class="header">${inst.logo ? `<img class="logo" src="${safe(inst.logo)}" alt="Logo"/>` : ""}<h1>${safe(inst.name)}</h1><div class="sub">${safe(inst.address)}</div><div class="sub">${[inst.phone, inst.email].filter(Boolean).map(safe).join(" | ")}</div>${notification ? `<h2>Office of Controller of Examinations</h2><h2>Examination Form Filling Notification</h2>` : `<h2>${safe(title)}</h2>`}</div>
      ${notification ? `<div class="date">${today}</div><div class="intro">This is to notify that students shall submit/deposit the examination form and fee as per the following schedule.</div>` : ""}
      <table>
        <thead><tr>${notification ? `<th>S.No</th><th>Name of Program</th><th>Program Code</th><th>Examination Fee per Form</th><th>Last date of accepting examination form without late fees</th><th>${fineHeader("Last date with extra fees", headerRow.lastdatefine1amount)}</th><th>${fineHeader("Last date with special late fees", headerRow.lastdatefine2amount)}</th><th>${fineHeader("Last date with extra late fees", headerRow.lastdatefine3amount)}</th><th>Internal assessment filling end date</th>` : `<th>Sr</th>${fields.map((field) => `<th>${safe(labels[field])}</th>`).join("")}`}</tr></thead>
        <tbody>${bodyRows || `<tr><td colspan="${notification ? 9 : fields.length + 1}" style="text-align:center">No records found</td></tr>`}</tbody>
      </table>
      ${notification ? `<div class="note"><b>Note:</b><ol><li>Concerned students shall submit online mode and details as per examination schedule.</li><li>Students should complete payment and verification before the relevant last date.</li><li>Applications received after the scheduled dates will be processed as per applicable rules.</li></ol></div><div class="sign">Controller of Examinations</div>` : `<div class="sign">Authorized Signatory</div>`}
    </div>
  </body></html>`);
  win.document.close();
}

export default function ConductExamFormFillupDatesPage() {
  const [rows, setRows] = useState([]);
  const [options, setOptions] = useState({ academicyears: [], programs: [], fieldOptions: {} });
  const [institution, setInstitution] = useState({});
  const [form, setForm] = useState(blank);
  const [filters, setFilters] = useState([{ ...blankFilter }]);
  const [editingId, setEditingId] = useState("");
  const [selectedRows, setSelectedRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadOptions = async () => {
    const res = await ep1.get("/api/v2/conductexam/form-fillup-dates-options", { params: { colid: global1.colid } });
    setOptions(res.data || {});
    if (res.data?.institution) setInstitution(res.data.institution);
  };
  useEffect(() => { loadOptions(); }, []);

  const programValue = useMemo(() => (options.programs || []).find((row) => row.programcode === form.programcode) || null, [options.programs, form.programcode]);
  const filterFieldOptions = (field) => {
    if (field === "academicyear") return options.academicyears || [];
    if (field === "program") return unique([...(options.programs || []).map((row) => row.program), ...(options.fieldOptions?.program || [])]);
    if (field === "programcode") return unique([...(options.programs || []).map((row) => row.programcode), ...(options.fieldOptions?.programcode || [])]);
    return options.fieldOptions?.[field] || [];
  };

  const loadRows = async () => {
    try {
      setLoading(true);
      setError("");
      const activeFilters = filters.filter((filter) => filter.field && String(filter.value || "").trim());
      const params = { colid: global1.colid, filters: JSON.stringify(activeFilters) };
      const direct = Object.fromEntries(activeFilters.filter((filter) => ["academicyear", "program", "programcode"].includes(filter.field)).map((filter) => [filter.field, filter.value]));
      const res = await ep1.get("/api/v2/conductexam/form-fillup-dates", { params: { ...params, ...direct } });
      setRows(res.data?.data || []);
      if (res.data?.institution) setInstitution(res.data.institution);
      setSelectedRows([]);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load form fill-up dates");
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    try {
      setSaving(true);
      setError("");
      setMessage("");
      await ep1.post("/api/v2/conductexam/form-fillup-dates", { ...form, id: editingId, colid: global1.colid, user: global1.user });
      setMessage(editingId ? "Form fill-up dates updated" : "Form fill-up dates saved");
      setEditingId("");
      setForm(blank);
      await Promise.all([loadOptions(), loadRows()]);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to save form fill-up dates");
    } finally {
      setSaving(false);
    }
  };

  const deleteRows = async (ids) => {
    const targetIds = ids?.length ? ids : selectedRows;
    if (!targetIds.length) return setError("Select at least one row to delete");
    if (!window.confirm(`Delete ${targetIds.length} selected row(s)?`)) return;
    await ep1.post("/api/v2/conductexam/form-fillup-dates-delete", { colid: global1.colid, ids: targetIds });
    setMessage("Deleted selected rows");
    await Promise.all([loadOptions(), loadRows()]);
  };

  const editRow = (row) => {
    const next = { ...blank, ...row };
    dateFields.forEach((field) => { next[field] = dateText(next[field]); });
    setForm(next);
    setEditingId(row._id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const downloadTemplate = () => {
    const sample = fields.reduce((acc, field) => ({ ...acc, [labels[field]]: dateFields.includes(field) ? "2026-07-15" : amountFields.includes(field) ? 0 : "" }), {});
    sample["Academic Year"] = "2026-27";
    sample.Program = "BDS First Year";
    sample["Program Code"] = "BDS1";
    sample["Exam Fee"] = 2300;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([sample]), "Form Fillup Dates");
    XLSX.writeFile(wb, "exam_form_fillup_dates_template.xlsx");
  };

  const uploadBulk = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      setLoading(true);
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
      const items = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { defval: "" }).map((row, index) => {
        const item = { rowNumber: index + 2 };
        Object.entries(row).forEach(([key, value]) => {
          const field = headerLookup[normalizedHeader(key)];
          if (field) item[field] = value;
        });
        return item;
      });
      const res = await ep1.post("/api/v2/conductexam/form-fillup-dates-bulk", { colid: global1.colid, user: global1.user, items });
      setMessage(`Uploaded ${res.data?.saved || 0} row(s)`);
      if (res.data?.errors?.length) setError(`${res.data.errors.length} row(s) skipped. First error: ${res.data.errors[0].message}`);
      await Promise.all([loadOptions(), loadRows()]);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to upload file");
    } finally {
      setLoading(false);
    }
  };

  const rowsForPrint = selectedRows.length ? rows.filter((row) => selectedRows.includes(row._id)) : rows;
  const columns = [
    {
      field: "actions",
      headerName: "Actions",
      width: 110,
      renderCell: (params) => (
        <Stack direction="row">
          <Tooltip title="Edit"><IconButton size="small" onClick={() => editRow(params.row)}><Edit fontSize="small" /></IconButton></Tooltip>
          <Tooltip title="Delete"><IconButton size="small" color="error" onClick={() => deleteRows([params.row._id])}><Delete fontSize="small" /></IconButton></Tooltip>
        </Stack>
      )
    },
    ...fields.map((field) => ({ field, headerName: labels[field], width: field === "program" ? 220 : 150, valueGetter: dateFields.includes(field) ? ((params) => displayDate(params.row[field])) : amountFields.includes(field) ? ((params) => money(params.row[field])) : undefined }))
  ];

  return (
    <MenuPageShell title="Exam Form Fill-up Dates">
      <Box sx={{ p: 3, maxWidth: 1500, mx: "auto" }}>
        <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2} sx={{ mb: 2 }}>
          <Box>
            <Typography variant="h5" fontWeight={900}>Exam form fill-up dates</Typography>
            <Typography color="text.secondary">Configure programwise exam form fee and late-fee submission windows.</Typography>
          </Box>
          <Button component={RouterLink} to="/dashdashfacnew" variant="outlined" startIcon={<ArrowBack />}>Back</Button>
        </Stack>
        {message && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMessage("")}>{message}</Alert>}
        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}

        <Paper sx={{ p: 2.5, mb: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={2}><SearchSelect label="Academic year" value={form.academicyear} options={unique(["2026-27", ...(options.academicyears || [])])} onChange={(value) => setForm((prev) => ({ ...prev, academicyear: value }))} /></Grid>
            <Grid item xs={12} md={4}>
              <Autocomplete
                size="small"
                options={options.programs || []}
                value={programValue}
                onChange={(_, value) => setForm((prev) => ({ ...prev, program: value?.program || "", programcode: value?.programcode || "" }))}
                getOptionLabel={(option) => option ? `${option.program} (${option.programcode})` : ""}
                renderInput={(params) => <TextField {...params} label="Program" />}
              />
            </Grid>
            <Grid item xs={12} md={2}><TextField fullWidth size="small" label="Program code" value={form.programcode} InputProps={{ readOnly: true }} /></Grid>
            <Grid item xs={12} md={2}><TextField fullWidth size="small" type="number" label="Exam fee" value={form.examfee} onChange={(e) => setForm((prev) => ({ ...prev, examfee: e.target.value }))} /></Grid>
            {dateFields.map((field) => <Grid item xs={12} sm={6} md={2} key={field}><TextField fullWidth size="small" type="date" label={labels[field]} InputLabelProps={{ shrink: true }} value={form[field] || ""} onChange={(e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))} /></Grid>)}
            {["lastdatefine1amount", "lastdatefine2amount", "lastdatefine3amount"].map((field) => <Grid item xs={12} sm={6} md={2} key={field}><TextField fullWidth size="small" type="number" label={labels[field]} value={form[field] || ""} onChange={(e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))} /></Grid>)}
            <Grid item xs={12}>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                <Button variant="contained" startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <Save />} disabled={saving} onClick={save}>{editingId ? "Update" : "Save"}</Button>
                <Button variant="outlined" startIcon={<Cancel />} onClick={() => { setEditingId(""); setForm(blank); }}>Clear</Button>
              </Stack>
            </Grid>
          </Grid>
        </Paper>

        <Paper sx={{ p: 2.5, mb: 2 }}>
          <Typography fontWeight={800} sx={{ mb: 1 }}>Dynamic filters</Typography>
          <Stack spacing={1.25}>
            {filters.map((filter, index) => (
              <Grid container spacing={1.5} key={index} alignItems="center">
                <Grid item xs={12} md={3}><TextField select fullWidth size="small" label="Field" value={filter.field} onChange={(e) => setFilters((prev) => prev.map((item, i) => i === index ? { field: e.target.value, value: "" } : item))}>{fields.map((field) => <MenuItem key={field} value={field}>{labels[field]}</MenuItem>)}</TextField></Grid>
                <Grid item xs={12} md={5}><SearchSelect label="Value" value={filter.value} options={filterFieldOptions(filter.field)} onChange={(value) => setFilters((prev) => prev.map((item, i) => i === index ? { ...item, value } : item))} /></Grid>
                <Grid item xs={12} md={4}><Stack direction="row" spacing={1}><Button variant="outlined" startIcon={<Add />} onClick={() => setFilters((prev) => [...prev, { ...blankFilter }])}>Add</Button><Button variant="outlined" color="error" startIcon={<Delete />} disabled={filters.length === 1} onClick={() => setFilters((prev) => prev.filter((_, i) => i !== index))}>Remove</Button></Stack></Grid>
              </Grid>
            ))}
          </Stack>
          <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 2 }}>
            <Button variant="contained" startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <Refresh />} disabled={loading} onClick={loadRows}>Load</Button>
            <Button variant="outlined" startIcon={<Print />} disabled={!rows.length} onClick={() => printHtml({ title: "Exam Form Fill-up Dates", institution, rows: rowsForPrint })}>Print preview</Button>
            <Button variant="outlined" startIcon={<Print />} disabled={!rows.length} onClick={() => printHtml({ title: "Examination Form Filling Notification", institution, rows: rowsForPrint, notification: true })}>Notification print</Button>
            <Button variant="outlined" startIcon={<Download />} onClick={downloadTemplate}>Template</Button>
            <Button component="label" variant="outlined" startIcon={<UploadFile />} disabled={loading}>Bulk upload<input hidden type="file" accept=".xlsx,.xls,.csv" onChange={uploadBulk} /></Button>
            <Button variant="outlined" color="error" startIcon={<Delete />} disabled={!selectedRows.length} onClick={() => deleteRows()}>Bulk delete</Button>
            {!!selectedRows.length && <Chip label={`${selectedRows.length} selected`} />}
          </Stack>
        </Paper>

        <Paper sx={{ p: 1, height: 620 }}>
          <DataGrid
            rows={rows}
            columns={columns}
            getRowId={(row) => row._id}
            loading={loading}
            checkboxSelection
            rowSelectionModel={selectedRows}
            onRowSelectionModelChange={(model) => setSelectedRows(model)}
            slots={{ toolbar: GridToolbar }}
            slotProps={{ toolbar: { showQuickFilter: true, csvOptions: { fileName: "exam_form_fillup_dates" } } }}
            pageSizeOptions={[25, 50, 100]}
            initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
            disableRowSelectionOnClick
            sx={{ "& .MuiDataGrid-cell": { whiteSpace: "normal", lineHeight: 1.35, py: 1, alignItems: "flex-start" } }}
          />
        </Paper>
      </Box>
    </MenuPageShell>
  );
}
