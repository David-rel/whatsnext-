import { getRoomWithDetails } from "@/lib/game";
import { redirect } from "next/navigation";
import JoinTeamClient from "./JoinTeamClient";

export default async function JoinCodePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const room = await getRoomWithDetails(code.toUpperCase());

  if (!room || room.status === "FINISHED") redirect("/?error=notfound");
  if (room.status !== "LOBBY") redirect(`/play/${code.toUpperCase()}?late=1`);

  return <JoinTeamClient room={room as never} />;
}
