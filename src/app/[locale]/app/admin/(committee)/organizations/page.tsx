import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { deleteOrgAction } from "@/app/actions/admin-orgs";
import {
  OrgMergeForm,
  OrgRenameForm,
} from "@/components/history/org-admin-forms";
import { Card, EmptyState, PageHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { Link } from "@/i18n/navigation";
import { db } from "@/lib/db";
import { cleanOrgName, type OrgKind, orgNameKey } from "@/lib/organizations";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("organizations");
  return { title: t("title") };
}

/** Admin: schools and companies used in 学歴 / 職歴 (layout enforces admin). */
export default async function OrganizationsPage({
  searchParams,
}: PageProps<"/[locale]/app/admin/organizations">) {
  const sp = await searchParams;
  const kind: OrgKind = sp.kind === "company" ? "company" : "school";
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
  const rows = (
    kind === "school"
      ? await db.school.findMany({
          where,
          include: { _count: { select: { entries: true } } },
          orderBy: { name: "asc" },
          take: 200,
        })
      : await db.company.findMany({
          where,
          include: { _count: { select: { entries: true } } },
          orderBy: { name: "asc" },
          take: 200,
        })
  ).map((r) => ({ id: r.id, name: r.name, count: r._count.entries }));

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("description")} />
      <nav aria-label={t("tabsLabel")} className="flex gap-2">
        {(["school", "company"] as const).map((k) => (
          <Link
            key={k}
            href={{ pathname: "/app/admin/organizations", query: { kind: k } }}
            aria-current={kind === k ? "page" : undefined}
            className={`rounded-lg px-3 py-2 text-sm font-medium ${kind === k ? "bg-brand-700 text-white" : "bg-white text-slate-700 hover:bg-slate-100"}`}
          >
            {t(`tabs.${k}`)}
          </Link>
        ))}
      </nav>
      <form method="get" className="flex gap-2">
        <input type="hidden" name="kind" value={kind} />
        <Input
          name="q"
          defaultValue={q}
          placeholder={t("searchPlaceholder")}
          aria-label={t("search")}
        />
        <SubmitButton variant="secondary">{t("search")}</SubmitButton>
      </form>
      {rows.length === 0 ? <EmptyState>{t("empty")}</EmptyState> : null}
      <ul className="space-y-3">
        {rows.map((r) => (
          <li key={r.id}>
            <Card className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold">{r.name}</span>
                <span className="text-sm text-slate-600">
                  {t("members", { count: r.count })}
                </span>
              </div>
              <details>
                <summary className="cursor-pointer text-sm font-medium text-brand-700">
                  {t("manage")}
                </summary>
                <div className="mt-3 grid gap-6 sm:grid-cols-2">
                  <OrgRenameForm kind={kind} id={r.id} name={r.name} />
                  <div className="space-y-2">
                    <p className="text-sm text-slate-600">{t("mergeHelp")}</p>
                    <OrgMergeForm kind={kind} id={r.id} />
                  </div>
                </div>
                {r.count === 0 ? (
                  <form
                    action={deleteOrgAction.bind(null, kind, r.id)}
                    className="mt-3"
                  >
                    <SubmitButton variant="ghost">{t("delete")}</SubmitButton>
                  </form>
                ) : null}
              </details>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
