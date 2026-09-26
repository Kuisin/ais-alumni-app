"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { confirmStageAction, updateStageAction } from "@/app/actions/profile";
import { Field, Select, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { LifeStage } from "@/generated/prisma/enums";
import { ResultMessage } from "./profile-form";

/** Current stage (§7). Linked from the April 1 prompt as /profile/edit#stage. */
export function StageForm({
  stage,
  detail,
  updatedLabel,
}: {
  stage: LifeStage | null;
  detail: string;
  /** Pre-formatted "last confirmed" date, or null if never set. */
  updatedLabel: string | null;
}) {
  const t = useTranslations("profile");
  const tr = useTranslations("roles");
  const [state, action] = useActionState(updateStageAction, null);
  const [confirmState, confirmAction] = useActionState(
    confirmStageAction,
    null,
  );
  const err = (f: string) =>
    state?.fields?.includes(f) ? t("errors.invalid") : null;

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        {updatedLabel
          ? t("stageUpdated", { date: updatedLabel })
          : t("stageNeverConfirmed")}
      </p>
      <form action={action} className="space-y-4">
        <Field
          id="currentStage"
          label={t("fields.stage")}
          required
          error={err("currentStage")}
        >
          {(a) => (
            <Select {...a} name="currentStage" defaultValue={stage ?? ""}>
              <option value="" disabled>
                {t("stageChoose")}
              </option>
              {Object.values(LifeStage).map((s) => (
                <option key={s} value={s}>
                  {tr(`stage.${s}`)}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field
          id="currentStageDetail"
          label={t("fields.stageDetail")}
          hint={t("hints.stageDetail")}
          error={err("currentStageDetail")}
        >
          {(a) => (
            <Textarea
              {...a}
              name="currentStageDetail"
              rows={2}
              defaultValue={detail}
              maxLength={200}
            />
          )}
        </Field>
        <div className="flex flex-wrap items-center gap-3">
          <SubmitButton pendingText={t("saving")}>
            {t("stageSave")}
          </SubmitButton>
          <ResultMessage state={state} ns={t} />
        </div>
      </form>
      {stage ? (
        <form
          action={confirmAction}
          className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4"
        >
          <SubmitButton variant="secondary" pendingText={t("saving")}>
            {t("stageConfirm")}
          </SubmitButton>
          <ResultMessage state={confirmState} ns={t} />
        </form>
      ) : null}
    </div>
  );
}
