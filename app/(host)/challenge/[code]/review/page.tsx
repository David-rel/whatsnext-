import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { sql } from "@/lib/db";
import ChallengeReview from "./ChallengeReview";

export default async function HostChallengePage({ params }: { params: Promise<{ code: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { code } = await params;
  const upper = code.toUpperCase();
  const hostId = (session.user as { id: string }).id;

  const rows = await sql`SELECT id, host_id FROM whatsnext_challenges WHERE code = ${upper} LIMIT 1`;
  const challenge = rows[0] as { id: string; host_id: string } | undefined;
  if (!challenge || challenge.host_id !== hostId) redirect("/dashboard");

  return <ChallengeReview code={upper} />;
}
