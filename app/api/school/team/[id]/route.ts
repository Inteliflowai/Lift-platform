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
  const body = await req.json();
  const { email, new_role } = body;

  // Get the role entry
  const { data: roleEntry } = await supabaseAdmin
    .from("user_tenant_roles")
    .select("user_id, role")
    .eq("id", params.id)
    .eq("tenant_id", tenantId)
    .single();

  if (!roleEntry) {
    return NextResponse.json({ error: "Team member not found" }, { status: 404 });
  }

  // Handle role change
  if (new_role) {
    const schoolRoles = ["evaluator", "interviewer", "grade_dean", "learning_specialist"];
    if (!schoolRoles.includes(new_role)) {
      return NextResponse.json({ error: "Invalid role for school team" }, { status: 400 });
    }

    // Check if target role already exists
    const { data: existing } = await supabaseAdmin
      .from("user_tenant_roles")
      .select("id")
      .eq("user_id", roleEntry.user_id)
      .eq("tenant_id", tenantId)
      .eq("role", new_role)
      .maybeSingle();

    if (existing) {
      await supabaseAdmin.from("user_tenant_roles").delete().eq("id", params.id);
    } else {
      await supabaseAdmin
        .from("user_tenant_roles")
        .update({ role: new_role })
        .eq("id", params.id);
    }

    await writeAuditLog(supabaseAdmin, {
      tenant_id: tenantId,
      actor_id: user.id,
      action: "team_role_changed",
      payload: { role_id: params.id, user_id: roleEntry.user_id, old_role: roleEntry.role, new_role },
    });

    return NextResponse.json({ ok: true });
  }

  // Handle email change
  if (email) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Valid email required" }, { status: 400 });
    }

    await supabaseAdmin
      .from("users")
      .update({ email: email.toLowerCase().trim() })
      .eq("id", roleEntry.user_id);

    await supabaseAdmin.auth.admin.updateUserById(roleEntry.user_id, {
      email: email.toLowerCase().trim(),
    }).catch(() => {});

    await writeAuditLog(supabaseAdmin, {
      tenant_id: tenantId,
      actor_id: user.id,
      action: "team_email_updated",
      payload: { role_id: params.id, user_id: roleEntry.user_id, new_email: email },
    });

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "email or new_role required" }, { status: 400 });
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
