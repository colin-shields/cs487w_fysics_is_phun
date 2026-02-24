import { httpPostJson, httpGet } from "./httpClient";

/**
 * Host login
 * Expected backend: POST /host/login { host_code } -> { token }
 */
export function hostLogin(host_code) {
  return httpPostJson("/host/login", { host_code });
}

export async function verifyHostCode(code) {
  return httpGet("/host/verify", { "X-Host-Code": String(code || "").trim() });
}