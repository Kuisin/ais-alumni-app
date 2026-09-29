import { z } from "zod";
import { confirmNewsAction } from "@/app/actions/news-hub";
import { mobileRoute, readJson } from "@/lib/mobile/http";
import { hubResponse } from "@/lib/mobile/news";

const Body = z.object({ on: z.boolean() });

/** 「確認しました」, or take it back while answers are open. */
export const POST = mobileRoute<{ id: string }>(async ({ request, params }) => {
  const { on } = await readJson(request, Body);
  return hubResponse(await confirmNewsAction(params.id, on));
});
