import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function getTenantContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: roles } = await supabase
    .from("user_tenant_roles")
    .select("role, tenant_id")
    .eq("user_id", user.id);

  if (!roles || roles.length === 0) redirect("/unauthorized");

  const isPlatformAdmin = roles.some((r) => r.role === "platform_admin");
  const tenantId = roles[0].tenant_id;
  const primaryRole = roles[0].role;

  const { data: tenant } = await supabase
    .from("tenants")
    .select("*")
    .eq("id", tenantId)
    .single();

  return { supabase, user, roles, isPlatformAdmin, tenantId, tenant, primaryRole };
}
