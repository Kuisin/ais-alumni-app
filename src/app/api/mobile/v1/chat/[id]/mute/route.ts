import { MuteBody, setMuted } from "@/lib/mobile/chat";
import { IdParam, mobileRoute, readJson } from "@/lib/mobile/http";

/** The daily digest for this talk: { muted } (true = off). */
export const PUT = mobileRoute<{ id: string }>(async ({ request, params }) =>
  setMuted(IdParam.parse(params.id), await readJson(request, MuteBody)),
);
