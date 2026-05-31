"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Pusher from "pusher-js";
import { CHANNEL, EVENTS } from "@/lib/pusher-shared";
import type { RoomWithDetails, TeamWithPlayers } from "@/types";

export default function JoinTeamClient({ room: initial }: { room: RoomWithDetails }) {
  const [room, setRoom] = useState(initial);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState("");
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
      channelAuthorization: { endpoint: "/api/pusher/auth", transport: "ajax" },
    });
    const channel = pusher.subscribe(CHANNEL(room.code));

    channel.bind(EVENTS.PLAYER_JOINED, (data: { team_id: string; player_name: string }) => {
      setRoom((r) => ({
        ...r,
        teams: r.teams.map((t) =>
          t.id === data.team_id
            ? { ...t, players: [...t.players, { id: Date.now().toString(), name: data.player_name, team_id: t.id, joined_at: new Date().toISOString() }] }
            : t
        ),
      }));
    });

    channel.bind(EVENTS.GAME_STARTED, () => {
      router.push(`/play/${room.code}`);
    });

    return () => { pusher.disconnect(); };
  }, [room.code, router]);

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTeamId || !playerName.trim()) return;
    setError("");
    setJoining(true);

    const res = await fetch("/api/players/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomCode: room.code, teamId: selectedTeamId, playerName: playerName.trim() }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Could not join");
      setJoining(false);
      return;
    }

    // Store player info in sessionStorage
    sessionStorage.setItem("wn_player", JSON.stringify({ playerId: data.playerId, teamId: data.teamId, playerName: playerName.trim() }));
    router.push(`/play/${room.code}`);
  }

  const totalCapacity = room.teams.reduce((s, t) => s + t.max_players, 0);
  const totalJoined  = room.teams.reduce((s, t) => s + t.players.length, 0);

  return (
    <div className="relative min-h-screen px-4 py-8">
      <div className="stars-bg" />
      <div className="relative z-10 max-w-md mx-auto flex flex-col gap-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold" style={{ fontFamily: "var(--font-fredoka), Fredoka, sans-serif", textShadow: "0 2px 20px rgba(255,87,51,0.4)" }}>
            What&apos;s Next?
          </h1>
          <p className="mt-1 text-sm" style={{ color: "rgba(255,255,255,0.5)", fontFamily: "var(--font-nunito)" }}>
            Room <span className="font-bold tracking-widest" style={{ color: "#ff5733" }}>{room.code}</span> · {totalJoined}/{totalCapacity} players joined
          </p>
        </div>

        {/* Name input */}
        <div className="glass rounded-2xl p-5">
          <label className="block text-sm font-semibold mb-2" style={{ color: "rgba(255,255,255,0.7)", fontFamily: "var(--font-nunito)" }}>Your Name</label>
          <input
            className="input-field text-lg"
            placeholder="Enter your name..."
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            maxLength={30}
            autoFocus
          />
        </div>

        {/* Team picker */}
        <div>
          <p className="text-sm font-semibold mb-3" style={{ color: "rgba(255,255,255,0.7)", fontFamily: "var(--font-nunito)" }}>
            Pick Your Team
          </p>
          <div className="grid grid-cols-2 gap-3">
            {room.teams.map((team) => {
              const isFull = team.players.length >= team.max_players;
              const isSelected = selectedTeamId === team.id;
              return (
                <button
                  key={team.id}
                  onClick={() => !isFull && setSelectedTeamId(team.id)}
                  disabled={isFull}
                  className="rounded-2xl p-4 flex flex-col gap-2 text-left transition-all"
                  style={{
                    background: isSelected ? `${team.color}25` : "rgba(255,255,255,0.05)",
                    border: `2px solid ${isSelected ? team.color : "rgba(255,255,255,0.1)"}`,
                    opacity: isFull ? 0.45 : 1,
                    cursor: isFull ? "not-allowed" : "pointer",
                    boxShadow: isSelected ? `0 0 20px ${team.color}40` : "none",
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{team.emoji}</span>
                    <span className="font-bold text-sm" style={{ fontFamily: "var(--font-fredoka), Fredoka, sans-serif", color: isSelected ? team.color : "#fff" }}>
                      {team.name}
                    </span>
                  </div>
                  <div className="text-xs" style={{ color: "rgba(255,255,255,0.5)", fontFamily: "var(--font-nunito)" }}>
                    {team.players.length}/{team.max_players} players
                    {isFull && " · Full!"}
                  </div>
                  {team.players.length > 0 && (
                    <div className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                      {team.players.map((p) => p.name).join(", ")}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {error && (
          <p className="text-sm text-center py-2 px-3 rounded-xl" style={{ background: "rgba(255,87,51,0.15)", color: "#ff5733", fontFamily: "var(--font-nunito)" }}>
            {error}
          </p>
        )}

        <form onSubmit={handleJoin}>
          <button
            type="submit"
            className="btn-coral w-full justify-center py-4 text-xl"
            disabled={joining || !selectedTeamId || !playerName.trim()}
          >
            {joining ? "Joining..." : "Join Team! 🎉"}
          </button>
        </form>

        <p className="text-xs text-center" style={{ color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-nunito)" }}>
          Waiting for the host to start the game...
        </p>
      </div>
    </div>
  );
}
