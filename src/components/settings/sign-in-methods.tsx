"use client";

import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";
import {
  linkGoogleAction,
  removeSignInMethodAction,
  type SettingsFormState,
} from "@/app/actions/settings";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/card";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormResult } from "./form-result";

export type MethodRow = {
  method: "email" | "google" | "line";
  linked: boolean;
  removable: boolean;
};

export function SignInMethods({
  rows,
  email,
}: {
  rows: MethodRow[];
  email: string | null;
}) {
  const t = useTranslations("settings.methods");
  const tc = useTranslations("common");
  const [state, action] = useActionState<SettingsFormState, FormData>(
    removeSignInMethodAction,
    {},
  );
  const [confirming, setConfirming] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200">
        {rows.map((row) => (
          <li
            key={row.method}
            className="flex flex-wrap items-center justify-between gap-3 p-3"
          >
            <div className="min-w-0">
              <p className="flex items-center gap-2 font-medium">
                {t(row.method)}
                <Badge tone={row.linked ? "green" : "slate"}>
                  {row.linked ? t("linked") : t("notLinked")}
                </Badge>
              </p>
              {row.method === "email" && email ? (
                <p className="text-sm break-all text-slate-600">
                  {t("emailHint", { email })}
                </p>
              ) : null}
              {row.method === "line" && !row.linked ? (
                <p className="text-sm text-slate-600">{t("addLineHint")}</p>
              ) : null}
            </div>

            {row.method === "google" && !row.linked ? (
              <form action={linkGoogleAction}>
                <SubmitButton variant="secondary" pendingText={tc("loading")}>
                  {t("addGoogle")}
                </SubmitButton>
              </form>
            ) : null}

            {row.linked && row.method !== "email" ? (
              confirming === row.method ? (
                <form
                  action={action}
                  className="w-full space-y-2 rounded-lg bg-red-50 p-3"
                >
                  <input type="hidden" name="provider" value={row.method} />
                  <p className="text-sm font-medium text-red-900">
                    {t("removeConfirm", { method: t(row.method) })}
                  </p>
                  {row.method === "line" ? (
                    <p className="text-sm text-red-900">
                      {t("removeLineNote")}
                    </p>
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                    <SubmitButton variant="danger" pendingText={tc("saving")}>
                      {t("confirmRemove")}
                    </SubmitButton>
                    <Button
                      variant="secondary"
                      onClick={() => setConfirming(null)}
                    >
                      {tc("cancel")}
                    </Button>
                  </div>
                </form>
              ) : row.removable ? (
                <Button
                  variant="ghost"
                  onClick={() => setConfirming(row.method)}
                >
                  {t("remove")}
                </Button>
              ) : (
                <p className="text-xs text-slate-500">
                  {t("cannotRemoveLast")}
                </p>
              )
            ) : null}
          </li>
        ))}
      </ul>
      <FormResult state={state} />
    </div>
  );
}
