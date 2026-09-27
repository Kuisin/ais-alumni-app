"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import {
  type SettingsFormState,
  updateLanguageAction,
} from "@/app/actions/settings";
import { SubmitButton } from "@/components/ui/submit-button";
import { useCloseOnSave } from "@/components/ui/view-edit";
import { FormResult } from "./form-result";

export function LanguageForm({ current }: { current: "ja" | "en" }) {
  const t = useTranslations("settings.language");
  const tc = useTranslations("common");
  const [state, action] = useActionState<SettingsFormState, FormData>(
    updateLanguageAction,
    {},
  );
  useCloseOnSave(state);
  return (
    <form action={action} className="space-y-3">
      <fieldset>
        <legend className="sr-only">{t("label")}</legend>
        <div className="flex flex-col gap-2 sm:flex-row sm:gap-6">
          {(["ja", "en"] as const).map((l) => (
            <label
              key={l}
              lang={l}
              className="flex min-h-11 cursor-pointer items-center gap-2"
            >
              <input
                type="radio"
                name="locale"
                value={l}
                defaultChecked={current === l}
                className="size-5"
              />
              <span>{t(l)}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <FormResult state={state} />
      <SubmitButton pendingText={tc("saving")}>{t("save")}</SubmitButton>
    </form>
  );
}
