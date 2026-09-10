import { applyLoginSession } from "./loginSession";
import ep1 from "../api/ep1";

const pendingKey = "pendingAuthenticatorLogin";
const deviceKey = "campusAuthenticatorDeviceId";
const trustPrefix = "campusAuthenticatorTrust";

const normalizeEmail = (value) => String(value || "").trim().toLowerCase();

const loginEmail = (responseData) => normalizeEmail(responseData?.user || responseData?.email);

const createDeviceId = () => {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `dev-${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
};

export const isTwoFactorApplicable = (responseData) => {
  const role = String(responseData?.role || "").trim().toLowerCase();
  return responseData?.status === "Success" && role && role !== "student" && responseData?.twofa?.required === true;
};

export const getAuthenticatorDeviceId = () => {
  let value = localStorage.getItem(deviceKey);
  if (!value) {
    value = createDeviceId();
    localStorage.setItem(deviceKey, value);
  }
  return value;
};

export const trustStorageKey = (responseData) => (
  `${trustPrefix}:${responseData?.colid || ""}:${loginEmail(responseData)}`
);

export const readTrustedAuthenticatorDevice = (responseData) => {
  try {
    const key = trustStorageKey(responseData);
    const parsed = JSON.parse(localStorage.getItem(key) || "{}");
    if (!parsed?.trustToken || !parsed?.deviceId) return null;
    if (parsed.trustedUntil && new Date(parsed.trustedUntil).getTime() <= Date.now()) {
      localStorage.removeItem(key);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

export const saveTrustedAuthenticatorDevice = (responseData, trustToken, trustedUntil) => {
  if (!trustToken) return;
  localStorage.setItem(trustStorageKey(responseData), JSON.stringify({
    trustToken,
    trustedUntil,
    deviceId: getAuthenticatorDeviceId(),
    savedAt: Date.now()
  }));
};

export const clearTrustedAuthenticatorDevice = (responseData) => {
  localStorage.removeItem(trustStorageKey(responseData));
};

const hasTrustedAuthenticatorDevice = async (responseData) => {
  const trustedRecord = readTrustedAuthenticatorDevice(responseData);
  if (!trustedRecord) return false;
  try {
    const res = await ep1.post("/api/v2/authenticator/trust-check", {
      colid: responseData.colid,
      email: responseData.user || responseData.email,
      trustToken: trustedRecord.trustToken,
      deviceId: trustedRecord.deviceId
    });
    if (res.data?.trusted) return true;
    clearTrustedAuthenticatorDevice(responseData);
  } catch {
    clearTrustedAuthenticatorDevice(responseData);
  }
  return false;
};

export const savePendingAuthenticatorLogin = (responseData, options = {}) => {
  sessionStorage.setItem(pendingKey, JSON.stringify({
    responseData,
    options,
    savedAt: Date.now()
  }));
};

export const readPendingAuthenticatorLogin = () => {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(pendingKey) || "{}");
    return parsed?.responseData ? parsed : null;
  } catch {
    return null;
  }
};

export const clearPendingAuthenticatorLogin = () => {
  sessionStorage.removeItem(pendingKey);
};

export const continueAfterPrimaryLogin = async (responseData, navigate, options = {}) => {
  if (isTwoFactorApplicable(responseData)) {
    if (responseData?.twofa?.setupComplete && await hasTrustedAuthenticatorDevice(responseData)) {
      const destination = await applyLoginSession(responseData, options);
      navigate(destination);
      return destination;
    }
    savePendingAuthenticatorLogin(responseData, options);
    navigate("/authenticator-setup");
    return null;
  }
  const destination = await applyLoginSession(responseData, options);
  navigate(destination);
  return destination;
};
