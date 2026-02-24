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
import { listDecksApi, getDeckDetailApi } from "../../api/decks.js";
import { useDeck } from "../../state/DeckContext.jsx";

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
  const { setActiveDeck } = useDeck();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [decks, setDecks] = useState([]); // array of deck detail objects
  const [selectedDeck, setSelectedDeck] = useState(null);

  async function loadDecks() {
    setBusy(true);
    setError("");
    setDecks([]);
    setSelectedDeck(null);

    const res = await listDecksApi();

    if (!res.ok) {
      if ([404, 405, 501].includes(res.status)) {
        setError("Deck listing is not available yet (server endpoint /decks not implemented).");
      } else if (res.status === 401 || res.status === 403) {
        setError("Not authorized. Please log in again with the host code.");
      } else {
        setError(`Failed to load decks (HTTP ${res.status}).`);
      }
      setBusy(false);
      return;
    }

    // Expected: list of filenames OR {decks:[...]}
    const payload = res.data;
    const filenames = Array.isArray(payload) ? payload : payload?.decks;

    if (!Array.isArray(filenames)) {
      setError("Unexpected response format from server (expected a list of filenames).");
      setBusy(false);
      return;
    }

    // Fetch details for each filename in parallel
    const detailedDecks = await Promise.all(
      filenames.map(async (filename) => {
        const detailRes = await getDeckDetailApi(filename);

        if (!detailRes.ok) {
          // Fallback so the UI doesn't crash
          return {
            deck_id: filename,
            questions: { status: "error", data: [] },
          };
        }

        // Expected detail shape:
        // { deck_id: filename, questions: { status:"success", data:[...] } }
        return detailRes.data;
      })
    );

    setDecks(detailedDecks);

    // Auto-select the first deck, if any
    if (detailedDecks.length > 0) {
      setSelectedDeck(detailedDecks[0]);
    }

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
    const questionsArray = getQuestionsArray(deck);

    setActiveDeck({
      // For now, we treat deck_id (filename) as the stable identifier
      name: deck?.deck_id || "Deck",
      questions: questionsArray,
      uploadedAt: Date.now(),
      deckId: deck?.deck_id,
    });
  }

  const selectedQuestions = useMemo(() => getQuestionsArray(selectedDeck), [selectedDeck]);
  const selectedStatus = selectedDeck?.questions?.status;

  return (
    <section className="mt-4 rounded-xl border border-slate-800 bg-slate-900/40 p-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Stored Decks</h2>
        <button
          onClick={loadDecks}
          disabled={busy}
          className="rounded-lg bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-100 hover:bg-slate-700 disabled:opacity-60"
        >
          {busy ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      <p className="mt-2 text-sm text-slate-300">
        Click a deck to view full details. Use “Set Active” to mark it for session setup later.
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
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {/* Deck list */}
          <div className="grid gap-3">
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
                      <div className="font-semibold text-slate-100">{title}</div>
                      <div className="mt-1 text-xs text-slate-400">{count} question(s)</div>
                    </button>

                    <button
                      onClick={() => onSetActive(deck)}
                      className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-500"
                      title="Sets this as Active Deck for later session setup"
                    >
                      Set Active
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Detail panel */}
          <div className="rounded-lg border border-slate-800 bg-slate-950/30 p-4">
            {!selectedDeck ? (
              <div className="text-sm text-slate-300">Select a deck to view its questions.</div>
            ) : (
              <>
                <div>
                  <div className="text-sm text-slate-400">Selected Deck</div>
                  <div className="text-lg font-semibold text-slate-100">
                    {selectedDeck.deck_id}
                  </div>
                  <div className="mt-1 text-xs text-slate-400">
                    Status: {selectedStatus || "unknown"} · {selectedQuestions.length} question(s)
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
                          <th className="px-3 py-2 font-semibold">Question_ID</th>
                          <th className="px-3 py-2 font-semibold">Question_Text</th>
                          <th className="px-3 py-2 font-semibold">Correct_Answer</th>
                          <th className="px-3 py-2 font-semibold">Predefined_Fake</th>
                        </tr>
                      </thead>
                      <tbody className="text-slate-200">
                        {selectedQuestions.map((q, i) => (
                          <tr key={q.Question_ID ?? i} className="border-t border-slate-800">
                            <td className="px-3 py-2 align-top">{q.Question_ID ?? i + 1}</td>
                            <td className="px-3 py-2 align-top whitespace-pre-wrap">
                              {q.Question_Text ?? ""}
                            </td>
                            <td className="px-3 py-2 align-top whitespace-pre-wrap">
                              {q.Correct_Answer ?? ""}
                            </td>
                            <td className="px-3 py-2 align-top whitespace-pre-wrap">
                              {q.Predefined_Fake ?? ""}
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
