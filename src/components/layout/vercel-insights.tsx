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
        // Every page load while traffic is small (Hobby allows 10,000
        // events per 30 days, shared by the team). Lower this, e.g. to 0.5,
        // if Vercel warns the allowance is close.
        sampleRate={1}
        beforeSend={(event) => ({
          ...event,
          url: redactAnalyticsUrl(event.url),
        })}
      />
    </>
  );
}
