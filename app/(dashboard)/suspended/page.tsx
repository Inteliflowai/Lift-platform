import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { SuspendedClient } from "./suspended-client";

export const dynamic = "force-dynamic";

export default async function SuspendedPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: roles } = await supabase
    .from("user_tenant_roles")
    .select("role, tenant_id")
    .eq("user_id", user.id);

  const tenantId = roles?.[0]?.tenant_id;
  if (!tenantId) redirect("/login");

  const { data: license } = await supabaseAdmin
    .from("tenant_licenses")
    .select("status, suspended_reason, data_deletion_scheduled_at")
    .eq("tenant_id", tenantId)
    .single();

  // If not actually suspended, redirect to dashboard
  if (license?.status !== "suspended" && license?.status !== "cancelled") {
    redirect("/school");
  }

  const { data: tenant } = await supabaseAdmin
    .from("tenants")
    .select("name")
    .eq("id", tenantId)
    .single();

  const { data: profile } = await supabaseAdmin
    .from("users")
    .select("full_name")
    .eq("id", user.id)
    .single();

  const isTrialExpiry = license.suspended_reason === "trial_expired";

  return (
    <SuspendedClient
      schoolName={tenant?.name ?? "Your school"}
      firstName={profile?.full_name?.split(" ")[0] ?? "there"}
      isTrialExpiry={isTrialExpiry}
      dataDeletionDate={license.data_deletion_scheduled_at}
    />
  );
}
