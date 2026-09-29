import { homeFor } from "@/lib/mobile/home";
import { mobileRoute } from "@/lib/mobile/http";

/** ホーム: the website's dashboard (contract: Home). */
export const GET = mobileRoute(({ user, locale }) => homeFor(user, locale));
