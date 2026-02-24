/**
 * DeckUploadCard.jsx
 * Host Deck Upload UI.
 *
 * Behavior (Option 2):
 * - Upload does NOT automatically change the Active Deck.
 * - After successful upload, Host clicks "Set as Active Deck".
 *
 * Backend response (updated):
 *   {
 *     deck_id: "filename.csv",
 *     questions: { status: "success"|"error", data?: [...], message?: "..." }
 *   }
 *
 * Endpoint can also return:
 *   { deck_id, error: "CSV Parse Failed: ..." }
 *   { error: "..." }
 */

import React, { useMemo, useState } from "react";
import {
  uploadDeckCsv} from "../../api/decks";
import { downloadTextFile } from "../../utils/download";
import { useDeck } from "../../state/DeckContext.jsx";

const REQUIRED_COLUMNS = [
  "Question_ID",
  "Question_Text",
  "Correct_Answer",
  "Predefined_Fake",
  "Image_Link (optional)",
];

function buildCsvTemplate() {
  const header = REQUIRED_COLUMNS.join(",");
  const rows = [
    "1,What is the SI unit of force?,Newton,Joule",
    "2,What is the acceleration due to gravity on Earth (approx.)?,9.8 m/s^2,9.8 km/s^2",
    "3,What particle has a negative electric charge?,Electron,Proton",
    "4,What is the speed of light in vacuum (approx.)?,3.0×10^8 m/s,3.0×10^6 m/s",
    "5,What is the formula for kinetic energy?,KE = 1/2 m v^2,KE = m v",
    "6,What is the SI unit of electric current?,Ampere,Volt",
  ];
  return [header, ...rows].join("\n");
}


function parseUploadResponse(uploadRes) {
  const payload = uploadRes?.data;

  if (!payload || typeof payload !== "object") {
    return {
      status: "error",
      message: "Unexpected response from backend.",
      deckId: null,
      questions: [],
    };
  }

  // Top-level error from wrapper
  if (payload.error) {
    return {
      status: "error",
      message: String(payload.error),
      deckId: payload.deck_id || null,
      questions: [],
    };
  }

  const deckId = payload.deck_id || null;
  const q = payload.questions;
  if (!q || typeof q !== "object") {
    return {
      status: "error",
      message: "Missing 'questions' in response.",
      deckId,
      questions: [],
    };
  }

  if (q.status === "success" && Array.isArray(q.data)) {
    return {
      status: "success",
      message: null,
      deckId,
      questions: q.data,
    };
  }

  if (q.status === "error") {
    return {
      status: "error",
      message: q.message || "CSV validation failed.",
      deckId,
      questions: [],
    };
  }

  return {
    status: "error",
    message: "Unexpected 'questions' format.",
    deckId,
    questions: [],
  };
}

export default function DeckUploadCard() {
  const { setActiveDeck } = useDeck();

  const [file, setFile] = useState(null);

  // Optional images support (backend accepts them, MVP can ignore)
  const [imageFiles, setImageFiles] = useState([]);

  const [busy, setBusy] = useState(false);

  // Stores what we show in the debug panel
  const [result, setResult] = useState(null); //result is the raw upload response (or combined upload+create response)

  // Preview from last successful upload
  const [uploadedDeckPreview, setUploadedDeckPreview] = useState(null);
  const [uploadedDeckName, setUploadedDeckName] = useState(null);

  // Optional persistence status (won't crash app if /decks isn't implemented)
  const [persistNote, setPersistNote] = useState(null);

  const templateCsv = useMemo(() => buildCsvTemplate(), []);

  function onFileChange(e) {
    const f = e.target.files?.[0] || null;
    setFile(f);

    // Reset UI
    setResult(null);
    setUploadedDeckPreview(null);
    setUploadedDeckName(null);
    setPersistNote(null);
  }

  function onImagesChange(e) {
    const files = Array.from(e.target.files || []);
    setImageFiles(files);
  }

  function downloadTemplate() {
    downloadTextFile("deck_template.csv", templateCsv, "text/csv");
  }

  async function onUpload() {
    if (!file) return;

    setBusy(true);
    setResult(null);
    setUploadedDeckPreview(null);
    setUploadedDeckName(null);
    setPersistNote(null);

    // 1) Upload CSV (and optional images)
    const uploadRes = await uploadDeckCsv(file, imageFiles);
    console.log("Upload response:", uploadRes);
    setResult(uploadRes);

    const parsed = parseUploadResponse(uploadRes);
    console.log("Parsed upload response:", parsed);

    // Stop if upload failed
    if (!uploadRes.ok || parsed.status !== "success") {
      setBusy(false);
      return;
    }

    // Success: show preview + enable "Set Active Deck"
    setUploadedDeckPreview(parsed.questions);
    setUploadedDeckName(file.name);



    setBusy(false);
  }

  function setAsActiveDeck() {
    if (!uploadedDeckPreview || !uploadedDeckName) return;

    setActiveDeck({
      name: uploadedDeckName,
      questions: uploadedDeckPreview,
      uploadedAt: Date.now(),
    });
  }

  // Derived UI status for the upload response
  const parsed = result ? parseUploadResponse(result) : null;
  const backendStatus = parsed?.status || null;
  const backendMessage = parsed?.message || null;

  const backendData = result?.data;

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
      <h2 className="text-lg font-semibold">Deck Manager: Upload CSV</h2>
      <p className="mt-2 text-sm text-slate-300">
        Upload a deck CSV to the backend (<span className="font-mono">POST /upload-deck</span>).
        After upload, click <span className="font-semibold">Set as Active Deck</span>.
      </p>

      {/* Schema + template */}
      <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950/40 p-3">
        <div className="text-sm font-semibold">Required CSV Columns</div>
        <ul className="mt-2 grid gap-1 text-sm text-slate-200 sm:grid-cols-2">
          {REQUIRED_COLUMNS.map((c) => (
            <li key={c} className="font-mono">
              {c}
            </li>
          ))}
        </ul>

        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs text-slate-400">
            Tip: avoid commas inside fields unless you wrap them in quotes.
          </div>

          <button
            onClick={downloadTemplate}
            className="rounded-lg bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-100 hover:bg-slate-700"
          >
            Download CSV Template
          </button>
        </div>
      </div>

      {/* Upload controls */}
      <div className="mt-4 grid gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={onFileChange}
            className="block w-full text-sm text-slate-200 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-800 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-slate-100 hover:file:bg-slate-700"
          />

          <button
            onClick={onUpload}
            disabled={!file || busy}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
          >
            {busy ? "Uploading..." : "Upload"}
          </button>
        </div>

        {/* Optional images input (backend supports it, MVP can ignore) */}
        <div className="rounded-lg border border-slate-800 bg-slate-950/30 p-3">
          <div className="text-sm font-semibold">Optional Images (future)</div>
          <p className="mt-1 text-xs text-slate-400">
            Backend supports image upload. MVP is text-only, so this can be ignored for now.
          </p>
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={onImagesChange}
            className="mt-2 block w-full text-xs text-slate-200 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-800 file:px-4 file:py-2 file:text-xs file:font-semibold file:text-slate-100 hover:file:bg-slate-700"
          />
          {imageFiles.length > 0 && (
            <div className="mt-2 text-xs text-slate-300">
              Selected {imageFiles.length} image(s).
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      {result && (
        <div className="mt-4">
          {backendStatus === "error" && (
            <div className="rounded-lg border border-rose-900/60 bg-rose-950/40 p-3">
              <div className="text-sm font-semibold text-rose-200">
                Upload failed (HTTP {result.status})
              </div>
              <div className="mt-1 text-sm text-rose-100">
                {backendMessage || "Backend returned an error."}
              </div>
            </div>
          )}

          {backendStatus === "success" && (
            <div className="rounded-lg border border-emerald-900/60 bg-emerald-950/30 p-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-sm font-semibold text-emerald-200">
                    Upload successful (HTTP {result.status})
                  </div>
                  <div className="mt-1 text-sm text-emerald-100">
                    Parsed {uploadedDeckPreview?.length || 0} question(s).
                  </div>

  
                </div>

                <button
                  onClick={setAsActiveDeck}
                  disabled={!uploadedDeckPreview || uploadedDeckPreview.length === 0}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
                >
                  Set as Active Deck
                </button>
              </div>
            </div>
          )}

          {/* Preview table (first 10 rows) */}
          {Array.isArray(uploadedDeckPreview) && uploadedDeckPreview.length > 0 && (
            <div className="mt-3 rounded-lg border border-slate-800 bg-slate-950/40 p-3">
              <div className="text-sm font-semibold">
                Uploaded Deck Preview: {uploadedDeckName}
              </div>
              <div className="mt-2 overflow-auto">
                <table className="min-w-full text-left text-xs">
                  <thead className="text-slate-300">
                    <tr>
                      {Object.keys(uploadedDeckPreview[0]).map((k) => (
                        <th
                          key={k}
                          className="border-b border-slate-800 px-3 py-2 font-semibold"
                        >
                          {k}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="text-slate-200">
                    {uploadedDeckPreview.slice(0, 10).map((row, idx) => (
                      <tr key={idx} className="border-b border-slate-900/60">
                        {Object.keys(uploadedDeckPreview[0]).map((k) => (
                          <td key={k} className="px-3 py-2 align-top">
                            {String(row[k] ?? "")}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Raw response (debug) */}
          <div className="mt-3 rounded-lg border border-slate-800 bg-slate-950/50 p-3">
            <div className="text-xs text-slate-300">
              <div className="font-semibold mb-1">Raw Backend Response</div>
              <pre className="whitespace-pre-wrap break-words text-slate-200">
                {typeof backendData === "string"
                  ? backendData
                  : JSON.stringify(backendData, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
