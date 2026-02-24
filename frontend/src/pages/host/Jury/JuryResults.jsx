import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Courtroom from "../../../assets/courtroom.png";

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

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      <img
        src={Courtroom}
        alt="Courtroom"
        className="courtroom-drift pointer-events-none absolute inset-0 h-full w-full object-cover opacity-35 blur-[1.5px] scale-105"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#2f2420] via-[#1f1c25] to-slate-950 opacity-55" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-[radial-gradient(circle_at_50%_12%,rgba(251,191,36,0.22),transparent_60%)]" />

      <header className="jury-fade-up relative z-10 border-b border-slate-700/70 bg-slate-950/60 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div>
            <div className="text-sm text-slate-300">Jury View</div>
            <div className="font-semibold">Jury Results</div>
          </div>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={onBack}
              className="text-sm text-slate-300 underline underline-offset-4 hover:text-white"
            >
              Back to Jury Home
            </button>
            <Link
              className="text-sm text-slate-300 underline underline-offset-4 hover:text-white"
              to="/host"
            >
              Host Home
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-5xl px-4 py-8 space-y-6">
        <section className="jury-fade-up rounded-2xl border border-slate-700/70 bg-slate-900/40 p-5 shadow-[0_20px_60px_-25px_rgba(0,0,0,0.6)] backdrop-blur-sm">
          <h1 className="text-2xl font-semibold">Best Fake Leaderboard</h1>
          <p className="mt-2 text-sm text-slate-200">
            Ranked by jury votes. Highest votes wins Best Fake.
          </p>

          <div className="mt-3 text-xs text-slate-300">
            Active room: <span className="font-semibold text-amber-200">{roomCode || "(none)"}</span>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={reloadVotes}
              className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition duration-300 hover:-translate-y-0.5 hover:bg-amber-500"
            >
              Refresh Results
            </button>
            <button
              type="button"
              onClick={onOpenVote}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition duration-300 hover:-translate-y-0.5 hover:bg-emerald-500"
            >
              Back to Voting
            </button>
          </div>
        </section>

        <section
          className="jury-fade-up rounded-2xl border border-slate-700/70 bg-slate-900/40 p-5 backdrop-blur-sm"
          style={{ animationDelay: "120ms" }}
        >
          <div className="mb-3 text-sm text-slate-300">Total votes cast: {totalVotes}</div>

          {!leaderboard.length ? (
            <div className="rounded-lg border border-amber-300/40 bg-amber-200/10 px-4 py-3 text-sm text-amber-100">
              No votes recorded yet for this room.
            </div>
          ) : (
            <div className="space-y-3">
              {leaderboard.map((entry, index) => {
                const rank = index + 1;
                const share = totalVotes ? Math.round((entry.votes / totalVotes) * 100) : 0;

                return (
                  <article
                    key={entry.selectedAnswerId}
                    style={{ animationDelay: `${160 + index * 70}ms` }}
                    className={`jury-fade-up rounded-xl border p-4 ${
                      rank === 1
                        ? "border-amber-300/70 bg-amber-200/15"
                        : "border-slate-700/80 bg-slate-900/60"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-xs uppercase tracking-[0.2em] text-slate-400">
                          Rank #{rank} • {entry.selectedPlayer}
                        </div>
                        <div className="mt-2 text-sm text-slate-100">{entry.selectedAnswer}</div>
                      </div>
                      <div className="shrink-0 rounded-lg border border-slate-600/80 bg-slate-950/70 px-3 py-2 text-right">
                        <div className="text-lg font-semibold text-white">{entry.votes}</div>
                        <div className="text-xs text-slate-400">{share}%</div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}