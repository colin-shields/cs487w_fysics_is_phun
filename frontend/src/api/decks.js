/**
 * Deck-related API calls.
 *
 * Current backend endpoint:
 * - POST /upload-deck (protected)
 *
 * Future endpoints (when backend implements /decks):
 * - GET  /decks
 * - POST /decks
 * - etc.
 */

import { httpGet, httpPostForm, httpPostJson } from "./httpClient";
import { getHostCode } from "../utils/hostAuth";

/**
 * Build auth headers for protected endpoints.
 *
 * Assumption: backend uses header "X-Host-Code".
 * If your backend expects a different header, change it here once.
 */
function hostHeaders() {
  const code = getHostCode?.() || "";
  return code ? { "X-Host-Code": code } : {};
}

/**
 * Upload a deck CSV (and optional images) to the backend.
 *
 * FastAPI:
 *   upload_deck(file: UploadFile = File(...), images: Optional[List[UploadFile]] = None)
 *
 * IMPORTANT:
 * - CSV field name must be "file"
 * - Images field name must be "images" (repeated)
 *
 * @param {File} csvFile
 * @param {File[]|FileList} imageFiles optional
 */
export async function uploadDeckCsv(csvFile, imageFiles = []) {
  const formData = new FormData();
  formData.append("file", csvFile);

  // images are optional; safe to pass empty list
  Array.from(imageFiles || []).forEach((img) => {
    formData.append("images", img);
  });

  return httpPostForm("/upload-deck", formData, hostHeaders());
}

/**
 * Future: list decks from the backend.
 * Safe to call later once /decks exists.
 */
export function listDecksApi() {
  return httpGet("/decks", hostHeaders());
}

export function getDeckDetailApi(filename) {
  return httpGet(`/decks/${filename}`, hostHeaders());
}

/**
 * Future: persist a deck to the backend (makeshift DB).
 * Safe to call later once /decks exists.
 */
export function saveDeckApi(payload) {
  return httpPostJson("/save-deck", payload, hostHeaders());
}

/**
 * Simple helper to infer a deck name from a file.
 */
export function defaultDeckNameFromFile(file) {
  if (!file?.name) return "New Deck";
  return file.name.replace(/\.csv$/i, "");
}
