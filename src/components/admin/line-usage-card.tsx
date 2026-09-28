import { getTranslations } from "next-intl/server";
import { Alert, Card } from "@/components/ui/card";
import { cn } from "@/components/ui/cn";
import { lineQuota, lineSendsByCategory } from "@/lib/line-usage";

/**
 * This month's LINE messages: LINE's own count against the plan's limit,
 * and what this app sent them for (NotificationLog).
 */
export async function LineUsageCard() {
  const t = await getTranslations("line.usage");
  const tc = await getTranslations("notifications.categories");
  const now = new Date();
  const [quota, byCategory] = await Promise.all([
    lineQuota(),
    lineSendsByCategory(now),
  ]);
  const logged = byCategory.reduce((n, r) => n + r.count, 0);
  const share =
    quota?.limit && quota.limit > 0 ? quota.used / quota.limit : null;
  const tone =
    share === null
      ? "bg-brand-700"
      : share >= 0.9
        ? "bg-red-600"
        : share >= 0.7
          ? "bg-amber-500"
          : "bg-green-600";

  return (
    <Card className="space-y-4">
      <h2 className="text-lg font-semibold">{t("title")}</h2>
      {quota ? (
        <div className="space-y-2">
          <p className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-3xl font-bold tabular-nums">
              {quota.used.toLocaleString()}
            </span>
            <span className="text-slate-600">
              {quota.limit !== null
                ? t("ofLimit", { limit: quota.limit.toLocaleString() })
                : t("noLimit")}
            </span>
          </p>
          {share !== null ? (
            <>
              <div
                role="progressbar"
                aria-label={t("title")}
                aria-valuemin={0}
                aria-valuemax={quota.limit ?? 0}
                aria-valuenow={quota.used}
                className="h-2 overflow-hidden rounded-full bg-slate-100"
              >
                <div
                  className={cn("h-full rounded-full", tone)}
                  style={{ width: `${Math.min(100, share * 100)}%` }}
                />
              </div>
              <p className="text-sm text-slate-600">
                {t("remaining", {
                  count: Math.max(0, (quota.limit ?? 0) - quota.used),
                })}
              </p>
            </>
          ) : null}
          {share !== null && share >= 0.9 ? (
            <Alert tone="warning">{t("nearLimit")}</Alert>
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-slate-600">{t("unavailable")}</p>
      )}

      <div className="space-y-2 border-t border-slate-100 pt-3">
        <h3 className="text-sm font-semibold">
          {t("byCategory", { count: logged })}
        </h3>
        {byCategory.length ? (
          <ul className="space-y-1 text-sm">
            {byCategory.map((r) => (
              <li
                key={r.category}
                className="flex items-center justify-between gap-3"
              >
                <span>
                  {r.category === "other" ? t("other") : tc(r.category)}
                </span>
                <span className="tabular-nums">{r.count.toLocaleString()}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">{t("none")}</p>
        )}
      </div>
      <p className="text-xs text-slate-500">{t("hint")}</p>
    </Card>
  );
}
