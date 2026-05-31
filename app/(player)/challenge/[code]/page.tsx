import { redirect } from "next/navigation";
import { sql } from "@/lib/db";
import ChallengePlayer from "./ChallengePlayer";

export default async function PlayerChallengePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const upper = code.toUpperCase();

  const rows = await sql`
    SELECT c.*, q.title AS quiz_title
    FROM whatsnext_challenges c
    JOIN whatsnext_quizzes q ON q.id = c.quiz_id
    WHERE c.code = ${upper} LIMIT 1
  `;
  if (!rows[0]) redirect("/");
  const challenge = rows[0] as Record<string, unknown>;
  if (challenge.status === "CLOSED") redirect("/");

  const clips = await sql`SELECT * FROM whatsnext_clips WHERE quiz_id = ${challenge.quiz_id} ORDER BY "order" ASC`;

  return (
    <ChallengePlayer
      code={upper}
      challengeId={challenge.id as string}
      quizTitle={challenge.quiz_title as string}
      challengeTitle={challenge.title as string}
      clips={clips as never}
    />
  );
}
