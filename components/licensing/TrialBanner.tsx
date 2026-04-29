"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useLicense } from "@/lib/licensing/context";
import { ChevronUp } from "lucide-react";

function getBannerStyle(daysRemaining: number) {
  if (daysRemaining <= 0)
    return {
      bg: "bg-[#f43f5e]",
      text: "text-white",
      bar: "bg-white/30",
      barFill: "bg-white",
      btn: "bg-white text-[#f43f5e]",
      pillBg: "bg-[#f43f5e]",
      pillText: "text-white",
    };
  if (daysRemaining <= 6)
    return {
      bg: "bg-[rgba(244,63,94,0.15)]",
      text: "text-[#f43f5e]",
      bar: "bg-[#f43f5e]/20",
      barFill: "bg-[#f43f5e]",
      btn: "bg-[#f43f5e] text-white",
      pillBg: "bg-[#f43f5e]/15",
      pillText: "text-[#f43f5e]",
    };
  if (daysRemaining <= 14)
    return {
      bg: "bg-[rgba(245,158,11,0.15)]",
      text: "text-[#b45309]",
      bar: "bg-[#f59e0b]/20",
      barFill: "bg-[#f59e0b]",
      btn: "bg-[#f59e0b] text-white",
      pillBg: "bg-[#f59e0b]/15",
      pillText: "text-[#b45309]",
    };
  return {
    bg: "bg-[#1e1b2e]",
    text: "text-white",
    bar: "bg-white/20",
    barFill: "bg-[#6366f1]",
    btn: "bg-[#6366f1] text-white",
    pillBg: "bg-[#1e1b2e]",
    pillText: "text-white",
  };
}

export function TrialBanner() {
  const license = useLicense();
  const pathname = usePathname();
  const [minimized, setMinimized] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem("lift-trial-banner-minimized");
    if (stored === "true") setMinimized(true);
  }, []);

  function toggleMinimize() {
    const next = !minimized;
    setMinimized(next);
    localStorage.setItem("lift-trial-banner-minimized", String(next));
  }

  // Platform admins viewing /admin/* surfaces shouldn't see a trial countdown
  // pulled from whichever tenant license context happens to load — they're
  // operating cross-tenant, not running a trial themselves.
  if (pathname?.startsWith("/admin")) return null;

  if (!mounted || license.status !== "trialing") return null;

  const days = license.trialDaysRemaining ?? 0;
  const style = getBannerStyle(days);
  const trialProgressPct = Math.min(100, ((30 - days) / 30) * 100);
  const isEnterprise = license.expectedTier === "enterprise";
  // Enterprise routes to a sales conversation, not Stripe self-serve.
  // Professional keeps Stripe self-serve + an "invoice" escape hatch for
  // schools whose finance ops can't process a card payment.
  const ctaHref = isEnterprise
    ? "mailto:sales@inteliflowai.com?subject=LIFT%20Enterprise"
    : "/school/settings/subscription";
  const ctaLabel = isEnterprise ? "Schedule a call" : "Upgrade Now";
  const softLabel = isEnterprise ? "Talk to sales" : "See pricing";

  if (minimized) {
    return (
      <button
        onClick={toggleMinimize}
        className={`fixed right-4 top-3 z-50 rounded-full px-3 py-1 text-xs font-medium ${style.pillBg} ${style.pillText} hover:opacity-80 transition-opacity`}
      >
        Trial &middot; {days}d
      </button>
    );
  }

  return (
    <div className="relative z-40">
      <div
        className={`flex h-11 items-center justify-center gap-4 px-4 text-[13px] font-medium ${style.bg} ${style.text}`}
      >
        <span>
          Trial &middot; {days} day{days !== 1 ? "s" : ""} remaining
        </span>
        <span className="hidden sm:inline text-current/60">&middot;</span>
        <span className="hidden sm:inline">
          {license.sessionsUsed} of {license.sessionsLimit ?? 25} sessions used
        </span>
        {days > 14 ? (
          <a
            href={ctaHref}
            className="text-xs font-semibold underline-offset-4 hover:underline opacity-80 hover:opacity-100 transition-opacity"
          >
            {softLabel}
          </a>
        ) : (
          <>
            <a
              href={ctaHref}
              className={`rounded-md px-3 py-1 text-xs font-semibold ${style.btn} hover:opacity-90 transition-opacity`}
            >
              {ctaLabel}
            </a>
            {!isEnterprise && (
              <a
                href="mailto:sales@inteliflowai.com?subject=LIFT%20invoice%20billing"
                className="hidden md:inline text-[11px] font-medium underline-offset-4 hover:underline opacity-70 hover:opacity-100 transition-opacity"
              >
                Need an invoice?
              </a>
            )}
          </>
        )}
        <button
          onClick={toggleMinimize}
          className="absolute right-3 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100 transition-opacity"
          aria-label="Minimize trial banner"
        >
          <ChevronUp size={14} />
        </button>
      </div>
      {/* Progress strip */}
      <div className={`h-[3px] w-full ${style.bar}`}>
        <div
          className={`h-full ${style.barFill} transition-all`}
          style={{ width: `${trialProgressPct}%` }}
        />
      </div>
    </div>
  );
}
