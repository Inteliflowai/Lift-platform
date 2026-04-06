import { getTenantContext } from "@/lib/tenant";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { AuditLogClient } from "./audit-log-client";

export const dynamic = "force-dynamic";

export default async function AuditLogPage() {
  const { tenantId } = await getTenantContext();

  const { data: logs } = await supabaseAdmin
    .from("audit_logs")
    .select("*, users(full_name, email), candidates(first_name, last_name)")
    .eq("tenant_id", tenantId)
    .order("occurred_at", { ascending: false })
    .limit(200);

  return <AuditLogClient logs={logs ?? []} />;
}
