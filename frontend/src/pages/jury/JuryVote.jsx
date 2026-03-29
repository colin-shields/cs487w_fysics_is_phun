/**
 * JuryVote.jsx
 * Jury voting page.
 *
 * Goal:
 * - Connect to the session WebSocket
 * - React to more WS message types so jurors aren't stuck on one screen
 * - Allow voting only during jury_phase
 * - After voting, show a clear "submitted" state and keep juror informed as game progresses
 *
 * Expected WS message types (mirrors PlayerGame patterns):
 * - jury_phase: { fakes: [{player,text}], enable_worst_fake: bool }
 * - question:   { index, question }
 * - results:    { correct: string }
 * - round_scores: { scores: {name: number}, breakdown: {...} }  (optional)
 * - game_finished
 * - cancelled
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { buildWsUrl, httpGet } from "../../api/httpClient";

export default function JuryVote() {
  const location = useLocation();
  const navigate = useNavigate();
  const { roomCode, jurorName } = location.state || {};

  const wsRef = useRef(null);

  // phases: waiting | voting | submitted | results | finished | cancelled
  const [phase, setPhase] = useState("waiting");

  const [wsConnected, setWsConnected] = useState(false);

  // Data from WS
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(null);

  const [answers, setAnswers] = useState([]); // fakes only (jury_phase)
  const [enableWorstFake, setEnableWorstFake] = useState(false);

  const [correctAnswer, setCorrectAnswer] = useState(null);
  const [scoreSnapshot, setScoreSnapshot] = useState(null); // optional
  const [playerAvatars, setPlayerAvatars] = useState({});

  // Vote state
  const [bestSelectedPlayer, setBestSelectedPlayer] = useState(null);
  const [worstSelectedPlayer, setWorstSelectedPlayer] = useState(null);
  const [submitStatus, setSubmitStatus] = useState("");
  const [revealBestIdentity, setRevealBestIdentity] = useState(false);
  const [revealWorstIdentity, setRevealWorstIdentity] = useState(false);

  // animated dots (small UX improvement)
  const [waitingDotCount, setWaitingDotCount] = useState(1);
  useEffect(() => {
    const interval = setInterval(() => {
      setWaitingDotCount((prev) => (prev % 3) + 1);
    }, 450);
    return () => clearInterval(interval);
  }, []);
  const waitingDots = useMemo(() => [".", "..", "..."][waitingDotCount - 1], [waitingDotCount]);

  async function refreshPlayerAvatars(code) {
    const res = await httpGet(`/session-status/${String(code || "").toUpperCase()}`);
    if (!res?.ok) return;
    const avatars = res?.data?.player_avatars;
    setPlayerAvatars(avatars && typeof avatars === "object" ? avatars : {});
  }

  // Guard: redirect to /jury if no session state
  useEffect(() => {
    if (!roomCode || !jurorName) {
      navigate("/jury", { replace: true });
    }
  }, [roomCode, jurorName, navigate]);

  useEffect(() => {
    if (!roomCode) return;
    refreshPlayerAvatars(roomCode);
  }, [roomCode]);

  // WS connection
  useEffect(() => {
    if (!roomCode) return;

    const ws = new WebSocket(buildWsUrl(`/ws/session/${roomCode}`));
    wsRef.current = ws;

    ws.onopen = () => setWsConnected(true);
    ws.onclose = () => setWsConnected(false);

    ws.onerror = (e) => {
      console.error("Jury ws error", e);
    };

    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data);

        // 1) Jury voting phase
        if (msg.type === "jury_phase") {
          const fakes = (msg.fakes || []).map((f, i) => ({
            id: `${f.player}-${i}`,
            player: f.player,
            text: f.text,
          }));

          setAnswers(fakes);
          setEnableWorstFake(Boolean(msg.enable_worst_fake));

          // reset vote state
          setBestSelectedPlayer(null);
          setWorstSelectedPlayer(null);
          setSubmitStatus("");

          // clear old round context
          setCorrectAnswer(null);
          setScoreSnapshot(null);

          refreshPlayerAvatars(roomCode);
          setPhase("voting");
          return;
        }

        // 2) New question started (jury waits)
        if (msg.type === "question") {
          setCurrentQuestionIndex(msg.index ?? null);
          setCurrentQuestion(msg.question ?? null);

          // As soon as a new question begins, jury isn't voting yet.
          setAnswers([]);
          setEnableWorstFake(false);
          setBestSelectedPlayer(null);
          setWorstSelectedPlayer(null);
          setSubmitStatus("");

          setCorrectAnswer(null);
          setScoreSnapshot(null);

          setPhase("waiting");
          return;
        }

        // 3) Results revealed (jury can see correct answer too)
        if (msg.type === "results") {
          setCorrectAnswer(msg.correct ?? "");
          setPhase("waiting");
          return;
        }

        // 4) Round scores posted
        if (msg.type === "round_scores") {
          setScoreSnapshot({
            scores: msg.scores || null,
            breakdown: msg.breakdown || null,
          });
          setPhase("results");
          return;
        }

        // 5) Session cancelled / finished
        if (msg.type === "cancelled") {
          setPhase("cancelled");
          return;
        }
        if (msg.type === "game_finished") {
          setPhase("finished");
          return;
        }

        // Timer/stage messages — passive handling for future Stage 3 timer support
        if (msg.type === "timer_update") {
          // Future: display a countdown during jury phase when a jury timer is added
          return;
        }
        if (msg.type === "stage_ready") {
          // Future: handle jury stage_ready when Stage 3 is timed
          return;
        }
        if (msg.type === "stage_transition") {
          // Future: react to stage transitions (e.g., timer starts for jury phase)
          return;
        }

        // Ignore other message types
      } catch {
        // ignore parse errors
      }
    };

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [roomCode]);

  useEffect(() => {
    if (phase !== "submitted") return;

    setRevealBestIdentity(false);
    setRevealWorstIdentity(false);

    const bestTimer = setTimeout(() => {
      setRevealBestIdentity(true);
    }, 900);

    let worstTimer = null;
    if (enableWorstFake && worstSelectedPlayer) {
      worstTimer = setTimeout(() => {
        setRevealWorstIdentity(true);
      }, 1800);
    }

    return () => {
      clearTimeout(bestTimer);
      if (worstTimer) clearTimeout(worstTimer);
    };
  }, [phase, enableWorstFake, worstSelectedPlayer]);

  function submitVote() {
    if (phase !== "voting") return;

    if (!bestSelectedPlayer) {
      setSubmitStatus("Select a Best Fake before submitting.");
      return;
    }

    if (enableWorstFake && worstSelectedPlayer && worstSelectedPlayer === bestSelectedPlayer) {
      setSubmitStatus("Worst Fake cannot be the same as Best Fake.");
      return;
    }

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "jury_vote",
          juror_name: jurorName,
          best_fake_player: bestSelectedPlayer,
          worst_fake_player: enableWorstFake ? worstSelectedPlayer : null,
        })
      );

      setPhase("submitted");
      setSubmitStatus(
        `Best Fake submitted!` +
          (enableWorstFake && worstSelectedPlayer ? ` Worst Fake submitted too.` : "")
      );
    } else {
      setSubmitStatus("Not connected to session. Please refresh.");
    }
  }

  const bestText = useMemo(() => {
    if (!bestSelectedPlayer) return null;
    return answers.find((a) => a.player === bestSelectedPlayer)?.text ?? null;
  }, [answers, bestSelectedPlayer]);

  const worstText = useMemo(() => {
    if (!worstSelectedPlayer) return null;
    return answers.find((a) => a.player === worstSelectedPlayer)?.text ?? null;
  }, [answers, worstSelectedPlayer]);

  const bestAvatarUrl = useMemo(() => {
    if (!bestSelectedPlayer) return "";
    return playerAvatars?.[bestSelectedPlayer] || "";
  }, [playerAvatars, bestSelectedPlayer]);

  const worstAvatarUrl = useMemo(() => {
    if (!worstSelectedPlayer) return "";
    return playerAvatars?.[worstSelectedPlayer] || "";
  }, [playerAvatars, worstSelectedPlayer]);

  const bestInitials = useMemo(() => {
    if (!bestSelectedPlayer) return "?";
    const words = String(bestSelectedPlayer).trim().split(/\s+/).filter(Boolean);
    return words.slice(0, 2).map((w) => w[0]?.toUpperCase() || "").join("") || "?";
  }, [bestSelectedPlayer]);

  const worstInitials = useMemo(() => {
    if (!worstSelectedPlayer) return "?";
    const words = String(worstSelectedPlayer).trim().split(/\s+/).filter(Boolean);
    return words.slice(0, 2).map((w) => w[0]?.toUpperCase() || "").join("") || "?";
  }, [worstSelectedPlayer]);

  const leaderboardTop = useMemo(() => {
    const scores = scoreSnapshot?.scores;
    if (!scores || typeof scores !== "object") return [];
    return Object.entries(scores)
      .map(([name, score]) => ({ name, score }))
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .slice(0, 5);
  }, [scoreSnapshot]);

  if (!roomCode || !jurorName) return null;

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050114] text-white flex flex-col">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-950 via-[#0a0523] to-[#050114]"></div>
      <div className="pointer-events-none absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-600/10 blur-[120px]"></div>
      <div className="pointer-events-none absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-600/10 blur-[120px]"></div>

      {/* Header */}
      <header className="relative z-40 border-b border-indigo-500/20 bg-[#0a0523]/80 backdrop-blur-md shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-indigo-400/80 mb-0.5">
              Jury View
            </div>
            <div className="font-bold text-white text-lg tracking-wide bg-gradient-to-r from-emerald-200 to-teal-200 bg-clip-text text-transparent">
              Jury Voting
            </div>
          </div>

          <div className="flex items-center gap-5">
            {/* Identity + connection */}
            <div className="text-right hidden sm:block">
              <div className="text-xs text-indigo-300 uppercase tracking-wider font-semibold">
                Juror
              </div>
              <div className="text-base font-semibold text-white">{jurorName}</div>
            </div>

            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                {wsConnected ? (
                  <>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </>
                ) : (
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-pink-500"></span>
                )}
              </span>
              <span className="text-xs font-medium text-indigo-300/70">
                {wsConnected ? "Connected" : "Disconnected"}
              </span>
            </div>

            <button
              type="button"
              onClick={() => navigate("/jury")}
              className="text-sm font-semibold text-indigo-300 hover:text-white transition-colors underline underline-offset-4"
            >
              Leave
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-5xl px-4 py-8 space-y-6 flex-grow">
        {/* Room badge */}
        <div className="flex items-center gap-3">
          <div className="text-xs font-bold uppercase tracking-wider text-indigo-400">Room</div>
          <div className="font-black text-emerald-400 tracking-widest text-sm">{roomCode}</div>
        </div>

        {/* CANCELLED */}
        {phase === "cancelled" && (
          <section className="rounded-2xl border border-pink-500/30 bg-pink-950/20 p-16 text-center backdrop-blur-md shadow-inner">
            <div className="text-4xl mb-4">✖</div>
            <div className="text-2xl font-black text-white mb-3">Session Cancelled</div>
            <div className="text-sm text-pink-200/80 mb-8">
              The host cancelled the session.
            </div>
            <button
              type="button"
              onClick={() => navigate("/jury")}
              className="w-full max-w-sm mx-auto rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 text-base font-bold text-white hover:scale-[1.02] transition-all"
            >
              Return
            </button>
          </section>
        )}

        {/* FINISHED */}
        {phase === "finished" && (
          <section className="rounded-2xl border border-purple-500/30 bg-purple-950/20 p-16 text-center backdrop-blur-md shadow-inner">
            <div className="text-4xl mb-4">🎉</div>
            <div className="text-2xl font-black text-white mb-3">Game Finished</div>
            <div className="text-sm text-indigo-300/70 mb-8">
              Thanks for serving on the jury!
            </div>
            <button
              type="button"
              onClick={() => navigate("/jury")}
              className="w-full max-w-sm mx-auto rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 text-base font-bold text-white hover:scale-[1.02] transition-all"
            >
              Return
            </button>
          </section>
        )}

        {/* WAITING */}
        {phase === "waiting" && (
          <section className="rounded-2xl border border-indigo-500/20 bg-indigo-950/30 p-16 text-center backdrop-blur-md shadow-inner">
            <div className="text-4xl mb-6">⚖</div>
            <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto mb-6"></div>
            <div className="text-lg font-bold text-white mb-2">
              Waiting for jury phase{waitingDots}
            </div>
            <div className="text-sm text-indigo-300/60">
              {wsConnected
                ? "Connected — voting opens when the host starts jury voting."
                : "Not connected. Check your room code."}
            </div>

            {currentQuestion && (
              <div className="mt-8 mx-auto max-w-2xl rounded-xl border border-indigo-500/20 bg-[#0a0523]/70 p-5 text-left">
                <div className="text-xs font-bold uppercase tracking-widest text-indigo-400/80 mb-2">
                  Current Question{typeof currentQuestionIndex === "number" ? ` #${currentQuestionIndex + 1}` : ""}
                </div>
                <div className="text-base font-semibold text-white">
                  {currentQuestion.Question_Text ?? "(Question text unavailable)"}
                </div>
                <div className="mt-2 text-xs text-indigo-300/60">
                  You'll vote after players submit answers and the host enters jury voting.
                </div>
              </div>
            )}

            {correctAnswer !== null && (
              <div className="mt-8 rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-5">
                <div className="text-xs font-bold uppercase tracking-widest text-emerald-300/70">
                  Correct Answer
                </div>
                <div className="mt-2 text-lg font-bold text-white whitespace-pre-wrap">
                  {correctAnswer || "(not provided)"}
                </div>
              </div>
            )}
          </section>
        )}

        {/* SUBMITTED */}
        {phase === "submitted" && (
          <section className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-12 backdrop-blur-md shadow-inner">
            <div className="text-center">
              <div className="text-4xl mb-4">✓</div>
              <div className="text-2xl font-black text-white mb-3">Vote Submitted!</div>
              <div className="text-sm text-emerald-200/80 mb-8">{submitStatus}</div>
            </div>

            <div className="mx-auto max-w-3xl space-y-4">
              <div className="rounded-xl border border-indigo-500/20 bg-[#0a0523]/70 p-5 overflow-hidden">
                <div className="text-xs font-bold uppercase tracking-widest text-indigo-300/70 mb-2">
                  Best Fake Reveal
                </div>
                <div className="text-sm font-semibold text-white whitespace-pre-wrap">
                  {bestText || "(not available)"}
                </div>

                <div className="relative mt-4 min-h-[90px]">
                  <div
                    className={`absolute inset-0 flex items-center gap-3 rounded-xl border border-indigo-500/20 bg-indigo-950/30 px-4 py-3 transition-all duration-[1400ms] ease-out ${
                      revealBestIdentity
                        ? "opacity-0 blur-sm scale-[0.98]"
                        : "opacity-100 blur-0 scale-100"
                    }`}
                  >
                    <div className="h-12 w-12 rounded-full border border-indigo-400/40 bg-indigo-900/70 flex items-center justify-center text-lg font-black text-indigo-200">
                      ?
                    </div>
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-[0.18em] text-indigo-300/70">
                        Identity
                      </div>
                      <div className="text-base font-bold text-white">Anonymous</div>
                    </div>
                  </div>

                  <div
                    className={`absolute inset-0 flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-950/25 px-4 py-3 transition-all duration-[1400ms] ease-out ${
                      revealBestIdentity
                        ? "opacity-100 blur-0 scale-100"
                        : "opacity-0 blur-sm scale-[0.98]"
                    }`}
                  >
                    {bestAvatarUrl ? (
                      <img
                        src={bestAvatarUrl}
                        alt={bestSelectedPlayer || "Player"}
                        className="h-12 w-12 rounded-full border border-emerald-300/40 object-cover"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-full border border-emerald-300/40 bg-emerald-900/60 flex items-center justify-center text-sm font-black text-emerald-100">
                        {bestInitials}
                      </div>
                    )}
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-300/80">
                        Revealed
                      </div>
                      <div className="text-base font-bold text-white">
                        {bestSelectedPlayer || "(player unavailable)"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {enableWorstFake && worstText && (
                <div className="rounded-xl border border-pink-500/20 bg-[#0a0523]/70 p-5 overflow-hidden">
                  <div className="text-xs font-bold uppercase tracking-widest text-pink-300/70 mb-2">
                    Worst Fake Reveal
                  </div>
                  <div className="text-sm font-semibold text-white whitespace-pre-wrap">
                    {worstText}
                  </div>

                  <div className="relative mt-4 min-h-[90px]">
                    <div
                      className={`absolute inset-0 flex items-center gap-3 rounded-xl border border-pink-500/20 bg-pink-950/20 px-4 py-3 transition-all duration-[1400ms] ease-out ${
                        revealWorstIdentity
                          ? "opacity-0 blur-sm scale-[0.98]"
                          : "opacity-100 blur-0 scale-100"
                      }`}
                    >
                      <div className="h-12 w-12 rounded-full border border-pink-300/40 bg-pink-900/60 flex items-center justify-center text-lg font-black text-pink-100">
                        ?
                      </div>
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-[0.18em] text-pink-300/70">
                          Identity
                        </div>
                        <div className="text-base font-bold text-white">Anonymous</div>
                      </div>
                    </div>

                    <div
                      className={`absolute inset-0 flex items-center gap-3 rounded-xl border border-pink-500/30 bg-pink-950/30 px-4 py-3 transition-all duration-[1400ms] ease-out ${
                        revealWorstIdentity
                          ? "opacity-100 blur-0 scale-100"
                          : "opacity-0 blur-sm scale-[0.98]"
                      }`}
                    >
                      {worstAvatarUrl ? (
                        <img
                          src={worstAvatarUrl}
                          alt={worstSelectedPlayer || "Player"}
                          className="h-12 w-12 rounded-full border border-pink-300/40 object-cover"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-full border border-pink-300/40 bg-pink-900/60 flex items-center justify-center text-sm font-black text-pink-100">
                          {worstInitials}
                        </div>
                      )}
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-[0.18em] text-pink-300/80">
                          Revealed
                        </div>
                        <div className="text-base font-bold text-white">
                          {worstSelectedPlayer || "(player unavailable)"}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-6 flex items-center justify-center gap-3">
                <div className="w-5 h-5 border-2 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin"></div>
                <span className="text-sm text-indigo-300/60">Waiting for host to advance{waitingDots}</span>
              </div>
            </div>
          </section>
        )}

        {/* RESULTS */}
        {phase === "results" && (
          <section className="rounded-2xl border border-indigo-500/20 bg-indigo-950/30 p-10 backdrop-blur-md shadow-inner">
            <div className="text-center">
              <div className="text-3xl mb-4">📣</div>
              <div className="text-2xl font-black text-white">Round Results</div>
              <div className="mt-2 text-sm text-indigo-300/60">
                Waiting for the next round{waitingDots}
              </div>
            </div>



            {(bestText || worstText) && (
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {bestText && (
                  <div className="rounded-xl border border-indigo-500/20 bg-[#0a0523]/70 p-4">
                    <div className="text-xs font-bold uppercase tracking-widest text-indigo-300/70">
                      Your Best Fake Pick
                    </div>
                    <div className="mt-2 text-sm font-semibold text-white whitespace-pre-wrap">
                      {bestText}
                    </div>
                  </div>
                )}
                {enableWorstFake && (
                  <div className="rounded-xl border border-pink-500/20 bg-[#0a0523]/70 p-4">
                    <div className="text-xs font-bold uppercase tracking-widest text-pink-300/70">
                      Your Worst Fake Pick
                    </div>
                    <div className="mt-2 text-sm font-semibold text-white whitespace-pre-wrap">
                      {worstText || "(none)"}
                    </div>
                  </div>
                )}
              </div>
            )}

            {leaderboardTop.length > 0 && (
              <div className="mt-8 rounded-xl border border-indigo-500/20 bg-[#0a0523]/70 p-5">
                <div className="text-xs font-bold uppercase tracking-widest text-indigo-300/70 mb-3">
                  Top Scores
                </div>
                <div className="space-y-2">
                  {leaderboardTop.map((p, i) => (
                    <div
                      key={p.name}
                      className="flex items-center justify-between rounded-lg bg-slate-800/40 px-4 py-2"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-7 w-7 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold">
                          {i + 1}
                        </div>
                        <div className="text-sm font-semibold text-slate-100">{p.name}</div>
                      </div>
                      <div className="text-sm font-bold text-emerald-300">
                        {Math.round((p.score ?? 0) * 100) / 100}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* VOTING */}
        {phase === "voting" && (
          <>
            {/* Best Fake */}
            <section className="rounded-2xl border border-indigo-500/20 bg-indigo-950/30 p-8 backdrop-blur-md shadow-inner">
              <div className="mb-6 border-b border-indigo-500/20 pb-4">
                <h2 className="text-xl font-bold text-white tracking-wide">Select Best Fake</h2>
                <p className="mt-1 text-sm font-medium text-indigo-300">
                  Which answer most convincingly faked the correct answer?
                </p>
              </div>

              <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
                {answers.map((answer) => {
                  const selected = bestSelectedPlayer === answer.player;
                  return (
                    <button
                      key={answer.id}
                      type="button"
                      onClick={() => setBestSelectedPlayer(answer.player)}
                      className={`aspect-square rounded-full border-2 p-6 text-center transition-all duration-300 transform hover:-translate-y-2 group shadow-lg ${
                        selected
                          ? "border-emerald-400 bg-gradient-to-b from-emerald-500/20 to-teal-900/40 shadow-[0_0_30px_rgba(52,211,153,0.3)] ring-4 ring-emerald-500/20"
                          : "border-indigo-500/30 bg-[#0a0523]/80 hover:border-purple-400/80 hover:bg-indigo-900/40 hover:shadow-[0_0_20px_rgba(168,85,247,0.2)]"
                      }`}
                    >
                      <div className="flex h-full flex-col items-center justify-center">
                        <div
                          className={`text-[10px] font-black uppercase tracking-[0.2em] mb-3 ${
                            selected
                              ? "text-emerald-300"
                              : "text-indigo-400 group-hover:text-purple-300"
                          }`}
                        >
                          Anonymous
                        </div>
                        <div
                          className={`line-clamp-4 text-sm font-bold leading-relaxed break-words px-2 ${
                            selected ? "text-white drop-shadow-md" : "text-indigo-100"
                          }`}
                        >
                          {answer.text}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Worst Fake */}
            {enableWorstFake && (
              <section className="rounded-2xl border border-pink-500/20 bg-pink-950/10 p-8 backdrop-blur-md shadow-inner">
                <div className="mb-6 border-b border-pink-500/20 pb-4">
                  <h2 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
                    <span className="text-pink-400">✗</span> Select Worst Fake
                    <span className="text-xs font-medium text-indigo-400/60 ml-1">(optional)</span>
                  </h2>
                  <p className="mt-1 text-sm font-medium text-indigo-300">
                    Which answer was the least convincing?
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
                  {answers
                    .filter((a) => a.player !== bestSelectedPlayer)
                    .map((answer) => {
                      const selected = worstSelectedPlayer === answer.player;
                      return (
                        <button
                          key={answer.id}
                          type="button"
                          onClick={() => setWorstSelectedPlayer(selected ? null : answer.player)}
                          className={`aspect-square rounded-full border-2 p-6 text-center transition-all duration-300 transform hover:-translate-y-2 group shadow-lg ${
                            selected
                              ? "border-pink-400 bg-gradient-to-b from-pink-500/20 to-rose-900/40 shadow-[0_0_30px_rgba(236,72,153,0.3)] ring-4 ring-pink-500/20"
                              : "border-pink-500/20 bg-[#0a0523]/80 hover:border-pink-400/80 hover:bg-pink-900/20"
                          }`}
                        >
                          <div className="flex h-full flex-col items-center justify-center">
                            <div
                              className={`text-[10px] font-black uppercase tracking-[0.2em] mb-3 ${
                                selected
                                  ? "text-pink-300"
                                  : "text-pink-400/60 group-hover:text-pink-300"
                              }`}
                            >
                              Anonymous
                            </div>
                            <div
                              className={`line-clamp-4 text-sm font-bold leading-relaxed break-words px-2 ${
                                selected ? "text-white drop-shadow-md" : "text-indigo-100/70"
                              }`}
                            >
                              {answer.text}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                </div>

                {worstSelectedPlayer && (
                  <button
                    type="button"
                    onClick={() => setWorstSelectedPlayer(null)}
                    className="mt-4 text-xs font-medium text-pink-400/60 hover:text-pink-300 underline underline-offset-4 transition-colors"
                  >
                    Clear worst fake selection
                  </button>
                )}
              </section>
            )}

            {/* Submit */}
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={submitVote}
                disabled={!bestSelectedPlayer}
                className="w-full rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 px-6 py-4 text-base font-bold text-white shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] hover:scale-[1.02] active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100 transition-all"
              >
                Submit Final Vote
              </button>

              {submitStatus && (
                <div className="rounded-xl border border-pink-500/40 bg-pink-950/40 p-3 text-sm font-bold text-pink-200 flex items-center gap-2">
                  ⚠ {submitStatus}
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}