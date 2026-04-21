"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useToast } from "@/components/ui/Toast";
import { useLicense } from "@/lib/licensing/context";
import { FEATURES } from "@/lib/licensing/features";
import { FlagBadge, FLAG_LABELS } from "@/components/flags/FlagBadge";
import type { CandidateFlag, FlagType } from "@/lib/flags/types";

interface Cycle {
  id: string;
  name: string;
  status: string;
}

interface FlagRow extends CandidateFlag {
  candidate: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    grade_applying_to: string | null;
    status: string | null;
    cycle_id: string | null;
  };
}

interface Payload {
  rows: FlagRow[];
  counts: { total: number; notable: number; advisory: number };
}

const FLAG_TYPES: FlagType[] = [
  "consent_not_captured",
  "invite_expired_unopened",
  "assessment_abandoned",
  "low_completion",
  "late_cycle_admit",
  "post_admit_silence",
  "interviewer_unresponsive",
];

export function FlagsClient({ cycles }: { cycles: Cycle[] }) {
  const { toast } = useToast();
  const { hasFeature } = useLicense();
  const featureEnabled = hasFeature(FEATURES.ENROLLMENT_READINESS_FLAGS);

  const [severityFilter, setSeverityFilter] = useState<"all" | "notable" | "advisory">("all");
  const [flagTypeFilter, setFlagTypeFilter] = useState<FlagType | "all">("all");
  const [cycleId, setCycleId] = useState<string | "all">("all");
  const [payload, setPayload] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolveReason, setResolveReason] = useState("");
  const [snoozeDays, setSnoozeDays] = useState(30);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (severityFilter !== "all") params.set("severity", severityFilter);
      if (flagTypeFilter !== "all") params.set("flag_type", flagTypeFilter);
      if (cycleId !== "all") params.set("cycle_id", cycleId);
      const res = await fetch(`/api/school/flags?${params}`, { cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as Payload;
        setPayload(data);
      } else {
        toast("Failed to load flags", "error");
      }
    } finally {
      setLoading(false);
    }
  }, [severityFilter, flagTypeFilter, cycleId, toast]);

  useEffect(() => {
    load();
  }, [load]);

  async function resolveFlag(flagId: string) {
    if (!resolveReason.trim()) {
      toast("Resolution reason required", "error");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/school/flags/${flagId}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolved_reason: resolveReason.trim(), snooze_days: snoozeDays }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast(err.error ?? "Resolve failed", "error");
        return;
      }
      toast("Flag resolved", "success");
      setResolvingId(null);
      setResolveReason("");
      await load();
    } finally {
      setSubmitting(false);
    }
  }

  if (!featureEnabled) {
    return (
      <div className="rounded-lg border border-lift-border bg-surface p-6">
        <h1 className="text-2xl font-bold">Flags</h1>
        <p className="mt-2 text-sm text-muted">
          Enrollment Readiness Flags are not enabled on this tier.
        </p>
      </div>
    );
  }

  const rows = payload?.rows ?? [];
  const counts = payload?.counts ?? { total: 0, notable: 0, advisory: 0 };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Enrollment Readiness Flags</h1>
        <p className="mt-1 text-sm text-muted">
          Observed conditions that may need admissions-team attention. Each flag is raised
          from real data on the candidate — never a prediction of outcome. See{" "}
          <Link href="/docs/enrollment-readiness-flags" className="text-primary hover:underline">the per-flag spec</Link>{" "}
          for every flag&apos;s raise condition.
        </p>
      </div>

      {/* Filters + counts */}
      <div className="flex flex-col gap-3 rounded-lg border border-lift-border bg-surface p-4 sm:flex-row sm:items-end">
        <label className="flex flex-col gap-1 text-xs text-muted">
          Severity
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value as typeof severityFilter)}
            className="min-h-[40px] rounded-md border border-lift-border bg-page-bg px-3 py-2 text-sm text-lift-text"
          >
            <option value="all">All</option>
            <option value="notable">Notable</option>
            <option value="advisory">Advisory</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          Flag type
          <select
            value={flagTypeFilter}
            onChange={(e) => setFlagTypeFilter(e.target.value as FlagType | "all")}
            className="min-h-[40px] rounded-md border border-lift-border bg-page-bg px-3 py-2 text-sm text-lift-text"
          >
            <option value="all">All types</option>
            {FLAG_TYPES.map((t) => (
              <option key={t} value={t}>{FLAG_LABELS[t]}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          Cycle
          <select
            value={cycleId}
            onChange={(e) => setCycleId(e.target.value)}
            className="min-h-[40px] rounded-md border border-lift-border bg-page-bg px-3 py-2 text-sm text-lift-text"
          >
            <option value="all">All cycles</option>
            {cycles.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>
        <div className="ml-auto flex items-end gap-4 text-xs text-muted">
          <span><strong className="text-rose-400">{counts.notable}</strong> notable</span>
          <span><strong className="text-amber-400">{counts.advisory}</strong> advisory</span>
          <span><strong className="text-lift-text">{counts.total}</strong> total</span>
        </div>
      </div>

      {/* Flag rows */}
      {loading ? (
        <div className="rounded-lg border border-lift-border bg-surface p-6">
          <p className="text-sm text-muted">Loading…</p>
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-lift-border bg-surface p-6">
          <p className="text-sm text-muted">No active flags match the current filters.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => {
            const candidateName = [row.candidate.first_name, row.candidate.last_name].filter(Boolean).join(" ") || "Candidate";
            return (
              <div key={row.id} className="rounded-lg border border-lift-border bg-surface p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <Link
                      href={`/evaluator/candidates/${row.candidate.id}`}
                      className="text-sm font-semibold text-lift-text hover:text-primary"
                    >
                      {candidateName}
                    </Link>
                    <span className="ml-2 text-xs text-muted">
                      Grade {row.candidate.grade_applying_to ?? "—"} · {row.candidate.status?.replace("_", " ") ?? "—"}
                    </span>
                  </div>
                </div>
                <FlagBadge
                  flag={row}
                  onResolve={() => setResolvingId(row.id)}
                />
                {resolvingId === row.id && (
                  <div className="mt-2 space-y-2 rounded-md border border-primary/40 bg-primary/5 p-3">
                    <label className="block text-[11px] font-medium text-muted">
                      Resolution reason (required)
                      <textarea
                        value={resolveReason}
                        onChange={(e) => setResolveReason(e.target.value)}
                        rows={2}
                        className="mt-1 w-full rounded border border-lift-border bg-surface px-2 py-1.5 text-xs text-lift-text"
                        placeholder="e.g. Family confirmed by phone"
                      />
                    </label>
                    <label className="block text-[11px] font-medium text-muted">
                      Snooze: {snoozeDays} days
                      <input
                        type="range"
                        min={1}
                        max={90}
                        value={snoozeDays}
                        onChange={(e) => setSnoozeDays(Number(e.target.value))}
                        className="mt-1 w-full"
                      />
                    </label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => resolveFlag(row.id)}
                        disabled={submitting || !resolveReason.trim()}
                        className="flex-1 min-h-[36px] rounded bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary/90 disabled:opacity-50"
                      >
                        {submitting ? "Resolving…" : "Resolve"}
                      </button>
                      <button
                        onClick={() => {
                          setResolvingId(null);
                          setResolveReason("");
                        }}
                        disabled={submitting}
                        className="flex-1 min-h-[36px] rounded border border-lift-border bg-surface px-3 py-1.5 text-xs text-muted"
                      >
                        Cancel
                      </button>
                    </div>
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
