export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/lib/audit";

// PATCH — change a user's role (platform admin only)
export async function PATCH(req: NextRequest) {
  const { isPlatformAdmin, user } = await getTenantContext();
  if (!isPlatformAdmin) {
    return NextResponse.json({ error: "Platform admin only" }, { status: 403 });
  }

  const { role_id, new_role } = await req.json();
  const validRoles = ["platform_admin", "school_admin", "evaluator", "interviewer", "grade_dean", "learning_specialist"];

  if (!role_id || !new_role || !validRoles.includes(new_role)) {
    return NextResponse.json({ error: "Valid role_id and new_role required" }, { status: 400 });
  }

  // Get the current role entry
  const { data: roleEntry } = await supabaseAdmin
    .from("user_tenant_roles")
    .select("user_id, tenant_id, role")
    .eq("id", role_id)
    .single();

  if (!roleEntry) {
    return NextResponse.json({ error: "Role not found" }, { status: 404 });
  }

  // Check if target role already exists for this user+tenant
  const { data: existing } = await supabaseAdmin
    .from("user_tenant_roles")
    .select("id")
    .eq("user_id", roleEntry.user_id)
    .eq("tenant_id", roleEntry.tenant_id)
    .eq("role", new_role)
    .maybeSingle();

  if (existing) {
    // Delete the old role since new one already exists
    await supabaseAdmin.from("user_tenant_roles").delete().eq("id", role_id);
  } else {
    // Update the role
    await supabaseAdmin
      .from("user_tenant_roles")
      .update({ role: new_role })
      .eq("id", role_id);
  }

  await writeAuditLog(supabaseAdmin, {
    tenant_id: roleEntry.tenant_id,
    actor_id: user.id,
    action: "role_changed",
    payload: {
      role_id,
      user_id: roleEntry.user_id,
      old_role: roleEntry.role,
      new_role,
    },
  });

  return NextResponse.json({ ok: true });
}

// DELETE — remove a role (platform admin only)
export async function DELETE(req: NextRequest) {
  const { isPlatformAdmin, user } = await getTenantContext();
  if (!isPlatformAdmin) {
    return NextResponse.json({ error: "Platform admin only" }, { status: 403 });
  }

  const role_id = req.nextUrl.searchParams.get("role_id");
  if (!role_id) {
    return NextResponse.json({ error: "role_id required" }, { status: 400 });
  }

  const { data: roleEntry } = await supabaseAdmin
    .from("user_tenant_roles")
    .select("user_id, tenant_id, role")
    .eq("id", role_id)
    .single();

  if (!roleEntry) {
    return NextResponse.json({ error: "Role not found" }, { status: 404 });
  }

  await supabaseAdmin.from("user_tenant_roles").delete().eq("id", role_id);

  await writeAuditLog(supabaseAdmin, {
    tenant_id: roleEntry.tenant_id,
    actor_id: user.id,
    action: "role_removed",
    payload: { role_id, user_id: roleEntry.user_id, role: roleEntry.role },
  });

  return NextResponse.json({ ok: true });
}
