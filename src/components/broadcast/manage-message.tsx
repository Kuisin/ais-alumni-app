"use client";

import { Archive, ArchiveRestore, PenLine, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState, useEffect, useState } from "react";
import {
  deleteBroadcastAction,
  editBroadcastAction,
  type ManageMessageState,
  setBroadcastArchivedAction,
} from "@/app/actions/broadcasts";
import { Button } from "@/components/ui/button";
import { Alert, Badge, Card } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

/** Sender / admin tools for a sent message: edit, archive, delete. */
export function ManageMessage({
  id,
  title,
  body,
  archived,
  edited,
}: {
  id: string;
  title: string;
  body: string;
  archived: boolean;
  edited: boolean;
}) {
  const t = useTranslations("broadcast.manage");
  const [editing, setEditing] = useState(false);
  const [state, action] = useActionState<ManageMessageState, FormData>(
    editBroadcastAction,
    null,
  );
  useEffect(() => {
    if (state?.ok) setEditing(false);
  }, [state]);
  const err = (k: "title" | "body") =>
    state?.fieldErrors?.[k] ? t(`errors.${state.fieldErrors[k]}`) : null;

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
      {state?.ok ? <Alert tone="success">{t("saved")}</Alert> : null}

      {editing ? (
        <form action={action} className="animate-rise space-y-3">
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
          <div className="flex flex-wrap gap-2">
            <SubmitButton className="w-full sm:w-auto">
              {t("save")}
            </SubmitButton>
            <Button variant="ghost" onClick={() => setEditing(false)}>
              {t("cancel")}
            </Button>
          </div>
        </form>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setEditing(true)}>
            <PenLine aria-hidden="true" className="size-4" />
            {t("edit")}
          </Button>
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
          <form
            action={deleteBroadcastAction}
            onSubmit={(e) => {
              if (!window.confirm(t("deleteConfirm"))) e.preventDefault();
            }}
          >
            <input type="hidden" name="id" value={id} />
            <SubmitButton variant="danger">
              <Trash2 aria-hidden="true" className="size-4" />
              {t("delete")}
            </SubmitButton>
          </form>
        </div>
      )}
    </Card>
  );
}
