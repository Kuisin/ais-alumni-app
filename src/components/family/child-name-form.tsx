"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { claimChildByNameAction } from "@/app/actions/family";
import { Field, Input, Select } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import type { CohortChoice } from "@/lib/cohorts";

/**
 * Parent adds a child who has no account yet; an admin confirms (§8). The
 * child's 学年 and leave year decide whether the parent is current/former.
 */
export function ChildNameForm({ cohorts }: { cohorts: CohortChoice[] }) {
  const t = useTranslations("family");
  const [state, action] = useActionState(claimChildByNameAction, null);
  return (
    <form action={action} className="space-y-3">
      <Field
        id="childName"
        label={t("claimChild.manualLabel")}
        hint={t("claimChild.manualHint")}
        required
      >
        {(a) => (
          <Input {...a} name="childName" maxLength={100} autoComplete="off" />
        )}
      </Field>
      <Field
        id="childCohort"
        label={t("claimChild.cohort")}
        hint={t("claimChild.cohortHint")}
        required
      >
        {(a) => (
          <Select {...a} name="cohortNumber" defaultValue="">
            <option value="">{t("claimChild.chooseCohort")}</option>
            {cohorts.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field
        id="childLeftYear"
        label={t("claimChild.leftYear")}
        hint={t("claimChild.leftYearHint")}
      >
        {(a) => (
          <Input
            {...a}
            name="leftYear"
            inputMode="numeric"
            maxLength={4}
            className="max-w-40"
          />
        )}
      </Field>
      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton variant="secondary" pendingText={t("working")}>
          {t("claimChild.manualSubmit")}
        </SubmitButton>
        <p
          aria-live="polite"
          className={
            state?.ok ? "text-sm text-green-800" : "text-sm text-red-700"
          }
        >
          {state ? t(state.message) : null}
        </p>
      </div>
    </form>
  );
}
