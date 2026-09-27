"use client";

import { Camera } from "lucide-react";
import { useTranslations } from "next-intl";
import { type ChangeEvent, useActionState, useEffect, useState } from "react";
import { removeAvatarAction, uploadAvatarAction } from "@/app/actions/profile";
import { Avatar } from "@/components/ui/avatar";
import { buttonClass } from "@/components/ui/button";
import { ConfirmForm } from "@/components/ui/confirm-form";
import { SubmitButton } from "@/components/ui/submit-button";
import { useCloseOnSave, useViewEdit } from "@/components/ui/view-edit";
import { ResultMessage } from "./profile-form";

export function AvatarForm({
  src,
  name,
  fallback,
}: {
  src: string | null;
  name: string;
  /** default icon shown while there is no photo */
  fallback?: string;
}) {
  const t = useTranslations("profile");
  const [state, action] = useActionState(uploadAvatarAction, null);
  // Inside the photo EditableCard: close it once the photo changed.
  useCloseOnSave(state);
  const card = useViewEdit();
  // Local preview of the chosen file before it is uploaded.
  const [preview, setPreview] = useState<{ url: string; name: string } | null>(
    null,
  );

  useEffect(() => {
    if (!preview) return;
    return () => URL.revokeObjectURL(preview.url);
  }, [preview]);

  // Submitting resets the form (and its file input); drop the preview too.
  useEffect(() => {
    if (state) setPreview(null);
  }, [state]);

  function onPick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setPreview(
      file ? { url: URL.createObjectURL(file), name: file.name } : null,
    );
  }

  const error = state && !state.ok ? t(state.message) : null;

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
      <Avatar src={preview?.url ?? src ?? fallback} name={name} size={96} />
      <div className="w-full flex-1 space-y-3">
        <form action={action} className="space-y-3">
          <div className="space-y-1">
            <input
              id="avatar"
              name="avatar"
              type="file"
              accept="image/jpeg,image/png"
              className="peer sr-only"
              aria-describedby={
                error ? "avatar-hint avatar-error" : "avatar-hint"
              }
              aria-invalid={error ? true : undefined}
              onChange={onPick}
            />
            <label
              htmlFor="avatar"
              className={buttonClass(
                "secondary",
                "w-full cursor-pointer peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand-700 sm:w-auto",
              )}
            >
              <Camera aria-hidden="true" className="size-4" />
              {t("photoChoose")}
            </label>
            <p className="truncate text-sm text-slate-700" aria-live="polite">
              {preview ? t("photoSelected", { name: preview.name }) : null}
            </p>
            <p id="avatar-hint" className="text-sm text-slate-600">
              {t("hints.avatar")}
            </p>
            {error ? (
              <p id="avatar-error" className="text-sm text-red-700">
                {error}
              </p>
            ) : null}
          </div>
          {preview ? (
            <div className="flex flex-wrap items-center gap-3">
              <SubmitButton
                pendingText={t("uploading")}
                className="w-full sm:w-auto"
              >
                {t("photoUpload")}
              </SubmitButton>
            </div>
          ) : null}
          {state?.ok ? <ResultMessage state={state} ns={t} /> : null}
        </form>
        {src && !preview ? (
          <ConfirmForm
            message={t("photoRemoveConfirm")}
            action={async () => {
              await removeAvatarAction();
              card?.done();
            }}
          >
            <SubmitButton variant="ghost">{t("photoRemove")}</SubmitButton>
          </ConfirmForm>
        ) : null}
      </div>
    </div>
  );
}
