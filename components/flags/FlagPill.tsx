"use client";

import type { CandidateFlag, FlagSeverity } from "@/lib/flags/types";
import { useLocale } from "@/lib/i18n/LocaleProvider";

// Compact at-a-glance pill. Shows highest-severity tone with a "+N more"
// suffix when the candidate has multiple active flags. Click opens the
// FlagDetailDrawer (controlled by the parent via onClick).
//
// Observation-language: label says "needs attention" or "observation"
// depending on severity — never "risk" or "prediction."

interface Props {
  activeFlags: CandidateFlag[];
  onClick?: () => void;
  compact?: boolean;
}

function highestSeverity(flags: CandidateFlag[]): FlagSeverity | null {
  if (flags.length === 0) return null;
  if (flags.some((f) => f.severity === "notable")) return "notable";
  return "advisory";
}

export function FlagPill({ activeFlags, onClick, compact = false }: Props) {
  const { t } = useLocale();
  if (activeFlags.length === 0) return null;
  const sev = highestSeverity(activeFlags);

  const toneClass =
    sev === "notable"
      ? "bg-rose-500/15 text-rose-400 border-rose-500/40"
      : "bg-amber-500/15 text-amber-400 border-amber-500/40";

  const label = sev === "notable" ? t("flags.pill.needs_attention") : t("flags.pill.observation");
  const suffix = activeFlags.length > 1 ? ` +${activeFlags.length - 1}` : "";

  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-medium ${toneClass} ${onClick ? "hover:brightness-110 cursor-pointer" : ""}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {compact ? `${activeFlags.length}` : `${label}${suffix}`}
    </button>
  );
}
