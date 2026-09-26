import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { cache } from "react";
import { FallbackTag } from "@/components/news/fallback-tag";
import { MarkdownBody } from "@/components/news/markdown-body";
import { Badge } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { isTargeted, toViewer } from "@/lib/authz";
import { db } from "@/lib/db";
import { asLocale } from "@/lib/events";
import { formatDate, localized } from "@/lib/format";
import { getCurrentUser, requireActive } from "@/lib/session";
import { signedFileUrl } from "@/lib/storage";

/** Published post visible to the current user, or null. */
const loadPost = cache(async (id: string) => {
  const user = await getCurrentUser();
  if (!user || id.length > 64) return null;
  const post = await db.newsPost.findUnique({ where: { id } });
  if (!post?.publishedAt || post.publishedAt > new Date()) return null;
  if (!isTargeted(post.targetRoles, toViewer(user))) return null;
  return post;
});

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/news/[id]">) {
  const { locale, id } = await params;
  const post = await loadPost(id);
  if (!post) return {};
  return {
    title: localized(post.titleJa, post.titleEn, asLocale(locale)).text,
  };
}

export default async function NewsDetailPage({
  params,
}: PageProps<"/[locale]/news/[id]">) {
  const { id, locale: rawLocale } = await params;
  const locale = asLocale(rawLocale);
  await requireActive();
  const post = await loadPost(id);
  if (!post?.publishedAt) notFound();

  const t = await getTranslations("news");
  const title = localized(post.titleJa, post.titleEn, locale);
  const body = localized(post.bodyJa, post.bodyEn, locale);
  // Authorized above (targeted + published) before issuing a signed URL.
  const cover = post.coverUrl ? signedFileUrl(post.coverUrl) : null;

  return (
    <article className="space-y-6">
      <div>
        <Link href="/news" className="text-sm text-brand-700 underline">
          {t("backToList")}
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-600">
          {post.pinned ? <Badge tone="brand">{t("pinned")}</Badge> : null}
          <time dateTime={post.publishedAt.toISOString()}>
            {formatDate(post.publishedAt, locale)}
          </time>
        </div>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">
          {title.text || t("untitled")}
          <FallbackTag fallback={title.fallback} />
        </h1>
      </div>
      {cover ? (
        // biome-ignore lint/performance/noImgElement: signed private URL, not optimizable by next/image
        <img
          src={cover}
          alt=""
          className="max-h-96 w-full rounded-xl object-cover"
        />
      ) : null}
      {body.fallback ? (
        <p>
          <FallbackTag fallback={body.fallback} />
        </p>
      ) : null}
      <MarkdownBody source={body.text} />
    </article>
  );
}
