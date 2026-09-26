import { getLocale, getTranslations } from "next-intl/server";
import { EmptyState } from "@/components/ui/card";
import type { Prisma } from "@/generated/prisma/client";
import { Link } from "@/i18n/navigation";
import { displayName, formatDateTime } from "@/lib/format";

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

/** Audit entries as a list: actor, action, target, JST time, data collapsed. */
export async function AuditList({ rows }: { rows: AuditRow[] }) {
  const t = await getTranslations("adminMembers.auditLog");
  const locale = (await getLocale()) === "en" ? "en" : "ja";
  if (rows.length === 0) return <EmptyState>{t("empty")}</EmptyState>;

  return (
    <ol className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
      {rows.map((r) => {
        const actorLabel = r.actor
          ? r.actor.nameRomaji || r.actor.nameKanji
            ? displayName(r.actor, locale)
            : (r.actor.primaryEmail ?? r.actor.id)
          : t("system");
        const hasData =
          r.data !== null &&
          !(
            typeof r.data === "object" && Object.keys(r.data ?? {}).length === 0
          );
        return (
          <li key={r.id} className="space-y-1 p-3 text-sm">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <code className="font-mono font-semibold text-slate-900">
                {r.action}
              </code>
              <time
                dateTime={r.createdAt.toISOString()}
                className="text-xs text-slate-500"
              >
                {formatDateTime(r.createdAt, locale)} JST
              </time>
            </div>
            <dl className="grid grid-cols-[auto_1fr] gap-x-2 text-slate-700">
              <dt className="text-slate-500">{t("actor")}</dt>
              <dd className="break-all">
                {r.actorId && r.actor ? (
                  <Link
                    href={`/admin/members/${r.actorId}`}
                    className="text-brand-700 underline"
                  >
                    {actorLabel}
                  </Link>
                ) : (
                  actorLabel
                )}
              </dd>
              {r.targetId ? (
                <>
                  <dt className="text-slate-500">{t("target")}</dt>
                  <dd className="break-all">
                    {r.targetType ? `${r.targetType} ` : ""}
                    {r.targetType === "User" ? (
                      <Link
                        href={`/admin/members/${r.targetId}`}
                        className="font-mono text-xs text-brand-700 underline"
                      >
                        {r.targetId}
                      </Link>
                    ) : (
                      <span className="font-mono text-xs">{r.targetId}</span>
                    )}
                  </dd>
                </>
              ) : null}
            </dl>
            {hasData ? (
              <details>
                <summary className="cursor-pointer text-xs text-brand-700">
                  {t("data")}
                </summary>
                <pre className="mt-1 max-h-64 overflow-auto rounded bg-slate-50 p-2 text-xs whitespace-pre-wrap break-all">
                  {JSON.stringify(r.data, null, 2)}
                </pre>
              </details>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
