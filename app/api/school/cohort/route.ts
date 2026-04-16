export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireFeature } from "@/lib/licensing/gate";
import { FEATURES } from "@/lib/licensing/features";

export async function GET(req: NextRequest) {
  const { tenantId } = await getTenantContext();
  await requireFeature(tenantId, FEATURES.COHORT_VIEW);

  const { searchParams } = new URL(req.url);
  const cycleId = searchParams.get("cycleId");
  const gradeFilter = searchParams.get("grade");
  const sortBy = searchParams.get("sort") || "tri_desc";
  const flagFilter = searchParams.get("flag");

  // Fetch cycles for the selector
  const { data: cycles } = await supabaseAdmin
    .from("application_cycles")
    .select("id, name, status")
    .eq("tenant_id", tenantId)
    .in("status", ["active", "closed"])
    .order("created_at", { ascending: false });

  if (!cycleId) {
    return NextResponse.json({ cycles: cycles ?? [], sessions: [], stats: null });
  }

  // Fetch candidates for this cycle
  let candidateQuery = supabaseAdmin
    .from("candidates")
    .select("id, first_name, last_name, grade_band, grade_applying_to, status, cycle_id")
    .eq("tenant_id", tenantId)
    .eq("cycle_id", cycleId);

  if (gradeFilter) {
    candidateQuery = candidateQuery.eq("grade_band", gradeFilter);
  }

  const { data: candidates, error: candErr } = await candidateQuery;
  if (candErr) {
    return NextResponse.json({ error: candErr.message }, { status: 500 });
  }

  const candidateIds = (candidates ?? []).map((c) => c.id);
  if (candidateIds.length === 0) {
    return NextResponse.json({
      cycles: cycles ?? [],
      sessions: [],
      stats: {
        total: 0,
        avgTri: 0,
        withSignals: 0,
        byGrade: {},
        triDistribution: { strong: 0, developing: 0, emerging: 0 },
      },
    });
  }

  // Fetch completed sessions (separate queries — avoid unreliable nested joins)
  const { data: sessions } = await supabaseAdmin
    .from("sessions")
    .select("id, candidate_id, status, completion_pct, completed_at")
    .eq("tenant_id", tenantId)
    .eq("status", "completed")
    .in("candidate_id", candidateIds);

  // Fetch insight profiles
  const { data: profiles } = await supabaseAdmin
    .from("insight_profiles")
    .select(
      "candidate_id, tri_score, reading_score, writing_score, reasoning_score, reflection_score, persistence_score, support_seeking_score, learning_support_signal_id"
    )
    .eq("tenant_id", tenantId)
    .eq("is_final", true)
    .in("candidate_id", candidateIds);

  // Fetch learning support signals for candidates with profiles
  const signalIds = (profiles ?? [])
    .map((p) => p.learning_support_signal_id)
    .filter(Boolean) as string[];

  const signalsMap: Record<string, { signal_count: number; support_indicator_level: string }> = {};
  if (signalIds.length > 0) {
    const { data: signals } = await supabaseAdmin
      .from("learning_support_signals")
      .select("id, candidate_id, signal_count, support_indicator_level")
      .in("id", signalIds);
    for (const s of signals ?? []) {
      if (s.candidate_id) signalsMap[s.candidate_id] = s;
    }
  }

  // Build candidate-centric rows — one per candidate with a completed session
  const profileMap = new Map(
    (profiles ?? []).map((p) => [p.candidate_id, p])
  );
  const sessionMap = new Map<string, (typeof sessions extends (infer T)[] | null ? T : never)>();
  for (const s of sessions ?? []) {
    // Keep the most recent completed session per candidate
    if (!sessionMap.has(s.candidate_id) || s.completed_at > (sessionMap.get(s.candidate_id)?.completed_at ?? "")) {
      sessionMap.set(s.candidate_id, s);
    }
  }

  const candidateMap = new Map(
    (candidates ?? []).map((c) => [c.id, c])
  );

  type CohortRow = {
    candidate_id: string;
    session_id: string;
    first_name: string;
    last_name: string;
    grade_band: string;
    grade_applying_to: string;
    tri_score: number;
    reading_score: number;
    writing_score: number;
    reasoning_score: number;
    reflection_score: number;
    persistence_score: number;
    support_seeking_score: number;
    completion_pct: number;
    completed_at: string;
    signal_count: number;
    support_level: string;
  };

  let rows: CohortRow[] = [];
  const sessionEntries = Array.from(sessionMap.entries());
  for (const [candidateId, session] of sessionEntries) {
    const candidate = candidateMap.get(candidateId);
    const profile = profileMap.get(candidateId);
    if (!candidate || !profile) continue;

    const signal = signalsMap[candidateId];
    rows.push({
      candidate_id: candidateId,
      session_id: session.id,
      first_name: candidate.first_name,
      last_name: candidate.last_name,
      grade_band: candidate.grade_band,
      grade_applying_to: candidate.grade_applying_to,
      tri_score: Number(profile.tri_score) || 0,
      reading_score: Number(profile.reading_score) || 0,
      writing_score: Number(profile.writing_score) || 0,
      reasoning_score: Number(profile.reasoning_score) || 0,
      reflection_score: Number(profile.reflection_score) || 0,
      persistence_score: Number(profile.persistence_score) || 0,
      support_seeking_score: Number(profile.support_seeking_score) || 0,
      completion_pct: session.completion_pct ?? 100,
      completed_at: session.completed_at ?? "",
      signal_count: signal?.signal_count ?? 0,
      support_level: signal?.support_indicator_level ?? "none",
    });
  }

  // Apply flag filter
  if (flagFilter === "signals") {
    rows = rows.filter((r) => r.signal_count > 0);
  } else if (flagFilter === "strong") {
    rows = rows.filter((r) => r.tri_score >= 75);
  } else if (flagFilter === "emerging") {
    rows = rows.filter((r) => r.tri_score < 50);
  }

  // Sort
  rows.sort((a, b) => {
    switch (sortBy) {
      case "tri_asc":
        return a.tri_score - b.tri_score;
      case "tri_desc":
        return b.tri_score - a.tri_score;
      case "name_asc":
        return a.last_name.localeCompare(b.last_name);
      case "grade":
        return a.grade_band.localeCompare(b.grade_band);
      case "signals":
        return b.signal_count - a.signal_count;
      default:
        return b.tri_score - a.tri_score;
    }
  });

  // Compute stats
  const triScores = rows.map((r) => r.tri_score);
  const stats = {
    total: rows.length,
    avgTri: triScores.length
      ? Math.round(triScores.reduce((a, b) => a + b, 0) / triScores.length)
      : 0,
    withSignals: rows.filter((r) => r.signal_count > 0).length,
    byGrade: rows.reduce((acc: Record<string, number>, r) => {
      const g = r.grade_band || "Unknown";
      acc[g] = (acc[g] || 0) + 1;
      return acc;
    }, {}),
    triDistribution: {
      strong: rows.filter((r) => r.tri_score >= 75).length,
      developing: rows.filter((r) => r.tri_score >= 50 && r.tri_score < 75).length,
      emerging: rows.filter((r) => r.tri_score < 50).length,
    },
  };

  return NextResponse.json({ cycles: cycles ?? [], sessions: rows, stats });
}
