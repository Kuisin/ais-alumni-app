import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { DirectoryFilterForm } from "@/components/directory/filter-form";
import { MemberCard } from "@/components/directory/member-card";
import { buttonClass } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { toViewer } from "@/lib/authz";
import {
  directoryQuery,
  hasActiveFilters,
  parseDirectoryFilters,
  searchDirectory,
} from "@/lib/directory";
import { requireActive } from "@/lib/session";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("directory");
  return { title: t("title") };
}

export default async function DirectoryPage({ searchParams }: Props) {
  const user = await requireActive();
  const t = await getTranslations("directory");
  const filters = parseDirectoryFilters(await searchParams);
  const { items, nextCursor } = await searchDirectory(toViewer(user), filters);

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />
      <DirectoryFilterForm filters={filters} />

      <section aria-labelledby="dir-results" className="mt-6">
        <h2 id="dir-results" className="sr-only">
          {t("results")}
        </h2>
        {items.length === 0 ? (
          <EmptyState>
            {hasActiveFilters(filters) || filters.cursor
              ? t("empty")
              : t("emptyAll")}
          </EmptyState>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {items.map((m) => (
              <li key={m.id}>
                <MemberCard member={m} />
              </li>
            ))}
          </ul>
        )}
        <nav
          aria-label={t("pagination")}
          className="mt-6 flex flex-wrap justify-center gap-2"
        >
          {filters.cursor ? (
            <Link
              href={`/directory${directoryQuery(filters)}`}
              className={buttonClass("ghost")}
            >
              {t("firstPage")}
            </Link>
          ) : null}
          {nextCursor ? (
            <Link
              href={`/directory${directoryQuery(filters, nextCursor)}`}
              className={buttonClass("secondary")}
            >
              {t("loadMore")}
            </Link>
          ) : null}
        </nav>
      </section>
    </>
  );
}
