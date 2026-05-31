// Client-safe Pusher constants — no server imports

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
