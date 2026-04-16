export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/lib/audit";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { tenantId, user } = await getTenantContext();
  const { invite_id, email } = await req.json();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }

  // Verify candidate belongs to this tenant
  const { data: candidate } = await supabaseAdmin
    .from("candidates")
    .select("id")
    .eq("id", params.id)
    .eq("tenant_id", tenantId)
    .single();

  if (!candidate) {
    return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
  }

  // Update the invite email
  if (invite_id) {
    await supabaseAdmin
      .from("invites")
      .update({ sent_to_email: email.toLowerCase().trim() })
      .eq("id", invite_id)
      .eq("tenant_id", tenantId);
  } else {
    // Update the most recent invite for this candidate
    const { data: latestInvite } = await supabaseAdmin
      .from("invites")
      .select("id")
      .eq("candidate_id", params.id)
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (latestInvite) {
      await supabaseAdmin
        .from("invites")
        .update({ sent_to_email: email.toLowerCase().trim() })
        .eq("id", latestInvite.id);
    }
  }

  await writeAuditLog(supabaseAdmin, {
    tenant_id: tenantId,
    actor_id: user.id,
    candidate_id: params.id,
    action: "candidate_email_updated",
    payload: { new_email: email },
  });

  return NextResponse.json({ ok: true });
}
