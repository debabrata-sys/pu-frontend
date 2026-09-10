import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Paper,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import DownloadIcon from "@mui/icons-material/Download";
import { DataGrid, GridToolbar } from "@mui/x-data-grid";
import * as XLSX from "xlsx";
import ep1 from "../api/ep1";
import global1 from "./global1";
import MenuPageShell from "./MenuPageShell";

const staffFields = [
  { field: "name", headerName: "Name", width: 190 },
  { field: "email", headerName: "Email", width: 240 },
  { field: "phone", headerName: "Phone", width: 140 },
  { field: "password", headerName: "Password", width: 150 },
  { field: "role", headerName: "Role", width: 150 },
  { field: "excluded", headerName: "Excluded", width: 120 },
  { field: "department", headerName: "Department", width: 180 },
  { field: "designation", headerName: "Designation", width: 180 },
  { field: "joiningdate", headerName: "Date of Joining", width: 150 },
  { field: "googleemail", headerName: "Google Email", width: 240 },
  { field: "institution", headerName: "Institution", width: 210 },
  { field: "gender", headerName: "Gender", width: 120 },
  { field: "state", headerName: "State", width: 140 },
  { field: "city", headerName: "City", width: 140 },
  { field: "district", headerName: "District", width: 150 },
  { field: "pincode", headerName: "Pincode", width: 130 },
  { field: "address", headerName: "Address", width: 260 },
  { field: "pan", headerName: "PAN", width: 140 },
  { field: "photo", headerName: "Photo", width: 260 },
  { field: "skills", headerName: "Skills", width: 240 },
  { field: "status", headerName: "Status", width: 110 }
];

const templateRow = {
  name: "Dr Example User",
  email: "example.staff@institution.edu",
  phone: "9999999999",
  password: "Password@123",
  role: "Faculty",
  department: "Orthodontics",
  designation: "Assistant Professor",
  joiningdate: "2026-08-08",
  googleemail: "example.staff@gmail.com",
  excluded: "No",
  institution: "Institution name",
  gender: "Female",
  state: "State",
  city: "City",
  district: "District",
  pincode: "000000",
  address: "Address",
  pan: "ABCDE1234F",
  photo: "https://example.com/photo.jpg",
  skills: "Teaching, Research",
  status: 1
};

const cleanRowsForExport = (rows) => rows.map((row) => {
  const clean = {};
  staffFields.forEach(({ field }) => {
    clean[field] = row[field] ?? "";
  });
  return clean;
});

export default function StaffListPage() {
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await ep1.get("/api/v2/staff-list", {
        params: { colid: global1.colid, search }
      });
      setRows(res.data?.data || []);
    } catch (err) {
      setError(err.response?.data?.msg || err.message || "Unable to load staff list");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const columns = useMemo(() => staffFields.map((column) => ({
    ...column,
    renderCell: (params) => (
      <Box sx={{ whiteSpace: "normal", overflowWrap: "anywhere", py: 0.75, lineHeight: 1.35 }}>
        {params.value ?? ""}
      </Box>
    )
  })), []);

  const downloadWorkbook = (filename, data) => {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Staff");
    XLSX.writeFile(workbook, filename);
  };

  const downloadTemplate = () => {
    downloadWorkbook("staff_list_bulk_upload_template.xlsx", [templateRow]);
  };

  const exportStaff = () => {
    downloadWorkbook("staff_list.xlsx", cleanRowsForExport(rows));
  };

  const uploadFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      setError("");
      setMessage("");
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(sheet, { defval: "" }).map((row, index) => ({
        ...row,
        rowNumber: index + 2
      }));
      if (!data.length) throw new Error("The selected file has no rows");

      const res = await ep1.post("/api/v2/staff-list-bulk", {
        colid: global1.colid,
        user: global1.user,
        items: data
      });

      const errors = res.data?.errors || [];
      setMessage(`Bulk upload completed. Saved ${res.data?.saved || 0} row(s).${errors.length ? ` ${errors.length} row(s) need attention.` : ""}`);
      if (errors.length) {
        setError(errors.slice(0, 5).map((item) => `Row ${item.rowNumber}: ${item.msg}`).join(" | "));
      }
      await load();
    } catch (err) {
      setError(err.response?.data?.msg || err.message || "Unable to upload staff list");
    }
  };

  return (
    <MenuPageShell title="Staff List">
      <Box p={3}>
        <Typography variant="h5" fontWeight={900}>Staff list</Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          View and bulk upload non-student users. Student-only fields are excluded from the grid, export, and upload template.
        </Typography>

        {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Paper sx={{ p: 2, mb: 2 }}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1} alignItems={{ xs: "stretch", md: "center" }}>
            <TextField
              size="small"
              label="Search staff"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              sx={{ minWidth: { md: 320 } }}
            />
            <Button variant="contained" onClick={load}>Apply</Button>
            <Button variant="outlined" startIcon={<DownloadIcon />} onClick={exportStaff}>Export</Button>
            <Button variant="outlined" startIcon={<DownloadIcon />} onClick={downloadTemplate}>Template</Button>
            <Button component="label" variant="contained" startIcon={<UploadFileIcon />}>
              Bulk upload
              <input hidden type="file" accept=".xlsx,.xls,.csv" onChange={uploadFile} />
            </Button>
          </Stack>
        </Paper>

        <Paper sx={{ p: 2 }}>
          <DataGrid
            autoHeight
            loading={loading}
            rows={rows.map((row) => ({ ...row, id: row._id }))}
            columns={columns}
            slots={{ toolbar: GridToolbar }}
            pageSizeOptions={[10, 25, 50, 100]}
            getRowHeight={() => "auto"}
            initialState={{ pagination: { paginationModel: { pageSize: 25, page: 0 } } }}
            sx={{
              "& .MuiDataGrid-cell": {
                alignItems: "flex-start",
                whiteSpace: "normal",
                overflowWrap: "anywhere"
              },
              "& .MuiDataGrid-columnHeaderTitle": {
                whiteSpace: "normal",
                lineHeight: 1.2
              }
            }}
          />
        </Paper>
      </Box>
    </MenuPageShell>
  );
}
