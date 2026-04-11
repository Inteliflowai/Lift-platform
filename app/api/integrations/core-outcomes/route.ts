export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-internal-secret");
  if (secret !== process.env.INTERNAL_API_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { core_student_id, gpa, academic_standing, support_plan_active, term, academic_year } = body;

  if (!core_student_id || !academic_year) {
    return NextResponse.json({ error: "core_student_id and academic_year required" }, { status: 400 });
  }

  // Find candidate by core_student_id
  const { data: candidate } = await supabaseAdmin
    .from("candidates")
    .select("id, tenant_id")
    .eq("core_student_id", core_student_id)
    .single();

  if (!candidate) {
    return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
  }

  // Upsert outcome
  const { data: outcome, error } = await supabaseAdmin
    .from("student_outcomes")
    .upsert(
      {
        candidate_id: candidate.id,
        tenant_id: candidate.tenant_id,
        academic_year,
        term: term || "full_year",
        gpa: gpa ?? null,
        academic_standing: academic_standing || null,
        learning_support_plan_active: support_plan_active ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "candidate_id,academic_year,term" }
    )
    .select()
    .single();

  if (error) {
    // Fallback to insert if upsert fails (no unique constraint)
    const { data: inserted } = await supabaseAdmin
      .from("student_outcomes")
      .insert({
        candidate_id: candidate.id,
        tenant_id: candidate.tenant_id,
        academic_year,
        term: term || "full_year",
        gpa: gpa ?? null,
        academic_standing: academic_standing || null,
        learning_support_plan_active: support_plan_active ?? null,
      })
      .select()
      .single();

    if (!inserted) {
      return NextResponse.json({ error: "Failed to save outcome" }, { status: 500 });
    }
  }

  await writeAuditLog(supabaseAdmin, {
    tenant_id: candidate.tenant_id,
    candidate_id: candidate.id,
    action: "outcome_synced_from_core",
    payload: { core_student_id, academic_year, term, gpa },
  });

  // Trigger accuracy recompute
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  fetch(`${baseUrl}/api/analytics/accuracy`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-internal-secret": process.env.INTERNAL_API_SECRET! },
    body: JSON.stringify({ tenant_id: candidate.tenant_id }),
  }).catch(() => {});

  return NextResponse.json({ ok: true, outcome: outcome ?? null });
}
