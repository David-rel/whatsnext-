import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import QuizEditor from "@/components/QuizEditor";

export default async function NewQuizPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return <QuizEditor quiz={null} />;
}
