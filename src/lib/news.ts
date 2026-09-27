import type { Prisma } from "@/generated/prisma/client";
import { AccountState } from "@/generated/prisma/enums";
import { getTranslatorFor } from "@/i18n/translator";
import {
  audienceWhere,
  effectiveAudiences,
  membersInAudiences,
  type Targeted,
} from "@/lib/audience";
import { db } from "@/lib/db";
import { NOTIFY_USER_SELECT, type NotifyUser, notifyMany } from "@/lib/notify";
import { appUrl } from "@/lib/urls";

export const NEWS_PAGE_SIZE = 10;
export const EVENTS_PAGE_SIZE = 20;

/** Cover images (§10.4). */
// 4 MB: covers go through a server action and Vercel caps request bodies at 4.5 MB.
export const COVER_MAX_BYTES = 4 * 1024 * 1024;
export const COVER_TYPES = { "image/jpeg": "jpg", "image/png": "png" } as const;

/** DB filter for events and news a viewer may see (src/lib/audience.ts). */
export const targetRolesWhere = audienceWhere;

/** Published = publishedAt set, not in the future, and not archived. */
export function publishedWhere(
  now: Date = new Date(),
): Prisma.NewsPostWhereInput {
  return { publishedAt: { lte: now }, archivedAt: null };
}

export type NewsStatus = "draft" | "scheduled" | "published";

export function newsStatus(
  post: { publishedAt: Date | null },
  now: Date = new Date(),
): NewsStatus {
  if (!post.publishedAt) return "draft";
  return post.publishedAt > now ? "scheduled" : "published";
}

/**
 * ACTIVE members a post/event with these target roles is aimed at.
 * Assumption: admins are notified only when one of their own roles matches
 * (they can *see* everything, but are not spammed with every announcement).
 */
export async function targetedRecipients(
  target: Targeted,
): Promise<NotifyUser[]> {
  return db.user.findMany({
    where: {
      state: AccountState.ACTIVE,
      ...membersInAudiences(effectiveAudiences(target)),
    },
    select: NOTIFY_USER_SELECT,
  });
}

/**
 * Send the "new post" notification (kind NEWS, refId post id) once. The post
 * is claimed atomically by setting notifiedAt, so the admin button and the
 * reminders cron can never both send it. Returns null if it was not
 * published, or already notified/claimed.
 */
export async function sendNewsNotification(
  postId: string,
  now: Date = new Date(),
): Promise<{ recipients: number } | null> {
  const claimed = await db.newsPost.updateMany({
    where: {
      id: postId,
      notifiedAt: null,
      archivedAt: null,
      publishedAt: { lte: now },
    },
    data: { notifiedAt: now },
  });
  if (claimed.count === 0) return null;

  const post = await db.newsPost.findUniqueOrThrow({ where: { id: postId } });
  const users = await targetedRecipients(post);
  try {
    await notifyMany(users, {
      kind: "NEWS",
      refId: post.id,
      dedupe: true,
      // No content in the notification; the post is read in the app.
      render: async (locale) => {
        const t = await getTranslatorFor(locale, "news");
        return {
          subject: t("notify.contentlessSubject"),
          text: t("notify.contentlessText"),
          url: appUrl(`/${locale}/app/news/${post.id}`),
        };
      },
    });
  } catch (e) {
    // Release the claim so it can be retried; per-user dedupe prevents
    // re-sending to recipients that were already logged.
    await db.newsPost.update({
      where: { id: post.id },
      data: { notifiedAt: null },
    });
    throw e;
  }
  return { recipients: users.length };
}

/**
 * Scheduled posts that have now been published but not announced (§10.4).
 * "Scheduled" = publishedAt was in the future when the post was last saved,
 * i.e. publishedAt > updatedAt (a Prisma field reference). Posts published
 * immediately are announced only through the admin "Publish & notify" step.
 * Posts older than 7 days are ignored so a misconfigured cron can't blast
 * stale news.
 */
export async function dueScheduledNews(
  now: Date = new Date(),
): Promise<{ id: string }[]> {
  return db.newsPost.findMany({
    where: {
      notifiedAt: null,
      archivedAt: null,
      publishedAt: {
        lte: now,
        gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        gt: db.newsPost.fields.updatedAt,
      },
    },
    select: { id: true },
  });
}
