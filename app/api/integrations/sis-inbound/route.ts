export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendInviteEmail } from "@/lib/email";
import { writeAuditLog } from "@/lib/audit";
import { createHmac } from "crypto";
import crypto from "crypto";

/**
 * SIS Inbound Webhook — receives candidate data from external SIS systems.
 * When a school's SIS marks an application as "complete", this endpoint
 * creates the candidate in LIFT and optionally auto-sends the invitation.
 *
 * Expected payload:
 * {
 *   event: "application.complete",
 *   sis_provider: "ravenna" | "veracross" | "blackbaud" | "webhook",
 *   sis_application_id: "ext-123",
 *   candidate: {
 *     first_name: string,
 *     last_name: string,
 *     email: string,
 *     grade_applying_to: string | number,
 *     date_of_birth?: string
 *   }
 * }
 *
 * Auth: Integration secret from sis_integrations table, validated via HMAC
 * or X-SIS-Secret header (simpler key match for direct integrations).
 */
export async function POST(req: NextRequest) {
  const body = await req.text();
  const tenantId = req.headers.get("x-tenant-id");
  const sisSecret = req.headers.get("x-sis-secret");
  const hmacSignature = req.headers.get("x-sis-signature");

  if (!tenantId) {
    return NextResponse.json({ error: "Missing x-tenant-id header" }, { status: 400 });
  }

  // Validate auth — check against active SIS integration for this tenant
  const { data: integration } = await supabaseAdmin
    .from("sis_integrations")
    .select("id, provider, config")
    .eq("tenant_id", tenantId)
    .eq("status", "active")
    .limit(1)
    .single();

  if (!integration) {
    return NextResponse.json({ error: "No active SIS integration for this tenant" }, { status: 403 });
  }

  // Validate secret — try HMAC first, fall back to direct key match
  let configSecret: string | null = null;
  try {
    const { decryptConfig } = await import("@/lib/crypto/encrypt");
    const config = decryptConfig(integration.config as string);
    const cfg = config as Record<string, string>;
    configSecret = cfg.secret ?? cfg.api_key ?? null;
  } catch {
    return NextResponse.json({ error: "Failed to decrypt integration config" }, { status: 500 });
  }

  if (!configSecret) {
    return NextResponse.json({ error: "Integration has no secret configured" }, { status: 403 });
  }

  if (hmacSignature) {
    const expected = createHmac("sha256", configSecret).update(body).digest("hex");
    if (hmacSignature !== expected) {
      return NextResponse.json({ error: "Invalid HMAC signature" }, { status: 401 });
    }
  } else if (sisSecret) {
    if (sisSecret !== configSecret) {
      return NextResponse.json({ error: "Invalid SIS secret" }, { status: 401 });
    }
  } else {
    return NextResponse.json({ error: "Missing x-sis-secret or x-sis-signature header" }, { status: 401 });
  }

  // Parse payload
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const sisProvider = (payload.sis_provider as string) || integration.provider;
  const sisAppId = payload.sis_application_id as string | undefined;
  const candidateData = payload.candidate as Record<string, unknown> | undefined;

  if (!candidateData?.first_name || !candidateData?.last_name || !candidateData?.email || !candidateData?.grade_applying_to) {
    return NextResponse.json({
      error: "candidate.first_name, last_name, email, and grade_applying_to are required",
    }, { status: 400 });
  }

  // Check for duplicates
  const email = candidateData.email.trim().toLowerCase();
  const { data: existingInvite } = await supabaseAdmin
    .from("invites")
    .select("id, candidate_id")
    .eq("tenant_id", tenantId)
    .eq("sent_to_email", email)
    .limit(1)
    .single();

  if (existingInvite) {
    return NextResponse.json({
      message: "Candidate already exists",
      candidate_id: existingInvite.candidate_id,
      duplicate: true,
    });
  }

  // Determine grade band
  const gradeNum = parseInt(String(candidateData.grade_applying_to), 10);
  if (isNaN(gradeNum) || gradeNum < 6 || gradeNum > 11) {
    return NextResponse.json({ error: `Invalid grade: ${candidateData.grade_applying_to}` }, { status: 400 });
  }
  const gradeBand = gradeNum <= 7 ? "6-7" : gradeNum === 8 ? "8" : "9-11";

  // Get active cycle
  const { data: cycle } = await supabaseAdmin
    .from("application_cycles")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("status", "active")
    .limit(1)
    .single();

  // Get tenant settings for auto-invite + language
  const { data: settings } = await supabaseAdmin
    .from("tenant_settings")
    .select("auto_invite_on_import, invite_deadline_days, default_language")
    .eq("tenant_id", tenantId)
    .single();

  const autoInvite = settings?.auto_invite_on_import ?? false;
  const deadlineDays = settings?.invite_deadline_days ?? 7;
  const language = (settings?.default_language as "en" | "pt") ?? "en";

  // Create candidate
  const { data: candidate, error: candErr } = await supabaseAdmin
    .from("candidates")
    .insert({
      tenant_id: tenantId,
      cycle_id: cycle?.id ?? null,
      first_name: candidateData.first_name.trim(),
      last_name: candidateData.last_name.trim(),
      grade_applying_to: String(gradeNum),
      grade_band: gradeBand,
      date_of_birth: candidateData.date_of_birth || null,
      status: "invited",
    })
    .select()
    .single();

  if (candErr) {
    return NextResponse.json({ error: candErr.message }, { status: 500 });
  }

  // Create invite record
  const token = crypto.randomUUID();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + deadlineDays);

  await supabaseAdmin.from("invites").insert({
    candidate_id: candidate.id,
    tenant_id: tenantId,
    token,
    sent_to_email: email,
    sent_at: autoInvite ? new Date().toISOString() : null,
    expires_at: expiresAt.toISOString(),
    status: "pending",
  });

  // Auto-send invite if enabled
  let inviteSent = false;
  if (autoInvite) {
    const { data: tenant } = await supabaseAdmin
      .from("tenants")
      .select("name")
      .eq("id", tenantId)
      .single();

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    try {
      await sendInviteEmail({
        to: email,
        candidateFirstName: candidateData.first_name.trim(),
        schoolName: tenant?.name ?? "Your School",
        link: `${appUrl}/invite/${token}`,
        expiresAt,
        language,
      });

      // Log invitation
      await supabaseAdmin.from("invitation_log").insert({
        candidate_id: candidate.id,
        tenant_id: tenantId,
        trigger_type: "sis_webhook",
        triggered_by_sis: sisProvider,
        email_sent_to: email,
      });

      inviteSent = true;
    } catch (err) {
      console.error("[sis-inbound] Failed to send invite email:", err);
    }
  }

  // Populate application data if SIS payload includes it
  const appData = payload.application_data as Record<string, unknown> | undefined;
  if (appData && typeof appData === "object") {
    try {
      await supabaseAdmin
        .from("candidate_application_data")
        .upsert(
          {
            candidate_id: candidate.id,
            tenant_id: tenantId,
            cycle_id: cycle?.id ?? null,
            gpa_current: appData.gpa ?? null,
            current_school: appData.current_school ?? null,
            isee_score: appData.isee_score ?? null,
            isee_percentile: appData.isee_percentile ?? null,
            ssat_score: appData.ssat_score ?? null,
            ssat_percentile: appData.ssat_percentile ?? null,
            application_complete: appData.application_complete ?? false,
            sis_source: sisProvider,
            sis_external_id: sisAppId ?? null,
            sis_last_synced_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "candidate_id,cycle_id" }
        );
    } catch (err) {
      console.error("[sis-inbound] Failed to save application data:", err);
    }
  }

  // Audit log
  await writeAuditLog(supabaseAdmin, {
    tenant_id: tenantId,
    action: "sis_candidate_created",
    candidate_id: candidate.id,
    payload: {
      sis_provider: sisProvider,
      sis_application_id: sisAppId,
      auto_invited: inviteSent,
      email,
    },
  });

  return NextResponse.json({
    success: true,
    candidate_id: candidate.id,
    token,
    invite_sent: inviteSent,
  }, { status: 201 });
}
