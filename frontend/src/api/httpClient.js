/**
 * Minimal HTTP helpers for the app.
 * We keep this small and stable so every feature uses the same base URL,
 * error handling, and parsing behavior.
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

/**
 * Build full URL from a path.
 * @param {string} path e.g. "/" or "/upload-deck"
 */
function buildUrl(path) {
  if (!BASE_URL) {
    throw new Error(
      "Missing VITE_API_BASE_URL. Set it in frontend/.env.local and restart Vite."
    );
  }
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${BASE_URL}${normalized}`;
}

/**
 * Parse the response as JSON when possible, otherwise as text.
 */
async function parseResponse(res) {
  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  return isJson ? await res.json() : await res.text();
}

/**
 * GET helper.
 */
export async function httpGet(path) {
  const url = buildUrl(path);
  try {
    const res = await fetch(url);
    const data = await parseResponse(res);
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    return { ok: false, status: 0, data: null, error: err?.message || String(err) };
  }
}

/**
 * POST multipart/form-data helper (for CSV uploads).
 * @param {string} path
 * @param {FormData} formData
 */
export async function httpPostForm(path, formData) {
  const url = buildUrl(path);
  try {
    const res = await fetch(url, {
      method: "POST",
      body: formData, // do NOT set Content-Type manually for FormData
    });
    const data = await parseResponse(res);
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    return { ok: false, status: 0, data: null, error: err?.message || String(err) };
  }
}
