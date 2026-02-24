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
  return Boolean(getHostCode());
}
