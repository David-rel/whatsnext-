import { NextRequest, NextResponse } from "next/server";
import { pusherServer } from "@/lib/pusher";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const params = new URLSearchParams(body);
  const socketId = params.get("socket_id")!;
  const channel = params.get("channel_name")!;

  // Allow any user into presence channels — they authenticate with player name
  const userData = { user_id: socketId, user_info: {} };
  const auth = pusherServer.authorizeChannel(socketId, channel, userData);
  return NextResponse.json(auth);
}
