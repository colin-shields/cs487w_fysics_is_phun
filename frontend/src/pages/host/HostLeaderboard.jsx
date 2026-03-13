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


export default function HostLeaderboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const { roomCode } = location.state || {};
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState({});
  const [choices, setChoices] = useState({});
  const [scores, setScores] = useState({});
  const [roundBreakdown, setRoundBreakdown] = useState({});
  const { activeDeck } = useDeck();
  


  function buildSessionResults(submissions, choices, scores, roundBreakdown) {
    // submissions = {
    //   [qIdx]: {
    //     [entryIdx]: { player: "Alice", text: "fake answer" },
    //     ...
    //   }
    // }
    //
    // choices = {
    //   [qIdx]: {
    //     [entryIdx]: { player: "Alice", text: "selected answer" },
    //     ...
    //   }
    // }

    const questionIds = [...new Set([
      ...Object.keys(submissions || {}),
      ...Object.keys(choices || {})
    ])].sort((a, b) => Number(a) - Number(b)); 

    const players = new Set();

    for (const qid of questionIds) {
      for (const entry of Object.values(submissions[qid] || {})) {
        if (entry?.player) players.add(entry.player);
      }
      for (const entry of Object.values(choices[qid] || {})) {
        if (entry?.player) players.add(entry.player);
      }
    }


    const headers = ["Player Name"];
    for (const qid of Object.values(activeDeck.questions)) {
      headers.push(`Q: ${qid.Question_Text}\nCorrect Answer: ${qid.Correct_Answer}`);
    }
    headers.push("Final Score");   

    const rows = [];

    for (const playerName of players) {
      const row = [playerName];

      for (let qid = 0; qid < headers.length -2; qid+=1) {
        let submissionText = "";
        let choiceText = "";

        for (const entry of Object.values(submissions[qid] || {})) {
          if (entry?.player === playerName) {
            submissionText = entry.text ?? "";
            break;
          }
        }

        for (const entry of Object.values(choices[qid] || {})) {
          if (entry?.player === playerName) {
            choiceText = entry.text ?? "";
            break;
          }
        }

        const bd = roundBreakdown?.[qid]?.[playerName];
        const bdText = bd
          ? `Correct:${bd.correct_pts ?? 0} Fooled:${bd.fool_pts ?? 0} JuryBest:${bd.jury_best_pts ?? 0} JuryWorst:-${bd.jury_worst_pts ?? 0} RoundTotal:${bd.round_total ?? 0}`
          : "";
        const cellValue = `Submission: ${submissionText}\nChoice: ${choiceText}${bdText ? `\n${bdText}` : ""}`;
        row.push(cellValue);
      }

      let scoreText = scores[playerName] ?? ""
      row.push(`Points: ${scoreText}`)

      rows.push(row);
    }

    return { headers, rows };
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
      ...rows.map((row) => row.map(escapeCSV).join(","))
    ];

    return lines.join("\n");
  }

  function handleExportResults() {
    const { headers, rows } = buildSessionResults(submissions, choices, scores, roundBreakdown);

    if (!rows.length) {
      console.warn("No session results available to export.");
      return;
    }

    const csv = toCSV(headers, rows);
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

  // Confetti effect
  useEffect(() => {
    if (!loading && players.length > 0) {
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

      const interval = setInterval(() => {
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

      return () => clearInterval(interval);
    }
  }, [loading, players.length]);

  function onReturnHome() {
    navigate("/host");
  }

  return (
    <div className="min-h-screen bg-[#050114] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-950 via-[#0a0523] to-[#050114] flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-indigo-500/20 bg-[#0a0523]/80 backdrop-blur-md shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-indigo-400/80 mb-0.5">Game Complete</div>
            <div className="font-bold text-white text-lg tracking-wide bg-gradient-to-r from-indigo-200 to-purple-200 bg-clip-text text-transparent">Final Results</div>
          </div>
          <div className="text-sm font-medium text-indigo-200">
            Room:{" "}
            <span className="font-bold text-emerald-400 ml-1 tracking-wider">{roomCode}</span>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto w-full max-w-4xl px-4 py-8 flex-grow">
        <div className="rounded-2xl border border-indigo-500/30 bg-indigo-950/20 backdrop-blur-md shadow-[0_0_40px_rgba(139,92,246,0.1)] p-8 md:p-12 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-indigo-500/5 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>

          <h1 className="text-4xl md:text-5xl font-black text-center mb-10 text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.3)] tracking-tight">
            Game Finished!
          </h1>

          {players.length > 0 ? (
            <div className="mb-12 text-center relative">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-emerald-500/20 rounded-full blur-2xl"></div>
              <div className="inline-block relative z-10">
                <div className="text-xs font-black uppercase tracking-[0.3em] text-emerald-400 mb-2 drop-shadow-md">
                  ★ Champion ★
                </div>
                <div className="text-2xl md:text-3xl font-bold text-white px-8 py-4 rounded-2xl border border-emerald-500/40 bg-emerald-950/40 shadow-[0_0_30px_rgba(16,185,129,0.2)] backdrop-blur-sm">
                  {players[0].name || players[0][0] || "Unknown Player"}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-center text-indigo-300 font-medium mb-10 text-lg">
              Thank you for playing!
            </p>
          )}

          {loading ? (
            <div className="text-center text-indigo-300 flex flex-col items-center justify-center py-8">
              <svg className="animate-spin -ml-1 mr-3 h-8 w-8 text-indigo-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
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
                      className="rounded-xl bg-indigo-950/40 border border-indigo-500/20 p-4 flex items-center justify-between transition-all hover:bg-indigo-900/40 shadow-inner group"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`h-12 w-12 rounded-full flex items-center justify-center text-sm font-black shadow-md ${
                            idx === 0
                              ? "bg-gradient-to-br from-emerald-400 to-teal-600 text-white shadow-[0_0_15px_rgba(52,211,153,0.4)] border border-emerald-300"
                              : idx === 1
                              ? "bg-gradient-to-br from-slate-300 to-slate-500 text-slate-900 shadow-[0_0_10px_rgba(203,213,225,0.3)] border border-slate-300"
                              : idx === 2
                              ? "bg-gradient-to-br from-amber-600 to-orange-800 text-amber-100 shadow-[0_0_10px_rgba(217,119,6,0.3)] border border-amber-600"
                              : "bg-[#0a0523]/80 text-indigo-300 border border-indigo-500/40"
                          }`}
                        >
                          #{idx + 1}
                        </div>
                        <div className={`font-bold tracking-wide ${idx === 0 ? "text-xl text-white drop-shadow-sm" : "text-lg text-indigo-100"}`}>
                          {player[0] || player.name || "Unknown Player"}
                        </div>
                      </div>
                      <div className="text-xs font-bold uppercase text-indigo-400/50 group-hover:text-indigo-400 transition-colors">
                        {player[1] !== undefined ? `${player[1]} pts` : ""}
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
          <div className="mt-12 flex justify-center relative z-10 w-full max-w-2xl mx-auto">
            <div className="w-full flex flex-col gap-4">
              <button
                onClick={handleExportResults}
                disabled={loading || players.length === 0}
                className="w-full rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-8 py-4 text-base font-bold text-white shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] hover:scale-[1.02] active:scale-95 transition-all outline outline-2 outline-offset-2 outline-emerald-500/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                Export Results as CSV
              </button>

              <button
                onClick={onReturnHome}
                className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-4 text-base font-bold text-white shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:shadow-[0_0_30px_rgba(139,92,246,0.5)] hover:scale-[1.02] active:scale-95 transition-all outline outline-2 outline-offset-2 outline-indigo-500/50"
              >
                Return to Dashboard
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}