import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { sql } from "@/lib/db";

export async function POST(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { code } = await params;
  const upper = code.toUpperCase();
  const { submissionId, awarded } = await req.json() as { submissionId: string; awarded: boolean };

  const rows = await sql`SELECT id, host_id FROM whatsnext_challenges WHERE code = ${upper} LIMIT 1`;
  const challenge = rows[0] as { id: string; host_id: string } | undefined;
  if (!challenge) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (challenge.host_id !== (session.user as { id: string }).id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Get current awarded state to know if we need to adjust score
  const subRows = await sql`
    SELECT id, player_id, awarded FROM whatsnext_challenge_submissions WHERE id = ${submissionId} LIMIT 1
  `;
  const sub = subRows[0] as { id: string; player_id: string; awarded: boolean | null } | undefined;
  if (!sub) return NextResponse.json({ error: "Submission not found" }, { status: 404 });

  // Update the submission
  await sql`UPDATE whatsnext_challenge_submissions SET awarded = ${awarded} WHERE id = ${submissionId}`;

  // Adjust player score: +1 if newly awarded, -1 if revoking an award
  const wasAwarded = sub.awarded === true;
  const nowAwarded = awarded === true;
  if (!wasAwarded && nowAwarded) {
    await sql`UPDATE whatsnext_challenge_players SET score = score + 1 WHERE id = ${sub.player_id}`;
  } else if (wasAwarded && !nowAwarded) {
    await sql`UPDATE whatsnext_challenge_players SET score = GREATEST(score - 1, 0) WHERE id = ${sub.player_id}`;
  }

  return NextResponse.json({ ok: true });
}
