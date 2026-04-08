import { supabaseAdmin } from "@/lib/supabase/admin";
import { TIER_PRICING } from "@/lib/licensing/features";

export const dynamic = "force-dynamic";

const APPLICANT_TIER_MAP: Record<string, string> = {
  "Under 50": "essentials",
  "50-150": "essentials",
  "150-400": "professional",
  "400+": "enterprise",
};

export default async function RevenuePage() {
  // Active licenses by tier
  const { data: activeLicenses } = await supabaseAdmin
    .from("tenant_licenses")
    .select("tier")
    .eq("status", "active");

  const tierCounts: Record<string, number> = { essentials: 0, professional: 0, enterprise: 0 };
  for (const lic of activeLicenses ?? []) {
    if (lic.tier in tierCounts) tierCounts[lic.tier]++;
  }

  const tierRows = Object.entries(tierCounts).map(([tier, count]) => {
    const pricing = TIER_PRICING[tier as keyof typeof TIER_PRICING];
    return {
      tier: pricing?.label ?? tier,
      count,
      annual: pricing?.annual ?? 0,
      totalARR: count * (pricing?.annual ?? 0),
    };
  });

  const totalARR = tierRows.reduce((sum, r) => sum + r.totalARR, 0);
  const totalMRR = Math.round(totalARR / 12);

  // Pipeline estimate from trial schools
  const { data: trialTenants } = await supabaseAdmin
    .from("tenant_licenses")
    .select("tenant_id")
    .eq("status", "trialing");

  const trialTenantIds = (trialTenants ?? []).map((t) => t.tenant_id);

  let pipelineARR = 0;
  const trialCount = trialTenantIds.length;

  if (trialTenantIds.length > 0) {
    // Get registration events for estimated_applicants
    const { data: regEvents } = await supabaseAdmin
      .from("license_events")
      .select("tenant_id, payload")
      .in("tenant_id", trialTenantIds)
      .eq("event_type", "registration_completed");

    for (const ev of regEvents ?? []) {
      const applicants = (ev.payload as Record<string, string>)?.estimated_applicants;
      const expectedTier = APPLICANT_TIER_MAP[applicants ?? ""] ?? "professional";
      const pricing = TIER_PRICING[expectedTier as keyof typeof TIER_PRICING];
      pipelineARR += pricing?.annual ?? 0;
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold">Revenue Report</h1>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border border-lift-border bg-surface p-4">
          <p className="text-xs text-muted">Total ARR</p>
          <p className="mt-1 text-2xl font-bold text-lift-text">
            ${totalARR.toLocaleString()}
          </p>
        </div>
        <div className="rounded-lg border border-lift-border bg-surface p-4">
          <p className="text-xs text-muted">Monthly (MRR)</p>
          <p className="mt-1 text-2xl font-bold text-lift-text">
            ${totalMRR.toLocaleString()}
          </p>
        </div>
        <div className="rounded-lg border border-lift-border bg-surface p-4">
          <p className="text-xs text-muted">Active Schools</p>
          <p className="mt-1 text-2xl font-bold text-lift-text">
            {tierRows.reduce((s, r) => s + r.count, 0)}
          </p>
        </div>
      </div>

      {/* ARR Breakdown */}
      <div className="rounded-lg border border-lift-border overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-lift-border bg-surface text-xs text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Tier</th>
              <th className="px-4 py-3 font-medium text-right">Schools</th>
              <th className="px-4 py-3 font-medium text-right">Annual Fee</th>
              <th className="px-4 py-3 font-medium text-right">Tier ARR</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-lift-border">
            {tierRows.map((row) => (
              <tr key={row.tier} className="hover:bg-surface/50">
                <td className="px-4 py-3 font-medium">{row.tier}</td>
                <td className="px-4 py-3 text-right">{row.count}</td>
                <td className="px-4 py-3 text-right text-muted">
                  ${row.annual.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-right font-medium">
                  ${row.totalARR.toLocaleString()}
                </td>
              </tr>
            ))}
            <tr className="bg-surface font-semibold">
              <td className="px-4 py-3">Total</td>
              <td className="px-4 py-3 text-right">
                {tierRows.reduce((s, r) => s + r.count, 0)}
              </td>
              <td className="px-4 py-3 text-right" />
              <td className="px-4 py-3 text-right">
                ${totalARR.toLocaleString()}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Pipeline */}
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-5">
        <h2 className="text-sm font-semibold text-primary">Trial Pipeline</h2>
        <p className="mt-2 text-sm text-lift-text">
          <span className="font-bold">{trialCount}</span> schools currently in
          trial
        </p>
        <p className="mt-1 text-sm text-muted">
          Estimated pipeline value if all convert at expected tier:{" "}
          <span className="font-bold text-primary">
            ${pipelineARR.toLocaleString()}/yr
          </span>
        </p>
      </div>
    </div>
  );
}
