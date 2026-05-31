"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface Clip { id: string; title: string; video_url: string; order: number; }
interface Player { id: string; name: string; score: number; current_clip_index: number; status: string; }
interface LeaderboardEntry { id: string; name: string; score: number; status: string; }

type ViewPhase = "WATCHING" | "SUBMITTING" | "REVEALING" | "DONE";

export default function ChallengePlayer({
  code, challengeId, quizTitle, challengeTitle, clips,
}: {
  code: string;
  challengeId: string;
  quizTitle: string;
  challengeTitle: string;
  clips: Clip[];
}) {
  const [playerInfo, setPlayerInfo] = useState<Player | null>(null);
  const [playerName, setPlayerName] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState("");

  const [clipIndex, setClipIndex] = useState(0);
  const [phase, setPhase] = useState<ViewPhase>("WATCHING");
  const [answer, setAnswer] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);

  const currentClip = clips[clipIndex];
  const isLastClip = clipIndex >= clips.length - 1;
  const storageKey = `wn_challenge_${code}`;

  // Load player from sessionStorage
  useEffect(() => {
    const stored = sessionStorage.getItem(storageKey);
    if (stored) {
      const p = JSON.parse(stored) as Player;
      setPlayerInfo(p);
      // Resume from saved clip index
      const resumeIndex = Math.min(p.current_clip_index, clips.length - 1);
      if (p.status === "DONE") {
        setClipIndex(clips.length - 1);
        setPhase("DONE");
      } else {
        setClipIndex(resumeIndex);
        setPhase("WATCHING");
      }
    }
  }, [storageKey, clips.length]);

  // Poll leaderboard every 5s
  const fetchLeaderboard = useCallback(async () => {
    const res = await fetch(`/api/challenges/${code}`);
    if (res.ok) {
      const data = await res.json();
      setLeaderboard(
        [...(data.players as LeaderboardEntry[])].sort((a, b) => b.score - a.score)
      );
    }
  }, [code]);

  useEffect(() => {
    fetchLeaderboard();
    const interval = setInterval(fetchLeaderboard, 5000);
    return () => clearInterval(interval);
  }, [fetchLeaderboard]);

  // ── Join ─────────────────────────────────────────────────────────
  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!playerName.trim()) return;
    setJoining(true);
    setJoinError("");
    const res = await fetch(`/api/challenges/${code}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: playerName.trim() }),
    });
    const data = await res.json();
    if (!res.ok) { setJoinError(data.error || "Could not join"); setJoining(false); return; }
    sessionStorage.setItem(storageKey, JSON.stringify(data));
    setPlayerInfo(data);
    setClipIndex(data.current_clip_index ?? 0);
  }

  // ── Video: auto-pause 10s before end ────────────────────────────
  function handleTimeUpdate() {
    const video = videoRef.current;
    if (!video || phase !== "WATCHING") return;
    const pauseAt = video.duration - 10;
    if (pauseAt > 0 && video.currentTime >= pauseAt) {
      video.pause();
      setPhase("SUBMITTING");
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
      // move on — user clicks Next manually
    }
  }

  // ── Submit answer ────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!answer.trim() || !playerInfo || submitted) return;
    setSubmitting(true);

    const nextIndex = clipIndex + 1;
    const done = nextIndex >= clips.length;

    await fetch(`/api/challenges/${code}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        playerId: playerInfo.id,
        clipId: currentClip.id,
        answer: answer.trim(),
        nextClipIndex: done ? clipIndex : nextIndex,
        done,
      }),
    });

    // Update local session with new clip index
    const updated = { ...playerInfo, current_clip_index: done ? clipIndex : nextIndex, status: done ? "DONE" : "PLAYING" };
    sessionStorage.setItem(storageKey, JSON.stringify(updated));
    setPlayerInfo(updated);

    setSubmitted(true);
    setSubmitting(false);
    setPhase("REVEALING");
  }

  // ── Next clip or done ────────────────────────────────────────────
  function handleNext() {
    if (isLastClip) {
      setPhase("DONE");
    } else {
      setClipIndex((i) => i + 1);
      setPhase("WATCHING");
      setAnswer("");
      setSubmitted(false);
    }
  }

  // ── JOIN SCREEN ──────────────────────────────────────────────────
  if (!playerInfo) {
    return (
      <div className="relative min-h-screen flex items-center justify-center px-4">
        <div className="stars-bg" />
        <div className="relative z-10 max-w-sm w-full flex flex-col gap-6">
          <div className="text-center">
            <div className="text-5xl mb-3">🎯</div>
            <h1 className="text-4xl font-bold" style={{ fontFamily: "var(--font-fredoka), Fredoka, sans-serif" }}>
              {challengeTitle || quizTitle}
            </h1>
            <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.5)", fontFamily: "var(--font-nunito)" }}>
              {clips.length} clip{clips.length !== 1 ? "s" : ""} · Solo challenge
            </p>
          </div>

          <form onSubmit={handleJoin} className="glass rounded-2xl p-6 flex flex-col gap-4">
            <label className="block text-sm font-semibold" style={{ color: "rgba(255,255,255,0.7)", fontFamily: "var(--font-nunito)" }}>
              Your Name
            </label>
            <input
              className="input-field text-lg"
              placeholder="Enter your name..."
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              maxLength={30}
              autoFocus
            />
            {joinError && (
              <p className="text-sm text-center" style={{ color: "#ff5733", fontFamily: "var(--font-nunito)" }}>{joinError}</p>
            )}
            <button type="submit" className="btn-coral justify-center py-4 text-xl" disabled={joining || !playerName.trim()}>
              {joining ? "Joining..." : "Let's Go! 🚀"}
            </button>
          </form>

          {/* Leaderboard preview */}
          {leaderboard.length > 0 && (
            <div className="glass rounded-2xl p-4">
              <p className="text-sm font-semibold mb-3 text-center" style={{ fontFamily: "var(--font-fredoka), Fredoka, sans-serif" }}>
                Current Leaderboard
              </p>
              {leaderboard.slice(0, 5).map((p, i) => (
                <div key={p.id} className="flex items-center gap-2 py-1">
                  <span className="text-xs w-5" style={{ color: "rgba(255,255,255,0.4)" }}>{i + 1}.</span>
                  <span className="flex-1 text-sm truncate" style={{ fontFamily: "var(--font-nunito)" }}>{p.name}</span>
                  <span className="font-bold text-sm" style={{ color: "#ff5733", fontFamily: "var(--font-fredoka), Fredoka, sans-serif" }}>{p.score}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── DONE SCREEN ──────────────────────────────────────────────────
  if (phase === "DONE") {
    const myEntry = leaderboard.find((p) => p.id === playerInfo.id);
    const myRank = leaderboard.findIndex((p) => p.id === playerInfo.id) + 1;
    return (
      <div className="relative min-h-screen px-4 py-8">
        <div className="stars-bg" />
        <div className="relative z-10 max-w-sm mx-auto flex flex-col gap-6">
          <div className="text-center glass rounded-3xl p-8">
            <div className="text-5xl mb-3">🎉</div>
            <h2 className="text-3xl font-bold" style={{ fontFamily: "var(--font-fredoka), Fredoka, sans-serif" }}>All Done!</h2>
            <p className="mt-2" style={{ color: "rgba(255,255,255,0.6)", fontFamily: "var(--font-nunito)" }}>
              Your answers are being reviewed by the host.
            </p>
            {myEntry && (
              <p className="mt-3 font-bold" style={{ color: "#ff5733", fontFamily: "var(--font-fredoka), Fredoka, sans-serif" }}>
                Your score: {myEntry.score} pt{myEntry.score !== 1 ? "s" : ""} · Rank #{myRank}
              </p>
            )}
          </div>

          <div className="glass rounded-2xl p-4">
            <p className="text-sm font-semibold mb-3 text-center" style={{ fontFamily: "var(--font-fredoka), Fredoka, sans-serif" }}>
              🏆 Leaderboard
            </p>
            {leaderboard.map((p, i) => (
              <div key={p.id} className="flex items-center gap-3 rounded-xl px-3 py-2 mb-1"
                style={{ background: p.id === playerInfo.id ? "rgba(255,87,51,0.12)" : "transparent" }}>
                <span className="text-sm w-6 shrink-0">{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`}</span>
                <span className="flex-1 text-sm truncate" style={{ fontFamily: "var(--font-nunito)", color: p.id === playerInfo.id ? "#ff5733" : "#fff" }}>
                  {p.name} {p.id === playerInfo.id ? "(you)" : ""}
                </span>
                <span className="text-xs shrink-0" style={{ color: "rgba(255,255,255,0.3)" }}>{p.status === "DONE" ? "✅" : "⏳"}</span>
                <span className="font-bold shrink-0" style={{ fontFamily: "var(--font-fredoka), Fredoka, sans-serif", color: "#ff5733" }}>{p.score}</span>
              </div>
            ))}
            <p className="text-xs text-center mt-3" style={{ color: "rgba(255,255,255,0.25)", fontFamily: "var(--font-nunito)" }}>
              Updates every 5s as host reviews
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── PLAY SCREEN ──────────────────────────────────────────────────
  return (
    <div className="relative min-h-screen">
      <div className="stars-bg" />
      <div className="relative z-10 flex flex-col">

        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-3 gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-bold truncate" style={{ fontFamily: "var(--font-fredoka), Fredoka, sans-serif" }}>
              {challengeTitle || quizTitle}
            </p>
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.5)", fontFamily: "var(--font-nunito)" }}>
              Clip {clipIndex + 1} of {clips.length}
            </p>
          </div>
          <button
            onClick={() => setShowLeaderboard((v) => !v)}
            className="glass rounded-full px-3 py-1.5 text-xs shrink-0"
            style={{ fontFamily: "var(--font-nunito)", color: showLeaderboard ? "#ff5733" : "rgba(255,255,255,0.6)" }}
          >
            🏆 Scores
          </button>
        </div>

        {/* Leaderboard overlay */}
        {showLeaderboard && (
          <div className="glass mx-4 rounded-2xl p-4 mb-2">
            {leaderboard.length === 0 ? (
              <p className="text-sm text-center" style={{ color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-nunito)" }}>No scores yet</p>
            ) : (
              leaderboard.map((p, i) => (
                <div key={p.id} className="flex items-center gap-2 py-1">
                  <span className="text-xs w-5 shrink-0" style={{ color: "rgba(255,255,255,0.4)" }}>{i + 1}.</span>
                  <span className="flex-1 text-sm truncate" style={{ fontFamily: "var(--font-nunito)", color: p.id === playerInfo.id ? "#ff5733" : "#fff" }}>
                    {p.name}
                  </span>
                  <span className="font-bold text-sm shrink-0" style={{ color: "#ff5733", fontFamily: "var(--font-fredoka), Fredoka, sans-serif" }}>{p.score}</span>
                </div>
              ))
            )}
          </div>
        )}

        {/* Video */}
        <div style={{ background: "#000" }}>
          {currentClip && (
            <video
              ref={videoRef}
              src={currentClip.video_url}
              className="w-full"
              style={{ maxHeight: "65vh", objectFit: "contain", display: "block" }}
              onTimeUpdate={handleTimeUpdate}
              onEnded={handleVideoEnded}
              controls={phase === "WATCHING" || phase === "REVEALING"}
              preload="auto"
              playsInline
            />
          )}
        </div>

        {/* Below-video content */}
        <div className="px-4 py-5 max-w-lg mx-auto w-full flex flex-col gap-4">
          <p className="font-semibold" style={{ fontFamily: "var(--font-fredoka), Fredoka, sans-serif" }}>
            {currentClip?.title}
          </p>

          {/* WATCHING */}
          {phase === "WATCHING" && (
            <div className="glass rounded-2xl p-5 text-center">
              <div className="text-4xl mb-2">👀</div>
              <p className="font-bold" style={{ fontFamily: "var(--font-fredoka), Fredoka, sans-serif" }}>Watch carefully!</p>
              <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.5)", fontFamily: "var(--font-nunito)" }}>
                Video auto-pauses 10s before the end
              </p>
            </div>
          )}

          {/* SUBMITTING */}
          {phase === "SUBMITTING" && (
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <div className="text-center mb-1">
                <div className="text-3xl mb-1">✍️</div>
                <p className="font-bold text-lg" style={{ fontFamily: "var(--font-fredoka), Fredoka, sans-serif" }}>What happens next?</p>
              </div>
              {submitted ? (
                <div className="glass rounded-2xl p-5 text-center flex flex-col items-center gap-3">
                  <div className="text-4xl">✅</div>
                  <p className="font-bold" style={{ fontFamily: "var(--font-fredoka), Fredoka, sans-serif" }}>Submitted!</p>
                  <p className="italic text-sm" style={{ color: "rgba(255,255,255,0.6)", fontFamily: "var(--font-nunito)" }}>&ldquo;{answer}&rdquo;</p>
                  <button type="button" onClick={handlePlayReveal} className="btn-coral py-2 text-sm mt-1">
                    ▶ Watch the Reveal
                  </button>
                </div>
              ) : (
                <>
                  <textarea
                    className="input-field resize-none text-lg"
                    style={{ minHeight: "100px" }}
                    placeholder="Type your prediction..."
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    maxLength={200}
                    autoFocus
                  />
                  <button type="submit" className="btn-coral justify-center py-4 text-xl" disabled={!answer.trim() || submitting}>
                    {submitting ? "Submitting..." : "Submit! 🚀"}
                  </button>
                </>
              )}
            </form>
          )}

          {/* REVEALING */}
          {phase === "REVEALING" && (
            <div className="flex flex-col gap-3">
              {!submitted && (
                <button onClick={handlePlayReveal} className="btn-coral justify-center py-3">
                  ▶ Watch the Reveal
                </button>
              )}
              <div className="glass rounded-2xl p-4 text-center">
                <p className="text-sm" style={{ color: "rgba(255,255,255,0.5)", fontFamily: "var(--font-nunito)" }}>Your answer:</p>
                <p className="font-bold mt-1 italic" style={{ fontFamily: "var(--font-nunito)" }}>&ldquo;{answer}&rdquo;</p>
                <p className="text-xs mt-2" style={{ color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-nunito)" }}>
                  The host will review and award points
                </p>
              </div>
              <button onClick={handleNext} className="btn-coral justify-center py-3 text-lg">
                {isLastClip ? "Finish Challenge 🎉" : "Next Clip →"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
