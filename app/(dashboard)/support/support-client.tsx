"use client";

import { useState } from "react";
import Link from "next/link";
import { Users, FileCheck, AlertTriangle } from "lucide-react";

interface Candidate {
  id: string;
  first_name: string;
  last_name: string;
  grade_applying: string | null;
  status: string;
  gender: string | null;
}

interface ChecklistItem {
  id: string;
  completed: boolean;
}

interface Plan {
  id: string;
  candidate_id: string;
  support_level: string;
  status: string;
  checklist_items: ChecklistItem[];
  generated_at: string;
}

const SUPPORT_LEVEL_COLORS: Record<string, string> = {
  independent: "bg-green-100 text-green-700",
  standard: "bg-blue-100 text-blue-700",
  enhanced: "bg-amber-100 text-amber-700",
  intensive: "bg-red-100 text-red-700",
};

export function SupportDashboardClient({
  candidates,
  plans,
}: {
  candidates: Candidate[];
  plans: Plan[];
}) {
  const [filter, setFilter] = useState<string>("all");

  // Map candidate -> latest plan
  const planMap = new Map<string, Plan>();
  for (const p of plans) {
    if (!planMap.has(p.candidate_id)) {
      planMap.set(p.candidate_id, p);
    }
  }

  const filtered = filter === "all"
    ? candidates
    : filter === "no_plan"
    ? candidates.filter((c) => !planMap.has(c.id))
    : candidates.filter((c) => {
        const p = planMap.get(c.id);
        return p?.support_level === filter;
      });

  // Stats
  const withPlan = candidates.filter((c) => planMap.has(c.id)).length;
  const intensiveCount = plans.filter((p) => p.support_level === "intensive").length;
  const enhancedCount = plans.filter((p) => p.support_level === "enhanced").length;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-lift-text">Support Plans</h1>
        <p className="mt-1 text-sm text-muted">
          Admitted candidates and their 90-day onboarding support plans.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-lift-border bg-surface p-4">
          <div className="flex items-center gap-2 text-muted">
            <Users size={16} />
            <span className="text-xs font-medium">Admitted</span>
          </div>
          <p className="mt-1 text-2xl font-bold text-lift-text">{candidates.length}</p>
        </div>
        <div className="rounded-lg border border-lift-border bg-surface p-4">
          <div className="flex items-center gap-2 text-muted">
            <FileCheck size={16} />
            <span className="text-xs font-medium">Plans Generated</span>
          </div>
          <p className="mt-1 text-2xl font-bold text-lift-text">{withPlan}</p>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center gap-2 text-amber-600">
            <AlertTriangle size={16} />
            <span className="text-xs font-medium">Enhanced</span>
          </div>
          <p className="mt-1 text-2xl font-bold text-amber-700">{enhancedCount}</p>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-center gap-2 text-red-600">
            <AlertTriangle size={16} />
            <span className="text-xs font-medium">Intensive</span>
          </div>
          <p className="mt-1 text-2xl font-bold text-red-700">{intensiveCount}</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {[
          { value: "all", label: "All" },
          { value: "no_plan", label: "No Plan" },
          { value: "independent", label: "Independent" },
          { value: "standard", label: "Standard" },
          { value: "enhanced", label: "Enhanced" },
          { value: "intensive", label: "Intensive" },
        ].map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              filter === f.value
                ? "bg-primary text-white"
                : "bg-gray-100 text-muted hover:bg-gray-200"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Candidate List */}
      <div className="space-y-3">
        {filtered.map((c) => {
          const plan = planMap.get(c.id);
          const checklist = (plan?.checklist_items ?? []) as ChecklistItem[];
          const done = checklist.filter((i) => i.completed).length;
          const total = checklist.length;
          const pct = total > 0 ? Math.round((done / total) * 100) : 0;

          return (
            <Link
              key={c.id}
              href={`/evaluator/candidates/${c.id}`}
              className="flex items-center justify-between rounded-lg border border-lift-border bg-surface p-4 hover:border-primary/30 transition"
            >
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-sm font-semibold text-lift-text">
                    {c.first_name} {c.last_name}
                  </p>
                  <p className="text-xs text-muted">
                    Grade: {c.grade_applying || "—"}{c.gender ? ` • ${c.gender}` : ""}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                {plan ? (
                  <>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${SUPPORT_LEVEL_COLORS[plan.support_level] ?? "bg-gray-100 text-gray-600"}`}>
                      {plan.support_level}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                      plan.status === "shared" ? "bg-primary/10 text-primary" : plan.status === "finalized" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                    }`}>
                      {plan.status}
                    </span>
                    {total > 0 && (
                      <div className="flex items-center gap-2 min-w-[120px]">
                        <div className="h-1.5 flex-1 rounded-full bg-gray-200">
                          <div
                            className="h-1.5 rounded-full bg-primary transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted whitespace-nowrap">{done}/{total}</span>
                      </div>
                    )}
                  </>
                ) : (
                  <span className="text-xs text-muted">No plan yet</span>
                )}
              </div>
            </Link>
          );
        })}

        {filtered.length === 0 && (
          <div className="rounded-lg border border-dashed border-lift-border p-8 text-center">
            <p className="text-sm text-muted">No candidates match this filter.</p>
          </div>
        )}
      </div>
    </div>
  );
}
