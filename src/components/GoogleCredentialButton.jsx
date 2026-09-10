import React, { useEffect, useRef, useState } from "react";
import { Alert, Box, Button } from "@mui/material";
import GoogleIcon from "@mui/icons-material/Google";

const scriptId = "google-identity-services";
const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID || "";

const loadGoogleScript = () => new Promise((resolve, reject) => {
  if (window.google?.accounts?.id) return resolve();
  const existing = document.getElementById(scriptId);
  if (existing) {
    existing.addEventListener("load", resolve, { once: true });
    existing.addEventListener("error", reject, { once: true });
    return;
  }
  const script = document.createElement("script");
  script.id = scriptId;
  script.src = "https://accounts.google.com/gsi/client";
  script.async = true;
  script.defer = true;
  script.onload = resolve;
  script.onerror = reject;
  document.body.appendChild(script);
});

export default function GoogleCredentialButton({ onCredential, text = "Continue with Google" }) {
  const buttonRef = useRef(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      try {
        if (!clientId) {
          setError("Google client id is missing. Set REACT_APP_GOOGLE_CLIENT_ID for campustechnology.me.");
          return;
        }
        await loadGoogleScript();
        if (cancelled || !buttonRef.current) return;
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (credentialResponse) => onCredential?.(credentialResponse.credential)
        });
        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: "outline",
          size: "large",
          width: buttonRef.current.offsetWidth || 320,
          text: "continue_with"
        });
      } catch (err) {
        setError(err.message || "Unable to load Google login");
      }
    };
    init();
    return () => { cancelled = true; };
  }, [onCredential]);

  return (
    <Box sx={{ width: "100%" }}>
      <Box ref={buttonRef} sx={{ width: "100%", display: "flex", justifyContent: "center" }} />
      {error && (
        <Alert severity="warning" sx={{ mt: 1 }}>
          {error}
          <Button size="small" startIcon={<GoogleIcon />} sx={{ ml: 1 }} disabled>{text}</Button>
        </Alert>
      )}
    </Box>
  );
}
