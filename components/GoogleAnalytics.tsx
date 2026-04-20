'use client';

import Script from "next/script";
import { usePathname } from "next/navigation";

const GA_MEASUREMENT_ID = "G-GW73K8W8NP";

// Candidate session routes — never load tracking here. These serve minors
// taking assessments. Keep FERPA/COPPA-sensitive paths free of analytics.
const EXCLUDED_PREFIXES = ["/session", "/invite", "/consent"];

export function GoogleAnalytics() {
  const pathname = usePathname();
  if (pathname && EXCLUDED_PREFIXES.some((p) => pathname.startsWith(p))) {
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
