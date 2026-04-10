export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const { user, isPlatformAdmin, tenantId: adminTenantId } = await getTenantContext();
  if (!isPlatformAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { tenant_id, confirm_name } = await req.json();
  if (!tenant_id || !confirm_name) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // Safety: never delete the admin's own tenant
  if (tenant_id === adminTenantId) {
    return NextResponse.json(
      { error: "Cannot delete your own tenant" },
      { status: 400 }
    );
  }

  const { data: tenant } = await supabaseAdmin
    .from("tenants")
    .select("name")
    .eq("id", tenant_id)
    .single();

  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  if (confirm_name !== tenant.name) {
    return NextResponse.json(
      { error: "Confirmation name does not match" },
      { status: 400 }
    );
  }

  // Log before deletion (tenant will be gone after)
  await supabaseAdmin.from("admin_reset_log").insert({
    performed_by: user.id,
    tenant_id,
    tenant_name: tenant.name,
    reset_type: "delete_tenant",
  });

  // Delete tenant — cascades everything
  const { error } = await supabaseAdmin
    .from("tenants")
    .delete()
    .eq("id", tenant_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Audit log (tenant_id set null due to cascade)
  await writeAuditLog(supabaseAdmin, {
    tenant_id: null,
    actor_id: user.id,
    action: "admin_delete_tenant",
    payload: { tenant_name: tenant.name, tenant_id },
  });

  return NextResponse.json({ success: true, tenant_name: tenant.name });
}
