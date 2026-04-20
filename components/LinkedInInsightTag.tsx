'use client';

import Script from "next/script";
import { usePathname } from "next/navigation";

const LINKEDIN_PARTNER_ID = "9004938";

// Candidate session routes — never load tracking here. These serve minors
// taking assessments. Keep FERPA/COPPA-sensitive paths free of ad pixels.
const EXCLUDED_PREFIXES = ["/session", "/invite", "/consent"];

export function LinkedInInsightTag() {
  const pathname = usePathname();
  if (pathname && EXCLUDED_PREFIXES.some((p) => pathname.startsWith(p))) {
    return null;
  }

  return (
    <>
      <Script id="linkedin-insight-init" strategy="afterInteractive">
        {`
          _linkedin_partner_id = "${LINKEDIN_PARTNER_ID}";
          window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || [];
          window._linkedin_data_partner_ids.push(_linkedin_partner_id);
        `}
      </Script>
      <Script
        id="linkedin-insight-loader"
        strategy="afterInteractive"
        src="https://snap.licdn.com/li.lms-analytics/insight.min.js"
      />
      <noscript>
        <img
          height="1"
          width="1"
          style={{ display: "none" }}
          alt=""
          src={`https://px.ads.linkedin.com/collect/?pid=${LINKEDIN_PARTNER_ID}&fmt=gif`}
        />
      </noscript>
    </>
  );
}
