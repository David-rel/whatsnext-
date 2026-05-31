import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { sql } from "@/lib/db";
import { generateRoomCode, TEAM_PRESETS, closeRoom } from "@/lib/game";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { quizId, teams, submissionTimerSecs = 60 } = body as {
    quizId: string;
    teams: { name: string; maxPlayers: number }[];
    submissionTimerSecs?: number;
  };

  if (!quizId || !teams?.length) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const hostId = (session.user as { id: string }).id;
  const quiz = await sql`SELECT id FROM whatsnext_quizzes WHERE id = ${quizId} AND host_id = ${hostId} LIMIT 1`;
  if (!quiz[0]) return NextResponse.json({ error: "Quiz not found" }, { status: 404 });

  // Close any active rooms this host already has (cleanup stale games)
  const activeRooms = await sql`SELECT code FROM whatsnext_rooms WHERE host_id = ${hostId} AND status != 'FINISHED'`;
  for (const old of activeRooms as { code: string }[]) {
    await closeRoom(old.code);
  }

  // Generate unique room code
  let code: string;
  for (;;) {
    code = generateRoomCode();
    const existing = await sql`SELECT id FROM whatsnext_rooms WHERE code = ${code} LIMIT 1`;
    if (!existing[0]) break;
  }

  const roomRows = await sql`
    INSERT INTO whatsnext_rooms (code, host_id, quiz_id, submission_timer_secs)
    VALUES (${code!}, ${hostId}, ${quizId}, ${submissionTimerSecs})
    RETURNING *
  `;
  const room = roomRows[0] as { id: string; code: string };

  // Create teams
  for (let i = 0; i < teams.length; i++) {
    const preset = TEAM_PRESETS[i % TEAM_PRESETS.length];
    await sql`
      INSERT INTO whatsnext_teams (room_id, name, color, emoji, max_players, "order")
      VALUES (${room.id}, ${teams[i].name}, ${preset.color}, ${preset.emoji}, ${teams[i].maxPlayers}, ${i})
    `;
  }

  return NextResponse.json({ code: room.code, id: room.id }, { status: 201 });
}
