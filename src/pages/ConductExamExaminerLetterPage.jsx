import React, { useEffect, useMemo, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Card,
  Checkbox,
  Chip,
  Grid,
  InputAdornment,
  LinearProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography
} from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import SearchIcon from '@mui/icons-material/Search';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import RefreshIcon from '@mui/icons-material/Refresh';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ep1 from '../api/ep1';
import global1 from './global1';
import MenuPageShell from './MenuPageShell';
import universityLogo from '../assets/peoples_university_logo.jpg';

const DEFAULT_SAMPLE_EXAMINERS = [
  {
    id: 'sample-1',
    papercode: 'BD-301',
    papername: 'General Medicine',
    examinername: 'Dr. Rakesh Singh Jagat',
    designation: 'Professor',
    institute: 'GMC, Bhopal [MP]',
    examinerFull: 'Dr. Rakesh Singh Jagat, Professor, GMC, Bhopal [MP].',
    contactno: '9425021367',
    program: 'BDS',
    exam: '[MAIN]',
    year: 'Third'
  },
  {
    id: 'sample-2',
    papercode: 'BD-302',
    papername: 'General Surgery',
    examinername: 'Dr. Rajesh Lonare',
    designation: 'Professor',
    institute: 'RKDF, Bhopal [MP]',
    examinerFull: 'Dr. Rajesh Lonare, Professor, RKDF, Bhopal [MP].',
    contactno: '9826362508',
    program: 'BDS',
    exam: '[MAIN]',
    year: 'Third'
  },
  {
    id: 'sample-3',
    papercode: 'BD-303',
    papername: 'Oral Pathology & Oral Microbiology',
    examinername: 'Dr. Medhini Singaraju',
    designation: 'Professor',
    institute: 'Rishiraj College of Dental Sciences, Bhopal [MP]',
    examinerFull: 'Dr. Medhini Singaraju, Professor, Rishiraj College of Dental Sciences, Bhopal [MP].',
    contactno: '9617389783',
    program: 'BDS',
    exam: '[MAIN]',
    year: 'Third'
  },
  {
    id: 'sample-4',
    papercode: 'BN-401',
    papername: 'Midwifery and Obstetrical Nursing',
    examinername: 'Ms. Divya Sharma',
    designation: 'Assistant Professor',
    institute: 'Jai Narayan College of Nursing, Bhopal [MP]',
    examinerFull: 'Ms. Divya Sharma, Assistant Professor, Jai Narayan College of Nursing, Bhopal [MP].',
    contactno: '9826112233',
    program: 'B.Sc Nursing',
    exam: 'Supplementary',
    year: 'Fourth Year'
  },
  {
    id: 'sample-5',
    papercode: 'BN-402',
    papername: 'Community Health Nursing-II',
    examinername: 'Mr. Alan Smith Bernard',
    designation: 'Associate Professor',
    institute: 'Rajeev Gandhi College of Nursing, Bhopal [MP]',
    examinerFull: 'Mr. Alan Smith Bernard, Associate Professor, Rajeev Gandhi College of Nursing, Bhopal [MP].',
    contactno: '9752001122',
    program: 'B.Sc Nursing',
    exam: 'Supplementary',
    year: 'Fourth Year'
  }
];

export default function ConductExamExaminerLetterPage() {
  const colid = global1.colid || 1;

  // Examiner source data
  const [examinerList, setExaminerList] = useState(DEFAULT_SAMPLE_EXAMINERS);
  const [selectedIds, setSelectedIds] = useState(['sample-1', 'sample-2', 'sample-3']);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPreviewOnly, setShowPreviewOnly] = useState(false);

  // Editable Letter Metadata
  const [examConfig, setExamConfig] = useState(null);
  const [meta, setMeta] = useState({
    fromTitle: 'Assistant Registrar(Confidential)',
    toTitle: 'Dean-PDA',
    refNo: 'PU/COE/EEP/Intra/D/2026/002/A/0020',
    date: '08/01/2026',
    examination: '[MAIN]',
    program: 'BDS',
    profYear: 'Third',
    fileType: 'Confidential',
    fileNo: '',
    section: 'Conduct',
    subject: 'Approved list of External Examiners for Practical Examination',
    startDate: '17/01/2026',
    endDate: '31/01/2026',
    signatoryName: '',
    signatoryDesignation: 'Assistant Registrar(Confidential)',
    copyTo1: 'In-Charge (Conduct) - for coordination with HOI/HOD of the institute.',
    copyTo2: 'Assistant Registrar (Evaluation) - for coordination with HOI/HOD regarding Evaluation.'
  });

  // Custom examiner addition state
  const [customExaminer, setCustomExaminer] = useState({
    papercode: '',
    papername: '',
    examinername: '',
    designation: 'Professor',
    institute: 'Bhopal [MP]',
    contactno: ''
  });
  const [showAddForm, setShowAddForm] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const [exRes, allotRes, cfgRes] = await Promise.allSettled([
        ep1.get('/api/v2/conductexam/examiners', { params: { colid } }),
        ep1.get('/api/v2/conductexam/examiner-allotments', { params: { colid } }),
        ep1.get('/api/v2/conductexam/configuration', { params: { colid } })
      ]);

      if (cfgRes.status === 'fulfilled' && cfgRes.value?.data?.data) {
        const cfg = cfgRes.value.data.data;
        setExamConfig(cfg);
        const prefix = (cfg.institutionname || 'PU').split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 4).toUpperCase() || 'EXAM';
        setMeta(prev => ({
          ...prev,
          signatoryName: cfg.coename ? `(${cfg.coename})` : prev.signatoryName,
          signatoryDesignation: cfg.coetitle || prev.signatoryDesignation,
          refNo: prev.refNo.replace(/^[A-Z0-9]+\/COE/, `${prefix}/COE`)
        }));
      }

      const items = [];
      if (exRes.status === 'fulfilled' && exRes.value?.data?.data?.length > 0) {
        exRes.value.data.data.forEach((row, i) => {
          items.push({
            id: row._id || `db-ex-${i}`,
            papercode: row.coursecode || row.papercode || 'Course',
            papername: row.course || row.papername || row.subject || 'Paper Name',
            examinername: row.examinername || 'Examiner Name',
            designation: row.designation || 'Professor',
            institute: row.instituteaddress || row.address || 'Bhopal [MP]',
            examinerFull: `${row.examinername || 'Examiner'}${row.designation ? ', ' + row.designation : ''}${row.instituteaddress ? ', ' + row.instituteaddress : ''}`,
            contactno: row.contactno || row.examinerphone || row.examineremail || '-',
            examinercode: row.examinercode || '',
            program: row.program || '',
            exam: row.exam || '',
            year: row.academicyear || ''
          });
        });
      }

      if (allotRes.status === 'fulfilled' && allotRes.value?.data?.data?.length > 0) {
        allotRes.value.data.data.forEach((row, i) => {
          if (!items.some((item) => item.papercode === (row.coursecode || row.papercode) && item.examinername === row.examinername)) {
            items.push({
              id: row._id || `db-allot-${i}`,
              papercode: row.coursecode || row.papercode || 'Course',
              papername: row.course || row.papername || row.subject || 'Paper Name',
              examinername: row.examinername || 'Examiner Name',
              designation: row.designation || 'Professor',
              institute: row.instituteaddress || row.address || 'Bhopal [MP]',
              examinerFull: `${row.examinername || 'Examiner'}${row.designation ? ', ' + row.designation : ''}${row.instituteaddress ? ', ' + row.instituteaddress : ''}`,
              contactno: row.contactno || row.examinerphone || row.examineremail || '-',
              examinercode: row.examinercode || '',
              program: row.program || '',
              exam: row.exam || '',
              year: row.academicyear || ''
            });
          }
        });
      }


      if (items.length > 0) {
        setExaminerList([...items, ...DEFAULT_SAMPLE_EXAMINERS]);
      } else {
        setExaminerList(DEFAULT_SAMPLE_EXAMINERS);
      }
    } catch {
      setError('Using sample examiners data.');
      setExaminerList(DEFAULT_SAMPLE_EXAMINERS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filtered Examiner list for selection table
  const displayedExaminers = useMemo(() => {
    return examinerList.filter((item) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        item.papercode.toLowerCase().includes(q) ||
        item.papername.toLowerCase().includes(q) ||
        item.examinername.toLowerCase().includes(q) ||
        item.contactno.toLowerCase().includes(q) ||
        (item.program && item.program.toLowerCase().includes(q))
      );
    });
  }, [examinerList, searchQuery]);

  // Selected examiners that will be rendered inside the printed letter table
  const selectedExaminersForLetter = useMemo(() => {
    return examinerList
      .filter((item) => selectedIds.includes(item.id))
      .map((item, idx) => ({
        ...item,
        sno: idx + 1
      }));
  }, [examinerList, selectedIds]);

  const handleToggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === displayedExaminers.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(displayedExaminers.map((item) => item.id));
    }
  };

  const handleAddCustomExaminer = () => {
    if (!customExaminer.papercode || !customExaminer.examinername) {
      setError('Please provide at least Paper Code and Examiner Name.');
      return;
    }
    const newId = `custom-${Date.now()}`;
    const newItem = {
      id: newId,
      papercode: customExaminer.papercode,
      papername: customExaminer.papername || 'Paper Name',
      examinername: customExaminer.examinername,
      designation: customExaminer.designation,
      institute: customExaminer.institute,
      examinerFull: `${customExaminer.examinername}${customExaminer.designation ? ', ' + customExaminer.designation : ''}${customExaminer.institute ? ', ' + customExaminer.institute : ''}`,
      contactno: customExaminer.contactno || '-'
    };
    setExaminerList([newItem, ...examinerList]);
    setSelectedIds([...selectedIds, newId]);
    setCustomExaminer({
      papercode: '',
      papername: '',
      examinername: '',
      designation: 'Professor',
      institute: 'Bhopal [MP]',
      contactno: ''
    });
    setShowAddForm(false);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <MenuPageShell title="Generate Examiner Letter">
      <Box sx={{ p: { xs: 1.5, md: 3 }, bgcolor: '#f1f5f9', minHeight: '100vh' }}>
        {/* Dynamic Print Stylesheet */}
        <style>{`
          @media print {
            body * {
              visibility: hidden;
            }
            #printable-examiner-letter, #printable-examiner-letter * {
              visibility: visible;
            }
            #printable-examiner-letter {
              position: absolute;
              left: 0;
              top: 0;
              width: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
              background: #fff !important;
            }
            .screen-only {
              display: none !important;
            }
            table {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            th {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          }

          @page {
            size: A4 portrait;
            margin: 10mm 12mm;
          }

          .letter-table {
            width: 100%;
            border-collapse: collapse;
            font-family: Arial, sans-serif;
            color: #000;
          }
          .letter-table th, .letter-table td {
            border: 1px solid #000;
            padding: 5.5px 7px;
            font-size: 11.5px;
            vertical-align: middle;
          }
          .letter-table th {
            background-color: #ffff00 !important;
            font-weight: bold;
            color: #000;
            text-align: center;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .meta-table {
            width: 100%;
            border-collapse: collapse;
            font-family: Arial, sans-serif;
            color: #000;
            margin-bottom: 12px;
          }
          .meta-table td {
            border: 1px solid #000;
            padding: 4px 8px;
            font-size: 12.5px;
            font-weight: bold;
          }
        `}</style>

        {/* ================= SCREEN-ONLY SELECTION & CONFIGURATION PANEL ================= */}
        <Box className="screen-only" sx={{ mb: 3 }}>
          <Paper elevation={1} sx={{ p: 2.5, borderRadius: 2, mb: 2.5, bgcolor: '#fff' }}>
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              justifyContent="space-between"
              alignItems={{ xs: 'flex-start', md: 'center' }}
              spacing={2}
            >
              <Box>
                <Typography variant="h5" fontWeight={800} color="#1e293b">
                  Generate Examiner Appointment Letter
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Select examiners from the list below to generate and print the official university appointment order.
                </Typography>
              </Box>

              <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
                <Chip
                  color="primary"
                  variant="outlined"
                  icon={<CheckCircleIcon />}
                  label={`${selectedIds.length} Examiner${selectedIds.length === 1 ? '' : 's'} Selected`}
                  sx={{ fontWeight: 700 }}
                />

                <Button
                  variant="contained"
                  color="error"
                  startIcon={<PrintIcon />}
                  onClick={handlePrint}
                  disabled={selectedIds.length === 0}
                  sx={{
                    fontWeight: 800,
                    px: 3,
                    bgcolor: '#d32f2f',
                    '&:hover': { bgcolor: '#b71c1c' }
                  }}
                >
                  Print Letter
                </Button>

                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={loadData}
                  disabled={loading}
                >
                  Reload List
                </Button>

                <Button
                  variant={showPreviewOnly ? 'contained' : 'outlined'}
                  color="secondary"
                  startIcon={<VisibilityIcon />}
                  onClick={() => setShowPreviewOnly(!showPreviewOnly)}
                >
                  {showPreviewOnly ? 'Show Selection Grid' : 'Full Preview Only'}
                </Button>
              </Stack>
            </Stack>

            {loading && <LinearProgress sx={{ mt: 2 }} />}
          </Paper>

          {error && (
            <Alert severity="warning" sx={{ mb: 2 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          {/* Collapsible Document Metadata Editor */}
          <Accordion defaultExpanded={false} sx={{ mb: 2.5, borderRadius: '8px !important', border: '1px solid #cbd5e1' }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography fontWeight={700} color="#334155">
                ✏️ Edit Letter Header, Reference No, Dates &amp; Authorities
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <TextField
                    fullWidth
                    size="small"
                    label="From"
                    value={meta.fromTitle}
                    onChange={(e) => setMeta({ ...meta, fromTitle: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <TextField
                    fullWidth
                    size="small"
                    label="To"
                    value={meta.toTitle}
                    onChange={(e) => setMeta({ ...meta, toTitle: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Ref No."
                    value={meta.refNo}
                    onChange={(e) => setMeta({ ...meta, refNo: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Date"
                    value={meta.date}
                    onChange={(e) => setMeta({ ...meta, date: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} sm={4} md={2}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Examination"
                    value={meta.examination}
                    onChange={(e) => setMeta({ ...meta, examination: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} sm={4} md={2}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Program"
                    value={meta.program}
                    onChange={(e) => setMeta({ ...meta, program: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} sm={4} md={2}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Prof./Year"
                    value={meta.profYear}
                    onChange={(e) => setMeta({ ...meta, profYear: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} sm={4} md={2}>
                  <TextField
                    fullWidth
                    size="small"
                    label="File Type"
                    value={meta.fileType}
                    onChange={(e) => setMeta({ ...meta, fileType: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} sm={4} md={2}>
                  <TextField
                    fullWidth
                    size="small"
                    label="File No"
                    value={meta.fileNo}
                    onChange={(e) => setMeta({ ...meta, fileNo: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} sm={4} md={2}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Section"
                    value={meta.section}
                    onChange={(e) => setMeta({ ...meta, section: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Subject"
                    value={meta.subject}
                    onChange={(e) => setMeta({ ...meta, subject: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Practical Start Date (Point 3)"
                    value={meta.startDate}
                    onChange={(e) => setMeta({ ...meta, startDate: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Practical End Date (Point 3)"
                    value={meta.endDate}
                    onChange={(e) => setMeta({ ...meta, endDate: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Signatory Name"
                    value={meta.signatoryName}
                    onChange={(e) => setMeta({ ...meta, signatoryName: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Signatory Designation"
                    value={meta.signatoryDesignation}
                    onChange={(e) => setMeta({ ...meta, signatoryDesignation: e.target.value })}
                  />
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>

          {/* Examiner Selection Table (Hidden if Preview Only is toggled) */}
          {!showPreviewOnly && (
            <Paper elevation={1} sx={{ p: 2.5, borderRadius: 2, mb: 3, bgcolor: '#fff' }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems="center" spacing={2} sx={{ mb: 2 }}>
                <TextField
                  size="small"
                  placeholder="Search examiners by name, paper code, subject..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  sx={{ width: { xs: '100%', sm: 380 } }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon color="action" />
                      </InputAdornment>
                    )
                  }}
                />

                <Stack direction="row" spacing={1}>
                  <Button size="small" variant="outlined" onClick={handleSelectAll}>
                    {selectedIds.length === displayedExaminers.length ? 'Deselect All' : 'Select All Filtered'}
                  </Button>
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={<AddCircleOutlineIcon />}
                    onClick={() => setShowAddForm(!showAddForm)}
                  >
                    {showAddForm ? 'Close Add Form' : 'Add Custom Examiner'}
                  </Button>
                </Stack>
              </Stack>

              {/* Add Custom Examiner Form */}
              {showAddForm && (
                <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: '#f8fafc', borderColor: '#3b82f6' }}>
                  <Typography variant="subtitle2" fontWeight={700} color="#1e40af" sx={{ mb: 1.5 }}>
                    Add Custom Examiner to List:
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6} md={2}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Paper Code *"
                        placeholder="e.g. BD-301"
                        value={customExaminer.papercode}
                        onChange={(e) => setCustomExaminer({ ...customExaminer, papercode: e.target.value })}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Paper Name *"
                        placeholder="e.g. General Medicine"
                        value={customExaminer.papername}
                        onChange={(e) => setCustomExaminer({ ...customExaminer, papername: e.target.value })}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Examiner Name *"
                        placeholder="e.g. Dr. Rakesh Singh"
                        value={customExaminer.examinername}
                        onChange={(e) => setCustomExaminer({ ...customExaminer, examinername: e.target.value })}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6} md={2}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Designation"
                        value={customExaminer.designation}
                        onChange={(e) => setCustomExaminer({ ...customExaminer, designation: e.target.value })}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6} md={2}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Contact No."
                        placeholder="e.g. 9826362508"
                        value={customExaminer.contactno}
                        onChange={(e) => setCustomExaminer({ ...customExaminer, contactno: e.target.value })}
                      />
                    </Grid>
                    <Grid item xs={12} sm={12} md={9}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Institute Address"
                        placeholder="e.g. GMC, Bhopal [MP]"
                        value={customExaminer.institute}
                        onChange={(e) => setCustomExaminer({ ...customExaminer, institute: e.target.value })}
                      />
                    </Grid>
                    <Grid item xs={12} sm={12} md={3}>
                      <Button
                        fullWidth
                        variant="contained"
                        onClick={handleAddCustomExaminer}
                        sx={{ height: 40 }}
                      >
                        Add &amp; Include in Letter
                      </Button>
                    </Grid>
                  </Grid>
                </Paper>
              )}

              {/* Examiner Selection Table */}
              <TableContainer sx={{ maxHeight: 340, border: '1px solid #e2e8f0', borderRadius: 1 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell padding="checkbox" sx={{ bgcolor: '#f8fafc' }}>
                        <Checkbox
                          checked={selectedIds.length > 0 && selectedIds.length === displayedExaminers.length}
                          indeterminate={selectedIds.length > 0 && selectedIds.length < displayedExaminers.length}
                          onChange={handleSelectAll}
                        />
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700, bgcolor: '#f8fafc' }}>Paper Code</TableCell>
                      <TableCell sx={{ fontWeight: 700, bgcolor: '#f8fafc' }}>Paper Name</TableCell>
                      <TableCell sx={{ fontWeight: 700, bgcolor: '#f8fafc' }}>Examiner Name &amp; Institute</TableCell>
                      <TableCell sx={{ fontWeight: 700, bgcolor: '#f8fafc' }}>Contact No.</TableCell>
                      <TableCell sx={{ fontWeight: 700, bgcolor: '#f8fafc' }}>Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {displayedExaminers.map((item) => {
                      const isSelected = selectedIds.includes(item.id);
                      return (
                        <TableRow
                          key={item.id}
                          hover
                          onClick={() => handleToggleSelect(item.id)}
                          sx={{
                            cursor: 'pointer',
                            bgcolor: isSelected ? '#f0f9ff' : 'inherit'
                          }}
                        >
                          <TableCell padding="checkbox">
                            <Checkbox checked={isSelected} />
                          </TableCell>
                          <TableCell sx={{ fontWeight: 700, color: '#1e3a8a' }}>{item.papercode}</TableCell>
                          <TableCell>{item.papername}</TableCell>
                          <TableCell>{item.examinerFull}</TableCell>
                          <TableCell>{item.contactno}</TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label={isSelected ? 'Selected' : 'Select'}
                              color={isSelected ? 'primary' : 'default'}
                              variant={isSelected ? 'filled' : 'outlined'}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          )}
        </Box>

        {/* ================= PRINTABLE LETTER DOCUMENT ================= */}
        <Box id="printable-examiner-letter">
          <Card
            elevation={0}
            sx={{
              maxWidth: '210mm',
              margin: '0 auto',
              p: { xs: 2, sm: 3, md: 4 },
              bgcolor: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: 1
            }}
          >
            {/* University Header with Logo - Dynamic from Exam Configuration */}
            <Box sx={{ textAlign: 'center', mb: 1.5 }}>
              {(examConfig?.logo || universityLogo) && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mb: 0.8 }}>
                  <Box
                    component="img"
                    src={examConfig?.logo || universityLogo}
                    alt="University Logo"
                    sx={{ maxHeight: 68, maxWidth: 130, objectFit: 'contain' }}
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                </Box>
              )}

              {/* Extra-large bold uppercase Institution Name */}
              <Typography
                component="h1"
                sx={{
                  fontFamily: '"Times New Roman", Times, Georgia, serif',
                  fontWeight: 900,
                  fontSize: { xs: '24px', sm: '32px' },
                  letterSpacing: '1.2px',
                  color: '#1a237e',
                  textTransform: 'uppercase',
                  lineHeight: 1.15,
                  m: 0
                }}
              >
                {examConfig?.institutionname || "INSTITUTION NAME"}
              </Typography>

              {/* Affiliated Board right under Institution Name */}
              {examConfig?.affiliatedboard && (
                <Typography
                  sx={{
                    fontFamily: '"Times New Roman", Times, Georgia, serif',
                    fontWeight: 700,
                    fontSize: '13px',
                    color: '#c2410c',
                    mt: 0.3,
                    letterSpacing: '0.5px'
                  }}
                >
                  {examConfig.affiliatedboard.startsWith('(') ? examConfig.affiliatedboard : `(${examConfig.affiliatedboard})`}
                </Typography>
              )}

              {/* Address / Contact line */}
              <Box sx={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#000', mt: 0.3 }}>
                {examConfig?.address && <span>{examConfig.address}</span>}
                {examConfig?.phone && <span> &nbsp;|&nbsp; Ph: {examConfig.phone}</span>}
                {examConfig?.email && (
                  <span> &nbsp;|&nbsp; E-mail: <span style={{ color: '#2563eb' }}>{examConfig.email}</span></span>
                )}
              </Box>

              {/* Office of COE */}
              <Typography
                sx={{
                  fontFamily: '"Times New Roman", Times, Georgia, serif',
                  fontWeight: 900,
                  fontSize: '16px',
                  color: '#1e3a8a',
                  letterSpacing: '0.5px',
                  mt: 0.6,
                  textTransform: 'uppercase'
                }}
              >
                {examConfig?.coetitle ? `OFFICE OF ${examConfig.coetitle.toUpperCase()}` : 'OFFICE OF CONTROLLER OF EXAMINATIONS'}
              </Typography>

              {/* Dotted border separator */}
              <Box
                sx={{
                  borderBottom: '2.5px dotted #1e3a8a',
                  my: 1.2,
                  width: '100%'
                }}
              />
            </Box>

            {/* Document Details / Metadata Box */}
            <table className="meta-table">
              <tbody>
                <tr>
                  <td style={{ width: '50%' }}>From:- {meta.fromTitle}</td>
                  <td style={{ width: '50%' }}>To:- {meta.toTitle}</td>
                </tr>
                <tr>
                  <td>Ref No.:-{meta.refNo}</td>
                  <td>Date: Date:-{meta.date}</td>
                </tr>
                <tr>
                  <td>
                    Examination:- <span style={{ fontWeight: 800 }}>{meta.examination}</span>
                  </td>
                  <td>
                    Program:- <span style={{ fontWeight: 800 }}>{meta.program}</span> &nbsp;&nbsp;&nbsp;&nbsp; Prof./Year:-{' '}
                    <span style={{ fontWeight: 800 }}>{meta.profYear}</span>
                  </td>
                </tr>
                <tr>
                  <td>
                    File Type:- {meta.fileType} &nbsp;&nbsp;&nbsp;&nbsp; File No:- {meta.fileNo}
                  </td>
                  <td>Section:- {meta.section}</td>
                </tr>
                <tr>
                  <td colSpan={2} style={{ paddingTop: '6px', paddingBottom: '6px' }}>
                    <u>Subject: {meta.subject}</u>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Point 1 Intro */}
            <Typography
              sx={{
                fontFamily: 'Arial, sans-serif',
                fontSize: '12px',
                fontWeight: 600,
                color: '#000',
                mb: 1,
                pl: 2
              }}
            >
              1.&nbsp;&nbsp;The list of approved External Examiners are hereby being sent to you as:-
            </Typography>

            {/* Approved Examiners Table */}
            <Box sx={{ mb: 2 }}>
              <table className="letter-table">
                <thead>
                  <tr>
                    <th style={{ width: '45px' }}>S.No</th>
                    <th style={{ width: '80px' }}>Ex. Code</th>
                    <th style={{ width: '100px' }}>Paper Code</th>
                    <th style={{ width: '220px' }}>Paper Name/Specialization</th>
                    <th>Name of External Examiner</th>
                    <th style={{ width: '120px' }}>Contact No.</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedExaminersForLetter.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '16px', color: '#666' }}>
                        No examiners selected. Please select one or more examiners from the list above.
                      </td>
                    </tr>
                  ) : (
                    selectedExaminersForLetter.map((row) => (
                      <tr key={row.id}>
                        <td style={{ textAlign: 'center', fontWeight: 600 }}>{row.sno}.</td>
                        <td style={{ textAlign: 'center', fontWeight: 700, color: '#1e3a8a' }}>{row.examinercode}</td>
                        <td style={{ textAlign: 'center', fontWeight: 700 }}>{row.papercode}</td>
                        <td style={{ textAlign: 'left', fontWeight: 600 }}>{row.papername}</td>
                        <td style={{ textAlign: 'left' }}>{row.examinerFull}</td>
                        <td style={{ textAlign: 'center' }}>{row.contactno}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </Box>


            {/* Points 2 through 10 Instructions */}
            <Box sx={{ pl: 2, pr: 1, my: 2.5 }}>
              <Typography sx={{ fontSize: '11.5px', color: '#000', mb: 0.6, lineHeight: 1.35 }}>
                2.&nbsp;&nbsp;You are directed to provide this panel to the concerned HOD.
              </Typography>

              <Typography sx={{ fontSize: '11.5px', color: '#000', mb: 0.6, lineHeight: 1.35 }}>
                3.&nbsp;&nbsp;You have to complete practical examination from{' '}
                <span style={{ color: '#d32f2f', fontWeight: 700, textDecoration: 'underline' }}>
                  {meta.startDate} to {meta.endDate}
                </span>
                .
              </Typography>

              <Typography sx={{ fontSize: '11.5px', color: '#000', mb: 0.6, lineHeight: 1.35 }}>
                4.&nbsp;&nbsp;You are directed to contact them and get their consent as according to your schedule.
              </Typography>

              <Typography sx={{ fontSize: '11.5px', color: '#000', mb: 0.6, lineHeight: 1.35 }}>
                5.&nbsp;&nbsp;In case of non-availability of any external examiner, you have to take the permission of the undersigned telephonically as well as in writing for substitution.
              </Typography>

              <Typography
                sx={{
                  fontSize: '11.5px',
                  color: '#d32f2f',
                  fontWeight: 600,
                  mb: 0.6,
                  lineHeight: 1.35
                }}
              >
                6.&nbsp;&nbsp;Kindly ensure that the examination be conducted during the scheduled period as declare by university in point no.3, otherwise order may be issued for the re-examination and conducted examination will be treated as null and void.
              </Typography>

              <Typography sx={{ fontSize: '11.5px', color: '#000', mb: 0.6, lineHeight: 1.35 }}>
                7.&nbsp;&nbsp;You are also directed to appoint Internal Examiners for the above mentioned paper as per the instruction &amp; guidelines of Regulatory Bodies and Statutes &amp; Ordinances of our University at your end.
              </Typography>

              <Typography
                sx={{
                  fontSize: '11.5px',
                  color: '#2e7d32',
                  mb: 0.6,
                  lineHeight: 1.35
                }}
              >
                8.&nbsp;&nbsp;<u>You are also directed to provide the details of the approved rate of remunerations and TA as per the University Policy in appointment letter.</u>
              </Typography>

              <Typography
                sx={{
                  fontSize: '11.5px',
                  color: '#1565c0',
                  fontWeight: 700,
                  mb: 0.6,
                  lineHeight: 1.35
                }}
              >
                9.&nbsp;&nbsp;<u>Further you are also directed to deposit all the practical examination copies with posting of marks, attendance sheet &amp; award list (duly signed by all External as well as Internal Examiners wherever required) to the Conduct Section on the last date of practical examination. Anything incomplete in any sense will not be entertained.</u>
              </Typography>

              <Typography
                sx={{
                  fontSize: '11.5px',
                  color: '#2e7d32',
                  fontWeight: 700,
                  mb: 1,
                  lineHeight: 1.35
                }}
              >
                10.&nbsp;&nbsp;Further you are also directed to provide your exact practical schedule to DAA, PU.
              </Typography>
            </Box>

            {/* Signatory Section */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', textAlign: 'center', mt: 3, mb: 2, pr: 2 }}>
              <Box>
                <Typography sx={{ fontWeight: 700, fontSize: '12px', mb: 0.5 }}>-Sd-</Typography>
                <Typography
                  sx={{
                    fontWeight: 800,
                    fontSize: '13.5px',
                    color: '#d32f2f'
                  }}
                >
                  {meta.signatoryName}
                </Typography>
                <Typography sx={{ fontWeight: 700, fontSize: '12px' }}>
                  {meta.signatoryDesignation}
                </Typography>
              </Box>
            </Box>

            {/* Copy To Section */}
            <Box sx={{ pl: 1, mt: 1 }}>
              <Typography sx={{ fontWeight: 700, fontSize: '11px', mb: 0.3 }}>
                Copy to:-
              </Typography>
              <Typography sx={{ fontSize: '11px', color: '#000', pl: 2, mb: 0.2 }}>
                • &nbsp;<strong>In-Charge (Conduct)</strong> - for coordination with HOI/HOD of the institute.
              </Typography>
              <Typography sx={{ fontSize: '11px', color: '#000', pl: 2 }}>
                • &nbsp;<strong>Assistant Registrar (Evaluation)</strong> - for coordination with HOI/HOD regarding Evaluation.
              </Typography>
            </Box>
          </Card>
        </Box>
      </Box>
    </MenuPageShell>
  );
}
