import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { formatDate, localized } from "@/lib/format";
import { markdownToPlain } from "@/lib/markdown";
import { FallbackTag } from "./fallback-tag";

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
}: {
  post: NewsCardData;
  locale: "ja" | "en";
  excerpt?: boolean;
}) {
  const t = useTranslations("news");
  const title = localized(post.titleJa, post.titleEn, locale);
  const body = excerpt
    ? markdownToPlain(localized(post.bodyJa, post.bodyEn, locale).text, 140)
    : "";
  return (
    <Link
      href={`/news/${post.id}`}
      className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-brand-300 focus-visible:outline-2"
    >
      <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
        {post.pinned ? <Badge tone="brand">{t("pinned")}</Badge> : null}
        {post.publishedAt ? (
          <time dateTime={post.publishedAt.toISOString()}>
            {formatDate(post.publishedAt, locale)}
          </time>
        ) : null}
      </div>
      <h3 className="mt-1 font-semibold text-slate-900">
        {title.text || t("untitled")}
        <FallbackTag fallback={title.fallback} />
      </h3>
      {body ? (
        <p className="mt-1 line-clamp-2 text-sm text-slate-600">{body}</p>
      ) : null}
    </Link>
  );
}
