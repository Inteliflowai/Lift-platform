// Manual and auto-resolution helpers for enrollment readiness flags.
//
// Manual resolve: admin acknowledges a flag with a reason + optional snooze
// override (1-90 days, default 30). Flag becomes inactive; re-raises if the
// underlying condition persists past snooze window OR if severity escalates
// (handled by the evaluator's planner, not here).
//
// Auto-resolve on CORE handoff: when a candidate is handed off to CORE,
// any active consent_not_captured flag is resolved with resolution_type
// "auto_core_handoff".

import { supabaseAdmin } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/lib/audit";

const DEFAULT_SNOOZE_DAYS = 30;
const MIN_SNOOZE_DAYS = 1;
const MAX_SNOOZE_DAYS = 90;

export function clampSnoozeDays(raw: unknown): number {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return DEFAULT_SNOOZE_DAYS;
  return Math.max(MIN_SNOOZE_DAYS, Math.min(MAX_SNOOZE_DAYS, Math.floor(n)));
}

export interface ManualResolveInput {
  flagId: string;
  resolvedBy: string;
  resolvedReason: string;
  snoozeDays?: number;
}

export async function resolveFlagManually(input: ManualResolveInput): Promise<boolean> {
  const { flagId, resolvedBy, resolvedReason } = input;
  const snoozeDays = clampSnoozeDays(input.snoozeDays ?? DEFAULT_SNOOZE_DAYS);
  const nowIso = new Date().toISOString();
  const snoozeUntilIso = new Date(
    Date.now() + snoozeDays * 24 * 60 * 60 * 1000,
  ).toISOString();

  const { data: flag } = await supabaseAdmin
    .from("candidate_flags")
    .select("id, tenant_id, candidate_id, flag_type, severity, resolved_at")
    .eq("id", flagId)
    .single();
  if (!flag) return false;
  if (flag.resolved_at) {
    // Already resolved; no-op (keeps the helper idempotent)
    return false;
  }

  await supabaseAdmin
    .from("candidate_flags")
    .update({
      resolved_at: nowIso,
      resolved_by: resolvedBy,
      resolved_reason: resolvedReason,
      resolution_type: "manual",
      snooze_until: snoozeUntilIso,
    })
    .eq("id", flagId);

  await writeAuditLog(supabaseAdmin, {
    tenant_id: flag.tenant_id,
    actor_id: resolvedBy,
    candidate_id: flag.candidate_id,
    action: "enrollment_readiness_flag.resolved",
    payload: {
      flag_id: flagId,
      flag_type: flag.flag_type,
      severity: flag.severity,
      resolution_type: "manual",
      resolved_reason: resolvedReason,
      snooze_days: snoozeDays,
      snooze_until: snoozeUntilIso,
    },
  });

  return true;
}

// Called from /api/integrations/core-handoff after successful handoff.
// Resolves any active consent_not_captured flag for the candidate.
export async function autoResolveOnCoreHandoff(candidateId: string): Promise<number> {
  const { data: activeFlags } = await supabaseAdmin
    .from("candidate_flags")
    .select("id, tenant_id")
    .eq("candidate_id", candidateId)
    .eq("flag_type", "consent_not_captured")
    .is("resolved_at", null);

  if (!activeFlags || activeFlags.length === 0) return 0;

  const nowIso = new Date().toISOString();
  let resolvedCount = 0;

  for (const flag of activeFlags) {
    await supabaseAdmin
      .from("candidate_flags")
      .update({
        resolved_at: nowIso,
        resolution_type: "auto_core_handoff",
        resolved_reason: "auto:core_handoff_completed",
      })
      .eq("id", flag.id);

    await writeAuditLog(supabaseAdmin, {
      tenant_id: flag.tenant_id,
      actor_id: null,
      candidate_id: candidateId,
      action: "enrollment_readiness_flag.auto_resolved",
      payload: {
        flag_id: flag.id,
        resolution_type: "auto_core_handoff",
        resolved_reason: "auto:core_handoff_completed",
      },
    });
    resolvedCount++;
  }

  return resolvedCount;
}
