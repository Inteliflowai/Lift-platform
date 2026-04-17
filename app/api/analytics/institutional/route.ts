export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireFeature } from "@/lib/licensing/gate";
import { FEATURES } from "@/lib/licensing/features";

export async function GET() {
  const { tenantId } = await getTenantContext();
  await requireFeature(tenantId, FEATURES.INSTITUTIONAL_MEMORY);

  // Evaluator calibration data
  const { data: calibrations } = await supabaseAdmin
    .from("evaluator_calibration")
    .select("*, users(full_name, email)")
    .eq("tenant_id", tenantId)
    .order("accuracy_pct", { ascending: false });

  // Get all evaluator reviews with outcomes
  const { data: reviews } = await supabaseAdmin
    .from("evaluator_reviews")
    .select("evaluator_id, recommendation_tier, candidate_id, status, users(full_name)")
    .eq("tenant_id", tenantId)
    .eq("status", "finalized");

  // Get outcomes for reviewed candidates
  const reviewedCandidateIds = Array.from(new Set((reviews ?? []).map((r) => r.candidate_id)));
  const outcomeMap: Record<string, string> = {};

  if (reviewedCandidateIds.length > 0) {
    const { data: outcomes } = await supabaseAdmin
      .from("student_outcomes")
      .select("candidate_id, academic_standing, retained")
      .eq("tenant_id", tenantId)
      .in("candidate_id", reviewedCandidateIds);

    for (const o of outcomes ?? []) {
      const thrived = o.retained !== false && ["excellent", "good", "satisfactory"].includes(o.academic_standing ?? "");
      outcomeMap[o.candidate_id] = thrived ? "thrived" : "struggled";
    }
  }

  // Compute evaluator stats
  const evaluatorStats: Record<string, {
    name: string;
    total_reviews: number;
    strong_admits: number;
    admits_with_outcomes: number;
    admits_thrived: number;
    admits_struggled: number;
    accuracy_pct: number | null;
  }> = {};

  for (const r of reviews ?? []) {
    const evalId = r.evaluator_id;
    const evalName = (r.users as unknown as { full_name: string } | null)?.full_name ?? "Unknown";

    if (!evaluatorStats[evalId]) {
      evaluatorStats[evalId] = {
        name: evalName,
        total_reviews: 0,
        strong_admits: 0,
        admits_with_outcomes: 0,
        admits_thrived: 0,
        admits_struggled: 0,
        accuracy_pct: null,
      };
    }

    evaluatorStats[evalId].total_reviews++;
    if (r.recommendation_tier === "strong_admit" || r.recommendation_tier === "admit") {
      evaluatorStats[evalId].strong_admits++;
    }

    const outcome = outcomeMap[r.candidate_id];
    if (outcome) {
      evaluatorStats[evalId].admits_with_outcomes++;
      if (outcome === "thrived") evaluatorStats[evalId].admits_thrived++;
      else evaluatorStats[evalId].admits_struggled++;
    }
  }

  // Compute accuracy for each evaluator
  for (const stat of Object.values(evaluatorStats)) {
    if (stat.admits_with_outcomes >= 3) {
      stat.accuracy_pct = Math.round((stat.admits_thrived / stat.admits_with_outcomes) * 100);
    }
  }

  // Multi-year summary stats
  const { data: allCycles } = await supabaseAdmin
    .from("application_cycles")
    .select("id, academic_year")
    .eq("tenant_id", tenantId)
    .order("created_at");

  const { count: totalCandidatesEver } = await supabaseAdmin
    .from("candidates")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId);

  const { count: totalSessionsEver } = await supabaseAdmin
    .from("sessions")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("status", "completed");

  const { data: allAccuracy } = await supabaseAdmin
    .from("prediction_accuracy")
    .select("tri_accuracy_pct")
    .eq("tenant_id", tenantId);

  const overallAccuracy = (allAccuracy ?? []).length > 0
    ? Math.round((allAccuracy ?? []).reduce((s, a) => s + Number(a.tri_accuracy_pct), 0) / (allAccuracy ?? []).length)
    : null;

  return NextResponse.json({
    evaluator_stats: Object.entries(evaluatorStats)
      .map(([id, stat]) => ({ evaluator_id: id, ...stat }))
      .sort((a, b) => (b.accuracy_pct ?? 0) - (a.accuracy_pct ?? 0)),
    calibrations: calibrations ?? [],
    summary: {
      total_cycles: (allCycles ?? []).length,
      years_active: allCycles?.length ? `${allCycles[0].academic_year} – ${allCycles[allCycles.length - 1].academic_year}` : "—",
      total_candidates: totalCandidatesEver ?? 0,
      total_sessions: totalSessionsEver ?? 0,
      overall_prediction_accuracy: overallAccuracy,
    },
  });
}
