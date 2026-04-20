"use client";

import { useEffect, useState } from "react";

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

type TagStatus = {
  linkedin: { detected: boolean; partnerId?: string };
  ga4: { detected: boolean; measurementId?: string };
  posthog: { detected: boolean; host?: string; distinctId?: string };
};

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
  const [tags, setTags] = useState<TagStatus | null>(null);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    // Detect client-side analytics tags. Re-runs after window load to catch
    // late-initialized scripts (GA4 and PostHog init after hydration).
    const detect = () => {
      const w = window as unknown as {
        _linkedin_data_partner_ids?: string[];
        dataLayer?: unknown[];
        gtag?: (...args: unknown[]) => void;
        posthog?: {
          __loaded?: boolean;
          config?: { api_host?: string; token?: string };
          get_distinct_id?: () => string;
        };
      };

      // LinkedIn: partner IDs array populated by our init script
      const lkIds = w._linkedin_data_partner_ids ?? [];

      // GA4: dataLayer + gtag function. Parse the most recent config call to
      // surface the measurement ID.
      const dataLayer = w.dataLayer ?? [];
      let gaMeasurementId: string | undefined;
      for (const entry of dataLayer) {
        if (Array.isArray(entry) && entry[0] === "config" && typeof entry[1] === "string") {
          gaMeasurementId = entry[1];
        }
      }

      // PostHog: loaded flag + config.api_host + distinct id
      const ph = w.posthog;
      const phLoaded = !!ph?.__loaded;

      setTags({
        linkedin: { detected: lkIds.length > 0, partnerId: lkIds[0] },
        ga4: { detected: typeof w.gtag === "function" && dataLayer.length > 0, measurementId: gaMeasurementId },
        posthog: {
          detected: phLoaded,
          host: ph?.config?.api_host,
          distinctId: phLoaded ? ph?.get_distinct_id?.() : undefined,
        },
      });
    };

    detect();
    const t = setTimeout(detect, 1500);
    return () => clearTimeout(t);
  }, []);

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
    for (const s of SERVICES) loading[s.id] = "loading";
    setResults(loading);
    try {
      const res = await fetch("/api/admin/api-test?service=all", { cache: "no-store" });
      const data = (await res.json()) as { results: ProbeResult[] };
      const map: Record<string, ProbeResult> = {};
      for (const r of data.results) map[r.service] = r;
      setResults(map);
    } catch (err) {
      const errMap: Record<string, ProbeResult> = {};
      for (const s of SERVICES) {
        errMap[s.id] = {
          service: s.id,
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
          {SERVICES.map((svc) => {
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
          })}
        </div>
      </div>

      {/* Client-side analytics tags */}
      <div className="rounded-lg border border-lift-border bg-surface p-5">
        <div className="mb-4">
          <h2 className="text-sm font-semibold">Analytics Tags (this browser)</h2>
          <p className="mt-1 text-[11px] text-muted">
            Detected from <code className="font-mono">window</code> globals on this page. Candidate
            session routes (<code className="font-mono">/session</code>, <code className="font-mono">/invite</code>,{" "}
            <code className="font-mono">/consent</code>) are intentionally excluded — none of these should fire there.
          </p>
        </div>
        <div className="space-y-2">
          {tags && (
            <>
              <TagRow
                label="LinkedIn Insight"
                detected={tags.linkedin.detected}
                detail={tags.linkedin.partnerId ? `partner_id: ${tags.linkedin.partnerId}` : "not detected"}
              />
              <TagRow
                label="Google Analytics 4"
                detected={tags.ga4.detected}
                detail={tags.ga4.measurementId ? `config: ${tags.ga4.measurementId}` : "dataLayer/gtag not detected"}
              />
              <TagRow
                label="PostHog"
                detected={tags.posthog.detected}
                detail={
                  tags.posthog.detected
                    ? `${tags.posthog.host ?? "host unknown"} · distinct_id: ${tags.posthog.distinctId ?? "—"}`
                    : "posthog.__loaded is false"
                }
              />
            </>
          )}
          {!tags && <p className="text-xs text-muted">Detecting…</p>}
        </div>
      </div>
    </div>
  );
}

function TagRow({ label, detected, detail }: { label: string; detected: boolean; detail: string }) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-lift-border px-3 py-2.5">
      <div className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${detected ? "bg-success" : "bg-review"}`} />
      <div className="min-w-0 flex-1">
        <span className="text-sm font-medium">{label}</span>
        <p className="mt-0.5 truncate font-mono text-[11px] text-muted">{detail}</p>
      </div>
      <span
        className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
          detected ? "bg-success/10 text-success" : "bg-review/10 text-review"
        }`}
      >
        {detected ? "Loaded" : "Missing"}
      </span>
    </div>
  );
}
