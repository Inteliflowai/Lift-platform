"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Check, X, Crown, Zap, Building2 } from "lucide-react";
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

const TIER_ORDER = ["essentials", "professional", "enterprise"];

const TIER_ICONS: Record<string, typeof Zap> = {
  essentials: Zap,
  professional: Crown,
  enterprise: Building2,
};

const FEATURE_ROWS = [
  { label: "Candidate Sessions", essentials: "150/yr", professional: "400/yr", enterprise: "Unlimited" },
  { label: "Evaluator Seats", essentials: "2", professional: "5", enterprise: "Unlimited" },
  { label: "Languages", essentials: "English", professional: "English + Portuguese", enterprise: "English + Portuguese" },
  { label: "TRI Score", essentials: false, professional: true, enterprise: true },
  { label: "Learning Support Signals", essentials: false, professional: true, enterprise: true },
  { label: "Voice Response", essentials: false, professional: true, enterprise: true },
  { label: "Evaluator Intelligence", essentials: false, professional: true, enterprise: true },
  { label: "CORE Integration", essentials: false, professional: true, enterprise: true },
  { label: "Outcome Tracking", essentials: false, professional: false, enterprise: true },
  { label: "Benchmarking Network", essentials: false, professional: false, enterprise: true },
  { label: "Waitlist Intelligence", essentials: false, professional: false, enterprise: true },
  { label: "SIS Integrations", essentials: false, professional: false, enterprise: true },
  { label: "White Label", essentials: false, professional: false, enterprise: true },
  { label: "Support", essentials: "Email", professional: "Priority Email", enterprise: "Dedicated CSM" },
];

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    trialing: "bg-warning/10 text-warning",
    active: "bg-success/10 text-success",
    past_due: "bg-warning/10 text-warning",
    suspended: "bg-review/10 text-review",
    cancelled: "bg-muted/10 text-muted",
  };
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${colors[status] ?? colors.cancelled}`}>
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
  const [toast, setToast] = useState<{ message: string; type: "success" | "muted" } | null>(null);

  const isTrial = tier === "trial" || status === "trialing";
  const effectiveTier = isTrial ? "" : tier; // no "current" tier during trial
  const tierIdx = isTrial ? -1 : TIER_ORDER.indexOf(tier);

  // Handle return from Stripe
  useEffect(() => {
    const payment = searchParams.get("payment");
    if (payment === "success") {
      setToast({ message: "Payment successful! Your plan is now active.", type: "success" });
    } else if (payment === "cancelled") {
      setToast({ message: "Payment cancelled — your trial continues.", type: "muted" });
    }
    if (payment) {
      const timer = setTimeout(() => setToast(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  async function handleCheckout(targetTier: string) {
    setCheckoutLoading(targetTier);
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
    <div className="mx-auto max-w-4xl space-y-8">
      <h1 className="text-2xl font-bold">Subscription</h1>

      {/* Payment toast */}
      {toast && (
        <div
          className={`rounded-lg p-3 text-center text-sm font-medium ${
            toast.type === "success"
              ? "bg-success/10 text-success"
              : "bg-muted/10 text-muted"
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Current Plan Card */}
      <div className="rounded-lg border border-lift-border bg-surface p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold capitalize">
                {tier === "trial" ? "Professional Trial" : tier}
              </h2>
              <StatusBadge status={status} />
            </div>
            {status === "trialing" && trialDaysRemaining !== null && (
              <p className="mt-1 text-sm text-muted">
                {trialDaysRemaining} day{trialDaysRemaining !== 1 ? "s" : ""} remaining in your trial
              </p>
            )}
            {status === "active" && currentPeriodEndsAt && (
              <p className="mt-1 text-sm text-muted">
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
            {status === "trialing" && (
              <a
                href="#plans"
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90"
              >
                Upgrade to keep access
              </a>
            )}
            {hasStripeSubscription && (
              <button
                onClick={handleManageBilling}
                className="rounded-md border border-lift-border px-4 py-2 text-sm font-medium text-lift-text hover:bg-surface"
              >
                Manage Billing
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Usage Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg border border-lift-border bg-surface p-4">
          <p className="text-xs text-muted">Sessions this year</p>
          <p className="mt-1 text-xl font-bold">
            {sessionsUsed}
            <span className="text-sm font-normal text-muted">
              {" "}/ {sessionsLimit ?? "∞"}
            </span>
          </p>
          {sessionsLimit && (
            <div className="mt-2 h-1.5 rounded-full bg-lift-border">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{
                  width: `${Math.min(100, (sessionsUsed / sessionsLimit) * 100)}%`,
                }}
              />
            </div>
          )}
        </div>
        <div className="rounded-lg border border-lift-border bg-surface p-4">
          <p className="text-xs text-muted">Evaluator seats</p>
          <p className="mt-1 text-xl font-bold">
            {evaluatorSeatsUsed}
            <span className="text-sm font-normal text-muted">
              {" "}/ {seatLimit ?? "∞"}
            </span>
          </p>
        </div>
      </div>

      {/* Tier Comparison */}
      <div id="plans" className="scroll-mt-8">
        <h2 className="mb-4 text-lg font-semibold">Compare Plans</h2>
        <div className="overflow-x-auto rounded-lg border border-lift-border">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-lift-border bg-surface">
                <th className="px-4 py-3 text-xs font-medium text-muted">Feature</th>
                {TIER_ORDER.map((t) => {
                  const isCurrent = t === effectiveTier;
                  const Icon = TIER_ICONS[t];
                  return (
                    <th
                      key={t}
                      className={`px-4 py-3 text-center text-xs font-medium ${
                        isCurrent
                          ? "border-x-2 border-t-2 border-primary bg-primary/5"
                          : ""
                      }`}
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <Icon size={14} />
                        <span className="capitalize">{t}</span>
                      </div>
                      {isCurrent && (
                        <span className="mt-1 block text-[10px] text-primary">
                          Current
                        </span>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-lift-border">
              {FEATURE_ROWS.map((row) => (
                <tr key={row.label} className="hover:bg-surface/50">
                  <td className="px-4 py-2.5 text-xs text-lift-text">
                    {row.label}
                  </td>
                  {TIER_ORDER.map((t) => {
                    const val = row[t as keyof typeof row];
                    const isCurrent = t === effectiveTier;
                    return (
                      <td
                        key={t}
                        className={`px-4 py-2.5 text-center text-xs ${
                          isCurrent ? "border-x-2 border-primary bg-primary/5" : ""
                        }`}
                      >
                        {val === true ? (
                          <Check size={14} className="mx-auto text-success" />
                        ) : val === false ? (
                          <X size={14} className="mx-auto text-muted/40" />
                        ) : (
                          <span className="text-lift-text">{val}</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
              {/* Pricing row */}
              <tr className="border-t-2 border-lift-border bg-surface">
                <td className="px-4 py-3 text-xs font-semibold">Annual Price</td>
                {TIER_ORDER.map((t) => {
                  const price =
                    TIER_PRICING[t as keyof typeof TIER_PRICING]?.annual;
                  const isCurrent = t === effectiveTier;
                  const isHigher = TIER_ORDER.indexOf(t) > tierIdx;
                  return (
                    <td
                      key={t}
                      className={`px-4 py-3 text-center ${
                        isCurrent
                          ? "border-x-2 border-b-2 border-primary bg-primary/5"
                          : ""
                      }`}
                    >
                      <p className="text-sm font-bold">
                        ${price?.toLocaleString()}/yr
                      </p>
                      {isCurrent && (
                        <p className="mt-2 text-[10px] text-muted font-medium">
                          Current Plan
                        </p>
                      )}
                      {isHigher && (
                        <button
                          onClick={() => handleCheckout(t)}
                          disabled={checkoutLoading === t}
                          className="mt-2 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
                        >
                          {checkoutLoading === t
                            ? "Loading..."
                            : `Upgrade to ${t.charAt(0).toUpperCase() + t.slice(1)}`}
                        </button>
                      )}
                      {!isCurrent && !isHigher && (
                        <a
                          href="mailto:lift@inteliflowai.com?subject=LIFT%20Downgrade%20Request"
                          className="mt-2 inline-block text-[10px] text-muted hover:underline"
                        >
                          Contact to downgrade
                        </a>
                      )}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Billing Contact */}
      <div className="rounded-lg border border-lift-border bg-surface p-5">
        <h3 className="text-sm font-semibold">
          Questions about your subscription?
        </h3>
        <p className="mt-1 text-xs text-muted">
          Contact us at{" "}
          <a
            href="mailto:lift@inteliflowai.com"
            className="text-primary hover:underline"
          >
            lift@inteliflowai.com
          </a>
        </p>
        <p className="mt-1 text-[10px] text-muted/70">
          LIFT uses annual contracts. Our team will send you a quote within 1
          business day.
        </p>
      </div>
    </div>
  );
}
