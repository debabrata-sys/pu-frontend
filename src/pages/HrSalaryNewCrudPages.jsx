import React, { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import {
  Alert,
  Box,
  Button,
  Grid,
  LinearProgress,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import { DataGrid, GridActionsCellItem, GridToolbar } from "@mui/x-data-grid";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import PrintIcon from "@mui/icons-material/Print";
import SaveIcon from "@mui/icons-material/Save";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import MenuPageShell from "./MenuPageShell";
import ep1 from "../api/ep1";
import global1 from "./global1";

const text = (value) => String(value ?? "").trim();
const numberFields = ["amount"];
const dateFields = ["effectivedate", "applieddate", "duedate"];

const salaryStructureFields = ["structure", "structureid", "employee", "empid", "component", "amount", "type", "level", "effectivedate", "applieddate", "status1", "comments"];
const dueSalaryFields = ["year", "month", "duedate", "structure", "structureid", "employee", "empid", "component", "amount", "type", "level", "paystatus", "status1", "comments"];

const labels = {
  structureid: "Structure ID",
  empid: "Employee ID / Email",
  effectivedate: "Effective Date",
  applieddate: "Applied Date",
  duedate: "Due Date",
  status1: "Status",
  paystatus: "Payment Status"
};

function blank(fields) {
  return Object.fromEntries(fields.map((field) => [field, ""]));
}

function formatDate(value) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

async function loadInstitution() {
  try {
    const res = await ep1.get("/api/v2/hr-advanced/institution", { params: { colid: global1.colid } });
    return res.data?.data || {};
  } catch {
    return {};
  }
}

function printRows(title, rows, fields, institution = {}) {
  const logo = institution.logolink || institution.logo || "";
  const name = institution.institutionname || institution.name || global1.institution || "Institution";
  const address = institution.address || "";
  const htmlRows = rows.map((row, index) => `<tr><td>${index + 1}</td>${fields.map((field) => `<td>${text(row[field]) || "-"}</td>`).join("")}</tr>`).join("");
  const win = window.open("", "_blank", "width=1100,height=800");
  if (!win) return;
  win.document.write(`<!doctype html><html><head><title>${title}</title><style>
    @page{size:A4 landscape;margin:10mm}body{font-family:Arial,sans-serif;color:#000;background:#fff;margin:0}.toolbar{padding:10px;text-align:right}.print{padding:18px}.head{text-align:center;border-bottom:2px solid #000;padding-bottom:10px;margin-bottom:14px}.logo{max-height:60px;float:left}h1{font-size:18px;margin:8px 0 0;text-transform:uppercase}table{width:100%;border-collapse:collapse;font-size:10.5px}th,td{border:1px solid #000;padding:5px;text-align:left;vertical-align:top;white-space:normal;overflow-wrap:anywhere}th{font-weight:800}.sign{display:grid;grid-template-columns:repeat(3,1fr);gap:32px;margin-top:36px;text-align:center}.sign div{border-top:1px solid #000;padding-top:6px}@media print{.toolbar{display:none}tr{break-inside:avoid}}
  </style></head><body><div class="toolbar"><button onclick="window.print()">Print</button><button onclick="window.close()">Close</button></div><div class="print"><div class="head">${logo ? `<img class="logo" src="${logo}" />` : ""}<div style="font-size:22px;font-weight:900">${name}</div><div>${address}</div><h1>${title}</h1></div><table><thead><tr><th>Sr</th>${fields.map((field) => `<th>${labels[field] || field}</th>`).join("")}</tr></thead><tbody>${htmlRows || `<tr><td colspan="${fields.length + 1}" style="text-align:center">No data</td></tr>`}</tbody></table><div class="sign"><div>Prepared By</div><div>Checked By</div><div>Approved By</div></div></div></body></html>`);
  win.document.close();
}

function SalaryCrudPage({ title, subtitle, endpoint, fields }) {
  const [rows, setRows] = useState([]);
  const [options, setOptions] = useState({});
  const [form, setForm] = useState(blank(fields));
  const [filters, setFilters] = useState(blank(fields));
  const [editingId, setEditingId] = useState("");
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = async (nextFilters = filters) => {
    try {
      setLoading(true);
      setError("");
      const params = { colid: global1.colid };
      Object.entries(nextFilters).forEach(([field, value]) => { if (value) params[field] = value; });
      const res = await ep1.get(`/api/v2/hr-advanced/${endpoint}`, { params });
      setRows(res.data?.data || []);
      setOptions(res.data?.options || {});
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const dynamicOptions = useMemo(() => {
    const merged = { ...options };
    fields.forEach((field) => {
      merged[field] = [...new Set([...(merged[field] || []), ...rows.map((row) => row[field])].map(text).filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    });
    return merged;
  }, [fields, options, rows]);

  const save = async () => {
    try {
      setSaving(true);
      setError("");
      await ep1.post(`/api/v2/hr-advanced/${endpoint}`, { ...form, id: editingId, colid: global1.colid, name: global1.name || form.employee || "", user: global1.user || form.empid || "" });
      setMessage(editingId ? "Record updated." : "Record saved.");
      setEditingId("");
      setForm(blank(fields));
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to save record");
    } finally {
      setSaving(false);
    }
  };

  const edit = (row) => {
    setEditingId(row._id);
    const next = blank(fields);
    fields.forEach((field) => { next[field] = dateFields.includes(field) ? formatDate(row[field]) : row[field] ?? ""; });
    setForm(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const remove = async (ids) => {
    const deleteIds = Array.isArray(ids) ? ids : [ids].filter(Boolean);
    if (!deleteIds.length) return setError("Select at least one row");
    if (!window.confirm(`Delete ${deleteIds.length} selected record(s)?`)) return;
    await ep1.post(`/api/v2/hr-advanced/${endpoint}-delete`, { colid: global1.colid, ids: deleteIds });
    setSelected([]);
    setMessage("Deleted selected records.");
    await load();
  };

  const downloadTemplate = () => {
    const sample = Object.fromEntries(fields.map((field) => [field, numberFields.includes(field) ? 1000 : dateFields.includes(field) ? "2026-08-10" : labels[field] || field]));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([sample]), title);
    XLSX.writeFile(wb, `${endpoint}_template.xlsx`);
  };

  const upload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      setSaving(true);
      const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const rowsFromFile = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: "" });
      const res = await ep1.post(`/api/v2/hr-advanced/${endpoint}-bulk`, { colid: global1.colid, user: global1.user, rows: rowsFromFile });
      setMessage(`Bulk upload complete. Saved: ${res.data?.saved || 0}`);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to upload file");
    } finally {
      setSaving(false);
    }
  };

  const doPrint = async () => printRows(title, rows, fields, await loadInstitution());

  const columns = [
    { field: "actions", type: "actions", headerName: "Actions", width: 90, getActions: (params) => [<GridActionsCellItem icon={<EditIcon />} label="Edit" onClick={() => edit(params.row)} />, <GridActionsCellItem icon={<DeleteIcon />} label="Delete" onClick={() => remove(params.row._id)} />] },
    ...fields.map((field) => ({ field, headerName: labels[field] || field, width: ["employee", "comments", "structure"].includes(field) ? 210 : 140, type: numberFields.includes(field) ? "number" : "string", valueGetter: (params) => dateFields.includes(field) ? formatDate(params.row[field]) : params.row[field] }))
  ];

  return (
    <MenuPageShell title={title}>
      <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: "#f6f7fb", minHeight: "100vh" }}>
        <Stack spacing={2}>
          <Paper elevation={0} sx={{ p: 2.5, border: "1px solid #e5e7eb", borderRadius: 2 }}>
            <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2}>
              <Box><Typography variant="h5" fontWeight={900}>{title}</Typography><Typography color="text.secondary">{subtitle}</Typography></Box>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                <Button startIcon={<FileDownloadIcon />} variant="outlined" onClick={downloadTemplate}>Template</Button>
                <Button startIcon={<UploadFileIcon />} variant="contained" component="label" disabled={saving}>Bulk Upload<input hidden type="file" accept=".xlsx,.xls,.csv" onChange={upload} /></Button>
                <Button startIcon={<DeleteIcon />} color="error" variant="outlined" disabled={!selected.length} onClick={() => remove(selected)}>Bulk Delete</Button>
                <Button startIcon={<PrintIcon />} variant="outlined" onClick={doPrint}>Print</Button>
              </Stack>
            </Stack>
            {(loading || saving) && <LinearProgress sx={{ mt: 2 }} />}
          </Paper>
          {error && <Alert severity="error" onClose={() => setError("")}>{error}</Alert>}
          {message && <Alert severity="success" onClose={() => setMessage("")}>{message}</Alert>}

          <Paper elevation={0} sx={{ p: 2, border: "1px solid #e5e7eb", borderRadius: 2 }}>
            <Grid container spacing={1.5}>
              {fields.map((field) => (
                <Grid item xs={12} md={["employee", "structure", "comments"].includes(field) ? 3 : 1.5} key={field}>
                  <TextField fullWidth size="small" label={labels[field] || field} type={dateFields.includes(field) ? "date" : numberFields.includes(field) ? "number" : "text"} value={form[field] || ""} InputLabelProps={dateFields.includes(field) ? { shrink: true } : undefined} onChange={(e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))} />
                </Grid>
              ))}
              <Grid item xs={12}><Stack direction="row" spacing={1}><Button startIcon={<SaveIcon />} variant="contained" onClick={save} disabled={saving}>{editingId ? "Update" : "Save"}</Button><Button variant="outlined" onClick={() => { setEditingId(""); setForm(blank(fields)); }}>Clear</Button></Stack></Grid>
            </Grid>
          </Paper>

          <Paper elevation={0} sx={{ p: 2, border: "1px solid #e5e7eb", borderRadius: 2 }}>
            <Grid container spacing={1.5} sx={{ mb: 1 }}>
              {fields.map((field) => (
                <Grid item xs={12} md={1.5} key={field}>
                  <TextField select fullWidth size="small" label={labels[field] || field} value={filters[field] || ""} onChange={(e) => setFilters((prev) => ({ ...prev, [field]: e.target.value }))}>
                    <MenuItem value="">All</MenuItem>
                    {(dynamicOptions[field] || []).map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}
                  </TextField>
                </Grid>
              ))}
              <Grid item xs={12} md={1.5}><Button fullWidth variant="contained" sx={{ height: "100%" }} onClick={() => load()}>Apply</Button></Grid>
            </Grid>
            <Box sx={{ height: 650, width: "100%" }}>
              <DataGrid
                rows={rows}
                columns={columns}
                getRowId={(row) => row._id}
                checkboxSelection
                rowSelectionModel={selected}
                onRowSelectionModelChange={(ids) => setSelected(Array.from(ids))}
                loading={loading}
                slots={{ toolbar: GridToolbar }}
                slotProps={{ toolbar: { showQuickFilter: true, csvOptions: { fileName: endpoint } } }}
                pageSizeOptions={[10, 25, 50, 100]}
                initialState={{ pagination: { paginationModel: { pageSize: 25, page: 0 } } }}
                sx={{ "& .MuiDataGrid-cell": { whiteSpace: "normal", alignItems: "flex-start", py: 1 } }}
              />
            </Box>
          </Paper>
        </Stack>
      </Box>
    </MenuPageShell>
  );
}

export function EmployeeSalaryStructureNewPage() {
  return <SalaryCrudPage title="Employee Salary Structure New" subtitle="Full CRUD, bulk upload, dynamic filters and print view for dashmhrsalstructure." endpoint="salary-structure-crud" fields={salaryStructureFields} />;
}

export function EmployeeDueSalaryNewPage() {
  return <SalaryCrudPage title="Employee Due Salary New" subtitle="Full CRUD, bulk upload, dynamic filters and print view for dashmhrsalary." endpoint="due-salary-crud" fields={dueSalaryFields} />;
}
