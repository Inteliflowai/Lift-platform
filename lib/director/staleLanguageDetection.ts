// "Stale" in this module means: the cached defensible language predates the
// tenant's current mission_statement (i.e., school has updated its mission
// since language was generated, and the cached rationale no longer reflects
// it). Also captures candidates with completed assessments but no cache at
// all. Pipeline-driven signal drift is handled separately via the L2 check
// in defensibleLanguagePersist.ts.
//
// Pure-ish module — hits Supabase via supabaseAdmin but has no side effects.

import { supabaseAdmin } from "@/lib/supabase/admin";
import { classifyStaleness, type StalenessReason } from "./staleLanguagePredicate";

export { classifyStaleness };

export interface StaleCandidate {
  id: string;
  tenant_id: string;
  first_name: string | null;
  last_name: string | null;
  grade_applying_to: string | null;
  status: string | null;
  cycle_id: string | null;
  defensible_language_updated_at: string | null;
  has_completed_assessment: boolean;
  staleness_reason: StalenessReason;
}

export interface FindStaleOptions {
  cycleId?: string | null;
  limit?: number;
}

// Completed-assessment statuses — candidates in these states should have
// defensible language. Anything earlier (invited, consent_pending, active)
// is not yet eligible for generation.
const ELIGIBLE_STATUSES = [
  "completed",
  "flagged",
  "reviewed",
  "admitted",
  "waitlisted",
  "offered",
];

export async function findStaleLanguageCandidates(
  tenantId: string,
  options: FindStaleOptions = {},
): Promise<StaleCandidate[]> {
  const { cycleId, limit = 200 } = options;

  const { data: settings } = await supabaseAdmin
    .from("tenant_settings")
    .select("mission_statement_updated_at, mission_statement")
    .eq("tenant_id", tenantId)
    .maybeSingle();

  // If the tenant has never set a mission statement, nothing is stale — we
  // don't nag schools who haven't engaged with the feature.
  const missionTs = settings?.mission_statement_updated_at ?? null;

  let query = supabaseAdmin
    .from("candidates")
    .select(
      "id, tenant_id, first_name, last_name, grade_applying_to, status, cycle_id, defensible_language_updated_at, defensible_language_cache",
    )
    .eq("tenant_id", tenantId)
    .in("status", ELIGIBLE_STATUSES)
    .limit(limit);

  if (cycleId) {
    query = query.eq("cycle_id", cycleId);
  }

  const { data: candidates } = await query;
  if (!candidates) return [];

  const stale: StaleCandidate[] = [];

  for (const c of candidates) {
    const cache = (c.defensible_language_cache ?? {}) as Record<string, unknown>;
    const hasCache = !!(cache.admit || cache.waitlist || cache.decline);
    const updatedAt = c.defensible_language_updated_at;

    const reason = classifyStaleness({
      hasCache,
      languageUpdatedAt: updatedAt,
      missionUpdatedAt: missionTs,
    });

    if (reason) {
      stale.push({
        id: c.id,
        tenant_id: c.tenant_id,
        first_name: c.first_name,
        last_name: c.last_name,
        grade_applying_to: c.grade_applying_to,
        status: c.status,
        cycle_id: c.cycle_id,
        defensible_language_updated_at: updatedAt,
        has_completed_assessment: true, // filtered by ELIGIBLE_STATUSES above
        staleness_reason: reason,
      });
    }
  }

  return stale;
}
