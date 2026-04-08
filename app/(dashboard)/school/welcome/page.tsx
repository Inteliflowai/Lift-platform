import { redirect } from "next/navigation";
import { getTenantContext } from "@/lib/tenant";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { WelcomeClient } from "./welcome-client";

export const dynamic = "force-dynamic";

export default async function WelcomePage() {
  const { user, tenantId, tenant } = await getTenantContext();

  // Check if welcome already completed
  const { data: settings } = await supabaseAdmin
    .from("tenant_settings")
    .select("welcome_completed")
    .eq("tenant_id", tenantId)
    .single();

  if (settings?.welcome_completed) {
    redirect("/school");
  }

  // Get trial info
  const { data: license } = await supabaseAdmin
    .from("tenant_licenses")
    .select("trial_ends_at")
    .eq("tenant_id", tenantId)
    .single();

  const { data: profile } = await supabaseAdmin
    .from("users")
    .select("full_name")
    .eq("id", user.id)
    .single();

  const trialEndsAt = license?.trial_ends_at
    ? new Date(license.trial_ends_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <WelcomeClient
      firstName={profile?.full_name?.split(" ")[0] ?? "there"}
      schoolName={tenant?.name ?? "Your school"}
      trialEndsAt={trialEndsAt}
      tenantId={tenantId}
    />
  );
}
