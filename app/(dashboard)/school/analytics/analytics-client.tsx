"use client";

import { useState, useEffect } from "react";
import { InfoTooltip } from "../../components/InfoTooltip";
import { useLocale } from "@/lib/i18n/LocaleProvider";

type Cycle = { id: string; name: string; status: string };

type Analytics = {
  overview: {
    total_candidates: number;
    completed_sessions: number;
    completion_rate_pct: number;
    avg_tri_score: number;
    avg_session_duration_minutes: number;
    sessions_this_month: number;
    sessions_limit: number | null;
    sessions_remaining: number | null;
  };
  by_grade_band: {
    band: string;
    candidates: number;
    completed: number;
    completion_rate_pct: number;
    avg_tri: number;
  }[];
  tri_distribution: {
    emerging: number;
    developing: number;
    ready: number;
    thriving: number;
  };
  dimension_averages: Record<string, number>;
  support_signals: {
    none: number;
    watch: number;
    recommend_screening: number;
  };
  completion_by_week: { week: string; completed: number }[];
};

export function AnalyticsClient({
  cycles,
  defaultCycleId,
}: {
  cycles: Cycle[];
  defaultCycleId: string | null;
}) {
  const { t } = useLocale();
  const [cycleId, setCycleId] = useState(defaultCycleId ?? "");
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = cycleId ? `?cycle_id=${cycleId}` : "";
    fetch(`/api/analytics/school${params}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [cycleId]);

  const cycleName = cycles.find((c) => c.id === cycleId)?.name ?? "All Cycles";

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-lift-border" />
        <div className="grid grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-lift-border" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) return <p className="text-muted">Failed to load analytics.</p>;

  const o = data.overview;
  const triTotal = data.tri_distribution.emerging + data.tri_distribution.developing + data.tri_distribution.ready + data.tri_distribution.thriving;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("analytics.title")}</h1>
          <p className="text-sm text-muted">{cycleName}</p>
        </div>
        {cycles.length > 1 && (
          <select
            value={cycleId}
            onChange={(e) => setCycleId(e.target.value)}
            className="rounded-md border border-lift-border bg-page-bg px-3 py-2 text-sm outline-none focus:border-primary"
          >
            <option value="">All Cycles</option>
            {cycles.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* ROW 1: Overview Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard label={t("analytics.candidates_invited")} value={o.total_candidates} info={t("analytics.candidates_info")} />
        <StatCard label={t("analytics.sessions_completed")} value={o.completed_sessions} info={t("analytics.sessions_info")} />
        <StatCard label={t("analytics.completion_rate")} value={`${o.completion_rate_pct}%`} info={t("analytics.rate_info")} />
        <StatCard label={t("analytics.avg_tri")} value={o.avg_tri_score} info={t("analytics.tri_info")} />
        <StatCard
          label={t("analytics.sessions_used")}
          value={o.sessions_limit ? `${o.sessions_limit - (o.sessions_remaining ?? 0)}/${o.sessions_limit}` : `${o.sessions_this_month}`}
          info={t("analytics.usage_info")}
        />
        <StatCard label={t("analytics.avg_time")} value={`${o.avg_session_duration_minutes}m`} info={t("analytics.time_info")} />
      </div>

      {/* ROW 2: TRI Distribution + Grade Band */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Donut */}
        <div className="rounded-lg border border-lift-border bg-surface p-5">
          <h2 className="mb-4 text-sm font-semibold">{t("analytics.tri_distribution")}</h2>
          <div className="flex items-center justify-center">
            <DonutChart
              segments={[
                { value: data.tri_distribution.emerging, color: "#f43f5e", label: t("analytics.emerging") },
                { value: data.tri_distribution.developing, color: "#f59e0b", label: t("analytics.developing") },
                { value: data.tri_distribution.ready, color: "#6366f1", label: t("analytics.ready") },
                { value: data.tri_distribution.thriving, color: "#10b981", label: t("analytics.thriving") },
              ]}
              total={triTotal}
            />
          </div>
        </div>

        {/* Grade Band Table */}
        <div className="rounded-lg border border-lift-border bg-surface p-5">
          <h2 className="mb-4 text-sm font-semibold">{t("analytics.by_grade_band")}</h2>
          <table className="w-full text-sm">
            <thead className="text-xs text-muted">
              <tr>
                <th className="pb-2 text-left font-medium">Band</th>
                <th className="pb-2 text-right font-medium">Candidates</th>
                <th className="pb-2 text-right font-medium">Completed</th>
                <th className="pb-2 text-right font-medium">Rate</th>
                <th className="pb-2 text-right font-medium">Avg TRI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-lift-border">
              {data.by_grade_band.map((b) => (
                <tr key={b.band}>
                  <td className="py-2 font-medium">Grade {b.band}</td>
                  <td className="py-2 text-right">{b.candidates}</td>
                  <td className="py-2 text-right">{b.completed}</td>
                  <td className="py-2 text-right">{b.completion_rate_pct}%</td>
                  <td className="py-2 text-right font-semibold">{b.avg_tri || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ROW 3: Dimension Averages */}
      <div className="rounded-lg border border-lift-border bg-surface p-5">
        <h2 className="mb-4 text-sm font-semibold">{t("analytics.dimensions")}</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          {Object.entries(data.dimension_averages).map(([dim, val]) => (
            <div key={dim} className="rounded-lg border border-lift-border p-3">
              <p className="text-xs text-muted capitalize">{dim.replace("_", " ")}</p>
              <div className="mt-1 flex items-end gap-2">
                <span className="text-xl font-bold">{val}</span>
                <div className="flex-1 h-2 rounded-full bg-lift-border overflow-hidden mb-1">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${val}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ROW 4: Learning Support */}
      <div className="rounded-lg border border-lift-border bg-surface p-5">
        <h2 className="mb-4 text-sm font-semibold">{t("analytics.support_signals")}</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-lg border border-success/20 bg-success/5 p-4 text-center">
            <p className="text-2xl font-bold text-success">{data.support_signals.none}</p>
            <p className="mt-1 text-xs text-muted">No Indicators</p>
          </div>
          <div className="rounded-lg border border-warning/20 bg-warning/5 p-4 text-center">
            <p className="text-2xl font-bold text-warning">{data.support_signals.watch}</p>
            <p className="mt-1 text-xs text-muted">Watch</p>
          </div>
          <div className="rounded-lg border border-review/20 bg-review/5 p-4 text-center">
            <p className="text-2xl font-bold text-review">{data.support_signals.recommend_screening}</p>
            <p className="mt-1 text-xs text-muted">Recommend Screening</p>
          </div>
        </div>
        <p className="mt-3 text-[10px] text-muted">
          Learning Support Signals are for internal evaluator use only. They do not constitute a diagnosis.
        </p>
      </div>

      {/* ROW 5: Session Completion Trend */}
      <div className="rounded-lg border border-lift-border bg-surface p-5">
        <h2 className="mb-4 text-sm font-semibold">{t("analytics.trend")}</h2>
        <SparklineChart data={data.completion_by_week} />
      </div>
    </div>
  );
}

// ─── Stat Card ───

function StatCard({ label, value, info }: { label: string; value: string | number; info: string }) {
  return (
    <div className="rounded-lg border border-lift-border bg-surface p-4">
      <div className="flex items-center gap-1.5">
        <p className="text-xs text-muted">{label}</p>
        <InfoTooltip text={info} />
      </div>
      <p className="mt-1 text-2xl font-bold font-[family-name:var(--font-geist-mono)] text-lift-text">
        {value}
      </p>
    </div>
  );
}

// ─── Donut Chart ───

function DonutChart({
  segments,
  total,
}: {
  segments: { value: number; color: string; label: string }[];
  total: number;
}) {
  if (total === 0) {
    return <p className="py-8 text-sm text-muted">No data yet</p>;
  }

  const radius = 70;
  const stroke = 20;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="flex items-center gap-8">
      <svg width="180" height="180" viewBox="0 0 180 180">
        {segments.map((seg) => {
          const pct = seg.value / total;
          const dashLen = pct * circumference;
          const currentOffset = offset;
          offset += dashLen;

          return (
            <circle
              key={seg.label}
              cx="90"
              cy="90"
              r={radius}
              fill="none"
              stroke={seg.color}
              strokeWidth={stroke}
              strokeDasharray={`${dashLen} ${circumference - dashLen}`}
              strokeDashoffset={-currentOffset}
              transform="rotate(-90 90 90)"
            />
          );
        })}
        <text x="90" y="85" textAnchor="middle" className="text-2xl font-bold" fill="#1a1a2e" fontSize="28" fontWeight="bold">
          {total}
        </text>
        <text x="90" y="105" textAnchor="middle" fill="#6b7280" fontSize="11">
          candidates
        </text>
      </svg>

      <div className="space-y-2">
        {segments.map((seg) => (
          <div key={seg.label} className="flex items-center gap-2 text-xs">
            <span
              className="h-3 w-3 rounded-full"
              style={{ background: seg.color }}
            />
            <span className="text-muted">{seg.label}</span>
            <span className="font-semibold">{seg.value}</span>
            <span className="text-muted">
              ({total > 0 ? Math.round((seg.value / total) * 100) : 0}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Sparkline Bar Chart ───

function SparklineChart({ data }: { data: { week: string; completed: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.completed));

  return (
    <div className="flex items-end gap-2 h-32">
      {data.map((d) => (
        <div key={d.week} className="flex-1 flex flex-col items-center gap-1" title={`${d.week}: ${d.completed}`}>
          <div className="w-full flex items-end justify-center h-24">
            <div
              className="w-full max-w-[32px] rounded-t bg-primary/70 hover:bg-primary transition-colors"
              style={{ height: `${(d.completed / max) * 96}px`, minHeight: d.completed > 0 ? "4px" : "0" }}
            />
          </div>
          <span className="text-[9px] text-muted truncate w-full text-center">{d.week}</span>
        </div>
      ))}
    </div>
  );
}
