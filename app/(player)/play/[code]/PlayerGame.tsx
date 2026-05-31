"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Pusher from "pusher-js";
import { CHANNEL, EVENTS } from "@/lib/pusher-shared";
import type { RoomWithDetails, GamePhase, SubmissionWithTeam } from "@/types";
import Confetti from "@/components/Confetti";

interface PlayerInfo {
  playerId: string;
  teamId: string;
  playerName: string;
}

interface TeamScore {
  id: string; name: string; color: string; emoji: string; score: number;
}

export default function PlayerGame({ room: initial }: { room: RoomWithDetails }) {
  const [room] = useState(initial);
  const [phase, setPhase] = useState<GamePhase | "LOBBY">(initial.status === "LOBBY" ? "LOBBY" : (initial.current_phase as GamePhase ?? "WATCHING"));
  const [clipIndex, setClipIndex] = useState(initial.current_clip_index);
  const [clipId, setClipId] = useState<string | null>(initial.quiz.clips[initial.current_clip_index]?.id ?? null);
  const [answer, setAnswer] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(initial.submission_timer_secs);
  const [timerActive, setTimerActive] = useState(false);
  const [submissions, setSubmissions] = useState<SubmissionWithTeam[]>([]);
  const [teamScores, setTeamScores] = useState<TeamScore[]>(initial.teams.map((t) => ({ id: t.id, name: t.name, color: t.color, emoji: t.emoji, score: t.score })));
  const [winnerTeamIds, setWinnerTeamIds] = useState<string[]>([]);
  const [gameOver, setGameOver] = useState(false);
  const [finalScores, setFinalScores] = useState<TeamScore[]>([]);
  const [showConfetti, setShowConfetti] = useState(false);
  const [playerInfo, setPlayerInfo] = useState<PlayerInfo | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const router = useRouter();

  useEffect(() => {
    const stored = sessionStorage.getItem("wn_player");
    if (stored) setPlayerInfo(JSON.parse(stored));
  }, []);

  function handleLeave() {
    sessionStorage.removeItem("wn_player");
    router.push("/");
  }

  function handleSwitchTeam() {
    sessionStorage.removeItem("wn_player");
    router.push(`/join/${room.code}`);
  }

  const myTeam = playerInfo ? room.teams.find((t) => t.id === playerInfo.teamId) : null;

  useEffect(() => {
    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
      channelAuthorization: { endpoint: "/api/pusher/auth", transport: "ajax" },
    });
    const channel = pusher.subscribe(CHANNEL(room.code));

    channel.bind(EVENTS.GAME_STARTED, () => {
      setPhase("WATCHING");
    });

    channel.bind(EVENTS.PHASE_CHANGED, (data: { phase: GamePhase; clip_index?: number; clip?: { id: string }; timer_secs?: number }) => {
      setPhase(data.phase);
      if (data.clip_index !== undefined) setClipIndex(data.clip_index);
      if (data.clip?.id) setClipId(data.clip.id);
      if (data.phase === "SUBMITTING") {
        setAnswer("");
        setSubmitted(false);
        setWinnerTeamIds([]);
        const secs = data.timer_secs ?? initial.submission_timer_secs;
        setTimeLeft(secs);
        setTimerActive(true);
      } else {
        setTimerActive(false);
      }
      if (data.phase === "WATCHING") {
        setSubmissions([]);
      }
    });

    channel.bind(EVENTS.ANSWERS_REVEALED, (data: { submissions: SubmissionWithTeam[] }) => {
      setSubmissions(data.submissions);
    });

    channel.bind(EVENTS.WINNERS_AWARDED, (data: { winner_team_ids: string[]; teams: TeamScore[] }) => {
      setWinnerTeamIds(data.winner_team_ids);
      setTeamScores(data.teams);
      if (playerInfo && data.winner_team_ids.includes(playerInfo.teamId)) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 5000);
      }
    });

    channel.bind(EVENTS.GAME_ENDED, (data: { final_scores: TeamScore[] }) => {
      setGameOver(true);
      setFinalScores(data.final_scores);
      setTimerActive(false);
      if (playerInfo) {
        const myFinalTeam = data.final_scores.find((t) => t.id === playerInfo.teamId);
        const sorted = [...data.final_scores].sort((a, b) => b.score - a.score);
        if (sorted[0]?.id === playerInfo.teamId) {
          setShowConfetti(true);
        }
      }
    });

    return () => pusher.disconnect();
  }, [room.code, initial.submission_timer_secs, playerInfo]);

  // Countdown
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (!timerActive) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { clearInterval(timerRef.current!); setTimerActive(false); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timerActive]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!answer.trim() || !clipId || !playerInfo || submitted) return;
    setSubmitting(true);
    await fetch("/api/submissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomCode: room.code, teamId: playerInfo.teamId, clipId, answer }),
    });
    setSubmitted(true);
    setSubmitting(false);
  }

  const currentClip = room.quiz.clips[clipIndex];
  const mySubmission = playerInfo ? submissions.find((s) => s.team_id === playerInfo.teamId) : null;
  const iWon = playerInfo && winnerTeamIds.includes(playerInfo.teamId);

  // ── LOBBY ──
  if (phase === "LOBBY") {
    return (
      <PhaseWrapper color={myTeam?.color ?? "#ff5733"}>
        <div className="text-6xl mb-4">⏳</div>
        <h2 className="text-3xl font-bold mb-2" style={{ fontFamily: "var(--font-fredoka), Fredoka, sans-serif" }}>
          Get Ready!
        </h2>
        <p style={{ color: "rgba(255,255,255,0.6)", fontFamily: "var(--font-nunito)" }}>Waiting for the host to start...</p>
        {myTeam && (
          <div className="px-6 py-3 rounded-full text-lg font-bold" style={{ background: `${myTeam.color}20`, border: `2px solid ${myTeam.color}`, color: myTeam.color, fontFamily: "var(--font-fredoka), Fredoka, sans-serif" }}>
            {myTeam.emoji} {myTeam.name}
          </div>
        )}
        <div className="flex gap-2 mt-2 w-full">
          <button onClick={handleSwitchTeam} className="btn-ghost flex-1 justify-center py-2 text-sm">
            ✏️ Switch Team / Name
          </button>
          <button onClick={handleLeave} className="btn-ghost flex-1 justify-center py-2 text-sm" style={{ color: "rgba(255,100,100,0.8)" }}>
            🚪 Leave
          </button>
        </div>
      </PhaseWrapper>
    );
  }

  // ── GAME OVER ──
  if (gameOver) {
    const sorted = [...finalScores].sort((a, b) => b.score - a.score);
    const myRank = sorted.findIndex((t) => t.id === playerInfo?.teamId);
    const won = myRank === 0;
    return (
      <PhaseWrapper color={won ? "#ffd93d" : myTeam?.color ?? "#ff5733"}>
        {showConfetti && <Confetti />}
        <div className="text-6xl mb-3">{won ? "🏆" : myRank === 1 ? "🥈" : myRank === 2 ? "🥉" : "🎮"}</div>
        <h2 className="text-4xl font-bold mb-2" style={{ fontFamily: "var(--font-fredoka), Fredoka, sans-serif" }}>
          {won ? "You Won!!! 🎉" : "Game Over!"}
        </h2>
        <div className="flex flex-col gap-2 w-full mt-4">
          {sorted.map((t, i) => (
            <div key={t.id} className="flex items-center gap-3 glass rounded-xl px-4 py-3" style={{ border: t.id === playerInfo?.teamId ? `2px solid ${t.color}` : undefined }}>
              <span className="text-xl">{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i+1}.`}</span>
              <span className="text-xl">{t.emoji}</span>
              <span className="flex-1 font-bold" style={{ fontFamily: "var(--font-fredoka), Fredoka, sans-serif", color: t.color }}>{t.name}</span>
              <span className="font-bold" style={{ color: t.color, fontFamily: "var(--font-fredoka), Fredoka, sans-serif" }}>{t.score}pt</span>
            </div>
          ))}
        </div>
      </PhaseWrapper>
    );
  }

  return (
    <div className="relative min-h-screen">
      <div className="stars-bg" />
      {showConfetti && <Confetti />}
      <div className="relative z-10 flex flex-col min-h-screen px-4 py-6 max-w-sm mx-auto">
        {/* Team badge + controls */}
        <div className="flex items-center justify-between mb-4 gap-2">
          {myTeam ? (
            <div className="flex items-center gap-2 glass rounded-full px-4 py-2 flex-1 min-w-0">
              <span className="text-lg">{myTeam.emoji}</span>
              <span className="font-bold text-sm truncate" style={{ fontFamily: "var(--font-fredoka), Fredoka, sans-serif", color: myTeam.color }}>
                {myTeam.name}
              </span>
            </div>
          ) : (
            <div className="flex-1" />
          )}
          <div className="glass rounded-full px-3 py-2 text-xs font-bold shrink-0" style={{ fontFamily: "var(--font-fredoka), Fredoka, sans-serif" }}>
            {clipIndex + 1}/{room.quiz.clips.length}
          </div>
          <button
            onClick={handleSwitchTeam}
            className="glass rounded-full px-3 py-2 text-xs shrink-0"
            style={{ color: "rgba(255,255,255,0.6)", fontFamily: "var(--font-nunito)" }}
            title="Switch team or edit name"
          >
            ✏️
          </button>
          <button
            onClick={handleLeave}
            className="glass rounded-full px-3 py-2 text-xs shrink-0"
            style={{ color: "rgba(255,100,100,0.7)", fontFamily: "var(--font-nunito)" }}
            title="Leave game"
          >
            🚪
          </button>
        </div>

        {/* ── WATCHING ── */}
        {phase === "WATCHING" && (
          <PhaseCard
            emoji="👀"
            title="Watch Carefully!"
            subtitle="The video will stop soon... what happens next?"
            color={myTeam?.color ?? "#4cc9f0"}
          />
        )}

        {/* ── SUBMITTING ── */}
        {phase === "SUBMITTING" && (
          <div className="flex-1 flex flex-col gap-4">
            <div className="text-center">
              <div className="text-5xl mb-2">✍️</div>
              <h2 className="text-3xl font-bold" style={{ fontFamily: "var(--font-fredoka), Fredoka, sans-serif" }}>
                What happens next?
              </h2>
              <CountdownRing seconds={timeLeft} total={initial.submission_timer_secs} />
            </div>

            {submitted ? (
              <div className="glass rounded-2xl p-6 text-center flex-1 flex flex-col items-center justify-center gap-3">
                <div className="text-5xl">✅</div>
                <p className="text-xl font-bold" style={{ fontFamily: "var(--font-fredoka), Fredoka, sans-serif" }}>Submitted!</p>
                <p className="text-base italic" style={{ color: "rgba(255,255,255,0.7)", fontFamily: "var(--font-nunito)" }}>&ldquo;{answer}&rdquo;</p>
                <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)", fontFamily: "var(--font-nunito)" }}>Waiting for others...</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-3 flex-1">
                <textarea
                  className="input-field flex-1 resize-none text-lg"
                  style={{ minHeight: "120px" }}
                  placeholder="Type your prediction..."
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  maxLength={200}
                  autoFocus
                />
                <button type="submit" className="btn-coral justify-center py-4 text-xl" disabled={!answer.trim() || submitting}>
                  {submitting ? "Submitting..." : "Submit! 🚀"}
                </button>
              </form>
            )}
          </div>
        )}

        {/* ── REVEALING ── */}
        {phase === "REVEALING" && (
          <PhaseCard
            emoji="🍿"
            title="Watching the reveal!"
            subtitle={mySubmission ? `You said: "${mySubmission.answer}"` : "Get ready..."}
            color="#6bcb77"
          />
        )}

        {/* ── SCORING ── */}
        {phase === "SCORING" && (
          <div className="flex-1 flex flex-col gap-4">
            {winnerTeamIds.length > 0 ? (
              <div className="text-center glass rounded-2xl p-6 flex flex-col items-center gap-3">
                {iWon ? (
                  <>
                    <div className="text-5xl bounce-in">🎉</div>
                    <h2 className="text-3xl font-bold" style={{ fontFamily: "var(--font-fredoka), Fredoka, sans-serif", color: "#ffd93d" }}>Your team got it!</h2>
                    <p style={{ color: "rgba(255,255,255,0.6)", fontFamily: "var(--font-nunito)" }}>+1 point for {myTeam?.name}!</p>
                  </>
                ) : (
                  <>
                    <div className="text-5xl">😅</div>
                    <h2 className="text-2xl font-bold" style={{ fontFamily: "var(--font-fredoka), Fredoka, sans-serif" }}>Not this round!</h2>
                    <p style={{ color: "rgba(255,255,255,0.5)", fontFamily: "var(--font-nunito)" }}>
                      Winners: {winnerTeamIds.map((id) => room.teams.find((t) => t.id === id)?.name).filter(Boolean).join(", ")}
                    </p>
                  </>
                )}
              </div>
            ) : (
              <PhaseCard emoji="⏳" title="Waiting for host..." subtitle="The host is picking winners" color={myTeam?.color ?? "#ff5733"} />
            )}

            {/* Leaderboard */}
            <div className="glass rounded-2xl p-4">
              <h3 className="font-bold mb-3 text-center" style={{ fontFamily: "var(--font-fredoka), Fredoka, sans-serif" }}>Leaderboard</h3>
              <div className="flex flex-col gap-2">
                {[...teamScores].sort((a, b) => b.score - a.score).map((t, i) => (
                  <div key={t.id} className="flex items-center gap-3 rounded-xl px-3 py-2" style={{ background: t.id === playerInfo?.teamId ? `${t.color}20` : "transparent" }}>
                    <span className="text-sm font-bold w-5">{i + 1}</span>
                    <span>{t.emoji}</span>
                    <span className="flex-1 font-semibold text-sm" style={{ fontFamily: "var(--font-fredoka), Fredoka, sans-serif", color: t.color }}>{t.name}</span>
                    <span className="font-bold" style={{ color: t.color, fontFamily: "var(--font-fredoka), Fredoka, sans-serif" }}>{t.score}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PhaseWrapper({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <div className="relative min-h-screen flex items-center justify-center px-4">
      <div className="stars-bg" />
      <div className="relative z-10 max-w-sm w-full flex flex-col items-center text-center gap-4 glass rounded-3xl p-8" style={{ borderColor: `${color}30` }}>
        {children}
      </div>
    </div>
  );
}

function PhaseCard({ emoji, title, subtitle, color }: { emoji: string; title: string; subtitle: string; color: string }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center gap-4">
      <div className="text-6xl bounce-in">{emoji}</div>
      <h2 className="text-3xl font-bold" style={{ fontFamily: "var(--font-fredoka), Fredoka, sans-serif", color }}>
        {title}
      </h2>
      <p style={{ color: "rgba(255,255,255,0.6)", fontFamily: "var(--font-nunito)" }}>{subtitle}</p>
    </div>
  );
}

function CountdownRing({ seconds, total }: { seconds: number; total: number }) {
  const r = 44;
  const circ = 2 * Math.PI * r;
  const progress = circ - (seconds / total) * circ;
  const isUrgent = seconds <= 10;

  return (
    <div className="relative inline-flex items-center justify-center mt-2">
      <svg width="110" height="110" className="-rotate-90">
        <circle cx="55" cy="55" r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
        <circle
          cx="55" cy="55" r={r} fill="none"
          stroke={isUrgent ? "#ff5733" : "#4cc9f0"}
          strokeWidth="8"
          strokeDasharray={circ}
          strokeDashoffset={progress}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1s linear, stroke 0.3s" }}
        />
      </svg>
      <div className="absolute font-bold text-2xl" style={{ fontFamily: "var(--font-fredoka), Fredoka, sans-serif", color: isUrgent ? "#ff5733" : "#fff" }}>
        {seconds}
      </div>
    </div>
  );
}
