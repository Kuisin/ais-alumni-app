"use client";

import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";
import {
  deleteAllRosterAction,
  type RosterDeleteState,
  type RosterImportState,
  rosterImportAction,
} from "@/app/actions/roster";
import { Alert } from "@/components/ui/card";
import { Field, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

const MAX_FILE_BYTES = 5_000_000;

/** Roster CSV import: paste or choose a file, preview, then import (§6.4.1). */
export function RosterImportForm() {
  const t = useTranslations("adminVerify");
  const tr = useTranslations("roles");
  const [state, action] = useActionState<RosterImportState, FormData>(
    rosterImportAction,
    null,
  );
  const [csv, setCsv] = useState("");
  const [fileError, setFileError] = useState(false);

  async function onFile(file: File | undefined) {
    setFileError(false);
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      setFileError(true);
      return;
    }
    setCsv(await file.text());
  }

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-1">
        <label
          htmlFor="roster-file"
          className="block text-sm font-medium text-slate-800"
        >
          {t("roster.file")}
        </label>
        <input
          id="roster-file"
          type="file"
          accept=".csv,text/csv,text/plain"
          onChange={(e) => void onFile(e.currentTarget.files?.[0])}
          className="block w-full text-sm file:mr-3 file:min-h-11 file:rounded-lg file:border-0 file:bg-brand-50 file:px-4 file:font-semibold file:text-brand-800"
        />
        {fileError ? (
          <p className="text-sm text-red-700">{t("roster.fileTooLarge")}</p>
        ) : null}
      </div>
      <Field
        id="roster-csv"
        label={t("roster.paste")}
        hint={t("roster.columns")}
      >
        {(aria) => (
          <Textarea
            {...aria}
            name="csv"
            rows={8}
            value={csv}
            onChange={(e) => setCsv(e.target.value)}
            className="font-mono text-sm"
            spellCheck={false}
          />
        )}
      </Field>
      <div className="flex flex-wrap gap-2">
        <SubmitButton
          variant="secondary"
          name="intent"
          value="preview"
          pendingText={t("saving")}
        >
          {t("roster.preview")}
        </SubmitButton>
        <SubmitButton name="intent" value="import" pendingText={t("saving")}>
          {t("roster.import")}
        </SubmitButton>
      </div>

      <div aria-live="polite" className="space-y-2">
        {state?.message ? (
          <Alert tone={state.ok ? "success" : "error"}>
            {t(`roster.messages.${state.message}`, {
              total: state.total ?? 0,
              imported: state.imported ?? 0,
              errors: state.errorCount ?? 0,
            })}
          </Alert>
        ) : null}
        {state?.byKind && Object.keys(state.byKind).length ? (
          <ul className="text-sm">
            {Object.entries(state.byKind).map(([kind, n]) => (
              <li key={kind}>
                {tr(`role.${kind}`)}: {n}
              </li>
            ))}
          </ul>
        ) : null}
        {state?.errors?.length ? (
          <ul className="list-inside list-disc text-sm text-red-800">
            {state.errors.map((e) => (
              <li key={`${e.line}-${e.error}`}>
                {t("roster.lineError", {
                  line: e.line,
                  error: t(`roster.rowErrors.${e.error}`),
                })}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </form>
  );
}

export function RosterDeleteForm() {
  const t = useTranslations("adminVerify");
  const [state, action] = useActionState<RosterDeleteState, FormData>(
    deleteAllRosterAction,
    null,
  );
  return (
    <form action={action} className="space-y-3">
      <label className="flex min-h-11 items-center gap-3 text-sm">
        <input type="checkbox" name="confirm" className="size-5" required />
        {t("roster.deleteConfirm")}
      </label>
      <SubmitButton variant="danger" pendingText={t("saving")}>
        {t("roster.deleteAll")}
      </SubmitButton>
      <div aria-live="polite">
        {state?.message ? (
          <Alert tone={state.ok ? "success" : "error"}>
            {t(`roster.messages.${state.message}`, {
              deleted: state.deleted ?? 0,
            })}
          </Alert>
        ) : null}
      </div>
    </form>
  );
}
