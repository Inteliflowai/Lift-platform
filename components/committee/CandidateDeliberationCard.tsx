"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useToast } from "@/components/ui/Toast";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { DecisionType } from "@/lib/committee/types";
import type { CandidateFlag } from "@/lib/flags/types";
import { FlagPill } from "@/components/flags/FlagPill";
import { FlagDetailDrawer } from "@/components/flags/FlagDetailDrawer";

type Decision = DecisionType;

// Tone + pill styles are locale-independent; labels come from t() at render time.
const DECISION_TONE: Record<Decision, { tone: string; pill: string }> = {
  admit:    { tone: "border-emerald-500/50 bg-emerald-500/5", pill: "bg-emerald-500/15 text-emerald-400" },
  waitlist: { tone: "border-amber-500/50 bg-amber-500/5",      pill: "bg-amber-500/15 text-amber-400" },
  decline:  { tone: "border-rose-500/50 bg-rose-500/5",        pill: "bg-rose-500/15 text-rose-400" },
  defer:    { tone: "border-slate-500/50 bg-slate-500/5",      pill: "bg-slate-500/15 text-slate-300" },
};

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
  const { t } = useLocale();
  const decisionLabel = (d: Decision) => t(`decision.${d}`);
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

  const name = [candidate.first_name, candidate.last_name].filter(Boolean).join(" ") || t("committee.candidate_fallback");

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
        toast(t("committee.toast_vote_rate_limit").replace("{seconds}", String(err.retry_after_seconds)), "error");
        return;
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast(err.error ?? t("committee.toast_vote_failed"), "error");
        return;
      }
      toast(
        t("committee.toast_recorded").replace("{decision}", decisionLabel(decision)).replace("{name}", name),
        "success",
      );
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
        toast(err.error ?? t("committee.toast_clear_vote_failed"), "error");
        return;
      }
      setRationale("");
      setSideNotes("");
      toast(t("committee.toast_vote_cleared"), "success");
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
        toast(t("dl.toast_regen_failed"), "error");
        return;
      }
      toast(t("dl.toast_regenerated"), "success");
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
            <span className={`rounded px-2 py-1 text-[11px] font-medium ${DECISION_TONE[candidate.vote.decision].pill}`}>
              {decisionLabel(candidate.vote.decision)} · {candidate.vote.status}
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
            <strong>{t("committee.stale_language_title")}</strong> {t("committee.stale_language_body")}
          </span>
          {isHost && (
            <button
              onClick={regenerateLanguage}
              disabled={regenerating}
              className="shrink-0 rounded-md border border-amber-500/60 bg-amber-500/20 px-2 py-1 text-[11px] font-medium text-amber-100 hover:bg-amber-500/30 disabled:opacity-50"
            >
              {regenerating ? t("dl.regenerating") : t("committee.regenerate_now")}
            </button>
          )}
        </div>
      )}

      {/* Language side-by-side (three columns on desktop) */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        {(["admit", "waitlist", "decline"] as const).map((d) => (
          <div key={d} className={`rounded-md border-2 ${DECISION_TONE[d].tone} p-3`}>
            <div className={`mb-2 inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${DECISION_TONE[d].pill}`}>
              {decisionLabel(d)}
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
          <summary className="cursor-pointer font-medium text-lift-text">{t("committee.interview_briefing")}</summary>
          <div className="mt-2 space-y-2">
            {candidate.briefing.key_observations.length > 0 && (
              <div>
                <p className="mb-1 text-[10px] uppercase tracking-wide text-muted">{t("committee.key_observations")}</p>
                <ul className="space-y-0.5 text-muted">
                  {candidate.briefing.key_observations.slice(0, 3).map((o, i) => (
                    <li key={i}>• {o}</li>
                  ))}
                </ul>
              </div>
            )}
            {candidate.briefing.interview_questions.length > 0 && (
              <div>
                <p className="mb-1 text-[10px] uppercase tracking-wide text-muted">{t("committee.interview_questions")}</p>
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
          <strong>{t("committee.defer_template_prefix")}</strong> {t("committee.defer_template")}
        </div>
      )}

      {/* Vote controls (host) or readout (observer) */}
      {isHost ? (
        <div className="space-y-3 rounded-md border border-lift-border bg-page-bg/30 p-3">
          <div className="space-y-2">
            <label className="text-[11px] font-medium text-muted">{t("committee.rationale_label")}</label>
            <textarea
              value={rationale}
              onChange={(e) => setRationale(e.target.value)}
              rows={2}
              placeholder={t("committee.rationale_placeholder")}
              className="w-full rounded-md border border-lift-border bg-surface px-2 py-1.5 text-xs text-lift-text outline-none focus:border-primary"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[11px] font-medium text-muted">{t("committee.side_notes_label")}</label>
            <textarea
              value={sideNotes}
              onChange={(e) => setSideNotes(e.target.value)}
              rows={2}
              placeholder={t("committee.side_notes_placeholder")}
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
                      ? `${DECISION_TONE[d].tone} text-lift-text`
                      : "border-lift-border bg-surface text-muted hover:border-primary/50 hover:text-lift-text"
                  }`}
                >
                  {decisionLabel(d)}
                </button>
              );
            })}
            {candidate.vote && (
              <button
                onClick={clearVote}
                disabled={submitting || candidate.vote.status === "committed"}
                className="ml-auto min-h-[40px] rounded-md border border-lift-border bg-surface px-3 py-1.5 text-xs font-medium text-muted hover:text-rose-400 disabled:opacity-50"
              >
                {t("committee.clear_vote")}
              </button>
            )}
          </div>
          {candidate.vote && (
            <p className="text-[10px] text-muted">
              {t("committee.recorded_prefix")} {new Date(candidate.vote.decided_at).toLocaleString()}
              {candidate.vote.status !== "staged" && ` · ${candidate.vote.status}`}
            </p>
          )}
        </div>
      ) : (
        <div className="rounded-md border border-lift-border bg-page-bg/30 p-3 text-xs text-muted">
          {candidate.vote ? (
            <>
              <strong className="text-lift-text">{decisionLabel(candidate.vote.decision)}</strong> {t("committee.recorded_prefix").toLowerCase()}{" "}
              {new Date(candidate.vote.decided_at).toLocaleString()}
              {candidate.vote.rationale && (
                <p className="mt-1 italic">{t("committee.rationale_label").replace(/\s*\(.*\)\s*/, "")}: {candidate.vote.rationale}</p>
              )}
            </>
          ) : (
            <span>{t("committee.observer_mode")}</span>
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
          {t("committee.open_profile")}
        </Link>
      </div>
    </div>
  );
}
