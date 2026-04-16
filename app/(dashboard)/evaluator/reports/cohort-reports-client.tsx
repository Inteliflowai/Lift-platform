"use client";

type Candidate = {
  id: string;
  grade_band: string;
  status: string;
  sessions: { completion_pct: number }[];
  insight_profiles: { overall_confidence: number | null; requires_human_review: boolean; tri_score: number | null; tri_label: string | null }[];
  evaluator_reviews: { recommendation_tier: string | null; status: string }[];
};

export function CohortReportsClient({
  cycleName, cycleId, candidates,
}: {
  cycleName: string;
  cycleId: string;
  candidates: Candidate[];
}) {
  const total = candidates.length;
  const byStatus: Record<string, number> = {};
  const byBand: Record<string, { total: number; completed: number }> = {};
  const byTier: Record<string, number> = {};
  const confidences: number[] = [];
  const triByLabel: Record<string, number> = { emerging: 0, developing: 0, ready: 0, thriving: 0 };
  const triByBand: Record<string, { total: number; sum: number }> = {};
  let flagged = 0;

  for (const c of candidates) {
    byStatus[c.status] = (byStatus[c.status] ?? 0) + 1;
    if (!byBand[c.grade_band]) byBand[c.grade_band] = { total: 0, completed: 0 };
    byBand[c.grade_band].total++;
    if (c.status === "completed" || c.status === "reviewed") byBand[c.grade_band].completed++;

    const profile = c.insight_profiles?.[0];
    if (profile?.requires_human_review) flagged++;
    if (profile?.overall_confidence != null) confidences.push(Number(profile.overall_confidence));

    if (profile?.tri_label) {
      triByLabel[profile.tri_label] = (triByLabel[profile.tri_label] ?? 0) + 1;
    }
    if (profile?.tri_score != null) {
      if (!triByBand[c.grade_band]) triByBand[c.grade_band] = { total: 0, sum: 0 };
      triByBand[c.grade_band].total++;
      triByBand[c.grade_band].sum += Number(profile.tri_score);
    }

    const review = c.evaluator_reviews?.find((r) => r.status === "finalized");
    if (review?.recommendation_tier) {
      byTier[review.recommendation_tier] = (byTier[review.recommendation_tier] ?? 0) + 1;
    }
  }

  const statuses = ["invited", "active", "completed", "flagged", "reviewed", "archived"];
  const statusColors: Record<string, string> = {
    invited: "#6366f1", active: "#10b981", completed: "#10b981",
    flagged: "#f43f5e", reviewed: "#7878a0", archived: "#2a2a3a",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Cohort Reports</h1>
          <p className="text-sm text-muted">{cycleName}</p>
        </div>
        <a
          href={`/api/exports/cohort-csv?cycle_id=${cycleId}`}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Export CSV
        </a>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Candidates" value={total} />
        <StatCard label="Flagged" value={flagged} highlight={flagged > 0} />
        <StatCard label="Flagged %" value={total > 0 ? `${Math.round((flagged / total) * 100)}%` : "0%"} />
        <StatCard label="Avg Confidence" value={confidences.length > 0 ? `${Math.round(confidences.reduce((a, b) => a + b, 0) / confidences.length)}%` : "—"} />
      </div>

      {/* Completion by grade band */}
      <div className="rounded-lg border border-lift-border bg-surface p-5">
        <h2 className="mb-3 text-sm font-semibold">Completion by Grade</h2>
        <div className="space-y-3">
          {Object.entries(byBand).sort().map(([band, data]) => {
            const pct = data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0;
            return (
              <div key={band} className="flex items-center gap-3">
                <span className="w-16 text-sm">Grade {band}</span>
                <div className="flex-1 h-6 rounded-full bg-lift-border overflow-hidden">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                </div>
                <span className="w-20 text-right text-sm">{data.completed}/{data.total} ({pct}%)</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Status distribution */}
      <div className="rounded-lg border border-lift-border bg-surface p-5">
        <h2 className="mb-3 text-sm font-semibold">Status Distribution</h2>
        <div className="flex gap-4 flex-wrap">
          {statuses.filter((s) => byStatus[s]).map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: statusColors[s] ?? "#7878a0" }} />
              <span className="text-sm capitalize">{s}: <span className="font-bold">{byStatus[s]}</span></span>
            </div>
          ))}
        </div>
      </div>

      {/* Recommendation breakdown */}
      {Object.keys(byTier).length > 0 && (
        <div className="rounded-lg border border-lift-border bg-surface p-5">
          <h2 className="mb-3 text-sm font-semibold">Recommendations</h2>
          <div className="grid grid-cols-3 gap-3 lg:grid-cols-6">
            {Object.entries(byTier).sort().map(([tier, count]) => (
              <div key={tier} className="rounded-md border border-lift-border p-3 text-center">
                <p className="text-xs text-muted capitalize">{tier.replace(/_/g, " ")}</p>
                <p className="mt-1 text-xl font-bold">{count}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TRI Distribution */}
      <div className="rounded-lg border border-lift-border bg-surface p-5">
        <h2 className="mb-3 text-sm font-semibold">Transition Readiness Index</h2>
        <div className="space-y-2">
          {(["emerging", "developing", "ready", "thriving"] as const).map((label) => {
            const count = triByLabel[label] ?? 0;
            const pct = total > 0 ? Math.round((count / total) * 100) : 0;
            const colors: Record<string, string> = { emerging: "#f43f5e", developing: "#f59e0b", ready: "#6366f1", thriving: "#10b981" };
            return (
              <div key={label} className="flex items-center gap-3">
                <span className="w-36 text-sm">{{ emerging: "Emerging", developing: "Developing", ready: "Strong", thriving: "Strong" }[label]}</span>
                <div className="flex-1 h-5 rounded-full bg-gray-100 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: colors[label] }} />
                </div>
                <span className="w-16 text-right text-sm">{count} ({pct}%)</span>
              </div>
            );
          })}
        </div>

        {/* Avg TRI per grade band */}
        {Object.keys(triByBand).length > 0 && (
          <div className="mt-4 grid grid-cols-3 gap-3">
            {Object.entries(triByBand).sort().map(([band, data]) => (
              <div key={band} className="rounded-md border border-lift-border p-3 text-center">
                <p className="text-xs text-muted">Grade {band}</p>
                <p className="mt-1 text-lg font-bold">{(data.sum / data.total).toFixed(1)}</p>
                <p className="text-[10px] text-muted">avg TRI</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div className="rounded-lg border border-lift-border bg-surface p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${highlight ? "text-review" : ""}`}>{value}</p>
    </div>
  );
}
