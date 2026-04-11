"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { ArrowRight, Shield, CreditCard } from "lucide-react";
import { TIER_PRICING } from "@/lib/licensing/features";

export function BuyClient() {
  const searchParams = useSearchParams();
  const tier = searchParams.get("tier") ?? "essentials";
  const cancelled = searchParams.get("cancelled");

  const [form, setForm] = useState({ full_name: "", email: "", school_name: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const pricing = TIER_PRICING[tier as keyof typeof TIER_PRICING];
  const tierLabel = tier.charAt(0).toUpperCase() + tier.slice(1);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/stripe/guest-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier, ...form }),
      });
      const data = await res.json();

      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        setError(data.error || "Unable to start checkout. Please try again.");
        setLoading(false);
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-[440px]">
        {/* Logo */}
        <div className="mb-6 flex flex-col items-center">
          <Image
            src="/LIFT LOGO.jpeg"
            alt="LIFT"
            width={100}
            height={100}
            priority
            className="h-[80px] w-[80px] rounded-xl object-contain"
          />
        </div>

        {/* Plan summary */}
        <div className="mb-6 rounded-xl border border-[#2a2a3a] bg-[#1a1a2e]/80 p-5 text-center backdrop-blur-xl">
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold text-white">
            Get LIFT {tierLabel}
          </h1>
          {pricing && (
            <p className="mt-2 text-sm text-white/50">
              <span className="text-2xl font-bold text-white">
                ${(pricing.annual / 12).toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
              <span className="text-white/40">/mo</span>
              <span className="ml-2 text-white/40">
                (${pricing.annual.toLocaleString()}/yr billed annually)
              </span>
            </p>
          )}
        </div>

        {cancelled && (
          <div className="mb-4 rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-center text-sm text-amber-400">
            Checkout cancelled. You can try again below.
          </div>
        )}

        {/* Form */}
        <div className="rounded-xl border border-[#2a2a3a] bg-[#1a1a2e]/80 p-6 backdrop-blur-xl">
          <p className="mb-4 text-center text-sm text-white/50">
            Enter your details to proceed to secure checkout
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-white/50">Full Name</label>
              <input
                type="text"
                required
                value={form.full_name}
                onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                className="w-full rounded-lg border border-[#2a2a3a] bg-[#0d0d1a] px-4 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:border-[#6366f1]"
                placeholder="John Smith"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-white/50">Work Email</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full rounded-lg border border-[#2a2a3a] bg-[#0d0d1a] px-4 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:border-[#6366f1]"
                placeholder="john@school.edu"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-white/50">School Name</label>
              <input
                type="text"
                required
                value={form.school_name}
                onChange={(e) => setForm((f) => ({ ...f, school_name: e.target.value }))}
                className="w-full rounded-lg border border-[#2a2a3a] bg-[#0d0d1a] px-4 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:border-[#6366f1]"
                placeholder="Hillside Academy"
              />
            </div>

            {error && (
              <p className="text-center text-sm text-[#f43f5e]">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#6366f1] to-[#818cf8] py-3 text-sm font-semibold text-white shadow-lg transition-all hover:opacity-90 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Redirecting to checkout...
                </>
              ) : (
                <>
                  Proceed to Payment
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <div className="mt-4 flex items-center justify-center gap-4 text-[10px] text-white/30">
            <span className="flex items-center gap-1">
              <Shield size={10} /> Secure checkout via Stripe
            </span>
            <span className="flex items-center gap-1">
              <CreditCard size={10} /> Cancel anytime
            </span>
          </div>
        </div>

        {/* Alternative */}
        <p className="mt-4 text-center text-xs text-white/30">
          Want to try first?{" "}
          <a href="/register" className="text-[#6366f1] hover:underline">
            Start a free 30-day trial
          </a>
        </p>
      </div>
    </div>
  );
}
