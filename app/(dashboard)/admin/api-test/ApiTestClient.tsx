"use client";

import { useState } from "react";
import { AnalyticsHealthCard } from "@/components/analytics/AnalyticsHealthCard";

type ProbeStatus = "ok" | "error" | "not_configured";
type ProbeResult = {
  service: string;
  status: ProbeStatus;
  latency_ms: number;
  detail: string;
};

const SERVICES: Array<{ id: string; label: string; description: string }> = [
  { id: "supabase", label: "Supabase", description: "Postgres + auth (service role)" },
  { id: "anthropic", label: "Anthropic", description: "Claude API — 1-token ping" },
  { id: "openai", label: "OpenAI", description: "Whisper / TTS — models.list" },
  { id: "stripe", label: "Stripe", description: "Billing — balance.retrieve" },
  { id: "highlevel", label: "HighLevel", description: "CRM — location lookup" },
  { id: "resend", label: "Resend", description: "Email — domains.list" },
];

const SUBSYSTEMS: Array<{ id: string; label: string; description: string }> = [
  { id: "defensible_language", label: "Defensible Language", description: "Cached rationales on candidates + model in use" },
  { id: "committee_sessions", label: "Committee Sessions", description: "Active sessions, staged votes, orphan warnings" },
  { id: "enrollment_flags", label: "Enrollment Flags", description: "Active observations + last evaluator cron run" },
  { id: "mission_statements", label: "Mission Statements", description: "Tenants with mission set (powers personalization)" },
];

const ALL_IDS = [...SERVICES.map((s) => s.id), ...SUBSYSTEMS.map((s) => s.id)];

function statusColor(status: ProbeStatus): string {
  if (status === "ok") return "bg-success";
  if (status === "not_configured") return "bg-muted";
  return "bg-review";
}

function statusLabel(status: ProbeStatus): string {
  if (status === "ok") return "OK";
  if (status === "not_configured") return "Not configured";
  return "Error";
}

export function ApiTestClient() {
  const [results, setResults] = useState<Record<string, ProbeResult | "loading" | undefined>>({});
  const [running, setRunning] = useState(false);

  async function runOne(service: string) {
    setResults((r) => ({ ...r, [service]: "loading" }));
    try {
      const res = await fetch(`/api/admin/api-test?service=${service}`, { cache: "no-store" });
      const data = (await res.json()) as ProbeResult;
      setResults((r) => ({ ...r, [service]: data }));
    } catch (err) {
      setResults((r) => ({
        ...r,
        [service]: {
          service,
          status: "error",
          latency_ms: 0,
          detail: err instanceof Error ? err.message : "Network error",
        },
      }));
    }
  }

  async function runAll() {
    setRunning(true);
    const loading: Record<string, "loading"> = {};
    for (const id of ALL_IDS) loading[id] = "loading";
    setResults(loading);
    try {
      const res = await fetch("/api/admin/api-test?service=all", { cache: "no-store" });
      const data = (await res.json()) as { results: ProbeResult[] };
      const map: Record<string, ProbeResult> = {};
      for (const r of data.results) map[r.service] = r;
      setResults(map);
    } catch (err) {
      const errMap: Record<string, ProbeResult> = {};
      for (const id of ALL_IDS) {
        errMap[id] = {
          service: id,
          status: "error",
          latency_ms: 0,
          detail: err instanceof Error ? err.message : "Network error",
        };
      }
      setResults(errMap);
    } finally {
      setRunning(false);
    }
  }

  function renderRow(svc: { id: string; label: string; description: string }) {
    const r = results[svc.id];
    const isLoading = r === "loading";
    const result = typeof r === "object" ? r : undefined;
    return (
      <div
        key={svc.id}
        className="flex items-center gap-3 rounded-md border border-lift-border px-3 py-2.5"
      >
        <div
          className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${
            isLoading ? "bg-warning animate-pulse" : result ? statusColor(result.status) : "bg-muted/30"
          }`}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{svc.label}</span>
            <span className="text-[10px] text-muted">{svc.description}</span>
          </div>
          {result && (
            <p className="mt-0.5 truncate font-mono text-[11px] text-muted">{result.detail}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {result && (
            <>
              <span className="text-[10px] text-muted">{result.latency_ms}ms</span>
              <span
                className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                  result.status === "ok"
                    ? "bg-success/10 text-success"
                    : result.status === "not_configured"
                    ? "bg-muted/10 text-muted"
                    : "bg-review/10 text-review"
                }`}
              >
                {statusLabel(result.status)}
              </span>
            </>
          )}
          <button
            onClick={() => runOne(svc.id)}
            disabled={isLoading || running}
            className="rounded border border-lift-border px-2 py-1 text-[10px] text-primary hover:bg-primary/5 disabled:opacity-50"
          >
            {isLoading ? "…" : "Test"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Server-side API probes */}
      <div className="rounded-lg border border-lift-border bg-surface p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Server-Side APIs</h2>
          <button
            onClick={runAll}
            disabled={running}
            className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary/90 disabled:opacity-50"
          >
            {running ? "Running…" : "Run All"}
          </button>
        </div>
        <div className="space-y-2">
          {SERVICES.map(renderRow)}
        </div>
      </div>

      {/* LIFT subsystem probes — table reachability + aggregate counts +
          cron-run timestamps for the systems shipped in migrations 037-040.
          Not endpoint smoke tests; a broken route handler won't show red
          here if the underlying table/cron is healthy. */}
      <div className="rounded-lg border border-lift-border bg-surface p-5">
        <div className="mb-4">
          <h2 className="text-sm font-semibold">LIFT Subsystems</h2>
          <p className="mt-1 text-[11px] text-muted">
            Aggregate health of the decision-engine subsystems shipped in
            migrations 037–040. Counts are cross-tenant (service role); cron
            timestamps come from <code className="text-[10px]">audit_logs</code>.
          </p>
        </div>
        <div className="space-y-2">
          {SUBSYSTEMS.map(renderRow)}
        </div>
      </div>

      {/* Client-side analytics health — expected state on this authenticated
          route is OFF for all three trackers. */}
      <div className="rounded-lg border border-lift-border bg-surface p-5">
        <div className="mb-4">
          <h2 className="text-sm font-semibold">Analytics Tags (this browser)</h2>
          <p className="mt-1 text-[11px] text-muted">
            Expected state is auto-derived from the current pathname. On
            authenticated routes like this one, all three trackers should be OFF —
            that is the success state.
          </p>
        </div>
        <AnalyticsHealthCard variant="card" />
      </div>
    </div>
  );
}
