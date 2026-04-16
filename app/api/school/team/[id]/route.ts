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
  const { email } = await req.json();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }

  // Get the role to find the user_id
  const { data: role } = await supabaseAdmin
    .from("user_tenant_roles")
    .select("user_id")
    .eq("id", params.id)
    .eq("tenant_id", tenantId)
    .single();

  if (!role) {
    return NextResponse.json({ error: "Team member not found" }, { status: 404 });
  }

  // Update the user's email in users table
  const { error: updateErr } = await supabaseAdmin
    .from("users")
    .update({ email: email.toLowerCase().trim() })
    .eq("id", role.user_id);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  // Also update in Supabase Auth
  await supabaseAdmin.auth.admin.updateUserById(role.user_id, {
    email: email.toLowerCase().trim(),
  }).catch(() => {});

  await writeAuditLog(supabaseAdmin, {
    tenant_id: tenantId,
    actor_id: user.id,
    action: "team_email_updated",
    payload: { role_id: params.id, user_id: role.user_id, new_email: email },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { tenantId, user } = await getTenantContext();

  const { data: role, error: findErr } = await supabaseAdmin
    .from("user_tenant_roles")
    .select("*")
    .eq("id", params.id)
    .eq("tenant_id", tenantId)
    .single();

  if (findErr || !role) {
    return NextResponse.json({ error: "Role not found" }, { status: 404 });
  }

  const { error } = await supabaseAdmin
    .from("user_tenant_roles")
    .delete()
    .eq("id", params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await writeAuditLog(supabaseAdmin, {
    tenant_id: tenantId,
    actor_id: user.id,
    action: "role_revoked",
    payload: { role_id: params.id, revoked_user_id: role.user_id, role: role.role },
  });

  return NextResponse.json({ ok: true });
}
