import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Collapse,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  MenuItem,
  Paper,
  Stack,
  Switch,
  TextField,
  Typography
} from "@mui/material";
import { DataGrid, GridActionsCellItem, GridToolbar } from "@mui/x-data-grid";
import AutoModeIcon from "@mui/icons-material/AutoMode";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PrintIcon from "@mui/icons-material/Print";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import SaveIcon from "@mui/icons-material/Save";
import ep1 from "../api/ep1";
import global1 from "./global1";
import MenuPageShell from "./MenuPageShell";

const blankForm = {
  title: "",
  description: "",
  requirement: "",
  provider: "Gemini",
  geminiModel: "gemini-2.5-flash-lite",
  ollamaConfigId: "",
  crudMode: "CRUD",
  dropdownRules: "",
  selectedModels: [],
  status: "Generated",
  pageCode: "",
  pageSchemaText: "",
  refinementCommand: ""
};

const fallbackRows = [
  { id: 1, title: "Sample entry", description: "Generated page preview row", status: "Active" }
];

const fieldValue = (row, field) => row?.[field] ?? "";

const isColidField = (item = {}) => String(item.name || item.field || "").trim().toLowerCase() === "colid";

const optionValue = (option) => (typeof option === "object" && option !== null ? option.value : option);
const optionLabel = (option) => String(typeof option === "object" && option !== null ? (option.label ?? option.value ?? "") : (option ?? ""));

const enforceRuntimeColidSchema = (schema = {}) => ({
  ...schema,
  colidScoped: true,
  dataSource: {
    ...(schema.dataSource || {}),
    colidScoped: true
  },
  filters: Array.isArray(schema.filters) ? schema.filters.filter((item) => !isColidField(item)) : [],
  formFields: Array.isArray(schema.formFields) ? schema.formFields.filter((item) => !isColidField(item)) : [],
  tableColumns: Array.isArray(schema.tableColumns) ? schema.tableColumns.filter((item) => !isColidField(item)) : []
});

const numericValue = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const asGridDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatCardValue = (value, card = {}) => {
  if (card.format === "currency") {
    return new Intl.NumberFormat("en-IN", { maximumFractionDigits: card.decimals ?? 2 }).format(numericValue(value));
  }
  if (card.format === "percent") {
    return `${numericValue(value).toFixed(card.decimals ?? 2)}%`;
  }
  if (typeof value === "number") {
    return value.toLocaleString("en-IN", { maximumFractionDigits: card.decimals ?? 2 });
  }
  return String(value ?? "");
};

const BufferedTextField = React.memo(function BufferedTextField({ value, onValueChange, commitDelay = 300, ...props }) {
  const [localValue, setLocalValue] = useState(value || "");
  const timerRef = useRef(null);

  useEffect(() => {
    setLocalValue(value || "");
  }, [value]);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const commit = useCallback((nextValue) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    onValueChange(nextValue);
  }, [onValueChange]);

  const handleChange = (event) => {
    const nextValue = event.target.value;
    setLocalValue(nextValue);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onValueChange(nextValue), commitDelay);
  };

  return (
    <TextField
      {...props}
      value={localValue}
      onChange={handleChange}
      onBlur={() => commit(localValue)}
    />
  );
});

const GeneratedPageRunner = React.memo(function GeneratedPageRunner({ page }) {
  const schema = enforceRuntimeColidSchema(page?.pageSchema || {});
  const [formData, setFormData] = useState({});
  const [liveRows, setLiveRows] = useState([]);
  const [selectedLiveRows, setSelectedLiveRows] = useState([]);
  const [editLiveId, setEditLiveId] = useState("");
  const [loadingLive, setLoadingLive] = useState(false);
  const [savingLive, setSavingLive] = useState(false);
  const [runnerMessage, setRunnerMessage] = useState("");
  const [runnerError, setRunnerError] = useState("");
  const [dynamicOptions, setDynamicOptions] = useState({});
  const modelName = schema.dataSource?.model || schema.primaryModel || page?.selectedModels?.[0] || "";
  const canCrud = !/^view|report$/i.test(String(schema.dataSource?.mode || ""));
  const rows = liveRows.length ? liveRows : [];
  const columns = (Array.isArray(schema.tableColumns) && schema.tableColumns.length ? schema.tableColumns : [
    { field: "title", headerName: "Title" },
    { field: "description", headerName: "Description" },
    { field: "status", headerName: "Status" }
  ]).map((column) => {
    const type = String(column.type || "").toLowerCase();
    const normalizedType = type === "datetime" ? "dateTime" : column.type;
    const needsDateGetter = ["date", "datetime"].includes(type) || column.type === "dateTime";
    return {
      ...column,
      type: normalizedType,
      valueGetter: column.valueGetter || (needsDateGetter ? (params) => asGridDate(params.row?.[column.field]) : undefined),
      minWidth: column.minWidth || 150,
      flex: column.flex || 1
    };
  });

  const computedCards = useMemo(() => {
    const configuredCards = Array.isArray(schema.cards) ? schema.cards : [];
    const cards = configuredCards.map((card) => {
      const aggregate = String(card.aggregate || card.type || "").toLowerCase();
      const valueField = card.valueField || card.field;
      let value = card.value ?? "";
      if (aggregate === "count" || card.count === true) {
        value = rows.length;
      } else if (valueField && ["sum", "avg", "average", "min", "max"].includes(aggregate)) {
        const values = rows.map((row) => numericValue(row[valueField]));
        if (aggregate === "sum") value = values.reduce((total, item) => total + item, 0);
        if (aggregate === "avg" || aggregate === "average") value = values.length ? values.reduce((total, item) => total + item, 0) / values.length : 0;
        if (aggregate === "min") value = values.length ? Math.min(...values) : 0;
        if (aggregate === "max") value = values.length ? Math.max(...values) : 0;
      } else if (valueField && rows.length) {
        value = rows[0]?.[valueField] ?? value;
      }
      return { ...card, computedValue: formatCardValue(value, card) };
    });
    if (!cards.some((card) => String(card.label || "").toLowerCase() === "total rows")) {
      cards.push({ label: "Total Rows", computedValue: rows.length.toLocaleString("en-IN") });
    }
    return cards;
  }, [schema.cards, rows]);

  const computedCharts = useMemo(() => {
    const chartDefs = Array.isArray(schema.charts) ? schema.charts : [];
    return chartDefs.map((chart) => {
      const labelField = chart.labelField || chart.groupBy || chart.categoryField;
      const valueField = chart.valueField || chart.field;
      const aggregate = String(chart.aggregate || (valueField ? "sum" : "count")).toLowerCase();
      const grouped = new Map();
      rows.forEach((row) => {
        const label = String(row[labelField] ?? "Unspecified");
        const current = grouped.get(label) || { label, count: 0, total: 0 };
        current.count += 1;
        current.total += valueField ? numericValue(row[valueField]) : 1;
        grouped.set(label, current);
      });
      const data = Array.from(grouped.values()).map((item) => ({
        label: item.label,
        value: aggregate === "count" ? item.count : aggregate === "avg" || aggregate === "average" ? (item.count ? item.total / item.count : 0) : item.total
      })).sort((a, b) => b.value - a.value).slice(0, chart.limit || 12);
      const max = Math.max(...data.map((item) => item.value), 1);
      return { ...chart, data, max };
    });
  }, [schema.charts, rows]);

  const setValue = (name, value) => setFormData((prev) => ({ ...prev, [name]: value }));

  const buildOptionFilters = (field) => {
    const source = field?.optionsSource || {};
    const filters = { ...(source.staticFilters || {}) };
    (source.dependsOn || []).forEach((item) => {
      const sourceField = item.sourceField || item.field;
      const targetField = item.targetField || item.modelField || sourceField;
      if (sourceField && targetField && formData[sourceField] !== undefined && formData[sourceField] !== "") {
        filters[targetField] = formData[sourceField];
      }
    });
    return filters;
  };

  const loadFieldOptions = async (field) => {
    const source = field?.optionsSource;
    if (!source?.model || !source?.valueField) return;
    const key = field.name;
    try {
      const response = await ep1.post("/api/v2/ai-coding/model-options", {
        colid: global1.colid,
        modelName: source.model,
        valueField: source.valueField,
        labelField: source.labelField || source.valueField,
        filters: buildOptionFilters(field),
        limit: source.limit || 500
      });
      setDynamicOptions((prev) => ({ ...prev, [key]: response.data?.options || [] }));
    } catch (err) {
      setRunnerError(err.response?.data?.message || `Unable to load ${field.label || field.name} options.`);
    }
  };

  const configuredOptions = (field) => (
    field?.optionsSource ? (dynamicOptions[field.name] || field.options || []) : (field.options || [])
  );

  const renderRuntimeField = (field, gridProps = {}) => {
    const isDynamicSelect = !!field.optionsSource || field.type === "select";
    const value = formData[field.name] || "";
    if (isDynamicSelect) {
      const optionsList = configuredOptions(field);
      const selected = optionsList.find((option) => String(optionValue(option)) === String(value)) || (value ? { value, label: value } : null);
      return (
        <Grid item xs={12} {...gridProps} key={field.name}>
          <Autocomplete
            options={optionsList}
            value={selected}
            getOptionLabel={optionLabel}
            isOptionEqualToValue={(option, selectedOption) => String(optionValue(option)) === String(optionValue(selectedOption))}
            onOpen={() => loadFieldOptions(field)}
            onChange={(event, selectedOption) => setValue(field.name, optionValue(selectedOption) || "")}
            renderInput={(params) => (
              <TextField
                {...params}
                label={field.label || field.name}
                required={!!field.required}
                helperText={field.optionsSource ? `Loaded from ${field.optionsSource.model}.${field.optionsSource.valueField}` : ""}
              />
            )}
          />
        </Grid>
      );
    }
    return (
      <Grid item xs={12} {...gridProps} key={field.name}>
        <TextField
          fullWidth
          required={!!field.required}
          multiline={field.type === "textarea"}
          minRows={field.type === "textarea" ? 3 : undefined}
          type={field.type === "date" ? "date" : field.type === "number" ? "number" : "text"}
          label={field.label || field.name}
          value={value}
          onChange={(event) => setValue(field.name, event.target.value)}
          InputLabelProps={field.type === "date" ? { shrink: true } : undefined}
        />
      </Grid>
    );
  };

  const loadLiveRows = async () => {
    if (!modelName) {
      setRunnerError("No data model is configured for this generated page.");
      return;
    }
    setLoadingLive(true);
    setRunnerError("");
    setRunnerMessage("");
    try {
      const filterValues = {};
      (schema.filters || []).forEach((filter) => {
        if (formData[filter.name] !== undefined && formData[filter.name] !== "") filterValues[filter.name] = formData[filter.name];
      });
      const response = await ep1.post("/api/v2/ai-coding/model-data", {
        colid: global1.colid,
        pageId: page._id,
        modelName,
        filters: filterValues,
        limit: schema.dataSource?.pageSize || 100
      });
      setLiveRows(response.data?.rows || []);
      setRunnerMessage(`${response.data?.count || 0} row(s) loaded from ${modelName}.`);
    } catch (err) {
      setRunnerError(err.response?.data?.message || "Unable to load data for generated page.");
    } finally {
      setLoadingLive(false);
    }
  };

  useEffect(() => {
    setFormData({});
    setLiveRows([]);
    setSelectedLiveRows([]);
    setEditLiveId("");
    setRunnerMessage("");
    setRunnerError("");
    setDynamicOptions({});
    if (schema.dataSource?.loadOnRun) {
      setTimeout(loadLiveRows, 0);
    }
  }, [page?._id]);

  const saveLiveRow = async () => {
    if (!modelName) {
      setRunnerError("No data model is configured for this generated page.");
      return;
    }
    const missing = (schema.formFields || []).filter((field) => field.required && !formData[field.name]);
    if (missing.length) {
      setRunnerError(`Required field missing: ${missing.map((field) => field.label || field.name).join(", ")}`);
      return;
    }
    setSavingLive(true);
    setRunnerError("");
    setRunnerMessage("");
    try {
      await ep1.post("/api/v2/ai-coding/model-save", {
        colid: global1.colid,
        pageId: page._id,
        modelName,
        id: editLiveId,
        data: formData,
        user: global1.user,
        createdby: global1.name
      });
      setRunnerMessage(editLiveId ? "Entry updated." : "Entry saved.");
      setEditLiveId("");
      setFormData({});
      await loadLiveRows();
    } catch (err) {
      setRunnerError(err.response?.data?.message || "Unable to save generated page entry.");
    } finally {
      setSavingLive(false);
    }
  };

  const editLiveRow = (row) => {
    const next = {};
    (schema.formFields || []).forEach((field) => { next[field.name] = row[field.name] ?? ""; });
    setFormData(next);
    setEditLiveId(row._id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteLiveRows = async () => {
    if (!selectedLiveRows.length) {
      setRunnerError("Select at least one row.");
      return;
    }
    if (!window.confirm("Delete selected generated page row(s)?")) return;
    setSavingLive(true);
    setRunnerError("");
    try {
      await ep1.post("/api/v2/ai-coding/model-delete", {
        colid: global1.colid,
        pageId: page._id,
        modelName,
        ids: selectedLiveRows
      });
      setRunnerMessage("Selected row(s) deleted.");
      setSelectedLiveRows([]);
      await loadLiveRows();
    } catch (err) {
      setRunnerError(err.response?.data?.message || "Unable to delete selected rows.");
    } finally {
      setSavingLive(false);
    }
  };

  const printPreview = () => {
    const win = window.open("", "_blank", "width=1100,height=800");
    if (!win) return;
    win.document.write(`
      <html>
        <head>
          <title>${schema.title || page?.title || "Generated Page"}</title>
          <style>
            body{font-family:Arial,sans-serif;color:#111;margin:24px;background:#fff}
            .header{text-align:center;border-bottom:2px solid #111;padding-bottom:10px;margin-bottom:16px}
            .cards{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px}
            .card{border:1px solid #111;padding:10px}
            table{width:100%;border-collapse:collapse}
            th,td{border:1px solid #111;padding:6px;text-align:left}
            @media print{button{display:none}.page{page-break-after:auto}}
          </style>
        </head>
        <body>
          <button onclick="window.print()">Print</button>
          <button onclick="window.close()">Close</button>
          <div class="header">
            <h2>${schema.title || page?.title || "Generated Page"}</h2>
            <p>Generated from AI Coding</p>
          </div>
          <div class="cards">
            ${computedCards.map((card) => `<div class="card"><b>${card.label || ""}</b><br/>${card.computedValue ?? ""}</div>`).join("")}
          </div>
          <table>
            <thead><tr>${columns.map((column) => `<th>${column.headerName || column.field}</th>`).join("")}</tr></thead>
            <tbody>${rows.map((row) => `<tr>${columns.map((column) => `<td>${fieldValue(row, column.field)}</td>`).join("")}</tr>`).join("")}</tbody>
          </table>
        </body>
      </html>
    `);
    win.document.close();
  };

  return (
    <Paper sx={{ p: 2, border: "1px solid", borderColor: "primary.light" }}>
      <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1} sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>{schema.title || page?.title || "Generated Page"}</Typography>
          <Typography variant="body2" color="text.secondary">{page?.description || "Live page preview from generated schema"}</Typography>
          <Typography variant="caption" color="text.secondary">Data model: {modelName || "Not configured"}</Typography>
        </Box>
        <Button variant="outlined" startIcon={<PrintIcon />} onClick={printPreview}>Print Preview</Button>
      </Stack>

      {runnerMessage && <Alert severity="success" sx={{ mb: 2 }}>{runnerMessage}</Alert>}
      {runnerError && <Alert severity="error" sx={{ mb: 2 }}>{runnerError}</Alert>}

      {!!computedCards.length && (
        <Grid container spacing={1.5} sx={{ mb: 2 }}>
          {computedCards.map((card, index) => (
            <Grid item xs={12} sm={6} md={3} key={`${card.label}-${index}`}>
              <Paper sx={{ p: 1.5, bgcolor: index % 2 ? "#f8fafc" : "#eef7ee", borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary">{card.label}</Typography>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>{String(card.computedValue ?? "")}</Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}

      {!!computedCharts.length && (
        <Grid container spacing={1.5} sx={{ mb: 2 }}>
          {computedCharts.map((chart, index) => (
            <Grid item xs={12} md={6} key={`${chart.title || "chart"}-${index}`}>
              <Paper variant="outlined" sx={{ p: 1.5 }}>
                <Typography sx={{ fontWeight: 800, mb: 1 }}>{chart.title || "Summary Chart"}</Typography>
                {!chart.data.length && <Typography variant="body2" color="text.secondary">Load data to view chart.</Typography>}
                <Stack spacing={0.8}>
                  {chart.data.map((item) => (
                    <Box key={item.label}>
                      <Stack direction="row" justifyContent="space-between" spacing={1}>
                        <Typography variant="caption" sx={{ maxWidth: "70%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.label}</Typography>
                        <Typography variant="caption" sx={{ fontWeight: 700 }}>{formatCardValue(item.value, chart)}</Typography>
                      </Stack>
                      <Box sx={{ height: 8, bgcolor: "#e5e7eb", borderRadius: 1, overflow: "hidden" }}>
                        <Box sx={{ height: "100%", width: `${Math.max(4, (item.value / chart.max) * 100)}%`, bgcolor: index % 2 ? "#2563eb" : "#16a34a" }} />
                      </Box>
                    </Box>
                  ))}
                </Stack>
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}

      {!!schema.filters?.length && (
        <Paper variant="outlined" sx={{ p: 1.5, mb: 2 }}>
          <Typography sx={{ fontWeight: 700, mb: 1 }}>Dynamic Filters</Typography>
          <Grid container spacing={1.5}>
            {schema.filters.map((filter) => renderRuntimeField(filter, { sm: 6, md: 3 }))}
          </Grid>
          <Stack direction="row" spacing={1} sx={{ mt: 1.5 }} flexWrap="wrap">
            <Button variant="contained" startIcon={loadingLive ? <CircularProgress size={18} color="inherit" /> : <PlayArrowIcon />} onClick={loadLiveRows} disabled={loadingLive || savingLive}>
              Load Data
            </Button>
            <Button variant="outlined" onClick={() => setFormData({})} disabled={loadingLive || savingLive}>
              Clear Filters
            </Button>
          </Stack>
        </Paper>
      )}

      {canCrud && !!schema.formFields?.length && (
        <Paper variant="outlined" sx={{ p: 1.5, mb: 2 }}>
          <Typography sx={{ fontWeight: 700, mb: 1 }}>Data Entry</Typography>
          <Grid container spacing={1.5}>
            {schema.formFields.map((field) => renderRuntimeField(field, { md: field.type === "textarea" ? 12 : 4 }))}
          </Grid>
          <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
            <Button variant="contained" startIcon={savingLive ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />} onClick={saveLiveRow} disabled={savingLive || loadingLive}>
              {editLiveId ? "Update Entry" : "Save Entry"}
            </Button>
            <Button variant="outlined" onClick={() => { setFormData({}); setEditLiveId(""); }} disabled={savingLive || loadingLive}>Clear</Button>
          </Stack>
        </Paper>
      )}

      <Stack direction="row" spacing={1} sx={{ mb: 1 }} flexWrap="wrap">
        {!schema.filters?.length && (
          <Button variant="contained" startIcon={loadingLive ? <CircularProgress size={18} color="inherit" /> : <PlayArrowIcon />} onClick={loadLiveRows} disabled={loadingLive || savingLive}>
            Load Data
          </Button>
        )}
        {canCrud && <Button color="error" variant="outlined" startIcon={<DeleteIcon />} onClick={deleteLiveRows} disabled={savingLive || loadingLive || !selectedLiveRows.length}>
          Delete Selected
        </Button>}
      </Stack>

      <Box sx={{ height: 380, width: "100%" }}>
        <DataGrid
          rows={rows.map((row, index) => ({ id: row._id || row.id || index + 1, ...row }))}
          columns={[
            ...columns,
            ...(canCrud ? [{
              field: "runnerActions",
              type: "actions",
              headerName: "Actions",
              width: 90,
              getActions: (params) => [
                <GridActionsCellItem icon={<EditIcon />} label="Edit" onClick={() => editLiveRow(params.row)} />
              ]
            }] : [])
          ]}
          slots={{ toolbar: GridToolbar }}
          loading={loadingLive}
          checkboxSelection={canCrud}
          onRowSelectionModelChange={(selection) => setSelectedLiveRows(Array.from(selection))}
          disableRowSelectionOnClick
          sx={{ "& .MuiDataGrid-cell": { whiteSpace: "normal", alignItems: "flex-start", py: 1 } }}
        />
      </Box>
    </Paper>
  );
});

const GeneratedCodePanel = React.memo(function GeneratedCodePanel({ pageCode, pageSchemaText, mineOnly, onFieldChange }) {
  const handlePageCodeChange = useCallback((value) => onFieldChange("pageCode", value), [onFieldChange]);
  const handlePageSchemaChange = useCallback((value) => onFieldChange("pageSchemaText", value), [onFieldChange]);

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" sx={{ fontWeight: 800 }}>Generated Code and Runtime Schema</Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <BufferedTextField fullWidth multiline minRows={12} label="Generated React page code" value={pageCode} onValueChange={handlePageCodeChange} commitDelay={500} />
        </Grid>
        <Grid item xs={12} md={6}>
          <BufferedTextField
            fullWidth
            multiline
            minRows={12}
            label="Runtime page schema JSON"
            value={pageSchemaText}
            onValueChange={handlePageSchemaChange}
            commitDelay={500}
            InputProps={mineOnly ? { readOnly: true } : undefined}
            helperText={mineOnly ? "Institution scope is always enforced from the logged-in user and cannot be changed here." : "Institution scope is always enforced by the backend."}
          />
        </Grid>
      </Grid>
    </Paper>
  );
});

const StoredAiPagesGrid = React.memo(function StoredAiPagesGrid({ rows, columns, loading, working, selectedRows, onSelectionChange, onDeleteSelected }) {
  return (
    <Paper sx={{ p: 2 }}>
      <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1} sx={{ mb: 1 }}>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>Stored AI Generated Pages</Typography>
        <Button color="error" variant="outlined" startIcon={<DeleteIcon />} disabled={working || !selectedRows.length} onClick={onDeleteSelected}>
          Bulk Delete
        </Button>
      </Stack>
      <Box sx={{ height: 470, width: "100%" }}>
        <DataGrid
          rows={rows}
          columns={columns}
          getRowId={(row) => row._id}
          loading={loading}
          checkboxSelection
          onRowSelectionModelChange={onSelectionChange}
          slots={{ toolbar: GridToolbar }}
          disableRowSelectionOnClick
          sx={{ "& .MuiDataGrid-cell": { whiteSpace: "normal", alignItems: "flex-start", py: 1 } }}
        />
      </Box>
    </Paper>
  );
});

export function AiCodingPageBuilderWorkspace({
  mineOnly = false,
  pageTitle = "AI Page Coding",
  roleMenuOnly = false,
  noDirectModelSelection = false,
  advancedDropdownBuilder = false,
  appendModelsOnPageSelect = false,
  enableRefinement = false
}) {
  const [form, setForm] = useState(blankForm);
  const [rows, setRows] = useState([]);
  const [options, setOptions] = useState({ geminiModels: [], ollamaConfigs: [], models: [], modelDetails: {}, pageGroups: [], pageOptions: [] });
  const [selectedGroup, setSelectedGroup] = useState("");
  const [selectedPage, setSelectedPage] = useState(null);
  const [showAllModels, setShowAllModels] = useState(false);
  const [selectedRows, setSelectedRows] = useState([]);
  const [activePage, setActivePage] = useState(null);
  const [editId, setEditId] = useState("");
  const [loading, setLoading] = useState(false);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const runnerRef = useRef(null);

  const loadOptions = useCallback(async () => {
    const response = await ep1.get("/api/v2/ai-coding/options", {
      params: { colid: global1.colid, role: global1.role, roleMenuOnly }
    });
    setOptions(response.data || {});
  }, [roleMenuOnly]);

  const loadRows = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await ep1.get("/api/v2/ai-coding/pages", {
        params: { colid: global1.colid, mineOnly, user: global1.user }
      });
      setRows(response.data?.rows || []);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load generated pages.");
    } finally {
      setLoading(false);
    }
  }, [mineOnly]);

  useEffect(() => {
    loadOptions().catch(() => {});
    loadRows();
  }, [loadOptions, loadRows]);

  const setField = useCallback((field, value) => setForm((prev) => ({ ...prev, [field]: value })), []);

  const pageOptionsForGroup = useMemo(() => (
    (options.pageOptions || []).filter((page) => !selectedGroup || page.group === selectedGroup)
  ), [options.pageOptions, selectedGroup]);

  const suggestedModels = useMemo(() => {
    const values = selectedPage?.suggestedModels || [];
    return values.filter((model) => (options.models || []).includes(model));
  }, [selectedPage, options.models]);

  const addModelsFromPage = useCallback((page) => {
    setSelectedPage(page || null);
    if (!page) {
      if (!appendModelsOnPageSelect) setField("selectedModels", []);
      return;
    }
    const suggested = Array.isArray(page.suggestedModels) ? page.suggestedModels : [];
    setForm((prev) => {
      const hint = [
        prev.requirement,
        page.page ? `Selected existing page for context: ${page.group} / ${page.page} (${page.path || "no path"}).` : "",
        suggested.length ? `Use these related models where useful: ${suggested.join(", ")}.` : (noDirectModelSelection ? "No automatic model match was found for this role menu page." : "No automatic model match was found; use the direct model selector.")
      ].filter(Boolean).join("\n");
      const selectedModels = appendModelsOnPageSelect ? Array.from(new Set([...(prev.selectedModels || []), ...suggested])) : suggested;
      return { ...prev, selectedModels, requirement: hint };
    });
  }, [appendModelsOnPageSelect, noDirectModelSelection, setField]);

  const resetForm = useCallback(() => {
    setForm(blankForm);
    setEditId("");
    setActivePage(null);
    setMessage("");
    setError("");
  }, []);

  const parseSchemaText = () => {
    if (!form.pageSchemaText) return {};
    return enforceRuntimeColidSchema(JSON.parse(form.pageSchemaText));
  };

  const generatePage = async () => {
    if (!form.requirement.trim()) {
      setError("Describe the required page and functions first.");
      return;
    }
    setWorking(true);
    setError("");
    setMessage("Generating page with AI...");
    try {
      const response = await ep1.post("/api/v2/ai-coding/generate", {
        ...form,
        colid: global1.colid,
        user: global1.user,
        createdby: global1.name
      });
      const row = response.data?.row;
      setMessage("Generated page saved.");
      setActivePage(row);
      setEditId(row?._id || "");
      setForm((prev) => ({
        ...prev,
        title: row?.title || prev.title,
        description: row?.description || prev.description,
        requirement: row?.requirement || prev.requirement,
        provider: row?.provider || prev.provider,
        geminiModel: row?.geminiModel || prev.geminiModel,
        ollamaConfigId: row?.ollamaConfigId || prev.ollamaConfigId,
        crudMode: row?.crudMode || prev.crudMode || "CRUD",
        dropdownRules: row?.dropdownRules || prev.dropdownRules || "",
        selectedModels: row?.selectedModels || prev.selectedModels,
        status: row?.status || "Generated",
        pageCode: row?.pageCode || "",
        pageSchemaText: JSON.stringify(enforceRuntimeColidSchema(row?.pageSchema || {}), null, 2),
        refinementCommand: ""
      }));
      await loadRows();
      setTimeout(() => runnerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 200);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to generate page.");
      setMessage("");
    } finally {
      setWorking(false);
    }
  };

  const refinePage = async () => {
    if (!editId && !activePage?._id) {
      setError("Select or generate a page before refining.");
      return;
    }
    if (!form.refinementCommand?.trim()) {
      setError("Enter the refinement command or additional content first.");
      return;
    }
    setWorking(true);
    setError("");
    setMessage("Refining generated page with AI...");
    try {
      const response = await ep1.post("/api/v2/ai-coding/refine", {
        ...form,
        id: editId || activePage?._id,
        colid: global1.colid,
        user: global1.user,
        createdby: global1.name
      });
      const row = response.data?.row;
      setActivePage(row);
      setEditId(row?._id || "");
      setForm((prev) => ({
        ...prev,
        title: row?.title || prev.title,
        description: row?.description || prev.description,
        provider: row?.provider || prev.provider,
        geminiModel: row?.geminiModel || prev.geminiModel,
        ollamaConfigId: row?.ollamaConfigId || prev.ollamaConfigId,
        crudMode: row?.crudMode || prev.crudMode || "CRUD",
        dropdownRules: row?.dropdownRules || prev.dropdownRules || "",
        selectedModels: row?.selectedModels || prev.selectedModels,
        status: row?.status || "Refined",
        pageCode: row?.pageCode || "",
        pageSchemaText: JSON.stringify(enforceRuntimeColidSchema(row?.pageSchema || {}), null, 2),
        refinementCommand: ""
      }));
      setMessage("Generated page refined. You can refine it again with another command.");
      await loadRows();
      setTimeout(() => runnerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 200);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to refine generated page.");
      setMessage("");
    } finally {
      setWorking(false);
    }
  };

  const savePage = async () => {
    setWorking(true);
    setError("");
    setMessage("");
    try {
      const pageSchema = parseSchemaText();
      const response = await ep1.post("/api/v2/ai-coding/pages", {
        ...form,
        id: editId,
        pageSchema,
        modelDetails: Object.fromEntries((form.selectedModels || []).map((name) => [name, options.modelDetails?.[name] || []])),
        colid: global1.colid,
        user: global1.user,
        createdby: global1.name
      });
      setActivePage(response.data?.row);
      setEditId(response.data?.row?._id || "");
      setMessage("Generated page saved.");
      await loadRows();
    } catch (err) {
      setError(err.message?.includes("JSON") ? "Page schema JSON is invalid." : err.response?.data?.message || "Unable to save generated page.");
    } finally {
      setWorking(false);
    }
  };

  const editRow = useCallback((row) => {
    setEditId(row._id);
    setActivePage(row);
    setForm({
      title: row.title || "",
      description: row.description || "",
      requirement: row.requirement || "",
      provider: row.provider || "Gemini",
      geminiModel: row.geminiModel || "gemini-2.5-flash-lite",
      ollamaConfigId: row.ollamaConfigId || "",
      crudMode: row.crudMode || "CRUD",
      dropdownRules: row.dropdownRules || "",
      selectedModels: row.selectedModels || [],
      status: row.status || "Generated",
      pageCode: row.pageCode || "",
      pageSchemaText: JSON.stringify(enforceRuntimeColidSchema(row.pageSchema || {}), null, 2),
      refinementCommand: ""
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const runRow = useCallback((row) => {
    setActivePage(row);
    setTimeout(() => runnerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  }, []);

  const deleteRows = useCallback(async (ids) => {
    if (!ids.length) {
      setError("Select at least one generated page.");
      return;
    }
    if (!window.confirm("Delete selected generated page(s)?")) return;
    setWorking(true);
    try {
      await ep1.post("/api/v2/ai-coding/pages-delete", { colid: global1.colid, ids, mineOnly, user: global1.user });
      setMessage("Selected generated page(s) deleted.");
      setSelectedRows([]);
      await loadRows();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to delete generated pages.");
    } finally {
      setWorking(false);
    }
  }, [loadRows, mineOnly]);

  const handleStoredSelectionChange = useCallback((selection) => setSelectedRows(Array.from(selection)), []);
  const handleDeleteSelectedRows = useCallback(() => deleteRows(selectedRows), [deleteRows, selectedRows]);
  const handleTitleChange = useCallback((value) => setField("title", value), [setField]);
  const handleRequirementChange = useCallback((value) => setField("requirement", value), [setField]);
  const handleDescriptionChange = useCallback((value) => setField("description", value), [setField]);
  const handleDropdownRulesChange = useCallback((value) => setField("dropdownRules", value), [setField]);
  const handleRefinementCommandChange = useCallback((value) => setField("refinementCommand", value), [setField]);

  const columns = useMemo(() => [
    { field: "title", headerName: "Page", minWidth: 190, flex: 1 },
    { field: "provider", headerName: "AI", width: 100 },
    { field: "geminiModel", headerName: "Gemini Model", minWidth: 180, flex: 0.8 },
    { field: "selectedModels", headerName: "Selected Models", minWidth: 220, flex: 1, valueGetter: (params) => (params.row.selectedModels || []).join(", ") },
    { field: "status", headerName: "Status", width: 120 },
    { field: "updatedAt", headerName: "Updated", minWidth: 160, flex: 0.7, valueGetter: (params) => params.row.updatedAt ? new Date(params.row.updatedAt).toLocaleString() : "" },
    {
      field: "actions",
      type: "actions",
      headerName: "Actions",
      width: 130,
      getActions: (params) => [
        <GridActionsCellItem icon={<PlayArrowIcon />} label="Run" onClick={() => runRow(params.row)} />,
        <GridActionsCellItem icon={<EditIcon />} label="Edit" onClick={() => editRow(params.row)} />
      ]
    }
  ], [editRow, runRow]);

  return (
    <MenuPageShell title={pageTitle}>
      <Stack spacing={2}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>Generate Dynamic Page</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {mineOnly ? "Create and run only the AI pages created by your login." : "Select Mongoose models, describe the page and functions, then generate a stored MUI page schema and code."}
          </Typography>

          {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <BufferedTextField fullWidth label="Page title" value={form.title} onValueChange={handleTitleChange} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField select fullWidth label="AI Provider" value={form.provider} onChange={(e) => setField("provider", e.target.value)}>
                <MenuItem value="Gemini">Gemini</MenuItem>
                <MenuItem value="Ollama">Ollama</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} md={4}>
              {form.provider === "Ollama" ? (
                <Autocomplete
                  options={options.ollamaConfigs || []}
                  getOptionLabel={(option) => `${option.name || ""} ${option.modelname ? `(${option.modelname})` : ""}`}
                  value={(options.ollamaConfigs || []).find((item) => item._id === form.ollamaConfigId) || null}
                  onChange={(event, value) => setField("ollamaConfigId", value?._id || "")}
                  renderInput={(params) => <TextField {...params} label="Ollama configuration" />}
                />
              ) : (
                <Autocomplete
                  options={options.geminiModels || []}
                  value={form.geminiModel}
                  onChange={(event, value) => setField("geminiModel", value || "")}
                  renderInput={(params) => <TextField {...params} label="Gemini model" helperText="Includes current and future model names such as 3.5." />}
                />
              )}
            </Grid>
            {advancedDropdownBuilder && (
              <Grid item xs={12} md={4}>
                <TextField select fullWidth label="Generated page mode" value={form.crudMode || "CRUD"} onChange={(e) => setField("crudMode", e.target.value)}>
                  <MenuItem value="CRUD">CRUD</MenuItem>
                  <MenuItem value="View Only">View Only</MenuItem>
                </TextField>
              </Grid>
            )}
            <Grid item xs={12}>
              <Paper variant="outlined" sx={{ p: 1.5, mb: 1 }}>
                <Typography sx={{ fontWeight: 700, mb: 1 }}>Model selection helper</Typography>
                <Grid container spacing={1.5}>
                  <Grid item xs={12} md={4}>
                    <Autocomplete
                      options={options.pageGroups || []}
                      value={selectedGroup}
                      onChange={(event, value) => {
                        setSelectedGroup(value || "");
                        setSelectedPage(null);
                      }}
                      renderInput={(params) => <TextField {...params} label="Select menu group" />}
                    />
                  </Grid>
	                  <Grid item xs={12} md={8}>
	                    <Autocomplete
	                      options={pageOptionsForGroup}
	                      value={selectedPage}
	                      getOptionLabel={(option) => option ? `${option.page || ""}${option.path ? ` - ${option.path}` : ""}` : ""}
	                      onChange={(event, value) => addModelsFromPage(value)}
	                      renderInput={(params) => <TextField {...params} label="Select existing page" helperText="Models are detected from the selected page's API usage where possible." />}
	                    />
	                  </Grid>
                  <Grid item xs={12}>
                    <Autocomplete
                      multiple
                      options={suggestedModels}
                      value={(form.selectedModels || []).filter((model) => suggestedModels.includes(model))}
                      onChange={(event, value) => {
                        const otherModels = (form.selectedModels || []).filter((model) => !suggestedModels.includes(model));
                        setField("selectedModels", Array.from(new Set([...otherModels, ...value])));
                      }}
                      noOptionsText={selectedPage ? (noDirectModelSelection ? "No model could be detected from this role menu page/API trace." : "No model could be detected from this page/API trace. Use advanced direct model selection.") : "Select a group and page first."}
                      renderTags={(value, getTagProps) => value.map((option, index) => (
                        <Chip size="small" label={option} {...getTagProps({ index })} />
                      ))}
                      renderInput={(params) => <TextField {...params} label="Detected models from selected page" helperText="This is based on actual page/API usage, not broad name guessing." />}
                    />
                  </Grid>
                  {!noDirectModelSelection && <Grid item xs={12}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Switch checked={showAllModels} onChange={(event) => setShowAllModels(event.target.checked)} />
                      <Typography variant="body2">Advanced direct model selection</Typography>
                    </Stack>
                  </Grid>}
                  {!noDirectModelSelection && <Grid item xs={12}>
                    <Collapse in={showAllModels}>
                      <Autocomplete
                        multiple
                        options={options.models || []}
                        value={form.selectedModels}
                        onChange={(event, value) => setField("selectedModels", value)}
                        renderTags={(value, getTagProps) => value.map((option, index) => (
                          <Chip size="small" label={option} {...getTagProps({ index })} />
                        ))}
                        renderInput={(params) => <TextField {...params} label="All backend models" placeholder="Search model names" helperText="Use only when suggested models are not enough." />}
                      />
                    </Collapse>
                  </Grid>}
                  {!!form.selectedModels?.length && (
                    <Grid item xs={12}>
                      <Stack direction="row" spacing={0.8} flexWrap="wrap">
                        {(form.selectedModels || []).map((model) => (
                          <Chip key={model} label={model} onDelete={() => setField("selectedModels", (form.selectedModels || []).filter((item) => item !== model))} />
                        ))}
                      </Stack>
                    </Grid>
                  )}
	                </Grid>
	              </Paper>
	            </Grid>
            <Grid item xs={12}>
              <BufferedTextField fullWidth multiline minRows={4} label="Describe required page and functions" value={form.requirement} onValueChange={handleRequirementChange} />
            </Grid>
            {advancedDropdownBuilder && (
              <Grid item xs={12}>
                <BufferedTextField
                  fullWidth
                  multiline
                  minRows={4}
                  label="Dropdown and cascading rules"
                  value={form.dropdownRules}
                  onValueChange={handleDropdownRulesChange}
                  helperText="Example: program loads from programmanagementds.program; programcode depends on program; course loads from regulationcoursemapds.course where academicyear, regulation, programcode match selected filters."
                />
              </Grid>
            )}
            <Grid item xs={12}>
              <BufferedTextField fullWidth multiline minRows={2} label="Additional details / business rules" value={form.description} onValueChange={handleDescriptionChange} />
            </Grid>
          </Grid>

          <Stack direction="row" spacing={1.5} sx={{ mt: 2 }} flexWrap="wrap">
            <Button variant="contained" startIcon={working ? <CircularProgress size={18} color="inherit" /> : <AutoModeIcon />} onClick={generatePage} disabled={working}>
              Generate and Store
            </Button>
            <Button variant="outlined" startIcon={<SaveIcon />} onClick={savePage} disabled={working}>
              Save Edited Code
            </Button>
            <Button variant="outlined" startIcon={<RestartAltIcon />} onClick={resetForm} disabled={working}>
              Clear
            </Button>
          </Stack>
        </Paper>

        {(form.pageCode || form.pageSchemaText) && (
          <>
            {enableRefinement && (
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>Refine Generated Page</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Add another command or extra content, then refine this same stored page. You can repeat this until the page is satisfactory.
                </Typography>
                <BufferedTextField
                  fullWidth
                  multiline
                  minRows={3}
                  label="Refinement command / additional content"
                  value={form.refinementCommand}
                  onValueChange={handleRefinementCommandChange}
                  helperText="Example: add summary cards, make program and course cascading dropdowns, make the page view-only, add printable report."
                />
                <Stack direction="row" spacing={1.5} sx={{ mt: 1.5 }} flexWrap="wrap">
                  <Button variant="contained" startIcon={working ? <CircularProgress size={18} color="inherit" /> : <AutoModeIcon />} onClick={refinePage} disabled={working || !form.refinementCommand?.trim()}>
                    Refine Page
                  </Button>
                </Stack>
              </Paper>
            )}
            <GeneratedCodePanel
              pageCode={form.pageCode}
              pageSchemaText={form.pageSchemaText}
              mineOnly={mineOnly}
              onFieldChange={setField}
            />
          </>
        )}

        <StoredAiPagesGrid
          rows={rows}
          columns={columns}
          loading={loading}
          working={working}
          selectedRows={selectedRows}
          onSelectionChange={handleStoredSelectionChange}
          onDeleteSelected={handleDeleteSelectedRows}
        />

        <Box ref={runnerRef}>
          {activePage && (
            <>
              <Divider sx={{ my: 1 }} />
              <GeneratedPageRunner page={activePage} />
            </>
          )}
        </Box>
      </Stack>
    </MenuPageShell>
  );
}

export default function AiCodingPageBuilder() {
  return <AiCodingPageBuilderWorkspace />;
}
