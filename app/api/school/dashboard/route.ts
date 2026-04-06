import { NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET() {
  const { tenantId, tenant } = await getTenantContext();

  // Active cycle
  const { data: cycle } = await supabaseAdmin
    .from("application_cycles")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  // Total candidates
  const { count: totalCandidates } = await supabaseAdmin
    .from("candidates")
    .select("*", { count: "exact", head: true })
    .eq("tenant_id", tenantId);

  // Completed sessions
  const { count: completedSessions } = await supabaseAdmin
    .from("sessions")
    .select("*", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("status", "completed");

  // Flagged candidates
  const { count: flaggedCount } = await supabaseAdmin
    .from("candidates")
    .select("*", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("status", "flagged");

  // Needs human review
  const { count: reviewCount } = await supabaseAdmin
    .from("insight_profiles")
    .select("*", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("requires_human_review", true)
    .eq("is_final", true);

  // Avg completion %
  const { data: avgData } = await supabaseAdmin
    .from("sessions")
    .select("completion_pct")
    .eq("tenant_id", tenantId);

  const avgCompletion =
    avgData && avgData.length > 0
      ? avgData.reduce((s, r) => s + Number(r.completion_pct), 0) / avgData.length
      : 0;

  // Grade band breakdown
  let gradeBandCounts: { grade_band: string; count: number }[] = [];
  if (cycle) {
    const { data: bandData } = await supabaseAdmin
      .from("candidates")
      .select("grade_band")
      .eq("tenant_id", tenantId)
      .eq("cycle_id", cycle.id);

    const counts: Record<string, number> = {};
    bandData?.forEach((c) => {
      counts[c.grade_band] = (counts[c.grade_band] || 0) + 1;
    });
    gradeBandCounts = Object.entries(counts).map(([grade_band, count]) => ({
      grade_band,
      count,
    }));
  }

  // Review queue: flagged candidates or those with requires_human_review
  const { data: flaggedCandidates } = await supabaseAdmin
    .from("candidates")
    .select("id, first_name, last_name, grade_band, status")
    .eq("tenant_id", tenantId)
    .eq("status", "flagged")
    .limit(10);

  const { data: reviewProfiles } = await supabaseAdmin
    .from("insight_profiles")
    .select("candidate_id, low_confidence_flags, candidates(id, first_name, last_name, grade_band, status)")
    .eq("tenant_id", tenantId)
    .eq("requires_human_review", true)
    .eq("is_final", true)
    .limit(10);

  const reviewQueue = [
    ...(flaggedCandidates?.map((c) => ({
      ...c,
      flag_reason: "Status flagged",
    })) ?? []),
    ...(reviewProfiles
      ?.filter((p) => p.candidates)
      .map((p) => {
        const c = p.candidates as unknown as {
          id: string;
          first_name: string;
          last_name: string;
          grade_band: string;
          status: string;
        };
        return {
          ...c,
          flag_reason:
            p.low_confidence_flags?.join(", ") || "Requires human review",
        };
      }) ?? []),
  ];

  // Recent completions
  const { data: recentCompleted } = await supabaseAdmin
    .from("sessions")
    .select("completed_at, candidates(id, first_name, last_name, grade_band)")
    .eq("tenant_id", tenantId)
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(5);

  return NextResponse.json({
    tenant,
    cycle,
    stats: {
      totalCandidates: totalCandidates ?? 0,
      completedSessions: completedSessions ?? 0,
      flagged: (flaggedCount ?? 0) + (reviewCount ?? 0),
      avgCompletion: Math.round(avgCompletion * 100) / 100,
    },
    gradeBandCounts,
    reviewQueue,
    recentCompleted: recentCompleted ?? [],
  });
}
