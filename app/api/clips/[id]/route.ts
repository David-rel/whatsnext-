import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { sql } from "@/lib/db";
import { del } from "@vercel/blob";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();

  // Allowed fields: title, order, duration
  const updates: string[] = [];
  if (body.title != null) updates.push(`title = '${(body.title as string).replace(/'/g, "''")}'`);
  if (body.order != null) {
    await sql`UPDATE whatsnext_clips SET "order" = ${Number(body.order)} WHERE id = ${id}`;
  }
  if (body.duration != null) {
    await sql`UPDATE whatsnext_clips SET duration = ${Number(body.duration)} WHERE id = ${id}`;
  }
  if (body.title != null) {
    await sql`UPDATE whatsnext_clips SET title = ${body.title as string} WHERE id = ${id}`;
  }

  const rows = await sql`SELECT * FROM whatsnext_clips WHERE id = ${id} LIMIT 1`;
  return NextResponse.json(rows[0] ?? { ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const clips = await sql`SELECT c.* FROM whatsnext_clips c JOIN whatsnext_quizzes q ON q.id = c.quiz_id WHERE c.id = ${id} AND q.host_id = ${(session.user as { id: string }).id} LIMIT 1`;
  if (!clips[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const clip = clips[0] as { video_url: string };
  try {
    await del(clip.video_url, { token: process.env.BLOB_READ_WRITE_TOKEN! });
  } catch {
    // blob may already be gone
  }

  await sql`DELETE FROM whatsnext_clips WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}
