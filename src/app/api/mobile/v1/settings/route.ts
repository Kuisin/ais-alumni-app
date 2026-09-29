import { loadMySettings } from "@/lib/mobile/account";
import { mobileRoute } from "@/lib/mobile/http";

/** 設定 (the website's /app/settings): language, notifications, LINE → MySettings. */
export const GET = mobileRoute(({ user }) => loadMySettings(user));
