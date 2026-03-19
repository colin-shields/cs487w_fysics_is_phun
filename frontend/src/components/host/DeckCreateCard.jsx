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

import React, { useEffect, useMemo, useState } from "react";
import { saveDeckApi, updateDeckApi, uploadAsset } from "../../api/decks";
import { buildUrl } from "../../api/httpClient";
import { useDeck } from "../../state/DeckContext.jsx";

function emptyRow() {
  return {
    Question_Text: "",
    Correct_Answer: "",
    Predefined_Fake: "",
    // for the UI we keep the selected File as well as any existing link
    Image_File: null,
    Image_Link: "",
    Image_Preview: "",
  };
}

export default function DeckCreateCard({
  onClose,
  onSuccess,
  initialDeck,
  isEditing = false,
}) {
  const { setActiveDeck } = useDeck();

  const [deckName, setDeckName] = useState("");
  const [rows, setRows] = useState([emptyRow()]);

  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(null); // "success" | "error" | null
  const [message, setMessage] = useState("");
  const [raw, setRaw] = useState(null);

  // Pre-populate state when opening in edit mode
  useEffect(() => {
    if (!isEditing || !initialDeck) return;
    setDeckName(initialDeck.name || "");
    if (
      Array.isArray(initialDeck.questions) &&
      initialDeck.questions.length > 0
    ) {
      setRows(
        initialDeck.questions.map((q) => ({
          Question_Text: q.Question_Text || "",
          Correct_Answer: q.Correct_Answer || "",
          Predefined_Fake: q.Predefined_Fake || "",
          Image_File: null,
          Image_Link: q.Image_Link || "",
          Image_Preview: "",
        })),
      );
    }
  }, [isEditing, initialDeck]);

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

  function setRowImage(index, file) {
    setRows((prev) => {
      const copy = [...prev];
      // revoke old preview if there is one
      if (copy[index]?.Image_Preview) {
        URL.revokeObjectURL(copy[index].Image_Preview);
      }
      copy[index] = {
        ...copy[index],
        Image_File: file,
        Image_Preview: file ? URL.createObjectURL(file) : "",
      };
      // if user clears file we may want to clear existing link too
      if (!file) {
        copy[index].Image_Link = "";
      }
      return copy;
    });
  }

  function addRow() {
    setRows((prev) => [...prev, emptyRow()]);
  }

  function removeRow(index) {
    setRows((prev) => {
      if (prev.length <= 1) return prev; // keep at least one row
      // revoke preview url if present
      const toRemove = prev[index];
      if (toRemove?.Image_Preview) {
        URL.revokeObjectURL(toRemove.Image_Preview);
      }
      return prev.filter((_, i) => i !== index);
    });
  }

  function validate() {
    const name = deckName.trim();
    if (!name) return "Deck name is required.";

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (!String(r.Question_Text || "").trim())
        return `Row ${i + 1}: Question text is required.`;
      if (!String(r.Correct_Answer || "").trim())
        return `Row ${i + 1}: Correct answer is required.`;
      if (!String(r.Predefined_Fake || "").trim())
        return `Row ${i + 1}: Predefined fake is required.`;
      // image is optional, no validation
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

    // work on a mutable copy to avoid touching React state directly
    const workRows = rows.map((r) => ({ ...r }));

    // If any rows have an Image_File, upload them first
    for (let i = 0; i < workRows.length; i++) {
      const r = workRows[i];
      if (r.Image_File) {
        // only upload if we don't already have a link (avoids re-upload on save-after-error)
        if (!r.Image_Link) {
          const imgRes = await uploadAsset(r.Image_File);
          if (!imgRes.ok) {
            setStatus("error");
            setMessage(
              `Failed to upload image for row ${i + 1} (HTTP ${imgRes.status}).`,
            );
            setBusy(false);
            return;
          }
          // expect backend to return { filename, url }
          // store just the filename; backend parser will prepend /assets/
          r.Image_Link = imgRes.data.filename;
        }
      }
    }

    // update state with any new links so UI reflects it
    setRows(workRows);

    // build payload after any uploads
    const finalPayload = {
      name: deckName.trim(),
      questions: workRows.map((r, idx) => ({
        Question_ID: String(idx + 1),
        Question_Text: r.Question_Text,
        Correct_Answer: r.Correct_Answer,
        Predefined_Fake: r.Predefined_Fake,
        Image_Link: r.Image_Link || "",
      })),
    };

    const res = isEditing
      ? await updateDeckApi(initialDeck.name, finalPayload)
      : await saveDeckApi(finalPayload);
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

    // In edit mode: close the modal and let the parent refresh the list
    if (isEditing && typeof onClose === "function") {
      onClose(true);
      return;
    }

    if (!isEditing && typeof onSuccess === "function") {
      console.log("Manual creation success! Refreshing...");
      onSuccess();
      return;
    }

    // Make it easy for the Host to proceed:
    // set the saved deck as Active (for session setup later)
    setActiveDeck({
      name: deckName.trim(),
      questions: finalPayload.questions,
      uploadedAt: Date.now(),
    });

    setBusy(false);
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">
            {isEditing ? "Edit Deck" : "Create a New Deck"}
          </h2>
          <p className="mt-2 text-sm text-slate-300">
            Create a deck directly in the app.
          </p>
        </div>
      </div>

      {/* Deck name */}
      <div className="mt-4">
        <label className="text-sm font-semibold">Deck Name</label>
        <input
          value={deckName}
          onChange={(e) => setDeckName(e.target.value)}
          disabled={isEditing}
          placeholder="e.g., Physics Basics Week 3"
          className={`mt-2 w-full rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-indigo-600 ${isEditing ? "opacity-60 cursor-not-allowed" : ""}`}
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
                <span className="text-xs text-slate-400">
                  (Question_ID = {idx + 1})
                </span>
              </div>

              <button
                type="button"
                onClick={() => removeRow(idx)}
                disabled={rows.length <= 1}
                className="rounded-lg bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-100 hover:bg-slate-700 disabled:opacity-50"
                title={
                  rows.length <= 1
                    ? "At least one question is required."
                    : "Remove this question"
                }
              >
                Remove
              </button>
            </div>

            <div className="mt-3 grid gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-300">
                  Question Text
                </label>
                <textarea
                  value={r.Question_Text}
                  onChange={(e) =>
                    setRowField(idx, "Question_Text", e.target.value)
                  }
                  rows={2}
                  placeholder="Prompt shown to students"
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold text-slate-300">
                    Correct Answer
                  </label>
                  <input
                    value={r.Correct_Answer}
                    onChange={(e) =>
                      setRowField(idx, "Correct_Answer", e.target.value)
                    }
                    placeholder="Correct answer"
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300">
                    Predefined Fake
                  </label>
                  <input
                    value={r.Predefined_Fake}
                    onChange={(e) =>
                      setRowField(idx, "Predefined_Fake", e.target.value)
                    }
                    placeholder="One predefined fake answer"
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
              </div>
              {/* Image attachment (optional) */}
              <div className="mt-3">
                <label className="text-xs font-semibold text-slate-300">
                  Image (optional)
                </label>
                {(r.Image_Preview || r.Image_Link) && (
                  <img
                    src={
                      r.Image_Preview ||
                      (r.Image_Link.startsWith("http")
                        ? r.Image_Link
                        : buildUrl(r.Image_Link))
                    }
                    alt="question"
                    className="mt-1 max-h-24 rounded"
                  />
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setRowImage(idx, e.target.files[0] || null)}
                  className="mt-1 block w-full text-xs text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-100 hover:file:bg-slate-700"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
      {/* moved add row button below -- more discoverable */}
      <div className="mt-4">
        <button
          type="button"
          onClick={addRow}
          className="rounded-lg bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-100 hover:bg-slate-700"
        >
          + Add Question
        </button>
      </div>

      {/* Save button */}
      <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center">
        <button
          onClick={onSave}
          disabled={busy}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
        >
          {busy
            ? isEditing
              ? "Updating..."
              : "Saving..."
            : isEditing
              ? "Update Deck"
              : "Save Deck"}
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
      {/* {raw && (
        <div className="mt-3 rounded-lg border border-slate-800 bg-slate-950/50 p-3">
          <div className="text-xs text-slate-300">
            <div className="font-semibold mb-1">Raw Backend Response</div>
            <pre className="whitespace-pre-wrap break-words text-slate-200">
              {typeof raw === "string" ? raw : JSON.stringify(raw, null, 2)}
            </pre>
          </div>
        </div>
      )} */}
    </div>
  );
}
