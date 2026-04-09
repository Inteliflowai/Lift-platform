import { getTenantContext } from "@/lib/tenant";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { AnalyticsClient } from "./analytics-client";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const { tenantId } = await getTenantContext();

  const { data: cycles } = await supabaseAdmin
    .from("application_cycles")
    .select("id, name, status")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  const activeCycle = cycles?.find((c) => c.status === "active") ?? cycles?.[0];

  return (
    <AnalyticsClient
      cycles={cycles ?? []}
      defaultCycleId={activeCycle?.id ?? null}
    />
  );
}
