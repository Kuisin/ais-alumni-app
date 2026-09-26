import { getLocale, getTranslations } from "next-intl/server";
import { toDataURL } from "qrcode";
import { buttonClass } from "@/components/ui/button";
import { Alert } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { db } from "@/lib/db";
import {
  type LinkOutcome,
  lineAddFriendUrl,
  lineLinkStartUrl,
} from "@/lib/line-link";

/**
 * LINE link panel (§5.2), used by onboarding, settings and elsewhere.
 *
 * - Not linked: a "Link LINE" button to the signed start URL; on ≥ md screens
 *   also a QR code of the same URL so a desktop user can finish on their phone.
 * - Linked but not following the Official Account: an "Add friend" link.
 * - Linked and following: a confirmation.
 *
 * `outcome` is the `?line=` query value set by /api/line/link/callback.
 */
export async function LineLinkPanel({
  userId,
  returnTo,
  outcome,
}: {
  userId: string;
  returnTo: string;
  outcome?: LinkOutcome | null;
}) {
  const t = await getTranslations("line");
  const locale = (await getLocale()) === "en" ? "en" : "ja";
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { lineUserId: true, lineFollowing: true, lineDisplayName: true },
  });
  if (!user) return null;

  const linked = Boolean(user.lineUserId);
  const addFriendUrl = lineAddFriendUrl();

  const outcomeAlert =
    outcome && outcome !== "linked" ? (
      <Alert tone="error">{t(`outcome.${outcome}`)}</Alert>
    ) : outcome === "linked" && linked ? (
      <Alert tone="success">{t("outcome.linked")}</Alert>
    ) : null;

  if (linked && user.lineFollowing) {
    return (
      <div className="space-y-3">
        {outcomeAlert}
        <p className="flex items-center gap-2 text-sm text-slate-700">
          <span
            aria-hidden="true"
            className="inline-block size-2.5 rounded-full bg-line"
          />
          {user.lineDisplayName
            ? t("panel.linkedFollowingAs", { name: user.lineDisplayName })
            : t("panel.linkedFollowing")}
        </p>
      </div>
    );
  }

  if (linked) {
    return (
      <div className="space-y-3">
        {outcomeAlert}
        <p className="text-sm text-slate-700">
          {user.lineDisplayName
            ? t("panel.linkedNotFollowingAs", { name: user.lineDisplayName })
            : t("panel.linkedNotFollowing")}
        </p>
        {addFriendUrl ? (
          <a
            href={addFriendUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClass("line", "w-full sm:w-auto")}
          >
            {t("addFriend")}
            <span className="sr-only">{t("opensInNewTab")}</span>
          </a>
        ) : null}
        <p className="text-sm">
          <Link href={returnTo} className="text-brand-700 underline">
            {t("panel.refresh")}
          </Link>
        </p>
      </div>
    );
  }

  const startUrl = lineLinkStartUrl(userId, returnTo, locale);
  const qr = await toDataURL(startUrl, {
    margin: 1,
    width: 320,
    errorCorrectionLevel: "M",
  });

  return (
    <div className="space-y-4">
      {outcomeAlert}
      <a href={startUrl} className={buttonClass("line", "w-full md:w-auto")}>
        {t("linkButton")}
      </a>
      <div className="hidden items-center gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 md:flex">
        {/* biome-ignore lint/performance/noImgElement: generated data URL */}
        <img
          src={qr}
          alt={t("panel.qrAlt")}
          width={160}
          height={160}
          className="size-40 shrink-0 rounded bg-white"
        />
        <div className="space-y-2 text-sm text-slate-700">
          <p className="font-semibold text-slate-900">{t("panel.qrTitle")}</p>
          <ol className="list-decimal space-y-1 pl-5">
            <li>{t("panel.qrStep1")}</li>
            <li>{t("panel.qrStep2")}</li>
            <li>{t("panel.qrStep3")}</li>
          </ol>
          <p>
            <Link href={returnTo} className="text-brand-700 underline">
              {t("panel.refresh")}
            </Link>
          </p>
        </div>
      </div>
      <p className="text-xs text-slate-500">{t("panel.expiryNote")}</p>
    </div>
  );
}
