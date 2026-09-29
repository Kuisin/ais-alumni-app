import { z } from "zod";
import { saveLanguage } from "@/lib/mobile/account";
import { mobileRoute, readJson } from "@/lib/mobile/http";

const Body = z.object({ locale: z.enum(["ja", "en"]) });

/** 設定 → 言語: LanguageUpdate → MySettings (then the app refetches /me). */
export const PUT = mobileRoute(async ({ request, user }) => {
  const { locale } = await readJson(request, Body);
  return saveLanguage(user, locale);
});
