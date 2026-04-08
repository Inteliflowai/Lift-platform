"use client";

import { useState, useEffect } from "react";
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
    bg: "bg-[rgba(99,102,241,0.15)]",
    text: "text-[#4338ca]",
    bar: "bg-[#6366f1]/20",
    barFill: "bg-[#6366f1]",
    btn: "bg-[#6366f1] text-white",
    pillBg: "bg-[#6366f1]/15",
    pillText: "text-[#4338ca]",
  };
}

export function TrialBanner() {
  const license = useLicense();
  const [minimized, setMinimized] = useState(false);

  // Load minimized preference from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("lift-trial-banner-minimized");
    if (stored === "true") setMinimized(true);
  }, []);

  function toggleMinimize() {
    const next = !minimized;
    setMinimized(next);
    localStorage.setItem("lift-trial-banner-minimized", String(next));
  }

  if (license.status !== "trialing") return null;

  const days = license.trialDaysRemaining ?? 0;
  const style = getBannerStyle(days);
  const trialProgressPct = Math.min(100, ((30 - days) / 30) * 100);

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
        <a
          href="/school/settings/subscription"
          className={`rounded-md px-3 py-1 text-xs font-semibold ${style.btn} hover:opacity-90 transition-opacity`}
        >
          Upgrade Now
        </a>
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
