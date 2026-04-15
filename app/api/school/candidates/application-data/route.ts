export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireFeature } from "@/lib/licensing/gate";
import { FEATURES } from "@/lib/licensing/features";
import { writeAuditLog } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const { tenantId } = await getTenantContext();
  await requireFeature(tenantId, FEATURES.APPLICATION_DATA);

  const candidateId = req.nextUrl.searchParams.get("candidate_id");
  if (!candidateId) {
    return NextResponse.json({ error: "candidate_id required" }, { status: 400 });
  }

  const { data } = await supabaseAdmin
    .from("candidate_application_data")
    .select("*")
    .eq("candidate_id", candidateId)
    .eq("tenant_id", tenantId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .single();

  return NextResponse.json({ data: data || null });
}

const ALLOWED_FIELDS = [
  "gpa_current",
  "gpa_trend",
  "current_school",
  "isee_score",
  "isee_percentile",
  "ssat_score",
  "ssat_percentile",
  "other_test_name",
  "other_test_score",
  "teacher_rec_1_sentiment",
  "teacher_rec_1_notes",
  "teacher_rec_2_sentiment",
  "teacher_rec_2_notes",
  "counselor_rec_sentiment",
  "counselor_rec_notes",
  "interview_notes",
  "application_complete",
  "application_submitted_at",
  "financial_aid_applicant",
] as const;

export async function POST(req: NextRequest) {
  const { tenantId, user } = await getTenantContext();
  await requireFeature(tenantId, FEATURES.APPLICATION_DATA);

  const body = await req.json();
  const { candidate_id, cycle_id } = body;

  if (!candidate_id) {
    return NextResponse.json({ error: "candidate_id required" }, { status: 400 });
  }

  // Verify candidate belongs to this tenant
  const { data: candidate } = await supabaseAdmin
    .from("candidates")
    .select("id")
    .eq("id", candidate_id)
    .eq("tenant_id", tenantId)
    .single();

  if (!candidate) {
    return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
  }

  // Pick only allowed fields
  const updates: Record<string, unknown> = {};
  for (const key of ALLOWED_FIELDS) {
    if (body[key] !== undefined) updates[key] = body[key];
  }

  const { data, error } = await supabaseAdmin
    .from("candidate_application_data")
    .upsert(
      {
        candidate_id,
        tenant_id: tenantId,
        cycle_id: cycle_id || null,
        sis_source: "manual",
        updated_at: new Date().toISOString(),
        ...updates,
      },
      { onConflict: "candidate_id,cycle_id" }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await writeAuditLog(supabaseAdmin, {
    tenant_id: tenantId,
    actor_id: user.id,
    candidate_id,
    action: "application_data_updated",
    payload: updates,
  });

  return NextResponse.json({ data });
}
