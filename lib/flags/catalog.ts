// Enrollment Readiness Flag Catalog — the 7 observational flag definitions.
//
// Each function is pure: given a CandidateSnapshot, return FlagRaise | null.
// The functions observe state. They do not predict outcomes. See
// docs/enrollment-readiness-flags.md for the product-facing spec of each.
//
// Every `computed_from` payload captures the evidence that made the flag
// raise at detection time — for forensic recoverability a year later ("why
// was this flag raised?") and for year-two ML validation (training data
// that ties observational conditions to eventual outcomes).

import {
  EXPECTED_CONSENT_TYPES,
  type CandidateSnapshot,
  type FlagRaise,
} from "./types";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function daysBetween(a: string, b: string): number {
  return Math.floor((new Date(b).getTime() - new Date(a).getTime()) / MS_PER_DAY);
}

// Decision values that signal an admit-side state (per final_recommendations
// check constraint: 'admit','waitlist','decline','defer'). These three flag
// functions derive admit-state from final_recommendations.decision rather
// than candidate.status because the candidates table's status check
// constraint doesn't include admit-like values — using status here would
// mean the flags could never fire. See project_flag_schema_inconsistency.md.
const ADMIT_LIKE_DECISIONS = new Set(["admit", "waitlist"]);

// ---- 1. consent_not_captured ---------------------------------------------
// Raised when candidate has an admit or waitlist final_recommendation but
// we haven't observed both expected consent types in consent_events.
// Severity: notable if >7 days since admit, advisory if ≤7 days.
export function consentNotCaptured(s: CandidateSnapshot): FlagRaise | null {
  if (!s.latest_final_rec) return null;
  if (!ADMIT_LIKE_DECISIONS.has(s.latest_final_rec.decision)) return null;
  const foundTypes = new Set(s.consent_events.map((e) => e.consent_type));
  const missingTypes = EXPECTED_CONSENT_TYPES.filter((t) => !foundTypes.has(t));
  if (missingTypes.length === 0) return null;

  const daysSinceAdmit = daysBetween(s.latest_final_rec.decided_at, s.now);
  const severity = daysSinceAdmit > 7 ? "notable" : "advisory";
  return {
    flag_type: "consent_not_captured",
    severity,
    computed_from: {
      expected_consent_types: Array.from(EXPECTED_CONSENT_TYPES),
      found_consent_types: Array.from(foundTypes),
      missing_consent_types: missingTypes,
      days_since_admit: daysSinceAdmit,
      admit_decided_at: s.latest_final_rec.decided_at,
    },
  };
}

// ---- 2. invite_expired_unopened ------------------------------------------
// Raised when the latest invite's expires_at is in the past and it was
// never opened. Severity: always notable.
export function inviteExpiredUnopened(s: CandidateSnapshot): FlagRaise | null {
  const invite = s.latest_invite;
  if (!invite) return null;
  if (!invite.expires_at) return null;
  if (invite.opened_at) return null;
  if (new Date(invite.expires_at) >= new Date(s.now)) return null;
  return {
    flag_type: "invite_expired_unopened",
    severity: "notable",
    computed_from: {
      invite_id: invite.id,
      sent_at: invite.sent_at,
      expires_at: invite.expires_at,
      opened_at_was_null: true,
      status: invite.status,
    },
  };
}

// ---- 3. assessment_abandoned ---------------------------------------------
// Raised when the latest session is explicitly abandoned OR has been
// inactive for >7 days in a non-completed status. Severity: always notable.
export function assessmentAbandoned(s: CandidateSnapshot): FlagRaise | null {
  const session = s.latest_session;
  if (!session) return null;
  if (session.status === "completed") return null;

  if (session.status === "abandoned") {
    return {
      flag_type: "assessment_abandoned",
      severity: "notable",
      computed_from: {
        session_id: session.id,
        status: session.status,
        completion_pct: session.completion_pct,
        last_activity_at: session.last_activity_at,
        days_since_activity: session.last_activity_at
          ? daysBetween(session.last_activity_at, s.now)
          : null,
      },
    };
  }

  if (!session.last_activity_at) return null;
  const daysSince = daysBetween(session.last_activity_at, s.now);
  if (daysSince <= 7) return null;
  return {
    flag_type: "assessment_abandoned",
    severity: "notable",
    computed_from: {
      session_id: session.id,
      status: session.status,
      completion_pct: session.completion_pct,
      last_activity_at: session.last_activity_at,
      days_since_activity: daysSince,
    },
  };
}

// ---- 4. low_completion ---------------------------------------------------
// Raised when candidate completed the assessment but completion_pct < 75.
// Severity: always advisory.
export function lowCompletion(s: CandidateSnapshot): FlagRaise | null {
  const session = s.latest_session;
  if (!session) return null;
  if (session.status !== "completed") return null;
  if (session.completion_pct === null) return null;
  if (session.completion_pct >= 75) return null;
  return {
    flag_type: "low_completion",
    severity: "advisory",
    computed_from: {
      session_id: session.id,
      completion_pct: session.completion_pct,
      completed_at: session.completed_at,
    },
  };
}

// ---- 5. late_cycle_admit -------------------------------------------------
// Raised when the admit/waitlist decision was made within 7 days of the
// cycle's close date. Severity: always advisory.
export function lateCycleAdmit(s: CandidateSnapshot): FlagRaise | null {
  if (!s.latest_final_rec) return null;
  if (!s.cycle_closes_at) return null;
  const decision = s.latest_final_rec.decision;
  if (decision !== "admit" && decision !== "waitlist") return null;

  const decidedAt = new Date(s.latest_final_rec.decided_at).getTime();
  const closesAt = new Date(s.cycle_closes_at).getTime();
  const daysBeforeClose = Math.floor((closesAt - decidedAt) / MS_PER_DAY);
  if (daysBeforeClose > 7) return null;
  if (daysBeforeClose < 0) return null; // decided after close is its own story

  return {
    flag_type: "late_cycle_admit",
    severity: "advisory",
    computed_from: {
      decided_at: s.latest_final_rec.decided_at,
      cycle_closes_at: s.cycle_closes_at,
      days_before_close: daysBeforeClose,
      decision,
    },
  };
}

// ---- 6. post_admit_silence -----------------------------------------------
// Raised when candidate has an admit final_recommendation and we've
// observed no activity for more than `post_admit_silence_days` days.
// Activity counts:
//   - consent_events
//   - invites.opened_at updates
//   - candidate_status_history rows
//   - candidate_assignments rows (school-side activity)
//   - application_data updates
// Captured as `most_recent_activity_at` on the snapshot (caller computes).
// Uses latest_final_rec.decision rather than candidate.status — the status
// constraint doesn't allow 'admitted'. See consentNotCaptured note.
export function postAdmitSilence(s: CandidateSnapshot): FlagRaise | null {
  if (!s.latest_final_rec) return null;
  if (s.latest_final_rec.decision !== "admit") return null;
  const admitDate = s.latest_final_rec.decided_at;
  const daysSinceAdmit = daysBetween(admitDate, s.now);
  if (daysSinceAdmit <= s.post_admit_silence_days) return null;

  const mostRecent = s.most_recent_activity_at ?? admitDate;
  const silenceDays = daysBetween(mostRecent, s.now);
  if (silenceDays <= s.post_admit_silence_days) return null;

  return {
    flag_type: "post_admit_silence",
    severity: "notable",
    computed_from: {
      admit_date: admitDate,
      most_recent_activity_at: s.most_recent_activity_at,
      silence_days: silenceDays,
      threshold_days: s.post_admit_silence_days,
    },
  };
}

// ---- 7. interviewer_unresponsive -----------------------------------------
// Raised when an interviewer assignment exists, no rubric has been
// submitted, and the assignment is older than 14 days. Severity: advisory.
export function interviewerUnresponsive(s: CandidateSnapshot): FlagRaise | null {
  const assignment = s.interviewer_assignment;
  if (!assignment) return null;
  if (s.has_interview_rubric) return null;
  const daysSinceAssignment = daysBetween(assignment.created_at, s.now);
  if (daysSinceAssignment <= 14) return null;
  return {
    flag_type: "interviewer_unresponsive",
    severity: "advisory",
    computed_from: {
      assignment_id: assignment.id,
      assigned_to: assignment.assigned_to,
      assigned_at: assignment.created_at,
      days_since_assignment: daysSinceAssignment,
    },
  };
}

// ---- Public catalog registry ----------------------------------------------

export const FLAG_CATALOG = [
  { type: "consent_not_captured" as const, fn: consentNotCaptured },
  { type: "invite_expired_unopened" as const, fn: inviteExpiredUnopened },
  { type: "assessment_abandoned" as const, fn: assessmentAbandoned },
  { type: "low_completion" as const, fn: lowCompletion },
  { type: "late_cycle_admit" as const, fn: lateCycleAdmit },
  { type: "post_admit_silence" as const, fn: postAdmitSilence },
  { type: "interviewer_unresponsive" as const, fn: interviewerUnresponsive },
];

export function evaluateAllFlags(s: CandidateSnapshot): FlagRaise[] {
  return FLAG_CATALOG
    .map(({ fn }) => fn(s))
    .filter((r): r is FlagRaise => r !== null);
}
