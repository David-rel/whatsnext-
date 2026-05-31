import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { sql } from "@/lib/db";
import ChallengeSetupClient from "./ChallengeSetupClient";

export default async function NewChallengePage({ searchParams }: { searchParams: Promise<{ quiz?: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const hostId = (session.user as { id: string }).id;
  const { quiz: preselectedQuizId } = await searchParams;

  const quizzes = await sql`
    SELECT q.id, q.title, COUNT(c.id)::int AS clip_count
    FROM whatsnext_quizzes q
    LEFT JOIN whatsnext_clips c ON c.quiz_id = q.id
    WHERE q.host_id = ${hostId}
    GROUP BY q.id
    ORDER BY q.created_at DESC
  `;

  return <ChallengeSetupClient quizzes={quizzes as never} preselectedQuizId={preselectedQuizId} />;
}
