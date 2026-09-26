import { Prisma } from "@/generated/prisma/client";
import { FollowStatus, RoleKey } from "@/generated/prisma/enums";
import type { AppLocale } from "@/i18n/routing";
import { getTranslatorFor } from "@/i18n/translator";
import {
  canRequestFollow,
  type FollowDenial,
  loadRelationship,
  shouldAutoAccept,
  toTarget,
  toViewer,
} from "@/lib/authz";
import { db } from "@/lib/db";
import { PUBLIC_CARD_SELECT } from "@/lib/directory";
import { displayName } from "@/lib/format";
import { NOTIFY_USER_SELECT, notify } from "@/lib/notify";
import type { CurrentUser } from "@/lib/session";
import { appUrl } from "@/lib/urls";

/** Follow requests and blocks (§9.2). */

export const FOLLOW_RATE_LIMIT = 30;
export const FOLLOW_RATE_WINDOW_MS = 24 * 60 * 60 * 1000;

export function followRateWindowStart(now: Date): Date {
  return new Date(now.getTime() - FOLLOW_RATE_WINDOW_MS);
}

/** Max 30 follow requests per follower per rolling 24h (§9.2). */
export function isFollowRateLimited(requestsInWindow: number): boolean {
  return requestsInWindow >= FOLLOW_RATE_LIMIT;
}

export function formerStudentYear(
  roles: readonly { role: RoleKey; graduationOrLeaveYear: number | null }[],
): number | null {
  return (
    roles.find((r) => r.role === RoleKey.FORMER_STUDENT)
      ?.graduationOrLeaveYear ?? null
  );
}

export type FollowRequestResult =
  | { ok: true; status: FollowStatus }
  | { ok: false; reason: FollowDenial | "rateLimited" | "notFound" };

async function safeNotify(fn: () => Promise<unknown>): Promise<void> {
  try {
    await fn();
  } catch (e) {
    // A failed LINE/email send must not undo the follow change.
    console.error("[follows] notification failed", e);
  }
}

export async function requestFollow(
  viewer: CurrentUser,
  targetId: string,
  now: Date = new Date(),
): Promise<FollowRequestResult> {
  const target = await db.user.findUnique({
    where: { id: targetId },
    include: { roles: true },
  });
  if (!target) return { ok: false, reason: "notFound" };
  const rel = await loadRelationship(viewer.id, target.id);
  const check = canRequestFollow(toViewer(viewer), toTarget(target), rel, now);
  if (!check.ok) return check;

  const recent = await db.follow.count({
    where: {
      followerId: viewer.id,
      createdAt: { gte: followRateWindowStart(now) },
    },
  });
  if (isFollowRateLimited(recent)) return { ok: false, reason: "rateLimited" };

  const status = shouldAutoAccept(
    {
      autoAcceptSameYear: target.autoAcceptSameYear,
      graduationYear: formerStudentYear(target.roles),
    },
    { graduationYear: formerStudentYear(viewer.roles) },
  )
    ? FollowStatus.ACCEPTED
    : FollowStatus.REQUESTED;

  let followId: string;
  try {
    const f = await db.follow.create({
      data: { followerId: viewer.id, followeeId: target.id, status },
      select: { id: true },
    });
    followId = f.id;
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      return { ok: false, reason: "already" };
    }
    throw e;
  }

  await safeNotify(async () => {
    const to = await db.user.findUniqueOrThrow({
      where: { id: target.id },
      select: NOTIFY_USER_SELECT,
    });
    const auto = status === FollowStatus.ACCEPTED;
    await notify(to, {
      kind: auto ? "FOLLOW_AUTO_ACCEPTED" : "FOLLOW_REQUEST",
      refId: followId,
      render: async (locale) => {
        const t = await getTranslatorFor(locale as AppLocale, "follows");
        const name = displayName(viewer, locale);
        return {
          subject: t(auto ? "notify.autoSubject" : "notify.requestSubject", {
            name,
          }),
          text: t(auto ? "notify.autoText" : "notify.requestText", { name }),
          url: appUrl(
            `/${locale}/follows?tab=${auto ? "followers" : "incoming"}`,
          ),
        };
      },
    });
  });

  return { ok: true, status };
}

/** Accept an incoming request addressed to `me`. */
export async function acceptFollow(
  me: CurrentUser,
  followId: string,
): Promise<boolean> {
  const res = await db.follow.updateMany({
    where: { id: followId, followeeId: me.id, status: FollowStatus.REQUESTED },
    data: { status: FollowStatus.ACCEPTED },
  });
  if (res.count === 0) return false;
  await safeNotify(async () => {
    const follow = await db.follow.findUniqueOrThrow({
      where: { id: followId },
      select: { follower: { select: NOTIFY_USER_SELECT } },
    });
    await notify(follow.follower, {
      kind: "FOLLOW_ACCEPTED",
      refId: followId,
      render: async (locale) => {
        const t = await getTranslatorFor(locale as AppLocale, "follows");
        const name = displayName(me, locale);
        return {
          subject: t("notify.acceptedSubject", { name }),
          text: t("notify.acceptedText", { name }),
          url: appUrl(`/${locale}/members/${me.id}`),
        };
      },
    });
  });
  return true;
}

/** Decline (delete) an incoming request. */
export async function declineFollow(me: CurrentUser, followId: string) {
  await db.follow.deleteMany({
    where: { id: followId, followeeId: me.id, status: FollowStatus.REQUESTED },
  });
}

/** Remove an accepted follower of mine. */
export async function removeFollower(me: CurrentUser, followerId: string) {
  await db.follow.deleteMany({
    where: { followerId, followeeId: me.id },
  });
}

/** Unfollow, or cancel my pending request (same row either way). */
export async function unfollow(me: CurrentUser, targetId: string) {
  await db.follow.deleteMany({
    where: { followerId: me.id, followeeId: targetId },
  });
}

/** Block: create the Block and drop follows in both directions (§9.2). */
export async function blockUser(
  me: CurrentUser,
  targetId: string,
): Promise<boolean> {
  if (targetId === me.id) return false;
  const exists = await db.user.findUnique({
    where: { id: targetId },
    select: { id: true },
  });
  if (!exists) return false;
  await db.$transaction([
    db.block.upsert({
      where: { blockerId_blockedId: { blockerId: me.id, blockedId: targetId } },
      create: { blockerId: me.id, blockedId: targetId },
      update: {},
    }),
    db.follow.deleteMany({
      where: {
        OR: [
          { followerId: me.id, followeeId: targetId },
          { followerId: targetId, followeeId: me.id },
        ],
      },
    }),
  ]);
  return true;
}

export async function unblockUser(me: CurrentUser, targetId: string) {
  await db.block.deleteMany({
    where: { blockerId: me.id, blockedId: targetId },
  });
}

/** Everything the /follows page shows, public-tier columns only. */
export async function loadFollowLists(meId: string) {
  const [incoming, outgoing, followers, following, blocked] = await Promise.all(
    [
      db.follow.findMany({
        where: { followeeId: meId, status: FollowStatus.REQUESTED },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          createdAt: true,
          follower: { select: PUBLIC_CARD_SELECT },
        },
      }),
      db.follow.findMany({
        where: { followerId: meId, status: FollowStatus.REQUESTED },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          createdAt: true,
          followee: { select: PUBLIC_CARD_SELECT },
        },
      }),
      db.follow.findMany({
        where: { followeeId: meId, status: FollowStatus.ACCEPTED },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          createdAt: true,
          follower: { select: PUBLIC_CARD_SELECT },
        },
      }),
      db.follow.findMany({
        where: { followerId: meId, status: FollowStatus.ACCEPTED },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          createdAt: true,
          followee: { select: PUBLIC_CARD_SELECT },
        },
      }),
      db.block.findMany({
        where: { blockerId: meId },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          createdAt: true,
          blocked: { select: PUBLIC_CARD_SELECT },
        },
      }),
    ],
  );
  return { incoming, outgoing, followers, following, blocked };
}

export type FollowLists = Awaited<ReturnType<typeof loadFollowLists>>;
