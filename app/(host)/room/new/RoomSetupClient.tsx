"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { TEAM_PRESETS } from "@/lib/game-shared";

interface QuizOption {
  id: string;
  title: string;
  clip_count: number;
}

interface TeamConfig {
  name: string;
  maxPlayers: number;
}

const DEFAULT_TEAMS: TeamConfig[] = [
  { name: "Team 1", maxPlayers: 1 },
  { name: "Team 2", maxPlayers: 1 },
];

export default function RoomSetupClient({
  quizzes,
  preselectedQuizId,
}: {
  quizzes: QuizOption[];
  preselectedQuizId: string | null;
}) {
  const [selectedQuizId, setSelectedQuizId] = useState(preselectedQuizId ?? quizzes[0]?.id ?? "");
  const [teams, setTeams] = useState<TeamConfig[]>(DEFAULT_TEAMS);
  const [timerSecs, setTimerSecs] = useState(60);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  function addTeam() {
    if (teams.length >= 8) return;
    setTeams((t) => [...t, { name: `Team ${t.length + 1}`, maxPlayers: 4 }]);
  }

  function removeTeam(i: number) {
    setTeams((t) => t.filter((_, idx) => idx !== i));
  }

  function updateTeam(i: number, field: keyof TeamConfig, value: string | number) {
    setTeams((t) => t.map((team, idx) => (idx === i ? { ...team, [field]: value } : team)));
  }

  async function handleCreate() {
    if (!selectedQuizId || teams.length === 0) return;
    setLoading(true);
    const res = await fetch("/api/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quizId: selectedQuizId, teams, submissionTimerSecs: timerSecs }),
    });
    const data = await res.json();
    if (res.ok) {
      router.push(`/room/${data.code}`);
    } else {
      alert(data.error || "Failed to create room");
      setLoading(false);
    }
  }

  const totalCapacity = teams.reduce((s, t) => s + t.maxPlayers, 0);

  return (
    <div className="relative min-h-screen px-4 py-8">
      <div className="stars-bg" />
      <div className="relative z-10 max-w-2xl mx-auto flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="btn-ghost px-3 py-2">← Back</Link>
          <h1 className="text-3xl font-bold" style={{ fontFamily: "var(--font-fredoka), Fredoka, sans-serif" }}>
            Set Up Game 🎮
          </h1>
        </div>

        {/* Quiz picker */}
        <div className="glass rounded-2xl p-5">
          <label className="block text-sm font-semibold mb-3" style={{ color: "rgba(255,255,255,0.7)", fontFamily: "var(--font-nunito)" }}>
            Choose a Quiz
          </label>
          {quizzes.length === 0 ? (
            <p style={{ color: "rgba(255,255,255,0.4)", fontFamily: "var(--font-nunito)" }}>
              No quizzes yet. <Link href="/quiz/new" style={{ color: "#ff5733" }}>Create one first →</Link>
            </p>
          ) : (
            <div className="grid gap-2">
              {quizzes.map((q) => (
                <button
                  key={q.id}
                  onClick={() => setSelectedQuizId(q.id)}
                  className="flex items-center justify-between p-4 rounded-xl transition-all text-left"
                  style={{
                    background: selectedQuizId === q.id ? "rgba(255,87,51,0.15)" : "rgba(255,255,255,0.04)",
                    border: `1px solid ${selectedQuizId === q.id ? "#ff5733" : "rgba(255,255,255,0.1)"}`,
                  }}
                >
                  <span className="font-semibold" style={{ fontFamily: "var(--font-fredoka), Fredoka, sans-serif" }}>{q.title}</span>
                  <span className="chip" style={{ background: "rgba(255,87,51,0.2)", color: "#ff5733" }}>
                    {q.clip_count} clip{q.clip_count !== 1 ? "s" : ""}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Teams */}
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <label className="text-sm font-semibold" style={{ color: "rgba(255,255,255,0.7)", fontFamily: "var(--font-nunito)" }}>
              Teams ({teams.length}) — {totalCapacity} total spots
            </label>
            {teams.length < 8 && (
              <button onClick={addTeam} className="btn-ghost px-3 py-1.5 text-sm">+ Add Team</button>
            )}
          </div>
          <div className="flex flex-col gap-3">
            {teams.map((team, i) => {
              const preset = TEAM_PRESETS[i % TEAM_PRESETS.length];
              return (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-lg"
                    style={{ background: preset.color }}>
                    {preset.emoji}
                  </div>
                  <input
                    className="input-field flex-1 py-2"
                    value={team.name}
                    onChange={(e) => updateTeam(i, "name", e.target.value)}
                    placeholder={`Team ${i + 1}`}
                  />
                  <select
                    className="input-field w-20 py-2 text-sm"
                    value={team.maxPlayers}
                    onChange={(e) => updateTeam(i, "maxPlayers", parseInt(e.target.value))}
                    style={{ width: "80px" }}
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                      <option key={n} value={n}>{n} player{n !== 1 ? "s" : ""}</option>
                    ))}
                  </select>
                  {teams.length > 1 && (
                    <button onClick={() => removeTeam(i)} className="btn-ghost px-3 py-2 text-sm" style={{ color: "rgba(255,100,100,0.7)" }}>✕</button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Timer */}
        <div className="glass rounded-2xl p-5">
          <label className="block text-sm font-semibold mb-3" style={{ color: "rgba(255,255,255,0.7)", fontFamily: "var(--font-nunito)" }}>
            Answer Timer: <span style={{ color: "#ff5733" }}>{timerSecs}s</span>
          </label>
          <input
            type="range"
            min={20}
            max={120}
            step={10}
            value={timerSecs}
            onChange={(e) => setTimerSecs(parseInt(e.target.value))}
            className="w-full"
            style={{ accentColor: "#ff5733" }}
          />
          <div className="flex justify-between text-xs mt-1" style={{ color: "rgba(255,255,255,0.35)", fontFamily: "var(--font-nunito)" }}>
            <span>20s (quick)</span>
            <span>120s (relaxed)</span>
          </div>
        </div>

        <button
          onClick={handleCreate}
          className="btn-coral justify-center py-4 text-xl"
          disabled={loading || !selectedQuizId || teams.length === 0}
        >
          {loading ? "Creating..." : "Create Room & Get Code 🚀"}
        </button>
      </div>
    </div>
  );
}
