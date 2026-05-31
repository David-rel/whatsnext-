import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { sql } from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { quizId, title, videoUrl, order } = await req.json() as {
    quizId: string; title: string; videoUrl: string; order: number;
  };

  if (!quizId || !videoUrl) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const hostId = (session.user as { id: string }).id;
  const quizzes = await sql`SELECT id FROM whatsnext_quizzes WHERE id = ${quizId} AND host_id = ${hostId} LIMIT 1`;
  if (!quizzes[0]) return NextResponse.json({ error: "Quiz not found" }, { status: 404 });

  // Upsert — deduplicate if onUploadCompleted already saved it
  const existing = await sql`SELECT id FROM whatsnext_clips WHERE video_url = ${videoUrl} AND quiz_id = ${quizId} LIMIT 1`;
  if (existing[0]) {
    return NextResponse.json(existing[0]);
  }

  const rows = await sql`
    INSERT INTO whatsnext_clips (quiz_id, title, video_url, "order")
    VALUES (${quizId}, ${title ?? "Untitled Clip"}, ${videoUrl}, ${order ?? 0})
    RETURNING *
  `;
  return NextResponse.json(rows[0], { status: 201 });
}
