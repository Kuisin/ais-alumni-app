import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AUDIT_ROW_INCLUDE, AuditList } from "@/components/admin/audit-list";
import { buttonClass } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/field";
import type { Prisma } from "@/generated/prisma/client";
import { Link } from "@/i18n/navigation";
import { db } from "@/lib/db";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/admin/audit">): Promise<Metadata> {
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
}: PageProps<"/[locale]/admin/audit">) {
  const sp = await searchParams;
  const t = await getTranslations("adminMembers.auditLog");
  const tc = await getTranslations("common");

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

  const baseQuery: Record<string, string> = {};
  if (action) baseQuery.action = action;
  if (target) baseQuery.target = target;

  return (
    <div>
      <PageHeader title={t("title")} description={t("description")} />

      <form
        method="get"
        aria-label={t("filterLabel")}
        className="mb-6 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-3"
      >
        <div>
          <label htmlFor="a-action" className="mb-1 block text-sm font-medium">
            {t("action")}
          </label>
          <Input
            id="a-action"
            name="action"
            defaultValue={action}
            placeholder="member."
          />
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
          <button type="submit" className={buttonClass("primary")}>
            {tc("filter")}
          </button>
          {action || target ? (
            <Link href="/admin/audit" className={buttonClass("ghost")}>
              {tc("clear")}
            </Link>
          ) : null}
        </div>
      </form>

      <AuditList rows={page} />

      <nav aria-label={t("pagination")} className="mt-4 flex flex-wrap gap-2">
        {cursor ? (
          <Link
            href={{ pathname: "/admin/audit", query: baseQuery }}
            className={buttonClass("secondary")}
          >
            {t("newest")}
          </Link>
        ) : null}
        {hasMore ? (
          <Link
            href={{
              pathname: "/admin/audit",
              query: { ...baseQuery, cursor: page[page.length - 1].id },
            }}
            className={buttonClass("secondary")}
          >
            {t("older")}
          </Link>
        ) : null}
      </nav>
    </div>
  );
}
