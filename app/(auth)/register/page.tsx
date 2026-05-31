"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Something went wrong!");
    } else {
      router.push("/login?registered=1");
    }
  }

  return (
    <div className="relative flex flex-col min-h-screen items-center justify-center px-4">
      <div className="stars-bg" />
      <div className="relative z-10 w-full max-w-sm flex flex-col items-center gap-8">
        <Link href="/" className="text-center">
          <h1 className="text-5xl font-bold" style={{ fontFamily: "var(--font-fredoka), Fredoka, sans-serif", color: "#fff", textShadow: "0 4px 20px rgba(255,87,51,0.4)" }}>
            What&apos;s Next?
          </h1>
          <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>Create Host Account</p>
        </Link>

        <div className="glass rounded-3xl p-8 w-full">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1.5" style={{ color: "rgba(255,255,255,0.7)", fontFamily: "var(--font-nunito)" }}>Your Name</label>
              <input
                type="text"
                className="input-field"
                placeholder="Mr. Awesome Host"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1.5" style={{ color: "rgba(255,255,255,0.7)", fontFamily: "var(--font-nunito)" }}>Email</label>
              <input
                type="email"
                className="input-field"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1.5" style={{ color: "rgba(255,255,255,0.7)", fontFamily: "var(--font-nunito)" }}>Password</label>
              <input
                type="password"
                className="input-field"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            {error && (
              <p className="text-sm text-center py-2 px-3 rounded-xl" style={{ background: "rgba(255,87,51,0.15)", color: "#ff5733", fontFamily: "var(--font-nunito)" }}>
                {error}
              </p>
            )}

            <button type="submit" className="btn-coral justify-center py-3.5 mt-2" disabled={loading}>
              {loading ? "Creating account..." : "Create Account 🎉"}
            </button>
          </form>
        </div>

        <p className="text-sm" style={{ color: "rgba(255,255,255,0.45)", fontFamily: "var(--font-nunito)" }}>
          Already have an account?{" "}
          <Link href="/login" style={{ color: "#ff5733" }}>Sign in →</Link>
        </p>
      </div>
    </div>
  );
}
