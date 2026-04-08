import { supabaseAdmin } from "@/lib/supabase/admin";
import { LicenseDetailClient } from "./license-detail-client";

export const dynamic = "force-dynamic";

export default async function AdminLicenseDetailPage({
  params,
}: {
  params: { tenantId: string };
}) {
  const { tenantId } = params;

  const [licenseRes, tenantRes, requestsRes, eventsRes] = await Promise.all([
    supabaseAdmin
      .from("tenant_licenses")
      .select("*")
      .eq("tenant_id", tenantId)
      .single(),
    supabaseAdmin
      .from("tenants")
      .select("name, slug")
      .eq("id", tenantId)
      .single(),
    supabaseAdmin
      .from("upgrade_requests")
      .select("*, users!requested_by(full_name, email)")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(5),
    supabaseAdmin
      .from("license_events")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("occurred_at", { ascending: false })
      .limit(20),
  ]);

  if (!licenseRes.data || !tenantRes.data) {
    return (
      <div className="py-16 text-center text-muted">
        License not found for this tenant.
      </div>
    );
  }

  return (
    <LicenseDetailClient
      tenantId={tenantId}
      tenantName={tenantRes.data.name}
      license={licenseRes.data}
      upgradeRequests={requestsRes.data ?? []}
      events={eventsRes.data ?? []}
    />
  );
}
