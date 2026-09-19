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
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import CloseIcon from "@mui/icons-material/Close";

export default function FacultySelfRegistrationPage() {
  const [searchParams] = useSearchParams();
  const colidParam = searchParams.get("colid") || "1";
  const tokenParam = searchParams.get("token") || "";

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submissionResult, setSubmissionResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [institution, setInstitution] = useState({
    institutionname: "People's University, Bhopal",
    institutioncode: "PU",
    logo: ""
  });
  const [options, setOptions] = useState({
    facultyTypes: ["Regular", "Contractual", "Visiting", "Adjunct", "Guest", "External", "Internal"],
    valuatorTypes: ["Chief Valuator", "Valuator", "Paper Setter", "Moderator", "External Examiner", "Internal Examiner"],
    genders: ["Male", "Female", "Other"]
  });

  // -------------------------------------------------------------
  // Form State
  // -------------------------------------------------------------
  const [formData, setFormData] = useState({
    facultytype: "",
    valuatortype: "",
    gender: "",
    fullname: "",
    email: "",
    confirmemail: "",
    mobile: "",
    confirmmobile: "",
    alternatemobile: "",
    teachingexperience_years: "",
    teachingexperience_months: "",

    // Files
    photolink: "",
    signaturelink: "",
    photoFile: null,
    signatureFile: null,
    photoPreview: "",
    signaturePreview: "",

    // Current Employment
    current_designation: "",
    current_institution: "",
    current_dateofjoining: "",
    current_dateofexit: "till date",
    current_medicalcouncilid: "",
    current_specialization: "",
    current_subjectstaught: "",

    // Past Employments
    pastemployments: [],

    // Bank Details
    accountnumber: "",
    confirmaccountnumber: "",
    accountholdername: "",
    bankname: "",
    ifsccode: "",
    confirmifsccode: "",
    branchname: "",
    pancardnumber: "",
    pancardlink: "",
    pancardFile: null,
    pancardFileName: ""
  });

  // Validation error state for individual fields
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    loadRegistrationMeta();
  }, [colidParam, tokenParam]);

  const loadRegistrationMeta = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await ep1.get("/api/v2/faculty-registration-public/info", {
        params: { colid: colidParam, token: tokenParam }
      });
      if (res.data?.status === "Success") {
        if (res.data.institution) setInstitution(res.data.institution);
        if (res.data.options) setOptions(res.data.options);
        if (res.data.link) {
          setFormData((prev) => ({
            ...prev,
            facultytype: res.data.link.facultytype || prev.facultytype,
            valuatortype: res.data.link.valuatortype || prev.valuatortype
          }));
        }
      } else {
        setErrorMsg(res.data?.message || "Failed to load registration information.");
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Invalid or expired registration link.");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear field error when user types
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  // -------------------------------------------------------------
  // File Upload Handlers (Client check for 300 KB limit)
  // -------------------------------------------------------------
  const handleFileUpload = async (file, type) => {
    if (!file) return;

    if (file.size > 300 * 1024) {
      alert(`File size exceeds 300 KB. Your file is ${(file.size / 1024).toFixed(1)} KB. Please upload a smaller file.`);
      return;
    }

    const uploadPayload = new FormData();
    uploadPayload.append("file", file);

    try {
      const res = await ep1.post("/api/v2/faculty-registration-public/upload", uploadPayload, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      if (res.data?.status === "Success" && res.data.url) {
        if (type === "photo") {
          setFormData((prev) => ({
            ...prev,
            photolink: res.data.url,
            photoFile: file,
            photoPreview: URL.createObjectURL(file)
          }));
        } else if (type === "signature") {
          setFormData((prev) => ({
            ...prev,
            signaturelink: res.data.url,
            signatureFile: file,
            signaturePreview: URL.createObjectURL(file)
          }));
        } else if (type === "pancard") {
          setFormData((prev) => ({
            ...prev,
            pancardlink: res.data.url,
            pancardFile: file,
            pancardFileName: file.name
          }));
        }
      }
    } catch (err) {
      alert(err.response?.data?.message || "File upload failed.");
    }
  };

  // -------------------------------------------------------------
  // Dynamic Past Employment Handlers
  // -------------------------------------------------------------
  const addPastEmployment = () => {
    setFormData((prev) => ({
      ...prev,
      pastemployments: [
        ...prev.pastemployments,
        {
          designation: "",
          institution: "",
          dateofjoining: "",
          dateofexit: "",
          medicalcouncilid: "",
          specialization: "",
          subjectstaught: ""
        }
      ]
    }));
  };

  const updatePastEmployment = (index, field, value) => {
    setFormData((prev) => {
      const list = [...prev.pastemployments];
      list[index] = { ...list[index], [field]: value };
      return { ...prev, pastemployments: list };
    });
  };

  const removePastEmployment = (index) => {
    setFormData((prev) => ({
      ...prev,
      pastemployments: prev.pastemployments.filter((_, i) => i !== index)
    }));
  };

  // -------------------------------------------------------------
  // Validation & Form Submission
  // -------------------------------------------------------------
  const validateForm = () => {
    const errors = {};

    if (!formData.facultytype) errors.facultytype = "Faculty Type is required";
    if (!formData.valuatortype) errors.valuatortype = "Valuator Type is required";
    if (!formData.gender) errors.gender = "Gender is required";
    if (!formData.fullname?.trim()) errors.fullname = "Full Name is required";

    if (!formData.email?.trim()) {
      errors.email = "Email Id is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = "Invalid email format";
    }

    if (!formData.confirmemail?.trim()) {
      errors.confirmemail = "Please confirm your Email Id";
    } else if (formData.email.trim().toLowerCase() !== formData.confirmemail.trim().toLowerCase()) {
      errors.confirmemail = "Confirm Email Id does not match Email Id";
    }

    if (!formData.mobile?.trim()) {
      errors.mobile = "Mobile Number is required";
    } else if (!/^\d{10}$/.test(formData.mobile.trim())) {
      errors.mobile = "Mobile Number must be 10 digits";
    }

    if (!formData.confirmmobile?.trim()) {
      errors.confirmmobile = "Please confirm your Mobile Number";
    } else if (formData.mobile.trim() !== formData.confirmmobile.trim()) {
      errors.confirmmobile = "Confirm Mobile Number does not match Mobile Number";
    }

    if (formData.teachingexperience_years === "" && formData.teachingexperience_months === "") {
      errors.teachingexperience = "Teaching experience is required";
    }

    if (!formData.photolink) errors.photolink = "Photograph upload is required";
    if (!formData.signaturelink) errors.signaturelink = "Signature upload is required";

    // Current Employment
    if (!formData.current_designation?.trim()) errors.current_designation = "Designation is required";
    if (!formData.current_institution?.trim()) errors.current_institution = "Institution is required";
    if (!formData.current_dateofjoining) errors.current_dateofjoining = "Date of Joining is required";
    if (!formData.current_medicalcouncilid?.trim()) errors.current_medicalcouncilid = "Medical/Dental Council ID is required";
    if (!formData.current_specialization?.trim()) errors.current_specialization = "Specialization is required";
    if (!formData.current_subjectstaught?.trim()) errors.current_subjectstaught = "Subject(s) Taught is required";

    // Bank Details
    if (!formData.accountnumber?.trim()) {
      errors.accountnumber = "Account Number is required";
    }
    if (!formData.confirmaccountnumber?.trim()) {
      errors.confirmaccountnumber = "Please confirm your Account Number";
    } else if (formData.accountnumber.trim() !== formData.confirmaccountnumber.trim()) {
      errors.confirmaccountnumber = "Confirm Account Number does not match Account Number";
    }

    if (!formData.accountholdername?.trim()) errors.accountholdername = "Account Holder's Name is required";
    if (!formData.bankname?.trim()) errors.bankname = "Bank Name is required";

    if (!formData.ifsccode?.trim()) {
      errors.ifsccode = "IFSC Code is required";
    }
    if (!formData.confirmifsccode?.trim()) {
      errors.confirmifsccode = "Please confirm IFSC Code";
    } else if (formData.ifsccode.trim().toUpperCase() !== formData.confirmifsccode.trim().toUpperCase()) {
      errors.confirmifsccode = "Confirm IFSC Code does not match IFSC Code";
    }

    if (!formData.branchname?.trim()) errors.branchname = "Branch Name is required";
    if (!formData.pancardnumber?.trim()) errors.pancardnumber = "PAN Number is required";
    if (!formData.pancardlink) errors.pancardlink = "PAN Card upload is required";

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!validateForm()) {
      setErrorMsg("Please correct the highlighted errors before submitting.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        colid: Number(colidParam),
        linktoken: tokenParam,
        facultytype: formData.facultytype,
        valuatortype: formData.valuatortype,
        gender: formData.gender,
        fullname: formData.fullname.trim(),
        email: formData.email.trim().toLowerCase(),
        mobile: formData.mobile.trim(),
        alternatemobile: formData.alternatemobile.trim(),
        teachingexperience_years: Number(formData.teachingexperience_years || 0),
        teachingexperience_months: Number(formData.teachingexperience_months || 0),
        photolink: formData.photolink,
        signaturelink: formData.signaturelink,

        currentemployment: {
          designation: formData.current_designation.trim(),
          institution: formData.current_institution.trim(),
          dateofjoining: formData.current_dateofjoining,
          dateofexit: formData.current_dateofexit || "till date",
          medicalcouncilid: formData.current_medicalcouncilid.trim(),
          specialization: formData.current_specialization.trim(),
          subjectstaught: formData.current_subjectstaught.trim()
        },
        pastemployment: formData.pastemployments,

        accountnumber: formData.accountnumber.trim(),
        accountholdername: formData.accountholdername.trim(),
        bankname: formData.bankname.trim(),
        ifsccode: formData.ifsccode.trim().toUpperCase(),
        branchname: formData.branchname.trim(),
        pancardnumber: formData.pancardnumber.trim().toUpperCase(),
        pancardlink: formData.pancardlink
      };

      const res = await ep1.post("/api/v2/faculty-registration-public/submit", payload);

      if (res.data?.status === "Success") {
        setSubmitted(true);
        setSubmissionResult(res.data.data);
      } else {
        setErrorMsg(res.data?.message || "Submission failed. Please try again.");
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Registration submission failed.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (window.opener) {
      window.close();
    } else {
      window.location.href = "/";
    }
  };

  // -------------------------------------------------------------
  // Loading & Submitted Screens
  // -------------------------------------------------------------
  if (loading) {
    return (
      <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "#f8fafc" }}>
        <CircularProgress size={48} />
      </Box>
    );
  }

  if (submitted) {
    return (
      <Container maxWidth="md" sx={{ py: 8 }}>
        <Paper elevation={3} sx={{ p: 5, textAlign: "center", borderRadius: 3, borderTop: "6px solid #2e7d32" }}>
          <CheckCircleOutlineIcon sx={{ fontSize: 72, color: "#2e7d32", mb: 2 }} />
          <Typography variant="h4" fontWeight="bold" gutterBottom color="#1e293b">
            Registration Submitted Successfully!
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 600, mx: "auto", mb: 3 }}>
            Thank you, <b>{formData.fullname}</b>. Your faculty and valuator registration form has been received and is currently
            under review by the <b>{institution.institutionname}</b> administration.
          </Typography>

          <Card variant="outlined" sx={{ maxWidth: 450, mx: "auto", mb: 4, bgcolor: "#f8fafc" }}>
            <CardContent sx={{ textAlign: "left" }}>
              <Typography variant="subtitle2" color="text.secondary">Application Summary</Typography>
              <Typography variant="body2" sx={{ mt: 1 }}><b>Name:</b> {formData.fullname}</Typography>
              <Typography variant="body2"><b>Email:</b> {formData.email}</Typography>
              <Typography variant="body2"><b>Mobile:</b> {formData.mobile}</Typography>
              <Typography variant="body2"><b>Faculty Type:</b> {formData.facultytype}</Typography>
              <Typography variant="body2"><b>Valuator Type:</b> {formData.valuatortype}</Typography>
              <Typography variant="body2"><b>Status:</b> <Chip label="Pending Approval" color="warning" size="small" /></Typography>
            </CardContent>
          </Card>

          <Alert severity="info" sx={{ maxWidth: 600, mx: "auto", mb: 4, textAlign: "left" }}>
            Once the administration approves your application, your user credentials (User ID and temporary password) will be automatically sent to <b>{formData.email}</b>.
          </Alert>

          <Button variant="contained" color="primary" onClick={handleClose} sx={{ px: 4, py: 1 }}>
            Close
          </Button>
        </Paper>
      </Container>
    );
  }

  // -------------------------------------------------------------
  // Registration Form Render (Matching PDF pages)
  // -------------------------------------------------------------
  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#f1f5f9", py: 4 }}>
      <Container maxWidth="lg">
        {/* Header Bar */}
        <Paper
          elevation={1}
          sx={{
            p: 3,
            mb: 3,
            borderRadius: 2,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderLeft: "6px solid #1976d2"
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            {institution.logo && (
              <img
                src={institution.logo}
                alt="Logo"
                style={{ maxHeight: 50, maxWidth: 100, objectFit: "contain" }}
              />
            )}
            <Box>
              <Typography variant="h5" fontWeight="bold" color="#0f172a">
                Registration Form
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {institution.institutionname}
              </Typography>
            </Box>
          </Box>
          <Button
            variant="outlined"
            color="error"
            size="small"
            startIcon={<CloseIcon />}
            onClick={handleClose}
            sx={{ textTransform: "none" }}
          >
            Close
          </Button>
        </Paper>

        {errorMsg && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setErrorMsg("")}>
            {errorMsg}
          </Alert>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {/* ========================================================= */}
          {/* PAGE 1: Personal & Basic Details                          */}
          {/* ========================================================= */}
          <Paper elevation={2} sx={{ p: 4, mb: 3, borderRadius: 2 }}>
            <Typography variant="h6" fontWeight="bold" color="#1e293b" gutterBottom>
              Basic Information
            </Typography>
            <Divider sx={{ mb: 3 }} />

            <Grid container spacing={2.5}>
              {/* Faculty Type */}
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  select
                  fullWidth
                  required
                  label="Faculty Type"
                  value={formData.facultytype}
                  onChange={(e) => handleInputChange("facultytype", e.target.value)}
                  error={Boolean(fieldErrors.facultytype)}
                  helperText={fieldErrors.facultytype}
                  size="small"
                >
                  <MenuItem value="">---Select---</MenuItem>
                  {options.facultyTypes.map((type) => (
                    <MenuItem key={type} value={type}>
                      {type}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              {/* Valuator Type */}
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  select
                  fullWidth
                  required
                  label="Valuator Type"
                  value={formData.valuatortype}
                  onChange={(e) => handleInputChange("valuatortype", e.target.value)}
                  error={Boolean(fieldErrors.valuatortype)}
                  helperText={fieldErrors.valuatortype}
                  size="small"
                >
                  <MenuItem value="">---Select---</MenuItem>
                  {options.valuatorTypes.map((type) => (
                    <MenuItem key={type} value={type}>
                      {type}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              {/* Gender */}
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  select
                  fullWidth
                  required
                  label="Gender"
                  value={formData.gender}
                  onChange={(e) => handleInputChange("gender", e.target.value)}
                  error={Boolean(fieldErrors.gender)}
                  helperText={fieldErrors.gender}
                  size="small"
                >
                  <MenuItem value="">---Select---</MenuItem>
                  {options.genders.map((g) => (
                    <MenuItem key={g} value={g}>
                      {g}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              {/* Full Name */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  required
                  label="Full Name"
                  placeholder="Enter full name as per official records"
                  value={formData.fullname}
                  onChange={(e) => handleInputChange("fullname", e.target.value)}
                  error={Boolean(fieldErrors.fullname)}
                  helperText={fieldErrors.fullname}
                  size="small"
                />
              </Grid>

              {/* Email & Confirm Email */}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  required
                  type="email"
                  label="Email Id"
                  placeholder="example@domain.com"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  error={Boolean(fieldErrors.email)}
                  helperText={fieldErrors.email}
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  required
                  type="email"
                  label="Confirm Email Id"
                  placeholder="Re-enter your email"
                  value={formData.confirmemail}
                  onChange={(e) => handleInputChange("confirmemail", e.target.value)}
                  error={Boolean(fieldErrors.confirmemail)}
                  helperText={fieldErrors.confirmemail}
                  size="small"
                />
              </Grid>

              {/* Mobile, Confirm Mobile, Alternate Mobile */}
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  required
                  label="Mobile Number"
                  placeholder="10-digit mobile number"
                  value={formData.mobile}
                  onChange={(e) => handleInputChange("mobile", e.target.value.replace(/\D/g, "").slice(0, 10))}
                  error={Boolean(fieldErrors.mobile)}
                  helperText={fieldErrors.mobile}
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  required
                  label="Confirm Mobile Number"
                  placeholder="Re-enter mobile number"
                  value={formData.confirmmobile}
                  onChange={(e) => handleInputChange("confirmmobile", e.target.value.replace(/\D/g, "").slice(0, 10))}
                  error={Boolean(fieldErrors.confirmmobile)}
                  helperText={fieldErrors.confirmmobile}
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Alternate Mobile Number"
                  placeholder="Optional alternate mobile"
                  value={formData.alternatemobile}
                  onChange={(e) => handleInputChange("alternatemobile", e.target.value.replace(/\D/g, "").slice(0, 10))}
                  size="small"
                />
              </Grid>

              {/* Teaching Experience */}
              <Grid item xs={12}>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: "bold" }}>
                  Teaching Experience *
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6} sm={3}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Years"
                      value={formData.teachingexperience_years}
                      onChange={(e) => handleInputChange("teachingexperience_years", e.target.value)}
                      error={Boolean(fieldErrors.teachingexperience)}
                      size="small"
                      inputProps={{ min: 0, max: 60 }}
                    />
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Months"
                      value={formData.teachingexperience_months}
                      onChange={(e) => handleInputChange("teachingexperience_months", e.target.value)}
                      error={Boolean(fieldErrors.teachingexperience)}
                      size="small"
                      inputProps={{ min: 0, max: 11 }}
                    />
                  </Grid>
                </Grid>
                {fieldErrors.teachingexperience && (
                  <Typography variant="caption" color="error">
                    {fieldErrors.teachingexperience}
                  </Typography>
                )}
              </Grid>
            </Grid>
          </Paper>

          {/* ========================================================= */}
          {/* PAGE 2: Uploads & Employment Profile                      */}
          {/* ========================================================= */}
          <Paper elevation={2} sx={{ p: 4, mb: 3, borderRadius: 2 }}>
            <Typography variant="h6" fontWeight="bold" color="#1e293b" gutterBottom>
              Photograph & Signature Upload
            </Typography>
            <Divider sx={{ mb: 3 }} />

            <Grid container spacing={3}>
              {/* Photograph */}
              <Grid item xs={12} md={6}>
                <Box
                  sx={{
                    p: 2.5,
                    border: "1px dashed #cbd5e1",
                    borderRadius: 2,
                    textAlign: "center",
                    bgcolor: "#f8fafc"
                  }}
                >
                  <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                    Photograph *
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }}>
                    (Note: Upload files in .gif/.jpg/.png format and file size should be less than 300 kb)
                  </Typography>

                  <input
                    accept=".jpg,.jpeg,.png,.gif"
                    id="photo-upload-input"
                    type="file"
                    style={{ display: "none" }}
                    onChange={(e) => handleFileUpload(e.target.files?.[0], "photo")}
                  />
                  <label htmlFor="photo-upload-input">
                    <Button variant="outlined" component="span" startIcon={<CloudUploadIcon />} size="small">
                      Choose File
                    </Button>
                  </label>

                  {formData.photoPreview && (
                    <Box sx={{ mt: 2 }}>
                      <img
                        src={formData.photoPreview}
                        alt="Photo preview"
                        style={{ height: 110, width: 100, objectFit: "cover", borderRadius: 4, border: "1px solid #ccc" }}
                      />
                    </Box>
                  )}
                  {fieldErrors.photolink && (
                    <Typography variant="caption" color="error" display="block" sx={{ mt: 1 }}>
                      {fieldErrors.photolink}
                    </Typography>
                  )}
                </Box>
              </Grid>

              {/* Signature */}
              <Grid item xs={12} md={6}>
                <Box
                  sx={{
                    p: 2.5,
                    border: "1px dashed #cbd5e1",
                    borderRadius: 2,
                    textAlign: "center",
                    bgcolor: "#f8fafc"
                  }}
                >
                  <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                    Signature *
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }}>
                    (Note: Upload files in .gif/.jpg/.png format and file size should be less than 300 kb)
                  </Typography>

                  <input
                    accept=".jpg,.jpeg,.png,.gif"
                    id="signature-upload-input"
                    type="file"
                    style={{ display: "none" }}
                    onChange={(e) => handleFileUpload(e.target.files?.[0], "signature")}
                  />
                  <label htmlFor="signature-upload-input">
                    <Button variant="outlined" component="span" startIcon={<CloudUploadIcon />} size="small">
                      Choose File
                    </Button>
                  </label>

                  {formData.signaturePreview && (
                    <Box sx={{ mt: 2 }}>
                      <img
                        src={formData.signaturePreview}
                        alt="Signature preview"
                        style={{ height: 60, width: 140, objectFit: "contain", borderRadius: 4, border: "1px solid #ccc" }}
                      />
                    </Box>
                  )}
                  {fieldErrors.signaturelink && (
                    <Typography variant="caption" color="error" display="block" sx={{ mt: 1 }}>
                      {fieldErrors.signaturelink}
                    </Typography>
                  )}
                </Box>
              </Grid>
            </Grid>

            {/* Employment Profile */}
            <Box sx={{ mt: 4, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Typography variant="h6" fontWeight="bold" color="#1e293b">
                Faculty Employment Profile
              </Typography>
              <Button
                variant="outlined"
                color="primary"
                size="small"
                startIcon={<AddIcon />}
                onClick={addPastEmployment}
              >
                Add More +
              </Button>
            </Box>
            <Divider sx={{ my: 2 }} />

            {/* Current Employment */}
            <Typography variant="subtitle2" fontWeight="bold" color="#334155" sx={{ mb: 1.5 }}>
              Current Employment
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  required
                  label="Designation"
                  size="small"
                  value={formData.current_designation}
                  onChange={(e) => handleInputChange("current_designation", e.target.value)}
                  error={Boolean(fieldErrors.current_designation)}
                  helperText={fieldErrors.current_designation}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  required
                  label="Institution"
                  size="small"
                  value={formData.current_institution}
                  onChange={(e) => handleInputChange("current_institution", e.target.value)}
                  error={Boolean(fieldErrors.current_institution)}
                  helperText={fieldErrors.current_institution}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <TextField
                  fullWidth
                  required
                  type="date"
                  label="Date of Joining"
                  InputLabelProps={{ shrink: true }}
                  size="small"
                  value={formData.current_dateofjoining}
                  onChange={(e) => handleInputChange("current_dateofjoining", e.target.value)}
                  error={Boolean(fieldErrors.current_dateofjoining)}
                  helperText={fieldErrors.current_dateofjoining}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <TextField
                  fullWidth
                  label="Date of Exit"
                  disabled
                  size="small"
                  value={formData.current_dateofexit}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <TextField
                  fullWidth
                  required
                  label="Medical/Dental Council ID"
                  size="small"
                  value={formData.current_medicalcouncilid}
                  onChange={(e) => handleInputChange("current_medicalcouncilid", e.target.value)}
                  error={Boolean(fieldErrors.current_medicalcouncilid)}
                  helperText={fieldErrors.current_medicalcouncilid}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  required
                  label="Specialization"
                  size="small"
                  value={formData.current_specialization}
                  onChange={(e) => handleInputChange("current_specialization", e.target.value)}
                  error={Boolean(fieldErrors.current_specialization)}
                  helperText={fieldErrors.current_specialization}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  required
                  label="Subject(s) Taught"
                  placeholder="e.g. Anatomy, Physiology"
                  size="small"
                  value={formData.current_subjectstaught}
                  onChange={(e) => handleInputChange("current_subjectstaught", e.target.value)}
                  error={Boolean(fieldErrors.current_subjectstaught)}
                  helperText={fieldErrors.current_subjectstaught}
                />
              </Grid>
            </Grid>

            {/* Past Employment (If any) */}
            {formData.pastemployments.length > 0 && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle2" fontWeight="bold" color="#334155" sx={{ mb: 1.5 }}>
                  Past Employment (If any)
                </Typography>
                {formData.pastemployments.map((past, idx) => (
                  <Card variant="outlined" key={idx} sx={{ p: 2, mb: 2, bgcolor: "#f8fafc" }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1.5 }}>
                      <Typography variant="caption" fontWeight="bold">
                        Past Experience #{idx + 1}
                      </Typography>
                      <IconButton size="small" color="error" onClick={() => removePastEmployment(idx)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6} md={3}>
                        <TextField
                          fullWidth
                          label="Designation"
                          size="small"
                          value={past.designation}
                          onChange={(e) => updatePastEmployment(idx, "designation", e.target.value)}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <TextField
                          fullWidth
                          label="Institution"
                          size="small"
                          value={past.institution}
                          onChange={(e) => updatePastEmployment(idx, "institution", e.target.value)}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6} md={2}>
                        <TextField
                          fullWidth
                          type="date"
                          label="Date of Joining"
                          InputLabelProps={{ shrink: true }}
                          size="small"
                          value={past.dateofjoining}
                          onChange={(e) => updatePastEmployment(idx, "dateofjoining", e.target.value)}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6} md={2}>
                        <TextField
                          fullWidth
                          type="date"
                          label="Date of Exit"
                          InputLabelProps={{ shrink: true }}
                          size="small"
                          value={past.dateofexit}
                          onChange={(e) => updatePastEmployment(idx, "dateofexit", e.target.value)}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6} md={2}>
                        <TextField
                          fullWidth
                          label="Council ID"
                          size="small"
                          value={past.medicalcouncilid}
                          onChange={(e) => updatePastEmployment(idx, "medicalcouncilid", e.target.value)}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Specialization"
                          size="small"
                          value={past.specialization}
                          onChange={(e) => updatePastEmployment(idx, "specialization", e.target.value)}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Subject(s) Taught"
                          size="small"
                          value={past.subjectstaught}
                          onChange={(e) => updatePastEmployment(idx, "subjectstaught", e.target.value)}
                        />
                      </Grid>
                    </Grid>
                  </Card>
                ))}
              </Box>
            )}
          </Paper>

          {/* ========================================================= */}
          {/* PAGE 3: Bank Details & PAN Card                           */}
          {/* ========================================================= */}
          <Paper elevation={2} sx={{ p: 4, mb: 3, borderRadius: 2 }}>
            <Typography variant="h6" fontWeight="bold" color="#1e293b" gutterBottom>
              Bank Details & PAN Card
            </Typography>
            <Divider sx={{ mb: 3 }} />

            <Grid container spacing={2.5}>
              {/* Account Number & Confirm Account Number */}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  required
                  label="Account Number"
                  placeholder="Enter bank account number"
                  value={formData.accountnumber}
                  onChange={(e) => handleInputChange("accountnumber", e.target.value)}
                  error={Boolean(fieldErrors.accountnumber)}
                  helperText={fieldErrors.accountnumber}
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  required
                  label="Confirm Account Number"
                  placeholder="Re-enter bank account number"
                  value={formData.confirmaccountnumber}
                  onChange={(e) => handleInputChange("confirmaccountnumber", e.target.value)}
                  error={Boolean(fieldErrors.confirmaccountnumber)}
                  helperText={fieldErrors.confirmaccountnumber}
                  size="small"
                />
              </Grid>

              {/* Account Holder's Name & Bank Name */}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  required
                  label="Account Holder's Name"
                  placeholder="As per bank passbook / cheque"
                  value={formData.accountholdername}
                  onChange={(e) => handleInputChange("accountholdername", e.target.value)}
                  error={Boolean(fieldErrors.accountholdername)}
                  helperText={fieldErrors.accountholdername}
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  required
                  label="Bank Name"
                  placeholder="e.g. State Bank of India, HDFC"
                  value={formData.bankname}
                  onChange={(e) => handleInputChange("bankname", e.target.value)}
                  error={Boolean(fieldErrors.bankname)}
                  helperText={fieldErrors.bankname}
                  size="small"
                />
              </Grid>

              {/* IFSC Code & Confirm IFSC Code */}
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  required
                  label="IFSC Code"
                  placeholder="e.g. SBIN0001234"
                  value={formData.ifsccode}
                  onChange={(e) => handleInputChange("ifsccode", e.target.value.toUpperCase())}
                  error={Boolean(fieldErrors.ifsccode)}
                  helperText={fieldErrors.ifsccode}
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  required
                  label="Confirm IFSC Code"
                  placeholder="Re-enter IFSC code"
                  value={formData.confirmifsccode}
                  onChange={(e) => handleInputChange("confirmifsccode", e.target.value.toUpperCase())}
                  error={Boolean(fieldErrors.confirmifsccode)}
                  helperText={fieldErrors.confirmifsccode}
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  required
                  label="Branch Name"
                  placeholder="e.g. Main Branch"
                  value={formData.branchname}
                  onChange={(e) => handleInputChange("branchname", e.target.value)}
                  error={Boolean(fieldErrors.branchname)}
                  helperText={fieldErrors.branchname}
                  size="small"
                />
              </Grid>

              {/* PAN Number */}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  required
                  label="PAN Number"
                  placeholder="e.g. ABCDE1234F"
                  value={formData.pancardnumber}
                  onChange={(e) => handleInputChange("pancardnumber", e.target.value.toUpperCase().slice(0, 10))}
                  error={Boolean(fieldErrors.pancardnumber)}
                  helperText={fieldErrors.pancardnumber}
                  size="small"
                />
              </Grid>

              {/* Upload PAN Card */}
              <Grid item xs={12} sm={6}>
                <Box
                  sx={{
                    p: 2,
                    border: "1px dashed #cbd5e1",
                    borderRadius: 2,
                    bgcolor: "#f8fafc"
                  }}
                >
                  <Typography variant="subtitle2" fontWeight="bold">
                    Upload PAN Card *
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                    (Note: Upload files in .gif/.jpg/.png/.pdf format and file size should be less than 300 kb)
                  </Typography>

                  <input
                    accept=".jpg,.jpeg,.png,.gif,.pdf"
                    id="pancard-upload-input"
                    type="file"
                    style={{ display: "none" }}
                    onChange={(e) => handleFileUpload(e.target.files?.[0], "pancard")}
                  />
                  <label htmlFor="pancard-upload-input">
                    <Button variant="outlined" component="span" startIcon={<CloudUploadIcon />} size="small">
                      Choose File
                    </Button>
                  </label>

                  {formData.pancardFileName && (
                    <Typography variant="body2" sx={{ mt: 1, color: "success.main", fontWeight: "medium" }}>
                      Selected: {formData.pancardFileName}
                    </Typography>
                  )}
                  {fieldErrors.pancardlink && (
                    <Typography variant="caption" color="error" display="block" sx={{ mt: 0.5 }}>
                      {fieldErrors.pancardlink}
                    </Typography>
                  )}
                </Box>
              </Grid>
            </Grid>
          </Paper>

          {/* Form Actions */}
          <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2, mt: 3 }}>
            <Button
              variant="outlined"
              color="inherit"
              size="large"
              onClick={handleClose}
              sx={{ px: 4, py: 1.2 }}
            >
              Close
            </Button>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              size="large"
              disabled={submitting}
              sx={{ px: 5, py: 1.2, fontWeight: "bold" }}
            >
              {submitting ? <CircularProgress size={24} color="inherit" /> : "Submit"}
            </Button>
          </Box>
        </form>
      </Container>
    </Box>
  );
}
