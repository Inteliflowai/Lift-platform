import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-internal-secret");
  if (secret !== process.env.INTERNAL_API_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { candidate_id } = await req.json();
  if (!candidate_id) {
    return NextResponse.json({ error: "candidate_id required" }, { status: 400 });
  }

  // Get candidate with tenant
  const { data: candidate } = await supabaseAdmin
    .from("candidates")
    .select("*")
    .eq("id", candidate_id)
    .single();

  if (!candidate) {
    return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
  }

  // Check tenant integration enabled
  const { data: tenant } = await supabaseAdmin
    .from("tenants")
    .select("id, name, slug, core_integration_enabled, core_tenant_id")
    .eq("id", candidate.tenant_id)
    .single();

  if (!tenant?.core_integration_enabled) {
    await supabaseAdmin
      .from("candidates")
      .update({ core_sync_status: "skipped" })
      .eq("id", candidate_id);
    await writeAuditLog(supabaseAdmin, {
      tenant_id: candidate.tenant_id,
      candidate_id,
      action: "core_sync_skipped_not_enabled",
    });
    return NextResponse.json({ ok: true, skipped: true, reason: "not_enabled" });
  }

  if (!tenant.core_tenant_id) {
    await supabaseAdmin
      .from("candidates")
      .update({ core_sync_status: "skipped" })
      .eq("id", candidate_id);
    await writeAuditLog(supabaseAdmin, {
      tenant_id: candidate.tenant_id,
      candidate_id,
      action: "core_sync_skipped_no_tenant_id",
    });
    return NextResponse.json({ ok: true, skipped: true, reason: "no_tenant_id" });
  }

  // Pull insight profile + TRI
  const { data: profile } = await supabaseAdmin
    .from("insight_profiles")
    .select("*, learning_support_signals(*)")
    .eq("candidate_id", candidate_id)
    .eq("is_final", true)
    .order("generated_at", { ascending: false })
    .limit(1)
    .single();

  // Get session completion timestamp
  const { data: session } = await supabaseAdmin
    .from("sessions")
    .select("completed_at")
    .eq("candidate_id", candidate_id)
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(1)
    .single();

  // Get invite email
  const { data: invite } = await supabaseAdmin
    .from("invites")
    .select("sent_to_email")
    .eq("candidate_id", candidate_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  // Generate signed report URL (7-day expiry)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const reportUrl = `${appUrl}/api/exports/pdf?candidate_id=${candidate_id}&export_type=internal&language=${candidate.preferred_language ?? "en"}`;

  // Build learning support flags list
  const ls = profile?.learning_support_signals as Record<string, unknown> | null;
  const lsFlags: string[] = [];
  if (ls) {
    const flagKeys = [
      "high_revision_depth", "low_reading_dwell", "short_written_output",
      "high_response_latency", "task_abandonment_pattern", "hint_seeking_high",
      "planning_task_difficulty", "reasoning_writing_gap",
    ];
    for (const key of flagKeys) {
      if (ls[key] === true) lsFlags.push(key);
    }
  }

  // Build payload
  const payload = {
    lift_candidate_id: candidate.id,
    school_id: tenant.core_tenant_id,
    first_name: candidate.first_name,
    last_name: candidate.last_name,
    email: invite?.sent_to_email ?? null,
    grade: candidate.grade_applying_to,
    preferred_language: candidate.preferred_language ?? "en",
    lift_session_completed_at: session?.completed_at ?? null,
    tri_score: profile?.tri_score != null ? Number(profile.tri_score) : null,
    tri_label: profile?.tri_label ?? null,
    readiness_dimensions: profile
      ? {
          reading: Number(profile.reading_score ?? 0),
          writing: Number(profile.writing_score ?? 0),
          reasoning: Number(profile.reasoning_score ?? 0),
          reflection: Number(profile.reflection_score ?? 0),
          persistence: Number(profile.persistence_score ?? 0),
          support_seeking: Number(profile.support_seeking_score ?? 0),
        }
      : null,
    overall_confidence: profile?.overall_confidence != null ? Number(profile.overall_confidence) : null,
    support_indicator_level: ls?.support_indicator_level ?? "none",
    learning_support_flags: lsFlags,
    internal_narrative_summary: profile?.internal_narrative
      ? (profile.internal_narrative as string).slice(0, 500)
      : null,
    placement_guidance: profile?.placement_guidance ?? null,
    lift_report_url: reportUrl,
  };

  const coreApiUrl = process.env.CORE_API_URL;
  if (!coreApiUrl) {
    await supabaseAdmin
      .from("candidates")
      .update({ core_sync_status: "skipped" })
      .eq("id", candidate_id);
    await writeAuditLog(supabaseAdmin, {
      tenant_id: candidate.tenant_id,
      candidate_id,
      action: "core_sync_skipped_no_api_url",
    });
    return NextResponse.json({ ok: true, skipped: true, reason: "no_api_url" });
  }

  try {
    const res = await fetch(`${coreApiUrl}/api/integrations/lift/inbound`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Integration-Secret": process.env.CORE_INTEGRATION_SECRET ?? process.env.INTERNAL_API_SECRET!,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(`CORE responded ${res.status}: ${await res.text().catch(() => "")}`);
    }

    const data = await res.json();

    await supabaseAdmin
      .from("candidates")
      .update({
        core_student_id: data.core_student_id ?? null,
        core_sync_status: "synced",
        core_sync_at: new Date().toISOString(),
      })
      .eq("id", candidate_id);

    await writeAuditLog(supabaseAdmin, {
      tenant_id: candidate.tenant_id,
      candidate_id,
      action: "core_sync_success",
      payload: { core_student_id: data.core_student_id },
    });

    return NextResponse.json({ ok: true, core_student_id: data.core_student_id });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);

    await supabaseAdmin
      .from("candidates")
      .update({ core_sync_status: "failed" })
      .eq("id", candidate_id);

    await writeAuditLog(supabaseAdmin, {
      tenant_id: candidate.tenant_id,
      candidate_id,
      action: "core_sync_failed",
      payload: { error: errorMsg },
    });

    // Never throw — always return gracefully
    return NextResponse.json({ ok: false, error: errorMsg }, { status: 502 });
  }
}
