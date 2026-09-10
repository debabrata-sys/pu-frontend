import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Checkbox,
  Chip,
  Grid,
  ListItemText,
  MenuItem,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography
} from "@mui/material";
import { Add, Print, Refresh, Save, UploadFile } from "@mui/icons-material";
import { DataGrid, GridToolbar } from "@mui/x-data-grid";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import ep1 from "../api/ep1";
import global1 from "./global1";
import PlacementCoordinatorShell from "./PlacementCoordinatorShell";
import { openPurchase2PrintWindow } from "./Purchase2PrintTemplates";

const today = () => new Date().toISOString().slice(0, 10);
const nowTime = () => new Date().toTimeString().slice(0, 5);
const key = (prefix) => `${prefix}-${Date.now()}`;
const text = (value) => String(value || "").trim();
const num = (value) => Number(value || 0);
const currentName = () => global1.name || global1.user || "NA";
const currentUser = () => global1.user || "NA";
const base = () => ({ colid: global1.colid, name: currentName(), user: currentUser() });
const statusOptions = ["Draft", "Submitted", "Pending Approval", "Approved", "Issued", "Rejected"];
const asArray = (model) => Array.from(model?.ids || model || []);
const sameEmail = (a, b) => text(a).toLowerCase() === text(b).toLowerCase();
const esc = (value) => text(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[char]));
const isIndentStoreReady = (row = {}) => {
  const status = text(row.reqstatus || row.status).toLowerCase();
  const approval = text(row.approvalStatus).toLowerCase();
  if (!status || status === "draft" || status === "pending approval") return false;
  return !["pending hoi approval", "pending approval"].includes(approval);
};
const getUserSignature = async (email = currentUser()) => {
  const rows = await getRows("usersignatureds", [{ field: "useremail", value: email }]);
  return rows.find((row) => text(row.status || "Active").toLowerCase() === "active") || rows[0] || {};
};
const loadUsers = async () => {
  const res = await ep1.get("/api/v2/hrattendance/options", { params: { colid: global1.colid } });
  return res.data?.users || [];
};
const calcLineTotal = (item) => {
  const amount = num(item.price || item.estimatedprice) * num(item.quantity);
  const gstAmount = amount * (num(item.gst) / 100);
  const discount = num(item.discount);
  return Number((amount + gstAmount - discount).toFixed(2));
};
const multiSelectProps = (selected = []) => ({
  multiple: true,
  renderValue: (values) => values.join(", ")
});
const loadPrintInstitution = async () => {
  try {
    const res = await ep1.get("/api/institution", { params: { colid: global1.colid } });
    const institution = Array.isArray(res.data) ? res.data[0] : res.data;
    if (institution) return institution;
  } catch (error) {
    // Fall back to the legacy PR config if the institution details page has no record yet.
  }
  try {
    const res = await ep1.get("/api/v2/getprconfigds2", { params: { colid: global1.colid } });
    return res.data?.data || {};
  } catch (error) {
    return {};
  }
};
const printPurchase2 = async (type, data) => {
  const institution = await loadPrintInstitution();
  openPurchase2PrintWindow(type, { ...(data || {}), institution });
};
const uniqueOptions = (rows = [], field) => [...new Set(rows.map((row) => text(row[field])).filter(Boolean))].sort((a, b) => a.localeCompare(b));
const inDateRange = (value, start, end) => {
  if (!start && !end) return true;
  const date = new Date(value || 0);
  if (Number.isNaN(date.getTime())) return false;
  if (start) {
    const startDate = new Date(start);
    startDate.setHours(0, 0, 0, 0);
    if (date < startDate) return false;
  }
  if (end) {
    const endDate = new Date(end);
    endDate.setHours(23, 59, 59, 999);
    if (date > endDate) return false;
  }
  return true;
};
const sendPurchase2Notification = async (eventname, context = {}) => {
  try {
    const configs = (await getRows("purchase2mailconfigds2", [{ field: "eventname", value: eventname }]))
      .filter((row) => text(row.active || "Yes").toLowerCase() !== "no" && text(row.manageremail));
    await Promise.all(configs.map((cfg) => {
      const replacements = {
        eventname,
        prnumber: context.prnumber || "",
        poid: context.poid || "",
        status: context.status || "",
        amount: context.amount || context.totalamount || "",
        user: currentUser(),
        name: currentName(),
        date: today(),
        time: nowTime()
      };
      const fill = (template, fallback) => Object.entries(replacements).reduce((body, [token, value]) => body.replaceAll(`{{${token}}}`, text(value)), template || fallback);
      const subject = fill(cfg.subjecttemplate, `Purchase 2 ${eventname}`);
      const emailbody = fill(cfg.bodytemplate, `<p>Purchase 2 event: <b>${eventname}</b></p><p>PR: ${replacements.prnumber}</p><p>PO: ${replacements.poid}</p><p>Status: ${replacements.status}</p>`);
      return ep1.get("/api/v2/sendawsemail", { params: { email: cfg.manageremail, subject, emailbody } });
    }));
  } catch (error) {
    // Notification must not block PR/PO transactions.
  }
};
const uploadPurchase2Attachment = async (file, folder = "purchase2") => {
  if (!file) return "";
  const cfgRes = await ep1.get("/api/v2/aws-file-library/configs", { params: { colid: global1.colid } });
  const configs = cfgRes.data || [];
  const config = configs[0];
  if (!config?._id) throw new Error("AWS configuration is missing");
  const data = new FormData();
  data.append("file", file);
  data.append("colid", global1.colid);
  data.append("user", global1.user || "");
  data.append("awsconfigid", config._id);
  data.append("folder", folder);
  data.append("description", "Purchase 2 attachment");
  const res = await ep1.post("/api/v2/aws-file-library/upload", data, { headers: { "Content-Type": "multipart/form-data" } });
  return res.data?.url || "";
};
const printStoreItems = async (rows = []) => {
  const institution = await loadPrintInstitution();
  const win = window.open("", "_blank", "width=1100,height=800");
  if (!win) return;
  const logo = institution.logo || institution.logourl || institution.logoUrl || "";
  const name = institution.institution || institution.institutionname || institution.name || "Institution";
  const address = institution.address || institution.institutionaddress || "";
  win.document.write(`<!doctype html><html><head><title>Store Items</title><style>
    @page{size:A4 portrait;margin:14mm}body{font-family:Arial,sans-serif;color:#000;background:#fff;margin:0}.toolbar{padding:10px;text-align:right}.print{padding:20px}.header{text-align:center;border-bottom:1px solid #000;padding-bottom:10px;margin-bottom:12px}.logo{max-height:64px;float:left}.title{font-size:18px;font-weight:700;margin-top:10px}table{width:100%;border-collapse:collapse;font-size:11px}th,td{border:1px solid #000;padding:6px;text-align:left;vertical-align:top}th{background:#f1f1f1}.sign{display:flex;justify-content:space-between;margin-top:36px;font-size:12px}@media print{.toolbar{display:none}tr{break-inside:avoid}}
  </style></head><body><div class="toolbar"><button onclick="window.print()">Print</button><button onclick="window.close()">Close</button></div><div class="print"><div class="header">${logo ? `<img class="logo" src="${esc(logo)}" />` : ""}<div style="font-size:20px;font-weight:800">${esc(name)}</div><div>${esc(address)}</div><div class="title">STORE ITEM USER REPORT</div></div><table><thead><tr><th>Sr</th><th>Store</th><th>Item Code</th><th>Item</th><th>Category</th><th>Type</th><th>Unit</th><th>Quantity</th><th>Status</th></tr></thead><tbody>${rows.map((row, index) => `<tr><td>${index + 1}</td><td>${esc(row.storename || row.store)}</td><td>${esc(row.itemcode)}</td><td>${esc(row.itemname)}</td><td>${esc(row.category)}</td><td>${esc(row.type)}</td><td>${esc(row.unit)}</td><td>${esc(row.quantity)}</td><td>${esc(row.status)}</td></tr>`).join("")}</tbody></table><div class="sign"><span>Prepared by</span><span>Checked by</span><span>Approved by</span></div></div></body></html>`);
  win.document.close();
};

const getRows = async (model, filters = []) => {
  const res = await ep1.get(`/api/v2/purchase2/${model}`, { params: { colid: global1.colid, filters: JSON.stringify(filters) } });
  return res.data?.data || [];
};
const saveRow = async (model, payload) => {
  const res = await ep1.post(`/api/v2/purchase2/${model}`, { ...base(), ...payload });
  return res.data?.data;
};
const updateRow = async (model, row, patch) => saveRow(model, { ...row, id: row._id, ...patch });
const itemSearchText = (option = {}) => [
  option.itemname,
  option.item,
  option.itemcode,
  option.category,
  option.itemtype,
  option.type,
  option.unit
].map((part) => text(part).toLowerCase()).filter(Boolean).join(" ");
const itemLabel = (option = {}) => `${option.itemcode || ""} ${option.itemname || option.item || ""} ${option.category ? `(${option.category})` : ""}`.trim();
const itemRank = (option, query) => {
  const q = text(query).toLowerCase();
  const name = text(option.itemname || option.item).toLowerCase();
  const code = text(option.itemcode).toLowerCase();
  const category = text(option.category).toLowerCase();
  const haystack = itemSearchText(option);
  if (!q) return 0;
  if (name === q || code === q) return 0;
  if (name.startsWith(q)) return 1;
  if (code.startsWith(q)) return 2;
  if (name.includes(q)) return 3;
  if (code.includes(q)) return 4;
  if (category.includes(q)) return 5;
  if (haystack.includes(q)) return 6;
  return 99;
};
const filterItemOptions = (options = [], state = {}) => {
  const q = text(state.inputValue).toLowerCase();
  return options
    .filter((option) => !q || itemSearchText(option).includes(q))
    .sort((a, b) => itemRank(a, q) - itemRank(b, q) || itemLabel(a).localeCompare(itemLabel(b)))
    .slice(0, 100);
};

function Page({ title, subtitle, children, message, error }) {
  return (
    <PlacementCoordinatorShell title={title}>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h5" fontWeight={800}>{title}</Typography>
        <Typography variant="body2" color="text.secondary">{subtitle}</Typography>
      </Box>
      {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {children}
    </PlacementCoordinatorShell>
  );
}

function ItemsEditor({ items, setItems, showMake = false, showPrice = false, showUnit = false, disabled = false }) {
  const [item, setItem] = useState(null);
  const [qty, setQty] = useState(1);
  const [make, setMake] = useState("");
  const [unit, setUnit] = useState(null);
  const [estimatedprice, setEstimatedprice] = useState("");
  const [masters, setMasters] = useState([]);
  const [units, setUnits] = useState([]);
  useEffect(() => { getRows("itemmasterds2").then(setMasters); }, []);
  useEffect(() => { if (showUnit) getRows("itemunitds2").then(setUnits); }, [showUnit]);
  const add = () => {
    if (!item) return;
    if (showUnit && !unit) return;
    const quantity = num(qty);
    const rate = num(estimatedprice);
    setItems([...items, {
      itemid: item._id,
      itemcode: item.itemcode,
      itemname: item.itemname,
      category: item.category,
      itemtype: item.itemtype,
      unit: showUnit ? unit.unitname || unit.unitcode : item.unit,
      unitcode: showUnit ? unit.unitcode || "" : item.unitcode || "",
      make,
      quantity,
      estimatedprice: rate,
      estimatedtotal: quantity * rate,
      approvedquantity: 0,
      issuedquantity: 0,
      remarks: ""
    }]);
    setItem(null);
    setQty(1);
    setUnit(null);
    setMake("");
    setEstimatedprice("");
  };
  return (
    <Paper sx={{ p: 2 }}>
      <Grid container spacing={2} alignItems="center">
        <Grid item xs={12} md={showMake || showPrice || showUnit ? 3 : 7}>
          <Autocomplete options={masters} filterOptions={filterItemOptions} value={item} onChange={(_, value) => setItem(value)} getOptionLabel={itemLabel} renderInput={(params) => <TextField {...params} label="Search item" size="small" />} />
        </Grid>
        <Grid item xs={12} md={2}><TextField size="small" type="number" label="Quantity" value={qty} onChange={(e) => setQty(e.target.value)} fullWidth /></Grid>
        {showUnit && <Grid item xs={12} md={2}><Autocomplete options={units} value={unit} onChange={(_, value) => setUnit(value)} getOptionLabel={(option) => `${option.unitname || ""} ${option.unitcode ? `(${option.unitcode})` : ""}`} renderInput={(params) => <TextField {...params} label="Unit" size="small" />} /></Grid>}
        {showMake && <Grid item xs={12} md={2}><TextField size="small" label="Make" value={make} onChange={(e) => setMake(e.target.value)} fullWidth /></Grid>}
        {showPrice && <Grid item xs={12} md={2}><TextField size="small" type="number" label="Estimated price" value={estimatedprice} onChange={(e) => setEstimatedprice(e.target.value)} fullWidth /></Grid>}
        <Grid item xs={12} md={2}><Button startIcon={<Add />} variant="contained" onClick={add} disabled={disabled}>Add item</Button></Grid>
      </Grid>
      <DataGrid sx={{ mt: 2 }} autoHeight density="compact" rows={items.map((row, index) => ({ ...row, id: index }))} columns={[
        { field: "itemcode", headerName: "Code", width: 130 },
        { field: "itemname", headerName: "Item", flex: 1, minWidth: 180 },
        { field: "category", headerName: "Category", width: 140 },
        { field: "make", headerName: "Make", width: 130 },
        { field: "unit", headerName: "Unit", width: 100 },
        { field: "quantity", headerName: "Qty", width: 110, type: "number" },
        { field: "estimatedprice", headerName: "Est. price", width: 120, type: "number" },
        { field: "remarks", headerName: "Remarks", flex: 1, minWidth: 180, editable: !disabled },
        { field: "actions", headerName: "Action", width: 110, renderCell: (params) => <Button color="error" size="small" disabled={disabled} onClick={() => setItems(items.filter((_, idx) => idx !== params.row.id))}>Remove</Button> }
      ]} processRowUpdate={(row) => { setItems(items.map((it, idx) => idx === row.id ? { ...it, remarks: row.remarks || "" } : it)); return row; }} />
    </Paper>
  );
}

function usePurchase2Basics() {
  const [departments, setDepartments] = useState([]);
  const [stores, setStores] = useState([]);
  const [storeAccess, setStoreAccess] = useState([]);
  const [error, setError] = useState("");
  const load = async () => {
    try {
      const [deptRows, storeRows, accessRows] = await Promise.all([getRows("departmentindentds"), getRows("storemasterds2"), getRows("storeusersds2")]);
      setDepartments(deptRows);
      setStoreAccess(accessRows);
      const email = text(global1.user).toLowerCase();
      const allowedIds = new Set(accessRows.filter((row) => [row.userid, row.user, row.storeuser].map((v) => text(v).toLowerCase()).includes(email)).map((row) => text(row.storeid)));
      const allowedNames = new Set(accessRows.filter((row) => [row.userid, row.user, row.storeuser].map((v) => text(v).toLowerCase()).includes(email)).map((row) => text(row.store)));
      setStores(storeRows.filter((store) => allowedIds.has(text(store._id)) || allowedIds.has(text(store.storeid)) || allowedNames.has(text(store.storename)) || !accessRows.length));
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  };
  useEffect(() => { load(); }, []);
  return { departments, stores, storeAccess, reloadBasics: load, basicsError: error };
}

export function Purchase2IndentRequestPage() {
  const { departments, stores, basicsError } = usePurchase2Basics();
  const [form, setForm] = useState({ year: "2026-27", departmentname: "", storeid: "", store: "", reqstatus: "Draft", reqdate: today(), approvalOption: "Manual approval", remarks: "" });
  const [items, setItems] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [currentIndent, setCurrentIndent] = useState(null);
  const [printData, setPrintData] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const isSubmitted = text(currentIndent?.reqstatus).toLowerCase() !== "" && text(currentIndent?.reqstatus).toLowerCase() !== "draft";
  const loadDrafts = async () => {
    const email = text(currentUser()).toLowerCase();
    const rows = await getRows("storerequisitionds2");
    setDrafts(rows.filter((row) => sameEmail(row.creatoruserid || row.requestedbyemail || row.user, email)).sort((a, b) => new Date(b.createdAt || b.reqdate || 0) - new Date(a.createdAt || a.reqdate || 0)));
  };
  useEffect(() => { loadDrafts(); }, []);
  const openIndent = async (row) => {
    if (!row) {
      setCurrentIndent(null);
      setForm({ year: "2026-27", departmentname: "", storeid: "", store: "", reqstatus: "Draft", reqdate: today(), approvalOption: "Manual approval", remarks: "" });
      setItems([]);
      setPrintData(null);
      return;
    }
    const child = await getRows("storerequisitionitemsds2", [{ field: "requisitionid", value: row._id }]);
    const mappedItems = child.length ? child : [];
    setCurrentIndent(row);
    setForm({
      year: row.year || "2026-27",
      departmentname: row.departmentname || "",
      storeid: row.storeid || "",
      store: row.store || row.storename || "",
      reqstatus: row.reqstatus || "Draft",
      reqdate: row.reqdate ? String(row.reqdate).slice(0, 10) : today(),
      approvalOption: row.approvalOption || row.approvaltype || "Manual approval",
      remarks: row.remarks || ""
    });
    setItems(mappedItems);
    setPrintData({ header: row, items: mappedItems });
  };
  const save = async (status = form.reqstatus) => {
    try {
      if (!form.departmentname || !form.storeid || !items.length) throw new Error("Select department, store and at least one item");
      if (isSubmitted) throw new Error("Submitted indent cannot be edited");
      const reqid = currentIndent?.reqid || currentIndent?.requestno || key("IND");
      const dept = departments.find((row) => text(row.departmentname).toLowerCase() === text(form.departmentname).toLowerCase()) || {};
      const needsHoi = status === "Submitted" && text(form.approvalOption).toLowerCase() === "hoi approval";
      const finalStatus = needsHoi ? "Pending Approval" : status;
      const approvalStatus = status === "Draft" ? "Draft" : (needsHoi ? "Pending HOI Approval" : "Approved");
      const approverSignature = needsHoi ? await getUserSignature(dept.hoiapproveruserid) : {};
      const headerPayload = {
        ...form,
        reqstatus: finalStatus,
        approvalStatus,
        approvaltype: form.approvalOption,
        reqid,
        requestno: reqid,
        requestedby: currentIndent?.requestedby || currentName(),
        requestedbyemail: currentIndent?.requestedbyemail || currentUser(),
        creatoruserid: currentIndent?.creatoruserid || currentUser(),
        approvername: dept.hoiapprovername || "",
        approveruserid: dept.hoiapproveruserid || "",
        hoiapprovername: dept.hoiapprovername || "",
        hoiapproveruserid: dept.hoiapproveruserid || "",
        approversignature: needsHoi ? "" : currentIndent?.approversignature || "",
        expectedapproversignature: approverSignature.signaturelink || ""
      };
      const header = currentIndent ? await updateRow("storerequisitionds2", currentIndent, headerPayload) : await saveRow("storerequisitionds2", headerPayload);
      await Promise.all(items.map((item) => item._id
        ? updateRow("storerequisitionitemsds2", item, { ...item, requisitionid: header._id, reqid, status: finalStatus })
        : saveRow("storerequisitionitemsds2", { ...item, requisitionid: header._id, reqid, status: finalStatus })));
      const savedItems = await getRows("storerequisitionitemsds2", [{ field: "requisitionid", value: header._id }]);
      setCurrentIndent(header);
      setItems(savedItems);
      setForm((prev) => ({ ...prev, reqstatus: finalStatus }));
      setMessage(status === "Submitted" ? (needsHoi ? "Indent submitted for HOI approval. Items are locked." : "Indent submitted to assigned store. Items are locked.") : "Indent draft saved. You can add more items before submission.");
      setPrintData({ header, items: savedItems });
      await loadDrafts();
    } catch (err) {
      setError(err.message);
    }
  };
  const creatorDepartments = useMemo(() => {
    const email = text(currentUser()).toLowerCase();
    return departments.filter((dept) => {
      const creators = [dept.creatoruserid].map((v) => text(v).toLowerCase()).filter(Boolean);
      return creators.includes(email);
    });
  }, [departments]);
  return (
    <Page title="Indent Request" subtitle="Request items from stores assigned to the logged-in user." message={message} error={error || basicsError}>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}><Autocomplete options={drafts} value={currentIndent} getOptionLabel={(o) => `${o.requestno || o.reqid || o._id || ""} - ${o.reqstatus || ""}`} onChange={(_, v) => openIndent(v)} renderInput={(params) => <TextField {...params} label="Open existing indent" size="small" />} /></Grid>
          <Grid item xs={12} md={3}><Autocomplete options={creatorDepartments} getOptionLabel={(o) => o.departmentname || ""} onChange={(_, v) => setForm((p) => ({ ...p, departmentname: v?.departmentname || "", approvername: v?.hoiapprovername || "", approveruserid: v?.hoiapproveruserid || "" }))} renderInput={(params) => <TextField {...params} label="Department" size="small" helperText={!creatorDepartments.length ? "No department mapped to your creator user ID" : ""} />} /></Grid>
          <Grid item xs={12} md={3}><Autocomplete options={stores} getOptionLabel={(o) => o.storename || o.name || ""} onChange={(_, v) => setForm((p) => ({ ...p, storeid: v?._id || v?.storeid || "", store: v?.storename || "" }))} renderInput={(params) => <TextField {...params} label="Assigned store" size="small" />} /></Grid>
          <Grid item xs={12} md={2}><TextField size="small" type="date" label="Request date" value={form.reqdate} InputLabelProps={{ shrink: true }} onChange={(e) => setForm((p) => ({ ...p, reqdate: e.target.value }))} fullWidth /></Grid>
          <Grid item xs={12} md={2}><TextField select size="small" label="Approval type" value={form.approvalOption} onChange={(e) => setForm((p) => ({ ...p, approvalOption: e.target.value }))} fullWidth>{["Manual approval", "HOI approval"].map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}</TextField></Grid>
          <Grid item xs={12} md={2}><TextField select size="small" label="Status" value={form.reqstatus} onChange={(e) => setForm((p) => ({ ...p, reqstatus: e.target.value }))} fullWidth>{statusOptions.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}</TextField></Grid>
          <Grid item xs={12} md={2}><TextField size="small" label="Remarks" value={form.remarks} onChange={(e) => setForm((p) => ({ ...p, remarks: e.target.value }))} fullWidth /></Grid>
        </Grid>
      </Paper>
      {isSubmitted && <Alert severity="info" sx={{ mb: 2 }}>This indent has been submitted. Items are locked.</Alert>}
      <ItemsEditor items={items} setItems={setItems} disabled={isSubmitted} />
      <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: "wrap" }}><Button startIcon={<Save />} variant="contained" disabled={isSubmitted} onClick={() => save("Draft")}>Save draft</Button><Button variant="contained" color="success" disabled={isSubmitted} onClick={() => save("Submitted")}>Submit</Button><Button startIcon={<Print />} variant="outlined" disabled={!printData} onClick={() => printPurchase2("indent", printData)}>Print indent</Button><Button variant="outlined" onClick={() => openIndent(null)}>New indent</Button></Stack>
    </Page>
  );
}

export function Purchase2IndentPrintPage() {
  const [indents, setIndents] = useState([]);
  const [selected, setSelected] = useState(null);
  const [items, setItems] = useState([]);
  const [message] = useState("");
  const [error, setError] = useState("");
  const load = async () => {
    try {
      const rows = await getRows("storerequisitionds2");
      setIndents(rows.sort((a, b) => new Date(b.createdAt || b.reqdate || 0) - new Date(a.createdAt || a.reqdate || 0)));
    } catch (err) {
      setError(err.message || "Unable to load indents");
    }
  };
  useEffect(() => { load(); }, []);
  const open = async (row) => {
    setSelected(row);
    if (!row) {
      setItems([]);
      return;
    }
    const child = await getRows("storerequisitionitemsds2", [{ field: "requisitionid", value: row._id }]);
    setItems(child.length ? child : []);
  };
  return (
    <Page title="Indent Print" subtitle="Select an indent number, view all mapped items, and print the complete indent." message={message} error={error}>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ xs: "stretch", md: "center" }}>
          <Autocomplete sx={{ minWidth: 420 }} options={indents} value={selected} getOptionLabel={(o) => `${o.requestno || o.reqid || o._id || ""} - ${o.departmentname || ""} - ${o.reqstatus || ""}`} onChange={(_, v) => open(v)} renderInput={(params) => <TextField {...params} label="Indent number" size="small" />} />
          <Button startIcon={<Refresh />} onClick={load}>Refresh</Button>
          <Button startIcon={<Print />} variant="contained" disabled={!selected} onClick={() => printPurchase2("indent", { header: selected, items })}>Print indent</Button>
        </Stack>
      </Paper>
      {selected && <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" fontWeight={800}>{selected.requestno || selected.reqid || selected._id}</Typography>
        <Typography variant="body2" color="text.secondary">Department: {selected.departmentname || "-"} | Store: {selected.store || selected.storename || "-"} | Status: {selected.reqstatus || selected.status || "-"}</Typography>
      </Paper>}
      <Paper sx={{ p: 2 }}>
        <DataGrid autoHeight rows={items.map((row) => ({ ...row, id: row._id || row.itemid || row.itemcode }))} columns={[
          { field: "itemcode", headerName: "Item Code", width: 140 },
          { field: "itemname", headerName: "Item", flex: 1, minWidth: 220 },
          { field: "category", headerName: "Category", width: 150 },
          { field: "unit", headerName: "Unit", width: 100 },
          { field: "quantity", headerName: "Requested Qty", width: 140 },
          { field: "approvedquantity", headerName: "Approved Qty", width: 140 },
          { field: "issuedquantity", headerName: "Issued Qty", width: 120 },
          { field: "remarks", headerName: "Remarks", flex: 1, minWidth: 180 }
        ]} slots={{ toolbar: GridToolbar }} slotProps={{ toolbar: { showQuickFilter: true } }} />
      </Paper>
    </Page>
  );
}

export function Purchase2IndentApproverPage() {
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState(null);
  const [items, setItems] = useState([]);
  const [remarks, setRemarks] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const load = async () => {
    try {
      const email = text(currentUser()).toLowerCase();
      const requests = await getRows("storerequisitionds2");
      setRows(requests.filter((row) => {
        const isHoi = text(row.approvalOption || row.approvaltype).toLowerCase() === "hoi approval";
        const pending = ["pending hoi approval", "pending approval"].includes(text(row.approvalStatus || row.reqstatus).toLowerCase());
        const approver = [row.approveruserid, row.hoiapproveruserid].map((v) => text(v).toLowerCase()).includes(email);
        return isHoi && pending && approver;
      }).sort((a, b) => new Date(b.createdAt || b.reqdate || 0) - new Date(a.createdAt || a.reqdate || 0)));
    } catch (err) {
      setError(err.message || "Unable to load approval indents");
    }
  };
  useEffect(() => { load(); }, []);
  const open = async (row) => {
    setSelected(row);
    setRemarks(row?.approvalremarks || "");
    setItems(row ? await getRows("storerequisitionitemsds2", [{ field: "requisitionid", value: row._id }]) : []);
  };
  const approve = async () => {
    try {
      if (!selected) throw new Error("Select an indent");
      const sig = await getUserSignature(currentUser());
      const updated = await updateRow("storerequisitionds2", selected, {
        reqstatus: "Submitted",
        approvalStatus: "Approved",
        approvedby: currentName(),
        approvedbyemail: currentUser(),
        approveddate: today(),
        approversignature: sig.signaturelink || "",
        approvalremarks: remarks
      });
      setSelected(updated);
      setMessage("Indent approved and moved to assigned store for allotment");
      await load();
    } catch (err) {
      setError(err.message || "Unable to approve indent");
    }
  };
  return (
    <Page title="Indent Approver" subtitle="Approve HOI indents mapped to your department and print the indent with approver details." message={message} error={error}>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={1} alignItems={{ xs: "stretch", md: "center" }}>
          <Button startIcon={<Refresh />} onClick={load}>Refresh</Button>
          <Button startIcon={<Print />} variant="outlined" disabled={!selected} onClick={() => printPurchase2("indent", { header: selected, items })}>Print indent</Button>
          <Button variant="contained" color="success" disabled={!selected} onClick={approve}>Approve and send to store</Button>
        </Stack>
      </Paper>
      <Paper sx={{ p: 2, mb: 2 }}>
        <DataGrid autoHeight rows={rows.map((row) => ({ ...row, id: row._id }))} columns={[
          { field: "requestno", headerName: "Indent No", width: 170 },
          { field: "reqdate", headerName: "Date", width: 130 },
          { field: "departmentname", headerName: "Department", width: 190 },
          { field: "requestedby", headerName: "Requested By", width: 180 },
          { field: "store", headerName: "Store", width: 180 },
          { field: "approvalStatus", headerName: "Approval", width: 170 },
          { field: "actions", headerName: "Open", width: 110, renderCell: (p) => <Button size="small" onClick={() => open(p.row)}>Open</Button> }
        ]} slots={{ toolbar: GridToolbar }} slotProps={{ toolbar: { showQuickFilter: true } }} />
      </Paper>
      {selected && <Paper sx={{ p: 2 }}>
        <Typography variant="h6" fontWeight={800}>Indent {selected.requestno || selected.reqid}</Typography>
        <TextField sx={{ my: 2 }} label="Approval remarks" value={remarks} onChange={(e) => setRemarks(e.target.value)} multiline minRows={3} fullWidth />
        <DataGrid autoHeight rows={items.map((row, index) => ({ ...row, id: row._id || index }))} columns={[
          { field: "itemcode", headerName: "Code", width: 130 },
          { field: "itemname", headerName: "Item", flex: 1, minWidth: 220 },
          { field: "unit", headerName: "Unit", width: 100 },
          { field: "quantity", headerName: "Requested", width: 130 },
          { field: "remarks", headerName: "Remarks", flex: 1, minWidth: 180 }
        ]} slots={{ toolbar: GridToolbar }} />
      </Paper>}
    </Page>
  );
}

export function Purchase2StoreRequestReviewPage() {
  const { stores, basicsError } = usePurchase2Basics();
  const [requests, setRequests] = useState([]);
  const [selected, setSelected] = useState(null);
  const [items, setItems] = useState([]);
  const [stock, setStock] = useState([]);
  const [printData, setPrintData] = useState(null);
  const [prPrintData, setPrPrintData] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const load = async () => {
    const storeIds = new Set(stores.map((s) => text(s._id || s.storeid)));
    const storeNames = new Set(stores.map((s) => text(s.storename)));
    const [reqRows, stockRows] = await Promise.all([getRows("storerequisitionds2"), getRows("storeitemsds2")]);
    setRequests(reqRows.filter((r) => (storeIds.has(text(r.storeid)) || storeNames.has(text(r.store))) && isIndentStoreReady(r)));
    setStock(stockRows);
  };
  useEffect(() => { if (stores.length) load(); }, [stores.length]);
  const open = async (row) => {
    setSelected(row);
    setPrPrintData(null);
    const child = await getRows("storerequisitionitemsds2", [{ field: "requisitionid", value: row._id }]);
    setItems(child.length ? child : [{ ...row, requisitionid: row._id, quantity: row.quantity }]);
  };
  const stockFor = (item, request = selected) => stock.find((s) => {
    const sameStore = text(s.storeid) === text(request?.storeid)
      || text(s.storeId) === text(request?.storeid)
      || text(s.storename).toLowerCase() === text(request?.store || request?.storename).toLowerCase();
    const sameItem = text(s.itemcode).toLowerCase() === text(item.itemcode).toLowerCase()
      || text(s.itemid) === text(item.itemid)
      || text(s.itemname).toLowerCase() === text(item.itemname).toLowerCase();
    return sameStore && sameItem;
  });
  const issue = async () => {
    try {
      if (!selected) throw new Error("Open an indent request first");
      let issuedAny = false;
      let issuedLess = false;
      const updatedItems = [];
      for (const item of items) {
        const available = stockFor(item);
        if (!available) throw new Error(`Store stock not found for ${item.itemname || item.itemcode}`);
        const requested = num(item.quantity);
        const availableQty = num(available.quantity);
        const requestedIssue = item.assignedquantity === "" || item.assignedquantity === undefined ? Math.min(requested, availableQty) : num(item.assignedquantity);
        const issueQty = Math.min(requestedIssue, requested, availableQty);
        if (requestedIssue > requested) throw new Error(`Issue quantity cannot exceed requested quantity for ${item.itemname}`);
        if (requestedIssue > availableQty) throw new Error(`Issue quantity cannot exceed available stock for ${item.itemname}`);
        if (issueQty <= 0) continue;
        issuedAny = true;
        if (issueQty < requested) issuedLess = true;
        await updateRow("storeitemsds2", available, { quantity: num(available.quantity) - issueQty });
        const itemPatch = { approvedquantity: issueQty, issuedquantity: issueQty, assignedquantity: issueQty, allotdate: today(), allottedby: currentName(), allottedbyemail: currentUser(), status: issueQty < requested ? "Partially Issued" : "Issued" };
        if (item._id) await updateRow("storerequisitionitemsds2", item, itemPatch);
        updatedItems.push({ ...item, ...itemPatch });
      }
      if (!issuedAny) throw new Error("No quantity available to issue");
      const finalStatus = issuedLess ? "Partially Issued" : "Issued";
      const header = await updateRow("storerequisitionds2", selected, { reqstatus: finalStatus, approvalStatus: finalStatus, allotdate: today(), allottedby: currentName(), allottedbyemail: currentUser() });
      setMessage("Items allotted and store stock updated");
      const displayItems = items.map((item) => updatedItems.find((updated) => updated._id === item._id || updated.itemcode === item.itemcode) || item);
      setItems(displayItems);
      setSelected({ ...selected, ...header });
      setPrintData({ header: { ...selected, ...header }, items: displayItems });
      await load();
    } catch (err) { setError(err.message); }
  };
  const createPrFromIndent = async () => {
    try {
      if (!selected) throw new Error("Open an indent request first");
      const shortageItems = items.map((item) => {
        const availableQty = num(stockFor(item)?.quantity);
        const requested = num(item.quantity);
        const allotted = item.assignedquantity === "" || item.assignedquantity === undefined ? Math.min(requested, Math.max(availableQty, 0)) : num(item.assignedquantity);
        const shortage = Math.max(requested - Math.min(allotted, availableQty), 0);
        return { ...item, quantity: shortage, estimatedtotal: shortage * num(item.estimatedprice), remarks: item.remarks || `Shortage from indent ${selected.requestno || selected.reqid || ""}` };
      }).filter((item) => num(item.quantity) > 0);
      if (!shortageItems.length) throw new Error("No shortage found for this indent");
      const prnumber = key("PR");
      const header = await saveRow("storeprrequestds2", {
        prnumber,
        storeid: selected.storeid,
        storename: selected.store || selected.storename,
        departmentname: selected.departmentname,
        requestdate: today(),
        requestedby: currentName(),
        requestedbyemail: currentUser(),
        priority: "Normal",
        status: "Submitted",
        requesttime: nowTime(),
        sourceindentid: selected._id,
        sourceindentno: selected.requestno || selected.reqid,
        totalamount: shortageItems.reduce((sum, item) => sum + num(item.estimatedtotal), 0),
        remarks: `Created from shortage in indent ${selected.requestno || selected.reqid || selected._id}`
      });
      await Promise.all(shortageItems.map((item) => saveRow("storeprrequestitemsds2", { ...item, prnumber, prrequestid: header._id, sourceindentid: selected._id, sourceindentno: selected.requestno || selected.reqid, estimatedtotal: num(item.quantity) * num(item.estimatedprice) })));
      sendPurchase2Notification("PR Created", { prnumber, totalamount: header.totalamount, status: "Submitted" });
      const updated = await updateRow("storerequisitionds2", selected, { prnumber, shortageprstatus: "PR Created" });
      setSelected(updated);
      setMessage(`PR ${prnumber} created for shortage items`);
      setPrPrintData({ header, items: shortageItems });
      await load();
    } catch (err) {
      setError(err.message || "Unable to create PR from indent");
    }
  };
  return (
    <Page title="Indent Approval and Item Allotment" subtitle="Approve indent requests for assigned stores, allot available quantities, and print the allotment document." message={message} error={error || basicsError}>
      <Paper sx={{ p: 2 }}><Button startIcon={<Refresh />} onClick={load}>Refresh</Button><DataGrid sx={{ mt: 1 }} autoHeight rows={requests.map((r) => ({ ...r, id: r._id }))} columns={[{ field: "reqdate", headerName: "Date", width: 130 }, { field: "requestno", headerName: "Indent No", width: 170 }, { field: "departmentname", headerName: "Department", width: 180 }, { field: "requestedby", headerName: "Requested By", width: 180 }, { field: "store", headerName: "Store", width: 180 }, { field: "reqstatus", headerName: "Status", width: 150 }, { field: "actions", headerName: "Allot Items", width: 150, renderCell: (p) => <Button size="small" variant="contained" onClick={() => open(p.row)}>Allot items</Button> }]} slots={{ toolbar: GridToolbar }} /></Paper>
      {selected && <Paper sx={{ p: 2, mt: 2 }}><Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}><Box><Typography variant="h6">Allot items for {selected.requestno || selected.reqid || selected._id}</Typography><Typography variant="body2" color="text.secondary">Enter an allotted quantity equal to or less than requested quantity and available stock.</Typography></Box><Chip label={selected.reqstatus || selected.status || "Open"} /></Stack><DataGrid autoHeight rows={items.map((item, i) => { const available = stockFor(item); const availableQty = num(available?.quantity); const previousQty = item.assignedquantity || item.issuedquantity || item.approvedquantity; return { ...item, id: i, available: availableQty, shortage: Math.max(num(item.quantity) - availableQty, 0), assignedquantity: previousQty === undefined || previousQty === "" ? Math.min(num(item.quantity), availableQty) : previousQty }; })} columns={[{ field: "itemcode", headerName: "Code", width: 130 }, { field: "itemname", headerName: "Item", flex: 1, minWidth: 220 }, { field: "unit", headerName: "Unit", width: 90 }, { field: "quantity", headerName: "Requested", width: 120 }, { field: "available", headerName: "Available", width: 120 }, { field: "shortage", headerName: "Shortage", width: 120 }, { field: "assignedquantity", headerName: "Allotted Qty", width: 150, editable: true, type: "number" }, { field: "remarks", headerName: "Remarks", flex: 1, editable: true }]} processRowUpdate={(row) => { setItems(items.map((it, idx) => idx === row.id ? { ...it, assignedquantity: num(row.assignedquantity), approvedquantity: num(row.assignedquantity), remarks: row.remarks || "" } : it)); return row; }} /><Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: "wrap" }}><Button variant="contained" onClick={issue}>Approve and allot items</Button><Button variant="outlined" color="warning" onClick={createPrFromIndent}>Create PR from shortage</Button><Button startIcon={<Print />} variant="outlined" disabled={!prPrintData} onClick={() => printPurchase2("pr", prPrintData)}>Print shortage PR</Button><Button startIcon={<Print />} variant="outlined" disabled={!printData} onClick={() => printPurchase2("indent", printData)}>Print allotment</Button></Stack></Paper>}
    </Page>
  );
}

export function Purchase2StorePrRequestPage() {
  const { stores, basicsError } = usePurchase2Basics();
  const [form, setForm] = useState({ storeid: "", storename: "", requestdate: today(), priority: "Normal", status: "Draft", remarks: "" });
  const [items, setItems] = useState([]);
  const [history, setHistory] = useState([]);
  const [historyItems, setHistoryItems] = useState([]);
  const [printData, setPrintData] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const loadHistory = async () => {
    const email = text(currentUser()).toLowerCase();
    const rows = await getRows("storeprrequestds2");
    setHistory(rows.filter((row) => text(row.requestedbyemail).toLowerCase() === email));
  };
  useEffect(() => { loadHistory(); }, []);
  const save = async () => {
    try {
      if (!form.storeid || !items.length) throw new Error("Select store and add items");
      const prnumber = key("PR");
      const totalamount = items.reduce((s, i) => s + num(i.estimatedtotal), 0);
      const header = await saveRow("storeprrequestds2", { ...form, prnumber, requestedby: currentName(), requestedbyemail: currentUser(), status: "Submitted", requesttime: nowTime(), totalamount });
      await Promise.all(items.map((item) => saveRow("storeprrequestitemsds2", { ...item, prnumber, prrequestid: header._id, estimatedtotal: num(item.quantity) * num(item.estimatedprice) })));
      sendPurchase2Notification("PR Created", { prnumber, totalamount, status: "Submitted" });
      setMessage("PR request submitted");
      setPrintData({ header, items });
      setItems([]);
      await loadHistory();
    } catch (err) { setError(err.message); }
  };
  const openHistory = async (row) => {
    const child = await getRows("storeprrequestitemsds2", [{ field: "prnumber", value: row.prnumber }]);
    setHistoryItems(child);
    setPrintData({ header: row, items: child });
  };
  return (
    <Page title="Store PR Request" subtitle="Create purchase requisition requests from assigned stores." message={message} error={error || basicsError}>
      <Paper sx={{ p: 2, mb: 2 }}><Grid container spacing={2}><Grid item xs={12} md={4}><Autocomplete options={stores} getOptionLabel={(o) => o.storename || ""} onChange={(_, v) => setForm((p) => ({ ...p, storeid: v?._id || v?.storeid || "", storename: v?.storename || "" }))} renderInput={(params) => <TextField {...params} label="Assigned store" size="small" />} /></Grid><Grid item xs={12} md={2}><TextField size="small" type="date" label="Date" value={form.requestdate} InputLabelProps={{ shrink: true }} onChange={(e) => setForm((p) => ({ ...p, requestdate: e.target.value }))} fullWidth /></Grid><Grid item xs={12} md={2}><TextField size="small" label="Priority" value={form.priority} onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value }))} fullWidth /></Grid><Grid item xs={12} md={4}><TextField size="small" label="Remarks" value={form.remarks} onChange={(e) => setForm((p) => ({ ...p, remarks: e.target.value }))} fullWidth /></Grid></Grid></Paper>
      <ItemsEditor items={items} setItems={setItems} showMake showPrice />
      <Button sx={{ mt: 2 }} startIcon={<Save />} variant="contained" onClick={save}>Submit PR</Button>
      <Stack direction="row" spacing={1} sx={{ mt: 2 }}><Button startIcon={<Print />} variant="outlined" disabled={!printData} onClick={() => printPurchase2("pr", printData)}>Print PR</Button></Stack>
      <Paper sx={{ p: 2, mt: 2 }}>
        <Typography variant="h6" fontWeight={800}>My PR history</Typography>
        <DataGrid autoHeight rows={history.map((r) => ({ ...r, id: r._id }))} columns={[{ field: "prnumber", headerName: "PR Number", width: 180 }, { field: "storename", headerName: "Store", width: 180 }, { field: "status", headerName: "Status", width: 130 }, { field: "requestdate", headerName: "Date", width: 150 }, { field: "requesttime", headerName: "Time", width: 100 }, { field: "totalamount", headerName: "Total", width: 120 }, { field: "actions", headerName: "Print", width: 120, renderCell: (params) => <Button size="small" onClick={() => openHistory(params.row)}>Open</Button> }]} slots={{ toolbar: GridToolbar }} />
        {!!historyItems.length && <DataGrid sx={{ mt: 2 }} autoHeight rows={historyItems.map((r, i) => ({ ...r, id: i }))} columns={[{ field: "itemname", headerName: "Item", flex: 1 }, { field: "make", headerName: "Make", width: 140 }, { field: "quantity", headerName: "Qty", width: 100 }, { field: "estimatedprice", headerName: "Rate", width: 100 }]} />}
      </Paper>
    </Page>
  );
}

export function Purchase2PoAssignmentPage() {
  const [prs, setPrs] = useState([]);
  const [itemsByPr, setItemsByPr] = useState({});
  const [users, setUsers] = useState([]);
  const [selected, setSelected] = useState([]);
  const [activeTab, setActiveTab] = useState("new");
  const [activePr, setActivePr] = useState(null);
  const [assignee, setAssignee] = useState(null);
  const [remarks, setRemarks] = useState("");
  const [statusComments, setStatusComments] = useState("");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [filters, setFilters] = useState([{ field: "prnumber", value: "" }]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [printingId, setPrintingId] = useState("");
  const statusBucket = (row = {}) => {
    const status = text(row.prstatus || row.reqstatus || row.status).toLowerCase();
    if (status === "hold" || status === "on hold") return "hold";
    if (status === "reject" || status === "rejected") return "reject";
    return "new";
  };
  const load = async () => {
    const [prRows, itemRows, assignmentRows, hierarchyRes] = await Promise.all([
      getRows("storeprrequestds2"),
      getRows("storeprrequestitemsds2"),
      getRows("storepoassignmentds2"),
      ep1.get("/api/v2/hr-advanced/hierarchy", { params: { colid: global1.colid, manageremail: currentUser() } })
    ]);
    const assignedMap = new Map();
    assignmentRows.forEach((row) => {
      if (!row.prnumber) return;
      assignedMap.set(row.prnumber, row);
    });
    const itemMap = {};
    itemRows.forEach((item) => {
      const prnumber = text(item.prnumber);
      if (!prnumber) return;
      if (!itemMap[prnumber]) itemMap[prnumber] = [];
      itemMap[prnumber].push(item);
    });
    setItemsByPr(itemMap);
    setPrs(prRows.map((row) => {
      const assignment = assignedMap.get(row.prnumber) || {};
      const items = itemMap[row.prnumber] || [];
      return {
        ...row,
        assignedto: assignment.assignedto || row.assignedto || "",
        assignedtoemail: assignment.assignedtoemail || row.assignedtoemail || "",
        assignedby: assignment.assignedby || row.assignedby || "",
        assigneddate: assignment.assigneddate || row.assigneddate || "",
        assignmentstatus: assignment.status || row.assignmentstatus || "",
        itemnames: items.map((item) => item.itemname || item.item || "").filter(Boolean).join(", "),
        itemcodes: items.map((item) => item.itemcode || "").filter(Boolean).join(", "),
        itemcount: items.length,
        quantitysummary: items.map((item) => `${item.itemcode || item.itemname || "Item"}: ${item.quantity || 0}`).join(", ")
      };
    }));
    const userMap = new Map();
    (hierarchyRes.data?.data || []).forEach((row) => {
      if (text(row.status || "Active").toLowerCase() === "inactive") return;
      const user = { name: row.employeename, email: row.employeeemail, department: row.department };
      const email = text(user.email).toLowerCase();
      if (email) userMap.set(email, { ...user, user: user.email });
    });
    setUsers([...userMap.values()].sort((a, b) => text(a.name).localeCompare(text(b.name))));
  };
  useEffect(() => { load(); }, []);
  const choosePr = (row) => {
    setActivePr(row);
    setStatusComments(row?.statuscomments || row?.prcomments || row?.holdrejectcomments || row?.comments || row?.remarks || "");
  };
  const printPr = async (row) => {
    try {
      setPrintingId(row?._id || row?.id || row?.prnumber || "");
      const items = await getRows("storeprrequestitemsds2", [{ field: "prnumber", value: row?.prnumber }]);
      await printPurchase2("pr", { header: row, items });
    } catch (err) {
      setError(err.message || "Unable to print PR");
    } finally {
      setPrintingId("");
    }
  };
  const assign = async () => {
    try {
      if (!selected.length || !assignee) throw new Error("Select PR requests and assignee");
      await Promise.all(selected.map((id) => {
        const row = prs.find((pr) => pr._id === id);
        return Promise.all([
          saveRow("storepoassignmentds2", { requestid: id, prnumber: row?.prnumber, assignedto: assignee.name, assignedtoemail: assignee.email || assignee.user, assignedby: currentName(), assignedbyemail: currentUser(), assigneddate: today(), assignedtime: nowTime(), status: "Assigned", remarks }),
          updateRow("storeprrequestds2", row, { status: "Approved", reqstatus: "Approved", prstatus: "Approved", approvedby: currentName(), approvedbyemail: currentUser(), approveddate: today(), approvedtime: nowTime(), assignedto: assignee.name, assignedtoemail: assignee.email || assignee.user })
        ]);
      }));
      setMessage("PR requests assigned and approved automatically for PO creation");
      setSelected([]);
      await load();
    } catch (err) { setError(err.message); }
  };
  const updatePrStatus = async (nextStatus) => {
    try {
      if (!activePr?._id) throw new Error("Select a PR from the grid");
      const patch = {
        status: nextStatus,
        reqstatus: nextStatus,
        prstatus: nextStatus,
        statuscomments: statusComments,
        prcomments: statusComments,
        holdrejectcomments: statusComments,
        statusupdatedby: currentName(),
        statusupdatedbyemail: currentUser(),
        statusupdateddate: today(),
        statusupdatedtime: nowTime()
      };
      const saved = await updateRow("storeprrequestds2", activePr, patch);
      const updated = { ...activePr, ...(saved || {}), ...patch };
      setPrs((prev) => prev.map((row) => row._id === activePr._id ? updated : row));
      setActivePr(updated);
      setActiveTab(statusBucket(updated));
      setMessage(`PR moved to ${nextStatus}`);
    } catch (err) {
      setError(err.message || "Unable to update PR status");
    }
  };
  const filterFields = [
    { field: "prnumber", label: "PR Number" },
    { field: "itemnames", label: "Items" },
    { field: "itemcodes", label: "Item Code" },
    { field: "storename", label: "Store" },
    { field: "departmentname", label: "Department" },
    { field: "requestedby", label: "Requested By" },
    { field: "requestedbyemail", label: "Requested By Email" },
    { field: "assignedto", label: "PO Creator" },
    { field: "assignedtoemail", label: "PO Creator Email" },
    { field: "status", label: "Status" }
  ];
  const updateFilter = (index, patch) => setFilters((prev) => prev.map((row, i) => i === index ? { ...row, ...patch } : row));
  const filteredPrs = prs.filter((row) => {
    if (statusBucket(row) !== activeTab) return false;
    if (!inDateRange(row.requestdate || row.createdAt, dateRange.start, dateRange.end)) return false;
    return filters.every((filter) => !text(filter.value) || text(row[filter.field]).toLowerCase().includes(text(filter.value).toLowerCase()));
  });
  const columns = [
    { field: "prnumber", headerName: "PR Number", width: 170 },
    { field: "itemnames", headerName: "Items", minWidth: 260, flex: 1 },
    { field: "itemcodes", headerName: "Item Codes", minWidth: 180 },
    { field: "quantitysummary", headerName: "Qty Summary", minWidth: 220, flex: 1 },
    { field: "assignedto", headerName: "PO Creator", width: 180 },
    { field: "assignedtoemail", headerName: "PO Creator Email", width: 220 },
    { field: "requestedby", headerName: "Requested By", width: 180 },
    { field: "requestedbyemail", headerName: "Requested Email", width: 220 },
    { field: "storename", headerName: "Store", width: 180 },
    { field: "departmentname", headerName: "Department", width: 180 },
    { field: "status", headerName: "PR Status", width: 130 },
    { field: "requestdate", headerName: "PR Date", width: 130 },
    { field: "requesttime", headerName: "PR Time", width: 100 },
    { field: "assigneddate", headerName: "Assigned Date", width: 130 },
    { field: "assignedtime", headerName: "Assigned Time", width: 120 },
    { field: "remarks", headerName: "Remarks", flex: 1, minWidth: 220 },
    { field: "statuscomments", headerName: "Status Comments", flex: 1, minWidth: 220 },
    {
      field: "print",
      headerName: "Print preview",
      width: 150,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <Button
          size="small"
          startIcon={<Print />}
          disabled={printingId === (params.row._id || params.row.id || params.row.prnumber)}
          onClick={() => printPr(params.row)}
        >
          {printingId === (params.row._id || params.row.id || params.row.prnumber) ? "Loading" : "Print PR"}
        </Button>
      )
    }
  ];
  return (
    <Page title="Assign Store Requests for PO Creation" subtitle="Assign approved store PR requests to PO creators." message={message} error={error}>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
          <Autocomplete sx={{ minWidth: 320 }} options={users} getOptionLabel={(o) => `${o.name || ""} ${o.email || o.user || ""}`} value={assignee} onChange={(_, v) => setAssignee(v)} renderInput={(params) => <TextField {...params} label="PO creator" size="small" />} />
          <TextField size="small" label="Remarks" value={remarks} onChange={(e) => setRemarks(e.target.value)} />
          <Button variant="contained" onClick={assign}>Assign</Button>
        </Stack>
      </Paper>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack spacing={2}>
          <Typography variant="h6" fontWeight={800}>PR status action</Typography>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }}>
            <Chip color={activePr ? "primary" : "default"} label={activePr ? `Selected PR: ${activePr.prnumber || activePr._id}` : "Select a PR from grid"} />
            <TextField fullWidth size="small" label="Comments" value={statusComments} onChange={(e) => setStatusComments(e.target.value)} />
            <Button variant="outlined" color="warning" disabled={!activePr} onClick={() => updatePrStatus("Hold")}>Hold</Button>
            <Button variant="outlined" color="error" disabled={!activePr} onClick={() => updatePrStatus("Rejected")}>Reject</Button>
          </Stack>
        </Stack>
      </Paper>
      <Paper sx={{ p: 2 }}>
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} md={2}><TextField size="small" type="date" label="Start date" value={dateRange.start} InputLabelProps={{ shrink: true }} onChange={(e) => setDateRange((p) => ({ ...p, start: e.target.value }))} fullWidth /></Grid>
          <Grid item xs={12} md={2}><TextField size="small" type="date" label="End date" value={dateRange.end} InputLabelProps={{ shrink: true }} onChange={(e) => setDateRange((p) => ({ ...p, end: e.target.value }))} fullWidth /></Grid>
          <Grid item xs={12} md={8}><Stack direction="row" spacing={1} justifyContent="flex-end"><Button startIcon={<Add />} onClick={() => setFilters((prev) => [...prev, { field: "prnumber", value: "" }])}>Add filter</Button><Button startIcon={<Refresh />} onClick={load}>Load</Button></Stack></Grid>
          {filters.map((filter, index) => (
            <React.Fragment key={`${filter.field}-${index}`}>
              <Grid item xs={12} md={3}><TextField select size="small" label="Filter field" value={filter.field} onChange={(e) => updateFilter(index, { field: e.target.value, value: "" })} fullWidth>{filterFields.map((field) => <MenuItem key={field.field} value={field.field}>{field.label}</MenuItem>)}</TextField></Grid>
              <Grid item xs={12} md={7}><Autocomplete freeSolo options={uniqueOptions(prs, filter.field)} value={filter.value || ""} onChange={(_, value) => updateFilter(index, { value: value || "" })} onInputChange={(_, value) => updateFilter(index, { value })} renderInput={(params) => <TextField {...params} size="small" label="Value" />} /></Grid>
              <Grid item xs={12} md={2}><Button fullWidth color="error" onClick={() => setFilters((prev) => prev.filter((_, i) => i !== index))}>Remove</Button></Grid>
            </React.Fragment>
          ))}
        </Grid>
        <Tabs value={activeTab} onChange={(_, value) => { setActiveTab(value); setSelected([]); }}>
          <Tab value="new" label={`New (${prs.filter((row) => statusBucket(row) === "new").length})`} />
          <Tab value="hold" label={`Hold (${prs.filter((row) => statusBucket(row) === "hold").length})`} />
          <Tab value="reject" label={`Reject (${prs.filter((row) => statusBucket(row) === "reject").length})`} />
        </Tabs>
        <DataGrid
          sx={{ mt: 2 }}
          autoHeight
          checkboxSelection
          rowSelectionModel={selected}
          onRowSelectionModelChange={setSelected}
          onRowClick={(params) => choosePr(params.row)}
          rows={filteredPrs.map((r) => ({ ...r, id: r._id }))}
          columns={columns}
          slots={{ toolbar: GridToolbar }}
        />
      </Paper>
    </Page>
  );
}

export function Purchase2LocalPoPage() {
  const { stores, basicsError } = usePurchase2Basics();
  const [vendors, setVendors] = useState([]);
  const [vendor, setVendor] = useState(null);
  const [store, setStore] = useState(null);
  const [make, setMake] = useState("");
  const [amount, setAmount] = useState("");
  const [gst, setGst] = useState("");
  const [discount, setDiscount] = useState("");
  const [terms, setTerms] = useState("");
  const [remarks, setRemarks] = useState("");
  const [items, setItems] = useState([]);
  const [printData, setPrintData] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const load = async () => {
    const ven = await getRows("vendorsds2");
    setVendors(ven);
  };
  useEffect(() => { load(); }, []);
  useEffect(() => { if (!store && stores.length) setStore(stores[0]); }, [stores, store]);
  const createPo = async () => {
    try {
      if (!vendor || !items.length) throw new Error("Select vendor and add items");
      if (!store) throw new Error("Select assigned store");
      const poid = key("PO");
      const priced = await Promise.all(items.map(async (item) => {
        const rates = await getRows("vendoritemsds2", [{ field: "vendorid", value: vendor._id }, { field: "itemid", value: item.itemid }]);
        const rate = rates[0]?.price || item.estimatedprice || 0;
        const detail = rates[0] || {};
        return { ...item, make: item.make || make, price: rate, gst: detail.gst || item.gst || 0, discount: detail.discount || 0, terms: detail.terms || "", warranty: detail.warranty || "", total: calcLineTotal({ ...item, price: rate, gst: detail.gst, discount: detail.discount }) };
      }));
      const itemTotal = priced.reduce((sum, item) => sum + num(item.total), 0);
      const baseAmount = amount === "" ? itemTotal : num(amount);
      const gstAmount = baseAmount * (num(gst) / 100);
      const total = Number((baseAmount + gstAmount - num(discount)).toFixed(2));
      const signature = await getUserSignature();
      const storeName = store.storename || store.store || store.name || "";
      const storeId = store._id || store.storeid || "";
      const header = await saveRow("storepoorderds2", { poid, year: "2026-27", vendor: vendor.vendorname, vendorid: vendor._id, storeid: storeId, storename: storeName, store: storeName, price: baseAmount, amount: baseAmount, gst: num(gst), discount: num(discount), netprice: total, actualAmount: total, poType: "Local", postatus: "Draft", approvalStatus: "Draft", deliveryType: "Physical Delivery", terms, remarks, creatorName: currentName(), creatorEmail: currentUser(), creatorSignature: signature.signaturelink || "", description: "Local PO", createdtime: nowTime() });
      await Promise.all(priced.map((item) => saveRow("storepoitemsds2", { ...item, poid, vendor: vendor.vendorname, vendorid: vendor._id, storeid: storeId, storename: storeName, postatus: "Draft" })));
      sendPurchase2Notification("PO Generated", { poid, amount: total, status: "Draft" });
      setMessage("Local PO created as draft");
      setPrintData({ header: { ...vendor, ...header, store: storeName, storename: storeName, terms, remarks }, items: priced });
    } catch (err) { setError(err.message); }
  };
  return <Page title="Local PO Creation" subtitle="Create local purchase orders directly from item master and one selected vendor." message={message} error={error || basicsError}><Paper sx={{ p: 2, mb: 2 }}><Grid container spacing={2}><Grid item xs={12} md={4}><Autocomplete options={vendors} getOptionLabel={(o) => o.vendorname || o.name || ""} value={vendor} onChange={(_, v) => setVendor(v)} renderInput={(params) => <TextField {...params} label="Vendor" size="small" />} /></Grid><Grid item xs={12} md={4}><Autocomplete options={stores} getOptionLabel={(o) => o.storename || o.store || o.name || ""} value={store} onChange={(_, v) => setStore(v)} renderInput={(params) => <TextField {...params} label="Assigned store" size="small" />} /></Grid><Grid item xs={12} md={4}><TextField size="small" label="Make" value={make} onChange={(e) => setMake(e.target.value)} fullWidth /></Grid><Grid item xs={12} md={3}><TextField size="small" type="number" label="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} fullWidth /></Grid><Grid item xs={12} md={3}><TextField size="small" type="number" label="GST %" value={gst} onChange={(e) => setGst(e.target.value)} fullWidth /></Grid><Grid item xs={12} md={3}><TextField size="small" type="number" label="Discount amount" value={discount} onChange={(e) => setDiscount(e.target.value)} fullWidth /></Grid><Grid item xs={12} md={3}><TextField size="small" label="Remarks" value={remarks} onChange={(e) => setRemarks(e.target.value)} fullWidth /></Grid><Grid item xs={12}><TextField size="small" label="Terms and conditions" value={terms} onChange={(e) => setTerms(e.target.value)} multiline minRows={4} fullWidth /></Grid><Grid item xs={12}><Stack direction="row" spacing={1} flexWrap="wrap"><Button variant="contained" onClick={createPo}>Create PO Draft</Button><Button startIcon={<Print />} variant="outlined" disabled={!printData} onClick={() => printPurchase2("localPo", printData)}>Print local PO</Button></Stack></Grid></Grid></Paper><ItemsEditor items={items} setItems={setItems} showMake showPrice showUnit /></Page>;
}

export function Purchase2StoreItemUserPage() {
  const { stores, basicsError } = usePurchase2Basics();
  const [rows, setRows] = useState([]);
  const [filters, setFilters] = useState([]);
  const [draft, setDraft] = useState({ field: "storename", value: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const fields = ["storename", "itemcode", "itemname", "category", "type", "unit", "status"];
  const load = async () => {
    try {
      const storeIds = new Set(stores.map((s) => text(s._id || s.storeid)));
      const storeNames = new Set(stores.map((s) => text(s.storename || s.store)));
      const stockRows = await getRows("storeitemsds2");
      setRows(stockRows.filter((row) => storeIds.has(text(row.storeid)) || storeNames.has(text(row.storename || row.store))));
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Unable to load store items");
    }
  };
  useEffect(() => { if (stores.length) load(); }, [stores.length]);
  const filteredRows = rows.filter((row) => filters.every((filter) => text(row[filter.field]).toLowerCase().includes(text(filter.value).toLowerCase())));
  const valueOptions = Array.from(new Set(rows.map((row) => text(row[draft.field])).filter(Boolean))).sort();
  return (
    <Page title="Store Item User" subtitle="View only the stock items available in stores assigned to the logged-in user." message={message} error={error || basicsError}>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
          <Autocomplete sx={{ minWidth: 220 }} options={fields} value={draft.field} onChange={(_, value) => setDraft({ field: value || "storename", value: "" })} renderInput={(params) => <TextField {...params} label="Filter field" size="small" />} />
          <Autocomplete freeSolo sx={{ minWidth: 260 }} options={valueOptions} value={draft.value} onInputChange={(_, value) => setDraft((p) => ({ ...p, value }))} renderInput={(params) => <TextField {...params} label="Filter value" size="small" />} />
          <Button variant="outlined" onClick={() => draft.field && draft.value && setFilters((prev) => [...prev, draft])}>Add filter</Button>
          <Button variant="text" onClick={() => setFilters([])}>Clear</Button>
          <Button startIcon={<Refresh />} onClick={load}>Refresh</Button>
          <Button startIcon={<Print />} variant="contained" onClick={() => printStoreItems(filteredRows)}>Print</Button>
        </Stack>
        {!!filters.length && <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Active: {filters.map((f) => `${f.field}: ${f.value}`).join(", ")}</Typography>}
      </Paper>
      <Paper sx={{ p: 2 }}>
        <DataGrid autoHeight rows={filteredRows.map((row) => ({ ...row, id: row._id }))} columns={[
          { field: "storename", headerName: "Store", flex: 1, minWidth: 180 },
          { field: "itemcode", headerName: "Item Code", width: 140 },
          { field: "itemname", headerName: "Item", flex: 1, minWidth: 220 },
          { field: "category", headerName: "Category", width: 150 },
          { field: "type", headerName: "Type", width: 130 },
          { field: "unit", headerName: "Unit", width: 100 },
          { field: "quantity", headerName: "Quantity", width: 120 },
          { field: "status", headerName: "Status", width: 130 }
        ]} slots={{ toolbar: GridToolbar }} slotProps={{ toolbar: { showQuickFilter: true, csvOptions: { fileName: "purchase2_store_item_user" } } }} />
      </Paper>
    </Page>
  );
}

export function Purchase2PoApprovalWorkflowPage() {
  const [rows, setRows] = useState([]);
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ level: 1, approvername: "", approveremail: "", role: "", status: "Active", remarks: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const load = async () => {
    const [workflow, userRows] = await Promise.all([getRows("storepoapprovalworkflowds2"), loadUsers()]);
    setRows(workflow);
    setUsers(userRows.filter((user) => text(user.role).toLowerCase() !== "student"));
  };
  useEffect(() => { load(); }, []);
  const save = async () => {
    try {
      if (!form.approveremail) throw new Error("Select approver");
      await saveRow("storepoapprovalworkflowds2", form);
      setMessage("PO approval level saved");
      setForm({ level: Number(form.level || 1) + 1, approvername: "", approveremail: "", role: "", status: "Active", remarks: "" });
      await load();
    } catch (err) { setError(err.message); }
  };
  const remove = async (row) => {
    if (!window.confirm("Delete this level?")) return;
    await ep1.post(`/api/v2/purchase2/storepoapprovalworkflowds2/delete`, { colid: global1.colid, id: row._id });
    await load();
  };
  return <Page title="PO Approval Workflow" subtitle="Define dynamic approval levels for Purchase 2 purchase orders." message={message} error={error}><Paper sx={{ p: 2, mb: 2 }}><Grid container spacing={2}><Grid item xs={12} md={2}><TextField size="small" type="number" label="Level" value={form.level} onChange={(e) => setForm((p) => ({ ...p, level: e.target.value }))} fullWidth /></Grid><Grid item xs={12} md={4}><Autocomplete options={users} getOptionLabel={(o) => `${o.name || ""} ${o.email || o.user || ""}`} onChange={(_, v) => setForm((p) => ({ ...p, approvername: v?.name || "", approveremail: v?.email || v?.user || "", role: v?.role || "" }))} renderInput={(params) => <TextField {...params} label="Approver" size="small" />} /></Grid><Grid item xs={12} md={2}><TextField size="small" label="Role" value={form.role} onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))} fullWidth /></Grid><Grid item xs={12} md={2}><TextField select size="small" label="Status" value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))} fullWidth>{["Active", "Inactive"].map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}</TextField></Grid><Grid item xs={12} md={2}><Button fullWidth variant="contained" onClick={save}>Save level</Button></Grid></Grid></Paper><DataGrid autoHeight rows={rows.map((r) => ({ ...r, id: r._id }))} columns={[{ field: "level", headerName: "Level", width: 90 }, { field: "approvername", headerName: "Approver", flex: 1 }, { field: "approveremail", headerName: "Email", flex: 1 }, { field: "role", headerName: "Role", width: 160 }, { field: "status", headerName: "Status", width: 120 }, { field: "actions", headerName: "Action", width: 110, renderCell: (p) => <Button size="small" color="error" onClick={() => remove(p.row)}>Delete</Button> }]} slots={{ toolbar: GridToolbar }} /></Page>;
}

function Purchase2ManagePoPage({ admin = false }) {
  const [prs, setPrs] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [pos, setPos] = useState([]);
  const [poItems, setPoItems] = useState([]);
  const [selectedPo, setSelectedPo] = useState(null);
  const [terms, setTerms] = useState("");
  const [warranty, setWarranty] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const load = async () => {
    const [prRows, assRows, poRows] = await Promise.all([getRows("storeprrequestds2"), getRows("storepoassignmentds2"), getRows("storepoorderds2")]);
    const email = text(currentUser()).toLowerCase();
    setPrs(prRows);
    setAssignments(admin ? assRows : assRows.filter((row) => sameEmail(row.assignedtoemail, email)));
    setPos(admin ? poRows : poRows.filter((row) => sameEmail(row.creatorEmail || row.user, email)));
  };
  useEffect(() => { load(); }, [admin]);
  const createPoFromAssignment = async (assignment) => {
    try {
      const items = await getRows("storeprrequestitemsds2", [{ field: "prnumber", value: assignment.prnumber }]);
      if (!items.length) throw new Error("No PR items found");
      const [vendors, vendorItems] = await Promise.all([getRows("vendorsds2"), getRows("vendoritemsds2")]);
      const matchingVendor = vendors.find((vendor) => items.every((item) => vendorItems.some((vi) => text(vi.vendorid) === text(vendor._id) && (text(vi.itemid) === text(item.itemid) || text(vi.item).toLowerCase() === text(item.itemname).toLowerCase()))));
      if (!matchingVendor) throw new Error("No single vendor found for all PR items in vendor item master");
      const poid = key("PO");
      const priced = items.map((item) => {
        const vi = vendorItems.find((row) => text(row.vendorid) === text(matchingVendor._id) && (text(row.itemid) === text(item.itemid) || text(row.item).toLowerCase() === text(item.itemname).toLowerCase())) || {};
        return { ...item, price: vi.price || item.estimatedprice || 0, gst: vi.gst || 0, discount: vi.discount || 0, vendor: matchingVendor.vendorname, vendorid: matchingVendor._id, total: calcLineTotal({ ...item, price: vi.price || item.estimatedprice, gst: vi.gst, discount: vi.discount }) };
      });
      const total = priced.reduce((sum, item) => sum + num(item.total), 0);
      const signature = await getUserSignature();
      const header = await saveRow("storepoorderds2", { poid, prnumber: assignment.prnumber, year: "2026-27", vendor: matchingVendor.vendorname, vendorid: matchingVendor._id, price: total, netprice: total, actualAmount: total, poType: "Standard", postatus: "Draft", approvalStatus: "Draft", creatorName: currentName(), creatorEmail: currentUser(), creatorSignature: signature.signaturelink || "", terms: terms || matchingVendor.payterm || "", warranty, description: `PO from PR ${assignment.prnumber}`, createdtime: nowTime() });
      await Promise.all(priced.map((item) => saveRow("storepoitemsds2", { ...item, poid, postatus: "Draft", storereqid: assignment.requestid })));
      await updateRow("storepoassignmentds2", assignment, { status: "PO Created", poid });
      sendPurchase2Notification("PO Generated", { poid, prnumber: assignment.prnumber, amount: total, status: "Draft" });
      setMessage(`PO ${poid} created as draft for ${matchingVendor.vendorname}`);
      setSelectedPo(header);
      setPoItems(priced);
      await load();
    } catch (err) { setError(err.message); }
  };
  const openPo = async (po) => {
    setSelectedPo(po);
    setTerms(po.terms || "");
    setWarranty(po.warranty || "");
    setPoItems(await getRows("storepoitemsds2", [{ field: "poid", value: po.poid }]));
  };
  const savePoDraft = async () => {
    try {
      if (!selectedPo) throw new Error("Open a PO first");
      if (text(selectedPo.postatus).toLowerCase() !== "draft") throw new Error("Only draft PO can be edited");
      const updatedItems = poItems.map((item) => ({ ...item, total: calcLineTotal(item) }));
      const total = updatedItems.reduce((sum, item) => sum + num(item.total), 0);
      const updated = await updateRow("storepoorderds2", selectedPo, { terms, warranty, price: total, netprice: total, actualAmount: total, updatedate: today() });
      await Promise.all(updatedItems.map((item) => {
        const payload = { ...item };
        delete payload.id;
        return item._id ? updateRow("storepoitemsds2", item, payload) : saveRow("storepoitemsds2", { ...payload, poid: selectedPo.poid, postatus: "Draft" });
      }));
      setSelectedPo(updated);
      setPoItems(updatedItems);
      setMessage("Draft PO updated");
      await load();
    } catch (err) { setError(err.message); }
  };
  const submitPo = async (po = selectedPo) => {
    try {
      const signature = await getUserSignature(po.creatorEmail || currentUser());
      const updated = await updateRow("storepoorderds2", po, { postatus: "Submitted", approvalStatus: "Pending", currentStep: po.currentStep || 1, creatorSignature: po.creatorSignature || signature.signaturelink || "", submittedtime: nowTime() });
      setSelectedPo(updated);
      setMessage("PO submitted for approval");
      await load();
    } catch (err) { setError(err.message); }
  };
  const approvePo = async (po = selectedPo) => {
    try {
      const workflow = (await getRows("storepoapprovalworkflowds2")).filter((row) => text(row.status || "Active").toLowerCase() === "active").sort((a, b) => num(a.level) - num(b.level));
      const currentStep = num(po.currentStep || 1);
      const currentLevel = workflow.find((row) => num(row.level) === currentStep) || workflow[0];
      if (!currentLevel) throw new Error("No PO approval workflow configured");
      if (!admin && !sameEmail(currentLevel.approveremail, currentUser())) throw new Error("This PO is not pending at your approval level");
      const sig = await getUserSignature(currentUser());
      const history = Array.isArray(po.approvalhistory) ? po.approvalhistory : [];
      const entry = { level: currentLevel.level, approvername: currentName(), approveremail: currentUser(), signaturelink: sig.signaturelink || "", date: new Date().toISOString(), status: "Approved" };
      const nextLevel = workflow.find((row) => num(row.level) > currentStep);
      const patch = nextLevel ? { currentStep: nextLevel.level, approvalStatus: "Pending", postatus: "Submitted", approvalhistory: [...history, entry] } : { currentStep, approvalStatus: "Approved", postatus: "Approved", approvalhistory: [...history, entry], approvedtime: nowTime() };
      const updated = await updateRow("storepoorderds2", po, patch);
      await saveRow("storepoapprovalds2", { poid: po.poid, level: currentLevel.level, approvername: currentName(), approveremail: currentUser(), status: "Approved", approvaldate: today(), remarks: "" });
      if (!nextLevel) sendPurchase2Notification("PO Finally Approved", { poid: po.poid, prnumber: po.prnumber, amount: po.actualAmount || po.netprice, status: "Approved" });
      setSelectedPo(updated);
      setMessage(nextLevel ? `Approved. Moved to level ${nextLevel.level}` : "PO fully approved");
      await load();
    } catch (err) { setError(err.message); }
  };
  return <Page title={admin ? "Manage PO Admin" : "Manage PO Creator"} subtitle={admin ? "View all PR and PO records and approve submitted POs." : "Create POs from PRs assigned to you and submit them for approval."} message={message} error={error}>
    <Paper sx={{ p: 2, mb: 2 }}>
      <Typography variant="h6">PR list</Typography>
      <DataGrid autoHeight rows={(admin ? prs : assignments).map((r) => ({ ...r, id: r._id }))} columns={admin ? [{ field: "prnumber", headerName: "PR", width: 160 }, { field: "storename", headerName: "Store", width: 170 }, { field: "requestedbyemail", headerName: "Requested By", width: 220 }, { field: "status", headerName: "Status", width: 120 }] : [{ field: "prnumber", headerName: "PR", width: 160 }, { field: "assignedto", headerName: "Assigned To", width: 180 }, { field: "status", headerName: "Status", width: 140 }, { field: "actions", headerName: "Create PO", width: 140, renderCell: (p) => <Button size="small" disabled={text(p.row.status).toLowerCase() === "po created"} onClick={() => createPoFromAssignment(p.row)}>Create PO</Button> }]} slots={{ toolbar: GridToolbar }} />
    </Paper>
    <Paper sx={{ p: 2, mb: 2 }}>
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} md={6}><TextField size="small" label="Terms and conditions" value={terms} onChange={(e) => setTerms(e.target.value)} multiline minRows={4} fullWidth /></Grid>
        <Grid item xs={12} md={6}><TextField size="small" label="Warranty" value={warranty} onChange={(e) => setWarranty(e.target.value)} multiline minRows={4} fullWidth /></Grid>
        <Grid item xs={12}>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Button startIcon={<Refresh />} onClick={load}>Refresh</Button>
            <Button variant="outlined" disabled={!selectedPo || text(selectedPo.postatus).toLowerCase() !== "draft"} onClick={savePoDraft}>Save draft changes</Button>
            <Button variant="contained" disabled={!selectedPo || text(selectedPo.postatus).toLowerCase() !== "draft"} onClick={() => submitPo()}>Submit PO</Button>
            <Button variant="contained" color="success" disabled={!selectedPo || text(selectedPo.postatus).toLowerCase() !== "submitted"} onClick={() => approvePo()}>Approve PO</Button>
            <Button startIcon={<Print />} variant="outlined" disabled={!selectedPo} onClick={() => printPurchase2(selectedPo.poType === "Local" ? "localPo" : "po", { header: { ...selectedPo, terms, warranty }, items: poItems })}>Print PO</Button>
          </Stack>
        </Grid>
      </Grid>
      <DataGrid autoHeight rows={pos.map((r) => ({ ...r, id: r._id }))} columns={[{ field: "poid", headerName: "PO", width: 160 }, { field: "prnumber", headerName: "PR", width: 160 }, { field: "vendor", headerName: "Vendor", flex: 1 }, { field: "postatus", headerName: "PO Status", width: 130 }, { field: "approvalStatus", headerName: "Approval", width: 130 }, { field: "currentStep", headerName: "Level", width: 90 }, { field: "actualAmount", headerName: "Amount", width: 120 }, { field: "actions", headerName: "Open", width: 100, renderCell: (p) => <Button size="small" onClick={() => openPo(p.row)}>Open</Button> }]} slots={{ toolbar: GridToolbar }} />
    </Paper>
    {selectedPo && <Paper sx={{ p: 2 }}>
      <Typography variant="h6">PO items: {selectedPo.poid}</Typography>
      <DataGrid autoHeight rows={poItems.map((r, i) => ({ ...r, id: i }))} processRowUpdate={(row) => { setPoItems(poItems.map((item, index) => index === row.id ? { ...item, make: row.make || "", total: calcLineTotal(row) } : item)); return row; }} columns={[{ field: "itemname", headerName: "Item", flex: 1 }, { field: "make", headerName: "Make", width: 180, editable: text(selectedPo.postatus).toLowerCase() === "draft" }, { field: "quantity", headerName: "Qty", width: 100 }, { field: "price", headerName: "Rate", width: 110 }, { field: "gst", headerName: "GST", width: 90 }, { field: "total", headerName: "Total", width: 120 }]} />
    </Paper>}
  </Page>;
}

export function Purchase2ManagePoAdminPage() {
  return <Purchase2ManagePoPage admin />;
}

export function Purchase2ManagePoCreatorPage() {
  return <Purchase2ManagePoPage />;
}

const humanCode = (prefix) => `${prefix}-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

const cashLineTotal = (row = {}) => {
  const baseAmount = num(row.quantity) * num(row.rate);
  const gstAmount = baseAmount * (num(row.gst) / 100);
  const taxAmount = baseAmount * (num(row.taxPaidRate) / 100);
  return Number((baseAmount + gstAmount + taxAmount).toFixed(2));
};

const printCashDocument = async (title, header = {}, items = []) => {
  const institution = await loadPrintInstitution();
  const logo = institution.logo || institution.logolink || institution.logoUrl || institution.logourl || "";
  const instName = institution.institutionname || institution.institution || institution.nameofinstitution || institution.name || global1.insname || "Institution";
  const address = institution.address || institution.institutionaddress || institution.address1 || "";
  const meta = [institution.phone || institution.mobile || institution.contact, institution.email || institution.emailid, institution.website].filter(Boolean).join(" | ");
  const total = items.reduce((sum, item) => sum + num(item.totalAmount), 0) || num(header.totalAmount || header.amount);
  const rows = items.map((item, index) => `<tr><td>${index + 1}</td><td>${esc(item.itemcode)}</td><td>${esc(item.item || item.itemname)}</td><td>${esc(item.makeSize)}</td><td>${esc(item.unit)}</td><td>${esc(item.quantity)}</td><td>${esc(item.rate)}</td><td>${esc(item.gst)}</td><td>${esc(item.taxPaidRate)}</td><td>${money(item.totalAmount)}</td></tr>`).join("");
  const win = window.open("", "_blank", "width=1100,height=850");
  if (!win) return;
  win.document.write(`<!doctype html><html><head><title>${esc(title)}</title><style>
    @page{size:A4 portrait;margin:14mm}body{font-family:Arial,sans-serif;color:#000;background:#fff;margin:0}.toolbar{text-align:right;padding:10px}.toolbar button{padding:8px 14px;margin-left:8px}.sheet{padding:18px}.header{text-align:center;border-bottom:1.5px solid #000;padding-bottom:10px;margin-bottom:12px;position:relative}.logo{position:absolute;left:8px;top:0;max-width:70px;max-height:70px}.inst{font-size:20px;font-weight:900}.title{font-size:17px;font-weight:900;text-decoration:underline;margin-top:8px}.meta{display:grid;grid-template-columns:repeat(3,1fr);border:1px solid #000;border-bottom:0;margin-bottom:12px}.cell{border-right:1px solid #000;border-bottom:1px solid #000;padding:7px;font-size:12px}.cell:nth-child(3n){border-right:0}.cell b{display:block}table{width:100%;border-collapse:collapse;font-size:11px}th,td{border:1px solid #000;padding:6px;text-align:left;vertical-align:top}th{background:#f1f5f9}.total{text-align:right;font-weight:900;margin-top:10px}.remarks{border:1px solid #000;min-height:50px;margin-top:12px;padding:8px}.sign{display:grid;grid-template-columns:repeat(4,1fr);gap:18px;margin-top:36px}.sign div{border-top:1px solid #000;text-align:center;padding-top:6px;font-size:12px}@media print{.toolbar{display:none}tr{break-inside:avoid}}
  </style></head><body><div class="toolbar"><button onclick="window.print()">Print</button><button onclick="window.close()">Close</button></div><div class="sheet"><div class="header">${logo ? `<img class="logo" src="${esc(logo)}" />` : ""}<div class="inst">${esc(instName)}</div><div>${esc(address)}</div><div>${esc(meta)}</div><div class="title">${esc(title)}</div></div><div class="meta"><div class="cell"><b>Code / No</b>${esc(header.approvalNo || header.imprestcode || header.code)}</div><div class="cell"><b>Date</b>${esc(reportDate(header.date || header.impdate || header.createdAt))}</div><div class="cell"><b>Status</b>${esc(header.status)}</div><div class="cell"><b>Subject</b>${esc(header.subject)}</div><div class="cell"><b>Supplier / Officer</b>${esc(header.supplierName || header.officername)}</div><div class="cell"><b>Requested By</b>${esc(header.name || header.requestedby || header.user)}</div></div>${items.length ? `<table><thead><tr><th>Sr</th><th>Code</th><th>Item</th><th>Make/Size</th><th>Unit</th><th>Qty</th><th>Rate</th><th>GST %</th><th>Tax Paid %</th><th>Total</th></tr></thead><tbody>${rows}</tbody></table>` : ""}<div class="total">Total Amount: ${money(total)}</div><div class="remarks"><b>Remarks / Approval comments</b><br/>${esc(header.remarks || header.approvalremarks || header.comments)}</div><div class="sign"><div>Prepared By</div><div>Checked By</div><div>Approved By</div><div>Accounts</div></div></div></body></html>`);
  win.document.close();
  win.focus();
};

function CashApprovalEditor({ reviewMode = false }) {
  const [vendors, setVendors] = useState([]);
  const [itemsMaster, setItemsMaster] = useState([]);
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ subject: "", supplierName: "", supplierid: "", status: "Pending", approvalNo: "", remarks: "" });
  const [itemDraft, setItemDraft] = useState({ item: "", itemcode: "", makeSize: "", unit: "", quantity: 1, rate: "", gst: "", taxPaidRate: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const editable = !reviewMode && text(form.status || "Pending").toLowerCase() === "pending";
  const load = async () => {
    try {
      const [vendorRows, itemRows, cashRows] = await Promise.all([getRows("vendords2"), getRows("itemmasterds2"), getRows("cashapprovalds2")]);
      setVendors(vendorRows);
      setItemsMaster(itemRows);
      setRows(reviewMode ? cashRows.filter((row) => text(row.status || "Pending").toLowerCase() === "pending") : cashRows.filter((row) => sameEmail(row.user, currentUser())));
    } catch (err) {
      setError(err.message || "Unable to load cash approval data");
    }
  };
  useEffect(() => { load(); }, [reviewMode]);
  const reset = () => {
    setSelected(null);
    setForm({ subject: "", supplierName: "", supplierid: "", status: "Pending", approvalNo: "", remarks: "" });
    setItemDraft({ item: "", itemcode: "", makeSize: "", unit: "", quantity: 1, rate: "", gst: "", taxPaidRate: "" });
  };
  const openRow = (row) => {
    setSelected(row);
    setForm({ subject: row.subject || "", supplierName: row.supplierName || "", supplierid: row.supplierid || "", status: row.status || "Pending", approvalNo: row.approvalNo || "", remarks: row.remarks || row.approvalremarks || "" });
  };
  const currentItems = Array.isArray(selected?.items) ? selected.items : [];
  const setCurrentItems = (nextItems) => setSelected((prev) => ({ ...(prev || {}), items: nextItems }));
  const addItem = () => {
    if (!itemDraft.item) {
      setError("Select item");
      return;
    }
    const line = { ...itemDraft, totalAmount: cashLineTotal(itemDraft), srNo: currentItems.length + 1 };
    setCurrentItems([...currentItems, line]);
    setItemDraft({ item: "", itemcode: "", makeSize: "", unit: "", quantity: 1, rate: "", gst: "", taxPaidRate: "" });
  };
  const save = async () => {
    try {
      if (reviewMode) throw new Error("Use approve/reject in review mode");
      const items = currentItems;
      if (!form.subject || !form.supplierName || !items.length) throw new Error("Subject, supplier and at least one item are required");
      if (!editable) throw new Error("Only pending requests can be edited");
      const approvalNo = form.approvalNo || humanCode("CA");
      const totalAmount = items.reduce((sum, item) => sum + num(item.totalAmount), 0);
      const payload = { ...form, id: selected?._id, approvalNo, date: selected?.date || today(), items, totalAmount, status: "Pending", remarks: form.remarks };
      const saved = await saveRow("cashapprovalds2", payload);
      setSelected(saved);
      setMessage("Cash approval request saved");
      await load();
    } catch (err) {
      setError(err.message || "Unable to save cash approval");
    }
  };
  const deleteRequest = async () => {
    try {
      if (!selected?._id) throw new Error("Select request");
      if (!editable) throw new Error("Only pending requests can be deleted");
      await ep1.post("/api/v2/purchase2/cashapprovalds2/delete", { id: selected._id, colid: global1.colid });
      setMessage("Cash approval request deleted");
      reset();
      await load();
    } catch (err) {
      setError(err.message || "Unable to delete");
    }
  };
  const approveReject = async (status) => {
    try {
      if (!selected?._id) throw new Error("Select request");
      const saved = await saveRow("cashapprovalds2", { ...selected, id: selected._id, status, approvalremarks: form.remarks, approvedBy: currentName(), approvedByEmail: currentUser(), approvedDate: today() });
      setSelected(saved);
      setMessage(`Request ${status}`);
      await load();
    } catch (err) {
      setError(err.message || "Unable to update status");
    }
  };
  return (
    <Page title={reviewMode ? "Cash Approval Review" : "Cash Approval"} subtitle={reviewMode ? "Approve, reject and print pending imprest/cash approval requests." : "Create cash approval requests with editable item rows while the request is pending."} message={message} error={error}>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={3}><TextField size="small" label="Subject" value={form.subject} onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))} fullWidth disabled={reviewMode || !editable} /></Grid>
          <Grid item xs={12} md={3}><Autocomplete options={vendors} value={vendors.find((v) => text(v.vendorname || v.name) === text(form.supplierName)) || null} getOptionLabel={(o) => o.vendorname || o.name || ""} onChange={(_, v) => setForm((p) => ({ ...p, supplierName: v?.vendorname || v?.name || "", supplierid: v?._id || "" }))} renderInput={(params) => <TextField {...params} label="Supplier" size="small" />} disabled={reviewMode || !editable} /></Grid>
          <Grid item xs={12} md={2}><TextField size="small" label="Approval No" value={form.approvalNo || "Auto"} fullWidth InputProps={{ readOnly: true }} /></Grid>
          <Grid item xs={12} md={2}><TextField size="small" label="Status" value={form.status || "Pending"} fullWidth InputProps={{ readOnly: true }} /></Grid>
          <Grid item xs={12} md={2}><TextField size="small" label="Remarks" value={form.remarks} onChange={(e) => setForm((p) => ({ ...p, remarks: e.target.value }))} fullWidth /></Grid>
        </Grid>
      </Paper>
      {!reviewMode && <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={3}><Autocomplete options={itemsMaster} filterOptions={filterItemOptions} getOptionLabel={itemLabel} value={itemsMaster.find((i) => text(i.itemname) === text(itemDraft.item)) || null} onChange={(_, v) => setItemDraft((p) => ({ ...p, item: v?.itemname || "", itemcode: v?.itemcode || "", unit: v?.unit || "" }))} renderInput={(params) => <TextField {...params} label="Item" size="small" />} disabled={!editable} /></Grid>
          <Grid item xs={12} md={2}><TextField size="small" label="Make/Size" value={itemDraft.makeSize} onChange={(e) => setItemDraft((p) => ({ ...p, makeSize: e.target.value }))} fullWidth disabled={!editable} /></Grid>
          <Grid item xs={6} md={1}><TextField size="small" label="Unit" value={itemDraft.unit} onChange={(e) => setItemDraft((p) => ({ ...p, unit: e.target.value }))} fullWidth disabled={!editable} /></Grid>
          <Grid item xs={6} md={1}><TextField size="small" type="number" label="Qty" value={itemDraft.quantity} onChange={(e) => setItemDraft((p) => ({ ...p, quantity: e.target.value }))} fullWidth disabled={!editable} /></Grid>
          <Grid item xs={6} md={1}><TextField size="small" type="number" label="Rate" value={itemDraft.rate} onChange={(e) => setItemDraft((p) => ({ ...p, rate: e.target.value }))} fullWidth disabled={!editable} /></Grid>
          <Grid item xs={6} md={1}><TextField size="small" type="number" label="GST %" value={itemDraft.gst} onChange={(e) => setItemDraft((p) => ({ ...p, gst: e.target.value }))} fullWidth disabled={!editable} /></Grid>
          <Grid item xs={6} md={1}><TextField size="small" type="number" label="Tax Paid %" value={itemDraft.taxPaidRate} onChange={(e) => setItemDraft((p) => ({ ...p, taxPaidRate: e.target.value }))} fullWidth disabled={!editable} /></Grid>
          <Grid item xs={12} md={2}><Button variant="contained" onClick={addItem} disabled={!editable}>Add item</Button></Grid>
        </Grid>
      </Paper>}
      <Paper sx={{ p: 2, mb: 2 }}>
        <DataGrid autoHeight rows={currentItems.map((item, index) => ({ ...item, id: index }))} processRowUpdate={(row) => { const next = currentItems.map((item, index) => index === row.id ? { ...item, ...row, totalAmount: cashLineTotal(row) } : item); setCurrentItems(next); return row; }} columns={[
          { field: "itemcode", headerName: "Code", width: 120 },
          { field: "item", headerName: "Item", flex: 1, minWidth: 180 },
          { field: "makeSize", headerName: "Make/Size", width: 140, editable },
          { field: "unit", headerName: "Unit", width: 90, editable },
          { field: "quantity", headerName: "Qty", width: 90, editable, type: "number" },
          { field: "rate", headerName: "Rate", width: 100, editable, type: "number" },
          { field: "gst", headerName: "GST", width: 90, editable, type: "number" },
          { field: "taxPaidRate", headerName: "Tax Paid", width: 110, editable, type: "number" },
          { field: "totalAmount", headerName: "Total", width: 120 },
          { field: "action", headerName: "Action", width: 110, renderCell: (params) => <Button color="error" size="small" disabled={!editable} onClick={() => setCurrentItems(currentItems.filter((_, index) => index !== params.row.id))}>Delete</Button> }
        ]} slots={{ toolbar: GridToolbar }} />
        <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: "wrap" }}>
          {!reviewMode && <Button startIcon={<Save />} variant="contained" onClick={save} disabled={!editable}>Save request</Button>}
          {!reviewMode && <Button color="error" variant="outlined" onClick={deleteRequest} disabled={!selected?._id || !editable}>Delete request</Button>}
          {reviewMode && <Button color="success" variant="contained" onClick={() => approveReject("Approved")} disabled={!selected?._id}>Approve</Button>}
          {reviewMode && <Button color="error" variant="outlined" onClick={() => approveReject("Rejected")} disabled={!selected?._id}>Reject</Button>}
          <Button startIcon={<Print />} variant="outlined" disabled={!selected?._id} onClick={() => printCashDocument("CASH APPROVAL", { ...selected, ...form }, currentItems)}>Print</Button>
          <Button variant="outlined" onClick={reset}>New</Button>
        </Stack>
      </Paper>
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" fontWeight={800}>{reviewMode ? "Pending requests" : "My cash approval requests"}</Typography>
        <DataGrid autoHeight rows={rows.map((row) => ({ ...row, id: row._id }))} columns={[
          { field: "approvalNo", headerName: "Approval No", width: 170 },
          { field: "subject", headerName: "Subject", flex: 1, minWidth: 180 },
          { field: "supplierName", headerName: "Supplier", width: 180 },
          { field: "totalAmount", headerName: "Amount", width: 120 },
          { field: "status", headerName: "Status", width: 120 },
          { field: "actions", headerName: "Open", width: 100, renderCell: (p) => <Button size="small" onClick={() => openRow(p.row)}>Open</Button> }
        ]} slots={{ toolbar: GridToolbar }} slotProps={{ toolbar: { showQuickFilter: true } }} />
      </Paper>
    </Page>
  );
}

export function Purchase2CashApprovalPage() {
  return <CashApprovalEditor />;
}

export function Purchase2CashApprovalReviewPage() {
  return <CashApprovalEditor reviewMode />;
}

function ImprestPanel() {
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ officername: "", amount: "", impdate: today(), status: "Pending", imprestcode: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const load = async () => {
    try {
      setRows(await getRows("pimprestds2"));
    } catch (err) {
      setError(err.message || "Unable to load imprest");
    }
  };
  useEffect(() => { load(); }, []);
  const open = (row) => {
    setSelected(row);
    setForm({ officername: row.officername || "", amount: row.amount || "", impdate: row.impdate ? String(row.impdate).slice(0, 10) : today(), status: row.status || "Pending", imprestcode: row.imprestcode || "" });
  };
  const reset = () => {
    setSelected(null);
    setForm({ officername: "", amount: "", impdate: today(), status: "Pending", imprestcode: "" });
  };
  const save = async () => {
    try {
      if (!form.officername || !form.amount || !form.impdate) throw new Error("Officer name, amount and date are required");
      const saved = await saveRow("pimprestds2", { ...form, id: selected?._id, imprestcode: form.imprestcode || humanCode("IMP") });
      setSelected(saved);
      setMessage("Imprest saved");
      await load();
    } catch (err) {
      setError(err.message || "Unable to save imprest");
    }
  };
  const remove = async () => {
    try {
      if (!selected?._id) throw new Error("Select imprest");
      await ep1.post("/api/v2/purchase2/pimprestds2/delete", { id: selected._id, colid: global1.colid });
      reset();
      setMessage("Imprest deleted");
      await load();
    } catch (err) {
      setError(err.message || "Unable to delete imprest");
    }
  };
  return (
    <Stack spacing={2}>
      {message && <Alert severity="success">{message}</Alert>}
      {error && <Alert severity="error">{error}</Alert>}
      <Paper sx={{ p: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={3}><TextField size="small" label="Officer Name" value={form.officername} onChange={(e) => setForm((p) => ({ ...p, officername: e.target.value }))} fullWidth /></Grid>
          <Grid item xs={12} md={2}><TextField size="small" type="number" label="Amount" value={form.amount} onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))} fullWidth /></Grid>
          <Grid item xs={12} md={2}><TextField size="small" type="date" label="Date" value={form.impdate} InputLabelProps={{ shrink: true }} onChange={(e) => setForm((p) => ({ ...p, impdate: e.target.value }))} fullWidth /></Grid>
          <Grid item xs={12} md={2}><TextField size="small" label="Imprest Code" value={form.imprestcode || "Auto"} fullWidth InputProps={{ readOnly: true }} /></Grid>
          <Grid item xs={12} md={3}><Stack direction="row" spacing={1} flexWrap="wrap"><Button variant="contained" onClick={save}>Save</Button><Button color="error" variant="outlined" disabled={!selected?._id} onClick={remove}>Delete</Button><Button startIcon={<Print />} variant="outlined" disabled={!selected?._id} onClick={() => printCashDocument("IMPREST", { ...selected, ...form }, [])}>Print</Button><Button variant="outlined" onClick={reset}>New</Button></Stack></Grid>
        </Grid>
      </Paper>
      <Paper sx={{ p: 2 }}>
        <DataGrid autoHeight rows={rows.map((row) => ({ ...row, id: row._id }))} columns={[
          { field: "imprestcode", headerName: "Imprest Code", width: 170 },
          { field: "officername", headerName: "Officer", flex: 1, minWidth: 180 },
          { field: "amount", headerName: "Amount", width: 120 },
          { field: "impdate", headerName: "Date", width: 140 },
          { field: "status", headerName: "Status", width: 120 },
          { field: "actions", headerName: "Open", width: 100, renderCell: (p) => <Button size="small" onClick={() => open(p.row)}>Open</Button> }
        ]} slots={{ toolbar: GridToolbar }} slotProps={{ toolbar: { showQuickFilter: true } }} />
      </Paper>
    </Stack>
  );
}

export function Purchase2PeWorkbenchPage() {
  const [mainTab, setMainTab] = useState("po");
  const [subTab, setSubTab] = useState("store");
  const [assignments, setAssignments] = useState([]);
  const [prs, setPrs] = useState([]);
  const [pos, setPos] = useState([]);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [selectedPo, setSelectedPo] = useState(null);
  const [poItems, setPoItems] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [vendor, setVendor] = useState(null);
  const [terms, setTerms] = useState("");
  const [warranty, setWarranty] = useState("");
  const [items, setItems] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const load = async () => {
    try {
      const [assignmentRows, prRows, poRows, vendorRows] = await Promise.all([getRows("storepoassignmentds2"), getRows("storeprrequestds2"), getRows("storepoorderds2"), getRows("vendorsds2")]);
      const email = text(currentUser()).toLowerCase();
      setAssignments(assignmentRows.filter((row) => sameEmail(row.assignedtoemail, email)));
      setPrs(prRows);
      setPos(poRows.filter((row) => sameEmail(row.creatorEmail || row.user, email)));
      setVendors(vendorRows);
    } catch (err) {
      setError(err.message || "Unable to load workbench");
    }
  };
  useEffect(() => { load(); }, []);
  const loadAssignmentItems = async (assignment) => {
    setSelectedAssignment(assignment);
    const prItems = assignment?.prnumber ? await getRows("storeprrequestitemsds2", [{ field: "prnumber", value: assignment.prnumber }]) : [];
    setItems(prItems);
  };
  const createPo = async (empty = false) => {
    try {
      if (!vendor) throw new Error("Select vendor");
      const sourceItems = empty ? items : (items.length ? items : await getRows("storeprrequestitemsds2", [{ field: "prnumber", value: selectedAssignment?.prnumber }]));
      if (!sourceItems.length) throw new Error("Add items or select a PR with items");
      const poid = humanCode("PO");
      const priced = sourceItems.map((item) => ({ ...item, vendor: vendor.vendorname, vendorid: vendor._id, price: item.price || item.estimatedprice || item.rate || 0, total: calcLineTotal({ ...item, price: item.price || item.estimatedprice || item.rate || 0 }) }));
      const total = priced.reduce((sum, item) => sum + num(item.total), 0);
      const sig = await getUserSignature();
      const header = await saveRow("storepoorderds2", { poid, prnumber: empty ? "" : selectedAssignment?.prnumber, vendor: vendor.vendorname, vendorid: vendor._id, price: total, netprice: total, actualAmount: total, poType: empty ? "Empty" : "Standard", postatus: "Draft", approvalStatus: "Draft", creatorName: currentName(), creatorEmail: currentUser(), creatorSignature: sig.signaturelink || "", terms, warranty, createdtime: nowTime() });
      await Promise.all(priced.map((item) => saveRow("storepoitemsds2", { ...item, poid, postatus: "Draft" })));
      if (selectedAssignment && !empty) await updateRow("storepoassignmentds2", selectedAssignment, { status: "PO Created", poid });
      sendPurchase2Notification("PO Generated", { poid, prnumber: empty ? "" : selectedAssignment?.prnumber, amount: total, status: "Draft" });
      setSelectedPo(header);
      setPoItems(priced);
      setMessage(`PO ${poid} created`);
      await load();
    } catch (err) {
      setError(err.message || "Unable to create PO");
    }
  };
  const openPo = async (po) => {
    setSelectedPo(po);
    setTerms(po.terms || "");
    setWarranty(po.warranty || "");
    setPoItems(await getRows("storepoitemsds2", [{ field: "poid", value: po.poid }]));
  };
  const submitPo = async () => {
    try {
      if (!selectedPo?._id) throw new Error("Open a PO");
      const updated = await updateRow("storepoorderds2", selectedPo, { postatus: "Submitted", approvalStatus: "Pending", terms, warranty, submittedtime: nowTime() });
      setSelectedPo(updated);
      setMessage("PO submitted");
      await load();
    } catch (err) {
      setError(err.message || "Unable to submit PO");
    }
  };
  return (
    <Page title="PE Workbench" subtitle="Unified purchase executive workbench for PO workflow and imprest management." message={message} error={error}>
      <Paper sx={{ p: 2 }}>
        <Tabs value={mainTab} onChange={(_, v) => setMainTab(v)}><Tab value="po" label="PO Workflow" /><Tab value="imprest" label="Imprest Management" /></Tabs>
        {mainTab === "po" && <Box sx={{ mt: 2 }}>
          <Tabs value={subTab} onChange={(_, v) => setSubTab(v)}><Tab value="store" label="Store Requests" /><Tab value="create" label="Create PO" /><Tab value="manage" label="Manage PO" /></Tabs>
          {subTab === "store" && <DataGrid sx={{ mt: 2 }} autoHeight rows={assignments.map((row) => ({ ...row, id: row._id }))} columns={[{ field: "prnumber", headerName: "PR", width: 170 }, { field: "assigneddate", headerName: "Assigned Date", width: 150 }, { field: "assignedby", headerName: "Assigned By", width: 180 }, { field: "status", headerName: "Status", width: 130 }, { field: "remarks", headerName: "Remarks", flex: 1 }, { field: "actions", headerName: "Select", width: 110, renderCell: (p) => <Button size="small" onClick={() => { loadAssignmentItems(p.row); setSubTab("create"); }}>Create PO</Button> }]} slots={{ toolbar: GridToolbar }} />}
          {subTab === "create" && <Box sx={{ mt: 2 }}><Grid container spacing={2}><Grid item xs={12} md={4}><Autocomplete options={assignments} value={selectedAssignment} onChange={(_, v) => loadAssignmentItems(v)} getOptionLabel={(o) => `${o.prnumber || ""} - ${o.status || ""}`} renderInput={(params) => <TextField {...params} label="Select assigned PR, optional" size="small" />} /></Grid><Grid item xs={12} md={4}><Autocomplete options={vendors} value={vendor} onChange={(_, v) => setVendor(v)} getOptionLabel={(o) => o.vendorname || o.name || ""} renderInput={(params) => <TextField {...params} label="Vendor" size="small" />} /></Grid><Grid item xs={12} md={4}><Stack direction="row" spacing={1}><Button variant="contained" onClick={() => createPo(false)}>Create PO from PR</Button><Button variant="outlined" onClick={() => createPo(true)}>Create Empty PO</Button></Stack></Grid><Grid item xs={12} md={6}><TextField label="Terms" value={terms} onChange={(e) => setTerms(e.target.value)} multiline minRows={3} fullWidth /></Grid><Grid item xs={12} md={6}><TextField label="Warranty" value={warranty} onChange={(e) => setWarranty(e.target.value)} multiline minRows={3} fullWidth /></Grid></Grid><Box sx={{ mt: 2 }}><ItemsEditor items={items} setItems={setItems} showMake showPrice showUnit /></Box></Box>}
          {subTab === "manage" && <Box sx={{ mt: 2 }}><Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 2 }}><Button startIcon={<Refresh />} onClick={load}>Refresh</Button><Button variant="contained" disabled={!selectedPo?._id || text(selectedPo.postatus).toLowerCase() !== "draft"} onClick={submitPo}>Submit PO</Button><Button startIcon={<Print />} variant="outlined" disabled={!selectedPo?._id} onClick={() => printPurchase2(selectedPo.poType === "Local" ? "localPo" : "po", { header: { ...selectedPo, terms, warranty }, items: poItems })}>Print PO</Button></Stack><Grid container spacing={2}><Grid item xs={12} md={6}><TextField label="Terms" value={terms} onChange={(e) => setTerms(e.target.value)} multiline minRows={3} fullWidth /></Grid><Grid item xs={12} md={6}><TextField label="Warranty" value={warranty} onChange={(e) => setWarranty(e.target.value)} multiline minRows={3} fullWidth /></Grid></Grid><DataGrid sx={{ mt: 2 }} autoHeight rows={pos.map((row) => ({ ...row, id: row._id }))} columns={[{ field: "poid", headerName: "PO", width: 170 }, { field: "prnumber", headerName: "PR", width: 160 }, { field: "vendor", headerName: "Vendor", flex: 1 }, { field: "postatus", headerName: "PO Status", width: 140 }, { field: "approvalStatus", headerName: "Approval", width: 140 }, { field: "actualAmount", headerName: "Amount", width: 120 }, { field: "actions", headerName: "Open", width: 100, renderCell: (p) => <Button size="small" onClick={() => openPo(p.row)}>Open</Button> }]} slots={{ toolbar: GridToolbar }} />{selectedPo && <DataGrid sx={{ mt: 2 }} autoHeight rows={poItems.map((row, index) => ({ ...row, id: index }))} columns={[{ field: "itemname", headerName: "Item", flex: 1 }, { field: "make", headerName: "Make", width: 150 }, { field: "quantity", headerName: "Qty", width: 100 }, { field: "price", headerName: "Rate", width: 100 }, { field: "total", headerName: "Total", width: 120 }]} />}</Box>}
        </Box>}
        {mainTab === "imprest" && <Box sx={{ mt: 2 }}><ImprestPanel /></Box>}
      </Paper>
    </Page>
  );
}

const reportDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return text(value) || "-";
  return date.toLocaleDateString("en-IN");
};
const reportDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return text(value) || "-";
  return date.toLocaleString("en-IN");
};
const money = (value) => Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const printPoDetailReport = async ({ po = {}, poItems = [], pr = {}, prItems = [], approvals = [], stockRows = [], summary = {} }) => {
  const institution = await loadPrintInstitution();
  const logo = institution.logo || institution.logolink || institution.logoUrl || institution.logourl || "";
  const instName = institution.institutionname || institution.institution || institution.nameofinstitution || institution.name || global1.insname || "Institution";
  const address = institution.address || institution.institutionaddress || institution.address1 || "";
  const meta = [institution.phone || institution.mobile || institution.contact, institution.email || institution.emailid, institution.website].filter(Boolean).join(" | ");
  const rows = (poItems || []).map((item, index) => {
    const stock = stockRows.find((s) => text(s.itemcode).toLowerCase() === text(item.itemcode).toLowerCase() || text(s.itemid) === text(item.itemid)) || {};
    return `<tr><td>${index + 1}</td><td>${esc(item.itemcode)}</td><td>${esc(item.itemname)}</td><td>${esc(item.make)}</td><td>${esc(item.unit)}</td><td>${esc(item.quantity)}</td><td>${esc(item.price)}</td><td>${esc(item.gst)}</td><td>${esc(item.total)}</td><td>${esc(stock.storename || stock.store)}</td><td>${esc(stock.quantity)}</td><td>${esc(item.comments || item.remarks)}</td></tr>`;
  }).join("");
  const prRows = (prItems || []).map((item, index) => `<tr><td>${index + 1}</td><td>${esc(item.itemcode)}</td><td>${esc(item.itemname)}</td><td>${esc(item.quantity)}</td><td>${esc(item.estimatedprice)}</td><td>${esc(item.estimatedtotal)}</td><td>${esc(item.remarks)}</td></tr>`).join("");
  const approvalRows = (approvals || []).map((row, index) => `<tr><td>${index + 1}</td><td>${esc(row.level)}</td><td>${esc(row.approvername)}</td><td>${esc(row.approveremail)}</td><td>${esc(row.status)}</td><td>${esc(reportDateTime(row.approvaldate || row.createdAt))}</td><td>${esc(row.remarks)}</td></tr>`).join("");
  const win = window.open("", "_blank", "width=1200,height=850");
  if (!win) return;
  win.document.write(`<!doctype html><html><head><title>Purchase 2 PO Report</title><style>
    @page{size:A4 portrait;margin:12mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#000;background:#f3f4f6;margin:0}.toolbar{max-width:1120px;margin:12px auto;text-align:right}.toolbar button{border:1px solid #111;background:#fff;color:#000;padding:8px 14px;border-radius:4px;font-weight:700}.sheet{width:210mm;min-height:297mm;background:#fff;margin:0 auto 18px;padding:13mm;box-shadow:0 8px 24px rgba(0,0,0,.12)}.header{text-align:center;border:1.5px solid #000;padding:10px;position:relative}.logo{position:absolute;left:12px;top:8px;width:62px;height:62px;object-fit:contain}.inst{font-size:20px;font-weight:900}.title{font-size:17px;font-weight:900;text-decoration:underline;margin-top:8px}.grid{display:grid;grid-template-columns:repeat(4,1fr);border:1px solid #000;border-bottom:0;margin:10px 0}.cell{border-right:1px solid #000;border-bottom:1px solid #000;padding:6px;font-size:11px;min-height:38px}.cell:nth-child(4n){border-right:0}.cell span{display:block;font-weight:800}.cards{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:10px 0}.card{border:1px solid #000;padding:8px;font-size:11px}.card strong{display:block;font-size:16px;margin-top:3px}h3{font-size:14px;margin:14px 0 6px}table{width:100%;border-collapse:collapse;table-layout:fixed}th,td{border:1px solid #000;padding:5px;font-size:10.5px;vertical-align:top;overflow-wrap:anywhere}th{font-weight:900;background:#fff}.remarks{border:1px solid #000;min-height:42px;margin-top:10px;padding:8px;font-size:11px}.sign{display:grid;grid-template-columns:repeat(4,1fr);gap:18px;margin-top:28px}.sign div{border-top:1px solid #000;padding-top:6px;text-align:center;font-size:11px}@media print{body{background:#fff}.toolbar{display:none}.sheet{box-shadow:none;margin:0;width:auto;min-height:auto;padding:0}tr{break-inside:avoid}thead{display:table-header-group}}
  </style></head><body><div class="toolbar"><button onclick="window.print()">Print</button><button onclick="window.close()">Close</button></div><main class="sheet">
    <div class="header">${logo ? `<img class="logo" src="${esc(logo)}" />` : ""}<div class="inst">${esc(instName)}</div><div>${esc(address)}</div><div>${esc(meta)}</div><div class="title">PURCHASE ORDER DETAIL REPORT</div></div>
    <div class="cards"><div class="card">PO Amount<strong>${money(summary.totalAmount)}</strong></div><div class="card">Items<strong>${summary.totalItems || 0}</strong></div><div class="card">Approved Stock<strong>${summary.availableItems || 0}</strong></div><div class="card">Short Stock<strong>${summary.shortItems || 0}</strong></div></div>
    <div class="grid">
      <div class="cell"><span>PO No</span>${esc(po.poid)}</div><div class="cell"><span>PO Date/Raised</span>${esc(reportDateTime(po.createdAt || po.updatedate))}</div><div class="cell"><span>Status</span>${esc(po.postatus || po.approvalStatus)}</div><div class="cell"><span>Vendor</span>${esc(po.vendor)}</div>
      <div class="cell"><span>PR No</span>${esc(po.prnumber || pr.prnumber)}</div><div class="cell"><span>PR Raised</span>${esc(reportDateTime(pr.createdAt || pr.requestdate || pr.reqdate))}</div><div class="cell"><span>PR Raised By</span>${esc(pr.requestedby || pr.name)}</div><div class="cell"><span>PR User</span>${esc(pr.requestedbyemail || pr.user)}</div>
      <div class="cell"><span>Store</span>${esc(po.storename || pr.storename)}</div><div class="cell"><span>Department</span>${esc(pr.departmentname || po.departmentname)}</div><div class="cell"><span>Approved On</span>${esc(reportDateTime((approvals || []).slice(-1)[0]?.approvaldate || po.updatedAt))}</div><div class="cell"><span>Generated By</span>${esc(currentName())}</div>
    </div>
    <h3>PO Items And Stock Status</h3><table><thead><tr><th>Sr</th><th>Code</th><th>Item</th><th>Make</th><th>Unit</th><th>PO Qty</th><th>Rate</th><th>GST</th><th>Total</th><th>Store</th><th>Stock</th><th>Remarks</th></tr></thead><tbody>${rows || `<tr><td colspan="12">No items available</td></tr>`}</tbody></table>
    <h3>Associated PR Details</h3><table><thead><tr><th>Sr</th><th>Code</th><th>Item</th><th>Qty</th><th>Approx Rate</th><th>Approx Total</th><th>Remarks</th></tr></thead><tbody>${prRows || `<tr><td colspan="7">No PR item details available</td></tr>`}</tbody></table>
    <h3>Approval Details</h3><table><thead><tr><th>Sr</th><th>Level</th><th>Approver</th><th>Email</th><th>Status</th><th>Date</th><th>Remarks</th></tr></thead><tbody>${approvalRows || `<tr><td colspan="7">No approval records available</td></tr>`}</tbody></table>
    <div class="remarks"><strong>Terms:</strong><br />${esc(po.terms)}<br /><br /><strong>Warranty:</strong><br />${esc(po.warranty)}</div>
    <div class="sign"><div>Prepared By</div><div>Checked By</div><div>Approved By</div><div>Store In-charge</div></div>
  </main></body></html>`);
  win.document.close();
  win.focus();
};

export function Purchase2PoDetailReportPage() {
  const [rows, setRows] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [filters, setFilters] = useState([]);
  const [draft, setDraft] = useState({ field: "poid", value: "" });
  const [dateRange, setDateRange] = useState({ from: "", to: "" });
  const [selectedPo, setSelectedPo] = useState(null);
  const [poItems, setPoItems] = useState([]);
  const [pr, setPr] = useState({});
  const [prItems, setPrItems] = useState([]);
  const [approvals, setApprovals] = useState([]);
  const [stockRows, setStockRows] = useState([]);
  const [error, setError] = useState("");
  const fields = ["poid", "prnumber", "vendor", "postatus", "approvalStatus", "poType", "storename", "year", "creatorName", "creatorEmail"];
  const load = async () => {
    try {
      const poRows = await getRows("storepoorderds2");
      setRows(poRows);
      setFiltered(poRows);
    } catch (err) {
      setError(err.message || "Unable to load PO records");
    }
  };
  useEffect(() => { load(); }, []);
  const applyFilters = () => {
    const from = dateRange.from ? new Date(dateRange.from) : null;
    const to = dateRange.to ? new Date(`${dateRange.to}T23:59:59`) : null;
    setFiltered(rows.filter((row) => {
      const rowDate = new Date(row.createdAt || row.updatedate || row.reqdate || row.updatedAt || 0);
      const inDate = (!from || rowDate >= from) && (!to || rowDate <= to);
      const inFilters = filters.every((filter) => text(row[filter.field]).toLowerCase().includes(text(filter.value).toLowerCase()));
      return inDate && inFilters;
    }));
  };
  useEffect(() => { applyFilters(); }, [rows]);
  const openPo = async (po) => {
    setSelectedPo(po);
    if (!po) {
      setPoItems([]);
      setPr({});
      setPrItems([]);
      setApprovals([]);
      setStockRows([]);
      return;
    }
    const [items, prRows, approvalRows, stock] = await Promise.all([
      getRows("storepoitemsds2", [{ field: "poid", value: po.poid }]),
      po.prnumber ? getRows("storeprrequestds2", [{ field: "prnumber", value: po.prnumber }]) : Promise.resolve([]),
      getRows("storepoapprovalds2", [{ field: "poid", value: po.poid }]),
      getRows("storeitemsds2")
    ]);
    const prHeader = prRows[0] || {};
    const childPrItems = po.prnumber ? await getRows("storeprrequestitemsds2", [{ field: "prnumber", value: po.prnumber }]) : [];
    setPoItems(items);
    setPr(prHeader);
    setPrItems(childPrItems);
    setApprovals(approvalRows);
    setStockRows(stock.filter((stockRow) => items.some((item) => text(stockRow.itemcode).toLowerCase() === text(item.itemcode).toLowerCase() || text(stockRow.itemid) === text(item.itemid))));
  };
  const summary = useMemo(() => {
    const totalAmount = poItems.reduce((sum, item) => sum + num(item.total || (num(item.price) * num(item.quantity))), 0);
    const shortItems = poItems.filter((item) => {
      const stock = stockRows.find((s) => text(s.itemcode).toLowerCase() === text(item.itemcode).toLowerCase() || text(s.itemid) === text(item.itemid));
      return num(stock?.quantity) < num(item.quantity);
    }).length;
    return { totalAmount, totalItems: poItems.length, availableItems: poItems.length - shortItems, shortItems, approvals: approvals.length };
  }, [poItems, stockRows, approvals]);
  const stockChart = poItems.map((item) => {
    const stock = stockRows.find((s) => text(s.itemcode).toLowerCase() === text(item.itemcode).toLowerCase() || text(s.itemid) === text(item.itemid)) || {};
    return { name: item.itemcode || item.itemname || "Item", po: num(item.quantity), stock: num(stock.quantity) };
  });
  const statusChart = [
    { name: "Available", value: summary.availableItems },
    { name: "Short", value: summary.shortItems }
  ];
  const valueOptions = Array.from(new Set(rows.map((row) => text(row[draft.field])).filter(Boolean))).sort();
  const addFilter = () => {
    if (!draft.field || !draft.value) return;
    setFilters((prev) => [...prev, draft]);
    setDraft((prev) => ({ ...prev, value: "" }));
  };
  return (
    <Page title="Purchase 2 PO Detail Report" subtitle="Search any PO, view its PR, approval, store and stock details, and print the complete report." error={error}>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={2}><TextField size="small" type="date" label="From date" value={dateRange.from} InputLabelProps={{ shrink: true }} onChange={(e) => setDateRange((p) => ({ ...p, from: e.target.value }))} fullWidth /></Grid>
          <Grid item xs={12} md={2}><TextField size="small" type="date" label="To date" value={dateRange.to} InputLabelProps={{ shrink: true }} onChange={(e) => setDateRange((p) => ({ ...p, to: e.target.value }))} fullWidth /></Grid>
          <Grid item xs={12} md={2}><Autocomplete options={fields} value={draft.field} onChange={(_, value) => setDraft({ field: value || "poid", value: "" })} renderInput={(params) => <TextField {...params} label="Filter field" size="small" />} /></Grid>
          <Grid item xs={12} md={3}><Autocomplete freeSolo options={valueOptions} value={draft.value} onInputChange={(_, value) => setDraft((p) => ({ ...p, value }))} renderInput={(params) => <TextField {...params} label="Filter value" size="small" />} /></Grid>
          <Grid item xs={12} md={3}><Stack direction="row" spacing={1}><Button variant="outlined" onClick={addFilter}>Add filter</Button><Button variant="contained" onClick={applyFilters}>Apply</Button><Button onClick={() => { setFilters([]); setDateRange({ from: "", to: "" }); setFiltered(rows); }}>Clear</Button></Stack></Grid>
        </Grid>
        {!!filters.length && <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Filters: {filters.map((f) => `${f.field}: ${f.value}`).join(", ")}</Typography>}
      </Paper>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" fontWeight={800}>PO list</Typography>
        <DataGrid autoHeight rows={filtered.map((row) => ({ ...row, id: row._id }))} columns={[
          { field: "poid", headerName: "PO No", width: 160 },
          { field: "createdAt", headerName: "Raised", width: 170, valueGetter: (params) => reportDate(params.row.createdAt || params.row.updatedate) },
          { field: "prnumber", headerName: "PR No", width: 150 },
          { field: "vendor", headerName: "Vendor", flex: 1, minWidth: 180 },
          { field: "postatus", headerName: "PO Status", width: 130 },
          { field: "approvalStatus", headerName: "Approval", width: 130 },
          { field: "actualAmount", headerName: "Amount", width: 130 },
          { field: "actions", headerName: "Select", width: 110, renderCell: (params) => <Button size="small" variant="contained" onClick={() => openPo(params.row)}>Select</Button> }
        ]} slots={{ toolbar: GridToolbar }} slotProps={{ toolbar: { showQuickFilter: true } }} />
      </Paper>
      {selectedPo && <>
        <Grid container spacing={2} sx={{ mb: 2 }}>
          {[["PO Amount", money(summary.totalAmount)], ["PO Items", summary.totalItems], ["Stock Available", summary.availableItems], ["Stock Short", summary.shortItems], ["Approvals", summary.approvals]].map(([label, value]) => (
            <Grid item xs={12} sm={6} md={2.4} key={label}><Paper sx={{ p: 2, borderRadius: 2, height: "100%" }}><Typography variant="body2" color="text.secondary">{label}</Typography><Typography variant="h5" fontWeight={900}>{value}</Typography></Paper></Grid>
          ))}
        </Grid>
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} md={8}><Paper sx={{ p: 2, height: 320 }}><Typography variant="h6">PO quantity vs stock</Typography><ResponsiveContainer width="100%" height="85%"><BarChart data={stockChart}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Legend /><Bar dataKey="po" name="PO Qty" fill="#2563eb" /><Bar dataKey="stock" name="Store Stock" fill="#16a34a" /></BarChart></ResponsiveContainer></Paper></Grid>
          <Grid item xs={12} md={4}><Paper sx={{ p: 2, height: 320 }}><Typography variant="h6">Stock status</Typography><ResponsiveContainer width="100%" height="85%"><PieChart><Pie data={statusChart} dataKey="value" nameKey="name" outerRadius={92} label>{statusChart.map((entry, index) => <Cell key={entry.name} fill={index === 0 ? "#16a34a" : "#dc2626"} />)}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer></Paper></Grid>
        </Grid>
        <Paper sx={{ p: 2, mb: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}><Typography variant="h6" fontWeight={800}>Selected PO: {selectedPo.poid}</Typography><Button startIcon={<Print />} variant="contained" onClick={() => printPoDetailReport({ po: selectedPo, poItems, pr, prItems, approvals, stockRows, summary })}>Print preview</Button></Stack>
          <Grid container spacing={2}>
            {[
              ["Raised", reportDateTime(selectedPo.createdAt || selectedPo.updatedate)],
              ["Vendor", selectedPo.vendor],
              ["PO Status", selectedPo.postatus],
              ["Approval Status", selectedPo.approvalStatus],
              ["PR No", selectedPo.prnumber || pr.prnumber],
              ["PR Raised By", pr.requestedby || pr.name],
              ["PR Raised Date", reportDateTime(pr.createdAt || pr.requestdate || pr.reqdate)],
              ["Store", selectedPo.storename || pr.storename],
              ["Department", pr.departmentname || selectedPo.departmentname],
              ["Terms", selectedPo.terms],
              ["Warranty", selectedPo.warranty]
            ].map(([label, value]) => <Grid item xs={12} md={3} key={label}><Typography variant="caption" color="text.secondary">{label}</Typography><Typography fontWeight={700}>{value || "-"}</Typography></Grid>)}
          </Grid>
        </Paper>
        <Paper sx={{ p: 2, mb: 2 }}><Typography variant="h6">PO items with store stock</Typography><DataGrid autoHeight rows={poItems.map((item, index) => { const stock = stockRows.find((s) => text(s.itemcode).toLowerCase() === text(item.itemcode).toLowerCase() || text(s.itemid) === text(item.itemid)) || {}; return { ...item, id: item._id || index, stockstore: stock.storename || stock.store || "-", stockquantity: stock.quantity ?? 0, stockstatus: num(stock.quantity) >= num(item.quantity) ? "Available" : "Short" }; })} columns={[{ field: "itemcode", headerName: "Code", width: 130 }, { field: "itemname", headerName: "Item", flex: 1, minWidth: 220 }, { field: "make", headerName: "Make", width: 130 }, { field: "unit", headerName: "Unit", width: 90 }, { field: "quantity", headerName: "PO Qty", width: 110 }, { field: "price", headerName: "Rate", width: 110 }, { field: "total", headerName: "Total", width: 120 }, { field: "stockstore", headerName: "Stock Store", width: 160 }, { field: "stockquantity", headerName: "Stock Qty", width: 120 }, { field: "stockstatus", headerName: "Stock Status", width: 130 }]} slots={{ toolbar: GridToolbar }} /></Paper>
        <Paper sx={{ p: 2, mb: 2 }}><Typography variant="h6">Associated PR items</Typography><DataGrid autoHeight rows={prItems.map((item, index) => ({ ...item, id: item._id || index }))} columns={[{ field: "itemcode", headerName: "Code", width: 130 }, { field: "itemname", headerName: "Item", flex: 1 }, { field: "quantity", headerName: "Qty", width: 100 }, { field: "estimatedprice", headerName: "Approx Rate", width: 130 }, { field: "estimatedtotal", headerName: "Approx Total", width: 140 }, { field: "remarks", headerName: "Remarks", flex: 1 }]} slots={{ toolbar: GridToolbar }} /></Paper>
        <Paper sx={{ p: 2 }}><Typography variant="h6">Approval details</Typography><DataGrid autoHeight rows={approvals.map((row, index) => ({ ...row, id: row._id || index }))} columns={[{ field: "level", headerName: "Level", width: 100 }, { field: "approvername", headerName: "Approver", flex: 1 }, { field: "approveremail", headerName: "Email", flex: 1 }, { field: "status", headerName: "Status", width: 130 }, { field: "approvaldate", headerName: "Approval Date", width: 150, valueGetter: (params) => reportDate(params.row.approvaldate || params.row.createdAt) }, { field: "remarks", headerName: "Remarks", flex: 1 }]} slots={{ toolbar: GridToolbar }} /></Paper>
      </>}
    </Page>
  );
}

export function UserSignatureUploadPage() {
  const [rows, setRows] = useState([]);
  const [configs, setConfigs] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [awsconfigid, setAwsconfigid] = useState("");
  const [file, setFile] = useState(null);
  const [signaturelink, setSignaturelink] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const load = async () => {
    const [signatureRows, configRes, userRows] = await Promise.all([getRows("usersignatureds"), ep1.get("/api/v2/aws-file-library/configs", { params: { colid: global1.colid } }), loadUsers()]);
    setRows(signatureRows);
    setConfigs(configRes.data || []);
    setUsers(userRows.filter((user) => text(user.role).toLowerCase() !== "student"));
  };
  useEffect(() => { load(); }, []);
  const upload = async () => {
    try {
      let link = signaturelink;
      if (file) {
        if (!awsconfigid) throw new Error("Select AWS configuration");
        const data = new FormData();
        data.append("file", file);
        data.append("colid", global1.colid);
        data.append("user", global1.user || "");
        data.append("awsconfigid", awsconfigid);
        data.append("folder", "signatures");
        data.append("description", "User signature");
        const res = await ep1.post("/api/v2/aws-file-library/upload", data, { headers: { "Content-Type": "multipart/form-data" } });
        link = res.data?.url || link;
      }
      if (!selectedUser?.email && !selectedUser?.user) throw new Error("Select user");
      if (!link) throw new Error("Upload signature or paste signature link");
      await saveRow("usersignatureds", { username: selectedUser.name || "", useremail: selectedUser.email || selectedUser.user || "", signaturelink: link, status: "Active" });
      setMessage("Signature saved");
      setFile(null);
      setSignaturelink("");
      setSelectedUser(null);
      await load();
    } catch (err) { setError(err.message || "Unable to save signature"); }
  };
  return <Page title="User Signature Upload" subtitle="Upload user signatures through AWS and use them in Purchase 2 print documents." message={message} error={error}><Paper sx={{ p: 2, mb: 2 }}><Grid container spacing={2}><Grid item xs={12} md={4}><Autocomplete options={users} value={selectedUser} onChange={(_, v) => setSelectedUser(v)} getOptionLabel={(o) => `${o.name || ""} ${o.email || o.user || ""}`} renderInput={(params) => <TextField {...params} label="User" size="small" />} /></Grid><Grid item xs={12} md={3}><TextField select size="small" label="AWS config" value={awsconfigid} onChange={(e) => setAwsconfigid(e.target.value)} fullWidth><MenuItem value="">Select</MenuItem>{configs.map((cfg) => <MenuItem key={cfg._id} value={cfg._id}>{cfg.name || cfg.configname || cfg.bucket}</MenuItem>)}</TextField></Grid><Grid item xs={12} md={3}><Button component="label" startIcon={<UploadFile />} variant="outlined" fullWidth>{file?.name || "Upload signature"}<input type="file" accept="image/*" hidden onChange={(e) => setFile(e.target.files?.[0] || null)} /></Button></Grid><Grid item xs={12} md={2}><Button fullWidth variant="contained" onClick={upload}>Save</Button></Grid><Grid item xs={12}><TextField size="small" label="Or paste signature link" value={signaturelink} onChange={(e) => setSignaturelink(e.target.value)} fullWidth /></Grid></Grid></Paper><DataGrid autoHeight rows={rows.map((r) => ({ ...r, id: r._id }))} columns={[{ field: "username", headerName: "Name", flex: 1 }, { field: "useremail", headerName: "Email", flex: 1 }, { field: "signaturelink", headerName: "Signature Link", flex: 1, renderCell: (p) => p.value ? <a href={p.value} target="_blank" rel="noreferrer">View</a> : "-" }, { field: "status", headerName: "Status", width: 120 }]} slots={{ toolbar: GridToolbar }} /></Page>;
}

export function Purchase2GatePassPage() {
  const [sources, setSources] = useState([]);
  const [selected, setSelected] = useState(null);
  const [items, setItems] = useState([]);
  const [direction, setDirection] = useState("Inward");
  const [sourceType, setSourceType] = useState("PO");
  const [form, setForm] = useState({ receiveddate: today(), vehicleno: "", drivername: "", drivercontact: "", invoiceno: "", remarks: "", remarktype: "Non countable" });
  const [attachment, setAttachment] = useState(null);
  const [printData, setPrintData] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const sourceOptions = direction === "Inward" ? ["PO", "LPO"] : ["Internal Movement", "Returnable Goods", "Non returnable Goods"];
  const loadSources = async () => {
    try {
      setError("");
      setSelected(null);
      setItems([]);
      setPrintData(null);
      if (direction === "Inward") {
        const rows = await getRows("storepoorderds2");
        const approved = rows.filter((po) => ["approved", "delivery scheduled"].includes(text(po.approvalStatus).toLowerCase()) || ["approved", "delivery scheduled"].includes(text(po.postatus).toLowerCase()));
        setSources(approved.filter((po) => sourceType === "LPO" ? text(po.poType).toLowerCase() === "local" : text(po.poType).toLowerCase() !== "local"));
      } else if (sourceType === "Internal Movement") {
        const rows = await getRows("storepoorderds2");
        setSources(rows.filter((po) => ["approved", "delivery scheduled"].includes(text(po.approvalStatus).toLowerCase()) || ["approved", "delivery scheduled"].includes(text(po.postatus).toLowerCase())));
      } else {
        const rows = await getRows("storequalitycheckds2");
        const returnType = sourceType === "Returnable Goods" ? "Returnable" : "Non Returnable";
        setSources(rows.filter((qc) => text(qc.returncategory).toLowerCase() === returnType.toLowerCase() && num(qc.returnedquantity || qc.totalreturnedquantity || qc.rejectedquantity || qc.totalrejectedquantity) > 0));
      }
    } catch (err) {
      setError(err.message || "Unable to load source documents");
    }
  };
  useEffect(() => { loadSources(); }, [direction, sourceType]);
  const open = async (source) => {
    setSelected(source);
    setPrintData(null);
    if (!source) {
      setItems([]);
      return;
    }
    if (direction === "Outward" && sourceType !== "Internal Movement") {
      const qcItems = await getRows("storequalitycheckitemsds2", [{ field: "qcno", value: source.qcno }]);
      setItems(qcItems.filter((item) => num(item.returnedquantity || item.rejectedquantity) > 0).map((item) => ({
        ...item,
        orderedquantity: item.orderedquantity || item.quantity || item.receivedquantity,
        receivedquantity: item.returnedquantity || item.rejectedquantity,
        gatepassquantity: item.returnedquantity || item.rejectedquantity
      })));
      return;
    }
    const poItems = await getRows("storepoitemsds2", [{ field: "poid", value: source.poid }]);
    setItems(poItems.map((item) => ({
      ...item,
      orderedquantity: item.quantity,
      receivedquantity: form.remarktype === "Countable" ? "" : item.quantity,
      gatepassquantity: form.remarktype === "Countable" ? "" : item.quantity
    })));
  };
  const documentLabel = (row = {}) => {
    if (direction === "Outward" && sourceType !== "Internal Movement") return `${row.qcno || ""} - ${row.poid || ""} - ${row.vendorname || ""}`;
    return `${row.poid || ""} - ${row.vendor || row.vendorname || ""}`;
  };
  const save = async () => {
    try {
      if (!selected) throw new Error("Select a source document");
      const gatepassno = key("GP");
      const attachmentlink = await uploadPurchase2Attachment(attachment, "purchase2/gate-pass");
      const vendorname = selected.vendor || selected.vendorname || "";
      const status = direction === "Inward" ? "Received" : "Outward Created";
      const header = await saveRow("storegatepassds2", {
        ...form,
        gatepassno,
        direction,
        gatepasstype: direction,
        sourcetype: sourceType,
        qcno: selected.qcno || "",
        poid: selected.poid || "",
        vendorid: selected.vendorid || "",
        vendorname,
        storeid: selected.storeid || "",
        storename: selected.storename || selected.store || "",
        vehicle: form.vehicleno,
        challanno: selected.challanno || "",
        attachmentlink,
        receivedby: currentName(),
        receivedbyemail: currentUser(),
        status
      });
      await Promise.all(items.map((item) => saveRow("storegatepassitemsds2", {
        gatepassno,
        direction,
        sourcetype: sourceType,
        qcno: selected.qcno || "",
        poid: selected.poid || "",
        itemid: item.itemid,
        itemcode: item.itemcode,
        itemname: item.itemname,
        itemdescription: item.description || item.itemdescription || item.itemname,
        orderedquantity: item.orderedquantity || item.quantity,
        receivedquantity: form.remarktype === "Countable" ? num(item.receivedquantity || item.gatepassquantity) : num(item.receivedquantity || item.gatepassquantity || item.quantity || item.rejectedquantity || item.returnedquantity),
        gatepassquantity: form.remarktype === "Countable" ? num(item.receivedquantity || item.gatepassquantity) : num(item.receivedquantity || item.gatepassquantity || item.quantity || item.rejectedquantity || item.returnedquantity),
        unit: item.unit,
        remarks: item.remarks
      })));
      setMessage("Gate pass created");
      setPrintData({ header: { ...selected, ...form, ...header, attachmentlink }, items });
      setAttachment(null);
    } catch (err) { setError(err.message); }
  };
  return <Page title="PO Gate Pass" subtitle="Create inward and outward gate passes for PO, LPO, internal movement, and QC return documents." message={message} error={error}>
    <Paper sx={{ p: 2, mb: 2 }}>
      <Grid container spacing={2} alignItems="center">
        <Grid item xs={12} md={2}><TextField select size="small" label="Gate pass direction" value={direction} onChange={(e) => { setDirection(e.target.value); setSourceType(e.target.value === "Inward" ? "PO" : "Internal Movement"); }} fullWidth>{["Inward", "Outward"].map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}</TextField></Grid>
        <Grid item xs={12} md={2}><TextField select size="small" label="Source type" value={sourceType} onChange={(e) => setSourceType(e.target.value)} fullWidth>{sourceOptions.map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}</TextField></Grid>
        <Grid item xs={12} md={4}><Autocomplete options={sources} value={selected} getOptionLabel={documentLabel} onChange={(_, v) => open(v)} renderInput={(params) => <TextField {...params} label="Select source document" size="small" />} /></Grid>
        <Grid item xs={12} md={2}><TextField size="small" type="date" label="Gate pass date" value={form.receiveddate} InputLabelProps={{ shrink: true }} onChange={(e) => setForm((p) => ({ ...p, receiveddate: e.target.value }))} fullWidth /></Grid>
        <Grid item xs={12} md={2}><TextField select size="small" label="Remark type" value={form.remarktype} onChange={(e) => setForm((p) => ({ ...p, remarktype: e.target.value }))} fullWidth>{["Countable", "Non countable"].map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}</TextField></Grid>
        <Grid item xs={12} md={3}><TextField size="small" label="Vehicle no" value={form.vehicleno} onChange={(e) => setForm((p) => ({ ...p, vehicleno: e.target.value }))} fullWidth /></Grid>
        <Grid item xs={12} md={3}><TextField size="small" label="Driver name" value={form.drivername} onChange={(e) => setForm((p) => ({ ...p, drivername: e.target.value }))} fullWidth /></Grid>
        <Grid item xs={12} md={3}><TextField size="small" label="Contact no" value={form.drivercontact} onChange={(e) => setForm((p) => ({ ...p, drivercontact: e.target.value }))} fullWidth /></Grid>
        <Grid item xs={12} md={3}><TextField size="small" label="Invoice no" value={form.invoiceno} onChange={(e) => setForm((p) => ({ ...p, invoiceno: e.target.value }))} fullWidth /></Grid>
        <Grid item xs={12} md={8}><TextField size="small" label="Remarks" value={form.remarks} onChange={(e) => setForm((p) => ({ ...p, remarks: e.target.value }))} fullWidth /></Grid>
        <Grid item xs={12} md={2}><Button component="label" startIcon={<UploadFile />} variant="outlined" fullWidth>{attachment?.name || "Attachment"}<input hidden type="file" onChange={(e) => setAttachment(e.target.files?.[0] || null)} /></Button></Grid>
        <Grid item xs={12} md={2}><Button fullWidth variant="contained" onClick={save} disabled={!selected}>Create gate pass</Button></Grid>
        <Grid item xs={12} md={2}><Button fullWidth startIcon={<Print />} variant="outlined" disabled={!printData} onClick={() => printPurchase2("gatePass", printData)}>Print</Button></Grid>
      </Grid>
    </Paper>
    <DataGrid autoHeight rows={items.map((r, i) => ({ ...r, id: i }))} columns={[
      { field: "itemcode", headerName: "Code", width: 130 },
      { field: "itemname", headerName: "Item", flex: 1, minWidth: 220 },
      { field: "itemdescription", headerName: "Description", flex: 1, minWidth: 220, valueGetter: (params) => params.row.description || params.row.itemdescription || params.row.itemname },
      { field: "unit", headerName: "Unit", width: 100 },
      { field: "orderedquantity", headerName: "PO Qty", width: 120, valueGetter: (params) => params.row.orderedquantity || params.row.quantity },
      { field: "receivedquantity", headerName: "Received/Gate Qty", width: 170, editable: form.remarktype === "Countable" },
      { field: "remarks", headerName: "Remarks", flex: 1, editable: true }
    ]} processRowUpdate={(row) => { setItems(items.map((it, idx) => idx === row.id ? { ...it, receivedquantity: row.receivedquantity, gatepassquantity: row.receivedquantity, remarks: row.remarks || "" } : it)); return row; }} slots={{ toolbar: GridToolbar }} />
  </Page>;
}

export function Purchase2QualityCheckPage() {
  const [passes, setPasses] = useState([]);
  const [selected, setSelected] = useState(null);
  const [po, setPo] = useState({});
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ inspectiondate: today(), billno: "", billdate: "", challanno: "", challandate: "", returncategory: "Returnable", remarks: "" });
  const [attachment, setAttachment] = useState(null);
  const [printData, setPrintData] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  useEffect(() => { getRows("storegatepassds2").then((rows) => setPasses(rows.filter((row) => text(row.direction || row.gatepasstype || "Inward").toLowerCase() === "inward"))); }, []);
  const open = async (gp) => {
    setSelected(gp);
    setPrintData(null);
    const poRows = await getRows("storepoorderds2", [{ field: "poid", value: gp.poid }]);
    setPo(poRows[0] || {});
    const gpItems = await getRows("storegatepassitemsds2", [{ field: "gatepassno", value: gp.gatepassno }]);
    setForm((prev) => ({
      ...prev,
      billno: gp.billno || "",
      billdate: gp.billdate ? String(gp.billdate).slice(0, 10) : "",
      challanno: gp.challanno || "",
      challandate: gp.challandate ? String(gp.challandate).slice(0, 10) : ""
    }));
    setItems(gpItems.map((item) => {
      const gateQty = num(item.receivedquantity || item.gatepassquantity || item.orderedquantity);
      return {
        ...item,
        itemdescription: item.itemdescription || item.description || item.itemname,
        poquantity: item.orderedquantity || item.quantity || 0,
        gatepassquantity: gateQty,
        receivedquantity: gateQty,
        approvedquantity: gateQty,
        rejectedquantity: 0,
        returnedquantity: 0,
        status: "Approved"
      };
    }));
  };
  const save = async () => {
    try {
      const qcno = key("QC");
      if (!selected) throw new Error("Select a gate pass");
      const attachmentlink = await uploadPurchase2Attachment(attachment, "purchase2/quality-check");
      const totalRejected = items.reduce((sum, item) => sum + num(item.rejectedquantity), 0);
      const totalReturned = items.reduce((sum, item) => sum + num(item.returnedquantity), 0);
      const header = await saveRow("storequalitycheckds2", {
        ...form,
        qcno,
        gatepassno: selected.gatepassno,
        poid: selected.poid,
        vendorid: selected.vendorid,
        vendorname: selected.vendorname || po.vendor,
        storename: selected.storename || po.storename,
        storeid: selected.storeid || po.storeid,
        checkedby: currentName(),
        checkedbyemail: currentUser(),
        inspectiondate: form.inspectiondate,
        checkdate: form.inspectiondate,
        attachmentlink,
        rejectedquantity: totalRejected,
        returnedquantity: totalReturned,
        totalrejectedquantity: totalRejected,
        totalreturnedquantity: totalReturned,
        status: "QC Done",
        remarks: form.remarks
      });
      for (const item of items) {
        await saveRow("storequalitycheckitemsds2", { ...item, qcno, returncategory: form.returncategory, status: num(item.rejectedquantity) > 0 ? "Rejected" : "Approved" });
        const stocks = await getRows("storeitemsds2", [{ field: "storeid", value: selected.storeid || selected.storeId || "" }, { field: "itemcode", value: item.itemcode }]);
        if (stocks[0]) await updateRow("storeitemsds2", stocks[0], { quantity: num(stocks[0].quantity) + num(item.approvedquantity) });
        else await saveRow("storeitemsds2", { storeid: selected.storeid, storename: selected.storename, itemcode: item.itemcode, itemname: item.itemname, quantity: item.approvedquantity, unit: item.unit, status: "Active" });
      }
      setMessage("Quality check saved and approved stock updated");
      setPrintData({ header: { ...selected, ...po, ...header, attachmentlink }, items });
      setAttachment(null);
    } catch (err) { setError(err.message); }
  };
  return <Page title="Quality Check" subtitle="Inspect gate pass items, capture bill/challan data, attachments, and accepted/rejected quantities." message={message} error={error}>
    <Paper sx={{ p: 2, mb: 2 }}>
      <Grid container spacing={2} alignItems="center">
        <Grid item xs={12} md={4}><Autocomplete options={passes} value={selected} getOptionLabel={(o) => `${o.gatepassno || ""} - ${o.poid || ""} - ${o.vendorname || ""}`} onChange={(_, v) => open(v)} renderInput={(params) => <TextField {...params} label="Gate pass / PO number" size="small" />} /></Grid>
        <Grid item xs={12} md={2}><TextField size="small" type="date" label="Inspection date" value={form.inspectiondate} InputLabelProps={{ shrink: true }} onChange={(e) => setForm((p) => ({ ...p, inspectiondate: e.target.value }))} fullWidth /></Grid>
        <Grid item xs={12} md={2}><TextField size="small" label="Bill no" value={form.billno} onChange={(e) => setForm((p) => ({ ...p, billno: e.target.value }))} fullWidth /></Grid>
        <Grid item xs={12} md={2}><TextField size="small" type="date" label="Bill date" value={form.billdate} InputLabelProps={{ shrink: true }} onChange={(e) => setForm((p) => ({ ...p, billdate: e.target.value }))} fullWidth /></Grid>
        <Grid item xs={12} md={2}><TextField select size="small" label="Return category" value={form.returncategory} onChange={(e) => setForm((p) => ({ ...p, returncategory: e.target.value }))} fullWidth>{["Returnable", "Non Returnable"].map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}</TextField></Grid>
        <Grid item xs={12} md={2}><TextField size="small" label="Challan no" value={form.challanno} onChange={(e) => setForm((p) => ({ ...p, challanno: e.target.value }))} fullWidth /></Grid>
        <Grid item xs={12} md={2}><TextField size="small" type="date" label="Challan date" value={form.challandate} InputLabelProps={{ shrink: true }} onChange={(e) => setForm((p) => ({ ...p, challandate: e.target.value }))} fullWidth /></Grid>
        <Grid item xs={12} md={4}><TextField size="small" label="Remarks" value={form.remarks} onChange={(e) => setForm((p) => ({ ...p, remarks: e.target.value }))} fullWidth /></Grid>
        <Grid item xs={12} md={2}><Button component="label" startIcon={<UploadFile />} variant="outlined" fullWidth>{attachment?.name || "Attachment"}<input hidden type="file" onChange={(e) => setAttachment(e.target.files?.[0] || null)} /></Button></Grid>
        <Grid item xs={12} md={1}><Button fullWidth variant="contained" onClick={save} disabled={!selected}>Save QC</Button></Grid>
        <Grid item xs={12} md={1}><Button fullWidth startIcon={<Print />} variant="outlined" disabled={!printData} onClick={() => printPurchase2("qualityCheck", printData)}>Print</Button></Grid>
      </Grid>
      {selected && <Box sx={{ mt: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Inspection Date: {form.inspectiondate || "-"} | PO No: {selected.poid || "-"} | Vendor: {selected.vendorname || po.vendor || "-"} | Gate Pass No: {selected.gatepassno || "-"}
        </Typography>
      </Box>}
    </Paper>
    <DataGrid autoHeight rows={items.map((r, i) => ({ ...r, id: i }))} processRowUpdate={(row, oldRow) => {
      const gateQty = num(row.gatepassquantity || row.receivedquantity);
      const approvedChanged = num(row.approvedquantity) !== num(oldRow.approvedquantity);
      const rejectedChanged = num(row.rejectedquantity) !== num(oldRow.rejectedquantity);
      const approved = approvedChanged && !rejectedChanged ? Math.max(0, Math.min(num(row.approvedquantity), gateQty)) : gateQty - Math.max(0, Math.min(num(row.rejectedquantity), gateQty));
      const rejected = approvedChanged && !rejectedChanged ? gateQty - approved : Math.max(0, Math.min(num(row.rejectedquantity), gateQty));
      const finalRow = { ...row, rejectedquantity: rejected, approvedquantity: approved, returnedquantity: rejected, status: rejected > 0 ? "Partially Rejected" : "Approved" };
      setItems(items.map((it, idx) => idx === row.id ? finalRow : it));
      return finalRow;
    }} columns={[
      { field: "itemdescription", headerName: "Item description", flex: 1, minWidth: 220, valueGetter: (params) => params.row.itemdescription || params.row.description || params.row.itemname },
      { field: "unit", headerName: "Unit", width: 100 },
      { field: "poquantity", headerName: "PO quantity", width: 130, valueGetter: (params) => params.row.poquantity || params.row.orderedquantity || params.row.quantity },
      { field: "gatepassquantity", headerName: "Gate pass quantity", width: 160, valueGetter: (params) => params.row.gatepassquantity || params.row.receivedquantity },
      { field: "approvedquantity", headerName: "Accepted Quantity", width: 160, editable: true },
      { field: "rejectedquantity", headerName: "Rejected Quantity", width: 160, editable: true },
      { field: "remarks", headerName: "Remarks", flex: 1, minWidth: 180, editable: true }
    ]} slots={{ toolbar: GridToolbar }} />
  </Page>;
}

export function Purchase2GrnCreationPage() {
  const [qcs, setQcs] = useState([]);
  const [selected, setSelected] = useState(null);
  const [items, setItems] = useState([]);
  const [printData, setPrintData] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  useEffect(() => { getRows("storequalitycheckds2").then((rows) => setQcs(rows.filter((r) => !r.grnno))); }, []);
  const open = async (qc) => { setSelected(qc); setItems(await getRows("storequalitycheckitemsds2", [{ field: "qcno", value: qc.qcno }])); };
  const save = async () => {
    try {
      const grnNo = key("GRN");
      const gp = (await getRows("storegatepassds2", [{ field: "gatepassno", value: selected.gatepassno }]))[0] || {};
      const header = await saveRow("storegrnds2", { grnNo, gatePassNumber: selected.gatepassno || "NA", poid: selected.poid || "NA", vendorName: gp.vendorname || "NA", storeId: gp.storeid || "NA", storeName: gp.storename || "NA", receivedBy: currentName(), grnDate: today(), status: "Pending QC", remarks: `QC ${selected.qcno}` });
      await Promise.all(items.map((item) => saveRow("storegrnitemsds2", { grnno: grnNo, grnid: header._id, poid: selected.poid, itemid: item.itemid, itemcode: item.itemcode, itemname: item.itemname, acceptedquantity: item.approvedquantity, rejectedquantity: item.rejectedquantity, unit: item.unit, remarks: item.remarks })));
      await updateRow("storequalitycheckds2", selected, { grnno: grnNo, status: "GRN Created" });
      setMessage("GRN created");
      setPrintData({ header: { ...selected, ...gp, ...header, qcno: selected.qcno }, items });
    } catch (err) { setError(err.message); }
  };
  return <Page title="GRN Creation" subtitle="Create GRN from approved quality check records." message={message} error={error}><Paper sx={{ p: 2, mb: 2 }}><Stack direction={{ xs: "column", md: "row" }} spacing={2}><Autocomplete sx={{ minWidth: 320 }} options={qcs} getOptionLabel={(o) => `${o.qcno || ""} - ${o.poid || ""}`} onChange={(_, v) => open(v)} renderInput={(params) => <TextField {...params} label="Approved QC" size="small" />} /><Button variant="contained" onClick={save} disabled={!selected}>Create GRN</Button><Button startIcon={<Print />} variant="outlined" disabled={!printData} onClick={() => printPurchase2("grn", printData)}>Print GRN</Button></Stack></Paper><DataGrid autoHeight rows={items.map((r, i) => ({ ...r, id: i }))} columns={[{ field: "itemname", headerName: "Item", flex: 1 }, { field: "approvedquantity", headerName: "Accepted", width: 120 }, { field: "rejectedquantity", headerName: "Rejected", width: 120 }]} /></Page>;
}
