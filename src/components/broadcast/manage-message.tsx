"use client";

import { Archive, ArchiveRestore, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState } from "react";
import {
  deleteBroadcastAction,
  editBroadcastAction,
  type ManageMessageState,
  setBroadcastArchivedAction,
} from "@/app/actions/broadcasts";
import { Badge, Card } from "@/components/ui/card";
import { ConfirmForm } from "@/components/ui/confirm-form";
import { Field, Input, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { useCloseOnSave } from "@/components/ui/view-edit";

/** Edit a sent message's title and body (inside its EditableCard). */
export function ManageMessageForm({
  id,
  title,
  body,
}: {
  id: string;
  title: string;
  body: string;
}) {
  const t = useTranslations("broadcast.manage");
  const [state, action] = useActionState<ManageMessageState, FormData>(
    editBroadcastAction,
    null,
  );
  useCloseOnSave(state, t("saved"));
  const err = (k: "title" | "body") =>
    state?.fieldErrors?.[k] ? t(`errors.${state.fieldErrors[k]}`) : null;

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="id" value={id} />
      <Field
        id={`edit-title-${id}`}
        label={t("fieldTitle")}
        required
        error={err("title")}
      >
        {(a) => (
          <Input {...a} name="title" defaultValue={title} maxLength={100} />
        )}
      </Field>
      <Field
        id={`edit-body-${id}`}
        label={t("fieldBody")}
        required
        error={err("body")}
        hint={t("editHint")}
      >
        {(a) => (
          <Textarea
            {...a}
            name="body"
            defaultValue={body}
            rows={6}
            maxLength={2000}
          />
        )}
      </Field>
      <SubmitButton className="w-full sm:w-auto">{t("save")}</SubmitButton>
    </form>
  );
}

/** Sender / admin tools for a sent message: archive and delete. */
export function ManageMessage({
  id,
  archived,
  edited,
}: {
  id: string;
  archived: boolean;
  edited: boolean;
}) {
  const t = useTranslations("broadcast.manage");
  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold">{t("title")}</h2>
        {archived ? <Badge tone="amber">{t("archivedBadge")}</Badge> : null}
        {edited ? <Badge>{t("editedBadge")}</Badge> : null}
      </div>
      {archived ? (
        <p className="text-sm text-slate-600">{t("archivedHint")}</p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <form action={setBroadcastArchivedAction}>
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="archive" value={archived ? "0" : "1"} />
          <SubmitButton variant="secondary">
            {archived ? (
              <ArchiveRestore aria-hidden="true" className="size-4" />
            ) : (
              <Archive aria-hidden="true" className="size-4" />
            )}
            {archived ? t("restore") : t("archive")}
          </SubmitButton>
        </form>
        <ConfirmForm
          message={t("deleteConfirm")}
          action={deleteBroadcastAction}
        >
          <input type="hidden" name="id" value={id} />
          <SubmitButton variant="danger">
            <Trash2 aria-hidden="true" className="size-4" />
            {t("delete")}
          </SubmitButton>
        </ConfirmForm>
      </div>
    </Card>
  );
}
