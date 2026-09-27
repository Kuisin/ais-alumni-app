import { SearchX, Users } from "lucide-react";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { DirectoryFilterForm } from "@/components/directory/filter-form";
import { MemberCard } from "@/components/directory/member-card";
import { buttonClass } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/ui/card";
import { LinkPendingBar } from "@/components/ui/link-pending";
import { Link } from "@/i18n/navigation";
import { blockedUserIds, toViewer } from "@/lib/authz";
import { loadCohortOptions } from "@/lib/cohorts-db";
import { db } from "@/lib/db";
import {
  buildDirectoryWhere,
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
  const viewer = toViewer(user);
  const [{ items, nextCursor }, total] = await Promise.all([
    searchDirectory(viewer, filters),
    // Total for "32 members"; same where-clause as the page query.
    blockedUserIds(viewer.id).then((blockedIds) =>
      db.user.count({
        where: buildDirectoryWhere(filters, {
          viewer,
          blockedIds,
          now: new Date(),
        }),
      }),
    ),
  ]);
  const filtered = hasActiveFilters(filters) || Boolean(filters.cursor);

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />
      <DirectoryFilterForm
        filters={filters}
        cohorts={
          await loadCohortOptions((await getLocale()) === "en" ? "en" : "ja")
        }
      />

      <section data-results aria-labelledby="dir-results" className="mt-6">
        <div className="mb-3 flex items-baseline gap-2">
          <h2 id="dir-results" className="text-sm font-medium text-slate-600">
            {t("results")}
          </h2>
          <p
            aria-live="polite"
            className="text-sm font-semibold text-slate-900"
          >
            {t("count", { count: total })}
          </p>
        </div>
        {items.length === 0 ? (
          <EmptyState
            icon={filtered ? <SearchX /> : <Users />}
            action={
              filtered ? (
                <Link
                  href="/app/directory"
                  className={buttonClass("secondary")}
                >
                  {t("filters.clear")}
                </Link>
              ) : undefined
            }
          >
            <span className="text-balance">
              {filtered ? t("empty") : t("emptyAll")}
            </span>
          </EmptyState>
        ) : (
          <ul className="grid auto-rows-fr gap-3 sm:grid-cols-2">
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
              href={`/app/directory${directoryQuery(filters)}`}
              className={buttonClass("ghost", "relative")}
            >
              {t("firstPage")}
              <LinkPendingBar />
            </Link>
          ) : null}
          {nextCursor ? (
            <Link
              href={`/app/directory${directoryQuery(filters, nextCursor)}`}
              className={buttonClass("secondary", "relative")}
            >
              {t("loadMore")}
              <LinkPendingBar />
            </Link>
          ) : null}
        </nav>
      </section>
    </>
  );
}
