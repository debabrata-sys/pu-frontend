import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import ep1 from "../api/ep1";
import {
  Container,
  Paper,
  Typography,
  Box,
  Grid,
  TextField,
  MenuItem,
  Button,
  IconButton,
  Alert,
  CircularProgress,
  Divider,
  Card,
  FormControl,
  InputLabel,
  Select,
  FormHelperText,
  Chip
} from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import DeleteIcon from "@mui/icons-material/Delete";
import HowToRegIcon from "@mui/icons-material/HowToReg";

export default function EvaluatorRegistrationPublicPage() {
  const [searchParams] = useSearchParams();
  const colidParam = searchParams.get("colid") || "1";
  const tokenParam = searchParams.get("token") || "";

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submissionResult, setSubmissionResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const [institution, setInstitution] = useState({
    institutionname: "University Portal",
    institutioncode: "PU",
    logo: ""
  });
  const [formConfig, setFormConfig] = useState(null);

  // Dynamic field values: { [fieldname]: value }
  const [dynamicValues, setDynamicValues] = useState({});

  // Files
  const [photoPreview, setPhotoPreview] = useState("");
  const [photolink, setPhotolink] = useState("");
  const [photoUploading, setPhotoUploading] = useState(false);

  const [signaturePreview, setSignaturePreview] = useState("");
  const [signaturelink, setSignaturelink] = useState("");
  const [signatureUploading, setSignatureUploading] = useState(false);

  const [pancardPreview, setPancardPreview] = useState("");
  const [pancardlink, setPancardlink] = useState("");
  const [pancardUploading, setPancardUploading] = useState(false);

  // Bank Details State
  const [bankData, setBankData] = useState({
    accountnumber: "",
    confirmaccountnumber: "",
    accountholdername: "",
    bankname: "",
    ifsccode: "",
    confirmifsccode: "",
    branchname: "",
    pancardnumber: ""
  });

  useEffect(() => {
    loadPublicForm();
  }, [colidParam, tokenParam]);

  const loadPublicForm = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await ep1.get("/api/v2/evaluator-registration/public-form", {
        params: { colid: colidParam, token: tokenParam }
      });

      if (res.data?.status === "Success") {
        setInstitution(res.data.institution || {});
        const form = res.data.form || res.data.data;
        if (!form) {
          setErrorMsg("Form configuration could not be loaded.");
          return;
        }
        setFormConfig(form);

        // Initialize dynamicValues
        const initialVals = {};
        (form.fields || []).forEach((f) => {
          initialVals[f.fieldname] = f.type === "select" && f.options?.length > 0 ? "" : "";
        });
        setDynamicValues(initialVals);
      } else {
        setErrorMsg(res.data?.message || "Invalid or expired registration link.");
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Error connecting to registration service. Please verify link.");
    } finally {
      setLoading(false);
    }
  };

  const handleDynamicChange = (fieldname, val) => {
    setDynamicValues((prev) => ({
      ...prev,
      [fieldname]: val
    }));
    if (fieldErrors[fieldname]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[fieldname];
        return next;
      });
    }
  };

  const handleBankChange = (field, val) => {
    setBankData((prev) => ({
      ...prev,
      [field]: val
    }));
  };

  // Upload handler for photo & signature
  const uploadFile = async (file, type) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", type);
    formData.append("colid", colidParam);

    const res = await ep1.post("/api/v2/evaluator-registration/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" }
    });
    if (res.data?.status === "Success") {
      return res.data.fileUrl;
    } else {
      throw new Error(res.data?.message || "File upload failed");
    }
  };

  const handlePhotoSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert("Photograph file size must be less than 2 MB");
      return;
    }
    setPhotoPreview(URL.createObjectURL(file));
    setPhotoUploading(true);
    try {
      const url = await uploadFile(file, "photo");
      setPhotolink(url);
    } catch (err) {
      alert(err.message || "Failed to upload photo");
      setPhotoPreview("");
    } finally {
      setPhotoUploading(false);
    }
  };

  const handleSignatureSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert("Signature file size must be less than 2 MB");
      return;
    }
    setSignaturePreview(URL.createObjectURL(file));
    setSignatureUploading(true);
    try {
      const url = await uploadFile(file, "signature");
      setSignaturelink(url);
    } catch (err) {
      alert(err.message || "Failed to upload signature");
      setSignaturePreview("");
    } finally {
      setSignatureUploading(false);
    }
  };

  const handlePanCardSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert("PAN card file size must be less than 2 MB");
      return;
    }
    setPancardPreview(URL.createObjectURL(file));
    setPancardUploading(true);
    try {
      const url = await uploadFile(file, "pancard");
      setPancardlink(url);
    } catch (err) {
      alert(err.message || "Failed to upload PAN card");
      setPancardPreview("");
    } finally {
      setPancardUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    // Validate configured dynamic fields
    const errors = {};
    const fields = formConfig?.fields || [];
    for (const f of fields) {
      const val = dynamicValues[f.fieldname];
      if (f.required) {
        if (val === undefined || val === null || String(val).trim() === "") {
          errors[f.fieldname] = `${f.label} is required`;
        }
      }
      if (f.fieldname === "email" || f.type === "email") {
        if (val && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(val).trim())) {
          errors[f.fieldname] = "Please enter a valid email address";
        }
      }
      if (f.fieldname === "phone" || f.type === "tel") {
        if (val && !/^\d{10}$/.test(String(val).replace(/\D/g, ""))) {
          errors[f.fieldname] = "Please enter a valid 10-digit mobile number";
        }
      }
    }

    // Confirmation matching checks
    if (dynamicValues.confirm_email && dynamicValues.email && dynamicValues.email.trim().toLowerCase() !== dynamicValues.confirm_email.trim().toLowerCase()) {
      errors.confirm_email = "Email Id and Confirm Email Id do not match";
    }
    if (dynamicValues.confirm_phone && dynamicValues.phone && dynamicValues.phone.trim() !== dynamicValues.confirm_phone.trim()) {
      errors.confirm_phone = "Mobile Number and Confirm Mobile Number do not match";
    }

    // Validate Bank Details if enabled
    if (formConfig?.includeBankDetails) {
      if (!bankData.accountnumber.trim()) {
        errors.accountnumber = "Account Number is required";
      }
      if (bankData.accountnumber !== bankData.confirmaccountnumber) {
        errors.confirmaccountnumber = "Account numbers do not match";
      }
      if (!bankData.accountholdername.trim()) {
        errors.accountholdername = "Account Holder Name is required";
      }
      if (!bankData.bankname.trim()) {
        errors.bankname = "Bank Name is required";
      }
      if (!bankData.ifsccode.trim()) {
        errors.ifsccode = "IFSC Code is required";
      }
      if (bankData.ifsccode !== bankData.confirmifsccode) {
        errors.confirmifsccode = "IFSC Codes do not match";
      }
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setErrorMsg("Please correct the highlighted errors before submitting.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    // Prepare custom fields dictionary
    const customFieldsObj = {};
    fields
      .filter((f) => f.source === "custom_field")
      .forEach((f) => {
        customFieldsObj[f.fieldname] = dynamicValues[f.fieldname] || "";
      });

    setSubmitting(true);
    try {
      const payload = {
        formid: formConfig._id,
        token: tokenParam || formConfig.token,
        formtoken: tokenParam || formConfig.token,
        colid: Number(colidParam) || formConfig.colid || 1,
        fieldValues: dynamicValues,
        customFields: customFieldsObj,
        photolink,
        signaturelink,
        documentlinks: { pancard: pancardlink },
        bankDetails: formConfig?.includeBankDetails ? { ...bankData, pancardlink } : null
      };

      const res = await ep1.post("/api/v2/evaluator-registration/submit", payload);
      if (res.data?.status === "Success") {
        setSubmitted(true);
        setSubmissionResult(res.data);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        setErrorMsg(res.data?.message || "Failed to submit registration");
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Loading Screen
  if (loading) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" minHeight="70vh">
        <CircularProgress size={50} />
        <Typography variant="h6" sx={{ mt: 2, color: "#555" }}>
          Loading Registration Form...
        </Typography>
      </Box>
    );
  }

  // Error / Closed Form Screen
  if (errorMsg && !formConfig) {
    return (
      <Container maxWidth="sm" sx={{ mt: 8, mb: 8 }}>
        <Paper elevation={3} sx={{ p: 4, textAlign: "center", borderRadius: 3 }}>
          <ErrorOutlineIcon sx={{ fontSize: 70, color: "#d32f2f", mb: 2 }} />
          <Typography variant="h5" fontWeight="bold" gutterBottom>
            Registration Unavailable
          </Typography>
          <Typography variant="body1" color="textSecondary" sx={{ mb: 3 }}>
            {errorMsg}
          </Typography>
          <Button variant="outlined" color="primary" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </Paper>
      </Container>
    );
  }

  // Success Confirmation Screen
  if (submitted) {
    return (
      <Container maxWidth="md" sx={{ mt: 6, mb: 8 }}>
        <Paper elevation={4} sx={{ p: 5, textAlign: "center", borderRadius: 3 }}>
          <CheckCircleOutlineIcon sx={{ fontSize: 80, color: "#2e7d32", mb: 2 }} />
          <Typography variant="h4" fontWeight="bold" color="#2e7d32" gutterBottom>
            Registration Submitted Successfully!
          </Typography>
          <Typography variant="subtitle1" color="textSecondary" sx={{ mb: 3 }}>
            Thank you for registering with {institution.institutionname || "University Portal"}.
          </Typography>

          <Card variant="outlined" sx={{ my: 3, p: 2, bgcolor: "#f9fbe7", display: "inline-block", minWidth: 320 }}>
            <Typography variant="caption" color="textSecondary" display="block">
              Application Reference Number
            </Typography>
            <Typography variant="h5" fontWeight="bold" color="#33691e">
              {submissionResult?.applicationNumber || "SUBMITTED"}
            </Typography>
          </Card>

          <Alert severity="info" sx={{ textAlign: "left", my: 3 }}>
            <Typography variant="body2">
              <strong>What happens next?</strong>
              <br />
              1. Our administrative team will review and verify your submitted credentials.
              <br />
              2. Once your registration is approved, your official login credentials (User ID and temporary password)
              will be dispatched to your registered email address:{" "}
              <strong>{submissionResult?.applicantEmail || "your email"}</strong>.
            </Typography>
          </Alert>

          <Button variant="contained" color="primary" onClick={() => window.location.reload()} sx={{ mt: 1 }}>
            Submit Another Registration
          </Button>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 8 }}>
      {/* Institution Branding & Form Header */}
      <Paper elevation={3} sx={{ p: 4, mb: 4, borderRadius: 3, borderTop: "6px solid #1e3c72" }}>
        <Box display="flex" alignItems="center" gap={2} mb={2}>
          {institution.logo ? (
            <img
              src={institution.logo}
              alt=""
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
              style={{ height: 60, maxWidth: 180, objectFit: "contain" }}
            />
          ) : (
            <HowToRegIcon sx={{ fontSize: 50, color: "#1e3c72" }} />
          )}
          <Box>
            <Typography variant="h5" fontWeight="bold" color="#1e3c72">
              {institution.institutionname || "University Portal"}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              Evaluator & Faculty Empanelment Portal
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ my: 1.5 }} />

        <Typography variant="h4" fontWeight="bold" sx={{ mt: 1 }}>
          {formConfig?.title || "Registration Form"}
        </Typography>

        {formConfig?.description && (
          <Typography variant="body1" color="textSecondary" sx={{ mt: 1 }}>
            {formConfig.description}
          </Typography>
        )}

        {formConfig?.targetRole && (
          <Chip label={`Role: ${formConfig.targetRole}`} color="primary" size="small" sx={{ mt: 1.5 }} />
        )}
      </Paper>

      {/* Main Form */}
      <form onSubmit={handleSubmit}>
        {errorMsg && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setErrorMsg("")}>
            {errorMsg}
          </Alert>
        )}

        {/* Dynamic Fields Grouped by Section */}
        {(() => {
          const sectionMap = {};
          (formConfig?.fields || []).forEach((f) => {
            const sec = f.section || "General Information";
            if (!sectionMap[sec]) sectionMap[sec] = [];
            sectionMap[sec].push(f);
          });

          return Object.entries(sectionMap).map(([sectionName, sectionFields]) => (
            <Paper elevation={2} sx={{ p: 4, mb: 4, borderRadius: 2 }} key={sectionName}>
              <Typography variant="h6" fontWeight="bold" color="#1e3c72" gutterBottom>
                {sectionName}
              </Typography>
              <Typography variant="caption" color="textSecondary" display="block" sx={{ mb: 3 }}>
                Fields marked with an asterisk (*) are mandatory.
              </Typography>

              <Grid container spacing={2.5}>
                {sectionFields.map((f) => {
                  const val = dynamicValues[f.fieldname] ?? "";
                  const err = fieldErrors[f.fieldname];

                  // Render Select Dropdown
                  if (f.type === "select") {
                    return (
                      <Grid item xs={12} sm={6} key={f.fieldname}>
                        <FormControl fullWidth size="medium" error={!!err} required={!!f.required}>
                          <InputLabel>{f.label}</InputLabel>
                          <Select
                            value={val}
                            label={f.label}
                            onChange={(e) => handleDynamicChange(f.fieldname, e.target.value)}
                          >
                            <MenuItem value="">
                              <em>-- Select {f.label} --</em>
                            </MenuItem>
                            {(f.options || []).map((opt) => (
                              <MenuItem key={opt} value={opt}>
                                {opt}
                              </MenuItem>
                            ))}
                          </Select>
                          {err && <FormHelperText>{err}</FormHelperText>}
                        </FormControl>
                      </Grid>
                    );
                  }

                  // Render Multi-line Textarea
                  if (f.type === "textarea") {
                    return (
                      <Grid item xs={12} key={f.fieldname}>
                        <TextField
                          fullWidth
                          multiline
                          rows={3}
                          label={f.label}
                          value={val}
                          onChange={(e) => handleDynamicChange(f.fieldname, e.target.value)}
                          required={!!f.required}
                          error={!!err}
                          helperText={err}
                        />
                      </Grid>
                    );
                  }

                  // Render Date Input
                  if (f.type === "date") {
                    return (
                      <Grid item xs={12} sm={6} key={f.fieldname}>
                        <TextField
                          fullWidth
                          type="date"
                          label={f.label}
                          InputLabelProps={{ shrink: true }}
                          value={val}
                          onChange={(e) => handleDynamicChange(f.fieldname, e.target.value)}
                          required={!!f.required}
                          error={!!err}
                          helperText={err}
                        />
                      </Grid>
                    );
                  }

                  // Default Text / Number / Email / Tel Input
                  return (
                    <Grid item xs={12} sm={6} key={f.fieldname}>
                      <TextField
                        fullWidth
                        type={f.type || "text"}
                        label={f.label}
                        value={val}
                        onChange={(e) => handleDynamicChange(f.fieldname, e.target.value)}
                        required={!!f.required}
                        error={!!err}
                        helperText={err}
                      />
                    </Grid>
                  );
                })}
              </Grid>
            </Paper>
          ));
        })()}

        {/* Modular Section: Photo & Signature Uploads */}
        {(formConfig?.includePhoto || formConfig?.includeSignature) && (
          <Paper elevation={2} sx={{ p: 4, mb: 4, borderRadius: 2 }}>
            <Typography variant="h6" fontWeight="bold" color="#1e3c72" gutterBottom>
              Photographs & Verification Documents
            </Typography>
            <Typography variant="caption" color="textSecondary" display="block" sx={{ mb: 3 }}>
              (Note: Upload files in .gif/.jpg/.png format and file size should be less than 300 kb)
            </Typography>

            <Grid container spacing={3}>
              {formConfig.includePhoto && (
                <Grid item xs={12} sm={6}>
                  <Card variant="outlined" sx={{ p: 2, textAlign: "center" }}>
                    <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                      Photograph*
                    </Typography>
                    {photoPreview ? (
                      <Box sx={{ my: 1, position: "relative" }}>
                        <img
                          src={photoPreview}
                          alt="Applicant Document"
                          style={{ height: 140, maxWidth: "100%", objectFit: "contain", borderRadius: 4 }}
                        />
                        <Box sx={{ mt: 1 }}>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => {
                              setPhotoPreview("");
                              setPhotolink("");
                            }}
                          >
                            <DeleteIcon fontSize="small" /> Remove
                          </IconButton>
                        </Box>
                      </Box>
                    ) : (
                      <Box sx={{ my: 2 }}>
                        <Button
                          variant="outlined"
                          component="label"
                          startIcon={<CloudUploadIcon />}
                          disabled={photoUploading}
                        >
                          {photoUploading ? "Uploading..." : "Choose File"}
                          <input type="file" accept="image/*" hidden onChange={handlePhotoSelect} />
                        </Button>
                      </Box>
                    )}
                    <Typography variant="caption" color="textSecondary" display="block">
                      Recent passport size photo
                    </Typography>
                  </Card>
                </Grid>
              )}

              {formConfig.includeSignature && (
                <Grid item xs={12} sm={6}>
                  <Card variant="outlined" sx={{ p: 2, textAlign: "center" }}>
                    <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                      Signature*
                    </Typography>
                    {signaturePreview ? (
                      <Box sx={{ my: 1, position: "relative" }}>
                        <img
                          src={signaturePreview}
                          alt="Specimen"
                          style={{ height: 90, maxWidth: "100%", objectFit: "contain", border: "1px dashed #ccc", padding: 4 }}
                        />
                        <Box sx={{ mt: 1 }}>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => {
                              setSignaturePreview("");
                              setSignaturelink("");
                            }}
                          >
                            <DeleteIcon fontSize="small" /> Remove
                          </IconButton>
                        </Box>
                      </Box>
                    ) : (
                      <Box sx={{ my: 2 }}>
                        <Button
                          variant="outlined"
                          component="label"
                          startIcon={<CloudUploadIcon />}
                          disabled={signatureUploading}
                        >
                          {signatureUploading ? "Uploading..." : "Choose File"}
                          <input type="file" accept="image/*,.pdf" hidden onChange={handleSignatureSelect} />
                        </Button>
                      </Box>
                    )}
                    <Typography variant="caption" color="textSecondary" display="block">
                      Clear signature on white paper
                    </Typography>
                  </Card>
                </Grid>
              )}
            </Grid>
          </Paper>
        )}

        {/* Modular Section: Bank Details */}
        {formConfig?.includeBankDetails && (
          <Paper elevation={2} sx={{ p: 4, mb: 4, borderRadius: 2 }}>
            <Typography variant="h6" fontWeight="bold" color="#1e3c72" gutterBottom>
              Bank Details
            </Typography>
            <Typography variant="caption" color="textSecondary" display="block" sx={{ mb: 3 }}>
              Required for evaluation remuneration and disbursement.
            </Typography>

            <Grid container spacing={2.5}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Account Number *"
                  value={bankData.accountnumber}
                  onChange={(e) => handleBankChange("accountnumber", e.target.value)}
                  required
                  error={!!fieldErrors.accountnumber}
                  helperText={fieldErrors.accountnumber}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Confirm Account Number *"
                  value={bankData.confirmaccountnumber}
                  onChange={(e) => handleBankChange("confirmaccountnumber", e.target.value)}
                  required
                  error={!!fieldErrors.confirmaccountnumber}
                  helperText={fieldErrors.confirmaccountnumber}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Account Holder's Name *"
                  value={bankData.accountholdername}
                  onChange={(e) => handleBankChange("accountholdername", e.target.value)}
                  required
                  error={!!fieldErrors.accountholdername}
                  helperText={fieldErrors.accountholdername}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Bank Name *"
                  value={bankData.bankname}
                  onChange={(e) => handleBankChange("bankname", e.target.value)}
                  required
                  error={!!fieldErrors.bankname}
                  helperText={fieldErrors.bankname}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="IFSC Code *"
                  value={bankData.ifsccode}
                  onChange={(e) => handleBankChange("ifsccode", e.target.value.toUpperCase())}
                  required
                  error={!!fieldErrors.ifsccode}
                  helperText={fieldErrors.ifsccode}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Confirm IFSC Code *"
                  value={bankData.confirmifsccode}
                  onChange={(e) => handleBankChange("confirmifsccode", e.target.value.toUpperCase())}
                  required
                  error={!!fieldErrors.confirmifsccode}
                  helperText={fieldErrors.confirmifsccode}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Branch Name *"
                  value={bankData.branchname}
                  onChange={(e) => handleBankChange("branchname", e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="PAN Number *"
                  value={bankData.pancardnumber}
                  onChange={(e) => handleBankChange("pancardnumber", e.target.value.toUpperCase())}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 0.5 }}>
                  Upload PAN Card *
                </Typography>
                <Typography variant="caption" color="textSecondary" display="block" sx={{ mb: 1 }}>
                  (Note: Upload files in .gif/.jpg/.png/.pdf format and file size should be less than 300 kb)
                </Typography>
                {pancardPreview ? (
                  <Box display="flex" alignItems="center" gap={1}>
                    <Chip label="PAN Card Selected" color="success" size="small" />
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => {
                        setPancardPreview("");
                        setPancardlink("");
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                ) : (
                  <Button
                    variant="outlined"
                    component="label"
                    startIcon={<CloudUploadIcon />}
                    disabled={pancardUploading}
                  >
                    {pancardUploading ? "Uploading..." : "Choose File"}
                    <input type="file" accept="image/*,.pdf" hidden onChange={handlePanCardSelect} />
                  </Button>
                )}
              </Grid>
            </Grid>
          </Paper>
        )}

        {/* Declaration & Submit Button */}
        <Paper elevation={3} sx={{ p: 3, textAlign: "center", borderRadius: 2 }}>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            By clicking submit, I certify that the information entered above is correct and genuine.
          </Typography>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            size="large"
            disabled={submitting}
            sx={{ px: 6, py: 1.5, fontSize: "16px", fontWeight: "bold", background: "linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)" }}
          >
            {submitting ? <CircularProgress size={26} color="inherit" /> : "Submit Registration"}
          </Button>
        </Paper>
      </form>
    </Container>
  );
}
