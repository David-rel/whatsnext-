"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LandingPage() {
  const [code, setCode] = useState("");
  const router = useRouter();

  function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length === 6) router.push(`/join/${trimmed}`);
  }

  return (
    <div className="relative flex flex-col min-h-screen items-center justify-center px-4">
      <div className="stars-bg" />

      <div className="relative z-10 flex flex-col items-center gap-10 w-full max-w-md">
        {/* Logo */}
        <div className="text-center">
          <h1
            className="text-7xl font-bold tracking-tight"
            style={{ fontFamily: "var(--font-fredoka), Fredoka, sans-serif", color: "#fff", textShadow: "0 4px 30px rgba(255,87,51,0.5)" }}
          >
            What&apos;s Next?
          </h1>
          <p className="mt-3 text-lg" style={{ color: "rgba(255,255,255,0.6)", fontFamily: "var(--font-nunito), Nunito, sans-serif" }}>
            Watch the clip. Predict what happens. Win the glory! 🎬
          </p>
        </div>

        {/* Join card */}
        <div className="glass rounded-3xl p-8 w-full">
          <h2
            className="text-2xl font-semibold text-center mb-6"
            style={{ fontFamily: "var(--font-fredoka), Fredoka, sans-serif", color: "#fff" }}
          >
            Join a Game
          </h2>
          <form onSubmit={handleJoin} className="flex flex-col gap-4">
            <input
              className="input-field text-center text-3xl font-bold uppercase tracking-[0.3em]"
              style={{ fontFamily: "var(--font-fredoka), Fredoka, sans-serif" }}
              placeholder="ABC123"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))}
              maxLength={6}
              autoFocus
            />
            <button type="submit" className="btn-coral justify-center text-xl py-4" disabled={code.length !== 6}>
              Let&apos;s Go! 🚀
            </button>
          </form>
        </div>

        {/* Host divider */}
        <div className="flex items-center gap-4 w-full">
          <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.12)" }} />
          <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.85rem" }}>or</span>
          <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.12)" }} />
        </div>

        <div className="flex flex-col gap-3 w-full">
          <Link href="/login" className="btn-ghost justify-center text-center py-3.5 rounded-2xl">
            Host Login 🎮
          </Link>
          <Link href="/register" className="text-center text-sm" style={{ color: "rgba(255,255,255,0.45)", fontFamily: "var(--font-nunito), Nunito, sans-serif" }}>
            New host? <span style={{ color: "#ff5733" }}>Create an account →</span>
          </Link>
        </div>

        <p className="text-xs text-center" style={{ color: "rgba(255,255,255,0.25)", fontFamily: "var(--font-nunito)" }}>
          The video stops. You predict. Then the truth is revealed! 👀
        </p>
      </div>
    </div>
  );
}
