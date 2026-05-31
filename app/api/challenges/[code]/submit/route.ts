import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function POST(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const upper = code.toUpperCase();
  const { playerId, clipId, answer, nextClipIndex, done } = await req.json();

  if (!playerId || !clipId || !answer?.trim()) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // Verify challenge is open
  const rows = await sql`SELECT id, status FROM whatsnext_challenges WHERE code = ${upper} LIMIT 1`;
  const challenge = rows[0] as { id: string; status: string } | undefined;
  if (!challenge || challenge.status === "CLOSED") {
    return NextResponse.json({ error: "Challenge not found or closed" }, { status: 404 });
  }

  // Upsert submission
  await sql`
    INSERT INTO whatsnext_challenge_submissions (challenge_id, player_id, clip_id, answer)
    VALUES (${challenge.id}, ${playerId}, ${clipId}, ${answer.trim()})
    ON CONFLICT (player_id, clip_id) DO UPDATE SET answer = EXCLUDED.answer, created_at = NOW()
  `;

  // Advance player progress
  if (typeof nextClipIndex === "number") {
    await sql`
      UPDATE whatsnext_challenge_players
      SET current_clip_index = ${nextClipIndex}, status = ${done ? "DONE" : "PLAYING"}
      WHERE id = ${playerId}
    `;
  }

  return NextResponse.json({ ok: true });
}
