import {
  BadgeCheck,
  Camera,
  Check,
  ChevronDown,
  FileText,
  GraduationCap,
  Languages,
  Mail,
  MessageCircle,
  PenLine,
  UserPlus,
  UsersRound,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import { buttonClass } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { type SetupItem, type SetupKey, setupProgress } from "@/lib/setup";

const ICONS: Record<SetupKey, typeof Mail> = {
  email: Mail,
  apply: FileText,
  approval: BadgeCheck,
  line: MessageCircle,
  photo: Camera,
  bio: PenLine,
  history: GraduationCap,
  follow: UserPlus,
  family: UsersRound,
  names: Languages,
};

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
  // Open tasks get full rows; finished ones fold into one line.
  const todo = items.filter((i) => !i.done);
  const finished = items.filter((i) => i.done);
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
      {todo.length ? (
        <ol className="space-y-2">
          {todo.map((item, i) => {
            const Icon = ICONS[item.key];
            return (
              <li
                key={item.key}
                style={{ animationDelay: `${i * 40}ms` }}
                className="animate-rise flex items-start gap-3 rounded-xl bg-brand-50/60 p-3"
              >
                <span
                  aria-hidden="true"
                  className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-white text-brand-700 ring-1 ring-brand-200"
                >
                  <Icon className="size-4" />
                </span>
                <div className="flex min-w-0 flex-1 flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">
                      {t(`items.${item.key}.title`)}
                      {item.recommended ? (
                        <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
                          {t("recommended")}
                        </span>
                      ) : item.optional ? (
                        <span className="ml-2 rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-700">
                          {t("optional")}
                        </span>
                      ) : null}
                      <span className="sr-only"> — {t("todo")}</span>
                    </p>
                    <p className="text-sm text-slate-600">
                      {t(`items.${item.key}.body`)}
                    </p>
                  </div>
                  {!item.href && item.optional ? (
                    <span className="shrink-0 text-xs text-slate-500">
                      {t("afterApproval")}
                    </span>
                  ) : item.href ? (
                    <Link
                      href={item.href}
                      className={buttonClass(
                        item === next ? "primary" : "secondary",
                        "min-w-[7rem] shrink-0 justify-center px-3 text-xs",
                      )}
                    >
                      {t(`items.${item.key}.action`)}
                    </Link>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      ) : null}
      {finished.length ? (
        <details className="group rounded-xl bg-slate-50">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-xl px-3 text-sm font-medium text-slate-700 hover:bg-slate-100 [&::-webkit-details-marker]:hidden">
            <span
              aria-hidden="true"
              className="inline-flex size-6 items-center justify-center rounded-full bg-green-600 text-white"
            >
              <Check className="size-3.5" strokeWidth={3} />
            </span>
            {t("doneSummary", { count: finished.length })}
            <ChevronDown
              aria-hidden="true"
              className="ml-auto size-4 text-slate-500 transition-transform group-open:rotate-180"
            />
          </summary>
          <ul className="space-y-1 px-3 pb-3">
            {finished.map((item) => (
              <li
                key={item.key}
                className="flex items-center gap-2 text-sm text-slate-600"
              >
                <Check
                  aria-hidden="true"
                  className="size-4 shrink-0 text-green-700"
                />
                {t(`items.${item.key}.title`)}
                <span className="sr-only"> — {t("done")}</span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}
