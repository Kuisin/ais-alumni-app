import type { AppConfig } from "@/lib/mobile/contract/core";
import { publicRoute } from "@/lib/mobile/http";
import { ssoReady } from "@/lib/sso";

/** What the app needs before sign-in (which sign-in buttons to show). */
export const GET = publicRoute(
  async (): Promise<AppConfig> => ({
    sso: { google: ssoReady("google"), line: ssoReady("line") },
    lineOaId: process.env.NEXT_PUBLIC_LINE_OA_ID?.trim() || null,
    minAppVersion: null,
  }),
);
