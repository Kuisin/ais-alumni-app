import { ReportBody, reportChat } from "@/lib/mobile/chat";
import { IdParam, mobileRoute, readJson } from "@/lib/mobile/http";

/** Report the talk, or someone in it, to the admins → { ref }. */
export const POST = mobileRoute<{ id: string }>(async ({ request, params }) =>
  reportChat(IdParam.parse(params.id), await readJson(request, ReportBody)),
);
