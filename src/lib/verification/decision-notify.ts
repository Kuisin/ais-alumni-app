import type { Locale } from "@/generated/prisma/enums";
import { getTranslatorFor } from "@/i18n/translator";
import { db } from "@/lib/db";
import { NOTIFY_USER_SELECT, type NotifyUser, notify } from "@/lib/notify";
import type { ParentOutcome } from "@/lib/parent-onboarding";
import { publicUrl } from "@/lib/urls";

export type Decision = "APPROVE" | "REJECT" | "NEEDS_INFO";

/** Tell an applicant the outcome of their application (always by email too). */
export async function notifyDecision(
  to: NotifyUser,
  requestId: string,
  decision: Decision,
  note: string | null,
): Promise<void> {
  try {
    await notify(to, {
      kind: "VERIFICATION",
      refId: requestId,
      alwaysEmail: true,
      render: async (locale: Locale) => {
        const t = await getTranslatorFor(locale, "adminVerify");
        const k =
          decision === "APPROVE"
            ? "approved"
            : decision === "REJECT"
              ? "rejected"
              : "needsInfo";
        const path =
          decision === "APPROVE"
            ? "/app/dashboard"
            : decision === "REJECT"
              ? "/app/onboarding/status"
              : "/app/onboarding/verify";
        return {
          subject: t(`notify.${k}.subject`),
          text: note
            ? t(`notify.${k}.bodyWithNote`, { note })
            : t(`notify.${k}.body`),
          url: publicUrl(`/${locale}${path}`),
        };
      },
    });
  } catch (e) {
    console.error("[verification] notify failed", e);
  }
}

/** Parents whose application followed a child's decision. */
export async function notifyParentOutcomes(
  outcomes: readonly ParentOutcome[],
): Promise<void> {
  for (const o of outcomes) {
    const parent = await db.user.findUnique({
      where: { id: o.parentId },
      select: NOTIFY_USER_SELECT,
    });
    if (parent) await notifyDecision(parent, o.requestId, o.decision, o.note);
  }
}
