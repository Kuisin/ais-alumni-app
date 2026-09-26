"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import {
  deleteAllRosterAction,
  type RosterDeleteState,
} from "@/app/actions/roster";
import { Alert } from "@/components/ui/card";
import { SubmitButton } from "@/components/ui/submit-button";

export function RosterDeleteForm() {
  const t = useTranslations("adminVerify");
  const [state, action] = useActionState<RosterDeleteState, FormData>(
    deleteAllRosterAction,
    null,
  );
  return (
    <form action={action} className="space-y-3">
      <label className="flex min-h-11 items-center gap-3 text-sm">
        <input type="checkbox" name="confirm" className="size-5" required />
        {t("roster.deleteConfirm")}
      </label>
      <SubmitButton variant="danger" pendingText={t("saving")}>
        {t("roster.deleteAll")}
      </SubmitButton>
      <div aria-live="polite">
        {state?.message ? (
          <Alert tone={state.ok ? "success" : "error"}>
            {t(`roster.messages.${state.message}`, {
              deleted: state.deleted ?? 0,
            })}
          </Alert>
        ) : null}
      </div>
    </form>
  );
}
