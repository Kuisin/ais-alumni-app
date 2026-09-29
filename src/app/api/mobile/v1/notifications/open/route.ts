import { mobileRoute, readJson } from "@/lib/mobile/http";
import { OpenBody, openNotification } from "@/lib/mobile/notifications";

/** A notification was opened (push tap or list): read receipt + target. */
export const POST = mobileRoute(async ({ request, user }) =>
  openNotification(user, await readJson(request, OpenBody)),
);
