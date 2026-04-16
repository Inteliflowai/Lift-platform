"use client";

import { Suspense, useState, useEffect } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { useLocale } from "@/lib/i18n/LocaleProvider";

const SLIDES = ["/slide-1.jpg", "/slide-2.jpg", "/slide-3.jpg", "/slide-4.jpg", "/slide-5.jpg"];

function BackgroundSlideshow() {
  const [current, setCurrent] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setCurrent((p) => (p + 1) % SLIDES.length), 6000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-0">
      {SLIDES.map((src, i) => (
        <Image key={src} src={src} alt="" fill priority={i === 0}
          className={`object-cover transition-opacity duration-[2500ms] ${i === current ? "opacity-100 scale-105" : "opacity-0 scale-100"}`}
          style={{ transition: "opacity 2.5s ease, transform 8s ease" }} />
      ))}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(0,0,0,0.6)_100%)]" />
    </div>
  );
}

function LoginForm() {
  const { t, brandName, hidePricing } = useLocale();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [shaking, setShaking] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/school";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      setError(authError.message);
      setShaking(true);
      setTimeout(() => setShaking(false), 500);
      setLoading(false);
      return;
    }

    if (searchParams.get("redirect")) {
      router.push(redirect);
      router.refresh();
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: roles } = await supabase.from("user_tenant_roles").select("role").eq("user_id", user.id);
      const r = roles?.map((x) => x.role) ?? [];
      if (r.includes("platform_admin")) router.push("/admin/tenants");
      else if (r.includes("school_admin")) router.push("/school");
      else if (r.includes("evaluator")) router.push("/evaluator");
      else if (r.includes("interviewer")) router.push("/interviewer");
      else router.push("/school");
    } else {
      router.push("/school");
    }
    router.refresh();
  }

  return (
    <div className="relative z-10 w-full max-w-[400px] login-card-enter">
      <div className={`glow-border rounded-[20px] border border-white/10 bg-[rgba(15,15,19,0.85)] p-12 shadow-[0_24px_60px_rgba(0,0,0,0.4)] backdrop-blur-[20px] backdrop-saturate-[1.4] ${shaking ? "shake" : ""}`}>
        <div className="flex justify-center mb-2">
          <Image src="/LIFT LOGO.jpeg" alt={brandName} width={180} height={180} priority
            className="h-[168px] w-[168px] rounded-2xl object-contain" />
        </div>
        <p className="mt-1 text-center font-[family-name:var(--font-body)] text-sm tracking-wide text-white/40">
          Admissions intelligence. Built for the humans who decide.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-white/50">{t("login.email")}</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email"
              className="w-full rounded-xl border border-white/10 bg-white/[0.08] px-4 py-3 text-sm text-white outline-none transition-all focus:border-[#818cf8] focus:shadow-[0_0_0_3px_rgba(129,140,248,0.15)]" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-white/50">{t("login.password")}</label>
            <div className="relative">
              <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password"
                className="w-full rounded-xl border border-white/10 bg-white/[0.08] px-4 py-3 pr-10 text-sm text-white outline-none transition-all focus:border-[#818cf8] focus:shadow-[0_0_0_3px_rgba(129,140,248,0.15)]" />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          {error && <p className="text-xs text-[#f43f5e]">{error}</p>}

          {searchParams.get("reset") === "true" && (
            <div className="rounded-lg bg-[#10b981]/10 border border-[#10b981]/20 p-2 text-center">
              <p className="text-xs text-[#10b981]">{t("login.password_reset")}</p>
            </div>
          )}
          {searchParams.get("confirmed") === "true" && (
            <div className="rounded-lg bg-[#10b981]/10 border border-[#10b981]/20 p-2 text-center">
              <p className="text-xs text-[#10b981]">{t("login.email_confirmed")}</p>
            </div>
          )}
          {searchParams.get("expired") === "true" && (
            <div className="rounded-lg bg-[#f59e0b]/10 border border-[#f59e0b]/20 p-2 text-center">
              <p className="text-xs text-[#f59e0b]">{t("login.session_expired")}</p>
            </div>
          )}

          <button type="submit" disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-[#6366f1] to-[#818cf8] py-3 font-[family-name:var(--font-display)] text-sm font-semibold text-white transition-all hover:brightness-110 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50">
            {loading ? t("login.signing_in") : t("login.sign_in")}
          </button>

          <div className="text-center">
            <a href="/forgot-password" className="text-xs text-white/40 hover:text-[#6366f1] transition-colors">
              {t("login.forgot_password")}
            </a>
          </div>
        </form>

        {!hidePricing && (
          <p className="mt-4 text-center text-xs text-white/30">
            {t("login.no_account")}{" "}
            <a href="/register" className="text-[#6366f1] hover:underline">{t("login.start_trial")}</a>
          </p>
        )}
      </div>

      <p className="mt-8 text-center text-[10px] text-white/25">{t("brand.powered_by")}</p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden">
      <BackgroundSlideshow />
      <Suspense><LoginForm /></Suspense>
    </div>
  );
}
