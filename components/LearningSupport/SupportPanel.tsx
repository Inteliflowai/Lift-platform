"use client";

import { Info } from "lucide-react";
import { useState } from "react";

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
};

const FLAG_LABELS: Record<string, string> = {
  high_revision_depth:
    "Extended revision and editing patterns in written responses",
  low_reading_dwell:
    "Reading pace relative to passage length warrants follow-up",
  short_written_output:
    "Written output is notably brief relative to task expectations",
  high_response_latency:
    "Consistently extended response time across all task types",
  task_abandonment_pattern: "Frequent task revisits and return patterns",
  hint_seeking_high: "High frequency of hint and support requests",
  planning_task_difficulty:
    "Difficulty structuring multi-step planning tasks",
  reasoning_writing_gap:
    "Significant gap between reasoning signals and written expression",
};

const FLAG_KEYS = Object.keys(FLAG_LABELS) as (keyof typeof FLAG_LABELS)[];

export function SupportPanel({
  signal,
  onView,
}: {
  signal: Signal | null;
  onView?: () => void;
}) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [viewed, setViewed] = useState(false);

  if (!signal) return null;

  // Fire audit log on first view
  if (!viewed && onView) {
    setViewed(true);
    onView();
  }

  const level = signal.support_indicator_level;
  const activeFlags = FLAG_KEYS.filter(
    (key) => signal[key as keyof Signal] === true
  );

  const borderColor =
    level === "recommend_screening"
      ? "border-[#f43f5e]"
      : level === "watch"
      ? "border-[#f59e0b]"
      : "border-[#10b981]";

  const bgColor =
    level === "recommend_screening"
      ? "bg-[#f43f5e]/5"
      : level === "watch"
      ? "bg-[#f59e0b]/5"
      : "bg-[#10b981]/5";

  return (
    <div className={`rounded-lg border-2 ${borderColor} ${bgColor} p-5 space-y-4`}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold text-[#1a1a2e]">
          Learning Support Indicators
        </h3>
        <div className="relative">
          <button
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            className="text-[#6b7280] hover:text-[#1a1a2e]"
          >
            <Info size={14} />
          </button>
          {showTooltip && (
            <div className="absolute left-6 top-0 z-10 w-72 rounded-lg border border-[#e5e5e5] bg-white p-3 text-xs text-[#6b7280] shadow-lg">
              These patterns do not constitute a diagnosis. They indicate
              behavioral signals that may suggest a student would benefit from a
              learning support evaluation.
            </div>
          )}
        </div>
      </div>

      {/* Level indicator */}
      {level === "none" && (
        <div className="inline-flex items-center gap-1.5 rounded-full bg-[#10b981]/10 px-3 py-1 text-xs font-medium text-[#10b981]">
          <div className="h-1.5 w-1.5 rounded-full bg-[#10b981]" />
          No indicators detected
        </div>
      )}

      {/* Active flags */}
      {activeFlags.length > 0 && (
        <ul className="space-y-2">
          {activeFlags.map((key) => (
            <li
              key={key}
              className="flex items-start gap-2 text-sm text-[#1a1a2e]"
            >
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#f59e0b]" />
              {FLAG_LABELS[key]}
            </li>
          ))}
        </ul>
      )}

      {/* Evaluator note */}
      {signal.evaluator_note && level === "watch" && (
        <div className="rounded-md border border-[#f59e0b]/30 bg-[#f59e0b]/10 px-4 py-3 text-xs text-[#92400e]">
          {signal.evaluator_note}
        </div>
      )}

      {signal.evaluator_note && level === "recommend_screening" && (
        <div className="rounded-md border border-[#f43f5e]/30 bg-[#f43f5e]/10 px-4 py-3 text-xs text-[#9f1239]">
          <span className="font-semibold">Flagged for review: </span>
          {signal.evaluator_note}
        </div>
      )}

      {/* Disclaimer footer */}
      <p className="text-[10px] leading-relaxed text-[#6b7280]">
        LIFT does not diagnose learning disabilities or any clinical condition.
        These indicators are for school use only and must be reviewed by a
        qualified professional before any action is taken.
      </p>
    </div>
  );
}
