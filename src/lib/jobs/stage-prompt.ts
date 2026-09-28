import type { LifeStage } from "@/generated/prisma/enums";
import { AccountState, RoleKey } from "@/generated/prisma/enums";
import { getTranslatorFor } from "@/i18n/translator";
import { jstYear } from "@/lib/account";
import { db } from "@/lib/db";
import { NOTIFY_USER_SELECT, type NotifyUser, notifyMany } from "@/lib/notify";

const BATCH = 500;

/**
 * Yearly "are your schools & work up to date?" prompt (§7). Every ACTIVE
 * user with a FORMER_STUDENT role gets one notification per year (kind
 * STAGE_PROMPT, refId = year, deduped so reruns are safe). Recipients are
 * grouped by current stage because the text names the stage.
 */
export async function sendStagePrompt(now: Date) {
  const year = String(jstYear(now));
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
          path: "/app/profile/history",
          params: async (locale) => {
            if (!stage) return { stage: "—" };
            const tr = await getTranslatorFor(locale, "roles");
            return { stage: tr(`stage.${stage}`) };
          },
        });
        sent += result.size;
      } catch (e) {
        // Keep going: other groups/batches should still be prompted; dedupe
        // makes a manual rerun safe.
        console.error(`[jobs/stage-prompt] batch failed (stage=${stage})`, e);
      }
    }
    if (users.length < BATCH) break;
  }
  return { year, recipients, sent };
}
