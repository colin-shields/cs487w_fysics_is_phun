// hostAuth.js
const HOST_CODE_KEY = "fip_host_code_v1";

export function setHostCode(code) {
  localStorage.setItem(HOST_CODE_KEY, code);
}

export function getHostCode() {
  return localStorage.getItem(HOST_CODE_KEY);
}

export function clearHostCode() {
  localStorage.removeItem(HOST_CODE_KEY);
}

/**
 * Checks the URL to decide which password is required.
 */
export function getExpectedCode() {
  const isVercel = window.location.hostname.includes("vercel.app");
  return isVercel ? "FIP-2026" : "default_code";
}

// Checks if the code is present AND correct.
export function isHostLoggedIn() {
  const code = getHostCode();
  return code === getExpectedCode();
}

export function logoutHost() {
  clearHostCode();
  // Force a hard reload to the login page to clear all app state
  window.location.href = "/host?reason=logout";
}
