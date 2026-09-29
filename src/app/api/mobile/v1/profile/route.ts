import { loadMyProfile } from "@/lib/mobile/account";
import { mobileRoute } from "@/lib/mobile/http";

/** My profile, read-only (the website's /app/profile) → MyProfile. */
export const GET = mobileRoute(({ user, locale }) =>
  loadMyProfile(user, locale),
);
