export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendLiftEmail } from "@/lib/emails/send";

export async function POST(req: NextRequest) {
  const { supabase, tenantId, user } = await getTenantContext();
  const { plan_id, user_ids } = await req.json();

  if (!plan_id || !user_ids?.length) {
    return NextResponse.json({ error: "plan_id and user_ids required" }, { status: 400 });
  }

  // Fetch plan with candidate info
  const { data: plan, error: planErr } = await supabase
    .from("support_plans")
    .select("*, candidates(first_name, last_name)")
    .eq("id", plan_id)
    .single();

  if (planErr || !plan) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }

  // Fetch recipient emails
  const { data: recipients } = await supabaseAdmin
    .from("users")
    .select("id, email, full_name")
    .in("id", user_ids);

  const candidate = plan.candidates as { first_name: string; last_name: string } | null;
  const candidateName = candidate
    ? `${candidate.first_name} ${candidate.last_name}`
    : "Unknown";

  // Send emails
  for (const recipient of recipients ?? []) {
    await sendLiftEmail({
      to: recipient.email,
      subject: `Support Plan Shared: ${candidateName}`,
      tenantId,
      content: `
        <h2 style="margin:0 0 12px;font-size:18px;color:#1a1a2e">Support Plan Shared</h2>
        <p>A support plan for <strong>${candidateName}</strong> has been shared with you.</p>
        <p>Support Level: <strong style="text-transform:capitalize">${plan.support_level}</strong></p>
        <p>Log in to your dashboard to view the full plan and checklist.</p>
      `,
    });
  }

  // Update plan
  const sharedWith = (user_ids as string[]).map((uid: string) => ({
    user_id: uid,
    shared_at: new Date().toISOString(),
    shared_by: user.id,
  }));

  const { data: updated, error: updateErr } = await supabase
    .from("support_plans")
    .update({
      status: "shared",
      shared_with: sharedWith,
      shared_at: new Date().toISOString(),
    })
    .eq("id", plan_id)
    .select()
    .single();

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  // Audit log
  await supabaseAdmin.from("audit_logs").insert({
    tenant_id: tenantId,
    user_id: user.id,
    action: "support_plan_shared",
    entity_type: "support_plan",
    entity_id: plan_id,
    metadata: { candidate_name: candidateName, shared_with: user_ids },
  });

  return NextResponse.json(updated);
}
