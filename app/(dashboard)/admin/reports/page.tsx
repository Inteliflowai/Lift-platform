import { supabaseAdmin } from "@/lib/supabase/admin";
import { TIER_PRICING } from "@/lib/licensing/features";

export const dynamic = "force-dynamic";

export default async function SystemReportsPage() {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const year = now.getFullYear();

  // ─── Tenant Stats ───
  const { count: totalTenants } = await supabaseAdmin
    .from("tenants")
    .select("*", { count: "exact", head: true });

  const { data: allLicenses } = await supabaseAdmin
    .from("tenant_licenses")
    .select("tier, status, trial_ends_at, created_at");

  const activeLicenses = (allLicenses ?? []).filter((l) => l.status === "active");
  const trialingLicenses = (allLicenses ?? []).filter((l) => l.status === "trialing");
  const suspendedLicenses = (allLicenses ?? []).filter((l) => l.status === "suspended");
  const cancelledLicenses = (allLicenses ?? []).filter((l) => l.status === "cancelled");

  // Revenue
  let totalARR = 0;
  for (const lic of activeLicenses) {
    const pricing = TIER_PRICING[lic.tier as keyof typeof TIER_PRICING];
    totalARR += pricing?.annual ?? 0;
  }

  // New tenants this month
  const newThisMonth = (allLicenses ?? []).filter(
    (l) => new Date(l.created_at) >= thirtyDaysAgo
  ).length;

  // ─── Session Stats ───
  const { count: totalSessions } = await supabaseAdmin
    .from("sessions")
    .select("*", { count: "exact", head: true })
    .eq("status", "completed");

  const { count: sessionsThisWeek } = await supabaseAdmin
    .from("sessions")
    .select("*", { count: "exact", head: true })
    .eq("status", "completed")
    .gte("completed_at", sevenDaysAgo.toISOString());

  const { count: sessionsThisMonth } = await supabaseAdmin
    .from("sessions")
    .select("*", { count: "exact", head: true })
    .eq("status", "completed")
    .gte("completed_at", thirtyDaysAgo.toISOString());

  // ─── Candidate Stats ───
  const { count: totalCandidates } = await supabaseAdmin
    .from("candidates")
    .select("*", { count: "exact", head: true });

  const { count: candidatesThisMonth } = await supabaseAdmin
    .from("candidates")
    .select("*", { count: "exact", head: true })
    .gte("created_at", thirtyDaysAgo.toISOString());

  // ─── Pipeline Stats ───
  const { count: totalProfiles } = await supabaseAdmin
    .from("insight_profiles")
    .select("*", { count: "exact", head: true })
    .eq("is_final", true);

  const { count: partialProfiles } = await supabaseAdmin
    .from("insight_profiles")
    .select("*", { count: "exact", head: true })
    .eq("pipeline_partial", true);

  const { count: humanReviewCount } = await supabaseAdmin
    .from("insight_profiles")
    .select("*", { count: "exact", head: true })
    .eq("requires_human_review", true)
    .eq("is_final", true);

  // ─── AI Usage ───
  const { count: totalAIRuns } = await supabaseAdmin
    .from("ai_runs")
    .select("*", { count: "exact", head: true });

  const { count: failedAIRuns } = await supabaseAdmin
    .from("ai_runs")
    .select("*", { count: "exact", head: true })
    .eq("status", "error");

  // ─── Session Usage by Tenant ───
  const { data: usageData } = await supabaseAdmin
    .from("license_usage")
    .select("tenant_id, sessions_completed")
    .eq("period_year", year);

  const totalSessionsUsed = (usageData ?? []).reduce(
    (s, u) => s + (u.sessions_completed ?? 0), 0
  );

  // ─── Recent Errors ───
  const { data: recentErrors } = await supabaseAdmin
    .from("audit_logs")
    .select("action, payload, occurred_at")
    .eq("action", "system_error")
    .order("occurred_at", { ascending: false })
    .limit(10);

  // ─── Pending Requests ───
  const { count: pendingUpgrades } = await supabaseAdmin
    .from("upgrade_requests")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending");

  const { count: pendingExports } = await supabaseAdmin
    .from("data_export_requests")
    .select("*", { count: "exact", head: true })
    .in("status", ["queued", "processing"]);

  const pipelineSuccessRate = (totalProfiles ?? 0) > 0
    ? Math.round(((totalProfiles ?? 0) - (partialProfiles ?? 0)) / (totalProfiles ?? 1) * 100)
    : 100;

  const aiErrorRate = (totalAIRuns ?? 0) > 0
    ? Math.round((failedAIRuns ?? 0) / (totalAIRuns ?? 1) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">System Reports</h1>

      {/* Platform Overview */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Schools" value={totalTenants ?? 0} />
        <StatCard label="Active Subscriptions" value={activeLicenses.length} />
        <StatCard label="In Trial" value={trialingLicenses.length} />
        <StatCard label="Total ARR" value={`$${totalARR.toLocaleString()}`} />
        <StatCard label="MRR" value={`$${Math.round(totalARR / 12).toLocaleString()}`} />
        <StatCard label="New Schools (30d)" value={newThisMonth} />
        <StatCard label="Suspended" value={suspendedLicenses.length} highlight={suspendedLicenses.length > 0} />
        <StatCard label="Cancelled" value={cancelledLicenses.length} />
      </div>

      {/* Session & Candidate Stats */}
      <div className="rounded-lg border border-lift-border bg-surface p-5">
        <h2 className="mb-4 text-sm font-semibold">Activity</h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Total Candidates" value={totalCandidates ?? 0} />
          <StatCard label="New Candidates (30d)" value={candidatesThisMonth ?? 0} />
          <StatCard label="Total Completed Sessions" value={totalSessions ?? 0} />
          <StatCard label="Sessions This Week" value={sessionsThisWeek ?? 0} />
          <StatCard label="Sessions This Month" value={sessionsThisMonth ?? 0} />
          <StatCard label="Sessions Used (Year)" value={totalSessionsUsed} />
          <StatCard label="Pending Upgrades" value={pendingUpgrades ?? 0} highlight={(pendingUpgrades ?? 0) > 0} />
          <StatCard label="Pending Exports" value={pendingExports ?? 0} />
        </div>
      </div>

      {/* Pipeline Health */}
      <div className="rounded-lg border border-lift-border bg-surface p-5">
        <h2 className="mb-4 text-sm font-semibold">AI Pipeline Health</h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Total Insight Profiles" value={totalProfiles ?? 0} />
          <StatCard label="Pipeline Success Rate" value={`${pipelineSuccessRate}%`} />
          <StatCard label="Partial Profiles" value={partialProfiles ?? 0} highlight={(partialProfiles ?? 0) > 0} />
          <StatCard label="Needs Human Review" value={humanReviewCount ?? 0} />
          <StatCard label="Total AI Runs" value={totalAIRuns ?? 0} />
          <StatCard label="AI Error Rate" value={`${aiErrorRate}%`} highlight={aiErrorRate > 5} />
          <StatCard label="Failed AI Runs" value={failedAIRuns ?? 0} highlight={(failedAIRuns ?? 0) > 0} />
        </div>
      </div>

      {/* Recent System Errors */}
      <div className="rounded-lg border border-lift-border bg-surface p-5">
        <h2 className="mb-3 text-sm font-semibold">Recent System Errors</h2>
        {(!recentErrors || recentErrors.length === 0) ? (
          <p className="text-xs text-muted">No system errors in the log.</p>
        ) : (
          <div className="space-y-2">
            {recentErrors.map((e, i) => {
              const payload = e.payload as Record<string, string> | null;
              return (
                <div key={i} className="flex items-start gap-3 rounded-md border border-review/20 bg-review/5 p-3 text-xs">
                  <span className="shrink-0 text-muted">
                    {new Date(e.occurred_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <div className="min-w-0 flex-1">
                    <span className="font-mono text-[10px] text-review">{payload?.error_code ?? "UNKNOWN"}</span>
                    <p className="mt-0.5 text-muted truncate">{payload?.error_message ?? "No details"}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div className="rounded-lg border border-lift-border bg-page-bg p-3">
      <p className="text-[10px] text-muted">{label}</p>
      <p className={`mt-0.5 text-lg font-bold ${highlight ? "text-review" : "text-lift-text"}`}>
        {value}
      </p>
    </div>
  );
}
