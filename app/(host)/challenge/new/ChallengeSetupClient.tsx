"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface QuizOption {
  id: string;
  title: string;
  clip_count: number;
}

export default function ChallengeSetupClient({ quizzes, preselectedQuizId }: { quizzes: QuizOption[]; preselectedQuizId?: string }) {
  const [selectedQuizId, setSelectedQuizId] = useState<string | null>(preselectedQuizId ?? quizzes[0]?.id ?? null);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedQuizId) return;
    setLoading(true);
    setError("");
    const res = await fetch("/api/challenges", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quizId: selectedQuizId, title: title.trim() }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || "Failed to create"); setLoading(false); return; }
    router.push(`/challenge/${data.code}/review`);
  }

  return (
    <div className="relative min-h-screen px-4 py-8">
      <div className="stars-bg" />
      <div className="relative z-10 max-w-xl mx-auto flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="btn-ghost py-2 px-3 text-sm">← Back</Link>
          <div>
            <h1 className="text-3xl font-bold" style={{ fontFamily: "var(--font-fredoka), Fredoka, sans-serif" }}>
              New Challenge
            </h1>
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.5)", fontFamily: "var(--font-nunito)" }}>
              Players join at their own pace — async solo mode
            </p>
          </div>
        </div>

        <form onSubmit={handleCreate} className="flex flex-col gap-5">
          {/* Optional title */}
          <div className="glass rounded-2xl p-5">
            <label className="block text-sm font-semibold mb-2" style={{ color: "rgba(255,255,255,0.7)", fontFamily: "var(--font-nunito)" }}>
              Challenge Name <span style={{ color: "rgba(255,255,255,0.3)" }}>(optional)</span>
            </label>
            <input
              className="input-field"
              placeholder="e.g. Summer Sports Challenge"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={60}
            />
          </div>

          {/* Quiz picker */}
          <div className="glass rounded-2xl p-5">
            <p className="text-sm font-semibold mb-3" style={{ color: "rgba(255,255,255,0.7)", fontFamily: "var(--font-nunito)" }}>
              Pick a Quiz
            </p>
            {quizzes.length === 0 ? (
              <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)", fontFamily: "var(--font-nunito)" }}>
                No quizzes yet. <Link href="/quiz/new" className="underline" style={{ color: "#ff5733" }}>Create one first.</Link>
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {quizzes.map((q) => {
                  const sel = selectedQuizId === q.id;
                  return (
                    <button
                      type="button"
                      key={q.id}
                      onClick={() => setSelectedQuizId(q.id)}
                      className="rounded-2xl p-4 text-left transition-all flex items-center gap-3"
                      style={{
                        background: sel ? "rgba(255,87,51,0.15)" : "rgba(255,255,255,0.05)",
                        border: `2px solid ${sel ? "#ff5733" : "rgba(255,255,255,0.1)"}`,
                        boxShadow: sel ? "0 0 20px rgba(255,87,51,0.2)" : "none",
                      }}
                    >
                      <div className="flex-1">
                        <p className="font-bold" style={{ fontFamily: "var(--font-fredoka), Fredoka, sans-serif", color: sel ? "#ff5733" : "#fff" }}>
                          {q.title}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)", fontFamily: "var(--font-nunito)" }}>
                          {q.clip_count} clip{q.clip_count !== 1 ? "s" : ""}
                        </p>
                      </div>
                      {sel && <span className="text-lg">✓</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {error && (
            <p className="text-sm text-center py-2 rounded-xl" style={{ background: "rgba(255,87,51,0.15)", color: "#ff5733", fontFamily: "var(--font-nunito)" }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            className="btn-coral justify-center py-4 text-xl"
            disabled={loading || !selectedQuizId}
          >
            {loading ? "Creating..." : "Create Challenge 🎯"}
          </button>
        </form>
      </div>
    </div>
  );
}
