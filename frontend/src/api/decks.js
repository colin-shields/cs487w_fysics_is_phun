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

import { httpGet, httpPostForm, httpPostJson, httpDelete, httpPutJson } from "./httpClient";
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
 * Now includes deckName to prevent naming collisions.
 * * @param {File} csvFile
 * @param {File[]} imageFiles optional
 * @param {string} deckName optional custom name for the deck
 */
export async function uploadDeckApi(csvFile, imageFiles = [], deckName = "") {
  const formData = new FormData();
  formData.append("file", csvFile);

  // If a custom name is provided, send it to the backend
  if (deckName) {
    formData.append("deck_name", deckName);
  }

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
 */
export function saveDeckApi(payload) {
  return httpPostJson("/save-deck", payload, hostHeaders());
}

/**
 * Update an existing deck by overwriting it on the server.
 * @param {string} filename  The exact filename of the deck (e.g. "physics_w3.csv")
 * @param {object} payload   { name: string, questions: QuestionModel[] }
 */
export function updateDeckApi(filename, payload) {
  if (!filename) return Promise.resolve({ ok: false, status: 400, data: null, error: "No filename" });
  return httpPutJson(`/decks/${filename}`, payload, hostHeaders());
}

/**
 * Simple helper to infer a deck name from a file.
 */
export function defaultDeckNameFromFile(file) {
  if (!file?.name) return "New Deck";
  return file.name.replace(/\.csv$/i, "");
}

/**
 * Delete a deck file on the server.
 * @param {string} filename
 */
export function deleteDeckApi(filename) {
  if (!filename) return Promise.resolve({ ok: false, status: 400, data: null, error: "No filename" });
  return httpDelete(`/decks/${filename}`, hostHeaders());
}

/**
 * Upload a single image asset to the server. Used by the create-deck
 * UI when the host attaches pictures to individual questions.
 *
 * Backend returns { filename, url } where `url` is the path you can store
 * in the question's Image_Link field.
 */
export async function uploadAsset(file) {
  const formData = new FormData();
  formData.append("file", file);

  return httpPostForm("/upload-asset", formData, hostHeaders());
}
