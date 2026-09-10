import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Grid,
  TextField,
  FormControlLabel,
  Checkbox,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Alert,
  CircularProgress,
  Chip
} from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import ep1 from '../../api/ep1';
import { useExamConfig } from './ExamDocumentHeader';
import global1 from '../../pages/global1';

export default function ExamAcceptanceDialog({
  open,
  onClose,
  role = 'papersetter',
  apiPrefix = '/api/v2/conductexam',
  assignment = {},
  userProfile = {},
  institution = {},
  onAccepted
}) {
  const isAccepted = assignment?.acceptancestatus === 'Accepted';
  const existingData = assignment?.acceptancedata || {};
  const existingBank = assignment?.bankdetails || {};

  const { config: examConfig } = useExamConfig();
  const effectiveInst = {
    ...examConfig,
    ...institution,
    institutionname: examConfig?.institutionname || institution?.institutionname || institution?.name || institution?.insname || '',
    affiliatedboard: examConfig?.affiliatedboard || institution?.affiliatedboard || '',
    address: examConfig?.address || institution?.address || '',
    coename: examConfig?.coename || institution?.coename || '',
    coetitle: examConfig?.coetitle || institution?.coetitle || 'Controller of Examinations',
    vcname: examConfig?.vcname || institution?.vcname || '',
    vctitle: examConfig?.vctitle || institution?.vctitle || 'Vice Chancellor',
    logo: examConfig?.logo || institution?.logo || institution?.logolink || '',
    phone: examConfig?.phone || institution?.phone || institution?.contactusdetails || '',
    email: examConfig?.email || institution?.email || institution?.contactemail || '',
    website: examConfig?.website || institution?.website || ''
  };

  const [formData, setFormData] = useState({
    examinercode: '',
    examinername: '',
    designation: '',
    qualification: '',
    specialization: '',
    experience_ug: '',
    experience_pg: '',
    interest_area: '',
    working_institute: '',
    working_address: '',
    working_pin: '',
    working_phone: '',
    working_mobile: '',
    residential_address: '',
    residential_pin: '',
    email: '',
    mobile_no: '',
    letterno: '',
    letterdate: new Date().toLocaleDateString('en-GB')
  });

  const [bankDetails, setBankDetails] = useState({
    accountholdername: '',
    panno: '',
    accountno: '',
    ifsccode: '',
    bankname: '',
    branch: ''
  });

  const [certifications, setCertifications] = useState({
    no_relation: true,
    subject_specialization: true,
    confidentiality: true
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (!open) return;
    const name = assignment?.papersettername || assignment?.moderatorname || userProfile?.name || '';
    const email = assignment?.papersetteremail || assignment?.moderatoremail || userProfile?.email || '';
    const phone = userProfile?.phone || '';
    const desig = userProfile?.designation || (role === 'moderator' ? 'Moderator' : 'Paper Setter');
    const qual = userProfile?.degree || 'Post Graduate / Ph.D';
    const dept = userProfile?.department || assignment?.subject || assignment?.course || 'Academics';
    const address = [userProfile?.address, userProfile?.city, userProfile?.state].filter(Boolean).join(', ');
    const code = assignment?.coursecode ? `${assignment.coursecode}-${role === 'moderator' ? 'MOD' : 'PS'}` : '';
    const instName = effectiveInst.institutionname || "INSTITUTION NAME";
    const prefix = instName.split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 4).toUpperCase() || 'EXAM';

    setFormData({
      examinercode: existingData.examinercode || code,
      examinername: existingData.examinername || name,
      designation: existingData.designation || desig,
      qualification: existingData.qualification || qual,
      specialization: existingData.specialization || dept,
      experience_ug: existingData.experience_ug || '8 Years',
      experience_pg: existingData.experience_pg || '4 Years',
      interest_area: existingData.interest_area || assignment?.course || dept || '',
      working_institute: existingData.working_institute || userProfile?.college || userProfile?.institute || instName,
      working_address: existingData.working_address || effectiveInst.address || '',
      working_pin: existingData.working_pin || userProfile?.pincode || '462037',
      working_phone: existingData.working_phone || effectiveInst.phone || '0755-4005402',
      working_mobile: existingData.working_mobile || phone,
      residential_address: existingData.residential_address || address || effectiveInst.address || '',
      residential_pin: existingData.residential_pin || userProfile?.pincode || '462037',
      email: existingData.email || email,
      mobile_no: existingData.mobile_no || phone,
      letterno: existingData.letterno || `${prefix}/COE/${new Date().getFullYear()}/${assignment?.coursecode || 'EXAM'}`,
      letterdate: existingData.letterdate || new Date().toLocaleDateString('en-GB')
    });

    setBankDetails({
      accountholdername: existingBank.accountholdername || name,
      panno: existingBank.panno || userProfile?.pan || '',
      accountno: existingBank.accountno || '',
      ifsccode: existingBank.ifsccode || '',
      bankname: existingBank.bankname || '',
      branch: existingBank.branch || ''
    });

    if (existingData.certifications) {
      setCertifications(existingData.certifications);
    }
  }, [open, assignment, userProfile, effectiveInst.institutionname]);

  const handleChange = (field, val) => {
    setFormData((prev) => ({ ...prev, [field]: val }));
  };

  const handleBankChange = (field, val) => {
    setBankDetails((prev) => ({ ...prev, [field]: val }));
  };

  const handleCertificationChange = (key) => (e) => {
    setCertifications((prev) => ({ ...prev, [key]: e.target.checked }));
  };

  const handleSubmitAcceptance = async () => {
    if (!certifications.no_relation || !certifications.subject_specialization || !certifications.confidentiality) {
      setError('Please agree to all 3 mandatory certifications before submitting.');
      return;
    }
    if (!formData.examinername) {
      setError('Please provide your Examiner Name.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      setSuccessMsg('');

      const endpoint = `${apiPrefix}/${role === 'moderator' ? 'moderator-accept' : 'papersetter-accept'}`;
      const idField = role === 'moderator' ? 'moderatorid' : 'papersetterid';
      const idVal = assignment?._id;

      const payload = {
        colid: global1.colid,
        [idField]: idVal,
        acceptancedata: {
          ...formData,
          certifications
        },
        bankdetails: bankDetails,
        user: global1.user
      };

      const res = await ep1.post(endpoint, payload);
      if (res.data?.success) {
        setSuccessMsg('Acceptance form submitted and verified successfully!');
        if (onAccepted) {
          onAccepted(res.data.setter || res.data.moderator);
        }
      } else {
        setError(res.data?.message || 'Failed to submit acceptance form.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error communicating with server.');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const insName = effectiveInst.institutionname || "PEOPLE'S UNIVERSITY";
  const logoSrc = effectiveInst.logo || '';
  const roleLabel = role === 'moderator' ? 'Moderator' : 'Paper Setter';

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth scroll="paper">
      {/* Print Stylesheet */}
      <style>{`
        @page {
          size: A4 portrait;
          margin: 10mm 15mm;
        }

        @media print {
          header, nav, aside, .MuiAppBar-root, .MuiDrawer-root, .no-print, [role="navigation"], .MuiDialogActions-root {
            display: none !important;
          }
          body, html {
            background: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
            font-family: Arial, Helvetica, sans-serif !important;
            color: #000000 !important;
          }
          .MuiDialog-container {
            display: block !important;
            padding: 0 !important;
          }
          .MuiPaper-root {
            box-shadow: none !important;
            border: none !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .acceptance-print-card {
            border: none !important;
            padding: 0 !important;
            box-shadow: none !important;
          }
        }
      `}</style>

      <DialogTitle className="no-print" sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TaskAltIcon color="primary" />
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            Official Acceptance Form
          </Typography>
        </Box>
        {isAccepted && (
          <Chip icon={<CheckCircleIcon />} label="Form Accepted" color="success" size="small" sx={{ fontWeight: 700 }} />
        )}
      </DialogTitle>

      <DialogContent dividers sx={{ p: { xs: 2, sm: 3 }, bgcolor: '#f8fafc' }}>
        <Paper
          elevation={0}
          className="acceptance-print-card"
          sx={{
            p: { xs: 2.5, sm: 4, md: 5 },
            border: '1px solid #000000',
            borderRadius: 0,
            bgcolor: '#ffffff',
            maxWidth: '210mm',
            margin: '0 auto',
            color: '#000000',
            fontFamily: 'Arial, Helvetica, sans-serif',
            boxSizing: 'border-box'
          }}
          id="printable-acceptance"
        >
          {/* ================= HEADER ================= */}
          <Box sx={{ textAlign: 'center', mb: 1 }}>
            {/* Center Top: Logo */}
            {logoSrc && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
                <Box
                  component="img"
                  src={logoSrc}
                  alt="Institution Logo"
                  sx={{ maxHeight: 75, maxWidth: 140, objectFit: 'contain' }}
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              </Box>
            )}

            {/* Extra-large bold uppercase Institution Name */}
            <Typography
              component="h1"
              sx={{
                fontFamily: 'Arial, Helvetica, sans-serif',
                fontWeight: 900,
                fontSize: { xs: '26px', sm: '32px', md: '36px' },
                letterSpacing: '1.2px',
                textTransform: 'uppercase',
                lineHeight: 1.15,
                color: '#000000',
                m: 0
              }}
            >
              {insName}
            </Typography>

            {/* Affiliated Board directly beneath Institution Name */}
            {effectiveInst.affiliatedboard && (
              <Typography
                sx={{
                  fontFamily: 'Arial, Helvetica, sans-serif',
                  fontWeight: 700,
                  fontSize: { xs: '12.5px', sm: '13.5px' },
                  color: '#000000',
                  mt: 0.5
                }}
              >
                {effectiveInst.affiliatedboard}
              </Typography>
            )}
          </Box>

          {/* Solid separator line */}
          <Box sx={{ borderBottom: '2px solid #000000', my: 1.5, width: '100%' }} />

          {/* ================= TITLE BLOCK ================= */}
          <Box sx={{ textAlign: 'center', mb: 2.5 }}>
            <Typography
              component="h2"
              sx={{
                fontWeight: 900,
                fontSize: { xs: '18px', sm: '21px' },
                letterSpacing: '0.8px',
                textDecoration: 'underline',
                color: '#000000',
                fontFamily: 'Arial, Helvetica, sans-serif',
                mb: 0.5
              }}
            >
              Acceptance Form
            </Typography>
            <Typography
              component="h3"
              sx={{
                fontWeight: 700,
                fontSize: { xs: '13.5px', sm: '15px' },
                color: '#000000',
                fontFamily: 'Arial, Helvetica, sans-serif'
              }}
            >
              (To be submitted by {roleLabel} / Valuator)
            </Typography>
          </Box>

          {/* ================= RECIPIENT & OPENING ================= */}
          <Box sx={{ mb: 2, fontSize: '13.5px', lineHeight: 1.6, color: '#000000' }}>
            <Typography sx={{ fontWeight: 700, fontSize: '13.5px' }}>To,</Typography>
            <Box sx={{ pl: 2 }}>
              <Typography sx={{ fontSize: '13.5px', fontWeight: 600 }}>
                {effectiveInst.coetitle || 'Controller of Examinations'},
              </Typography>
              <Typography sx={{ fontSize: '13.5px' }}>
                {insName},
              </Typography>
              <Typography sx={{ fontSize: '13.5px' }}>
                {effectiveInst.address || ''}
              </Typography>
            </Box>

            <Typography sx={{ fontWeight: 700, fontSize: '13.5px', mt: 1.5 }}>
              Dear Sir,
            </Typography>
            <Typography sx={{ fontSize: '13.5px', lineHeight: 1.7, textAlign: 'justify' }}>
              With reference to your letter number{' '}
              <span style={{ fontWeight: 700, borderBottom: '1px dotted #000', padding: '0 4px' }}>
                {formData.letterno || '...................................................'}
              </span>{' '}
              dated{' '}
              <span style={{ fontWeight: 700, borderBottom: '1px dotted #000', padding: '0 4px' }}>
                {formData.letterdate || '........................'}
              </span>
              , I have to inform you that I accept the examiner ship and further in certify;
            </Typography>
          </Box>

          {/* ================= 3 NUMBERED CERTIFICATIONS ================= */}
          <Box sx={{ mb: 3, fontSize: '13.5px', lineHeight: 1.7, color: '#000000' }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 1 }}>
              <Typography sx={{ fontWeight: 600, fontSize: '13.5px', minWidth: '24px' }}>1.</Typography>
              <Typography sx={{ fontSize: '13.5px', textAlign: 'justify' }}>
                That none of my direct relations or dependents will be appearing in the examination for which, I am valuating the thesis/dissertation / setting or moderating the question paper. In case, I subsequently come to know that any of them is an examinee, I shall inform you immediately.
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 1 }}>
              <Typography sx={{ fontWeight: 600, fontSize: '13.5px', minWidth: '24px' }}>2.</Typography>
              <Typography sx={{ fontSize: '13.5px', textAlign: 'justify' }}>
                That the examination work assigned to me is related to my subject of specialization and I am teaching/I have taught this subject to students.
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 1 }}>
              <Typography sx={{ fontWeight: 600, fontSize: '13.5px', minWidth: '24px' }}>3.</Typography>
              <Typography sx={{ fontSize: '13.5px', textAlign: 'justify' }}>
                That I will keep my appointment as examiner strictly confidential.
              </Typography>
            </Box>
          </Box>

          {/* ================= STRUCTURED PARTICULARS TABLE ================= */}
          <Table size="small" sx={{ mb: 3, border: '1.5px solid #000000', '& td': { border: '1px solid #000000', p: 1, fontSize: '13px' } }}>
            <TableBody>
              {/* Row 1: Name of Examiner */}
              <TableRow>
                <TableCell sx={{ width: '38%', fontWeight: 700, fontStyle: 'italic' }}>
                  Name of Examiner
                </TableCell>
                <TableCell>
                  {isAccepted ? formData.examinername : (
                    <TextField size="small" fullWidth value={formData.examinername} onChange={(e) => handleChange('examinername', e.target.value)} />
                  )}
                </TableCell>
              </TableRow>

              {/* Row 2: Designation */}
              <TableRow>
                <TableCell sx={{ fontWeight: 700, fontStyle: 'italic' }}>
                  Designation
                </TableCell>
                <TableCell>
                  {isAccepted ? formData.designation : (
                    <TextField size="small" fullWidth value={formData.designation} onChange={(e) => handleChange('designation', e.target.value)} />
                  )}
                </TableCell>
              </TableRow>

              {/* Row 3: Qualification */}
              <TableRow>
                <TableCell sx={{ fontWeight: 700, fontStyle: 'italic' }}>
                  Qualification
                </TableCell>
                <TableCell>
                  {isAccepted ? formData.qualification : (
                    <TextField size="small" fullWidth value={formData.qualification} onChange={(e) => handleChange('qualification', e.target.value)} />
                  )}
                </TableCell>
              </TableRow>

              {/* Row 4: Specialization */}
              <TableRow>
                <TableCell sx={{ fontWeight: 700, fontStyle: 'italic' }}>
                  Specialization
                </TableCell>
                <TableCell>
                  {isAccepted ? formData.specialization : (
                    <TextField size="small" fullWidth value={formData.specialization} onChange={(e) => handleChange('specialization', e.target.value)} />
                  )}
                </TableCell>
              </TableRow>

              {/* Row 5: Teaching Experience */}
              <TableRow>
                <TableCell sx={{ fontWeight: 700, fontStyle: 'italic' }}>
                  Teaching Experience
                </TableCell>
                <TableCell sx={{ p: 0 }}>
                  <Grid container>
                    <Grid item xs={6} sx={{ borderRight: '1px solid #000000', p: 1 }}>
                      <strong>Under Graduate:</strong>{' '}
                      {isAccepted ? formData.experience_ug : (
                        <TextField size="small" fullWidth value={formData.experience_ug} onChange={(e) => handleChange('experience_ug', e.target.value)} sx={{ mt: 0.5 }} />
                      )}
                    </Grid>
                    <Grid item xs={6} sx={{ p: 1 }}>
                      <strong>Post Graduate:</strong>{' '}
                      {isAccepted ? formData.experience_pg : (
                        <TextField size="small" fullWidth value={formData.experience_pg} onChange={(e) => handleChange('experience_pg', e.target.value)} sx={{ mt: 0.5 }} />
                      )}
                    </Grid>
                  </Grid>
                </TableCell>
              </TableRow>

              {/* Row 6: Paper of Area of your Interest */}
              <TableRow>
                <TableCell sx={{ fontWeight: 700, fontStyle: 'italic' }}>
                  Paper of Area of yourInterest<br />
                  <span style={{ fontSize: '11px', fontWeight: 500 }}>(For future assignments)</span>
                </TableCell>
                <TableCell>
                  {isAccepted ? formData.interest_area : (
                    <TextField size="small" fullWidth value={formData.interest_area} onChange={(e) => handleChange('interest_area', e.target.value)} placeholder="e.g. Clinical Medicine / Pathology / Machine Learning" />
                  )}
                </TableCell>
              </TableRow>

              {/* Row 7: Name of University/Institute (Presently Working) */}
              <TableRow>
                <TableCell sx={{ fontWeight: 700, fontStyle: 'italic' }}>
                  Name of University/Institute<br />
                  <span style={{ fontSize: '11px', fontWeight: 500 }}>(Presently Working)</span>
                </TableCell>
                <TableCell>
                  {isAccepted ? (
                    <Box sx={{ lineHeight: 1.8 }}>
                      <div><strong>Institute:</strong> {formData.working_institute}</div>
                      <div><strong>Address:</strong> {formData.working_address} &nbsp;&nbsp; <strong>Pin:</strong> {formData.working_pin}</div>
                      <div><strong>(Telephone with S.T.D. Code):</strong> {formData.working_phone} &nbsp;&nbsp; <strong>Mobile No:</strong> {formData.working_mobile || formData.mobile_no}</div>
                    </Box>
                  ) : (
                    <Grid container spacing={1}>
                      <Grid item xs={12}>
                        <TextField size="small" fullWidth label="Institute Name" value={formData.working_institute} onChange={(e) => handleChange('working_institute', e.target.value)} />
                      </Grid>
                      <Grid item xs={8}>
                        <TextField size="small" fullWidth label="Address" value={formData.working_address} onChange={(e) => handleChange('working_address', e.target.value)} />
                      </Grid>
                      <Grid item xs={4}>
                        <TextField size="small" fullWidth label="Pin" value={formData.working_pin} onChange={(e) => handleChange('working_pin', e.target.value)} />
                      </Grid>
                      <Grid item xs={6}>
                        <TextField size="small" fullWidth label="(Telephone with S.T.D. Code)" value={formData.working_phone} onChange={(e) => handleChange('working_phone', e.target.value)} />
                      </Grid>
                      <Grid item xs={6}>
                        <TextField size="small" fullWidth label="Mobile No" value={formData.working_mobile || formData.mobile_no} onChange={(e) => { handleChange('working_mobile', e.target.value); handleChange('mobile_no', e.target.value); }} />
                      </Grid>
                    </Grid>
                  )}
                </TableCell>
              </TableRow>

              {/* Row 8: Residential Address */}
              <TableRow>
                <TableCell sx={{ fontWeight: 700, fontStyle: 'italic' }}>
                  Residential Address
                </TableCell>
                <TableCell>
                  {isAccepted ? (
                    <Box sx={{ lineHeight: 1.8 }}>
                      <div><strong>Address:</strong> {formData.residential_address} &nbsp;&nbsp; <strong>Pin:</strong> {formData.residential_pin}</div>
                      <div><strong>Email:</strong> {formData.email} &nbsp;&nbsp; <strong>Mobile No.:</strong> {formData.mobile_no}</div>
                    </Box>
                  ) : (
                    <Grid container spacing={1}>
                      <Grid item xs={8}>
                        <TextField size="small" fullWidth label="Address" value={formData.residential_address} onChange={(e) => handleChange('residential_address', e.target.value)} />
                      </Grid>
                      <Grid item xs={4}>
                        <TextField size="small" fullWidth label="Pin" value={formData.residential_pin} onChange={(e) => handleChange('residential_pin', e.target.value)} />
                      </Grid>
                      <Grid item xs={6}>
                        <TextField size="small" fullWidth label="Email" value={formData.email} onChange={(e) => handleChange('email', e.target.value)} />
                      </Grid>
                      <Grid item xs={6}>
                        <TextField size="small" fullWidth label="Mobile No." value={formData.mobile_no} onChange={(e) => handleChange('mobile_no', e.target.value)} />
                      </Grid>
                    </Grid>
                  )}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>

          {/* Bank particulars for RTGS/NEFT payment (collapsible/subtle in print) */}
          <Box sx={{ mb: 3 }} className="no-print">
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: '#0f172a' }}>
              Bank Account Particulars (for RTGS / NEFT Remuneration):
            </Typography>
            <Grid container spacing={1.5}>
              <Grid item xs={12} sm={6}>
                <TextField size="small" fullWidth label="Account Holder Name" value={bankDetails.accountholdername} onChange={(e) => handleBankChange('accountholdername', e.target.value)} disabled={isAccepted} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField size="small" fullWidth label="PAN Card Number" value={bankDetails.panno} onChange={(e) => handleBankChange('panno', e.target.value)} disabled={isAccepted} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField size="small" fullWidth label="Bank Account Number" value={bankDetails.accountno} onChange={(e) => handleBankChange('accountno', e.target.value)} disabled={isAccepted} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField size="small" fullWidth label="IFSC Code" value={bankDetails.ifsccode} onChange={(e) => handleBankChange('ifsccode', e.target.value)} disabled={isAccepted} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField size="small" fullWidth label="Bank Name" value={bankDetails.bankname} onChange={(e) => handleBankChange('bankname', e.target.value)} disabled={isAccepted} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField size="small" fullWidth label="Branch Name" value={bankDetails.branch} onChange={(e) => handleBankChange('branch', e.target.value)} disabled={isAccepted} />
              </Grid>
            </Grid>
          </Box>

          {/* ================= SIGNATORY ================= */}
          <Box sx={{ textAlign: 'right', pr: 3, my: 3 }}>
            <Typography sx={{ fontWeight: 700, fontSize: '13.5px', color: '#000000' }}>
              Yours truly
            </Typography>
            <Box sx={{ minHeight: '35px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', my: 0.5 }}>
              {isAccepted ? (
                <Chip icon={<CheckCircleIcon />} label="Digitally Verified & Signed" color="success" size="small" sx={{ fontWeight: 700 }} />
              ) : (
                <div style={{ height: '30px' }}></div>
              )}
            </Box>
            <Typography sx={{ fontWeight: 700, fontSize: '13.5px', color: '#000000' }}>
              (Signature with date)
            </Typography>
          </Box>

          {/* ================= NOTE SECTION (REQUIRED BY USER) ================= */}
          <Box sx={{ mt: 3, pt: 1.5, borderTop: '1px solid #000000', fontSize: '12.5px', lineHeight: 1.6, color: '#000000' }}>
            <Typography sx={{ fontWeight: 700, fontSize: '13px', textDecoration: 'underline', mb: 0.5 }}>
              Note:-
            </Typography>
            <Box sx={{ mb: 1 }}>
              <strong>1.</strong> Any change in address may kindly be communicated immediately to Deputy Registrar (Evaluation), {insName}{effectiveInst.address ? `, ${effectiveInst.address.split(',')[0]}` : ''}.
            </Box>
            <Box>
              <strong>2.</strong> The term direct relations means :
              <Box sx={{ pl: 2, mt: 0.5 }}>
                <div><strong>(i)</strong> Son, Daughter, Nephew, Niece, Son-in-law, Daughter-in-law.</div>
                <div><strong>(ii)</strong> Brother, Sister, Cousin, Brother-in-law, Sister-in-law.</div>
                <div><strong>(iii)</strong> Father, Mother, Uncle, Aunt, Father-in-law, Mother-in-law.</div>
                <div><strong>(iv)</strong> Husband, Wife.</div>
                <div><strong>(v)</strong> Grandson &amp; Grand Daughter.</div>
              </Box>
            </Box>
          </Box>

          {/* ================= FOOTER ================= */}
          <Box sx={{ borderTop: '1.5px solid #000000', pt: 1.5, mt: 3, textAlign: 'center' }}>
            <Typography sx={{ fontSize: '12px', fontWeight: 700, color: '#000000', fontFamily: 'Arial, Helvetica, sans-serif' }}>
              {effectiveInst.address ? `${effectiveInst.address}, India` : 'Institution Campus, India'}
            </Typography>
            <Typography sx={{ fontSize: '11.5px', color: '#000000', mt: 0.3, fontFamily: 'Arial, Helvetica, sans-serif' }}>
              {effectiveInst.phone ? `Ph. ${effectiveInst.phone}` : ''}
              {effectiveInst.phone && (effectiveInst.website || effectiveInst.email) ? '   |   ' : ''}
              {effectiveInst.website ? `Website : ${effectiveInst.website}` : (effectiveInst.email ? `E-mail : ${effectiveInst.email}` : '')}
            </Typography>
          </Box>
        </Paper>

        {/* Certifications checkboxes for acceptance submission */}
        {!isAccepted && (
          <Box sx={{ mt: 2.5, px: 1 }} className="no-print">
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: '#0f172a' }}>
              Solemn Affirmations before Submission:
            </Typography>
            <FormControlLabel
              control={<Checkbox size="small" checked={certifications.no_relation} onChange={handleCertificationChange('no_relation')} />}
              label={<Typography variant="body2">1. I certify that none of my direct relations or dependents is appearing in this Examination.</Typography>}
              sx={{ display: 'flex', alignItems: 'flex-start', mb: 0.5 }}
            />
            <FormControlLabel
              control={<Checkbox size="small" checked={certifications.subject_specialization} onChange={handleCertificationChange('subject_specialization')} />}
              label={<Typography variant="body2">2. I certify that the work assigned is related to my subject of specialization.</Typography>}
              sx={{ display: 'flex', alignItems: 'flex-start', mb: 0.5 }}
            />
            <FormControlLabel
              control={<Checkbox size="small" checked={certifications.confidentiality} onChange={handleCertificationChange('confidentiality')} />}
              label={<Typography variant="body2">3. I undertake to maintain strict secrecy and highest confidentiality.</Typography>}
              sx={{ display: 'flex', alignItems: 'flex-start' }}
            />
          </Box>
        )}

        {error && <Alert severity="error" sx={{ mt: 2 }} className="no-print">{error}</Alert>}
        {successMsg && <Alert severity="success" sx={{ mt: 2 }} className="no-print">{successMsg}</Alert>}
      </DialogContent>

      <DialogActions sx={{ p: 2, justifyContent: 'space-between' }} className="no-print">
        <Button startIcon={<PrintIcon />} onClick={handlePrint} variant="outlined" color="inherit">
          Print Form
        </Button>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button onClick={onClose} color="inherit">
            {isAccepted ? 'Close' : 'Cancel'}
          </Button>
          {!isAccepted && (
            <Button
              onClick={handleSubmitAcceptance}
              variant="contained"
              color="primary"
              disabled={submitting}
              startIcon={submitting ? <CircularProgress size={16} /> : <CheckCircleIcon />}
            >
              {submitting ? 'Submitting...' : 'I Accept & Submit Acceptance Form'}
            </Button>
          )}
        </Box>
      </DialogActions>
    </Dialog>
  );
}
