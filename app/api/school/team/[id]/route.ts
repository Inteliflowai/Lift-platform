import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/lib/audit";

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
