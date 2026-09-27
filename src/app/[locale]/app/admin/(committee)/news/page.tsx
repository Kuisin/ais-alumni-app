import { ChevronRight, Newspaper, Plus } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { TargetBadges } from "@/components/events/target-badges";
import { FallbackTag } from "@/components/news/fallback-tag";
import { Pager, parsePage } from "@/components/news/pager";
import { NewsStatusBadges } from "@/components/news/status-badges";
import { buttonClass } from "@/components/ui/button";
import { Alert, EmptyState, PageHeader } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { db } from "@/lib/db";
import { asLocale } from "@/lib/events";
import { formatDateTime, localized } from "@/lib/format";
import { requireAdmin } from "@/lib/session";

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
  await requireAdmin();
  const t = await getTranslations("adminContent");

  // Drafts (publishedAt null) first, then newest publish date.
  const rows = await db.newsPost.findMany({
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
      pinned: true,
      targetRoles: true,
      targetAudiences: true,
    },
  });
  const posts = rows.slice(0, PAGE_SIZE);

  return (
    <>
      <PageHeader
        title={t("news.title")}
        description={t("news.description")}
        actions={
          <Link href="/app/admin/news/new" className={buttonClass("primary")}>
            <Plus aria-hidden="true" className="size-4" />
            {t("news.new")}
          </Link>
        }
      />
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
            <Link
              href="/app/admin/news/new"
              className={buttonClass("secondary")}
            >
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
            return (
              <li key={p.id}>
                <Link
                  href={`/app/admin/news/${p.id}`}
                  className="group flex items-center gap-3 p-4 transition-colors hover:bg-slate-50"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-1">
                      <NewsStatusBadges post={p} />
                      {p.publishedAt ? (
                        <span className="ml-1 text-sm text-slate-600">
                          {formatDateTime(p.publishedAt, locale)}
                        </span>
                      ) : null}
                    </div>
                    <p className="font-semibold group-hover:text-brand-800">
                      {title.text}
                      <FallbackTag fallback={title.fallback} />
                    </p>
                    <div className="flex flex-wrap gap-1">
                      <TargetBadges target={p} />
                    </div>
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
    </>
  );
}
