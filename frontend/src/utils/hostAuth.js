// hostAuth.js
const HOST_CODE_KEY = "fip_host_code_v1";

export function setHostCode(code) {
  const normalized = String(code || "").trim();
  if (!normalized) return;
  localStorage.setItem(HOST_CODE_KEY, normalized);
}

export function getHostCode() {
  const stored = localStorage.getItem(HOST_CODE_KEY);
  return stored ? stored.trim() : "";
}

export function clearHostCode() {
  localStorage.removeItem(HOST_CODE_KEY);
}

export function logoutHost() {
  clearHostCode();
  // Force a hard reload to the login page to clear all app state
  window.location.href = "/host/login?reason=logout";
}
