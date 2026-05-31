import PusherServer from "pusher";

export const pusherServer = new PusherServer({
  appId:   process.env.PUSHER_APP_ID!,
  key:     process.env.PUSHER_KEY!,
  secret:  process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER!,
  useTLS:  true,
});

export const CHANNEL = (code: string) => `presence-room-${code}`;

export const EVENTS = {
  PLAYER_JOINED:      "player:joined",
  PLAYER_LEFT:        "player:left",
  GAME_STARTED:       "game:started",
  PHASE_CHANGED:      "phase:changed",
  SUBMISSION_COUNTED: "submission:counted",
  ANSWERS_REVEALED:   "answers:revealed",
  WINNERS_AWARDED:    "winners:awarded",
  GAME_ENDED:         "game:ended",
} as const;
