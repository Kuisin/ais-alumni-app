"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import {
  type SettingsFormState,
  updateNotifyViaAction,
} from "@/app/actions/settings";
import { SubmitButton } from "@/components/ui/submit-button";
import type { NotifyChannel } from "@/generated/prisma/enums";
import { FormResult } from "./form-result";

export function NotifyForm({ current }: { current: NotifyChannel }) {
  const t = useTranslations("settings.notifications");
  const tc = useTranslations("common");
  const [state, action] = useActionState<SettingsFormState, FormData>(
    updateNotifyViaAction,
    {},
  );
  const options = [
    { value: "AUTO", label: t("auto"), hint: t("autoHint") },
    { value: "EMAIL_ONLY", label: t("emailOnly"), hint: t("emailOnlyHint") },
  ] as const;
  return (
    <form action={action} className="space-y-3">
      <fieldset className="space-y-2">
        <legend className="sr-only">{t("title")}</legend>
        {options.map((o) => (
          <label
            key={o.value}
            className="flex cursor-pointer gap-3 rounded-lg border border-slate-200 p-3 has-[:checked]:border-brand-700 has-[:checked]:bg-brand-50"
          >
            <input
              type="radio"
              name="notifyVia"
              value={o.value}
              defaultChecked={current === o.value}
              className="mt-0.5 size-5 shrink-0"
              aria-describedby={`notify-${o.value}-hint`}
            />
            <span>
              <span className="block font-medium">{o.label}</span>
              <span
                id={`notify-${o.value}-hint`}
                className="block text-sm text-slate-600"
              >
                {o.hint}
              </span>
            </span>
          </label>
        ))}
      </fieldset>
      <FormResult state={state} />
      <SubmitButton variant="secondary" pendingText={tc("saving")}>
        {t("save")}
      </SubmitButton>
    </form>
  );
}
