export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/lib/audit";
import { sendInviteEmail } from "@/lib/email";
import crypto from "crypto";

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { tenantId, tenant, user } = await getTenantContext();

  // Get candidate
  const { data: candidate, error: candErr } = await supabaseAdmin
    .from("candidates")
    .select("*")
    .eq("id", params.id)
    .eq("tenant_id", tenantId)
    .single();

  if (candErr || !candidate) {
    return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
  }

  // Get latest invite
  const { data: oldInvite } = await supabaseAdmin
    .from("invites")
    .select("*")
    .eq("candidate_id", params.id)
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!oldInvite) {
    return NextResponse.json({ error: "No existing invite found" }, { status: 404 });
  }

  // Mark old invite as resent
  await supabaseAdmin
    .from("invites")
    .update({ status: "resent" })
    .eq("id", oldInvite.id);

  // Generate new token and invite
  const token = crypto.randomUUID();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await supabaseAdmin.from("invites").insert({
    candidate_id: params.id,
    tenant_id: tenantId,
    token,
    sent_to_email: oldInvite.sent_to_email,
    sent_at: new Date().toISOString(),
    expires_at: expiresAt.toISOString(),
    status: "pending",
  });

  // Send email
  const { data: settings } = await supabaseAdmin
    .from("tenant_settings")
    .select("default_language")
    .eq("tenant_id", tenantId)
    .single();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const link = `${appUrl}/invite/${token}`;

  await sendInviteEmail({
    to: oldInvite.sent_to_email,
    candidateFirstName: candidate.first_name,
    schoolName: tenant?.name ?? "Your School",
    link,
    expiresAt,
    language: (settings?.default_language as "en" | "pt") ?? "en",
  });

  await writeAuditLog(supabaseAdmin, {
    tenant_id: tenantId,
    actor_id: user.id,
    candidate_id: params.id,
    action: "invite_resent",
    payload: { email: oldInvite.sent_to_email, new_token: token },
  });

  return NextResponse.json({ ok: true, token });
}
