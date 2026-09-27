"use client";

import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/components/ui/cn";

/** 「第5期」「学年代表」 next to a name. */
export function MemberTags({
  cohort,
  rep,
  className,
}: {
  cohort?: number | null;
  rep?: boolean;
  className?: string;
}) {
  const t = useTranslations("chat");
  const locale = useLocale();
  if (!cohort && !rep) return null;
  return (
    <span className={cn("inline-flex flex-wrap gap-1", className)}>
      {cohort ? (
        <span className="rounded bg-slate-200 px-1.5 text-[10px] leading-4 font-medium text-slate-700">
          {locale === "en" ? `Class ${cohort}` : `第${cohort}期`}
        </span>
      ) : null}
      {rep ? (
        <span className="rounded bg-brand-100 px-1.5 text-[10px] leading-4 font-semibold text-brand-800">
          {t("rep")}
        </span>
      ) : null}
    </span>
  );
}
