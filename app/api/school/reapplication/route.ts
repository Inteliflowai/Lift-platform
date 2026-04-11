export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant";
import { supabaseAdmin } from "@/lib/supabase/admin";

// GET: list re-application records
export async function GET() {
  const { tenantId } = await getTenantContext();

  const { data } = await supabaseAdmin
    .from("reapplication_records")
    .select("*, candidates(first_name, last_name, grade_band, gender)")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  return NextResponse.json(data ?? []);
}

// POST: detect and create re-application record
export async function POST(req: NextRequest) {
  const { tenantId } = await getTenantContext();
  const { candidate_id, current_cycle_id } = await req.json();

  if (!candidate_id) {
    return NextResponse.json({ error: "candidate_id required" }, { status: 400 });
  }

  // Find prior sessions for this candidate
  const { data: sessions } = await supabaseAdmin
    .from("sessions")
    .select("id, cycle_id, completed_at")
    .eq("candidate_id", candidate_id)
    .eq("status", "completed")
    .order("completed_at", { ascending: true });

  if (!sessions || sessions.length < 2) {
    return NextResponse.json({ error: "No prior application found" }, { status: 404 });
  }

  const priorSession = sessions[sessions.length - 2];
  const currentSession = sessions[sessions.length - 1];

  // Get both profiles
  const { data: priorProfile } = await supabaseAdmin
    .from("insight_profiles")
    .select("tri_score, reading_score, writing_score, reasoning_score, reflection_score, persistence_score, support_seeking_score")
    .eq("session_id", priorSession.id)
    .eq("is_final", true)
    .single();

  const { data: currentProfile } = await supabaseAdmin
    .from("insight_profiles")
    .select("tri_score, reading_score, writing_score, reasoning_score, reflection_score, persistence_score, support_seeking_score")
    .eq("session_id", currentSession.id)
    .eq("is_final", true)
    .single();

  if (!priorProfile || !currentProfile) {
    return NextResponse.json({ error: "Missing profiles" }, { status: 404 });
  }

  // Get prior recommendation
  const { data: priorReview } = await supabaseAdmin
    .from("evaluator_reviews")
    .select("recommendation_tier")
    .eq("candidate_id", candidate_id)
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  // Compute deltas
  const dims = ["reading", "writing", "reasoning", "reflection", "persistence", "support_seeking"];
  const dimensionDeltas: Record<string, number> = {};
  for (const dim of dims) {
    const key = `${dim}_score`;
    const prior = Number((priorProfile as Record<string, unknown>)[key] ?? 0);
    const current = Number((currentProfile as Record<string, unknown>)[key] ?? 0);
    dimensionDeltas[dim] = Math.round((current - prior) * 10) / 10;
  }

  const triDelta = Number(currentProfile.tri_score ?? 0) - Number(priorProfile.tri_score ?? 0);

  // Check if significant change
  const flagged = Math.abs(triDelta) >= 10 || Object.values(dimensionDeltas).some((d) => Math.abs(d) >= 15);

  const { data: record, error } = await supabaseAdmin
    .from("reapplication_records")
    .insert({
      tenant_id: tenantId,
      candidate_id,
      prior_cycle_id: priorSession.cycle_id,
      prior_session_id: priorSession.id,
      prior_tri_score: priorProfile.tri_score,
      prior_recommendation: priorReview?.recommendation_tier ?? null,
      current_cycle_id: current_cycle_id ?? currentSession.cycle_id,
      current_session_id: currentSession.id,
      current_tri_score: currentProfile.tri_score,
      tri_delta: Math.round(triDelta * 10) / 10,
      dimension_deltas: dimensionDeltas,
      flagged_for_review: flagged,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(record, { status: 201 });
}
