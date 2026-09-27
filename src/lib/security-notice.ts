import { getTranslatorFor } from "@/i18n/translator";
import { db } from "@/lib/db";
import { NOTIFY_USER_SELECT, notify } from "@/lib/notify";
import { publicUrl } from "@/lib/urls";

/**
 * Security notice when Google/LINE is linked to an existing account (§11:
 * account security changes always go by email too). Never throws.
 */
export async function notifySignInMethodAdded(
  userId: string,
  provider: "google" | "line",
): Promise<void> {
  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: NOTIFY_USER_SELECT,
    });
    if (!user) return;
    await notify(user, {
      kind: "SECURITY",
      alwaysEmail: true,
      render: async (locale) => {
        const t = await getTranslatorFor(locale, "settings");
        return {
          subject: t("notify.methodAdded.subject"),
          text: t("notify.methodAdded.text", {
            method: t(`methods.${provider}`),
          }),
          url: publicUrl(`/${locale}/app/settings`),
        };
      },
    });
  } catch (e) {
    console.error("[security-notice] failed", e);
  }
}
