import { IdParam, mobileRoute } from "@/lib/mobile/http";
import { declineRequest } from "@/lib/mobile/people";

/** Decline (delete) a follow request sent to me. */
export const POST = mobileRoute<{ followId: string }>(({ user, params }) =>
  declineRequest(user, IdParam.parse(params.followId)),
);
