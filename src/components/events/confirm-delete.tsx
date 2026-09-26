"use client";

import { useTranslations } from "next-intl";
import { SubmitButton } from "@/components/ui/submit-button";

/** Delete form with a browser confirmation (used by the event and news editors). */
export function ConfirmDeleteForm({
  action,
  id,
  message,
}: {
  action: (fd: FormData) => Promise<void>;
  id: string;
  message: string;
}) {
  const t = useTranslations("common");
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <SubmitButton variant="danger" pendingText={t("loading")}>
        {t("delete")}
      </SubmitButton>
    </form>
  );
}
