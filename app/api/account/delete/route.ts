import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/lib/audit";

export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { confirm } = await req.json();
  if (confirm !== "DELETE") {
    return NextResponse.json({ error: "Type DELETE to confirm" }, { status: 400 });
  }

  // Check if sole school_admin
  const { data: roles } = await supabaseAdmin
    .from("user_tenant_roles")
    .select("tenant_id, role")
    .eq("user_id", user.id)
    .eq("role", "school_admin");

  for (const role of roles ?? []) {
    const { count } = await supabaseAdmin
      .from("user_tenant_roles")
      .select("*", { count: "exact", head: true })
      .eq("tenant_id", role.tenant_id)
      .eq("role", "school_admin");

    if ((count ?? 0) <= 1) {
      return NextResponse.json({
        error: "You are the only administrator for your school. Please transfer admin rights or contact support before deleting your account.",
      }, { status: 400 });
    }
  }

  // Log before deletion
  const tenantId = roles?.[0]?.tenant_id;
  if (tenantId) {
    await writeAuditLog(supabaseAdmin, {
      tenant_id: tenantId,
      actor_id: user.id,
      action: "account_deleted",
      payload: { email: user.email },
    });
  }

  // Delete user
  await supabaseAdmin.from("users").delete().eq("id", user.id);
  await supabaseAdmin.auth.admin.deleteUser(user.id);

  return NextResponse.json({ success: true });
}
