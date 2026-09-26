"use client";

import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";
import {
  deactivateSelfAction,
  deleteAccountAction,
  type SettingsFormState,
} from "@/app/actions/settings";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormResult } from "./form-result";

export function DeactivateAccount() {
  const t = useTranslations("settings.deactivate");
  const tc = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState<SettingsFormState, FormData>(
    deactivateSelfAction,
    {},
  );
  if (!open) {
    return (
      <Button variant="secondary" onClick={() => setOpen(true)}>
        {t("button")}
      </Button>
    );
  }
  return (
    <form action={action} className="space-y-3 rounded-lg bg-red-50 p-3">
      <input type="hidden" name="confirm" value="yes" />
      <p className="text-sm text-red-900">{t("confirmText")}</p>
      <FormResult state={state} />
      <div className="flex flex-wrap gap-2">
        <SubmitButton variant="danger" pendingText={t("working")}>
          {t("confirmButton")}
        </SubmitButton>
        <Button variant="secondary" onClick={() => setOpen(false)}>
          {tc("cancel")}
        </Button>
      </div>
    </form>
  );
}

export function DeleteAccount() {
  const t = useTranslations("settings.delete");
  const tc = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [word, setWord] = useState("");
  const [state, action] = useActionState<SettingsFormState, FormData>(
    deleteAccountAction,
    {},
  );
  const confirmWord = t("confirmWord");
  if (!open) {
    return (
      <Button variant="danger" onClick={() => setOpen(true)}>
        {t("button")}
      </Button>
    );
  }
  return (
    <form action={action} className="space-y-3 rounded-lg bg-red-50 p-3">
      <Field
        id="delete-word"
        label={t("typeToConfirm", { word: confirmWord })}
        error={state.error}
      >
        {(aria) => (
          <Input
            {...aria}
            name="confirmWord"
            autoComplete="off"
            value={word}
            onChange={(e) => setWord(e.target.value)}
          />
        )}
      </Field>
      <div className="flex flex-wrap gap-2">
        <SubmitButton variant="danger" pendingText={t("working")}>
          {t("confirmButton")}
        </SubmitButton>
        <Button
          variant="secondary"
          onClick={() => {
            setOpen(false);
            setWord("");
          }}
        >
          {tc("cancel")}
        </Button>
      </div>
    </form>
  );
}
