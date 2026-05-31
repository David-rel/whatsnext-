"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Pusher from "pusher-js";
import { CHANNEL, EVENTS } from "@/lib/pusher-shared";
import type { RoomWithDetails, GamePhase, SubmissionWithTeam } from "@/types";

interface TeamScore {
  id: string; name: string; color: string; emoji: string; score: number;
}

export default function HostGame({ room: initial }: { room: RoomWithDetails }) {
  const [room, setRoom] = useState(initial);
  const [phase, setPhase] = useState<GamePhase>(initial.current_phase as GamePhase ?? "WATCHING");
  const [clipIndex, setClipIndex] = useState(initial.current_clip_index);
  const [submissions, setSubmissions] = useState<SubmissionWithTeam[]>([]);
  const [submittedCount, setSubmittedCount] = useState(0);
  const [teamScores, setTeamScores] = useState<TeamScore[]>(initial.teams.map((t) => ({ id: t.id, name: t.name, color: t.color, emoji: t.emoji, score: t.score })));
  const [winners, setWinners] = useState<string[]>([]);
  const [timeLeft, setTimeLeft] = useState(initial.submission_timer_secs);
  const [timerActive, setTimerActive] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [finalScores, setFinalScores] = useState<TeamScore[]>([]);
  const [phaseLoading, setPhaseLoading] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const router = useRouter();

  const clips = room.quiz.clips;
  const currentClip = clips[clipIndex];
  const totalTeams = room.teams.length;

  const callPhase = useCallback(async (nextPhase: GamePhase | "NEXT_CLIP" | "END") => {
    setPhaseLoading(true);
    await fetch("/api/game/phase", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomCode: room.code, phase: nextPhase }),
    });
    setPhaseLoading(false);
  }, [room.code]);

  // Pusher subscription
  useEffect(() => {
    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
      channelAuthorization: { endpoint: "/api/pusher/auth", transport: "ajax" },
    });
    const channel = pusher.subscribe(CHANNEL(room.code));

    channel.bind(EVENTS.PHASE_CHANGED, (data: { phase: GamePhase; clip_index?: number; clip?: unknown; timer_secs?: number }) => {
      setPhase(data.phase);
      if (data.clip_index !== undefined) setClipIndex(data.clip_index);
      if (data.phase === "SUBMITTING") {
        setSubmittedCount(0);
        setSubmissions([]);
        setWinners([]);
        const secs = data.timer_secs ?? initial.submission_timer_secs;
        setTimeLeft(secs);
        setTimerActive(true);
      } else {
        setTimerActive(false);
      }
    });

    channel.bind(EVENTS.SUBMISSION_COUNTED, (data: { submitted_count: number }) => {
      setSubmittedCount(data.submitted_count);
    });

    channel.bind(EVENTS.ANSWERS_REVEALED, (data: { submissions: SubmissionWithTeam[] }) => {
      setSubmissions(data.submissions);
    });

    channel.bind(EVENTS.WINNERS_AWARDED, (data: { winner_team_ids: string[]; teams: TeamScore[] }) => {
      setTeamScores(data.teams);
      setWinners(data.winner_team_ids);
    });

    channel.bind(EVENTS.GAME_ENDED, (data: { final_scores: TeamScore[] }) => {
      setGameOver(true);
      setFinalScores(data.final_scores);
      setTimerActive(false);
    });

    return () => pusher.disconnect();
  }, [room.code, initial.submission_timer_secs]);

  // Countdown timer
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (!timerActive) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          setTimerActive(false);
          callPhase("REVEALING");
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timerActive, callPhase]);

  // Video pause at duration - 10s
  function handleTimeUpdate() {
    const video = videoRef.current;
    if (!video || phase !== "WATCHING") return;
    const pauseAt = video.duration - 10;
    if (video.currentTime >= pauseAt && pauseAt > 0) {
      video.pause();
      callPhase("SUBMITTING");
    }
  }

  function handlePlayReveal() {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = video.duration - 10;
    video.play();
  }

  function handleVideoEnded() {
    if (phase === "REVEALING") {
      callPhase("SCORING");
    }
  }

  async function handleAward() {
    setPhaseLoading(true);
    await fetch("/api/game/award", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomCode: room.code, winnerTeamIds: winners, clipId: currentClip?.id }),
    });
    setPhaseLoading(false);
  }

  if (gameOver) {
    const sorted = [...finalScores].sort((a, b) => b.score - a.score);
    return (
      <div className="relative min-h-screen flex items-center justify-center px-4">
        <div className="stars-bg" />
        <div className="relative z-10 max-w-lg w-full">
          <div className="text-center mb-8">
            <div className="text-6xl mb-2">🏆</div>
            <h1 className="text-5xl font-bold" style={{ fontFamily: "var(--font-fredoka), Fredoka, sans-serif" }}>Game Over!</h1>
          </div>
          <div className="flex flex-col gap-3">
            {sorted.map((team, i) => (
              <div key={team.id} className="glass rounded-2xl p-5 flex items-center gap-4" style={{ border: i === 0 ? `2px solid ${team.color}` : undefined }}>
                <div className="text-3xl">{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`}</div>
                <div className="text-3xl">{team.emoji}</div>
                <div className="flex-1">
                  <p className="font-bold text-xl" style={{ fontFamily: "var(--font-fredoka), Fredoka, sans-serif", color: team.color }}>{team.name}</p>
                </div>
                <div className="text-3xl font-bold" style={{ fontFamily: "var(--font-fredoka), Fredoka, sans-serif", color: team.color }}>
                  {team.score} pt{team.score !== 1 ? "s" : ""}
                </div>
              </div>
            ))}
          </div>
          <button onClick={() => router.push("/dashboard")} className="btn-coral justify-center w-full py-4 text-xl mt-6">
            Back to Dashboard 🏠
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      <div className="stars-bg" />
      <div className="relative z-10 flex flex-col">

        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <h1 className="text-xl font-bold" style={{ fontFamily: "var(--font-fredoka), Fredoka, sans-serif" }}>
              {room.quiz.title}
            </h1>
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.5)", fontFamily: "var(--font-nunito)" }}>
              Clip {clipIndex + 1} of {clips.length} · Room <span className="font-bold tracking-wider" style={{ color: "#ff5733" }}>{room.code}</span>
            </p>
          </div>
          <span className="chip" style={{ background: phaseColors[phase].bg, color: phaseColors[phase].text }}>
            {phaseLabels[phase]}
          </span>
        </div>

        {/* Full-width video */}
        <div style={{ background: "#000" }}>
          {currentClip ? (
            <video
              ref={videoRef}
              src={currentClip.video_url}
              className="w-full"
              style={{ maxHeight: "75vh", objectFit: "contain", display: "block" }}
              onTimeUpdate={handleTimeUpdate}
              onEnded={handleVideoEnded}
              controls={phase === "WATCHING" || phase === "REVEALING"}
              preload="auto"
              playsInline
            />
          ) : (
            <div className="flex items-center justify-center text-4xl" style={{ height: "50vh" }}>🎬</div>
          )}
        </div>

        {/* Below-video action bar */}
        <div className="px-4 py-3 flex flex-wrap items-center gap-3" style={{ background: "rgba(0,0,0,0.4)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <p className="font-semibold flex-1 min-w-0 truncate" style={{ fontFamily: "var(--font-fredoka), Fredoka, sans-serif" }}>
            {currentClip?.title}
          </p>
          {phase === "WATCHING" && (
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)", fontFamily: "var(--font-nunito)" }}>
              Auto-pauses 10s before the end
            </p>
          )}
          {phase === "SUBMITTING" && (
            <>
              <div className="flex items-center gap-2">
                <div className="rounded-full h-2 w-32" style={{ background: "rgba(255,255,255,0.1)" }}>
                  <div className="h-2 rounded-full transition-all" style={{ width: `${(submittedCount / totalTeams) * 100}%`, background: "#ff5733" }} />
                </div>
                <span className="text-sm font-bold" style={{ color: "#ff5733", fontFamily: "var(--font-fredoka), Fredoka, sans-serif" }}>
                  {submittedCount}/{totalTeams} · ⏰ {timeLeft}s
                </span>
              </div>
              <button onClick={() => { setTimerActive(false); callPhase("REVEALING"); }} className="btn-ghost py-2 text-sm">
                Skip → Reveal Now
              </button>
            </>
          )}
          {phase === "REVEALING" && (
            <>
              <button onClick={handlePlayReveal} className="btn-coral py-2 text-sm">
                ▶ Play Last 10 Seconds
              </button>
              <button onClick={() => callPhase("SCORING")} className="btn-ghost py-2 text-sm" disabled={phaseLoading}>
                Done Watching → Score
              </button>
            </>
          )}
        </div>

        {/* Scrollable content below */}
        <div className="px-4 py-6 flex flex-col gap-6 max-w-4xl mx-auto w-full">

          {/* Submissions — shown during REVEALING, SCORING */}
          {(phase === "REVEALING" || phase === "SCORING") && submissions.length > 0 && (
            <div className="glass rounded-2xl p-5">
              <h3 className="font-bold mb-4" style={{ fontFamily: "var(--font-fredoka), Fredoka, sans-serif" }}>
                {phase === "REVEALING" ? "🍿 What did everyone predict?" : "📋 All Answers"}
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {submissions.map((s) => (
                  <div
                    key={s.team_id}
                    className="rounded-2xl p-4"
                    style={{ background: `${s.team_color}12`, border: `1.5px solid ${s.team_color}40` }}
                  >
                    <p className="text-xs font-bold mb-1" style={{ color: s.team_color, fontFamily: "var(--font-fredoka), Fredoka, sans-serif" }}>
                      {s.team_emoji} {s.team_name}
                    </p>
                    <p className="text-base" style={{ fontFamily: "var(--font-nunito)" }}>&ldquo;{s.answer}&rdquo;</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Winner selection — SCORING only */}
          {phase === "SCORING" && (
            <div className="glass rounded-2xl p-5 flex flex-col gap-3">
              <h3 className="font-bold" style={{ fontFamily: "var(--font-fredoka), Fredoka, sans-serif" }}>Pick Winners</h3>
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)", fontFamily: "var(--font-nunito)" }}>Check every team that got it right</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {submissions.map((s) => (
                  <label key={s.team_id} className="flex items-start gap-3 cursor-pointer glass-hover rounded-xl p-3">
                    <input
                      type="checkbox"
                      checked={winners.includes(s.team_id)}
                      onChange={(e) => setWinners((w) => e.target.checked ? [...w, s.team_id] : w.filter((id) => id !== s.team_id))}
                      className="mt-0.5 shrink-0"
                      style={{ accentColor: s.team_color }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold" style={{ color: s.team_color, fontFamily: "var(--font-fredoka), Fredoka, sans-serif" }}>
                        {s.team_emoji} {s.team_name}
                      </p>
                      <p className="text-sm mt-0.5" style={{ color: "#fff", fontFamily: "var(--font-nunito)" }}>&ldquo;{s.answer}&rdquo;</p>
                    </div>
                  </label>
                ))}
              </div>
              <div className="flex gap-3 mt-1">
                <button onClick={handleAward} className="btn-coral flex-1 justify-center py-3" disabled={phaseLoading}>
                  {phaseLoading ? "Awarding..." : "Award Points! 🏆"}
                </button>
                <button
                  onClick={() => callPhase(clipIndex >= clips.length - 1 ? "END" : "NEXT_CLIP")}
                  className="btn-ghost flex-1 justify-center py-3 text-sm"
                  disabled={phaseLoading}
                >
                  {clipIndex >= clips.length - 1 ? "End Game" : "Next Clip →"}
                </button>
              </div>
            </div>
          )}

          {/* Scoreboard — always visible */}
          <div className="glass rounded-2xl p-5">
            <h3 className="font-bold mb-3" style={{ fontFamily: "var(--font-fredoka), Fredoka, sans-serif" }}>Scoreboard</h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {[...teamScores].sort((a, b) => b.score - a.score).map((t) => (
                <div key={t.id} className="flex items-center gap-3 rounded-xl px-3 py-2" style={{ background: `${t.color}12`, border: `1px solid ${t.color}30` }}>
                  <span className="text-xl">{t.emoji}</span>
                  <span className="flex-1 font-semibold truncate" style={{ color: t.color, fontFamily: "var(--font-fredoka), Fredoka, sans-serif" }}>{t.name}</span>
                  <span className="font-bold text-lg" style={{ color: t.color, fontFamily: "var(--font-fredoka), Fredoka, sans-serif" }}>{t.score}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

const phaseLabels: Record<GamePhase, string> = {
  WATCHING:   "📺 Watching",
  SUBMITTING: "✍️ Submitting",
  REVEALING:  "🍿 Revealing",
  SCORING:    "🏆 Scoring",
};
const phaseColors: Record<GamePhase, { bg: string; text: string }> = {
  WATCHING:   { bg: "rgba(76,201,240,0.2)",  text: "#4cc9f0" },
  SUBMITTING: { bg: "rgba(255,87,51,0.2)",   text: "#ff5733" },
  REVEALING:  { bg: "rgba(107,203,119,0.2)", text: "#6bcb77" },
  SCORING:    { bg: "rgba(255,217,61,0.2)",  text: "#ffd93d" },
};
