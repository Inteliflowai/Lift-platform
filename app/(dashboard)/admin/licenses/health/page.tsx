import { supabaseAdmin } from "@/lib/supabase/admin";
import { TIER_LIMITS } from "@/lib/licensing/features";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function LicenseHealthPage() {
  const now = new Date();
  const year = now.getFullYear();

  // Funnel counts
  const [trialingRes, activeRes, suspendedRes, cancelledRes, allLicenses] =
    await Promise.all([
      supabaseAdmin.from("tenant_licenses").select("*", { count: "exact", head: true }).eq("status", "trialing"),
      supabaseAdmin.from("tenant_licenses").select("*", { count: "exact", head: true }).eq("status", "active"),
      supabaseAdmin.from("tenant_licenses").select("*", { count: "exact", head: true }).eq("status", "suspended"),
      supabaseAdmin.from("tenant_licenses").select("*", { count: "exact", head: true }).eq("status", "cancelled"),
      supabaseAdmin.from("tenant_licenses").select("*, tenants(name)"),
    ]);

  const convertedCount = (allLicenses.data ?? []).filter((l) => l.trial_converted).length;
  const expiredCount = (suspendedRes.count ?? 0);
  const conversionRate = convertedCount + expiredCount > 0
    ? Math.round((convertedCount / (convertedCount + expiredCount)) * 100)
    : 0;

  // Monthly trend (last 6 months)
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const { data: recentEvents } = await supabaseAdmin
    .from("license_events")
    .select("event_type, occurred_at")
    .in("event_type", ["trial_started", "tier_changed"])
    .gte("occurred_at", sixMonthsAgo.toISOString())
    .order("occurred_at");

  const months: { label: string; trials: number; conversions: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = d.toLocaleDateString("en-US", { month: "short" });
    const monthStart = d;
    const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
    const monthEvents = (recentEvents ?? []).filter((e) => {
      const t = new Date(e.occurred_at);
      return t >= monthStart && t <= monthEnd;
    });
    months.push({
      label,
      trials: monthEvents.filter((e) => e.event_type === "trial_started").length,
      conversions: monthEvents.filter((e) => e.event_type === "tier_changed").length,
    });
  }
  const maxBar = Math.max(1, ...months.map((m) => Math.max(m.trials, m.conversions)));

  // Attention required
  type AttentionItem = {
    id: string;
    tenantId: string;
    name: string;
    issue: string;
    severity: "rose" | "amber" | "indigo";
    detail: string;
    action: string;
    actionHref: string;
  };

  const attentionItems: AttentionItem[] = [];

  for (const lic of allLicenses.data ?? []) {
    const tenant = lic.tenants as unknown as { name: string } | null;
    const name = tenant?.name ?? "Unknown";

    // Trials expiring ≤7 days
    if (lic.status === "trialing" && lic.trial_ends_at) {
      const ends = new Date(lic.trial_ends_at);
      const daysLeft = Math.ceil((ends.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (daysLeft <= 7 && daysLeft >= 0) {
        attentionItems.push({
          id: lic.id + "-trial7",
          tenantId: lic.tenant_id,
          name,
          issue: "Trial expiring",
          severity: "rose",
          detail: `${daysLeft} day${daysLeft !== 1 ? "s" : ""} left`,
          action: "Extend / Contact",
          actionHref: `/admin/licenses/${lic.tenant_id}`,
        });
      } else if (daysLeft > 7 && daysLeft <= 14) {
        attentionItems.push({
          id: lic.id + "-trial14",
          tenantId: lic.tenant_id,
          name,
          issue: "Trial expiring soon",
          severity: "amber",
          detail: `${daysLeft} days left`,
          action: "Contact",
          actionHref: `/admin/licenses/${lic.tenant_id}`,
        });
      }
    }

    // Past due
    if (lic.status === "past_due") {
      attentionItems.push({
        id: lic.id + "-pastdue",
        tenantId: lic.tenant_id,
        name,
        issue: "Past due",
        severity: "rose",
        detail: "Payment overdue",
        action: "Contact",
        actionHref: `/admin/licenses/${lic.tenant_id}`,
      });
    }
  }

  // Session limit >80%
  const { data: usageData } = await supabaseAdmin
    .from("license_usage")
    .select("tenant_id, sessions_completed")
    .eq("period_year", year);

  const usageByTenant: Record<string, number> = {};
  for (const u of usageData ?? []) {
    usageByTenant[u.tenant_id] = (usageByTenant[u.tenant_id] ?? 0) + (u.sessions_completed ?? 0);
  }

  for (const lic of allLicenses.data ?? []) {
    const used = usageByTenant[lic.tenant_id] ?? 0;
    const tierLimits = TIER_LIMITS[lic.tier as keyof typeof TIER_LIMITS];
    const limit = lic.session_limit_override ?? tierLimits?.sessions_per_year;
    if (limit && used >= limit * 0.8) {
      const tenant = lic.tenants as unknown as { name: string } | null;
      attentionItems.push({
        id: lic.id + "-sessions",
        tenantId: lic.tenant_id,
        name: tenant?.name ?? "Unknown",
        issue: "Session limit >80%",
        severity: "amber",
        detail: `${used}/${limit} used`,
        action: "Upsell",
        actionHref: `/admin/licenses/${lic.tenant_id}`,
      });
    }
  }

  // Pending upgrade requests
  const { data: pendingRequests } = await supabaseAdmin
    .from("upgrade_requests")
    .select("id, tenant_id, requested_tier, tenants(name)")
    .eq("status", "pending");

  for (const req of pendingRequests ?? []) {
    const tenant = req.tenants as unknown as { name: string } | null;
    attentionItems.push({
      id: req.id,
      tenantId: req.tenant_id,
      name: tenant?.name ?? "Unknown",
      issue: "Upgrade request",
      severity: "indigo",
      detail: `→ ${req.requested_tier}`,
      action: "Activate",
      actionHref: `/admin/licenses/${req.tenant_id}`,
    });
  }

  // Sort by severity
  const severityOrder = { rose: 0, amber: 1, indigo: 2 };
  attentionItems.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  const severityColors = {
    rose: "bg-review/10 text-review border-review/20",
    amber: "bg-warning/10 text-warning border-warning/20",
    indigo: "bg-primary/10 text-primary border-primary/20",
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">License Health</h1>

      {/* Funnel */}
      <div className="rounded-lg border border-lift-border bg-surface p-5">
        <h2 className="mb-4 text-sm font-semibold">Pipeline</h2>
        <div className="flex items-center justify-center gap-3 text-center">
          {[
            { label: "Trialing", value: trialingRes.count ?? 0, color: "text-warning" },
            { label: "Active", value: activeRes.count ?? 0, color: "text-success" },
            { label: "Converted", value: convertedCount, color: "text-primary" },
            { label: "Suspended", value: suspendedRes.count ?? 0, color: "text-review" },
            { label: "Cancelled", value: cancelledRes.count ?? 0, color: "text-muted" },
          ].map((stage, i, arr) => (
            <div key={stage.label} className="flex items-center gap-3">
              <div className="rounded-lg border border-lift-border bg-page-bg px-4 py-3 min-w-[90px]">
                <p className={`text-2xl font-bold ${stage.color}`}>{stage.value}</p>
                <p className="text-[10px] text-muted">{stage.label}</p>
              </div>
              {i < arr.length - 1 && (
                <span className="text-muted">→</span>
              )}
            </div>
          ))}
        </div>
        <p className="mt-3 text-center text-xs text-muted">
          Conversion rate: <span className="font-medium text-lift-text">{conversionRate}%</span>
        </p>
      </div>

      {/* Monthly Trend */}
      <div className="rounded-lg border border-lift-border bg-surface p-5">
        <h2 className="mb-4 text-sm font-semibold">Monthly Trend (6 months)</h2>
        <div className="flex items-end gap-3 h-32">
          {months.map((m) => (
            <div key={m.label} className="flex-1 flex flex-col items-center gap-1">
              <div className="flex items-end gap-0.5 h-24 w-full justify-center">
                <div
                  className="w-3 rounded-t bg-primary/60"
                  style={{ height: `${(m.trials / maxBar) * 96}px` }}
                  title={`${m.trials} trials`}
                />
                <div
                  className="w-3 rounded-t bg-success"
                  style={{ height: `${(m.conversions / maxBar) * 96}px` }}
                  title={`${m.conversions} conversions`}
                />
              </div>
              <span className="text-[10px] text-muted">{m.label}</span>
            </div>
          ))}
        </div>
        <div className="mt-2 flex items-center justify-center gap-4 text-[10px] text-muted">
          <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded bg-primary/60" /> Trials</span>
          <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded bg-success" /> Conversions</span>
        </div>
      </div>

      {/* Attention Required */}
      <div className="rounded-lg border border-lift-border bg-surface p-5">
        <h2 className="mb-3 text-sm font-semibold">
          Attention Required
          {attentionItems.length > 0 && (
            <span className="ml-2 rounded-full bg-review/10 px-2 py-0.5 text-[10px] text-review">
              {attentionItems.length}
            </span>
          )}
        </h2>
        {attentionItems.length === 0 ? (
          <p className="text-xs text-muted">All clear — no items need attention.</p>
        ) : (
          <div className="space-y-2">
            {attentionItems.map((item) => (
              <div
                key={item.id}
                className={`flex items-center justify-between rounded-lg border p-3 ${severityColors[item.severity]}`}
              >
                <div className="flex items-center gap-3">
                  <div>
                    <p className="text-sm font-medium">{item.name}</p>
                    <p className="text-xs opacity-70">
                      {item.issue} · {item.detail}
                    </p>
                  </div>
                </div>
                <Link
                  href={item.actionHref}
                  className="shrink-0 rounded-md bg-white/80 px-3 py-1 text-xs font-medium text-lift-text hover:bg-white transition-colors"
                >
                  {item.action}
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
