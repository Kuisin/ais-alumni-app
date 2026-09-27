import { ArrowDown, Calendar, Clock, Paperclip } from "lucide-react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { cache } from "react";
import { FallbackTag } from "@/components/news/fallback-tag";
import { MarkdownBody } from "@/components/news/markdown-body";
import {
  Comments,
  ConfirmCard,
  PollCard,
  Reactions,
  ScheduleCard,
} from "@/components/news/news-hub";
import { BackLink } from "@/components/ui/back-link";
import { Alert, Badge, Card } from "@/components/ui/card";
import { markNewsRead } from "@/lib/announcements";
import { db } from "@/lib/db";
import { asLocale } from "@/lib/events";
import { formatDate, formatDateTime, localized } from "@/lib/format";
import {
  adminOnlyView,
  matchesAudience,
  specFromPost,
} from "@/lib/news-audience";
import { isOpen } from "@/lib/news-hub";
import { loadHub } from "@/lib/news-hub-db";
import { newsViewer } from "@/lib/news-visibility";
import { getCurrentUser, requireActive } from "@/lib/session";
import { signedFileUrl } from "@/lib/storage";

/** Published post visible to the current user, or null. */
const loadPost = cache(async (id: string) => {
  const user = await getCurrentUser();
  if (!user || id.length > 64) return null;
  const post = await db.newsPost.findUnique({ where: { id } });
  if (!post?.publishedAt || post.publishedAt > new Date() || post.archivedAt)
    return null;
  const viewer = await newsViewer(user);
  const spec = specFromPost(post);
  if (!matchesAudience(spec, viewer)) return null;
  return { ...post, adminView: adminOnlyView(spec, viewer) };
});

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/app/news/[id]">) {
  const { locale, id } = await params;
  const post = await loadPost(id);
  if (!post) return {};
  return {
    title: localized(post.titleJa, post.titleEn, asLocale(locale)).text,
  };
}

export default async function NewsDetailPage({
  params,
}: PageProps<"/[locale]/app/news/[id]">) {
  const { id, locale: rawLocale } = await params;
  const locale = asLocale(rawLocale);
  const user = await requireActive();
  const post = await loadPost(id);
  if (!post?.publishedAt) notFound();
  // Published and aimed at this member (checked in loadPost): record the
  // read — not for an admin outside the audience (view only).
  const adminView = post.adminView;
  if (!adminView) await markNewsRead(user.id, post.id);

  const t = await getTranslations("news");
  const title = localized(post.titleJa, post.titleEn, locale);
  const body = localized(post.bodyJa, post.bodyEn, locale);
  // Authorized above (targeted + published) before issuing a signed URL.
  const cover = post.coverUrl ? signedFileUrl(post.coverUrl) : null;
  const hub = await loadHub(post, user);
  // Admins outside the audience see the forms and results, but can't answer.
  const open = isOpen(post) && !adminView;
  const th = await getTranslations("news.hub");
  const kb = (n: number) =>
    n >= 1024 * 1024
      ? `${(n / 1024 / 1024).toFixed(1)} MB`
      : `${Math.max(1, Math.round(n / 1024))} KB`;

  return (
    <article className="mx-auto max-w-3xl space-y-6">
      {adminView ? (
        <Alert tone="info">
          <span className="block font-semibold">{t("adminView.title")}</span>
          <span className="mt-1 block">{t("adminView.body")}</span>
        </Alert>
      ) : null}
      <div>
        <BackLink href="/app/news">{t("backToList")}</BackLink>
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
          {post.pinned ? <Badge tone="brand">{t("pinned")}</Badge> : null}
          <span className="inline-flex items-center gap-1.5">
            <Calendar aria-hidden="true" className="size-4 shrink-0" />
            <time dateTime={post.publishedAt.toISOString()}>
              {formatDate(post.publishedAt, locale)}
            </time>
          </span>
        </div>
        <h1 className="mt-1 text-2xl font-bold tracking-tight break-words">
          {title.text || t("untitled")}
          <FallbackTag fallback={title.fallback} />
        </h1>
        {post.deadline || post.closedAt ? (
          <p
            className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${open ? "bg-amber-100 text-amber-900" : "bg-slate-100 text-slate-700"}`}
          >
            <Clock aria-hidden="true" className="size-4" />
            {open && post.deadline
              ? th("deadline", { time: formatDateTime(post.deadline, locale) })
              : post.closedAt
                ? th("closedManual")
                : th("closed")}
          </p>
        ) : null}
        {/* Something to answer: jump past the body to it (phones). */}
        {open && (post.requireConfirm || hub.polls.length) ? (
          <a
            href="#respond"
            className="mt-2 ml-2 inline-flex min-h-11 items-center gap-1 rounded-full px-3 text-sm font-semibold text-brand-700 hover:bg-brand-50"
          >
            {t("respondJump")}
            <ArrowDown aria-hidden="true" className="size-4" />
          </a>
        ) : null}
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

      {hub.attachments.length ? (
        <Card>
          <h2 className="mb-2 flex items-center gap-2 text-lg font-semibold">
            <Paperclip aria-hidden="true" className="size-5 text-brand-700" />
            {th("files.title")}
          </h2>
          <ul className="space-y-1">
            {hub.attachments.map((a) => (
              <li key={a.id}>
                <a
                  href={a.url}
                  target="_blank"
                  rel="noopener"
                  className="inline-flex min-h-11 items-center gap-2 text-brand-700"
                >
                  <span className="underline">{a.fileName}</span>
                  <span className="text-xs text-slate-500">{kb(a.size)}</span>
                </a>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <div id="respond" className="scroll-mt-20 space-y-6 empty:hidden">
        {post.requireConfirm ? (
          <ConfirmCard
            postId={post.id}
            confirmedAt={hub.confirmedAt?.toISOString() ?? null}
            count={hub.confirmCount}
            open={open}
            readOnly={adminView}
          />
        ) : null}
        {hub.polls.map((p) =>
          p.kind === "SCHEDULE" ? (
            <ScheduleCard key={p.id} postId={post.id} poll={p} open={open} />
          ) : (
            <PollCard key={p.id} postId={post.id} poll={p} open={open} />
          ),
        )}
      </div>

      {post.allowComments ? (
        <Reactions postId={post.id} reactions={hub.reactions} />
      ) : null}

      {post.allowComments || hub.comments.length ? (
        <Comments
          postId={post.id}
          comments={hub.comments}
          allow={post.allowComments}
          isAdmin={user.isAdmin}
        />
      ) : null}
    </article>
  );
}
