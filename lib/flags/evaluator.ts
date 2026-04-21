// Evaluator orchestrator — pulls snapshot, calls planner, applies DB ops.
//
// Audit is emitted on STATE-CHANGE EVENTS ONLY (raised, escalated, resolved,
// auto_resolved). The daily refresh that updates last_observed_at when a
// condition persists at the same severity is NOT audit-emitting — otherwise
// a long-lived advisory flag would flood audit_logs with daily noise.
// Forensic queries can reconstruct the full observation history from
// candidate_flags.last_observed_at plus the state-change audit rows.

import { supabaseAdmin } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/lib/audit";
import { buildCandidateSnapshot } from "./snapshot";
import { planFlagActions } from "./planner";
import {
  ELIGIBLE_CANDIDATE_STATUSES,
  type CandidateFlag,
  type FlagAction,
} from "./types";

export interface TenantEvaluationSummary {
  tenant_id: string;
  candidates_evaluated: number;
  flags_raised: number;
  flags_escalated: number;
  flags_auto_resolved: number;
  flags_refreshed: number; // state-stable, no audit emitted
  errors: number;
}

async function loadExistingFlags(candidateId: string, now: string) {
  const { data } = await supabaseAdmin
    .from("candidate_flags")
    .select("*")
    .eq("candidate_id", candidateId);
  const rows = (data ?? []) as CandidateFlag[];
  const active: CandidateFlag[] = [];
  const snoozed: CandidateFlag[] = [];
  for (const f of rows) {
    if (!f.resolved_at) {
      active.push(f);
    } else if (f.snooze_until && new Date(f.snooze_until).getTime() > new Date(now).getTime()) {
      snoozed.push(f);
    }
  }
  return { active, snoozed };
}

async function applyAction(
  action: FlagAction,
  candidateId: string,
  tenantId: string,
): Promise<"raised" | "escalated" | "auto_resolved" | "refreshed"> {
  if (action.kind === "insert") {
    const { data: inserted } = await supabaseAdmin
      .from("candidate_flags")
      .insert({
        tenant_id: tenantId,
        candidate_id: candidateId,
        flag_type: action.raise.flag_type,
        severity: action.raise.severity,
        computed_from: action.raise.computed_from,
      })
      .select("id")
      .single();
    await writeAuditLog(supabaseAdmin, {
      tenant_id: tenantId,
      actor_id: null,
      candidate_id: candidateId,
      action: "enrollment_readiness_flag.raised",
      payload: {
        flag_id: inserted?.id,
        flag_type: action.raise.flag_type,
        severity: action.raise.severity,
        computed_from: action.raise.computed_from,
      },
    });
    return "raised";
  }

  if (action.kind === "update") {
    const nowIso = new Date().toISOString();
    if (action.is_escalation) {
      // Escalation: severity + last_observed + clear any snooze, emit audit
      await supabaseAdmin
        .from("candidate_flags")
        .update({
          severity: action.raise.severity,
          computed_from: action.raise.computed_from,
          last_observed_at: nowIso,
          snooze_until: null,
        })
        .eq("id", action.existing_id);
      await writeAuditLog(supabaseAdmin, {
        tenant_id: tenantId,
        actor_id: null,
        candidate_id: candidateId,
        action: "enrollment_readiness_flag.escalated",
        payload: {
          flag_id: action.existing_id,
          flag_type: action.raise.flag_type,
          new_severity: action.raise.severity,
          computed_from: action.raise.computed_from,
        },
      });
      return "escalated";
    }
    // State-stable refresh: update last_observed_at + computed_from only.
    // NO audit — this would be daily noise on long-lived flags.
    await supabaseAdmin
      .from("candidate_flags")
      .update({
        computed_from: action.raise.computed_from,
        last_observed_at: nowIso,
      })
      .eq("id", action.existing_id);
    return "refreshed";
  }

  // auto_resolve
  const nowIso = new Date().toISOString();
  await supabaseAdmin
    .from("candidate_flags")
    .update({
      resolved_at: nowIso,
      resolution_type: "auto_condition_cleared",
      resolved_reason: "auto:observed condition cleared",
    })
    .eq("id", action.existing_id);
  await writeAuditLog(supabaseAdmin, {
    tenant_id: tenantId,
    actor_id: null,
    candidate_id: candidateId,
    action: "enrollment_readiness_flag.auto_resolved",
    payload: {
      flag_id: action.existing_id,
      resolution_type: "auto_condition_cleared",
    },
  });
  return "auto_resolved";
}

export async function evaluateCandidate(
  candidateId: string,
  now: string = new Date().toISOString(),
): Promise<{ raised: number; escalated: number; auto_resolved: number; refreshed: number }> {
  const snapshot = await buildCandidateSnapshot(candidateId, now);
  if (!snapshot) return { raised: 0, escalated: 0, auto_resolved: 0, refreshed: 0 };

  const { active, snoozed } = await loadExistingFlags(candidateId, now);
  const actions = planFlagActions({
    snapshot,
    activeFlags: active,
    snoozedFlags: snoozed,
  });

  const tally = { raised: 0, escalated: 0, auto_resolved: 0, refreshed: 0 };
  for (const action of actions) {
    try {
      const outcome = await applyAction(action, candidateId, snapshot.tenant_id);
      if (outcome === "raised") tally.raised++;
      else if (outcome === "escalated") tally.escalated++;
      else if (outcome === "auto_resolved") tally.auto_resolved++;
      else tally.refreshed++;
    } catch (err) {
      console.error(
        `[flags] applyAction failed for candidate ${candidateId} action ${action.kind}`,
        err,
      );
    }
  }
  return tally;
}

export async function evaluateTenant(
  tenantId: string,
  now: string = new Date().toISOString(),
): Promise<TenantEvaluationSummary> {
  const { data: candidates } = await supabaseAdmin
    .from("candidates")
    .select("id")
    .eq("tenant_id", tenantId)
    .in("status", [...ELIGIBLE_CANDIDATE_STATUSES]);

  const summary: TenantEvaluationSummary = {
    tenant_id: tenantId,
    candidates_evaluated: 0,
    flags_raised: 0,
    flags_escalated: 0,
    flags_auto_resolved: 0,
    flags_refreshed: 0,
    errors: 0,
  };

  for (const c of candidates ?? []) {
    try {
      const tally = await evaluateCandidate(c.id, now);
      summary.candidates_evaluated++;
      summary.flags_raised += tally.raised;
      summary.flags_escalated += tally.escalated;
      summary.flags_auto_resolved += tally.auto_resolved;
      summary.flags_refreshed += tally.refreshed;
    } catch (err) {
      summary.errors++;
      console.error(`[flags] evaluateCandidate failed for ${c.id}`, err);
    }
  }

  return summary;
}
