import { getLocale, getTranslations } from "next-intl/server";
import { lineAddFriendUrl, lineLinkStartUrl } from "@/lib/line-link";
import type { CurrentUser } from "@/lib/session";

/**
 * One-line "Get the reminder on LINE?" prompt shown after an RSVP (§5.2).
 * Renders nothing if the member already gets LINE messages.
 */
export async function LineRsvpPrompt({
  user,
  returnTo,
}: {
  user: CurrentUser;
  returnTo: string;
}) {
  if (user.lineUserId && user.lineFollowing) return null;
  const addFriendUrl = lineAddFriendUrl();
  if (user.lineUserId && !addFriendUrl) return null;

  const t = await getTranslations("line");
  const locale = (await getLocale()) === "en" ? "en" : "ja";
  const external = Boolean(user.lineUserId);
  const href = external
    ? (addFriendUrl as string)
    : lineLinkStartUrl(user.id, returnTo, locale);

  return (
    <p className="flex flex-wrap items-center gap-x-2 text-sm text-slate-700">
      <span
        aria-hidden="true"
        className="inline-block size-2.5 rounded-full bg-line"
      />
      <span>{t("rsvpPrompt.text")}</span>
      <a
        href={href}
        className="font-semibold text-green-800 underline"
        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      >
        {external ? t("addFriend") : t("rsvpPrompt.link")}
        {external ? (
          <span className="sr-only">{t("opensInNewTab")}</span>
        ) : null}
      </a>
    </p>
  );
}
