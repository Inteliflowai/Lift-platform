import { supabaseAdmin } from "@/lib/supabase/admin";
import { TIER_PRICING } from "@/lib/licensing/features";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const now = new Date();
  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [activeRes, trialRes, expiringRes, pendingRes, pastDueRes, allLicenses] =
    await Promise.all([
      supabaseAdmin
        .from("tenant_licenses")
        .select("*", { count: "exact", head: true })
        .eq("status", "active"),
      supabaseAdmin
        .from("tenant_licenses")
        .select("*", { count: "exact", head: true })
        .eq("status", "trialing"),
      supabaseAdmin
        .from("tenant_licenses")
        .select("*", { count: "exact", head: true })
        .eq("status", "trialing")
        .lte("trial_ends_at", weekFromNow.toISOString())
        .gte("trial_ends_at", now.toISOString()),
      supabaseAdmin
        .from("upgrade_requests")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending"),
      supabaseAdmin
        .from("tenant_licenses")
        .select("*", { count: "exact", head: true })
        .eq("status", "past_due"),
      supabaseAdmin
        .from("tenant_licenses")
        .select("tier")
        .eq("status", "active"),
    ]);

  // Calculate MRR/ARR from active licenses
  const tierPricing: Record<string, number> = {
    essentials: TIER_PRICING.essentials.annual,
    professional: TIER_PRICING.professional.annual,
    enterprise: TIER_PRICING.enterprise.annual,
  };

  let totalARR = 0;
  for (const lic of allLicenses.data ?? []) {
    totalARR += tierPricing[lic.tier] ?? 0;
  }
  const mrr = Math.round(totalARR / 12);

  const stats = [
    { label: "Active Schools", value: activeRes.count ?? 0, href: "/admin/licenses" },
    { label: "In Trial", value: trialRes.count ?? 0, href: "/admin/licenses" },
    { label: "MRR", value: `$${mrr.toLocaleString()}`, href: "/admin/licenses/revenue" },
    { label: "ARR", value: `$${totalARR.toLocaleString()}`, href: "/admin/licenses/revenue" },
    { label: "Trials Expiring This Week", value: expiringRes.count ?? 0, href: "/admin/licenses/health", highlight: (expiringRes.count ?? 0) > 0 },
    { label: "Pending Upgrades", value: pendingRes.count ?? 0, href: "/admin/licenses", highlight: (pendingRes.count ?? 0) > 0 },
    { label: "Past Due", value: pastDueRes.count ?? 0, href: "/admin/licenses", highlight: (pastDueRes.count ?? 0) > 0 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Platform Admin</h1>
        <p className="mt-1 text-muted">Business overview and system management.</p>
      </div>

      {/* Business Overview */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="rounded-lg border border-lift-border bg-surface p-4 hover:border-primary/30 transition-colors"
          >
            <p className="text-xs text-muted">{s.label}</p>
            <p
              className={`mt-1 text-2xl font-bold ${
                "highlight" in s && s.highlight ? "text-review" : "text-lift-text"
              }`}
            >
              {s.value}
            </p>
          </Link>
        ))}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-3 gap-4">
        <Link
          href="/admin/tenants"
          className="rounded-lg border border-lift-border bg-surface p-4 text-sm font-medium text-lift-text hover:border-primary/30 transition-colors"
        >
          Manage Tenants
        </Link>
        <Link
          href="/admin/licenses/health"
          className="rounded-lg border border-lift-border bg-surface p-4 text-sm font-medium text-lift-text hover:border-primary/30 transition-colors"
        >
          License Health
        </Link>
        <Link
          href="/admin/licenses/revenue"
          className="rounded-lg border border-lift-border bg-surface p-4 text-sm font-medium text-lift-text hover:border-primary/30 transition-colors"
        >
          Revenue Report
        </Link>
      </div>

      {/* Dev Tools — only when LIFT_DEV_MODE=true */}
      {process.env.LIFT_DEV_MODE === "true" && (
        <DevTools />
      )}
    </div>
  );
}

function DevTools() {
  return (
    <div className="rounded-lg border-2 border-review/30 bg-review/5 p-5">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-review">
        Developer Tools
        <span className="rounded bg-review/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wider">Dev Only</span>
      </h2>
      <p className="mt-1 text-xs text-muted">Hidden in production (LIFT_DEV_MODE=false)</p>
      <div className="mt-4 flex gap-3">
        <form action="/api/admin/reset/dev-wipe-all" method="POST">
          <button
            type="submit"
            className="rounded-lg border border-review/30 px-4 py-2 text-xs font-medium text-review hover:bg-review/10"
          >
            Wipe All Non-Hillside Tenants
          </button>
        </form>
        <Link
          href="/admin/tenants"
          className="rounded-lg border border-lift-border px-4 py-2 text-xs font-medium text-muted hover:bg-surface"
        >
          Manage Individual Tenants
        </Link>
      </div>
    </div>
  );
}
