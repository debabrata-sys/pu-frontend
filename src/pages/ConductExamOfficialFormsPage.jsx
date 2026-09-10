import React, { useEffect, useState, useMemo } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Divider,
  Grid,
  MenuItem,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
  Alert,
  IconButton,
  Tooltip
} from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import DescriptionIcon from '@mui/icons-material/Description';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import PaymentsIcon from '@mui/icons-material/Payments';
import SettingsIcon from '@mui/icons-material/Settings';
import RefreshIcon from '@mui/icons-material/Refresh';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { Link as RouterLink } from 'react-router-dom';
import MenuPageShell from './MenuPageShell';
import ep1 from '../api/ep1';
import global1 from './global1';
import { useExamConfig } from '../components/conductExam/ExamDocumentHeader';

const money = (value) => Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });

export default function ConductExamOfficialFormsPage() {
  const colid = global1.colid || 1;
  const { config: examConfig, loading: configLoading, reload: reloadConfig } = useExamConfig(colid);

  const [activeTab, setActiveTab] = useState(0); // 0: Appointment Letter, 1: Acceptance Form, 2: Declaration Form, 3: Remuneration Bill
  const [role, setRole] = useState('papersetter'); // 'papersetter' | 'moderator' | 'examiner'
  const [moduleMode, setModuleMode] = useState('conductexam'); // 'conductexam' | 'conductexam2'
  const [loadingList, setLoadingList] = useState(false);
  const [candidatesList, setCandidatesList] = useState([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);

  // Form Fields with dynamic default fallbacks
  const [formData, setFormData] = useState({
    refNo: 'PU/COE/Conf/PS/2026/357',
    date: new Date().toLocaleDateString('en-GB'),
    examinerCode: 'MED-0380',
    confNo: 'X/2026/357/A',
    vNo: '2026/089',
    examinerName: 'Dr Ashish Jain',
    designation: 'Professor & Head',
    department: 'Department of Biochemistry',
    institute: 'People’s College of Medical Sciences & Research Centre',
    residentialAddress: 'People’s Campus, Bhanpur, Bhopal, Madhya Pradesh',
    residentialPin: '462037',
    workingAddress: 'Bhanpur, Bhopal, Madhya Pradesh',
    workingPin: '462037',
    workingPhone: '0755-4005402',
    mobileNo: '9876543210',
    email: 'ashish.jain@peoplesuniversity.edu.in',
    qualification: 'MD (Biochemistry), Ph.D',
    specialization: 'Biochemistry & Medical Biotechnology',
    experienceUg: '12 Years',
    experiencePg: '8 Years',
    interestArea: 'Clinical Biochemistry & Molecular Genetics',
    program: 'MD BIO CHEMISTRY',
    paperCode: 'MD-1009',
    paperName: 'Biomolecules, Principles of Biophysics and its biomedical importance, Cell biology, Fluid, electrolyte and acid-base balance, Analytical techniques and instrumentation, Biostatistics and research methodology, Basics of medical education in teaching',
    programSemesterYear: 'MD BIO CHEMISTRY FINAL YEAR',
    semester: 'Final Year',
    examType: 'Main',
    examMonthYear: 'September 2026',
    examDate: new Date().toLocaleDateString('en-GB'),
    specialMaterials: 'Nil / Non-programmable Scientific Calculator only',
    letterNo: 'PU/COE/Conf/PS/2026/357',
    letterDate: new Date().toLocaleDateString('en-GB'),
    billRate: '1500',
    billQuantity: '1',
    billAmount: '1500',
    panNo: 'ABCDE1234F',
    accountNo: '300123456789',
    ifscCode: 'SBIN0012345',
    bankName: 'State Bank of India',
    bankBranch: 'People’s Campus Bhanpur'
  });

  // Effective Institution details strictly from Exam Configuration
  const effectiveInst = useMemo(() => {
    return {
      institutionname: examConfig?.institutionname || 'PEOPLE’S UNIVERSITY',
      affiliatedboard: examConfig?.affiliatedboard || 'Established Under MP Act 17 of 2007 & Covered u/s 2(f) UGC Act',
      address: examConfig?.address || 'People’s Campus, Bhanpur, Bhopal-462037',
      phone: examConfig?.phone || '0755-4005402',
      email: examConfig?.email || 'coe@peoplesuniversity.edu.in',
      website: examConfig?.website || 'www.peoplesuniversity.edu.in',
      logo: examConfig?.logo || '',
      coename: examConfig?.coename || '',
      coetitle: examConfig?.coetitle || 'Assistant Registrar(Confidential)',
      vcname: examConfig?.vcname || '',
      vctitle: examConfig?.vctitle || 'Vice Chancellor'
    };
  }, [examConfig]);

  // Load candidate list according to role & moduleMode
  useEffect(() => {
    const fetchCandidates = async () => {
      setLoadingList(true);
      try {
        let endpoint = '';
        if (moduleMode === 'conductexam2') {
          endpoint = role === 'moderator' ? '/api/v2/conductexam2/moderators' : '/api/v2/conductexam2/papersetters';
        } else {
          if (role === 'moderator') {
            endpoint = '/api/v2/conductexam/moderators';
          } else if (role === 'examiner') {
            endpoint = '/api/v2/conductexam/examiners';
          } else {
            endpoint = '/api/v2/conductexam/papersetters';
          }
        }
        const res = await ep1.get(endpoint, { params: { colid } });
        const list = res.data?.data || res.data?.rows || (Array.isArray(res.data) ? res.data : []);
        setCandidatesList(list);
        if (list.length > 0 && !selectedCandidateId) {
          applyCandidateData(list[0], role);
          setSelectedCandidateId(list[0]._id || list[0].id);
        }
      } catch (err) {
        console.warn('Unable to load candidates from API, using default/sample data:', err.message);
      } finally {
        setLoadingList(false);
      }
    };

    fetchCandidates();
  }, [role, moduleMode, colid]);

  // Apply candidate data to form
  const applyCandidateData = (item, currentRole) => {
    if (!item) return;
    const name = item.papersettername || item.moderatorname || item.examinername || item.name || '';
    const email = item.papersetteremail || item.moderatoremail || item.examineremail || item.email || '';
    const mobile = item.papersetterphone || item.moderatorphone || item.examinerphone || item.mobile || item.phone || '';
    const pCode = item.coursecode || item.papercode || item.subjectcode || '';
    const pName = item.coursename || item.course || item.papername || item.subject || '';
    const code = item.examinercode || (pCode ? `${pCode}-${currentRole === 'moderator' ? 'MOD' : 'PS'}` : 'EXAM-001');

    setFormData((prev) => ({
      ...prev,
      examinerName: name || prev.examinerName,
      email: email || prev.email,
      mobileNo: mobile || prev.mobileNo,
      paperCode: pCode || prev.paperCode,
      paperName: pName || prev.paperName,
      examinerCode: code || prev.examinerCode,
      program: item.program || item.programcode || prev.program,
      programSemesterYear: item.program || item.semester || prev.programSemesterYear,
      semester: item.semester || prev.semester,
      confNo: `X/2026/${Math.floor(100 + Math.random() * 900)}/A`,
      refNo: `PU/COE/Conf/${currentRole === 'moderator' ? 'MOD' : 'PS'}/2026/${Math.floor(100 + Math.random() * 900)}`,
      letterNo: `PU/COE/Conf/${currentRole === 'moderator' ? 'MOD' : 'PS'}/2026/${Math.floor(100 + Math.random() * 900)}`,
      vNo: `2026/${Math.floor(100 + Math.random() * 900)}`
    }));
  };

  const handleCandidateChange = (e) => {
    const id = e.target.value;
    setSelectedCandidateId(id);
    const found = candidatesList.find((c) => (c._id || c.id) === id);
    if (found) {
      applyCandidateData(found, role);
    }
  };

  const handleFieldChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handlePrint = () => {
    window.print();
  };

  const roleTitleLabel = role === 'moderator' ? 'Moderator' : role === 'examiner' ? 'Valuator / Examiner' : 'Paper-Setter';

  return (
    <MenuPageShell title="Official Examination Forms & Orders">
      {/* Print Styles: Exact A4 Portrait with zero browser clutter */}
      <style>{`
        @page {
          size: A4 portrait;
          margin: 6mm 8mm;
        }

        @media print {
          body, html {
            background: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
            color: #000000 !important;
            font-family: Arial, Helvetica, sans-serif !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* Hide all application shells, navigation, tabs, control panels, headers */
          header, nav, aside, .MuiAppBar-root, .MuiDrawer-root, .no-print, [role="navigation"], .MuiTabs-root {
            display: none !important;
          }

          .printable-form-container {
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 auto !important;
            width: 100% !important;
            max-width: 100% !important;
            display: block !important;
          }

          .exact-pdf-box {
            border: 2px solid #000000 !important;
            box-sizing: border-box !important;
            padding: 6px 10px !important;
          }
          .bill-page-1 {
            page-break-after: always !important;
            break-after: page !important;
          }
          .bill-page-2 {
            page-break-before: always !important;
            break-before: page !important;
            margin-top: 0 !important;
            padding: 24px 28px !important;
          }
        }

        .exact-pdf-box {
          border: 2px solid #000000;
          box-sizing: border-box;
          padding: 10px 14px;
          background: #ffffff;
          color: #000000;
          font-family: Arial, Helvetica, sans-serif;
        }
      `}</style>

      <Box sx={{ p: { xs: 1.5, sm: 2.5 } }}>
        {/* ================= TOP CONTROL BAR (HIDDEN IN PRINT) ================= */}
        <Paper elevation={2} sx={{ p: 2, mb: 3, borderRadius: 2, bgcolor: '#ffffff' }} className="no-print">
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={3}>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 1 }}>
                <DescriptionIcon color="primary" /> Official Forms
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Exact PDF Format • 100% Exam Config Driven
              </Typography>
            </Grid>

            {/* Module Selector */}
            <Grid item xs={6} sm={3} md={2}>
              <TextField
                select
                fullWidth
                size="small"
                label="Module"
                value={moduleMode}
                onChange={(e) => setModuleMode(e.target.value)}
              >
                <MenuItem value="conductexam">Conduct Exam</MenuItem>
                <MenuItem value="conductexam2">QPM 2</MenuItem>
              </TextField>
            </Grid>

            {/* Role Selector */}
            <Grid item xs={6} sm={3} md={2}>
              <TextField
                select
                fullWidth
                size="small"
                label="Role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <MenuItem value="papersetter">Paper Setter</MenuItem>
                <MenuItem value="moderator">Moderator</MenuItem>
                <MenuItem value="examiner">Valuator / Examiner</MenuItem>
              </TextField>
            </Grid>

            {/* Candidate Selector */}
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                select
                fullWidth
                size="small"
                label="Select Examiner / Assignment"
                value={selectedCandidateId}
                onChange={handleCandidateChange}
                disabled={loadingList || candidatesList.length === 0}
                helperText={candidatesList.length === 0 ? "No records found (using sample data)" : `${candidatesList.length} assigned record(s)`}
              >
                {candidatesList.map((c) => {
                  const id = c._id || c.id;
                  const name = c.papersettername || c.moderatorname || c.examinername || c.name || 'Unnamed';
                  const code = c.coursecode || c.papercode || '';
                  return (
                    <MenuItem key={id} value={id}>
                      {name} {code ? `(${code})` : ''}
                    </MenuItem>
                  );
                })}
              </TextField>
            </Grid>

            {/* Action Buttons */}
            <Grid item xs={12} md={2} sx={{ display: 'flex', gap: 1, justifyContent: { xs: 'flex-start', md: 'flex-end' } }}>
              <Tooltip title={isEditMode ? "Switch to Form Preview" : "Edit / Customize Form Fields"}>
                <Button
                  variant={isEditMode ? "contained" : "outlined"}
                  color="secondary"
                  size="small"
                  onClick={() => setIsEditMode(!isEditMode)}
                  startIcon={isEditMode ? <VisibilityIcon /> : <EditIcon />}
                >
                  {isEditMode ? "Preview" : "Edit Data"}
                </Button>
              </Tooltip>

              <Button
                variant="contained"
                color="primary"
                size="small"
                onClick={handlePrint}
                startIcon={<PrintIcon />}
                sx={{ fontWeight: 700 }}
              >
                Print Form
              </Button>
            </Grid>
          </Grid>

          {/* Tab Navigation */}
          <Divider sx={{ my: 1.5 }} />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
            <Tabs
              value={activeTab}
              onChange={(e, val) => setActiveTab(val)}
              textColor="primary"
              indicatorColor="primary"
              sx={{ '& .MuiTab-root': { fontWeight: 700, fontSize: '13px', textTransform: 'none', minHeight: 44 } }}
            >
              <Tab icon={<AssignmentTurnedInIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="1. Appointment Letter" />
              <Tab icon={<CheckCircleOutlineIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="2. Acceptance Form" />
              <Tab icon={<DescriptionIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="3. Declaration Form" />
              <Tab icon={<PaymentsIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="4. Remuneration Bill" />
            </Tabs>

            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                component={RouterLink}
                to="/conduct-exam-configuration"
                size="small"
                variant="text"
                color="info"
                startIcon={<SettingsIcon />}
              >
                Exam Configuration
              </Button>
              <IconButton size="small" onClick={reloadConfig} title="Reload Exam Config">
                <RefreshIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>
        </Paper>

        {/* ================= EDIT DATA DRAWER / ACCORDION (HIDDEN IN PRINT) ================= */}
        {isEditMode && (
          <Paper elevation={2} sx={{ p: 2.5, mb: 3, border: '1px dashed #3b82f6', bgcolor: '#f8fafc' }} className="no-print">
            <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5, color: '#1e3a8a' }}>
              Quick Edit Form Parameters (Live updates across all 4 forms):
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4} md={3}>
                <TextField size="small" fullWidth label="Examiner Name" value={formData.examinerName} onChange={(e) => handleFieldChange('examinerName', e.target.value)} />
              </Grid>
              <Grid item xs={12} sm={4} md={3}>
                <TextField size="small" fullWidth label="Designation" value={formData.designation} onChange={(e) => handleFieldChange('designation', e.target.value)} />
              </Grid>
              <Grid item xs={12} sm={4} md={3}>
                <TextField size="small" fullWidth label="Examiner Code" value={formData.examinerCode} onChange={(e) => handleFieldChange('examinerCode', e.target.value)} />
              </Grid>
              <Grid item xs={12} sm={4} md={3}>
                <TextField size="small" fullWidth label="Voucher No. (V.No.)" value={formData.vNo} onChange={(e) => handleFieldChange('vNo', e.target.value)} />
              </Grid>
              <Grid item xs={12} sm={4} md={3}>
                <TextField size="small" fullWidth label="Confidential Ref No." value={formData.refNo} onChange={(e) => handleFieldChange('refNo', e.target.value)} />
              </Grid>
              <Grid item xs={12} sm={4} md={3}>
                <TextField size="small" fullWidth label="Date" value={formData.date} onChange={(e) => handleFieldChange('date', e.target.value)} />
              </Grid>
              <Grid item xs={12} sm={4} md={3}>
                <TextField size="small" fullWidth label="Paper Code" value={formData.paperCode} onChange={(e) => handleFieldChange('paperCode', e.target.value)} />
              </Grid>
              <Grid item xs={12} sm={8} md={6}>
                <TextField size="small" fullWidth label="Paper / Subject Title" value={formData.paperName} onChange={(e) => handleFieldChange('paperName', e.target.value)} />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField size="small" fullWidth label="Program" value={formData.program} onChange={(e) => handleFieldChange('program', e.target.value)} />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField size="small" fullWidth label="Semester / Year" value={formData.semester} onChange={(e) => handleFieldChange('semester', e.target.value)} />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <TextField size="small" fullWidth label="Working Institute" value={formData.institute} onChange={(e) => handleFieldChange('institute', e.target.value)} />
              </Grid>
              <Grid item xs={12} sm={4} md={2}>
                <TextField size="small" fullWidth label="Remun. Rate (Rs.)" value={formData.billRate} onChange={(e) => handleFieldChange('billRate', e.target.value)} />
              </Grid>
              <Grid item xs={12} sm={4} md={3}>
                <TextField size="small" fullWidth label="PAN No." value={formData.panNo} onChange={(e) => handleFieldChange('panNo', e.target.value)} />
              </Grid>
              <Grid item xs={12} sm={4} md={3}>
                <TextField size="small" fullWidth label="Bank Account No." value={formData.accountNo} onChange={(e) => handleFieldChange('accountNo', e.target.value)} />
              </Grid>
              <Grid item xs={12} sm={4} md={3}>
                <TextField size="small" fullWidth label="IFSC Code" value={formData.ifscCode} onChange={(e) => handleFieldChange('ifscCode', e.target.value)} />
              </Grid>
              <Grid item xs={12} sm={4} md={3}>
                <TextField size="small" fullWidth label="Bank Name & Branch" value={formData.bankName} onChange={(e) => handleFieldChange('bankName', e.target.value)} />
              </Grid>
            </Grid>
          </Paper>
        )}

        {/* ================= MAIN DISPLAY CANVAS ================= */}
        <Paper
          elevation={activeTab !== null ? 3 : 0}
          className="printable-form-container"
          sx={{
            p: { xs: 1.5, sm: 3, md: 4 },
            mx: 'auto',
            maxWidth: '860px',
            bgcolor: '#ffffff',
            borderRadius: { xs: 1, sm: 2 },
            border: { xs: 'none', sm: '1px solid #e2e8f0' }
          }}
        >
          {/* ================= TAB 0: APPOINTMENT LETTER FORM ================= */}
          {activeTab === 0 && (
            <Box id="appointment-form-print" sx={{ color: '#000000', fontFamily: 'Arial, Helvetica, sans-serif' }}>
              {/* Header: Centered Logo with Institution Name */}
              <Box sx={{ textAlign: 'center', mb: 1 }}>
                {effectiveInst.logo && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', mb: 0.5 }}>
                    <img
                      src={effectiveInst.logo}
                      alt="Logo"
                      style={{ maxHeight: '72px', maxWidth: '140px', objectFit: 'contain' }}
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  </Box>
                )}
                <Typography
                  component="h1"
                  sx={{
                    fontWeight: 900,
                    fontSize: { xs: '24px', sm: '28px', md: '32px' },
                    color: '#000000',
                    letterSpacing: 2,
                    textTransform: 'uppercase',
                    m: 0,
                    lineHeight: 1.15
                  }}
                >
                  {effectiveInst.institutionname}
                </Typography>
                {effectiveInst.affiliatedboard && (
                  <Typography sx={{ fontWeight: 600, fontSize: '13px', color: '#000000', fontStyle: 'italic', mt: 0.2 }}>
                    {effectiveInst.affiliatedboard.startsWith('(') ? effectiveInst.affiliatedboard : `(${effectiveInst.affiliatedboard})`}
                  </Typography>
                )}
                <Typography sx={{ fontSize: '12px', fontWeight: 600, color: '#000000', mt: 0.5 }}>
                  Ph. {effectiveInst.phone} &nbsp;&nbsp;&nbsp; E-mail: <span style={{ textDecoration: 'underline' }}>{effectiveInst.email}</span>
                </Typography>
              </Box>

              <Box sx={{ borderBottom: '2px solid #047857', mb: 1.5 }} />

              <Typography
                sx={{
                  textAlign: 'center',
                  fontWeight: 800,
                  fontSize: '15px',
                  letterSpacing: 1.2,
                  textTransform: 'uppercase',
                  color: '#000000',
                  mb: 1.5
                }}
              >
                MOST CONFIDENTIAL &amp; URGENT
              </Typography>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2, fontSize: '13.5px' }}>
                <Typography sx={{ fontSize: '13.5px', fontWeight: 600 }}>
                  Ref. No: <strong>{formData.refNo}</strong>
                </Typography>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography sx={{ fontSize: '13.5px', fontWeight: 600 }}>
                    Date: <strong>{formData.date}</strong>
                  </Typography>
                  <Typography sx={{ fontSize: '12.5px', fontStyle: 'italic', fontWeight: 500 }}>
                    Through E-mail
                  </Typography>
                </Box>
              </Box>

              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={7}>
                  <Box sx={{ fontSize: '13.5px', lineHeight: 1.5 }}>
                    <Typography sx={{ fontSize: '13.5px', fontWeight: 600 }}>
                      From: Assistant Registrar(Confidential),
                    </Typography>
                    <Box sx={{ pl: 4, mb: 1.5 }}>
                      <Typography sx={{ fontSize: '13.5px' }}>{effectiveInst.institutionname},</Typography>
                      <Typography sx={{ fontSize: '13.5px' }}>{effectiveInst.address}</Typography>
                    </Box>

                    <Typography sx={{ fontSize: '13.5px', fontWeight: 700 }}>To,</Typography>
                    <Box sx={{ pl: 2 }}>
                      <Typography sx={{ fontSize: '13.5px', fontWeight: 700 }}>
                        {formData.examinerName}, {formData.designation}
                      </Typography>
                      <Typography sx={{ fontSize: '13px' }}>{formData.institute}</Typography>
                    </Box>
                  </Box>
                </Grid>

                <Grid item xs={5}>
                  <Box
                    sx={{
                      border: '1.5px solid #000000',
                      p: 1.5,
                      borderRadius: 0.5,
                      bgcolor: '#fafafa',
                      fontSize: '13px'
                    }}
                  >
                    <Typography sx={{ fontSize: '13px', fontWeight: 700, mb: 0.5 }}>
                      Examiner Code No. - <strong>{formData.examinerCode}</strong>
                    </Typography>
                    <Typography sx={{ fontSize: '13px', fontWeight: 700, mb: 1.5 }}>
                      Conf. No- <strong>{formData.confNo}</strong>
                    </Typography>
                    <Typography sx={{ fontSize: '10.5px', fontStyle: 'italic', lineHeight: 1.3, color: '#333333' }}>
                      (To be quoted in all correspondence &amp; on all covers to be sent to this office)
                    </Typography>
                  </Box>
                </Grid>
              </Grid>

              <Box sx={{ textAlign: 'center', my: 2 }}>
                <Typography component="h3" sx={{ fontWeight: 700, fontSize: '14.5px', textDecoration: 'underline', color: '#000000' }}>
                  Subject: - Appointment of {roleTitleLabel}
                </Typography>
              </Box>

              <Typography sx={{ fontWeight: 700, fontSize: '13.5px', mb: 1 }}>
                Dear Sir/Madam,
              </Typography>

              <Box sx={{ fontSize: '13px', lineHeight: 1.6, textAlign: 'justify', mb: 2 }}>
                <Box sx={{ display: 'flex', mb: 1.2 }}>
                  <Typography sx={{ fontWeight: 700, minWidth: '22px', fontSize: '13px' }}>1.</Typography>
                  <Typography sx={{ fontSize: '13px' }}>
                    With the approval of the {effectiveInst.vctitle || 'Vice Chancellor'} of the University, an assignment as {roleTitleLabel}/Examiner is offered to you in; Subject/Paper: <strong>{formData.paperName}</strong>, as Paper Code: <strong>{formData.paperCode}</strong> for the upcoming examinations for the Program/Semester/Year: <strong>{formData.programSemesterYear}</strong>
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', mb: 1.2 }}>
                  <Typography sx={{ fontWeight: 700, minWidth: '22px', fontSize: '13px' }}>2.</Typography>
                  <Typography sx={{ fontSize: '13px' }}>
                    You are requested to frame One Set (i.e., Two Papers—Main and ATKT/Suppl.) of Question Paper as per the attached question paper template.
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', mb: 1.2 }}>
                  <Typography sx={{ fontWeight: 700, minWidth: '22px', fontSize: '13px' }}>3.</Typography>
                  <Typography sx={{ fontSize: '13px' }}>
                    If any Multiple Choice Questions (MCQs) are present in the question paper, then you need to answer the correct options of the MCQ.
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', mb: 1.2 }}>
                  <Typography sx={{ fontWeight: 700, minWidth: '22px', fontSize: '13px' }}>4.</Typography>
                  <Typography sx={{ fontSize: '13px' }}>
                    You need to send the password-protected (.docx) files of question papers (Main &amp; ATKT/Suppl.) at <strong>{effectiveInst.email}</strong> within 7 days of the receipt, either through email.
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', mb: 1.2 }}>
                  <Typography sx={{ fontWeight: 700, minWidth: '22px', fontSize: '13px' }}>5.</Typography>
                  <Typography sx={{ fontSize: '13px' }}>
                    Question papers passwords should be sent by WhatsApp to <strong>{effectiveInst.phone}</strong> in WhatsApp Message format with your name and paper code. Also, please do not make any calls on the above-mentioned mobile number.
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', mb: 1.2 }}>
                  <Typography sx={{ fontWeight: 700, minWidth: '22px', fontSize: '13px' }}>6.</Typography>
                  <Typography sx={{ fontSize: '13px' }}>
                    Kindly provide correct details of Account No., IFSC Code, and PAN No. in the attached Remuneration Bill and also attach a scanned copy of the cancelled cheque/passbook for timely transfer of the remuneration amount.
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', mb: 1.5 }}>
                  <Typography sx={{ fontWeight: 700, minWidth: '22px', fontSize: '13px' }}>7.</Typography>
                  <Typography sx={{ fontSize: '13px' }}>
                    The remuneration amount will be transferred to your account within 45-60 days from the date of paper receipt and please do not call for payment before the required days.
                  </Typography>
                </Box>

                <Typography sx={{ fontWeight: 600, fontSize: '13px', fontStyle: 'italic', mt: 0.5 }}>
                  Kindly go through the entire 07 points of appointment letter.
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'flex-end', my: 2.5 }}>
                <Box sx={{ textAlign: 'center', minWidth: '240px' }}>
                  <Typography sx={{ fontSize: '13px', fontWeight: 600 }}>
                    Yours faithfully
                  </Typography>
                  <Typography sx={{ fontSize: '12px', fontStyle: 'italic', my: 1.5, color: '#333333' }}>
                    (Signature)
                  </Typography>
                  <Typography sx={{ fontSize: '13.5px', fontWeight: 700 }}>
                    Assistant Registrar(Confidential)
                  </Typography>
                  <Typography sx={{ fontSize: '12px', fontWeight: 500 }}>
                    Ph.No.- {effectiveInst.phone || '0755-4005402'}
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ borderTop: '1px solid #000000', pt: 1.5, fontSize: '11.5px', lineHeight: 1.5 }}>
                <Typography sx={{ fontWeight: 700, fontSize: '12px', textDecoration: 'underline', mb: 0.5 }}>
                  Note: Remuneration Rates:
                </Typography>
                <Box sx={{ pl: 1.5, mb: 1 }}>
                  <div>• Setting of the one set (i.e., Two Papers—Main and ATKT/Suppl.) of question paper for Diploma/UG = <strong>Rs.1000/-</strong></div>
                  <div>• Setting of the one set (i.e., Two Papers—Main and ATKT/Suppl.) of question paper for PG. = <strong>Rs.1500/-</strong></div>
                  <div>• Setting of the one set (i.e., Two Papers—Main and ATKT/Suppl.) of question paper for Ph.D. = <strong>Rs.2000/-</strong></div>
                </Box>

                <Typography sx={{ fontWeight: 700, fontSize: '12px', textDecoration: 'underline', mb: 0.3 }}>
                  Enclosures:
                </Typography>
                <Box sx={{ pl: 1.5 }}>
                  <div>1. Question Paper Template/Sample Paper (having maximum marks, time duration and pattern).</div>
                  <div>2. Syllabus prescribed for the paper.</div>
                  <div>3. Acceptance form, Declaration form, Remuneration Bill form.</div>
                </Box>
              </Box>
            </Box>
          )}

          {/* ================= TAB 1: ACCEPTANCE FORM ================= */}
          {activeTab === 1 && (
            <Box id="acceptance-form-print" sx={{ color: '#000000', fontFamily: 'Arial, Helvetica, sans-serif' }}>
              <Box sx={{ textAlign: 'center', mb: 1 }}>
                {effectiveInst.logo && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', mb: 0.5 }}>
                    <img
                      src={effectiveInst.logo}
                      alt="Logo"
                      style={{ maxHeight: '72px', maxWidth: '140px', objectFit: 'contain' }}
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  </Box>
                )}
                <Typography
                  component="h1"
                  sx={{
                    fontWeight: 900,
                    fontSize: { xs: '24px', sm: '28px', md: '32px' },
                    color: '#000000',
                    letterSpacing: 2,
                    textTransform: 'uppercase',
                    m: 0,
                    lineHeight: 1.15
                  }}
                >
                  {effectiveInst.institutionname}
                </Typography>
                {effectiveInst.affiliatedboard && (
                  <Typography sx={{ fontWeight: 600, fontSize: '13px', color: '#000000', fontStyle: 'italic', mt: 0.2 }}>
                    {effectiveInst.affiliatedboard.startsWith('(') ? effectiveInst.affiliatedboard : `(${effectiveInst.affiliatedboard})`}
                  </Typography>
                )}
              </Box>

              <Box sx={{ borderBottom: '1.5px solid #000000', mb: 2 }} />

              <Box sx={{ textAlign: 'center', mb: 2 }}>
                <Typography component="h2" sx={{ fontWeight: 700, fontSize: '17px', textDecoration: 'underline', color: '#000000', m: 0 }}>
                  Acceptance Form
                </Typography>
                <Typography sx={{ fontWeight: 700, fontSize: '13.5px', color: '#000000', mt: 0.2 }}>
                  (To be submitted by {roleTitleLabel} / Valuator)
                </Typography>
              </Box>

              <Box sx={{ mb: 2, fontSize: '13.5px', lineHeight: 1.5 }}>
                <Typography sx={{ fontWeight: 700, fontSize: '13.5px' }}>To,</Typography>
                <Box sx={{ pl: 2 }}>
                  <Typography sx={{ fontSize: '13.5px', fontWeight: 600 }}>
                    Assistant Registrar(Confidential),
                  </Typography>
                  <Typography sx={{ fontSize: '13.5px' }}>{effectiveInst.institutionname},</Typography>
                  <Typography sx={{ fontSize: '13.5px' }}>{effectiveInst.address}</Typography>
                </Box>

                <Typography sx={{ fontWeight: 700, fontSize: '13.5px', mt: 1.5 }}>
                  Dear Sir,
                </Typography>
                <Typography sx={{ fontSize: '13px', lineHeight: 1.6, textAlign: 'justify' }}>
                  With reference to your letter number{' '}
                  <span style={{ fontWeight: 700, borderBottom: '1px dotted #000', padding: '0 4px' }}>
                    {formData.letterNo}
                  </span>{' '}
                  dated{' '}
                  <span style={{ fontWeight: 700, borderBottom: '1px dotted #000', padding: '0 4px' }}>
                    {formData.letterDate}
                  </span>
                  , I have to inform you that I accept the examiner ship and further in certify;
                </Typography>
              </Box>

              <Box sx={{ mb: 2.5, fontSize: '13px', lineHeight: 1.6 }}>
                <Box sx={{ display: 'flex', mb: 0.8 }}>
                  <Typography sx={{ fontWeight: 600, minWidth: '22px', fontSize: '13px' }}>1.</Typography>
                  <Typography sx={{ fontSize: '13px', textAlign: 'justify' }}>
                    That none of my direct relations or dependents will be appearing in the examination for which, I am valuating the thesis/dissertation / setting or moderating the question paper. In case, I subsequently come to know that any of them is an examinee, I shall inform you immediately.
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', mb: 0.8 }}>
                  <Typography sx={{ fontWeight: 600, minWidth: '22px', fontSize: '13px' }}>2.</Typography>
                  <Typography sx={{ fontSize: '13px', textAlign: 'justify' }}>
                    That the examination work assigned to me is related to my subject of specialization and I am teaching/I have taught this subject to students.
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', mb: 0.8 }}>
                  <Typography sx={{ fontWeight: 600, minWidth: '22px', fontSize: '13px' }}>3.</Typography>
                  <Typography sx={{ fontSize: '13px', textAlign: 'justify' }}>
                    That I will keep my appointment as examiner strictly confidential.
                  </Typography>
                </Box>
              </Box>

              <Box
                component="table"
                sx={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  border: '1.5px solid #000000',
                  mb: 2.5,
                  fontSize: '13px',
                  '& td': {
                    border: '1px solid #000000',
                    p: '6px 10px',
                    verticalAlign: 'top'
                  }
                }}
              >
                <tbody>
                  <tr>
                    <td style={{ width: '38%', fontWeight: 700, fontStyle: 'italic' }}>Name of Examiner</td>
                    <td style={{ fontWeight: 600 }}>{formData.examinerName}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 700, fontStyle: 'italic' }}>Designation</td>
                    <td>{formData.designation}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 700, fontStyle: 'italic' }}>Qualification</td>
                    <td>{formData.qualification}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 700, fontStyle: 'italic' }}>Specialization</td>
                    <td>{formData.specialization}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 700, fontStyle: 'italic' }}>Teaching Experience</td>
                    <td style={{ padding: 0 }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <tbody>
                          <tr>
                            <td style={{ width: '50%', border: 'none', borderRight: '1px solid #000', padding: '6px 10px' }}>
                              <strong>Under Graduate:</strong> {formData.experienceUg}
                            </td>
                            <td style={{ width: '50%', border: 'none', padding: '6px 10px' }}>
                              <strong>Post Graduate:</strong> {formData.experiencePg}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 700, fontStyle: 'italic' }}>
                      Paper of Area of yourInterest<br />
                      <span style={{ fontSize: '11px', fontWeight: 500 }}>(For future assignments)</span>
                    </td>
                    <td>{formData.interestArea}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 700, fontStyle: 'italic' }}>
                      Name of University/Institute<br />
                      <span style={{ fontSize: '11px', fontWeight: 500 }}>(Presently Working)</span>
                    </td>
                    <td>
                      <div><strong>Institute:</strong> {formData.institute}</div>
                      <div><strong>Address:</strong> {formData.workingAddress} &nbsp;&nbsp; <strong>Pin:</strong> {formData.workingPin}</div>
                      <div><strong>(Telephone with S.T.D. Code):</strong> {formData.workingPhone} &nbsp;&nbsp; <strong>Mobile No:</strong> {formData.mobileNo}</div>
                    </td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 700, fontStyle: 'italic' }}>Residential Address</td>
                    <td>
                      <div><strong>Address:</strong> {formData.residentialAddress} &nbsp;&nbsp; <strong>Pin:</strong> {formData.residentialPin}</div>
                      <div><strong>Email:</strong> {formData.email} &nbsp;&nbsp; <strong>Mobile No.:</strong> {formData.mobileNo}</div>
                    </td>
                  </tr>
                </tbody>
              </Box>

              <Box sx={{ textAlign: 'right', pr: 3, my: 2 }}>
                <Typography sx={{ fontWeight: 700, fontSize: '13px' }}>
                  Yours truly
                </Typography>
                <Box sx={{ height: '35px' }} />
                <Typography sx={{ fontWeight: 700, fontSize: '13px' }}>
                  (Signature with date)
                </Typography>
              </Box>

              <Box sx={{ mt: 2, pt: 1, borderTop: '1px solid #000000', fontSize: '11.5px', lineHeight: 1.5 }}>
                <Typography sx={{ fontWeight: 700, fontSize: '12px', textDecoration: 'underline', mb: 0.3 }}>
                  Note:-
                </Typography>
                <Typography sx={{ fontSize: '11.5px', mb: 0.5 }}>
                  1. Any change in address may kindly be communicated immediately to Deputy Registrar (Evaluation), {effectiveInst.institutionname}, {effectiveInst.address?.split(',')[0] || ''}.
                </Typography>
                <Typography sx={{ fontSize: '11.5px', mb: 0.2 }}>
                  2. The term direct relations means :
                </Typography>
                <Box sx={{ pl: 2, fontSize: '11px' }}>
                  <div>(i) Son, Daughter, Nephew, Niece, Son-in-law, Daughter-in-law.</div>
                  <div>(ii) Brother, Sister, Cousin, Brother-in-law, Sister-in-law.</div>
                  <div>(iii) Father, Mother, Uncle, Aunt, Father-in-law, Mother-in-law.</div>
                  <div>(iv) Husband, Wife.</div>
                  <div>(v) Grandson &amp; Grand Daughter.</div>
                </Box>
              </Box>

              <Box sx={{ mt: 2, pt: 1, borderTop: '1px solid #000000', textAlign: 'center', fontSize: '11.5px', color: '#000000' }}>
                <Typography sx={{ fontSize: '11.5px', fontWeight: 600 }}>
                  {effectiveInst.address}, India
                </Typography>
                <Typography sx={{ fontSize: '11.5px' }}>
                  Ph. {effectiveInst.phone} &nbsp;&nbsp; Website : {effectiveInst.website}
                </Typography>
              </Box>
            </Box>
          )}

          {/* ================= TAB 2: DECLARATION FORM ================= */}
          {activeTab === 2 && (
            <Box id="declaration-form-print" sx={{ color: '#000000', fontFamily: 'Arial, Helvetica, sans-serif' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Box sx={{ width: '130px', textAlign: 'left' }}>
                  {effectiveInst.logo && (
                    <img
                      src={effectiveInst.logo}
                      alt="Logo"
                      style={{ maxHeight: '75px', maxWidth: '125px', objectFit: 'contain' }}
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  )}
                </Box>
                <Box sx={{ textAlign: 'right', flexGrow: 1 }}>
                  <Typography
                    component="h1"
                    sx={{
                      fontWeight: 900,
                      fontSize: { xs: '24px', sm: '28px', md: '34px' },
                      color: '#000000',
                      letterSpacing: 2,
                      textTransform: 'uppercase',
                      textDecoration: 'underline',
                      lineHeight: 1.1,
                      m: 0
                    }}
                  >
                    {effectiveInst.institutionname}
                  </Typography>
                  {effectiveInst.affiliatedboard && (
                    <Typography sx={{ fontWeight: 600, fontSize: '13px', color: '#000000', fontStyle: 'italic', mt: 0.5 }}>
                      {effectiveInst.affiliatedboard}
                    </Typography>
                  )}
                </Box>
              </Box>

              <Box sx={{ borderBottom: '1.5px solid #000000', mb: 2 }} />

              <Box sx={{ textAlign: 'center', mb: 2 }}>
                <Typography component="h2" sx={{ fontWeight: 800, fontSize: '18px', letterSpacing: 1.5, color: '#000000', m: 0 }}>
                  DECLARATION FORM
                </Typography>
                <Typography sx={{ fontWeight: 700, fontSize: '13.5px', color: '#000000', mt: 0.3 }}>
                  (To be submitted by {roleTitleLabel})
                </Typography>
                <Typography sx={{ fontSize: '11.5px', fontStyle: 'italic', color: '#000000', mt: 0.5 }}>
                  (This form should be kept in the out cover envelope and not in the inner envelope containing Question Paper)
                </Typography>
              </Box>

              <Box sx={{ fontSize: '13px', lineHeight: 1.7, textAlign: 'justify', mb: 3 }}>
                <Box sx={{ display: 'flex', mb: 1.5 }}>
                  <Typography sx={{ fontWeight: 700, minWidth: '22px', fontSize: '13px' }}>1.</Typography>
                  <Typography sx={{ fontSize: '13px' }}>
                    I declared that I have destroyed all rough notes etc. related to the question paper of Paper Code :{' '}
                    <span style={{ fontWeight: 700, borderBottom: '1px dotted #000', padding: '0 4px' }}>
                      {formData.paperCode}
                    </span>{' '}
                    Paper Name :{' '}
                    <span style={{ fontWeight: 700, borderBottom: '1px dotted #000', padding: '0 4px' }}>
                      {formData.paperName}
                    </span>{' '}
                    Examination (Month &amp; Year){' '}
                    <span style={{ fontWeight: 700, borderBottom: '1px dotted #000', padding: '0 4px' }}>
                      {formData.examMonthYear}
                    </span>{' '}
                    That I have set. The papers on which the question has been written neither bear my signature nor my name. I assign full authority regarding the use of this question paper to the {effectiveInst.institutionname}, {effectiveInst.address?.split(',')[0] || ''}.
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', mb: 1.5 }}>
                  <Typography sx={{ fontWeight: 700, minWidth: '22px', fontSize: '13px' }}>2.</Typography>
                  <Typography sx={{ fontSize: '13px' }}>
                    I further declare that I myself have written the question paper.
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', mb: 1.5 }}>
                  <Typography sx={{ fontWeight: 700, minWidth: '22px', fontSize: '13px' }}>3.</Typography>
                  <Typography sx={{ fontSize: '13px' }}>
                    In my question paper the examinees may be supplied with the following special materials (if no material is to be supplied kindly strike out the point) :{' '}
                    <span style={{ fontWeight: 700, borderBottom: '1px dotted #000', padding: '0 4px' }}>
                      {formData.specialMaterials}
                    </span>
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', mb: 1.5 }}>
                  <Typography sx={{ fontWeight: 700, minWidth: '22px', fontSize: '13px' }}>4.</Typography>
                  <Typography sx={{ fontSize: '13px' }}>
                    The pages of textbooks that have been quoted in the question paper are mentioned in memo enclosed along with the question paper. (This point is applicable to paper setter for languages and mathematics only, others may kindly strike it out).
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', mb: 1.5 }}>
                  <Typography sx={{ fontWeight: 700, minWidth: '22px', fontSize: '13px' }}>5.</Typography>
                  <Typography sx={{ fontSize: '13px' }}>
                    I have maintained strict confidentially, and have not discussed these questions with any one, and I have not save any hard or soft copy of paper or a part of it.
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', my: 3, pt: 1 }}>
                <Box sx={{ pt: 3 }}>
                  <Typography sx={{ fontSize: '13.5px', fontWeight: 700 }}>
                    Examiner Code No. : <strong>{formData.examinerCode}</strong>
                  </Typography>
                </Box>

                <Box sx={{ textAlign: 'left', minWidth: '280px' }}>
                  <Typography sx={{ fontSize: '13px', fontWeight: 600, mb: 1.5 }}>
                    Signature with date
                  </Typography>
                  <Typography sx={{ fontSize: '13px', mb: 0.5 }}>
                    Name : <strong>{formData.examinerName}</strong>
                  </Typography>
                  <Typography sx={{ fontSize: '13px', mb: 0.5 }}>
                    Desgination : <strong>{formData.designation}</strong>
                  </Typography>
                  <Typography sx={{ fontSize: '13px' }}>
                    Institute : <strong>{formData.institute}</strong>
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ mt: 5, pt: 1.5, borderTop: '1px solid #000000', textAlign: 'center', fontSize: '11.5px', color: '#000000' }}>
                <Typography sx={{ fontSize: '11.5px', fontWeight: 600 }}>
                  {effectiveInst.address}, India
                </Typography>
                <Typography sx={{ fontSize: '11.5px' }}>
                  Ph. {effectiveInst.phone} &nbsp;&nbsp; Website : {effectiveInst.website}
                </Typography>
              </Box>
            </Box>
          )}

          {/* ================= TAB 3: REMUNERATION BILL (EXACT PDF FORMAT) ================= */}
          {activeTab === 3 && (
            <>
              <Box id="remuneration-bill-print" className="exact-pdf-box bill-page-1">
              {/* ======================= TOP INSTITUTION BANNER (PROMINENT FULL-WIDTH) ======================= */}
              <Box sx={{ textAlign: 'center', pb: 0.5, borderBottom: '1px solid #ddd' }}>
                <Typography
                  component="h1"
                  sx={{
                    fontWeight: 900,
                    fontSize: { xs: '26px', sm: '34px', md: '38px' },
                    letterSpacing: '1.5px',
                    textTransform: 'uppercase',
                    color: '#000000',
                    lineHeight: 1.05,
                    m: 0,
                    fontFamily: 'Arial, Helvetica, sans-serif'
                  }}
                >
                  {effectiveInst.institutionname}
                </Typography>

                {effectiveInst.affiliatedboard && (
                  <Typography sx={{ fontSize: { xs: '11px', sm: '12px' }, fontWeight: 700, color: '#222222', mt: 0.4 }}>
                    {effectiveInst.affiliatedboard.startsWith('(') ? effectiveInst.affiliatedboard : `(${effectiveInst.affiliatedboard})`}
                  </Typography>
                )}

                {effectiveInst.address && (
                  <Typography sx={{ fontSize: { xs: '11.5px', sm: '12.5px' }, fontWeight: 700, color: '#111111', mt: 0.2 }}>
                    {effectiveInst.address}
                  </Typography>
                )}
              </Box>

              {/* ======================= SUB-HEADER: LOGO, TITLE, V.NO & PASSING TABLE ======================= */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1, mb: 0.5 }}>
                {/* Left: Logo */}
                <Box sx={{ width: '110px', textAlign: 'left', pl: 0.5 }}>
                  {effectiveInst.logo ? (
                    <img
                      src={effectiveInst.logo}
                      alt="Logo"
                      style={{ maxHeight: '60px', maxWidth: '100px', objectFit: 'contain' }}
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  ) : (
                    <Box sx={{ height: '45px' }} />
                  )}
                </Box>

                {/* Center: Title */}
                <Box sx={{ flex: 1, textAlign: 'center', px: 1 }}>
                  <Typography
                    sx={{
                      fontWeight: 900,
                      fontSize: { xs: '15px', sm: '17px' },
                      letterSpacing: '0.8px',
                      textTransform: 'uppercase',
                      color: '#000000',
                      m: 0
                    }}
                  >
                    REMUNERATION/T.A./LOCAL CONVENCE BILL
                  </Typography>
                  <Typography sx={{ fontStyle: 'italic', fontSize: '11px', color: '#222222', mt: 0.2, display: 'block' }}>
                    Bill should be submitted separately for each Paper Code
                  </Typography>
                </Box>

                {/* Right: V.No / OCOE / OCFAO Box */}
                <Box sx={{ width: '125px', textAlign: 'right', pr: 0.5 }}>
                  <Typography sx={{ fontSize: '11px', fontWeight: 'bold', mb: 0.5 }}>
                    V.No. <span style={{ borderBottom: '1px solid #000', display: 'inline-block', minWidth: '55px', textAlign: 'center' }}>{formData.vNo}</span>
                  </Typography>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', border: '1.5px solid #000' }}>
                    <tbody>
                      <tr>
                        <td style={{ border: '1.5px solid #000', padding: '3px 4px', fontWeight: 'bold', width: '50%', textAlign: 'left' }}>OCOE</td>
                        <td style={{ border: '1.5px solid #000', padding: '3px 4px', width: '50%' }}>&nbsp;</td>
                      </tr>
                      <tr>
                        <td style={{ border: '1.5px solid #000', padding: '3px 4px', fontWeight: 'bold', width: '50%', textAlign: 'left' }}>OCFAO</td>
                        <td style={{ border: '1.5px solid #000', padding: '3px 4px', width: '50%' }}>&nbsp;</td>
                      </tr>
                    </tbody>
                  </table>
                </Box>
              </Box>

              {/* Repeating Divider */}
              <Box sx={{ borderBottom: '2px double #000000', my: 0.8 }} />

              {/* Examiner Particulars */}
              <Box sx={{ fontSize: '11px', lineHeight: 1.75, mb: 1, color: '#000000' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Box sx={{ flex: 1, pr: 2, display: 'flex', alignItems: 'flex-end' }}>
                    <span style={{ whiteSpace: 'nowrap' }}>Name of the Examiner:</span>
                    <span style={{ flex: 1, borderBottom: '1px dotted #000', marginLeft: '4px', paddingLeft: '4px', fontWeight: 'bold' }}>
                      {formData.examinerName}
                    </span>
                  </Box>
                  <Box sx={{ width: '36%', display: 'flex', alignItems: 'flex-end' }}>
                    <span style={{ whiteSpace: 'nowrap' }}>Designation :</span>
                    <span style={{ flex: 1, borderBottom: '1px dotted #000', marginLeft: '4px', paddingLeft: '4px' }}>
                      {formData.designation}
                    </span>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Box sx={{ flex: 1, pr: 2, display: 'flex', alignItems: 'flex-end' }}>
                    <span style={{ whiteSpace: 'nowrap' }}>Institute Address :</span>
                    <span style={{ flex: 1, borderBottom: '1px dotted #000', marginLeft: '4px', paddingLeft: '4px' }}>
                      {formData.institute}
                    </span>
                  </Box>
                  <Box sx={{ width: '36%', display: 'flex', alignItems: 'flex-end' }}>
                    <span style={{ whiteSpace: 'nowrap' }}>Contact No.:</span>
                    <span style={{ flex: 1, borderBottom: '1px dotted #000', marginLeft: '4px', paddingLeft: '4px' }}>
                      {formData.mobileNo}
                    </span>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Box sx={{ flex: 1, pr: 2, display: 'flex', alignItems: 'flex-end' }}>
                    <span style={{ whiteSpace: 'nowrap' }}>Qualification :</span>
                    <span style={{ flex: 1, borderBottom: '1px dotted #000', marginLeft: '4px', paddingLeft: '4px' }}>
                      {formData.qualification}
                    </span>
                  </Box>
                  <Box sx={{ width: '36%', display: 'flex', alignItems: 'flex-end' }}>
                    <span style={{ whiteSpace: 'nowrap' }}>Specialization :</span>
                    <span style={{ flex: 1, borderBottom: '1px dotted #000', marginLeft: '4px', paddingLeft: '4px' }}>
                      {formData.specialization}
                    </span>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'flex-end' }}>
                  <span style={{ whiteSpace: 'nowrap' }}>Experience (In Year) :</span>
                  <span style={{ marginLeft: '4px' }}>UG :</span>
                  <span style={{ minWidth: '40px', borderBottom: '1px dotted #000', marginLeft: '4px', textAlign: 'center' }}>
                    {formData.experienceUg}
                  </span>
                  <span style={{ marginLeft: '10px' }}>PG :</span>
                  <span style={{ minWidth: '40px', borderBottom: '1px dotted #000', marginLeft: '4px', textAlign: 'center' }}>
                    {formData.experiencePg}
                  </span>
                  <span style={{ marginLeft: '14px', whiteSpace: 'nowrap' }}>Email ID:</span>
                  <span style={{ flex: 1, borderBottom: '1px dotted #000', marginLeft: '4px', paddingLeft: '4px' }}>
                    {formData.email}
                  </span>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'flex-end' }}>
                  <span style={{ whiteSpace: 'nowrap' }}>Program :</span>
                  <span style={{ minWidth: '150px', borderBottom: '1px dotted #000', margin: '0 6px', paddingLeft: '4px' }}>
                    {formData.program}
                  </span>
                  <span style={{ whiteSpace: 'nowrap' }}>Prof./Year/Semester</span>
                  <span style={{ minWidth: '90px', borderBottom: '1px dotted #000', margin: '0 6px', paddingLeft: '4px', textAlign: 'center' }}>
                    {formData.semester}
                  </span>
                  <span style={{ whiteSpace: 'nowrap' }}>:Main/Suppl./ATKT Paper Code</span>
                  <span style={{ flex: 1, borderBottom: '1px dotted #000', marginLeft: '6px', paddingLeft: '4px', fontWeight: 'bold' }}>
                    {formData.paperCode}
                  </span>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'flex-end' }}>
                  <span style={{ whiteSpace: 'nowrap' }}>Paper Name :</span>
                  <span style={{ flex: 1, borderBottom: '1px dotted #000', marginLeft: '6px', paddingLeft: '4px' }}>
                    {formData.paperName}
                  </span>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'flex-end' }}>
                  <span style={{ whiteSpace: 'nowrap' }}>Department :</span>
                  <span style={{ flex: 1, borderBottom: '1px dotted #000', marginLeft: '6px', paddingLeft: '4px' }}>
                    {formData.department}
                  </span>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'flex-end' }}>
                  <span style={{ whiteSpace: 'nowrap' }}>Date of Examination :</span>
                  <span style={{ flex: 1, borderBottom: '1px dotted #000', marginLeft: '6px', paddingLeft: '4px' }}>
                    {formData.examDate}
                  </span>
                </Box>
              </Box>

              {/* Address to COE */}
              <Box sx={{ fontSize: '11px', lineHeight: 1.4, mb: 1, color: '#000000' }}>
                <Typography sx={{ fontWeight: 700, fontSize: '11.5px' }}>To,</Typography>
                <Box sx={{ pl: 1.5 }}>
                  <Typography sx={{ fontSize: '11px', fontWeight: 600 }}>
                    Assistant Registrar(Confidential)
                  </Typography>
                  <Typography sx={{ fontSize: '11px' }}>
                    {effectiveInst.institutionname}, {effectiveInst.address?.split(',')[0] || ''}
                  </Typography>
                </Box>
                <Typography sx={{ fontWeight: 700, fontSize: '11px', mt: 0.5 }}>Sir,</Typography>
                <Typography sx={{ fontSize: '11px', pl: 1.5, textAlign: 'justify' }}>
                  I submit my bill for remuneration of the work done by me asunder, payment of which may be made to meat your
                </Typography>
              </Box>

              {/* Table 1: Work Table */}
              <table style={{ width: '100%', borderCollapse: 'collapse', border: '1.5px solid #000000', fontSize: '10.5px', marginBottom: 0 }}>
                <thead>
                  <tr style={{ background: '#f8fafc', textAlign: 'center' }}>
                    <th style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'center', width: '50%', fontWeight: 'bold' }}>
                      Assignment
                    </th>
                    <th style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'center', width: '18%', fontWeight: 'bold' }}>
                      No.of Examinees/<br />Answer Books
                    </th>
                    <th style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'center', width: '16%', fontWeight: 'bold' }}>
                      Rate of<br />Remuneration
                    </th>
                    <th style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'center', width: '16%', fontWeight: 'bold' }}>
                      Total Amount (Rs.)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ border: '1px solid #000', padding: '3.5px 6px' }}>Setting of Questions Papers/Translation/Moderation</td>
                    <td style={{ border: '1px solid #000', padding: '3.5px 6px', textAlign: 'center' }}>{formData.billQuantity}</td>
                    <td style={{ border: '1px solid #000', padding: '3.5px 6px', textAlign: 'right' }}>Rs. {money(formData.billRate)}</td>
                    <td style={{ border: '1px solid #000', padding: '3.5px 6px', textAlign: 'right', fontWeight: 'bold' }}>Rs. {money(formData.billAmount)}</td>
                  </tr>
                  <tr>
                    <td style={{ border: '1px solid #000', padding: '3.5px 6px' }}>Evaluation / Revaluation/Retotaling of answer book/thesis</td>
                    <td style={{ border: '1px solid #000', padding: '3.5px 6px', textAlign: 'center' }}>-</td>
                    <td style={{ border: '1px solid #000', padding: '3.5px 6px', textAlign: 'right' }}>-</td>
                    <td style={{ border: '1px solid #000', padding: '3.5px 6px', textAlign: 'right', fontWeight: 'bold' }}>-</td>
                  </tr>
                  <tr>
                    <td style={{ border: '1px solid #000', padding: '3.5px 6px' }}>Practical/Clinical Examination/Viva-Voce/Misc.</td>
                    <td style={{ border: '1px solid #000', padding: '3.5px 6px', textAlign: 'center' }}>-</td>
                    <td style={{ border: '1px solid #000', padding: '3.5px 6px', textAlign: 'right' }}>-</td>
                    <td style={{ border: '1px solid #000', padding: '3.5px 6px', textAlign: 'right', fontWeight: 'bold' }}>-</td>
                  </tr>
                  <tr>
                    <td style={{ border: '1px solid #000', padding: '3.5px 6px', fontStyle: 'italic' }}>Postal Charges*etc.(Receipt to be enclosed)</td>
                    <td style={{ border: '1px solid #000', padding: '3.5px 6px', textAlign: 'center' }}>-</td>
                    <td style={{ border: '1px solid #000', padding: '3.5px 6px', textAlign: 'right' }}>-</td>
                    <td style={{ border: '1px solid #000', padding: '3.5px 6px', textAlign: 'right', fontWeight: 'bold' }}>-</td>
                  </tr>
                </tbody>
              </table>

              {/* Table 2: Traveling Details */}
              <table style={{ width: '100%', borderCollapse: 'collapse', border: '1.5px solid #000000', borderTop: 'none', fontSize: '10.5px' }}>
                <thead>
                  <tr style={{ background: '#ffff00', color: '#000000' }}>
                    <th colSpan={5} style={{ border: '1px solid #000', padding: '3.5px 6px', textAlign: 'center', fontWeight: 'bold', fontSize: '11px' }}>
                      Details of Traveling for the Meeting / Examination Work
                    </th>
                  </tr>
                  <tr style={{ background: '#ffff00', color: '#000000' }}>
                    <th style={{ border: '1px solid #000', padding: '3px 6px', textAlign: 'center', width: '18%', fontWeight: 'bold' }}>Date</th>
                    <th style={{ border: '1px solid #000', padding: '3px 6px', textAlign: 'center', width: '22%', fontWeight: 'bold' }}>From</th>
                    <th style={{ border: '1px solid #000', padding: '3px 6px', textAlign: 'center', width: '22%', fontWeight: 'bold' }}>To</th>
                    <th style={{ border: '1px solid #000', padding: '3px 6px', textAlign: 'center', width: '20%', fontWeight: 'bold' }}>Mode of Traveling</th>
                    <th style={{ border: '1px solid #000', padding: '3px 6px', textAlign: 'center', width: '18%', fontWeight: 'bold' }}>Amount (Rs.)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ border: '1px solid #000', padding: '5px 6px' }}>&nbsp;</td>
                    <td style={{ border: '1px solid #000', padding: '5px 6px' }}>&nbsp;</td>
                    <td style={{ border: '1px solid #000', padding: '5px 6px' }}>&nbsp;</td>
                    <td style={{ border: '1px solid #000', padding: '5px 6px' }}>&nbsp;</td>
                    <td style={{ border: '1px solid #000', padding: '5px 6px', textAlign: 'right' }}>-</td>
                  </tr>
                  <tr>
                    <td colSpan={4} style={{ border: '1px solid #000', padding: '4px 10px', textAlign: 'right', fontWeight: 'bold', fontSize: '11.5px' }}>
                      Grand Total =
                    </td>
                    <td style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'right', fontWeight: 900, fontSize: '12px' }}>
                      Rs. {money(formData.billAmount)}
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={5} style={{ border: '1px solid #000', padding: '4px 8px', fontWeight: 'bold', fontSize: '11px' }}>
                      Total in Word (Rs.) : &nbsp;&nbsp; One Thousand Five Hundred Rupees Only
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Certification */}
              <Typography sx={{ fontSize: '10px', lineHeight: 1.4, my: 0.8, textAlign: 'justify', color: '#000000' }}>
                I Certified that, I have not received TA./D.A. from any other source for this traveling and the claim has been preferred for the first time in accordance with the schedule of remuneration approved by the University.
              </Typography>

              {/* Perforation / Cut Line */}
              <Box sx={{ textAlign: 'center', fontSize: '10.5px', letterSpacing: '1px', my: 0.6, color: '#000000' }}>
                " ---------------------------------------------------- &amp; ---------------------------------------------------- &amp; ---------------------------------------------------- "
              </Box>

              {/* Bank Particulars */}
              <Box sx={{ my: 0.6 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.3 }}>
                  <Typography sx={{ fontWeight: 'bold', fontSize: '11.5px', letterSpacing: '0.5px' }}>
                    Fund Transfer Through: RTGS/NEFT
                  </Typography>
                  <Typography sx={{ fontSize: '11px', fontWeight: 600 }}>
                    Date: <span style={{ borderBottom: '1px dotted #000', padding: '0 15px' }}>{formData.date}</span>
                  </Typography>
                </Box>
                <Typography sx={{ fontSize: '9.5px', fontStyle: 'italic', mb: 0.4 }}>
                  (Please fill all the detail Mandatorily as per your Bank Account)
                </Typography>

                <table style={{ width: '100%', borderCollapse: 'collapse', border: '1.5px solid #000000', fontSize: '10.5px' }}>
                  <tbody>
                    <tr>
                      <td style={{ border: '1px solid #000', padding: '3.5px 6px', width: '24%', fontWeight: 'bold' }}>
                        Name of the Applicant
                      </td>
                      <td colSpan={3} style={{ border: '1px solid #000', padding: '3.5px 6px', fontWeight: 'bold' }}>
                        {formData.examinerName}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ border: '1px solid #000', padding: '3.5px 6px', fontWeight: 'bold' }}>
                        Amount
                      </td>
                      <td style={{ border: '1px solid #000', padding: '3.5px 6px', width: '26%', fontWeight: 'bold' }}>
                        Rs. {money(formData.billAmount)}
                      </td>
                      <td style={{ border: '1px solid #000', padding: '3.5px 6px', width: '25%', fontWeight: 'bold' }}>
                        Applicant's PAN No.
                      </td>
                      <td style={{ border: '1px solid #000', padding: '3.5px 6px', width: '25%', fontWeight: 'bold' }}>
                        {formData.panNo}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ border: '1px solid #000', padding: '3.5px 6px', fontWeight: 'bold' }}>
                        Account No.
                      </td>
                      <td style={{ border: '1px solid #000', padding: '3.5px 6px', fontWeight: 'bold' }}>
                        {formData.accountNo}
                      </td>
                      <td style={{ border: '1px solid #000', padding: '3.5px 6px', fontWeight: 'bold' }}>
                        IFSC Code
                      </td>
                      <td style={{ border: '1px solid #000', padding: '3.5px 6px', fontWeight: 'bold' }}>
                        {formData.ifscCode}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ border: '1px solid #000', padding: '3.5px 6px', fontWeight: 'bold' }}>
                        Banks 'Name &amp; Branch
                      </td>
                      <td colSpan={3} style={{ border: '1px solid #000', padding: '3.5px 6px' }}>
                        {formData.bankName} {formData.bankBranch ? `(${formData.bankBranch})` : ''}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </Box>

              {/* Signatures */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', pt: 2.5, pb: 0.5 }}>
                <Typography sx={{ fontWeight: 'bold', fontSize: '11.5px' }}>
                  Incharge-Conduct
                </Typography>
                <Typography sx={{ fontWeight: 'bold', fontSize: '11.5px' }}>
                  Signature of the Claimant with date
                </Typography>
              </Box>
            </Box>

            {/* Screen Page 2 Indicator */}
            <Box className="no-print" sx={{ my: 3, textAlign: 'center' }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 'bold', letterSpacing: 1.5, textTransform: 'uppercase' }}>
                — Page 2 (Verification &amp; Passing) —
              </Typography>
            </Box>

            {/* ======================= PAGE 2: VERIFICATION & PASSING (BACK SIDE) ======================= */}
            <Box
              className="exact-pdf-box bill-page-2"
              sx={{
                minHeight: { xs: '850px', print: 'calc(100vh - 20mm)' },
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                p: { xs: 3, sm: 4, md: 5 },
                boxSizing: 'border-box'
              }}
            >
              <Box>
                {/* 1. First Certification statement */}
                <Typography sx={{ fontSize: '13.5px', lineHeight: 1.6, textAlign: 'justify', mb: 6, color: '#000000' }}>
                  Certified that the claimant has done the work assigned by the {effectiveInst.institutionname}, {effectiveInst.address?.includes('Bhopal') ? 'Bhopal' : (effectiveInst.address?.split(',')[0] || '')} for which the bill has been preferred.
                </Typography>

                {/* 2. Signature of HOD with Seal (Left) */}
                <Box sx={{ mb: 7 }}>
                  <Typography sx={{ fontWeight: 'bold', fontStyle: 'italic', fontSize: '13.5px', color: '#2e7d32' }}>
                    Signature of HOD with Seal
                  </Typography>
                </Box>

                {/* 3. Signature of HOI with Seal (Right) */}
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 7, pr: 2 }}>
                  <Typography sx={{ fontWeight: 'bold', fontStyle: 'italic', fontSize: '13.5px', color: '#2e7d32' }}>
                    Signature of HOI with Seal
                  </Typography>
                </Box>

                {/* 4. Second Verification statement */}
                <Typography sx={{ fontSize: '13.5px', lineHeight: 1.6, textAlign: 'justify', mb: 6, color: '#000000' }}>
                  Verified and certified that the claimant has done the work assigned by the {effectiveInst.institutionname}, {effectiveInst.address?.includes('Bhopal') ? 'Bhopal' : (effectiveInst.address?.split(',')[0] || '')} for which the bill has been preferred.
                </Typography>

                {/* 5. Incharge (Confidential / Conduct / Evaluation / Result) (Right-Center) */}
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', pr: 4, mb: 7 }}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography sx={{ fontWeight: 'bold', fontSize: '14px', color: '#2e7d32' }}>
                      DR/Incharge/AR
                    </Typography>
                    <Typography sx={{ fontWeight: 'bold', fontSize: '13px', color: '#000000', backgroundColor: '#ffff00', px: 1 }}>
                      (Confidential / Conduct / Evaluation / Result)
                    </Typography>
                  </Box>
                </Box>

                {/* 6. Controller of Examinations (Right) */}
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', pr: 4, mb: 6 }}>
                  <Typography sx={{ fontWeight: 'bold', fontSize: '14px', color: '#d32f2f' }}>
                    Controller of Examinations
                  </Typography>
                </Box>

                {/* 7. Passes for Payment */}
                <Box sx={{ fontSize: '13px', lineHeight: 1.8, mb: 4, color: '#000000' }}>
                  <span>Passes for Payment of Rs. </span>
                  <span style={{ borderBottom: '1px dotted #000', display: 'inline-block', minWidth: '160px', padding: '0 6px', fontWeight: 'bold' }}>
                    {formData.billAmount ? `Rs. ${money(formData.billAmount)}` : '…………………………………'}
                  </span>
                  <span> (Rupees </span>
                  <span style={{ borderBottom: '1px dotted #000', display: 'inline-block', minWidth: '300px', padding: '0 6px', fontStyle: 'italic' }}>
                    One Thousand Five Hundred Rupees Only
                  </span>
                  <span>only)</span>
                </Box>

                {/* 8. Chief Finance & Account officer (Right) */}
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', pr: 4, mb: 6 }}>
                  <Typography sx={{ fontWeight: 'bold', fontSize: '14px', color: '#00B0F0' }}>
                    Chief Finance &amp; Account officer
                  </Typography>
                </Box>

                {/* 9. Payment Details (Paid in Cash / by Cheque No ...) */}
                <Box sx={{ fontSize: '13px', lineHeight: 2.2, color: '#000000', mb: 6 }}>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    <span>Paid in Cash / by Cheuqe No </span>
                    <span style={{ borderBottom: '1px dotted #000', flex: 1, minWidth: '130px', margin: '0 6px' }}>&nbsp;</span>
                    <span>Date </span>
                    <span style={{ borderBottom: '1px dotted #000', minWidth: '120px', margin: '0 6px' }}>&nbsp;</span>
                    <span>on </span>
                    <span style={{ borderBottom: '1px dotted #000', flex: 1, minWidth: '160px', marginLeft: '6px' }}>&nbsp;</span>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'flex-end', mt: 1 }}>
                    <span style={{ borderBottom: '1px dotted #000', minWidth: '200px', marginRight: '6px' }}>&nbsp;</span>
                    <span>Bank, Bhopal for </span>
                    <span style={{ borderBottom: '1px dotted #000', flex: 1, margin: '0 6px' }}>&nbsp;</span>
                    <span>only.</span>
                  </Box>
                </Box>
              </Box>

              {/* 10. Bottom Row: Cashier & Accountant */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', pt: 4, pb: 1 }}>
                <Typography sx={{ fontWeight: 'bold', fontSize: '14.5px', color: '#2e7d32' }}>
                  Cashier
                </Typography>
                <Typography sx={{ fontWeight: 'bold', fontSize: '14.5px', color: '#2e7d32' }}>
                  Accountant
                </Typography>
              </Box>
            </Box>
          </>
        )}
        </Paper>
      </Box>
    </MenuPageShell>
  );
}
