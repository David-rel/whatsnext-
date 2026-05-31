import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { pusherServer, CHANNEL, EVENTS } from "@/lib/pusher";

export async function POST(req: NextRequest) {
  const { roomCode, teamId, playerName } = await req.json();

  if (!roomCode || !teamId || !playerName?.trim()) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // Verify room is still in LOBBY
  const rooms = await sql`SELECT * FROM whatsnext_rooms WHERE code = ${roomCode.toUpperCase()} LIMIT 1`;
  const room = rooms[0] as { id: string; status: string } | undefined;
  if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });
  if (room.status !== "LOBBY") return NextResponse.json({ error: "Game already started" }, { status: 409 });

  // Verify team belongs to this room and has space
  const teams = await sql`SELECT * FROM whatsnext_teams WHERE id = ${teamId} AND room_id = ${room.id} LIMIT 1`;
  const team = teams[0] as { id: string; name: string; max_players: number } | undefined;
  if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });

  const playerCount = await sql`SELECT COUNT(*)::int AS cnt FROM whatsnext_players WHERE team_id = ${teamId}`;
  const count = (playerCount[0] as { cnt: number }).cnt;
  if (count >= team.max_players) return NextResponse.json({ error: "Team is full" }, { status: 409 });

  const players = await sql`
    INSERT INTO whatsnext_players (team_id, name) VALUES (${teamId}, ${playerName.trim()})
    RETURNING *
  `;
  const player = players[0] as { id: string };

  await pusherServer.trigger(CHANNEL(roomCode.toUpperCase()), EVENTS.PLAYER_JOINED, {
    player_name: playerName.trim(),
    player_id: player.id,
    team_id: teamId,
    team_name: team.name,
  });

  return NextResponse.json({ playerId: player.id, teamId, roomCode: roomCode.toUpperCase() }, { status: 201 });
}
