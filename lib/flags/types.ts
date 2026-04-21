// Enrollment Readiness Flags — shared types.
//
// DISCIPLINE: observation vocabulary only. Flags are RAISED when a condition
// holds. They are never "predicted," "indicated," or "forecast." See
// docs/enrollment-readiness-flags.md for the product-facing specification.

export type FlagType =
  | "consent_not_captured"
  | "invite_expired_unopened"
  | "assessment_abandoned"
  | "low_completion"
  | "late_cycle_admit"
  | "post_admit_silence"
  | "interviewer_unresponsive";

export type FlagSeverity = "advisory" | "notable";

export type ResolutionType =
  | "manual"
  | "auto_core_handoff"
  | "auto_condition_cleared";

export interface CandidateFlag {
  id: string;
  tenant_id: string;
  candidate_id: string;
  flag_type: FlagType;
  severity: FlagSeverity;
  computed_from: Record<string, unknown>;
  detected_at: string;
  last_observed_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
  resolved_reason: string | null;
  resolution_type: ResolutionType | null;
  snooze_until: string | null;
}

// Snapshot of a candidate's observable state at evaluation time.
// All timestamps are ISO strings; the evaluator injects `now` for testability.
export interface CandidateSnapshot {
  candidate_id: string;
  tenant_id: string;
  status: string;
  cycle_id: string | null;
  cycle_closes_at: string | null;
  latest_invite: {
    id: string;
    sent_at: string | null;
    expires_at: string | null;
    opened_at: string | null;
    status: string;
  } | null;
  consent_events: Array<{ consent_type: string; consented_at: string }>;
  latest_session: {
    id: string;
    status: string;
    completion_pct: number | null;
    last_activity_at: string | null;
    completed_at: string | null;
  } | null;
  latest_final_rec: {
    decision: string;
    decided_at: string;
  } | null;
  interviewer_assignment: {
    id: string;
    assigned_to: string;
    created_at: string;
  } | null;
  has_interview_rubric: boolean;
  // Activity signals used by post_admit_silence
  most_recent_activity_at: string | null;
  post_admit_silence_days: number;
  now: string;
}

// What a catalog function returns when it fires.
export interface FlagRaise {
  flag_type: FlagType;
  severity: FlagSeverity;
  computed_from: Record<string, unknown>;
}

// What the planner emits — the DB operations the evaluator should perform.
export type FlagAction =
  | { kind: "insert"; raise: FlagRaise }
  | {
      kind: "update";
      existing_id: string;
      raise: FlagRaise;
      is_escalation: boolean;
    }
  | {
      kind: "auto_resolve";
      existing_id: string;
      reason: "auto_condition_cleared";
    };

// Hardcoded for Stage 4. If pilot schools surface different consent
// vocabularies, this becomes a tenant-configurable list in year two.
// See docs/enrollment-readiness-flags.md for the consent_not_captured entry.
export const EXPECTED_CONSENT_TYPES: readonly string[] = [
  "student_consent",
  "guardian_consent",
];

// Flag-type severity rank — used by the planner for escalation detection.
export function severityRank(s: FlagSeverity): number {
  return s === "notable" ? 2 : 1;
}

// Statuses that make a candidate eligible for flag evaluation. Pre-completion
// statuses (invited / consent_pending / active) are intentionally excluded —
// flags for them would be noise during the assessment phase.
export const ELIGIBLE_CANDIDATE_STATUSES: readonly string[] = [
  "completed",
  "flagged",
  "reviewed",
  "admitted",
  "waitlisted",
  "offered",
];
