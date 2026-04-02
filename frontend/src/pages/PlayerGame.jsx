/**
 * PlayerGame.jsx
 * Player game view — submit fakes, choose answers, see results.
 */

import React, { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { buildUrl, buildWsUrl } from "../api/httpClient";

function getImageUrl(imagePath) {
  if (!imagePath) return null;
  if (imagePath.startsWith("/assets/")) return buildUrl(imagePath);
  if (imagePath.startsWith("http")) return imagePath;
  return buildUrl(`/assets/${imagePath}`);
}

function fmtPts(n) {
  if (!n) return null;
  const r = Math.round(n * 100) / 100;
  return r > 0 ? `+${r}` : `${r}`;
}

export default function PlayerGame() {
  const location = useLocation();
  const navigate = useNavigate();
  const { roomCode, playerName, playerAvatarUrl } = location.state ||
    JSON.parse(sessionStorage.getItem("playerSession") || "null") || {};

  const [sessionStatus, setSessionStatus] = useState(null);
  const [error, setError] = useState("");
  const [sessionCancelled, setSessionCancelled] = useState(false);
  const [gameFinished, setGameFinished] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(null);
  const wsRef = useRef(null);
  const [wsConnected, setWsConnected] = useState(false);

  // game-specific state
  // phases: submit | waiting | choose | results | juryWaiting
  const [phase, setPhase] = useState("submit");
  const [myFake, setMyFake] = useState("");
  const [answers, setAnswers] = useState([]);
  const [myChoice, setMyChoice] = useState(null);
  const [correctAnswer, setCorrectAnswer] = useState(null);
  const [waitingDotCount, setWaitingDotCount] = useState(1);

  // scoring state
  const [myTotalScore, setMyTotalScore] = useState(null);
  const [myRoundBreakdown, setMyRoundBreakdown] = useState(null);
  const [avatarLoadError, setAvatarLoadError] = useState(false);

  // timer / stage state
  const [timerRemaining, setTimerRemaining] = useState(null);
  const [timerPaused, setTimerPaused] = useState(false);
  const [timerStatus, setTimerStatus] = useState("idle"); // "running" | "paused" | "ready" | "idle"
  const [stageLocked, setStageLocked] = useState(false);  // true when stage ended or paused
  const [hasSubmitted, setHasSubmitted] = useState(false); // true after first fake submit
  const [timerError, setTimerError] = useState(null);      // server-sent rejection message

  const syncedAvatarUrl =
    playerAvatarUrl || sessionStatus?.player_avatars?.[playerName] || "";
  const resolvedAvatarUrl = getImageUrl(syncedAvatarUrl);
  const showPlayerAvatar = !!resolvedAvatarUrl && !avatarLoadError;

  useEffect(() => {
    const interval = setInterval(() => {
      setWaitingDotCount((prev) => (prev % 3) + 1);
    }, 450);
    return () => clearInterval(interval);
  }, []);

  const dotMap = [".", "..", "..."];
  const waitingDots = dotMap[waitingDotCount - 1];

  // Poll for session status
  useEffect(() => {
    if (!roomCode) return;

    async function pollSessionStatus() {
      try {
        const res = await fetch(buildUrl(`/session-status/${roomCode}`));
        if (res.ok) {
          const data = await res.json();
          setSessionStatus(data);
          if (data.status === "cancelled") setSessionCancelled(true);
        } else if (res.status === 404) {
          navigate("/join");
        }
      } catch {
        setError("Lost connection to server");
      }
    }

    pollSessionStatus();
    const interval = setInterval(pollSessionStatus, 2000);
    return () => clearInterval(interval);
  }, [roomCode]);

  // WebSocket
  useEffect(() => {
    if (!roomCode || sessionCancelled) return;

    let ws;
    let reconnectTimeout;
    let cancelled = false;

    function connect() {
      const wsUrl = buildWsUrl(`/ws/session/${roomCode}`);
      ws = new WebSocket(wsUrl);
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
          if (msg.type === "question") {
            setCurrentQuestionIndex(msg.index);
            setCurrentQuestion(msg.question);
            setSessionStatus((prev) => ({
              ...(prev || {}),
              status: "in-progress",
            }));
            setPhase("submit");
            setMyFake("");
            setAnswers([]);
            setMyChoice(null);
            setCorrectAnswer(null);
            setMyRoundBreakdown(null);
            // reset timer state for the new question
            setTimerRemaining(null);
            setTimerPaused(false);
            setTimerStatus("idle");
            setStageLocked(false);
            setHasSubmitted(false);
            setTimerError(null);
          } else if (msg.type === "timer_update") {
            setTimerRemaining(msg.remaining);
            setTimerPaused(msg.paused);
            setTimerStatus(msg.status);
            setStageLocked(msg.status === "paused");
          } else if (msg.type === "stage_ready") {
            setStageLocked(true);
            setTimerStatus("ready");
          } else if (msg.type === "stage_transition") {
            // Unlock inputs; only clear timer display when moving to an untimed stage (2→3)
            setStageLocked(false);
            if (msg.to_stage === 3) {
              setTimerStatus("idle");
              setTimerRemaining(null);
            }
          } else if (msg.type === "timer_error") {
            setTimerError(msg.message);
            setTimeout(() => setTimerError(null), 3000);
          } else if (msg.type === "cancelled") {
            setSessionCancelled(true);
          } else if (msg.type === "game_finished") {
            setGameFinished(true);
          } else if (msg.type === "answers") {
            setAnswers(msg.answers || []);
            setPhase("choose");
          } else if (msg.type === "results") {
            setCorrectAnswer(msg.correct || "");
            setPhase("results");
          } else if (msg.type === "jury_phase") {
            // Jury is now voting — players wait
            setPhase("juryWaiting");
          } else if (msg.type === "round_scores") {
            const breakdown = msg.breakdown?.[playerName] || {};
            setMyRoundBreakdown(breakdown);
            setMyTotalScore(msg.scores?.[playerName] ?? 0);
            // Stay in results-like phase showing the breakdown
            setPhase("results");
          }
        } catch (e) {
          console.error("Invalid ws msg", e);
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

  if (!roomCode || !playerName) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-[#0a0523] to-[#0d011c] flex items-center justify-center p-6">
        <div className="rounded-2xl border border-indigo-500/20 bg-indigo-950/20 backdrop-blur-md p-8 text-center max-w-sm w-full">
          <p className="text-pink-200">Error: Session information not found.</p>
        </div>
      </div>
    );
  }

  if (sessionCancelled) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-[#0a0523] to-[#0d011c] flex items-center justify-center p-6">
        <div className="rounded-2xl border border-pink-500/30 bg-pink-950/20 backdrop-blur-md p-8 max-w-md text-center w-full">
          <h2 className="text-2xl font-bold text-white mb-2 tracking-wide">
            Session Cancelled
          </h2>
          <p className="text-sm text-pink-200/70 mb-8">
            The host has cancelled the game session.
          </p>
          <button
            onClick={() => navigate("/join")}
            className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-3 text-base font-bold text-white shadow-[0_0_15px_rgba(139,92,246,0.3)] hover:shadow-[0_0_25px_rgba(139,92,246,0.5)] hover:scale-[1.02] transition-all"
          >
            Return to Join Page
          </button>
        </div>
      </div>
    );
  }

  if (gameFinished) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-[#0a0523] to-[#0d011c] flex items-center justify-center p-6">
        <div className="rounded-2xl border border-purple-500/30 bg-purple-950/20 backdrop-blur-md p-8 max-w-md text-center w-full">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-white mb-2 tracking-wide">
            Game Finished!
          </h2>
          {myTotalScore !== null && (
            <div className="my-4 px-6 py-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 inline-block">
              <div className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-1">
                Your Final Score
              </div>
              <div className="text-3xl font-black text-white">
                {Math.round((myTotalScore ?? 0) * 100) / 100} pts
              </div>
            </div>
          )}
          <p className="text-sm text-purple-200/80 mb-8 mt-4">
            Thank you for playing!
          </p>
          <button
            onClick={() => navigate("/join")}
            className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-3 text-base font-bold text-white shadow-[0_0_15px_rgba(139,92,246,0.3)] hover:shadow-[0_0_25px_rgba(139,92,246,0.5)] hover:scale-[1.02] transition-all"
          >
            Return to Join Page
          </button>
        </div>
      </div>
    );
  }

  // Running score corner badge — shown once we have a score
  const scoreBadge =
    myTotalScore !== null ? (
      <div className="fixed bottom-4 right-4 z-50 px-4 py-2 rounded-full bg-[#0a0523]/90 border border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.2)] backdrop-blur-sm">
        <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400/80 mb-0.5">
          Total
        </div>
        <div className="text-lg font-black text-white leading-none">
          {Math.round((myTotalScore ?? 0) * 100) / 100} pts
        </div>
      </div>
    ) : null;

  if (currentQuestion) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-[#0a0523] to-[#0d011c]">
        {scoreBadge}
        <header className="border-b border-indigo-900/50 bg-[#0a0523]/80 backdrop-blur sticky top-0 z-10 shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
          <div className="mx-auto max-w-2xl px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-indigo-300 uppercase tracking-wider font-semibold">
                  Room Code
                </div>
                <div className="text-2xl font-bold text-purple-400 drop-shadow-[0_0_5px_rgba(168,85,247,0.4)]">
                  {roomCode}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-indigo-300 uppercase tracking-wider font-semibold">
                  Your Name
                </div>
                <div className="text-lg font-semibold text-white">
                  {playerName}
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-2xl px-6 py-10">
          {sessionStatus && (
            <div className="mb-8 rounded-xl bg-indigo-950/30 border border-indigo-500/20 p-4 text-sm text-indigo-200 flex justify-between items-center backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-purple-500"></span>
                </span>
                <span className="capitalize">{sessionStatus.status}</span>
              </div>
              <div className="font-semibold">
                {sessionStatus.players.length} Players
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-indigo-500/20 bg-indigo-950/20 backdrop-blur-md shadow-[0_0_30px_rgba(139,92,246,0.1)] p-8 text-center relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-50"></div>

            <div className="text-xs text-indigo-300 uppercase tracking-wider font-semibold mb-3">
              Question {currentQuestionIndex + 1}
            </div>
            <h2 className="text-3xl font-bold text-white mb-6 leading-tight">
              {currentQuestion.Question_Text}
            </h2>
            {currentQuestion.Image_Link && (
              <div className="mb-6 rounded-xl overflow-hidden border border-indigo-500/20 bg-black/40 p-2 shadow-inner">
                <img
                  src={getImageUrl(currentQuestion.Image_Link)}
                  alt="Question"
                  className="mx-auto max-h-64 object-contain rounded-lg"
                />
              </div>
            )}

            {/* Timer countdown — shown during Stage 1 and Stage 2 */}
            {timerRemaining !== null && timerStatus !== "idle" && (
              <div className={`mb-4 px-4 py-2 rounded-xl text-center font-black text-2xl tabular-nums ${
                timerStatus === "paused" ? "text-yellow-400 bg-yellow-950/30 border border-yellow-500/20" :
                timerStatus === "ready"  ? "text-amber-400 bg-amber-950/30 border border-amber-500/20" :
                timerRemaining <= 10     ? "text-red-400 bg-red-950/30 border border-red-500/20 animate-pulse" :
                                           "text-white bg-indigo-950/30 border border-indigo-500/20"
              }`}>
                {timerStatus === "ready"  ? "Waiting for host..." :
                 timerStatus === "paused" ? `Paused — ${timerRemaining}s` :
                 `${timerRemaining}s`}
              </div>
            )}

            {/* Server rejection / timer error toast */}
            {timerError && (
              <div className="mb-4 rounded-xl border border-pink-500/40 bg-pink-950/30 px-4 py-2 text-sm font-bold text-pink-200 text-center">
                {timerError}
              </div>
            )}

            {/* Submit phase */}
            {phase === "submit" && (
              <div className="mt-8">
                <input
                  type="text"
                  placeholder="Your fake answer"
                  value={myFake}
                  onChange={(e) => setMyFake(e.target.value)}
                  disabled={stageLocked}
                  className={`w-full rounded-xl border border-indigo-500/30 bg-indigo-950/30 px-4 py-4 text-lg text-white outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 transition-all shadow-inner ${stageLocked ? "opacity-50 cursor-not-allowed" : ""}`}
                />
                <button
                  onClick={() => {
                    if (!myFake || stageLocked) return;
                    if (
                      wsRef.current &&
                      wsRef.current.readyState === WebSocket.OPEN
                    ) {
                      wsRef.current.send(
                        JSON.stringify({
                          type: "fake",
                          player: playerName,
                          text: myFake,
                        }),
                      );
                    }
                    setHasSubmitted(true); // stay in submit phase — allow re-editing
                  }}
                  disabled={!myFake || stageLocked}
                  className={`mt-6 w-full rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-4 text-lg font-bold text-white shadow-[0_0_15px_rgba(139,92,246,0.3)] hover:shadow-[0_0_25px_rgba(139,92,246,0.5)] hover:scale-[1.02] disabled:hover:scale-100 disabled:opacity-50 transition-all ${stageLocked ? "cursor-not-allowed" : ""}`}
                >
                  {hasSubmitted ? "Update Answer" : "Submit Fake"}
                </button>
                {hasSubmitted && !stageLocked && (
                  <div className="mt-3 text-sm text-emerald-400/80 text-center">
                    Answer submitted. You can update it until time runs out.
                  </div>
                )}
                {hasSubmitted && stageLocked && (
                  <div className="mt-3 text-sm text-amber-300/80 text-center">
                    {timerPaused
                      ? "Game paused by host."
                      : "Submissions closed. Waiting for host to show answers."}
                  </div>
                )}
              </div>
            )}

            {/* Waiting phase */}
            {phase === "waiting" && (
              <div className="mt-10 mb-4 flex flex-col items-center justify-center space-y-4">
                <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-purple-500 rounded-full animate-spin"></div>
                <div className="text-indigo-200 font-semibold tracking-wide">
                  Waiting for others
                  <span className="inline-block w-8 text-left">
                    {waitingDots}
                  </span>
                </div>
              </div>
            )}

            {/* Jury waiting phase */}
            {phase === "juryWaiting" && (
              <div className="mt-10 mb-4 flex flex-col items-center justify-center space-y-4">
                <div className="text-3xl mb-2">⚖</div>
                <div className="text-amber-200 font-bold tracking-wide text-lg">
                  Jury is deliberating{waitingDots}
                </div>
                <div className="text-sm text-indigo-300/60">
                  Hang tight while the jury makes their selection
                </div>
              </div>
            )}

            {/* Choose phase */}
            {phase === "choose" && (
              <div className="mt-8 space-y-4">
                {answers.map((ans, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      if (myChoice || stageLocked) return;
                      setMyChoice(ans);
                      if (
                        wsRef.current &&
                        wsRef.current.readyState === WebSocket.OPEN
                      ) {
                        wsRef.current.send(
                          JSON.stringify({
                            type: "choice",
                            player: playerName,
                            answer: ans,
                          }),
                        );
                      }
                    }}
                    disabled={!!myChoice || stageLocked}
                    className={`w-full rounded-xl border ${myChoice === ans ? "border-purple-500 bg-purple-900/40 shadow-[0_0_15px_rgba(168,85,247,0.3)]" : "border-indigo-500/30 bg-indigo-950/40 hover:bg-indigo-900/60 hover:border-purple-400"} px-6 py-4 text-lg font-semibold text-white transition-all disabled:opacity-70`}
                  >
                    {ans}
                  </button>
                ))}
                {myChoice && (
                  <div className="mt-4 flex flex-col items-center justify-center space-y-3">
                    <div className="w-8 h-8 border-4 border-indigo-500/30 border-t-purple-500 rounded-full animate-spin"></div>
                    <div className="text-sm text-indigo-300 font-medium">
                      Waiting for results{waitingDots}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Results phase */}
            {phase === "results" && correctAnswer !== null && (
              <div className="mt-8 text-left space-y-4">
                {/* Verdict */}
                {myChoice === correctAnswer ? (
                  <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/30 p-5 flex items-center gap-4 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                    <div className="text-3xl shrink-0">✓</div>
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-1">
                        Correct!
                      </div>
                      <div className="text-lg font-bold text-white">
                        {correctAnswer}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-pink-500/40 bg-pink-950/30 p-5 shadow-[0_0_15px_rgba(236,72,153,0.1)]">
                    <div className="text-xs font-bold uppercase tracking-wider text-pink-400 mb-2">
                      Incorrect
                    </div>
                    <div className="text-sm text-pink-200/80 mb-2">
                      You chose:{" "}
                      <span className="font-bold text-white">{myChoice}</span>
                    </div>
                    <div className="text-sm text-emerald-300/80">
                      Correct answer:{" "}
                      <span className="font-bold text-emerald-300">
                        {correctAnswer}
                      </span>
                    </div>
                  </div>
                )}

                {/* Round breakdown — appears after round_scores arrives */}
                {myRoundBreakdown && (
                  <div className="rounded-xl border border-indigo-500/20 bg-indigo-950/30 p-5">
                    <div className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-3">
                      This Round
                    </div>
                    <div className="space-y-2">
                      {myRoundBreakdown.correct_pts >= 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-indigo-200">Correct guess</span>
                          <span className="font-bold text-emerald-400">
                            {fmtPts(myRoundBreakdown.correct_pts) || 0}
                          </span>
                        </div>
                      )}
                      {myRoundBreakdown.fool_pts >= 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-indigo-200">
                            Players fooled by your fake
                          </span>
                          <span className="font-bold text-indigo-300">
                            {fmtPts(myRoundBreakdown.fool_pts) || 0}
                          </span>
                        </div>
                      )}
                      {myRoundBreakdown.jury_best_pts >= 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-indigo-200">
                            Jury best fake
                          </span>
                          <span className="font-bold text-amber-400">
                            {fmtPts(myRoundBreakdown.jury_best_pts) || 0}
                          </span>
                        </div>
                      )}
                      {myRoundBreakdown.jury_worst_pts >= 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-indigo-200">
                            Jury worst fake penalty
                          </span>
                          <span className="font-bold text-pink-400">
                            {fmtPts(-myRoundBreakdown.jury_worst_pts) || 0}
                          </span>
                        </div>
                      )}
                      <div className="pt-2 border-t border-indigo-500/20 flex justify-between text-sm font-bold">
                        <span className="text-white">Round total</span>
                        <span
                          className={`${(myRoundBreakdown.round_total ?? 0) >= 0 ? "text-emerald-400" : "text-pink-400"}`}
                        >
                          {fmtPts(myRoundBreakdown.round_total) || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Waiting for jury / host to advance — if no breakdown yet */}
                {!myRoundBreakdown && (
                  <div className="flex items-center justify-center gap-3 py-4">
                    <div className="w-5 h-5 border-2 border-indigo-500/30 border-t-purple-500 rounded-full animate-spin"></div>
                    <div className="text-sm text-indigo-300/60">
                      Waiting for jury{waitingDots}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  // Pre-game waiting screen
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-[#0a0523] to-[#0d011c]">
      {scoreBadge}
      <header className="border-b border-indigo-900/50 bg-[#0a0523]/80 backdrop-blur sticky top-0 z-10 shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
        <div className="mx-auto max-w-2xl px-6 py-4">
          <div className="grid grid-cols-3 items-center">
            <div>
              <div className="text-xs text-indigo-300 uppercase tracking-wider font-semibold">
                Room Code
              </div>
              <div className="text-2xl font-bold text-purple-400 drop-shadow-[0_0_5px_rgba(168,85,247,0.4)]">
                {roomCode}
              </div>
            </div>
            <div className="flex justify-center">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 p-[2px] shadow-md">
                <div className="h-full w-full rounded-full bg-[#0a0523] overflow-hidden flex items-center justify-center text-white text-sm font-bold">
                  {showPlayerAvatar ? (
                    <img
                      src={resolvedAvatarUrl}
                      alt={`${playerName} avatar`}
                      className="h-full w-full object-cover"
                      onError={() => setAvatarLoadError(true)}
                    />
                  ) : (
                    playerName?.charAt(0).toUpperCase() || "?"
                  )}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-indigo-300 uppercase tracking-wider font-semibold">
                Your Name
              </div>
              <div className="text-lg font-semibold text-white">
                {playerName}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-10">
        {error && (
          <div className="mb-6 rounded-lg border border-pink-500/40 bg-pink-950/40 p-4 text-sm text-pink-200">
            {error}
          </div>
        )}

        <div className="rounded-2xl border border-indigo-500/20 bg-indigo-950/20 backdrop-blur-md shadow-[0_0_30px_rgba(139,92,246,0.1)] p-12 text-center relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-50"></div>

          <div className="w-16 h-16 border-4 border-indigo-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-6"></div>

          <h2 className="text-3xl font-bold text-white mb-2 tracking-wide">
            Waiting for host
            <span className="inline-block w-6 text-left">{waitingDots}</span>
          </h2>
          <div className="text-sm text-indigo-200/70 uppercase tracking-widest font-semibold">
            Questions Coming Soon
          </div>

          {/* {sessionStatus && (
            <div className="mt-8 rounded-xl bg-indigo-950/30 border border-indigo-500/20 p-4 text-sm text-indigo-200 flex justify-between items-center w-full max-w-xs mx-auto">
              <span className="capitalize">{sessionStatus.status}</span>
              <div className="font-semibold text-white">{sessionStatus.players.length} Players</div>
            </div>
          )} */}

          <div className="mt-8 pt-6 border-t border-indigo-500/10">
            <div className="inline-block">
              {/* <div className="text-xs text-indigo-400/60 uppercase tracking-wider font-semibold mb-2">
                Connection
              </div> */}
              <div className="flex items-center justify-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  {wsConnected ? (
                    <>
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-purple-500"></span>
                    </>
                  ) : (
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-pink-500"></span>
                  )}
                </span>
                <span className="text-white font-medium">
                  {wsConnected ? "Connected" : "Reconnecting..."}
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
