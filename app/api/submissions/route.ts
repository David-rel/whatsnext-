import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { pusherServer, CHANNEL, EVENTS } from "@/lib/pusher";
import { advancePhase } from "@/lib/game";

export async function POST(req: NextRequest) {
  const { roomCode, teamId, clipId, answer } = await req.json();

  if (!roomCode || !teamId || !clipId || !answer?.trim()) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // Verify room is in SUBMITTING phase
  const rooms = await sql`SELECT * FROM whatsnext_rooms WHERE code = ${roomCode.toUpperCase()} LIMIT 1`;
  const room = rooms[0] as { id: string; current_phase: string; submission_timer_secs: number } | undefined;
  if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });
  if (room.current_phase !== "SUBMITTING") return NextResponse.json({ error: "Not accepting submissions" }, { status: 409 });

  // Upsert submission
  await sql`
    INSERT INTO whatsnext_submissions (clip_id, team_id, answer)
    VALUES (${clipId}, ${teamId}, ${answer.trim()})
    ON CONFLICT (clip_id, team_id) DO UPDATE SET answer = EXCLUDED.answer, created_at = NOW()
  `;

  // Count submitted vs total teams
  const submitted = await sql`SELECT COUNT(*)::int AS cnt FROM whatsnext_submissions WHERE clip_id = ${clipId}`;
  const total     = await sql`SELECT COUNT(*)::int AS cnt FROM whatsnext_teams WHERE room_id = ${room.id}`;
  const submittedCount = (submitted[0] as { cnt: number }).cnt;
  const totalCount     = (total[0] as { cnt: number }).cnt;

  await pusherServer.trigger(CHANNEL(roomCode.toUpperCase()), EVENTS.SUBMISSION_COUNTED, {
    submitted_count: submittedCount,
    total_teams: totalCount,
  });

  // Auto-advance when all teams have submitted
  if (submittedCount >= totalCount) {
    await advancePhase(roomCode.toUpperCase(), "REVEALING");
  }

  return NextResponse.json({ ok: true, submittedCount, totalCount });
}
