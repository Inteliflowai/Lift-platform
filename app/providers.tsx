'use client';

import posthog from 'posthog-js';
import { PostHogProvider as PHProvider } from 'posthog-js/react';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

// Candidate session routes — never load tracking here. These serve minors
// taking assessments. Keep FERPA/COPPA-sensitive paths free of analytics.
const EXCLUDED_PREFIXES = ['/session', '/invite', '/consent'];

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const excluded = !!pathname && EXCLUDED_PREFIXES.some((p) => pathname.startsWith(p));

  useEffect(() => {
    if (excluded) return;
    const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
    if (!token) return;
    posthog.init(token, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
      defaults: '2026-01-30',
      session_recording: {
        maskAllInputs: true,
      },
    });
  }, [excluded]);

  if (excluded) return <>{children}</>;
  return <PHProvider client={posthog}>{children}</PHProvider>;
}
