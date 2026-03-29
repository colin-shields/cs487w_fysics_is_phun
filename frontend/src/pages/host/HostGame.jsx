/**
 * HostGame.jsx
 * Host Game View - Display questions to the host
 *
 * Phase order per round:
 *   collecting → answers → results → jury → roundLeaderboard
 * Then next question or end game.
 */

import React, { useEffect, useState, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useDeck } from "../../state/DeckContext.jsx";
import { buildUrl, buildWsUrl } from "../../api/httpClient";
import { getHostCode } from "../../utils/hostAuth";

function getImageUrl(imagePath) {
  if (!imagePath) return null;
  if (imagePath.startsWith("/assets/")) return buildUrl(imagePath);
  if (imagePath.startsWith("http")) return imagePath;
  return buildUrl(`/assets/${imagePath}`);
}

function fmtPts(n) {
  if (n === undefined || n === null) return "—";
  const rounded = Math.round(n * 100) / 100;
  return rounded >= 0 ? `+${rounded}` : `${rounded}`;
}

export default function HostGame() {
  const location = useLocation();
  const navigate = useNavigate();
  const { roomCode } = location.state || {};
  const { activeDeck } = useDeck();

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [wsConnected, setWsConnected] = useState(false);
  // phases: collecting | answers | results | jury | roundLeaderboard
  const [phase, setPhase] = useState("collecting");
  const [submissions, setSubmissions] = useState([]);
  const [answerPool, setAnswerPool] = useState([]);
  const [resultStats, setResultStats] = useState(null);
  const [juryVoteCount, setJuryVoteCount] = useState(0);
  const [totalJurors, setTotalJurors] = useState(0);
  const [roundBreakdown, setRoundBreakdown] = useState(null);
  const [currentScores, setCurrentScores] = useState({});
  // Timer / stage state
  const [timerRemaining, setTimerRemaining] = useState(null);
  const [timerPaused, setTimerPaused] = useState(false);
  const [timerStatus, setTimerStatus] = useState("idle"); // "running" | "paused" | "ready" | "idle"
  const [currentStage, setCurrentStage] = useState(null);
  const [stageReadyReason, setStageReadyReason] = useState(null);
  const wsRef = React.useRef(null);

  useEffect(() => {
    if (!activeDeck) { navigate("/host"); return; }
    if (!roomCode) { navigate("/host/lobby"); return; }
  }, [activeDeck, roomCode, navigate]);

  useEffect(() => {
    if (!roomCode) return;
    const wsUrl = buildWsUrl(`/ws/session/${roomCode}`);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => setWsConnected(true);
    ws.onclose = () => console.log("Host websocket closed");
    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        console.log("Received message:", msg.type, msg);
        if (msg.type === "submission") {
          setSubmissions((prev) => [...prev, msg.player]);
        } else if (msg.type === "answers") {
          setAnswerPool(msg.answers || []);
          setPhase("answers");
        } else if (msg.type === "results") {
          setResultStats(msg.stats);
          setPhase("results");
        } else if (msg.type === "jury_vote_count") {
          setJuryVoteCount(msg.count);
          setTotalJurors(msg.total_jurors);
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
          setStageReadyReason(msg.reason);
        } else if (msg.type === "stage_transition") {
          // Only clear the ready banner — phase changes are driven by subsequent messages
          // (e.g. "answers" msg sets phase="answers", "results" msg sets phase="results")
          setStageReadyReason(null);
          setTimerStatus("idle");
        } else if (msg.type === "skip_question") {
          setCurrentQuestionIndex((prev) =>
            prev < totalQuestions - 1 ? prev + 1 : prev
          );
        }
      } catch (e) {
        // ignore
      }
    };

    return () => {
      if (wsRef.current) wsRef.current.close();
      wsRef.current = null;
    };
  }, [roomCode]);

  if (!activeDeck || !roomCode) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-300">Loading...</div>
      </div>
    );
  }

  const questions = activeDeck.questions || [];
  const totalQuestions = questions.length;
  const isLastQuestion = currentQuestionIndex === totalQuestions - 1;
  const currentQuestion = questions[currentQuestionIndex] || {};

  function sendCurrentQuestion() {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: "question",
        index: currentQuestionIndex,
        question: currentQuestion,
        correctAnswer: currentQuestion.Correct_Answer,
      }));
    }
  }

  useEffect(() => {
    setPhase("collecting");
    setSubmissions([]);
    setAnswerPool([]);
    setResultStats(null);
    setJuryVoteCount(0);
    setRoundBreakdown(null);
    setTimerRemaining(null);
    setTimerPaused(false);
    setTimerStatus("idle");
    setCurrentStage(null);
    setStageReadyReason(null);
    if (wsConnected) sendCurrentQuestion();
  }, [currentQuestionIndex, wsConnected]);

  function goToPrev() {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  }

  function goToNext() {
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  }

  function sendHostNext(stage) {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "host_next", stage }));
      console.log("Sent host_next for stage", stage);
      setStageReadyReason(null);
    }
  }

  function sendPause() {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "pause" }));
    }
  }

  function sendResume() {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "resume" }));
    }
  }

  function sendExtendTimer() {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "extend_timer" }));
    }
  }

  function sendSkipQuestion() {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "skip_question" }));
    }
  }

  function requestResults() {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      // Release the Stage 2 READY gate first, then request stats
      wsRef.current.send(JSON.stringify({ type: "host_next", stage: 2 }));
      wsRef.current.send(JSON.stringify({ type: "results_request" }));
    }
  }

  function startJuryPhase() {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "jury_phase", question_index: currentQuestionIndex }));
      setPhase("jury");
    }
  }

  function requestJuryResults() {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "jury_results" }));
    }
  }

  async function onEndGame() {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "game_finished" }));
    }
    navigate("/host/leaderboard", { state: { roomCode } });
  }

  async function onExitGame() {
    try {
      const hostCode = getHostCode?.() || "";
      const headers = hostCode ? { "X-Host-Code": hostCode } : {};
      await fetch(buildUrl(`/session/${roomCode}`), { method: "DELETE", headers });
    } catch (e) {
      console.warn("Failed to cancel session", e);
    }
    navigate("/host");
  }

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
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-indigo-400/80 mb-0.5">Host View</div>
            <div className="font-bold text-white text-lg tracking-wide bg-gradient-to-r from-indigo-200 to-purple-200 bg-clip-text text-transparent">
              Game in Progress
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-sm font-medium text-indigo-200">
              Room: <span className="font-bold text-emerald-400 ml-1 tracking-wider">{roomCode}</span>
            </div>
            <button
              onClick={onExitGame}
              className="text-sm font-bold text-pink-400 hover:text-pink-300 underline underline-offset-4 transition-colors"
            >
              Exit Game
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 py-8 space-y-6 flex-grow flex flex-col">


        {/* Question Counter */}
        <section className="rounded-2xl border border-indigo-500/20 bg-indigo-950/30 backdrop-blur-md p-6 shrink-0 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 via-purple-500/5 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
            <div>
              <div className="text-xs font-bold uppercase tracking-widest text-indigo-400/80 mb-1">Question Progress</div>
              <div className="mt-1 text-3xl font-black text-white tracking-wide">
                <span className="text-emerald-400">{currentQuestionIndex + 1}</span>
                <span className="text-indigo-400 font-medium text-xl mx-1">/</span>
                <span className="text-indigo-200">{totalQuestions}</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {/* Phase badge */}
              <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
                phase === "collecting" ? "bg-indigo-900/50 border-indigo-500/40 text-indigo-300" :
                phase === "answers" ? "bg-purple-900/50 border-purple-500/40 text-purple-300" :
                phase === "results" ? "bg-emerald-900/50 border-emerald-500/40 text-emerald-300" :
                phase === "jury" ? "bg-amber-900/50 border-amber-500/40 text-amber-300" :
                "bg-teal-900/50 border-teal-500/40 text-teal-300"
              }`}>
                {phase === "collecting" ? "Collecting Fakes" :
                 phase === "answers" ? "Players Choosing" :
                 phase === "results" ? "Results" :
                 phase === "jury" ? "Jury Voting" :
                 "Round Scores"}
              </div>
              <div className="w-48 h-3 bg-[#0a0523]/60 border border-indigo-500/30 rounded-full overflow-hidden shadow-inner">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-700 ease-out"
                  style={{ width: `${((currentQuestionIndex + 1) / totalQuestions) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Timer bar — shown during Stage 1 and Stage 2 */}
          {timerRemaining !== null && timerStatus !== "idle" && (
            <div className="mt-4 flex items-center gap-3 relative z-10">
              <div className={`text-2xl font-black tabular-nums w-20 ${
                timerStatus === "paused" ? "text-yellow-400" :
                timerStatus === "ready"  ? "text-amber-400" :
                timerRemaining <= 10     ? "text-red-400 animate-pulse" :
                                           "text-white"
              }`}>
                {timerStatus === "ready" ? "READY" : `${timerRemaining}s`}
              </div>
              {(timerStatus === "running" || timerStatus === "paused") && (
                <div className="flex gap-2">
                  {timerStatus === "running" ? (
                    <button
                      onClick={sendPause}
                      className="text-xs px-3 py-1 rounded-lg border border-yellow-500/40 text-yellow-300 hover:bg-yellow-900/40 transition-all"
                    >
                      Pause
                    </button>
                  ) : (
                    <button
                      onClick={sendResume}
                      className="text-xs px-3 py-1 rounded-lg border border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/40 transition-all"
                    >
                      Resume
                    </button>
                  )}
                  <button
                    onClick={sendExtendTimer}
                    className="text-xs px-3 py-1 rounded-lg border border-indigo-500/40 text-indigo-300 hover:bg-indigo-900/40 transition-all"
                  >
                    +15s
                  </button>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Question Display */}
        <section className="rounded-2xl border border-indigo-500/30 bg-indigo-950/20 backdrop-blur-md p-8 md:p-12 flex-grow flex flex-col justify-center relative">
          <div className="absolute top-0 left-0 w-16 h-16 border-t-2 border-l-2 border-indigo-500/40 rounded-tl-2xl m-2 opacity-50"></div>
          <div className="absolute bottom-0 right-0 w-16 h-16 border-b-2 border-r-2 border-purple-500/40 rounded-br-2xl m-2 opacity-50"></div>

          <div className="mb-8 text-center max-w-3xl mx-auto w-full z-10">
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
            <div className="mb-8 rounded-xl overflow-hidden border border-indigo-500/30 bg-[#0a0523]/60 mx-auto max-w-2xl relative z-10">
              <img
                src={getImageUrl(currentQuestion.Image_Link)}
                alt="Question media"
                className="w-full max-h-[400px] object-contain"
              />
            </div>
          )}

          {/* Correct Answer only (results + jury + roundLeaderboard phases) */}
          {(phase === "results" || phase === "jury" || phase === "roundLeaderboard") && (
            <div className="mt-auto mx-auto w-full max-w-sm z-10">
              <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/40 p-5 shadow-[0_0_20px_rgba(16,185,129,0.15)] flex flex-col items-center text-center">
                <div className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-2 bg-emerald-900/40 px-3 py-1 rounded-full border border-emerald-500/30">CORRECT ANSWER</div>
                <div className="text-xl md:text-2xl font-bold text-white">
                  {currentQuestion.Correct_Answer || "(No answer)"}
                </div>
              </div>
            </div>
          )}
        </section>

        {/* READY banner — informational only; the main phase button below is what advances */}
        {timerStatus === "ready" && (
          <section className="rounded-xl border border-amber-500/40 bg-amber-950/30 px-5 py-3 shrink-0">
            <div className="text-xs font-bold uppercase tracking-widest text-amber-300 mb-0.5">
              Stage {currentStage} Complete
            </div>
            <div className="text-sm text-amber-200/70">
              {stageReadyReason === "timeout" ? "Time expired." : "All players submitted."}{" "}
              Use the button below to advance.
            </div>
          </section>
        )}

        {/* Navigation Controls (phase-aware) */}
        <section className="flex flex-col sm:flex-row gap-4 shrink-0">
          <button
            onClick={goToPrev}
            disabled={phase !== "collecting" || currentQuestionIndex === 0}
            className="sm:w-1/4 rounded-xl bg-indigo-950/60 border border-indigo-500/30 px-4 py-4 text-sm font-bold text-indigo-200 hover:bg-indigo-800 hover:text-white hover:border-indigo-400 disabled:opacity-40 disabled:hover:bg-indigo-950/60 disabled:hover:text-indigo-200 disabled:hover:border-indigo-500/30 transition-all flex items-center justify-center gap-2 shadow-inner"
          >
            ← Prev
          </button>

          {phase === "collecting" && (
            <>
              <button
                onClick={() => sendHostNext(1)}
                disabled={timerStatus !== "ready"}
                className="flex-1 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 text-base font-bold text-white shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:shadow-[0_0_30px_rgba(139,92,246,0.5)] hover:scale-[1.02] active:scale-95 disabled:opacity-40 disabled:hover:scale-100 disabled:hover:shadow-none transition-all flex items-center justify-center gap-3"
              >
                Show Answers
                <span className="bg-[#0a0523]/40 border border-indigo-400/30 px-2 py-0.5 rounded-full text-xs shadow-inner">
                  {submissions.length} submitted
                </span>
              </button>
              {timerStatus !== "ready" && (
                <button
                  onClick={() => sendHostNext(1)}
                  className="sm:w-auto rounded-xl bg-indigo-950/60 border border-indigo-500/30 px-4 py-4 text-sm font-bold text-indigo-300 hover:bg-indigo-800 hover:text-white hover:border-indigo-400 transition-all flex items-center justify-center"
                >
                  Skip Phase
                </button>
              )}
            </>
          )}

          {phase === "answers" && (
            <>
              <button
                onClick={requestResults}
                disabled={timerStatus !== "ready"}
                className="flex-1 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 px-6 py-4 text-base font-bold text-white shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] hover:scale-[1.02] active:scale-95 disabled:opacity-40 disabled:hover:scale-100 disabled:hover:shadow-none transition-all outline outline-2 outline-offset-2 outline-emerald-500/50"
              >
                Show Results
              </button>
              {timerStatus !== "ready" && (
                <button
                  onClick={requestResults}
                  className="sm:w-auto rounded-xl bg-indigo-950/60 border border-indigo-500/30 px-4 py-4 text-sm font-bold text-indigo-300 hover:bg-indigo-800 hover:text-white hover:border-indigo-400 transition-all flex items-center justify-center"
                >
                  Skip Phase
                </button>
              )}
            </>
          )}

          {phase === "results" && (
            <button
              onClick={startJuryPhase}
              className="flex-1 rounded-xl bg-gradient-to-r from-amber-600 to-orange-500 px-6 py-4 text-base font-bold text-white shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:shadow-[0_0_30px_rgba(245,158,11,0.5)] hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <span>⚖</span> Start Jury Voting
            </button>
          )}

          {phase === "jury" && (
            <>
              <button
                onClick={requestJuryResults}
                className="flex-1 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-500 px-6 py-4 text-base font-bold text-white shadow-[0_0_20px_rgba(20,184,166,0.3)] hover:shadow-[0_0_30px_rgba(20,184,166,0.5)] hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                Show Round Scores
              </button>
              {juryVoteCount < totalJurors && (
                <button
                  onClick={requestJuryResults}
                  className="sm:w-auto rounded-xl bg-indigo-950/60 border border-indigo-500/30 px-4 py-4 text-sm font-bold text-indigo-300 hover:bg-indigo-800 hover:text-white hover:border-indigo-400 transition-all flex items-center justify-center"
                >
                  Skip Phase
                </button>
              )}
            </>
          )}

          {phase === "roundLeaderboard" && (
            <button
              onClick={isLastQuestion ? onEndGame : goToNext}
              className={`flex-1 rounded-xl px-6 py-4 text-base font-bold text-white shadow-lg transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 ${
                isLastQuestion
                  ? "bg-gradient-to-r from-emerald-600 to-teal-500 shadow-[0_0_25px_rgba(16,185,129,0.4)] ring-2 ring-emerald-500/50 ring-offset-2 ring-offset-slate-900"
                  : "bg-indigo-600 hover:bg-indigo-500 shadow-[0_0_20px_rgba(79,70,229,0.3)]"
              }`}
            >
              {isLastQuestion ? "End Game" : "Next Question →"}
            </button>
          )}

          {phase !== "roundLeaderboard" && (
            <button
              onClick={isLastQuestion ? onEndGame : sendSkipQuestion}
              className={`sm:w-auto rounded-xl px-4 py-4 text-sm font-bold transition-all flex items-center justify-center ${
                isLastQuestion
                  ? "bg-emerald-900/40 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-600 hover:text-white hover:border-transparent"
                  : "bg-indigo-950/60 border border-indigo-500/30 text-indigo-200 hover:bg-indigo-800 hover:text-white hover:border-indigo-400"
              }`}
            >
              {isLastQuestion ? "End Game" : "Next Question →"}
            </button>
          )}
        </section>

        {/* Phase-specific info panels */}
        {phase === "collecting" && (
          <section className="rounded-xl border border-indigo-500/20 bg-indigo-950/30 p-5 shadow-inner flex items-center justify-between">
            <div className="text-sm font-bold text-indigo-200">Waiting for players to submit fakes</div>
            <div className="flex -space-x-2">
              {Array.from({ length: Math.min(submissions.length, 5) }).map((_, i) => (
                <div key={i} className="w-8 h-8 rounded-full bg-indigo-600 border-2 border-[#0a0523] animate-pulse" style={{ animationDelay: `${i * 150}ms`, zIndex: 10 - i }}></div>
              ))}
              {submissions.length > 5 && (
                <div className="w-8 h-8 rounded-full bg-indigo-800 border-2 border-[#0a0523] flex items-center justify-center text-[10px] font-bold text-white">
                  +{submissions.length - 5}
                </div>
              )}
            </div>
          </section>
        )}

        {phase === "answers" && (
          <section className="rounded-xl border border-indigo-500/20 bg-indigo-950/30 p-6 shadow-inner">
            <div className="text-xs font-bold uppercase tracking-widest text-indigo-300 mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></span>
              Answers shown to players
            </div>
            <div className="flex flex-wrap gap-3">
              {answerPool.map((ans, i) => (
                <div key={i} className="bg-[#0a0523]/60 border border-indigo-500/30 text-indigo-100 px-4 py-2 rounded-lg text-sm font-medium shadow-sm">
                  {ans}
                </div>
              ))}
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
                  <div key={ans} className={`flex items-center justify-between p-3 rounded-xl border ${isCorrect ? "border-emerald-500/40 bg-emerald-950/30" : "border-indigo-500/30 bg-[#0a0523]/60"}`}>
                    <span className={`text-sm font-medium truncate pr-2 ${isCorrect ? "text-emerald-200" : "text-indigo-100"}`}>{ans}</span>
                    <span className={`text-base font-black px-2 py-0.5 rounded-md ${isCorrect ? "bg-emerald-500/20 text-emerald-300" : "bg-indigo-900/50 text-indigo-300"}`}>{count}</span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {phase === "jury" && juryVoteCount >= totalJurors && totalJurors > 0 && (
          <section className="rounded-xl border border-emerald-500/40 bg-emerald-950/30 px-5 py-3 shrink-0">
            <div className="text-xs font-bold uppercase tracking-widest text-emerald-300 mb-0.5">
              All Jurors Voted
            </div>
            <div className="text-sm text-emerald-200/70">
              All {totalJurors} jurors have submitted their votes — ready to show round scores.
            </div>
          </section>
        )}

        {phase === "jury" && (
          <section className="rounded-xl border border-amber-500/20 bg-amber-950/20 p-6 shadow-inner">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-bold uppercase tracking-widest text-amber-300 mb-1 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                  Jury Deliberating
                </div>
                <div className="text-sm font-medium text-amber-200/80">Jurors are voting on the best fake answer</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-black text-white">{juryVoteCount}<span className="text-amber-400/60 text-base font-medium">/{totalJurors}</span></div>
                <div className="text-xs font-bold uppercase tracking-wider text-amber-400/60">votes in</div>
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
                    <th className="text-left py-2 pr-4 text-xs font-bold uppercase tracking-wider text-indigo-400">Player</th>
                    <th className="text-center py-2 px-2 text-xs font-bold uppercase tracking-wider text-emerald-400">Correct</th>
                    <th className="text-center py-2 px-2 text-xs font-bold uppercase tracking-wider text-indigo-400">Fooled</th>
                    <th className="text-center py-2 px-2 text-xs font-bold uppercase tracking-wider text-amber-400">Jury Best</th>
                    <th className="text-center py-2 px-2 text-xs font-bold uppercase tracking-wider text-pink-400">Jury Worst</th>
                    <th className="text-center py-2 px-2 text-xs font-bold uppercase tracking-wider text-teal-300">Round</th>
                    <th className="text-right py-2 pl-4 text-xs font-bold uppercase tracking-wider text-white">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedLeaderboard.map((p, idx) => (
                    <tr key={p.name} className={`border-b border-indigo-500/10 ${idx === 0 ? "bg-emerald-950/20" : ""}`}>
                      <td className="py-3 pr-4 font-bold text-white flex items-center gap-2">
                        {idx === 0 && <span className="text-emerald-400 text-xs">★</span>}
                        {p.name === "Predefined Fake" ? "Host" : p.name}
                      </td>
                      <td className="text-center py-3 px-2 text-emerald-300 font-mono">{fmtPts(p.correct_pts)}</td>
                      <td className="text-center py-3 px-2 text-indigo-300 font-mono">{fmtPts(p.fool_pts)}</td>
                      <td className="text-center py-3 px-2 text-amber-300 font-mono">{fmtPts(p.jury_best_pts)}</td>
                      <td className="text-center py-3 px-2 text-pink-300 font-mono">{fmtPts(p.jury_worst_pts ? -p.jury_worst_pts : 0)}</td>
                      <td className="text-center py-3 px-2 font-black text-teal-300 font-mono">{fmtPts(p.round_total)}</td>
                      <td className="text-right py-3 pl-4 font-black text-white">{Math.round((p.total ?? 0) * 100) / 100} pts</td>
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
              Deck: <span className="text-white font-bold">{activeDeck.name}</span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
