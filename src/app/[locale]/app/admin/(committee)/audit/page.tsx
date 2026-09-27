import { Filter } from "lucide-react";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { formatCompactDate } from "@/components/admin/admin-format";
import {
  AUDIT_CATEGORIES,
  AUDIT_ROW_INCLUDE,
  AuditList,
} from "@/components/admin/audit-list";
import { PageNav } from "@/components/admin/page-nav";
import { buttonClass } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/field";
import { SearchForm } from "@/components/ui/search-form";
import { SearchButton } from "@/components/ui/submit-button";
import type { Prisma } from "@/generated/prisma/client";
import { Link } from "@/i18n/navigation";
import { db } from "@/lib/db";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/app/admin/audit">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "adminMembers" });
  return { title: t("auditLog.title") };
}

const PAGE_SIZE = 50;

function one(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v)?.trim() ?? "";
}

export default async function AdminAuditPage({
  searchParams,
}: PageProps<"/[locale]/app/admin/audit">) {
  const sp = await searchParams;
  const t = await getTranslations("adminMembers.auditLog");
  const ta = await getTranslations("audit");
  const tc = await getTranslations("common");
  const locale = (await getLocale()) === "en" ? "en" : "ja";

  const action = one(sp.action).slice(0, 100);
  const target = one(sp.target).slice(0, 100);
  const cursor = one(sp.cursor) || null;

  const where: Prisma.AuditLogWhereInput = {
    ...(action ? { action: { contains: action, mode: "insensitive" } } : {}),
    ...(target ? { OR: [{ targetId: target }, { actorId: target }] } : {}),
  };
  const rows = await db.auditLog.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: PAGE_SIZE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: AUDIT_ROW_INCLUDE,
  });
  const hasMore = rows.length > PAGE_SIZE;
  const page = rows.slice(0, PAGE_SIZE);

  const knownAction = AUDIT_CATEGORIES.some((c) => action === `${c}.`);

  const baseQuery: Record<string, string> = {};
  if (action) baseQuery.action = action;
  if (target) baseQuery.target = target;

  return (
    <div>
      <PageHeader title={t("title")} description={t("description")} />

      <SearchForm
        aria-label={t("filterLabel")}
        className="mb-6 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-3"
      >
        <div>
          <label htmlFor="a-action" className="mb-1 block text-sm font-medium">
            {ta("category")}
          </label>
          {/* Values are action prefixes; the query still matches "contains". */}
          <Select id="a-action" name="action" defaultValue={action}>
            <option value="">{ta("allActions")}</option>
            {AUDIT_CATEGORIES.map((c) => (
              <option key={c} value={`${c}.`}>
                {ta(`categories.${c}`)}
              </option>
            ))}
            {action && !knownAction ? (
              <option value={action}>
                {ta("customFilter", { value: action })}
              </option>
            ) : null}
          </Select>
        </div>
        <div>
          <label htmlFor="a-target" className="mb-1 block text-sm font-medium">
            {t("targetOrActorId")}
          </label>
          <Input
            id="a-target"
            name="target"
            defaultValue={target}
            autoComplete="off"
          />
        </div>
        <div className="flex items-end gap-2">
          <SearchButton
            className="whitespace-nowrap"
            icon={<Filter aria-hidden="true" className="size-4" />}
          >
            {tc("filter")}
          </SearchButton>
          {action || target ? (
            <Link href="/app/admin/audit" className={buttonClass("ghost")}>
              {tc("clear")}
            </Link>
          ) : null}
        </div>
      </SearchForm>

      <div data-results>
        <AuditList rows={page} dayHeading="h2" />

        <PageNav
          label={t("pagination")}
          prev={
            cursor ? { pathname: "/app/admin/audit", query: baseQuery } : null
          }
          next={
            hasMore
              ? {
                  pathname: "/app/admin/audit",
                  query: { ...baseQuery, cursor: page[page.length - 1].id },
                }
              : null
          }
          prevLabel={ta("newest")}
          nextLabel={ta("older")}
          status={
            page.length ? (
              <>
                {ta("showing", { count: page.length })}
                <span className="hidden sm:inline">
                  {" · "}
                  {ta("range", {
                    from: formatCompactDate(
                      page[page.length - 1].createdAt,
                      locale,
                    ),
                    to: formatCompactDate(page[0].createdAt, locale),
                  })}
                </span>
              </>
            ) : null
          }
        />
      </div>
    </div>
  );
}
