import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { invalidateLicenseCache } from "@/lib/licensing/resolver";
import { writeAuditLog } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const { user, isPlatformAdmin } = await getTenantContext();
  if (!isPlatformAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { tenant_id, confirm } = await req.json();
  if (!tenant_id || !confirm) {
    return NextResponse.json({ error: "Missing tenant_id or confirm" }, { status: 400 });
  }

  const { data: tenant } = await supabaseAdmin
    .from("tenants")
    .select("name")
    .eq("id", tenant_id)
    .single();

  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  const counts: Record<string, number> = {};

  // Delete in FK-safe order
  const tables = [
    "audit_logs",
    "report_exports",
    "interview_syntheses",
    "evaluator_briefings",
    "interview_rubric_submissions",
    "interviewer_notes",
    "evaluator_reviews",
    "final_recommendations",
    "cohort_benchmarks",
    "insight_profiles",
    "learning_support_signals",
    "ai_runs",
    "help_events",
    "timing_signals",
    "interaction_signals",
    "response_features",
    "response_text",
    "task_instances",
    "session_events",
    "sessions",
    "candidate_status_history",
    "consent_events",
    "invites",
    "guardians",
    "candidates",
    "grade_band_templates",
    "application_cycles",
    "task_templates",
    "license_usage",
    "license_events",
    "upgrade_requests",
  ];

  for (const table of tables) {
    try {
      const { data, error } = await supabaseAdmin
        .from(table)
        .delete()
        .eq("tenant_id", tenant_id)
        .select("id");

      if (!error) {
        counts[table] = data?.length ?? 0;
      }
    } catch {
      // Table may not exist — skip
    }
  }

  // Log the reset
  await supabaseAdmin.from("admin_reset_log").insert({
    performed_by: user.id,
    tenant_id,
    tenant_name: tenant.name,
    reset_type: "candidates_only",
    records_deleted: counts,
  });

  await writeAuditLog(supabaseAdmin, {
    tenant_id,
    actor_id: user.id,
    action: "admin_data_reset_candidates",
    payload: { records_deleted: counts },
  });

  invalidateLicenseCache(tenant_id);

  const total = Object.values(counts).reduce((s, n) => s + n, 0);

  return NextResponse.json({ success: true, total, counts });
}
