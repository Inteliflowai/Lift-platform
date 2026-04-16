"use client";

import { useState } from "react";
import Link from "next/link";
import { TRIPill } from "@/components/TRI/TRIGauge";
import { EmptyState, EmptyQueueIcon } from "@/components/EmptyState";
import { useLocale } from "@/lib/i18n/LocaleProvider";

type ReviewCandidate = {
  candidate_id: string;
  requires_human_review: boolean;
  low_confidence_flags: string[] | null;
  unusual_pattern_flags: string[] | null;
  overall_confidence: number | null;
  generated_at: string;
  candidates: unknown;
  sessions: unknown;
};

type AllCandidate = {
  id: string;
  first_name: string;
  last_name: string;
  grade_band: string;
  grade_applying_to?: string;
  status: string;
  created_at: string;
  sessions: { completion_pct: number; last_activity_at: string | null; completed_at: string | null }[];
  insight_profiles: { requires_human_review: boolean; overall_confidence: number | null; tri_score: number | null; tri_label: string | null; tri_confidence: string | null }[];
  evaluator_reviews: { recommendation_tier: string | null; status: string }[];
};

export function EvaluatorDashboardClient({
  reviewCandidates,
  myReviewCandidateIds,
  allCandidates,
  newAssignmentCount,
}: {
  reviewCandidates: ReviewCandidate[];
  myReviewCandidateIds: string[];
  allCandidates: AllCandidate[];
  newAssignmentCount?: number;
}) {
  const { t } = useLocale();
  const [tab, setTab] = useState<"queue" | "all">("queue");
  const [search, setSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [reviewFilter, setReviewFilter] = useState(false);

  // Build queue items
  const queueItems = reviewCandidates.map((rc) => {
    const c = rc.candidates as { id: string; first_name: string; last_name: string; grade_band: string; grade_applying_to?: string; status: string } | null;
    const s = rc.sessions as { completion_pct: number; completed_at: string | null } | null;
    const flags = [...(rc.low_confidence_flags ?? []), ...(rc.unusual_pattern_flags ?? [])];
    const isMyReview = c ? myReviewCandidateIds.includes(c.id) : false;
    const timeSince = rc.generated_at
      ? Math.round((Date.now() - new Date(rc.generated_at).getTime()) / 3600000)
      : null;

    return { ...rc, candidate: c, session: s, flags, isMyReview, hoursSince: timeSince };
  }).filter((q) => q.candidate);

  // Deduplicate queue by candidate id
  const seenQueueIds = new Set<string>();
  const dedupedQueue = queueItems.filter((q) => {
    const id = q.candidate!.id;
    if (seenQueueIds.has(id)) return false;
    seenQueueIds.add(id);
    return true;
  });

  const filteredAll = allCandidates.filter((c) => {
    if (search && !`${c.first_name} ${c.last_name}`.toLowerCase().includes(search.toLowerCase())) return false;
    if (gradeFilter && (c.grade_applying_to || c.grade_band) !== gradeFilter) return false;
    if (statusFilter && c.status !== statusFilter) return false;
    if (reviewFilter && !c.insight_profiles?.some((p) => p.requires_human_review)) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Evaluator Workspace</h1>
        <p className="mt-1 text-sm text-muted">Review candidates assigned to you and browse all candidates in this cycle</p>
      </div>

      {/* New assignment notification */}
      {(newAssignmentCount ?? 0) > 0 && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 flex items-center gap-3">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
            {newAssignmentCount}
          </span>
          <p className="text-sm text-primary font-medium">
            {newAssignmentCount === 1
              ? "1 new candidate assigned to you"
              : `${newAssignmentCount} new candidates assigned to you`}
          </p>
        </div>
      )}

      <div className="flex gap-1 border-b border-lift-border">
        {(["queue", "all"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize ${
              tab === t ? "border-b-2 border-primary text-primary" : "text-muted hover:text-lift-text"
            }`}
          >
            {t === "queue" ? `My Queue (${dedupedQueue.length})` : "All Candidates"}
          </button>
        ))}
      </div>

      {tab === "queue" && (
        <div className="space-y-3">
          {dedupedQueue.length === 0 && (
            <EmptyState
              icon={<EmptyQueueIcon />}
              title={t("evaluator.queue_empty_title")}
              description={t("evaluator.queue_empty_desc")}
              action={{ label: t("evaluator.all_candidates"), href: "/evaluator/candidates" }}
            />
          )}
          {dedupedQueue.map((q) => (
            <div key={q.candidate!.id} className="flex items-center justify-between rounded-lg border border-lift-border bg-surface p-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{q.candidate!.first_name} {q.candidate!.last_name}</span>
                  <span className="text-xs text-muted">Grade {q.candidate!.grade_applying_to || q.candidate!.grade_band}</span>
                  {q.isMyReview && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">Assigned</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1">
                  {q.flags.map((f, i) => (
                    <span key={i} className="rounded-full bg-warning/10 px-2 py-0.5 text-xs text-warning">{f.replace(/_/g, " ")}</span>
                  ))}
                </div>
                <p className="text-xs text-muted">
                  {q.session?.completion_pct ?? 0}% complete
                  {q.hoursSince != null && ` · ${q.hoursSince}h ago`}
                </p>
              </div>
              <Link
                href={`/evaluator/candidates/${q.candidate!.id}`}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90"
              >
                Review
              </Link>
            </div>
          ))}
        </div>
      )}

      {tab === "all" && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className="rounded-md border border-lift-border bg-page-bg px-3 py-2 text-sm text-lift-text outline-none focus:border-primary" />
            <select value={gradeFilter} onChange={(e) => setGradeFilter(e.target.value)} className="rounded-md border border-lift-border bg-page-bg px-3 py-2 text-sm text-lift-text outline-none">
              <option value="">All Grades</option>
              <option value="6-7">6-7</option>
              <option value="8">8</option>
              <option value="9-11">9-11</option>
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-md border border-lift-border bg-page-bg px-3 py-2 text-sm text-lift-text outline-none">
              <option value="">All Statuses</option>
              <option value="invited">Invited</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="flagged">Flagged</option>
              <option value="reviewed">Reviewed</option>
            </select>
            <label className="flex items-center gap-2 text-sm text-muted">
              <input type="checkbox" checked={reviewFilter} onChange={(e) => setReviewFilter(e.target.checked)} className="rounded" />
              Needs review
            </label>
          </div>

          <div className="overflow-x-auto rounded-lg border border-lift-border">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-lift-border bg-surface text-xs text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Grade</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Completion</th>
                  <th className="px-4 py-3 font-medium">TRI</th>
                  <th className="px-4 py-3 font-medium">Review</th>
                  <th className="px-4 py-3 font-medium">Recommendation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-lift-border">
                {filteredAll.map((c) => {
                  const sess = c.sessions?.[0];
                  const profile = c.insight_profiles?.[0];
                  const review = c.evaluator_reviews?.find((r) => r.status === "finalized") ?? c.evaluator_reviews?.[0];
                  return (
                    <tr key={c.id} className="hover:bg-surface/50 cursor-pointer" onClick={() => window.location.href = `/evaluator/candidates/${c.id}`}>
                      <td className="px-4 py-3 font-medium text-primary">{c.first_name} {c.last_name}</td>
                      <td className="px-4 py-3 text-muted">{c.grade_applying_to || c.grade_band}</td>
                      <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                      <td className="px-4 py-3">{sess?.completion_pct ?? 0}%</td>
                      <td className="px-4 py-3"><TRIPill score={profile?.tri_score ?? null} label={profile?.tri_label ?? null} confidence={profile?.tri_confidence ?? null} /></td>
                      <td className="px-4 py-3">{profile?.requires_human_review ? <span className="rounded-full bg-review/10 px-2 py-0.5 text-xs text-review">Required</span> : null}</td>
                      <td className="px-4 py-3 text-xs text-muted">{review?.recommendation_tier?.replace(/_/g, " ") ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    invited: "bg-primary/10 text-primary", active: "bg-success/10 text-success",
    completed: "bg-success/10 text-success", flagged: "bg-review/10 text-review",
    reviewed: "bg-muted/10 text-muted",
  };
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] ?? "bg-muted/10 text-muted"}`}>{status}</span>;
}
