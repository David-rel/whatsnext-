import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function POST(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const upper = code.toUpperCase();
  const { name } = await req.json();

  if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });

  const rows = await sql`SELECT id, status FROM whatsnext_challenges WHERE code = ${upper} LIMIT 1`;
  const challenge = rows[0] as { id: string; status: string } | undefined;
  if (!challenge) return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
  if (challenge.status === "CLOSED") return NextResponse.json({ error: "Challenge is closed" }, { status: 409 });

  const player = await sql`
    INSERT INTO whatsnext_challenge_players (challenge_id, name)
    VALUES (${challenge.id}, ${name.trim()})
    RETURNING id, name, score, current_clip_index, status
  `;

  return NextResponse.json(player[0], { status: 201 });
}
