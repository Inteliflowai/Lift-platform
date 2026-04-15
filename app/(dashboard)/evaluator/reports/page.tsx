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
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Cohort Reports</h1>
        <p className="text-sm text-muted">
          Cohort reports show all candidates in your active cycle with readiness levels, dimension scores, and recommendations.
        </p>
        <div className="rounded-lg border border-lift-border bg-surface p-8 text-center">
          <p className="text-sm text-muted">
            No active admissions cycle found. Create a cycle to start collecting candidates.
          </p>
          <a
            href="/school/cycles/new"
            className="mt-4 inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Create Cycle →
          </a>
        </div>
      </div>
    );
  }

  // Candidates with profiles and reviews
  const { data: candidates } = await supabaseAdmin
    .from("candidates")
    .select(
      "id, grade_band, status, sessions(completion_pct), insight_profiles(overall_confidence, requires_human_review, reading_score, writing_score, reasoning_score, reflection_score, persistence_score, support_seeking_score, tri_score, tri_label), evaluator_reviews(recommendation_tier, status)"
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
