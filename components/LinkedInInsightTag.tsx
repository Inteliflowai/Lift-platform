'use client';

import Script from "next/script";
import { usePathname } from "next/navigation";
import { isPublicMarketingPath } from "@/lib/analytics/marketingPaths";

const LINKEDIN_PARTNER_ID = "9004938";

export function LinkedInInsightTag() {
  const pathname = usePathname();
  // Allow-list only: trackers fire on public marketing paths, never on
  // authenticated dashboard, candidate assessment, or auth/credential flows.
  if (!isPublicMarketingPath(pathname)) {
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
