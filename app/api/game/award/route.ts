import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { sql } from "@/lib/db";
import { pusherServer, CHANNEL, EVENTS } from "@/lib/pusher";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { roomCode, winnerTeamIds, clipId } = await req.json() as {
    roomCode: string;
    winnerTeamIds: string[];
    clipId: string;
  };

  // Verify host
  const rooms = await sql`SELECT id FROM whatsnext_rooms WHERE code = ${roomCode} AND host_id = ${(session.user as { id: string }).id} LIMIT 1`;
  const room = rooms[0] as { id: string } | undefined;
  if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

  // Award points & record results
  if (winnerTeamIds.length > 0) {
    for (const teamId of winnerTeamIds) {
      await sql`UPDATE whatsnext_teams SET score = score + 1 WHERE id = ${teamId} AND room_id = ${room.id}`;
      await sql`INSERT INTO whatsnext_round_results (clip_id, team_id) VALUES (${clipId}, ${teamId})`;
    }
  }

  // Fetch updated scores
  const teams = await sql`SELECT id, name, color, emoji, score FROM whatsnext_teams WHERE room_id = ${room.id} ORDER BY score DESC`;

  await pusherServer.trigger(CHANNEL(roomCode), EVENTS.WINNERS_AWARDED, {
    winner_team_ids: winnerTeamIds,
    scores: (teams as { id: string; score: number }[]).map((t) => ({ team_id: t.id, score: t.score })),
    teams,
  });

  return NextResponse.json({ ok: true, scores: teams });
}
