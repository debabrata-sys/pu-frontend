import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  Divider,
  Grid,
  LinearProgress,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import { DataGrid, GridToolbar } from "@mui/x-data-grid";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import DeleteIcon from "@mui/icons-material/Delete";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import * as XLSX from "xlsx";
import Tesseract from "tesseract.js";
import ep1 from "../api/ep1";
import global1 from "./global1";

const statusOptions = ["Submitted", "Approved", "Rejected"];
const documentStatusOptions = ["Blank", "Approved", "Rejected"];
const aiStatusOptions = ["Pass", "Fail"];
const frameworks = ["NAAC", "NBA", "NIRF", "QS", "AMBA", "ABET", "AACSB", "THE", "UGC", "AICTE", "NMC", "DCI", "PCI"];

export const personalDataConfigs = {
  projects: {
    title: "Projects",
    fields: ["project", "agency", "type", "yop", "department", "funds", "level", "duration"],
    labels: {
      project: "Project",
      agency: "Agency",
      type: "Type",
      yop: "Academic year",
      department: "Department",
      funds: "Fund sanctioned",
      level: "Level",
      duration: "Duration in year"
    }
  },
  publications: {
    title: "Publications",
    fields: ["department", "title", "journal", "yop", "issn", "articlelink", "journallink", "hindex", "citation", "citationindex", "ugclisted"],
    labels: {
      department: "Department",
      title: "Title",
      journal: "Journal",
      yop: "Academic year",
      issn: "ISSN",
      articlelink: "Article link",
      journallink: "Journal link",
      hindex: "H-index",
      citation: "Citation",
      citationindex: "Citation index",
      ugclisted: "UGC listed"
    }
  },
  patents: {
    title: "Patents",
    fields: ["title", "patentnumber", "doa", "agency", "patentstatus", "yop"],
    labels: { title: "Title", patentnumber: "Patent number", doa: "Date", agency: "Agency", patentstatus: "Patent status", yop: "Academic year" }
  },
  teacherfellow: {
    title: "Fellowship and Awards",
    fields: ["year", "tname", "workshop", "profbody", "amount", "source", "level", "award", "purpose", "duration"],
    labels: {
      year: "Academic year",
      tname: "Teacher name",
      workshop: "Workshop / conference",
      profbody: "Professional body",
      amount: "Amount",
      source: "Source",
      level: "Level",
      award: "Award",
      purpose: "Purpose",
      duration: "Duration"
    }
  },
  consultancy: {
    title: "Consultancy",
    fields: ["year", "duration", "consultant", "advisor", "department", "trainees", "title", "role", "agency", "contact", "revenue"],
    labels: {
      year: "Academic year",
      duration: "Duration",
      consultant: "Consultant",
      advisor: "Advisor",
      department: "Department",
      trainees: "Trainees",
      title: "Title",
      role: "Role",
      agency: "Agency",
      contact: "Contact",
      revenue: "Revenue"
    }
  },
  seminar: {
    title: "Seminars Participated",
    fields: ["title", "duration", "yop", "membership", "amount", "role", "paper", "level", "type"],
    labels: {
      title: "Title",
      duration: "Duration",
      yop: "Academic year",
      membership: "Membership",
      amount: "Amount",
      role: "Role",
      paper: "Paper",
      level: "Level",
      type: "Type"
    }
  },
  book: {
    title: "Books and Chapters",
    fields: ["booktitle", "papertitle", "proceeding", "yop", "issn", "publisher", "conferencename", "level", "type", "affiliated"],
    labels: {
      booktitle: "Book title",
      papertitle: "Paper / chapter title",
      proceeding: "Proceeding",
      yop: "Academic year",
      issn: "ISBN / ISSN",
      publisher: "Publisher",
      conferencename: "Conference name",
      level: "Level",
      type: "Type",
      affiliated: "Affiliated"
    }
  }
};

const workflowFields = [
  "filelink",
  "submissionstatus",
  "documentstatus",
  "aivalidationstatus",
  "overallstatus",
  "usercomment",
  "approvercomment",
  "aivalidationcomment",
  "accreditationframework",
  "documentocrtext"
];

const emptyFor = (config) => Object.fromEntries([...config.fields, ...workflowFields].map((field) => [field, ""]));
const safeRows = (rows) => rows.map((row, index) => ({ id: row._id || index, ...row }));
const labelFor = (config, field) => config.labels[field] || field;
const getOptionList = (metadata, kind, field, rows) => {
  const fromServer = metadata?.options?.[kind]?.[field] || [];
  const fromRows = rows.map((row) => row[field]).filter(Boolean);
  return [...new Set([...fromServer, ...fromRows].map((value) => String(value || "").trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
};

const actionGridSx = {
  display: "grid",
  gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(180px, 1fr))", lg: "repeat(4, minmax(180px, 1fr))" },
  gap: 1,
  alignItems: "stretch",
  "& .MuiButton-root": {
    minHeight: 38,
    whiteSpace: "normal",
    lineHeight: 1.15
  }
};

const formActionGridSx = {
  ...actionGridSx,
  gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(190px, 1fr))", lg: "repeat(3, minmax(190px, 1fr))" },
  maxWidth: 760
};

function writeExcel(filename, rows) {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Data");
  XLSX.writeFile(wb, filename);
}

export default function PersonalDataSubmissionPage({ kind = "projects", admin = false }) {
  const config = personalDataConfigs[kind] || personalDataConfigs.projects;
  const [rows, setRows] = useState([]);
  const [metadata, setMetadata] = useState({});
  const [form, setForm] = useState(emptyFor(config));
  const [editingId, setEditingId] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [filters, setFilters] = useState({});
  const [ai, setAi] = useState({ provider: "Gemini", geminiModel: "gemini-2.5-flash-lite", ollamaConfigId: "", accreditationframework: "NAAC", documentValidationMode: "both" });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [validationProgress, setValidationProgress] = useState({});

  const colid = global1.colid;
  const user = global1.user;
  const name = global1.name;

  const allFields = useMemo(() => [...config.fields, ...workflowFields], [config]);

  const fetchMetadata = async () => {
    const response = await ep1.get("/api/v2/personal-data/metadata", { params: { colid, user } });
    setMetadata(response.data || {});
    const firstModel = response.data?.geminiModels?.[0] || "gemini-2.5-flash-lite";
    setAi((prev) => ({ ...prev, geminiModel: prev.geminiModel || firstModel }));
  };

  const fetchRows = async () => {
    setLoading(true);
    try {
      const params = { colid, user, ...(admin ? {} : { mine: true }), ...filters };
      const response = await ep1.get(`/api/v2/personal-data/${kind}`, { params });
      setRows(response.data.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setForm(emptyFor(config));
    setEditingId("");
    setFilters({});
  }, [kind]);

  useEffect(() => {
    fetchMetadata();
  }, []);

  useEffect(() => {
    fetchRows();
  }, [kind, admin]);

  const setField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const save = async (resubmit = false) => {
    setSaving(true);
    try {
      await ep1.post(`/api/v2/personal-data/${kind}`, {
        ...form,
        id: editingId,
        colid,
        user,
        name,
        mine: !admin,
        resubmit
      });
      setMessage(resubmit ? "Submission resubmitted." : "Saved.");
      setForm(emptyFor(config));
      setEditingId("");
      await fetchRows();
      await fetchMetadata();
    } catch (error) {
      setMessage(error.response?.data?.message || error.message);
    } finally {
      setSaving(false);
    }
  };

  const editRow = (row) => {
    setEditingId(row._id);
    setForm({ ...emptyFor(config), ...row });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const uploadDocument = async (file) => {
    if (!file) return;
    const allowedExtensions = /\.(pdf|doc|docx|jpg|jpeg|png|webp)$/i;
    const isAllowedMime = /pdf|word|officedocument|msword|jpeg|jpg|png|webp/i.test(file.type || "");
    if (!allowedExtensions.test(file.name || "") && !isAllowedMime) {
      setMessage("Only PDF, Word and image files are allowed as supporting documents.");
      return;
    }
    const isImage = /^image\//i.test(file.type || "") || /\.(jpg|jpeg|png|webp)$/i.test(file.name || "");
    if (isImage) {
      try {
        setMessage("Reading image document with OCR. Please wait...");
        const result = await Tesseract.recognize(file, "eng");
        setField("documentocrtext", result?.data?.text || "");
      } catch (error) {
        setField("documentocrtext", "");
        setMessage(`Document uploaded, but image OCR failed: ${error.message}`);
      }
    } else {
      setField("documentocrtext", "");
    }
    const body = new FormData();
    body.append("file", file);
    body.append("colid", colid);
    body.append("kind", kind);
    const response = await ep1.post("/api/v2/personal-data/upload", body, { headers: { "Content-Type": "multipart/form-data" } });
    setField("filelink", response.data.url || "");
    setField("doclink", response.data.url || "");
    setField("documentstatus", "Submitted");
    setMessage(isImage ? "Document uploaded to AWS and image OCR text saved for validation." : "Document uploaded to AWS.");
  };

  const deleteRows = async (ids = selectedIds) => {
    if (!ids.length) return;
    if (!window.confirm(`Delete ${ids.length} selected row(s)?`)) return;
    await ep1.post(`/api/v2/personal-data/${kind}/bulk-delete`, { colid, user, ids, mine: !admin });
    setSelectedIds([]);
    await fetchRows();
  };

  const uploadExcel = async (file) => {
    if (!file) return;
    const body = new FormData();
    body.append("file", file);
    body.append("colid", colid);
    body.append("user", user);
    body.append("name", name);
    await ep1.post(`/api/v2/personal-data/${kind}/bulkupload`, body, { headers: { "Content-Type": "multipart/form-data" } });
    setMessage("Bulk upload completed.");
    await fetchRows();
    await fetchMetadata();
  };

  const validateIds = async (ids) => {
    if (!ids.length) return;
    ids.forEach((id) => setValidationProgress((prev) => ({ ...prev, [id]: { status: "waiting", progress: 10 } })));
    await Promise.all(ids.map(async (id) => {
      try {
        setValidationProgress((prev) => ({ ...prev, [id]: { status: "validating", progress: 35 } }));
        const response = await ep1.post(`/api/v2/personal-data/${kind}/validate`, { colid, user, id, ...ai });
        setRows((prev) => prev.map((row) => (row._id === id ? response.data.data : row)));
        setValidationProgress((prev) => ({ ...prev, [id]: { status: "done", progress: 100 } }));
      } catch (error) {
        setValidationProgress((prev) => ({ ...prev, [id]: { status: error.response?.data?.message || error.message, progress: 100, error: true } }));
      }
    }));
    await fetchMetadata();
  };

  const nonAiValidateIds = async (ids) => {
    if (!ids.length) return;
    ids.forEach((id) => setValidationProgress((prev) => ({ ...prev, [id]: { status: "non-AI matching", progress: 25 } })));
    try {
      const response = await ep1.post(`/api/v2/personal-data/${kind}/non-ai-validate`, { colid, user, ids });
      const results = response.data?.results || [];
      setRows((prev) => prev.map((row) => {
        const matched = results.find((item) => item.id === row._id && item.data);
        return matched ? matched.data : row;
      }));
      ids.forEach((id) => setValidationProgress((prev) => ({ ...prev, [id]: { status: "non-AI done", progress: 100 } })));
      setMessage("Non-AI validation completed.");
      await fetchMetadata();
    } catch (error) {
      ids.forEach((id) => setValidationProgress((prev) => ({ ...prev, [id]: { status: error.response?.data?.message || error.message, progress: 100, error: true } })));
      setMessage(error.response?.data?.message || error.message);
    }
  };

  const reviewRows = async (status) => {
    if (!selectedIds.length) return;
    const comment = window.prompt(`Enter ${status.toLowerCase()} comment`, "");
    await ep1.post(`/api/v2/personal-data/${kind}/bulk-review`, { colid, user, ids: selectedIds, status, comment });
    setSelectedIds([]);
    setMessage(`Selected entries marked as ${status}.`);
    await fetchRows();
  };

  const columns = useMemo(() => [
    ...(admin ? [
      { field: "user", headerName: "User", minWidth: 190 },
      { field: "name", headerName: "Name", minWidth: 160 }
    ] : []),
    ...config.fields.map((field) => ({
      field,
      headerName: labelFor(config, field),
      minWidth: 160,
      flex: field === "title" || field === "project" || field === "booktitle" ? 1.2 : 0.8
    })),
    {
      field: "filelink",
      headerName: "Document",
      minWidth: 170,
      renderCell: (params) => params.value ? <Button size="small" href={params.value} target="_blank">Open</Button> : ""
    },
    { field: "submissionstatus", headerName: "Submission", minWidth: 130 },
    { field: "documentstatus", headerName: "Document status", minWidth: 140 },
    { field: "aivalidationstatus", headerName: "AI status", minWidth: 110 },
    { field: "overallstatus", headerName: "Overall", minWidth: 120 },
    {
      field: "validationprogress",
      headerName: "AI progress",
      minWidth: 170,
      renderCell: (params) => {
        const progress = validationProgress[params.row._id];
        if (!progress) return "";
        return <Box sx={{ width: "100%" }}><LinearProgress variant="determinate" value={progress.progress} color={progress.error ? "error" : "primary"} /><Typography variant="caption">{progress.progress}% {progress.status}</Typography></Box>;
      }
    },
    { field: "aivalidationcomment", headerName: "AI comments", minWidth: 260, flex: 1 },
    { field: "approvercomment", headerName: "Approver comments", minWidth: 220 },
    { field: "usercomment", headerName: "User comments", minWidth: 220 },
    {
      field: "actions",
      headerName: "Actions",
      minWidth: 250,
      sortable: false,
      renderCell: (params) => (
        <Stack direction="row" spacing={1}>
          <Button size="small" onClick={() => editRow(params.row)}>Edit</Button>
          <Button size="small" color="error" onClick={() => deleteRows([params.row._id])}>Delete</Button>
          <Button size="small" startIcon={<SmartToyIcon />} onClick={() => validateIds([params.row._id])}>Validate</Button>
          <Button size="small" onClick={() => nonAiValidateIds([params.row._id])}>Non-AI</Button>
        </Stack>
      )
    }
  ], [admin, config, validationProgress, ai, selectedIds]);

  return (
    <Box sx={{ p: 2 }}>
      <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ xs: "stretch", md: "center" }} spacing={1} sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>{admin ? "Accreditation Review" : "Personal Data"} - {config.title}</Typography>
          <Typography variant="body2" color="text.secondary">{admin ? "Review all submissions with AI validation and bulk approval." : "Create, upload evidence, validate, and resubmit rejected entries."}</Typography>
        </Box>
        <Stack direction="row" spacing={1} flexWrap="wrap">
          <Chip label={`User: ${name || user}`} />
          <Chip label={`Colid: ${colid}`} />
        </Stack>
      </Stack>

      {message && <Alert sx={{ mb: 2 }} severity={/error|missing|failed/i.test(message) ? "error" : "success"} onClose={() => setMessage("")}>{message}</Alert>}

      <Paper sx={{ p: 2, mb: 2 }} variant="outlined">
        <Typography variant="h6" sx={{ mb: 2 }}>{editingId ? "Edit submission" : "Add submission"}</Typography>
        <Grid container spacing={2}>
          {config.fields.map((field) => (
            <Grid item xs={12} md={4} key={field}>
              <Autocomplete
                freeSolo
                options={getOptionList(metadata, kind, field, rows)}
                value={form[field] || ""}
                onInputChange={(_, value) => setField(field, value)}
                onChange={(_, value) => setField(field, value || "")}
                renderInput={(params) => <TextField {...params} fullWidth size="small" label={labelFor(config, field)} />}
              />
            </Grid>
          ))}
          <Grid item xs={12} md={4}>
            <TextField fullWidth select size="small" label="Submission status" value={form.submissionstatus || "Submitted"} onChange={(e) => setField("submissionstatus", e.target.value)}>
              {statusOptions.map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField fullWidth select size="small" label="Document status" value={form.documentstatus || "Blank"} onChange={(e) => setField("documentstatus", e.target.value)}>
              {documentStatusOptions.map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={12} md={4}>
            <Autocomplete freeSolo options={frameworks} value={form.accreditationframework || ""} onInputChange={(_, value) => setField("accreditationframework", value)} renderInput={(params) => <TextField {...params} fullWidth size="small" label="Accreditation framework" />} />
          </Grid>
          <Grid item xs={12} md={8}>
            <TextField fullWidth size="small" label="File link" value={form.filelink || ""} onChange={(e) => setField("filelink", e.target.value)} />
          </Grid>
          <Grid item xs={12} md={4}>
            <Button fullWidth variant="outlined" component="label" startIcon={<UploadFileIcon />}>
              Upload document to AWS
              <input
                hidden
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/*"
                onChange={(e) => uploadDocument(e.target.files?.[0])}
              />
            </Button>
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField fullWidth multiline minRows={2} size="small" label="User comment" value={form.usercomment || ""} onChange={(e) => setField("usercomment", e.target.value)} />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField fullWidth multiline minRows={2} size="small" label="AI validation comment" value={form.aivalidationcomment || ""} onChange={(e) => setField("aivalidationcomment", e.target.value)} />
          </Grid>
          <Grid item xs={12}>
            <Box sx={formActionGridSx}>
              <Button fullWidth variant="contained" disabled={saving} onClick={() => save(false)}>{editingId ? "Update" : "Save"}</Button>
              <Button fullWidth variant="contained" color="secondary" disabled={saving || !editingId} onClick={() => save(true)}>Resubmit</Button>
              <Button fullWidth variant="outlined" onClick={() => { setEditingId(""); setForm(emptyFor(config)); }}>Clear</Button>
              <Button fullWidth variant="outlined" startIcon={<SmartToyIcon />} disabled={!editingId} onClick={() => validateIds([editingId])}>Validate current entry</Button>
              <Button fullWidth variant="outlined" disabled={!editingId} onClick={() => nonAiValidateIds([editingId])}>Non-AI validate current entry</Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ p: 2, mb: 2 }} variant="outlined">
        <Typography variant="h6" sx={{ mb: 2 }}>Dynamic filters</Typography>
        <Grid container spacing={2}>
          {[...config.fields, "submissionstatus", "documentstatus", "aivalidationstatus", "overallstatus", "accreditationframework", ...(admin ? ["user", "name"] : [])].map((field) => (
            <Grid item xs={12} md={3} key={field}>
              <Autocomplete
                freeSolo
                options={field === "submissionstatus" || field === "overallstatus" ? statusOptions : field === "documentstatus" ? documentStatusOptions : field === "aivalidationstatus" ? aiStatusOptions : getOptionList(metadata, kind, field, rows)}
                value={filters[field] || ""}
                onInputChange={(_, value) => setFilters((prev) => ({ ...prev, [field]: value }))}
                onChange={(_, value) => setFilters((prev) => ({ ...prev, [field]: value || "" }))}
                renderInput={(params) => <TextField {...params} fullWidth size="small" label={labelFor(config, field)} />}
              />
            </Grid>
          ))}
          <Grid item xs={12}>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              <Button variant="contained" onClick={fetchRows}>Apply filters</Button>
              <Button variant="outlined" onClick={() => { setFilters({}); setTimeout(fetchRows, 0); }}>Clear filters</Button>
            </Stack>
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ p: 2, mb: 2 }} variant="outlined">
        <Typography variant="h6" sx={{ mb: 2 }}>AI validation</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={3}>
            <TextField fullWidth select size="small" label="Provider" value={ai.provider} onChange={(e) => setAi((prev) => ({ ...prev, provider: e.target.value }))}>
              <MenuItem value="Gemini">Gemini</MenuItem>
              <MenuItem value="Ollama">Ollama</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} md={3}>
            <Autocomplete
              freeSolo
              options={metadata.geminiModels || []}
              value={ai.geminiModel || ""}
              onInputChange={(_, value) => setAi((prev) => ({ ...prev, geminiModel: value }))}
              renderInput={(params) => <TextField {...params} fullWidth size="small" label="Gemini model" />}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField fullWidth select size="small" label="Ollama model" value={ai.ollamaConfigId} onChange={(e) => setAi((prev) => ({ ...prev, ollamaConfigId: e.target.value }))}>
              <MenuItem value="">Default Ollama</MenuItem>
              {(metadata.ollamaConfigs || []).map((item) => <MenuItem key={item._id} value={item._id}>{item.name || item.modelname}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={12} md={3}>
            <Autocomplete freeSolo options={frameworks} value={ai.accreditationframework || ""} onInputChange={(_, value) => setAi((prev) => ({ ...prev, accreditationframework: value }))} renderInput={(params) => <TextField {...params} fullWidth size="small" label="Accreditation framework" />} />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField fullWidth select size="small" label="Document validation mode" value={ai.documentValidationMode || "both"} onChange={(e) => setAi((prev) => ({ ...prev, documentValidationMode: e.target.value }))}>
              <MenuItem value="both">Send link + extracted text</MenuItem>
              <MenuItem value="link">Send document link only</MenuItem>
              <MenuItem value="extract">Send extracted text only</MenuItem>
            </TextField>
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ p: 2 }} variant="outlined">
        <Stack direction="column" spacing={1} sx={{ mb: 1 }}>
          <Typography variant="h6">Submissions</Typography>
          <Box sx={actionGridSx}>
            <Button fullWidth variant="outlined" startIcon={<FileDownloadIcon />} onClick={() => writeExcel(`${kind}_template.xlsx`, [{ name, user, ...emptyFor(config) }])}>Template</Button>
            <Button fullWidth variant="outlined" component="label" startIcon={<UploadFileIcon />}>Bulk upload<input hidden type="file" accept=".xlsx,.xls,.csv" onChange={(e) => uploadExcel(e.target.files?.[0])} /></Button>
            <Button fullWidth variant="outlined" onClick={() => writeExcel(`${kind}_export.xlsx`, rows)}>Export</Button>
            <Button fullWidth variant="outlined" color="error" startIcon={<DeleteIcon />} disabled={!selectedIds.length} onClick={() => deleteRows()}>Bulk delete</Button>
            <Button fullWidth variant="contained" startIcon={<SmartToyIcon />} disabled={!selectedIds.length} onClick={() => validateIds(selectedIds)}>Validate selected</Button>
            <Button fullWidth variant="contained" color="secondary" disabled={!selectedIds.length} onClick={() => nonAiValidateIds(selectedIds)}>Non-AI validate selected</Button>
            {admin && <Button fullWidth color="success" variant="contained" startIcon={<CheckCircleIcon />} disabled={!selectedIds.length} onClick={() => reviewRows("Approved")}>Approve</Button>}
            {admin && <Button fullWidth color="error" variant="contained" startIcon={<CancelIcon />} disabled={!selectedIds.length} onClick={() => reviewRows("Rejected")}>Reject</Button>}
          </Box>
        </Stack>
        <Divider sx={{ mb: 1 }} />
        <Box sx={{ height: 650, width: "100%" }}>
          <DataGrid
            rows={safeRows(rows)}
            columns={columns}
            loading={loading}
            checkboxSelection
            disableRowSelectionOnClick
            rowSelectionModel={selectedIds}
            onRowSelectionModelChange={(model) => setSelectedIds(model)}
            slots={{ toolbar: GridToolbar }}
            slotProps={{ toolbar: { showQuickFilter: true, csvOptions: { fileName: kind } } }}
            pageSizeOptions={[10, 25, 50, 100]}
            initialState={{ pagination: { paginationModel: { pageSize: 25, page: 0 } } }}
            sx={{
              "& .MuiDataGrid-cell": { whiteSpace: "normal", lineHeight: 1.35, alignItems: "flex-start", py: 1 },
              "& .MuiDataGrid-columnHeaderTitle": { whiteSpace: "normal", lineHeight: 1.2 }
            }}
          />
        </Box>
      </Paper>
    </Box>
  );
}
