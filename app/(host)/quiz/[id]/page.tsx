import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { sql } from "@/lib/db";
import QuizEditor from "@/components/QuizEditor";

export default async function EditQuizPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { id } = await params;

  const quizzes = await sql`SELECT * FROM whatsnext_quizzes WHERE id = ${id} AND host_id = ${(session.user as { id: string }).id} LIMIT 1`;
  if (!quizzes[0]) redirect("/dashboard");

  const clips = await sql`SELECT * FROM whatsnext_clips WHERE quiz_id = ${id} ORDER BY "order" ASC`;
  return <QuizEditor quiz={{ ...quizzes[0], clips } as never} />;
}
