import { getRoomWithDetails } from "@/lib/game";
import { redirect } from "next/navigation";
import PlayerGame from "./PlayerGame";

export default async function PlayPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const room = await getRoomWithDetails(code.toUpperCase());
  if (!room || room.status === "FINISHED") redirect("/");

  return <PlayerGame room={room as never} />;
}
