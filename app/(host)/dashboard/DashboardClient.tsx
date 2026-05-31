"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Quiz {
  id: string;
  title: string;
  clip_count: number;
  created_at: string;
}

interface Challenge {
  id: string;
  code: string;
  title: string;
  quiz_title: string;
  status: string;
  player_count: number;
  pending_count: number;
  created_at: string;
}

export default function DashboardClient({
  quizzes: initial,
  challenges: initialChallenges,
}: {
  quizzes: Quiz[];
  challenges: Challenge[];
}) {
  const [quizzes, setQuizzes] = useState(initial);
  const [challenges, setChallenges] = useState(initialChallenges);
  const [tab, setTab] = useState<"quizzes" | "challenges">("quizzes");
  const router = useRouter();

  async function deleteQuiz(id: string) {
    if (!confirm("Delete this quiz? This will remove all clips too.")) return;
    await fetch(`/api/quizzes/${id}`, { method: "DELETE" });
    setQuizzes((q) => q.filter((x) => x.id !== id));
  }

  async function closeChallenge(code: string) {
    if (!confirm("Close this challenge? Players won't be able to join or submit.")) return;
    await fetch(`/api/challenges/${code}/close`, { method: "POST" });
    setChallenges((c) => c.map((x) => x.code === code ? { ...x, status: "CLOSED" } : x));
  }

  const tabStyle = (active: boolean) => ({
    fontFamily: "var(--font-fredoka), Fredoka, sans-serif",
    color: active ? "#ff5733" : "rgba(255,255,255,0.5)",
    borderBottom: active ? "2px solid #ff5733" : "2px solid transparent",
    paddingBottom: "6px",
  });

  return (
    <div className="flex flex-col gap-6">
      {/* Tabs */}
      <div className="flex gap-6 border-b" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
        <button onClick={() => setTab("quizzes")} className="text-lg font-bold pb-1 transition-all" style={tabStyle(tab === "quizzes")}>
          Quizzes
        </button>
        <button onClick={() => setTab("challenges")} className="text-lg font-bold pb-1 transition-all flex items-center gap-2" style={tabStyle(tab === "challenges")}>
          Challenges
          {challenges.some((c) => c.pending_count > 0) && (
            <span className="text-xs px-1.5 py-0.5 rounded-full font-bold" style={{ background: "#ff5733", color: "#fff" }}>
              {challenges.reduce((s, c) => s + c.pending_count, 0)}
            </span>
          )}
        </button>
      </div>

      {/* Quizzes tab */}
      {tab === "quizzes" && (
        quizzes.length === 0 ? (
          <div className="glass rounded-3xl p-16 text-center">
            <div className="text-6xl mb-4">🎬</div>
            <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: "var(--font-fredoka), Fredoka, sans-serif" }}>No quizzes yet!</h2>
            <p className="mb-6" style={{ color: "rgba(255,255,255,0.5)", fontFamily: "var(--font-nunito)" }}>Create your first quiz and upload some video clips.</p>
            <Link href="/quiz/new" className="btn-coral">+ Create First Quiz 🚀</Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {quizzes.map((quiz) => (
              <div key={quiz.id} className="glass glass-hover rounded-2xl p-6 flex flex-col gap-3 transition-all">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-xl font-semibold leading-tight" style={{ fontFamily: "var(--font-fredoka), Fredoka, sans-serif" }}>
                    {quiz.title}
                  </h3>
                  <span className="chip shrink-0" style={{ background: "rgba(255,87,51,0.2)", color: "#ff5733" }}>
                    {quiz.clip_count} clip{quiz.clip_count !== 1 ? "s" : ""}
                  </span>
                </div>
                <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)", fontFamily: "var(--font-nunito)" }}>
                  Created {new Date(quiz.created_at).toLocaleDateString()}
                </p>
                <div className="flex gap-2 mt-auto pt-2">
                  <Link href={`/quiz/${quiz.id}`} className="btn-ghost flex-1 justify-center text-sm py-2">✏️ Edit</Link>
                  <Link href={`/room/new?quiz=${quiz.id}`} className="btn-coral flex-1 justify-center text-sm py-2">🎮 Live</Link>
                  <Link href={`/challenge/new?quiz=${quiz.id}`} className="btn-ghost flex-1 justify-center text-sm py-2">🎯 Challenge</Link>
                  <button onClick={() => deleteQuiz(quiz.id)} className="btn-ghost px-3 py-2 text-sm" style={{ color: "rgba(255,100,100,0.7)" }}>🗑️</button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Challenges tab */}
      {tab === "challenges" && (
        challenges.length === 0 ? (
          <div className="glass rounded-3xl p-16 text-center">
            <div className="text-6xl mb-4">🎯</div>
            <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: "var(--font-fredoka), Fredoka, sans-serif" }}>No challenges yet!</h2>
            <p className="mb-6" style={{ color: "rgba(255,255,255,0.5)", fontFamily: "var(--font-nunito)" }}>
              Create a challenge so players can compete at their own pace.
            </p>
            <Link href="/challenge/new" className="btn-coral">+ New Challenge 🎯</Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {challenges.map((ch) => (
              <div key={ch.id} className="glass glass-hover rounded-2xl p-6 flex flex-col gap-3 transition-all">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-semibold leading-tight truncate" style={{ fontFamily: "var(--font-fredoka), Fredoka, sans-serif" }}>
                      {ch.title || ch.quiz_title}
                    </h3>
                    {ch.title && (
                      <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)", fontFamily: "var(--font-nunito)" }}>
                        Quiz: {ch.quiz_title}
                      </p>
                    )}
                  </div>
                  <span className="chip shrink-0" style={{
                    background: ch.status === "OPEN" ? "rgba(107,203,119,0.2)" : "rgba(255,255,255,0.08)",
                    color: ch.status === "OPEN" ? "#6bcb77" : "rgba(255,255,255,0.4)",
                  }}>
                    {ch.status}
                  </span>
                </div>

                {/* Access code */}
                <div className="rounded-xl px-4 py-2 text-center" style={{ background: "rgba(255,87,51,0.1)", border: "1px solid rgba(255,87,51,0.3)" }}>
                  <p className="text-xs mb-0.5" style={{ color: "rgba(255,255,255,0.4)", fontFamily: "var(--font-nunito)" }}>Access Code</p>
                  <p className="text-2xl font-bold tracking-widest" style={{ fontFamily: "var(--font-fredoka), Fredoka, sans-serif", color: "#ff5733" }}>
                    {ch.code}
                  </p>
                </div>

                <div className="flex gap-3 text-xs" style={{ color: "rgba(255,255,255,0.45)", fontFamily: "var(--font-nunito)" }}>
                  <span>👤 {ch.player_count} player{ch.player_count !== 1 ? "s" : ""}</span>
                  {ch.pending_count > 0 && (
                    <span style={{ color: "#ffd93d" }}>⏳ {ch.pending_count} pending</span>
                  )}
                  <span className="ml-auto">{new Date(ch.created_at).toLocaleDateString()}</span>
                </div>

                <div className="flex gap-2 mt-auto pt-1">
                  <Link href={`/challenge/${ch.code}/review`} className="btn-coral flex-1 justify-center text-sm py-2">
                    {ch.pending_count > 0 ? `📋 Review (${ch.pending_count})` : "📋 Review"}
                  </Link>
                  {ch.status === "OPEN" && (
                    <button onClick={() => closeChallenge(ch.code)} className="btn-ghost px-3 py-2 text-sm" style={{ color: "rgba(255,100,100,0.7)" }}>
                      ✕
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
