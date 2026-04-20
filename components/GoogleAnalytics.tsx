'use client';

import Script from "next/script";
import { usePathname } from "next/navigation";
import { isPublicMarketingPath } from "@/lib/analytics/marketingPaths";

const GA_MEASUREMENT_ID = "G-GW73K8W8NP";

export function GoogleAnalytics() {
  const pathname = usePathname();
  // Allow-list only: trackers fire on public marketing paths, never on
  // authenticated dashboard, candidate assessment, or auth/credential flows.
  if (!isPublicMarketingPath(pathname)) {
    return null;
  }

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_MEASUREMENT_ID}', {
            page_path: window.location.pathname,
          });
        `}
      </Script>
    </>
  );
}
