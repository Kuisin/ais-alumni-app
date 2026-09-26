"use client";

import { upload } from "@vercel/blob/client";
import { useTranslations } from "next-intl";
import { useId, useRef, useState } from "react";
import {
  discardEvidenceAction,
  uploadEvidenceAction,
} from "@/app/actions/verify";
import { Button } from "@/components/ui/button";
import {
  EVIDENCE_MAX_BYTES,
  EVIDENCE_MAX_FILES,
  EVIDENCE_TYPES,
  type EvidenceItem,
  safeFileName,
} from "@/lib/verification/schema";

type Status =
  | { kind: "idle" }
  | { kind: "uploading"; name: string }
  | {
      kind: "error";
      code: "type" | "size" | "count" | "forbidden" | "generic";
      name?: string;
    }
  | { kind: "done"; name: string };

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Evidence files (§6.3): JPG/PNG/PDF, ≤10 MB each, ≤3 files. Uploads go
 * straight to Vercel Blob (private) when configured, otherwise through a
 * server action to local storage (dev). The parent keeps the resulting keys.
 */
export function EvidenceUploader({
  userId,
  useBlob,
  items,
  onChange,
  error,
}: {
  userId: string;
  useBlob: boolean;
  items: EvidenceItem[];
  onChange: (items: EvidenceItem[]) => void;
  error?: string;
}) {
  const t = useTranslations("verify");
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const busy = status.kind === "uploading";
  const remaining = EVIDENCE_MAX_FILES - items.length;

  async function uploadOne(file: File): Promise<EvidenceItem | null> {
    if (!(EVIDENCE_TYPES as readonly string[]).includes(file.type)) {
      setStatus({ kind: "error", code: "type", name: file.name });
      return null;
    }
    if (file.size > EVIDENCE_MAX_BYTES || file.size === 0) {
      setStatus({ kind: "error", code: "size", name: file.name });
      return null;
    }
    setStatus({ kind: "uploading", name: file.name });
    try {
      if (useBlob) {
        const blob = await upload(
          `evidence/${userId}/${safeFileName(file.name)}`,
          file,
          {
            access: "private",
            handleUploadUrl: "/api/evidence/upload",
            contentType: file.type,
          },
        );
        return {
          key: blob.pathname,
          fileName: file.name.slice(0, 200),
          mimeType: file.type as EvidenceItem["mimeType"],
          size: file.size,
        };
      }
      const fd = new FormData();
      fd.set("file", file);
      const res = await uploadEvidenceAction(fd);
      if (!res.ok) {
        setStatus({ kind: "error", code: res.error, name: file.name });
        return null;
      }
      return res.item;
    } catch {
      setStatus({ kind: "error", code: "generic", name: file.name });
      return null;
    }
  }

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    const list = Array.from(files);
    if (list.length > remaining) {
      setStatus({ kind: "error", code: "count" });
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    let next = items;
    let last: string | null = null;
    for (const file of list) {
      const item = await uploadOne(file);
      if (!item) break;
      next = [...next, item];
      last = file.name;
      onChange(next);
    }
    if (last) setStatus({ kind: "done", name: last });
    if (inputRef.current) inputRef.current.value = "";
  }

  function remove(item: EvidenceItem) {
    onChange(items.filter((i) => i.key !== item.key));
    // Not-yet-submitted uploads are deleted right away; files attached to an
    // earlier submission are removed by the server on resubmission.
    void discardEvidenceAction(item.key);
  }

  return (
    <div className="space-y-3">
      <div>
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-slate-800"
        >
          {t("evidence.label")}
        </label>
        <p id={`${inputId}-hint`} className="text-sm text-slate-600">
          {t("evidence.hint", { max: EVIDENCE_MAX_FILES })}
        </p>
      </div>

      {items.length ? (
        <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200">
          {items.map((item) => (
            <li
              key={item.key}
              className="flex items-center justify-between gap-2 px-3 py-2 text-sm"
            >
              <span className="min-w-0 truncate">
                {item.fileName}{" "}
                <span className="text-slate-500">
                  ({formatSize(item.size)})
                </span>
              </span>
              <Button
                variant="ghost"
                onClick={() => remove(item)}
                disabled={busy}
                aria-label={t("evidence.remove", { name: item.fileName })}
              >
                {t("evidence.removeShort")}
              </Button>
            </li>
          ))}
        </ul>
      ) : null}

      {remaining > 0 ? (
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
          multiple
          disabled={busy}
          aria-describedby={`${inputId}-hint${error ? ` ${inputId}-error` : ""}`}
          aria-invalid={error ? true : undefined}
          onChange={(e) => void onFiles(e.currentTarget.files)}
          className="block w-full text-sm file:mr-3 file:min-h-11 file:rounded-lg file:border-0 file:bg-brand-50 file:px-4 file:font-semibold file:text-brand-800"
        />
      ) : (
        <p className="text-sm text-slate-600">{t("evidence.full")}</p>
      )}

      <p aria-live="polite" className="text-sm">
        {status.kind === "uploading"
          ? t("evidence.uploading", { name: status.name })
          : null}
        {status.kind === "done" ? (
          <span className="text-green-800">
            {t("evidence.uploaded", { name: status.name })}
          </span>
        ) : null}
        {status.kind === "error" ? (
          <span className="text-red-700">
            {t(`evidence.errors.${status.code}`, { name: status.name ?? "" })}
          </span>
        ) : null}
      </p>
      {error ? (
        <p id={`${inputId}-error`} className="text-sm text-red-700">
          {t(`errors.${error}`)}
        </p>
      ) : null}
    </div>
  );
}
