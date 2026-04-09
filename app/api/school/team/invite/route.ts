import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/lib/audit";
import { sendTeamInviteEmail } from "@/lib/email";
import { markOnboardingStep } from "@/lib/onboarding";

export async function POST(req: NextRequest) {
  const { tenantId, tenant, user } = await getTenantContext();
  const body = await req.json();
  const { email, role } = body;

  if (!email || !role) {
    return NextResponse.json({ error: "Email and role required" }, { status: 400 });
  }

  if (!["evaluator", "interviewer"].includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  // Create or find user via Supabase Auth
  let targetUserId: string;
  const { data: existing } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("email", email)
    .single();

  if (existing) {
    targetUserId = existing.id;
  } else {
    // Create user with magic link
    const { data: authUser, error: authErr } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { full_name: "" },
      });
    if (authErr) {
      return NextResponse.json({ error: authErr.message }, { status: 500 });
    }
    targetUserId = authUser.user.id;
  }

  // Check if role already exists
  const { data: existingRole } = await supabaseAdmin
    .from("user_tenant_roles")
    .select("id")
    .eq("user_id", targetUserId)
    .eq("tenant_id", tenantId)
    .eq("role", role)
    .single();

  if (existingRole) {
    return NextResponse.json({ error: "User already has this role" }, { status: 409 });
  }

  // Assign role
  const { error: roleErr } = await supabaseAdmin
    .from("user_tenant_roles")
    .insert({
      user_id: targetUserId,
      tenant_id: tenantId,
      role,
      granted_by: user.id,
    });

  if (roleErr) return NextResponse.json({ error: roleErr.message }, { status: 500 });

  // Generate magic link for login
  const { data: linkData } = await supabaseAdmin.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/school`,
    },
  });

  // Send invite email (non-blocking — don't fail if Resend is not configured)
  const schoolName = tenant?.name ?? "Your School";
  if (linkData?.properties?.action_link) {
    try {
      await sendTeamInviteEmail({
        to: email,
        schoolName,
        role,
        link: linkData.properties.action_link,
      });
    } catch (emailErr) {
      console.error("Team invite email failed:", emailErr);
    }
  }

  await writeAuditLog(supabaseAdmin, {
    tenant_id: tenantId,
    actor_id: user.id,
    action: "team_member_invited",
    payload: { email, role },
  });

  if (role === "evaluator") {
    markOnboardingStep(tenantId, "evaluator_invited").catch(() => {});
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
