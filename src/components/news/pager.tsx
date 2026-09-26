import { useTranslations } from "next-intl";
import { buttonClass } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

/** Previous / next page links. `query` holds extra params to keep (e.g. tab). */
export function Pager({
  pathname,
  page,
  hasNext,
  query = {},
}: {
  pathname: string;
  page: number;
  hasNext: boolean;
  query?: Record<string, string>;
}) {
  const t = useTranslations("news");
  if (page <= 1 && !hasNext) return null;
  return (
    <nav
      aria-label={t("pager.label")}
      className="mt-6 flex items-center justify-between gap-2"
    >
      {page > 1 ? (
        <Link
          href={{ pathname, query: { ...query, page: String(page - 1) } }}
          className={buttonClass("secondary")}
          rel="prev"
        >
          {t("pager.prev")}
        </Link>
      ) : (
        <span />
      )}
      <span className="text-sm text-slate-600">
        {t("pager.page", { page })}
      </span>
      {hasNext ? (
        <Link
          href={{ pathname, query: { ...query, page: String(page + 1) } }}
          className={buttonClass("secondary")}
          rel="next"
        >
          {t("pager.next")}
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}

/** Parse a ?page= search param into a positive integer (default 1, max 1000). */
export function parsePage(value: string | string[] | undefined): number {
  const n = Number(Array.isArray(value) ? value[0] : value);
  return Number.isInteger(n) && n >= 1 && n <= 1000 ? n : 1;
}
