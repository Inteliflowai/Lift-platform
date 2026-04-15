import { getTenantContext } from "@/lib/tenant";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { SettingsClient } from "./settings-client";

export default async function SchoolSettingsPage() {
  const { tenantId, isPlatformAdmin } = await getTenantContext();

  let { data: settings } = await supabaseAdmin
    .from("tenant_settings")
    .select("*")
    .eq("tenant_id", tenantId)
    .single();

  // Auto-create settings if missing (can happen if registration insert failed silently)
  if (!settings) {
    const { data: created } = await supabaseAdmin
      .from("tenant_settings")
      .insert({ tenant_id: tenantId })
      .select()
      .single();
    settings = created;
  }

  const { data: tenant } = await supabaseAdmin
    .from("tenants")
    .select("core_integration_enabled, core_tenant_id")
    .eq("id", tenantId)
    .single();

  return (
    <SettingsClient
      settings={settings}
      coreIntegration={tenant ? {
        enabled: tenant.core_integration_enabled ?? false,
        coreTenantId: tenant.core_tenant_id ?? "",
      } : null}
      isPlatformAdmin={isPlatformAdmin}
      tenantId={tenantId}
    />
  );
}
