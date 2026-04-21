import { FlagsClient } from "./flags-client";
import { getTenantContext } from "@/lib/tenant";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function SchoolFlagsPage() {
  const { tenantId } = await getTenantContext();
  const { data: cycles } = await supabaseAdmin
    .from("application_cycles")
    .select("id, name, status")
    .eq("tenant_id", tenantId)
    .in("status", ["active", "archived", "closed"])
    .order("created_at", { ascending: false });
  return <FlagsClient cycles={cycles ?? []} />;
}
