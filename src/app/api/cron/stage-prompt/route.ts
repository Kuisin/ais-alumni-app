import type { LifeStage } from "@/generated/prisma/enums";
import { AccountState, RoleKey } from "@/generated/prisma/enums";
import { getTranslatorFor } from "@/i18n/translator";
import { jstYear } from "@/lib/account";
import { isAuthorizedCron } from "@/lib/cron";
import { db } from "@/lib/db";
import { NOTIFY_USER_SELECT, type NotifyUser, notifyMany } from "@/lib/notify";
import { publicUrl } from "@/lib/urls";

export const maxDuration = 300;

const BATCH = 500;

/**
 * Yearly "are your schools & work up to date?" prompt (§7), April 1 09:00 JST.
 * Every ACTIVE user with a FORMER_STUDENT role gets one notification per
 * year (kind STAGE_PROMPT, refId = year, deduped so reruns are safe).
 * Recipients are grouped by current stage because the text names the stage.
 */
export async function GET(request: Request) {
  if (!isAuthorizedCron(request))
    return new Response("Unauthorized", { status: 401 });

  const year = String(jstYear(new Date()));
  let cursor: string | undefined;
  let recipients = 0;
  let sent = 0;

  for (;;) {
    const users = await db.user.findMany({
      where: {
        state: AccountState.ACTIVE,
        roles: { some: { role: RoleKey.FORMER_STUDENT } },
      },
      select: {
        ...NOTIFY_USER_SELECT,
        roles: {
          where: { role: RoleKey.FORMER_STUDENT },
          select: { currentStage: true },
        },
      },
      orderBy: { id: "asc" },
      take: BATCH,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    if (users.length === 0) break;
    cursor = users[users.length - 1].id;
    recipients += users.length;

    const byStage = new Map<LifeStage | null, NotifyUser[]>();
    for (const { roles, ...u } of users) {
      const stage = roles[0]?.currentStage ?? null;
      const list = byStage.get(stage) ?? [];
      list.push(u);
      byStage.set(stage, list);
    }

    for (const [stage, group] of byStage) {
      try {
        const result = await notifyMany(group, {
          kind: "STAGE_PROMPT",
          refId: year,
          dedupe: true,
          render: async (locale) => {
            // 現在の状況 follows 学歴・職歴, so the prompt asks to keep that
            // up to date.
            const t = await getTranslatorFor(locale, "settings");
            const url = publicUrl(`/${locale}/app/profile/history`);
            if (!stage) {
              return {
                subject: t("notify.stagePrompt.subject"),
                text: t("notify.stagePrompt.historyNoStage"),
                url,
              };
            }
            const tr = await getTranslatorFor(locale, "roles");
            return {
              subject: t("notify.stagePrompt.subject"),
              text: t("notify.stagePrompt.history", {
                stage: tr(`stage.${stage}`),
              }),
              url,
            };
          },
        });
        sent += result.size;
      } catch (e) {
        // Keep going: other groups/batches should still be prompted; dedupe
        // makes a manual rerun safe.
        console.error(`[cron:stage-prompt] batch failed (stage=${stage})`, e);
      }
    }
    if (users.length < BATCH) break;
  }

  return Response.json({ ok: true, year, recipients, sent });
}
