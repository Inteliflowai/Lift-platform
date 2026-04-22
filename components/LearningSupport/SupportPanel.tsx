"use client";

import { Info, Lightbulb } from "lucide-react";
import { useState } from "react";
import { useLocale } from "@/lib/i18n/LocaleProvider";

type EnrichedSignal = {
  id: string;
  label: string;
  description: string;
  recommendation: string;
  severity: "advisory" | "notable";
  category: "reading" | "writing" | "processing" | "attention" | "self-regulation";
  evidenceSummary: string;
};

type Signal = {
  id: string;
  high_revision_depth: boolean;
  low_reading_dwell: boolean;
  short_written_output: boolean;
  high_response_latency: boolean;
  task_abandonment_pattern: boolean;
  hint_seeking_high: boolean;
  planning_task_difficulty: boolean;
  reasoning_writing_gap: boolean;
  signal_count: number;
  support_indicator_level: "none" | "watch" | "recommend_screening";
  evaluator_note: string | null;
  requires_human_review: boolean;
  enriched_signals?: EnrichedSignal[];
  enriched_signal_count?: number;
  has_notable_signals?: boolean;
};

// Flag keys (labels resolve via t(`support_panel.flag.${key}`) at render time)
const FLAG_KEYS = [
  "high_revision_depth",
  "low_reading_dwell",
  "short_written_output",
  "high_response_latency",
  "task_abandonment_pattern",
  "hint_seeking_high",
  "planning_task_difficulty",
  "reasoning_writing_gap",
] as const;

const CATEGORY_COLORS: Record<string, string> = {
  reading: "bg-[#6366f1]/10 text-[#6366f1]",
  writing: "bg-[#10b981]/10 text-[#10b981]",
  processing: "bg-[#f59e0b]/10 text-[#f59e0b]",
  attention: "bg-[#ec4899]/10 text-[#ec4899]",
  "self-regulation": "bg-[#8b5cf6]/10 text-[#8b5cf6]",
};

export function SupportPanel({
  signal,
  onView,
  schoolType,
}: {
  signal: Signal | null;
  onView?: () => void;
  schoolType?: string;
}) {
  const { t } = useLocale();
  const [showTooltip, setShowTooltip] = useState(false);
  const [viewed, setViewed] = useState(false);

  if (!signal) return null;

  if (!viewed && onView) {
    setViewed(true);
    onView();
  }

  const level = signal.support_indicator_level;
  const activeFlags = FLAG_KEYS.filter((key) => signal[key as keyof Signal] === true);
  const enrichedSignals = (signal.enriched_signals ?? []) as EnrichedSignal[];
  const totalSignalCount = activeFlags.length + enrichedSignals.length;
  const isTherapeutic = schoolType === "therapeutic";

  const borderColor =
    level === "recommend_screening" ? "border-[#f43f5e]"
    : level === "watch" ? "border-[#f59e0b]"
    : "border-[#10b981]";

  const bgColor =
    level === "recommend_screening" ? "bg-[#f43f5e]/5"
    : level === "watch" ? "bg-[#f59e0b]/5"
    : "bg-[#10b981]/5";

  return (
    <div className={`rounded-lg border-2 ${borderColor} ${bgColor} p-5 space-y-4`}>
      {/* Therapeutic school disclaimer */}
      {isTherapeutic && (
        <div className="rounded-md border border-[#6366f1]/30 bg-[#6366f1]/5 px-4 py-3 text-xs text-[#4338ca]">
          <span className="font-semibold">{t("support_panel.therapeutic_prefix")}</span> {t("support_panel.therapeutic_body")}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-[#1a1a2e]">{t("support_panel.title")}</h3>
          {totalSignalCount > 0 && (
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
              signal.has_notable_signals ? "bg-[#f59e0b]/10 text-[#f59e0b]" : "bg-[#6b7280]/10 text-[#6b7280]"
            }`}>
              {totalSignalCount} {totalSignalCount !== 1 ? t("support_panel.signals_count_suffix_plural") : t("support_panel.signals_count_suffix")}
            </span>
          )}
          <div className="relative">
            <button
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              className="text-[#6b7280] hover:text-[#1a1a2e]"
            >
              <Info size={14} />
            </button>
            {showTooltip && (
              <div className="absolute left-6 top-0 z-10 w-80 rounded-lg border border-[#e5e5e5] bg-white p-3 text-xs text-[#6b7280] shadow-lg">
                {t("support_panel.tooltip")}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* No signals — green state */}
      {totalSignalCount === 0 && level === "none" && (
        <div className="rounded-md bg-[#10b981]/10 px-4 py-3">
          <div className="flex items-center gap-1.5 text-xs font-medium text-[#10b981]">
            <div className="h-1.5 w-1.5 rounded-full bg-[#10b981]" />
            {t("support_panel.none_title")}
          </div>
          <p className="mt-1.5 text-[11px] text-[#6b7280] leading-relaxed">
            {t("support_panel.none_body")}
          </p>
        </div>
      )}

      {/* Legacy boolean flags (if no enriched signals, show these) */}
      {activeFlags.length > 0 && enrichedSignals.length === 0 && (
        <ul className="space-y-2">
          {activeFlags.map((key) => (
            <li key={key} className="flex items-start gap-2 text-sm text-[#1a1a2e]">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#f59e0b]" />
              {t(`support_panel.flag.${key}`)}
            </li>
          ))}
        </ul>
      )}

      {/* Enriched signals */}
      {enrichedSignals.length > 0 && (
        <div className="space-y-3">
          {enrichedSignals.map((sig) => (
            <div key={sig.id} className="rounded-md border border-[#e5e5e5] bg-white p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className={`h-2 w-2 rounded-full shrink-0 ${sig.severity === "notable" ? "bg-[#f59e0b]" : "bg-[#fbbf24]"}`} />
                <span className="text-sm font-semibold text-[#1a1a2e]">{sig.label}</span>
                <span className={`rounded-full px-2 py-0.5 text-[9px] font-medium capitalize ${CATEGORY_COLORS[sig.category] ?? "bg-[#6b7280]/10 text-[#6b7280]"}`}>
                  {sig.category}
                </span>
              </div>
              <p className="text-xs text-[#1a1a2e] leading-relaxed">{sig.description}</p>
              <p className="mt-1.5 text-[11px] italic text-[#6b7280]">{sig.evidenceSummary}</p>
              <div className="mt-2.5 flex items-start gap-1.5 rounded-md bg-[#f8f8fa] px-3 py-2">
                <Lightbulb size={12} className="mt-0.5 shrink-0 text-[#f59e0b]" />
                <p className="text-[11px] text-[#1a1a2e] leading-relaxed">{sig.recommendation}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Evaluator note */}
      {signal.evaluator_note && level === "watch" && (
        <div className="rounded-md border border-[#f59e0b]/30 bg-[#f59e0b]/10 px-4 py-3 text-xs text-[#92400e]">
          {signal.evaluator_note}
        </div>
      )}
      {signal.evaluator_note && level === "recommend_screening" && (
        <div className="rounded-md border border-[#f43f5e]/30 bg-[#f43f5e]/10 px-4 py-3 text-xs text-[#9f1239]">
          <span className="font-semibold">{t("support_panel.flagged_for_review")} </span>
          {signal.evaluator_note}
        </div>
      )}

      {/* Disclaimer footer */}
      <p className="text-[10px] leading-relaxed text-[#6b7280]">
        {t("support_panel.disclaimer")}
      </p>
    </div>
  );
}
