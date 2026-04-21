"use client";

import type { CandidateFlag, FlagType } from "@/lib/flags/types";

// Per-flag card: severity badge, observational description, evidence block.
// Used inside the FlagDetailDrawer and inline on candidate-detail + committee
// deliberation surfaces. Strict observation-vocabulary discipline.

const FLAG_LABELS: Record<FlagType, string> = {
  consent_not_captured: "Consent not captured",
  invite_expired_unopened: "Invite expired unopened",
  assessment_abandoned: "Assessment abandoned",
  low_completion: "Low completion",
  late_cycle_admit: "Late-cycle admit",
  post_admit_silence: "Post-admit silence",
  interviewer_unresponsive: "Interviewer unresponsive",
};

const FLAG_DESCRIPTIONS: Record<FlagType, string> = {
  consent_not_captured:
    "Candidate is admitted, waitlisted, or offered, but required consent types were not observed in the consent log.",
  invite_expired_unopened:
    "The most recent invite expired without being opened. No record of the recipient viewing it.",
  assessment_abandoned:
    "The assessment session was explicitly abandoned or has been inactive for more than 7 days without completion.",
  low_completion:
    "Candidate completed the assessment but finished fewer than 75% of the tasks.",
  late_cycle_admit:
    "The admit or waitlist decision was recorded within 7 days of the application cycle's close date.",
  post_admit_silence:
    "Candidate was admitted and we have observed no activity — consent, invite, status change, assignment, or application update — within the tenant's configured silence window.",
  interviewer_unresponsive:
    "An interview assignment was recorded more than 14 days ago and no rubric has been submitted.",
};

interface Props {
  flag: CandidateFlag;
  onResolve?: (flagId: string) => void;
  readOnly?: boolean;
}

export function FlagBadge({ flag, onResolve, readOnly = false }: Props) {
  const toneClass =
    flag.severity === "notable"
      ? "border-rose-500/40 bg-rose-500/5"
      : "border-amber-500/40 bg-amber-500/5";
  const pillClass =
    flag.severity === "notable"
      ? "bg-rose-500/15 text-rose-400"
      : "bg-amber-500/15 text-amber-400";
  const label = FLAG_LABELS[flag.flag_type];
  const description = FLAG_DESCRIPTIONS[flag.flag_type];
  const detectedDate = new Date(flag.detected_at).toLocaleDateString();

  return (
    <div className={`rounded-md border-2 ${toneClass} p-3 text-xs`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${pillClass}`}>
              {flag.severity}
            </span>
            <span className="font-medium text-lift-text">{label}</span>
          </div>
          <p className="mt-1.5 leading-relaxed text-muted">{description}</p>
          <p className="mt-1 text-[10px] text-muted">Detected {detectedDate}</p>
        </div>
        {!readOnly && onResolve && (
          <button
            onClick={() => onResolve(flag.id)}
            className="shrink-0 rounded border border-lift-border bg-surface px-2 py-1 text-[10px] font-medium text-muted hover:border-primary/50 hover:text-primary"
          >
            Resolve
          </button>
        )}
      </div>
      {flag.computed_from && Object.keys(flag.computed_from).length > 0 && (
        <details className="mt-2">
          <summary className="cursor-pointer text-[10px] uppercase tracking-wide text-muted">
            Observation evidence
          </summary>
          <pre className="mt-1 overflow-x-auto rounded bg-page-bg/50 p-2 text-[10px] text-muted">
            {JSON.stringify(flag.computed_from, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}

export { FLAG_LABELS, FLAG_DESCRIPTIONS };
