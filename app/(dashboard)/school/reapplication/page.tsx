"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";

type ReapplicationRecord = {
  id: string;
  candidate_id: string;
  prior_tri_score: number;
  current_tri_score: number;
  tri_delta: number;
  dimension_deltas: Record<string, number>;
  prior_recommendation: string | null;
  flagged_for_review: boolean;
  created_at: string;
  candidates: {
    first_name: string;
    last_name: string;
    grade_band: string;
    gender: string | null;
  };
};

export default function ReapplicationPage() {
  const [records, setRecords] = useState<ReapplicationRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/school/reapplication")
      .then((r) => r.json())
      .then((data) => {
        setRecords(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="py-16 text-center text-muted">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Re-Application Intelligence</h1>
        <p className="text-sm text-muted">
          Candidates who have applied before. Shows how their readiness has changed since their prior application.
        </p>
      </div>

      {records.length === 0 && (
        <EmptyState
          icon={
            <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="15" y="15" width="50" height="50" rx="4" stroke="currentColor" strokeWidth="2" />
              <path d="M30 40h20M40 30v20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M25 25l6 6M49 25l6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          }
          title="No re-applications detected"
          description="When a candidate applies for a second time, LIFT automatically compares their current session to their prior one and shows you the changes."
        />
      )}

      {records.length > 0 && (
        <div className="space-y-4">
          {records.map((r) => {
            const positive = r.tri_delta >= 0;
            const dims = Object.entries(r.dimension_deltas ?? {});

            return (
              <div
                key={r.id}
                className={`rounded-xl border bg-surface p-5 ${
                  r.flagged_for_review ? "border-warning/30" : "border-lift-border"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <Link
                      href={`/evaluator/candidates/${r.candidate_id}`}
                      className="text-sm font-semibold text-primary hover:underline"
                    >
                      {r.candidates?.first_name} {r.candidates?.last_name}
                    </Link>
                    <p className="text-xs text-muted">
                      Grade {r.candidates?.grade_band}
                      {r.candidates?.gender && (
                        <span className="ml-2 capitalize">{r.candidates.gender.replace("_", " ")}</span>
                      )}
                      {r.prior_recommendation && (
                        <span className="ml-2">
                          Prior: <span className="capitalize">{r.prior_recommendation.replace("_", " ")}</span>
                        </span>
                      )}
                    </p>
                  </div>
                  {r.flagged_for_review && (
                    <span className="rounded-full bg-warning/10 px-2 py-0.5 text-[10px] font-medium text-warning">
                      Significant Change
                    </span>
                  )}
                </div>

                {/* TRI Comparison */}
                <div className="mt-4 flex items-center gap-6">
                  <div className="text-center">
                    <p className="text-[10px] text-muted">Prior TRI</p>
                    <p className="text-xl font-bold">{Number(r.prior_tri_score).toFixed(0)}</p>
                  </div>
                  <div className="text-center">
                    <span className={`text-lg font-bold ${positive ? "text-success" : "text-review"}`}>
                      {positive ? "+" : ""}{Number(r.tri_delta).toFixed(1)}
                    </span>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-muted">Current TRI</p>
                    <p className="text-xl font-bold">{Number(r.current_tri_score).toFixed(0)}</p>
                  </div>
                </div>

                {/* Dimension Deltas */}
                {dims.length > 0 && (
                  <div className="mt-4 grid grid-cols-3 gap-2 lg:grid-cols-6">
                    {dims.map(([dim, delta]) => {
                      const d = Number(delta);
                      const isPositive = d >= 0;
                      return (
                        <div key={dim} className="rounded-lg border border-lift-border p-2 text-center">
                          <p className="text-[9px] text-muted capitalize">{dim.replace("_", " ")}</p>
                          <p className={`text-sm font-bold ${isPositive ? "text-success" : "text-review"}`}>
                            {isPositive ? "+" : ""}{d.toFixed(0)}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
