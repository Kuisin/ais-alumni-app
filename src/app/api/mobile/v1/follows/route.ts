import { mobileRoute, query } from "@/lib/mobile/http";
import { followLists } from "@/lib/mobile/people";

/**
 * フォロー: requests, followers, following and blocked members (contract:
 * FollowLists). ?accepted=<followId> adds the request just accepted, for
 * the follow-back offer.
 */
export const GET = mobileRoute(({ request, user, locale }) =>
  followLists(user, query(request).accepted || null, locale),
);
