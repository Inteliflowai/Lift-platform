"use client";

import { useState, useEffect } from "react";
import { EmptyState, EmptyReportsIcon } from "@/components/EmptyState";

type AccuracyRecord = {
  grade_band: string;
  sample_size: number;
  tri_accuracy_pct: number;
  high_tri_retention_pct: number | null;
  low_tri_support_pct: number | null;
  strongest_predictor: string | null;
  weakest_predictor: string | null;
  summary_narrative: string | null;
  computed_at: string;
};

export default function AccuracyReportPage() {
  const [data, setData] = useState<AccuracyRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Trigger computation then fetch results
    fetch("/api/analytics/accuracy", { method: "POST" })
      .then((r) => r.json())
      .then((d) => {
        setData(d.results ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="py-16 text-center text-muted">Computing prediction accuracy...</div>;
  }

  const totalSample = data.reduce((s, d) => s + d.sample_size, 0);
  const avgAccuracy = data.length > 0
    ? Math.round(data.reduce((s, d) => s + d.tri_accuracy_pct * d.sample_size, 0) / totalSample)
    : 0;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Prediction Accuracy Report</h1>
        <p className="text-sm text-muted">
          Compares LIFT&apos;s TRI predictions against real-world student outcomes.
        </p>
      </div>

      {totalSample < 10 && (
        <EmptyState
          icon={<EmptyReportsIcon />}
          title="Not enough data yet"
          description={`You need at least 10 students with recorded outcomes to generate an accuracy report. Currently: ${totalSample} students.`}
          action={{ label: "Record Outcomes", href: "/school/candidates" }}
        />
      )}

      {totalSample >= 10 && (
        <>
          {/* Overall Accuracy */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-6 text-center">
            <p className="text-xs text-primary font-semibold uppercase tracking-wider">Overall Prediction Accuracy</p>
            <p className="mt-2 text-5xl font-extrabold text-primary">{avgAccuracy}%</p>
            <p className="mt-1 text-sm text-muted">
              TRI predicted outcomes correctly in {avgAccuracy}% of cases across {totalSample} students.
            </p>
          </div>

          {/* Key Insights */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {data.map((d) => (
              <div key={d.grade_band} className="rounded-lg border border-lift-border bg-surface p-5 space-y-3">
                <p className="text-xs font-semibold text-primary">Grade Band {d.grade_band}</p>
                <p className="text-xs text-muted">{d.sample_size} students</p>

                <div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-muted">TRI Accuracy</span>
                    <span className="text-lg font-bold">{d.tri_accuracy_pct}%</span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-lift-border overflow-hidden">
                    <div
                      className={`h-full rounded-full ${d.tri_accuracy_pct >= 70 ? "bg-success" : d.tri_accuracy_pct >= 50 ? "bg-primary" : "bg-warning"}`}
                      style={{ width: `${d.tri_accuracy_pct}%` }}
                    />
                  </div>
                </div>

                {d.high_tri_retention_pct != null && (
                  <div className="rounded-md bg-success/5 border border-success/20 p-2">
                    <p className="text-xs text-success font-medium">{d.high_tri_retention_pct}% retention</p>
                    <p className="text-[10px] text-muted">Ready/Thriving candidates retained through Year 1</p>
                  </div>
                )}

                {d.low_tri_support_pct != null && (
                  <div className="rounded-md bg-warning/5 border border-warning/20 p-2">
                    <p className="text-xs text-warning font-medium">{d.low_tri_support_pct}% used support</p>
                    <p className="text-[10px] text-muted">Emerging/Developing candidates received learning support</p>
                  </div>
                )}

                {d.strongest_predictor && (
                  <p className="text-[10px] text-muted">
                    Strongest predictor: <span className="font-semibold capitalize text-success">{d.strongest_predictor.replace("_", " ")}</span>
                  </p>
                )}
                {d.weakest_predictor && (
                  <p className="text-[10px] text-muted">
                    Weakest predictor: <span className="font-semibold capitalize text-warning">{d.weakest_predictor.replace("_", " ")}</span>
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Disclaimer */}
          <div className="rounded-lg border border-lift-border bg-page-bg p-4 text-center">
            <p className="text-xs text-muted">
              This report is based on {totalSample} students with recorded outcomes.
              Accuracy improves with larger sample sizes. LIFT predictions are non-diagnostic
              and should be used alongside professional judgment.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
