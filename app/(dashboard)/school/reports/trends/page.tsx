"use client";

import { useState, useEffect } from "react";
import { BackButton } from "@/components/ui/BackButton";
import { Tooltip } from "@/components/ui/Tooltip";
import { useTooltipContent } from "@/lib/tooltips/useTooltipContent";

interface CycleTrend {
  cycle_id: string;
  cycle_name: string;
  academic_year: string;
  status: string;
  total_candidates: number;
  completed_sessions: number;
  avg_tri: number;
  avg_reading: number;
  avg_writing: number;
  avg_reasoning: number;
  avg_math: number;
  avg_reflection: number;
  avg_persistence: number;
  avg_advocacy: number;
  strong_pct: number;
  developing_pct: number;
  emerging_pct: number;
  signal_count: number;
  prediction_accuracy: number | null;
}

const triColor = (n: number) =>
  n >= 75 ? "#10b981" : n >= 50 ? "#14b8a6" : "#f59e0b";

export default function TrendsPage() {
  const TOOLTIPS = useTooltipContent();
  const [trends, setTrends] = useState<CycleTrend[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/analytics/trends")
      .then((r) => r.json())
      .then((d) => {
        setTrends(d.trends ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="py-16 text-center text-muted">Loading trend data...</div>;
  }

  const cyclesWithData = trends.filter((t) => t.completed_sessions > 0);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <BackButton label="Analytics" href="/school/analytics" />
      <div>
        <h1 className="text-2xl font-bold">Longitudinal Trends</h1>
        <p className="mt-1 text-sm text-muted">
          How your applicant pool and prediction accuracy evolve across admissions cycles
        </p>
      </div>

      {cyclesWithData.length < 2 && (
        <div className="rounded-lg border border-lift-border bg-surface p-8 text-center">
          <p className="text-sm text-muted">
            Trends require at least 2 completed cycles. Complete more admissions cycles to see year-over-year patterns.
          </p>
          <p className="mt-2 text-xs text-muted">
            Current cycles with data: {cyclesWithData.length}
          </p>
        </div>
      )}

      {/* TRI Trend across cycles */}
      {cyclesWithData.length >= 1 && (
        <div className="rounded-lg border border-lift-border bg-surface p-5">
          <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold">
            📈 Avg Transition Readiness Index (TRI) by Cycle
            <Tooltip content={TOOLTIPS.tri_score} />
          </h2>
          <p className="mb-4 text-xs text-muted">
            Is your applicant pool getting stronger, weaker, or staying stable?
          </p>
          <div className="flex items-end gap-6">
            {cyclesWithData.map((t) => {
              const barHeight = Math.max(20, (t.avg_tri / 100) * 180);
              return (
                <div key={t.cycle_id} className="flex flex-col items-center gap-2">
                  <span className="stat-hero text-lg" style={{ color: triColor(t.avg_tri) }}>
                    {t.avg_tri}
                  </span>
                  <div
                    className="w-16 rounded-t-lg score-bar-animate"
                    style={{
                      height: barHeight,
                      background: `linear-gradient(to top, ${triColor(t.avg_tri)}40, ${triColor(t.avg_tri)})`,
                    }}
                  />
                  <div className="text-center">
                    <p className="text-xs font-semibold text-lift-text">{t.academic_year}</p>
                    <p className="text-[10px] text-muted">{t.completed_sessions} candidates</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Readiness Distribution Trend */}
      {cyclesWithData.length >= 1 && (
        <div className="rounded-lg border border-lift-border bg-surface p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold">
            🎯 Readiness Distribution by Cycle
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted">
                <tr>
                  <th className="pb-2 text-left font-medium">Cycle</th>
                  <th className="pb-2 text-right font-medium">Candidates</th>
                  <th className="pb-2 text-right font-medium">Strong</th>
                  <th className="pb-2 text-right font-medium">Developing</th>
                  <th className="pb-2 text-right font-medium">Emerging</th>
                  <th className="pb-2 text-right font-medium">Signals</th>
                  <th className="pb-2 text-right font-medium">Accuracy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-lift-border">
                {cyclesWithData.map((t) => (
                  <tr key={t.cycle_id}>
                    <td className="py-2 font-medium">{t.academic_year}</td>
                    <td className="py-2 text-right">{t.completed_sessions}</td>
                    <td className="py-2 text-right text-success font-semibold">{t.strong_pct}%</td>
                    <td className="py-2 text-right text-primary font-semibold">{t.developing_pct}%</td>
                    <td className="py-2 text-right text-warning font-semibold">{t.emerging_pct}%</td>
                    <td className="py-2 text-right">{t.signal_count}</td>
                    <td className="py-2 text-right">
                      {t.prediction_accuracy !== null ? (
                        <span className="font-semibold" style={{ color: triColor(t.prediction_accuracy) }}>
                          {t.prediction_accuracy}%
                        </span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Dimension Trend */}
      {cyclesWithData.length >= 2 && (
        <div className="rounded-lg border border-lift-border bg-surface p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold">
            💪 Dimension Averages Over Time
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted">
                <tr>
                  <th className="pb-2 text-left font-medium">Dimension</th>
                  {cyclesWithData.map((t) => (
                    <th key={t.cycle_id} className="pb-2 text-right font-medium">{t.academic_year}</th>
                  ))}
                  <th className="pb-2 text-right font-medium">Trend</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-lift-border">
                {[
                  { key: "avg_reading", label: "📖 Reading", icon: "📖" },
                  { key: "avg_writing", label: "✍️ Writing", icon: "✍️" },
                  { key: "avg_reasoning", label: "🧠 Reasoning", icon: "🧠" },
                  { key: "avg_math", label: "🔢 Math", icon: "🔢" },
                  { key: "avg_reflection", label: "💭 Reflection", icon: "💭" },
                  { key: "avg_persistence", label: "🎯 Persistence", icon: "🎯" },
                  { key: "avg_advocacy", label: "🙋 Advocacy", icon: "🙋" },
                ].map((dim) => {
                  const values = cyclesWithData.map((t) => (t as unknown as Record<string, number>)[dim.key] || 0);
                  const first = values[0];
                  const last = values[values.length - 1];
                  const delta = last - first;
                  return (
                    <tr key={dim.key}>
                      <td className="py-2">{dim.label}</td>
                      {values.map((v, i) => (
                        <td key={i} className="py-2 text-right font-mono" style={{ color: triColor(v) }}>
                          {v}
                        </td>
                      ))}
                      <td className="py-2 text-right font-semibold">
                        {delta > 0 ? (
                          <span className="text-success">↑ +{delta}</span>
                        ) : delta < 0 ? (
                          <span className="text-review">↓ {delta}</span>
                        ) : (
                          <span className="text-muted">→ 0</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Prediction Accuracy Over Time */}
      {cyclesWithData.some((t) => t.prediction_accuracy !== null) && (
        <div className="rounded-lg border border-lift-border bg-surface p-5">
          <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold">
            🎯 Prediction Accuracy Over Time
          </h2>
          <p className="mb-4 text-xs text-muted">
            How well did LIFT predict which students would thrive? Higher is better.
          </p>
          <div className="flex items-end gap-6">
            {cyclesWithData
              .filter((t) => t.prediction_accuracy !== null)
              .map((t) => {
                const barHeight = Math.max(20, ((t.prediction_accuracy ?? 0) / 100) * 180);
                return (
                  <div key={t.cycle_id} className="flex flex-col items-center gap-2">
                    <span className="stat-hero text-lg" style={{ color: triColor(t.prediction_accuracy ?? 0) }}>
                      {t.prediction_accuracy}%
                    </span>
                    <div
                      className="w-16 rounded-t-lg score-bar-animate"
                      style={{
                        height: barHeight,
                        background: `linear-gradient(to top, #14b8a640, #14b8a6)`,
                      }}
                    />
                    <p className="text-xs font-semibold text-lift-text">{t.academic_year}</p>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
