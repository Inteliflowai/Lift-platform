import { getTenantContext } from "@/lib/tenant";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { AdminAuditClient } from "./admin-audit-client";

export const dynamic = "force-dynamic";

export default async function AdminAuditPage() {
  const { isPlatformAdmin } = await getTenantContext();
  if (!isPlatformAdmin) redirect("/unauthorized");

  // Fetch recent audit logs across all tenants
  const { data: logs } = await supabaseAdmin
    .from("audit_logs")
    .select("id, tenant_id, actor_id, candidate_id, action, payload, occurred_at, tenants(name), users!audit_logs_actor_id_fkey(full_name, email)")
    .order("occurred_at", { ascending: false })
    .limit(200);

  return <AdminAuditClient logs={logs ?? []} />;
}
