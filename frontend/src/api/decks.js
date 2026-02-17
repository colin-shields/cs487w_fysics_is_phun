/**
 * Deck-related API calls.
 * This will later expand to include:
 * - list decks
 * - delete deck
 * - select deck for session
 *
 * For now: upload only (tests POST /upload-deck).
 */

import { httpPostForm } from "./httpClient";

/**
 * Upload a CSV deck to the backend using field name "file",
 * matching FastAPI: upload_deck(file: UploadFile = File(...))
 *
 * @param {File} file - CSV file chosen in the browser
 */
export async function uploadDeckCsv(file) {
  const formData = new FormData();
  formData.append("file", file); // IMPORTANT: must be "file" to match backend

  return httpPostForm("/upload-deck", formData);
}
