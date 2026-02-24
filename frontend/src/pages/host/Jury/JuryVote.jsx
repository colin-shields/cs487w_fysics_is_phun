import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Courtroom from "../../../assets/courtroom.png";

function parseSeedLine(line, index) {
  const clean = String(line || "").trim();
  if (!clean) return null;

  const splitByDoubleColon = clean.split("::");
  if (splitByDoubleColon.length >= 2) {
    return {
      id: `${Date.now()}-${index}`,
      player: splitByDoubleColon[0].trim() || `Player ${index + 1}`,
      text: splitByDoubleColon.slice(1).join("::").trim(),
    };
  }

  return {
    id: `${Date.now()}-${index}`,
    player: `Player ${index + 1}`,
    text: clean,
  };
}

function jurorKey(name) {
  return String(name || "").trim().toLowerCase();
}

export default function JuryVote({ roomCode, seedAnswers = [], onBack, onOpenResults }) {
  const storageKeyAnswers = useMemo(
    () => `jury_answers_${String(roomCode || "GLOBAL").toUpperCase()}`,
    [roomCode]
  );
  const storageKeyVotes = useMemo(
    () => `jury_votes_${String(roomCode || "GLOBAL").toUpperCase()}`,
    [roomCode]
  );

  const [answers, setAnswers] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [jurorName, setJurorName] = useState("");
  const [submitStatus, setSubmitStatus] = useState("");
  const [hasSubmitted, setHasSubmitted] = useState(false);

  useEffect(() => {
    const storedRaw = window.localStorage.getItem(storageKeyAnswers);
    if (storedRaw) {
      try {
        const parsed = JSON.parse(storedRaw);
        if (Array.isArray(parsed) && parsed.length) {
          setAnswers(parsed);
          return;
        }
      } catch {
        // If local storage is invalid, fallback to seed answers.
      }
    }

    const parsedSeed = seedAnswers
      .map((line, index) => parseSeedLine(line, index))
      .filter(Boolean);

    if (parsedSeed.length) {
      setAnswers(parsedSeed);
      window.localStorage.setItem(storageKeyAnswers, JSON.stringify(parsedSeed));
      return;
    }

    setAnswers([]);
  }, [seedAnswers, storageKeyAnswers]);

  useEffect(() => {
    const key = jurorKey(jurorName);
    if (!key) {
      setHasSubmitted(false);
      return;
    }

    const previous = JSON.parse(window.localStorage.getItem(storageKeyVotes) || "[]");
    const alreadySubmitted = Array.isArray(previous)
      ? previous.some((vote) => jurorKey(vote?.juror) === key)
      : false;
    setHasSubmitted(alreadySubmitted);
  }, [jurorName, storageKeyVotes]);

  function submitFinalVote() {
    const key = jurorKey(jurorName);
    if (!key) {
      setSubmitStatus("Enter your juror name to submit your final vote.");
      return;
    }

    if (!selectedId) {
      setSubmitStatus("Select one answer before final submission.");
      return;
    }

    const previous = JSON.parse(window.localStorage.getItem(storageKeyVotes) || "[]");
    const alreadySubmitted = Array.isArray(previous)
      ? previous.some((vote) => jurorKey(vote?.juror) === key)
      : false;
    if (alreadySubmitted) {
      setHasSubmitted(true);
      setSubmitStatus("This juror has already submitted a final vote.");
      return;
    }

    const picked = answers.find((answer) => answer.id === selectedId);
    if (!picked) {
      setSubmitStatus("The selected answer is no longer available.");
      return;
    }

    const voteEntry = {
      votedAt: new Date().toISOString(),
      roomCode: String(roomCode || "").toUpperCase(),
      juror: String(jurorName || "").trim(),
      selectedAnswerId: picked.id,
      selectedAnswer: picked.text,
      selectedPlayer: picked.player,
    };

    const next = Array.isArray(previous) ? [...previous, voteEntry] : [voteEntry];
    window.localStorage.setItem(storageKeyVotes, JSON.stringify(next));
    setHasSubmitted(true);
    setSubmitStatus(`Vote submitted: Best Fake -> ${picked.player}`);
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
            <div className="font-semibold">Jury Voting</div>
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
          <h1 className="text-2xl font-semibold">Select Best Fake</h1>
          <p className="mt-2 text-sm text-slate-200">
            Jurors review player-submitted answers and choose the best fake response.
          </p>

          <div className="mt-3 text-xs text-slate-300">
            Active room: <span className="font-semibold text-amber-200">{roomCode || "(none)"}</span>
          </div>

          <label className="mt-4 block">
            <div className="text-sm text-slate-300">Juror name (optional)</div>
            <input
              type="text"
              value={jurorName}
              onChange={(event) => setJurorName(event.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-600 bg-slate-950/65 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-400 sm:max-w-sm"
              placeholder="Juror 1"
            />
          </label>
          <div className="mt-2 text-xs text-slate-300">
            Select any circle to change your choice. Submit once when your final choice is set.
          </div>
        </section>

        <section
          className="jury-fade-up rounded-2xl border border-slate-700/70 bg-slate-900/40 p-5 backdrop-blur-sm"
          style={{ animationDelay: "120ms" }}
        >
          <h2 className="text-lg font-semibold">Player Answers</h2>
          <p className="mt-1 text-sm text-slate-300">Tap one circle to submit your Best Fake vote.</p>

          {!answers.length ? (
            <div className="mt-4 rounded-lg border border-amber-300/40 bg-amber-200/10 px-4 py-3 text-sm text-amber-100">
              No answers available yet. Pass `answers` via query param or load them into local storage.
            </div>
          ) : (
            <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
              {answers.map((answer, index) => {
                const selected = selectedId === answer.id;
                return (
                  <button
                    key={answer.id}
                    type="button"
                    onClick={() => setSelectedId(answer.id)}
                    style={{ animationDelay: `${150 + index * 70}ms` }}
                    className={`jury-fade-up aspect-square rounded-full border p-4 text-center transition duration-300 hover:-translate-y-1 ${
                      selected
                        ? "border-emerald-300/70 bg-emerald-200/15 shadow-[0_16px_36px_-14px_rgba(16,185,129,0.95)]"
                        : "border-slate-700/80 bg-slate-900/60 hover:border-amber-300/70"
                    }`}
                  >
                    <div className="flex h-full flex-col items-center justify-center">
                      <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400">{answer.player}</div>
                      <div className="mt-2 line-clamp-5 text-sm leading-snug text-slate-100">{answer.text}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          <div className="mt-4">
            <button
              type="button"
              onClick={submitFinalVote}
              disabled={!selectedId || !jurorKey(jurorName) || hasSubmitted}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition duration-300 hover:-translate-y-0.5 hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Submit Final Vote
            </button>
          </div>

          {submitStatus ? (
            <div className="mt-3 rounded-lg border border-slate-600/80 bg-slate-950/60 px-3 py-2 text-sm text-slate-200">
              {submitStatus}
            </div>
          ) : null}

          <div className="mt-4">
            <button
              type="button"
              onClick={onOpenResults}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition duration-300 hover:-translate-y-0.5 hover:bg-indigo-500"
            >
              View Jury Results
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
