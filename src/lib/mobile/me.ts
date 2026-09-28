import { AccountState, FollowStatus } from "@/generated/prisma/enums";
import { unreadCounts } from "@/lib/announcements";
import { defaultAvatar, storedAvatarUrl } from "@/lib/avatar";
import { getStaffAccess } from "@/lib/broadcasts";
import { chatUnreadTotal } from "@/lib/chat-db";
import { db } from "@/lib/db";
import { MESSAGES_ENABLED } from "@/lib/features";
import { displayName, otherNames } from "@/lib/format";
import type { Me, StaffAccess } from "@/lib/mobile/contract/core";
import { channelTopic, realtimePublic } from "@/lib/realtime";
import type { CurrentUser } from "@/lib/session";
import { homePathFor } from "@/lib/state-machine";

const NO_ACCESS: StaffAccess = {
  admin: false,
  broadcast: false,
  teachers: false,
  news: false,
};

/**
 * Who is signed in, what they may open, and the tab-bar badges — the same
 * counts and realtime channels as the website's app shell
 * (src/components/layout/app-shell.tsx).
 */
export async function meFor(user: CurrentUser): Promise<Me> {
  const active = user.state === AccountState.ACTIVE;
  const [access, unread, chat, follows, groups] = active
    ? await Promise.all([
        getStaffAccess(user),
        unreadCounts(user),
        chatUnreadTotal(user.id),
        db.follow.count({
          where: { followeeId: user.id, status: FollowStatus.REQUESTED },
        }),
        db.chatMember.findMany({
          where: { userId: user.id },
          select: { groupId: true },
        }),
      ])
    : [NO_ACCESS, { news: 0, messages: 0 }, 0, 0, []];
  const pub = active ? realtimePublic() : null;
  return {
    user: {
      id: user.id,
      state: user.state,
      locale: user.locale === "en" ? "en" : "ja",
      isAdmin: user.isAdmin,
      name: displayName(user),
      otherName: otherNames(user),
      email: user.primaryEmail,
      // Their own photo: always visible to themselves.
      avatar: storedAvatarUrl(user.avatarUrl) ?? defaultAvatar(user.gender),
      lineLinked: Boolean(user.lineUserId),
    },
    onboardingPath: active ? null : homePathFor(user),
    access,
    badges: { ...unread, chat, follows },
    realtime: pub
      ? {
          ...pub,
          topics: [
            channelTopic("user", user.id),
            ...groups.map((g) => channelTopic("chat", g.groupId)),
          ],
        }
      : null,
    features: { messages: MESSAGES_ENABLED },
  };
}
