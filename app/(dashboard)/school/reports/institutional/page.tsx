"use client";

import { useState, useEffect } from "react";
import { BackButton } from "@/components/ui/BackButton";

interface EvaluatorStat {
  evaluator_id: string;
  name: string;
  total_reviews: number;
  strong_admits: number;
  admits_with_outcomes: number;
  admits_thrived: number;
  admits_struggled: number;
  accuracy_pct: number | null;
}

interface Summary {
  total_cycles: number;
  years_active: string;
  total_candidates: number;
  total_sessions: number;
  overall_prediction_accuracy: number | null;
}

const triColor = (n: number) =>
  n >= 75 ? "#10b981" : n >= 50 ? "#14b8a6" : "#f59e0b";

export default function InstitutionalMemoryPage() {
  const [evaluators, setEvaluators] = useState<EvaluatorStat[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/analytics/institutional")
      .then((r) => r.json())
      .then((d) => {
        setEvaluators(d.evaluator_stats ?? []);
        setSummary(d.summary ?? null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="py-16 text-center text-muted">Loading institutional data...</div>;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <BackButton label="Analytics" href="/school/analytics" />
      <div>
        <h1 className="text-2xl font-bold">Institutional Memory</h1>
        <p className="mt-1 text-sm text-muted">
          Multi-year admissions intelligence — evaluator calibration, prediction accuracy, and institutional trends
        </p>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          <div className="card-hover rounded-lg border border-lift-border bg-surface p-4 accent-left-green">
            <p className="text-xs text-muted">📅 Years Active</p>
            <p className="mt-1 text-lg font-bold text-lift-text">{summary.years_active}</p>
          </div>
          <div className="card-hover rounded-lg border border-lift-border bg-surface p-4 accent-left-indigo">
            <p className="text-xs text-muted">🔄 Cycles</p>
            <p className="mt-1 stat-hero text-lift-text">{summary.total_cycles}</p>
          </div>
          <div className="card-hover rounded-lg border border-lift-border bg-surface p-4 accent-left-indigo">
            <p className="text-xs text-muted">🎓 Total Candidates</p>
            <p className="mt-1 stat-hero text-lift-text">{summary.total_candidates}</p>
          </div>
          <div className="card-hover rounded-lg border border-lift-border bg-surface p-4 accent-left-green">
            <p className="text-xs text-muted">✅ Sessions Completed</p>
            <p className="mt-1 stat-hero text-lift-text">{summary.total_sessions}</p>
          </div>
          <div className="card-hover rounded-lg border border-lift-border bg-surface p-4 accent-left-green">
            <p className="text-xs text-muted">🎯 Overall Accuracy</p>
            <p className="mt-1 stat-hero" style={{ color: triColor(summary.overall_prediction_accuracy ?? 0) }}>
              {summary.overall_prediction_accuracy !== null ? `${summary.overall_prediction_accuracy}%` : "—"}
            </p>
          </div>
        </div>
      )}

      {/* Evaluator Calibration */}
      <div className="rounded-lg border border-lift-border bg-surface p-5">
        <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold">
          👩‍💼 Evaluator Calibration
        </h2>
        <p className="mb-4 text-xs text-muted">
          Which evaluators&apos; recommendations most closely predicted actual student outcomes?
          Requires at least 3 students with recorded outcomes.
        </p>

        {evaluators.length === 0 ? (
          <div className="rounded-lg border border-lift-border bg-page-bg p-8 text-center">
            <p className="text-sm text-muted">
              No evaluator calibration data yet. Record student outcomes for admitted candidates to see
              which evaluators have the strongest predictive track record.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted">
                <tr>
                  <th className="pb-2 text-left font-medium">Evaluator</th>
                  <th className="pb-2 text-right font-medium">Reviews</th>
                  <th className="pb-2 text-right font-medium">Admits</th>
                  <th className="pb-2 text-right font-medium">With Outcomes</th>
                  <th className="pb-2 text-right font-medium">Thrived</th>
                  <th className="pb-2 text-right font-medium">Struggled</th>
                  <th className="pb-2 text-right font-medium">Accuracy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-lift-border">
                {evaluators.map((e) => (
                  <tr key={e.evaluator_id}>
                    <td className="py-2 font-medium">{e.name}</td>
                    <td className="py-2 text-right">{e.total_reviews}</td>
                    <td className="py-2 text-right">{e.strong_admits}</td>
                    <td className="py-2 text-right">{e.admits_with_outcomes}</td>
                    <td className="py-2 text-right text-success font-semibold">{e.admits_thrived}</td>
                    <td className="py-2 text-right text-review font-semibold">{e.admits_struggled}</td>
                    <td className="py-2 text-right">
                      {e.accuracy_pct !== null ? (
                        <span className="font-bold" style={{ color: triColor(e.accuracy_pct) }}>
                          {e.accuracy_pct}%
                        </span>
                      ) : (
                        <span className="text-muted text-xs">Need 3+ outcomes</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Board-Ready Insight */}
      {summary && summary.overall_prediction_accuracy !== null && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-5">
          <h2 className="mb-2 text-sm font-semibold text-primary">📋 Board-Ready Insight</h2>
          <p className="text-sm leading-relaxed text-lift-text">
            Over {summary.total_cycles} admissions cycle{summary.total_cycles !== 1 ? "s" : ""},{" "}
            LIFT assessed {summary.total_candidates} candidates and achieved a{" "}
            <strong style={{ color: triColor(summary.overall_prediction_accuracy) }}>
              {summary.overall_prediction_accuracy}%
            </strong>{" "}
            prediction accuracy rate — meaning LIFT&apos;s Transition Readiness Index correctly
            predicted which students would thrive at your school {summary.overall_prediction_accuracy}%
            of the time. This institutional data strengthens your admissions process with each cycle.
          </p>
        </div>
      )}
    </div>
  );
}
