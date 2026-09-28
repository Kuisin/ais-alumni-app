import type { Prisma } from "@/generated/prisma/client";
import { sendChatDigest, syncAllChatMemberships } from "@/lib/chat-db";
import { db } from "@/lib/db";
import { cleanupEvidence } from "@/lib/jobs/cleanup-evidence";
import { sendEventReminders } from "@/lib/jobs/event-reminders";
import { publishDueNews } from "@/lib/jobs/publish-news";
import {
  daily,
  EVERY_MINUTE,
  lastSlot,
  type Schedule,
  yearly,
} from "@/lib/jobs/schedule";
import { sendStagePrompt } from "@/lib/jobs/stage-prompt";
import { syncLineMenus } from "@/lib/line-menu-sync";
import { syncAllStatuses } from "@/lib/status-sync";

/**
 * Every recurring task. One Supabase pg_cron job calls GET /api/cron every
 * minute (scripts/setup-supabase-cron.ts); each call runs the every-minute
 * tasks and any daily / yearly task whose JST slot has passed since it last
 * ran (CronRun). GET /api/cron?task=<name> runs one task now (tests, manual
 * reruns — every task is safe to rerun).
 */
type Job = { schedule: Schedule; run: (now: Date) => Promise<unknown> };

export const JOBS = {
  // Reserved ニュース and response-deadline reminders.
  "publish-news": { schedule: EVERY_MINUTE, run: publishDueNews },
  // LINE rich menu unread dots (only calls LINE when a member's changes).
  "line-menus": { schedule: EVERY_MINUTE, run: () => syncLineMenus() },
  // 7-day / 1-day event reminders (§10.3).
  "event-reminders": { schedule: daily("09:00"), run: sendEventReminders },
  // Unread group-chat digest (count and link only).
  "chat-digest": { schedule: daily("20:00"), run: sendChatDigest },
  // Current/former, grades and graduation as the school year and leave
  // years pass (the school year rolls over on April 1), then group chats.
  "sync-status": {
    schedule: daily("00:05"),
    run: async (now) => ({
      ...(await syncAllStatuses(now)),
      chatMembershipsChanged: await syncAllChatMemberships(),
    }),
  },
  // Delete verification evidence 30 days after the decision (§6.3).
  "cleanup-evidence": { schedule: daily("03:00"), run: cleanupEvidence },
  // Yearly "is your status still …?" prompt (§7).
  "stage-prompt": { schedule: yearly("04-01 09:00"), run: sendStagePrompt },
} satisfies Record<string, Job>;

export type JobName = keyof typeof JOBS;

export function isJobName(name: string): name is JobName {
  return Object.hasOwn(JOBS, name);
}

export type JobOutcome = { result: unknown } | { error: string };

/** Run one task now; a failure is logged and returned, never thrown. */
export async function runJob(
  name: JobName,
  now: Date = new Date(),
): Promise<JobOutcome> {
  try {
    return { result: await (JOBS[name] as Job).run(now) };
  } catch (e) {
    console.error(`[jobs] ${name} failed`, e);
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * Claim a scheduled task's slot: true once per slot, even when calls
 * overlap. A task seen for the first time starts from now, so a slot that
 * passed before it was scheduled here (e.g. this year's April 1) isn't run.
 */
async function claim(name: JobName, slot: Date, now: Date): Promise<boolean> {
  const { count } = await db.cronRun.updateMany({
    where: { task: name, lastRunAt: { lt: slot } },
    data: { lastRunAt: now },
  });
  if (count > 0) return true;
  await db.cronRun.createMany({
    data: [{ task: name, lastRunAt: now }],
    skipDuplicates: true,
  });
  return false;
}

/** The every-minute call: run what is due, in order. */
export async function runDueJobs(
  now: Date = new Date(),
): Promise<Partial<Record<JobName, JobOutcome>>> {
  const out: Partial<Record<JobName, JobOutcome>> = {};
  for (const name of Object.keys(JOBS) as JobName[]) {
    const slot = lastSlot(JOBS[name].schedule, now);
    if (slot && !(await claim(name, slot, now))) continue;
    const outcome = await runJob(name, now);
    out[name] = outcome;
    if (slot)
      await db.cronRun.update({
        where: { task: name },
        data:
          "error" in outcome
            ? { lastError: outcome.error }
            : {
                lastResult: (outcome.result ?? {}) as Prisma.InputJsonValue,
                lastError: null,
              },
      });
  }
  return out;
}
