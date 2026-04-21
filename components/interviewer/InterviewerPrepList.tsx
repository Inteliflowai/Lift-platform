"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BriefingCard } from "@/components/evaluator/BriefingCard";

type Question = { question: string; rationale: string; dimension: string };

type Briefing = {
  key_observations: string[];
  interview_questions: Question[];
  areas_to_explore: string[];
  strengths_to_confirm: string[];
  confidence_explanation: string;
  generated_at: string | null;
};

interface Assignment {
  assignment_id: string;
  assignment_type: string;
  assignment_status: string;
  candidate_id: string;
  first_name: string | null;
  last_name: string | null;
  grade_applying_to: string | null;
  candidate_status: string | null;
  tri_score: number | null;
  briefing: Briefing | null;
}

export function InterviewerPrepList() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/interviewer/assigned", { cache: "no-store" });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          setError(err.error ?? "Failed to load assignments");
          return;
        }
        const data = (await res.json()) as { assignments: Assignment[] };
        setAssignments(data.assignments);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="rounded-lg border border-lift-border bg-surface p-6">
        <p className="text-sm text-muted">Loading your assigned interviews…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-4">
        <p className="text-sm text-rose-300">{error}</p>
      </div>
    );
  }

  if (assignments.length === 0) {
    return (
      <div className="rounded-lg border border-lift-border bg-surface p-6">
        <p className="text-sm text-muted">
          No candidates assigned for interview yet. Your school admin will assign candidates
          as they complete their assessments and become ready for committee review.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Mobile-first: single column below md, two cards per row on md+ */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {assignments.map((a) => (
          <AssignmentCard key={a.assignment_id} assignment={a} />
        ))}
      </div>
    </div>
  );
}

function AssignmentCard({ assignment }: { assignment: Assignment }) {
  const fullName =
    [assignment.first_name, assignment.last_name].filter(Boolean).join(" ") || "Candidate";
  const profileFinalized = assignment.briefing !== null;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-lift-border bg-surface p-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold">{fullName}</h3>
          <p className="text-xs text-muted">
            Grade {assignment.grade_applying_to ?? "—"}
            {typeof assignment.tri_score === "number" && (
              <> · TRI {Math.round(assignment.tri_score)}</>
            )}
          </p>
        </div>
        <AssignmentStatusPill status={assignment.assignment_status} />
      </div>

      {/* Briefing — compact variant, expandable inline */}
      <BriefingCard
        briefing={assignment.briefing}
        profileFinalized={profileFinalized}
        variant="compact"
        candidateId={assignment.candidate_id}
      />

      {/* Actions — thumb-sized for mobile */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Link
          href={`/evaluator/candidates/${assignment.candidate_id}`}
          className="flex min-h-[44px] flex-1 items-center justify-center rounded-md bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary/90"
        >
          Open full profile
        </Link>
        <Link
          href={`/evaluator/candidates/${assignment.candidate_id}?tab=interview`}
          className="flex min-h-[44px] flex-1 items-center justify-center rounded-md border border-lift-border bg-surface px-3 py-2 text-sm font-medium text-lift-text hover:bg-primary/5 hover:text-primary"
        >
          Enter rubric →
        </Link>
      </div>
    </div>
  );
}

function AssignmentStatusPill({ status }: { status: string }) {
  const label =
    status === "completed" ? "Done"
    : status === "in_progress" ? "In progress"
    : "To do";
  const className =
    status === "completed"
      ? "bg-emerald-500/10 text-emerald-400"
      : status === "in_progress"
        ? "bg-amber-500/10 text-amber-400"
        : "bg-muted/20 text-muted";
  return (
    <span className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-medium ${className}`}>
      {label}
    </span>
  );
}
