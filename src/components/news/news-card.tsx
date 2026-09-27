import { Calendar, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/card";
import { cn } from "@/components/ui/cn";
import { LinkPendingIcon } from "@/components/ui/link-pending";
import { Link } from "@/i18n/navigation";
import { formatDate, localized } from "@/lib/format";
import { markdownToPlain } from "@/lib/markdown";
import { FallbackTag } from "./fallback-tag";
import { UnreadBadge } from "./unread-badge";

export type NewsCardData = {
  id: string;
  titleJa: string | null;
  titleEn: string | null;
  bodyJa: string | null;
  bodyEn: string | null;
  pinned: boolean;
  publishedAt: Date | null;
};

export function NewsCard({
  post,
  locale,
  excerpt = true,
  unread = false,
  needsAnswer = false,
}: {
  post: NewsCardData;
  locale: "ja" | "en";
  excerpt?: boolean;
  /** the member hasn't opened this post yet */
  unread?: boolean;
  /** asks for a confirmation / answer the member hasn't given yet */
  needsAnswer?: boolean;
}) {
  const t = useTranslations("news");
  const title = localized(post.titleJa, post.titleEn, locale);
  const body = excerpt
    ? markdownToPlain(localized(post.bodyJa, post.bodyEn, locale).text, 140)
    : "";
  return (
    <Link
      href={`/app/news/${post.id}`}
      className={cn(
        "group flex items-center gap-3 rounded-xl border bg-white p-4 shadow-sm transition hover:border-brand-300 hover:shadow-md focus-visible:outline-2",
        unread ? "border-brand-200 ring-1 ring-brand-100" : "border-slate-200",
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
          {unread ? <UnreadBadge /> : null}
          {needsAnswer ? (
            <Badge tone="amber">{t("hub.needsAnswer")}</Badge>
          ) : null}
          {post.pinned ? <Badge tone="brand">{t("pinned")}</Badge> : null}
          {post.publishedAt ? (
            <span className="inline-flex items-center gap-1.5">
              <Calendar aria-hidden="true" className="size-4 shrink-0" />
              <time dateTime={post.publishedAt.toISOString()}>
                {formatDate(post.publishedAt, locale)}
              </time>
            </span>
          ) : null}
        </div>
        <h3
          className={cn(
            "mt-1 text-slate-900",
            unread ? "font-bold" : "font-semibold",
          )}
        >
          {title.text || t("untitled")}
          <FallbackTag fallback={title.fallback} />
        </h3>
        {body ? (
          <p className="mt-1 line-clamp-2 text-sm text-slate-600">{body}</p>
        ) : null}
      </div>
      <LinkPendingIcon>
        <ChevronRight
          aria-hidden="true"
          className="size-5 shrink-0 text-slate-400 transition-colors group-hover:text-brand-700"
        />
      </LinkPendingIcon>
    </Link>
  );
}
