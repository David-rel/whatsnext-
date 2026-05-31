import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { sql } from "@/lib/db";
import RoomSetupClient from "./RoomSetupClient";

export default async function NewRoomPage({ searchParams }: { searchParams: Promise<{ quiz?: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { quiz: preselectedQuiz } = await searchParams;

  const quizzes = await sql`
    SELECT q.*, COUNT(c.id)::int AS clip_count
    FROM whatsnext_quizzes q
    LEFT JOIN whatsnext_clips c ON c.quiz_id = q.id
    WHERE q.host_id = ${(session.user as { id: string }).id}
    GROUP BY q.id
    ORDER BY q.created_at DESC
  `;

  return <RoomSetupClient quizzes={quizzes as never} preselectedQuizId={preselectedQuiz ?? null} />;
}
