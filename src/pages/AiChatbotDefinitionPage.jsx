import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import { DataGrid, GridToolbar } from "@mui/x-data-grid";
import { Add, Clear, Delete, Print, Save, UploadFile } from "@mui/icons-material";
import MenuPageShell from "./MenuPageShell";
import ep1 from "../api/ep1";
import global1 from "./global1";
import { menuitemsall } from "./menuall";

const emptyForm = {
  _id: "",
  role: "",
  slno: "",
  menugroup: "",
  pagename: "",
  pagelink: "",
  type: "button",
  parentslno: "0"
};

const filterFields = [
  { field: "role", label: "Role" },
  { field: "menugroup", label: "Menu group" },
  { field: "pagename", label: "Page name" },
  { field: "pagelink", label: "Page link" },
  { field: "type", label: "Type" },
  { field: "parentslno", label: "Parent slno" }
];

const flattenChildren = (children) => React.Children.toArray(children).filter(Boolean);

const getElementText = (node) => {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (!React.isValidElement(node)) return "";
  if (typeof node.props?.primary === "string") return node.props.primary;
  return flattenChildren(node.props?.children).map(getElementText).filter(Boolean).join(" ");
};

const findFirstPrimary = (node) => {
  if (!React.isValidElement(node)) return "";
  if (typeof node.props?.primary === "string") return node.props.primary;
  for (const child of flattenChildren(node.props?.children)) {
    const found = findFirstPrimary(child);
    if (found) return found;
  }
  return "";
};

const collectListItems = (node, pages = []) => {
  if (!React.isValidElement(node)) return pages;
  if (node.props?.to) {
    const title = findFirstPrimary(node);
    if (title) pages.push({ title, path: node.props.to });
  }
  flattenChildren(node.props?.children).forEach((child) => collectListItems(child, pages));
  return pages;
};

const getActiveMenuPages = () => {
  const root = menuitemsall();
  const accordions = flattenChildren(root.props?.children);
  return accordions
    .map((accordion) => {
      const children = flattenChildren(accordion.props?.children);
      const group = getElementText(children[0]).trim();
      const pages = collectListItems(children[1]);
      return { group, pages: pages.map((page) => ({ ...page, group })).sort((a, b) => a.title.localeCompare(b.title)) };
    })
    .filter((item) => item.group && item.pages.length)
    .sort((a, b) => a.group.localeCompare(b.group));
};

const parseCsvLine = (line) => {
  const values = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"' && line[index + 1] === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      values.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  values.push(current.trim());
  return values;
};

const parseCsv = (text) => {
  const lines = String(text || "").split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]).map((item) => item.toLowerCase().replace(/\s+/g, ""));
  return lines.slice(1).map((line) => {
    const cells = parseCsvLine(line);
    return headers.reduce((acc, header, index) => ({ ...acc, [header]: cells[index] || "" }), {});
  });
};

const csvTemplate = "role,slno,menugroup,pagename,pagelink,type,parentslno\nFaculty,1,AI chatbot,Attendance,,button,0\nFaculty,2,Integrated LMS,Attendance,/neplmsattendance,link,1\n";

export default function AiChatbotDefinitionPage() {
  const fileRef = useRef(null);
  const [form, setForm] = useState(emptyForm);
  const [rows, setRows] = useState([]);
  const [roles, setRoles] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);
  const [filters, setFilters] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const menuGroups = useMemo(() => getActiveMenuPages(), []);
  const groupNames = useMemo(() => menuGroups.map((item) => item.group), [menuGroups]);
  const pagesForGroup = useMemo(() => menuGroups.find((item) => item.group === form.menugroup)?.pages || [], [menuGroups, form.menugroup]);
  const parentOptions = useMemo(() => rows.filter((row) => !form.role || row.role === form.role || row.role === "All"), [rows, form.role]);

  const filterOptions = useMemo(() => filterFields.reduce((acc, field) => {
    acc[field.field] = Array.from(new Set(rows.map((row) => String(row[field.field] ?? "")).filter(Boolean))).sort((a, b) => a.localeCompare(b));
    return acc;
  }, {}), [rows]);

  const filteredRows = useMemo(() => rows.filter((row) => filters.every((filter) => (
    !filter.field || !filter.value || String(row[filter.field] ?? "") === String(filter.value)
  ))), [rows, filters]);

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [listRes, optionRes] = await Promise.all([
        ep1.get("/api/v2/ai-chatbot-definition", { params: { colid: global1.colid } }),
        ep1.get("/api/v2/ai-chatbot-definition-options", { params: { colid: global1.colid } })
      ]);
      setRows(listRes.data?.data || []);
      setRoles(optionRes.data?.roles || []);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load AI chatbot definition");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const resetForm = () => {
    setForm(emptyForm);
    setMessage("");
    setError("");
  };

  const selectPage = (page) => {
    setForm((prev) => ({
      ...prev,
      pagename: page?.title || "",
      pagelink: page?.path || "",
      type: page?.path ? "link" : prev.type
    }));
  };

  const save = async () => {
    if (!form.role || !form.slno || !form.pagename || !form.type) {
      setError("Role, slno, page name and type are required.");
      return;
    }
    if (form.type === "link" && !form.pagelink) {
      setError("Page link is required when type is link.");
      return;
    }
    setLoading(true);
    setError("");
    setMessage("");
    try {
      await ep1.post("/api/v2/ai-chatbot-definition", {
        id: form._id,
        ...form,
        colid: global1.colid,
        name: global1.name,
        user: global1.user
      });
      setMessage(form._id ? "AI chatbot definition updated." : "AI chatbot definition saved.");
      setForm(emptyForm);
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to save definition");
    } finally {
      setLoading(false);
    }
  };

  const editRow = (row) => {
    setForm({
      _id: row._id,
      role: row.role || "",
      slno: String(row.slno ?? ""),
      menugroup: row.menugroup || "",
      pagename: row.pagename || "",
      pagelink: row.pagelink || "",
      type: row.type || "button",
      parentslno: String(row.parentslno ?? 0)
    });
    setMessage("");
    setError("");
  };

  const deleteRows = async (ids) => {
    const targetIds = ids?.length ? ids : selectedRows;
    if (!targetIds.length) {
      setError("Please select at least one row.");
      return;
    }
    if (!window.confirm(`Delete ${targetIds.length} selected chatbot definition row${targetIds.length === 1 ? "" : "s"}?`)) return;
    setLoading(true);
    setError("");
    try {
      const res = await ep1.post("/api/v2/ai-chatbot-definition-delete", { ids: targetIds });
      setMessage(`${res.data?.deletedCount || targetIds.length} row${targetIds.length === 1 ? "" : "s"} deleted.`);
      setSelectedRows([]);
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to delete selected rows");
    } finally {
      setLoading(false);
    }
  };

  const uploadCsv = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const content = await file.text();
    const parsed = parseCsv(content);
    if (!parsed.length) {
      setError("No valid CSV rows found.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const rowsToSave = parsed.map((row) => ({
        role: row.role,
        slno: row.slno,
        menugroup: row.menugroup,
        pagename: row.pagename,
        pagelink: row.pagelink,
        type: row.type,
        parentslno: row.parentslno
      }));
      const res = await ep1.post("/api/v2/ai-chatbot-definition-bulk", {
        colid: global1.colid,
        name: global1.name,
        user: global1.user,
        rows: rowsToSave
      });
      setMessage(`${res.data?.count || 0} chatbot definition row${res.data?.count === 1 ? "" : "s"} uploaded.`);
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to upload CSV");
    } finally {
      setLoading(false);
      event.target.value = "";
    }
  };

  const downloadTemplate = () => {
    const blob = new Blob([csvTemplate], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "ai_chatbot_definition_template.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const printPreview = () => {
    const htmlRows = filteredRows.map((row) => `
      <tr>
        <td>${row.role || ""}</td><td>${row.slno ?? ""}</td><td>${row.menugroup || ""}</td>
        <td>${row.pagename || ""}</td><td>${row.pagelink || ""}</td><td>${row.type || ""}</td><td>${row.parentslno ?? ""}</td>
      </tr>
    `).join("");
    const win = window.open("", "_blank", "width=1100,height=800");
    win.document.write(`
      <html><head><title>AI Chatbot Definition</title><style>
        body{font-family:Arial,sans-serif;color:#000;margin:24px}
        .header{text-align:center;border-bottom:2px solid #000;padding-bottom:10px;margin-bottom:14px}
        table{width:100%;border-collapse:collapse;font-size:12px}
        th,td{border:1px solid #000;padding:6px;text-align:left;vertical-align:top;word-break:break-word}
        th{background:#f1f5f9}
        @media print{button{display:none}}
      </style></head><body>
        <button onclick="window.print()">Print</button><button onclick="window.close()">Close</button>
        <div class="header"><h2>AI Chatbot Definition</h2><div>${global1.institution || global1.collegename || ""}</div></div>
        <table><thead><tr><th>Role</th><th>Slno</th><th>Group</th><th>Page name</th><th>Page link</th><th>Type</th><th>Parent slno</th></tr></thead><tbody>${htmlRows}</tbody></table>
      </body></html>
    `);
    win.document.close();
  };

  const columns = [
    { field: "role", headerName: "Role", minWidth: 140, flex: 1 },
    { field: "slno", headerName: "Slno", width: 90 },
    { field: "menugroup", headerName: "Menu group", minWidth: 180, flex: 1 },
    { field: "pagename", headerName: "Page name", minWidth: 220, flex: 1 },
    { field: "pagelink", headerName: "Page link", minWidth: 220, flex: 1 },
    { field: "type", headerName: "Type", width: 110 },
    { field: "parentslno", headerName: "Parent slno", width: 130 },
    {
      field: "actions",
      headerName: "Actions",
      width: 180,
      sortable: false,
      renderCell: (params) => (
        <Stack direction="row" spacing={1}>
          <Button size="small" variant="outlined" onClick={() => editRow(params.row)}>Edit</Button>
          <Button size="small" color="error" variant="outlined" onClick={() => deleteRows([params.row._id])}>Delete</Button>
        </Stack>
      )
    }
  ];

  return (
    <MenuPageShell title="AI Chatbot Definition">
      <Box sx={{ p: { xs: 1.5, md: 3 }, bgcolor: "#f6f8fb", minHeight: "100vh" }}>
        <Stack spacing={2.5}>
          <Paper sx={{ p: 2.5, border: "1px solid #e5e7eb" }}>
            <Stack spacing={2}>
              <Box>
                <Typography variant="h5" fontWeight={900}>AI Chatbot Definition</Typography>
                <Typography color="text.secondary">Create role-wise chatbot buttons and links using menu pages. Parent slno 0 appears first.</Typography>
              </Box>
              {error && <Alert severity="error">{error}</Alert>}
              {message && <Alert severity="success">{message}</Alert>}

              <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                <Autocomplete
                  freeSolo
                  options={roles}
                  value={form.role}
                  onChange={(event, value) => setForm((prev) => ({ ...prev, role: value || "" }))}
                  onInputChange={(event, value) => setForm((prev) => ({ ...prev, role: value || "" }))}
                  renderInput={(params) => <TextField {...params} label="Role" />}
                  fullWidth
                />
                <TextField label="Slno" type="number" value={form.slno} onChange={(e) => setForm((prev) => ({ ...prev, slno: e.target.value }))} fullWidth />
                <Autocomplete
                  options={[{ slno: 0, pagename: "Root", role: form.role || "All" }, ...parentOptions]}
                  value={[{ slno: 0, pagename: "Root" }, ...parentOptions].find((item) => String(item.slno) === String(form.parentslno)) || null}
                  getOptionLabel={(option) => `${option.slno} - ${option.pagename || "Root"}${option.role ? ` (${option.role})` : ""}`}
                  onChange={(event, value) => setForm((prev) => ({ ...prev, parentslno: String(value?.slno ?? 0) }))}
                  renderInput={(params) => <TextField {...params} label="Parent slno" />}
                  fullWidth
                />
                <FormControl fullWidth>
                  <InputLabel>Type</InputLabel>
                  <Select label="Type" value={form.type} onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value }))}>
                    <MenuItem value="button">button</MenuItem>
                    <MenuItem value="link">link</MenuItem>
                  </Select>
                </FormControl>
              </Stack>

              <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                <Autocomplete
                  options={groupNames}
                  value={form.menugroup}
                  onChange={(event, value) => setForm((prev) => ({ ...prev, menugroup: value || "", pagename: "", pagelink: "" }))}
                  renderInput={(params) => <TextField {...params} label="Menu group" />}
                  fullWidth
                />
                <Autocomplete
                  options={pagesForGroup}
                  value={pagesForGroup.find((page) => page.path === form.pagelink) || null}
                  getOptionLabel={(option) => option?.title ? `${option.title} (${option.path})` : ""}
                  onChange={(event, value) => selectPage(value)}
                  renderInput={(params) => <TextField {...params} label="Page from selected group" helperText="Selecting a page fills the default page name and link. You may edit Page name below without changing the link." />}
                  fullWidth
                  disabled={!form.menugroup}
                />
              </Stack>

              <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                <TextField
                  label="Page name"
                  value={form.pagename}
                  helperText="This is the custom label shown in AI chatbot help."
                  onChange={(e) => setForm((prev) => ({ ...prev, pagename: e.target.value }))}
                  fullWidth
                />
                <TextField label="Page link" value={form.pagelink} onChange={(e) => setForm((prev) => ({ ...prev, pagelink: e.target.value }))} fullWidth />
              </Stack>

              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Button variant="contained" startIcon={<Save />} onClick={save} disabled={loading}>{form._id ? "Update" : "Save"}</Button>
                <Button variant="outlined" startIcon={<Clear />} onClick={resetForm}>Clear</Button>
                <Button variant="outlined" startIcon={<UploadFile />} onClick={() => fileRef.current?.click()}>Bulk Upload</Button>
                <Button variant="outlined" onClick={downloadTemplate}>Template</Button>
                <Button variant="outlined" startIcon={<Print />} onClick={printPreview}>Print Preview</Button>
                <Button color="error" variant="contained" startIcon={<Delete />} disabled={!selectedRows.length || loading} onClick={() => deleteRows()}>
                  Bulk Delete ({selectedRows.length})
                </Button>
                <input ref={fileRef} type="file" hidden accept=".csv,text/csv" onChange={uploadCsv} />
              </Stack>
            </Stack>
          </Paper>

          <Paper sx={{ p: 2, border: "1px solid #e5e7eb" }}>
            <Stack spacing={2}>
              <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1}>
                <Box>
                  <Typography fontWeight={900}>Dynamic Filters</Typography>
                  <Typography variant="body2" color="text.secondary">Add filters with dropdown values from the current grid.</Typography>
                </Box>
                <Stack direction="row" spacing={1}>
                  <Button startIcon={<Add />} variant="outlined" onClick={() => setFilters((prev) => [...prev, { field: "", value: "" }])}>Add Filter</Button>
                  <Button startIcon={<Clear />} variant="text" onClick={() => setFilters([])}>Clear Filters</Button>
                </Stack>
              </Stack>
              {filters.map((filter, index) => (
                <Stack key={index} direction={{ xs: "column", md: "row" }} spacing={2}>
                  <Autocomplete
                    options={filterFields}
                    value={filterFields.find((item) => item.field === filter.field) || null}
                    getOptionLabel={(option) => option.label || ""}
                    onChange={(event, value) => setFilters((prev) => prev.map((item, i) => i === index ? { field: value?.field || "", value: "" } : item))}
                    renderInput={(params) => <TextField {...params} label="Field" />}
                    fullWidth
                  />
                  <Autocomplete
                    options={filterOptions[filter.field] || []}
                    value={filter.value || ""}
                    onChange={(event, value) => setFilters((prev) => prev.map((item, i) => i === index ? { ...item, value: value || "" } : item))}
                    renderInput={(params) => <TextField {...params} label="Value" />}
                    fullWidth
                    disabled={!filter.field}
                  />
                  <Button color="error" variant="outlined" startIcon={<Delete />} onClick={() => setFilters((prev) => prev.filter((_, i) => i !== index))}>Remove</Button>
                </Stack>
              ))}
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Chip label={`Showing ${filteredRows.length}`} />
                <Chip label={`Total ${rows.length}`} />
              </Stack>
            </Stack>
          </Paper>

          <Paper sx={{ p: 1, height: 620, border: "1px solid #e5e7eb" }}>
            <DataGrid
              rows={filteredRows}
              columns={columns}
              getRowId={(row) => row._id}
              loading={loading}
              checkboxSelection
              rowSelectionModel={selectedRows}
              onRowSelectionModelChange={(model) => setSelectedRows(Array.from(model))}
              disableRowSelectionOnClick
              pageSizeOptions={[10, 25, 50, 100]}
              initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 } } }}
              slots={{ toolbar: GridToolbar }}
              slotProps={{ toolbar: { showQuickFilter: true, csvOptions: { fileName: "ai_chatbot_definition" } } }}
              sx={{ "& .MuiDataGrid-cell": { whiteSpace: "normal", wordBreak: "break-word", alignItems: "flex-start", py: 1 } }}
            />
          </Paper>
        </Stack>
      </Box>
    </MenuPageShell>
  );
}
