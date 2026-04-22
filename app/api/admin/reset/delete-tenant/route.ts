export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/lib/audit";

export async function POST(req: NextRequest) {
  try {
    const { user, isPlatformAdmin, tenantId: adminTenantId } = await getTenantContext();
    if (!isPlatformAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { tenant_id, confirm_name } = await req.json();
    if (!tenant_id || !confirm_name) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    if (tenant_id === adminTenantId) {
      return NextResponse.json(
        { error: "Cannot delete your own tenant" },
        { status: 400 }
      );
    }

    const { data: tenant, error: tenantErr } = await supabaseAdmin
      .from("tenants")
      .select("name")
      .eq("id", tenant_id)
      .single();

    if (tenantErr || !tenant) {
      console.error("[delete-tenant] tenant lookup failed:", tenantErr);
      return NextResponse.json(
        { error: "Tenant not found", detail: tenantErr?.message },
        { status: 404 }
      );
    }

    if (confirm_name !== tenant.name) {
      return NextResponse.json(
        { error: "Confirmation name does not match" },
        { status: 400 }
      );
    }

    const { error: logErr } = await supabaseAdmin.from("admin_reset_log").insert({
      performed_by: user.id,
      tenant_id,
      tenant_name: tenant.name,
      reset_type: "delete_tenant",
    });

    if (logErr) {
      console.error("[delete-tenant] admin_reset_log insert failed:", logErr);
      return NextResponse.json(
        { error: "admin_reset_log insert failed", detail: logErr.message, code: logErr.code },
        { status: 500 }
      );
    }

    const { error: delErr } = await supabaseAdmin
      .from("tenants")
      .delete()
      .eq("id", tenant_id);

    if (delErr) {
      console.error("[delete-tenant] tenants delete failed:", delErr);
      return NextResponse.json(
        { error: "Tenant delete failed", detail: delErr.message, code: delErr.code },
        { status: 500 }
      );
    }

    await writeAuditLog(supabaseAdmin, {
      tenant_id: null,
      actor_id: user.id,
      action: "admin_delete_tenant",
      payload: { tenant_name: tenant.name, tenant_id },
    });

    return NextResponse.json({ success: true, tenant_name: tenant.name });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error("[delete-tenant] uncaught error:", message, stack);
    return NextResponse.json(
      { error: "Unexpected failure", detail: message },
      { status: 500 }
    );
  }
}
