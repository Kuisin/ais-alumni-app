import { mobileRoute, readJson } from "@/lib/mobile/http";
import { markInboxSeen, ReadBody } from "@/lib/mobile/notifications";

/** Mark notifications as seen ({ ids } or all). */
export const POST = mobileRoute(async ({ request, user }) =>
  markInboxSeen(user, await readJson(request, ReadBody)),
);
