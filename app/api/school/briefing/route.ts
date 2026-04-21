export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { classifyStaleness } from "@/lib/director/staleLanguagePredicate";

const ELIGIBLE_STATUSES = [
  "completed", "flagged", "reviewed", "admitted", "waitlisted", "offered",
];
const ADMIN_ROLES = new Set(["platform_admin", "school_admin"]);

interface BriefingRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  grade_applying_to: string | null;
  status: string | null;
  tri_score: number | null;
  cycle_id: string | null;
  language_ready: boolean;
  language_is_stale: boolean;
  staleness_reason: "older_than_mission" | "missing_cache" | null;
  defensible_language_updated_at: string | null;
  fallback_used: boolean;
}

export async function GET(req: NextRequest) {
  const { tenantId, roles, isPlatformAdmin } = await getTenantContext();

  const canAccess =
    isPlatformAdmin ||
    roles.some((r) => r.tenant_id === tenantId && ADMIN_ROLES.has(r.role));
  if (!canAccess) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const cycleId = req.nextUrl.searchParams.get("cycle_id");
  const statusFilter = req.nextUrl.searchParams.get("status");

  const { data: settings } = await supabaseAdmin
    .from("tenant_settings")
    .select("mission_statement_updated_at")
    .eq("tenant_id", tenantId)
    .maybeSingle();
  const missionTs = settings?.mission_statement_updated_at ?? null;

  let query = supabaseAdmin
    .from("candidates")
    .select(
      "id, first_name, last_name, grade_applying_to, status, cycle_id, defensible_language_cache, defensible_language_updated_at",
    )
    .eq("tenant_id", tenantId)
    .in("status", statusFilter ? [statusFilter] : ELIGIBLE_STATUSES)
    .limit(300);

  if (cycleId) query = query.eq("cycle_id", cycleId);

  const { data: candidates, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Fetch TRI scores from latest insight_profile per candidate
  const candidateIds = (candidates ?? []).map((c) => c.id);
  const triByCandidate = new Map<string, number | null>();
  if (candidateIds.length > 0) {
    const { data: profiles } = await supabaseAdmin
      .from("insight_profiles")
      .select("candidate_id, tri_score, generated_at")
      .in("candidate_id", candidateIds)
      .order("generated_at", { ascending: false });
    for (const p of profiles ?? []) {
      if (!triByCandidate.has(p.candidate_id)) {
        triByCandidate.set(p.candidate_id, p.tri_score);
      }
    }
  }

  const rows: BriefingRow[] = (candidates ?? []).map((c) => {
    const cache = (c.defensible_language_cache ?? {}) as {
      admit?: string;
      waitlist?: string;
      decline?: string;
      fallback_used?: boolean;
    };
    const hasCache = !!(cache.admit || cache.waitlist || cache.decline);
    const reason = classifyStaleness({
      hasCache,
      languageUpdatedAt: c.defensible_language_updated_at,
      missionUpdatedAt: missionTs,
    });
    return {
      id: c.id,
      first_name: c.first_name,
      last_name: c.last_name,
      grade_applying_to: c.grade_applying_to,
      status: c.status,
      tri_score: triByCandidate.get(c.id) ?? null,
      cycle_id: c.cycle_id,
      language_ready: hasCache,
      language_is_stale: reason !== null,
      staleness_reason: reason,
      defensible_language_updated_at: c.defensible_language_updated_at,
      fallback_used: !!cache.fallback_used,
    };
  });

  // Sort: committee_ready (has language, not stale) first; then stale; then missing.
  rows.sort((a, b) => {
    const aReady = a.language_ready && !a.language_is_stale;
    const bReady = b.language_ready && !b.language_is_stale;
    if (aReady !== bReady) return aReady ? -1 : 1;
    const aDate = a.defensible_language_updated_at ?? "";
    const bDate = b.defensible_language_updated_at ?? "";
    return bDate.localeCompare(aDate);
  });

  const staleCount = rows.filter((r) => r.language_is_stale).length;
  const missingCount = rows.filter((r) => !r.language_ready).length;
  const readyCount = rows.filter((r) => r.language_ready && !r.language_is_stale).length;

  return NextResponse.json({
    rows,
    counts: { total: rows.length, ready: readyCount, stale: staleCount, missing: missingCount },
    mission_statement_updated_at: missionTs,
  });
}
