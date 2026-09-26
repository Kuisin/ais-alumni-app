import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { BarTable } from "@/components/admin/bar-table";
import { Card, PageHeader } from "@/components/ui/card";
import { AccountState, LifeStage, RoleKey } from "@/generated/prisma/enums";
import { db } from "@/lib/db";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/app/admin/stats">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "adminStats" });
  return { title: t("title") };
}

function pct(n: number, d: number): string {
  return d ? `${Math.round((n / d) * 1000) / 10}%` : "—";
}

export default async function AdminStatsPage() {
  const t = await getTranslations("adminStats");
  const tr = await getTranslations("roles");
  const active = { user: { state: AccountState.ACTIVE } } as const;
  const former = { role: RoleKey.FORMER_STUDENT, ...active } as const;

  const [
    byState,
    byRole,
    byYear,
    byStage,
    activeCount,
    lineLinked,
    lineFollowing,
  ] = await Promise.all([
    db.user.groupBy({ by: ["state"], _count: { _all: true } }),
    db.userRole.groupBy({
      by: ["role"],
      where: active,
      _count: { _all: true },
    }),
    db.userRole.groupBy({
      by: ["graduationOrLeaveYear"],
      where: former,
      _count: { _all: true },
      orderBy: { graduationOrLeaveYear: "asc" },
    }),
    db.userRole.groupBy({
      by: ["currentStage"],
      where: former,
      _count: { _all: true },
    }),
    db.user.count({ where: { state: AccountState.ACTIVE } }),
    db.user.count({
      where: { state: AccountState.ACTIVE, lineUserId: { not: null } },
    }),
    db.user.count({
      where: {
        state: AccountState.ACTIVE,
        lineUserId: { not: null },
        lineFollowing: true,
      },
    }),
  ]);
  const totalUsers = byState.reduce((a, r) => a + r._count._all, 0);

  const stateRows = Object.values(AccountState).map((s) => ({
    key: s,
    label: tr(`state.${s}`),
    value: byState.find((r) => r.state === s)?._count._all ?? 0,
  }));
  const roleRows = Object.values(RoleKey).map((r) => ({
    key: r,
    label: tr(`role.${r}`),
    value: byRole.find((x) => x.role === r)?._count._all ?? 0,
  }));
  const yearRows = byYear.map((r) => ({
    key: String(r.graduationOrLeaveYear ?? "none"),
    label:
      r.graduationOrLeaveYear === null
        ? t("notSet")
        : String(r.graduationOrLeaveYear),
    value: r._count._all,
  }));
  // Put "not set" last.
  yearRows.sort((a, b) => (a.key === "none" ? 1 : b.key === "none" ? -1 : 0));
  const stageNone =
    byStage.find((r) => r.currentStage === null)?._count._all ?? 0;
  const stageRows = [
    ...Object.values(LifeStage).map((s) => ({
      key: s,
      label: tr(`stage.${s}`),
      value: byStage.find((r) => r.currentStage === s)?._count._all ?? 0,
    })),
    ...(stageNone
      ? [{ key: "none", label: t("notSet"), value: stageNone }]
      : []),
  ];

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("description")} />

      <section
        aria-labelledby="stats-summary"
        className="grid gap-4 sm:grid-cols-3"
      >
        <h2 id="stats-summary" className="sr-only">
          {t("summary")}
        </h2>
        <Card>
          <p className="text-sm text-slate-600">{t("activeMembers")}</p>
          <p className="text-3xl font-bold tabular-nums">{activeCount}</p>
          <p className="text-xs text-slate-500">
            {t("allAccounts", { count: totalUsers })}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-slate-600">{t("line.linked")}</p>
          <p className="text-3xl font-bold tabular-nums">
            {pct(lineLinked, activeCount)}
          </p>
          <p className="text-xs text-slate-500">
            {t("line.ofActive", { count: lineLinked, total: activeCount })}
          </p>
          <div className="mt-2 h-2 rounded bg-slate-100" aria-hidden="true">
            <div
              className="h-2 rounded bg-line"
              style={{ width: pct(lineLinked, activeCount).replace("—", "0%") }}
            />
          </div>
        </Card>
        <Card>
          <p className="text-sm text-slate-600">{t("line.following")}</p>
          <p className="text-3xl font-bold tabular-nums">
            {pct(lineFollowing, activeCount)}
          </p>
          <p className="text-xs text-slate-500">
            {t("line.ofActive", { count: lineFollowing, total: activeCount })}
          </p>
          <div className="mt-2 h-2 rounded bg-slate-100" aria-hidden="true">
            <div
              className="h-2 rounded bg-line"
              style={{
                width: pct(lineFollowing, activeCount).replace("—", "0%"),
              }}
            />
          </div>
        </Card>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <BarTable
          id="by-role"
          title={t("byRole")}
          note={t("activeOnlyMultiRole")}
          rows={roleRows}
          total={activeCount}
        />
        <BarTable
          id="by-state"
          title={t("byState")}
          note={t("allAccountsNote")}
          rows={stateRows}
        />
        <BarTable
          id="by-stage"
          title={t("byStage")}
          note={t("formerActiveOnly")}
          rows={stageRows}
        />
        <BarTable
          id="by-year"
          title={t("byYear")}
          note={t("formerActiveOnly")}
          rows={yearRows}
        />
      </div>
    </div>
  );
}
