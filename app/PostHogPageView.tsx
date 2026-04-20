"use client";

import { Suspense, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { usePostHog } from "posthog-js/react";
import { isPublicMarketingPath } from "@/lib/analytics/marketingPaths";

function PostHogPageViewInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const posthog = usePostHog();

  useEffect(() => {
    if (!pathname || !posthog) return;
    // Defense-in-depth: duplicate the allow-list check here so a bug in the
    // provider gate can't alone cause leakage.
    if (!isPublicMarketingPath(pathname)) return;

    let url = window.origin + pathname;
    const qs = searchParams?.toString();
    if (qs) url += "?" + qs;
    posthog.capture("$pageview", { $current_url: url });
  }, [pathname, searchParams, posthog]);

  return null;
}

// useSearchParams requires a Suspense boundary; without it, every page
// opts out of static generation.
export function PostHogPageView() {
  return (
    <Suspense fallback={null}>
      <PostHogPageViewInner />
    </Suspense>
  );
}
