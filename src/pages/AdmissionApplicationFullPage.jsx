import React, { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  Grid,
  LinearProgress,
  Paper,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import { DataGrid, GridToolbar } from "@mui/x-data-grid";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import FilterAltIcon from "@mui/icons-material/FilterAlt";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import MenuPageShell from "./MenuPageShell";
import ep1 from "../api/ep1";
import global1 from "./global1";

const emptyFilter = { field: "", value: "" };
const normalizeHeader = (value) => String(value || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
const fieldKey = (field) => field.replace(/^extraFields\./, "extra_").replace(/[^a-zA-Z0-9_]/g, "_");
const documentKey = (name) => `doc_${String(name || "").replace(/[^a-zA-Z0-9_]/g, "_")}`;
const clean = (value) => String(value ?? "").trim();
const parseNumber = (value) => {
  if (value === "" || value === undefined || value === null) return value;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? value : parsed;
};
const numberFields = new Set(["age", "marks_12", "marks_10", "marks_UG", "marks_PG", "tenthmarks", "twelvemarks", "externaltheorymarks", "englishmarks", "applicationfeeamount", "paidamount", "provisionalfeeamount", "provisionalpaidamount"]);
const skipGridFields = new Set(["documents", "extraFields", "__v"]);
const baseFieldOrder = [
  "formid", "applicationid", "applicationnumber", "academicyear", "name", "username", "password", "email", "phone", "regno",
  "address", "pin", "country_form", "state_form", "district_form", "result_status_12th", "board_12th", "marks_type_12th",
  "marks_12", "cgpa_12", "result_status_10th", "board_10th", "marks_type_10th", "marks_10", "cgpa_10", "University_UG",
  "result_status_UG", "marks_type_UG", "marks_UG", "cgpa_UG", "University_PG", "result_status_PG", "marks_type_PG",
  "marks_PG", "cgpa_PG", "gender", "category", "ews", "ph", "minority", "tenthmarks", "twelvemarks",
  "externaltheorymarks", "englishmarks", "dateofbirth", "dateofapplication", "age", "twelvesubjects", "level",
  "programtype", "programapplied", "programcode", "applicationstatus", "enrollmentstatus", "applicationcomments",
  "validationstatus", "validationcomments", "applicationfeeamount", "paymentstatus", "paymentrefno", "paidamount",
  "paiddate", "provisionalfeeamount", "provisionalpaymentstatus", "provisionalpaymentrefno", "provisionalpaidamount",
  "provisionalpaiddate", "user", "createdAt", "updatedAt"
];

const baseLabels = {
  applicationid: "Application ID",
  applicationnumber: "Application Number",
  academicyear: "Academic Year",
  username: "Username",
  password: "Password",
  email: "Email",
  phone: "Phone",
  regno: "Reg No",
  programapplied: "Program",
  programcode: "Program Code",
  applicationstatus: "Application Status",
  enrollmentstatus: "Enrollment Status",
  applicationcomments: "Application Comments"
};

const wrappedGridSx = {
  "& .MuiDataGrid-cell": {
    alignItems: "flex-start",
    whiteSpace: "normal",
    lineHeight: 1.35,
    py: 1,
    overflowWrap: "anywhere",
    wordBreak: "break-word"
  },
  "& .MuiDataGrid-cellContent": {
    whiteSpace: "normal",
    overflow: "visible",
    textOverflow: "clip"
  },
  "& .MuiDataGrid-columnHeaderTitle": {
    whiteSpace: "normal",
    lineHeight: 1.2
  }
};

const labelFor = (field) => baseLabels[field] || field.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
const valueOf = (row, field) => {
  if (field.startsWith("extraFields.")) return row.extraFields?.[field.replace("extraFields.", "")] ?? "";
  const value = row[field];
  if (value === undefined || value === null) return "";
  if (Array.isArray(value)) return value.map((item) => typeof item === "object" ? JSON.stringify(item) : item).join("; ");
  if (typeof value === "object") return JSON.stringify(value);
  return value;
};

export default function AdmissionApplicationFullPage() {
  const [fieldList, setFieldList] = useState([]);
  const [options, setOptions] = useState({});
  const [formDocuments, setFormDocuments] = useState([]);
  const [filters, setFilters] = useState([{ ...emptyFilter }]);
  const [rows, setRows] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadMeta();
    searchApplications();
  }, []);

  const loadMeta = async () => {
    try {
      const [fieldRes, docRes] = await Promise.all([
        ep1.get("/api/v2/admission-application-management/options", { params: { colid: global1.colid } }),
        ep1.get("/admission-form-documents", { params: { colid: global1.colid } })
      ]);
      setFieldList(fieldRes.data?.fields || []);
      setOptions(fieldRes.data?.options || {});
      setFormDocuments(docRes.data?.data || docRes.data || []);
    } catch (err) {
      setError(err.response?.data?.msg || err.response?.data?.message || "Unable to load admission metadata");
    }
  };

  const searchableFields = useMemo(() => {
    const map = new Map();
    baseFieldOrder.forEach((field) => map.set(field, { field, label: labelFor(field), source: "base" }));
    fieldList.forEach((field) => {
      if (!field?.field || skipGridFields.has(field.field)) return;
      map.set(field.field, field);
    });
    rows.forEach((row) => {
      Object.keys(row || {}).forEach((field) => {
        if (field.startsWith("_") || skipGridFields.has(field)) return;
        if (!map.has(field)) map.set(field, { field, label: labelFor(field), source: "observed" });
      });
      Object.keys(row.extraFields || {}).forEach((fieldname) => {
        const field = `extraFields.${fieldname}`;
        if (!map.has(field)) map.set(field, { field, label: fieldname, source: "custom" });
      });
    });
    return Array.from(map.values());
  }, [fieldList, rows]);

  const documentTypes = useMemo(() => {
    const names = new Set();
    formDocuments.forEach((doc) => clean(doc.documentname || doc.documenttype) && names.add(clean(doc.documentname || doc.documenttype)));
    rows.forEach((row) => (row.documents || []).forEach((doc) => clean(doc.documenttype || doc.documentname) && names.add(clean(doc.documenttype || doc.documentname))));
    return Array.from(names).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [formDocuments, rows]);

  const activeFilters = (source = filters) => source
    .filter((filter) => filter.field && clean(filter.value))
    .map((filter) => ({ field: filter.field, value: filter.value }));

  const searchApplications = async (source = filters) => {
    try {
      setLoading(true);
      setError("");
      const res = await ep1.post("/api/v2/admission-application-management/search", {
        colid: global1.colid,
        filters: activeFilters(source)
      });
      setRows(res.data || []);
      setSelectedIds([]);
    } catch (err) {
      setError(err.response?.data?.msg || "Unable to load admission applications");
    } finally {
      setLoading(false);
    }
  };

  const updateFilter = (index, patch) => {
    setFilters((prev) => prev.map((filter, itemIndex) => (
      itemIndex === index ? { ...filter, ...patch, ...(patch.field ? { value: "" } : {}) } : filter
    )));
  };

  const removeFilter = (index) => setFilters((prev) => prev.length === 1 ? [{ ...emptyFilter }] : prev.filter((_, itemIndex) => itemIndex !== index));
  const clearFilters = () => {
    const next = [{ ...emptyFilter }];
    setFilters(next);
    searchApplications(next);
  };

  const valueOptions = (field) => {
    const values = new Set((options[field] || []).map(clean).filter(Boolean));
    rows.forEach((row) => {
      const value = clean(valueOf(row, field));
      if (value) values.add(value);
    });
    return Array.from(values).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  };

  const templateFields = useMemo(() => searchableFields.filter((field) => !["createdAt", "updatedAt"].includes(field.field)), [searchableFields]);

  const headerMap = useMemo(() => {
    const map = new Map();
    templateFields.forEach((field) => {
      map.set(normalizeHeader(field.label), field);
      map.set(normalizeHeader(field.field), field);
      if (field.field.startsWith("extraFields.")) {
        const customName = field.field.replace("extraFields.", "");
        map.set(normalizeHeader(customName), field);
        map.set(normalizeHeader(`extra_${customName}`), field);
      }
    });
    return map;
  }, [templateFields]);

  const downloadTemplate = () => {
    const row = {};
    templateFields.forEach((field) => {
      row[field.label || field.field] = (options[field.field] || [])[0] || "";
    });
    if (!row.Name) row.Name = "Applicant Name";
    if (!row.Email) row.Email = "applicant@example.com";
    if (!row.Phone) row.Phone = "9999999999";
    if (!row["Application Status"]) row["Application Status"] = "Applied";
    documentTypes.forEach((name) => {
      row[`Document: ${name}`] = `https://example.com/${name.replace(/\s+/g, "-").toLowerCase()}.pdf`;
      row[`Document Description: ${name}`] = "";
    });
    if (!documentTypes.length) {
      row["Document: Photo"] = "https://example.com/photo.jpg";
      row["Document: Custom Document"] = "https://example.com/document.pdf";
    }
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet([row]);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Applications");
    XLSX.writeFile(workbook, "admission_applications_full_template.xlsx");
  };

  const parseExcelRows = (excelRows) => excelRows.map((row, index) => {
    const item = { rowNumber: index + 2, colid: global1.colid, user: global1.user, extraFields: {}, documents: [] };
    const docMap = {};
    Object.entries(row).forEach(([header, value]) => {
      const normalized = normalizeHeader(header);
      const docMatch = String(header).match(/^document\s*:\s*(.+)$/i);
      const docDescriptionMatch = String(header).match(/^document\s*description\s*:\s*(.+)$/i);
      if (docMatch) {
        const documenttype = clean(docMatch[1]);
        if (clean(value)) docMap[documenttype] = { ...(docMap[documenttype] || {}), documenttype, url: clean(value), uploadedAt: new Date() };
        return;
      }
      if (docDescriptionMatch) {
        const documenttype = clean(docDescriptionMatch[1]);
        if (documenttype) docMap[documenttype] = { ...(docMap[documenttype] || {}), documenttype, description: clean(value) };
        return;
      }
      const field = headerMap.get(normalized);
      if (!field) return;
      if (field.field.startsWith("extraFields.")) {
        item.extraFields[field.field.replace("extraFields.", "")] = value;
      } else {
        item[field.field] = numberFields.has(field.field) ? parseNumber(value) : value;
      }
    });
    item.documents = Object.values(docMap).filter((doc) => doc.url);
    item.applicationstatus = item.applicationstatus || "Applied";
    item.dateofapplication = item.dateofapplication || new Date().toISOString().slice(0, 10);
    return item;
  });

  const uploadExcel = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || uploading) return;
    try {
      setUploading(true);
      setError("");
      setMessage("");
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const excelRows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
      if (!excelRows.length) {
        setError("No rows found in Excel file");
        return;
      }
      const items = parseExcelRows(excelRows);
      const res = await ep1.post("/admission-dynamic/applications-bulk", { colid: global1.colid, items });
      const errors = res.data?.errors || [];
      setMessage(`Bulk upload completed. Inserted: ${res.data?.inserted || 0}${errors.length ? `, Errors: ${errors.length}` : ""}`);
      setError(errors.length ? errors.slice(0, 8).map((item) => `Row ${item.rowNumber}: ${item.msg}`).join(" | ") : "");
      await Promise.all([searchApplications(), loadMeta()]);
    } catch (err) {
      setError(err.response?.data?.msg || "Unable to upload admission applications");
    } finally {
      setUploading(false);
    }
  };

  const columns = useMemo(() => {
    const scalarColumns = searchableFields.map((field) => ({
      field: fieldKey(field.field),
      headerName: field.label || field.field,
      minWidth: field.field === "email" || field.field === "programapplied" ? 220 : 160,
      valueGetter: (params) => valueOf(params.row, field.field)
    }));
    const documentColumns = documentTypes.map((name) => ({
      field: documentKey(name),
      headerName: `Document: ${name}`,
      minWidth: 230,
      sortable: false,
      valueGetter: (params) => (params.row.documents || []).filter((doc) => clean(doc.documenttype || doc.documentname) === name).map((doc) => doc.url || doc.link).filter(Boolean).join(", "),
      renderCell: (params) => {
        const links = clean(params.value).split(",").map(clean).filter(Boolean);
        if (!links.length) return "";
        return (
          <Stack spacing={0.5}>
            {links.map((link, index) => <a key={`${link}-${index}`} href={link} target="_blank" rel="noreferrer">Open {index + 1}</a>)}
          </Stack>
        );
      }
    }));
    return [{ field: "_id", headerName: "Mongo ID", width: 220 }, ...scalarColumns, ...documentColumns];
  }, [searchableFields, documentTypes]);

  return (
    <MenuPageShell title="Admission Applications Full">
      <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: "#f6f7fb", minHeight: "100vh" }}>
        <Paper elevation={0} sx={{ p: 2.5, mb: 2, border: "1px solid #e5e7eb", borderRadius: 2 }}>
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2}>
            <Box>
              <Typography variant="h5" fontWeight={900}>Admission Applications Full</Typography>
              <Typography color="text.secondary">View all application fields, custom fields, and uploaded/custom document links in one grid.</Typography>
            </Box>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
              <Button variant="outlined" startIcon={<FileDownloadIcon />} onClick={downloadTemplate}>Template</Button>
              <Button variant="contained" component="label" startIcon={<UploadFileIcon />} disabled={uploading}>
                {uploading ? "Uploading..." : "Bulk Upload"}
                <input hidden type="file" accept=".xlsx,.xls" onChange={uploadExcel} />
              </Button>
              <Button variant="outlined" startIcon={<FilterAltIcon />} onClick={() => searchApplications()} disabled={loading}>Load</Button>
            </Stack>
          </Stack>
        </Paper>

        {(loading || uploading) && <Paper sx={{ p: 2, mb: 2 }}><LinearProgress /></Paper>}
        {message && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMessage("")}>{message}</Alert>}
        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}

        <Paper elevation={0} sx={{ p: 2.5, mb: 2, border: "1px solid #e5e7eb", borderRadius: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="h6" fontWeight={800}>Dynamic Filters</Typography>
            <Button startIcon={<AddIcon />} onClick={() => setFilters((prev) => [...prev, { ...emptyFilter }])}>Add Filter</Button>
          </Stack>
          <Grid container spacing={2}>
            {filters.map((filter, index) => (
              <React.Fragment key={`${index}-${filter.field || "field"}`}>
                <Grid item xs={12} md={4}>
                  <Autocomplete
                    options={searchableFields}
                    getOptionLabel={(option) => option?.label || option?.field || ""}
                    value={searchableFields.find((field) => field.field === filter.field) || null}
                    onChange={(_, value) => updateFilter(index, { field: value?.field || "" })}
                    renderInput={(params) => <TextField {...params} label="Field" />}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Autocomplete
                    freeSolo
                    options={valueOptions(filter.field)}
                    value={filter.value || ""}
                    onInputChange={(_, value) => updateFilter(index, { value })}
                    onChange={(_, value) => updateFilter(index, { value: value || "" })}
                    renderInput={(params) => <TextField {...params} label="Value" />}
                    disabled={!filter.field}
                  />
                </Grid>
                <Grid item xs={12} md={2}>
                  <Button fullWidth color="error" variant="outlined" startIcon={<DeleteIcon />} onClick={() => removeFilter(index)} sx={{ height: 56 }}>Remove</Button>
                </Grid>
              </React.Fragment>
            ))}
            <Grid item xs={12} md={2}><Button fullWidth variant="contained" onClick={() => searchApplications()} sx={{ height: 56 }}>Apply</Button></Grid>
            <Grid item xs={12} md={2}><Button fullWidth variant="text" onClick={clearFilters} sx={{ height: 56 }}>Clear</Button></Grid>
          </Grid>
        </Paper>

        <Paper elevation={0} sx={{ p: 2, border: "1px solid #e5e7eb", borderRadius: 2 }}>
          <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1} sx={{ mb: 2 }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="h6" fontWeight={800}>Applications</Typography>
              <Chip size="small" label={`${rows.length} records`} />
              <Chip size="small" label={`${documentTypes.length} document types`} />
            </Stack>
            <Typography color="text.secondary">{selectedIds.length} selected</Typography>
          </Stack>
          <Box sx={{ height: 680, width: "100%" }}>
            <DataGrid
              rows={rows}
              columns={columns}
              getRowId={(row) => row._id}
              checkboxSelection
              rowSelectionModel={selectedIds}
              onRowSelectionModelChange={(selection) => setSelectedIds(Array.from(selection?.ids || selection))}
              getRowHeight={() => "auto"}
              getEstimatedRowHeight={() => 90}
              loading={loading}
              disableRowSelectionOnClick
              slots={{ toolbar: GridToolbar }}
              slotProps={{ toolbar: { showQuickFilter: true, csvOptions: { fileName: "admission_applications_full" } } }}
              pageSizeOptions={[10, 25, 50, 100]}
              sx={wrappedGridSx}
            />
          </Box>
        </Paper>
      </Box>
    </MenuPageShell>
  );
}
