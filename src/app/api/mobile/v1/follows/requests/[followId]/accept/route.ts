import { IdParam, mobileRoute } from "@/lib/mobile/http";
import { acceptRequest } from "@/lib/mobile/people";

/** Accept a follow request sent to me (contract: AcceptResult). */
export const POST = mobileRoute<{ followId: string }>(({ user, params }) =>
  acceptRequest(user, IdParam.parse(params.followId)),
);
