"use client";

import { useState } from "react";
import { ChevronDown, Copy, Check, Sparkles } from "lucide-react";

type Question = { question: string; rationale: string; dimension: string };

type Briefing = {
  key_observations: string[];
  interview_questions: Question[];
  areas_to_explore: string[];
  strengths_to_confirm: string[];
  confidence_explanation: string;
};

// Number of items surfaced in compact mode. The AI produces observations and
// questions in a coherent order; we trust that order and take the first N.
// Do NOT resort by length/dimension/priority — the pipeline has already
// done the sequencing work and imposing a different sort introduces noise
// without adding signal.
const COMPACT_OBSERVATIONS = 3;
const COMPACT_QUESTIONS = 3;

export function BriefingCard({
  briefing,
  profileFinalized,
  onRegenerate,
  variant = "full",
  candidateId,
}: {
  briefing: Briefing | null;
  profileFinalized?: boolean;
  onRegenerate?: () => void;
  variant?: "full" | "compact";
  candidateId?: string;
}) {
  const [expandedQ, setExpandedQ] = useState<number | null>(null);
  const [copied, setCopied] = useState<number | null>(null);
  const [regenerating, setRegenrating] = useState(false);
  const [compactExpanded, setCompactExpanded] = useState(false);
  const isCompact = variant === "compact";
  const disclosureId = `briefing-full-${candidateId ?? "anon"}`;

  if (!briefing) {
    // Profile is finalized but no briefing was generated — show retry option
    if (profileFinalized) {
      return (
        <div className="rounded-lg border-l-4 border-[#6366f1] bg-[#6366f1]/5 p-5">
          <p className="text-sm text-muted">Interview briefing was not generated.</p>
          {onRegenerate && (
            <button
              onClick={() => { setRegenrating(true); onRegenerate(); }}
              disabled={regenerating}
              className="mt-2 rounded-md bg-[#6366f1] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {regenerating ? "Generating..." : "Generate Briefing"}
            </button>
          )}
        </div>
      );
    }
    // Still processing
    return (
      <div className="rounded-lg border-l-4 border-[#6366f1] bg-[#6366f1]/5 p-5">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#6366f1] border-t-transparent" />
          <p className="text-sm text-muted">Preparing interview briefing...</p>
        </div>
      </div>
    );
  }

  function copyQuestion(idx: number, text: string) {
    navigator.clipboard.writeText(text);
    setCopied(idx);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="rounded-lg border-l-4 border-[#6366f1] bg-[#6366f1]/5 p-5 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">Interview Preparation</h3>
          <span className="flex items-center gap-1 rounded-full bg-[#6366f1]/10 px-2 py-0.5 text-[10px] text-[#6366f1]">
            <Sparkles size={10} /> AI-generated
          </span>
        </div>
        {onRegenerate && (
          <button onClick={onRegenerate} className="text-[10px] text-[#6366f1] hover:underline">
            Regenerate
          </button>
        )}
      </div>

      {/* Key Observations */}
      <div>
        <h4 className="mb-1.5 text-xs font-semibold text-muted uppercase tracking-wide">Key Observations</h4>
        <ul className="space-y-1">
          {(isCompact && !compactExpanded
            ? briefing.key_observations.slice(0, COMPACT_OBSERVATIONS)
            : briefing.key_observations
          ).map((obs, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#6366f1]" />
              {obs}
            </li>
          ))}
        </ul>
      </div>

      {/* Interview Questions */}
      <div>
        <h4 className="mb-1.5 text-xs font-semibold text-muted uppercase tracking-wide">Suggested Interview Questions</h4>
        <div className="space-y-1">
          {(isCompact && !compactExpanded
            ? (briefing.interview_questions as Question[]).slice(0, COMPACT_QUESTIONS)
            : (briefing.interview_questions as Question[])
          ).map((q, i) => (
            <div key={i} className="rounded-md border border-[#e5e5e5] bg-white">
              <button
                onClick={() => setExpandedQ(expandedQ === i ? null : i)}
                className="flex w-full items-center justify-between px-3 py-2.5 text-left"
              >
                <span className="text-sm font-medium pr-4">{q.question}</span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={(e) => { e.stopPropagation(); copyQuestion(i, q.question); }}
                    className="rounded p-1 text-muted hover:text-[#6366f1]"
                  >
                    {copied === i ? <Check size={12} className="text-[#10b981]" /> : <Copy size={12} />}
                  </button>
                  <ChevronDown size={14} className={`text-muted transition-transform ${expandedQ === i ? "rotate-180" : ""}`} />
                </div>
              </button>
              {expandedQ === i && (
                <div className="border-t border-[#e5e5e5] px-3 py-2 text-xs text-muted space-y-1">
                  <p><span className="font-medium">Rationale:</span> {q.rationale}</p>
                  <p><span className="font-medium">Dimension:</span> <span className="capitalize">{q.dimension?.replace(/_/g, " ")}</span></p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Compact-mode disclosure toggle */}
      {isCompact && (
        <button
          type="button"
          onClick={() => setCompactExpanded((v) => !v)}
          aria-expanded={compactExpanded}
          aria-controls={disclosureId}
          className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-md border border-[#6366f1]/30 bg-white px-3 py-2 text-sm font-medium text-[#6366f1] hover:bg-[#6366f1]/5"
        >
          {compactExpanded ? "Collapse full briefing" : "Expand full briefing"}
          <ChevronDown
            size={14}
            className={`transition-transform ${compactExpanded ? "rotate-180" : ""}`}
          />
        </button>
      )}

      {/* Full-mode sections OR compact-expanded content */}
      {(!isCompact || compactExpanded) && (
        <div id={disclosureId} className="space-y-5">
          {/* Areas to Explore */}
          <div>
            <h4 className="mb-1.5 text-xs font-semibold text-muted uppercase tracking-wide">Areas to Explore</h4>
            <ul className="space-y-1">
              {briefing.areas_to_explore.map((area, i) => (
                <li key={i} className="text-sm text-muted">Consider asking about: <span className="text-[#1a1a2e]">{area}</span></li>
              ))}
            </ul>
          </div>

          {/* Strengths to Confirm */}
          <div>
            <h4 className="mb-1.5 text-xs font-semibold text-muted uppercase tracking-wide">Strengths to Confirm</h4>
            <ul className="space-y-1">
              {briefing.strengths_to_confirm.map((s, i) => (
                <li key={i} className="text-sm text-muted">Look to validate: <span className="text-[#1a1a2e]">{s}</span></li>
              ))}
            </ul>
          </div>

          {/* Confidence Explanation */}
          <div className="rounded-md bg-white border border-[#e5e5e5] px-3 py-2">
            <h4 className="text-xs font-semibold text-muted mb-1">Why This Confidence Level</h4>
            <p className="text-sm">{briefing.confidence_explanation}</p>
          </div>
        </div>
      )}
    </div>
  );
}
