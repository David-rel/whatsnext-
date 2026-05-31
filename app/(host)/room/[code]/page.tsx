import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getRoomWithDetails } from "@/lib/game";
import HostLobby from "./HostLobby";
import HostGame from "./HostGame";

export default async function HostRoomPage({ params }: { params: Promise<{ code: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { code } = await params;
  const room = await getRoomWithDetails(code.toUpperCase());
  if (!room) redirect("/dashboard");
  if (room.host_id !== (session.user as { id: string }).id) redirect("/dashboard");

  if (room.status === "LOBBY") {
    return <HostLobby room={room as never} />;
  }
  return <HostGame room={room as never} />;
}
