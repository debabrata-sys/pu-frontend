import React, { useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  Divider,
  Grid,
  Paper,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import ep1 from '../api/ep1';
import GoogleCredentialButton from '../components/GoogleCredentialButton';

const emptyForm = {
  name: '',
  email: '',
  phone: '',
  password: '',
  department: '',
  institution: ''
};

export default function SignupPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [googleStep, setGoogleStep] = useState(0);
  const [googleCredential, setGoogleCredential] = useState('');
  const [googleProfile, setGoogleProfile] = useState(null);
  const [googleForm, setGoogleForm] = useState({ institution: '', department: '', phone: '', password: 'Password@123' });
  const [createdAccount, setCreatedAccount] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const updateForm = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const decodeJwtPayload = (token) => {
    try {
      const payload = token.split('.')[1] || '';
      return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    } catch {
      return {};
    }
  };

  const handleGoogleCredential = (credential) => {
    const profile = decodeJwtPayload(credential);
    setGoogleCredential(credential);
    setGoogleProfile({
      name: profile.name || '',
      email: profile.email || '',
      picture: profile.picture || ''
    });
    setGoogleStep(1);
    setError('');
    setMessage('');
    setCreatedAccount(null);
  };

  const submitGoogleSignup = async () => {
    setError('');
    setMessage('');
    setCreatedAccount(null);
    if (!googleCredential) {
      setError('Please authenticate with Google first.');
      return;
    }
    if (!googleForm.institution || !googleForm.department || !googleForm.phone || !googleForm.password) {
      setError('Institution name, department, phone and password are required.');
      return;
    }
    setSaving(true);
    try {
      const res = await ep1.post('/api/v2/public-signup', {
        googleCredential,
        name: googleProfile?.name || '',
        email: googleProfile?.email || '',
        googleemail: googleProfile?.email || '',
        photo: googleProfile?.picture || '',
        institution: googleForm.institution,
        department: googleForm.department,
        phone: googleForm.phone,
        password: googleForm.password
      });
      setCreatedAccount(res.data?.data || null);
      setMessage('Account created successfully.');
      setGoogleStep(2);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to create Google account.');
    } finally {
      setSaving(false);
    }
  };

  const submit = async () => {
    setError('');
    setMessage('');

    if (!form.name || !form.email || !form.phone || !form.password || !form.department || !form.institution) {
      setError('All fields are required.');
      return;
    }

    setSaving(true);
    try {
      const res = await ep1.post('/api/v2/public-signup', form);
      setCreatedAccount(res.data?.data || null);
      setMessage(`Account created successfully. Your institution id is ${res.data?.data?.colid}.`);
      setForm(emptyForm);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to create account.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: '#f4f6fb',
        px: 2,
        py: 4
      }}
    >
      <Paper sx={{ width: '100%', maxWidth: 620, p: { xs: 2, md: 4 }, borderRadius: 2 }}>
        <Box textAlign="center" mb={3}>
          <img
            src="https://campus.technology/images/logo.png"
            alt="Campus Technology"
            width="170"
            height="68"
            style={{ objectFit: 'contain' }}
          />
          <Typography variant="h5" fontWeight={800} sx={{ mt: 1 }}>
            Create Account
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Create a new institution account. Your role will be All.
          </Typography>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
        {createdAccount && (
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography fontWeight={800}>Login options</Typography>
            <Typography variant="body2">Institution ID: {createdAccount.colid}</Typography>
            <Typography variant="body2">Email/password: {createdAccount.email} / {createdAccount.password || 'your selected password'}</Typography>
            <Typography variant="body2">Google login: {createdAccount.googleemail || createdAccount.email}</Typography>
          </Alert>
        )}

        <Paper variant="outlined" sx={{ p: 2, mb: 3, bgcolor: '#fbfdff' }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }} justifyContent="space-between">
            <Box>
              <Typography variant="h6" fontWeight={800}>Create account with Google</Typography>
              <Typography variant="body2" color="text.secondary">
                Step 1: authenticate with Google. Step 2: enter phone, institution and department.
              </Typography>
            </Box>
            <Chip label={googleStep === 0 ? 'Step 1' : googleStep === 1 ? 'Step 2' : 'Completed'} color={googleStep === 2 ? 'success' : 'primary'} />
          </Stack>

          {googleStep === 0 && (
            <Box sx={{ mt: 2 }}>
              <GoogleCredentialButton onCredential={handleGoogleCredential} text="Create account with Google" />
            </Box>
          )}

          {googleStep >= 1 && googleProfile && (
            <Box sx={{ mt: 2 }}>
              <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
                <Avatar src={googleProfile.picture} alt={googleProfile.name} sx={{ width: 64, height: 64 }} />
                <Box>
                  <Typography fontWeight={800}>{googleProfile.name}</Typography>
                  <Typography variant="body2" color="text.secondary">{googleProfile.email}</Typography>
                </Box>
              </Stack>
              {googleStep === 1 && (
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Phone"
                      value={googleForm.phone}
                      onChange={(e) => setGoogleForm((prev) => ({ ...prev, phone: e.target.value }))}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Institution Name"
                      value={googleForm.institution}
                      onChange={(e) => setGoogleForm((prev) => ({ ...prev, institution: e.target.value }))}
                      required
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Department"
                      value={googleForm.department}
                      onChange={(e) => setGoogleForm((prev) => ({ ...prev, department: e.target.value }))}
                      required
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Password"
                      type="text"
                      value={googleForm.password}
                      onChange={(e) => setGoogleForm((prev) => ({ ...prev, password: e.target.value }))}
                      required
                      helperText="Default password for email login. Google login will also work."
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Button fullWidth variant="contained" size="large" disabled={saving} onClick={submitGoogleSignup}>
                      {saving ? 'Creating...' : 'Create Google Account'}
                    </Button>
                  </Grid>
                </Grid>
              )}
            </Box>
          )}
        </Paper>

        <Divider sx={{ mb: 3 }}>or create with email and password</Divider>

        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Name"
              value={form.name}
              onChange={(e) => updateForm('name', e.target.value)}
              required
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) => updateForm('email', e.target.value)}
              required
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Phone"
              value={form.phone}
              onChange={(e) => updateForm('phone', e.target.value)}
              required
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Password"
              type="password"
              value={form.password}
              onChange={(e) => updateForm('password', e.target.value)}
              required
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Department"
              value={form.department}
              onChange={(e) => updateForm('department', e.target.value)}
              required
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Institution"
              value={form.institution}
              onChange={(e) => updateForm('institution', e.target.value)}
              required
            />
          </Grid>
          <Grid item xs={12}>
            <Button fullWidth variant="contained" size="large" disabled={saving} onClick={submit}>
              {saving ? 'Creating...' : 'Create Account'}
            </Button>
          </Grid>
          <Grid item xs={12}>
            <Typography variant="body2" align="center" sx={{ mb: 1 }}>
              Already have an account? <a href="/Login">Login</a>
            </Typography>
            {createdAccount && (
              <Button fullWidth variant="outlined" onClick={() => navigate('/Login')}>
                Go to Login
              </Button>
            )}
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
}
