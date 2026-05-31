import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { sql } from "@/lib/db";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const hostId = (session.user as { id: string }).id;

  const body = (await req.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (_pathname, clientPayload) => {
        const { quizId } = JSON.parse(clientPayload ?? "{}") as { quizId: string };
        const quizzes = await sql`SELECT id FROM whatsnext_quizzes WHERE id = ${quizId} AND host_id = ${hostId} LIMIT 1`;
        if (!quizzes[0]) throw new Error("Quiz not found or not yours");
        return {
          allowedContentTypes: ["video/mp4", "video/webm", "video/quicktime", "video/x-m4v", "video/avi"],
          tokenPayload: clientPayload,
          addRandomSuffix: true,
          pathname: `whatsnext/clips/${quizId}/`,
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        // Only fires in production; client also calls /api/clips/save as fallback
        const { quizId, title, order } = JSON.parse(tokenPayload ?? "{}") as { quizId: string; title: string; order: number };
        const existing = await sql`SELECT id FROM whatsnext_clips WHERE video_url = ${blob.url} LIMIT 1`;
        if (existing.length === 0) {
          await sql`INSERT INTO whatsnext_clips (quiz_id, title, video_url, "order") VALUES (${quizId}, ${title}, ${blob.url}, ${order ?? 0})`;
        }
      },
    });
    return NextResponse.json(jsonResponse);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
