import { Briefcase, Filter, School, Users } from "lucide-react";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { BarTable } from "@/components/admin/bar-table";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui/card";
import { Select } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { AccountState, RoleKey } from "@/generated/prisma/enums";
import { Link } from "@/i18n/navigation";
import { cohortShort } from "@/lib/cohorts";
import { loadCohortOptions } from "@/lib/cohorts-db";
import { db } from "@/lib/db";
import { PATH_LEVELS, pathOf, topNames } from "@/lib/destinations";
import { displayName } from "@/lib/format";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("destinations");
  return { title: t("title") };
}

const ENTRY = { startYear: true, endYear: true } as const;

/** 進路: where former students went after AIS, from their 学歴・職歴. */
export default async function DestinationsPage({
  searchParams,
}: PageProps<"/[locale]/app/admin/destinations">) {
  const t = await getTranslations("destinations");
  const th = await getTranslations("history");
  const locale = (await getLocale()) === "en" ? "en" : "ja";
  const cohorts = await loadCohortOptions(locale);
  const raw = (await searchParams).cohort;
  const cohortId = cohorts.some((c) => c.id === raw) ? String(raw) : "";

  const rows = await db.userRole.findMany({
    where: {
      role: RoleKey.FORMER_STUDENT,
      user: { state: AccountState.ACTIVE },
      ...(cohortId ? { cohortId } : {}),
    },
    select: {
      didGraduate: true,
      graduationOrLeaveYear: true,
      cohort: { select: { number: true } },
      user: {
        select: {
          id: true,
          nameRomaji: true,
          nameKanji: true,
          education: {
            select: {
              ...ENTRY,
              level: true,
              school: { select: { name: true } },
            },
          },
          work: { select: { ...ENTRY, company: { select: { name: true } } } },
        },
      },
    },
  });
  const people = rows
    .map((r) => ({
      id: r.user.id,
      name: displayName(r.user, locale),
      cohort: r.cohort?.number ?? null,
      didGraduate: r.didGraduate,
      year: r.graduationOrLeaveYear,
      path: pathOf(
        r.user.education.map((e) => ({ ...e, school: e.school.name })),
        r.user.work.map((w) => ({ ...w, company: w.company.name })),
      ),
    }))
    .sort(
      (a, b) =>
        (a.cohort ?? 999) - (b.cohort ?? 999) || a.name.localeCompare(b.name),
    );
  const withHistory = people.filter((p) => p.path.hasHistory).length;

  const top = (names: (string | null | undefined)[]) =>
    topNames(names).map((n) => ({
      key: n.name,
      label: n.name,
      value: n.count,
    }));
  const charts = [
    ...PATH_LEVELS.slice(0, 3).map((level) => ({
      id: `top-${level}`,
      title: t("topSchools", { level: th(`levels.${level}`) }),
      rows: top(people.map((p) => p.path.schools[level])),
    })),
    {
      id: "top-work",
      title: t("topWork"),
      rows: top(
        people.map((p) =>
          p.path.now?.kind === "work" ? p.path.now.name : null,
        ),
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("description")} />

      <form className="flex flex-wrap items-end gap-2">
        <div className="space-y-1">
          <label htmlFor="dest-cohort" className="block text-sm font-medium">
            {t("cohort")}
          </label>
          <Select id="dest-cohort" name="cohort" defaultValue={cohortId}>
            <option value="">{t("allCohorts")}</option>
            {cohorts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </Select>
        </div>
        <SubmitButton variant="secondary">
          <Filter aria-hidden="true" className="size-4" />
          {t("apply")}
        </SubmitButton>
      </form>

      <section aria-label={t("summary")} className="grid gap-4 sm:grid-cols-2">
        <Card className="flex items-center gap-4">
          <Users aria-hidden="true" className="size-8 text-brand-700" />
          <div>
            <p className="text-sm text-slate-600">{t("formerStudents")}</p>
            <p className="text-3xl font-bold tabular-nums">{people.length}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-4">
          <School aria-hidden="true" className="size-8 text-brand-700" />
          <div>
            <p className="text-sm text-slate-600">{t("withHistory")}</p>
            <p className="text-3xl font-bold tabular-nums">
              {withHistory}
              <span className="ml-2 text-base font-normal text-slate-500">
                {people.length
                  ? `${Math.round((withHistory / people.length) * 100)}%`
                  : "—"}
              </span>
            </p>
          </div>
        </Card>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {charts.map((c) => (
          <BarTable
            key={c.id}
            id={c.id}
            title={c.title}
            rows={c.rows}
            total={withHistory}
            note={t("chartNote")}
          />
        ))}
      </div>

      <Card>
        <h2 className="mb-1 text-lg font-semibold">{t("table.title")}</h2>
        <p className="mb-3 text-sm text-slate-600">{t("table.hint")}</p>
        {people.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] border-collapse text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500">
                  <th scope="col" className="py-2 pr-3 font-medium">
                    {t("table.name")}
                  </th>
                  <th scope="col" className="py-2 pr-3 font-medium">
                    {t("cohort")}
                  </th>
                  {PATH_LEVELS.slice(0, 3).map((l) => (
                    <th key={l} scope="col" className="py-2 pr-3 font-medium">
                      {th(`levels.${l}`)}
                    </th>
                  ))}
                  <th scope="col" className="py-2 font-medium">
                    {t("table.now")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {people.map((p) => (
                  <tr
                    key={p.id}
                    className="border-t border-slate-100 align-top"
                  >
                    <th scope="row" className="py-2 pr-3 text-left font-medium">
                      <Link
                        href={`/app/admin/members/${p.id}`}
                        className="text-brand-700 hover:underline"
                      >
                        {p.name}
                      </Link>
                      <span className="block text-xs font-normal text-slate-500">
                        {p.year
                          ? t(p.didGraduate ? "graduated" : "left", {
                              year: p.year,
                            })
                          : null}
                      </span>
                    </th>
                    <td className="py-2 pr-3 whitespace-nowrap">
                      {p.cohort
                        ? cohortShort({ number: p.cohort }, locale)
                        : "—"}
                    </td>
                    {PATH_LEVELS.slice(0, 3).map((l) => (
                      <td key={l} className="py-2 pr-3">
                        {p.path.schools[l] ?? (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    ))}
                    <td className="py-2">
                      {p.path.now ? (
                        <span className="inline-flex items-center gap-1">
                          {p.path.now.kind === "work" ? (
                            <Briefcase
                              aria-hidden="true"
                              className="size-4 text-slate-500"
                            />
                          ) : (
                            <School
                              aria-hidden="true"
                              className="size-4 text-slate-500"
                            />
                          )}
                          {p.path.now.name}
                        </span>
                      ) : p.path.hasHistory ? (
                        <span className="text-slate-400">—</span>
                      ) : (
                        <Badge>{t("table.noHistory")}</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState>{t("table.empty")}</EmptyState>
        )}
      </Card>
    </div>
  );
}
