"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { usePostHog } from "posthog-js/react";
import { isPublicMarketingPath } from "@/lib/analytics/marketingPaths";

type TrackerKey = "linkedin" | "ga4" | "posthog";

type Detected = {
  linkedin: { loaded: boolean; partnerId?: string };
  ga4: { loaded: boolean; measurementId?: string };
  posthog: { loaded: boolean; host?: string; distinctId?: string };
};

function useTrackerDetection(): Detected | null {
  // Read PostHog state via the React hook (posthog-js >= 1.369 does NOT
  // attach its instance to window.posthog; reading window.posthog would
  // falsely report "not loaded" even when PostHog is firing).
  const posthog = usePostHog();
  const [detected, setDetected] = useState<Detected | null>(null);

  useEffect(() => {
    const detect = () => {
      const w = window as unknown as {
        _linkedin_data_partner_ids?: string[];
        dataLayer?: unknown[];
        gtag?: (...args: unknown[]) => void;
      };

      const lkIds = w._linkedin_data_partner_ids ?? [];
      const dataLayer = w.dataLayer ?? [];
      let gaMeasurementId: string | undefined;
      for (const entry of dataLayer) {
        if (Array.isArray(entry) && entry[0] === "config" && typeof entry[1] === "string") {
          gaMeasurementId = entry[1];
        }
      }

      const phLoaded = !!posthog && !!(posthog as { __loaded?: boolean }).__loaded;

      setDetected({
        linkedin: {
          loaded: Array.isArray(lkIds) && lkIds.length > 0,
          partnerId: lkIds[0],
        },
        ga4: {
          loaded: typeof w.gtag === "function" && Array.isArray(dataLayer) && dataLayer.length > 0,
          measurementId: gaMeasurementId,
        },
        posthog: {
          loaded: phLoaded,
          host: phLoaded ? (posthog as { config?: { api_host?: string } }).config?.api_host : undefined,
          distinctId: phLoaded ? (posthog as { get_distinct_id?: () => string }).get_distinct_id?.() : undefined,
        },
      });
    };

    detect();
    const interval = setInterval(detect, 1500);
    return () => clearInterval(interval);
  }, [posthog]);

  return detected;
}

function HealthCardBody({
  variant,
  debugEnabled,
}: {
  variant: "overlay" | "card";
  debugEnabled: boolean;
}) {
  const pathname = usePathname();
  const detected = useTrackerDetection();

  if (variant === "overlay" && !debugEnabled) return null;

  const expectedOn = isPublicMarketingPath(pathname);
  const rows: Array<{ key: TrackerKey; label: string; detail?: string }> = detected
    ? [
        {
          key: "linkedin",
          label: "LinkedIn Insight",
          detail: detected.linkedin.partnerId
            ? `partner_id: ${detected.linkedin.partnerId}`
            : "—",
        },
        {
          key: "ga4",
          label: "Google Analytics 4",
          detail: detected.ga4.measurementId ? `config: ${detected.ga4.measurementId}` : "—",
        },
        {
          key: "posthog",
          label: "PostHog",
          detail: detected.posthog.loaded
            ? `${detected.posthog.host ?? "host unknown"} · id: ${detected.posthog.distinctId ?? "—"}`
            : "—",
        },
      ]
    : [];

  const loadedMap: Record<TrackerKey, boolean> = detected
    ? {
        linkedin: detected.linkedin.loaded,
        ga4: detected.ga4.loaded,
        posthog: detected.posthog.loaded,
      }
    : { linkedin: false, ga4: false, posthog: false };

  const allMatch =
    !!detected &&
    loadedMap.linkedin === expectedOn &&
    loadedMap.ga4 === expectedOn &&
    loadedMap.posthog === expectedOn;

  const wrapperClass =
    variant === "overlay"
      ? "fixed bottom-4 right-4 z-[9999] max-w-sm shadow-2xl"
      : "";

  const borderClass = allMatch ? "border-emerald-500" : "border-rose-500";

  return (
    <div className={wrapperClass}>
      <div
        className={`rounded-lg border-2 ${borderClass} bg-white p-4 text-xs text-gray-900`}
      >
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className="font-semibold">Analytics Health</span>
          <span className="truncate font-mono text-[10px] text-gray-500">{pathname}</span>
        </div>
        <p className="mb-3 text-[10px] text-gray-600">
          Expected on this path: <strong>{expectedOn ? "ON" : "OFF"}</strong>{" "}
          {expectedOn ? "(public marketing)" : "(not marketing — trackers must be off)"}
        </p>
        <div className="space-y-1.5">
          {!detected && <p className="text-gray-500">Detecting…</p>}
          {rows.map((row) => {
            const actual = loadedMap[row.key];
            const match = actual === expectedOn;
            return (
              <div
                key={row.key}
                className="flex items-center justify-between gap-3 rounded border border-gray-200 px-2.5 py-1.5"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{row.label}</div>
                  <div className="truncate font-mono text-[10px] text-gray-500">{row.detail}</div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                      actual
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {actual ? "ON" : "OFF"}
                  </span>
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                      match ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                    }`}
                  >
                    {match ? "OK" : "MISMATCH"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-[10px] text-gray-500">
          Ground truth is PostHog Live Events. If events land there, PostHog is firing
          regardless of the indicator above.
        </p>
      </div>
    </div>
  );
}

function OverlayInner() {
  const searchParams = useSearchParams();
  const debugEnabled = searchParams?.get("debug") === "1";
  return <HealthCardBody variant="overlay" debugEnabled={debugEnabled} />;
}

export function AnalyticsHealthCard({
  variant = "card",
}: {
  variant?: "overlay" | "card";
}) {
  if (variant === "overlay") {
    return (
      <Suspense fallback={null}>
        <OverlayInner />
      </Suspense>
    );
  }
  return <HealthCardBody variant="card" debugEnabled={true} />;
}
