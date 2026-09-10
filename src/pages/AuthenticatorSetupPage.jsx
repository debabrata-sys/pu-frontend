import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  FormControlLabel,
  Paper,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import QRCode from "qrcode";
import ep1 from "../api/ep1";
import { applyLoginSession } from "../utils/loginSession";
import {
  clearPendingAuthenticatorLogin,
  getAuthenticatorDeviceId,
  readPendingAuthenticatorLogin,
  saveTrustedAuthenticatorDevice
} from "../utils/twoFactorLogin";

const formatDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString();
};

export default function AuthenticatorSetupPage() {
  const navigate = useNavigate();
  const pending = useMemo(() => readPendingAuthenticatorLogin(), []);
  const responseData = pending?.responseData;
  const options = pending?.options || {};
  const [secret, setSecret] = useState("");
  const [qr, setQr] = useState("");
  const [twofa, setTwofa] = useState(responseData?.twofa || {});
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [trustDevice, setTrustDevice] = useState(true);

  const finishLogin = async () => {
    const destination = await applyLoginSession(responseData, options);
    clearPendingAuthenticatorLogin();
    navigate(destination);
  };

  useEffect(() => {
    const load = async () => {
      if (!responseData) {
        navigate("/signinpage");
        return;
      }
      try {
        const res = await ep1.post("/api/v2/authenticator/setup", {
          colid: responseData.colid,
          email: responseData.user || responseData.email
        });
        setSecret(res.data?.secret || "");
        setTwofa(res.data?.twofa || responseData.twofa || {});
        if (res.data?.otpauth) {
          setQr(await QRCode.toDataURL(res.data.otpauth, { margin: 1, width: 220 }));
        }
      } catch (err) {
        setError(err.response?.data?.message || err.message || "Unable to load authenticator setup");
      }
    };
    load();
  }, [navigate, responseData]);

  const verify = async () => {
    try {
      setError("");
      const res = await ep1.post("/api/v2/authenticator/verify", {
        colid: responseData.colid,
        email: responseData.user || responseData.email,
        code,
        trustDevice,
        deviceId: getAuthenticatorDeviceId()
      });
      setTwofa(res.data?.twofa || {});
      if (res.data?.trustToken) {
        saveTrustedAuthenticatorDevice(responseData, res.data.trustToken, res.data.trustedUntil);
      }
      setMessage("Authenticator verified.");
      await finishLogin();
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Invalid authenticator code");
    }
  };

  const skip = async () => {
    if (!twofa?.skipAllowed) {
      setError("Authenticator verification is mandatory for this login.");
      return;
    }
    await finishLogin();
  };

  if (!responseData) return null;

  const required = Boolean(twofa?.required);
  const skipAllowed = Boolean(twofa?.skipAllowed);
  const setupComplete = Boolean(twofa?.setupComplete);

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#eef4ff", display: "grid", placeItems: "center", p: 2 }}>
      <Paper sx={{ width: "100%", maxWidth: 620, p: 4 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Box>
            <Typography variant="h4" fontWeight={900}>Google Authenticator</Typography>
            <Typography color="text.secondary">Verify your login with a 6 digit authenticator code.</Typography>
          </Box>
          <Chip color={required ? "error" : "warning"} label={required ? "Mandatory" : "Can skip now"} />
        </Stack>

        <Alert severity={required ? "error" : "info"} sx={{ mb: 2 }}>
          {twofa?.message || "Authenticator verification may be required based on account policy."}
          {twofa?.mandatoryDate ? ` Mandatory date for this account: ${formatDate(twofa.mandatoryDate)}.` : ""}
          {twofa?.newAccountGraceUntil ? ` New account skip valid until: ${formatDate(twofa.newAccountGraceUntil)}.` : ""}
        </Alert>

        {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {!setupComplete && (
          <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
            <Typography fontWeight={800}>Setup</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Open Google Authenticator, add a new account, and scan this QR code. If scanning is not possible, enter the setup key manually.
            </Typography>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="center">
              {qr && <Box component="img" src={qr} alt="Authenticator QR code" sx={{ width: 220, height: 220 }} />}
              <Box sx={{ wordBreak: "break-all" }}>
                <Typography variant="caption" color="text.secondary">Setup key</Typography>
                <Typography fontFamily="monospace" fontWeight={800}>{secret}</Typography>
              </Box>
            </Stack>
          </Paper>
        )}

        <Stack spacing={2}>
          <TextField
            label="Authenticator code"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            inputProps={{ inputMode: "numeric", pattern: "[0-9]*" }}
            fullWidth
          />
          <Box>
            <FormControlLabel
              control={<Checkbox checked={trustDevice} onChange={(e) => setTrustDevice(e.target.checked)} />}
              label="Trust this device for 3 days"
            />
            <Typography variant="caption" color="text.secondary" display="block">
              Only this browser on this device will skip the authenticator prompt.
            </Typography>
          </Box>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <Button variant="contained" onClick={verify} disabled={code.length !== 6}>Verify and continue</Button>
            {skipAllowed && <Button variant="outlined" onClick={skip}>Skip for now</Button>}
            <Button color="inherit" onClick={() => { clearPendingAuthenticatorLogin(); navigate("/signinpage"); }}>Back to login</Button>
          </Stack>
        </Stack>
      </Paper>
    </Box>
  );
}
