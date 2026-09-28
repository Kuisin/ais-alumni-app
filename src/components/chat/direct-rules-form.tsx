"use client";

import { useTranslations } from "next-intl";
import { useActionState, useId } from "react";
import {
  type DirectRulesFormState,
  saveDirectRulesAction,
} from "@/app/actions/chat-reports";
import { Alert } from "@/components/ui/card";
import { Field, Select } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import type { DirectChatRule, RoleKey } from "@/generated/prisma/enums";
import { DIRECT_RULE_ROLES, DIRECT_RULE_VALUES } from "@/lib/direct-policy";

/** Admin: who each member type may have 1:1 talks with. */
export function DirectRulesForm({
  rules,
}: {
  rules: Record<RoleKey, DirectChatRule>;
}) {
  const t = useTranslations("chat.admin");
  const tr = useTranslations("roles.role");
  const uid = useId();
  const [state, action] = useActionState<DirectRulesFormState, FormData>(
    saveDirectRulesAction,
    null,
  );
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {DIRECT_RULE_ROLES.map((role) => (
          <Field key={role} id={`${uid}-${role}`} label={tr(role)}>
            {(a) => (
              <Select {...a} name={`rule.${role}`} defaultValue={rules[role]}>
                {DIRECT_RULE_VALUES.map((v) => (
                  <option key={v} value={v}>
                    {t(`rules.${v}`)}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        ))}
      </div>
      <div aria-live="polite">
        {state?.ok ? <Alert tone="success">{t("saved")}</Alert> : null}
        {state?.error ? <Alert tone="error">{t("saveError")}</Alert> : null}
      </div>
      <SubmitButton pendingText={t("saving")}>{t("save")}</SubmitButton>
    </form>
  );
}
