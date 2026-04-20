"use client";

import posthog from "posthog-js";
import { PostHogProvider } from "posthog-js/react";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { isPublicMarketingPath } from "@/lib/analytics/marketingPaths";

export function PHProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const allowed = isPublicMarketingPath(pathname);

  useEffect(() => {
    if (!allowed) return;
    const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
    if (!token) return;
    try {
      posthog.init(token, {
        api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
        person_profiles: "identified_only",
        autocapture: true,
        capture_pageview: false,
        capture_pageleave: true,
        session_recording: {
          maskAllInputs: true,
        },
        defaults: "2026-01-30",
      });
    } catch (err) {
      // PostHog init failures should never break the page render.
      // eslint-disable-next-line no-console
      console.warn("PostHog init failed", err);
    }
  }, [allowed]);

  // Always wrap — usePostHog() works from any route, __loaded reflects state.
  return <PostHogProvider client={posthog}>{children}</PostHogProvider>;
}
