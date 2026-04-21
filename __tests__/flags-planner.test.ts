import { describe, it, expect } from "vitest";
import { planFlagActions } from "@/lib/flags/planner";
import type { CandidateFlag, CandidateSnapshot, FlagType } from "@/lib/flags/types";

const NOW = "2026-04-21T12:00:00Z";
const ts = (daysAgo: number) =>
  new Date(new Date(NOW).getTime() - daysAgo * 86_400_000).toISOString();
const futureTs = (daysAhead: number) =>
  new Date(new Date(NOW).getTime() + daysAhead * 86_400_000).toISOString();

function snapshot(overrides: Partial<CandidateSnapshot> = {}): CandidateSnapshot {
  return {
    candidate_id: "cand-1",
    tenant_id: "tenant-1",
    status: "reviewed",
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

function active(flag_type: FlagType, severity: "advisory" | "notable" = "notable"): CandidateFlag {
  return {
    id: `active-${flag_type}`, tenant_id: "tenant-1", candidate_id: "cand-1",
    flag_type, severity, computed_from: {},
    detected_at: ts(2), last_observed_at: ts(1),
    resolved_at: null, resolved_by: null, resolved_reason: null, resolution_type: null,
    snooze_until: null,
  };
}

function snoozed(flag_type: FlagType, severity: "advisory" | "notable", snoozeDaysOut: number): CandidateFlag {
  return {
    ...active(flag_type, severity),
    id: `snoozed-${flag_type}`,
    resolved_at: ts(5), resolved_by: "admin-1", resolved_reason: "handled",
    resolution_type: "manual", snooze_until: futureTs(snoozeDaysOut),
  };
}

describe("planFlagActions — edge cases", () => {
  it("empty inputs → no actions", () => {
    const actions = planFlagActions({
      snapshot: snapshot(),
      activeFlags: [],
      snoozedFlags: [],
    });
    expect(actions).toEqual([]);
  });

  it("multiple flag types fire simultaneously → multiple inserts", () => {
    const snap = snapshot({
      latest_invite: { id: "inv-1", sent_at: ts(20), expires_at: ts(5), opened_at: null, status: "pending" },
      latest_session: { id: "sess-1", status: "completed", completion_pct: 50, last_activity_at: ts(1), completed_at: ts(1) },
    });
    const actions = planFlagActions({ snapshot: snap, activeFlags: [], snoozedFlags: [] });
    const types = actions.map((a) => (a.kind === "insert" ? a.raise.flag_type : null));
    expect(types).toContain("invite_expired_unopened");
    expect(types).toContain("low_completion");
  });

  it("severity stable → update with is_escalation=false", () => {
    const snap = snapshot({
      latest_invite: { id: "inv-1", sent_at: ts(20), expires_at: ts(5), opened_at: null, status: "pending" },
    });
    const actions = planFlagActions({
      snapshot: snap,
      activeFlags: [active("invite_expired_unopened", "notable")],
      snoozedFlags: [],
    });
    expect(actions).toHaveLength(1);
    expect(actions[0]).toMatchObject({ kind: "update", is_escalation: false });
  });

  it("severity escalation → update with is_escalation=true", () => {
    // consent_not_captured: advisory ≤7d, notable >7d. Active at advisory, now 10 days past admit.
    const snap = snapshot({
      status: "admitted",
      latest_final_rec: { decision: "admit", decided_at: ts(10) },
      consent_events: [], // missing both consents
    });
    const actions = planFlagActions({
      snapshot: snap,
      activeFlags: [active("consent_not_captured", "advisory")],
      snoozedFlags: [],
    });
    expect(actions).toHaveLength(1);
    expect(actions[0]).toMatchObject({ kind: "update", is_escalation: true });
  });

  it("snooze expired + condition persists → insert (fresh row)", () => {
    const snap = snapshot({
      latest_invite: { id: "inv-1", sent_at: ts(20), expires_at: ts(5), opened_at: null, status: "pending" },
      now: futureTs(30), // push now past the snoozed flag's snooze_until
    });
    const actions = planFlagActions({
      snapshot: snap,
      activeFlags: [],
      snoozedFlags: [snoozed("invite_expired_unopened", "notable", 25)],
    });
    expect(actions).toHaveLength(1);
    expect(actions[0].kind).toBe("insert");
  });

  it("snooze active AND severity escalated → insert (bypasses snooze)", () => {
    const snap = snapshot({
      status: "admitted",
      latest_final_rec: { decision: "admit", decided_at: ts(10) }, // notable
      consent_events: [],
    });
    const actions = planFlagActions({
      snapshot: snap,
      activeFlags: [],
      snoozedFlags: [snoozed("consent_not_captured", "advisory", 25)], // advisory, snoozed
    });
    expect(actions[0].kind).toBe("insert");
  });

  it("condition cleared AND flag only snoozed (not active) → no action", () => {
    // Nothing to auto-resolve; snoozed row stays as-is for audit history.
    const actions = planFlagActions({
      snapshot: snapshot(), // no invite, no session
      activeFlags: [],
      snoozedFlags: [snoozed("invite_expired_unopened", "notable", 25)],
    });
    expect(actions).toEqual([]);
  });

  it("multiple active flags, some resolve and some persist", () => {
    const snap = snapshot({
      // invite now opened → invite_expired_unopened clears
      latest_invite: { id: "inv-1", sent_at: ts(20), expires_at: ts(5), opened_at: ts(2), status: "opened" },
      // low_completion raises
      latest_session: { id: "sess-1", status: "completed", completion_pct: 50, last_activity_at: ts(1), completed_at: ts(1) },
    });
    const actions = planFlagActions({
      snapshot: snap,
      activeFlags: [active("invite_expired_unopened", "notable")],
      snoozedFlags: [],
    });
    const resolveAction = actions.find((a) => a.kind === "auto_resolve");
    const insertAction = actions.find((a) => a.kind === "insert");
    expect(resolveAction).toBeDefined();
    expect(insertAction).toBeDefined();
  });

  it("raise payload flows through into update/insert actions", () => {
    const snap = snapshot({
      latest_invite: { id: "inv-xyz", sent_at: ts(20), expires_at: ts(5), opened_at: null, status: "pending" },
    });
    const actions = planFlagActions({ snapshot: snap, activeFlags: [], snoozedFlags: [] });
    const insert = actions.find((a) => a.kind === "insert" && a.raise.flag_type === "invite_expired_unopened");
    expect(insert).toBeDefined();
    if (insert?.kind === "insert") {
      expect(insert.raise.computed_from.invite_id).toBe("inv-xyz");
    }
  });

  it("cross-flag independence — one flag's state doesn't affect another's plan", () => {
    const snap = snapshot({
      latest_invite: { id: "inv-1", sent_at: ts(20), expires_at: ts(5), opened_at: null, status: "pending" },
    });
    const actions = planFlagActions({
      snapshot: snap,
      // only interviewer_unresponsive is active — shouldn't block invite_expired_unopened insert
      activeFlags: [active("interviewer_unresponsive", "advisory")],
      snoozedFlags: [],
    });
    const insertTypes = actions.filter((a) => a.kind === "insert").map((a) => a.kind === "insert" ? a.raise.flag_type : null);
    expect(insertTypes).toContain("invite_expired_unopened");
  });

  it("auto_resolve emitted when condition cleared regardless of severity", () => {
    // Active flag at advisory, condition cleared → still auto_resolve
    const actions = planFlagActions({
      snapshot: snapshot({
        latest_session: { id: "s", status: "completed", completion_pct: 90, last_activity_at: ts(1), completed_at: ts(1) },
      }),
      activeFlags: [active("low_completion", "advisory")],
      snoozedFlags: [],
    });
    const resolve = actions.find((a) => a.kind === "auto_resolve");
    expect(resolve).toBeDefined();
  });
});
