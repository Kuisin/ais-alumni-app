import { Newspaper } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { NewsCard } from "@/components/news/news-card";
import { Pager, parsePage } from "@/components/news/pager";
import { EmptyState, PageHeader } from "@/components/ui/card";
import { toViewer } from "@/lib/authz";
import { db } from "@/lib/db";
import { asLocale } from "@/lib/events";
import { NEWS_PAGE_SIZE, publishedWhere, targetRolesWhere } from "@/lib/news";
import { requireActive } from "@/lib/session";

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
  const page = parsePage((await searchParams).page);
  const user = await requireActive();
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

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />
      {posts.length === 0 ? (
        <EmptyState icon={<Newspaper />}>{t("empty")}</EmptyState>
      ) : (
        <ul className="space-y-3">
          {posts.map((p) => (
            <li key={p.id}>
              <NewsCard post={p} locale={locale} />
            </li>
          ))}
        </ul>
      )}
      <Pager pathname="/app/news" page={page} hasNext={hasNext} />
    </>
  );
}
