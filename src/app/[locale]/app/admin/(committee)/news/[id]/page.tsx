import { Eye } from "lucide-react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { deleteNewsAction } from "@/app/actions/admin-content";
import { NewsForm } from "@/components/news/news-form";
import { NotifyPanel } from "@/components/news/notify-panel";
import { NewsStatusBadges } from "@/components/news/status-badges";
import { buttonClass } from "@/components/ui/button";
import { Alert, PageHeader } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { db } from "@/lib/db";
import { asLocale } from "@/lib/events";
import { localized, toJstLocalInput } from "@/lib/format";
import { newsStatus } from "@/lib/news";
import { requireAdmin } from "@/lib/session";
import { signedFileUrl } from "@/lib/storage";

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
            </span>
          }
          actions={
            status === "published" ? (
              <Link
                href={`/app/news/${post.id}`}
                className={buttonClass("secondary")}
              >
                <Eye aria-hidden="true" className="size-4" />
                {t("news.viewAsMember")}
              </Link>
            ) : null
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
          before the long form; on xl it is a sticky right column. */}
      <div className="space-y-8 xl:grid xl:grid-cols-[minmax(0,1fr)_20rem] xl:items-start xl:gap-6 xl:space-y-0">
        <aside className="xl:sticky xl:top-20 xl:col-start-2 xl:row-start-1">
          <NotifyPanel
            post={post}
            status={status}
            confirm={sp.notify === "1"}
            locale={locale}
          />
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
              publishedAt: post.publishedAt
                ? toJstLocalInput(post.publishedAt)
                : "",
              pinned: post.pinned,
              targetRoles: post.targetRoles,
              coverPreviewUrl: post.coverUrl
                ? signedFileUrl(post.coverUrl)
                : null,
              notified: post.notifiedAt !== null,
            }}
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
