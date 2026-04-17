export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireFeature } from "@/lib/licensing/gate";
import { FEATURES } from "@/lib/licensing/features";

export async function GET() {
  const { tenantId } = await getTenantContext();
  await requireFeature(tenantId, FEATURES.PREDICTION_TRENDS);

  // Get all cycles for this tenant
  const { data: cycles } = await supabaseAdmin
    .from("application_cycles")
    .select("id, name, academic_year, status, created_at")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: true });

  if (!cycles || cycles.length === 0) {
    return NextResponse.json({ cycles: [], trends: [] });
  }

  const trends = [];

  for (const cycle of cycles) {
    // Count candidates in this cycle
    const { data: candidates } = await supabaseAdmin
      .from("candidates")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("cycle_id", cycle.id);

    const candidateIds = (candidates ?? []).map((c) => c.id);
    if (candidateIds.length === 0) {
      trends.push({
        cycle_id: cycle.id,
        cycle_name: cycle.name,
        academic_year: cycle.academic_year,
        status: cycle.status,
        total_candidates: 0,
        completed_sessions: 0,
        avg_tri: 0,
        avg_reading: 0,
        avg_writing: 0,
        avg_reasoning: 0,
        avg_math: 0,
        avg_reflection: 0,
        avg_persistence: 0,
        avg_advocacy: 0,
        strong_pct: 0,
        developing_pct: 0,
        emerging_pct: 0,
        signal_count: 0,
        prediction_accuracy: null,
      });
      continue;
    }

    // Get insight profiles for these candidates
    const { data: profiles } = await supabaseAdmin
      .from("insight_profiles")
      .select("tri_score, reading_score, writing_score, reasoning_score, math_score, reflection_score, persistence_score, support_seeking_score, candidate_id")
      .eq("tenant_id", tenantId)
      .eq("is_final", true)
      .in("candidate_id", candidateIds);

    const completedProfiles = profiles ?? [];
    const n = completedProfiles.length;

    const avg = (fn: (p: Record<string, unknown>) => number) =>
      n > 0 ? Math.round(completedProfiles.reduce((s, p) => s + fn(p), 0) / n) : 0;

    const triScores = completedProfiles.map((p) => Number(p.tri_score) || 0);
    const strong = triScores.filter((t) => t >= 75).length;
    const developing = triScores.filter((t) => t >= 50 && t < 75).length;
    const emerging = triScores.filter((t) => t < 50).length;

    // Count signals
    const { count: signalCount } = await supabaseAdmin
      .from("learning_support_signals")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .in("candidate_id", candidateIds)
      .neq("support_indicator_level", "none");

    // Get prediction accuracy for this cycle
    const { data: accuracy } = await supabaseAdmin
      .from("prediction_accuracy")
      .select("tri_accuracy_pct")
      .eq("tenant_id", tenantId)
      .eq("cycle_id", cycle.id);

    const avgAccuracy = (accuracy ?? []).length > 0
      ? Math.round((accuracy ?? []).reduce((s, a) => s + Number(a.tri_accuracy_pct), 0) / (accuracy ?? []).length)
      : null;

    trends.push({
      cycle_id: cycle.id,
      cycle_name: cycle.name,
      academic_year: cycle.academic_year,
      status: cycle.status,
      total_candidates: candidateIds.length,
      completed_sessions: n,
      avg_tri: avg((p) => Number(p.tri_score) || 0),
      avg_reading: avg((p) => Number(p.reading_score) || 0),
      avg_writing: avg((p) => Number(p.writing_score) || 0),
      avg_reasoning: avg((p) => Number(p.reasoning_score) || 0),
      avg_math: avg((p) => Number(p.math_score) || 0),
      avg_reflection: avg((p) => Number(p.reflection_score) || 0),
      avg_persistence: avg((p) => Number(p.persistence_score) || 0),
      avg_advocacy: avg((p) => Number(p.support_seeking_score) || 0),
      strong_pct: n > 0 ? Math.round((strong / n) * 100) : 0,
      developing_pct: n > 0 ? Math.round((developing / n) * 100) : 0,
      emerging_pct: n > 0 ? Math.round((emerging / n) * 100) : 0,
      signal_count: signalCount ?? 0,
      prediction_accuracy: avgAccuracy,
    });
  }

  return NextResponse.json({ cycles, trends });
}
