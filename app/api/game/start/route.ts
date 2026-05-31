import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { sql } from "@/lib/db";
import { pusherServer, CHANNEL, EVENTS } from "@/lib/pusher";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { roomCode } = await req.json();
  const rooms = await sql`
    SELECT r.* FROM whatsnext_rooms r
    WHERE r.code = ${roomCode} AND r.host_id = ${(session.user as { id: string }).id}
    LIMIT 1
  `;
  const room = rooms[0] as { id: string; quiz_id: string; status: string } | undefined;
  if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });
  if (room.status !== "LOBBY") return NextResponse.json({ error: "Already started" }, { status: 409 });

  const clips = await sql`SELECT * FROM whatsnext_clips WHERE quiz_id = ${room.quiz_id} ORDER BY "order" ASC LIMIT 1`;
  if (!clips[0]) return NextResponse.json({ error: "No clips in quiz" }, { status: 400 });

  await sql`
    UPDATE whatsnext_rooms
    SET status = 'PLAYING', current_clip_index = 0, current_phase = 'WATCHING', phase_started_at = NOW()
    WHERE code = ${roomCode}
  `;

  await pusherServer.trigger(CHANNEL(roomCode), EVENTS.GAME_STARTED, {
    clip_index: 0,
    clip: clips[0],
  });
  await pusherServer.trigger(CHANNEL(roomCode), EVENTS.PHASE_CHANGED, {
    phase: "WATCHING",
    clip_index: 0,
    clip: clips[0],
  });

  return NextResponse.json({ ok: true });
}
