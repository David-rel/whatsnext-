import PusherServer from "pusher";

export const pusherServer = new PusherServer({
  appId:   process.env.PUSHER_APP_ID!,
  key:     process.env.PUSHER_KEY!,
  secret:  process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER!,
  useTLS:  true,
});

// Re-export shared constants so server code can import from one place
export { CHANNEL, EVENTS } from "@/lib/pusher-shared";
