"use client";

import { Suspense, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/school";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    router.push(redirect);
    router.refresh();
  }

  return (
    <div className="w-full max-w-sm">
      {/* Logo */}
      <div className="mb-8 flex flex-col items-center">
        <Image
          src="/LIFT LOGO.jpeg"
          alt="LIFT"
          width={192}
          height={192}
          className="h-48 w-48 rounded-2xl object-contain"
        />
        <p className="mt-3 text-[11px] text-[#7878a0]">
          Learning Insight for Transitions
        </p>
      </div>

      {/* Card */}
      <div className="rounded-xl border border-[#2a2a3a] bg-[#16161f]/80 p-7 shadow-2xl backdrop-blur-sm">
        <p className="mb-5 text-sm text-[#7878a0]">
          Sign in to continue
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#7878a0]">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-lg border border-[#2a2a3a] bg-[#0f0f13] px-3.5 py-2.5 text-sm text-[#e8e8f0] outline-none transition-colors focus:border-[#6366f1]"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#7878a0]">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-lg border border-[#2a2a3a] bg-[#0f0f13] px-3.5 py-2.5 pr-10 text-sm text-[#e8e8f0] outline-none transition-colors focus:border-[#6366f1]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7878a0] hover:text-[#e8e8f0]"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          {error && (
            <p className="text-xs text-[#f43f5e]">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-gradient-to-r from-[#6366f1] to-[#818cf8] py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>

      <p className="mt-6 text-center text-[10px] text-[#7878a0]/60">
        Powered by Inteliflow AI
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0f0f13]">
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
