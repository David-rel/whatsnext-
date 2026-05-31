import { getRoomWithDetails } from "@/lib/game";
import { sql } from "@/lib/db";
import { redirect } from "next/navigation";
import JoinTeamClient from "./JoinTeamClient";

export default async function JoinCodePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const upper = code.toUpperCase();

  // Check if it's a Challenge code first
  const challengeRows = await sql`SELECT code, status FROM whatsnext_challenges WHERE code = ${upper} LIMIT 1`;
  if (challengeRows[0]) {
    const ch = challengeRows[0] as { code: string; status: string };
    if (ch.status === "CLOSED") redirect("/?error=notfound");
    redirect(`/challenge/${upper}`);
  }

  // Otherwise treat as a live game room
  const room = await getRoomWithDetails(upper);
  if (!room || room.status === "FINISHED") redirect("/?error=notfound");
  if (room.status !== "LOBBY") redirect(`/play/${upper}?late=1`);

  return <JoinTeamClient room={room as never} />;
}
