"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

const inputClass =
  "w-full rounded-xl border border-white/10 bg-white/[0.08] px-4 py-3 text-sm text-white outline-none transition-all focus:border-[#6366f1] focus:shadow-[0_0_0_3px_rgba(99,102,241,0.15)]";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setLoading(false);
    setSent(true);
  }

  return (
    <div className="relative z-10 w-full max-w-[400px] px-4 login-card-enter">
      <div className="mb-8 flex justify-center">
        <Image src="/LIFT-LOGO.png" alt="LIFT" width={80} height={80} priority className="h-20 w-20 rounded-2xl object-contain" />
      </div>

      <div className="glow-border rounded-[20px] border border-white/10 bg-[rgba(15,15,19,0.85)] p-10 shadow-[0_24px_60px_rgba(0,0,0,0.4)] backdrop-blur-[20px]">
        <h1 className="text-center font-[family-name:var(--font-display)] text-xl font-bold text-white">
          Reset your password
        </h1>
        <p className="mt-2 text-center text-xs text-white/40">
          Enter your email and we&apos;ll send you a reset link.
        </p>

        {sent ? (
          <div className="mt-6 rounded-lg bg-[#10b981]/10 border border-[#10b981]/20 p-4 text-center">
            <p className="text-sm text-[#10b981]">
              If an account exists for that email, you&apos;ll receive a reset link within a few minutes.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-white/50">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className={inputClass}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[#6366f1] py-3 text-sm font-semibold text-white hover:bg-[#4f46e5] disabled:opacity-50"
            >
              {loading ? "Sending..." : "Send Reset Link"}
            </button>
          </form>
        )}

        <p className="mt-4 text-center text-xs text-white/30">
          <Link href="/login" className="text-[#6366f1] hover:underline">Back to login</Link>
        </p>
      </div>
    </div>
  );
}
