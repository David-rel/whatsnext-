export type RoomStatus = "LOBBY" | "PLAYING" | "FINISHED";
export type GamePhase = "WATCHING" | "SUBMITTING" | "REVEALING" | "SCORING";

export interface User {
  id: string;
  email: string;
  name: string;
  created_at: string;
}

export interface Quiz {
  id: string;
  host_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface Clip {
  id: string;
  quiz_id: string;
  title: string;
  video_url: string;
  duration: number;
  order: number;
  created_at: string;
}

export interface Room {
  id: string;
  code: string;
  host_id: string;
  quiz_id: string;
  status: RoomStatus;
  current_clip_index: number;
  current_phase: GamePhase | null;
  submission_timer_secs: number;
  phase_started_at: string | null;
  created_at: string;
}

export interface Team {
  id: string;
  room_id: string;
  name: string;
  color: string;
  emoji: string;
  max_players: number;
  score: number;
  order: number;
}

export interface Player {
  id: string;
  team_id: string;
  name: string;
  joined_at: string;
}

export interface Submission {
  id: string;
  clip_id: string;
  team_id: string;
  answer: string;
  created_at: string;
}

export interface TeamWithPlayers extends Team {
  players: Player[];
}

export interface RoomWithDetails extends Room {
  quiz: Quiz & { clips: Clip[] };
  teams: TeamWithPlayers[];
}

export interface SubmissionWithTeam extends Submission {
  team_name: string;
  team_color: string;
  team_emoji: string;
}

// Pusher event payloads
export interface PhaseChangedPayload {
  phase: GamePhase;
  clip_index?: number;
  clip?: Clip;
  timer_secs?: number;
  clip_id?: string;
}

export interface WinnersPayload {
  winner_team_ids: string[];
  scores: { team_id: string; score: number }[];
}

export interface GameEndedPayload {
  final_scores: { id: string; name: string; color: string; emoji: string; score: number }[];
}

export interface PlayerJoinedPayload {
  player_name: string;
  team_id: string;
  team_name: string;
}
