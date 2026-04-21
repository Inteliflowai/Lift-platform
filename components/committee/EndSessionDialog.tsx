"use client";

import { useMemo, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import type { DecisionType } from "@/lib/committee/types";

interface StagedVote {
  candidate_id: string;
  candidate_name: string;
  decision: DecisionType;
}

interface CommitItem {
  vote_id: string;
  candidate_id: string;
  decision: DecisionType;
  outcome: "committed" | "held" | "failed" | "already_committed";
  final_rec_id?: string;
  error?: string;
}

interface CommitSummary {
  total: number;
  committed: number;
  held: number;
  failed: number;
  already_committed: number;
  items: CommitItem[];
}

interface Props {
  sessionId: string;
  stagedVotes: StagedVote[];
  liveCommittedCount: number; // polled from session detail during commit
  onClose: () => void;
  onCommitted: () => void;
}

const DECISION_PILL: Record<DecisionType, string> = {
  admit: "bg-emerald-500/15 text-emerald-400",
  waitlist: "bg-amber-500/15 text-amber-400",
  decline: "bg-rose-500/15 text-rose-400",
  defer: "bg-slate-500/15 text-slate-300",
};

export function EndSessionDialog({
  sessionId,
  stagedVotes,
  liveCommittedCount,
  onClose,
  onCommitted,
}: Props) {
  const { toast } = useToast();
  const [heldIds, setHeldIds] = useState<Set<string>>(new Set());
  const [committing, setCommitting] = useState(false);
  const [summary, setSummary] = useState<CommitSummary | null>(null);

  const toCommitCount = stagedVotes.length - heldIds.size;
  const admitCount = useMemo(
    () => stagedVotes.filter((v) => v.decision === "admit" && !heldIds.has(v.candidate_id)).length,
    [stagedVotes, heldIds],
  );

  function toggleHold(candidateId: string) {
    setHeldIds((prev) => {
      const next = new Set(prev);
      if (next.has(candidateId)) next.delete(candidateId);
      else next.add(candidateId);
      return next;
    });
  }

  async function commit() {
    setCommitting(true);
    try {
      const res = await fetch(`/api/school/committee/sessions/${sessionId}/commit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hold_candidate_ids: Array.from(heldIds) }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast(err.error ?? "Commit failed", "error");
        return;
      }
      const data = (await res.json()) as CommitSummary;
      setSummary(data);
      if (data.failed > 0) {
        toast(`Committed ${data.committed}, ${data.failed} failed — review below`, "error");
      } else {
        toast(`Committed ${data.committed} decision${data.committed === 1 ? "" : "s"}`, "success");
      }
      onCommitted();
    } finally {
      setCommitting(false);
    }
  }

  const showingSummary = summary !== null;
  const progressDuringCommit = committing && !showingSummary
    ? `Processing — ${liveCommittedCount}/${toCommitCount} committed`
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-lg border border-lift-border bg-surface">
        {/* Header */}
        <div className="border-b border-lift-border px-6 py-4">
          <h2 className="text-lg font-bold">
            {showingSummary ? "Commit complete" : `Commit ${toCommitCount} staged decision${toCommitCount === 1 ? "" : "s"}?`}
          </h2>
          {!showingSummary && (
            <p className="mt-1 text-xs text-muted">
              Review each decision. Use &quot;Hold&quot; to keep a candidate staged for the next session.
              On commit, final_recommendations writes per candidate. For admits, CORE handoff, support
              plan generation, and SIS sync fire automatically.
            </p>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {progressDuringCommit && (
            <div className="mb-3 rounded-md border border-primary/40 bg-primary/10 px-3 py-2 text-xs text-primary">
              {progressDuringCommit}
            </div>
          )}

          {showingSummary ? (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-4 gap-2">
                <StatCell label="Committed" value={summary!.committed} tone="emerald" />
                <StatCell label="Held" value={summary!.held} tone="slate" />
                <StatCell label="Failed" value={summary!.failed} tone="rose" />
                <StatCell label="Already done" value={summary!.already_committed} tone="muted" />
              </div>
              <div className="divide-y divide-lift-border rounded-md border border-lift-border">
                {summary!.items.map((item) => (
                  <CommitResultRow key={item.vote_id} item={item} stagedVotes={stagedVotes} />
                ))}
              </div>
            </div>
          ) : (
            <div className="divide-y divide-lift-border rounded-md border border-lift-border">
              {stagedVotes.map((v) => {
                const held = heldIds.has(v.candidate_id);
                return (
                  <div
                    key={v.candidate_id}
                    className={`flex items-center justify-between gap-3 px-3 py-2.5 text-sm ${held ? "opacity-60" : ""}`}
                  >
                    <span className="truncate font-medium">{v.candidate_name}</span>
                    <span className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-medium capitalize ${DECISION_PILL[v.decision]}`}>
                      {v.decision}
                    </span>
                    <label className="flex shrink-0 cursor-pointer items-center gap-1.5 text-[11px] text-muted">
                      <input
                        type="checkbox"
                        checked={held}
                        onChange={() => toggleHold(v.candidate_id)}
                        disabled={committing}
                        className="h-4 w-4 accent-primary"
                      />
                      Hold for next session
                    </label>
                  </div>
                );
              })}
              {stagedVotes.length === 0 && (
                <p className="px-3 py-4 text-center text-xs text-muted">No staged decisions to commit.</p>
              )}
            </div>
          )}

          {!showingSummary && admitCount > 0 && (
            <p className="mt-3 text-[11px] text-amber-300">
              {admitCount} admit decision{admitCount === 1 ? "" : "s"} will fire CORE handoff, support
              plan generation, and SIS sync for each candidate.
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-col gap-2 border-t border-lift-border px-6 py-4 sm:flex-row">
          {showingSummary ? (
            <button
              onClick={onClose}
              className="min-h-[44px] flex-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary/90"
            >
              Close
            </button>
          ) : (
            <>
              <button
                onClick={commit}
                disabled={committing || toCommitCount === 0}
                className="min-h-[44px] flex-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
              >
                {committing ? "Committing…" : `Commit ${toCommitCount}`}
              </button>
              <button
                onClick={onClose}
                disabled={committing}
                className="min-h-[44px] flex-1 rounded-md border border-lift-border bg-surface px-3 py-2 text-sm font-medium text-lift-text hover:bg-primary/5"
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCell({ label, value, tone }: { label: string; value: number; tone: "emerald" | "rose" | "slate" | "muted" }) {
  const toneClass: Record<string, string> = {
    emerald: "text-emerald-400",
    rose: "text-rose-400",
    slate: "text-slate-300",
    muted: "text-muted",
  };
  return (
    <div className="rounded-md border border-lift-border bg-page-bg/30 px-3 py-2 text-center">
      <div className={`text-lg font-semibold ${toneClass[tone]}`}>{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-muted">{label}</div>
    </div>
  );
}

function CommitResultRow({
  item,
  stagedVotes,
}: {
  item: CommitItem;
  stagedVotes: StagedVote[];
}) {
  const name = stagedVotes.find((v) => v.candidate_id === item.candidate_id)?.candidate_name ?? "Candidate";
  const toneClass =
    item.outcome === "committed" ? "text-emerald-400"
    : item.outcome === "held" ? "text-slate-300"
    : item.outcome === "failed" ? "text-rose-400"
    : "text-muted";
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2 text-xs">
      <span className="truncate">{name}</span>
      <span className={`capitalize ${toneClass}`}>{item.outcome.replace("_", " ")}</span>
      {item.error && <span className="ml-2 max-w-[240px] truncate text-[10px] text-rose-300" title={item.error}>{item.error}</span>}
    </div>
  );
}
