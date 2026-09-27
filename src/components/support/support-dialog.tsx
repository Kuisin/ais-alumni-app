"use client";

import { LifeBuoy, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useRef, useState } from "react";
import { usePathname } from "@/i18n/navigation";
import { SupportForm } from "./support-form";

/**
 * 「質問・エラーを送る」: opens the support form in a dialog, so members in
 * the middle of a step (e.g. onboarding) can ask without leaving it. The
 * page they were on goes with the request.
 */
export function SupportDialog({
  defaults,
  compact = false,
}: {
  defaults: { name: string; email: string; type?: string; topic?: string };
  /** icon + short label (header) */
  compact?: boolean;
}) {
  const t = useTranslations("support");
  const ref = useRef<HTMLDialogElement>(null);
  const pathname = usePathname();
  const titleId = useId();
  // The form is mounted only while open (fresh each time; one per page).
  const [open, setOpen] = useState(false);
  const close = () => ref.current?.close();

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          ref.current?.showModal();
        }}
        className={
          compact
            ? "inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-brand-700 hover:bg-brand-50"
            : "inline-flex min-h-11 items-center gap-2 rounded-lg border border-brand-200 bg-white px-4 text-sm font-semibold text-brand-700 hover:bg-brand-50"
        }
      >
        <LifeBuoy aria-hidden="true" className="size-4" />
        {compact ? t("dialog.short") : t("dialog.open")}
      </button>
      <dialog
        ref={ref}
        aria-labelledby={titleId}
        onClose={() => setOpen(false)}
        className="m-auto w-[min(40rem,calc(100vw-1.5rem))] max-h-[90dvh] overflow-y-auto rounded-2xl bg-white p-0 shadow-xl backdrop:bg-slate-900/50"
        onClick={(e) => {
          if (e.target === e.currentTarget) close();
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") close();
        }}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-slate-200 bg-white px-5 py-3">
          <h2 id={titleId} className="text-lg font-semibold">
            {t("dialog.title")}
          </h2>
          <button
            type="button"
            onClick={close}
            aria-label={t("dialog.close")}
            className="inline-flex size-11 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </div>
        <div className="space-y-4 px-5 py-4">
          <p className="text-sm text-slate-700">{t("dialog.intro")}</p>
          {open ? (
            <SupportForm
              signedIn
              defaults={defaults}
              page={pathname}
              onClose={close}
            />
          ) : null}
        </div>
      </dialog>
    </>
  );
}
