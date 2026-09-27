"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import {
  type SettingsFormState,
  updateNotifyCategoriesAction,
} from "@/app/actions/settings";
import { CHOICE_CARD } from "@/components/events/target-roles-field";
import { SubmitButton } from "@/components/ui/submit-button";
import { useCloseOnSave } from "@/components/ui/view-edit";
import { OPTIONAL_CATEGORIES } from "@/lib/notify/catalog";
import { FormResult } from "./form-result";

/** Turn notification categories on or off (account notices always come). */
export function NotifyCategoriesForm({ off }: { off: string[] }) {
  const t = useTranslations("notifications");
  const ts = useTranslations("settings.notifications");
  const tc = useTranslations("common");
  const [state, action] = useActionState<SettingsFormState, FormData>(
    updateNotifyCategoriesAction,
    {},
  );
  useCloseOnSave(state);
  return (
    <form action={action} className="space-y-3">
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">{ts("categories")}</legend>
        <label className={`${CHOICE_CARD} opacity-80`}>
          <input
            type="checkbox"
            checked
            disabled
            className="size-5 shrink-0 accent-brand-700"
          />
          <span className="text-sm">
            <span className="block font-medium">{t("categories.account")}</span>
            <span className="block text-slate-600">
              {t("categoryHints.account")}
            </span>
          </span>
        </label>
        {OPTIONAL_CATEGORIES.map((c) => (
          <label key={c} className={CHOICE_CARD}>
            <input
              type="checkbox"
              name="on"
              value={c}
              defaultChecked={!off.includes(c)}
              className="size-5 shrink-0 accent-brand-700"
            />
            <span className="text-sm">
              <span className="block font-medium">{t(`categories.${c}`)}</span>
              <span className="block text-slate-600">
                {t(`categoryHints.${c}`)}
              </span>
            </span>
          </label>
        ))}
      </fieldset>
      <FormResult state={state} />
      <SubmitButton pendingText={tc("saving")}>{tc("save")}</SubmitButton>
    </form>
  );
}
