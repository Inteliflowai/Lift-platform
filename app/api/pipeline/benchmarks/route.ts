import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-internal-secret");
  const isInternal = secret === process.env.INTERNAL_API_SECRET;

  // Also allow authenticated school_admin
  if (!isInternal) {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { cycle_id, tenant_id } = await req.json();
  if (!cycle_id || !tenant_id) {
    return NextResponse.json({ error: "cycle_id and tenant_id required" }, { status: 400 });
  }

  const { data: profiles } = await supabaseAdmin
    .from("insight_profiles")
    .select("reading_score, writing_score, reasoning_score, reflection_score, persistence_score, support_seeking_score, tri_score, candidates(grade_band)")
    .eq("tenant_id", tenant_id)
    .eq("is_final", true);

  const profilesInCycle = (profiles ?? []).filter((p) => {
    const cand = p.candidates as unknown as { grade_band: string };
    return cand != null;
  });

  // Group by grade band
  const byBand: Record<string, { scores: number[][]; triScores: number[] }> = {};

  for (const p of profilesInCycle) {
    const cand = p.candidates as unknown as { grade_band: string };
    const band = cand?.grade_band ?? "unknown";
    if (!byBand[band]) byBand[band] = { scores: [], triScores: [] };

    byBand[band].scores.push([
      Number(p.reading_score ?? 0), Number(p.writing_score ?? 0),
      Number(p.reasoning_score ?? 0), Number(p.reflection_score ?? 0),
      Number(p.persistence_score ?? 0), Number(p.support_seeking_score ?? 0),
    ]);
    if (p.tri_score != null) byBand[band].triScores.push(Number(p.tri_score));
  }

  for (const [band, data] of Object.entries(byBand)) {
    const n = data.scores.length;
    if (n === 0) continue;

    const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
    const percentile = (arr: number[], p: number) => {
      const sorted = [...arr].sort((a, b) => a - b);
      const idx = Math.ceil((p / 100) * sorted.length) - 1;
      return sorted[Math.max(0, idx)];
    };

    const avgScores = [0, 1, 2, 3, 4, 5].map((i) => avg(data.scores.map((s) => s[i])));
    const avgTri = data.triScores.length > 0 ? avg(data.triScores) : 0;

    await supabaseAdmin.from("cohort_benchmarks").upsert({
      cycle_id, tenant_id, grade_band: band,
      avg_reading: Math.round(avgScores[0] * 100) / 100,
      avg_writing: Math.round(avgScores[1] * 100) / 100,
      avg_reasoning: Math.round(avgScores[2] * 100) / 100,
      avg_reflection: Math.round(avgScores[3] * 100) / 100,
      avg_persistence: Math.round(avgScores[4] * 100) / 100,
      avg_support_seeking: Math.round(avgScores[5] * 100) / 100,
      avg_tri: Math.round(avgTri * 100) / 100,
      p25_tri: data.triScores.length > 0 ? Math.round(percentile(data.triScores, 25) * 100) / 100 : 0,
      p75_tri: data.triScores.length > 0 ? Math.round(percentile(data.triScores, 75) * 100) / 100 : 0,
      candidate_count: n,
      computed_at: new Date().toISOString(),
    }, { onConflict: "cycle_id,grade_band" });
  }

  return NextResponse.json({ ok: true, bands: Object.keys(byBand) });
}
