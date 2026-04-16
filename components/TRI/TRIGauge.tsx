"use client";

import { useEffect, useState } from "react";
import { Info } from "lucide-react";
import { displayTriLabel } from "@/lib/utils/triLabel";

type Props = {
  score: number | null;
  label: string | null;
  confidence: string | null;
  summary: string | null;
};

const LABEL_COLORS: Record<string, string> = {
  emerging: "#f43f5e",
  developing: "#f59e0b",
  ready: "#6366f1",
  thriving: "#10b981",
};

const LABEL_BG: Record<string, string> = {
  emerging: "bg-[#f43f5e]/10 text-[#f43f5e]",
  developing: "bg-[#f59e0b]/10 text-[#f59e0b]",
  ready: "bg-[#6366f1]/10 text-[#6366f1]",
  thriving: "bg-[#10b981]/10 text-[#10b981]",
};

const CONFIDENCE_STYLE: Record<string, string> = {
  high: "bg-[#10b981]/10 text-[#10b981]",
  moderate: "bg-[#f59e0b]/10 text-[#f59e0b]",
  low: "bg-[#f43f5e]/10 text-[#f43f5e]",
};

export function TRIGauge({ score, label, confidence, summary }: Props) {
  const [progress, setProgress] = useState(0);
  const [showTooltip, setShowTooltip] = useState(false);
  const [hovered, setHovered] = useState(false);

  const val = score ?? 0;
  const color = LABEL_COLORS[label ?? ""] ?? "#6b7280";

  useEffect(() => {
    let frame: number;
    let start: number | null = null;
    const duration = 1200;
    function animate(ts: number) {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setProgress(eased);
      if (p < 1) frame = requestAnimationFrame(animate);
    }
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [val]);

  // SVG arc math — 220° sweep
  const radius = 80;
  const strokeWidth = 14;
  const cx = 100;
  const cy = 100;
  const startAngle = -220;
  const endAngle = 40;
  const totalAngle = endAngle - startAngle;
  const circumference = (totalAngle / 360) * 2 * Math.PI * radius;
  const filledLength = (val / 100) * circumference * progress;

  function polarToCartesian(angle: number) {
    const rad = (angle * Math.PI) / 180;
    return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
  }
  function describeArc(start: number, end: number) {
    const s = polarToCartesian(start);
    const e = polarToCartesian(end);
    const large = end - start > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${radius} ${radius} 0 ${large} 1 ${e.x} ${e.y}`;
  }

  const displayScore = Math.round(val * progress * 10) / 10;

  if (score === null) {
    return (
      <div className="rounded-xl border border-lift-border bg-surface p-8 text-center">
        <div className="mx-auto h-5 w-5 animate-spin rounded-full border-2 border-[#6366f1] border-t-transparent" />
        <p className="mt-3 text-sm text-muted">Computing Transition Readiness Index...</p>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl border border-lift-border bg-surface p-8"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="flex flex-col items-center">
        {/* Arc gauge */}
        <div className="relative">
          <svg width="200" height="140" viewBox="0 0 200 140"
            style={{ filter: hovered ? `drop-shadow(0 0 12px ${color}40)` : "none", transition: "filter 300ms ease" }}>
            {/* Background arc */}
            <path d={describeArc(startAngle, endAngle)} fill="none" stroke="#e5e5e5" strokeWidth={strokeWidth} strokeLinecap="round" />
            {/* Filled arc */}
            <path d={describeArc(startAngle, endAngle)} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"
              strokeDasharray={`${circumference}`}
              strokeDashoffset={circumference - filledLength}
              style={{ transition: "stroke-dashoffset 100ms linear" }} />
          </svg>
          {/* Score number */}
          <div className="absolute inset-0 flex items-center justify-center pt-4">
            <span className="tri-score text-4xl font-bold" style={{ color, fontFamily: "var(--font-geist-mono)" }}>
              {displayScore.toFixed(1)}
            </span>
          </div>
        </div>

        {/* Label */}
        <div className="mt-2 flex items-center gap-2">
          <span className={`rounded-full px-4 py-1.5 font-[family-name:var(--font-display)] text-base font-semibold ${LABEL_BG[label ?? ""] ?? "bg-gray-100 text-gray-600"}`}>
            {displayTriLabel(label) || "—"}
          </span>
          <div className="relative">
            <button onMouseEnter={() => setShowTooltip(true)} onMouseLeave={() => setShowTooltip(false)}
              className="text-muted hover:text-lift-text">
              <Info size={14} />
            </button>
            {showTooltip && (
              <div className="absolute bottom-6 left-1/2 z-10 w-64 -translate-x-1/2 rounded-lg border border-lift-border bg-white p-3 text-xs text-muted shadow-lg">
                The Transition Readiness Index is a composite indicator based on 6 readiness dimensions. It is not a pass/fail score.
              </div>
            )}
          </div>
        </div>

        {/* Summary */}
        {summary && (
          <p className="mt-3 max-w-[280px] text-center font-[family-name:var(--font-body)] text-[13px] leading-relaxed text-muted">
            {summary}
          </p>
        )}

        {/* Confidence */}
        {confidence && (
          <span className={`mt-3 rounded-full px-3 py-1 text-[11px] font-medium capitalize ${CONFIDENCE_STYLE[confidence] ?? "bg-gray-100 text-gray-500"}`}>
            {confidence} confidence
          </span>
        )}
      </div>
    </div>
  );
}

/** Small pill for candidate lists */
export function TRIPill({ score, label, confidence }: { score: number | null; label: string | null; confidence: string | null }) {
  if (score === null && !label) return <span className="text-xs text-muted">Processing...</span>;
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${LABEL_BG[label ?? ""] ?? "bg-gray-100 text-gray-600"}`}>{displayTriLabel(label)}</span>
      <span className="text-xs font-semibold font-[family-name:var(--font-geist-mono)]" style={{ color: LABEL_COLORS[label ?? ""] }}>{score != null ? score.toFixed(1) : "—"}</span>
      {confidence === "low" && <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500">Low data</span>}
    </span>
  );
}
