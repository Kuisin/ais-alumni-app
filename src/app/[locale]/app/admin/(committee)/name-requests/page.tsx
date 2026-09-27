import { ArrowRight, History, IdCard } from "lucide-react";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import type { NameValues } from "@/app/actions/name-requests";
import { NameDecisionForm } from "@/components/admin/name-decision-form";
import { formatBirthDate } from "@/components/profile/birth-date-card";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui/card";
import { Tabs } from "@/components/ui/tabs";
import { ChangeRequestStatus } from "@/generated/prisma/enums";
import { Link } from "@/i18n/navigation";
import { db } from "@/lib/db";
import { displayName, formatDateTime } from "@/lib/format";
import { isGender } from "@/lib/gender";
import { composeKana, composeKanji, composeRomaji } from "@/lib/names";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("adminMembers.nameRequests");
  return { title: t("title") };
}

const lines = (v: Partial<NameValues>) => ({
  romaji: composeRomaji({
    lastNameRomaji: v.lastNameRomaji ?? null,
    firstNameRomaji: v.firstNameRomaji ?? null,
    middleNameRomaji: v.middleNameRomaji ?? null,
  }),
  kanji: composeKanji({
    lastNameKanji: v.lastNameKanji ?? null,
    firstNameKanji: v.firstNameKanji ?? null,
  }),
  kana: composeKana({
    lastNameKana: v.lastNameKana ?? null,
    firstNameKana: v.firstNameKana ?? null,
  }),
  nameAtAis: v.nameAtAis || null,
});

/** Admin: name change requests (names are fixed after approval). */
export default async function NameRequestsPage({
  searchParams,
}: PageProps<"/[locale]/app/admin/name-requests">) {
  const tab = (await searchParams).tab === "decided" ? "decided" : "pending";
  const locale = (await getLocale()) === "en" ? "en" : "ja";
  const t = await getTranslations("adminMembers.nameRequests");
  const tp = await getTranslations("profile.nameRequest");
  const tn = await getTranslations("common.names");
  const decidedWhere = {
    status: {
      in: [ChangeRequestStatus.APPROVED, ChangeRequestStatus.REJECTED],
    },
  };
  const [pendingCount, requests, birthRequests, genderRequests] =
    await Promise.all([
      Promise.all([
        db.nameChangeRequest.count({
          where: { status: ChangeRequestStatus.PENDING },
        }),
        db.birthDateRequest.count({
          where: { status: ChangeRequestStatus.PENDING },
        }),
        db.genderRequest.count({
          where: { status: ChangeRequestStatus.PENDING },
        }),
      ]).then(([a, b, c]) => a + b + c),
      db.nameChangeRequest.findMany({
        where:
          tab === "pending"
            ? { status: ChangeRequestStatus.PENDING }
            : {
                status: {
                  in: [
                    ChangeRequestStatus.APPROVED,
                    ChangeRequestStatus.REJECTED,
                  ],
                },
              },
        orderBy: { createdAt: tab === "pending" ? "asc" : "desc" },
        take: 50,
        include: {
          user: { select: { id: true, nameRomaji: true, nameKanji: true } },
          reviewer: { select: { nameRomaji: true, nameKanji: true } },
        },
      }),
      db.birthDateRequest.findMany({
        where:
          tab === "pending"
            ? { status: ChangeRequestStatus.PENDING }
            : decidedWhere,
        orderBy: { createdAt: tab === "pending" ? "asc" : "desc" },
        take: 50,
        include: {
          user: { select: { id: true, nameRomaji: true, nameKanji: true } },
          reviewer: { select: { nameRomaji: true, nameKanji: true } },
        },
      }),
      db.genderRequest.findMany({
        where:
          tab === "pending"
            ? { status: ChangeRequestStatus.PENDING }
            : decidedWhere,
        orderBy: { createdAt: tab === "pending" ? "asc" : "desc" },
        take: 50,
        include: {
          user: { select: { id: true, nameRomaji: true, nameKanji: true } },
          reviewer: { select: { nameRomaji: true, nameKanji: true } },
        },
      }),
    ]);
  const tb = await getTranslations("adminMembers.birthDateRequests");
  const tgr = await getTranslations("adminMembers.genderRequests");
  const tgn = await getTranslations("profile.photo.genders");
  const genderLabel = (v: string | null) =>
    v && isGender(v) ? tgn(v) : tgr("notSet");
  const labels: Record<string, string> = {
    romaji: tn("romaji"),
    kanji: tn("kanjiShort"),
    kana: tn("kanaShort"),
    nameAtAis: tp("nameAtAis"),
  };

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("description")} />
      <Tabs
        label={t("tabsLabel")}
        items={(["pending", "decided"] as const).map((k) => ({
          href: {
            pathname: "/app/admin/name-requests",
            query: k === "decided" ? { tab: k } : {},
          },
          label: t(`tabs.${k}`),
          count: k === "pending" ? pendingCount : undefined,
          active: tab === k,
        }))}
      />
      <div data-results className="space-y-6">
        {requests.length === 0 &&
        birthRequests.length === 0 &&
        genderRequests.length === 0 ? (
          <EmptyState
            icon={tab === "pending" ? <IdCard /> : <History />}
            hint={tab === "pending" ? t("emptyHint") : undefined}
          >
            {t(tab === "pending" ? "emptyPending" : "emptyDecided")}
          </EmptyState>
        ) : null}
        {requests.map((q) => {
          const before = lines(q.current as Partial<NameValues>);
          const after = lines(q.proposed as Partial<NameValues>);
          return (
            <Card key={q.id} className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Link
                  href={`/app/admin/members/${q.user.id}`}
                  className="font-semibold text-brand-700 hover:underline"
                >
                  {displayName(q.user, locale)}
                </Link>
                <span className="text-sm text-slate-500">
                  {formatDateTime(q.createdAt, locale)}
                </span>
              </div>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                {(Object.keys(labels) as (keyof typeof before)[]).map((k) => {
                  const changed = before[k] !== after[k];
                  return (
                    <div key={k} className="contents">
                      <dt className="text-slate-600">{labels[k]}</dt>
                      <dd className="flex flex-wrap items-center gap-2">
                        {changed ? (
                          <>
                            <span className="text-slate-500 line-through">
                              {before[k] ?? "—"}
                            </span>
                            <ArrowRight
                              aria-hidden="true"
                              className="size-4 text-slate-400"
                            />
                            <span className="sr-only">→</span>
                            <mark className="rounded bg-amber-100 px-1 font-medium text-slate-900">
                              {after[k] ?? "—"}
                            </mark>
                          </>
                        ) : (
                          <span>{after[k] ?? "—"}</span>
                        )}
                      </dd>
                    </div>
                  );
                })}
              </dl>
              <p className="text-sm text-slate-700">
                <span className="font-medium">{tp("reason")}: </span>
                {q.reason}
              </p>
              {q.status === ChangeRequestStatus.PENDING ? (
                <NameDecisionForm id={q.id} />
              ) : (
                <p className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
                  <Badge
                    tone={
                      q.status === ChangeRequestStatus.APPROVED
                        ? "green"
                        : "red"
                    }
                  >
                    {tp(`status.${q.status}`)}
                  </Badge>
                  {q.reviewer ? (
                    <span>{displayName(q.reviewer, locale)}</span>
                  ) : null}
                  {q.reviewNote ? <span>— {q.reviewNote}</span> : null}
                </p>
              )}
            </Card>
          );
        })}
        {birthRequests.length ? (
          <section aria-labelledby="birth-requests" className="space-y-4">
            <h2 id="birth-requests" className="text-lg font-semibold">
              {tb("title")}
            </h2>
            {birthRequests.map((q) => (
              <Card key={q.id} className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link
                    href={`/app/admin/members/${q.user.id}`}
                    className="font-semibold text-brand-700 hover:underline"
                  >
                    {displayName(q.user, locale)}
                  </Link>
                  <span className="text-sm text-slate-500">
                    {formatDateTime(q.createdAt, locale)}
                  </span>
                </div>
                <p className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="text-slate-600">{tb("current")}:</span>
                  <span className="text-slate-500 line-through">
                    {q.current
                      ? formatBirthDate(q.current, locale)
                      : tb("notSet")}
                  </span>
                  <ArrowRight
                    aria-hidden="true"
                    className="size-4 text-slate-400"
                  />
                  <span className="sr-only">→</span>
                  <span className="text-slate-600">{tb("proposed")}:</span>
                  <mark className="rounded bg-amber-100 px-1 font-medium text-slate-900">
                    {formatBirthDate(q.proposed, locale)}
                  </mark>
                </p>
                {q.reason ? (
                  <p className="text-sm text-slate-700">
                    <span className="font-medium">{tp("reason")}: </span>
                    {q.reason}
                  </p>
                ) : null}
                {q.status === ChangeRequestStatus.PENDING ? (
                  <NameDecisionForm id={q.id} kind="birthDate" />
                ) : (
                  <p className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
                    <Badge
                      tone={
                        q.status === ChangeRequestStatus.APPROVED
                          ? "green"
                          : "red"
                      }
                    >
                      {tp(`status.${q.status}`)}
                    </Badge>
                    {q.reviewer ? (
                      <span>{displayName(q.reviewer, locale)}</span>
                    ) : null}
                    {q.reviewNote ? <span>— {q.reviewNote}</span> : null}
                  </p>
                )}
              </Card>
            ))}
          </section>
        ) : null}
        {genderRequests.length ? (
          <section aria-labelledby="gender-requests" className="space-y-4">
            <h2 id="gender-requests" className="text-lg font-semibold">
              {tgr("title")}
            </h2>
            {genderRequests.map((q) => (
              <Card key={q.id} className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link
                    href={`/app/admin/members/${q.user.id}`}
                    className="font-semibold text-brand-700 hover:underline"
                  >
                    {displayName(q.user, locale)}
                  </Link>
                  <span className="text-sm text-slate-500">
                    {formatDateTime(q.createdAt, locale)}
                  </span>
                </div>
                <p className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="text-slate-600">{tgr("current")}:</span>
                  <span className="text-slate-500 line-through">
                    {genderLabel(q.current)}
                  </span>
                  <ArrowRight
                    aria-hidden="true"
                    className="size-4 text-slate-400"
                  />
                  <span className="sr-only">→</span>
                  <span className="text-slate-600">{tgr("proposed")}:</span>
                  <mark className="rounded bg-amber-100 px-1 font-medium text-slate-900">
                    {genderLabel(q.proposed)}
                  </mark>
                </p>
                {q.reason ? (
                  <p className="text-sm text-slate-700">
                    <span className="font-medium">{tp("reason")}: </span>
                    {q.reason}
                  </p>
                ) : null}
                {q.status === ChangeRequestStatus.PENDING ? (
                  <NameDecisionForm id={q.id} kind="gender" />
                ) : (
                  <p className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
                    <Badge
                      tone={
                        q.status === ChangeRequestStatus.APPROVED
                          ? "green"
                          : "red"
                      }
                    >
                      {tp(`status.${q.status}`)}
                    </Badge>
                    {q.reviewer ? (
                      <span>{displayName(q.reviewer, locale)}</span>
                    ) : null}
                    {q.reviewNote ? <span>— {q.reviewNote}</span> : null}
                  </p>
                )}
              </Card>
            ))}
          </section>
        ) : null}
      </div>
    </div>
  );
}
