import { z } from "zod";
import { votePollAction } from "@/app/actions/news-hub";
import { IdParam, mobileRoute, readJson } from "@/lib/mobile/http";
import { hubResponse } from "@/lib/mobile/news";

const Body = z.object({
  pollId: IdParam,
  choices: z.record(z.string().max(64), z.enum(["YES", "MAYBE", "NO"])),
});

/** Answer a poll or 日程調整 (replaces the member's earlier answer). */
export const POST = mobileRoute<{ id: string }>(async ({ request, params }) => {
  const body = await readJson(request, Body);
  return hubResponse(await votePollAction(params.id, body));
});
