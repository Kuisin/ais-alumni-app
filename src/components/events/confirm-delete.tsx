"use client";

import { Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef } from "react";
import { SubmitButton } from "@/components/ui/submit-button";

/**
 * Delete form with a browser confirmation (used by the event and news editors).
 * With `formId` it renders only the (empty) form, so a `<DeleteButton>` placed
 * inside another form — e.g. the editor's sticky action bar — can submit it
 * via the `form` attribute (forms cannot be nested).
 */
export function ConfirmDeleteForm({
  action,
  id,
  message,
  formId,
}: {
  action: (fd: FormData) => Promise<void>;
  id: string;
  message: string;
  formId?: string;
}) {
  const t = useTranslations("common");
  const sent = useRef(false);
  return (
    <form
      id={formId}
      action={action}
      hidden={formId ? true : undefined}
      onSubmit={(e) => {
        if (sent.current || !window.confirm(message)) {
          e.preventDefault();
          return;
        }
        sent.current = true;
      }}
    >
      <input type="hidden" name="id" value={id} />
      {formId ? null : (
        <SubmitButton variant="danger" pendingText={t("loading")}>
          {t("delete")}
        </SubmitButton>
      )}
    </form>
  );
}

/**
 * Outlined danger button that submits the `ConfirmDeleteForm` with `formId`.
 * Icon-only on phones (keeps the sticky bar to one row), labelled from `sm`.
 */
export function DeleteButton({ formId }: { formId: string }) {
  const t = useTranslations("common");
  return (
    <button
      type="submit"
      form={formId}
      className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-2 rounded-lg border border-red-300 bg-white px-3 py-2 text-sm font-semibold text-red-700 transition-colors hover:border-red-400 hover:bg-red-50 sm:px-4"
    >
      <Trash2 aria-hidden="true" className="size-4" />
      <span className="sr-only sm:not-sr-only">{t("delete")}</span>
    </button>
  );
}
