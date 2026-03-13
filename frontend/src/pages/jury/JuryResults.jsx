import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Courtroom from "../../assets/courtroom.png";

function buildLeaderboard(votes) {
  const counts = new Map();

  votes.forEach((vote) => {
    const key = String(vote?.selectedAnswerId || "").trim();
    if (!key) return;

    const current = counts.get(key) || {
      selectedAnswerId: key,
      selectedAnswer: vote.selectedAnswer || "(unknown answer)",
      selectedPlayer: vote.selectedPlayer || "(unknown player)",
      votes: 0,
    };

    current.votes += 1;
    counts.set(key, current);
  });

  return [...counts.values()].sort((a, b) => b.votes - a.votes);
}

export default function JuryResults({ roomCode, onBack, onOpenVote }) {
  const storageKeyVotes = useMemo(
    () => `jury_votes_${String(roomCode || "GLOBAL").toUpperCase()}`,
    [roomCode]
  );
  const [votes, setVotes] = useState([]);

  useEffect(() => {
    const raw = window.localStorage.getItem(storageKeyVotes) || "[]";
    try {
      const parsed = JSON.parse(raw);
      setVotes(Array.isArray(parsed) ? parsed : []);
    } catch {
      setVotes([]);
    }
  }, [storageKeyVotes]);

  const leaderboard = useMemo(() => buildLeaderboard(votes), [votes]);
  const totalVotes = votes.length;

  function reloadVotes() {
    const raw = window.localStorage.getItem(storageKeyVotes) || "[]";
    try {
      const parsed = JSON.parse(raw);
      setVotes(Array.isArray(parsed) ? parsed : []);
    } catch {
      setVotes([]);
    }
  }

  function clearVotes() {
    if (window.confirm("Are you sure you want to clear all votes for this room? This cannot be undone.")) {
      window.localStorage.removeItem(storageKeyVotes);
      setVotes([]);
    }
  }

  // New grouping logic for the updated display
  const grouped = useMemo(() => {
    const result = {};
    votes.forEach(vote => {
      const player = vote.selectedPlayer || "(unknown player)";
      const answerId = vote.selectedAnswerId;
      const answerText = vote.selectedAnswer || "(unknown answer)";
      const juror = vote.jurorName || "(unknown juror)";

      if (!result[player]) {
        result[player] = {
          count: 0,
          answerId: answerId, // Assuming one answer per player for simplicity in this grouping
          answerText: answerText,
          jurors: new Set(), // Use a Set to avoid duplicate juror names
        };
      }
      result[player].count += 1;
      result[player].jurors.add(juror);
    });

    // Convert sets to arrays and sort by count descending
    const sortedPlayers = Object.entries(result)
      .map(([player, data]) => ({
        player,
        count: data.count,
        answerId: data.answerId,
        answerText: data.answerText,
        jurors: Array.from(data.jurors).sort(), // Sort juror names alphabetically
      }))
      .sort((a, b) => b.count - a.count); // Sort players by vote count

    // Convert back to an object for easy mapping in JSX
    return sortedPlayers.reduce((acc, curr) => {
      acc[curr.player] = curr;
      return acc;
    }, {});
  }, [votes]);


  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050114] text-white flex flex-col">
      {/* Dynamic Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-950 via-[#0a0523] to-[#050114]"></div>

      {/* Decorative Glows */}
      <div className="pointer-events-none absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-pink-600/10 blur-[120px]"></div>
      <div className="pointer-events-none absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-600/10 blur-[120px]"></div>

      <header className="jury-fade-up relative z-40 border-b border-indigo-500/20 bg-[#0a0523]/80 backdrop-blur-md shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-indigo-400/80 mb-0.5">Jury View</div>
            <div className="font-bold text-white text-lg tracking-wide bg-gradient-to-r from-pink-200 to-rose-200 bg-clip-text text-transparent">Jury Results</div>
          </div>

          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={onBack}
              className="text-sm font-semibold text-indigo-300 hover:text-white transition-colors underline underline-offset-4"
            >
              Back to Jury Home
            </button>
            <Link
              className="text-sm font-semibold text-indigo-300 hover:text-white transition-colors underline underline-offset-4"
              to="/host"
            >
              Host Home
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-5xl px-4 py-8 space-y-8 flex-grow">
        <section className="jury-fade-up rounded-2xl border border-indigo-500/30 bg-indigo-950/20 p-8 shadow-[0_0_30px_rgba(139,92,246,0.1)] backdrop-blur-md relative overflow-hidden group">
          <div className="absolute inset-0 bg-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>

          <h1 className="text-3xl font-black text-white tracking-wide mb-2 flex items-center gap-3 relative z-10">
            <span className="text-pink-400 text-4xl">★</span> Jury Voting Results
          </h1>
          <p className="mt-2 text-sm font-medium text-indigo-200/80 relative z-10">
            Review the final tallies to see which fake answers fooled the most jurors.
          </p>

          <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
            <div className="text-sm font-medium text-indigo-300">
              Active room: <span className="font-bold text-emerald-400 tracking-wider ml-1">{roomCode || "(none)"}</span>
            </div>

            <button
              onClick={clearVotes}
              className="rounded-xl border border-rose-500/30 bg-rose-950/40 px-5 py-2 text-sm font-bold text-rose-300 transition-all hover:bg-rose-900/60 hover:text-white hover:border-rose-400/50 shadow-inner flex items-center justify-center gap-2"
            >
              Clear Votes Data
            </button>
          </div>
        </section>

        <section
          className="jury-fade-up rounded-2xl border border-indigo-500/20 bg-indigo-950/30 p-8 backdrop-blur-md shadow-inner"
          style={{ animationDelay: "120ms" }}
        >
          <div className="mb-8 border-b border-indigo-500/20 pb-4">
            <h2 className="text-xl font-bold text-white tracking-wide">Final Tallies</h2>
            <p className="mt-2 text-sm font-medium text-indigo-300">Results from all participating jurors</p>
          </div>

          {!votes.length ? (
            <div className="rounded-xl border border-indigo-500/30 bg-[#0a0523]/60 px-6 py-8 text-center shadow-inner">
              <div className="text-indigo-400 text-4xl mb-3">⚖</div>
              <p className="text-sm font-bold text-indigo-300 tracking-wide uppercase">No votes recorded yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {Object.entries(grouped).map(([player, data], index) => {
                const fraction = totalVotes ? Math.max(10, Math.round((data.count / totalVotes) * 100)) : 0;

                return (
                  <article
                    key={player}
                    className="overflow-hidden rounded-2xl border border-indigo-500/30 bg-[#0a0523]/80 p-6 flex flex-col justify-between transition-all duration-300 hover:border-pink-500/50 hover:shadow-[0_0_20px_rgba(236,72,153,0.15)] group"
                    style={{ animationDelay: `${200 + index * 60}ms` }}
                  >
                    <div>
                      <div className="flex items-center justify-between border-b border-indigo-500/20 pb-3 mb-4">
                        <div className="text-sm font-black uppercase tracking-[0.2em] text-pink-400 drop-shadow-sm group-hover:text-pink-300 transition-colors">
                          {player}
                        </div>
                        <div className="text-lg font-black text-white bg-indigo-900/60 px-4 py-1 rounded-full border border-indigo-500/30 shadow-inner">
                          {data.count} <span className="text-xs font-bold text-indigo-300 uppercase ml-1">Votes</span>
                        </div>
                      </div>

                      <div className="mb-6 rounded-xl bg-indigo-950/40 p-4 border border-indigo-500/10 shadow-inner">
                        <div className="text-[10px] font-black uppercase tracking-wider text-indigo-400/60 mb-2">Submitted Answer</div>
                        <div className="text-sm font-bold text-white italic pl-3 border-l-2 border-pink-500/50 leading-relaxed">
                          "{data.answerText}"
                        </div>
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="text-[10px] font-black uppercase tracking-wider text-indigo-400/60 mb-2 flex justify-between">
                        <span>Voting Jurors</span>
                        <span>{fraction}%</span>
                      </div>

                      {/* Custom progress bar instead of grouped lines */}
                      <div className="h-3 w-full rounded-full bg-indigo-950 border border-indigo-500/20 overflow-hidden shadow-inner mb-3">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-pink-600 to-rose-400 relative overflow-hidden"
                          style={{ width: `${fraction}%` }}
                        >
                          <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.15)_50%,rgba(255,255,255,0.15)_75%,transparent_75%,transparent)] bg-[length:1rem_1rem] animate-[progress_1s_linear_infinite]"></div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {data.jurors.map((j) => (
                          <div
                            key={j}
                            className="rounded-lg bg-[#0a0523] border border-indigo-500/40 px-3 py-1.5 text-xs font-bold text-indigo-200 shadow-sm whitespace-nowrap"
                          >
                            {j}
                          </div>
                        ))}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          <div className="mt-12 flex flex-col sm:flex-row gap-4 border-t border-indigo-500/20 pt-8">
            <button
              onClick={onOpenVote}
              className="sm:w-1/3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 px-6 py-4 text-base font-bold text-white shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] hover:scale-[1.02] active:scale-95 transition-all outline outline-2 outline-offset-2 outline-emerald-500/50 flex items-center justify-center gap-2"
            >
              Return to Voting
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}