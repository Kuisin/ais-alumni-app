import { History } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { formatTime, jstDayKey } from "@/components/admin/admin-format";
import { EmptyState } from "@/components/ui/card";
import type { Prisma } from "@/generated/prisma/client";
import { Link } from "@/i18n/navigation";
import { db } from "@/lib/db";
import { displayName, formatDate } from "@/lib/format";

export type AuditRow = {
  id: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  data: Prisma.JsonValue | null;
  createdAt: Date;
  actorId: string | null;
  actor: {
    id: string;
    nameRomaji: string | null;
    nameKanji: string | null;
    primaryEmail: string | null;
  } | null;
};

export const AUDIT_ROW_INCLUDE = {
  actor: {
    select: { id: true, nameRomaji: true, nameKanji: true, primaryEmail: true },
  },
} as const;

/** Action prefixes offered in the audit filter (values match `action`). */
export const AUDIT_CATEGORIES = [
  "member",
  "verification",
  "teacher",
  "record_request",
  "event",
  "news",
  "broadcast",
  "cohort",
  "roster",
  "school",
  "company",
  "self",
  "user",
  "donation",
] as const;

/** Admin-facing link for a target, when there is a page for it. */
function targetHref(type: string | null, id: string): string | null {
  switch (type) {
    case "User":
      return `/app/admin/members/${id}`;
    case "VerificationRequest":
      return `/app/admin/verification/${id}`;
    case "Event":
      return `/app/admin/events/${id}`;
    case "NewsPost":
      return `/app/admin/news/${id}`;
    default:
      return null;
  }
}

type Person = {
  nameRomaji: string | null;
  nameKanji: string | null;
  primaryEmail: string | null;
};

/**
 * Audit entries grouped by JST day: time, human action label (raw key kept
 * small underneath), actor, target (members resolved to names), data folded.
 */
export async function AuditList({
  rows,
  dayHeading = "h3",
}: {
  rows: AuditRow[];
  /** heading level of the per-day groups (h2 directly under a page h1) */
  dayHeading?: "h2" | "h3";
}) {
  const DayHeading = dayHeading;
  const t = await getTranslations("adminMembers.auditLog");
  const ta = await getTranslations("audit");
  const locale = (await getLocale()) === "en" ? "en" : "ja";
  if (rows.length === 0)
    return <EmptyState icon={<History />}>{t("empty")}</EmptyState>;

  // Resolve member targets to names in one query (also the applicant behind
  // a verification request, which is logged as data.userId).
  const dataUserId = (r: AuditRow) =>
    r.data && typeof r.data === "object" && !Array.isArray(r.data)
      ? typeof r.data.userId === "string"
        ? r.data.userId
        : null
      : null;
  const userIds = new Set<string>();
  for (const r of rows) {
    if (r.targetType === "User" && r.targetId) userIds.add(r.targetId);
    const uid = dataUserId(r);
    if (uid) userIds.add(uid);
  }
  const people = new Map<string, Person>(
    userIds.size
      ? (
          await db.user.findMany({
            where: { id: { in: [...userIds] } },
            select: {
              id: true,
              nameRomaji: true,
              nameKanji: true,
              primaryEmail: true,
            },
          })
        ).map((u) => [u.id, u])
      : [],
  );
  const personLabel = (p: Person, id: string) =>
    p.nameRomaji || p.nameKanji
      ? displayName(p, locale)
      : (p.primaryEmail ?? id);

  const actionLabel = (action: string): string | null => {
    const key = `actions.${action}`;
    return ta.has(key) && typeof ta.raw(key) === "string" ? ta(key) : null;
  };
  const typeLabel = (type: string) =>
    ta.has(`targetTypes.${type}`) ? ta(`targetTypes.${type}`) : type;

  const groups: { day: string; date: Date; rows: AuditRow[] }[] = [];
  for (const r of rows) {
    const day = jstDayKey(r.createdAt);
    const last = groups[groups.length - 1];
    if (last?.day === day) last.rows.push(r);
    else groups.push({ day, date: r.createdAt, rows: [r] });
  }

  const cellLabel = "text-xs text-slate-500 sm:sr-only";

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div
        aria-hidden="true"
        className="hidden gap-x-4 border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600 sm:grid sm:grid-cols-[3.5rem_minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)]"
      >
        <span>{ta("timeJst")}</span>
        <span>{t("action")}</span>
        <span>{t("actor")}</span>
        <span>{t("target")}</span>
      </div>
      {groups.map((g) => (
        <section key={g.day} aria-labelledby={`audit-day-${g.day}`}>
          <DayHeading
            id={`audit-day-${g.day}`}
            className="border-b border-slate-200 bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700"
          >
            <time dateTime={g.day}>{formatDate(g.date, locale)}</time>
          </DayHeading>
          <ol className="divide-y divide-slate-100">
            {g.rows.map((r) => {
              const actorLabel = r.actor
                ? r.actor.nameRomaji || r.actor.nameKanji
                  ? displayName(r.actor, locale)
                  : (r.actor.primaryEmail ?? r.actor.id)
                : t("system");
              const hasData =
                r.data !== null &&
                !(
                  typeof r.data === "object" &&
                  Object.keys(r.data ?? {}).length === 0
                );
              const label = actionLabel(r.action);
              const target = r.targetId
                ? {
                    id: r.targetId,
                    href: targetHref(r.targetType, r.targetId),
                    person:
                      r.targetType === "User"
                        ? people.get(r.targetId)
                        : undefined,
                  }
                : null;
              const applicantId =
                r.targetType === "VerificationRequest" ? dataUserId(r) : null;
              const applicant = applicantId ? people.get(applicantId) : null;
              return (
                <li
                  key={r.id}
                  className="grid gap-x-4 gap-y-1 px-3 py-2 text-sm sm:grid-cols-[3.5rem_minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)] sm:items-start"
                >
                  <time
                    dateTime={r.createdAt.toISOString()}
                    className="block text-xs text-slate-500 tabular-nums sm:pt-0.5"
                  >
                    {formatTime(r.createdAt, locale)}
                  </time>
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900">
                      {label ?? r.action}
                    </p>
                    <code className="block truncate font-mono text-xs text-slate-400">
                      {r.action}
                    </code>
                    {hasData ? (
                      <details className="mt-1">
                        <summary className="inline-flex min-h-11 cursor-pointer items-center text-xs text-brand-700 lg:min-h-8">
                          {t("data")}
                        </summary>
                        <pre className="mt-1 max-h-64 overflow-auto rounded bg-slate-50 p-2 text-xs break-all whitespace-pre-wrap">
                          {JSON.stringify(r.data, null, 2)}
                        </pre>
                      </details>
                    ) : null}
                  </div>
                  <div className="min-w-0 text-slate-700">
                    <span className={cellLabel}>{t("actor")}: </span>
                    {r.actorId && r.actor ? (
                      <Link
                        href={`/app/admin/members/${r.actorId}`}
                        className="inline-flex min-h-11 items-center text-brand-700 underline lg:inline lg:min-h-0"
                      >
                        {actorLabel}
                      </Link>
                    ) : (
                      <span className="text-slate-500">{actorLabel}</span>
                    )}
                  </div>
                  <div className="min-w-0 text-slate-700">
                    {target ? (
                      <>
                        <span className={cellLabel}>{t("target")}: </span>
                        {r.targetType ? (
                          <span className="mr-1 text-xs text-slate-500">
                            {typeLabel(r.targetType)}
                          </span>
                        ) : null}
                        {target.person ? (
                          <Link
                            href={target.href ?? "#"}
                            className="inline-flex min-h-11 items-center text-brand-700 underline lg:inline lg:min-h-0"
                          >
                            {personLabel(target.person, target.id)}
                          </Link>
                        ) : target.href ? (
                          <Link
                            href={target.href}
                            title={target.id}
                            className="inline-flex min-h-11 max-w-[12ch] items-center truncate font-mono text-xs text-brand-700 underline lg:inline-block lg:min-h-0 lg:align-bottom"
                          >
                            {target.id}
                          </Link>
                        ) : (
                          <span
                            title={target.id}
                            className="inline-block max-w-[12ch] truncate align-bottom font-mono text-xs"
                          >
                            {target.id}
                          </span>
                        )}
                        {applicant && applicantId ? (
                          <span className="block text-xs">
                            <Link
                              href={`/app/admin/members/${applicantId}`}
                              className="inline-flex min-h-11 items-center text-brand-700 underline lg:inline lg:min-h-0"
                            >
                              {personLabel(applicant, applicantId)}
                            </Link>
                          </span>
                        ) : null}
                      </>
                    ) : (
                      <span className="hidden text-slate-300 sm:inline">—</span>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}
