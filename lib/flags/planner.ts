// Pure planner: given a CandidateSnapshot + the candidate's existing flag
// rows (active + snoozed-resolved), decide which DB operations to perform.
// Exposed separately so the 28 determinism tests can exercise every
// raise / escalate / refresh / resolve / re-raise path without DB mocking.

import { evaluateAllFlags } from "./catalog";
import {
  severityRank,
  type CandidateFlag,
  type CandidateSnapshot,
  type FlagAction,
  type FlagRaise,
  type FlagType,
} from "./types";

export interface PlannerInputs {
  snapshot: CandidateSnapshot;
  activeFlags: CandidateFlag[];        // resolved_at IS NULL
  snoozedFlags: CandidateFlag[];        // resolved_at NOT NULL, snooze_until > now
}

export function planFlagActions(inputs: PlannerInputs): FlagAction[] {
  const { snapshot, activeFlags, snoozedFlags } = inputs;
  const raisesByType = new Map<FlagType, FlagRaise>();
  for (const raise of evaluateAllFlags(snapshot)) {
    raisesByType.set(raise.flag_type, raise);
  }

  const activeByType = new Map<FlagType, CandidateFlag>();
  for (const f of activeFlags) activeByType.set(f.flag_type, f);

  const snoozedByType = new Map<FlagType, CandidateFlag>();
  for (const f of snoozedFlags) snoozedByType.set(f.flag_type, f);

  const actions: FlagAction[] = [];

  // Union of all flag types we need to reason about: anything currently
  // raised OR currently active (might need auto-resolve).
  const typesToConsider = new Set<FlagType>([
    ...Array.from(raisesByType.keys()),
    ...Array.from(activeByType.keys()),
  ]);

  for (const flagType of Array.from(typesToConsider)) {
    const raise = raisesByType.get(flagType) ?? null;
    const active = activeByType.get(flagType) ?? null;
    const snoozed = snoozedByType.get(flagType) ?? null;

    if (!raise && active) {
      // Condition cleared + flag is active → auto-resolve
      actions.push({
        kind: "auto_resolve",
        existing_id: active.id,
        reason: "auto_condition_cleared",
      });
      continue;
    }

    if (!raise) continue; // condition didn't hold and no active flag — no-op

    // Condition holds (raise is non-null)

    if (active) {
      const isEscalation =
        severityRank(raise.severity) > severityRank(active.severity);
      actions.push({
        kind: "update",
        existing_id: active.id,
        raise,
        is_escalation: isEscalation,
      });
      continue;
    }

    // No active flag — check snooze
    if (snoozed) {
      const snoozeStillEffective =
        snoozed.snooze_until !== null &&
        new Date(snoozed.snooze_until).getTime() > new Date(snapshot.now).getTime();
      const severityEscalated =
        severityRank(raise.severity) > severityRank(snoozed.severity);

      if (snoozeStillEffective && !severityEscalated) {
        // Snooze in effect AND severity not escalated → respect snooze, no-op
        continue;
      }
      // Snooze expired OR severity escalated → insert a fresh active row.
      // (Historical snoozed row stays as-is for audit trail.)
      actions.push({ kind: "insert", raise });
      continue;
    }

    // No active, no snoozed → simple insert
    actions.push({ kind: "insert", raise });
  }

  return actions;
}
