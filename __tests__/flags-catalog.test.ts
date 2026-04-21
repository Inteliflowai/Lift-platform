import { describe, it, expect } from "vitest";
import {
  consentNotCaptured,
  inviteExpiredUnopened,
  assessmentAbandoned,
  lowCompletion,
  lateCycleAdmit,
  postAdmitSilence,
  interviewerUnresponsive,
} from "@/lib/flags/catalog";
import { planFlagActions } from "@/lib/flags/planner";
import type {
  CandidateFlag,
  CandidateSnapshot,
  FlagType,
} from "@/lib/flags/types";

// Deterministic "now" used across all scenarios
const NOW = "2026-04-21T12:00:00Z";

function ts(daysAgo: number): string {
  return new Date(new Date(NOW).getTime() - daysAgo * 86_400_000).toISOString();
}
function futureTs(daysAhead: number): string {
  return new Date(new Date(NOW).getTime() + daysAhead * 86_400_000).toISOString();
}

// Baseline snapshot has full consent and recent activity so OTHER flags
// don't cross-contaminate tests targeting a specific flag. Tests targeting
// consent_not_captured / post_admit_silence override these fields.
function baseSnapshot(overrides: Partial<CandidateSnapshot> = {}): CandidateSnapshot {
  return {
    candidate_id: "cand-1",
    tenant_id: "tenant-1",
    status: "reviewed", // not 'admitted' so admit-only flags don't fire by default
    cycle_id: "cycle-1",
    cycle_closes_at: futureTs(30),
    latest_invite: null,
    consent_events: [
      { consent_type: "student_consent", consented_at: ts(5) },
      { consent_type: "guardian_consent", consented_at: ts(5) },
    ],
    latest_session: null,
    latest_final_rec: null,
    interviewer_assignment: null,
    has_interview_rubric: false,
    most_recent_activity_at: ts(1),
    post_admit_silence_days: 14,
    now: NOW,
    ...overrides,
  };
}

function activeFlag(flag_type: FlagType, severity: "advisory" | "notable" = "notable"): CandidateFlag {
  return {
    id: `flag-${flag_type}`,
    tenant_id: "tenant-1",
    candidate_id: "cand-1",
    flag_type,
    severity,
    computed_from: {},
    detected_at: ts(3),
    last_observed_at: ts(1),
    resolved_at: null,
    resolved_by: null,
    resolved_reason: null,
    resolution_type: null,
    snooze_until: null,
  };
}

function snoozedFlag(
  flag_type: FlagType,
  severity: "advisory" | "notable",
  snoozeDaysOut: number,
): CandidateFlag {
  return {
    ...activeFlag(flag_type, severity),
    resolved_at: ts(5),
    resolved_by: "admin-1",
    resolved_reason: "Contacted family",
    resolution_type: "manual",
    snooze_until: futureTs(snoozeDaysOut),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// The 28 determinism tests: 7 flags × 4 scenarios each
// Scenarios per flag:
//   (1) RAISE — condition holds → catalog function returns FlagRaise
//   (2) RESOLVE-ON-CLEAR — condition cleared, active flag exists → planner auto_resolve
//   (3) SNOOZE-RESPECT — condition holds at same severity, snoozed → planner no-op
//   (4) ESCALATION-RE-RAISE — condition escalates while snoozed → planner insert
// ═══════════════════════════════════════════════════════════════════════════

describe("consent_not_captured — 4 scenarios", () => {
  const withAdmit = (daysAgo: number, consents: string[] = []) =>
    baseSnapshot({
      status: "admitted",
      latest_final_rec: { decision: "admit", decided_at: ts(daysAgo) },
      consent_events: consents.map((t) => ({ consent_type: t, consented_at: ts(daysAgo - 1) })),
    });

  it("(1) RAISE — notable when admit >7d and no consents", () => {
    const r = consentNotCaptured(withAdmit(10, []));
    expect(r?.severity).toBe("notable");
    expect(r?.computed_from.missing_consent_types).toEqual(["student_consent", "guardian_consent"]);
  });

  it("(1) RAISE — advisory when admit ≤7d and no consents", () => {
    const r = consentNotCaptured(withAdmit(3, []));
    expect(r?.severity).toBe("advisory");
  });

  it("(1) RAISE — null when both consents present", () => {
    const r = consentNotCaptured(withAdmit(10, ["student_consent", "guardian_consent"]));
    expect(r).toBeNull();
  });

  it("(2) RESOLVE-ON-CLEAR — planner emits auto_resolve when active flag exists but consents now captured", () => {
    const snap = withAdmit(10, ["student_consent", "guardian_consent"]);
    const actions = planFlagActions({
      snapshot: snap,
      activeFlags: [activeFlag("consent_not_captured", "notable")],
      snoozedFlags: [],
    });
    expect(actions).toHaveLength(1);
    expect(actions[0]).toMatchObject({ kind: "auto_resolve", reason: "auto_condition_cleared" });
  });

  it("(3) SNOOZE-RESPECT — planner no-ops when same-severity flag is snoozed and snooze not expired", () => {
    const snap = withAdmit(10, []); // notable
    const actions = planFlagActions({
      snapshot: snap,
      activeFlags: [],
      snoozedFlags: [snoozedFlag("consent_not_captured", "notable", 25)],
    });
    expect(actions).toHaveLength(0);
  });

  it("(4) ESCALATION-RE-RAISE — advisory→notable while snoozed triggers insert", () => {
    const snap = withAdmit(10, []); // now notable
    const actions = planFlagActions({
      snapshot: snap,
      activeFlags: [],
      snoozedFlags: [snoozedFlag("consent_not_captured", "advisory", 25)],
    });
    expect(actions).toHaveLength(1);
    expect(actions[0].kind).toBe("insert");
    if (actions[0].kind === "insert") {
      expect(actions[0].raise.severity).toBe("notable");
    }
  });
});

describe("invite_expired_unopened — 4 scenarios", () => {
  const withInvite = (expiresDaysAgo: number, opened: string | null, status = "pending") =>
    baseSnapshot({
      latest_invite: {
        id: "inv-1",
        sent_at: ts(10),
        expires_at: ts(expiresDaysAgo),
        opened_at: opened,
        status,
      },
    });

  it("(1) RAISE — notable when expired and never opened", () => {
    const r = inviteExpiredUnopened(withInvite(1, null));
    expect(r?.severity).toBe("notable");
  });

  it("(1) RAISE — null when opened", () => {
    const r = inviteExpiredUnopened(withInvite(1, ts(2)));
    expect(r).toBeNull();
  });

  it("(2) RESOLVE-ON-CLEAR — planner auto_resolves when invite has since been opened", () => {
    const snap = withInvite(1, ts(2));
    const actions = planFlagActions({
      snapshot: snap,
      activeFlags: [activeFlag("invite_expired_unopened", "notable")],
      snoozedFlags: [],
    });
    expect(actions[0].kind).toBe("auto_resolve");
  });

  it("(3) SNOOZE-RESPECT — snoozed at notable, still notable → no-op", () => {
    const actions = planFlagActions({
      snapshot: withInvite(1, null),
      activeFlags: [],
      snoozedFlags: [snoozedFlag("invite_expired_unopened", "notable", 25)],
    });
    expect(actions).toHaveLength(0);
  });

  it("(4) ESCALATION-RE-RAISE — no escalation path (this flag is always notable), snoozed+still-holds after snooze expired → insert", () => {
    // This flag has only one severity (notable). Escalation-by-severity
    // isn't possible; the equivalent case is snooze expiration.
    const actions = planFlagActions({
      snapshot: { ...withInvite(1, null), now: futureTs(30) }, // snooze is futureTs(25) from NOW = ts(-25) relative to future-now
      activeFlags: [],
      snoozedFlags: [snoozedFlag("invite_expired_unopened", "notable", 25)],
    });
    expect(actions[0].kind).toBe("insert");
  });
});

describe("assessment_abandoned — 4 scenarios", () => {
  const withSession = (status: string, lastActivityDaysAgo: number) =>
    baseSnapshot({
      latest_session: {
        id: "sess-1",
        status,
        completion_pct: 30,
        last_activity_at: ts(lastActivityDaysAgo),
        completed_at: null,
      },
    });

  it("(1) RAISE — notable when status is 'abandoned'", () => {
    const r = assessmentAbandoned(withSession("abandoned", 3));
    expect(r?.severity).toBe("notable");
  });

  it("(1) RAISE — notable when in_progress but inactive >7d", () => {
    const r = assessmentAbandoned(withSession("in_progress", 10));
    expect(r?.severity).toBe("notable");
  });

  it("(1) RAISE — null when in_progress but active recently", () => {
    expect(assessmentAbandoned(withSession("in_progress", 2))).toBeNull();
  });

  it("(1) RAISE — null when completed", () => {
    expect(assessmentAbandoned(withSession("completed", 10))).toBeNull();
  });

  it("(2) RESOLVE-ON-CLEAR — session now completed at high pct, active flag exists → auto_resolve", () => {
    // pct=80 to avoid cross-triggering low_completion
    const snap = baseSnapshot({
      latest_session: {
        id: "sess-1",
        status: "completed",
        completion_pct: 80,
        last_activity_at: ts(1),
        completed_at: ts(1),
      },
    });
    const actions = planFlagActions({
      snapshot: snap,
      activeFlags: [activeFlag("assessment_abandoned", "notable")],
      snoozedFlags: [],
    });
    expect(actions[0].kind).toBe("auto_resolve");
  });

  it("(3) SNOOZE-RESPECT — snoozed notable, still notable → no-op", () => {
    const actions = planFlagActions({
      snapshot: withSession("abandoned", 3),
      activeFlags: [],
      snoozedFlags: [snoozedFlag("assessment_abandoned", "notable", 25)],
    });
    expect(actions).toHaveLength(0);
  });

  it("(4) ESCALATION-RE-RAISE — flag only has 'notable'; snoozed after snooze expiry → insert", () => {
    const snap = { ...withSession("abandoned", 3), now: futureTs(30) };
    const actions = planFlagActions({
      snapshot: snap,
      activeFlags: [],
      snoozedFlags: [snoozedFlag("assessment_abandoned", "notable", 25)],
    });
    expect(actions[0].kind).toBe("insert");
  });
});

describe("low_completion — 4 scenarios", () => {
  const withCompleted = (pct: number) =>
    baseSnapshot({
      latest_session: {
        id: "sess-1",
        status: "completed",
        completion_pct: pct,
        last_activity_at: ts(1),
        completed_at: ts(1),
      },
    });

  it("(1) RAISE — advisory when completed with <75%", () => {
    const r = lowCompletion(withCompleted(60));
    expect(r?.severity).toBe("advisory");
  });

  it("(1) RAISE — null when ≥75%", () => {
    expect(lowCompletion(withCompleted(80))).toBeNull();
  });

  it("(2) RESOLVE-ON-CLEAR — pct updated to 80, active flag exists → auto_resolve", () => {
    const actions = planFlagActions({
      snapshot: withCompleted(80),
      activeFlags: [activeFlag("low_completion", "advisory")],
      snoozedFlags: [],
    });
    expect(actions[0].kind).toBe("auto_resolve");
  });

  it("(3) SNOOZE-RESPECT — snoozed advisory, still advisory → no-op", () => {
    const actions = planFlagActions({
      snapshot: withCompleted(60),
      activeFlags: [],
      snoozedFlags: [snoozedFlag("low_completion", "advisory", 25)],
    });
    expect(actions).toHaveLength(0);
  });

  it("(4) ESCALATION-RE-RAISE — only has 'advisory'; snoozed after expiry → insert", () => {
    const snap = { ...withCompleted(60), now: futureTs(30) };
    const actions = planFlagActions({
      snapshot: snap,
      activeFlags: [],
      snoozedFlags: [snoozedFlag("low_completion", "advisory", 25)],
    });
    expect(actions[0].kind).toBe("insert");
  });
});

describe("late_cycle_admit — 4 scenarios", () => {
  const withDecision = (decision: string, decidedDaysAgo: number, closesDaysAhead: number) =>
    baseSnapshot({
      cycle_closes_at: futureTs(closesDaysAhead),
      latest_final_rec: { decision, decided_at: ts(decidedDaysAgo) },
    });

  it("(1) RAISE — advisory when admit within 7d of close", () => {
    const r = lateCycleAdmit(withDecision("admit", 1, 5)); // 6 days before close
    expect(r?.severity).toBe("advisory");
  });

  it("(1) RAISE — null when admit well before close", () => {
    expect(lateCycleAdmit(withDecision("admit", 1, 30))).toBeNull();
  });

  it("(1) RAISE — null for decline decisions", () => {
    expect(lateCycleAdmit(withDecision("decline", 1, 5))).toBeNull();
  });

  it("(2) RESOLVE-ON-CLEAR — new cycle with far-future close, active flag exists → auto_resolve", () => {
    const actions = planFlagActions({
      snapshot: withDecision("admit", 1, 60),
      activeFlags: [activeFlag("late_cycle_admit", "advisory")],
      snoozedFlags: [],
    });
    expect(actions[0].kind).toBe("auto_resolve");
  });

  it("(3) SNOOZE-RESPECT — snoozed advisory, still advisory → no-op", () => {
    const actions = planFlagActions({
      snapshot: withDecision("admit", 1, 5),
      activeFlags: [],
      snoozedFlags: [snoozedFlag("late_cycle_admit", "advisory", 25)],
    });
    expect(actions).toHaveLength(0);
  });

  it("(4) ESCALATION-RE-RAISE — snoozed after expiry → insert", () => {
    const snap = { ...withDecision("admit", 1, 5), now: futureTs(30) };
    const actions = planFlagActions({
      snapshot: snap,
      activeFlags: [],
      snoozedFlags: [snoozedFlag("late_cycle_admit", "advisory", 25)],
    });
    expect(actions[0].kind).toBe("insert");
  });
});

describe("post_admit_silence — 4 scenarios", () => {
  const withSilence = (admitDaysAgo: number, lastActivityDaysAgo: number | null, thresholdDays = 14) =>
    baseSnapshot({
      status: "admitted",
      latest_final_rec: { decision: "admit", decided_at: ts(admitDaysAgo) },
      most_recent_activity_at: lastActivityDaysAgo !== null ? ts(lastActivityDaysAgo) : null,
      post_admit_silence_days: thresholdDays,
    });

  it("(1) RAISE — notable when admit >14d and no activity since", () => {
    const r = postAdmitSilence(withSilence(20, null));
    expect(r?.severity).toBe("notable");
  });

  it("(1) RAISE — null when admit <14d", () => {
    expect(postAdmitSilence(withSilence(7, null))).toBeNull();
  });

  it("(1) RAISE — null when recent activity exists", () => {
    expect(postAdmitSilence(withSilence(20, 3))).toBeNull();
  });

  it("(1) RAISE — respects tenant-configurable threshold", () => {
    // Threshold 7 days instead of 14
    const r = postAdmitSilence(withSilence(10, null, 7));
    expect(r?.severity).toBe("notable");
  });

  it("(2) RESOLVE-ON-CLEAR — recent activity now present, active flag exists → auto_resolve", () => {
    const actions = planFlagActions({
      snapshot: withSilence(20, 2),
      activeFlags: [activeFlag("post_admit_silence", "notable")],
      snoozedFlags: [],
    });
    expect(actions[0].kind).toBe("auto_resolve");
  });

  it("(3) SNOOZE-RESPECT — snoozed notable, still notable → no-op", () => {
    const actions = planFlagActions({
      snapshot: withSilence(20, null),
      activeFlags: [],
      snoozedFlags: [snoozedFlag("post_admit_silence", "notable", 25)],
    });
    expect(actions).toHaveLength(0);
  });

  it("(4) ESCALATION-RE-RAISE — snoozed after expiry → insert", () => {
    const snap = { ...withSilence(50, null), now: futureTs(30) };
    const actions = planFlagActions({
      snapshot: snap,
      activeFlags: [],
      snoozedFlags: [snoozedFlag("post_admit_silence", "notable", 25)],
    });
    expect(actions[0].kind).toBe("insert");
  });
});

describe("interviewer_unresponsive — 4 scenarios", () => {
  const withAssignment = (assignedDaysAgo: number, hasRubric: boolean) =>
    baseSnapshot({
      interviewer_assignment: {
        id: "assign-1",
        assigned_to: "interviewer-1",
        created_at: ts(assignedDaysAgo),
      },
      has_interview_rubric: hasRubric,
    });

  it("(1) RAISE — advisory when assignment >14d and no rubric", () => {
    const r = interviewerUnresponsive(withAssignment(20, false));
    expect(r?.severity).toBe("advisory");
  });

  it("(1) RAISE — null when rubric submitted", () => {
    expect(interviewerUnresponsive(withAssignment(20, true))).toBeNull();
  });

  it("(1) RAISE — null when assignment <14d", () => {
    expect(interviewerUnresponsive(withAssignment(7, false))).toBeNull();
  });

  it("(2) RESOLVE-ON-CLEAR — rubric now submitted, active flag exists → auto_resolve", () => {
    const actions = planFlagActions({
      snapshot: withAssignment(20, true),
      activeFlags: [activeFlag("interviewer_unresponsive", "advisory")],
      snoozedFlags: [],
    });
    expect(actions[0].kind).toBe("auto_resolve");
  });

  it("(3) SNOOZE-RESPECT — snoozed advisory, still advisory → no-op", () => {
    const actions = planFlagActions({
      snapshot: withAssignment(20, false),
      activeFlags: [],
      snoozedFlags: [snoozedFlag("interviewer_unresponsive", "advisory", 25)],
    });
    expect(actions).toHaveLength(0);
  });

  it("(4) ESCALATION-RE-RAISE — snoozed after expiry → insert", () => {
    const snap = { ...withAssignment(20, false), now: futureTs(30) };
    const actions = planFlagActions({
      snapshot: snap,
      activeFlags: [],
      snoozedFlags: [snoozedFlag("interviewer_unresponsive", "advisory", 25)],
    });
    expect(actions[0].kind).toBe("insert");
  });
});
