import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { sql } from "@/lib/db";
import Link from "next/link";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userId = (session.user as { id: string }).id;
  const quizzes = await sql`
    SELECT q.*, COUNT(c.id)::int AS clip_count
    FROM whatsnext_quizzes q
    LEFT JOIN whatsnext_clips c ON c.quiz_id = q.id
    WHERE q.host_id = ${userId}
    GROUP BY q.id
    ORDER BY q.created_at DESC
  `;

  return (
    <div className="relative min-h-screen px-4 py-8">
      <div className="stars-bg" />
      <div className="relative z-10 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-4xl font-bold" style={{ fontFamily: "var(--font-fredoka), Fredoka, sans-serif" }}>
              My Quizzes 🎬
            </h1>
            <p className="mt-1 text-sm" style={{ color: "rgba(255,255,255,0.5)", fontFamily: "var(--font-nunito)" }}>
              Welcome back, {session.user.name || session.user.email}!
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/room/new" className="btn-ghost">
              🎮 Start Game
            </Link>
            <Link href="/quiz/new" className="btn-coral">
              + New Quiz
            </Link>
          </div>
        </div>

        <DashboardClient quizzes={quizzes as never} />
      </div>
    </div>
  );
}
