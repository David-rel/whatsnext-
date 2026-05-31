"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Clip { id: string; title: string; order: number; }
interface Submission { id: string; player_id: string; player_name: string; clip_id: string; answer: string; awarded: boolean | null; }
interface Player { id: string; name: string; score: number; status: string; submissions: Submission[]; }
interface ChallengeData {
  id: string; code: string; title: string; status: string;
  quiz: { title: string; clips: Clip[] };
  players: Player[];
}

export default function ChallengeReview({ code }: { code: string }) {
  const [data, setData] = useState<ChallengeData | null>(null);
  const [expandedClip, setExpandedClip] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);
  const router = useRouter();

  const fetchData = useCallback(async () => {
    const res = await fetch(`/api/challenges/${code}`);
    if (res.ok) setData(await res.json());
  }, [code]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [fetchData]);

  async function handleAward(submissionId: string, awarded: boolean) {
    await fetch(`/api/challenges/${code}/award`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ submissionId, awarded }),
    });
    fetchData();
  }

  async function handleClose() {
    if (!confirm("Close this challenge? Players won't be able to join or submit.")) return;
    setClosing(true);
    await fetch(`/api/challenges/${code}/close`, { method: "POST" });
    router.push("/dashboard");
  }

  if (!data) {
    return (
      <div className="relative min-h-screen flex items-center justify-center">
        <div className="stars-bg" />
        <p className="relative z-10 text-lg" style={{ color: "rgba(255,255,255,0.5)", fontFamily: "var(--font-nunito)" }}>Loading...</p>
      </div>
    );
  }

  const clips = data.quiz.clips;
  const leaderboard = [...data.players].sort((a, b) => b.score - a.score);
  const totalPending = data.players.flatMap((p) => p.submissions).filter((s) => s.awarded === null).length;

  return (
    <div className="relative min-h-screen px-4 py-6">
      <div className="stars-bg" />
      <div className="relative z-10 max-w-5xl mx-auto flex flex-col gap-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <Link href="/dashboard" className="text-xs mb-1 block" style={{ color: "rgba(255,255,255,0.4)", fontFamily: "var(--font-nunito)" }}>
              ← Dashboard
            </Link>
            <h1 className="text-3xl font-bold" style={{ fontFamily: "var(--font-fredoka), Fredoka, sans-serif" }}>
              {data.title || data.quiz.title}
            </h1>
            <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.5)", fontFamily: "var(--font-nunito)" }}>
              Access code: <span className="font-bold tracking-widest" style={{ color: "#ff5733" }}>{data.code}</span>
              {" · "}{data.players.length} player{data.players.length !== 1 ? "s" : ""}
              {totalPending > 0 && <span style={{ color: "#ffd93d" }}> · {totalPending} pending review</span>}
              {" · "}<span style={{ color: data.status === "OPEN" ? "#6bcb77" : "rgba(255,255,255,0.4)" }}>{data.status}</span>
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            {data.status === "OPEN" && (
              <button onClick={handleClose} className="btn-ghost py-2 text-sm" style={{ color: "rgba(255,100,100,0.8)" }} disabled={closing}>
                {closing ? "Closing..." : "Close Challenge"}
              </button>
            )}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Clips + submissions */}
          <div className="lg:col-span-2 flex flex-col gap-3">
            <h2 className="font-bold text-lg" style={{ fontFamily: "var(--font-fredoka), Fredoka, sans-serif" }}>
              Review Answers
            </h2>
            {clips.map((clip) => {
              const allSubs = data.players.flatMap((p) =>
                p.submissions.filter((s) => s.clip_id === clip.id).map((s) => ({ ...s, player_name: p.name }))
              );
              const pendingCount = allSubs.filter((s) => s.awarded === null).length;
              const isOpen = expandedClip === clip.id;

              return (
                <div key={clip.id} className="glass rounded-2xl overflow-hidden">
                  <button
                    onClick={() => setExpandedClip(isOpen ? null : clip.id)}
                    className="w-full flex items-center justify-between px-5 py-4 text-left"
                  >
                    <div>
                      <p className="font-semibold" style={{ fontFamily: "var(--font-fredoka), Fredoka, sans-serif" }}>{clip.title}</p>
                      <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)", fontFamily: "var(--font-nunito)" }}>
                        {allSubs.length} submission{allSubs.length !== 1 ? "s" : ""}
                        {pendingCount > 0 && <span style={{ color: "#ffd93d" }}> · {pendingCount} pending</span>}
                      </p>
                    </div>
                    <span style={{ color: "rgba(255,255,255,0.4)" }}>{isOpen ? "▲" : "▼"}</span>
                  </button>

                  {isOpen && (
                    <div className="border-t flex flex-col gap-2 p-4" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
                      {allSubs.length === 0 ? (
                        <p className="text-sm text-center py-4" style={{ color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-nunito)" }}>
                          No submissions yet
                        </p>
                      ) : (
                        allSubs.map((sub) => (
                          <div key={sub.id} className="flex items-start gap-3 rounded-xl p-3" style={{
                            background: sub.awarded === true ? "rgba(107,203,119,0.1)" : sub.awarded === false ? "rgba(255,87,51,0.08)" : "rgba(255,255,255,0.05)",
                            border: `1px solid ${sub.awarded === true ? "rgba(107,203,119,0.3)" : sub.awarded === false ? "rgba(255,87,51,0.2)" : "rgba(255,255,255,0.08)"}`,
                          }}>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold mb-1" style={{ color: "rgba(255,255,255,0.6)", fontFamily: "var(--font-nunito)" }}>
                                {sub.player_name}
                              </p>
                              <p className="text-sm" style={{ fontFamily: "var(--font-nunito)" }}>&ldquo;{sub.answer}&rdquo;</p>
                            </div>
                            <div className="flex gap-2 shrink-0">
                              <button
                                onClick={() => handleAward(sub.id, true)}
                                className="rounded-xl px-3 py-1.5 text-sm font-bold transition-all"
                                style={{
                                  background: sub.awarded === true ? "rgba(107,203,119,0.3)" : "rgba(107,203,119,0.1)",
                                  color: "#6bcb77",
                                  border: `1px solid ${sub.awarded === true ? "#6bcb77" : "rgba(107,203,119,0.3)"}`,
                                }}
                              >
                                ✓
                              </button>
                              <button
                                onClick={() => handleAward(sub.id, false)}
                                className="rounded-xl px-3 py-1.5 text-sm font-bold transition-all"
                                style={{
                                  background: sub.awarded === false ? "rgba(255,87,51,0.3)" : "rgba(255,87,51,0.1)",
                                  color: "#ff5733",
                                  border: `1px solid ${sub.awarded === false ? "#ff5733" : "rgba(255,87,51,0.3)"}`,
                                }}
                              >
                                ✗
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Leaderboard */}
          <div className="flex flex-col gap-3">
            <h2 className="font-bold text-lg" style={{ fontFamily: "var(--font-fredoka), Fredoka, sans-serif" }}>
              Leaderboard
            </h2>
            <div className="glass rounded-2xl p-4 flex flex-col gap-2">
              {leaderboard.length === 0 ? (
                <p className="text-sm text-center py-4" style={{ color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-nunito)" }}>
                  No players yet
                </p>
              ) : (
                leaderboard.map((p, i) => (
                  <div key={p.id} className="flex items-center gap-3 rounded-xl px-3 py-2" style={{ background: "rgba(255,255,255,0.04)" }}>
                    <span className="text-sm font-bold w-5 shrink-0" style={{ color: i === 0 ? "#ffd93d" : "rgba(255,255,255,0.4)" }}>
                      {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`}
                    </span>
                    <span className="flex-1 text-sm truncate" style={{ fontFamily: "var(--font-nunito)" }}>{p.name}</span>
                    <span className="text-xs shrink-0" style={{ color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-nunito)" }}>
                      {p.status === "DONE" ? "✅" : "⏳"}
                    </span>
                    <span className="font-bold shrink-0" style={{ fontFamily: "var(--font-fredoka), Fredoka, sans-serif", color: "#ff5733" }}>
                      {p.score}
                    </span>
                  </div>
                ))
              )}
            </div>
            <p className="text-xs text-center" style={{ color: "rgba(255,255,255,0.25)", fontFamily: "var(--font-nunito)" }}>
              Auto-refreshes every 5s
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
