import React, { useMemo, useState } from "react";
import { uploadDeckApi } from "../../api/decks";
import { downloadTextFile } from "../../utils/download";
import { useDeck } from "../../state/DeckContext.jsx";

const REQUIRED_COLUMNS = [
  "Question_ID",
  "Question_Text",
  "Correct_Answer",
  "Predefined_Fake",
  "Image_Link",
];

function buildCsvTemplate() {
  const header = REQUIRED_COLUMNS.join(",");
  const rows = [
    "1,What is the only planet in our solar system that could float in water?,Saturn,Jupiter,https://example.com/saturn.jpg",
    "2,What is the most abundant metal element in the Earth's crust?,Aluminum,Iron,",
  ];
  return [header, ...rows].join("\n");
}

function parseUploadResponse(uploadRes) {
  const payload = uploadRes?.data;
  if (!payload || typeof payload !== "object") {
    return { status: "error", message: "Unexpected response from backend." };
  }
  if (payload.error) {
    return { status: "error", message: String(payload.error) };
  }
  const q = payload.questions;
  if (q?.status === "success" && Array.isArray(q.data)) {
    return { status: "success", questions: q.data, deckId: payload.deck_id };
  }
  return { status: "error", message: q?.message || "CSV validation failed." };
}

export default function DeckUploadCard({ onSuccess, existingDecks = [] }) {
  const { setActiveDeck } = useDeck();
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [customName, setCustomName] = useState("");
  const [wasActivated, setWasActivated] = useState(false);
  const [result, setResult] = useState(null);
  const [localError, setLocalError] = useState("");

  const [uploadedDeckPreview, setUploadedDeckPreview] = useState(null);
  const [uploadedDeckName, setUploadedDeckName] = useState(null);

  const templateCsv = useMemo(() => buildCsvTemplate(), []);

  // --- ADDED THIS BACK ---
  const handleDownloadTemplate = () => {
    downloadTextFile("deck_template.csv", templateCsv, "text/csv");
  };

  function onFileChange(e) {
    const f = e.target.files?.[0] || null;
    setFile(f);
    setResult(null);
    setLocalError("");
    setWasActivated(false);
  }

  async function onUpload() {
    if (!file) return;
    setLocalError("");
    setBusy(true);

    // 1. Determine the name you actually want
    const baseName = customName.trim() || file.name.replace(/\.csv$/i, "");
    const finalFilename = `${baseName}.csv`;

    // 2. Local Duplicate Check (Case Insensitive)
    const isDuplicate = existingDecks.some(
      (d) => d.deck_id?.toLowerCase() === finalFilename.toLowerCase(),
    );

    if (isDuplicate) {
      setLocalError(
        `A deck named "${baseName}" already exists in the manager.`,
      );
      setBusy(false);
      return;
    }

    // Create a "Renamed" file object
    const renamedFile = new File([file], finalFilename, { type: file.type });

    // 4. Perform Upload with the new file object
    const uploadRes = await uploadDeckApi(renamedFile, [], baseName);

    setResult(uploadRes);
    const parsed = parseUploadResponse(uploadRes);

    if (!uploadRes.ok || parsed.status !== "success") {
      setBusy(false);
      return;
    }

    // 5. Success
    setUploadedDeckPreview(parsed.questions);
    setUploadedDeckName(baseName);
    setBusy(false);

    if (onSuccess) onSuccess();
  }

  function setAsActiveDeck() {
    if (!uploadedDeckPreview || !uploadedDeckName) return;
    setActiveDeck({
      name: uploadedDeckName,
      questions: uploadedDeckPreview,
      uploadedAt: Date.now(),
      deckId: `${uploadedDeckName}.csv`,
    });
    setWasActivated(true);
  }

  const parsed = result ? parseUploadResponse(result) : null;

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
      <h2 className="text-lg font-semibold text-white">Upload CSV Deck</h2>

      <div className="mt-5 grid gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">
            Custom Deck Name
          </label>
          <input
            type="text"
            placeholder="e.g. Science_Quiz"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            type="file"
            accept=".csv"
            onChange={onFileChange}
            className="block w-full text-sm text-slate-200 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-800 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-slate-100"
          />

          <button
            onClick={onUpload}
            disabled={!file || busy}
            className="shrink-0 rounded-lg bg-indigo-600 px-6 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {busy ? "Uploading..." : "Upload"}
          </button>
        </div>
      </div>

      <div className="mt-3 rounded-lg border border-blue-900/40 bg-blue-950/20 p-3 text-sm text-blue-200">
        <p>
          <strong>🖼️ Adding Images:</strong> Upload your CSV first. Once
          uploaded, use the <strong>Edit</strong> button in the Deck Manager to
          manually add images to your questions.
        </p>
      </div>

      {localError && (
        <div className="mt-4 rounded-lg border border-rose-900/60 bg-rose-950/40 p-3 text-sm text-rose-200">
          {localError}
        </div>
      )}

      {result && !localError && (
        <div className="mt-4">
          {parsed?.status === "error" ? (
            <div className="rounded-lg border border-rose-900/60 bg-rose-950/40 p-3 text-sm text-rose-100">
              {parsed.message}
            </div>
          ) : (
            <div className="rounded-lg border border-emerald-900/60 bg-emerald-950/30 p-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-emerald-200">
                    Upload successful!
                  </div>
                  <div className="text-xs text-emerald-100/70">
                    Parsed {uploadedDeckPreview?.length} questions.
                  </div>
                </div>
                <button
                  onClick={setAsActiveDeck}
                  disabled={wasActivated}
                  className={`rounded-lg px-4 py-2 text-xs font-bold transition-colors ${
                    wasActivated
                      ? "bg-slate-700 text-slate-400 cursor-default"
                      : "bg-emerald-600 text-white hover:bg-emerald-500"
                  }`}
                >
                  {wasActivated ? "Deck is Active" : "Set as Active"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mt-6 flex items-center justify-between border-t border-slate-800 pt-4">
        <span className="text-xs text-slate-500">Need the format?</span>
        <button
          onClick={handleDownloadTemplate}
          className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 underline"
        >
          Download CSV Template
        </button>
      </div>
    </section>
  );
}
