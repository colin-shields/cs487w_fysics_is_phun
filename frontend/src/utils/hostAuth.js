// hostAuth.js
// Stores the Host Code (API-key style) in localStorage.

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

export function isHostLoggedIn() {
  const code = getHostCode();
  return !!code && code.length > 0;
}

export function logoutHost() {
  localStorage.removeItem(HOST_CODE_KEY);
  window.location.href = "/host?reason=expired";
}
