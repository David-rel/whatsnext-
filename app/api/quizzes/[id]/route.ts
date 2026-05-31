import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { sql } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const quizzes = await sql`SELECT * FROM whatsnext_quizzes WHERE id = ${id} AND host_id = ${(session.user as { id: string }).id} LIMIT 1`;
  if (!quizzes[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const clips = await sql`SELECT * FROM whatsnext_clips WHERE quiz_id = ${id} ORDER BY "order" ASC`;
  return NextResponse.json({ ...quizzes[0], clips });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { title } = await req.json();

  await sql`UPDATE whatsnext_quizzes SET title = ${title}, updated_at = NOW() WHERE id = ${id} AND host_id = ${(session.user as { id: string }).id}`;
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  await sql`DELETE FROM whatsnext_quizzes WHERE id = ${id} AND host_id = ${(session.user as { id: string }).id}`;
  return NextResponse.json({ ok: true });
}
