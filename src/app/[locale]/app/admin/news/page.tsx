import { ChevronRight, Newspaper, Plus } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { ReadMeter, readPercent } from "@/components/admin/read-receipts";
import { AudienceSummary } from "@/components/news/audience-summary";
import { FallbackTag } from "@/components/news/fallback-tag";
import { Pager, parsePage } from "@/components/news/pager";
import { NewsStatusBadges } from "@/components/news/status-badges";
import { buttonClass } from "@/components/ui/button";
import { Alert, Badge, EmptyState, PageHeader } from "@/components/ui/card";
import { Tabs } from "@/components/ui/tabs";
import { Link } from "@/i18n/navigation";
import { newsReadStats } from "@/lib/announcements";
import { db } from "@/lib/db";
import { asLocale } from "@/lib/events";
import { formatDateTime, localized } from "@/lib/format";
import { newsStatus } from "@/lib/news";
import { specFromPost } from "@/lib/news-audience";
import { requireNewsAuthor } from "@/lib/session";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/app/admin/news">) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "adminContent" });
  return { title: t("news.title") };
}

const PAGE_SIZE = 30;

export default async function AdminNewsPage({
  params,
  searchParams,
}: PageProps<"/[locale]/app/admin/news">) {
  const locale = asLocale((await params).locale);
  const sp = await searchParams;
  const page = parsePage(sp.page);
  const { user } = await requireNewsAuthor();
  const t = await getTranslations("adminContent");

  // Admins see every post; teachers and 学年代表 only their own.
  const mine = user.isAdmin ? {} : { createdById: user.id };
  const archived = sp.archived === "1";
  const archivedCount = await db.newsPost.count({
    where: { ...mine, archivedAt: { not: null } },
  });
  // Drafts (publishedAt null) first, then newest publish date.
  const rows = await db.newsPost.findMany({
    where: { ...mine, archivedAt: archived ? { not: null } : null },
    orderBy: [
      { publishedAt: { sort: "desc", nulls: "first" } },
      { createdAt: "desc" },
    ],
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE + 1,
    select: {
      id: true,
      titleJa: true,
      titleEn: true,
      publishedAt: true,
      notifiedAt: true,
      notifyOnPublish: true,
      pinned: true,
      targetRoles: true,
      targetAudiences: true,
      audience: true,
    },
  });
  const posts = rows.slice(0, PAGE_SIZE);
  // Read counts only for live posts; drafts and scheduled ones show none.
  const stats = await newsReadStats(
    posts.filter((p) => newsStatus(p) === "published"),
  );

  return (
    <>
      <PageHeader
        title={t("news.title")}
        description={
          user.isAdmin ? t("news.description") : t("news.descriptionOwn")
        }
        actions={
          <Link href="/app/news/new" className={buttonClass("primary")}>
            <Plus aria-hidden="true" className="size-4" />
            {t("news.new")}
          </Link>
        }
      />
      <Tabs
        label={t("news.archiveTabs")}
        className="mb-4"
        items={[
          {
            href: "/app/admin/news",
            label: t("news.tabActive"),
            active: !archived,
          },
          {
            href: "/app/admin/news?archived=1",
            label: t("news.tabArchived"),
            count: archivedCount,
            active: archived,
          },
        ]}
      />
      <div data-results>
        {sp.deleted === "1" ? (
          <div className="mb-4">
            <Alert tone="success">{t("news.deleted")}</Alert>
          </div>
        ) : null}
        {posts.length === 0 ? (
          <EmptyState
            icon={<Newspaper />}
            hint={t("news.emptyHint")}
            action={
              <Link href="/app/news/new" className={buttonClass("secondary")}>
                <Plus aria-hidden="true" className="size-4" />
                {t("news.new")}
              </Link>
            }
          >
            {t("news.empty")}
          </EmptyState>
        ) : (
          <ul className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white">
            {posts.map((p) => {
              const title = localized(p.titleJa, p.titleEn, locale);
              const reads = stats.get(p.id);
              return (
                <li key={p.id}>
                  <Link
                    href={`/app/admin/news/${p.id}`}
                    className="group flex items-center gap-3 p-4 transition-colors hover:bg-slate-50"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-1">
                        <NewsStatusBadges post={p} />
                        {!p.notifyOnPublish && !p.notifiedAt ? (
                          <Badge>{t("news.noNotify")}</Badge>
                        ) : null}
                        {p.publishedAt ? (
                          <span className="ml-1 text-sm text-slate-600">
                            {newsStatus(p) === "scheduled"
                              ? t("news.scheduledFor", {
                                  date: formatDateTime(p.publishedAt, locale),
                                })
                              : formatDateTime(p.publishedAt, locale)}
                          </span>
                        ) : null}
                      </div>
                      <p className="font-semibold group-hover:text-brand-800">
                        {title.text}
                        <FallbackTag fallback={title.fallback} />
                      </p>
                      <div className="flex flex-wrap gap-1">
                        <AudienceSummary spec={specFromPost(p)} />
                      </div>
                      {reads ? (
                        <ReadMeter
                          className="max-w-60 pt-1"
                          read={reads.read}
                          total={reads.audience}
                          label={t("news.readOf", reads)}
                          percentLabel={t("reads.percent", {
                            percent: readPercent(reads.read, reads.audience),
                          })}
                        />
                      ) : null}
                    </div>
                    <ChevronRight
                      aria-hidden="true"
                      className="size-5 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-700"
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
        <Pager
          pathname="/app/admin/news"
          page={page}
          hasNext={rows.length > PAGE_SIZE}
        />
      </div>
    </>
  );
}
