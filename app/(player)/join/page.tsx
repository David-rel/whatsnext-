"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function JoinPage() {
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
      <div className="relative z-10 w-full max-w-sm flex flex-col items-center gap-8">
        <Link href="/">
          <h1 className="text-5xl font-bold text-center" style={{ fontFamily: "var(--font-fredoka), Fredoka, sans-serif", color: "#fff", textShadow: "0 4px 20px rgba(255,87,51,0.4)" }}>
            What&apos;s Next?
          </h1>
        </Link>
        <div className="glass rounded-3xl p-8 w-full">
          <h2 className="text-2xl font-bold text-center mb-6" style={{ fontFamily: "var(--font-fredoka), Fredoka, sans-serif" }}>Enter Game Code</h2>
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
            <button type="submit" className="btn-coral justify-center py-4 text-xl" disabled={code.length !== 6}>
              Join Game! 🎮
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
