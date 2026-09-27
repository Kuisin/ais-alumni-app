"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import {
  installRichMenuAction,
  type RichMenuState,
} from "@/app/actions/line-richmenu";
import { Alert } from "@/components/ui/card";
import { ConfirmForm } from "@/components/ui/confirm-form";
import { SubmitButton } from "@/components/ui/submit-button";

export function RichMenuInstall({ installed }: { installed: boolean }) {
  const t = useTranslations("line.richMenu.admin");
  const [state, action] = useActionState<RichMenuState, FormData>(
    installRichMenuAction,
    {},
  );
  return (
    <ConfirmForm
      message={t("installConfirm")}
      action={action}
      className="space-y-3"
    >
      {state.ok ? (
        <Alert tone="success">
          {t("done", {
            linked: state.linkedEn ?? 0,
            removed: state.removed ?? 0,
          })}
        </Alert>
      ) : null}
      {state.error ? (
        <Alert tone="error">
          {t(`errors.${state.error}`)}
          {state.detail ? (
            <span className="mt-1 block font-mono text-xs break-all">
              {state.detail}
            </span>
          ) : null}
        </Alert>
      ) : null}
      <SubmitButton pendingText={t("installing")}>
        {installed ? t("update") : t("install")}
      </SubmitButton>
    </ConfirmForm>
  );
}
