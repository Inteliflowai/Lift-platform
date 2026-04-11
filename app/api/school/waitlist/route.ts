export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant";
import { supabaseAdmin } from "@/lib/supabase/admin";

// GET: list waitlist entries
export async function GET() {
  const { tenantId } = await getTenantContext();

  const { data } = await supabaseAdmin
    .from("waitlist_entries")
    .select("*, candidates(first_name, last_name, grade_band, gender)")
    .eq("tenant_id", tenantId)
    .order("rank_position", { ascending: true });

  return NextResponse.json(data ?? []);
}

// POST: add candidate to waitlist
export async function POST(req: NextRequest) {
  const { tenantId } = await getTenantContext();
  const body = await req.json();
  const { candidate_id, cycle_id } = body;

  if (!candidate_id) {
    return NextResponse.json({ error: "candidate_id required" }, { status: 400 });
  }

  // Get candidate's TRI and review
  const { data: profile } = await supabaseAdmin
    .from("insight_profiles")
    .select("tri_score")
    .eq("candidate_id", candidate_id)
    .eq("is_final", true)
    .order("generated_at", { ascending: false })
    .limit(1)
    .single();

  const { data: review } = await supabaseAdmin
    .from("evaluator_reviews")
    .select("recommendation_tier, notes")
    .eq("candidate_id", candidate_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  // Compute rank: higher TRI = lower rank number (1 = top)
  const { count: existingCount } = await supabaseAdmin
    .from("waitlist_entries")
    .select("*", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("status", "waitlisted");

  const triScore = Number(profile?.tri_score ?? 0);

  const { data: entry, error } = await supabaseAdmin
    .from("waitlist_entries")
    .insert({
      tenant_id: tenantId,
      candidate_id,
      cycle_id: cycle_id ?? null,
      tri_score: triScore,
      recommendation_tier: review?.recommendation_tier ?? null,
      evaluator_notes: review?.notes ?? null,
      rank_position: (existingCount ?? 0) + 1,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Update candidate status
  await supabaseAdmin
    .from("candidates")
    .update({ status: "waitlisted" })
    .eq("id", candidate_id);

  // Re-rank all entries by TRI (highest first)
  await reRankWaitlist(tenantId);

  return NextResponse.json(entry, { status: 201 });
}

// PATCH: update waitlist entry status
export async function PATCH(req: NextRequest) {
  const { tenantId } = await getTenantContext();
  const body = await req.json();
  const { entry_id, status, internal_notes } = body;

  if (!entry_id) {
    return NextResponse.json({ error: "entry_id required" }, { status: 400 });
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (status) {
    updates.status = status;
    if (status === "offered") updates.offered_at = new Date().toISOString();
    if (status === "accepted" || status === "declined") updates.responded_at = new Date().toISOString();
  }
  if (internal_notes !== undefined) updates.internal_notes = internal_notes;

  const { data, error } = await supabaseAdmin
    .from("waitlist_entries")
    .update(updates)
    .eq("id", entry_id)
    .eq("tenant_id", tenantId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Update candidate status based on waitlist action
  if (status === "offered" || status === "accepted") {
    await supabaseAdmin
      .from("candidates")
      .update({ status: status === "accepted" ? "admitted" : "offered" })
      .eq("id", data.candidate_id);
  }

  return NextResponse.json(data);
}

async function reRankWaitlist(tenantId: string) {
  const { data: entries } = await supabaseAdmin
    .from("waitlist_entries")
    .select("id, tri_score")
    .eq("tenant_id", tenantId)
    .eq("status", "waitlisted")
    .order("tri_score", { ascending: false });

  for (let i = 0; i < (entries?.length ?? 0); i++) {
    await supabaseAdmin
      .from("waitlist_entries")
      .update({ rank_position: i + 1 })
      .eq("id", entries![i].id);
  }
}
