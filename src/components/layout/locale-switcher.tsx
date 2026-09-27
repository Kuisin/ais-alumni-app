"use client";

import { Languages } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";
import { setLocaleAction } from "@/app/actions/common";
import { usePathname, useRouter } from "@/i18n/navigation";

export function LocaleSwitcher() {
  const locale = useLocale();
  const t = useTranslations("common");
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const next = locale === "ja" ? "en" : "ja";

  return (
    <button
      type="button"
      lang={next}
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await setLocaleAction(next);
          router.replace(pathname, { locale: next });
        })
      }
      className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-slate-700 hover:bg-slate-100"
      aria-label={t("switchLanguage")}
    >
      <Languages aria-hidden="true" className="size-4" />
      {next === "ja" ? "日本語" : "English"}
    </button>
  );
}
