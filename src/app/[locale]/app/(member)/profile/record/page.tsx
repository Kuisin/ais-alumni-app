import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { cancelRecordRequestAction } from "@/app/actions/record-requests";
import { CorrectionPanel } from "@/components/records/correction-panel";
import { RecordDiff, RecordValue } from "@/components/records/record-value";
import { BackLink } from "@/components/ui/back-link";
import { Badge, Card, PageHeader } from "@/components/ui/card";
import { SubmitButton } from "@/components/ui/submit-button";
import { ChangeRequestStatus, RoleKey } from "@/generated/prisma/enums";
import { roleLabelKey } from "@/lib/audience";
import { cohortNumbersById, loadCohortChoices } from "@/lib/cohorts-db";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import {
  fieldsFor,
  hasRecord,
  snapshot,
  toFormValues,
} from "@/lib/record-requests";
import { requireActive } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("records");
  return { title: t("title") };
}

const STATUS_TONE = {
  PENDING: "amber",
  APPROVED: "green",
  REJECTED: "red",
  CANCELLED: "slate",
} as const;

/** Member: view the AIS record (在籍情報) and request corrections. */
export default async function RecordPage() {
  const me = await requireActive();
  const locale = (await getLocale()) === "en" ? "en" : "ja";
  const [t, tr] = await Promise.all([
    getTranslations("records"),
    getTranslations("roles"),
  ]);
  const requests = await db.recordChangeRequest.findMany({
    where: { userId: me.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  const roles = me.roles.filter((r) => hasRecord(r.role));
  const cohorts = await loadCohortChoices(locale);
  const cohortNumbers = await cohortNumbersById();
  // 学年 number → label, for showing requested and current values.
  const cohortLabels = Object.fromEntries(
    cohorts.map((c) => [c.value, c.label]),
  );

  return (
    <div className="space-y-6">
      <div>
        <BackLink href="/app/profile#record">{t("backToProfile")}</BackLink>
        <PageHeader title={t("title")} description={t("description")} />
      </div>

      {roles.length === 0 ? <Card>{t("noRecord")}</Card> : null}

      {roles.map((r) => {
        const current = snapshot(r.role, {
          ...r,
          cohort: r.cohortId ? (cohortNumbers.get(r.cohortId) ?? null) : null,
        });
        const pending = requests.find(
          (q) => q.role === r.role && q.status === ChangeRequestStatus.PENDING,
        );
        return (
          <Card key={r.role} className="space-y-4">
            <h2 className="text-lg font-semibold">{tr(roleLabelKey(r))}</h2>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
              {fieldsFor(r.role).map((f) =>
                // A teacher with no end year is still at AIS: say so plainly
                // rather than "Left: present".
                f === "yearsTo" &&
                r.role === RoleKey.TEACHER &&
                (current[f] === null || current[f] === undefined) ? (
                  <div key={f} className="contents">
                    <dt className="text-slate-600">{t("fields.employment")}</dt>
                    <dd>
                      <Badge tone="green">{t("stillTeaching")}</Badge>
                    </dd>
                  </div>
                ) : (
                  <div key={f} className="contents">
                    <dt className="text-slate-600">{t(`fields.${f}`)}</dt>
                    <dd>
                      <RecordValue
                        field={f}
                        value={current[f]}
                        role={r.role}
                        cohortLabels={cohortLabels}
                      />
                    </dd>
                  </div>
                ),
              )}
            </dl>

            {pending ? (
              <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
                <p className="font-medium text-amber-900">
                  {t("pending", {
                    date: formatDate(pending.createdAt, locale),
                  })}
                </p>
                <RecordDiff
                  cohortLabels={cohortLabels}
                  role={r.role}
                  current={pending.current as Record<string, unknown>}
                  proposed={pending.proposed as Record<string, unknown>}
                />
                <p className="text-sm text-slate-700">
                  <span className="font-medium">{t("reason")}: </span>
                  {pending.reason}
                </p>
                <form action={cancelRecordRequestAction.bind(null, pending.id)}>
                  <SubmitButton variant="secondary">{t("cancel")}</SubmitButton>
                </form>
              </div>
            ) : (
              <CorrectionPanel
                cohorts={cohorts}
                role={r.role}
                fields={fieldsFor(r.role)}
                values={toFormValues(r.role, current)}
              />
            )}
          </Card>
        );
      })}

      {requests.some((q) => q.status !== ChangeRequestStatus.PENDING) ? (
        <Card>
          <h2 className="mb-3 text-lg font-semibold">{t("history")}</h2>
          <ul className="divide-y divide-slate-100">
            {requests
              .filter((q) => q.status !== ChangeRequestStatus.PENDING)
              .map((q) => (
                <li key={q.id} className="space-y-2 py-3">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <Badge tone={STATUS_TONE[q.status]}>
                      {t(`status.${q.status}`)}
                    </Badge>
                    <span>{tr(`role.${q.role}`)}</span>
                    <span className="text-slate-500">
                      {formatDate(q.createdAt, locale)}
                    </span>
                  </div>
                  <RecordDiff
                    cohortLabels={cohortLabels}
                    role={q.role}
                    current={q.current as Record<string, unknown>}
                    proposed={q.proposed as Record<string, unknown>}
                  />
                  {q.reviewNote ? (
                    <p className="text-sm text-slate-700">
                      <span className="font-medium">{t("reviewNote")}: </span>
                      {q.reviewNote}
                    </p>
                  ) : null}
                </li>
              ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}
