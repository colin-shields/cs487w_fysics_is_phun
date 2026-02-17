/**
 * HostSessionSetup.jsx
 * Host Session Setup page.
 *
 * Purpose (MVP):
 * - Confirm an Active Deck is selected.
 * - Configure session settings (Stage 1 timer, Stage 2 timer, Worst Fake toggle).
 * - Prepare to call backend "create session" endpoint once defined.
 *
 * We are NOT generating join codes client-side.
 */

import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useDeck } from "../../state/DeckContext.jsx";

const DEFAULTS = {
  stage1Seconds: 60,
  stage2Seconds: 45,
  enableWorstFake: false, // MVP safety default per your reqs
};

function clampInt(value, min, max, fallback) {
  const n = Number.parseInt(value, 10);
  if (Number.isNaN(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

export default function HostSessionSetup() {
  const { activeDeck } = useDeck();

  const [stage1Seconds, setStage1Seconds] = useState(DEFAULTS.stage1Seconds);
  const [stage2Seconds, setStage2Seconds] = useState(DEFAULTS.stage2Seconds);
  const [enableWorstFake, setEnableWorstFake] = useState(DEFAULTS.enableWorstFake);

  // Basic deck summary derived from the active deck
  const deckSummary = useMemo(() => {
    if (!activeDeck) return null;
    return {
      name: activeDeck.name,
      count: activeDeck.questions.length,
      firstQuestion: activeDeck.questions?.[0]?.Question_Text || "(none)",
    };
  }, [activeDeck]);

  // Create Session is intentionally disabled until backend session endpoints exist.
  const canCreateSession = Boolean(activeDeck);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-slate-800 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div>
            <div className="text-sm text-slate-400">Host View</div>
            <div className="font-semibold">Session Setup</div>
          </div>

          <div className="flex items-center gap-4">
            <Link
              className="text-sm text-slate-300 hover:text-white underline underline-offset-4"
              to="/host"
            >
              Host Home
            </Link>
            <Link
              className="text-sm text-slate-300 hover:text-white underline underline-offset-4"
              to="/host/decks"
            >
              Deck Manager
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        {!activeDeck ? (
          <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
            <h2 className="text-lg font-semibold">No Active Deck Selected</h2>
            <p className="mt-2 text-sm text-slate-300">
              A deck must be selected before creating a session. Upload a CSV and click
              “Set as Active Deck.”
            </p>
            <Link
              to="/host/decks"
              className="mt-4 inline-flex rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
            >
              Go to Deck Manager
            </Link>
          </section>
        ) : (
          <>
            {/* Deck Summary */}
            <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
              <h2 className="text-lg font-semibold">Active Deck</h2>
              <div className="mt-2 text-sm text-slate-300">
                <div>
                  <span className="font-semibold text-slate-100">Name:</span> {deckSummary.name}
                </div>
                <div>
                  <span className="font-semibold text-slate-100">Questions:</span> {deckSummary.count}
                </div>
                <div className="mt-2 text-xs text-slate-400">
                  First question preview: {deckSummary.firstQuestion}
                </div>
              </div>
            </section>

            {/* Session Settings */}
            <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
              <h2 className="text-lg font-semibold">Session Settings</h2>
              <p className="mt-2 text-sm text-slate-300">
                These settings will be sent to the backend when creating the session.
              </p>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <div className="text-sm font-semibold">Stage 1 timer (seconds)</div>
                  <input
                    type="number"
                    min={10}
                    max={300}
                    value={stage1Seconds}
                    onChange={(e) =>
                      setStage1Seconds(clampInt(e.target.value, 10, 300, DEFAULTS.stage1Seconds))
                    }
                    className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm text-slate-100"
                  />
                  <div className="mt-1 text-xs text-slate-400">Default: 60s</div>
                </label>

                <label className="block">
                  <div className="text-sm font-semibold">Stage 2 timer (seconds)</div>
                  <input
                    type="number"
                    min={10}
                    max={300}
                    value={stage2Seconds}
                    onChange={(e) =>
                      setStage2Seconds(clampInt(e.target.value, 10, 300, DEFAULTS.stage2Seconds))
                    }
                    className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm text-slate-100"
                  />
                  <div className="mt-1 text-xs text-slate-400">Default: 45s</div>
                </label>
              </div>

              <label className="mt-4 flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={enableWorstFake}
                  onChange={(e) => setEnableWorstFake(e.target.checked)}
                  className="h-4 w-4"
                />
                <div>
                  <div className="text-sm font-semibold">Enable “Worst Fake” (-1)</div>
                  <div className="text-xs text-slate-400">Default OFF for MVP safety.</div>
                </div>
              </label>

              {/* Create Session (disabled until backend session endpoints exist) */}
              <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-xs text-slate-400">
                  Next: this button will call the backend to create a live session (join code + host URL).
                </div>

                <button
                  disabled={!canCreateSession}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
                  onClick={() => {
                    // Placeholder only: no backend endpoint exists yet.
                    // We will implement the real call after you confirm the endpoint contract.
                    alert(
                      "Session creation endpoint not wired yet. Confirm backend route + response format and we’ll connect it."
                    );
                  }}
                >
                  Create Session (coming next)
                </button>
              </div>

              {/* Display the settings that would be sent (transparent + useful for debugging) */}
              <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950/40 p-3">
                <div className="text-xs text-slate-300 font-semibold mb-1">Payload Preview (future)</div>
                <pre className="whitespace-pre-wrap break-words text-xs text-slate-200">
{JSON.stringify(
  {
    deckName: activeDeck.name,
    questionCount: activeDeck.questions.length,
    settings: {
      stage1Seconds,
      stage2Seconds,
      enableWorstFake,
    },
  },
  null,
  2
)}
                </pre>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
