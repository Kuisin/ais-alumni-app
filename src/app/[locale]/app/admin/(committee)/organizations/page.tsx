import { Building2, Pencil, School, Search } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { deleteOrgAction } from "@/app/actions/admin-orgs";
import {
  OrgMergeForm,
  OrgRenameForm,
} from "@/components/history/org-admin-forms";
import { Badge, EmptyState, PageHeader } from "@/components/ui/card";
import { ConfirmForm } from "@/components/ui/confirm-form";
import { Input, Select } from "@/components/ui/field";
import { SearchForm } from "@/components/ui/search-form";
import { SearchButton, SubmitButton } from "@/components/ui/submit-button";
import { Tabs } from "@/components/ui/tabs";
import { db } from "@/lib/db";
import { cleanOrgName, type OrgKind, orgNameKey } from "@/lib/organizations";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("organizations");
  return { title: t("title") };
}

const LIMIT = 200;

/** Admin: schools and companies used in 学歴 / 職歴 (layout enforces admin). */
export default async function OrganizationsPage({
  searchParams,
}: PageProps<"/[locale]/app/admin/organizations">) {
  const sp = await searchParams;
  const kind: OrgKind = sp.kind === "company" ? "company" : "school";
  const sort = sp.sort === "count" ? "count" : "name";
  const q = typeof sp.q === "string" ? sp.q.slice(0, 80) : "";
  const t = await getTranslations("organizations");
  const key = orgNameKey(q);
  const where = key
    ? {
        OR: [
          { name: { contains: cleanOrgName(q), mode: "insensitive" as const } },
          { nameKey: { contains: key } },
        ],
      }
    : {};
  // Sorting by 人数 brings the entries that matter (and their duplicates) up.
  const orderBy =
    sort === "count"
      ? [{ entries: { _count: "desc" as const } }, { name: "asc" as const }]
      : [{ name: "asc" as const }];
  const [rows, total, schoolCount, companyCount] = await Promise.all([
    (kind === "school"
      ? db.school.findMany({
          where,
          include: { _count: { select: { entries: true } } },
          orderBy,
          take: LIMIT,
        })
      : db.company.findMany({
          where,
          include: { _count: { select: { entries: true } } },
          orderBy,
          take: LIMIT,
        })
    ).then((list) =>
      list.map((r) => ({ id: r.id, name: r.name, count: r._count.entries })),
    ),
    kind === "school"
      ? db.school.count({ where })
      : db.company.count({ where }),
    db.school.count(),
    db.company.count(),
  ]);

  const tabQuery = (k: OrgKind) => ({
    kind: k,
    ...(sort === "count" ? { sort } : {}),
  });

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("description")} />
      <Tabs
        label={t("tabsLabel")}
        items={(["school", "company"] as const).map((k) => ({
          href: { pathname: "/app/admin/organizations", query: tabQuery(k) },
          label: t(`tabs.${k}`),
          count: k === "school" ? schoolCount : companyCount,
          active: kind === k,
        }))}
      />
      <SearchForm
        aria-label={t("filterLabel")}
        className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-end"
      >
        <input type="hidden" name="kind" value={kind} />
        <div className="flex min-w-0 flex-1 gap-2">
          <Input
            name="q"
            type="search"
            defaultValue={q}
            placeholder={t("searchPlaceholder")}
            aria-label={t("search")}
            className="min-w-0 flex-1"
          />
          <SearchButton
            variant="secondary"
            className="shrink-0 whitespace-nowrap"
            icon={<Search aria-hidden="true" className="size-4" />}
          >
            {t("search")}
          </SearchButton>
        </div>
        <div className="flex items-center gap-2 sm:shrink-0">
          <label
            htmlFor="org-sort"
            className="text-sm font-medium whitespace-nowrap"
          >
            {t("sort.label")}
          </label>
          <Select
            id="org-sort"
            name="sort"
            defaultValue={sort}
            className="w-auto"
          >
            <option value="name">{t("sort.name")}</option>
            <option value="count">{t("sort.count")}</option>
          </Select>
        </div>
      </SearchForm>

      <div data-results className="space-y-6">
        <p className="text-sm text-slate-600" aria-live="polite">
          {total > rows.length
            ? t("countLimited", { total, shown: rows.length })
            : t("count", { total })}
        </p>

        {rows.length === 0 ? (
          <EmptyState
            icon={kind === "school" ? <School /> : <Building2 />}
            hint={q ? t("emptySearchHint") : t("emptyHint")}
          >
            {t("empty")}
          </EmptyState>
        ) : (
          <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
            {rows.map((r) => (
              <li key={r.id} className="px-4 py-2">
                <details className="group">
                  <summary className="-mx-2 flex min-h-11 cursor-pointer list-none items-center gap-3 rounded-lg px-2 hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
                    <span className="min-w-0 flex-1 truncate font-medium">
                      {r.name}
                    </span>
                    <span className="shrink-0 whitespace-nowrap">
                      <Badge tone={r.count ? "brand" : "slate"}>
                        {t("members", { count: r.count })}
                      </Badge>
                    </span>
                    <span className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-brand-700">
                      <Pencil aria-hidden="true" className="size-4" />
                      <span className="sr-only sm:not-sr-only">
                        {t("manage")}
                      </span>
                    </span>
                  </summary>
                  <div className="mt-2 mb-2 grid gap-6 sm:grid-cols-2">
                    <OrgRenameForm kind={kind} id={r.id} name={r.name} />
                    <div className="space-y-2">
                      <p className="text-sm text-slate-600">{t("mergeHelp")}</p>
                      <OrgMergeForm kind={kind} id={r.id} />
                    </div>
                  </div>
                  {r.count === 0 ? (
                    <ConfirmForm
                      message={t("deleteConfirm")}
                      action={deleteOrgAction.bind(null, kind, r.id)}
                      className="mb-2"
                    >
                      <SubmitButton
                        variant="ghost"
                        className="text-red-700 hover:bg-red-50"
                      >
                        {t("delete")}
                      </SubmitButton>
                    </ConfirmForm>
                  ) : null}
                </details>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
