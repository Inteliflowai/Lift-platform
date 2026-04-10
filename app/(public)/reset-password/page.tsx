"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Eye, EyeOff } from "lucide-react";
import { Suspense } from "react";

const inputClass =
  "w-full rounded-xl border border-white/10 bg-white/[0.08] px-4 py-3 text-sm text-white outline-none transition-all focus:border-[#6366f1] focus:shadow-[0_0_0_3px_rgba(99,102,241,0.15)]";

function ResetForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [expired, setExpired] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let resolved = false;

    // Listen for PASSWORD_RECOVERY event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        resolved = true;
        setSessionReady(true);
        setChecking(false);
      }
    });

    // Also try exchanging code from URL if present
    const code = searchParams.get("code");
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error: err }) => {
        if (!err) {
          resolved = true;
          setSessionReady(true);
        }
        setChecking(false);
      });
    }

    // Check for existing session (from hash-based flow)
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        resolved = true;
        setSessionReady(true);
        setChecking(false);
      }
    });

    // Give it time for any auth flow to complete
    const timer = setTimeout(() => {
      if (!resolved) {
        setExpired(true);
        setChecking(false);
      }
    }, 5000);

    return () => {
      clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, [supabase, searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const { error: updateErr } = await supabase.auth.updateUser({ password });

    if (updateErr) {
      setError(updateErr.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setTimeout(() => router.push("/login?reset=true"), 3000);
  }

  return (
    <div className="relative z-10 w-full max-w-[400px] px-4 login-card-enter">
      <div className="mb-8 flex justify-center">
        <Image src="/LIFT LOGO.jpeg" alt="LIFT" width={80} height={80} priority className="h-20 w-20 rounded-2xl object-contain" />
      </div>

      <div className="glow-border rounded-[20px] border border-white/10 bg-[rgba(15,15,19,0.85)] p-10 shadow-[0_24px_60px_rgba(0,0,0,0.4)] backdrop-blur-[20px]">
        <h1 className="text-center font-[family-name:var(--font-display)] text-xl font-bold text-white">
          Set new password
        </h1>

        {expired && !sessionReady && (
          <div className="mt-6 text-center">
            <p className="text-sm text-[#f43f5e]">This reset link has expired or is invalid.</p>
            <Link href="/forgot-password" className="mt-2 inline-block text-xs text-[#6366f1] hover:underline">
              Request a new one
            </Link>
          </div>
        )}

        {success && (
          <div className="mt-6 rounded-lg bg-[#10b981]/10 border border-[#10b981]/20 p-4 text-center">
            <p className="text-sm text-[#10b981]">Password updated successfully!</p>
            <p className="mt-1 text-xs text-white/40">Redirecting to login...</p>
          </div>
        )}

        {sessionReady && !success && (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-white/50">New password</label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className={inputClass + " pr-10"}
                />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-white/50">Confirm password</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                className={inputClass}
              />
            </div>
            {error && <p className="text-xs text-[#f43f5e]">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[#6366f1] py-3 text-sm font-semibold text-white hover:bg-[#4f46e5] disabled:opacity-50"
            >
              {loading ? "Updating..." : "Update Password"}
            </button>
          </form>
        )}

        {checking && !sessionReady && !expired && (
          <div className="mt-6 flex flex-col items-center gap-2">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#6366f1] border-t-transparent" />
            <p className="text-xs text-white/40">Verifying reset link...</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetForm />
    </Suspense>
  );
}
