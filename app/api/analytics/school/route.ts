import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { checkSessionLimit } from "@/lib/licensing/gate";

export async function GET(req: NextRequest) {
  const { tenantId } = await getTenantContext();
  const cycleId = new URL(req.url).searchParams.get("cycle_id");

  // Base filter
  const candidateFilter = supabaseAdmin
    .from("candidates")
    .select("id, grade_band, status, cycle_id")
    .eq("tenant_id", tenantId);

  if (cycleId) candidateFilter.eq("cycle_id", cycleId);

  const { data: candidates } = await candidateFilter;
  const candidateIds = (candidates ?? []).map((c) => c.id);

  // Sessions
  const { data: sessions } = await supabaseAdmin
    .from("sessions")
    .select("id, status, completion_pct, created_at, completed_at")
    .eq("tenant_id", tenantId)
    .in("candidate_id", candidateIds.length > 0 ? candidateIds : ["none"]);

  const completedSessions = (sessions ?? []).filter((s) => s.status === "completed");

  // Insight profiles
  const { data: profiles } = await supabaseAdmin
    .from("insight_profiles")
    .select(
      "tri_score, tri_label, reading_score, writing_score, reasoning_score, reflection_score, persistence_score, support_seeking_score, candidate_id"
    )
    .eq("tenant_id", tenantId)
    .eq("is_final", true)
    .in("candidate_id", candidateIds.length > 0 ? candidateIds : ["none"]);

  // Learning support
  const { data: lsSignals } = await supabaseAdmin
    .from("learning_support_signals")
    .select("support_indicator_level")
    .eq("tenant_id", tenantId);

  // Session limits
  const sessionInfo = await checkSessionLimit(tenantId).catch(() => ({
    allowed: true,
    used: 0,
    limit: null as number | null,
  }));

  // --- Compute overview ---
  const totalCandidates = candidates?.length ?? 0;
  const completedCount = completedSessions.length;
  const completionRate = totalCandidates > 0 ? Math.round((completedCount / totalCandidates) * 100) : 0;

  const triScores = (profiles ?? []).map((p) => Number(p.tri_score)).filter((n) => !isNaN(n) && n > 0);
  const avgTri = triScores.length > 0 ? Math.round(triScores.reduce((a, b) => a + b, 0) / triScores.length) : 0;

  // Avg session duration
  const durations = completedSessions
    .filter((s) => s.created_at && s.completed_at)
    .map((s) => (new Date(s.completed_at!).getTime() - new Date(s.created_at).getTime()) / 60000);
  const avgDuration = durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;

  // Sessions this month
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const sessionsThisMonth = completedSessions.filter(
    (s) => s.completed_at && new Date(s.completed_at) >= monthStart
  ).length;

  // --- By grade band ---
  const bands = ["6-7", "8", "9-11"] as const;
  const byGradeBand = bands.map((band) => {
    const bandCandidates = (candidates ?? []).filter((c) => c.grade_band === band);
    const bandIds = bandCandidates.map((c) => c.id);
    const bandCompleted = completedSessions.filter((s) =>
      (candidates ?? []).some((c) => c.id === (sessions ?? []).find((ss) => ss.id === s.id) && c.grade_band === band)
    ).length;
    const bandProfiles = (profiles ?? []).filter((p) => bandIds.includes(p.candidate_id));
    const bandTriScores = bandProfiles.map((p) => Number(p.tri_score)).filter((n) => !isNaN(n) && n > 0);
    const bandAvgTri = bandTriScores.length > 0 ? Math.round(bandTriScores.reduce((a, b) => a + b, 0) / bandTriScores.length) : 0;

    return {
      band,
      candidates: bandCandidates.length,
      completed: bandCompleted,
      completion_rate_pct: bandCandidates.length > 0 ? Math.round((bandCompleted / bandCandidates.length) * 100) : 0,
      avg_tri: bandAvgTri,
    };
  });

  // --- TRI distribution ---
  const triDist = { emerging: 0, developing: 0, ready: 0, thriving: 0 };
  for (const score of triScores) {
    if (score < 40) triDist.emerging++;
    else if (score < 60) triDist.developing++;
    else if (score < 80) triDist.ready++;
    else triDist.thriving++;
  }

  // --- Dimension averages ---
  const dims = ["reading_score", "writing_score", "reasoning_score", "reflection_score", "persistence_score", "support_seeking_score"] as const;
  const dimensionAverages: Record<string, number> = {};
  for (const dim of dims) {
    const vals = (profiles ?? []).map((p) => Number(p[dim])).filter((n) => !isNaN(n) && n > 0);
    const key = dim.replace("_score", "");
    dimensionAverages[key] = vals.length > 0 ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
  }

  // --- Support signals ---
  const supportSignals = { none: 0, watch: 0, recommend_screening: 0 };
  for (const ls of lsSignals ?? []) {
    const level = ls.support_indicator_level as keyof typeof supportSignals;
    if (level in supportSignals) supportSignals[level]++;
  }

  // --- Completion by week (last 12 weeks) ---
  const completionByWeek: { week: string; completed: number }[] = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - i * 7);
    weekStart.setHours(0, 0, 0, 0);
    const day = weekStart.getDay();
    weekStart.setDate(weekStart.getDate() - day); // start of week (Sunday)

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const count = completedSessions.filter((s) => {
      if (!s.completed_at) return false;
      const d = new Date(s.completed_at);
      return d >= weekStart && d < weekEnd;
    }).length;

    completionByWeek.push({
      week: weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      completed: count,
    });
  }

  return NextResponse.json({
    overview: {
      total_candidates: totalCandidates,
      completed_sessions: completedCount,
      completion_rate_pct: completionRate,
      avg_tri_score: avgTri,
      avg_session_duration_minutes: avgDuration,
      sessions_this_month: sessionsThisMonth,
      sessions_limit: sessionInfo.limit,
      sessions_remaining: sessionInfo.limit ? Math.max(0, sessionInfo.limit - sessionInfo.used) : null,
    },
    by_grade_band: byGradeBand,
    tri_distribution: triDist,
    dimension_averages: dimensionAverages,
    support_signals: supportSignals,
    completion_by_week: completionByWeek,
  });
}
