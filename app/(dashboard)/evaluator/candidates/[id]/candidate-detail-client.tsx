"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SupportPanel } from "@/components/LearningSupport/SupportPanel";
import { TRIGauge } from "@/components/TRI/TRIGauge";
import { BriefingCard } from "@/components/evaluator/BriefingCard";
import { SynthesisPanel } from "@/components/evaluator/SynthesisPanel";
import { RubricForm } from "@/components/interviewer/RubricForm";

type Tab = "overview" | "responses" | "signals" | "review" | "interview";
const TIERS = ["strong_admit", "admit", "waitlist", "decline", "defer", "needs_more_info"] as const;
const DIMENSIONS = ["reading", "writing", "reasoning", "reflection", "persistence", "support_seeking"] as const;

function scoreColor(score: number | null): string {
  if (score == null) return "bg-muted/20";
  if (score >= 70) return "bg-success";
  if (score >= 40) return "bg-warning";
  return "bg-review";
}

export function CandidateDetailClient({
  candidate, profile, sessions, responses, timingSignals, helpEvents,
  interactionSignals, sessionEvents, reviews, interviewNotes, inviteSentAt,
  tenantId, learningSupport, briefing, rubricSubmissions, synthesis, benchmarks,
}: {
  candidate: Record<string, unknown>;
  profile: Record<string, unknown> | null;
  sessions: { id: string; status: string; completion_pct: number; completed_at: string | null }[];
  responses: unknown[];
  timingSignals: unknown[];
  helpEvents: unknown[];
  interactionSignals: unknown[];
  sessionEvents: unknown[];
  reviews: Record<string, unknown>[];
  interviewNotes: Record<string, unknown>[];
  inviteSentAt: string | null | undefined;
  tenantId: string;
  learningSupport: Record<string, unknown> | null;
  briefing: Record<string, unknown> | null;
  rubricSubmissions: Record<string, unknown>[];
  synthesis: Record<string, unknown> | null;
  benchmarks: Record<string, unknown> | null;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview");

  const tabs: Tab[] = ["overview", "responses", "signals", "review", "interview"];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">
        {candidate.first_name as string} {candidate.last_name as string}
      </h1>
      <p className="text-sm text-muted">
        Grade {candidate.grade_applying_to as string} (Band {candidate.grade_band as string})
      </p>

      <div className="flex gap-1 border-b border-lift-border">
        {tabs.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize ${tab === t ? "border-b-2 border-primary text-primary" : "text-muted hover:text-lift-text"}`}>
            {t === "review" ? "Evaluator Review" : t === "interview" ? "Interview Notes" : t}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="space-y-6">
          <OverviewTab candidate={candidate} profile={profile} inviteSentAt={inviteSentAt} sessions={sessions} benchmarks={benchmarks} />
          <BriefingCard briefing={briefing as Parameters<typeof BriefingCard>[0]["briefing"]} />
          {rubricSubmissions.length > 0 && (
            <SynthesisPanel
              synthesis={synthesis as Parameters<typeof SynthesisPanel>[0]["synthesis"]}
              originalPlacement={profile?.placement_guidance as string | null}
            />
          )}
          <SupportPanel
            signal={learningSupport as Parameters<typeof SupportPanel>[0]["signal"]}
            onView={() => {
              fetch("/api/audit-log", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ candidate_id: candidate.id, action: "learning_support_viewed" }),
              }).catch(() => {});
            }}
          />
        </div>
      )}
      {tab === "responses" && <ResponsesTab responses={responses} />}
      {tab === "signals" && <SignalsTab timing={timingSignals} help={helpEvents} interactions={interactionSignals} events={sessionEvents} />}
      {tab === "review" && <ReviewTab candidateId={candidate.id as string} tenantId={tenantId} reviews={reviews} router={router} rubricSubmissions={rubricSubmissions} profile={profile} />}
      {tab === "interview" && <InterviewTabV2 candidateId={candidate.id as string} tenantId={tenantId} candidateName={`${candidate.first_name} ${candidate.last_name}`} rubricSubmissions={rubricSubmissions} notes={interviewNotes} router={router} />}
    </div>
  );
}

function OverviewTab({ candidate, profile, inviteSentAt, sessions, benchmarks }: {
  candidate: Record<string, unknown>; profile: Record<string, unknown> | null;
  inviteSentAt: string | null | undefined; sessions: { completed_at: string | null }[];
  benchmarks: Record<string, unknown> | null;
}) {
  const p = profile;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 text-sm lg:grid-cols-3">
        <div><span className="text-muted">Language:</span> {candidate.preferred_language as string ?? "en"}</div>
        <div><span className="text-muted">DOB:</span> {candidate.date_of_birth as string ?? "—"}</div>
        <div><span className="text-muted">Invite Sent:</span> {inviteSentAt ? new Date(inviteSentAt).toLocaleDateString() : "—"}</div>
        <div><span className="text-muted">Completed:</span> {sessions[0]?.completed_at ? new Date(sessions[0].completed_at).toLocaleDateString() : "—"}</div>
        <div><span className="text-muted">CORE Sync:</span>{" "}
          <CoreSyncBadge status={candidate.core_sync_status as string} syncAt={candidate.core_sync_at as string | null} coreStudentId={candidate.core_student_id as string | null} candidateId={candidate.id as string} />
        </div>
      </div>

      {/* TRI Hero Panel */}
      {p && (
        <TRIGauge
          score={p.tri_score != null ? Number(p.tri_score) : null}
          label={p.tri_label as string | null}
          confidence={p.tri_confidence as string | null}
          summary={p.tri_summary as string | null}
        />
      )}

      {p && (
        <>
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Dimension Scores</h2>
            {DIMENSIONS.map((dim) => {
              const score = p[`${dim}_score`] as number | null;
              const val = score != null ? Math.round(Number(score)) : null;
              const bmKey = `avg_${dim}`;
              const bmVal = benchmarks?.[bmKey] != null ? Math.round(Number(benchmarks[bmKey])) : null;
              const diff = val != null && bmVal != null ? val - bmVal : null;
              const diffColor = diff != null ? (diff > 0 ? "text-[#10b981]" : diff < -15 ? "text-[#f43f5e]" : "text-[#f59e0b]") : "";
              return (
                <div key={dim} className="flex items-center gap-3">
                  <span className="w-32 text-sm capitalize">{dim.replace("_", " ")}</span>
                  <div className="relative flex-1 h-4 rounded-full bg-lift-border overflow-hidden">
                    <div className={`h-full rounded-full ${scoreColor(val)}`} style={{ width: `${val ?? 0}%` }} />
                    {bmVal != null && (
                      <div className="absolute top-0 h-full w-0.5 bg-[#1a1a2e]/40" style={{ left: `${bmVal}%` }}
                        title={`Cycle avg: ${bmVal}`} />
                    )}
                  </div>
                  <span className={`w-10 text-right text-sm font-bold ${diffColor}`}>{val ?? "—"}</span>
                  {bmVal != null && <span className="w-16 text-[10px] text-muted">avg {bmVal}</span>}
                </div>
              );
            })}
            {benchmarks && (
              <p className="text-[10px] text-muted mt-1">
                Compared to {String(benchmarks.candidate_count ?? 0)} candidates in this cycle · Grade {candidate.grade_band as string}
              </p>
            )}
          </div>

          <div className="flex gap-3 text-sm">
            <span>Confidence: <span className="font-bold">{String(p.overall_confidence ?? 0)}%</span></span>
            {p.requires_human_review ? <span className="rounded-full bg-review/10 px-2 py-0.5 text-xs text-review">Needs Review</span> : null}
          </div>

          {((p.low_confidence_flags as string[])?.length > 0 || (p.unusual_pattern_flags as string[])?.length > 0) && (
            <div className="flex flex-wrap gap-1">
              {[...(p.low_confidence_flags as string[] ?? []), ...(p.unusual_pattern_flags as string[] ?? [])].map((f, i) => (
                <span key={i} className="rounded-full bg-warning/10 px-2 py-0.5 text-xs text-warning">{f.replace(/_/g, " ")}</span>
              ))}
            </div>
          )}

          {p.internal_narrative && (
            <div className="rounded-lg border border-lift-border bg-surface p-4">
              <h3 className="mb-2 text-sm font-semibold">Internal Report</h3>
              <div className="text-sm text-muted whitespace-pre-wrap">{p.internal_narrative as string}</div>
            </div>
          )}
          {p.placement_guidance && (
            <div className="rounded-lg border border-lift-border bg-surface p-4">
              <h3 className="mb-2 text-sm font-semibold">Placement Guidance</h3>
              <div className="text-sm text-muted whitespace-pre-wrap">{p.placement_guidance as string}</div>
            </div>
          )}
        </>
      )}
      {!p && <p className="text-muted py-4">No insight profile available.</p>}
    </div>
  );
}

function ResponsesTab({ responses }: { responses: unknown[] }) {
  const items = responses as { id: string; sequence_order: number; task_templates: { title: string; task_type: string }; response_text: { response_body: string; word_count: number; submitted_at: string }[]; response_features: { revision_depth: number }[] }[];

  return (
    <div className="space-y-4">
      {items.map((t) => {
        const rt = t.response_text?.[0];
        const rf = t.response_features?.[0];
        return (
          <div key={t.id} className="rounded-lg border border-lift-border bg-surface p-4 space-y-2">
            <div className="flex justify-between">
              <h3 className="text-sm font-semibold">{t.task_templates?.title ?? "Task"}</h3>
              <span className="text-xs text-muted">{t.task_templates?.task_type?.replace(/_/g, " ")}</span>
            </div>
            {rt ? (
              <>
                <div className="text-sm whitespace-pre-wrap rounded-md bg-page-bg p-3 border border-lift-border">{rt.response_body}</div>
                <div className="flex gap-4 text-xs text-muted">
                  <span>{rt.word_count} words</span>
                  {rf && <span>Revision depth: {rf.revision_depth}%</span>}
                  <span>{rt.submitted_at ? new Date(rt.submitted_at).toLocaleString() : ""}</span>
                </div>
              </>
            ) : (
              <p className="text-xs text-muted">No response</p>
            )}
          </div>
        );
      })}
      {items.length === 0 && <p className="text-muted py-4">No responses.</p>}
    </div>
  );
}

function SignalsTab({ timing, help, interactions, events }: {
  timing: unknown[]; help: unknown[]; interactions: unknown[]; events: unknown[];
}) {
  const ts = timing as { signal_type: string; value_ms: number }[];
  const hs = help as { event_type: string }[];
  const is_ = interactions as { signal_type: string }[];
  const es = events as { event_type: string; occurred_at: string; payload: Record<string, unknown> }[];

  const latencies = ts.filter((t) => t.signal_type === "task_dwell_time").map((t) => t.value_ms);
  const avgLatency = latencies.length > 0 ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length / 1000) : 0;
  const textTimes = ts.filter((t) => t.signal_type === "time_on_text").map((t) => t.value_ms);
  const hintCount = hs.filter((h) => h.event_type === "hint_open").length;
  const focusLost = is_.filter((i) => i.signal_type === "focus_lost").length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Avg Response Time", value: `${avgLatency}s` },
          { label: "Hints Used", value: hintCount },
          { label: "Focus Lost", value: focusLost },
          { label: "Session Events", value: es.length },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-lift-border bg-surface p-3 text-center">
            <p className="text-xs text-muted">{s.label}</p>
            <p className="mt-1 text-xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      {textTimes.length > 0 && (
        <div><h3 className="text-sm font-semibold mb-2">Time on Text (reading tasks)</h3>
          <div className="flex gap-2">{textTimes.map((t, i) => (
            <span key={i} className="rounded-md border border-lift-border px-3 py-1 text-sm">{Math.round(t / 1000)}s</span>
          ))}</div>
        </div>
      )}

      <div>
        <h3 className="text-sm font-semibold mb-2">Session Timeline</h3>
        <div className="max-h-64 overflow-y-auto space-y-1">
          {es.map((e, i) => (
            <div key={i} className="flex gap-3 text-xs">
              <span className="w-36 shrink-0 text-muted">{new Date(e.occurred_at).toLocaleString()}</span>
              <span className="font-mono">{e.event_type}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ReviewTab({ candidateId, tenantId, reviews, router, rubricSubmissions, profile }: {
  candidateId: string; tenantId: string;
  reviews: Record<string, unknown>[];
  router: ReturnType<typeof useRouter>;
  rubricSubmissions: Record<string, unknown>[];
  profile: Record<string, unknown> | null;
}) {
  const [notes, setNotes] = useState((reviews[0]?.notes as string) ?? "");
  const [tier, setTier] = useState((reviews[0]?.recommendation_tier as string) ?? "");
  const [overrideReason, setOverrideReason] = useState("");
  const [showOverride, setShowOverride] = useState(false);
  const [saving, setSaving] = useState(false);

  const review = reviews[0] ?? null;
  const isFinalized = review?.status === "finalized";
  const reviewId = review?.id as string | undefined;

  async function startReview() {
    setSaving(true);
    await fetch("/api/evaluator-reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ candidate_id: candidateId, tenant_id: tenantId }),
    });
    setSaving(false);
    router.refresh();
  }

  async function saveReview(updates: Record<string, unknown>) {
    if (!reviewId) return;
    await fetch(`/api/evaluator-reviews/${reviewId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
  }

  async function handleTierChange(newTier: string) {
    setTier(newTier);
    // Check if different from AI default
    const aiSnapshot = review?.ai_recommendation_snapshot as Record<string, unknown> | undefined;
    if (aiSnapshot && Object.keys(aiSnapshot).length > 0) {
      setShowOverride(true);
    } else {
      await saveReview({ recommendation_tier: newTier });
    }
  }

  async function confirmOverride() {
    await saveReview({ recommendation_tier: tier, override_reason: overrideReason });
    setShowOverride(false);
  }

  async function finalize() {
    await saveReview({ status: "finalized" });
    router.refresh();
  }

  async function reopen() {
    await saveReview({ status: "in_progress", finalized_at: null });
    router.refresh();
  }

  if (!review) {
    return (
      <div className="py-8 text-center">
        <p className="text-muted">No review started yet.</p>
        <button onClick={startReview} disabled={saving}
          className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50">
          {saving ? "Starting..." : "Start Review"}
        </button>
      </div>
    );
  }

  // Decision context
  const latestRubric = rubricSubmissions[0] as Record<string, unknown> | undefined;
  const interviewRec = latestRubric?.recommendation as string | undefined;
  const sessionPositive = profile && Number(profile.tri_score ?? 0) >= 60;
  const interviewPositive = interviewRec === "strong_yes" || interviewRec === "yes";
  const aligned = latestRubric ? (sessionPositive === interviewPositive) : null;

  return (
    <div className="space-y-6">
      {/* Decision Context */}
      <div className="rounded-lg border border-lift-border bg-surface p-4 space-y-2">
        <h4 className="text-xs font-semibold text-muted uppercase tracking-wide">Decision Context</h4>
        <div className="flex flex-wrap gap-3 text-sm">
          {profile && (
            <span>TRI: <span className="font-semibold capitalize">{profile.tri_label as string}</span> ({Number(profile.tri_score ?? 0).toFixed(1)})</span>
          )}
          {interviewRec && (
            <span>Interview: <span className="font-semibold capitalize">{interviewRec.replace("_", " ")}</span></span>
          )}
        </div>
        {aligned !== null && (
          <p className={`text-xs ${aligned ? "text-[#10b981]" : "text-[#f59e0b]"}`}>
            {aligned ? "Session and interview are aligned" : "Session and interview diverge — review both carefully"}
          </p>
        )}
      </div>

      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-xs text-muted">Evaluator Notes</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
            onBlur={() => saveReview({ notes })} disabled={isFinalized}
            className="w-full min-h-[120px] rounded-lg border border-lift-border bg-surface p-3 text-sm text-lift-text outline-none focus:border-primary disabled:opacity-60 resize-y"
            placeholder="Your evaluation notes..." />
        </div>

        <div>
          <label className="mb-1 block text-xs text-muted">Recommendation</label>
          <select value={tier} onChange={(e) => handleTierChange(e.target.value)} disabled={isFinalized}
            className="rounded-md border border-lift-border bg-page-bg px-3 py-2 text-sm text-lift-text outline-none focus:border-primary disabled:opacity-60">
            <option value="">Select...</option>
            {TIERS.map((t) => (
              <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
            ))}
          </select>
        </div>

        {showOverride && (
          <div className="rounded-lg border border-warning/30 bg-warning/5 p-4 space-y-3">
            <p className="text-sm font-medium text-warning">Override Rationale Required</p>
            <p className="text-xs text-muted">Your recommendation differs from the AI suggestion. Please provide a rationale.</p>
            <textarea value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)}
              className="w-full min-h-[60px] rounded-md border border-lift-border bg-page-bg p-3 text-sm text-lift-text outline-none" placeholder="Reason for override..." />
            <button onClick={confirmOverride} disabled={!overrideReason.trim()}
              className="rounded-md bg-primary px-4 py-2 text-sm text-white disabled:opacity-50">Confirm Override</button>
          </div>
        )}

        {review.ai_recommendation_snapshot ? (
          <details className="rounded-lg border border-lift-border bg-surface">
            <summary className="cursor-pointer px-4 py-3 text-xs text-muted">AI Recommendation Snapshot</summary>
            <pre className="border-t border-lift-border px-4 py-3 text-xs text-muted overflow-x-auto">
              {JSON.stringify(review.ai_recommendation_snapshot, null, 2)}
            </pre>
          </details>
        ) : null}
      </div>

      <div className="flex gap-3">
        {!isFinalized ? (
          <button onClick={finalize} disabled={!tier}
            className="rounded-md bg-success px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50">
            Finalize Review
          </button>
        ) : (
          <>
            <span className="rounded-full bg-success/10 px-3 py-1 text-xs font-medium text-success">
              Finalized {review.finalized_at ? new Date(review.finalized_at as string).toLocaleDateString() : ""}
            </span>
            <button onClick={reopen} className="text-xs text-warning hover:underline">Reopen</button>
          </>
        )}
      </div>

      {/* Export buttons */}
      <div className="flex gap-2 border-t border-lift-border pt-4">
        <a href={`/api/exports/pdf?candidate_id=${candidateId}&export_type=internal&language=en`} target="_blank"
          className="rounded-md border border-lift-border px-3 py-1.5 text-xs text-muted hover:text-lift-text">Export Internal PDF (EN)</a>
        <a href={`/api/exports/pdf?candidate_id=${candidateId}&export_type=internal&language=pt`} target="_blank"
          className="rounded-md border border-lift-border px-3 py-1.5 text-xs text-muted hover:text-lift-text">Export Internal PDF (PT)</a>
        <a href={`/api/exports/pdf?candidate_id=${candidateId}&export_type=family_summary&language=en`} target="_blank"
          className="rounded-md border border-lift-border px-3 py-1.5 text-xs text-muted hover:text-lift-text">Family Summary (EN)</a>
        <a href={`/api/exports/pdf?candidate_id=${candidateId}&export_type=family_summary&language=pt`} target="_blank"
          className="rounded-md border border-lift-border px-3 py-1.5 text-xs text-muted hover:text-lift-text">Family Summary (PT)</a>
      </div>
    </div>
  );
}

function InterviewTab({ candidateId, tenantId, notes, router }: {
  candidateId: string; tenantId: string;
  notes: Record<string, unknown>[];
  router: ReturnType<typeof useRouter>;
}) {
  const [newNotes, setNewNotes] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    setSaving(true);
    await fetch("/api/interview-notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        candidate_id: candidateId, tenant_id: tenantId,
        interview_date: date, notes: newNotes, rubric_scores: scores,
      }),
    });
    setNewNotes(""); setScores({});
    setSaving(false);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {notes.map((n, i) => {
        const interviewer = n.users as { full_name: string; email: string } | null;
        return (
          <div key={i} className="rounded-lg border border-lift-border bg-surface p-4 space-y-2">
            <div className="flex justify-between text-xs text-muted">
              <span>{interviewer?.full_name ?? interviewer?.email ?? "Interviewer"}</span>
              <span>{n.interview_date as string}</span>
            </div>
            <p className="text-sm whitespace-pre-wrap">{n.notes as string}</p>
            {n.rubric_scores && Object.keys(n.rubric_scores as object).length > 0 ? (
              <div className="flex gap-3 text-xs">
                {Object.entries(n.rubric_scores as Record<string, number>).map(([dim, score]) => (
                  <span key={dim} className="rounded-md border border-lift-border px-2 py-0.5">{dim}: {score}/5</span>
                ))}
              </div>
            ) : null}
          </div>
        );
      })}

      <div className="rounded-lg border border-lift-border bg-surface p-4 space-y-3">
        <h3 className="text-sm font-semibold">Add Interview Notes</h3>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
          className="rounded-md border border-lift-border bg-page-bg px-3 py-2 text-sm text-lift-text outline-none" />
        <textarea value={newNotes} onChange={(e) => setNewNotes(e.target.value)}
          className="w-full min-h-[80px] rounded-md border border-lift-border bg-page-bg p-3 text-sm text-lift-text outline-none" placeholder="Interview observations..." />
        <div>
          <p className="text-xs text-muted mb-1">Rubric (1-5):</p>
          <div className="flex flex-wrap gap-2">
            {DIMENSIONS.map((dim) => (
              <div key={dim} className="flex items-center gap-1">
                <span className="text-xs capitalize">{dim.replace("_", " ")}:</span>
                <select value={scores[dim] ?? ""} onChange={(e) => setScores({ ...scores, [dim]: Number(e.target.value) })}
                  className="rounded border border-lift-border bg-page-bg px-1 py-0.5 text-xs text-lift-text">
                  <option value="">-</option>{[1,2,3,4,5].map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
            ))}
          </div>
        </div>
        <button onClick={handleSubmit} disabled={saving || !newNotes.trim()}
          className="rounded-md bg-primary px-4 py-2 text-sm text-white disabled:opacity-50">{saving ? "Saving..." : "Add Notes"}</button>
      </div>
    </div>
  );
}

function CoreSyncBadge({ status, syncAt, coreStudentId, candidateId }: {
  status: string; syncAt: string | null; coreStudentId: string | null; candidateId: string;
}) {
  const [retrying, setRetrying] = useState(false);

  async function handleRetry() {
    setRetrying(true);
    await fetch("/api/integrations/core-handoff", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-internal-secret": "__retry__" },
      body: JSON.stringify({ candidate_id: candidateId }),
    });
    setRetrying(false);
    window.location.reload();
  }

  switch (status) {
    case "synced":
      return (
        <span className="inline-flex items-center gap-1">
          <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs text-success">Synced to CORE</span>
          {syncAt && <span className="text-[10px] text-muted">{new Date(syncAt).toLocaleDateString()}</span>}
          {coreStudentId && (
            <a href={`${process.env.NEXT_PUBLIC_CORE_URL ?? "https://app.inteliflowai.com"}/students/${coreStudentId}`}
              target="_blank" className="text-[10px] text-primary hover:underline">View in CORE</a>
          )}
        </span>
      );
    case "failed":
      return (
        <span className="inline-flex items-center gap-1">
          <span className="rounded-full bg-review/10 px-2 py-0.5 text-xs text-review">Sync failed</span>
          <button onClick={handleRetry} disabled={retrying}
            className="text-[10px] text-primary hover:underline disabled:opacity-50">
            {retrying ? "Retrying..." : "Retry Sync"}
          </button>
        </span>
      );
    case "skipped":
      return <span className="text-xs text-muted">Sync skipped</span>;
    default:
      return <span className="text-xs text-muted">Not yet admitted</span>;
  }
}

function InterviewTabV2({ candidateId, tenantId, candidateName, rubricSubmissions, notes, router }: {
  candidateId: string; tenantId: string; candidateName: string;
  rubricSubmissions: Record<string, unknown>[];
  notes: Record<string, unknown>[];
  router: ReturnType<typeof useRouter>;
}) {
  return (
    <div className="space-y-6">
      {/* Existing rubric submissions */}
      {rubricSubmissions.map((sub, i) => {
        const interviewer = sub.users as { full_name: string } | null;
        return (
          <div key={i} className="rounded-lg border border-lift-border bg-surface p-4 space-y-3">
            <div className="flex justify-between text-xs text-muted">
              <span>{interviewer?.full_name ?? "Interviewer"}</span>
              <span>{sub.interview_date as string}</span>
            </div>
            <div className="grid grid-cols-5 gap-2 text-center text-xs">
              {["verbal_reasoning", "communication", "self_awareness", "curiosity", "resilience"].map((d) => (
                <div key={d}>
                  <p className="text-muted capitalize">{d.replace("_", " ")}</p>
                  <p className="text-lg font-bold">{String(sub[`${d}_score`] ?? "—")}/5</p>
                </div>
              ))}
            </div>
            {sub.overall_impression ? <p className="text-sm">{String(sub.overall_impression)}</p> : null}
            {sub.standout_moments ? <p className="text-xs text-muted">Standout: {String(sub.standout_moments)}</p> : null}
            {sub.concerns ? <p className="text-xs text-[#f43f5e]">Concerns: {String(sub.concerns)}</p> : null}
            <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
              sub.recommendation === "strong_yes" ? "bg-[#10b981]/10 text-[#10b981]" :
              sub.recommendation === "yes" ? "bg-[#6366f1]/10 text-[#6366f1]" :
              sub.recommendation === "unsure" ? "bg-[#f59e0b]/10 text-[#f59e0b]" :
              "bg-[#f43f5e]/10 text-[#f43f5e]"
            }`}>{(sub.recommendation as string)?.replace("_", " ")}</span>
          </div>
        );
      })}

      {/* Legacy free-text notes (read-only) */}
      {notes.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-muted mb-2">Previous Interview Notes</h4>
          {notes.map((n, i) => (
            <div key={i} className="rounded-md border border-lift-border p-3 text-sm text-muted mb-2">
              {n.notes as string}
            </div>
          ))}
        </div>
      )}

      {/* New rubric form */}
      <RubricForm
        candidateId={candidateId}
        tenantId={tenantId}
        candidateName={candidateName}
        onSubmitted={() => router.refresh()}
      />
    </div>
  );
}
