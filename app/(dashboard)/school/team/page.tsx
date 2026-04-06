import { getTenantContext } from "@/lib/tenant";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { TeamClient } from "./team-client";

export default async function TeamPage() {
  const { tenantId } = await getTenantContext();

  const { data: members } = await supabaseAdmin
    .from("user_tenant_roles")
    .select("id, role, granted_at, users(id, email, full_name)")
    .eq("tenant_id", tenantId)
    .order("granted_at", { ascending: false });

  return <TeamClient members={members ?? []} />;
}
