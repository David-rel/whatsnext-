import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { sql } from "@/lib/db";
import { generateRoomCode } from "@/lib/game";

// GET — list host's challenges
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const hostId = (session.user as { id: string }).id;

  const challenges = await sql`
    SELECT c.*, q.title AS quiz_title,
      COUNT(DISTINCT cp.id)::int AS player_count,
      COUNT(DISTINCT cs.id) FILTER (WHERE cs.awarded IS NULL)::int AS pending_count
    FROM whatsnext_challenges c
    JOIN whatsnext_quizzes q ON q.id = c.quiz_id
    LEFT JOIN whatsnext_challenge_players cp ON cp.challenge_id = c.id
    LEFT JOIN whatsnext_challenge_submissions cs ON cs.challenge_id = c.id
    WHERE c.host_id = ${hostId}
    GROUP BY c.id, q.title
    ORDER BY c.created_at DESC
  `;

  return NextResponse.json(challenges);
}

// POST — create a challenge
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const hostId = (session.user as { id: string }).id;

  const { quizId, title } = await req.json();
  if (!quizId) return NextResponse.json({ error: "Missing quizId" }, { status: 400 });

  const quiz = await sql`SELECT id FROM whatsnext_quizzes WHERE id = ${quizId} AND host_id = ${hostId} LIMIT 1`;
  if (!quiz[0]) return NextResponse.json({ error: "Quiz not found" }, { status: 404 });

  let code: string;
  for (;;) {
    code = generateRoomCode();
    const existing = await sql`SELECT id FROM whatsnext_challenges WHERE code = ${code} LIMIT 1`;
    if (!existing[0]) break;
  }

  const rows = await sql`
    INSERT INTO whatsnext_challenges (code, host_id, quiz_id, title)
    VALUES (${code!}, ${hostId}, ${quizId}, ${title ?? ""})
    RETURNING id, code
  `;

  return NextResponse.json(rows[0], { status: 201 });
}
