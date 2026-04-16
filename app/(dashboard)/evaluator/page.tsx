import { getTenantContext } from "@/lib/tenant";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { EvaluatorDashboardClient } from "./evaluator-dashboard-client";
import { EvaluatorTour } from "@/components/tours/EvaluatorTour";

export const dynamic = "force-dynamic";

export default async function EvaluatorDashboard() {
  const { tenantId, user } = await getTenantContext();

  // My assignments (candidates assigned to me)
  const { data: myAssignments } = await supabaseAdmin
    .from("candidate_assignments")
    .select("candidate_id, assignment_type, status, seen_at, created_at")
    .eq("tenant_id", tenantId)
    .eq("assigned_to", user.id)
    .in("status", ["pending", "in_progress"]);

  const assignedCandidateIds = (myAssignments ?? []).map((a) => a.candidate_id);
  const newAssignments = (myAssignments ?? []).filter((a) => !a.seen_at).length;

  // Mark assignments as seen
  if (newAssignments > 0) {
    await supabaseAdmin
      .from("candidate_assignments")
      .update({ seen_at: new Date().toISOString() })
      .eq("assigned_to", user.id)
      .eq("tenant_id", tenantId)
      .is("seen_at", null);
  }

  // Queue: candidates assigned to me OR flagged for human review
  const { data: reviewCandidates } = await supabaseAdmin
    .from("insight_profiles")
    .select(
      "candidate_id, requires_human_review, low_confidence_flags, unusual_pattern_flags, overall_confidence, generated_at, candidates(id, first_name, last_name, grade_band, grade_applying_to, status), sessions(completion_pct, completed_at)"
    )
    .eq("tenant_id", tenantId)
    .eq("is_final", true)
    .order("generated_at", { ascending: false });

  // Filter to only assigned candidates + flagged ones
  const filteredReview = (reviewCandidates ?? []).filter((rc) => {
    const cid = rc.candidate_id;
    return assignedCandidateIds.includes(cid) || rc.requires_human_review;
  });

  const { data: myReviews } = await supabaseAdmin
    .from("evaluator_reviews")
    .select("candidate_id, status")
    .eq("tenant_id", tenantId)
    .eq("evaluator_id", user.id)
    .eq("status", "in_progress");

  const myReviewCandidateIds = new Set(
    myReviews?.map((r) => r.candidate_id) ?? []
  );

  // All candidates
  const { data: allCandidates } = await supabaseAdmin
    .from("candidates")
    .select(
      "id, first_name, last_name, grade_band, grade_applying_to, status, created_at, sessions(completion_pct, last_activity_at, completed_at), insight_profiles(requires_human_review, overall_confidence, tri_score, tri_label, tri_confidence), evaluator_reviews(recommendation_tier, status)"
    )
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  // Track trial event (non-blocking)
  import("@/lib/trial/trackEvent").then(({ trackTrialEvent }) =>
    trackTrialEvent(tenantId, "evaluator_workspace_opened", user.id).catch(() => {})
  );

  return (
    <>
    <EvaluatorTour />
    <EvaluatorDashboardClient
      reviewCandidates={filteredReview}
      myReviewCandidateIds={Array.from(myReviewCandidateIds)}
      allCandidates={allCandidates ?? []}
      newAssignmentCount={newAssignments}
    />
    </>
  );
}
