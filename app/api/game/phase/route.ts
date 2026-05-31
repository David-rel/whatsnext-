import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { sql } from "@/lib/db";
import { advancePhase } from "@/lib/game";
import type { GamePhase } from "@/types";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { roomCode, phase } = await req.json() as { roomCode: string; phase: GamePhase | "NEXT_CLIP" | "END" };

  // Verify host owns this room
  const rooms = await sql`SELECT id FROM whatsnext_rooms WHERE code = ${roomCode} AND host_id = ${(session.user as { id: string }).id} LIMIT 1`;
  if (!rooms[0]) return NextResponse.json({ error: "Room not found" }, { status: 404 });

  await advancePhase(roomCode, phase);
  return NextResponse.json({ ok: true });
}
