"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { updateAvatarSettingsAction } from "@/app/actions/profile";
import { CHOICE_CARD } from "@/components/events/target-roles-field";
import { SubmitButton } from "@/components/ui/submit-button";
import { useCloseOnSave } from "@/components/ui/view-edit";
import { ResultMessage } from "./profile-form";

/** 「写真を全員に公開」. */
export function AvatarSettingsForm({
  avatarPublic,
}: {
  avatarPublic: boolean;
}) {
  const t = useTranslations("profile.photo");
  const tp = useTranslations("profile");
  const [state, action] = useActionState(updateAvatarSettingsAction, null);
  useCloseOnSave(state);
  return (
    <form action={action} className="space-y-4">
      <label className={CHOICE_CARD}>
        <input
          type="checkbox"
          name="avatarPublic"
          defaultChecked={avatarPublic}
          className="size-5 shrink-0 accent-brand-700"
        />
        <span className="text-sm">
          <span className="block font-medium">{t("public")}</span>
          <span className="block text-slate-600">{t("publicHint")}</span>
        </span>
      </label>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
        <ResultMessage state={state} ns={tp} />
        <SubmitButton pendingText={tp("saving")}>{tp("save")}</SubmitButton>
      </div>
    </form>
  );
}
