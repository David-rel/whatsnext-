"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (res?.error) {
      setError("Wrong email or password. Try again!");
    } else {
      router.push("/dashboard");
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
          <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>Host Login</p>
        </Link>

        <div className="glass rounded-3xl p-8 w-full">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1.5" style={{ color: "rgba(255,255,255,0.7)", fontFamily: "var(--font-nunito)" }}>Email</label>
              <input
                type="email"
                className="input-field"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
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
              />
            </div>

            {error && (
              <p className="text-sm text-center py-2 px-3 rounded-xl" style={{ background: "rgba(255,87,51,0.15)", color: "#ff5733", fontFamily: "var(--font-nunito)" }}>
                {error}
              </p>
            )}

            <button type="submit" className="btn-coral justify-center py-3.5 mt-2" disabled={loading}>
              {loading ? "Signing in..." : "Sign In 🎮"}
            </button>
          </form>
        </div>

        <p className="text-sm" style={{ color: "rgba(255,255,255,0.45)", fontFamily: "var(--font-nunito)" }}>
          No account?{" "}
          <Link href="/register" style={{ color: "#ff5733" }}>Create one →</Link>
        </p>
      </div>
    </div>
  );
}
