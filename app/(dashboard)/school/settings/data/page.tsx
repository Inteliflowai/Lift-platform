import { getTenantContext } from "@/lib/tenant";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { DataPrivacyClient } from "./data-client";

export const dynamic = "force-dynamic";

export default async function DataPrivacyPage() {
  const { tenantId } = await getTenantContext();

  const { data: settings } = await supabaseAdmin
    .from("tenant_settings")
    .select("data_retention_days")
    .eq("tenant_id", tenantId)
    .single();

  const { data: cycles } = await supabaseAdmin
    .from("application_cycles")
    .select("id, name")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  const { data: exports } = await supabaseAdmin
    .from("data_export_requests")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(10);

  return (
    <DataPrivacyClient
      retentionDays={settings?.data_retention_days ?? 1095}
      cycles={cycles ?? []}
      exports={exports ?? []}
    />
  );
}
