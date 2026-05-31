import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const upper = code.toUpperCase();

  const rows = await sql`
    SELECT c.*, q.title AS quiz_title
    FROM whatsnext_challenges c
    JOIN whatsnext_quizzes q ON q.id = c.quiz_id
    WHERE c.code = ${upper} LIMIT 1
  `;
  if (!rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const challenge = rows[0] as Record<string, unknown>;

  const clips = await sql`
    SELECT * FROM whatsnext_clips WHERE quiz_id = ${challenge.quiz_id} ORDER BY "order" ASC
  `;

  const players = await sql`
    SELECT * FROM whatsnext_challenge_players WHERE challenge_id = ${challenge.id} ORDER BY score DESC, joined_at ASC
  `;

  const subs = await sql`
    SELECT cs.*, cp.name AS player_name
    FROM whatsnext_challenge_submissions cs
    JOIN whatsnext_challenge_players cp ON cp.id = cs.player_id
    WHERE cs.challenge_id = ${challenge.id}
  `;

  const playersWithSubs = (players as { id: string }[]).map((p) => ({
    ...p,
    submissions: (subs as { player_id: string }[]).filter((s) => s.player_id === p.id),
  }));

  return NextResponse.json({
    ...challenge,
    quiz: {
      id: challenge.quiz_id,
      title: challenge.quiz_title,
      clips,
    },
    players: playersWithSubs,
  });
}
