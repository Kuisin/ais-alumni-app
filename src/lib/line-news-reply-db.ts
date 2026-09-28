import { AccountState } from "@/generated/prisma/enums";
import { getTranslatorFor } from "@/i18n/translator";
import { db } from "@/lib/db";
import { localized } from "@/lib/format";
import type { LineTextMessage } from "@/lib/line";
import {
  LIST_LIMIT,
  type NewsReplyKind,
  newsReplyText,
  type ReplyPost,
} from "@/lib/line-news-reply";
import { visibleNews } from "@/lib/news-visibility";
import { publicUrl } from "@/lib/urls";

/**
 * The reply to 未読のお知らせ / ニュース一覧 for the member linked to this
 * LINE account: the same posts and unread state as the app's news page.
 */
export async function newsReplyFor(
  lineUserId: string,
  kind: NewsReplyKind,
): Promise<LineTextMessage> {
  const user = await db.user.findFirst({
    where: { lineUserId },
    include: { roles: true },
  });
  if (!user) {
    // Unknown LINE account: both languages, and where to link it.
    const [ja, en] = await Promise.all([
      getTranslatorFor("ja", "line"),
      getTranslatorFor("en", "line"),
    ]);
    return {
      type: "text",
      text: `${ja("reply.notLinked")}\n${en("reply.notLinked")}\n\n${publicUrl("/ja/app/settings#line")}`,
    };
  }
  const locale = user.locale === "en" ? "en" : "ja";
  const t = await getTranslatorFor(locale, "line");
  if (user.state !== AccountState.ACTIVE) {
    return {
      type: "text",
      text: `${t("reply.notActive")}\n\n${publicUrl(`/${locale}/app`)}`,
    };
  }

  // Posts shown only because the member is an admin never count as theirs.
  const visible = (await visibleNews(user)).filter(
    (p): p is typeof p & { publishedAt: Date } =>
      !p.adminView && p.publishedAt !== null,
  );
  visible.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
  const ids = visible.map((p) => p.id);
  const read = new Set(
    (
      await db.newsRead.findMany({
        where: { userId: user.id, postId: { in: ids } },
        select: { postId: true },
      })
    ).map((r) => r.postId),
  );
  // Unread like the app's badge: posted since they joined, not opened.
  const unread = (p: (typeof visible)[number]) =>
    !read.has(p.id) && p.publishedAt >= user.createdAt;
  const wanted =
    kind === "unread"
      ? visible.filter(unread)
      : visible.slice(0, LIST_LIMIT + 1);
  const titles = new Map(
    (
      await db.newsPost.findMany({
        where: { id: { in: wanted.map((p) => p.id) } },
        select: { id: true, titleJa: true, titleEn: true },
      })
    ).map((p) => [
      p.id,
      localized(p.titleJa, p.titleEn, locale).text || t("reply.untitled"),
    ]),
  );
  const posts: ReplyPost[] = (kind === "unread" ? wanted : visible).map(
    (p) => ({
      id: p.id,
      title: titles.get(p.id) ?? "",
      publishedAt: p.publishedAt,
      unread: unread(p),
    }),
  );
  return newsReplyText(kind, posts, {
    t: (k, v) => t(`reply.${k}`, v),
    locale,
    url: publicUrl,
  });
}
