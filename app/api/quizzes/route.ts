import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { sql } from "@/lib/db";
import { z } from "zod";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const quizzes = await sql`
    SELECT q.*, COUNT(c.id)::int AS clip_count
    FROM whatsnext_quizzes q
    LEFT JOIN whatsnext_clips c ON c.quiz_id = q.id
    WHERE q.host_id = ${(session.user as { id: string }).id}
    GROUP BY q.id
    ORDER BY q.created_at DESC
  `;
  return NextResponse.json(quizzes);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { title } = await req.json();
  if (!title?.trim()) return NextResponse.json({ error: "Title required" }, { status: 400 });

  const rows = await sql`
    INSERT INTO whatsnext_quizzes (host_id, title) VALUES (${(session.user as { id: string }).id}, ${title.trim()})
    RETURNING *
  `;
  return NextResponse.json(rows[0], { status: 201 });
}
