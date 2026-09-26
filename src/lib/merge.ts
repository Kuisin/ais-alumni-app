import { db } from "@/lib/db";

/**
 * Merge `fromId` into `toId` (§4.3 LINE→existing email, §3.2 admin merge).
 * Moves sign-in methods, LINE link, roles the target lacks, social graph,
 * RSVPs and family links, then deletes `fromId` and records a UserMerge row so
 * live sessions for `fromId` resolve to `toId`.
 */
export async function mergeUsers(fromId: string, toId: string): Promise<void> {
  if (fromId === toId) throw new Error("Cannot merge a user into itself");
  await db.$transaction(async (tx) => {
    const [from, to] = await Promise.all([
      tx.user.findUniqueOrThrow({
        where: { id: fromId },
        include: { roles: true },
      }),
      tx.user.findUniqueOrThrow({
        where: { id: toId },
        include: { roles: true },
      }),
    ]);

    await tx.account.updateMany({
      where: { userId: fromId },
      data: { userId: toId },
    });

    // Roles: keep the target's record when both have the same role.
    const toRoles = new Set(to.roles.map((r) => r.role));
    for (const r of from.roles) {
      if (!toRoles.has(r.role)) {
        await tx.userRole.update({
          where: { id: r.id },
          data: { userId: toId },
        });
      }
    }

    // Follows / blocks: move rows that don't collide or become self-references.
    const follows = await tx.follow.findMany({
      where: { OR: [{ followerId: fromId }, { followeeId: fromId }] },
    });
    for (const f of follows) {
      const followerId = f.followerId === fromId ? toId : f.followerId;
      const followeeId = f.followeeId === fromId ? toId : f.followeeId;
      const clash =
        followerId === followeeId ||
        (await tx.follow.findUnique({
          where: { followerId_followeeId: { followerId, followeeId } },
        }));
      if (!clash)
        await tx.follow.update({
          where: { id: f.id },
          data: { followerId, followeeId },
        });
    }
    const blocks = await tx.block.findMany({
      where: { OR: [{ blockerId: fromId }, { blockedId: fromId }] },
    });
    for (const b of blocks) {
      const blockerId = b.blockerId === fromId ? toId : b.blockerId;
      const blockedId = b.blockedId === fromId ? toId : b.blockedId;
      const clash =
        blockerId === blockedId ||
        (await tx.block.findUnique({
          where: { blockerId_blockedId: { blockerId, blockedId } },
        }));
      if (!clash)
        await tx.block.update({
          where: { id: b.id },
          data: { blockerId, blockedId },
        });
    }

    const rsvps = await tx.rsvp.findMany({ where: { userId: fromId } });
    for (const r of rsvps) {
      const clash = await tx.rsvp.findUnique({
        where: { eventId_userId: { eventId: r.eventId, userId: toId } },
      });
      if (!clash)
        await tx.rsvp.update({ where: { id: r.id }, data: { userId: toId } });
    }

    await tx.familyLink.updateMany({
      where: { parentId: fromId },
      data: { parentId: toId },
    });
    await tx.familyLink.updateMany({
      where: { childId: fromId },
      data: { childId: toId },
    });
    await tx.vouch.updateMany({
      where: { voucherId: fromId },
      data: { voucherId: toId },
    });
    await tx.notificationLog.updateMany({
      where: { userId: fromId },
      data: { userId: toId },
    });
    // 学歴・職歴 move with the account.
    await tx.educationEntry.updateMany({
      where: { userId: fromId },
      data: { userId: toId },
    });
    await tx.workEntry.updateMany({
      where: { userId: fromId },
      data: { userId: toId },
    });

    // Profile fields: fill gaps on the target from the source.
    await tx.user.update({ where: { id: fromId }, data: { lineUserId: null } });
    await tx.user.update({
      where: { id: toId },
      data: {
        lineUserId: to.lineUserId ?? from.lineUserId,
        lineDisplayName: to.lineDisplayName ?? from.lineDisplayName,
        lineFollowing: to.lineUserId ? to.lineFollowing : from.lineFollowing,
        // Take the whole romaji / kanji name from one side so parts stay consistent.
        ...(to.nameRomaji
          ? {}
          : {
              lastNameRomaji: from.lastNameRomaji,
              firstNameRomaji: from.firstNameRomaji,
              middleNameRomaji: from.middleNameRomaji,
              nameRomaji: from.nameRomaji,
            }),
        ...(to.nameKanji
          ? {}
          : {
              lastNameKanji: from.lastNameKanji,
              firstNameKanji: from.firstNameKanji,
              nameKanji: from.nameKanji,
            }),
        nameAtAis: to.nameAtAis ?? from.nameAtAis,
        dateOfBirth: to.dateOfBirth ?? from.dateOfBirth,
        avatarUrl: to.avatarUrl ?? from.avatarUrl,
        phone: to.phone ?? from.phone,
        familyId: to.familyId ?? from.familyId,
      },
    });

    await tx.userMerge.updateMany({
      where: { toUserId: fromId },
      data: { toUserId: toId },
    });
    await tx.userMerge.create({ data: { fromUserId: fromId, toUserId: toId } });
    await tx.user.delete({ where: { id: fromId } });
  });
}
