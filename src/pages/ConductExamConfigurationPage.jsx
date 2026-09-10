import React, { useEffect, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  Grid,
  LinearProgress,
  Paper,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import RefreshIcon from "@mui/icons-material/Refresh";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import BadgeIcon from "@mui/icons-material/Badge";
import PreviewIcon from "@mui/icons-material/Preview";
import ep1 from "../api/ep1";
import global1 from "./global1";
import MenuPageShell from "./MenuPageShell";
import ExamDocumentHeader from "../components/conductExam/ExamDocumentHeader";

export default function ConductExamConfigurationPage() {
  const colid = global1.colid || 1;

  const [form, setForm] = useState({
    institutionname: "",
    affiliatedboard: "",
    address: "",
    coename: "",
    coetitle: "Controller of Examinations",
    vcname: "",
    vctitle: "Vice Chancellor",
    logo: "",
    phone: "",
    email: "",
    website: ""
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadConfig = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await ep1.get("/api/v2/conductexam/configuration", { params: { colid } });
      if (res.data?.success && res.data?.data) {
        setForm((prev) => ({
          ...prev,
          ...res.data.data
        }));
      }
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load exam configuration.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, [colid]);

  const handleChange = (field) => (e) => {
    setForm({ ...form, [field]: e.target.value });
    if (message) setMessage("");
  };

  const handleLogoUpload = async (file) => {
    if (!file) return;
    try {
      setUploading(true);
      setError("");
      const formData = new FormData();
      formData.append("logo", file);
      formData.append("colid", colid);

      const res = await ep1.post("/api/v2/conductexam/configuration-logo-upload", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      if (res.data?.url) {
        setForm((prev) => ({ ...prev, logo: res.data.url }));
        setMessage("Logo uploaded successfully. Click Save to persist configuration.");
      } else {
        setError("Failed to upload logo.");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Error uploading logo.");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!form.institutionname.trim()) {
      return setError("Institution Name is required.");
    }

    try {
      setSaving(true);
      setError("");
      setMessage("");
      const res = await ep1.post("/api/v2/conductexam/configuration", {
        ...form,
        colid,
        user: global1.user
      });

      if (res.data?.success) {
        setMessage("Exam configuration saved successfully! All examination formats are now updated.");
        if (res.data?.data) setForm(res.data.data);
      } else {
        setError(res.data?.message || "Failed to save configuration.");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Error saving configuration.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <MenuPageShell title="Exam Configuration">
      <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: "#f6f7fb", minHeight: "100vh" }}>
        
        {/* Header Title Card */}
        <Paper elevation={0} sx={{ p: 2.5, mb: 2.5, border: "1px solid #e5e7eb", borderRadius: 2 }}>
          <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} spacing={2}>
            <Box>
              <Typography variant="h5" fontWeight={900} color="#0f172a">
                Examination Configuration
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Configure official Institution Name, Affiliated Board, Campus Address, COE &amp; VC names, and Logo for all Conduct Exam &amp; Question Paper formats.
              </Typography>
            </Box>
            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={loadConfig}
                disabled={loading || saving}
              >
                Reload
              </Button>
              <Button
                variant="contained"
                startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
                onClick={handleSave}
                disabled={loading || saving}
                sx={{ px: 3, fontWeight: 700 }}
              >
                {saving ? "Saving..." : "Save Configuration"}
              </Button>
            </Stack>
          </Stack>
          {(loading || saving || uploading) && <LinearProgress sx={{ mt: 2 }} />}
        </Paper>

        {message && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMessage("")}>{message}</Alert>}
        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}

        <Grid container spacing={2.5}>
          {/* Left Column: Form Fields */}
          <Grid item xs={12} lg={6}>
            <Stack spacing={2.5}>
              
              {/* Card 1: Institution Details */}
              <Card variant="outlined" sx={{ borderRadius: 2 }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                    <AccountBalanceIcon color="primary" />
                    <Typography variant="subtitle1" fontWeight={800} color="#0f172a">
                      Institution &amp; Board Information
                    </Typography>
                  </Stack>
                  <Divider sx={{ mb: 2 }} />

                  <Stack spacing={2}>
                    <TextField
                      label="Institution / University Name"
                      placeholder="e.g. PEOPLE'S UNIVERSITY"
                      value={form.institutionname}
                      onChange={handleChange("institutionname")}
                      required
                      fullWidth
                      helperText="This is rendered prominently in extra-large font as the main header on all examination documents."
                    />

                    <TextField
                      label="Affiliated Board / University / Status"
                      placeholder="e.g. Affiliated to Barkatullah University, Bhopal OR (Established Under State Act...)"
                      value={form.affiliatedboard}
                      onChange={handleChange("affiliatedboard")}
                      fullWidth
                      helperText="Rendered directly beneath the Institution Name on all official formats."
                    />

                    <TextField
                      label="Campus / Office Address"
                      placeholder="e.g. People's Campus, Bhanpur, Bhopal - 462037 (M.P.)"
                      value={form.address}
                      onChange={handleChange("address")}
                      multiline
                      minRows={2}
                      fullWidth
                    />

                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Office Phone / Contact"
                          placeholder="e.g. 0755-4005402"
                          value={form.phone}
                          onChange={handleChange("phone")}
                          fullWidth
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Examination E-mail"
                          placeholder="e.g. coe@peoplesuniversity.edu.in"
                          value={form.email}
                          onChange={handleChange("email")}
                          fullWidth
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          label="Website URL"
                          placeholder="e.g. https://campustechnology.me"
                          value={form.website}
                          onChange={handleChange("website")}
                          fullWidth
                        />
                      </Grid>
                    </Grid>
                  </Stack>
                </CardContent>
              </Card>

              {/* Card 2: Examination Officers */}
              <Card variant="outlined" sx={{ borderRadius: 2 }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                    <BadgeIcon color="primary" />
                    <Typography variant="subtitle1" fontWeight={800} color="#0f172a">
                      Examination Officers &amp; Signatories
                    </Typography>
                  </Stack>
                  <Divider sx={{ mb: 2 }} />

                  <Stack spacing={2}>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={7}>
                        <TextField
                          label="Name of COE (Controller of Examinations)"
                          placeholder="e.g. Dr. R. K. Sharma"
                          value={form.coename}
                          onChange={handleChange("coename")}
                          fullWidth
                          helperText="Appears in From headers, official letters, and bill verification blocks."
                        />
                      </Grid>
                      <Grid item xs={12} sm={5}>
                        <TextField
                          label="COE Official Title"
                          value={form.coetitle}
                          onChange={handleChange("coetitle")}
                          fullWidth
                        />
                      </Grid>
                    </Grid>

                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={7}>
                        <TextField
                          label="Name of VC (Vice Chancellor)"
                          placeholder="e.g. Prof. Rajesh Singh"
                          value={form.vcname}
                          onChange={handleChange("vcname")}
                          fullWidth
                          helperText="Referenced in Vice Chancellor approval clauses and high-level certifications."
                        />
                      </Grid>
                      <Grid item xs={12} sm={5}>
                        <TextField
                          label="VC Official Title"
                          value={form.vctitle}
                          onChange={handleChange("vctitle")}
                          fullWidth
                        />
                      </Grid>
                    </Grid>
                  </Stack>
                </CardContent>
              </Card>

              {/* Card 3: Logo Upload */}
              <Card variant="outlined" sx={{ borderRadius: 2 }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Typography variant="subtitle1" fontWeight={800} color="#0f172a" sx={{ mb: 1 }}>
                    Institution / Examination Logo
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Upload or paste the URL of the official emblem/logo. It will be printed at the top of question papers, appointment letters, and bills.
                  </Typography>
                  <Divider sx={{ mb: 2 }} />

                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} sm={8}>
                      <TextField
                        label="Logo Image URL"
                        placeholder="https://..."
                        value={form.logo}
                        onChange={handleChange("logo")}
                        fullWidth
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Stack direction="row" spacing={1}>
                        <Button
                          variant="contained"
                          component="label"
                          startIcon={uploading ? <CircularProgress size={16} color="inherit" /> : <UploadFileIcon />}
                          disabled={uploading}
                          fullWidth
                        >
                          {uploading ? "Uploading..." : "Upload"}
                          <input
                            type="file"
                            hidden
                            accept="image/*"
                            onChange={(e) => handleLogoUpload(e.target.files?.[0])}
                          />
                        </Button>
                        {form.logo && (
                          <Button
                            variant="outlined"
                            color="error"
                            onClick={() => setForm({ ...form, logo: "" })}
                          >
                            <DeleteOutlineIcon />
                          </Button>
                        )}
                      </Stack>
                    </Grid>

                    {form.logo && (
                      <Grid item xs={12}>
                        <Box sx={{ p: 1.5, border: "1px dashed #cbd5e1", borderRadius: 1.5, textAlign: "center", bgcolor: "#f8fafc" }}>
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                            Logo Preview:
                          </Typography>
                          <Box
                            component="img"
                            src={form.logo}
                            alt="Logo Preview"
                            sx={{ maxHeight: 80, maxWidth: 160, objectFit: "contain" }}
                            onError={(e) => { e.target.style.display = "none"; }}
                          />
                        </Box>
                      </Grid>
                    )}
                  </Grid>
                </CardContent>
              </Card>

            </Stack>
          </Grid>

          {/* Right Column: Real-time Live Document Preview */}
          <Grid item xs={12} lg={6}>
            <Paper elevation={0} sx={{ p: 3, border: "2px solid #3b82f6", borderRadius: 2, bgcolor: "#ffffff", position: "sticky", top: 20 }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2, pb: 1, borderBottom: "1px solid #e2e8f0" }}>
                <PreviewIcon color="primary" />
                <Typography variant="subtitle1" fontWeight={900} color="#1e3a8a">
                  Live Document &amp; Header Preview
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ ml: "auto" }}>
                  (Real-time preview across all formats)
                </Typography>
              </Stack>

              {/* Standardized Header Preview */}
              <Box sx={{ p: 2, bgcolor: "#fbfdff", border: "1px solid #e2e8f0", borderRadius: 1.5, mb: 2 }}>
                <ExamDocumentHeader
                  config={form}
                  title="SAMPLE FORMAT / APPOINTMENT / BILL"
                  officeTitle={form.coetitle ? `OFFICE OF THE ${form.coetitle.toUpperCase()}` : "OFFICE OF THE CONTROLLER OF EXAMINATIONS"}
                />

                {/* Sample Document Body Block */}
                <Box sx={{ mt: 2, fontSize: "13px", color: "#334155", lineHeight: 1.6 }}>
                  <Grid container spacing={2} sx={{ mb: 2 }}>
                    <Grid item xs={7}>
                      <strong>From:</strong><br />
                      {form.coename ? <span style={{ fontWeight: "bold", fontSize: "14px", color: "#0f172a" }}>{form.coename}<br /></span> : null}
                      <span>{form.coetitle || "Controller of Examinations"}</span><br />
                      <span>{form.institutionname || "Institution Name"}</span><br />
                      <span>{form.address || "Campus Address"}</span>
                    </Grid>
                    <Grid item xs={5} sx={{ textAlign: "right" }}>
                      <strong>Date:</strong> {new Date().toLocaleDateString("en-GB")}<br />
                      <strong>Ref:</strong> CONF/EXAM/2026/001
                    </Grid>
                  </Grid>

                  <Box sx={{ p: 1.5, bgcolor: "#f1f5f9", borderRadius: 1, borderLeft: "4px solid #3b82f6", mb: 2 }}>
                    <span>With the approval of <strong>{form.vcname ? `the ${form.vctitle} (${form.vcname})` : `the ${form.vctitle}`}</strong>, question paper setting / moderation duties are allocated.</span>
                  </Box>

                  {/* Sample Signature Box */}
                  <Box sx={{ mt: 3, pt: 2, borderTop: "1px dashed #cbd5e1", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                    <Box sx={{ textAlign: "center", width: "45%" }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: "#94a3b8" }}>
                        ______________________
                      </Typography>
                      <Typography variant="caption" sx={{ fontWeight: 700, color: "#475569" }}>
                        Claimant / Examiner Signature
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: "center", width: "45%" }}>
                      {form.coename && (
                        <Typography variant="body2" sx={{ fontWeight: 800, color: "#0f172a" }}>
                          {form.coename}
                        </Typography>
                      )}
                      <Typography variant="caption" sx={{ fontWeight: 700, color: "#1e3a8a" }}>
                        {form.coetitle || "Controller of Examinations"}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </Box>

              <Alert severity="info" sx={{ fontSize: "12px" }}>
                Changes saved here will automatically propagate to all <strong>Appointment Letters</strong>, <strong>Acceptance Forms</strong>, <strong>Declaration Forms</strong>, <strong>Remuneration Bills</strong>, and printable reports across both <strong>Conduct Exam</strong> and <strong>Question Paper Management 2</strong>.
              </Alert>

              <Box sx={{ mt: 2, textAlign: "center" }}>
                <Button
                  component={RouterLink}
                  to="/conduct-exam-official-forms"
                  variant="outlined"
                  color="primary"
                  fullWidth
                  startIcon={<PreviewIcon />}
                  sx={{ fontWeight: 700 }}
                >
                  View &amp; Print Official Exam Forms (Appointment, Acceptance, Declaration)
                </Button>
              </Box>
            </Paper>
          </Grid>
        </Grid>

      </Box>
    </MenuPageShell>
  );
}
