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

import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDeck } from "../../state/DeckContext.jsx";
import { httpPostJson, buildUrl } from "../../api/httpClient";
import { getHostCode } from "../../utils/hostAuth";

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
  const navigate = useNavigate();
  const { activeDeck } = useDeck();

  const [stage1Seconds, setStage1Seconds] = useState(DEFAULTS.stage1Seconds);
  const [stage2Seconds, setStage2Seconds] = useState(DEFAULTS.stage2Seconds);
  const [enableWorstFake, setEnableWorstFake] = useState(DEFAULTS.enableWorstFake);

  // Session state
  const [busyCreating, setBusyCreating] = useState(false);
  const [creationError, setCreationError] = useState("");

  // (roomCode and player state now handled by the dedicated lobby page)


  async function onCreateSession() {
    setBusyCreating(true);
    setCreationError("");

    const hostCode = getHostCode?.() || "";
    const headers = hostCode ? { "X-Host-Code": hostCode } : {};

    try {
      const res = await httpPostJson(
        "/create-session",
        { deck_id: activeDeck.deckId || activeDeck.name, enable_worst_fake: enableWorstFake },
        headers
      );

      if (!res.ok) {
        setCreationError(`Failed to create session (HTTP ${res.status}).`);
        setBusyCreating(false);
        return;
      }

      // navigate to new lobby page, passing room code
      navigate("/host/lobby", { state: { roomCode: res.data.room_code } });
      setBusyCreating(false);
    } catch (err) {
      setCreationError(err.message || "Unknown error");
      setBusyCreating(false);
    }
  }

  // helpers removed - lobby page handles start/back actions

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
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-[#0a0523] to-[#0d011c]">
      <header className="sticky top-0 z-40 border-b border-indigo-900/50 bg-[#0a0523]/80 backdrop-blur shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-indigo-300">Host View</div>
            <div className="text-lg font-bold text-white tracking-wide">Session Setup</div>
          </div>

          <div className="flex items-center gap-6">
            <Link
              className="text-sm font-semibold uppercase tracking-wider text-indigo-300 hover:text-white transition-colors"
              to="/host"
            >
              Host Home
            </Link>
            <Link
              className="text-sm font-semibold uppercase tracking-wider text-indigo-300 hover:text-white transition-colors"
              to="/host/decks"
            >
              Deck Manager
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10 relative space-y-8">
        {/* Subtle background glow */}
        <div className="absolute top-10 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-[100px] pointer-events-none"></div>

        {!activeDeck ? (
          <section className="rounded-2xl border border-indigo-500/20 bg-indigo-950/20 backdrop-blur-md shadow-[0_0_20px_rgba(139,92,246,0.05)] p-8 relative z-10">
            <h2 className="text-xl font-bold text-white mb-2">No Active Deck Selected</h2>
            <p className="mt-2 text-sm text-indigo-200/80 leading-relaxed">
              A deck must be selected before creating a session. Upload a CSV and click
              “Set as Active Deck.”
            </p>
            <Link
              to="/host/decks"
              className="mt-6 inline-flex rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-3 text-sm font-bold text-white shadow-[0_0_15px_rgba(139,92,246,0.3)] hover:shadow-[0_0_25px_rgba(139,92,246,0.5)] hover:scale-[1.02] transition-all"
            >
              Go to Deck Manager
            </Link>
          </section>
        ) : (
          <>
            {/* Deck Summary */}
            <section className="rounded-2xl border border-indigo-500/20 bg-indigo-950/20 backdrop-blur-md shadow-[0_0_20px_rgba(139,92,246,0.05)] p-8 relative z-10 relative overflow-hidden">
              {/* Subtle top border glow */}
              <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-50"></div>

              <h2 className="text-xl font-bold text-white mb-4">Active Deck</h2>
              <div className="mt-2 text-sm text-indigo-200/90 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-indigo-300 uppercase tracking-wider text-xs">Name:</span>
                  <span className="text-white font-medium">{deckSummary.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-indigo-300 uppercase tracking-wider text-xs">Questions:</span>
                  <span className="bg-purple-600/20 text-purple-300 py-0.5 px-2 rounded-md text-xs font-bold border border-purple-500/30">{deckSummary.count}</span>
                </div>
                <div className="mt-4 pt-3 border-t border-indigo-500/20 text-xs text-indigo-300/70 italic">
                  Preview: "{deckSummary.firstQuestion}"
                </div>
              </div>
            </section>

            {/* Session Settings */}
            <section className="rounded-2xl border border-indigo-500/20 bg-indigo-950/20 backdrop-blur-md shadow-[0_0_20px_rgba(139,92,246,0.05)] p-8 relative z-10">
              <h2 className="text-xl font-bold text-white mb-2">Session Settings</h2>
              <p className="mt-2 text-sm text-indigo-200/80 leading-relaxed mb-6">
                These settings will be sent to the backend when creating the session.
              </p>

              <div className="grid gap-6 sm:grid-cols-2">
                <label className="block bg-indigo-950/40 border border-indigo-500/20 p-5 rounded-xl">
                  <div className="text-sm font-semibold text-white mb-1">Stage 1 timer (seconds)</div>
                  <div className="text-xs text-indigo-300/70 mb-4 h-8">In this stage, the question is presented and players can submit their answers.</div>
                  <input
                    type="number"
                    min={10}
                    max={300}
                    value={stage1Seconds}
                    onChange={(e) =>
                      setStage1Seconds(clampInt(e.target.value, 10, 300, DEFAULTS.stage1Seconds))
                    }
                    className="w-full rounded-xl border border-indigo-500/30 bg-indigo-950/60 px-4 py-3 text-white outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 transition-all shadow-inner"
                  />
                </label>

                <label className="block bg-indigo-950/40 border border-indigo-500/20 p-5 rounded-xl">
                  <div className="text-sm font-semibold text-white mb-1">Stage 2 timer (seconds)</div>
                  <div className="text-xs text-indigo-300/70 mb-4 h-8">Players must choose which answer they believe is correct.</div>
                  <input
                    type="number"
                    min={10}
                    max={300}
                    value={stage2Seconds}
                    onChange={(e) =>
                      setStage2Seconds(clampInt(e.target.value, 10, 300, DEFAULTS.stage2Seconds))
                    }
                    className="w-full rounded-xl border border-indigo-500/30 bg-indigo-950/60 px-4 py-3 text-white outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 transition-all shadow-inner"
                  />
                </label>
              </div>

              <label className="mt-6 flex items-start gap-4 p-5 rounded-xl border border-indigo-500/20 bg-indigo-950/40 cursor-pointer hover:bg-indigo-900/40 transition-colors">
                <input
                  type="checkbox"
                  checked={enableWorstFake}
                  onChange={(e) => setEnableWorstFake(e.target.checked)}
                  className="mt-1 h-5 w-5 rounded border-indigo-500/50 bg-indigo-950/60 text-purple-600 focus:ring-purple-500/50 focus:ring-offset-0"
                />
                <div>
                  <div className="text-sm font-bold text-white mb-1">Enable “Worst Fake” (-1)</div>
                  <div className="text-xs text-indigo-300/80 leading-relaxed">Jury will be allowed to choose a "worst fake" submission to award -1 points.</div>
                </div>
              </label>

              {/* Create Session */}
              <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pt-6 border-t border-indigo-500/20">
                <div className="text-xs text-indigo-300 uppercase tracking-wider font-semibold">
                  Create a live session and share the code with players.
                </div>

                <button
                  disabled={!canCreateSession || busyCreating}
                  className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 px-8 py-3.5 text-base font-bold text-white shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.5)] hover:scale-[1.02] disabled:hover:scale-100 disabled:opacity-50 transition-all"
                  onClick={onCreateSession}
                >
                  {busyCreating ? "Creating Session..." : "Create Session"}
                </button>
              </div>

              {/* Display the settings that would be sent (transparent + useful for debugging) */}
              <div className="mt-8 rounded-xl border border-indigo-500/20 bg-[#0a0523]/60 p-4 font-mono text-xs">
                <div className="text-indigo-400/80 font-bold mb-2 tracking-widest uppercase">// Session Payload Debug</div>
                <pre className="whitespace-pre-wrap break-words text-indigo-200/90">
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

              {creationError && (
                <div className="mt-6 rounded-lg border border-pink-500/40 bg-pink-950/40 p-4 text-sm text-pink-200 shadow-lg">
                  {creationError}
                </div>
              )}
            </section>

            {/* session lobby is now a separate page; user will be redirected there */}          </>
        )}
      </main>
    </div>
  );
}
