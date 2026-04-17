"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Check, Crown, Building2, Sparkles, ArrowRight } from "lucide-react";
import { TIER_LIMITS, TIER_PRICING } from "@/lib/licensing/features";

type Props = {
  tier: string;
  status: string;
  trialDaysRemaining: number | null;
  currentPeriodEndsAt: string | null;
  sessionsUsed: number;
  sessionsLimit: number | null;
  evaluatorSeatsUsed: number;
  hasStripeSubscription: boolean;
};

const TIER_ORDER = ["professional", "enterprise"] as const;

const TIER_META: Record<
  string,
  {
    icon: typeof Crown;
    color: string;
    gradient: string;
    btnClass: string;
    badge?: string;
    tagline: string;
  }
> = {
  professional: {
    icon: Crown,
    color: "text-[#f59e0b]",
    gradient: "from-[#f59e0b]/10 to-[#f59e0b]/5",
    btnClass: "bg-[#f59e0b] hover:bg-[#d97706] text-white",
    badge: "Most Popular",
    tagline: "Full platform with AI-powered insights",
  },
  enterprise: {
    icon: Building2,
    color: "text-[#10b981]",
    gradient: "from-[#10b981]/10 to-[#10b981]/5",
    btnClass: "bg-[#10b981] hover:bg-[#059669] text-white",
    tagline: "For large schools and networks",
  },
};

const PLAN_FEATURES: Record<string, string[]> = {
  professional: [
    "500 candidate sessions per year",
    "5 evaluator seats",
    "Full session engine — all grades",
    "Voice response & passage reader",
    "TRI Score & Learning Support Signals",
    "Evaluator Intelligence briefings & rubric",
    "AI-generated insight reports (internal, family, placement)",
    "Support Plan Generator",
    "Outcome Tracking",
    "CSV & PDF data export",
    "CORE integration bridge",
    "FERPA-compliant data handling",
    "Email support",
  ],
  enterprise: [
    "Everything in Professional, plus:",
    "Unlimited sessions & seats",
    "White label — custom domain & branding",
    "SIS integrations (Veracross, Blackbaud, PowerSchool)",
    "Cohort Intelligence Dashboard",
    "Board-ready executive reporting",
    "Custom session configuration",
    "API access",
    "Cross-school benchmarking network",
    "Re-application & waitlist intelligence",
    "Dedicated Success Manager & SLA",
  ],
};

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    trialing: "bg-[#f59e0b]/10 text-[#f59e0b] border-[#f59e0b]/20",
    active: "bg-[#10b981]/10 text-[#10b981] border-[#10b981]/20",
    past_due: "bg-[#f59e0b]/10 text-[#f59e0b] border-[#f59e0b]/20",
    suspended: "bg-[#f43f5e]/10 text-[#f43f5e] border-[#f43f5e]/20",
    cancelled: "bg-muted/10 text-muted border-muted/20",
  };
  return (
    <span
      className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${
        colors[status] ?? colors.cancelled
      }`}
    >
      {status === "trialing" ? "Trial" : status.replace("_", " ")}
    </span>
  );
}

export function SubscriptionClient({
  tier,
  status,
  trialDaysRemaining,
  currentPeriodEndsAt,
  sessionsUsed,
  sessionsLimit,
  evaluatorSeatsUsed,
  hasStripeSubscription,
}: Props) {
  const searchParams = useSearchParams();
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "muted";
  } | null>(null);

  const isTrial = tier === "trial" || status === "trialing";
  const effectiveTier = isTrial ? "" : tier;
  const tierIdx = isTrial ? -1 : TIER_ORDER.indexOf(tier as typeof TIER_ORDER[number]);

  useEffect(() => {
    const payment = searchParams.get("payment");
    if (payment === "success") {
      setToast({
        message: "Payment successful! Your plan is now active.",
        type: "success",
      });
    } else if (payment === "cancelled") {
      setToast({
        message: "Payment cancelled — your trial continues.",
        type: "muted",
      });
    }
    if (payment) {
      const timer = setTimeout(() => setToast(null), 6000);
      return () => clearTimeout(timer);
    }

    // Auto-trigger checkout if redirected from registration with a plan
    const autoCheckout = searchParams.get("auto_checkout");
    if (autoCheckout && ["essentials", "professional", "enterprise"].includes(autoCheckout)) {
      handleCheckout(autoCheckout);
    }
  }, [searchParams]);

  async function handleCheckout(targetTier: string) {
    setCheckoutLoading(targetTier);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: targetTier }),
      });
      const data = await res.json();
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        setCheckoutLoading(null);
        setToast({
          message: data.error || "Unable to start checkout. Please contact support.",
          type: "muted",
        });
      }
    } catch {
      setCheckoutLoading(null);
      setToast({
        message: "Unable to connect to payment system. Please try again.",
        type: "muted",
      });
    }
  }

  async function handleManageBilling() {
    const res = await fetch("/api/stripe/portal", { method: "POST" });
    const data = await res.json();
    if (data.portal_url) {
      window.location.href = data.portal_url;
    }
  }

  const seatLimit =
    TIER_LIMITS[tier as keyof typeof TIER_LIMITS]?.evaluator_seats ?? 3;

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Subscription</h1>
        <p className="mt-1 text-sm text-muted">
          Choose the plan that fits your school
        </p>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`rounded-xl p-4 text-center text-sm font-medium ${
            toast.type === "success"
              ? "bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/20"
              : "bg-muted/10 text-muted border border-muted/20"
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Current Plan Banner */}
      <div className="rounded-xl border border-lift-border bg-gradient-to-r from-surface to-page-bg p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold capitalize">
                {isTrial ? "Professional Trial" : tier}
              </h2>
              <StatusBadge status={status} />
            </div>
            {isTrial && trialDaysRemaining !== null && (
              <p className="mt-1.5 text-sm text-muted">
                <span className="font-semibold text-lift-text">
                  {trialDaysRemaining} day
                  {trialDaysRemaining !== 1 ? "s" : ""}
                </span>{" "}
                remaining in your free trial
              </p>
            )}
            {status === "active" && currentPeriodEndsAt && (
              <p className="mt-1.5 text-sm text-muted">
                Renews{" "}
                {new Date(currentPeriodEndsAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            {isTrial && (
              <a
                href="#plans"
                className="flex items-center gap-1.5 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90 transition-all"
              >
                <Sparkles size={14} />
                Upgrade Now
              </a>
            )}
            {hasStripeSubscription && (
              <button
                onClick={handleManageBilling}
                className="rounded-lg border border-lift-border px-4 py-2.5 text-sm font-medium text-lift-text hover:bg-surface transition-colors"
              >
                Manage Billing
              </button>
            )}
          </div>
        </div>

        {/* Usage bars */}
        <div className="mt-5 grid grid-cols-2 gap-4">
          <div>
            <div className="flex items-baseline justify-between">
              <p className="text-xs font-medium text-muted">Sessions used</p>
              <p className="text-xs font-bold text-lift-text">
                {sessionsUsed} / {sessionsLimit ?? "∞"}
              </p>
            </div>
            {sessionsLimit ? (
              <div className="mt-1.5 h-2 rounded-full bg-lift-border overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#14b8a6] to-[#2dd4bf] transition-all"
                  style={{
                    width: `${Math.min(100, (sessionsUsed / sessionsLimit) * 100)}%`,
                  }}
                />
              </div>
            ) : null}
          </div>
          <div>
            <div className="flex items-baseline justify-between">
              <p className="text-xs font-medium text-muted">Evaluator seats</p>
              <p className="text-xs font-bold text-lift-text">
                {evaluatorSeatsUsed} / {seatLimit ?? "∞"}
              </p>
            </div>
            <div className="mt-1.5 h-2 rounded-full bg-lift-border overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#10b981] to-[#34d399] transition-all"
                style={{
                  width: `${seatLimit ? Math.min(100, (evaluatorSeatsUsed / seatLimit) * 100) : 0}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Pricing Cards */}
      <div id="plans" className="scroll-mt-8">
        <h2 className="mb-2 text-center text-lg font-bold">Choose Your Plan</h2>
        <p className="mb-6 text-center text-xs text-muted">Professional includes all core features. Enterprise adds unlimited capacity, white label, SIS integrations, and dedicated support.</p>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {TIER_ORDER.map((t) => {
            const meta = TIER_META[t];
            const Icon = meta.icon;
            const pricing = TIER_PRICING[t as keyof typeof TIER_PRICING];
            const features = PLAN_FEATURES[t];
            const isCurrent = t === effectiveTier;
            const isHigher = TIER_ORDER.indexOf(t) > tierIdx;
            const isPopular = t === "professional";

            return (
              <div
                key={t}
                className={`relative flex flex-col rounded-2xl border-2 bg-white p-6 transition-shadow hover:shadow-lg ${
                  isPopular
                    ? "border-[#f59e0b] shadow-md"
                    : isCurrent
                    ? "border-primary"
                    : "border-lift-border"
                }`}
              >
                {/* Popular badge */}
                {meta.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="rounded-full bg-[#f59e0b] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
                      {meta.badge}
                    </span>
                  </div>
                )}

                {/* Header */}
                <div className={`mb-4 flex items-center gap-2 ${meta.color}`}>
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br ${meta.gradient}`}
                  >
                    <Icon size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold capitalize text-lift-text">
                      {t}
                    </h3>
                  </div>
                </div>

                <p className="text-xs text-muted">{meta.tagline}</p>

                {/* Price */}
                <div className="mt-4 mb-5">
                  <span className="text-3xl font-extrabold text-lift-text">
                    ${(pricing.annual / 12).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                  <span className="text-sm text-muted">/mo</span>
                  <p className="mt-0.5 text-[10px] text-muted">
                    ${pricing.annual.toLocaleString()}/yr billed annually
                  </p>
                </div>

                {/* CTA Button */}
                {isCurrent ? (
                  <div className="mb-5 rounded-lg border border-primary/20 bg-primary/5 py-2.5 text-center text-sm font-semibold text-primary">
                    Current Plan
                  </div>
                ) : isHigher || isTrial ? (
                  <button
                    onClick={() => handleCheckout(t)}
                    disabled={checkoutLoading === t}
                    className={`mb-5 flex w-full items-center justify-center gap-1.5 rounded-lg py-2.5 text-sm font-semibold shadow-sm transition-all disabled:opacity-50 ${meta.btnClass}`}
                  >
                    {checkoutLoading === t ? (
                      <>
                        <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Processing...
                      </>
                    ) : (
                      <>
                        Get {t.charAt(0).toUpperCase() + t.slice(1)}
                        <ArrowRight size={14} />
                      </>
                    )}
                  </button>
                ) : (
                  <a
                    href="mailto:lift@inteliflowai.com?subject=LIFT%20Plan%20Change"
                    className="mb-5 block rounded-lg border border-lift-border py-2.5 text-center text-sm font-medium text-muted hover:bg-surface transition-colors"
                  >
                    Contact to change
                  </a>
                )}

                {/* Features */}
                <ul className="flex-1 space-y-2">
                  {features.map((f) => {
                    const isHeader = f.endsWith(":");
                    return (
                      <li
                        key={f}
                        className={`flex items-start gap-2 text-xs ${
                          isHeader
                            ? "mt-2 font-semibold text-muted"
                            : "text-lift-text"
                        }`}
                      >
                        {!isHeader && (
                          <Check
                            size={13}
                            className={`mt-0.5 shrink-0 ${meta.color}`}
                          />
                        )}
                        {f}
                      </li>
                    );
                  })}
                </ul>

                {/* Bottom CTA */}
                {isCurrent ? (
                  <div className="mt-5 rounded-lg border border-primary/20 bg-primary/5 py-2.5 text-center text-sm font-semibold text-primary">
                    Current Plan
                  </div>
                ) : isHigher || isTrial ? (
                  <button
                    onClick={() => handleCheckout(t)}
                    disabled={checkoutLoading === t}
                    className={`mt-5 flex w-full items-center justify-center gap-1.5 rounded-lg py-2.5 text-sm font-semibold shadow-sm transition-all disabled:opacity-50 ${meta.btnClass}`}
                  >
                    {checkoutLoading === t ? (
                      <>
                        <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Processing...
                      </>
                    ) : (
                      <>
                        Get {t.charAt(0).toUpperCase() + t.slice(1)}
                        <ArrowRight size={14} />
                      </>
                    )}
                  </button>
                ) : (
                  <a
                    href="mailto:lift@inteliflowai.com?subject=LIFT%20Plan%20Change"
                    className="mt-5 block rounded-lg border border-lift-border py-2.5 text-center text-sm font-medium text-muted hover:bg-surface transition-colors"
                  >
                    Contact to change
                  </a>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Contact */}
      <div className="rounded-xl border border-lift-border bg-gradient-to-r from-surface to-page-bg p-6 text-center">
        <p className="text-sm font-semibold text-lift-text">
          Need a custom plan or have questions?
        </p>
        <p className="mt-1 text-xs text-muted">
          Contact us at{" "}
          <a
            href="mailto:lift@inteliflowai.com"
            className="font-medium text-primary hover:underline"
          >
            lift@inteliflowai.com
          </a>{" "}
          — we respond within 1 business day.
        </p>
      </div>
    </div>
  );
}
