import { getTenantContext } from "@/lib/tenant";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { CohortReportsClient } from "./cohort-reports-client";

export const dynamic = "force-dynamic";

export default async function CohortReportsPage() {
  const { tenantId } = await getTenantContext();

  // Active cycle
  const { data: cycle } = await supabaseAdmin
    .from("application_cycles")
    .select("id, name")
    .eq("tenant_id", tenantId)
    .eq("status", "active")
    .limit(1)
    .single();

  if (!cycle) {
    return (
      <div>
        <h1 className="text-2xl font-bold">Cohort Reports</h1>
        <p className="mt-2 text-muted">No active cycle found.</p>
      </div>
    );
  }

  // Candidates with profiles and reviews
  const { data: candidates } = await supabaseAdmin
    .from("candidates")
    .select(
      "id, grade_band, status, sessions(completion_pct), insight_profiles(overall_confidence, requires_human_review, reading_score, writing_score, reasoning_score, reflection_score, persistence_score, support_seeking_score), evaluator_reviews(recommendation_tier, status)"
    )
    .eq("tenant_id", tenantId)
    .eq("cycle_id", cycle.id);

  return (
    <CohortReportsClient
      cycleName={cycle.name}
      cycleId={cycle.id}
      candidates={candidates ?? []}
    />
  );
}
