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
  Paper,
  TextField,
  Alert,
  CircularProgress,
  Chip
} from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import PaymentsIcon from '@mui/icons-material/Payments';
import SaveIcon from '@mui/icons-material/Save';
import ep1 from '../../api/ep1';
import global1 from '../../pages/global1';
import { useExamConfig } from './ExamDocumentHeader';

const money = (value) => Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });

export default function ExamRemunerationBillDialog({
  open,
  onClose,
  role = 'papersetter',
  apiPrefix = '/api/v2/conductexam',
  assignmentId
}) {
  const [loading, setLoading] = useState(false);
  const [bill, setBill] = useState(null);
  const [error, setError] = useState('');
  const [editingBank, setEditingBank] = useState(false);
  const [bankForm, setBankForm] = useState({
    accountholdername: '',
    panno: '',
    accountno: '',
    ifsccode: '',
    bankname: '',
    branch: ''
  });
  const [savingBank, setSavingBank] = useState(false);
  const [bankSuccess, setBankSuccess] = useState('');

  const { config: examConfig } = useExamConfig();

  const loadBill = async () => {
    if (!assignmentId) return;
    try {
      setLoading(true);
      setError('');
      const endpoint = `${apiPrefix}/${role === 'moderator' ? 'moderator-remuneration-bill' : role === 'evaluator' ? 'evaluator-remuneration-bill' : 'papersetter-remuneration-bill'}`;
      const idParam = role === 'moderator' ? 'moderatorid' : role === 'evaluator' ? 'examinerid' : 'papersetterid';
      const res = await ep1.get(endpoint, {
        params: {
          colid: global1.colid,
          [idParam]: assignmentId,
          examineremail: global1.user
        }
      });
      if (res.data?.success) {
        setBill(res.data.bill);
        if (res.data.bill?.bankdetails) {
          setBankForm(res.data.bill.bankdetails);
        }
      } else {
        setError(res.data?.message || 'Unable to load remuneration bill.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error loading remuneration bill.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && assignmentId) {
      loadBill();
    }
  }, [open, assignmentId]);

  const handleSaveBank = async () => {
    try {
      setSavingBank(true);
      setBankSuccess('');
      const endpoint = `${apiPrefix}/${role === 'moderator' ? 'moderator-bank-details' : role === 'evaluator' ? 'evaluator-bank-details' : 'papersetter-bank-details'}`;
      const idField = role === 'moderator' ? 'moderatorid' : role === 'evaluator' ? 'examinerid' : 'papersetterid';
      const res = await ep1.post(endpoint, {
        colid: global1.colid,
        [idField]: assignmentId,
        examineremail: global1.user,
        bankdetails: bankForm,
        user: global1.user
      });
      if (res.data?.success) {
        setBankSuccess('Bank details updated successfully.');
        setEditingBank(false);
        setBill((prev) => ({ ...prev, bankdetails: res.data.bankdetails }));
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error updating bank details.');
    } finally {
      setSavingBank(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const effectiveInst = {
    institutionname: examConfig?.institutionname || bill?.institution?.institutionname || 'PEOPLE’S UNIVERSITY',
    affiliatedboard: examConfig?.affiliatedboard || bill?.institution?.affiliatedboard || 'Established Under MP Act 17 of 2007 & Covered u/s 2(f) UGC Act',
    address: examConfig?.address || bill?.institution?.address || 'People’s Campus, Bhanpur, Bhopal-462037',
    phone: examConfig?.phone || bill?.institution?.phone || '0755-4005402',
    email: examConfig?.email || bill?.institution?.email || 'coe@peoplesuniversity.edu.in',
    website: examConfig?.website || bill?.institution?.website || 'www.peoplesuniversity.edu.in',
    logo: examConfig?.logo || bill?.institution?.logo || '',
    coename: examConfig?.coename || bill?.institution?.coename || '',
    coetitle: examConfig?.coetitle || bill?.institution?.coetitle || 'Assistant Registrar(Confidential)'
  };

  const grandTotal = money(bill?.totalamount || 0);
  const grandTotalWords = bill?.totalamount_words || 'Rupees Only';
  const travelDetails = bill?.travelDetails || [];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth scroll="paper">
      {/* Print Styles for exact single page format */}
      <style>{`
        @page {
          size: A4 portrait;
          margin: 6mm 8mm;
        }

        @media print {
          header, nav, aside, .MuiAppBar-root, .MuiDrawer-root, .no-print, [role="navigation"], .MuiDialogActions-root, .MuiDialogTitle-root {
            display: none !important;
          }
          body, html {
            background: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
            font-family: Arial, Helvetica, sans-serif !important;
            color: #000000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .MuiDialog-container {
            display: block !important;
            padding: 0 !important;
          }
          .MuiPaper-root {
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            padding: 0 !important;
            max-width: 100% !important;
            width: 100% !important;
          }
          .MuiDialogContent-root {
            padding: 0 !important;
            overflow: visible !important;
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

      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }} className="no-print">
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PaymentsIcon color="success" />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Official Remuneration Bill
          </Typography>
        </Box>
        {bill?.billno && (
          <Chip label={bill.billno} color="primary" variant="outlined" size="small" sx={{ fontWeight: 700 }} />
        )}
      </DialogTitle>

      <DialogContent dividers sx={{ p: { xs: 1.5, sm: 2.5 } }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : bill ? (
          <>
            <Box className="exact-pdf-box bill-page-1" id="printable-bill">
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
                  V.No. <span style={{ borderBottom: '1px solid #000', display: 'inline-block', minWidth: '55px', textAlign: 'center' }}>{bill.vno || ''}</span>
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

            {/* Repeating Decorative / Divider Line */}
            <Box sx={{ borderBottom: '2px double #000000', my: 0.8 }} />

            {/* ======================= EXAMINER PARTICULARS ======================= */}
            <Box sx={{ fontSize: '11px', lineHeight: 1.75, mb: 1, color: '#000000' }}>
              {/* Row 1 */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Box sx={{ flex: 1, pr: 2, display: 'flex', alignItems: 'flex-end' }}>
                  <span style={{ whiteSpace: 'nowrap' }}>Name of the Examiner:</span>
                  <span style={{ flex: 1, borderBottom: '1px dotted #000', marginLeft: '4px', paddingLeft: '4px', fontWeight: 'bold' }}>
                    {bill.examinername || ''}
                  </span>
                </Box>
                <Box sx={{ width: '36%', display: 'flex', alignItems: 'flex-end' }}>
                  <span style={{ whiteSpace: 'nowrap' }}>Designation :</span>
                  <span style={{ flex: 1, borderBottom: '1px dotted #000', marginLeft: '4px', paddingLeft: '4px' }}>
                    {bill.designation || ''}
                  </span>
                </Box>
              </Box>

              {/* Row 2 */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Box sx={{ flex: 1, pr: 2, display: 'flex', alignItems: 'flex-end' }}>
                  <span style={{ whiteSpace: 'nowrap' }}>Institute Address :</span>
                  <span style={{ flex: 1, borderBottom: '1px dotted #000', marginLeft: '4px', paddingLeft: '4px' }}>
                    {bill.institute || ''}
                  </span>
                </Box>
                <Box sx={{ width: '36%', display: 'flex', alignItems: 'flex-end' }}>
                  <span style={{ whiteSpace: 'nowrap' }}>Contact No.:</span>
                  <span style={{ flex: 1, borderBottom: '1px dotted #000', marginLeft: '4px', paddingLeft: '4px' }}>
                    {bill.phone || ''}
                  </span>
                </Box>
              </Box>

              {/* Row 3 */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Box sx={{ flex: 1, pr: 2, display: 'flex', alignItems: 'flex-end' }}>
                  <span style={{ whiteSpace: 'nowrap' }}>Qualification :</span>
                  <span style={{ flex: 1, borderBottom: '1px dotted #000', marginLeft: '4px', paddingLeft: '4px' }}>
                    {bill.qualification || 'Post Graduate / Ph.D'}
                  </span>
                </Box>
                <Box sx={{ width: '36%', display: 'flex', alignItems: 'flex-end' }}>
                  <span style={{ whiteSpace: 'nowrap' }}>Specialization :</span>
                  <span style={{ flex: 1, borderBottom: '1px dotted #000', marginLeft: '4px', paddingLeft: '4px' }}>
                    {bill.specialization || bill.course || ''}
                  </span>
                </Box>
              </Box>

              {/* Row 4 */}
              <Box sx={{ display: 'flex', alignItems: 'flex-end' }}>
                <span style={{ whiteSpace: 'nowrap' }}>Experience (In Year) :</span>
                <span style={{ marginLeft: '4px' }}>UG :</span>
                <span style={{ minWidth: '40px', borderBottom: '1px dotted #000', marginLeft: '4px', textAlign: 'center' }}>
                  {bill.experience_ug || '8 Yrs'}
                </span>
                <span style={{ marginLeft: '10px' }}>PG :</span>
                <span style={{ minWidth: '40px', borderBottom: '1px dotted #000', marginLeft: '4px', textAlign: 'center' }}>
                  {bill.experience_pg || '4 Yrs'}
                </span>
                <span style={{ marginLeft: '14px', whiteSpace: 'nowrap' }}>Email ID:</span>
                <span style={{ flex: 1, borderBottom: '1px dotted #000', marginLeft: '4px', paddingLeft: '4px' }}>
                  {bill.email || ''}
                </span>
              </Box>

              {/* Row 5 */}
              <Box sx={{ display: 'flex', alignItems: 'flex-end' }}>
                <span style={{ whiteSpace: 'nowrap' }}>Program :</span>
                <span style={{ minWidth: '150px', borderBottom: '1px dotted #000', margin: '0 6px', paddingLeft: '4px' }}>
                  {bill.programcode || ''}
                </span>
                <span style={{ whiteSpace: 'nowrap' }}>Prof./Year/Semester</span>
                <span style={{ minWidth: '90px', borderBottom: '1px dotted #000', margin: '0 6px', paddingLeft: '4px', textAlign: 'center' }}>
                  {bill.semester || ''}
                </span>
                <span style={{ whiteSpace: 'nowrap' }}>:Main/Suppl./ATKT Paper Code</span>
                <span style={{ flex: 1, borderBottom: '1px dotted #000', marginLeft: '6px', paddingLeft: '4px', fontWeight: 'bold' }}>
                  {bill.coursecode || ''}
                </span>
              </Box>

              {/* Row 6 */}
              <Box sx={{ display: 'flex', alignItems: 'flex-end' }}>
                <span style={{ whiteSpace: 'nowrap' }}>Paper Name :</span>
                <span style={{ flex: 1, borderBottom: '1px dotted #000', marginLeft: '6px', paddingLeft: '4px' }}>
                  {bill.course || ''}
                </span>
              </Box>

              {/* Row 7 */}
              <Box sx={{ display: 'flex', alignItems: 'flex-end' }}>
                <span style={{ whiteSpace: 'nowrap' }}>Department :</span>
                <span style={{ flex: 1, borderBottom: '1px dotted #000', marginLeft: '6px', paddingLeft: '4px' }}>
                  {bill.department || bill.course || ''}
                </span>
              </Box>

              {/* Row 8 */}
              <Box sx={{ display: 'flex', alignItems: 'flex-end' }}>
                <span style={{ whiteSpace: 'nowrap' }}>Date of Examination :</span>
                <span style={{ flex: 1, borderBottom: '1px dotted #000', marginLeft: '6px', paddingLeft: '4px' }}>
                  {bill.billdate ? new Date(bill.billdate).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB')}
                </span>
              </Box>
            </Box>

            {/* ======================= ADDRESS TO COE ======================= */}
            <Box sx={{ fontSize: '11px', lineHeight: 1.4, mb: 1, color: '#000000' }}>
              <Typography sx={{ fontWeight: 700, fontSize: '11.5px' }}>To,</Typography>
              <Box sx={{ pl: 1.5 }}>
                <Typography sx={{ fontSize: '11px', fontWeight: 600 }}>
                  {effectiveInst.coetitle || 'Assistant Registrar(Confidential)'}
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

            {/* ======================= TABLE 1: REMUNERATION WORK ======================= */}
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
                {role === 'evaluator' || bill?.nature_of_work?.toLowerCase().includes('evaluat') ? (
                  <>
                    <tr>
                      <td style={{ border: '1px solid #000', padding: '3.5px 6px' }}>Setting of Questions Papers/Translation/Moderation</td>
                      <td style={{ border: '1px solid #000', padding: '3.5px 6px', textAlign: 'center' }}>-</td>
                      <td style={{ border: '1px solid #000', padding: '3.5px 6px', textAlign: 'right' }}>-</td>
                      <td style={{ border: '1px solid #000', padding: '3.5px 6px', textAlign: 'right', fontWeight: 'bold' }}>-</td>
                    </tr>
                    <tr>
                      <td style={{ border: '1px solid #000', padding: '3.5px 6px' }}>Evaluation / Revaluation/Retotaling of answer book/thesis</td>
                      <td style={{ border: '1px solid #000', padding: '3.5px 6px', textAlign: 'center' }}>{bill.quantity || 1}</td>
                      <td style={{ border: '1px solid #000', padding: '3.5px 6px', textAlign: 'right' }}>{bill.rate ? money(bill.rate) : ''}</td>
                      <td style={{ border: '1px solid #000', padding: '3.5px 6px', textAlign: 'right', fontWeight: 'bold' }}>Rs. {grandTotal}</td>
                    </tr>
                  </>
                ) : (
                  <>
                    <tr>
                      <td style={{ border: '1px solid #000', padding: '3.5px 6px' }}>Setting of Questions Papers/Translation/Moderation</td>
                      <td style={{ border: '1px solid #000', padding: '3.5px 6px', textAlign: 'center' }}>{bill.quantity || 1}</td>
                      <td style={{ border: '1px solid #000', padding: '3.5px 6px', textAlign: 'right' }}>{bill.rate ? money(bill.rate) : ''}</td>
                      <td style={{ border: '1px solid #000', padding: '3.5px 6px', textAlign: 'right', fontWeight: 'bold' }}>Rs. {grandTotal}</td>
                    </tr>
                    <tr>
                      <td style={{ border: '1px solid #000', padding: '3.5px 6px' }}>Evaluation / Revaluation/Retotaling of answer book/thesis</td>
                      <td style={{ border: '1px solid #000', padding: '3.5px 6px', textAlign: 'center' }}>-</td>
                      <td style={{ border: '1px solid #000', padding: '3.5px 6px', textAlign: 'right' }}>-</td>
                      <td style={{ border: '1px solid #000', padding: '3.5px 6px', textAlign: 'right', fontWeight: 'bold' }}>-</td>
                    </tr>
                  </>
                )}
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

            {/* ======================= TABLE 2: TRAVELING DETAILS ======================= */}
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
                {travelDetails && travelDetails.length > 0 ? (
                  travelDetails.map((t, idx) => (
                    <tr key={idx}>
                      <td style={{ border: '1px solid #000', padding: '3px 6px', textAlign: 'center' }}>{t.date || ''}</td>
                      <td style={{ border: '1px solid #000', padding: '3px 6px' }}>{t.from || ''}</td>
                      <td style={{ border: '1px solid #000', padding: '3px 6px' }}>{t.to || ''}</td>
                      <td style={{ border: '1px solid #000', padding: '3px 6px', textAlign: 'center' }}>{t.mode || ''}</td>
                      <td style={{ border: '1px solid #000', padding: '3px 6px', textAlign: 'right', fontWeight: 'bold' }}>{t.amount ? money(t.amount) : '-'}</td>
                    </tr>
                  ))
                ) : (
                  <>
                    <tr>
                      <td style={{ border: '1px solid #000', padding: '5px 6px' }}>&nbsp;</td>
                      <td style={{ border: '1px solid #000', padding: '5px 6px' }}>&nbsp;</td>
                      <td style={{ border: '1px solid #000', padding: '5px 6px' }}>&nbsp;</td>
                      <td style={{ border: '1px solid #000', padding: '5px 6px' }}>&nbsp;</td>
                      <td style={{ border: '1px solid #000', padding: '5px 6px', textAlign: 'right' }}>-</td>
                    </tr>
                  </>
                )}
                <tr>
                  <td colSpan={4} style={{ border: '1px solid #000', padding: '4px 10px', textAlign: 'right', fontWeight: 'bold', fontSize: '11.5px' }}>
                    Grand Total =
                  </td>
                  <td style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'right', fontWeight: 900, fontSize: '12px' }}>
                    Rs. {grandTotal}
                  </td>
                </tr>
                <tr>
                  <td colSpan={5} style={{ border: '1px solid #000', padding: '4px 8px', fontWeight: 'bold', fontSize: '11px' }}>
                    Total in Word (Rs.) : &nbsp;&nbsp; {grandTotalWords}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* ======================= CERTIFICATION ======================= */}
            <Typography sx={{ fontSize: '10px', lineHeight: 1.4, my: 0.8, textAlign: 'justify', color: '#000000' }}>
              I Certified that, I have not received TA./D.A. from any other source for this traveling and the claim has been preferred for the first time in accordance with the schedule of remuneration approved by the University.
            </Typography>

            {/* ======================= PERFORATION / CUT LINE ======================= */}
            <Box sx={{ textAlign: 'center', fontSize: '10.5px', letterSpacing: '1px', my: 0.6, color: '#000000' }}>
              " ---------------------------------------------------- &amp; ---------------------------------------------------- &amp; ---------------------------------------------------- "
            </Box>

            {/* ======================= BANK PARTICULARS (RTGS/NEFT) ======================= */}
            <Box sx={{ my: 0.6 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.3 }}>
                <Typography sx={{ fontWeight: 'bold', fontSize: '11.5px', letterSpacing: '0.5px' }}>
                  Fund Transfer Through: RTGS/NEFT
                </Typography>
                <Typography sx={{ fontSize: '11px', fontWeight: 600 }}>
                  Date: <span style={{ borderBottom: '1px dotted #000', padding: '0 15px' }}>{bill.billdate ? new Date(bill.billdate).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB')}</span>
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
                      {bill.bankdetails?.accountholdername || bill.examinername || ''}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ border: '1px solid #000', padding: '3.5px 6px', fontWeight: 'bold' }}>
                      Amount
                    </td>
                    <td style={{ border: '1px solid #000', padding: '3.5px 6px', width: '26%', fontWeight: 'bold' }}>
                      Rs. {grandTotal}
                    </td>
                    <td style={{ border: '1px solid #000', padding: '3.5px 6px', width: '25%', fontWeight: 'bold' }}>
                      Applicant's PAN No.
                    </td>
                    <td style={{ border: '1px solid #000', padding: '3.5px 6px', width: '25%', fontWeight: 'bold' }}>
                      {bill.bankdetails?.panno || bill.panno || '-'}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ border: '1px solid #000', padding: '3.5px 6px', fontWeight: 'bold' }}>
                      Account No.
                    </td>
                    <td style={{ border: '1px solid #000', padding: '3.5px 6px', fontWeight: 'bold' }}>
                      {bill.bankdetails?.accountno || bill.accountno || '-'}
                    </td>
                    <td style={{ border: '1px solid #000', padding: '3.5px 6px', fontWeight: 'bold' }}>
                      IFSC Code
                    </td>
                    <td style={{ border: '1px solid #000', padding: '3.5px 6px', fontWeight: 'bold' }}>
                      {bill.bankdetails?.ifsccode || bill.ifsccode || '-'}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ border: '1px solid #000', padding: '3.5px 6px', fontWeight: 'bold' }}>
                      Banks 'Name &amp; Branch
                    </td>
                    <td colSpan={3} style={{ border: '1px solid #000', padding: '3.5px 6px' }}>
                      {bill.bankdetails?.bankname || bill.bankname || ''} {bill.bankdetails?.branch ? `(${bill.bankdetails.branch})` : ''}
                    </td>
                  </tr>
                </tbody>
              </table>
            </Box>

            {/* ======================= SIGNATURE BLOCK ======================= */}
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
                  {bill.grandTotal || bill.totalamount ? `Rs. ${money(bill.grandTotal || bill.totalamount)}` : '…………………………………'}
                </span>
                <span> (Rupees </span>
                <span style={{ borderBottom: '1px dotted #000', display: 'inline-block', minWidth: '300px', padding: '0 6px', fontStyle: 'italic' }}>
                  {bill.grandTotalWords || bill.totalamount_words ? `${bill.grandTotalWords || bill.totalamount_words}` : '…………………………………………………………………………'}
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
      ) : null}

        {/* Bank Details Edit Drawer in Dialog */}
        {bill && !editingBank && (
          <Box sx={{ mt: 2, textAlign: 'right' }} className="no-print">
            <Button size="small" variant="outlined" onClick={() => setEditingBank(true)}>
              Update My Bank Account Details
            </Button>
          </Box>
        )}

        {editingBank && (
          <Paper sx={{ p: 2, mt: 2, bgcolor: '#f8fafc', border: '1px solid #cbd5e1' }} className="no-print">
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
              Update RTGS / NEFT Bank Details:
            </Typography>
            <Grid container spacing={1.5}>
              <Grid item xs={12} sm={6}>
                <TextField size="small" fullWidth label="Account Holder Name" value={bankForm.accountholdername} onChange={(e) => setBankForm({ ...bankForm, accountholdername: e.target.value })} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField size="small" fullWidth label="PAN No." value={bankForm.panno} onChange={(e) => setBankForm({ ...bankForm, panno: e.target.value })} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField size="small" fullWidth label="Bank Account Number" value={bankForm.accountno} onChange={(e) => setBankForm({ ...bankForm, accountno: e.target.value })} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField size="small" fullWidth label="IFSC Code" value={bankForm.ifsccode} onChange={(e) => setBankForm({ ...bankForm, ifsccode: e.target.value })} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField size="small" fullWidth label="Bank Name" value={bankForm.bankname} onChange={(e) => setBankForm({ ...bankForm, bankname: e.target.value })} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField size="small" fullWidth label="Branch Name" value={bankForm.branch} onChange={(e) => setBankForm({ ...bankForm, branch: e.target.value })} />
              </Grid>
              <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 1 }}>
                <Button size="small" onClick={() => setEditingBank(false)}>Cancel</Button>
                <Button size="small" variant="contained" color="primary" onClick={handleSaveBank} disabled={savingBank} startIcon={<SaveIcon />}>
                  {savingBank ? 'Saving...' : 'Save Bank Details'}
                </Button>
              </Grid>
            </Grid>
            {bankSuccess && <Alert severity="success" sx={{ mt: 1 }}>{bankSuccess}</Alert>}
          </Paper>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, display: 'flex', justifyContent: 'space-between' }} className="no-print">
        <Button onClick={onClose} color="inherit">
          Close
        </Button>
        <Button variant="contained" color="primary" startIcon={<PrintIcon />} onClick={handlePrint} sx={{ fontWeight: 700 }}>
          Print Remuneration Bill
        </Button>
      </DialogActions>
    </Dialog>
  );
}
