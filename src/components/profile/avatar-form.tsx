"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { removeAvatarAction, uploadAvatarAction } from "@/app/actions/profile";
import { Avatar } from "@/components/ui/avatar";
import { Field, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { ResultMessage } from "./profile-form";

export function AvatarForm({
  src,
  name,
}: {
  src: string | null;
  name: string;
}) {
  const t = useTranslations("profile");
  const [state, action] = useActionState(uploadAvatarAction, null);
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
      <Avatar src={src} name={name} size={96} />
      <div className="flex-1 space-y-3">
        <form action={action} className="space-y-3">
          <Field
            id="avatar"
            label={t("fields.avatar")}
            hint={t("hints.avatar")}
            error={state?.fields?.includes("avatar") ? t(state.message) : null}
          >
            {(a) => (
              <Input
                {...a}
                name="avatar"
                type="file"
                accept="image/jpeg,image/png"
              />
            )}
          </Field>
          <div className="flex flex-wrap items-center gap-3">
            <SubmitButton variant="secondary" pendingText={t("uploading")}>
              {t("photoUpload")}
            </SubmitButton>
            {state?.ok ? <ResultMessage state={state} ns={t} /> : null}
          </div>
        </form>
        {src ? (
          <form action={removeAvatarAction}>
            <SubmitButton variant="ghost">{t("photoRemove")}</SubmitButton>
          </form>
        ) : null}
      </div>
    </div>
  );
}
