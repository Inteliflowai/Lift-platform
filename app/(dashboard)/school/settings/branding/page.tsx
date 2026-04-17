import { getTenantContext } from "@/lib/tenant";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { checkFeature } from "@/lib/licensing/gate";
import { FEATURES } from "@/lib/licensing/features";
import { redirect } from "next/navigation";
import { BrandingClient } from "./branding-client";

export const dynamic = "force-dynamic";

export default async function BrandingPage() {
  const { tenantId } = await getTenantContext();

  const hasWL = await checkFeature(tenantId, FEATURES.WHITE_LABEL);
  if (!hasWL) {
    redirect("/school/settings");
  }

  const { data: settings } = await supabaseAdmin
    .from("tenant_settings")
    .select(
      "logo_url, wl_primary_color, wl_logo_dark_url, wl_favicon_url, wl_custom_domain, wl_custom_domain_verified, wl_hide_lift_branding, wl_email_from_name, wl_email_reply_to, wl_powered_by_visible"
    )
    .eq("tenant_id", tenantId)
    .single();

  return (
    <BrandingClient
      tenantId={tenantId}
      settings={{
        logoUrl: settings?.logo_url ?? "",
        logoDarkUrl: settings?.wl_logo_dark_url ?? "",
        faviconUrl: settings?.wl_favicon_url ?? "",
        primaryColor: settings?.wl_primary_color ?? "#14b8a6",
        customDomain: settings?.wl_custom_domain ?? "",
        domainVerified: settings?.wl_custom_domain_verified ?? false,
        hideLiftBranding: settings?.wl_hide_lift_branding ?? false,
        emailFromName: settings?.wl_email_from_name ?? "",
        emailReplyTo: settings?.wl_email_reply_to ?? "",
        poweredByVisible: settings?.wl_powered_by_visible ?? true,
      }}
    />
  );
}
