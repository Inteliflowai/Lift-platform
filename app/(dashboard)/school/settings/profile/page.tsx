import { getTenantContext } from "@/lib/tenant";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { ProfileClient } from "./profile-client";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const { user, tenantId } = await getTenantContext();

  const { data: profile } = await supabaseAdmin
    .from("users")
    .select("full_name, avatar_url, email")
    .eq("id", user.id)
    .single();

  const { data: role } = await supabaseAdmin
    .from("user_tenant_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("tenant_id", tenantId)
    .single();

  return (
    <ProfileClient
      userId={user.id}
      email={user.email ?? profile?.email ?? ""}
      fullName={profile?.full_name ?? ""}
      avatarUrl={profile?.avatar_url ?? null}
      role={role?.role ?? ""}
    />
  );
}
