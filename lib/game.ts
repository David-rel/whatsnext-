import { sql } from "@/lib/db";
import { pusherServer, CHANNEL, EVENTS } from "@/lib/pusher";
import { TEAM_PRESETS } from "@/lib/game-shared";
import type { RoomWithDetails, GamePhase } from "@/types";

export { TEAM_PRESETS };

export function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

const ROOM_EXPIRE_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function getRoomWithDetails(code: string): Promise<RoomWithDetails | null> {
  const rooms = await sql`
    SELECT r.*, q.id AS quiz_id_check, q.title AS quiz_title
    FROM whatsnext_rooms r
    JOIN whatsnext_quizzes q ON q.id = r.quiz_id
    WHERE r.code = ${code}
    LIMIT 1
  `;
  if (!rooms[0]) return null;
  const room = rooms[0] as Record<string, unknown>;

  // Auto-expire rooms older than 24 hours that are still active
  const ageMs = Date.now() - new Date(room.created_at as string).getTime();
  if (room.status !== "FINISHED" && ageMs > ROOM_EXPIRE_MS) {
    await sql`UPDATE whatsnext_rooms SET status = 'FINISHED', current_phase = NULL WHERE code = ${code}`;
    room.status = "FINISHED";
    room.current_phase = null;
  }

  const clips = await sql`
    SELECT * FROM whatsnext_clips WHERE quiz_id = ${room.quiz_id} ORDER BY "order" ASC
  `;

  const teams = await sql`
    SELECT * FROM whatsnext_teams WHERE room_id = ${room.id} ORDER BY "order" ASC
  `;

  const teamIds = (teams as { id: string }[]).map((t) => t.id);
  const players = teamIds.length
    ? await sql`SELECT * FROM whatsnext_players WHERE team_id = ANY(${teamIds}) ORDER BY joined_at ASC`
    : [];

  const teamsWithPlayers = (teams as { id: string }[]).map((t) => ({
    ...t,
    players: (players as { team_id: string }[]).filter((p) => p.team_id === t.id),
  }));

  return {
    ...room,
    quiz: {
      id: room.quiz_id as string,
      host_id: room.host_id as string,
      title: room.quiz_title as string,
      created_at: "",
      updated_at: "",
      clips: clips,
    },
    teams: teamsWithPlayers,
  } as unknown as RoomWithDetails;
}

export async function advancePhase(roomCode: string, nextPhase: GamePhase | "NEXT_CLIP" | "END") {
  const room = await getRoomWithDetails(roomCode);
  if (!room) throw new Error("Room not found");

  const clips = room.quiz.clips;

  if (nextPhase === "NEXT_CLIP") {
    const nextIndex = room.current_clip_index + 1;
    if (nextIndex >= clips.length) {
      return advancePhase(roomCode, "END");
    }
    await sql`
      UPDATE whatsnext_rooms
      SET current_clip_index = ${nextIndex}, current_phase = 'WATCHING', phase_started_at = NOW()
      WHERE code = ${roomCode}
    `;
    await pusherServer.trigger(CHANNEL(roomCode), EVENTS.PHASE_CHANGED, {
      phase: "WATCHING",
      clip_index: nextIndex,
      clip: clips[nextIndex],
    });
    return;
  }

  if (nextPhase === "END") {
    await sql`
      UPDATE whatsnext_rooms SET status = 'FINISHED', current_phase = NULL WHERE code = ${roomCode}
    `;
    const teams = await sql`
      SELECT * FROM whatsnext_teams WHERE room_id = ${room.id} ORDER BY score DESC
    `;
    await pusherServer.trigger(CHANNEL(roomCode), EVENTS.GAME_ENDED, {
      final_scores: (teams as { id: string; name: string; color: string; emoji: string; score: number }[]).map(
        (t) => ({ id: t.id, name: t.name, color: t.color, emoji: t.emoji, score: t.score })
      ),
    });
    return;
  }

  await sql`
    UPDATE whatsnext_rooms SET current_phase = ${nextPhase}, phase_started_at = NOW() WHERE code = ${roomCode}
  `;

  const currentClip = clips[room.current_clip_index];

  if (nextPhase === "SUBMITTING") {
    await pusherServer.trigger(CHANNEL(roomCode), EVENTS.PHASE_CHANGED, {
      phase: "SUBMITTING",
      timer_secs: room.submission_timer_secs,
      clip_id: currentClip?.id,
    });
  } else if (nextPhase === "REVEALING") {
    const subs = await sql`
      SELECT s.*, t.name AS team_name, t.color AS team_color, t.emoji AS team_emoji
      FROM whatsnext_submissions s
      JOIN whatsnext_teams t ON t.id = s.team_id
      WHERE s.clip_id = ${currentClip?.id}
    `;
    await pusherServer.trigger(CHANNEL(roomCode), EVENTS.ANSWERS_REVEALED, {
      submissions: subs,
    });
    await pusherServer.trigger(CHANNEL(roomCode), EVENTS.PHASE_CHANGED, { phase: "REVEALING" });
  } else if (nextPhase === "SCORING") {
    await pusherServer.trigger(CHANNEL(roomCode), EVENTS.PHASE_CHANGED, { phase: "SCORING" });
  }
}

export async function closeRoom(roomCode: string): Promise<void> {
  const rows = await sql`SELECT id, status FROM whatsnext_rooms WHERE code = ${roomCode} LIMIT 1`;
  const room = rows[0] as { id: string; status: string } | undefined;
  if (!room || room.status === "FINISHED") return;

  await sql`UPDATE whatsnext_rooms SET status = 'FINISHED', current_phase = NULL WHERE code = ${roomCode}`;

  const teams = await sql`SELECT * FROM whatsnext_teams WHERE room_id = ${room.id} ORDER BY score DESC`;
  try {
    await pusherServer.trigger(CHANNEL(roomCode), EVENTS.GAME_ENDED, {
      final_scores: (teams as { id: string; name: string; color: string; emoji: string; score: number }[]).map(
        (t) => ({ id: t.id, name: t.name, color: t.color, emoji: t.emoji, score: t.score })
      ),
    });
  } catch {
    // Pusher trigger may fail if channel has no subscribers — that's fine
  }
}
