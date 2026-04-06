import { getTenantContext } from "@/lib/tenant";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { SettingsClient } from "./settings-client";

export default async function SchoolSettingsPage() {
  const { tenantId } = await getTenantContext();

  const { data: settings } = await supabaseAdmin
    .from("tenant_settings")
    .select("*")
    .eq("tenant_id", tenantId)
    .single();

  return <SettingsClient settings={settings} />;
}
