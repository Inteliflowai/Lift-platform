"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { SupportPanel } from "@/components/LearningSupport/SupportPanel";
import { TRIGauge } from "@/components/TRI/TRIGauge";
import { BriefingCard } from "@/components/evaluator/BriefingCard";
import { SynthesisPanel } from "@/components/evaluator/SynthesisPanel";
import { RubricForm } from "@/components/interviewer/RubricForm";
import { RadarChart } from "@/components/RadarChart";

type Tab = "overview" | "responses" | "signals" | "review" | "interview" | "outcomes";
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
  teamMembers, assignments, isAdmin,
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
  teamMembers?: unknown[];
  assignments?: unknown[];
  isAdmin?: boolean;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview");

  const candidateStatus = candidate.status as string;
  const showOutcomes = ["completed", "reviewed", "admitted", "waitlisted", "offered"].includes(candidateStatus);
  const tabs: Tab[] = ["overview", "responses", "signals", "review", "interview", ...(showOutcomes ? ["outcomes" as Tab] : [])];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {candidate.first_name as string} {candidate.last_name as string}
          </h1>
          <p className="text-sm text-muted">
            Grade {candidate.grade_applying_to as string} (Band {candidate.grade_band as string})
            {candidate.gender ? <span className="ml-2 capitalize">{String(candidate.gender).replace("_", " ")}</span> : null}
          </p>
        </div>
        {isAdmin && (
          <AssignmentPanel
            candidateId={candidate.id as string}
            teamMembers={teamMembers ?? []}
            assignments={assignments ?? []}
          />
        )}
      </div>

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
      {tab === "outcomes" && <OutcomesTab candidateId={candidate.id as string} profile={profile} />}
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
        <>
          <TRIGauge
            score={p.tri_score != null ? Number(p.tri_score) : null}
            label={p.tri_label as string | null}
            confidence={p.tri_confidence as string | null}
            summary={p.tri_summary as string | null}
          />
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 -mt-2">
            <p className="text-xs font-semibold text-primary mb-1">What is TRI?</p>
            <p className="text-xs text-muted leading-relaxed">
              The <strong>Transition Readiness Index (TRI)</strong> is a composite score (0-100) measuring readiness across 6 dimensions: Reading (20%), Writing (20%), Reasoning (20%), Reflection (15%), Persistence (15%), and Support Seeking (10%). Scores are adjusted for AI confidence and learning support signals.
            </p>
            <div className="flex flex-wrap gap-3 mt-2 text-[10px]">
              <span className="text-review">Emerging (0-39)</span>
              <span className="text-warning">Developing (40-59)</span>
              <span className="text-primary">Ready (60-79)</span>
              <span className="text-success">Thriving (80-100)</span>
            </div>
          </div>
        </>
      )}

      {/* Radar Chart */}
      {p && (
        <RadarChart
          scores={{
            reading: Number(p.reading_score ?? 0),
            writing: Number(p.writing_score ?? 0),
            reasoning: Number(p.reasoning_score ?? 0),
            reflection: Number(p.reflection_score ?? 0),
            persistence: Number(p.persistence_score ?? 0),
            support_seeking: Number(p.support_seeking_score ?? 0),
          }}
          benchmarks={benchmarks as Record<string, number> | null}
        />
      )}

      {p && (
        <>
          <div className="space-y-3">
            <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">Dimension Scores</h2>
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
  const items = responses as { id: string; sequence_order: number; task_templates: { title: string; task_type: string }; response_text: { response_body: string; word_count: number; submitted_at: string; response_features: { revision_depth: number }[] }[] }[];

  return (
    <div className="space-y-4">
      {items.map((t) => {
        const rt = t.response_text?.[0];
        const rf = rt?.response_features?.[0];
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
  const ts = timing as { signal_type: string; value_ms: number; task_instance_id: string }[];
  const hs = help as { event_type: string }[];
  const is_ = interactions as { signal_type: string; occurred_at: string }[];
  const es = events as { event_type: string; occurred_at: string; task_instance_id: string }[];

  const dwellTimes = ts.filter((t) => t.signal_type === "task_dwell_time").map((t) => t.value_ms);
  const avgDwell = dwellTimes.length > 0 ? Math.round(dwellTimes.reduce((a, b) => a + b, 0) / dwellTimes.length / 1000) : 0;
  const maxDwell = dwellTimes.length > 0 ? Math.round(Math.max(...dwellTimes) / 1000) : 0;
  const textTimes = ts.filter((t) => t.signal_type === "time_on_text").map((t) => t.value_ms);
  const avgTextTime = textTimes.length > 0 ? Math.round(textTimes.reduce((a, b) => a + b, 0) / textTimes.length / 1000) : 0;
  const hintCount = hs.filter((h) => h.event_type === "hint_open").length;
  const voiceUsed = hs.filter((h) => h.event_type === "voice_response_used").length;
  const passageRead = hs.filter((h) => h.event_type === "passage_read_aloud").length;
  const focusLost = is_.filter((i) => i.signal_type === "focus_lost").length;

  // Total session duration from events
  const eventTimes = es.map((e) => new Date(e.occurred_at).getTime()).filter(Boolean);
  const sessionDuration = eventTimes.length >= 2 ? Math.round((Math.max(...eventTimes) - Math.min(...eventTimes)) / 60000) : 0;

  return (
    <div className="space-y-6">
      {/* What are signals? */}
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
        <p className="text-xs text-primary font-semibold mb-1">What are Behavioral Signals?</p>
        <p className="text-xs text-muted leading-relaxed">
          Signals are behavioral data captured during the candidate&apos;s session. They show HOW the candidate approached the tasks — not just what they wrote. Use these alongside responses to understand engagement, pace, and help-seeking patterns.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <SignalCard
          label="Avg Time Per Task"
          value={`${avgDwell}s`}
          description="Average time spent on each task. Very short times may indicate rushing. Very long times may indicate difficulty."
          level={avgDwell < 30 ? "warning" : avgDwell > 300 ? "warning" : "normal"}
        />
        <SignalCard
          label="Longest Task"
          value={`${maxDwell}s`}
          description="The most time spent on a single task. Identifies which task type challenged this candidate most."
          level="normal"
        />
        <SignalCard
          label="Reading Time"
          value={avgTextTime > 0 ? `${avgTextTime}s avg` : "N/A"}
          description="Time spent reading passages before responding. Below 30 seconds may indicate the candidate didn't fully read the text."
          level={avgTextTime > 0 && avgTextTime < 30 ? "warning" : "normal"}
        />
        <SignalCard
          label="Hints Requested"
          value={`${hintCount}`}
          description="Number of times the candidate asked for a hint. Some hint-seeking is healthy — it shows self-awareness. Excessive hints may indicate difficulty."
          level={hintCount > 6 ? "warning" : "normal"}
        />
        <SignalCard
          label="Focus Lost"
          value={`${focusLost}x`}
          description="Times the candidate switched away from the session (changed tabs, opened another app). Frequent focus loss may indicate distraction or disengagement."
          level={focusLost >= 4 ? "warning" : "normal"}
        />
        <SignalCard
          label="Session Duration"
          value={sessionDuration > 0 ? `${sessionDuration} min` : "—"}
          description="Total time from first task to last submission. Provides context for the overall pace of the session."
          level="normal"
        />
      </div>

      {/* Accessibility Features Used */}
      {(voiceUsed > 0 || passageRead > 0) && (
        <div className="rounded-lg border border-lift-border bg-surface p-4">
          <h3 className="text-sm font-semibold mb-2">Accessibility Features Used</h3>
          <div className="flex gap-4 text-xs text-muted">
            {voiceUsed > 0 && (
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-primary" />
                Voice response: {voiceUsed} task{voiceUsed > 1 ? "s" : ""}
              </span>
            )}
            {passageRead > 0 && (
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-primary" />
                Passage read aloud: {passageRead} time{passageRead > 1 ? "s" : ""}
              </span>
            )}
          </div>
          <p className="mt-2 text-[10px] text-muted">
            Use of accessibility features does not affect scoring. These tools are provided to ensure equitable access.
          </p>
        </div>
      )}

      {/* Time Per Task Bar Chart */}
      {dwellTimes.length > 0 && (
        <div className="rounded-lg border border-lift-border bg-surface p-4">
          <h3 className="text-sm font-semibold mb-1">Time Per Task</h3>
          <p className="text-[10px] text-muted mb-3">How long the candidate spent on each task. Longer bars indicate more time spent.</p>
          <div className="space-y-2">
            {dwellTimes.map((t, i) => {
              const secs = Math.round(t / 1000);
              const maxVal = Math.max(...dwellTimes);
              const pct = maxVal > 0 ? (t / maxVal) * 100 : 0;
              return (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-[10px] text-muted w-14 shrink-0">Task {i + 1}</span>
                  <div className="flex-1 h-4 rounded-full bg-lift-border overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary/60"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs font-mono w-12 text-right">{secs}s</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Session Timeline */}
      <div className="rounded-lg border border-lift-border bg-surface p-4">
        <h3 className="text-sm font-semibold mb-1">Session Timeline</h3>
        <p className="text-[10px] text-muted mb-3">Chronological log of everything that happened during the session. Helps you understand the candidate&apos;s workflow and engagement patterns.</p>
        <div className="max-h-64 overflow-y-auto space-y-1">
          {es.length === 0 && <p className="text-xs text-muted">No session events recorded.</p>}
          {es.map((e, i) => {
            const labels: Record<string, { label: string; color: string }> = {
              session_created: { label: "Session started", color: "text-success" },
              task_complete: { label: "Task submitted", color: "text-primary" },
              session_complete: { label: "Session completed", color: "text-success" },
              heartbeat: { label: "Active", color: "text-muted" },
            };
            const info = labels[e.event_type] ?? { label: e.event_type.replace(/_/g, " "), color: "text-muted" };

            return (
              <div key={i} className="flex items-center gap-3 text-xs py-0.5">
                <span className="w-20 shrink-0 text-muted font-mono text-[10px]">
                  {new Date(e.occurred_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                </span>
                <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${info.color === "text-success" ? "bg-success" : info.color === "text-primary" ? "bg-primary" : "bg-muted/40"}`} />
                <span className={info.color}>{info.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function SignalCard({ label, value, description, level }: {
  label: string;
  value: string;
  description: string;
  level: "normal" | "warning";
}) {
  return (
    <div className={`rounded-lg border p-3 ${level === "warning" ? "border-warning/30 bg-warning/5" : "border-lift-border bg-surface"}`}>
      <p className="text-[10px] text-muted">{label}</p>
      <p className={`mt-0.5 text-lg font-bold ${level === "warning" ? "text-warning" : "text-lift-text"}`}>{value}</p>
      <p className="mt-1.5 text-[10px] text-muted leading-relaxed">{description}</p>
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

  const aiSnapshot = review?.ai_recommendation_snapshot as Record<string, unknown> | undefined;
  // The snapshot may have structured format OR raw scores + placement_guidance
  const aiTier = aiSnapshot?.recommended_tier as string | undefined;
  const aiRationale = aiSnapshot?.rationale as string | undefined;
  const aiConfidence = (aiSnapshot?.confidence ?? aiSnapshot?.overall_confidence) as number | undefined;
  const aiStrengths = aiSnapshot?.strengths as string[] | undefined;
  const aiConcerns = aiSnapshot?.concerns as string[] | undefined;
  const aiPlacementGuidance = aiSnapshot?.placement_guidance as string | undefined;

  // Extract scores from snapshot
  const aiScores = aiSnapshot ? {
    reading: aiSnapshot.reading_score as number | undefined,
    writing: aiSnapshot.writing_score as number | undefined,
    reasoning: aiSnapshot.reasoning_score as number | undefined,
    reflection: aiSnapshot.reflection_score as number | undefined,
    persistence: aiSnapshot.persistence_score as number | undefined,
    support_seeking: aiSnapshot.support_seeking_score as number | undefined,
  } : null;

  const hasScores = aiScores && Object.values(aiScores).some(v => v != null);

  const tierColors: Record<string, { bg: string; text: string; label: string }> = {
    admit: { bg: "bg-success/10 border-success/20", text: "text-success", label: "Admit" },
    waitlist: { bg: "bg-warning/10 border-warning/20", text: "text-warning", label: "Waitlist" },
    decline: { bg: "bg-review/10 border-review/20", text: "text-review", label: "Decline" },
    defer: { bg: "bg-primary/10 border-primary/20", text: "text-primary", label: "Defer" },
    needs_more_info: { bg: "bg-muted/10 border-muted/20", text: "text-muted", label: "Needs More Info" },
  };

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

  const latestRubric = rubricSubmissions[0] as Record<string, unknown> | undefined;
  const interviewRec = latestRubric?.recommendation as string | undefined;

  // Check if evaluator's tier differs from AI
  const tierDiffers = aiTier && tier && tier !== aiTier;

  return (
    <div className="space-y-6">

      {/* STEP 1: AI Recommendation (shown first) */}
      {aiSnapshot && Object.keys(aiSnapshot).length > 0 && (
        <div className="rounded-xl border-l-4 border-l-primary border border-lift-border bg-surface overflow-hidden">
          <div className="px-5 pt-4 pb-2">
            <p className="text-xs font-semibold text-primary uppercase tracking-wider">AI Recommendation</p>
            <p className="mt-0.5 text-[10px] text-muted">Generated from the candidate&apos;s session data, responses, and behavioral signals.</p>
          </div>

          <div className="px-5 pb-4 space-y-4">
            {/* AI recommended tier (if structured format) */}
            {aiTier && (
              <div className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 ${tierColors[aiTier]?.bg ?? "bg-muted/10 border-muted/20"}`}>
                <span className={`text-sm font-bold capitalize ${tierColors[aiTier]?.text ?? "text-muted"}`}>
                  {tierColors[aiTier]?.label ?? aiTier.replace(/_/g, " ")}
                </span>
                {aiConfidence != null && (
                  <span className="text-xs text-muted">({aiConfidence}% confidence)</span>
                )}
              </div>
            )}

            {/* Confidence (if no structured tier) */}
            {!aiTier && aiConfidence != null && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted">AI Confidence:</span>
                <div className="flex-1 max-w-[200px] h-2 rounded-full bg-lift-border overflow-hidden">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${aiConfidence}%` }} />
                </div>
                <span className="text-xs font-semibold">{aiConfidence}%</span>
              </div>
            )}

            {/* Dimension Scores from snapshot */}
            {hasScores && (
              <div>
                <p className="text-xs font-semibold text-muted mb-2">Dimension Scores</p>
                <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
                  {Object.entries(aiScores!).filter(([,v]) => v != null).map(([dim, score]) => {
                    const s = score as number;
                    const color = s >= 70 ? "bg-success" : s >= 40 ? "bg-primary" : "bg-warning";
                    return (
                      <div key={dim} className="rounded-lg border border-lift-border p-2">
                        <div className="flex items-baseline justify-between">
                          <span className="text-[10px] text-muted capitalize">{dim.replace("_", " ")}</span>
                          <span className="text-xs font-bold">{s}</span>
                        </div>
                        <div className="mt-1 h-1.5 rounded-full bg-lift-border overflow-hidden">
                          <div className={`h-full rounded-full ${color}`} style={{ width: `${s}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* AI rationale (structured format) */}
            {aiRationale && (
              <div className="rounded-lg bg-page-bg p-3">
                <p className="text-xs font-semibold text-muted mb-1">Rationale</p>
                <p className="text-sm text-lift-text leading-relaxed">{aiRationale}</p>
              </div>
            )}

            {/* Placement Guidance (from pipeline) */}
            {aiPlacementGuidance && (
              <div className="rounded-lg bg-page-bg p-4">
                <p className="text-xs font-semibold text-primary mb-2">Placement Guidance</p>
                <div className="text-sm text-lift-text leading-relaxed space-y-2">
                  {aiPlacementGuidance.split("\n\n").map((para, i) => {
                    if (para.startsWith("##")) {
                      return <p key={i} className="font-semibold text-lift-text">{para.replace(/^#+\s*/, "").replace(/\*\*/g, "")}</p>;
                    }
                    if (para.startsWith("•") || para.startsWith("- ")) {
                      return (
                        <div key={i} className="flex items-start gap-2">
                          <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                          <span className="text-sm">{para.replace(/^[•\-]\s*/, "").replace(/\*\*/g, "")}</span>
                        </div>
                      );
                    }
                    return <p key={i}>{para.replace(/\*\*/g, "")}</p>;
                  })}
                </div>
              </div>
            )}

            {/* Strengths & Concerns (structured format) */}
            {(aiStrengths?.length || aiConcerns?.length) ? (
              <div className="grid grid-cols-2 gap-3">
                {aiStrengths && aiStrengths.length > 0 && (
                  <div className="rounded-lg border border-success/20 bg-success/5 p-3">
                    <p className="text-xs font-semibold text-success mb-1.5">Strengths</p>
                    <ul className="space-y-1">
                      {aiStrengths.map((s, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-xs text-lift-text">
                          <span className="mt-1 h-1.5 w-1.5 rounded-full bg-success shrink-0" />
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {aiConcerns && aiConcerns.length > 0 && (
                  <div className="rounded-lg border border-warning/20 bg-warning/5 p-3">
                    <p className="text-xs font-semibold text-warning mb-1.5">Areas of Concern</p>
                    <ul className="space-y-1">
                      {aiConcerns.map((c, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-xs text-lift-text">
                          <span className="mt-1 h-1.5 w-1.5 rounded-full bg-warning shrink-0" />
                          {c}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : null}

            {/* Profile context */}
            {profile && (
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted pt-2 border-t border-lift-border">
                <span>TRI: <span className="font-semibold text-lift-text capitalize">{profile.tri_label as string}</span> ({Number(profile.tri_score ?? 0).toFixed(0)}/100)</span>
                <span className="text-[10px] text-muted/60">(Transition Readiness Index — composite of 6 readiness dimensions)</span>
                {interviewRec && (
                  <span className="pt-2">Interview: <span className="font-semibold text-lift-text capitalize">{interviewRec.replace("_", " ")}</span></span>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* STEP 2: Evaluator's Own Review */}
      <div className="rounded-xl border border-lift-border bg-surface p-5 space-y-4">
        <div>
          <p className="text-xs font-semibold text-lift-text uppercase tracking-wider">Your Evaluation</p>
          <p className="mt-0.5 text-[10px] text-muted">Review the AI recommendation above, then provide your own assessment.</p>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-muted">Evaluator Notes</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
            onBlur={() => saveReview({ notes })} disabled={isFinalized}
            className="w-full min-h-[120px] rounded-lg border border-lift-border bg-page-bg p-3 text-sm text-lift-text outline-none focus:border-primary disabled:opacity-60 resize-y"
            placeholder="What did you observe? What stands out about this candidate?" />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-muted">Your Recommendation</label>
          <div className="flex flex-wrap gap-2">
            {TIERS.map((t) => {
              const tc = tierColors[t] ?? { bg: "bg-muted/10 border-muted/20", text: "text-muted", label: t };
              const selected = tier === t;
              return (
                <button
                  key={t}
                  onClick={() => {
                    setTier(t);
                    if (!aiTier || t === aiTier) {
                      saveReview({ recommendation_tier: t });
                      setShowOverride(false);
                    } else {
                      setShowOverride(true);
                    }
                  }}
                  disabled={isFinalized}
                  className={`rounded-lg border px-4 py-2 text-xs font-semibold transition-all ${
                    selected
                      ? `${tc.bg} ${tc.text} ring-2 ring-offset-1 ring-current`
                      : "border-lift-border text-muted hover:border-primary/30"
                  } disabled:opacity-60`}
                >
                  {tc.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* STEP 3: Override rationale (only when it actually differs from AI) */}
        {tierDiffers && showOverride && (
          <div className="rounded-lg border border-warning/30 bg-warning/5 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-warning" />
              <p className="text-sm font-medium text-warning">Your recommendation differs from the AI</p>
            </div>
            <p className="text-xs text-muted">
              AI recommended <strong className="capitalize">{tierColors[aiTier!]?.label ?? aiTier}</strong>,
              you selected <strong className="capitalize">{tierColors[tier]?.label ?? tier}</strong>.
              Please explain why you disagree — this helps calibrate the AI and documents your reasoning.
            </p>
            <textarea value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)}
              className="w-full min-h-[60px] rounded-md border border-lift-border bg-page-bg p-3 text-sm text-lift-text outline-none focus:border-primary"
              placeholder="Why does your assessment differ from the AI recommendation?" />
            <button onClick={confirmOverride} disabled={!overrideReason.trim()}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
              Confirm Override
            </button>
          </div>
        )}
      </div>

      {/* Finalize */}
      <div className="flex items-center gap-3">
        {!isFinalized ? (
          <button onClick={finalize} disabled={!tier}
            className="rounded-lg bg-success px-6 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50">
            Finalize Review
          </button>
        ) : (
          <>
            <span className="rounded-full bg-success/10 px-4 py-1.5 text-xs font-semibold text-success">
              Finalized {review.finalized_at ? new Date(review.finalized_at as string).toLocaleDateString() : ""}
            </span>
            <button onClick={reopen} className="text-xs text-warning hover:underline">Reopen</button>
          </>
        )}
      </div>

      {/* Export buttons */}
      <ExportButtons candidateId={candidateId} />
    </div>
  );
}

function ExportButtons({ candidateId }: { candidateId: string }) {
  const { locale } = useLocale();
  const lang = locale === "pt" ? "pt" : "en";
  const langLabel = locale === "pt" ? "PT" : "EN";

  return (
    <div className="flex flex-wrap gap-2 border-t border-lift-border pt-4">
      <a href={`/api/exports/pdf?candidate_id=${candidateId}&export_type=internal&language=${lang}`} target="_blank"
        className="rounded-md border border-lift-border px-3 py-1.5 text-xs text-muted hover:text-lift-text">
        Internal Report ({langLabel})
      </a>
      <a href={`/api/exports/pdf?candidate_id=${candidateId}&export_type=family_summary&language=${lang}`} target="_blank"
        className="rounded-md border border-lift-border px-3 py-1.5 text-xs text-muted hover:text-lift-text">
        Family Summary ({langLabel})
      </a>
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

function OutcomesTab({ candidateId, profile }: { candidateId: string; profile: Record<string, unknown> | null }) {
  const [outcomes, setOutcomes] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    academic_year: new Date().getFullYear().toString(),
    term: "full_year",
    gpa: "",
    gpa_scale: "4.0",
    academic_standing: "",
    tutoring_sessions_per_week: "",
    counseling_engaged: false,
    learning_support_plan_active: false,
    social_adjustment: "",
    extracurricular_engaged: false,
    retained: true,
    withdrawal_reason: "",
    advisor_notes: "",
  });

  useEffect(() => {
    fetch(`/api/school/outcomes?candidate_id=${candidateId}`)
      .then((r) => r.json())
      .then((data) => { setOutcomes(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [candidateId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    await fetch("/api/school/outcomes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ candidate_id: candidateId, ...form, gpa: form.gpa ? Number(form.gpa) : null, gpa_scale: Number(form.gpa_scale), tutoring_sessions_per_week: form.tutoring_sessions_per_week ? Number(form.tutoring_sessions_per_week) : null }),
    });
    setSaving(false);
    setSaved(true);
    // Refresh outcomes
    const res = await fetch(`/api/school/outcomes?candidate_id=${candidateId}`);
    setOutcomes(await res.json());
  }

  const standingColors: Record<string, string> = {
    excellent: "text-success", good: "text-primary", satisfactory: "text-muted",
    needs_support: "text-warning", probation: "text-review",
  };

  if (loading) return <p className="py-8 text-center text-muted">Loading outcomes…</p>;

  return (
    <div className="space-y-6">
      {/* LIFT Prediction (side reference) */}
      {profile && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
          <p className="text-xs font-semibold text-primary mb-2">LIFT Prediction at Time of Admission</p>
          <div className="flex flex-wrap gap-4 text-xs">
            <span>TRI: <strong className="capitalize">{profile.tri_label as string}</strong> ({Number(profile.tri_score ?? 0).toFixed(0)})</span>
            <span>Reading: {Number(profile.reading_score ?? 0).toFixed(0)}</span>
            <span>Writing: {Number(profile.writing_score ?? 0).toFixed(0)}</span>
            <span>Reasoning: {Number(profile.reasoning_score ?? 0).toFixed(0)}</span>
          </div>
        </div>
      )}

      {/* Outcome History */}
      {outcomes.length > 0 && (
        <div className="rounded-lg border border-lift-border bg-surface p-4">
          <h3 className="text-sm font-semibold mb-3">Outcome History</h3>
          <div className="space-y-2">
            {outcomes.map((o, i) => (
              <div key={i} className="flex items-center justify-between rounded-md border border-lift-border p-3">
                <div>
                  <span className="text-sm font-medium">{o.academic_year as string}</span>
                  <span className="ml-2 text-xs text-muted capitalize">{(o.term as string)?.replace("_", " ")}</span>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  {o.gpa != null && <span>GPA: <strong>{Number(o.gpa).toFixed(2)}</strong></span>}
                  {o.academic_standing ? (
                    <span className={`font-medium capitalize ${standingColors[o.academic_standing as string] ?? "text-muted"}`}>
                      {(o.academic_standing as string).replace("_", " ")}
                    </span>
                  ) : null}
                  {o.retained === false && <span className="text-review font-medium">Withdrawn</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Entry Form */}
      <div className="rounded-lg border border-lift-border bg-surface p-5">
        <h3 className="text-sm font-semibold mb-3">Record Outcome</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-xs text-muted">Academic Year</label>
              <input type="text" value={form.academic_year} onChange={(e) => setForm({ ...form, academic_year: e.target.value })} required
                className="w-full rounded-md border border-lift-border bg-page-bg px-3 py-2 text-sm outline-none focus:border-primary" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted">Term</label>
              <select value={form.term} onChange={(e) => setForm({ ...form, term: e.target.value })}
                className="w-full rounded-md border border-lift-border bg-page-bg px-3 py-2 text-sm outline-none focus:border-primary">
                <option value="fall">Fall</option>
                <option value="spring">Spring</option>
                <option value="full_year">Full Year</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted">GPA</label>
              <div className="flex gap-1">
                <input type="number" step="0.01" min="0" max="5" value={form.gpa} onChange={(e) => setForm({ ...form, gpa: e.target.value })} placeholder="e.g. 3.5"
                  className="flex-1 rounded-md border border-lift-border bg-page-bg px-3 py-2 text-sm outline-none focus:border-primary" />
                <span className="flex items-center text-xs text-muted px-1">/ {form.gpa_scale}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-muted">Academic Standing</label>
              <select value={form.academic_standing} onChange={(e) => setForm({ ...form, academic_standing: e.target.value })}
                className="w-full rounded-md border border-lift-border bg-page-bg px-3 py-2 text-sm outline-none focus:border-primary">
                <option value="">Select...</option>
                <option value="excellent">Excellent</option>
                <option value="good">Good</option>
                <option value="satisfactory">Satisfactory</option>
                <option value="needs_support">Needs Support</option>
                <option value="probation">Probation</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted">Social Adjustment</label>
              <select value={form.social_adjustment} onChange={(e) => setForm({ ...form, social_adjustment: e.target.value })}
                className="w-full rounded-md border border-lift-border bg-page-bg px-3 py-2 text-sm outline-none focus:border-primary">
                <option value="">Select...</option>
                <option value="thriving">Thriving</option>
                <option value="settled">Settled</option>
                <option value="adjusting">Adjusting</option>
                <option value="struggling">Struggling</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-muted">Tutoring (sessions/week)</label>
              <input type="number" step="0.5" min="0" value={form.tutoring_sessions_per_week} onChange={(e) => setForm({ ...form, tutoring_sessions_per_week: e.target.value })}
                className="w-full rounded-md border border-lift-border bg-page-bg px-3 py-2 text-sm outline-none focus:border-primary" />
            </div>
            <div className="flex flex-col gap-2 pt-5">
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" checked={form.counseling_engaged} onChange={(e) => setForm({ ...form, counseling_engaged: e.target.checked })} className="accent-primary" />
                Counseling engaged
              </label>
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" checked={form.learning_support_plan_active} onChange={(e) => setForm({ ...form, learning_support_plan_active: e.target.checked })} className="accent-primary" />
                Learning support plan active
              </label>
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" checked={form.extracurricular_engaged} onChange={(e) => setForm({ ...form, extracurricular_engaged: e.target.checked })} className="accent-primary" />
                Extracurricular engaged
              </label>
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={form.retained} onChange={(e) => setForm({ ...form, retained: e.target.checked })} className="accent-primary" />
            Student retained (still enrolled)
          </label>

          {!form.retained && (
            <div>
              <label className="mb-1 block text-xs text-muted">Withdrawal Reason</label>
              <input type="text" value={form.withdrawal_reason} onChange={(e) => setForm({ ...form, withdrawal_reason: e.target.value })}
                className="w-full rounded-md border border-lift-border bg-page-bg px-3 py-2 text-sm outline-none focus:border-primary" />
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs text-muted">Advisor Notes</label>
            <textarea value={form.advisor_notes} onChange={(e) => setForm({ ...form, advisor_notes: e.target.value })}
              className="w-full min-h-[80px] rounded-md border border-lift-border bg-page-bg p-3 text-sm outline-none focus:border-primary resize-y"
              placeholder="How is this student doing? Any observations for the record..." />
          </div>

          <div className="flex items-center gap-3">
            <button type="submit" disabled={saving}
              className="rounded-md bg-primary px-5 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50">
              {saving ? "Saving..." : "Record Outcome"}
            </button>
            {saved && <span className="text-xs text-success">Outcome recorded</span>}
          </div>
        </form>
      </div>
    </div>
  );
}

function AssignmentPanel({
  candidateId,
  teamMembers,
  assignments,
}: {
  candidateId: string;
  teamMembers: unknown[];
  assignments: unknown[];
}) {
  const [selectedUser, setSelectedUser] = useState("");
  const [assigning, setAssigning] = useState(false);
  const router = useRouter();

  const members = teamMembers as { user_id: string; role: string; users: { id: string; full_name: string; email: string } }[];
  const current = assignments as { id: string; assigned_to: string; assignment_type: string; status: string; users: { full_name: string } }[];

  // Deduplicate members
  const uniqueMembers = members.filter((m, i, arr) =>
    arr.findIndex((x) => x.user_id === m.user_id) === i
  );

  const assignedIds = current.map((a) => a.assigned_to);

  async function handleAssign() {
    if (!selectedUser) return;
    setAssigning(true);
    await fetch("/api/school/assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        candidate_id: candidateId,
        assigned_to: selectedUser,
        assignment_type: "both",
      }),
    });
    setAssigning(false);
    setSelectedUser("");
    router.refresh();
  }

  async function handleRemove(assignmentId: string) {
    await fetch("/api/school/assignments", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignment_id: assignmentId }),
    });
    router.refresh();
  }

  return (
    <div className="rounded-lg border border-lift-border bg-surface p-3 min-w-[240px]">
      <p className="text-xs font-semibold text-muted mb-2">Assigned To</p>

      {/* Current assignments */}
      {current.length > 0 && (
        <div className="space-y-1 mb-2">
          {current.map((a) => (
            <div key={a.id} className="flex items-center justify-between rounded-md bg-page-bg px-2 py-1">
              <div>
                <span className="text-xs font-medium">{a.users?.full_name ?? "Unknown"}</span>
                <span className="ml-1.5 text-[9px] text-muted capitalize">{a.assignment_type}</span>
              </div>
              <button
                onClick={() => handleRemove(a.id)}
                className="text-[10px] text-review hover:underline"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      {current.length === 0 && (
        <p className="text-[10px] text-muted mb-2">No one assigned yet</p>
      )}

      {/* Assign new */}
      <div className="flex gap-1">
        <select
          value={selectedUser}
          onChange={(e) => setSelectedUser(e.target.value)}
          className="flex-1 rounded-md border border-lift-border bg-page-bg px-2 py-1 text-xs outline-none focus:border-primary"
        >
          <option value="">Select team member...</option>
          {uniqueMembers
            .filter((m) => !assignedIds.includes(m.user_id))
            .map((m) => (
              <option key={m.user_id} value={m.user_id}>
                {m.users?.full_name ?? m.users?.email ?? "Unknown"}
              </option>
            ))}
        </select>
        <button
          onClick={handleAssign}
          disabled={!selectedUser || assigning}
          className="rounded-md bg-primary px-2 py-1 text-[10px] font-medium text-white disabled:opacity-50"
        >
          {assigning ? "..." : "Assign"}
        </button>
      </div>
    </div>
  );
}
