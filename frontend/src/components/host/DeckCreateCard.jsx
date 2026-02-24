// This component is for the "Create Deck" card on the HostDecks page.
//
// Goal (MVP):
// - Host enters Deck Name
// - Host adds question rows
// - Save -> POST /save-deck with JSON: { name, questions }
// - Show success/error clearly
//
// Required columns per your current deck format:
// Question_ID, Question_Text, Correct_Answer, Predefined_Fake

import React, { useMemo, useState } from "react";
import { saveDeckApi } from "../../api/decks";
import { useDeck } from "../../state/DeckContext.jsx";

function emptyRow() {
  return {
    Question_Text: "",
    Correct_Answer: "",
    Predefined_Fake: "",
  };
}

export default function DeckCreateCard() {
  const { setActiveDeck } = useDeck();

  const [deckName, setDeckName] = useState("");
  const [rows, setRows] = useState([emptyRow()]);

  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(null); // "success" | "error" | null
  const [message, setMessage] = useState("");
  const [raw, setRaw] = useState(null);

  // Convert UI rows -> backend “questions” payload with required keys.
  const questionsPayload = useMemo(() => {
    return rows.map((r, idx) => ({
      Question_ID: String(idx + 1),
      Question_Text: r.Question_Text,
      Correct_Answer: r.Correct_Answer,
      Predefined_Fake: r.Predefined_Fake,
    }));
  }, [rows]);

  function setRowField(index, field, value) {
    setRows((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  }

  function addRow() {
    setRows((prev) => [...prev, emptyRow()]);
  }

  function removeRow(index) {
    setRows((prev) => {
      if (prev.length <= 1) return prev; // keep at least one row
      return prev.filter((_, i) => i !== index);
    });
  }

  function validate() {
    const name = deckName.trim();
    if (!name) return "Deck name is required.";

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (!String(r.Question_Text || "").trim()) return `Row ${i + 1}: Question text is required.`;
      if (!String(r.Correct_Answer || "").trim()) return `Row ${i + 1}: Correct answer is required.`;
      if (!String(r.Predefined_Fake || "").trim()) return `Row ${i + 1}: Predefined fake is required.`;
    }
    return null;
  }

  async function onSave() {
    setStatus(null);
    setMessage("");
    setRaw(null);

    const err = validate();
    if (err) {
      setStatus("error");
      setMessage(err);
      return;
    }

    setBusy(true);

    const payload = {
      name: deckName.trim(),
      questions: questionsPayload,
    };

    const res = await saveDeckApi(payload);
    setRaw(res.data);

    if (!res.ok) {
      setStatus("error");
      setMessage(`Failed to save deck (HTTP ${res.status}).`);
      setBusy(false);
      return;
    }

    // Success
    setStatus("success");
    setMessage("Deck saved successfully.");

    // Make it easy for the Host to proceed:
    // set the saved deck as Active (for session setup later)
    setActiveDeck({
      name: deckName.trim(),
      questions: questionsPayload,
      uploadedAt: Date.now(),
    });

    setBusy(false);
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Create a New Deck</h2>
          <p className="mt-2 text-sm text-slate-300">
            Create a deck directly in the app and save it to the backend
            (<span className="font-mono">POST /save-deck</span>).
          </p>
        </div>

        <button
          type="button"
          onClick={addRow}
          className="rounded-lg bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-100 hover:bg-slate-700"
        >
          + Add Question
        </button>
      </div>

      {/* Deck name */}
      <div className="mt-4">
        <label className="text-sm font-semibold">Deck Name</label>
        <input
          value={deckName}
          onChange={(e) => setDeckName(e.target.value)}
          placeholder="e.g., Physics Basics Week 3"
          className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-indigo-600"
        />
      </div>

      {/* Question rows */}
      <div className="mt-5 grid gap-3">
        {rows.map((r, idx) => (
          <div
            key={idx}
            className="rounded-lg border border-slate-800 bg-slate-950/30 p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold">
                Question {idx + 1}{" "}
                <span className="text-xs text-slate-400">(Question_ID = {idx + 1})</span>
              </div>

              <button
                type="button"
                onClick={() => removeRow(idx)}
                disabled={rows.length <= 1}
                className="rounded-lg bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-100 hover:bg-slate-700 disabled:opacity-50"
                title={rows.length <= 1 ? "At least one question is required." : "Remove this question"}
              >
                Remove
              </button>
            </div>

            <div className="mt-3 grid gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-300">Question_Text</label>
                <textarea
                  value={r.Question_Text}
                  onChange={(e) => setRowField(idx, "Question_Text", e.target.value)}
                  rows={2}
                  placeholder="Prompt shown to students"
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold text-slate-300">Correct_Answer</label>
                  <input
                    value={r.Correct_Answer}
                    onChange={(e) => setRowField(idx, "Correct_Answer", e.target.value)}
                    placeholder="Correct answer"
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300">Predefined_Fake</label>
                  <input
                    value={r.Predefined_Fake}
                    onChange={(e) => setRowField(idx, "Predefined_Fake", e.target.value)}
                    placeholder="One predefined fake answer"
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Save button */}
      <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center">
        <button
          onClick={onSave}
          disabled={busy}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
        >
          {busy ? "Saving..." : "Save Deck"}
        </button>

        <div className="text-xs text-slate-400">
          Saved decks will be selectable later in “All Available Decks”.
        </div>
      </div>

      {/* Feedback */}
      {status && (
        <div className="mt-4">
          {status === "success" ? (
            <div className="rounded-lg border border-emerald-900/60 bg-emerald-950/30 p-3 text-sm text-emerald-100">
              {message}
            </div>
          ) : (
            <div className="rounded-lg border border-rose-900/60 bg-rose-950/40 p-3 text-sm text-rose-100">
              {message}
            </div>
          )}
        </div>
      )}

      {/* Raw response (debug while integrating backend) */}
      {raw && (
        <div className="mt-3 rounded-lg border border-slate-800 bg-slate-950/50 p-3">
          <div className="text-xs text-slate-300">
            <div className="font-semibold mb-1">Raw Backend Response</div>
            <pre className="whitespace-pre-wrap break-words text-slate-200">
              {typeof raw === "string" ? raw : JSON.stringify(raw, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
