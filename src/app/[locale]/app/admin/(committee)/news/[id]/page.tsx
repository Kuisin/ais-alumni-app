import { Archive, ArchiveRestore, Eye } from "lucide-react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import {
  deleteNewsAction,
  setNewsArchivedAction,
} from "@/app/actions/admin-content";
import { NewsReadsCard } from "@/components/admin/news-reads-card";
import { NewsResponsesCard } from "@/components/admin/news-responses-card";
import { NewsForm } from "@/components/news/news-form";
import { NotifyPanel } from "@/components/news/notify-panel";
import { NewsStatusBadges } from "@/components/news/status-badges";
import { buttonClass } from "@/components/ui/button";
import { Alert, Badge, PageHeader } from "@/components/ui/card";
import { cn } from "@/components/ui/cn";
import { SubmitButton } from "@/components/ui/submit-button";
import { Link } from "@/i18n/navigation";
import { loadCohortOptions } from "@/lib/cohorts-db";
import { db } from "@/lib/db";
import { asLocale } from "@/lib/events";
import { localized, toJstLocalInput } from "@/lib/format";
import { newsStatus } from "@/lib/news";
import { specFromPost } from "@/lib/news-audience";
import { hubFormValues } from "@/lib/news-hub-db";
import { requireAdmin } from "@/lib/session";
import { isBlobConfigured, signedFileUrl } from "@/lib/storage";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/app/admin/news/[id]">) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "adminContent" });
  return { title: t("news.edit") };
}

export default async function AdminNewsEditPage({
  params,
  searchParams,
}: PageProps<"/[locale]/app/admin/news/[id]">) {
  const { id, locale: rawLocale } = await params;
  const locale = asLocale(rawLocale);
  const sp = await searchParams;
  await requireAdmin();
  if (id.length > 64) notFound();
  const post = await db.newsPost.findUnique({ where: { id } });
  if (!post) notFound();
  const t = await getTranslations("adminContent");
  const status = newsStatus(post);
  const audience = specFromPost(post);
  const [cohorts, members, hub] = await Promise.all([
    loadCohortOptions(locale),
    audience.userIds.length
      ? db.user.findMany({
          where: { id: { in: audience.userIds } },
          select: { id: true, nameRomaji: true, nameKanji: true },
        })
      : [],
    hubFormValues(post),
  ]);

  return (
    <>
      <Link
        href="/app/admin/news"
        className="inline-flex min-h-11 items-center text-sm text-brand-700 underline"
      >
        {t("news.backToList")}
      </Link>
      <div className="mt-1">
        <PageHeader
          title={localized(post.titleJa, post.titleEn, locale).text}
          description={
            <span className="flex flex-wrap gap-1">
              <NewsStatusBadges post={post} />
              {post.archivedAt ? (
                <Badge tone="amber">{t("news.archivedBadge")}</Badge>
              ) : null}
            </span>
          }
          actions={
            <>
              {status === "published" && !post.archivedAt ? (
                <Link
                  href={`/app/news/${post.id}`}
                  className={buttonClass("secondary")}
                >
                  <Eye aria-hidden="true" className="size-4" />
                  {t("news.viewAsMember")}
                </Link>
              ) : null}
              <form action={setNewsArchivedAction}>
                <input type="hidden" name="id" value={post.id} />
                <input
                  type="hidden"
                  name="archive"
                  value={post.archivedAt ? "0" : "1"}
                />
                <SubmitButton variant="secondary">
                  {post.archivedAt ? (
                    <ArchiveRestore aria-hidden="true" className="size-4" />
                  ) : (
                    <Archive aria-hidden="true" className="size-4" />
                  )}
                  {post.archivedAt ? t("news.restore") : t("news.archive")}
                </SubmitButton>
              </form>
            </>
          }
        />
      </div>

      {sp.created === "1" || sp.notified === "1" ? (
        <div className="mb-6 space-y-3">
          {sp.created === "1" ? (
            <Alert tone="success">{t("news.created")}</Alert>
          ) : null}
          {sp.notified === "1" ? (
            <Alert tone="success">{t("notify.sent")}</Alert>
          ) : null}
        </div>
      ) : null}

      {/* Notify panel first in DOM so phones see it (and its confirm step)
          before the long form; on xl it is a right column, sticky unless
          the (possibly long) read list sits under it. */}
      <div className="space-y-8 xl:grid xl:grid-cols-[minmax(0,1fr)_20rem] xl:items-start xl:gap-6 xl:space-y-0">
        <aside
          className={cn(
            "space-y-6 xl:col-start-2 xl:row-start-1",
            status !== "published" && "xl:sticky xl:top-20",
          )}
        >
          {post.archivedAt ? (
            <Alert tone="warning">{t("news.archivedHint")}</Alert>
          ) : (
            <NotifyPanel
              post={post}
              status={status}
              confirm={sp.notify === "1"}
              locale={locale}
            />
          )}
          {status === "published" ? (
            <NewsResponsesCard post={post} locale={locale} />
          ) : null}
          {status === "published" ? (
            <NewsReadsCard post={post} locale={locale} />
          ) : null}
        </aside>

        <section
          aria-labelledby="edit"
          className="min-w-0 xl:col-start-1 xl:row-start-1"
        >
          <h2 id="edit" className="mb-3 text-lg font-semibold">
            {t("news.edit")}
          </h2>
          <NewsForm
            values={{
              id: post.id,
              titleJa: post.titleJa ?? "",
              titleEn: post.titleEn ?? "",
              bodyJa: post.bodyJa ?? "",
              bodyEn: post.bodyEn ?? "",
              status,
              sendAt:
                status === "scheduled" && post.publishedAt
                  ? toJstLocalInput(post.publishedAt)
                  : "",
              notifyOnPublish: post.notifyOnPublish,
              pinned: post.pinned,
              audience,
              audienceMembers: members.map((m) => ({
                id: m.id,
                name: m.nameRomaji ?? m.nameKanji ?? "—",
                kanji: m.nameRomaji ? m.nameKanji : null,
              })),
              coverPreviewUrl: post.coverUrl
                ? signedFileUrl(post.coverUrl)
                : null,
              hub,
            }}
            useBlob={isBlobConfigured()}
            cohorts={cohorts}
            deleteAction={{
              action: deleteNewsAction,
              message: t("news.deleteConfirm"),
            }}
          />
        </section>
      </div>
    </>
  );
}
