export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant";
import { supabaseAdmin } from "@/lib/supabase/admin";

// GET: list outcomes for a candidate
export async function GET(req: NextRequest) {
  const { tenantId } = await getTenantContext();
  const candidateId = new URL(req.url).searchParams.get("candidate_id");

  if (!candidateId) {
    return NextResponse.json({ error: "candidate_id required" }, { status: 400 });
  }

  const { data } = await supabaseAdmin
    .from("student_outcomes")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("candidate_id", candidateId)
    .order("recorded_at", { ascending: false });

  return NextResponse.json(data ?? []);
}

// POST: record an outcome
export async function POST(req: NextRequest) {
  const { user, tenantId } = await getTenantContext();
  const body = await req.json();

  const {
    candidate_id,
    academic_year,
    term,
    gpa,
    gpa_scale,
    academic_standing,
    tutoring_sessions_per_week,
    counseling_engaged,
    learning_support_plan_active,
    social_adjustment,
    extracurricular_engaged,
    retained,
    withdrawal_reason,
    advisor_notes,
  } = body;

  if (!candidate_id || !academic_year) {
    return NextResponse.json({ error: "candidate_id and academic_year required" }, { status: 400 });
  }

  const { data: outcome, error } = await supabaseAdmin
    .from("student_outcomes")
    .insert({
      candidate_id,
      tenant_id: tenantId,
      academic_year,
      term: term || null,
      recorded_by: user.id,
      gpa: gpa ?? null,
      gpa_scale: gpa_scale ?? 4.0,
      academic_standing: academic_standing || null,
      tutoring_sessions_per_week: tutoring_sessions_per_week ?? null,
      counseling_engaged: counseling_engaged ?? null,
      learning_support_plan_active: learning_support_plan_active ?? null,
      social_adjustment: social_adjustment || null,
      extracurricular_engaged: extracurricular_engaged ?? null,
      retained: retained ?? true,
      withdrawal_reason: withdrawal_reason || null,
      advisor_notes: advisor_notes || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Update candidate
  const { count } = await supabaseAdmin
    .from("student_outcomes")
    .select("*", { count: "exact", head: true })
    .eq("candidate_id", candidate_id);

  await supabaseAdmin
    .from("candidates")
    .update({ latest_outcome_id: outcome.id, outcome_count: count ?? 1 })
    .eq("id", candidate_id);

  // Trigger accuracy recompute (fire and forget)
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  fetch(`${baseUrl}/api/analytics/accuracy`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-internal-secret": process.env.INTERNAL_API_SECRET! },
    body: JSON.stringify({ tenant_id: tenantId }),
  }).catch(() => {});

  return NextResponse.json(outcome, { status: 201 });
}
