"use client";

import { Suspense, useState, useEffect } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";

const SLIDES = [
  "/slide-1.jpg",
  "/slide-2.jpg",
  "/slide-3.jpg",
  "/slide-4.jpg",
  "/slide-5.jpg",
];

function BackgroundSlideshow() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % SLIDES.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-0">
      {SLIDES.map((src, i) => (
        <Image
          key={src}
          src={src}
          alt=""
          fill
          priority={i === 0}
          className={`object-cover transition-opacity duration-[2000ms] ${
            i === current ? "opacity-100" : "opacity-0"
          }`}
        />
      ))}
      {/* Dark overlay for readability */}
      <div className="absolute inset-0 bg-black/60" />
    </div>
  );
}

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
    <div className="relative z-10 w-full max-w-sm">
      {/* Logo */}
      <div className="mb-8 flex flex-col items-center">
        <Image
          src="/LIFT LOGO.jpeg"
          alt="LIFT"
          width={192}
          height={192}
          className="h-48 w-48 rounded-2xl object-contain"
        />
        <p className="mt-3 text-[11px] text-white/60">
          Learning Insight for Transitions
        </p>
      </div>

      {/* Card — translucent */}
      <div className="rounded-xl border border-white/10 bg-black/40 p-7 shadow-2xl backdrop-blur-xl">
        <p className="mb-5 text-sm text-white/60">Sign in to continue</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-white/60">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full rounded-lg border border-white/10 bg-black/30 px-3.5 py-2.5 text-sm text-white placeholder-white/30 outline-none backdrop-blur-sm transition-colors focus:border-[#6366f1]"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-white/60">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full rounded-lg border border-white/10 bg-black/30 px-3.5 py-2.5 pr-10 text-sm text-white placeholder-white/30 outline-none backdrop-blur-sm transition-colors focus:border-[#6366f1]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
              >
                {showPassword ? (
                  <EyeOff size={16} key="off" />
                ) : (
                  <Eye size={16} key="on" />
                )}
              </button>
            </div>
          </div>
          {error && <p className="text-xs text-[#f43f5e]">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-gradient-to-r from-[#6366f1] to-[#818cf8] py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>

      <p className="mt-6 text-center text-[10px] text-white/30">
        Powered by Inteliflow AI
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden">
      <BackgroundSlideshow />
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
