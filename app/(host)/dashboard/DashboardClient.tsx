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

export default function DashboardClient({ quizzes: initial }: { quizzes: Quiz[] }) {
  const [quizzes, setQuizzes] = useState(initial);
  const router = useRouter();

  async function deleteQuiz(id: string) {
    if (!confirm("Delete this quiz? This will remove all clips too.")) return;
    await fetch(`/api/quizzes/${id}`, { method: "DELETE" });
    setQuizzes((q) => q.filter((x) => x.id !== id));
  }

  if (quizzes.length === 0) {
    return (
      <div className="glass rounded-3xl p-16 text-center">
        <div className="text-6xl mb-4">🎬</div>
        <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: "var(--font-fredoka), Fredoka, sans-serif" }}>No quizzes yet!</h2>
        <p className="mb-6" style={{ color: "rgba(255,255,255,0.5)", fontFamily: "var(--font-nunito)" }}>Create your first quiz and upload some video clips.</p>
        <Link href="/quiz/new" className="btn-coral">+ Create First Quiz 🚀</Link>
      </div>
    );
  }

  return (
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
            <Link href={`/quiz/${quiz.id}`} className="btn-ghost flex-1 justify-center text-sm py-2">
              ✏️ Edit
            </Link>
            <Link
              href={`/room/new?quiz=${quiz.id}`}
              className="btn-coral flex-1 justify-center text-sm py-2"
            >
              🎮 Play
            </Link>
            <button
              onClick={() => deleteQuiz(quiz.id)}
              className="btn-ghost px-3 py-2 text-sm"
              style={{ color: "rgba(255,100,100,0.7)" }}
            >
              🗑️
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
