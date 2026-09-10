import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  Grid,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import { DataGrid, GridToolbar } from "@mui/x-data-grid";
import DeleteIcon from "@mui/icons-material/Delete";
import DownloadIcon from "@mui/icons-material/Download";
import PrintIcon from "@mui/icons-material/Print";
import SaveIcon from "@mui/icons-material/Save";
import SearchIcon from "@mui/icons-material/Search";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import SyncIcon from "@mui/icons-material/Sync";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import * as XLSX from "xlsx";
import ep1 from "../api/ep1";
import global1 from "./global1";
import MenuPageShell from "./MenuPageShell";

const clean = (value) => String(value ?? "").trim();
const fieldLabel = (field) => field.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());
const csvEscape = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
const rowsWithId = (rows = []) => rows.map((row, index) => ({ id: row._id || index + 1, ...row }));
const gridSx = {
  "& .MuiDataGrid-cell": { whiteSpace: "normal", overflowWrap: "anywhere", lineHeight: 1.3, py: 1, alignItems: "flex-start" },
  "& .MuiDataGrid-columnHeaderTitle": { whiteSpace: "normal", lineHeight: 1.2 }
};

const emptyForm = {
  _id: "",
  sarformat: "NBA SAR Tier 1 MCA",
  academicyear: "",
  regulation: "",
  program: "",
  programcode: "",
  criterion: "",
  questionno: "",
  question: "",
  maxmarks: 0,
  erpsource: "",
  data: "",
  numericvalue: 0,
  evidenceurl: "",
  remarks: "",
  datapulled: "No",
  status: "Draft"
};

function queryString(params) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (Array.isArray(value) && value.length) search.set(key, value.join(","));
    else if (clean(value)) search.set(key, value);
  });
  return search.toString();
}

function exportCsv(filename, rows, columns) {
  const csv = [
    columns.map((column) => csvEscape(column.headerName || column.field)).join(","),
    ...rows.map((row) => columns.map((column) => csvEscape(row[column.field])).join(","))
  ].join("\n");
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

function printSar({ rows, institution, selection }) {
  const logo = institution?.logolink || institution?.logo || global1.logo || "";
  const name = institution?.institutionname || global1.insname || "Institution";
  const address = institution?.address || global1.address || "";
  const title = "NBA SAR - Tier 1 MCA";
  const dataRows = rows.length ? rows : [];
  const grouped = dataRows.reduce((acc, row) => {
    const key = clean(row.criterion) || "Unspecified";
    acc[key] = acc[key] || [];
    acc[key].push(row);
    return acc;
  }, {});
  const html = Object.entries(grouped).map(([criterion, items]) => `
    <h3>${criterion}</h3>
    <table>
      <thead><tr><th style="width:9%">Q. No.</th><th style="width:28%">Question</th><th style="width:8%">Marks</th><th>Data / Response</th><th style="width:14%">Evidence</th><th style="width:10%">Status</th></tr></thead>
      <tbody>${items.map((row) => `<tr>
        <td>${clean(row.questionno)}</td>
        <td>${clean(row.question)}</td>
        <td>${clean(row.maxmarks)}</td>
        <td>${clean(row.data).replace(/\n/g, "<br/>")}</td>
        <td>${row.evidenceurl ? `<a href="${row.evidenceurl}">Evidence</a>` : ""}</td>
        <td>${clean(row.status)}</td>
      </tr>`).join("")}</tbody>
    </table>
  `).join("");
  const win = window.open("", "_blank", "width=1100,height=800");
  if (!win) return;
  win.document.write(`<!doctype html><html><head><title>${title}</title><style>
    @page{size:A4 portrait;margin:12mm}body{font-family:Arial,sans-serif;color:#000;background:#fff;margin:0}
    .actions{padding:10px;border-bottom:1px solid #ddd;text-align:right}.page{padding:12mm}.header{text-align:center;border-bottom:2px solid #111;padding-bottom:10px;margin-bottom:12px}
    .header img{max-height:64px;max-width:150px;object-fit:contain}.title{font-size:20px;font-weight:800;margin-top:8px}.meta{font-size:12px;margin-top:5px}
    h3{font-size:14px;margin:14px 0 6px;background:#f1f5f9;padding:6px;border:1px solid #333}
    table{width:100%;border-collapse:collapse;font-size:10.5px;margin-bottom:10px}th,td{border:1px solid #111;padding:5px;vertical-align:top;text-align:left;white-space:normal;overflow-wrap:anywhere}th{background:#e5e7eb}
    @media print{.actions{display:none}.page{padding:0}thead{display:table-header-group}tr{break-inside:avoid}}
  </style></head><body><div class="actions"><button onclick="window.print()">Print</button><button onclick="window.close()">Close</button></div>
    <div class="page"><div class="header">${logo ? `<img src="${logo}" />` : ""}<div class="title">${name}</div><div>${address}</div><div class="title">${title}</div>
    <div class="meta">Academic Year: ${clean(selection.academicyear)} | Regulation: ${clean(selection.regulation)} | Program: ${clean(selection.program)} (${clean(selection.programcode)})</div></div>${html || "<p>No SAR data available.</p>"}</div>
  </body></html>`);
  win.document.close();
}

function DynamicFilterPanel({ fields, filters, setFilters, options, onSearch }) {
  const [activeFields, setActiveFields] = useState(["academicyear", "program", "status"]);
  const [fieldToAdd, setFieldToAdd] = useState(null);
  const addField = () => {
    if (!fieldToAdd || activeFields.includes(fieldToAdd)) return;
    setActiveFields((prev) => [...prev, fieldToAdd]);
    setFieldToAdd(null);
  };
  const removeField = (field) => {
    setActiveFields((prev) => prev.filter((item) => item !== field));
    setFilters((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <Autocomplete
            options={fields.filter((field) => !activeFields.includes(field))}
            value={fieldToAdd}
            onChange={(_, value) => setFieldToAdd(value)}
            getOptionLabel={(option) => fieldLabel(option)}
            renderInput={(params) => <TextField {...params} size="small" label="Add dynamic filter" />}
          />
        </Grid>
        <Grid item xs={12} md={2}><Button fullWidth variant="outlined" onClick={addField}>Add filter</Button></Grid>
        <Grid item xs={12} md={2}><Button fullWidth variant="contained" startIcon={<SearchIcon />} onClick={onSearch}>Search</Button></Grid>
        <Grid item xs={12} />
        {activeFields.map((field) => (
          <Grid item xs={12} md={3} key={field}>
            <Stack spacing={0.5}>
              <Autocomplete
                multiple
                freeSolo
                options={options[field] || []}
                value={Array.isArray(filters[field]) ? filters[field] : (filters[field] ? [filters[field]] : [])}
                onChange={(_, value) => setFilters((prev) => ({ ...prev, [field]: value || [] }))}
                renderInput={(params) => <TextField {...params} size="small" label={fieldLabel(field)} />}
              />
              <Button size="small" color="error" onClick={() => removeField(field)}>Remove</Button>
            </Stack>
          </Grid>
        ))}
      </Grid>
    </Paper>
  );
}

export default function NbaMcaSarPage() {
  const [options, setOptions] = useState({});
  const [programs, setPrograms] = useState([]);
  const [institution, setInstitution] = useState({});
  const [questions, setQuestions] = useState([]);
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [aiOptions, setAiOptions] = useState({ geminiModels: ["gemini-2.5-flash-lite"], ollamaConfigs: [] });
  const [aiForm, setAiForm] = useState({ provider: "Gemini", geminiModel: "gemini-2.5-flash-lite", ollamaConfigId: "", additionalprompt: "" });
  const [filters, setFilters] = useState({});
  const [selection, setSelection] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const selectedProgram = useMemo(() => programs.find((row) => clean(row.program) === clean(form.program) && (!form.programcode || clean(row.programcode) === clean(form.programcode))), [programs, form.program, form.programcode]);
  const criteria = useMemo(() => [...new Set(questions.map((q) => q.criterion))], [questions]);
  const filteredQuestions = useMemo(() => questions.filter((q) => !form.criterion || q.criterion === form.criterion), [questions, form.criterion]);

  const loadOptions = async () => {
    const [optRes, qRes, aiRes] = await Promise.all([
      ep1.get("/api/v2/nba-mca-sar/options", { params: { colid: global1.colid } }),
      ep1.get("/api/v2/nba-mca-sar/questions"),
      ep1.get("/api/v2/nba-mca-sar/ai-options", { params: { colid: global1.colid } })
    ]);
    setOptions(optRes.data?.options || {});
    setPrograms(optRes.data?.programs || []);
    setInstitution(optRes.data?.institution || {});
    setQuestions(qRes.data?.questions || []);
    const nextAiOptions = aiRes.data || { geminiModels: ["gemini-2.5-flash-lite"], ollamaConfigs: [] };
    setAiOptions(nextAiOptions);
    setAiForm((prev) => ({
      ...prev,
      geminiModel: nextAiOptions.geminiModels?.includes(prev.geminiModel) ? prev.geminiModel : (nextAiOptions.geminiModels?.[0] || "gemini-2.5-flash-lite"),
      ollamaConfigId: prev.ollamaConfigId || nextAiOptions.ollamaConfigs?.[0]?._id || ""
    }));
  };

  const loadRows = async () => {
    const params = queryString({ colid: global1.colid, ...filters });
    const res = await ep1.get(`/api/v2/nba-mca-sar/responses?${params}`);
    setRows(res.data?.data || []);
    if (res.data?.institution) setInstitution(res.data.institution);
  };

  useEffect(() => {
    loadOptions();
    loadRows();
  }, []);

  const setField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const chooseProgram = (program) => {
    setForm((prev) => ({
      ...prev,
      academicyear: program?.academicyear || prev.academicyear,
      regulation: program?.regulation || prev.regulation,
      program: program?.program || "",
      programcode: program?.programcode || "",
    }));
  };

  const chooseQuestion = (question) => {
    if (!question) return;
    setForm((prev) => ({
      ...prev,
      criterion: question.criterion,
      questionno: question.questionno,
      question: question.question,
      maxmarks: question.maxmarks,
      erpsource: question.erpsource
    }));
  };

  const pullData = async () => {
    if (!form.erpsource || form.erpsource === "manual") return alert("This question is manual. Enter the response and evidence.");
    setLoading(true);
    try {
      const res = await ep1.post("/api/v2/nba-mca-sar/import-erp", { ...form, colid: global1.colid });
      if (!res.data?.success) throw new Error(res.data?.message || "ERP import failed");
      setForm((prev) => ({ ...prev, data: res.data.data, datapulled: "Yes" }));
    } catch (error) {
      alert(error.response?.data?.message || error.message);
    } finally {
      setLoading(false);
    }
  };

  const generateContent = async () => {
    if (!form.questionno) return alert("Select a SAR question first.");
    if (aiForm.provider === "Ollama" && !aiForm.ollamaConfigId) return alert("Select an Ollama configuration.");
    setLoading(true);
    try {
      const res = await ep1.post("/api/v2/nba-mca-sar/generate-content", {
        ...form,
        colid: global1.colid,
        provider: aiForm.provider,
        geminiModel: aiForm.geminiModel,
        ollamaConfigId: aiForm.ollamaConfigId,
        additionalprompt: aiForm.additionalprompt,
        erpdata: form.data
      });
      if (!res.data?.success) throw new Error(res.data?.message || "AI content generation failed");
      setForm((prev) => ({ ...prev, data: res.data.data || "" }));
      setMessage("AI generated SAR content. Review and save the response.");
    } catch (error) {
      alert(error.response?.data?.message || error.message);
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    if (!form.academicyear || !form.program || !form.programcode || !form.questionno) return alert("Select academic year, program and question.");
    setLoading(true);
    try {
      const res = await ep1.post("/api/v2/nba-mca-sar/responses", { ...form, colid: global1.colid, name: global1.name, user: global1.user });
      if (!res.data?.success) throw new Error(res.data?.message || "Save failed");
      setMessage("SAR response saved.");
      setForm((prev) => ({ ...emptyForm, sarformat: prev.sarformat, academicyear: prev.academicyear, regulation: prev.regulation, program: prev.program, programcode: prev.programcode }));
      loadRows();
      loadOptions();
    } catch (error) {
      alert(error.response?.data?.message || error.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteSelected = async () => {
    if (!selection.length) return;
    if (!window.confirm(`Delete ${selection.length} selected SAR responses?`)) return;
    await ep1.post("/api/v2/nba-mca-sar/responses-delete", { colid: global1.colid, ids: selection });
    setSelection([]);
    loadRows();
  };

  const downloadTemplate = () => {
    const headers = Object.keys(emptyForm).filter((field) => field !== "_id");
    const ws = XLSX.utils.json_to_sheet([headers.reduce((acc, field) => ({ ...acc, [field]: "" }), {})], { header: headers });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "MCA SAR");
    XLSX.writeFile(wb, "nba-mca-sar-template.xlsx");
  };

  const bulkUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const records = XLSX.utils.sheet_to_json(sheet, { defval: "" });
    setLoading(true);
    try {
      for (const record of records) {
        await ep1.post("/api/v2/nba-mca-sar/responses", { ...record, colid: global1.colid, name: global1.name, user: global1.user });
      }
      setMessage(`${records.length} SAR rows uploaded.`);
      loadRows();
      loadOptions();
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { field: "academicyear", headerName: "Academic year", width: 130 },
    { field: "regulation", headerName: "Regulation", width: 130 },
    { field: "program", headerName: "Program", minWidth: 170 },
    { field: "programcode", headerName: "Program code", width: 130 },
    { field: "questionno", headerName: "Q. No.", width: 90 },
    { field: "criterion", headerName: "Criterion", minWidth: 240, flex: 1 },
    { field: "question", headerName: "Question", minWidth: 320, flex: 1.2 },
    { field: "maxmarks", headerName: "Marks", width: 90 },
    { field: "erpsource", headerName: "ERP source", width: 130 },
    { field: "data", headerName: "Data", minWidth: 260, flex: 1 },
    { field: "evidenceurl", headerName: "Evidence", minWidth: 180, renderCell: ({ value }) => value ? <a href={value} target="_blank" rel="noreferrer">Open</a> : "" },
    { field: "status", headerName: "Status", width: 120 },
    { field: "edit", headerName: "Edit", width: 90, sortable: false, renderCell: ({ row }) => <Button size="small" onClick={() => setForm(row)}>Edit</Button> }
  ];

  const filterFields = ["sarformat", "academicyear", "regulation", "program", "programcode", "semester", "department", "criterion", "questionno", "status"];

  return (
    <MenuPageShell title="MCA SAR">
      <Stack spacing={2} sx={{ p: 2 }}>
        <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1}>
          <Box>
            <Typography variant="h5" fontWeight={900}>NBA SAR - Tier 1 MCA</Typography>
            <Typography color="text.secondary">Select the MCA SAR format, complete every question, pull ERP evidence where available, and print the SAR.</Typography>
          </Box>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Button variant="outlined" startIcon={<DownloadIcon />} onClick={downloadTemplate}>Template</Button>
            <Button variant="outlined" component="label" startIcon={<UploadFileIcon />}>Bulk upload<input hidden type="file" accept=".xlsx,.xls,.csv" onChange={bulkUpload} /></Button>
            <Button variant="outlined" startIcon={<PrintIcon />} onClick={() => printSar({ rows, institution, selection: form })}>Print preview</Button>
          </Stack>
        </Stack>
        {message && <Alert severity="success" onClose={() => setMessage("")}>{message}</Alert>}

        <Paper variant="outlined" sx={{ p: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={3}>
              <Autocomplete options={options.sarformat || ["NBA SAR Tier 1 MCA"]} value={form.sarformat} onChange={(_, v) => setField("sarformat", v || "NBA SAR Tier 1 MCA")} renderInput={(params) => <TextField {...params} size="small" label="SAR format" />} />
            </Grid>
            <Grid item xs={12} md={2}>
              <Autocomplete freeSolo options={options.academicyear || []} value={form.academicyear} onChange={(_, v) => setField("academicyear", clean(v))} onInputChange={(_, v) => setField("academicyear", clean(v))} renderInput={(params) => <TextField {...params} size="small" label="Academic year" />} />
            </Grid>
            <Grid item xs={12} md={2}>
              <Autocomplete freeSolo options={options.regulation || []} value={form.regulation} onChange={(_, v) => setField("regulation", clean(v))} onInputChange={(_, v) => setField("regulation", clean(v))} renderInput={(params) => <TextField {...params} size="small" label="Regulation" />} />
            </Grid>
            <Grid item xs={12} md={5}>
              <Autocomplete
                options={programs}
                value={selectedProgram || null}
                onChange={(_, value) => chooseProgram(value)}
                getOptionLabel={(option) => clean(`${option.program || ""} ${option.programcode ? `(${option.programcode})` : ""}`)}
                renderInput={(params) => <TextField {...params} size="small" label="Program / MCA" />}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <Autocomplete options={criteria} value={form.criterion || null} onChange={(_, value) => setField("criterion", value || "")} renderInput={(params) => <TextField {...params} size="small" label="Criterion" />} />
            </Grid>
            <Grid item xs={12} md={8}>
              <Autocomplete
                options={filteredQuestions}
                value={questions.find((q) => q.questionno === form.questionno) || null}
                onChange={(_, value) => chooseQuestion(value)}
                getOptionLabel={(option) => clean(`${option.questionno} - ${option.question}`)}
                renderInput={(params) => <TextField {...params} size="small" label="Question" />}
              />
            </Grid>
            <Grid item xs={12} md={2}><TextField fullWidth size="small" label="Max marks" value={form.maxmarks} onChange={(e) => setField("maxmarks", e.target.value)} /></Grid>
            <Grid item xs={12} md={2}><TextField fullWidth size="small" label="ERP source" value={form.erpsource} onChange={(e) => setField("erpsource", e.target.value)} /></Grid>
            <Grid item xs={12} md={2}><TextField fullWidth size="small" select label="Status" value={form.status} onChange={(e) => setField("status", e.target.value)}>{["Draft", "Submitted", "Reviewed", "Approved"].map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}</TextField></Grid>
            <Grid item xs={12} md={2}><TextField fullWidth size="small" label="Numeric value" value={form.numericvalue} onChange={(e) => setField("numericvalue", e.target.value)} /></Grid>
            <Grid item xs={12} md={8}><TextField fullWidth size="small" label="Evidence AWS/link" value={form.evidenceurl} onChange={(e) => setField("evidenceurl", e.target.value)} /></Grid>
            <Grid item xs={12}>
              <Paper variant="outlined" sx={{ p: 2, background: "#f8fafc" }}>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} md={2}>
                    <TextField select fullWidth size="small" label="AI provider" value={aiForm.provider} onChange={(e) => setAiForm((prev) => ({ ...prev, provider: e.target.value }))}>
                      <MenuItem value="Gemini">Gemini</MenuItem>
                      <MenuItem value="Ollama">Ollama</MenuItem>
                    </TextField>
                  </Grid>
                  {aiForm.provider === "Gemini" ? (
                    <Grid item xs={12} md={3}>
                      <Autocomplete
                        options={aiOptions.geminiModels || ["gemini-2.5-flash-lite"]}
                        value={aiForm.geminiModel}
                        onChange={(_, value) => setAiForm((prev) => ({ ...prev, geminiModel: value || "gemini-2.5-flash-lite" }))}
                        renderInput={(params) => <TextField {...params} size="small" label="Gemini model" />}
                      />
                    </Grid>
                  ) : (
                    <Grid item xs={12} md={3}>
                      <TextField select fullWidth size="small" label="Ollama config" value={aiForm.ollamaConfigId} onChange={(e) => setAiForm((prev) => ({ ...prev, ollamaConfigId: e.target.value }))}>
                        {(aiOptions.ollamaConfigs || []).map((item) => <MenuItem key={item._id} value={item._id}>{item.name || item.modelname} - {item.modelname}</MenuItem>)}
                      </TextField>
                    </Grid>
                  )}
                  <Grid item xs={12} md={5}>
                    <TextField fullWidth size="small" label="Additional AI prompt" value={aiForm.additionalprompt} onChange={(e) => setAiForm((prev) => ({ ...prev, additionalprompt: e.target.value }))} />
                  </Grid>
                  <Grid item xs={12} md={2}>
                    <Button fullWidth variant="contained" startIcon={<SmartToyIcon />} disabled={loading} onClick={generateContent}>{loading ? "Generating..." : "Generate content"}</Button>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>
            <Grid item xs={12}><TextField fullWidth multiline minRows={5} label="SAR data / response" value={form.data} onChange={(e) => setField("data", e.target.value)} /></Grid>
            <Grid item xs={12}><TextField fullWidth multiline minRows={2} label="Remarks" value={form.remarks} onChange={(e) => setField("remarks", e.target.value)} /></Grid>
            <Grid item xs={12}>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                <Button variant="outlined" startIcon={<SyncIcon />} disabled={loading} onClick={pullData}>Pull from ERP</Button>
                <Button variant="contained" startIcon={<SaveIcon />} disabled={loading} onClick={save}>Save response</Button>
                <Button variant="outlined" onClick={() => setForm(emptyForm)}>Clear form</Button>
              </Stack>
            </Grid>
          </Grid>
        </Paper>

        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography fontWeight={800} sx={{ mb: 1 }}>Dynamic Search</Typography>
          <DynamicFilterPanel fields={filterFields} filters={filters} setFilters={setFilters} options={options} onSearch={loadRows} />
        </Paper>

        <Stack direction="row" spacing={1} flexWrap="wrap">
          <Chip label={`${questions.length} SAR questions available`} />
          <Chip label={`${rows.length} response rows`} />
          <Button variant="outlined" startIcon={<DownloadIcon />} onClick={() => exportCsv("nba-mca-sar.csv", rows, columns.filter((c) => !["edit"].includes(c.field)))}>Export</Button>
          <Button color="error" variant="outlined" startIcon={<DeleteIcon />} disabled={!selection.length} onClick={deleteSelected}>Bulk delete</Button>
        </Stack>
        <Paper sx={{ height: 680 }}>
          <DataGrid
            rows={rowsWithId(rows)}
            columns={columns}
            checkboxSelection
            onRowSelectionModelChange={(model) => setSelection(Array.from(model))}
            slots={{ toolbar: GridToolbar }}
            sx={gridSx}
            getRowHeight={() => "auto"}
          />
        </Paper>
      </Stack>
    </MenuPageShell>
  );
}
