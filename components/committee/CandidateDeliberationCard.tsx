"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useToast } from "@/components/ui/Toast";
import type { DecisionType } from "@/lib/committee/types";
import type { CandidateFlag } from "@/lib/flags/types";
import { FlagPill } from "@/components/flags/FlagPill";
import { FlagDetailDrawer } from "@/components/flags/FlagDetailDrawer";

type Decision = DecisionType;

const DECISION_META: Record<Decision, { label: string; tone: string; pill: string }> = {
  admit:    { label: "Admit",    tone: "border-emerald-500/50 bg-emerald-500/5",  pill: "bg-emerald-500/15 text-emerald-400" },
  waitlist: { label: "Waitlist", tone: "border-amber-500/50 bg-amber-500/5",       pill: "bg-amber-500/15 text-amber-400" },
  decline:  { label: "Decline",  tone: "border-rose-500/50 bg-rose-500/5",         pill: "bg-rose-500/15 text-rose-400" },
  defer:    { label: "Defer",    tone: "border-slate-500/50 bg-slate-500/5",       pill: "bg-slate-500/15 text-slate-300" },
};

const DEFER_TEMPLATE =
  "Decision deferred pending additional information. The admissions team will revisit this candidate at a subsequent committee session once the outstanding items have been resolved.";

interface CandidateData {
  id: string;
  first_name: string | null;
  last_name: string | null;
  grade_applying_to: string | null;
  status: string | null;
  tri_score: number | null;
  defensible_language_cache: {
    admit?: string;
    waitlist?: string;
    decline?: string;
    fallback_used?: boolean;
  };
  defensible_language_updated_at: string | null;
  briefing: {
    key_observations: string[];
    interview_questions: Array<{ question: string; rationale: string; dimension: string }>;
  } | null;
  rubric: { recommendation: string | null; avg_score: number | null } | null;
  vote: {
    id: string;
    decision: Decision;
    rationale: string | null;
    side_notes: string | null;
    status: "staged" | "committed" | "held";
    decided_at: string;
  } | null;
}

interface Props {
  sessionId: string;
  candidate: CandidateData;
  isHost: boolean;
  missionUpdatedAt: string | null;
  onVoteChanged: () => void;
}

export function CandidateDeliberationCard({
  sessionId,
  candidate,
  isHost,
  missionUpdatedAt,
  onVoteChanged,
}: Props) {
  const { toast } = useToast();
  const [rationale, setRationale] = useState(candidate.vote?.rationale ?? "");
  const [sideNotes, setSideNotes] = useState(candidate.vote?.side_notes ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [flags, setFlags] = useState<CandidateFlag[]>([]);
  const [flagsDrawerOpen, setFlagsDrawerOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/school/flags?candidate_id=${candidate.id}`, { cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as { rows: CandidateFlag[] };
        setFlags(data.rows);
      }
    })();
  }, [candidate.id]);

  const cache = candidate.defensible_language_cache;
  const languageStale = Boolean(
    candidate.defensible_language_updated_at &&
      missionUpdatedAt &&
      new Date(candidate.defensible_language_updated_at) < new Date(missionUpdatedAt),
  );

  const name = [candidate.first_name, candidate.last_name].filter(Boolean).join(" ") || "Candidate";

  async function submitVote(decision: Decision) {
    if (!isHost) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/school/committee/sessions/${sessionId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidate_id: candidate.id,
          decision,
          rationale: rationale.trim() || null,
          side_notes: sideNotes.trim() || null,
        }),
      });
      if (res.status === 429) {
        const err = await res.json();
        toast(`Slow down — try again in ${err.retry_after_seconds}s.`, "error");
        return;
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast(err.error ?? "Vote failed", "error");
        return;
      }
      toast(`${DECISION_META[decision].label} recorded for ${name}`, "success");
      onVoteChanged();
    } finally {
      setSubmitting(false);
    }
  }

  async function clearVote() {
    if (!isHost || !candidate.vote) return;
    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/school/committee/sessions/${sessionId}/vote?candidate_id=${candidate.id}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast(err.error ?? "Could not clear vote", "error");
        return;
      }
      setRationale("");
      setSideNotes("");
      toast("Vote cleared", "success");
      onVoteChanged();
    } finally {
      setSubmitting(false);
    }
  }

  async function regenerateLanguage() {
    if (!isHost) return;
    setRegenerating(true);
    try {
      const res = await fetch(`/api/candidates/${candidate.id}/defensible-language`, {
        method: "POST",
      });
      if (!res.ok) {
        toast("Regeneration failed", "error");
        return;
      }
      toast("Language regenerated", "success");
      onVoteChanged();
    } finally {
      setRegenerating(false);
    }
  }

  return (
    <div className="space-y-4 rounded-lg border border-lift-border bg-surface p-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold">{name}</h3>
          <p className="text-xs text-muted">
            Grade {candidate.grade_applying_to ?? "—"}
            {typeof candidate.tri_score === "number" && (
              <> · TRI <span className="font-mono text-lift-text">{Math.round(candidate.tri_score)}</span></>
            )}
            {candidate.rubric?.recommendation && (
              <> · Interview: <span className="capitalize text-lift-text">{candidate.rubric.recommendation.replace(/_/g, " ")}</span></>
            )}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <FlagPill
            activeFlags={flags}
            onClick={() => setFlagsDrawerOpen(true)}
          />
          {candidate.vote && (
            <span className={`rounded px-2 py-1 text-[11px] font-medium ${DECISION_META[candidate.vote.decision].pill}`}>
              {DECISION_META[candidate.vote.decision].label} · {candidate.vote.status}
            </span>
          )}
        </div>
      </div>

      {flagsDrawerOpen && (
        <FlagDetailDrawer
          candidateName={name}
          activeFlags={flags}
          canResolve={isHost}
          onClose={() => setFlagsDrawerOpen(false)}
          onResolved={() => {
            setFlagsDrawerOpen(false);
            onVoteChanged(); // refresh parent state
          }}
        />
      )}

      {/* Stale-language warning */}
      {languageStale && (
        <div className="flex flex-col gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200 sm:flex-row sm:items-center sm:justify-between">
          <span>
            <strong>Language is stale.</strong> Your mission statement has been updated since this
            was generated. The committee can still deliberate; regenerate to refresh before sending.
          </span>
          {isHost && (
            <button
              onClick={regenerateLanguage}
              disabled={regenerating}
              className="shrink-0 rounded-md border border-amber-500/60 bg-amber-500/20 px-2 py-1 text-[11px] font-medium text-amber-100 hover:bg-amber-500/30 disabled:opacity-50"
            >
              {regenerating ? "Regenerating…" : "Regenerate now"}
            </button>
          )}
        </div>
      )}

      {/* Language side-by-side (three columns on desktop) */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        {(["admit", "waitlist", "decline"] as const).map((d) => (
          <div key={d} className={`rounded-md border-2 ${DECISION_META[d].tone} p-3`}>
            <div className={`mb-2 inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${DECISION_META[d].pill}`}>
              {DECISION_META[d].label}
            </div>
            <p className="whitespace-pre-wrap text-xs leading-relaxed text-lift-text">
              {cache[d] ?? "(not generated)"}
            </p>
          </div>
        ))}
      </div>

      {/* Briefing summary */}
      {candidate.briefing && (
        <details className="rounded-md border border-lift-border bg-page-bg/30 px-3 py-2 text-xs">
          <summary className="cursor-pointer font-medium text-lift-text">Interview briefing</summary>
          <div className="mt-2 space-y-2">
            {candidate.briefing.key_observations.length > 0 && (
              <div>
                <p className="mb-1 text-[10px] uppercase tracking-wide text-muted">Key observations</p>
                <ul className="space-y-0.5 text-muted">
                  {candidate.briefing.key_observations.slice(0, 3).map((o, i) => (
                    <li key={i}>• {o}</li>
                  ))}
                </ul>
              </div>
            )}
            {candidate.briefing.interview_questions.length > 0 && (
              <div>
                <p className="mb-1 text-[10px] uppercase tracking-wide text-muted">Interview questions</p>
                <ul className="space-y-0.5 text-muted">
                  {candidate.briefing.interview_questions.slice(0, 3).map((q, i) => (
                    <li key={i}>• {q.question}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </details>
      )}

      {/* Defer uses a deterministic template (no AI-generated language) */}
      {candidate.vote?.decision === "defer" && (
        <div className="rounded-md border border-slate-500/40 bg-slate-500/5 px-3 py-2 text-xs text-slate-300">
          <strong>Defer template:</strong> {DEFER_TEMPLATE}
        </div>
      )}

      {/* Vote controls (host) or readout (observer) */}
      {isHost ? (
        <div className="space-y-3 rounded-md border border-lift-border bg-page-bg/30 p-3">
          <div className="space-y-2">
            <label className="text-[11px] font-medium text-muted">Rationale (optional)</label>
            <textarea
              value={rationale}
              onChange={(e) => setRationale(e.target.value)}
              rows={2}
              placeholder="Why this decision? (captured in audit, not sent to family)"
              className="w-full rounded-md border border-lift-border bg-surface px-2 py-1.5 text-xs text-lift-text outline-none focus:border-primary"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[11px] font-medium text-muted">Side notes (optional)</label>
            <textarea
              value={sideNotes}
              onChange={(e) => setSideNotes(e.target.value)}
              rows={2}
              placeholder="Committee-only notes — not for families"
              className="w-full rounded-md border border-lift-border bg-surface px-2 py-1.5 text-xs text-lift-text outline-none focus:border-primary"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {(["admit", "waitlist", "decline", "defer"] as const).map((d) => {
              const isCurrent = candidate.vote?.decision === d;
              return (
                <button
                  key={d}
                  onClick={() => submitVote(d)}
                  disabled={submitting}
                  className={`min-h-[40px] rounded-md border-2 px-4 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 ${
                    isCurrent
                      ? `${DECISION_META[d].tone} text-lift-text`
                      : "border-lift-border bg-surface text-muted hover:border-primary/50 hover:text-lift-text"
                  }`}
                >
                  {DECISION_META[d].label}
                </button>
              );
            })}
            {candidate.vote && (
              <button
                onClick={clearVote}
                disabled={submitting || candidate.vote.status === "committed"}
                className="ml-auto min-h-[40px] rounded-md border border-lift-border bg-surface px-3 py-1.5 text-xs font-medium text-muted hover:text-rose-400 disabled:opacity-50"
              >
                Clear vote
              </button>
            )}
          </div>
          {candidate.vote && (
            <p className="text-[10px] text-muted">
              Recorded {new Date(candidate.vote.decided_at).toLocaleString()}
              {candidate.vote.status !== "staged" && ` · ${candidate.vote.status}`}
            </p>
          )}
        </div>
      ) : (
        <div className="rounded-md border border-lift-border bg-page-bg/30 p-3 text-xs text-muted">
          {candidate.vote ? (
            <>
              <strong className="text-lift-text">{DECISION_META[candidate.vote.decision].label}</strong> recorded{" "}
              {new Date(candidate.vote.decided_at).toLocaleString()}
              {candidate.vote.rationale && (
                <p className="mt-1 italic">Rationale: {candidate.vote.rationale}</p>
              )}
            </>
          ) : (
            <span>No vote recorded yet. Observer mode — only the host can record.</span>
          )}
        </div>
      )}

      {/* Link to full candidate profile */}
      <div className="flex justify-end">
        <Link
          href={`/evaluator/candidates/${candidate.id}`}
          target="_blank"
          className="text-[11px] font-medium text-primary hover:underline"
        >
          Open full profile →
        </Link>
      </div>
    </div>
  );
}
