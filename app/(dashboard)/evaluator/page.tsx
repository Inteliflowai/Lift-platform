import { getTenantContext } from "@/lib/tenant";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { EvaluatorDashboardClient } from "./evaluator-dashboard-client";

export const dynamic = "force-dynamic";

export default async function EvaluatorDashboard() {
  const { tenantId, user } = await getTenantContext();

  // Queue: requires review OR has in_progress review assigned to this evaluator
  const { data: reviewCandidates } = await supabaseAdmin
    .from("insight_profiles")
    .select(
      "candidate_id, requires_human_review, low_confidence_flags, unusual_pattern_flags, overall_confidence, generated_at, candidates(id, first_name, last_name, grade_band, status), sessions(completion_pct, completed_at)"
    )
    .eq("tenant_id", tenantId)
    .eq("is_final", true)
    .eq("requires_human_review", true)
    .order("generated_at", { ascending: false });

  const { data: myReviews } = await supabaseAdmin
    .from("evaluator_reviews")
    .select("candidate_id, status")
    .eq("tenant_id", tenantId)
    .eq("evaluator_id", user.id)
    .eq("status", "in_progress");

  const myReviewCandidateIds = new Set(
    myReviews?.map((r) => r.candidate_id) ?? []
  );

  // All candidates for all-candidates tab
  const { data: allCandidates } = await supabaseAdmin
    .from("candidates")
    .select(
      "id, first_name, last_name, grade_band, status, created_at, sessions(completion_pct, last_activity_at, completed_at), insight_profiles(requires_human_review, overall_confidence), evaluator_reviews(recommendation_tier, status)"
    )
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  return (
    <EvaluatorDashboardClient
      reviewCandidates={reviewCandidates ?? []}
      myReviewCandidateIds={Array.from(myReviewCandidateIds)}
      allCandidates={allCandidates ?? []}
    />
  );
}
