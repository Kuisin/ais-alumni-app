import { db } from "@/lib/db";
import { adminOnlyView, specFromPost } from "@/lib/news-audience";
import { newsViewer } from "@/lib/news-visibility";

export type AdminNewsCleanup = {
  admins: number;
  posts: number;
  reads: number;
  confirms: number;
  votes: number;
};

/**
 * Remove what admins left on ニュース posts they aren't in the audience of
 * (before those became view-only, #100): read receipts, confirmations and
 * poll / 日程調整 answers. Uses the posts' current audience. Dry run unless
 * `apply`.
 */
export async function cleanupAdminNewsRecords(
  apply: boolean,
): Promise<AdminNewsCleanup> {
  const [admins, posts] = await Promise.all([
    db.user.findMany({ where: { isAdmin: true }, include: { roles: true } }),
    db.newsPost.findMany({
      select: {
        id: true,
        audience: true,
        targetAudiences: true,
        targetRoles: true,
      },
    }),
  ]);
  const out: AdminNewsCleanup = {
    admins: 0,
    posts: 0,
    reads: 0,
    confirms: 0,
    votes: 0,
  };
  for (const admin of admins) {
    const viewer = await newsViewer(admin);
    const postIds = posts
      .filter((p) => adminOnlyView(specFromPost(p), viewer))
      .map((p) => p.id);
    if (!postIds.length) continue;
    const reads = { userId: admin.id, postId: { in: postIds } };
    const votes = { userId: admin.id, poll: { postId: { in: postIds } } };
    const [r, c, v] = apply
      ? await db.$transaction([
          db.newsRead.deleteMany({ where: reads }),
          db.newsConfirm.deleteMany({ where: reads }),
          db.newsPollVote.deleteMany({ where: votes }),
        ])
      : await Promise.all([
          db.newsRead.count({ where: reads }),
          db.newsConfirm.count({ where: reads }),
          db.newsPollVote.count({ where: votes }),
        ]).then(([a, b, c]) => [{ count: a }, { count: b }, { count: c }]);
    if (r.count + c.count + v.count === 0) continue;
    out.admins++;
    out.posts += postIds.length;
    out.reads += r.count;
    out.confirms += c.count;
    out.votes += v.count;
  }
  return out;
}
