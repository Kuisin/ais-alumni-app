"use client";

import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { redactAnalyticsUrl } from "@/lib/analytics-url";

/**
 * Vercel Web Analytics (page views) and Speed Insights (real-user
 * performance). Cookieless; URLs are reduced to the page's shape first
 * (no search words, IDs or tokens — see analytics-url.ts).
 */
export function VercelInsights() {
  return (
    <>
      <Analytics
        beforeSend={(event) => ({
          ...event,
          url: redactAnalyticsUrl(event.url),
        })}
      />
      <SpeedInsights
        // Hobby: 10,000 events per 30 days, shared by the team; half is
        // plenty for the score and keeps collection from pausing.
        sampleRate={0.5}
        beforeSend={(event) => ({
          ...event,
          url: redactAnalyticsUrl(event.url),
        })}
      />
    </>
  );
}
