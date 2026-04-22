"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/components/ui/Toast";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { useVisibilityAwarePolling } from "@/lib/hooks/useVisibilityAwarePolling";
import { CandidateDeliberationCard } from "@/components/committee/CandidateDeliberationCard";
import { EndSessionDialog } from "@/components/committee/EndSessionDialog";
import { TransferHostDialog } from "@/components/committee/TransferHostDialog";
import type { CommitteeSession, CommitteeVote, DecisionType } from "@/lib/committee/types";

interface CandidatePayload {
  id: string;
  first_name: string | null;
  last_name: string | null;
  grade_applying_to: string | null;
  status: string | null;
  tri_score: number | null;
  defensible_language_cache: Record<string, unknown>;
  defensible_language_updated_at: string | null;
  briefing: {
    key_observations: string[];
    interview_questions: Array<{ question: string; rationale: string; dimension: string }>;
  } | null;
  rubric: { recommendation: string | null; avg_score: number | null } | null;
  vote: CommitteeVote | null;
}

interface SessionDetailPayload {
  session: CommitteeSession;
  candidates: CandidatePayload[];
  votes: CommitteeVote[];
  viewer: { user_id: string; is_host: boolean };
  mission_statement_updated_at?: string | null;
}

const POLL_INTERVAL_MS = 5000;

export function SessionClient({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useLocale();
  const [detail, setDetail] = useState<SessionDetailPayload | null>(null);
  const [endDialogOpen, setEndDialogOpen] = useState(false);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [missionTs, setMissionTs] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/school/committee/sessions/${sessionId}`, { cache: "no-store" });
    if (!res.ok) {
      toast(t("session_page.load_failed"), "error");
      return;
    }
    const data = (await res.json()) as SessionDetailPayload;
    setDetail(data);
  }, [sessionId, toast, t]);

  // Fetch mission timestamp once (stale warning context)
  useEffect(() => {
    (async () => {
      const res = await fetch("/api/school/briefing", { cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as { mission_statement_updated_at: string | null };
        setMissionTs(data.mission_statement_updated_at);
      }
    })();
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useVisibilityAwarePolling(load, POLL_INTERVAL_MS, true);

  const session = detail?.session;
  const candidates = detail?.candidates ?? [];
  const viewer = detail?.viewer;
  const isHost = viewer?.is_host ?? false;
  const isActive = session?.status === "active";

  const stagedVotes = useMemo(() => {
    return candidates
      .filter((c) => c.vote?.status === "staged")
      .map((c) => ({
        candidate_id: c.id,
        candidate_name: [c.first_name, c.last_name].filter(Boolean).join(" ") || t("committee.candidate_fallback"),
        decision: c.vote!.decision as DecisionType,
      }));
  }, [candidates]);

  const committedCount = useMemo(
    () => candidates.filter((c) => c.vote?.status === "committed").length,
    [candidates],
  );

  if (!detail || !session) {
    return (
      <div className="rounded-lg border border-lift-border bg-surface p-6">
        <p className="text-sm text-muted">{t("session_page.loading")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <Link href="/school/briefing" className="text-xs text-muted hover:text-primary">
            ← {t("briefing.page_title")}
          </Link>
          <h1 className="mt-1 text-2xl font-bold">{session.name}</h1>
          <p className="mt-1 text-xs text-muted">
            {t("session_page.status_prefix")} <span className="capitalize text-lift-text">{session.status}</span>
            {" · "}{t("session_page.started_prefix")} {new Date(session.started_at).toLocaleString()}
            {session.concluded_at && (
              <> · {t("session_page.concluded_prefix")} {new Date(session.concluded_at).toLocaleString()}</>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isActive && isHost && (
            <>
              <button
                onClick={() => setTransferDialogOpen(true)}
                className="min-h-[40px] rounded-md border border-lift-border bg-surface px-3 py-1.5 text-xs font-medium text-lift-text hover:border-primary/50"
              >
                {t("session_page.transfer_host")}
              </button>
              <button
                onClick={() => setEndDialogOpen(true)}
                disabled={stagedVotes.length === 0}
                className="min-h-[40px] rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
                title={stagedVotes.length === 0 ? t("session_page.end_session_disabled_tooltip") : ""}
              >
                {t("session_page.end_session")} · {stagedVotes.length} {t("session_page.summary_staged").toLowerCase()}
              </button>
            </>
          )}
          {isActive && !isHost && (
            <button
              onClick={() => setTransferDialogOpen(true)}
              className="min-h-[40px] rounded-md border border-lift-border bg-surface px-3 py-1.5 text-xs font-medium text-lift-text hover:border-primary/50"
            >
              {t("session_page.take_over_host")}
            </button>
          )}
        </div>
      </div>

      {/* Observer banner */}
      {isActive && !isHost && (
        <div className="rounded-lg border border-lift-border bg-surface/60 px-4 py-3 text-xs text-muted">
          <strong className="text-lift-text">{t("committee.observer_mode")}</strong>
        </div>
      )}

      {/* Concluded banner */}
      {!isActive && (
        <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/5 px-4 py-3 text-xs text-emerald-200">
          <span className="capitalize">{session.status}</span>.
          <Link href="/school/briefing" className="ml-2 font-medium text-primary hover:underline">
            {t("session_page.return_briefing")} →
          </Link>
        </div>
      )}

      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        <SummaryCell label={t("session_page.summary_candidates")} value={candidates.length} />
        <SummaryCell label={t("session_page.summary_staged")} value={stagedVotes.length} />
        <SummaryCell label={t("session_page.summary_committed")} value={committedCount} />
        <SummaryCell label={t("session_page.summary_held")} value={candidates.filter((c) => !c.vote).length} />
      </div>

      {/* Candidate deliberation cards */}
      <div className="space-y-4">
        {candidates.map((c) => (
          <CandidateDeliberationCard
            key={c.id}
            sessionId={sessionId}
            candidate={{
              ...c,
              defensible_language_cache: c.defensible_language_cache as {
                admit?: string;
                waitlist?: string;
                decline?: string;
                fallback_used?: boolean;
              },
              vote: c.vote as CandidatePayload["vote"],
            }}
            isHost={isHost && isActive}
            missionUpdatedAt={missionTs}
            onVoteChanged={() => void load()}
          />
        ))}
        {candidates.length === 0 && (
          <div className="rounded-lg border border-lift-border bg-surface p-6 text-sm text-muted">
            {t("briefing.empty")}
          </div>
        )}
      </div>

      {endDialogOpen && (
        <EndSessionDialog
          sessionId={sessionId}
          stagedVotes={stagedVotes}
          liveCommittedCount={committedCount}
          onClose={() => {
            setEndDialogOpen(false);
            void load();
          }}
          onCommitted={() => {
            // Polling will refresh. No-op here.
          }}
        />
      )}

      {transferDialogOpen && (
        <TransferHostDialog
          sessionId={sessionId}
          currentHostId={session.current_host_id}
          onClose={() => setTransferDialogOpen(false)}
          onTransferred={() => {
            setTransferDialogOpen(false);
            void load();
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function SummaryCell({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-lift-border bg-surface px-3 py-2 text-center">
      <div className="text-lg font-semibold text-lift-text">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-muted">{label}</div>
    </div>
  );
}
