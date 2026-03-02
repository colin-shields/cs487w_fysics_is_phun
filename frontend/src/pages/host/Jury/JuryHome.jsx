import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { httpGet } from "../../../api/httpClient";
import Courtroom from "../../../assets/courtroom.png";
import JuryVote from "./JuryVote.jsx";
import JuryResults from "./JuryResults.jsx";

const DEFAULT_JURORS = 1;
const MIN_JURORS = 1;
const MAX_JURORS = 25;
const POLL_MS = 2000;

function normalizeNames(payload, limit) {
  if (!payload || !Array.isArray(payload.players)) return [];

  return payload.players
    .map((name) => String(name || "").trim())
    .filter(Boolean)
    .slice(0, limit);
}

function JurorChair({ seatNumber, name }) {
  const filled = Boolean(name);

  return (
    <article
      style={{ animationDelay: `${120 + seatNumber * 90}ms` }}
      className={`jury-fade-up relative overflow-hidden rounded-2xl border p-5 text-center transition duration-300 hover:-translate-y-1 ${
        filled
          ? "jury-seat-filled border-amber-200/60 bg-amber-100/10"
          : "border-slate-700/80 bg-slate-900/55"
      }`}
    >
      <div
        className={`mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-xl border text-2xl transition-all duration-300 ${
          filled
            ? "border-amber-200/80 bg-amber-200/15 text-amber-100"
            : "border-slate-600 bg-slate-800/60 text-slate-300"
        }`}
      >
        {filled ? "\u2696" : "\u25a1"}
      </div>

      <div className="text-xs uppercase tracking-[0.22em] text-slate-400">Seat {seatNumber}</div>
      <div className="mt-2 min-h-7 text-lg font-semibold text-slate-100">
        {filled ? name : "Waiting for Juror"}
      </div>
    </article>
  );
}

export default function JuryHome() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedView = searchParams.get("view");
  const view = requestedView === "vote" || requestedView === "results" ? requestedView : "lobby";
  const initialRoomCode = (searchParams.get("room") || "").toUpperCase();
  const rawAnswers = searchParams.get("answers") || "";

  const [roomCodeInput, setRoomCodeInput] = useState(initialRoomCode);
  const [activeRoomCode, setActiveRoomCode] = useState(initialRoomCode);
  const [jurorSeatCount, setJurorSeatCount] = useState(DEFAULT_JURORS);
  const [jurors, setJurors] = useState([]);
  const [statusText, setStatusText] = useState("Enter a room code to watch jury seats.");

  const seatCountKey = useMemo(
    () => `jury_seat_count_${String(activeRoomCode || "GLOBAL").toUpperCase()}`,
    [activeRoomCode]
  );

  useEffect(() => {
    const saved = Number.parseInt(window.localStorage.getItem(seatCountKey) || "", 10);
    if (Number.isNaN(saved)) {
      setJurorSeatCount(DEFAULT_JURORS);
      return;
    }
    setJurorSeatCount(Math.max(MIN_JURORS, Math.min(MAX_JURORS, saved)));
  }, [seatCountKey]);

  useEffect(() => {
    window.localStorage.setItem(seatCountKey, String(jurorSeatCount));
  }, [jurorSeatCount, seatCountKey]);

  useEffect(() => {
    if (!activeRoomCode) return;

    let cancelled = false;

    async function loadStatus() {
      const response = await httpGet(`/session-status/${encodeURIComponent(activeRoomCode)}`);

      if (cancelled) return;

      if (!response.ok) {
        setJurors([]);
        setStatusText("Room not found or unavailable.");
        return;
      }

      const nextJurors = normalizeNames(response.data, jurorSeatCount);
      setJurors(nextJurors);
      setStatusText(
        nextJurors.length >= jurorSeatCount
          ? "All jury seats are now filled."
          : `Waiting for ${jurorSeatCount - nextJurors.length} more juror(s).`
      );
    }

    loadStatus();
    const timer = window.setInterval(loadStatus, POLL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [activeRoomCode, jurorSeatCount]);

  const seatNames = useMemo(() => {
    const seats = [...jurors];
    while (seats.length < jurorSeatCount) seats.push("");
    return seats;
  }, [jurors, jurorSeatCount]);

  const seedAnswers = useMemo(
    () =>
      rawAnswers
        .split("|")
        .map((value) => String(value || "").trim())
        .filter(Boolean),
    [rawAnswers]
  );

  function buildSearch(nextView, roomCode) {
    const params = {};
    if (roomCode) params.room = roomCode;
    if (nextView === "vote" || nextView === "results") params.view = nextView;
    if (seedAnswers.length) params.answers = seedAnswers.join("|");
    return params;
  }

  function handleWatchRoom(event) {
    event.preventDefault();
    const cleaned = roomCodeInput.trim().toUpperCase();

    setActiveRoomCode(cleaned);
    setSearchParams(buildSearch(view, cleaned));

    if (!cleaned) {
      setJurors([]);
      setStatusText("Enter a room code to watch jury seats.");
    }
  }

  if (view === "vote") {
    return (
      <JuryVote
        roomCode={activeRoomCode}
        seedAnswers={seedAnswers}
        onBack={() => setSearchParams(buildSearch("lobby", activeRoomCode))}
        onOpenResults={() => setSearchParams(buildSearch("results", activeRoomCode))}
      />
    );
  }

  if (view === "results") {
    return (
      <JuryResults
        roomCode={activeRoomCode}
        onBack={() => setSearchParams(buildSearch("lobby", activeRoomCode))}
        onOpenVote={() => setSearchParams(buildSearch("vote", activeRoomCode))}
      />
    );
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
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-[#2a1f1b] to-transparent" />

      <header className="jury-fade-up relative z-10 border-b border-slate-700/70 bg-slate-950/60 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div>
            <div className="text-sm text-slate-300">Jury View</div>
            <div className="font-semibold">Courtroom Lobby</div>
          </div>

          <Link
            className="text-sm text-slate-300 underline underline-offset-4 hover:text-white"
            to="/host"
          >
            Back to Host Home
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-5xl px-4 py-8">
        <section className="jury-fade-up rounded-2xl border border-slate-700/70 bg-slate-900/40 p-5 shadow-[0_20px_60px_-25px_rgba(0,0,0,0.6)] backdrop-blur-sm">
          <h1 className="text-2xl font-semibold">Jury Home</h1>
          <p className="mt-2 text-sm text-slate-200">
            As the host assigns jurors, these three courtroom chairs fill with player names.
          </p>

          <form className="mt-5 flex flex-col gap-3 sm:flex-row" onSubmit={handleWatchRoom}>
            <input
              type="text"
              value={roomCodeInput}
              onChange={(event) => setRoomCodeInput(event.target.value.toUpperCase())}
              placeholder="Enter Room Code (e.g. AB12)"
              className="w-full rounded-lg border border-slate-600 bg-slate-950/65 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-400 sm:max-w-xs"
            />

            <button
              type="submit"
              className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition duration-300 hover:-translate-y-0.5 hover:bg-amber-500 hover:shadow-[0_8px_22px_-8px_rgba(251,191,36,0.7)]"
            >
              Watch Jury Seats
            </button>

            <button
              type="button"
              onClick={() => setSearchParams(buildSearch("vote", activeRoomCode))}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition duration-300 hover:-translate-y-0.5 hover:bg-emerald-500 hover:shadow-[0_8px_22px_-8px_rgba(16,185,129,0.7)]"
            >
              Open Jury Voting
            </button>

            <button
              type="button"
              onClick={() => setSearchParams(buildSearch("results", activeRoomCode))}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition duration-300 hover:-translate-y-0.5 hover:bg-indigo-500 hover:shadow-[0_8px_22px_-8px_rgba(99,102,241,0.7)]"
            >
              Open Jury Results
            </button>
          </form>

          <div className="mt-3 text-xs text-slate-300">
            Active room: <span className="font-semibold text-amber-200">{activeRoomCode || "(none)"}</span>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <div className="text-sm text-slate-200">Number of Jurors</div>
            <div className="inline-flex items-center rounded-lg border border-slate-600 bg-slate-950/65">
              <div className="w-12 px-2 py-2 text-center text-lg font-semibold text-amber-200">
                {jurorSeatCount}
              </div>
              <div className="flex flex-col border-l border-slate-600">
                <button
                  type="button"
                  onClick={() => setJurorSeatCount((value) => Math.min(MAX_JURORS, value + 1))}
                  className="px-3 py-1 text-xs text-slate-200 transition hover:bg-slate-800/80 hover:text-white"
                  aria-label="Increase jurors"
                  title="Increase jurors"
                >
                  ▲
                </button>
                <button
                  type="button"
                  onClick={() => setJurorSeatCount((value) => Math.max(MIN_JURORS, value - 1))}
                  className="border-t border-slate-600 px-3 py-1 text-xs text-slate-200 transition hover:bg-slate-800/80 hover:text-white"
                  aria-label="Decrease jurors"
                  title="Decrease jurors"
                >
                  ▼
                </button>
              </div>
            </div>
            <div className="text-xs text-slate-300">Minimum: {MIN_JURORS}</div>
          </div>
        </section>

        <section className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {seatNames.map((name, index) => (
            <JurorChair key={index} seatNumber={index + 1} name={name} />
          ))}
        </section>

        <section
          className="jury-fade-up mt-6 rounded-xl border border-slate-700/70 bg-slate-900/40 px-4 py-3 text-sm text-slate-200"
          style={{ animationDelay: "420ms" }}
        >
          {statusText}
        </section>
      </main>
    </div>
  );
}