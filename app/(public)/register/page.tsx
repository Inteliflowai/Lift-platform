"use client";

import { useState, Suspense } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";

const SCHOOL_TYPES = [
  "Independent Day",
  "Boarding",
  "Therapeutic",
  "Other",
];

const APPLICANT_RANGES = [
  "Under 50",
  "50-150",
  "150-400",
  "400+",
];

const inputClass =
  "w-full rounded-xl border border-white/10 bg-white/[0.08] px-4 py-3 text-sm text-white outline-none transition-all focus:border-[#6366f1] focus:shadow-[0_0_0_3px_rgba(99,102,241,0.15)]";

const selectClass =
  "w-full rounded-xl border border-white/10 bg-white/[0.08] px-4 py-3 text-sm text-white outline-none transition-all focus:border-[#6366f1] focus:shadow-[0_0_0_3px_rgba(99,102,241,0.15)] appearance-none";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedPlan = searchParams.get("plan");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const [form, setForm] = useState({
    schoolName: "",
    schoolType: "",
    fullName: "",
    title: "",
    email: "",
    password: "",
    confirmPassword: "",
    estimatedApplicants: "",
    country: "United States",
  });

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function validate(): string | null {
    if (!form.schoolName.trim()) return "School name is required.";
    if (!form.schoolType) return "School type is required.";
    if (!form.fullName.trim()) return "Your name is required.";
    if (!form.email.trim()) return "Email is required.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      return "Please enter a valid email address.";
    if (form.password.length < 8)
      return "Password must be at least 8 characters.";
    if (form.password !== form.confirmPassword)
      return "Passwords do not match.";
    if (!agreed)
      return "You must agree to the Terms of Service and Privacy Policy.";
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Registration failed. Please try again.");
        setLoading(false);
        return;
      }

      // If a plan was pre-selected, redirect to checkout after login
      const redirect = selectedPlan
        ? `/school/settings/subscription?auto_checkout=${selectedPlan}`
        : "/school/welcome";
      router.push(`/login?redirect=${encodeURIComponent(redirect)}`);
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="relative z-10 w-full max-w-[460px] px-4 py-8 login-card-enter">
      {/* Logo */}
      <div className="mb-8 flex flex-col items-center">
        <Image
          src="/LIFT LOGO.jpeg"
          alt="LIFT"
          width={80}
          height={80}
          priority
          className="h-20 w-20 rounded-2xl object-contain"
        />
      </div>

      {/* Card */}
      <div className="glow-border rounded-[20px] border border-white/10 bg-[rgba(15,15,19,0.85)] p-8 shadow-[0_24px_60px_rgba(0,0,0,0.4)] backdrop-blur-[20px] backdrop-saturate-[1.4]">
        <h1 className="text-center font-[family-name:var(--font-display)] text-2xl font-bold text-white">
          {selectedPlan
            ? `Get LIFT ${selectedPlan.charAt(0).toUpperCase() + selectedPlan.slice(1)}`
            : "Start your 30-day free trial"}
        </h1>
        <p className="mt-1 text-center text-xs text-white/40">
          {selectedPlan
            ? "Create your account, then complete payment"
            : "No credit card required"}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {/* School name */}
          <div>
            <label className="mb-1 block text-xs font-medium text-white/50">
              School name
            </label>
            <input
              type="text"
              value={form.schoolName}
              onChange={(e) => update("schoolName", e.target.value)}
              required
              className={inputClass}
            />
          </div>

          {/* School type */}
          <div>
            <label className="mb-1 block text-xs font-medium text-white/50">
              School type
            </label>
            <select
              value={form.schoolType}
              onChange={(e) => update("schoolType", e.target.value)}
              required
              className={selectClass}
            >
              <option value="" disabled>
                Select...
              </option>
              {SCHOOL_TYPES.map((t) => (
                <option key={t} value={t} className="bg-[#1a1a2e]">
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Name + Title row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-white/50">
                Your name
              </label>
              <input
                type="text"
                value={form.fullName}
                onChange={(e) => update("fullName", e.target.value)}
                required
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-white/50">
                Title/Role
                <span className="text-white/25"> (optional)</span>
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => update("title", e.target.value)}
                placeholder="e.g. Director of Admissions"
                className={inputClass}
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="mb-1 block text-xs font-medium text-white/50">
              Email address
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              required
              autoComplete="email"
              className={inputClass}
            />
          </div>

          {/* Password */}
          <div>
            <label className="mb-1 block text-xs font-medium text-white/50">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(e) => update("password", e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                className={inputClass + " pr-10"}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors"
              >
                {showPassword ? (
                  <EyeOff size={16} />
                ) : (
                  <Eye size={16} />
                )}
              </button>
            </div>
          </div>

          {/* Confirm password */}
          <div>
            <label className="mb-1 block text-xs font-medium text-white/50">
              Confirm password
            </label>
            <input
              type="password"
              value={form.confirmPassword}
              onChange={(e) => update("confirmPassword", e.target.value)}
              required
              autoComplete="new-password"
              className={inputClass}
            />
          </div>

          {/* Estimated applicants + Country */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-white/50">
                Est. annual applicants
              </label>
              <select
                value={form.estimatedApplicants}
                onChange={(e) => update("estimatedApplicants", e.target.value)}
                className={selectClass}
              >
                <option value="" className="bg-[#1a1a2e]">
                  Select...
                </option>
                {APPLICANT_RANGES.map((r) => (
                  <option key={r} value={r} className="bg-[#1a1a2e]">
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-white/50">
                Country
              </label>
              <input
                type="text"
                value={form.country}
                onChange={(e) => update("country", e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          {/* Terms */}
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-[#6366f1] rounded"
            />
            <span className="text-xs text-white/50 leading-relaxed">
              I agree to the LIFT{" "}
              <a
                href="/terms"
                target="_blank"
                className="text-[#6366f1] hover:underline"
              >
                Terms of Service
              </a>{" "}
              and{" "}
              <a
                href="/privacy"
                target="_blank"
                className="text-[#6366f1] hover:underline"
              >
                Privacy Policy
              </a>
            </span>
          </label>

          {/* Error */}
          {error && <p className="text-xs text-[#f43f5e]">{error}</p>}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-[#6366f1] py-3 font-[family-name:var(--font-display)] text-sm font-semibold text-white transition-colors hover:bg-[#4f46e5] disabled:opacity-50"
          >
            {loading ? "Creating your account..." : "Create My Account"}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-white/30">
          Already have an account?{" "}
          <a href="/login" className="text-[#6366f1] hover:underline">
            Sign in
          </a>
        </p>
      </div>

      <p className="mt-6 text-center text-[10px] text-white/25">
        Powered by Inteliflow AI
      </p>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}
