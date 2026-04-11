export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-internal-secret");
  const isInternal = secret === process.env.INTERNAL_API_SECRET;

  let tenantId: string;
  let cycleId: string | null = null;

  if (isInternal) {
    const body = await req.json();
    tenantId = body.tenant_id;
    cycleId = body.cycle_id ?? null;
  } else {
    const { getTenantContext } = await import("@/lib/tenant");
    const ctx = await getTenantContext();
    tenantId = ctx.tenantId;
    const url = new URL(req.url);
    cycleId = url.searchParams.get("cycle_id");
  }

  if (!tenantId) {
    return NextResponse.json({ error: "tenant_id required" }, { status: 400 });
  }

  // Get candidates with both profiles and outcomes
  const { data: outcomes } = await supabaseAdmin
    .from("student_outcomes")
    .select("candidate_id, gpa, academic_standing, retained, learning_support_plan_active, social_adjustment")
    .eq("tenant_id", tenantId);

  if (!outcomes || outcomes.length === 0) {
    return NextResponse.json({ message: "No outcomes to analyze", sample_size: 0 });
  }

  const candidateIds = Array.from(new Set(outcomes.map((o) => o.candidate_id)));

  const { data: profiles } = await supabaseAdmin
    .from("insight_profiles")
    .select("candidate_id, tri_score, tri_label, reading_score, writing_score, reasoning_score, reflection_score, persistence_score, support_seeking_score, candidates(grade_band, cycle_id)")
    .eq("tenant_id", tenantId)
    .eq("is_final", true)
    .in("candidate_id", candidateIds);

  if (!profiles || profiles.length === 0) {
    return NextResponse.json({ message: "No matching profiles", sample_size: 0 });
  }

  // Build matched pairs
  type Pair = {
    candidateId: string;
    triScore: number;
    triLabel: string;
    gradeBand: string;
    cycleId: string | null;
    gpa: number | null;
    standing: string | null;
    retained: boolean;
    supportPlan: boolean;
    dims: Record<string, number>;
  };

  const pairs: Pair[] = [];

  for (const profile of profiles) {
    const outcome = outcomes.find((o) => o.candidate_id === profile.candidate_id);
    if (!outcome) continue;

    const cand = profile.candidates as unknown as { grade_band: string; cycle_id: string } | null;

    pairs.push({
      candidateId: profile.candidate_id,
      triScore: Number(profile.tri_score ?? 0),
      triLabel: (profile.tri_label as string) ?? "developing",
      gradeBand: cand?.grade_band ?? "8",
      cycleId: cand?.cycle_id ?? null,
      gpa: outcome.gpa != null ? Number(outcome.gpa) : null,
      standing: outcome.academic_standing,
      retained: outcome.retained ?? true,
      supportPlan: outcome.learning_support_plan_active ?? false,
      dims: {
        reading: Number(profile.reading_score ?? 0),
        writing: Number(profile.writing_score ?? 0),
        reasoning: Number(profile.reasoning_score ?? 0),
        reflection: Number(profile.reflection_score ?? 0),
        persistence: Number(profile.persistence_score ?? 0),
        support_seeking: Number(profile.support_seeking_score ?? 0),
      },
    });
  }

  if (pairs.length === 0) {
    return NextResponse.json({ message: "No matched pairs", sample_size: 0 });
  }

  // Compute accuracy by grade band
  const gradeBands = Array.from(new Set(pairs.map((p) => p.gradeBand)));
  const results = [];

  for (const band of gradeBands) {
    const bandPairs = pairs.filter((p) => p.gradeBand === band);
    if (bandPairs.length < 3) continue; // Need minimum sample

    // TRI accuracy: did the label predict the outcome?
    let correct = 0;
    for (const p of bandPairs) {
      const predicted = p.triLabel === "thriving" || p.triLabel === "ready" ? "positive" : "needs_support";
      const actual = (p.standing === "excellent" || p.standing === "good" || p.standing === "satisfactory") && p.retained
        ? "positive" : "needs_support";
      if (predicted === actual) correct++;
    }
    const triAccuracy = Math.round((correct / bandPairs.length) * 100);

    // High TRI retention
    const highTri = bandPairs.filter((p) => p.triScore >= 60);
    const highRetained = highTri.filter((p) => p.retained);
    const highRetention = highTri.length > 0 ? Math.round((highRetained.length / highTri.length) * 100) : null;

    // Low TRI support usage
    const lowTri = bandPairs.filter((p) => p.triScore < 60);
    const lowSupport = lowTri.filter((p) => p.supportPlan);
    const lowSupportPct = lowTri.length > 0 ? Math.round((lowSupport.length / lowTri.length) * 100) : null;

    // Dimension correlation with GPA
    const withGpa = bandPairs.filter((p) => p.gpa != null);
    let strongest = "";
    let weakest = "";
    let maxCorr = -1;
    let minCorr = 2;

    if (withGpa.length >= 5) {
      for (const dim of Object.keys(withGpa[0].dims)) {
        const scores = withGpa.map((p) => p.dims[dim]);
        const gpas = withGpa.map((p) => p.gpa!);
        const corr = Math.abs(pearsonCorrelation(scores, gpas));
        if (corr > maxCorr) { maxCorr = corr; strongest = dim; }
        if (corr < minCorr) { minCorr = corr; weakest = dim; }
      }
    }

    const bandCycleId = cycleId ?? bandPairs[0].cycleId;

    // Upsert prediction_accuracy
    await supabaseAdmin.from("prediction_accuracy").upsert({
      tenant_id: tenantId,
      cycle_id: bandCycleId,
      grade_band: band,
      sample_size: bandPairs.length,
      tri_accuracy_pct: triAccuracy,
      high_tri_retention_pct: highRetention,
      low_tri_support_pct: lowSupportPct,
      strongest_predictor: strongest || null,
      weakest_predictor: weakest || null,
      computed_at: new Date().toISOString(),
    }, { onConflict: "tenant_id,cycle_id,grade_band" });

    results.push({
      grade_band: band,
      sample_size: bandPairs.length,
      tri_accuracy_pct: triAccuracy,
      high_tri_retention_pct: highRetention,
      low_tri_support_pct: lowSupportPct,
      strongest_predictor: strongest,
      weakest_predictor: weakest,
    });
  }

  return NextResponse.json({ results, total_pairs: pairs.length });
}

function pearsonCorrelation(x: number[], y: number[]): number {
  const n = x.length;
  if (n < 3) return 0;
  const meanX = x.reduce((a, b) => a + b, 0) / n;
  const meanY = y.reduce((a, b) => a + b, 0) / n;
  let num = 0, denX = 0, denY = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }
  const den = Math.sqrt(denX * denY);
  return den === 0 ? 0 : num / den;
}
