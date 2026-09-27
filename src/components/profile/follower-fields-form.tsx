"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { updateFollowerFieldsAction } from "@/app/actions/profile";
import { CHOICE_CARD } from "@/components/events/target-roles-field";
import { SubmitButton } from "@/components/ui/submit-button";
import { useCloseOnSave } from "@/components/ui/view-edit";
import { PERSONAL_FIELDS, type PersonalField } from "@/lib/personal-fields";
import { ResultMessage } from "./profile-form";

/** 「フォロワーに公開」: one switch per personal field (family always sees). */
export function FollowerFieldsForm({
  shared,
  values,
}: {
  shared: PersonalField[];
  /** current value of each field (shown so members know what they share) */
  values: Partial<Record<PersonalField, string | null>>;
}) {
  const t = useTranslations("profile");
  const [state, action] = useActionState(updateFollowerFieldsAction, null);
  useCloseOnSave(state);
  return (
    <form action={action} className="space-y-3">
      <fieldset className="space-y-2">
        <legend className="mb-1 text-sm text-slate-600">
          {t("followerFields.hint")}
        </legend>
        {PERSONAL_FIELDS.map((f) => (
          <label key={f} className={CHOICE_CARD}>
            <input
              type="checkbox"
              name="share"
              value={f}
              defaultChecked={shared.includes(f)}
              className="size-5 shrink-0 accent-brand-700"
            />
            <span className="min-w-0 text-sm">
              <span className="block font-medium">
                {t(`followerFields.fields.${f}`)}
              </span>
              <span className="block break-all text-slate-600">
                {values[f] || t("followerFields.notSet")}
              </span>
            </span>
          </label>
        ))}
      </fieldset>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
        <ResultMessage state={state} ns={t} />
        <SubmitButton pendingText={t("saving")}>{t("save")}</SubmitButton>
      </div>
    </form>
  );
}
