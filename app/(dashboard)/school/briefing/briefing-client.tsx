"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useToast } from "@/components/ui/Toast";
import { useLicense } from "@/lib/licensing/context";
import { FEATURES } from "@/lib/licensing/features";

interface Cycle {
  id: string;
  name: string;
  status: string;
}

interface BriefingRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  grade_applying_to: string | null;
  status: string | null;
  tri_score: number | null;
  cycle_id: string | null;
  language_ready: boolean;
  language_is_stale: boolean;
  staleness_reason: "older_than_mission" | "missing_cache" | null;
  defensible_language_updated_at: string | null;
  fallback_used: boolean;
}

interface BriefingPayload {
  rows: BriefingRow[];
  counts: { total: number; ready: number; stale: number; missing: number };
  mission_statement_updated_at: string | null;
}

const CLIENT_VISIBLE_CAP = 50;

export function BriefingPageClient({ cycles }: { cycles: Cycle[] }) {
  const { toast } = useToast();
  const { hasFeature } = useLicense();

  const activeCycle = cycles.find((c) => c.status === "active");
  const [cycleId, setCycleId] = useState<string | "all">(activeCycle?.id ?? "all");
  const [statusFilter, setStatusFilter] = useState<string | "all">("all");
  const [payload, setPayload] = useState<BriefingPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [dryRun, setDryRun] = useState<{ total_stale: number; estimated_minutes: number; batch_size: number } | null>(null);
  const [regenerating, setRegenerating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (cycleId !== "all") params.set("cycle_id", cycleId);
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await fetch(`/api/school/briefing?${params}`, { cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as BriefingPayload;
        setPayload(data);
      } else {
        toast("Failed to load briefing", "error");
      }
    } finally {
      setLoading(false);
    }
  }, [cycleId, statusFilter, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const rows = payload?.rows ?? [];
  const counts = payload?.counts ?? { total: 0, ready: 0, stale: 0, missing: 0 };

  const featureEnabled = hasFeature(FEATURES.DEFENSIBLE_LANGUAGE);

  async function openConfirmDialog() {
    // Dry run to fetch the count the admin is about to approve.
    const body: Record<string, unknown> = { dry_run: true };
    if (cycleId !== "all") body.cycle_id = cycleId;
    const res = await fetch("/api/school/briefing/regenerate-stale", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.status === 429) {
      const err = await res.json();
      toast(`Another regeneration is in progress. Try again in ${err.retry_after_seconds}s.`, "error");
      return;
    }
    if (!res.ok) {
      toast("Could not fetch stale count", "error");
      return;
    }
    const data = (await res.json()) as { total_stale: number; estimated_minutes: number; batch_size: number };
    if (data.total_stale === 0) {
      toast("No stale language to regenerate — everything is up to date.", "success");
      return;
    }
    setDryRun(data);
    setConfirmOpen(true);
  }

  async function confirmRegenerate() {
    setRegenerating(true);
    setConfirmOpen(false);
    try {
      const body: Record<string, unknown> = {};
      if (cycleId !== "all") body.cycle_id = cycleId;
      const res = await fetch("/api/school/briefing/regenerate-stale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.status === 429) {
        const err = await res.json();
        toast(`Rate limited. Try again in ${err.retry_after_seconds}s.`, "error");
        return;
      }
      if (!res.ok) {
        toast("Regeneration failed", "error");
        return;
      }
      const data = (await res.json()) as { regenerated: number; failed: number; total_stale: number };
      if (data.failed > 0) {
        toast(`Regenerated ${data.regenerated}, ${data.failed} failed. Check audit log.`, "error");
      } else {
        toast(`Regenerated language for ${data.regenerated} candidate${data.regenerated === 1 ? "" : "s"}.`, "success");
      }
      await load();
    } finally {
      setRegenerating(false);
      setDryRun(null);
    }
  }

  const missionChangedRecently = useMemo(() => {
    if (!payload?.mission_statement_updated_at) return false;
    const age = Date.now() - new Date(payload.mission_statement_updated_at).getTime();
    return age < 7 * 24 * 60 * 60 * 1000; // 7 days
  }, [payload]);

  if (!featureEnabled) {
    return (
      <div className="rounded-lg border border-lift-border bg-surface p-6">
        <h1 className="text-2xl font-bold">Morning Briefing</h1>
        <p className="mt-2 text-sm text-muted">
          Defensible decision language is not enabled on this tier. Upgrade to Professional or
          Enterprise to see pre-drafted rationale for every candidate.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Morning Briefing</h1>
          <p className="mt-1 text-sm text-muted">
            Decision-ready candidates with pre-drafted language. Open a candidate to copy,
            edit, or download the admit / waitlist / decline rationale.
          </p>
        </div>
      </div>

      {/* Stale-count banner */}
      {counts.stale > 0 && (
        <div className="flex flex-col gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <strong>{counts.stale} candidate{counts.stale === 1 ? "" : "s"}</strong> have language
            older than your current mission statement.
            {missionChangedRecently && " Mission statement updated recently — regenerate to refresh."}
          </div>
          <button
            onClick={openConfirmDialog}
            disabled={regenerating}
            className="min-h-[40px] rounded-md border border-amber-500/60 bg-amber-500/20 px-3 py-1.5 text-sm font-medium text-amber-100 hover:bg-amber-500/30 disabled:opacity-50"
          >
            {regenerating ? "Regenerating…" : `Regenerate all stale (${Math.min(counts.stale, CLIENT_VISIBLE_CAP)})`}
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-3 rounded-lg border border-lift-border bg-surface p-4 sm:flex-row">
        <label className="flex flex-col gap-1 text-xs text-muted">
          Cycle
          <select
            value={cycleId}
            onChange={(e) => setCycleId(e.target.value)}
            className="min-h-[40px] rounded-md border border-lift-border bg-page-bg px-3 py-2 text-sm text-lift-text"
          >
            <option value="all">All cycles</option>
            {cycles.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.status === "active" ? "(active)" : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          Status
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="min-h-[40px] rounded-md border border-lift-border bg-page-bg px-3 py-2 text-sm text-lift-text"
          >
            <option value="all">All completed</option>
            <option value="completed">Completed</option>
            <option value="flagged">Flagged</option>
            <option value="reviewed">Reviewed</option>
            <option value="admitted">Admitted</option>
            <option value="waitlisted">Waitlisted</option>
            <option value="offered">Offered</option>
          </select>
        </label>
        <div className="ml-auto flex items-end gap-4 text-xs text-muted">
          <span><strong className="text-emerald-400">{counts.ready}</strong> ready</span>
          <span><strong className="text-amber-400">{counts.stale}</strong> stale</span>
          <span><strong className="text-rose-400">{counts.missing}</strong> missing</span>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="rounded-lg border border-lift-border bg-surface p-6">
          <p className="text-sm text-muted">Loading…</p>
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-lift-border bg-surface p-6">
          <p className="text-sm text-muted">No candidates match the current filters.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-lift-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface/60 text-xs text-muted">
              <tr>
                <th className="px-4 py-2 font-medium">Candidate</th>
                <th className="px-4 py-2 font-medium">Grade</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">TRI</th>
                <th className="px-4 py-2 font-medium">Language</th>
                <th className="px-4 py-2 font-medium">Last updated</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-lift-border bg-surface">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-primary/5">
                  <td className="px-4 py-2.5 font-medium text-lift-text">
                    {[r.first_name, r.last_name].filter(Boolean).join(" ") || "—"}
                  </td>
                  <td className="px-4 py-2.5 text-muted">{r.grade_applying_to ?? "—"}</td>
                  <td className="px-4 py-2.5 text-muted capitalize">{r.status?.replace("_", " ") ?? "—"}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-muted">
                    {typeof r.tri_score === "number" ? Math.round(r.tri_score) : "—"}
                  </td>
                  <td className="px-4 py-2.5">
                    <LanguagePill row={r} />
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted">
                    {r.defensible_language_updated_at
                      ? new Date(r.defensible_language_updated_at).toLocaleDateString()
                      : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <Link
                      href={`/evaluator/candidates/${r.id}?tab=decision_language`}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      Open language →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Confirmation dialog */}
      {confirmOpen && dryRun && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-lg border border-lift-border bg-surface p-6">
            <h2 className="text-lg font-bold">Regenerate stale language?</h2>
            <p className="mt-2 text-sm text-muted">
              This will regenerate language for <strong className="text-lift-text">{dryRun.total_stale} candidate{dryRun.total_stale === 1 ? "" : "s"}</strong> in
              batches of {dryRun.batch_size}. Estimated time:{" "}
              <strong className="text-lift-text">~{dryRun.estimated_minutes} minute{dryRun.estimated_minutes === 1 ? "" : "s"}</strong>.
            </p>
            <p className="mt-3 text-xs text-muted">
              Each candidate costs roughly $0.01 in AI spend (3 versions generated per candidate).
            </p>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <button
                onClick={confirmRegenerate}
                disabled={regenerating}
                className="min-h-[44px] flex-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
              >
                {regenerating ? "Regenerating…" : `Regenerate ${dryRun.total_stale}`}
              </button>
              <button
                onClick={() => { setConfirmOpen(false); setDryRun(null); }}
                disabled={regenerating}
                className="min-h-[44px] flex-1 rounded-md border border-lift-border bg-surface px-3 py-2 text-sm font-medium text-lift-text hover:bg-primary/5"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LanguagePill({ row }: { row: BriefingRow }) {
  if (!row.language_ready) {
    return (
      <span className="rounded bg-rose-500/10 px-2 py-0.5 text-[10px] font-medium text-rose-400">
        Missing
      </span>
    );
  }
  if (row.language_is_stale) {
    return (
      <span className="rounded bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-400">
        Stale
      </span>
    );
  }
  if (row.fallback_used) {
    return (
      <span className="rounded bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-400">
        Template
      </span>
    );
  }
  return (
    <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
      Ready
    </span>
  );
}
