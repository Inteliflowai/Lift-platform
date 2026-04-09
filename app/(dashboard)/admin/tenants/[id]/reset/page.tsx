import { supabaseAdmin } from "@/lib/supabase/admin";
import { ResetClient } from "./reset-client";

export const dynamic = "force-dynamic";

export default async function TenantResetPage({
  params,
}: {
  params: { id: string };
}) {
  const tenantId = params.id;

  const [tenantRes, licenseRes, countsRes, resetLogRes] = await Promise.all([
    supabaseAdmin.from("tenants").select("name, slug, status").eq("id", tenantId).single(),
    supabaseAdmin.from("tenant_licenses").select("tier, status, trial_ends_at, current_period_ends_at").eq("tenant_id", tenantId).single(),
    Promise.all([
      supabaseAdmin.from("candidates").select("*", { count: "exact", head: true }).eq("tenant_id", tenantId),
      supabaseAdmin.from("sessions").select("*", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("status", "completed"),
      supabaseAdmin.from("evaluator_reviews").select("*", { count: "exact", head: true }).eq("tenant_id", tenantId),
      supabaseAdmin.from("report_exports").select("*", { count: "exact", head: true }).eq("tenant_id", tenantId),
    ]),
    supabaseAdmin
      .from("admin_reset_log")
      .select("*, users:performed_by(full_name)")
      .eq("tenant_id", tenantId)
      .order("performed_at", { ascending: false })
      .limit(20),
  ]);

  if (!tenantRes.data) {
    return <div className="py-16 text-center text-muted">Tenant not found.</div>;
  }

  return (
    <ResetClient
      tenantId={tenantId}
      tenantName={tenantRes.data.name}
      tenantSlug={tenantRes.data.slug}
      tenantStatus={tenantRes.data.status}
      license={licenseRes.data}
      counts={{
        candidates: countsRes[0].count ?? 0,
        completedSessions: countsRes[1].count ?? 0,
        evaluatorReviews: countsRes[2].count ?? 0,
        reportExports: countsRes[3].count ?? 0,
      }}
      resetLog={resetLogRes.data ?? []}
    />
  );
}
