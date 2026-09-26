import { getTranslations } from "next-intl/server";
import { buttonClass } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { type SetupItem, setupProgress } from "@/lib/setup";

/**
 * "Get set up" checklist with progress. Each open task says why it helps
 * and links straight to where it's done.
 */
export async function SetupChecklist({
  items,
  title,
}: {
  items: SetupItem[];
  title?: string;
}) {
  const t = await getTranslations("setup");
  const { done, total, complete } = setupProgress(items);
  const next = items.find((i) => !i.done && i.href);
  return (
    <section
      aria-labelledby="setup-heading"
      className="animate-rise mb-6 space-y-4 rounded-2xl border border-brand-100 bg-white p-4 shadow-sm sm:p-5"
    >
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 id="setup-heading" className="text-lg font-bold">
            {title ?? t("title")}
          </h2>
          <p className="text-sm text-slate-600">
            {complete ? t("complete") : t("intro")}
          </p>
        </div>
        <p className="text-sm font-semibold text-brand-800" aria-live="polite">
          {t("progress", { done, total })}
        </p>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-slate-100"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={done}
        aria-label={t("progressLabel")}
      >
        <div
          className="h-full rounded-full bg-brand-700 transition-[width] duration-700 ease-out"
          style={{ width: `${(done / total) * 100}%` }}
        />
      </div>
      <ol className="space-y-2">
        {items.map((item, i) => (
          <li
            key={item.key}
            style={{ animationDelay: `${i * 40}ms` }}
            className={`animate-rise flex items-start gap-3 rounded-xl p-3 ${item.done ? "bg-slate-50" : "bg-brand-50/60"}`}
          >
            <span
              aria-hidden="true"
              className={`mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                item.done
                  ? "animate-pop bg-green-600 text-white"
                  : "border-2 border-slate-300 bg-white text-transparent"
              }`}
            >
              ✓
            </span>
            <div className="min-w-0 flex-1">
              <p
                className={`font-medium ${item.done ? "text-slate-500 line-through decoration-slate-300" : ""}`}
              >
                {t(`items.${item.key}.title`)}
                <span className="sr-only">
                  {" "}
                  — {item.done ? t("done") : t("todo")}
                </span>
              </p>
              {!item.done ? (
                <p className="text-sm text-slate-600">
                  {t(`items.${item.key}.body`)}
                </p>
              ) : null}
            </div>
            {!item.done && item.href ? (
              <Link
                href={item.href}
                className={buttonClass(
                  item === next ? "primary" : "secondary",
                  "shrink-0 px-3 text-xs",
                )}
              >
                {t(`items.${item.key}.action`)}
              </Link>
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  );
}
