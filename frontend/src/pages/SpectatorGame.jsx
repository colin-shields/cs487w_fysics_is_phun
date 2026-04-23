/**
 * SpectatorGame.jsx
 * Spectator View - Display game state without host controls
 *
 * Similar to HostGame but read-only (no ability to pause, advance phases, etc.)
 */

import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { buildUrl, buildWsUrl } from "../api/httpClient";
import { pickRandomPlayerAvatarUrl } from "../utils/playerAvatars";

function getImageUrl(imagePath) {
  if (!imagePath) return null;
  const normalized = String(imagePath).trim();
  if (
    normalized.startsWith("http://") ||
    normalized.startsWith("https://") ||
    normalized.startsWith("data:") ||
    normalized.startsWith("blob:")
  ) {
    return normalized;
  }
  if (normalized.startsWith("/")) return buildUrl(normalized);
  return buildUrl(`/assets/${normalized.replace(/^assets\//, "")}`);
}

function getAvatarUrl(imagePath) {
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

function fmtPts(n) {
  if (n === undefined || n === null) return "—";
  const rounded = Math.round(n * 100) / 100;
  return rounded >= 0 ? `+${rounded}` : `${rounded}`;
}

export default function SpectatorGame() {
  const { roomCode } = useParams();
  const navigate = useNavigate();

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [wsConnected, setWsConnected] = useState(false);
  // phases: collecting | answers | results | jury | roundLeaderboard
  const [phase, setPhase] = useState("collecting");
  const [submissions, setSubmissions] = useState([]);
  const [answerPool, setAnswerPool] = useState([]);
  const [resultStats, setResultStats] = useState(null);
  const [juryVoteCount, setJuryVoteCount] = useState(0);
  const [playerVoteCount, setPlayerVoteCount] = useState(0);
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [totalJurors, setTotalJurors] = useState(0);
  const [votedPlayers, setVotedPlayers] = useState([]);
  const [waitingPlayers, setWaitingPlayers] = useState([]);
  const [votedJurors, setVotedJurors] = useState([]);
  const [waitingJurors, setWaitingJurors] = useState([]);
  const [roundBreakdown, setRoundBreakdown] = useState(null);
  const [currentScores, setCurrentScores] = useState({});
  // Timer / stage state
  const [timerRemaining, setTimerRemaining] = useState(null);
  const [timerPaused, setTimerPaused] = useState(false);
  const [timerStatus, setTimerStatus] = useState("idle"); // "running" | "paused" | "ready" | "idle"
  const [currentStage, setCurrentStage] = useState(null);
  const [hostAvatarUrl, setHostAvatarUrl] = useState("");
  const [fallbackHostAvatarUrl] = useState(() => pickRandomPlayerAvatarUrl());
  const [deckName, setDeckName] = useState("");
  const [currentQuestion, setCurrentQuestion] = useState({});
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [sessionCancelled, setSessionCancelled] = useState(false);
  const [gameFinished, setGameFinished] = useState(false);
  const wsRef = React.useRef(null);
  const displayHostAvatarUrl =
    getAvatarUrl(hostAvatarUrl) || getAvatarUrl(fallbackHostAvatarUrl);

  useEffect(() => {
    if (!roomCode) {
      navigate("/");
      return;
    }
  }, [roomCode, navigate]);

  // Reset phase and state when question changes
  useEffect(() => {
    setPhase("collecting");
    setSubmissions([]);
    setAnswerPool([]);
    setResultStats(null);
    setJuryVoteCount(0);
    setPlayerVoteCount(0);
    setVotedPlayers([]);
    setWaitingPlayers([]);
    setVotedJurors([]);
    setWaitingJurors([]);
    setRoundBreakdown(null);
    setCurrentScores({});
    setTimerRemaining(null);
    setTimerPaused(false);
    setTimerStatus("idle");
    setCurrentStage(null);
  }, [currentQuestionIndex]);

  useEffect(() => {
    if (!roomCode || sessionCancelled) return;

    let ws;
    let reconnectTimeout;
    let cancelled = false;

    function connect() {
      ws = new WebSocket(buildWsUrl(`/ws/session/${roomCode}`));
      wsRef.current = ws;

      ws.onopen = () => setWsConnected(true);

      ws.onclose = () => {
        setWsConnected(false);
        if (!cancelled) {
          reconnectTimeout = setTimeout(connect, 2000);
        }
      };

      ws.onerror = () => ws.close();

      ws.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data);
          console.log("Spectator received message:", msg.type, msg);
          if (msg.type === "submission") {
            setSubmissions((prev) =>
              prev.includes(msg.player) ? prev : [...prev, msg.player],
            );
          } else if (msg.type === "answers") {
            setAnswerPool(msg.answers || []);
            setPhase("answers");
          } else if (msg.type === "choice_vote_count") {
            setPlayerVoteCount(msg.count);
            setTotalPlayers(msg.total_players);
            setVotedPlayers(Array.isArray(msg.voted_players) ? msg.voted_players : []);
            setWaitingPlayers(Array.isArray(msg.waiting_players) ? msg.waiting_players : []);
          } else if (msg.type === "results") {
            setResultStats(msg.stats);
            setPhase("results");
          } else if (msg.type === "jury_vote_count") {
            setJuryVoteCount(msg.count);
            setTotalJurors(msg.total_jurors);
            setVotedJurors(Array.isArray(msg.voted_jurors) ? msg.voted_jurors : []);
            setWaitingJurors(Array.isArray(msg.waiting_jurors) ? msg.waiting_jurors : []);
          } else if (msg.type === "jury_phase") {
            setPhase("jury");
          } else if (msg.type === "round_scores") {
            setRoundBreakdown(msg.breakdown || {});
            setCurrentScores(msg.scores || {});
            setPhase("roundLeaderboard");
          } else if (msg.type === "timer_update") {
            setTimerRemaining(msg.remaining);
            setTimerPaused(msg.paused);
            setTimerStatus(msg.status);
            setCurrentStage(msg.stage);
          } else if (msg.type === "stage_ready") {
            setTimerStatus("ready");
          } else if (msg.type === "stage_transition") {
            setTimerStatus("idle");
          } else if (msg.type === "question") {
            setCurrentQuestion(msg.question || {});
            setCurrentQuestionIndex(msg.index || 0);
          } else if (msg.type === "cancelled") {
            cancelled = true;
            setSessionCancelled(true);
          } else if (msg.type === "game_finished") {
            setGameFinished(true);
          }
        } catch (e) {
          console.warn("Error parsing spectator message:", e);
        }
      };
    }

    connect();

    return () => {
      cancelled = true;
      clearTimeout(reconnectTimeout);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [roomCode, sessionCancelled]);

  // Fetch session status to get deck name, players, and initial state
  useEffect(() => {
    if (!roomCode) return;

    async function refreshSessionStatus() {
      try {
        const res = await fetch(buildUrl(`/session-status/${roomCode}`));
        if (!res.ok) return;
        const data = await res.json();
        
        // Check if session was cancelled or game finished
        if (data?.status === "cancelled") {
          setSessionCancelled(true);
          return;
        }
        if (data?.status === "finished") {
          setGameFinished(true);
          return;
        }
        
        setHostAvatarUrl(data?.player_avatars?.Host || "");
        
        // Extract deck name from deck_id (remove .csv extension if present)
        const deckId = data?.deck_id || "";
        const name = deckId.replace(/\.csv$/i, "");
        setDeckName(name);
        
        // Set total questions from session data
        setTotalQuestions(data?.total_questions || 0);

        // Set total players and jurors from session data
        const players = Array.isArray(data?.players) ? data.players : [];
        setTotalPlayers(players.length);
        
        const jurors = Array.isArray(data?.jurors) ? data.jurors : [];
        setTotalJurors(jurors.length);
        
        const currentIdx =
          typeof data?.current_index === "number"
            ? data.current_index
            : currentQuestionIndex;
        if (currentIdx !== currentQuestionIndex) {
          setCurrentQuestionIndex(currentIdx);
        }
      } catch (e) {
        console.warn("Failed to fetch session status:", e);
      }
    }

    refreshSessionStatus();
    const iv = setInterval(refreshSessionStatus, 2000);
    return () => clearInterval(iv);
  }, [roomCode, currentQuestionIndex]);

  // Navigate to /join when session is cancelled or game finishes
  useEffect(() => {
    if (sessionCancelled || gameFinished) {
      navigate("/join");
    }
  }, [sessionCancelled, gameFinished, navigate]);

  if (!roomCode) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-300">Loading...</div>
      </div>
    );
  }

  const isLastQuestion = currentQuestionIndex === totalQuestions - 1;

  // Sorted leaderboard for roundLeaderboard phase
  const sortedLeaderboard = useMemo(() => {
    return Object.entries(currentScores)
      .map(([name, total]) => ({ name, total, ...roundBreakdown?.[name] }))
      .sort((a, b) => b.total - a.total);
  }, [currentScores, roundBreakdown]);

  return (
    <div className="min-h-screen bg-[#050114] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-950 via-[#0a0523] to-[#050114] flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-indigo-500/20 bg-[#0a0523]/80 backdrop-blur-md shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
        <div className="mx-auto grid max-w-5xl grid-cols-3 items-center px-6 py-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-indigo-400/80 mb-0.5">
              Spectator View
            </div>
            <div className="font-bold text-white text-lg tracking-wide bg-gradient-to-r from-indigo-200 to-purple-200 bg-clip-text text-transparent">
              Game in Progress
            </div>
          </div>
          <div className="flex justify-center">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 p-[2px] shadow-md">
              <div className="h-full w-full rounded-full bg-[#0a0523] overflow-hidden flex items-center justify-center">
                <img
                  src={displayHostAvatarUrl}
                  alt="Host avatar"
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
          </div>
          <div className="flex items-center justify-end gap-6">
            <div className="text-sm font-medium text-indigo-200">
              Room:{" "}
              <span className="font-bold text-emerald-400 ml-1 tracking-wider">
                {roomCode}
              </span>
            </div>
            <button
              onClick={() => navigate("/join")}
              className="text-sm font-bold text-pink-400 hover:text-pink-300 underline underline-offset-4 transition-colors"
            >
              Exit
            </button>
          </div>
        </div>
      </header>

      {/* Disconnect banner */}
      {!wsConnected && (
        <div className="bg-pink-950/90 border-b border-pink-500/40 px-6 py-2 text-sm font-bold text-pink-200 text-center">
          Connection lost — reconnecting automatically...
        </div>
      )}

      <main className="mx-auto w-full max-w-5xl px-4 py-8 space-y-6 flex-grow flex flex-col">
        {/* Question Counter */}
        <section className="rounded-2xl border border-indigo-500/20 bg-indigo-950/30 backdrop-blur-md p-6 shrink-0 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 via-purple-500/5 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
            <div>
              <div className="text-xs font-bold uppercase tracking-widest text-indigo-400/80 mb-1">
                Question Progress
              </div>
              <div className="mt-1 text-3xl font-black text-white tracking-wide">
                <span className="text-emerald-400">
                  {currentQuestionIndex + 1}
                </span>
                <span className="text-indigo-400 font-medium text-xl mx-1">
                  /
                </span>
                <span className="text-indigo-200">{totalQuestions}</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div
                className={`px-4 py-2 rounded-full text-sm font-bold border ${
                  phase === "jury"
                    ? "bg-amber-900/50 border-amber-500/40 text-amber-300"
                    : phase === "roundLeaderboard"
                      ? "bg-teal-900/50 border-teal-500/40 text-teal-300"
                      : "bg-indigo-900/50 border-indigo-500/40 text-indigo-300"
                }`}
              >
                {phase === "roundLeaderboard"
                  ? "All Done!"
                  : phase === "jury"
                  ? `${juryVoteCount}/${totalJurors} Jurors Voted`
                  : phase === "answers"
                    ? `${playerVoteCount}/${totalPlayers} Players Voted`
                    : `${submissions.length}/${totalPlayers} Players Submitted`}
              </div>
            </div>
          </div>

          {/* Timer bar */}
          {timerRemaining !== null && timerStatus !== "idle" && (
            <div className="mt-4 flex items-center gap-3 relative z-10">
              <div
                className={`text-2xl font-black tabular-nums w-20 ${
                  timerStatus === "paused"
                    ? "text-yellow-400"
                    : timerStatus === "ready"
                      ? "text-amber-400"
                      : timerRemaining <= 10
                        ? "text-red-400 animate-pulse"
                        : "text-white"
                }`}
              >
                {timerStatus === "ready" ? "READY" : `${timerRemaining}s`}
              </div>
            </div>
          )}
        </section>

        <section
          className={`rounded-2xl border border-indigo-500/30 bg-indigo-950/20 backdrop-blur-md p-8 md:p-12 flex-grow relative ${
            phase === "answers" ? "" : "flex flex-col justify-center"
          }`}
        >
          <div className="absolute top-0 left-0 w-16 h-16 border-t-2 border-l-2 border-indigo-500/40 rounded-tl-2xl m-2 opacity-50"></div>
          <div className="absolute bottom-0 right-0 w-16 h-16 border-b-2 border-r-2 border-purple-500/40 rounded-br-2xl m-2 opacity-50"></div>

          <div
            className={`relative z-10 ${
              phase === "answers"
                ? "grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.95fr)] lg:items-stretch"
                : ""
            }`}
          >
            <div className={phase === "answers" ? "flex flex-col justify-center min-w-0" : ""}>
              <div className="mb-8 text-center max-w-3xl mx-auto w-full">
                <div className="text-xs font-bold uppercase tracking-widest text-indigo-400 mb-4 flex items-center justify-center gap-2">
                  <span className="w-8 h-px bg-indigo-500/40"></span>
                  Current Question
                  <span className="w-8 h-px bg-indigo-500/40"></span>
                </div>
                <div className="text-3xl md:text-4xl font-black text-white leading-tight break-words drop-shadow-md">
                  {currentQuestion.Question_Text || "(No question text)"}
                </div>
              </div>

              {currentQuestion.Image_Link && (
                <div className="mb-8 rounded-xl overflow-hidden border border-indigo-500/30 bg-[#0a0523]/60 mx-auto max-w-2xl relative">
                  <img
                    src={getImageUrl(currentQuestion.Image_Link)}
                    alt="Question media"
                    className="w-full max-h-[400px] object-contain"
                  />
                </div>
              )}
            </div>

            {phase === "answers" && (
              <div className="rounded-xl border border-indigo-500/20 bg-indigo-950/30 p-5 shadow-inner min-h-[260px] lg:max-h-[440px] flex flex-col">
                <div className="text-xs font-bold uppercase tracking-widest text-indigo-300 mb-4 flex items-center gap-2 shrink-0">
                  <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></span>
                  Answers shown to players
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto pr-1">
                  <div className="flex flex-col gap-3">
                    {answerPool.map((ans, i) => (
                      <div
                        key={i}
                        className="bg-[#0a0523]/60 border border-indigo-500/30 text-indigo-100 px-4 py-3 rounded-lg text-sm font-medium shadow-sm whitespace-normal break-words"
                      >
                        {ans}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Correct Answer */}
          {(phase === "results" ||
            phase === "jury" ||
            phase === "roundLeaderboard") && (
            <div className="mt-auto mx-auto w-full max-w-sm z-10">
              <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/40 p-5 shadow-[0_0_20px_rgba(16,185,129,0.15)] flex flex-col items-center text-center">
                <div className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-2 bg-emerald-900/40 px-3 py-1 rounded-full border border-emerald-500/30">
                  CORRECT ANSWER
                </div>
                <div className="text-xl md:text-2xl font-bold text-white">
                  {currentQuestion.Correct_Answer || "(No answer)"}
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Phase-specific info panels */}
        {phase === "collecting" && (
          <section className="rounded-xl border border-indigo-500/20 bg-indigo-950/30 p-6 shadow-inner space-y-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-xs font-bold uppercase tracking-widest text-indigo-300 mb-1 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></span>
                  Collecting Fake Answers
                </div>
                <div className="text-sm font-medium text-indigo-200/80">
                  See who has already submitted and who is still typing
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-black text-white">
                  {submissions.length}
                  <span className="text-indigo-400/60 text-base font-medium">
                    /{totalPlayers}
                  </span>
                </div>
                <div className="text-xs font-bold uppercase tracking-wider text-indigo-400/60">
                  submissions in
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-4">
                <div className="text-xs font-bold uppercase tracking-widest text-emerald-300 mb-3">
                  Submitted
                </div>
                {submissions.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {submissions.map((player) => (
                      <span
                        key={player}
                        className="rounded-full border border-emerald-500/30 bg-emerald-900/30 px-3 py-1 text-sm font-semibold text-emerald-100"
                      >
                        {player}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-emerald-200/70">
                    No players have submitted yet.
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-indigo-500/20 bg-[#0a0523]/40 p-4">
                <div className="text-xs font-bold uppercase tracking-widest text-indigo-300 mb-3">
                  Waiting On
                </div>
                <div className="text-sm text-indigo-200/70">
                  {totalPlayers - submissions.length} player(s) still submitting...
                </div>
              </div>
            </div>
          </section>
        )}

        {phase === "answers" && (
          <section className="rounded-xl border border-indigo-500/20 bg-indigo-950/20 p-6 shadow-inner space-y-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-xs font-bold uppercase tracking-widest text-indigo-300 mb-1 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></span>
                  Players Choosing
                </div>
                <div className="text-sm font-medium text-indigo-200/80">
                  Track who has already voted and who is still deciding
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-black text-white">
                  {playerVoteCount}
                  <span className="text-indigo-400/60 text-base font-medium">
                    /{totalPlayers}
                  </span>
                </div>
                <div className="text-xs font-bold uppercase tracking-wider text-indigo-400/60">
                  votes in
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-4">
                <div className="text-xs font-bold uppercase tracking-widest text-emerald-300 mb-3">
                  Voted
                </div>
                {votedPlayers.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {votedPlayers.map((player) => (
                      <span
                        key={player}
                        className="rounded-full border border-emerald-500/30 bg-emerald-900/30 px-3 py-1 text-sm font-semibold text-emerald-100"
                      >
                        {player}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-emerald-200/70">
                    No players have voted yet.
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-indigo-500/20 bg-[#0a0523]/40 p-4">
                <div className="text-xs font-bold uppercase tracking-widest text-indigo-300 mb-3">
                  Waiting On
                </div>
                {waitingPlayers.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {waitingPlayers.map((player) => (
                      <span
                        key={player}
                        className="rounded-full border border-indigo-500/30 bg-indigo-900/20 px-3 py-1 text-sm font-semibold text-indigo-100"
                      >
                        {player}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-indigo-200/70">
                    Everyone voted!
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {phase === "results" && resultStats && (
          <section className="rounded-xl border border-indigo-500/20 bg-indigo-950/30 p-6 shadow-inner">
            <div className="text-xs font-bold uppercase tracking-widest text-indigo-300 mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Voting Results
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Object.entries(resultStats).map(([ans, count]) => {
                const isCorrect = ans === currentQuestion.Correct_Answer;
                return (
                  <div
                    key={ans}
                    className={`flex items-center justify-between p-3 rounded-xl border ${isCorrect ? "border-emerald-500/40 bg-emerald-950/30" : "border-indigo-500/30 bg-[#0a0523]/60"}`}
                  >
                    <span
                      className={`text-sm font-medium truncate pr-2 ${isCorrect ? "text-emerald-200" : "text-indigo-100"}`}
                    >
                      {ans}
                    </span>
                    <span
                      className={`text-base font-black px-2 py-0.5 rounded-md ${isCorrect ? "bg-emerald-500/20 text-emerald-300" : "bg-indigo-900/50 text-indigo-300"}`}
                    >
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {phase === "jury" && (
          <section className="rounded-xl border border-amber-500/20 bg-amber-950/20 p-6 shadow-inner space-y-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-xs font-bold uppercase tracking-widest text-amber-300 mb-1 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                  Jury Deliberating
                </div>
                <div className="text-sm font-medium text-amber-200/80">
                  Jurors are voting on the best fake answer
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-black text-white">
                  {juryVoteCount}
                  <span className="text-amber-400/60 text-base font-medium">
                    /{totalJurors}
                  </span>
                </div>
                <div className="text-xs font-bold uppercase tracking-wider text-amber-400/60">
                  votes in
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-4">
                <div className="text-xs font-bold uppercase tracking-widest text-emerald-300 mb-3">
                  Voted
                </div>
                {votedJurors.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {votedJurors.map((juror) => (
                      <span
                        key={juror}
                        className="rounded-full border border-emerald-500/30 bg-emerald-900/30 px-3 py-1 text-sm font-semibold text-emerald-100"
                      >
                        {juror}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-emerald-200/70">
                    No jurors have voted yet.
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-amber-500/20 bg-[#0a0523]/40 p-4">
                <div className="text-xs font-bold uppercase tracking-widest text-amber-300 mb-3">
                  Waiting On
                </div>
                {waitingJurors.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {waitingJurors.map((juror) => (
                      <span
                        key={juror}
                        className="rounded-full border border-amber-500/30 bg-amber-900/20 px-3 py-1 text-sm font-semibold text-amber-100"
                      >
                        {juror}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-amber-200/70">
                    Everyone voted!
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {phase === "roundLeaderboard" && roundBreakdown && (
          <section className="rounded-xl border border-teal-500/20 bg-teal-950/10 p-6 shadow-inner">
            <div className="text-xs font-bold uppercase tracking-widest text-teal-300 mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse"></span>
              Round Score Breakdown
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-indigo-500/20">
                    <th className="text-left py-2 pr-4 text-xs font-bold uppercase tracking-wider text-indigo-400">
                      Player
                    </th>
                    <th className="text-center py-2 px-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
                      Correct
                    </th>
                    <th className="text-center py-2 px-2 text-xs font-bold uppercase tracking-wider text-indigo-400">
                      Fooled
                    </th>
                    <th className="text-center py-2 px-2 text-xs font-bold uppercase tracking-wider text-amber-400">
                      Jury Best
                    </th>
                    <th className="text-center py-2 px-2 text-xs font-bold uppercase tracking-wider text-pink-400">
                      Jury Worst
                    </th>
                    <th className="text-center py-2 px-2 text-xs font-bold uppercase tracking-wider text-teal-300">
                      Round
                    </th>
                    <th className="text-right py-2 pl-4 text-xs font-bold uppercase tracking-wider text-white">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedLeaderboard.map((p, idx) => (
                    <tr
                      key={p.name}
                      className={`border-b border-indigo-500/10 ${idx === 0 ? "bg-emerald-950/20" : ""}`}
                    >
                      <td className="py-3 pr-4 font-bold text-white flex items-center gap-2">
                        {idx === 0 && (
                          <span className="text-emerald-400 text-xs">★</span>
                        )}
                        {p.name === "Predefined Fake" ? "Host" : p.name}
                      </td>
                      <td className="text-center py-3 px-2 text-emerald-300 font-mono">
                        {fmtPts(p.correct_pts)}
                      </td>
                      <td className="text-center py-3 px-2 text-indigo-300 font-mono">
                        {fmtPts(p.fool_pts)}
                      </td>
                      <td className="text-center py-3 px-2 text-amber-300 font-mono">
                        {fmtPts(p.jury_best_pts)}
                      </td>
                      <td className="text-center py-3 px-2 text-pink-300 font-mono">
                        {fmtPts(p.jury_worst_pts ? -p.jury_worst_pts : 0)}
                      </td>
                      <td className="text-center py-3 px-2 font-black text-teal-300 font-mono">
                        {fmtPts(p.round_total)}
                      </td>
                      <td className="text-right py-3 pl-4 font-black text-white">
                        {Math.round((p.total ?? 0) * 100) / 100} pts
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Info footer */}
        <section className="rounded-xl border border-indigo-500/20 bg-[#0a0523]/40 p-5 mt-auto opacity-70 hover:opacity-100 transition-opacity">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="text-sm font-medium text-indigo-200">
              Deck:{" "}
              <span className="text-white font-bold">{deckName || "Loading..."}</span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
