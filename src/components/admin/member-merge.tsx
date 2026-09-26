"use client";

import { useLocale, useTranslations } from "next-intl";
import { useActionState } from "react";
import {
  type AdminMemberFormState,
  type MergeSide,
  mergeMembersAction,
} from "@/app/actions/admin-members";
import { Badge } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { formatDate } from "@/lib/format";
import { AdminFormResult } from "./form-result";

function SideCard({
  side,
  label,
  tone,
}: {
  side: MergeSide;
  label: string;
  tone: "green" | "red";
}) {
  const t = useTranslations("adminMembers");
  const tr = useTranslations("roles");
  const locale = useLocale() === "en" ? "en" : "ja";
  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <p className="mb-2">
        <Badge tone={tone}>{label}</Badge>
      </p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
        <dt className="text-slate-600">{t("columns.name")}</dt>
        <dd className="break-words">{side.name}</dd>
        <dt className="text-slate-600">{t("columns.email")}</dt>
        <dd className="break-all">{side.email ?? "—"}</dd>
        <dt className="text-slate-600">{t("columns.state")}</dt>
        <dd>{tr(`state.${side.state}`)}</dd>
        <dt className="text-slate-600">{t("columns.roles")}</dt>
        <dd>{side.roles.map((r) => tr(`role.${r}`)).join(", ") || "—"}</dd>
        <dt className="text-slate-600">{t("detail.providers")}</dt>
        <dd>{side.providers.join(", ") || "—"}</dd>
        <dt className="text-slate-600">{t("columns.created")}</dt>
        <dd>{formatDate(new Date(side.createdAt), locale)}</dd>
        <dt className="text-slate-600">ID</dt>
        <dd className="font-mono text-xs break-all">{side.id}</dd>
      </dl>
    </div>
  );
}

export function MemberMerge({ userId }: { userId: string }) {
  const t = useTranslations("adminMembers.merge");
  const tc = useTranslations("common");
  const [state, action] = useActionState<AdminMemberFormState, FormData>(
    mergeMembersAction,
    {},
  );

  if (state.preview) {
    const { keep, duplicate } = state.preview;
    return (
      <form action={action} className="space-y-4">
        <input type="hidden" name="keepId" value={keep.id} />
        <input type="hidden" name="duplicateId" value={duplicate.id} />
        <h3 className="font-semibold">{t("confirmTitle")}</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <SideCard side={keep} label={t("keepLabel")} tone="green" />
          <SideCard side={duplicate} label={t("duplicateLabel")} tone="red" />
        </div>
        <p className="text-sm text-slate-700">{t("whatHappens")}</p>
        <AdminFormResult state={state} />
        <div className="flex flex-wrap gap-2">
          <SubmitButton
            name="intent"
            value="confirm"
            variant="danger"
            pendingText={t("working")}
          >
            {t("confirm")}
          </SubmitButton>
          <SubmitButton name="intent" value="cancel" variant="secondary">
            {tc("cancel")}
          </SubmitButton>
        </div>
      </form>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="userId" value={userId} />
      <Field id="merge-other" label={t("other")} hint={t("otherHint")} required>
        {(a) => <Input {...a} name="other" autoComplete="off" />}
      </Field>
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-slate-800">
          {t("keep")}
        </legend>
        <label className="flex min-h-11 items-center gap-2">
          <input
            type="radio"
            name="keep"
            value="this"
            defaultChecked
            className="size-5"
          />
          {t("keepThis")}
        </label>
        <label className="flex min-h-11 items-center gap-2">
          <input type="radio" name="keep" value="other" className="size-5" />
          {t("keepOther")}
        </label>
      </fieldset>
      <AdminFormResult state={state} />
      <SubmitButton
        name="intent"
        value="preview"
        variant="secondary"
        pendingText={tc("loading")}
      >
        {t("preview")}
      </SubmitButton>
    </form>
  );
}
