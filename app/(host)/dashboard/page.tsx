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

  const challenges = await sql`
    SELECT ch.*, q.title AS quiz_title,
      COUNT(DISTINCT cp.id)::int AS player_count,
      COUNT(DISTINCT cs.id) FILTER (WHERE cs.awarded IS NULL)::int AS pending_count
    FROM whatsnext_challenges ch
    JOIN whatsnext_quizzes q ON q.id = ch.quiz_id
    LEFT JOIN whatsnext_challenge_players cp ON cp.challenge_id = ch.id
    LEFT JOIN whatsnext_challenge_submissions cs ON cs.challenge_id = ch.id
    WHERE ch.host_id = ${userId}
    GROUP BY ch.id, q.title
    ORDER BY ch.created_at DESC
  `;

  return (
    <div className="relative min-h-screen px-4 py-8">
      <div className="stars-bg" />
      <div className="relative z-10 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold" style={{ fontFamily: "var(--font-fredoka), Fredoka, sans-serif" }}>
              Dashboard 🎬
            </h1>
            <p className="mt-1 text-sm" style={{ color: "rgba(255,255,255,0.5)", fontFamily: "var(--font-nunito)" }}>
              Welcome back, {session.user.name || session.user.email}!
            </p>
          </div>
          <div className="flex gap-2 flex-wrap justify-end">
            <Link href="/room/new" className="btn-ghost text-sm py-2">🎮 Live Game</Link>
            <Link href="/challenge/new" className="btn-ghost text-sm py-2">🎯 Challenge</Link>
            <Link href="/quiz/new" className="btn-coral text-sm py-2">+ New Quiz</Link>
          </div>
        </div>

        <DashboardClient quizzes={quizzes as never} challenges={challenges as never} />
      </div>
    </div>
  );
}
