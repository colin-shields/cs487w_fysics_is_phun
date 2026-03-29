import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDeck } from "../../state/DeckContext.jsx";
import { httpPostJson } from "../../api/httpClient";
import { getHostCode } from "../../utils/hostAuth";

const DEFAULTS = {
  stage1Seconds: 60,
  stage2Seconds: 45,
  enableWorstFake: false,
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
  const [enableWorstFake, setEnableWorstFake] = useState(
    DEFAULTS.enableWorstFake,
  );

  const [busyCreating, setBusyCreating] = useState(false);
  const [creationError, setCreationError] = useState("");

  async function onCreateSession() {
    setBusyCreating(true);
    setCreationError("");
    const hostCode = getHostCode?.() || "";
    const headers = hostCode ? { "X-Host-Code": hostCode } : {};

    try {
      const res = await httpPostJson(
        "/create-session",
        {
          deck_id: activeDeck.deckId || activeDeck.name,
          enable_worst_fake: enableWorstFake,
          stage1_duration: stage1Seconds,
          stage2_duration: stage2Seconds,
        },
        headers,
      );

      if (!res.ok) {
        setCreationError(`Failed to create session (HTTP ${res.status}).`);
        setBusyCreating(false);
        return;
      }

      navigate("/host/lobby", { state: { roomCode: res.data.room_code } });
      setBusyCreating(false);
    } catch (err) {
      setCreationError(err.message || "Unknown error");
      setBusyCreating(false);
    }
  }

  const deckSummary = useMemo(() => {
    if (!activeDeck) return null;
    return {
      name: activeDeck.name,
      count: activeDeck.questions.length,
      firstQuestion: activeDeck.questions?.[0]?.Question_Text || "(none)",
    };
  }, [activeDeck]);

  const canCreateSession = Boolean(activeDeck);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-[#0a0523] to-[#0d011c]">
      <header className="sticky top-0 z-40 border-b border-indigo-900/50 bg-[#0a0523]/80 backdrop-blur shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-indigo-300">
              Host View
            </div>
            <div className="text-lg font-bold text-white tracking-wide">
              Session Setup
            </div>
          </div>
          <div className="flex items-center gap-6">
            <Link
              className="text-sm font-semibold uppercase tracking-wider text-indigo-300 hover:text-white transition-colors"
              to="/host"
            >
              Host Home
            </Link>
            {/* Deck Manager Link Removed from Header per request */}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10 relative space-y-8">
        <div className="absolute top-10 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-[100px] pointer-events-none"></div>

        {!activeDeck ? (
          <section className="rounded-2xl border border-indigo-500/20 bg-indigo-950/20 backdrop-blur-md p-8 relative z-10 text-center">
            <h2 className="text-xl font-bold text-white mb-2">
              No Active Deck Selected
            </h2>
            <p className="mt-2 text-sm text-indigo-200/80 leading-relaxed">
              A deck must be selected before creating a session.
            </p>
            <Link
              to="/host/decks"
              className="mt-6 inline-flex rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-3 text-sm font-bold text-white shadow-[0_0_15px_rgba(139,92,246,0.3)] hover:shadow-[0_0_25px_rgba(139,92,246,0.5)] transition-all"
            >
              Go to Deck Manager
            </Link>
          </section>
        ) : (
          <section className="rounded-2xl border border-indigo-500/20 bg-indigo-950/20 backdrop-blur-md shadow-[0_0_20px_rgba(139,92,246,0.05)] p-8 relative z-10">
            <h2 className="text-xl font-bold text-white mb-6 tracking-wide">
              Session Settings
            </h2>

            {/* Merged Active Deck Info with Right-Aligned Button */}
            <div className="mb-8 pb-6 border-b border-indigo-500/20">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-indigo-300">
                      Active Deck:
                    </span>
                    <span className="text-white">{deckSummary.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-indigo-300">
                      Questions:
                    </span>
                    <span className="text-white">{deckSummary.count}</span>
                  </div>
                </div>

                {/* Right-Aligned Deck Manager Button */}
                <button
                  onClick={() => navigate("/host/decks")}
                  className="whitespace-nowrap rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2 text-xs font-bold text-white shadow-[0_0_10px_rgba(139,92,246,0.2)] hover:shadow-[0_0_20px_rgba(139,92,246,0.4)] hover:scale-[1.02] transition-all"
                >
                  Open Deck Manager
                </button>
              </div>
              <div className="mt-2 text-sm text-indigo-300/60 italic">
                Preview: "{deckSummary.firstQuestion}"
              </div>
            </div>

            {/* Stage Timers Grid */}
            <div className="grid gap-6 sm:grid-cols-2">
              {/* Stage 1 Timer */}
              <div className="block bg-indigo-950/40 border border-indigo-500/20 p-5 rounded-xl">
                <div className="text-sm font-semibold text-white mb-1">
                  Stage 1 timer
                </div>
                <div className="text-xs text-indigo-300/70 mb-4 h-8 leading-tight">
                  Players submit their answers.
                </div>
                <div className="relative flex items-center">
                  <input
                    type="number"
                    value={stage1Seconds}
                    onChange={(e) =>
                      setStage1Seconds(
                        clampInt(
                          e.target.value,
                          10,
                          300,
                          DEFAULTS.stage1Seconds,
                        ),
                      )
                    }
                    className="w-full rounded-xl border border-indigo-500/30 bg-indigo-950/60 pl-4 pr-20 py-3 text-white outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 transition-all shadow-inner"
                  />
                  <span className="absolute right-4 text-sm text-indigo-400/60 pointer-events-none select-none">
                    seconds
                  </span>
                </div>
              </div>

              {/* Stage 2 Timer */}
              <div className="block bg-indigo-950/40 border border-indigo-500/20 p-5 rounded-xl">
                <div className="text-sm font-semibold text-white mb-1">
                  Stage 2 timer
                </div>
                <div className="text-xs text-indigo-300/70 mb-4 h-8 leading-tight">
                  Players choose the correct answer.
                </div>
                <div className="relative flex items-center">
                  <input
                    type="number"
                    value={stage2Seconds}
                    onChange={(e) =>
                      setStage2Seconds(
                        clampInt(
                          e.target.value,
                          10,
                          300,
                          DEFAULTS.stage2Seconds,
                        ),
                      )
                    }
                    className="w-full rounded-xl border border-indigo-500/30 bg-indigo-950/60 pl-4 pr-20 py-3 text-white outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 transition-all shadow-inner"
                  />
                  <span className="absolute right-4 text-sm text-indigo-400/60 pointer-events-none select-none">
                    seconds
                  </span>
                </div>
              </div>
            </div>

            {/* Toggle Row */}
            <label className="mt-6 flex items-start gap-4 p-5 rounded-xl border border-indigo-500/20 bg-indigo-950/40 cursor-pointer hover:bg-indigo-900/40 transition-colors">
              <input
                type="checkbox"
                checked={enableWorstFake}
                onChange={(e) => setEnableWorstFake(e.target.checked)}
                className="mt-1 h-5 w-5 rounded border-indigo-500/50 bg-indigo-950/60 text-purple-600 focus:ring-purple-500/50"
              />
              <div>
                <div className="text-sm font-bold text-white mb-1">
                  “Worst Fake” voting
                </div>
                <div className="text-xs text-indigo-300/80 leading-relaxed">
                  Award -1 points for the worst submission.
                </div>
              </div>
            </label>

            {/* Create Session Footer */}
            <div className="mt-10 pt-8 border-t border-indigo-500/20 flex flex-col items-center gap-6">
              <div className="text-xs text-indigo-300 uppercase tracking-widest font-bold text-center">
                Create a live session and share the code with players.
              </div>

              <button
                disabled={!canCreateSession || busyCreating}
                className="w-full sm:w-auto min-w-[240px] rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 px-10 py-4 text-lg font-bold text-white shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] hover:scale-[1.02] disabled:hover:scale-100 disabled:opacity-50 transition-all active:scale-95"
                onClick={onCreateSession}
              >
                {busyCreating ? "Creating Session..." : "Create Session"}
              </button>
            </div>

            {creationError && (
              <div className="mt-6 rounded-lg border border-pink-500/40 bg-pink-950/40 p-4 text-sm text-pink-200 text-center shadow-lg">
                {creationError}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
