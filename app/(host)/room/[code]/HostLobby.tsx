"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Pusher from "pusher-js";
import { CHANNEL, EVENTS } from "@/lib/pusher-shared";
import type { RoomWithDetails } from "@/types";

export default function HostLobby({ room: initial }: { room: RoomWithDetails }) {
  const [room, setRoom] = useState(initial);
  const [starting, setStarting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
      channelAuthorization: { endpoint: "/api/pusher/auth", transport: "ajax" },
    });
    const channel = pusher.subscribe(CHANNEL(room.code));

    channel.bind(EVENTS.PLAYER_JOINED, (data: { player_name: string; team_id: string }) => {
      setRoom((r) => ({
        ...r,
        teams: r.teams.map((t) =>
          t.id === data.team_id
            ? { ...t, players: [...t.players, { id: Date.now().toString(), name: data.player_name, team_id: t.id, joined_at: new Date().toISOString() }] }
            : t
        ),
      }));
    });

    return () => pusher.disconnect();
  }, [room.code]);

  async function handleCancel() {
    if (!confirm("Cancel this game? Players will be disconnected.")) return;
    setCancelling(true);
    await fetch(`/api/rooms/${room.code}/close`, { method: "POST" });
    router.push("/dashboard");
  }

  async function handleStart() {
    setStarting(true);
    const res = await fetch("/api/game/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomCode: room.code }),
    });
    if (res.ok) {
      router.refresh();
    } else {
      const d = await res.json();
      alert(d.error || "Failed to start");
      setStarting(false);
    }
  }

  const totalJoined = room.teams.reduce((s, t) => s + t.players.length, 0);
  const totalCapacity = room.teams.reduce((s, t) => s + t.max_players, 0);
  const joinUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/join/${room.code}`;

  return (
    <div className="relative min-h-screen px-4 py-8">
      <div className="stars-bg" />
      <div className="relative z-10 max-w-3xl mx-auto flex flex-col gap-8">
        {/* Big join code display */}
        <div className="text-center glass rounded-3xl p-8">
          <p className="text-sm font-semibold mb-2" style={{ color: "rgba(255,255,255,0.5)", fontFamily: "var(--font-nunito)" }}>
            Players join at <span style={{ color: "#ff5733" }}>{typeof window !== "undefined" ? window.location.hostname : "whatsnext"}</span> and enter:
          </p>
          <div
            className="text-8xl font-bold tracking-[0.2em] my-4 pulse-glow rounded-2xl py-4 px-6 inline-block"
            style={{ fontFamily: "var(--font-fredoka), Fredoka, sans-serif", color: "#fff", background: "rgba(255,87,51,0.1)", border: "2px solid rgba(255,87,51,0.3)" }}
          >
            {room.code}
          </div>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)", fontFamily: "var(--font-nunito)" }}>
            {totalJoined} of {totalCapacity} players joined
          </p>
          {/* QR code */}
          <div className="mt-5 flex flex-col items-center gap-2">
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-nunito)" }}>or scan to join</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(joinUrl)}&color=ffffff&bgcolor=0d0d1a&margin=6`}
              alt={`QR code for ${joinUrl}`}
              width={160}
              height={160}
              className="rounded-xl"
              style={{ imageRendering: "pixelated" }}
            />
          </div>
        </div>

        {/* Teams grid */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {room.teams.map((team) => (
            <div
              key={team.id}
              className="glass rounded-2xl p-4 flex flex-col gap-2"
              style={{ borderColor: `${team.color}30` }}
            >
              <div className="flex items-center gap-2">
                <span className="text-2xl">{team.emoji}</span>
                <span className="font-bold text-sm leading-tight" style={{ fontFamily: "var(--font-fredoka), Fredoka, sans-serif", color: team.color }}>
                  {team.name}
                </span>
              </div>
              <div className="text-xs" style={{ color: "rgba(255,255,255,0.4)", fontFamily: "var(--font-nunito)" }}>
                {team.players.length}/{team.max_players}
              </div>
              <div className="flex flex-col gap-1 mt-1">
                {team.players.map((p) => (
                  <div key={p.id} className="text-xs px-2 py-1 rounded-full" style={{ background: `${team.color}20`, color: team.color }}>
                    {p.name}
                  </div>
                ))}
                {team.players.length === 0 && (
                  <p className="text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>Waiting...</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Quiz info */}
        <div className="glass rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="font-semibold" style={{ fontFamily: "var(--font-fredoka), Fredoka, sans-serif" }}>{room.quiz.title}</p>
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)", fontFamily: "var(--font-nunito)" }}>
              {room.quiz.clips.length} clip{room.quiz.clips.length !== 1 ? "s" : ""}
            </p>
          </div>
          <span className="chip" style={{ background: "rgba(255,87,51,0.2)", color: "#ff5733" }}>
            {room.quiz.clips.length} rounds
          </span>
        </div>

        <button
          onClick={handleStart}
          className="btn-coral justify-center py-5 text-2xl"
          disabled={starting || cancelling || totalJoined === 0 || room.quiz.clips.length === 0}
        >
          {starting ? "Starting..." : `Start Game! 🚀`}
        </button>
        {totalJoined === 0 && (
          <p className="text-center text-sm" style={{ color: "rgba(255,255,255,0.35)", fontFamily: "var(--font-nunito)" }}>
            Waiting for at least 1 player to join...
          </p>
        )}
        <button
          onClick={handleCancel}
          className="btn-ghost justify-center py-3 text-sm"
          disabled={cancelling || starting}
          style={{ color: "rgba(255,100,100,0.7)" }}
        >
          {cancelling ? "Cancelling..." : "🗑️ Cancel & Close Room"}
        </button>
      </div>
    </div>
  );
}
