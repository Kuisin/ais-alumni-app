import {
  Briefcase,
  ChevronDown,
  Filter,
  GraduationCap,
  Megaphone,
  School,
  Users,
} from "lucide-react";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { BarTable } from "@/components/admin/bar-table";
import { buttonClass } from "@/components/ui/button";
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
/** rows shown before "show all" */
const ROW_LIMIT = 30;

/** 進路: where former students went after AIS, from their 学歴・職歴. */
export default async function DestinationsPage({
  searchParams,
}: PageProps<"/[locale]/app/admin/destinations">) {
  const t = await getTranslations("destinations");
  const th = await getTranslations("history");
  const locale = (await getLocale()) === "en" ? "en" : "ja";
  const cohorts = await loadCohortOptions(locale);
  const sp = await searchParams;
  const cohortId = cohorts.some((c) => c.id === sp.cohort)
    ? String(sp.cohort)
    : "";
  // The form sends f=1; without it (first visit) the toggle uses its default.
  const toggled = sp.f === "1";
  const showAll = sp.all === "1";

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
        // members with history first, then by 学年 and name
        Number(b.path.hasHistory) - Number(a.path.hasHistory) ||
        (a.cohort ?? 999) - (b.cohort ?? 999) ||
        a.name.localeCompare(b.name),
    );
  const withHistory = people.filter((p) => p.path.hasHistory).length;
  const onlyHistory = toggled ? sp.hist === "1" : withHistory > 0;
  const listed = onlyHistory ? people.filter((p) => p.path.hasHistory) : people;
  const shown = showAll ? listed : listed.slice(0, ROW_LIMIT);
  const levels = PATH_LEVELS.slice(0, 3);
  const baseQuery: Record<string, string> = { f: "1" };
  if (cohortId) baseQuery.cohort = cohortId;
  if (onlyHistory) baseQuery.hist = "1";

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

  const nowCell = (p: (typeof people)[number]) =>
    p.path.now ? (
      <span className="inline-flex max-w-full min-w-0 items-center gap-1">
        {p.path.now.kind === "work" ? (
          <Briefcase
            aria-hidden="true"
            className="size-4 shrink-0 text-slate-500"
          />
        ) : (
          <School
            aria-hidden="true"
            className="size-4 shrink-0 text-slate-500"
          />
        )}
        <span className="truncate" title={p.path.now.name}>
          {p.path.now.name}
        </span>
      </span>
    ) : p.path.hasHistory ? (
      <span className="text-slate-400">—</span>
    ) : (
      <Badge>{t("table.noHistory")}</Badge>
    );
  const schoolCell = (name: string | undefined) =>
    name ? (
      <span className="block truncate" title={name}>
        {name}
      </span>
    ) : (
      <span className="text-slate-400">—</span>
    );
  const leftLine = (p: (typeof people)[number]) =>
    p.year ? t(p.didGraduate ? "graduated" : "left", { year: p.year }) : null;
  const cohortText = (p: (typeof people)[number]) =>
    p.cohort ? cohortShort({ number: p.cohort }, locale) : "—";

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("description")} />

      <form
        method="get"
        aria-label={t("filterLabel")}
        className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4"
      >
        <input type="hidden" name="f" value="1" />
        <div className="min-w-0 space-y-1">
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
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="hist"
            value="1"
            defaultChecked={onlyHistory}
            className="size-5"
          />
          {t("onlyHistory")}
        </label>
        <SubmitButton variant="secondary" className="whitespace-nowrap">
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
                  ? t("rate", {
                      percent: Math.round((withHistory / people.length) * 100),
                    })
                  : "—"}
              </span>
            </p>
          </div>
        </Card>
      </section>

      {withHistory === 0 ? (
        <EmptyState
          icon={<GraduationCap />}
          hint={t("noHistoryHint")}
          action={
            <Link href="/app/admin/notify" className={buttonClass("secondary")}>
              <Megaphone aria-hidden="true" className="size-4" />
              {t("askMembers")}
            </Link>
          }
        >
          {t("noHistory")}
        </EmptyState>
      ) : (
        <section aria-label={t("chartsLabel")} className="space-y-3">
          <p className="text-sm text-slate-600">{t("chartNote")}</p>
          <div className="grid gap-6 lg:grid-cols-2">
            {charts.map((c) => (
              <BarTable
                key={c.id}
                id={c.id}
                title={c.title}
                rows={c.rows}
                total={withHistory}
                note={undefined}
              />
            ))}
          </div>
        </section>
      )}

      <Card>
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold">{t("table.title")}</h2>
          <p className="text-sm text-slate-600 tabular-nums">
            {t("table.count", { shown: shown.length, total: listed.length })}
          </p>
        </div>
        <p className="mb-3 text-sm text-slate-600">{t("table.hint")}</p>
        {shown.length ? (
          <>
            {/* Phones: one card per person */}
            <ul className="divide-y divide-slate-100 sm:hidden">
              {shown.map((p) => (
                <li key={p.id} className="py-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <Link
                      href={`/app/admin/members/${p.id}`}
                      className="min-w-0 truncate font-medium text-brand-700 hover:underline"
                    >
                      {p.name}
                    </Link>
                    <span className="shrink-0 text-xs whitespace-nowrap text-slate-500">
                      {cohortText(p)}
                    </span>
                  </div>
                  {leftLine(p) ? (
                    <p className="text-xs text-slate-500">{leftLine(p)}</p>
                  ) : null}
                  <dl className="mt-2 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-sm">
                    {levels.map((l) => (
                      <div key={l} className="contents">
                        <dt className="text-slate-500">{th(`levels.${l}`)}</dt>
                        <dd className="min-w-0">
                          {schoolCell(p.path.schools[l])}
                        </dd>
                      </div>
                    ))}
                    <dt className="text-slate-500">{t("table.now")}</dt>
                    <dd className="min-w-0">{nowCell(p)}</dd>
                  </dl>
                </li>
              ))}
            </ul>

            {/* sm+: table */}
            <table className="hidden w-full table-fixed border-collapse text-sm sm:table">
              <caption className="sr-only">{t("table.title")}</caption>
              <colgroup>
                <col className="w-[22%]" />
                <col className="w-[5.5rem]" />
                {levels.map((l) => (
                  <col key={l} />
                ))}
                <col className="w-[20%]" />
              </colgroup>
              <thead>
                <tr className="text-left text-xs text-slate-500">
                  <th scope="col" className="py-2 pr-3 font-medium">
                    {t("table.name")}
                  </th>
                  <th
                    scope="col"
                    className="py-2 pr-3 font-medium whitespace-nowrap"
                  >
                    {t("cohort")}
                  </th>
                  {levels.map((l) => (
                    <th
                      key={l}
                      scope="col"
                      className="py-2 pr-3 font-medium whitespace-nowrap"
                    >
                      {th(`levels.${l}`)}
                    </th>
                  ))}
                  <th
                    scope="col"
                    className="py-2 font-medium whitespace-nowrap"
                  >
                    {t("table.now")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {shown.map((p) => (
                  <tr
                    key={p.id}
                    className="border-t border-slate-100 align-top hover:bg-slate-50"
                  >
                    <th scope="row" className="py-2 pr-3 text-left font-medium">
                      <Link
                        href={`/app/admin/members/${p.id}`}
                        className="block truncate text-brand-700 hover:underline"
                        title={p.name}
                      >
                        {p.name}
                      </Link>
                      {leftLine(p) ? (
                        <span className="block truncate text-xs font-normal text-slate-500">
                          {leftLine(p)}
                        </span>
                      ) : null}
                    </th>
                    <td className="py-2 pr-3 whitespace-nowrap">
                      {cohortText(p)}
                    </td>
                    {levels.map((l) => (
                      <td key={l} className="py-2 pr-3">
                        {schoolCell(p.path.schools[l])}
                      </td>
                    ))}
                    <td className="py-2">{nowCell(p)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {shown.length < listed.length ? (
              <div className="mt-4 text-center">
                <Link
                  href={{
                    pathname: "/app/admin/destinations",
                    query: { ...baseQuery, all: "1" },
                  }}
                  className={buttonClass("secondary")}
                >
                  <ChevronDown aria-hidden="true" className="size-4" />
                  {t("table.showAll", { count: listed.length })}
                </Link>
              </div>
            ) : null}
          </>
        ) : (
          <EmptyState icon={<Users />}>{t("table.empty")}</EmptyState>
        )}
      </Card>
    </div>
  );
}
