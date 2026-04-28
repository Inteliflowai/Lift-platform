import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendInviteEmail } from "@/lib/email";
import { writeAuditLog } from "@/lib/audit";
import crypto from "crypto";

export type TriggerType = "manual" | "bulk_send" | "import" | "sis_webhook" | "resend";

export interface SendInviteOptions {
  candidateId: string;
  tenantId: string;
  triggerType: TriggerType;
  triggeredByUserId?: string;
  triggeredBySis?: string;
  deadlineDays?: number;
}

export interface SendInviteResult {
  success: boolean;
  token?: string;
  error?: string;
  alreadySent?: boolean;
}

/**
 * Sends (or resends) an invitation for an already-created candidate.
 * Expects the candidate + invite records to already exist in the DB.
 * For new candidates, use the /api/school/candidates/invite route instead.
 */
export async function sendCandidateInvite(
  opts: SendInviteOptions
): Promise<SendInviteResult> {
  try {
    // Get candidate
    const { data: candidate } = await supabaseAdmin
      .from("candidates")
      .select("id, first_name, last_name, tenant_id, is_demo")
      .eq("id", opts.candidateId)
      .eq("tenant_id", opts.tenantId)
      .single();

    if (!candidate) {
      return { success: false, error: "Candidate not found" };
    }

    // Get the latest invite for this candidate
    const { data: invite } = await supabaseAdmin
      .from("invites")
      .select("id, token, sent_to_email, sent_at, status")
      .eq("candidate_id", opts.candidateId)
      .eq("tenant_id", opts.tenantId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!invite) {
      return { success: false, error: "No invite record found for this candidate" };
    }

    // Check if already sent (unless this is a resend)
    if (invite.sent_at && opts.triggerType !== "resend") {
      return { success: false, alreadySent: true, error: "Invitation already sent" };
    }

    // Get tenant + settings
    const { data: tenant } = await supabaseAdmin
      .from("tenants")
      .select("name")
      .eq("id", opts.tenantId)
      .single();

    const { data: settings } = await supabaseAdmin
      .from("tenant_settings")
      .select("default_language, invite_deadline_days")
      .eq("tenant_id", opts.tenantId)
      .single();

    const language = (settings?.default_language as "en" | "pt") ?? "en";
    const deadlineDays = opts.deadlineDays ?? settings?.invite_deadline_days ?? 7;

    // If resending, mark old invite as resent and create new one
    let activeToken = invite.token;
    let activeInviteId = invite.id;

    if (opts.triggerType === "resend" && invite.sent_at) {
      await supabaseAdmin
        .from("invites")
        .update({ status: "resent" })
        .eq("id", invite.id);

      const newToken = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + deadlineDays);

      const { data: newInvite } = await supabaseAdmin
        .from("invites")
        .insert({
          candidate_id: opts.candidateId,
          tenant_id: opts.tenantId,
          token: newToken,
          sent_to_email: invite.sent_to_email,
          sent_at: new Date().toISOString(),
          expires_at: expiresAt.toISOString(),
          status: "pending",
        })
        .select("id")
        .single();

      activeToken = newToken;
      activeInviteId = newInvite?.id ?? activeInviteId;
    } else {
      // Update the existing invite with sent_at and expires
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + deadlineDays);

      await supabaseAdmin
        .from("invites")
        .update({
          sent_at: new Date().toISOString(),
          expires_at: expiresAt.toISOString(),
        })
        .eq("id", invite.id);
    }

    // Build link and send email
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const link = `${appUrl}/invite/${activeToken}`;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + deadlineDays);

    await sendInviteEmail({
      to: invite.sent_to_email,
      candidateFirstName: candidate.first_name,
      schoolName: tenant?.name ?? "Your School",
      link,
      expiresAt,
      language,
    });

    // Log to invitation_log
    await supabaseAdmin.from("invitation_log").insert({
      candidate_id: opts.candidateId,
      invite_id: activeInviteId,
      tenant_id: opts.tenantId,
      trigger_type: opts.triggerType,
      triggered_by_user_id: opts.triggeredByUserId ?? null,
      triggered_by_sis: opts.triggeredBySis ?? null,
      email_sent_to: invite.sent_to_email,
    });

    // Audit log
    await writeAuditLog(supabaseAdmin, {
      tenant_id: opts.tenantId,
      actor_id: opts.triggeredByUserId ?? null,
      candidate_id: opts.candidateId,
      action: opts.triggerType === "resend" ? "invite_resent" : "invite_sent",
      payload: {
        trigger_type: opts.triggerType,
        email: invite.sent_to_email,
        token: activeToken,
        triggered_by_sis: opts.triggeredBySis,
      },
    });

    // Soft-archive seeded sample candidates once a real (non-demo) invite
    // goes out. Idempotent — once demos are hidden they stay hidden, and
    // resends/imports/SIS pushes after that are no-ops here. The "Show
    // sample candidates" toggle on /school/candidates surfaces them again
    // if needed.
    if (!candidate.is_demo) {
      await supabaseAdmin
        .from("candidates")
        .update({ hidden_from_default_view: true })
        .eq("tenant_id", opts.tenantId)
        .eq("is_demo", true)
        .eq("hidden_from_default_view", false);
    }

    return { success: true, token: activeToken };
  } catch (err) {
    console.error("[invitations] sendCandidateInvite error:", err);
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}
