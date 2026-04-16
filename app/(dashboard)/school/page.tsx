import { getTenantContext } from "@/lib/tenant";
import { supabaseAdmin } from "@/lib/supabase/admin";
import Link from "next/link";
import { InfoTooltip } from "../components/InfoTooltip";
import { OnboardingBanner } from "@/components/onboarding/OnboardingBanner";
import { SchoolAdminTour } from "@/components/tours/SchoolAdminTour";
import { TrialBannerTooltips } from "@/components/tooltips/TrialBannerTooltips";
import { t } from "@/lib/i18n/useLocale";
import { ensureDemoCandidates } from "@/lib/demo/seedDemoSchool";

export default async function SchoolDashboard() {
  const { tenantId, tenant } = await getTenantContext();

  // Self-heal: ensure demo candidates exist for trial tenants that registered
  // before the full demo seeder was wired into registration
  ensureDemoCandidates(tenantId).catch(() => {});

  // Active cycle
  const { data: cycle } = await supabaseAdmin
    .from("application_cycles")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  // Stats
  const { count: totalCandidates } = await supabaseAdmin
    .from("candidates")
    .select("*", { count: "exact", head: true })
    .eq("tenant_id", tenantId);

  const { count: completedSessions } = await supabaseAdmin
    .from("sessions")
    .select("*", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("status", "completed");

  const { count: flaggedCount } = await supabaseAdmin
    .from("candidates")
    .select("*", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("status", "flagged");

  const { count: reviewCount } = await supabaseAdmin
    .from("insight_profiles")
    .select("*", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("requires_human_review", true)
    .eq("is_final", true);

  const { data: avgData } = await supabaseAdmin
    .from("sessions")
    .select("completion_pct")
    .eq("tenant_id", tenantId);

  const avgCompletion =
    avgData && avgData.length > 0
      ? Math.round(
          (avgData.reduce((s, r) => s + Number(r.completion_pct), 0) /
            avgData.length) *
            100
        ) / 100
      : 0;

  // Review queue
  const { data: flaggedCandidates } = await supabaseAdmin
    .from("candidates")
    .select("id, first_name, last_name, grade_band, status")
    .eq("tenant_id", tenantId)
    .eq("status", "flagged")
    .limit(10);

  const { data: reviewProfiles } = await supabaseAdmin
    .from("insight_profiles")
    .select(
      "candidate_id, low_confidence_flags, candidates(id, first_name, last_name, grade_band, status)"
    )
    .eq("tenant_id", tenantId)
    .eq("requires_human_review", true)
    .eq("is_final", true)
    .limit(10);

  type ReviewItem = {
    id: string;
    first_name: string;
    last_name: string;
    grade_band: string;
    flag_reason: string;
  };

  const reviewQueue: ReviewItem[] = [
    ...(flaggedCandidates?.map((c) => ({
      id: c.id,
      first_name: c.first_name,
      last_name: c.last_name,
      grade_band: c.grade_band,
      flag_reason: "Status flagged",
    })) ?? []),
    ...(reviewProfiles
      ?.filter((p) => p.candidates)
      .map((p) => {
        const c = p.candidates as unknown as {
          id: string;
          first_name: string;
          last_name: string;
          grade_band: string;
        };
        return {
          id: c.id,
          first_name: c.first_name,
          last_name: c.last_name,
          grade_band: c.grade_band,
          flag_reason:
            p.low_confidence_flags?.join(", ") || "Requires human review",
        };
      }) ?? []),
  ];

  // Deduplicate by candidate id
  const seenIds = new Set<string>();
  const dedupedQueue = reviewQueue.filter((c) => {
    if (seenIds.has(c.id)) return false;
    seenIds.add(c.id);
    return true;
  });

  // Recent completions
  const { data: recentCompleted } = await supabaseAdmin
    .from("sessions")
    .select(
      "completed_at, candidates(id, first_name, last_name, grade_band)"
    )
    .eq("tenant_id", tenantId)
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(5);

  // Grade band breakdown
  let gradeBandCounts: { grade_band: string; count: number }[] = [];
  if (cycle) {
    const { data: bandData } = await supabaseAdmin
      .from("candidates")
      .select("grade_band")
      .eq("tenant_id", tenantId)
      .eq("cycle_id", cycle.id);

    const counts: Record<string, number> = {};
    bandData?.forEach((c) => {
      counts[c.grade_band] = (counts[c.grade_band] || 0) + 1;
    });
    gradeBandCounts = Object.entries(counts).map(([grade_band, count]) => ({
      grade_band,
      count,
    }));
  }

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? t("dashboard.greeting_morning") : hour < 18 ? t("dashboard.greeting_afternoon") : t("dashboard.greeting_evening");

  const needsReview = (flaggedCount ?? 0) + (reviewCount ?? 0);

  const stats = [
    { label: t("dashboard.total_candidates"), value: totalCandidates ?? 0, icon: "🎓", accent: "accent-left-indigo", info: "Total candidates invited this cycle" },
    { label: t("dashboard.completed_sessions"), value: completedSessions ?? 0, icon: "✅", accent: "accent-left-green", info: "Candidates who finished their experience" },
    { label: t("dashboard.flagged_review"), value: needsReview, highlight: needsReview > 0, icon: "⚠️", accent: "accent-left-amber", info: "Candidates flagged for human review" },
    { label: t("dashboard.avg_completion"), value: `${avgCompletion}%`, icon: "📊", accent: "accent-left-indigo", info: "Average task completion across all sessions" },
  ];

  return (
    <div className="space-y-6">
      <SchoolAdminTour />
      <TrialBannerTooltips />
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold">
          {greeting}, {tenant?.name ?? "School"}
        </h1>
        {cycle && (
          <p className="mt-1 text-muted">
            {t("dashboard.active_cycle")}: <span className="text-lift-text">{cycle.name}</span>
          </p>
        )}
      </div>

      {/* Onboarding */}
      <OnboardingBanner />

      {/* Quick Stats */}
      <div data-tour="stat-cards" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className={`card-hover rounded-lg border border-lift-border bg-surface p-4 ${"accent" in s ? s.accent : ""}`}
          >
            <div className="flex items-center gap-2">
              {"icon" in s && <span className="text-lg">{s.icon}</span>}
              <p className="text-xs text-muted">{s.label}</p>
              {"info" in s && s.info && <InfoTooltip text={s.info} />}
            </div>
            <p
              className={`mt-1.5 stat-hero ${
                "highlight" in s && s.highlight ? "text-review" : "text-lift-text"
              }`}
            >
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Active Cycle Card */}
      {cycle && (
        <div className="rounded-lg border border-lift-border bg-surface p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{cycle.name}</h2>
            <span className="rounded-full bg-success/10 px-3 py-1 text-xs font-medium text-success">
              Active
            </span>
          </div>
          <div className="mt-3 flex gap-6 text-sm text-muted">
            {cycle.opens_at && (
              <span>Opens: {new Date(cycle.opens_at).toLocaleDateString()}</span>
            )}
            {cycle.closes_at && (
              <span>Closes: {new Date(cycle.closes_at).toLocaleDateString()}</span>
            )}
          </div>
          {gradeBandCounts.length > 0 && (
            <div className="mt-3 flex gap-4">
              {gradeBandCounts.map((g) => (
                <span
                  key={g.grade_band}
                  className="rounded-md border border-lift-border px-3 py-1 text-sm"
                >
                  Grade {g.grade_band}:{" "}
                  <span className="font-semibold">{g.count}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Review Queue */}
        <div data-tour="review-queue"></div>
        <div className="rounded-lg border border-lift-border bg-surface p-5">
          <div className="flex items-center gap-1.5">
            <h2 className="text-lg font-semibold">Review Queue</h2>
            <InfoTooltip text="Candidates flagged by the AI for human review. These may have low-confidence scores, unusual response patterns, or learning support signals that warrant a closer look before making admissions decisions." />
          </div>
          {dedupedQueue.length === 0 ? (
            <p className="mt-3 text-sm text-muted">
              No candidates require review right now.
            </p>
          ) : (
            <div className="mt-3 space-y-2">
              {dedupedQueue.map((c) => (
                <Link
                  key={c.id}
                  href={`/school/candidates/${c.id}`}
                  className="flex items-center justify-between rounded-md border border-lift-border p-3 transition-colors hover:bg-page-bg"
                >
                  <div>
                    <span className="font-medium">
                      {c.first_name} {c.last_name}
                    </span>
                    <span className="ml-2 text-xs text-muted">
                      Grade {c.grade_band}
                    </span>
                  </div>
                  <span className="text-xs text-review">{c.flag_reason}</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent Completions */}
        <div className="rounded-lg border border-lift-border bg-surface p-5">
          <div className="flex items-center gap-1.5">
            <h2 className="text-lg font-semibold">Recent Completions</h2>
            <InfoTooltip text="The most recent candidates who finished all their assessment tasks. Once completed, the AI pipeline runs automatically to generate insight profiles, TRI scores, and evaluator briefings." />
          </div>
          {!recentCompleted || recentCompleted.length === 0 ? (
            <p className="mt-3 text-sm text-muted">No completions yet.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {recentCompleted.map((s, i) => {
                const c = s.candidates as unknown as {
                  id: string;
                  first_name: string;
                  last_name: string;
                  grade_band: string;
                } | null;
                if (!c) return null;
                return (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-md border border-lift-border p-3"
                  >
                    <div>
                      <span className="font-medium">
                        {c.first_name} {c.last_name}
                      </span>
                      <span className="ml-2 text-xs text-muted">
                        Grade {c.grade_band}
                      </span>
                    </div>
                    <span className="text-xs text-muted">
                      {s.completed_at
                        ? new Date(s.completed_at).toLocaleString()
                        : ""}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
