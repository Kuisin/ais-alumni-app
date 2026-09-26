"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import {
  mergeOrgAction,
  type OrgAdminState,
  renameOrgAction,
} from "@/app/actions/admin-orgs";
import { Alert } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import type { OrgKind } from "@/lib/organizations";
import { OrgCombobox } from "./org-combobox";

function Result({ state }: { state: OrgAdminState }) {
  const t = useTranslations("organizations");
  return (
    <div aria-live="polite">
      {state?.message ? (
        <Alert tone={state.ok ? "success" : "error"}>{t(state.message)}</Alert>
      ) : null}
    </div>
  );
}

export function OrgRenameForm({
  kind,
  id,
  name,
}: {
  kind: OrgKind;
  id: string;
  name: string;
}) {
  const t = useTranslations("organizations");
  const [state, action] = useActionState<OrgAdminState, FormData>(
    renameOrgAction,
    null,
  );
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="id" value={id} />
      <Field id={`rename-${id}`} label={t("rename")}>
        {(a) => (
          <Input {...a} name="name" defaultValue={name} maxLength={120} />
        )}
      </Field>
      <Result state={state} />
      <SubmitButton variant="secondary">{t("save")}</SubmitButton>
    </form>
  );
}

/** Pick the correct entry; this one's members move there and it is removed. */
export function OrgMergeForm({ kind, id }: { kind: OrgKind; id: string }) {
  const t = useTranslations("organizations");
  const [state, action] = useActionState<OrgAdminState, FormData>(
    mergeOrgAction,
    null,
  );
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="id" value={id} />
      <OrgCombobox kind={kind} id={`merge-${id}`} label={t("mergeInto")} />
      <Result state={state} />
      <SubmitButton variant="danger">{t("merge")}</SubmitButton>
    </form>
  );
}
