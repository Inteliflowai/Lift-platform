import { supabaseAdmin } from "@/lib/supabase/admin";
import Link from "next/link";

export const dynamic = "force-dynamic";

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    trialing: "bg-warning/10 text-warning",
    active: "bg-success/10 text-success",
    past_due: "bg-warning/10 text-warning",
    suspended: "bg-review/10 text-review",
    cancelled: "bg-muted/10 text-muted",
  };
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
        colors[status] ?? colors.cancelled
      }`}
    >
      {status === "trialing" ? "Trial" : status.replace("_", " ")}
    </span>
  );
}

function TierBadge({ tier }: { tier: string }) {
  const colors: Record<string, string> = {
    trial: "bg-primary/10 text-primary",
    essentials: "bg-muted/10 text-muted",
    professional: "bg-primary/10 text-primary",
    enterprise: "bg-success/10 text-success",
  };
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
        colors[tier] ?? colors.trial
      }`}
    >
      {tier}
    </span>
  );
}

export default async function AdminLicensesPage() {
  // Fetch all tenants with their licenses
  const { data: licenses } = await supabaseAdmin
    .from("tenant_licenses")
    .select("*, tenants(name, slug)")
    .order("created_at", { ascending: false });

  // Get pending upgrade request counts
  const { data: pendingRequests } = await supabaseAdmin
    .from("upgrade_requests")
    .select("tenant_id")
    .eq("status", "pending");

  const pendingByTenant = new Set(
    pendingRequests?.map((r) => r.tenant_id) ?? []
  );

  // Get session usage for current year
  const year = new Date().getFullYear();
  const { data: usageData } = await supabaseAdmin
    .from("license_usage")
    .select("tenant_id, sessions_completed")
    .eq("period_year", year);

  const usageByTenant: Record<string, number> = {};
  for (const u of usageData ?? []) {
    usageByTenant[u.tenant_id] =
      (usageByTenant[u.tenant_id] ?? 0) + (u.sessions_completed ?? 0);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Licenses</h1>

      <div className="overflow-x-auto rounded-lg border border-lift-border">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-lift-border bg-surface text-xs text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">School</th>
              <th className="px-4 py-3 font-medium">Tier</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Trial / Renewal</th>
              <th className="px-4 py-3 font-medium">Sessions</th>
              <th className="px-4 py-3 font-medium">Requests</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-lift-border">
            {licenses?.map((lic) => {
              const tenant = lic.tenants as unknown as {
                name: string;
                slug: string;
              };
              const sessions = usageByTenant[lic.tenant_id] ?? 0;
              const hasPending = pendingByTenant.has(lic.tenant_id);

              const dateStr =
                lic.status === "trialing" && lic.trial_ends_at
                  ? new Date(lic.trial_ends_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })
                  : lic.next_renewal_at
                  ? new Date(lic.next_renewal_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "—";

              return (
                <tr key={lic.id} className="hover:bg-surface/50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/licenses/${lic.tenant_id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {tenant?.name ?? "Unknown"}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <TierBadge tier={lic.tier} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={lic.status} />
                  </td>
                  <td className="px-4 py-3 text-xs text-muted">{dateStr}</td>
                  <td className="px-4 py-3 text-xs">{sessions}</td>
                  <td className="px-4 py-3">
                    {hasPending && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                        Pending
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
            {(!licenses || licenses.length === 0) && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted">
                  No licenses found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
