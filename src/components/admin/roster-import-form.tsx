"use client";

import { FileSpreadsheet } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";
import {
  type RosterImportState,
  rosterImportAction,
} from "@/app/actions/roster";
import { buttonClass } from "@/components/ui/button";
import { Alert } from "@/components/ui/card";
import { Field, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

const MAX_FILE_BYTES = 5_000_000;

/**
 * Roster CSV import: choose a file (styled, localized picker) or paste,
 * preview, then import (§6.4.1).
 */
export function RosterImportForm() {
  const t = useTranslations("adminVerify");
  const tr = useTranslations("roles");
  const [state, action] = useActionState<RosterImportState, FormData>(
    rosterImportAction,
    null,
  );
  const [csv, setCsv] = useState("");
  const [fileError, setFileError] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  async function onFile(file: File | undefined) {
    setFileError(false);
    setFileName(file?.name ?? null);
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
        <p
          id="roster-file-label"
          className="text-sm font-medium text-slate-800"
        >
          {t("roster.file")}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          {/* Native input stays for keyboard/AT; the label is the visible button. */}
          <input
            id="roster-file"
            type="file"
            accept=".csv,text/csv,text/plain"
            aria-labelledby="roster-file-label"
            onChange={(e) => void onFile(e.currentTarget.files?.[0])}
            className="peer sr-only"
          />
          <label
            htmlFor="roster-file"
            className={buttonClass(
              "secondary",
              "cursor-pointer peer-focus-visible:ring-2 peer-focus-visible:ring-brand-700 peer-focus-visible:ring-offset-2",
            )}
          >
            <FileSpreadsheet aria-hidden="true" className="size-4" />
            {t("roster.chooseFile")}
          </label>
          <span
            aria-live="polite"
            className="min-w-0 truncate text-sm text-slate-600"
            title={fileName ?? undefined}
          >
            {fileName ?? t("roster.noFile")}
          </span>
        </div>
        {fileError ? (
          <p className="text-sm text-red-700">{t("roster.fileTooLarge")}</p>
        ) : null}
      </div>
      <Field
        id="roster-csv"
        label={t("roster.paste")}
        hint={t("roster.columnsHint")}
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
