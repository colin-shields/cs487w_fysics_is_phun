/**
 * ActiveDeckCard.jsx
 * Displays the deck currently selected as "Active" by the Host.
 *
 * In MVP/testing:
 * - Active deck is set from the latest uploaded deck preview (Option 2).
 * - This will later be used in Session Setup.
 */

import React from "react";
import { useDeck } from "../../state/DeckContext.jsx";
import { Link } from "react-router-dom";

export default function ActiveDeckCard({ onManageClick }) {
  const { activeDeck, clearActiveDeck } = useDeck();

  if (!activeDeck) {
    return (
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-lg font-bold text-white">Active Deck</h3>
          <p className="text-sm text-indigo-200/80 leading-relaxed">
            No active deck selected. Upload a deck and click "Set as Active
            Deck."
          </p>
        </div>

        <div className="flex-shrink-0">
          <button
            onClick={onManageClick}
            className="rounded-lg bg-indigo-900/40 border border-indigo-500/30 px-4 py-2 text-xs font-bold text-indigo-100 hover:bg-indigo-800/60 hover:border-indigo-400/50 transition-all"
          >
            Manage Decks
          </button>
        </div>
      </div>
    );
  }
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Active Deck</h2>
          <p className="mt-2 text-sm text-slate-300">
            <span className="font-semibold text-slate-100">
              {activeDeck.name}
            </span>
            {" · "}
            {activeDeck.questions.length} question(s)
          </p>
          <p className="mt-1 text-xs text-slate-400">
            This deck will be used when creating a session.
          </p>
        </div>

        <button
          onClick={clearActiveDeck}
          className="rounded-lg bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-100 hover:bg-slate-700"
        >
          Clear
        </button>
      </div>
    </section>
  );
}
