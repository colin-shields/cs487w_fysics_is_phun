/**
 * HostLeaderboard.jsx
 * Leaderboard view shown after host finishes all questions
 *
 * Purpose:
 * - Display all players in the session
 * - Show game completion status
 * - Option to return to deck selection
 */

import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { buildUrl } from "../../api/httpClient";
import confetti from "canvas-confetti";
import { useDeck } from "../../state/DeckContext.jsx";
import ResultViewer from "./ResultViewer";
import { pickRandomPlayerAvatarUrl } from "../../utils/playerAvatars";

export default function HostLeaderboard() {
  const FIRST_PLACE_REVEAL_DURATION_MS = 2800;
  const CONFETTI_AFTER_REVEAL_BUFFER_MS = 200;

  const location = useLocation();
  const navigate = useNavigate();
  const { roomCode } = location.state || {};
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState({});
  const [choices, setChoices] = useState({});
  const [scores, setScores] = useState({});
  const [playerAvatars, setPlayerAvatars] = useState({});
  const [fallbackAvatars, setFallbackAvatars] = useState({});
  const [revealedPlacements, setRevealedPlacements] = useState({});
  const [showPrettyResults, setShowPrettyResults] = useState(false);
  const [roundBreakdown, setRoundBreakdown] = useState({});
  const { activeDeck } = useDeck();
  const podiumAnimatedRef = React.useRef(false);
  const confettiPlayedRef = React.useRef(false);

  function getPlacementTheme(index) {
    if (index === 0) {
      return {
        row: "border-yellow-400/50 bg-yellow-950/20 shadow-[0_0_18px_rgba(250,204,21,0.2)]",
        avatar: "from-yellow-300 to-yellow-500",
        watermark: "text-yellow-300/15",
      };
    }
    if (index === 1) {
      return {
        row: "border-slate-300/50 bg-slate-400/10 shadow-[0_0_14px_rgba(203,213,225,0.2)]",
        avatar: "from-slate-200 to-slate-400",
        watermark: "text-slate-200/15",
      };
    }
    if (index === 2) {
      return {
        row: "border-[#cd7f32]/60 bg-[#cd7f32]/10 shadow-[0_0_14px_rgba(205,127,50,0.25)]",
        avatar: "from-[#e2a76f] to-[#cd7f32]",
        watermark: "text-[#e2a76f]/20",
      };
    }
    return {
      row: "border-indigo-500/20 bg-indigo-950/40",
      avatar: "from-indigo-500 to-purple-600",
      watermark: "text-indigo-300/10",
    };
  }

  function getRevealDurationClass(index) {
    if (index === 0) return "duration-[2800ms]";
    if (index === 1 || index === 2) return "duration-[1500ms]";
    return "duration-700";
  }

  function getRevealStateClass(index, isRevealed) {
    if (!isRevealed) {
      if (index === 0) return "opacity-0 translate-y-14 scale-[0.72] blur-2xl rotate-[-3deg]";
      if (index === 1 || index === 2) return "opacity-0 translate-y-3 scale-[0.98] blur-sm";
      return "opacity-100";
    }

    if (index === 0) {
      return "opacity-100 translate-y-0 scale-100 blur-0 rotate-0 ring-2 ring-yellow-300/60 shadow-[0_0_70px_rgba(250,204,21,0.45)]";
    }
    return "opacity-100 translate-y-0 scale-100 blur-0";
  }

  function resolveAvatarUrl(imagePath) {
    if (!imagePath) return "";
    const normalized = String(imagePath).trim();
    if (
      normalized.startsWith("http://") ||
      normalized.startsWith("https://") ||
      normalized.startsWith("data:") ||
      normalized.startsWith("blob:")
    ) {
      return normalized;
    }
    if (normalized.startsWith("/")) {
      return normalized;
    }
    return buildUrl(`/assets/${normalized.replace(/^assets\//, "")}`);
  }

  function displayName(raw) {
    return raw === "Predefined Fake" ? "Host" : raw;
  }

  function formatScore(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return "0";
    return String(Math.round(n * 100) / 100);
  }

  function buildSessionResults(submissions, choices, scores, roundBreakdown) {
    const players = new Set();

    // 1. Safely collect all unique player names
    if (submissions) {
      Object.values(submissions).forEach((q) => {
        Object.values(q).forEach((entry) => {
          if (entry?.player) players.add(entry.player);
        });
      });
    }
    if (choices) {
      Object.values(choices).forEach((q) => {
        Object.values(q).forEach((entry) => {
          if (entry?.player) players.add(entry.player);
        });
      });
    }

    const playerList = Array.from(players).map((p) =>
      Array.isArray(p) ? p[0] : p,
    );
    const questionList = Object.values(activeDeck.questions);    

    // 2. CREATE DYNAMIC HEADERS
    // Row 1: The Question Text
    // Row 2: The Column Labels
    const headerRow1 = ["Player Info"];
    const headerRow2 = ["Player Name"];

    questionList.forEach((q, index) => {
      // We add 4 columns per question, so we pad headerRow1 with 3 empty strings
      headerRow1.push(
        `Q${index + 1}: ${q.Question_Text} (Correct: ${q.Correct_Answer})`,
        "",
        "",
        "",
      );
      headerRow2.push("Submitted", "Chose", "Fooled Whom?", "Points");
    });

    headerRow1.push("Game Totals");
    headerRow2.push("Final Score");

    const rows = [headerRow1, headerRow2];

    // Object to track totals for the Summary Row
    const questionTotals = {};

    // 3. FILL PLAYER DATA
    for (const playerName of Object.values(playerList)) {
      const row = [displayName(playerName)];

      questionList.forEach((question) => {
        const qid = question.Question_ID -1 ; // Adjusting for 0-based index in submissions and choices


        let mySubmission = "";
        let myChoice = "";
        let fooledPlayers = [];

        // Find player's submission
        const qSub = submissions[qid] || {};
        Object.values(qSub).forEach((entry) => {
          if (entry.player === playerName){ 
            mySubmission = entry.text || ""

          }
        });

        // Find player's choice
        const qCho = choices[qid] || {};
        Object.values(qCho).forEach((entry) => {
          if (entry.player === playerName) myChoice = entry.text || "";
        });

        // Who did this player fool? (Check everyone else's choices)
        Object.values(qCho).forEach((entry) => {
          if (entry.text === mySubmission && entry.player !== playerName) {
            fooledPlayers.push(entry.player);
          }
        });

        // Points Breakdown
        const bd = roundBreakdown?.[qid]?.[playerName];
        const pts = bd ? bd.round_total || 0 : 0;

        // Track points for the summary row
        questionTotals[qid] = (questionTotals[qid] || 0) + pts;

        row.push(mySubmission);
        row.push(myChoice);
        row.push(fooledPlayers.join(", ") || "Nobody");
        row.push(pts);
      });

      // Final Score Column
      row.push(scores[playerName] || 0);
      rows.push(row);
    }

    // 4. CREATE SUMMARY ROW (The Footer)
    const summaryRow = ["TOTAL POINTS AWARDED"];
    questionList.forEach((question) => {
      const qid = question.Question_ID - 1; // 0-based index, same as detail rows
      // We leave Submission, Choice, and Fooled empty for the summary, just show Total Points
      summaryRow.push("", "", "Q Total:", questionTotals[qid] || 0);
    });

    // Calculate total of all scores
    const totalGamePoints = Object.values(scores).reduce((a, b) => a + b, 0);
    summaryRow.push(totalGamePoints);

    rows.push(summaryRow);

    return { headers: [], rows };
  }

  function toCSV(headers, rows) {
    const escapeCSV = (value) => {
      const str = String(value ?? "");
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const lines = [
      headers.map(escapeCSV).join(","),
      ...rows.map((row) => row.map(escapeCSV).join(",")),
    ];

    return lines.join("\n");
  }

  function handleExportResults() {
    const { rows } = buildSessionResults(
      submissions,
      choices,
      scores,
      roundBreakdown,
    );

    if (!rows.length) return;

    // Pass an empty array for headers since rows[0] and rows[1] are the headers
    const csv = toCSV([], rows);

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `session-results-${roomCode || "room"}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  useEffect(() => {
    if (!roomCode) {
      navigate("/host");
      return;
    }

    async function fetchPlayers() {
      try {
        const res = await fetch(buildUrl(`/session-status/${roomCode}`));
        if (res.ok) {
          const data = await res.json();
          const scoreboard = data.scoreboard || [];
          const sortedPlayers = scoreboard.sort((a, b) => b[1] - a[1]);

          setPlayers(sortedPlayers);
          setPlayerAvatars(data.player_avatars || {});
          setChoices(data.choices || {});
          setSubmissions(data.submissions || {});
          setScores(data.scores || {});
          setRoundBreakdown(data.round_breakdown || {});
        }
      } catch (err) {
        console.error("Failed to fetch session status", err);
      } finally {
        setLoading(false);
      }
    }

    fetchPlayers();
    const interval = setInterval(fetchPlayers, 2000);
    return () => clearInterval(interval);
  }, [roomCode, navigate]);

  useEffect(() => {
    setRevealedPlacements({});
    podiumAnimatedRef.current = false;
    confettiPlayedRef.current = false;
  }, [roomCode]);

  // Confetti effect
  useEffect(() => {
    setFallbackAvatars((prev) => {
      const next = { ...prev };
      let changed = false;

      for (const player of players) {
        const playerName = player[0] || player.name;
        if (playerName && !next[playerName]) {
          next[playerName] = pickRandomPlayerAvatarUrl();
          changed = true;
        }
      }

      return changed ? next : prev;
    });
  }, [players]);

  useEffect(() => {
    if (loading || players.length === 0 || podiumAnimatedRef.current) return;

    const revealOrder = [2, 1, 0].filter((i) => i < players.length);
    const revealStartDelayMs = 600;
    const revealStepDelayMs = 1200;
    const timers = [];

    revealOrder.forEach((placementIndex, orderIndex) => {
      const revealAt = revealStartDelayMs + orderIndex * revealStepDelayMs;

      timers.push(
        setTimeout(() => {
          setRevealedPlacements((prev) => ({ ...prev, [placementIndex]: true }));
        }, revealAt),
      );
    });

    podiumAnimatedRef.current = true;

    return () => timers.forEach((t) => clearTimeout(t));
  }, [loading, players.length, roomCode]);

  useEffect(() => {
    if (
      loading ||
      players.length === 0 ||
      !revealedPlacements[0] ||
      confettiPlayedRef.current
    ) {
      return;
    }

    confettiPlayedRef.current = true;

    let interval;
    const confettiTimeout = setTimeout(() => {
      const count = 200;
      const defaults = {
        origin: { y: 0.7 },
        spread: 90,
        ticks: 200,
        gravity: 0.8,
        startVelocity: 45,
        scalar: 1.2,
      };

      confetti({
        ...defaults,
        particleCount: count / 2,
        angle: 60,
        origin: { x: 0, y: 0.6 },
      });

      confetti({
        ...defaults,
        particleCount: count / 2,
        angle: 120,
        origin: { x: 1, y: 0.6 },
      });

      const duration = 15 * 1000;
      const animationEnd = Date.now() + duration;

      interval = setInterval(() => {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        confetti({
          particleCount: 2,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.8 },
          startVelocity: 35,
          gravity: 0.7,
          colors: ["#10b981", "#6366f1"],
        });

        confetti({
          particleCount: 2,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.8 },
          startVelocity: 35,
          gravity: 0.7,
          colors: ["#10b981", "#6366f1"],
        });
      }, 300);
    }, FIRST_PLACE_REVEAL_DURATION_MS + CONFETTI_AFTER_REVEAL_BUFFER_MS);

    return () => {
      clearTimeout(confettiTimeout);
      if (interval) clearInterval(interval);
    };
  }, [loading, players.length, revealedPlacements]);

  function onReturnHome() {
    navigate("/host");
  }

  return (
    <div className="min-h-screen bg-[#050114] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-950 via-[#0a0523] to-[#050114] flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-indigo-500/20 bg-[#0a0523]/80 backdrop-blur-md shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-indigo-400/80 mb-0.5">
              Game Complete
            </div>
            <div className="font-bold text-white text-lg tracking-wide bg-gradient-to-r from-indigo-200 to-purple-200 bg-clip-text text-transparent">
              Final Results
            </div>
          </div>
          <div className="text-sm font-medium text-indigo-200">
            Room:{" "}
            <span className="font-bold text-emerald-400 ml-1 tracking-wider">
              {roomCode}
            </span>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto w-full max-w-4xl px-4 py-5 flex-grow">
        <div className="rounded-2xl border border-indigo-500/30 bg-indigo-950/20 backdrop-blur-md shadow-[0_0_40px_rgba(139,92,246,0.1)] p-8 md:p-12 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-indigo-500/5 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>

          <h1 className="text-4xl md:text-5xl font-black text-center mb-10 text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.3)] tracking-tight">
            Game Finished!
          </h1>

          {loading ? (
            <div className="text-center text-indigo-300 flex flex-col items-center justify-center py-8">
              <svg
                className="animate-spin -ml-1 mr-3 h-8 w-8 text-indigo-500 mb-4"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Loading final results...
            </div>
          ) : (
            <div className="space-y-4 max-w-2xl mx-auto relative z-10">
              <div className="flex items-center justify-between border-b border-indigo-500/20 pb-3 mb-4">
                <div className="text-sm font-bold uppercase tracking-widest text-indigo-400">
                  Leaderboard
                </div>
                <div className="text-xs font-bold bg-[#0a0523]/60 border border-indigo-500/30 px-3 py-1 rounded-full text-indigo-300">
                  {players.length} Players
                </div>
              </div>

              {players.length > 0 ? (
                <div className="space-y-3">
                  {players.map((player, idx) => (
                    <div
                      key={idx}
                      className={`relative overflow-hidden rounded-xl border p-4 flex items-center justify-between transition-all ${getRevealDurationClass(idx)} shadow-inner group ${getPlacementTheme(idx).row} ${idx < 3 ? getRevealStateClass(idx, !!revealedPlacements[idx]) : "opacity-100"}`}
                    >
                      {idx === 0 && revealedPlacements[idx] && (
                        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(250,204,21,0.22),transparent_62%)]" />
                      )}
                      {idx < 3 && (
                        <div className={`pointer-events-none absolute inset-0 flex items-center justify-center text-7xl font-black tracking-tight ${getPlacementTheme(idx).watermark}`}>
                          {idx + 1}
                        </div>
                      )}
                      <div className="flex items-center gap-4">
                        <div className={`h-12 w-12 rounded-full bg-gradient-to-br ${getPlacementTheme(idx).avatar} p-[2px] shadow-md`}>
                          <img
                            src={
                              resolveAvatarUrl(
                                playerAvatars[player[0] || player.name],
                              ) || resolveAvatarUrl(fallbackAvatars[player[0] || player.name])
                            }
                            alt={`${displayName(player[0] || player.name || "Unknown Player")} avatar`}
                            className="h-full w-full rounded-full object-cover bg-[#0a0523]"
                          />
                        </div>
                        <div
                          className={`font-bold tracking-wide ${idx === 0 ? "text-xl text-white drop-shadow-sm" : "text-lg text-indigo-100"}`}
                        >
                          {displayName(player[0] || player.name || "Unknown Player")}
                        </div>
                      </div>
                      <div className="text-xs font-bold uppercase text-indigo-400/50 group-hover:text-indigo-400 transition-colors">
                        {player[1] !== undefined ? `${formatScore(player[1])} pts` : ""}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-indigo-300/60 font-medium py-8 bg-[#0a0523]/30 rounded-xl border border-indigo-500/10 border-dashed">
                  No players joined this session
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="mt-12 flex flex-col items-center relative z-10 w-full">
            <div className="w-full flex flex-col gap-3 items-center">
              {/* View Details Button - Shorter and less wide */}
              <button
                onClick={() => setShowPrettyResults(!showPrettyResults)}
                className="w-full max-w-md rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-[0_0_15px_rgba(37,99,235,0.3)] hover:shadow-[0_0_25px_rgba(37,99,235,0.5)] hover:scale-[1.01] active:scale-95 transition-all outline outline-2 outline-offset-2 outline-blue-500/50"
              >
                {showPrettyResults ? "Hide Game Details" : "View Game Details"}
              </button>

              {/* Download Button - Shorter and less wide */}
              <button
                onClick={handleExportResults}
                disabled={loading || players.length === 0}
                className="w-full max-w-md rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-3 text-sm font-bold text-white shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.5)] hover:scale-[1.01] active:scale-95 transition-all outline outline-2 outline-offset-2 outline-emerald-500/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                Download Game Details (CSV)
              </button>

              {/* Return Home Button - Shorter and less wide */}
              <button
                onClick={onReturnHome}
                className="w-full max-w-md rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-3 text-sm font-bold text-white shadow-[0_0_15px_rgba(139,92,246,0.3)] hover:shadow-[0_0_25px_rgba(139,92,246,0.5)] hover:scale-[1.01] active:scale-95 transition-all outline outline-2 outline-offset-2 outline-indigo-500/50"
              >
                Return to Dashboard
              </button>
            </div>
          </div>
        </div>{" "}
        {/* End of card */}
        {/* Full-width container for the results view */}
        {showPrettyResults && (
          <div className="mt-12 w-full animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="rounded-2xl border border-indigo-500/30 bg-[#0a0523]/60 backdrop-blur-xl p-4 md:p-8 shadow-2xl">
              <ResultViewer
                data={buildSessionResults(
                  submissions,
                  choices,
                  scores,
                  roundBreakdown,
                )}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
