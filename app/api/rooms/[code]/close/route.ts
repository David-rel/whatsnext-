import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { sql } from "@/lib/db";
import { closeRoom } from "@/lib/game";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { code } = await params;
  const upper = code.toUpperCase();

  const rows = await sql`SELECT host_id FROM whatsnext_rooms WHERE code = ${upper} LIMIT 1`;
  const room = rows[0] as { host_id: string } | undefined;
  if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });
  if (room.host_id !== (session.user as { id: string }).id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await closeRoom(upper);
  return NextResponse.json({ ok: true });
}
