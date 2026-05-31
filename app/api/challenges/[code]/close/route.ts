import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { sql } from "@/lib/db";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { code } = await params;
  const upper = code.toUpperCase();

  const rows = await sql`SELECT id, host_id FROM whatsnext_challenges WHERE code = ${upper} LIMIT 1`;
  const challenge = rows[0] as { id: string; host_id: string } | undefined;
  if (!challenge) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (challenge.host_id !== (session.user as { id: string }).id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await sql`UPDATE whatsnext_challenges SET status = 'CLOSED' WHERE id = ${challenge.id}`;
  return NextResponse.json({ ok: true });
}
