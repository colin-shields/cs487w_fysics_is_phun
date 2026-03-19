/**
 * DeckListPanel.jsx
 * Displays stored decks + a detailed view of the selected deck.
 *
 * Backend shapes (confirmed):
 * - GET /decks              -> list of filenames (strings) (assumed)
 * - GET /decks/{filename}   -> { deck_id: filename, questions: { status: "success", data: [...] } }
 *
 * UI:
 * - Left: deck list
 * - Right: selected deck details (table of questions)
 */

import React, { useEffect, useMemo, useState } from "react";
import { getHostCode } from "../../utils/hostAuth.js";
import {
  listDecksApi,
  getDeckDetailApi,
  deleteDeckApi,
} from "../../api/decks.js";
import { useDeck } from "../../state/DeckContext.jsx";
import { buildUrl } from "../../api/httpClient";
import Modal from "./Modal.jsx";
import DeckCreateCard from "./DeckCreateCard.jsx";
import DeckUploadCard from "./DeckUploadCard.jsx";
import { downloadTextFile } from "../../utils/download.js";

/**
 * Given a deck detail object from backend:
 * { deck_id, questions: { status, data } }
 * return the questions array safely.
 */
function getQuestionsArray(deck) {
  const data = deck?.questions?.data;
  return Array.isArray(data) ? data : [];
}

/**
 * Deck title in UI (use filename/deck_id).
 */
function getDeckTitle(deck, idx) {
  return deck?.deck_id || `Deck ${idx + 1}`;
}

export default function DeckListPanel() {
  const { setActiveDeck, activeDeck } = useDeck();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [decks, setDecks] = useState([]); // array of deck detail objects
  const [selectedDeck, setSelectedDeck] = useState(null);
  const [imageErrors, setImageErrors] = useState({}); // track failed image loads
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingDeck, setEditingDeck] = useState(null);

  async function loadDecks() {
    setBusy(true);
    setError("");

    const res = await listDecksApi();

    if (!res.ok) {
      // If the server rejects the code saved in localStorage
      if (res.status === 401 || res.status === 403) {
        logoutHost();
        return;
      }
      setError(`Failed to load: ${res.status}`);
      setBusy(false);
      return;
    }

    // Expected: list of filenames OR {decks:[...]}
    const payload = res.data;
    const filenames = Array.isArray(payload) ? payload : payload?.decks;

    if (!Array.isArray(filenames)) {
      setError("Unexpected response format from server.");
      setBusy(false);
      return;
    }

    // Fetch details for each filename in parallel
    const detailedDecks = await Promise.all(
      filenames.map(async (filename) => {
        const detailRes = await getDeckDetailApi(filename);
        if (!detailRes.ok) {
          return {
            deck_id: filename,
            questions: { status: "error", data: [] },
          };
        }
        return detailRes.data;
      }),
    );

    setDecks(detailedDecks);
    if (detailedDecks.length > 0) setSelectedDeck(detailedDecks[0]);
    setBusy(false);
  }

  useEffect(() => {
    loadDecks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onSelectDeck(deck) {
    setSelectedDeck(deck);
  }

  function onSetActive(deck) {
    // if already active, do nothing
    if (activeDeck?.deckId === deck?.deck_id) return;

    const questionsArray = getQuestionsArray(deck);

    setActiveDeck({
      // For now, we treat deck_id (filename) as the stable identifier
      name: deck?.deck_id || "Deck",
      questions: questionsArray,
      uploadedAt: Date.now(),
      deckId: deck?.deck_id,
    });
  }

  function handleImageError(questionId) {
    setImageErrors((prev) => ({ ...prev, [questionId]: true }));
  }

  async function onDeleteDeck(deck) {
    if (!deck?.deck_id) return;
    if (
      !window.confirm(`Delete deck "${deck.deck_id}"? This cannot be undone.`)
    )
      return;
    setBusy(true);
    setError("");
    const res = await deleteDeckApi(deck.deck_id);
    if (!res.ok) {
      setError(`Failed to delete deck (HTTP ${res.status}).`);
    } else {
      // reload list and clear selection if we removed the current one
      await loadDecks();
      if (selectedDeck?.deck_id === deck.deck_id) {
        setSelectedDeck(null);
      }
    }
    setBusy(false);
  }

  function onEditDeck(deck) {
    if (!deck?.deck_id) return;
    setEditingDeck({ name: deck.deck_id, questions: getQuestionsArray(deck) });
    setIsEditOpen(true);
  }

  async function handleEditClose(saved) {
    setIsEditOpen(false);
    setEditingDeck(null);
    if (saved) await loadDecks();
  }

  async function onDownloadBackup(deck) {
    if (!deck?.deck_id) return;

    try {
      const code = getHostCode(); // Use your helper function here!

      const response = await fetch(
        buildUrl(`/decks/${deck.deck_id}/download`),
        {
          method: "GET",
          headers: {
            "X-Host-Code": code || "",
          },
        },
      );

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = deck.deck_id;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Backup failed:", err);
      alert(`Could not download backup: ${err.message}`);
    }
  }

  const selectedQuestions = useMemo(
    () => getQuestionsArray(selectedDeck),
    [selectedDeck],
  );
  const selectedStatus = selectedDeck?.questions?.status;

  return (
    <section className="mt-4 rounded-xl border border-slate-800 bg-slate-900/40 p-5">
      {/* 1. CONDENSED HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5 mb-5">
        <div>
          <h1 className="text-xl font-semibold">Stored Decks</h1>
          <p className="text-xs text-slate-400">
            Manage your "Fysics is Phun" question library
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setIsCreateOpen(true)}
            className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-500"
          >
            + Create Deck
          </button>
          <button
            onClick={() => setIsUploadOpen(true)}
            className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-500"
          >
            ↑ Upload CSV
          </button>
          <button
            onClick={loadDecks}
            disabled={busy}
            className="rounded-lg bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-100 hover:bg-slate-700 disabled:opacity-60"
          >
            {busy ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {/* 2. MODAL COMPONENTS */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Manual Deck Creator"
      >
        <DeckCreateCard />
      </Modal>

      <Modal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        title="CSV Deck Uploader"
      >
        <DeckUploadCard />
      </Modal>

      <Modal
        isOpen={isEditOpen}
        onClose={() => handleEditClose(false)}
        title="Edit Deck"
      >
        {editingDeck && (
          <DeckCreateCard
            initialDeck={editingDeck}
            isEditing={true}
            onClose={handleEditClose}
          />
        )}
      </Modal>

      <p className="mt-2 text-sm text-slate-300">
        Click a deck to view full details. Use “Set Active” to mark it for
        session setup.
      </p>

      {/* Error */}
      {error && (
        <div className="mt-3 rounded-lg border border-rose-900/60 bg-rose-950/40 p-3 text-sm text-rose-100">
          {error}
        </div>
      )}

      {/* Empty */}
      {!error && !busy && decks.length === 0 && (
        <div className="mt-3 rounded-lg border border-slate-800 bg-slate-950/40 p-3 text-sm text-slate-300">
          No decks found yet.
        </div>
      )}

      {/* List + Detail */}
      {decks.length > 0 && (
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          {/* Deck list */}
          <div className="grid gap-3 lg:col-span-1">
            {decks.map((deck, idx) => {
              const title = getDeckTitle(deck, idx);
              const count = getQuestionsArray(deck).length;
              const isSelected = selectedDeck?.deck_id === deck?.deck_id;

              return (
                <div
                  key={deck?.deck_id || idx}
                  className={`rounded-lg border bg-slate-950/30 p-4 ${
                    isSelected ? "border-indigo-500" : "border-slate-800"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <button
                      onClick={() => onSelectDeck(deck)}
                      className="text-left"
                      title="View deck details"
                    >
                      <div className="font-semibold text-slate-100">
                        {title}
                      </div>
                      <div className="mt-1 text-xs text-slate-400">
                        {count} question(s)
                      </div>
                    </button>

                    <div className="flex gap-1">
                      <button
                        onClick={() => onSetActive(deck)}
                        disabled={activeDeck?.deckId === deck?.deck_id || busy}
                        className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors
    ${
      activeDeck?.deckId === deck?.deck_id
        ? "bg-emerald-600 text-white cursor-default" // Active is now Green
        : "bg-slate-700 text-slate-200 hover:bg-slate-600" // Inactive is now Grey
    }`}
                        title={
                          activeDeck?.deckId === deck?.deck_id
                            ? "This is the current active deck"
                            : "Sets this as Active Deck for later session setup"
                        }
                      >
                        {activeDeck?.deckId === deck?.deck_id
                          ? "(Active)"
                          : "Set Active"}
                      </button>

                      <button
                        onClick={() => onDownloadBackup(deck)}
                        disabled={busy}
                        className="rounded-lg bg-indigo-600 px-2.5 py-2 text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors flex items-center justify-center"
                        title="Download CSV Backup"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                          />
                        </svg>
                      </button>

                      <button
                        onClick={() => onEditDeck(deck)}
                        disabled={busy}
                        className="rounded-lg bg-indigo-600 px-2.5 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
                        title="Edit this deck"
                      >
                        Edit
                      </button>

                      <button
                        onClick={() => onDeleteDeck(deck)}
                        disabled={busy}
                        className="rounded-lg bg-rose-600 px-2 py-2 text-xs font-semibold text-white hover:bg-rose-500"
                        title="Delete this deck"
                      >
                        &times;
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Detail panel */}
          <div className="rounded-lg border border-slate-800 bg-slate-950/30 p-4 lg:col-span-2">
            {!selectedDeck ? (
              <div className="text-sm text-slate-300">
                Select a deck to view its questions.
              </div>
            ) : (
              <>
                <div>
                  <div className="text-sm text-slate-400">Selected Deck</div>
                  <div className="text-lg font-semibold text-slate-100">
                    {selectedDeck.deck_id}
                  </div>
                  <div className="mt-1 text-xs text-slate-400">
                    Status: {selectedStatus || "unknown"} ·{" "}
                    {selectedQuestions.length} question(s)
                  </div>
                </div>

                {selectedStatus !== "success" && (
                  <div className="mt-4 rounded-lg border border-rose-900/60 bg-rose-950/40 p-3 text-sm text-rose-100">
                    This deck could not be loaded successfully from the server.
                  </div>
                )}

                {/* Questions table */}
                {selectedQuestions.length === 0 ? (
                  <div className="mt-4 rounded-lg border border-slate-800 bg-slate-900/30 p-3 text-sm text-slate-300">
                    No questions to display.
                  </div>
                ) : (
                  <div className="mt-4 overflow-auto rounded-lg border border-slate-800">
                    <table className="min-w-full text-left text-xs">
                      <thead className="bg-slate-950/70 text-slate-300">
                        <tr>
                          <th className="px-3 py-2 font-semibold">
                            Question_ID
                          </th>
                          <th className="px-3 py-2 font-semibold">
                            Question_Text
                          </th>
                          <th className="px-3 py-2 font-semibold">
                            Correct_Answer
                          </th>
                          <th className="px-3 py-2 font-semibold">
                            Predefined_Fake
                          </th>
                          <th className="px-3 py-2 font-semibold">Image</th>
                        </tr>
                      </thead>
                      <tbody className="text-slate-200">
                        {selectedQuestions.map((q, i) => (
                          <tr
                            key={q.Question_ID ?? i}
                            className="border-t border-slate-800"
                          >
                            <td className="px-3 py-2 align-top">
                              {q.Question_ID ?? i + 1}
                            </td>
                            <td className="px-3 py-2 align-top whitespace-pre-wrap">
                              {q.Question_Text ?? ""}
                            </td>
                            <td className="px-3 py-2 align-top whitespace-pre-wrap">
                              {q.Correct_Answer ?? ""}
                            </td>
                            <td className="px-3 py-2 align-top whitespace-pre-wrap">
                              {q.Predefined_Fake ?? ""}
                            </td>
                            <td className="px-3 py-2 align-top">
                              {q.Image_Link ? (
                                imageErrors[q.Question_ID] ? (
                                  <div className="text-xs text-rose-400 break-all">
                                    <div>Failed to load</div>
                                    <div className="mt-1 font-mono text-rose-300">
                                      {q.Image_Link}
                                    </div>
                                  </div>
                                ) : (
                                  <img
                                    src={
                                      q.Image_Link.startsWith("http")
                                        ? q.Image_Link
                                        : buildUrl(q.Image_Link)
                                    }
                                    alt={`q${q.Question_ID}`}
                                    onError={() =>
                                      handleImageError(q.Question_ID)
                                    }
                                    className="max-h-12 max-w-16 rounded cursor-pointer hover:ring-2 hover:ring-indigo-500"
                                    title="Click to view full image"
                                  />
                                )
                              ) : (
                                <span className="text-slate-400 text-xs">
                                  No image
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
