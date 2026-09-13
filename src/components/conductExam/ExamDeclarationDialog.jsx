import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Paper,
  FormControlLabel,
  Checkbox,
  TextField,
  Alert,
  CircularProgress,
  Chip
} from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import SendIcon from '@mui/icons-material/Send';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DescriptionIcon from '@mui/icons-material/Description';
import { useExamConfig } from './ExamDocumentHeader';

export default function ExamDeclarationDialog({
  open,
  onClose,
  role = 'papersetter',
  assignment = {},
  userProfile = {},
  institution = {},
  onSubmitDeclaration,
  submitting = false
}) {
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState('');
  const [specialMaterials, setSpecialMaterials] = useState('');

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

  const isAlreadyDeclared = assignment?.declarationstatus === 'Accepted' || assignment?.declarationstatus === 'Submitted';
  const existingDeclaration = assignment?.declarationdata || {};

  const paperCode = assignment?.coursecode || assignment?.papercode || '';
  const paperName = assignment?.course || assignment?.coursename || assignment?.papername || assignment?.subject || '';
  
  // Format Month & Year from exam date or current date
  const examMonthYear = assignment?.examMonthYear || assignment?.examdate || `${new Date().toLocaleString('en-US', { month: 'long' })} ${new Date().getFullYear()}`;

  const examinerCode = existingDeclaration.examinercode || assignment?.examinercode || (paperCode ? `${paperCode}-${role === 'moderator' ? 'MOD' : role === 'evaluator' ? 'EV' : 'PS'}` : '');
  const examinerName = existingDeclaration.examinername || assignment?.papersettername || assignment?.moderatorname || assignment?.examinername || userProfile?.name || 'Examiner';
  const designation = existingDeclaration.designation || assignment?.designation || userProfile?.designation || (role === 'moderator' ? 'Moderator' : role === 'evaluator' ? 'Evaluator' : 'Paper Setter');
  const workingInstitute = existingDeclaration.institute || assignment?.working_institute || assignment?.institute || userProfile?.college || userProfile?.institute || effectiveInst.institutionname || 'Affiliated Institution';

  const insName = effectiveInst.institutionname || "INSTITUTION NAME";
  const logoSrc = effectiveInst.logo || '';

  useEffect(() => {
    if (open) {
      if (existingDeclaration.special_materials) {
        setSpecialMaterials(existingDeclaration.special_materials);
      } else {
        setSpecialMaterials('Nil / As per syllabus instructions');
      }
      if (isAlreadyDeclared) {
        setAgreed(true);
      }
    }
  }, [open, existingDeclaration, isAlreadyDeclared]);

  const handleConfirm = () => {
    if (!agreed) {
      setError('You must confirm and agree to all statements in the declaration to proceed.');
      return;
    }
    setError('');
    const declarationdata = {
      examinercode: examinerCode,
      examinername: examinerName,
      designation,
      institute: workingInstitute,
      papercode: paperCode,
      papername: paperName,
      exammonthyear: examMonthYear,
      special_materials: specialMaterials,
      submissiondate: new Date().toISOString(),
      clauses_accepted: true
    };
    if (onSubmitDeclaration) {
      onSubmitDeclaration(declarationdata);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const roleLabel = role === 'moderator' ? 'Moderator' : role === 'evaluator' ? 'Evaluator' : 'Paper Setter';

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
          .declaration-print-card {
            border: none !important;
            padding: 0 !important;
            box-shadow: none !important;
          }
        }
      `}</style>

      <DialogTitle className="no-print" sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <DescriptionIcon color="primary" />
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            Official Declaration Form
          </Typography>
        </Box>
        {isAlreadyDeclared && (
          <Chip icon={<CheckCircleIcon />} label="Declaration Submitted" color="success" size="small" sx={{ fontWeight: 700 }} />
        )}
      </DialogTitle>

      <DialogContent dividers sx={{ p: { xs: 2, sm: 3 }, bgcolor: '#f8fafc' }}>
        <Paper
          elevation={0}
          className="declaration-print-card"
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
        >
          {/* ================= HEADER ================= */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
            {/* Top Left: Logo */}
            <Box sx={{ width: '130px', minHeight: '80px', display: 'flex', alignItems: 'center' }}>
              {logoSrc ? (
                <Box
                  component="img"
                  src={logoSrc}
                  alt="Institution Logo"
                  sx={{ maxHeight: 95, maxWidth: 130, objectFit: 'contain' }}
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              ) : null}
            </Box>

            {/* Top Right: Institution Name & Affiliation */}
            <Box sx={{ flex: 1, textAlign: 'right', pl: 2 }}>
              <Typography
                component="h1"
                sx={{
                  fontFamily: 'Arial, Helvetica, sans-serif',
                  fontWeight: 900,
                  fontSize: { xs: '24px', sm: '32px', md: '36px' },
                  letterSpacing: '1px',
                  textTransform: 'uppercase',
                  lineHeight: 1.15,
                  color: '#000000',
                  m: 0,
                  textDecoration: 'underline'
                }}
              >
                {insName}
              </Typography>
              {effectiveInst.affiliatedboard && (
                <Typography
                  sx={{
                    fontFamily: 'Arial, Helvetica, sans-serif',
                    fontWeight: 700,
                    fontSize: { xs: '12px', sm: '13px' },
                    color: '#000000',
                    mt: 0.8
                  }}
                >
                  {effectiveInst.affiliatedboard.startsWith('(')
                    ? effectiveInst.affiliatedboard
                    : effectiveInst.affiliatedboard}
                </Typography>
              )}
            </Box>
          </Box>

          {/* Solid separator line */}
          <Box sx={{ borderBottom: '1.5px solid #000000', my: 1.5, width: '100%' }} />

          {/* ================= TITLE BLOCK ================= */}
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Typography
              component="h2"
              sx={{
                fontWeight: 900,
                fontSize: { xs: '20px', sm: '24px' },
                letterSpacing: '1.2px',
                textTransform: 'uppercase',
                color: '#000000',
                fontFamily: 'Arial, Helvetica, sans-serif',
                mb: 0.5
              }}
            >
              DECLARATION FORM
            </Typography>
            <Typography
              component="h3"
              sx={{
                fontWeight: 700,
                fontSize: { xs: '14px', sm: '16px' },
                color: '#000000',
                fontFamily: 'Arial, Helvetica, sans-serif',
                mb: 1
              }}
            >
              (To be submitted by {roleLabel})
            </Typography>
            <Typography
              variant="body2"
              sx={{
                fontSize: '12px',
                color: '#000000',
                fontFamily: 'Arial, Helvetica, sans-serif',
                lineHeight: 1.4
              }}
            >
              (This form should be kept in the out cover envelope and not in the inner envelope containing Question Paper)
            </Typography>
          </Box>

          {/* ================= NUMBERED CLAUSES ================= */}
          <Box sx={{ mb: 4, fontSize: '13.5px', lineHeight: 1.75, color: '#000000' }}>
            {/* Clause 1 */}
            <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
              <Typography sx={{ fontWeight: 600, fontSize: '13.5px', minWidth: '24px', color: '#000000' }}>
                1.
              </Typography>
              <Typography sx={{ fontSize: '13.5px', color: '#000000', lineHeight: 1.75, textAlign: 'justify' }}>
                I declared that I have destroyed all rough notes etc. related to the question paper of Paper Code :{' '}
                <span style={{ fontWeight: 700, borderBottom: '1px dotted #000', padding: '0 4px' }}>
                  {paperCode || '.....................'}
                </span>{' '}
                Paper Name :{' '}
                <span style={{ fontWeight: 700, borderBottom: '1px dotted #000', padding: '0 4px' }}>
                  {paperName || '....................................................................................'}
                </span>{' '}
                Examination (Month &amp; Year){' '}
                <span style={{ fontWeight: 700, borderBottom: '1px dotted #000', padding: '0 4px' }}>
                  {examMonthYear || '...................................'}
                </span>{' '}
                That I have set. The papers on which the question has been written neither bear my signature nor my name. I assign full authority regarding the use of this question paper to the{' '}
                <span style={{ fontWeight: 700 }}>{insName}{effectiveInst.address ? `, ${effectiveInst.address.split(',')[0]}` : ''}</span>.
              </Typography>
            </Box>

            {/* Clause 2 */}
            <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
              <Typography sx={{ fontWeight: 600, fontSize: '13.5px', minWidth: '24px', color: '#000000' }}>
                2.
              </Typography>
              <Typography sx={{ fontSize: '13.5px', color: '#000000', lineHeight: 1.75 }}>
                I further declare that I myself have written the question paper.
              </Typography>
            </Box>

            {/* Clause 3 */}
            <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
              <Typography sx={{ fontWeight: 600, fontSize: '13.5px', minWidth: '24px', color: '#000000' }}>
                3.
              </Typography>
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ fontSize: '13.5px', color: '#000000', lineHeight: 1.75 }}>
                  In my question paper the examinees may be supplied with the following special materials (if no material is to be supplied kindly strike out the point) :
                </Typography>
                <Box sx={{ mt: 0.5 }}>
                  {isAlreadyDeclared ? (
                    <Typography sx={{ fontWeight: 700, borderBottom: '1px dotted #000', py: 0.5 }}>
                      {specialMaterials || 'None'}
                    </Typography>
                  ) : (
                    <TextField
                      size="small"
                      fullWidth
                      placeholder="e.g. None / Graph sheet / Steam table / Scientific calculator"
                      value={specialMaterials}
                      onChange={(e) => setSpecialMaterials(e.target.value)}
                      sx={{
                        '& .MuiInputBase-input': { fontSize: '13px', py: 0.8 },
                        '@media print': {
                          border: 'none',
                          '& fieldset': { border: 'none' },
                          '& input': { borderBottom: '1px dotted #000', padding: '2px 0' }
                        }
                      }}
                    />
                  )}
                </Box>
              </Box>
            </Box>

            {/* Clause 4 */}
            <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
              <Typography sx={{ fontWeight: 600, fontSize: '13.5px', minWidth: '24px', color: '#000000' }}>
                4.
              </Typography>
              <Typography sx={{ fontSize: '13.5px', color: '#000000', lineHeight: 1.75, textAlign: 'justify' }}>
                The pages of textbooks that have been quoted in the question paper are mentioned in memo enclosed along with the question paper. (This point is applicable to paper setter for languages and mathematics only, others may kindly strike it out).
              </Typography>
            </Box>

            {/* Clause 5 */}
            <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
              <Typography sx={{ fontWeight: 600, fontSize: '13.5px', minWidth: '24px', color: '#000000' }}>
                5.
              </Typography>
              <Typography sx={{ fontSize: '13.5px', color: '#000000', lineHeight: 1.75, textAlign: 'justify' }}>
                I have maintained strict confidentially, and have not discussed these questions with any one, and I have not save any hard or soft copy of paper or a part of it.
              </Typography>
            </Box>
          </Box>

          {/* ================= SIGNATORY / PARTICULAR SECTION ================= */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mt: 5, mb: 4 }}>
            {/* Left: Examiner Code No. */}
            <Box sx={{ width: '45%' }}>
              <Typography sx={{ fontSize: '13.5px', color: '#000000', lineHeight: 2.2 }}>
                <strong>Examiner Code No. :</strong>{' '}
                <span style={{ fontWeight: 700, borderBottom: '1px dotted #000', padding: '0 6px', display: 'inline-block', minWidth: '130px' }}>
                  {examinerCode}
                </span>
              </Typography>
            </Box>

            {/* Right: Signature with date, Name, Designation, Institute */}
            <Box sx={{ width: '52%', textAlign: 'left' }}>
              <Box sx={{ mb: 2.5, textAlign: 'right' }}>
                <Typography sx={{ fontSize: '13.5px', color: '#000000', fontWeight: 700, fontStyle: 'italic' }}>
                  Signature with date
                </Typography>
                {isAlreadyDeclared ? (
                  <Typography variant="caption" sx={{ color: '#16a34a', fontWeight: 600, display: 'block' }}>
                    ✓ Electronically Verified ({new Date(existingDeclaration.submissiondate || Date.now()).toLocaleDateString('en-GB')})
                  </Typography>
                ) : (
                  <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                    (Signatory / Examiner)
                  </Typography>
                )}
              </Box>

              <Typography sx={{ fontSize: '13.5px', color: '#000000', lineHeight: 2.2 }}>
                <strong>Name :</strong>{' '}
                <span style={{ fontWeight: 700, borderBottom: '1px dotted #000', padding: '0 6px', display: 'inline-block', minWidth: '220px' }}>
                  {examinerName}
                </span>
              </Typography>
              <Typography sx={{ fontSize: '13.5px', color: '#000000', lineHeight: 2.2 }}>
                <strong>Desgination :</strong>{' '}
                <span style={{ fontWeight: 600, borderBottom: '1px dotted #000', padding: '0 6px', display: 'inline-block', minWidth: '220px' }}>
                  {designation}
                </span>
              </Typography>
              <Typography sx={{ fontSize: '13.5px', color: '#000000', lineHeight: 2.2 }}>
                <strong>Institute :</strong>{' '}
                <span style={{ fontWeight: 600, borderBottom: '1px dotted #000', padding: '0 6px', display: 'inline-block', minWidth: '220px' }}>
                  {workingInstitute}
                </span>
              </Typography>
            </Box>
          </Box>

          {/* ================= FOOTER ================= */}
          <Box sx={{ borderTop: '1.5px solid #000000', pt: 1.5, mt: 4, textAlign: 'center' }}>
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

        {/* Confirmation Checkbox */}
        {!isAlreadyDeclared && (
          <Box sx={{ mt: 2.5, px: 1 }} className="no-print">
            <FormControlLabel
              control={
                <Checkbox
                  checked={agreed}
                  onChange={(e) => {
                    setAgreed(e.target.checked);
                    if (e.target.checked) setError('');
                  }}
                  color="primary"
                />
              }
              label={
                <Typography variant="body2" sx={{ fontWeight: 700, color: '#0f172a' }}>
                  I solemnly affirm, declare and confirm that all the statements made in points 1 to 5 above are true to the best of my knowledge and belief.
                </Typography>
              }
            />
          </Box>
        )}

        {error && <Alert severity="error" sx={{ mt: 2 }} className="no-print">{error}</Alert>}
      </DialogContent>

      <DialogActions sx={{ p: 2, justifyContent: 'space-between' }} className="no-print">
        <Button startIcon={<PrintIcon />} onClick={handlePrint} variant="outlined" color="inherit">
          Print Declaration Form
        </Button>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button onClick={onClose} color="inherit" disabled={submitting}>
            {isAlreadyDeclared ? 'Close' : 'Cancel'}
          </Button>
          {!isAlreadyDeclared && (
            <Button
              onClick={handleConfirm}
              variant="contained"
              color="primary"
              disabled={!agreed || submitting}
              startIcon={submitting ? <CircularProgress size={16} /> : <SendIcon />}
            >
              {submitting ? 'Submitting...' : (role === 'moderator' ? 'Accept & Submit Moderation' : 'Accept & Submit Question Paper')}
            </Button>
          )}
        </Box>
      </DialogActions>
    </Dialog>
  );
}
