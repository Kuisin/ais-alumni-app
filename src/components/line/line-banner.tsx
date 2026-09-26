import { getLocale, getTranslations } from "next-intl/server";
import { buttonClass } from "@/components/ui/button";
import { AccountState } from "@/generated/prisma/enums";
import { lineAddFriendUrl, lineLinkStartUrl } from "@/lib/line-link";
import type { CurrentUser } from "@/lib/session";
import { dismissLineBannerAction } from "./actions";

const DISMISS_FOR_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Dashboard banner (§5.2) for ACTIVE members who haven't linked LINE or don't
 * follow the Official Account. "Not now" hides it for 30 days.
 */
export async function LineBanner({ user }: { user: CurrentUser }) {
  if (user.state !== AccountState.ACTIVE) return null;
  if (user.lineUserId && user.lineFollowing) return null;
  if (
    user.lineBannerDismissedAt &&
    Date.now() - user.lineBannerDismissedAt.getTime() < DISMISS_FOR_MS
  ) {
    return null;
  }

  const addFriendUrl = lineAddFriendUrl();
  // Linked but not following, and no OA id configured: nothing to offer.
  if (user.lineUserId && !addFriendUrl) return null;

  const t = await getTranslations("line");
  const locale = (await getLocale()) === "en" ? "en" : "ja";
  const linked = Boolean(user.lineUserId);

  return (
    <section
      aria-labelledby="line-banner-title"
      className="rounded-xl border border-green-200 border-l-4 border-l-line bg-white p-4 shadow-sm"
    >
      <h2 id="line-banner-title" className="font-semibold">
        {t("banner.title")}
      </h2>
      <p className="mt-1 text-sm text-slate-700">
        {linked ? t("banner.bodyNotFollowing") : t("banner.body")}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {linked && addFriendUrl ? (
          <a
            href={addFriendUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClass("line")}
          >
            {t("addFriend")}
            <span className="sr-only">{t("opensInNewTab")}</span>
          </a>
        ) : (
          <a
            href={lineLinkStartUrl(user.id, "/dashboard", locale)}
            className={buttonClass("line")}
          >
            {t("linkButton")}
          </a>
        )}
        <form action={dismissLineBannerAction}>
          <button type="submit" className={buttonClass("ghost")}>
            {t("banner.dismiss")}
          </button>
        </form>
      </div>
    </section>
  );
}
