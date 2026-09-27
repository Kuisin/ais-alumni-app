import { Mail, Newspaper } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { MessageRow } from "@/components/news/message-row";
import { NewsCard } from "@/components/news/news-card";
import { Pager, parsePage } from "@/components/news/pager";
import { EmptyState, PageHeader } from "@/components/ui/card";
import { Tabs } from "@/components/ui/tabs";
import { listMessages, readNewsIds, unreadCounts } from "@/lib/announcements";
import { toViewer } from "@/lib/authz";
import { db } from "@/lib/db";
import { asLocale } from "@/lib/events";
import { NEWS_PAGE_SIZE, publishedWhere, targetRolesWhere } from "@/lib/news";
import { type CurrentUser, requireActive } from "@/lib/session";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/app/news">) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "news" });
  return { title: t("title") };
}

export default async function NewsPage({
  params,
  searchParams,
}: PageProps<"/[locale]/app/news">) {
  const locale = asLocale((await params).locale);
  const sp = await searchParams;
  const page = parsePage(sp.page);
  const tab = sp.tab === "messages" ? "messages" : "news";
  const user = await requireActive();
  const t = await getTranslations("news");
  const unread = await unreadCounts(user);

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />
      <Tabs
        label={t("tabs.label")}
        className="mb-6"
        items={[
          {
            href: "/app/news",
            label: t("tabs.news"),
            count: unread.news || undefined,
            active: tab === "news",
          },
          {
            href: { pathname: "/app/news", query: { tab: "messages" } },
            label: t("tabs.messages"),
            count: unread.messages || undefined,
            active: tab === "messages",
          },
        ]}
      />
      {tab === "messages" ? (
        <MessagesTab userId={user.id} page={page} locale={locale} />
      ) : (
        <NewsTab user={user} page={page} locale={locale} />
      )}
    </>
  );
}

async function NewsTab({
  user,
  page,
  locale,
}: {
  user: CurrentUser;
  page: number;
  locale: "ja" | "en";
}) {
  const t = await getTranslations("news");
  const rows = await db.newsPost.findMany({
    where: { AND: [targetRolesWhere(toViewer(user)), publishedWhere()] },
    orderBy: [{ pinned: "desc" }, { publishedAt: "desc" }],
    skip: (page - 1) * NEWS_PAGE_SIZE,
    take: NEWS_PAGE_SIZE + 1,
    select: {
      id: true,
      titleJa: true,
      titleEn: true,
      bodyJa: true,
      bodyEn: true,
      pinned: true,
      publishedAt: true,
    },
  });
  const hasNext = rows.length > NEWS_PAGE_SIZE;
  const posts = rows.slice(0, NEWS_PAGE_SIZE);
  const read = await readNewsIds(
    user.id,
    posts.map((p) => p.id),
  );
  // Same rule as the unread count: posts from before the member joined
  // are never "unread".
  const isUnread = (p: (typeof posts)[number]) =>
    !read.has(p.id) && !!p.publishedAt && p.publishedAt >= user.createdAt;

  return (
    <section aria-label={t("tabs.news")}>
      {posts.length === 0 ? (
        <EmptyState icon={<Newspaper />} hint={t("emptyHint")}>
          {t("empty")}
        </EmptyState>
      ) : (
        <ul className="space-y-3">
          {posts.map((p) => (
            <li key={p.id}>
              <NewsCard post={p} locale={locale} unread={isUnread(p)} />
            </li>
          ))}
        </ul>
      )}
      <Pager pathname="/app/news" page={page} hasNext={hasNext} />
    </section>
  );
}

async function MessagesTab({
  userId,
  page,
  locale,
}: {
  userId: string;
  page: number;
  locale: "ja" | "en";
}) {
  const t = await getTranslations("news");
  const { rows, pages } = await listMessages(userId, page);

  return (
    <section aria-label={t("tabs.messages")}>
      {rows.length === 0 ? (
        <EmptyState icon={<Mail />} hint={t("messages.emptyHint")}>
          {t("messages.empty")}
        </EmptyState>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.broadcast.id}>
              <MessageRow row={r} locale={locale} />
            </li>
          ))}
        </ul>
      )}
      <Pager
        pathname="/app/news"
        page={page}
        hasNext={page < pages}
        query={{ tab: "messages" }}
      />
    </section>
  );
}
