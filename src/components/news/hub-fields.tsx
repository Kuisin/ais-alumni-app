"use client";

import { upload } from "@vercel/blob/client";
import { FileText, Plus, Trash2, Upload, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useRef, useState } from "react";
import { uploadNewsFileAction } from "@/app/actions/news-hub";
import { CHOICE_CARD } from "@/components/events/target-roles-field";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import {
  ATTACHMENT_MAX_BYTES,
  ATTACHMENT_PREFIX,
  ATTACHMENT_TYPES,
  type AttachmentItem,
  MAX_ATTACHMENTS,
  MAX_POLL_OPTIONS,
  MAX_SCHEDULE_OPTIONS,
} from "@/lib/news-hub";
import { safeFileName } from "@/lib/verification/schema";

export type PollValue = {
  question: string;
  multiple: boolean;
  options: { id?: string; label: string }[];
};
export type ScheduleValue = {
  question: string;
  options: { id?: string; startsAt: string; label: string }[];
};
export type HubValues = {
  requireConfirm: boolean;
  allowComments: boolean;
  /** datetime-local, JST */
  deadline: string;
  poll: PollValue | null;
  schedule: ScheduleValue | null;
  attachments: AttachmentItem[];
};

export const EMPTY_HUB: HubValues = {
  requireConfirm: false,
  allowComments: true,
  deadline: "",
  poll: null,
  schedule: null,
  attachments: [],
};

const NEW_POLL: PollValue = {
  question: "",
  multiple: false,
  options: [{ label: "" }, { label: "" }],
};
const NEW_SCHEDULE: ScheduleValue = {
  question: "",
  options: [{ startsAt: "", label: "" }],
};

/** 回答・参加: confirm button, comments, deadline, poll and 日程調整. */
export function ResponseFields({
  values,
  err,
}: {
  values: HubValues;
  err: (name: string) => string | null;
}) {
  const t = useTranslations("adminContent.hub");
  const [poll, setPoll] = useState<PollValue | null>(values.poll);
  const [schedule, setSchedule] = useState<ScheduleValue | null>(
    values.schedule,
  );

  return (
    <div className="space-y-5">
      <input type="hidden" name="poll" value={JSON.stringify(poll)} />
      <input type="hidden" name="schedule" value={JSON.stringify(schedule)} />
      <div className="grid gap-3 sm:grid-cols-2">
        <label className={CHOICE_CARD}>
          <input
            type="checkbox"
            name="requireConfirm"
            defaultChecked={values.requireConfirm}
            className="size-5 shrink-0 accent-brand-700 focus-visible:outline-none"
          />
          <span className="text-sm">
            <span className="font-medium">{t("requireConfirm")}</span>
            <span className="block text-slate-600">
              {t("requireConfirmHint")}
            </span>
          </span>
        </label>
        <label className={CHOICE_CARD}>
          <input
            type="checkbox"
            name="allowComments"
            defaultChecked={values.allowComments}
            className="size-5 shrink-0 accent-brand-700 focus-visible:outline-none"
          />
          <span className="text-sm font-medium">{t("allowComments")}</span>
        </label>
      </div>
      <Field
        id="deadline"
        label={t("deadline")}
        hint={t("deadlineHint")}
        error={err("deadline")}
      >
        {(a) => (
          <Input
            {...a}
            type="datetime-local"
            name="deadline"
            defaultValue={values.deadline}
            className="sm:max-w-xs"
          />
        )}
      </Field>

      {poll ? (
        <PollEditor value={poll} onChange={setPoll} error={err("poll")} />
      ) : (
        <Button variant="secondary" onClick={() => setPoll(NEW_POLL)}>
          <Plus aria-hidden="true" className="size-4" />
          {t("poll.add")}
        </Button>
      )}
      {schedule ? (
        <ScheduleEditor
          value={schedule}
          onChange={setSchedule}
          error={err("schedule")}
        />
      ) : (
        <Button
          variant="secondary"
          className="ml-0 sm:ml-2"
          onClick={() => setSchedule(NEW_SCHEDULE)}
        >
          <Plus aria-hidden="true" className="size-4" />
          {t("schedule.add")}
        </Button>
      )}
    </div>
  );
}

function Box({
  title,
  onRemove,
  removeLabel,
  children,
}: {
  title: string;
  onRemove: () => void;
  removeLabel: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
      <div className="flex items-center justify-between gap-2">
        <legend className="float-left font-semibold">{title}</legend>
        <Button variant="ghost" onClick={onRemove} className="text-red-700">
          <Trash2 aria-hidden="true" className="size-4" />
          {removeLabel}
        </Button>
      </div>
      <div className="clear-both space-y-3">{children}</div>
    </fieldset>
  );
}

function PollEditor({
  value,
  onChange,
  error,
}: {
  value: PollValue;
  onChange: (v: PollValue | null) => void;
  error: string | null;
}) {
  const t = useTranslations("adminContent.hub.poll");
  const uid = useId();
  const set = (patch: Partial<PollValue>) => onChange({ ...value, ...patch });
  const hasSaved = value.options.some((o) => o.id);
  return (
    <Box
      title={t("title")}
      onRemove={() => onChange(null)}
      removeLabel={t("remove")}
    >
      {error ? (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      ) : null}
      <div className="space-y-1">
        <label htmlFor={`${uid}-q`} className="block text-sm font-medium">
          {t("question")}
        </label>
        <Input
          id={`${uid}-q`}
          value={value.question}
          maxLength={300}
          onChange={(e) => set({ question: e.target.value })}
        />
      </div>
      <ol className="space-y-2">
        {value.options.map((o, i) => (
          <li key={o.id ?? `new-${i}`} className="flex items-center gap-2">
            <label htmlFor={`${uid}-o${i}`} className="sr-only">
              {t("option", { n: i + 1 })}
            </label>
            <Input
              id={`${uid}-o${i}`}
              placeholder={t("option", { n: i + 1 })}
              value={o.label}
              maxLength={200}
              onChange={(e) =>
                set({
                  options: value.options.map((x, j) =>
                    j === i ? { ...x, label: e.target.value } : x,
                  ),
                })
              }
            />
            <Button
              variant="ghost"
              aria-label={t("removeOption", { n: i + 1 })}
              disabled={value.options.length <= 2}
              onClick={() =>
                set({ options: value.options.filter((_, j) => j !== i) })
              }
            >
              <X aria-hidden="true" className="size-4" />
            </Button>
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="secondary"
          disabled={value.options.length >= MAX_POLL_OPTIONS}
          onClick={() => set({ options: [...value.options, { label: "" }] })}
        >
          <Plus aria-hidden="true" className="size-4" />
          {t("addOption")}
        </Button>
        <label className="inline-flex min-h-11 items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="size-5 accent-brand-700"
            checked={value.multiple}
            onChange={(e) => set({ multiple: e.target.checked })}
          />
          {t("multiple")}
        </label>
      </div>
      {hasSaved ? (
        <p className="text-xs text-slate-600">{t("editWarn")}</p>
      ) : null}
    </Box>
  );
}

function ScheduleEditor({
  value,
  onChange,
  error,
}: {
  value: ScheduleValue;
  onChange: (v: ScheduleValue | null) => void;
  error: string | null;
}) {
  const t = useTranslations("adminContent.hub.schedule");
  const uid = useId();
  const set = (patch: Partial<ScheduleValue>) =>
    onChange({ ...value, ...patch });
  const setOption = (i: number, patch: Partial<ScheduleValue["options"][0]>) =>
    set({
      options: value.options.map((x, j) => (j === i ? { ...x, ...patch } : x)),
    });
  return (
    <Box
      title={t("title")}
      onRemove={() => onChange(null)}
      removeLabel={t("remove")}
    >
      <p className="text-sm text-slate-600">{t("hint")}</p>
      {error ? (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      ) : null}
      <div className="space-y-1">
        <label htmlFor={`${uid}-q`} className="block text-sm font-medium">
          {t("question")}
        </label>
        <Input
          id={`${uid}-q`}
          value={value.question}
          maxLength={300}
          onChange={(e) => set({ question: e.target.value })}
        />
      </div>
      <ol className="space-y-3">
        {value.options.map((o, i) => (
          <li
            key={o.id ?? `new-${i}`}
            className="grid gap-2 sm:grid-cols-[14rem_minmax(0,1fr)_auto] sm:items-end"
          >
            <div className="space-y-1">
              <label htmlFor={`${uid}-d${i}`} className="block text-sm">
                {t("candidate", { n: i + 1 })}
              </label>
              <Input
                id={`${uid}-d${i}`}
                type="datetime-local"
                value={o.startsAt}
                onChange={(e) => setOption(i, { startsAt: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label htmlFor={`${uid}-n${i}`} className="block text-sm">
                {t("note", { n: i + 1 })}
              </label>
              <Input
                id={`${uid}-n${i}`}
                value={o.label}
                maxLength={100}
                onChange={(e) => setOption(i, { label: e.target.value })}
              />
            </div>
            <Button
              variant="ghost"
              aria-label={t("removeCandidate", { n: i + 1 })}
              disabled={value.options.length <= 1}
              onClick={() =>
                set({ options: value.options.filter((_, j) => j !== i) })
              }
            >
              <X aria-hidden="true" className="size-4" />
            </Button>
          </li>
        ))}
      </ol>
      <Button
        variant="secondary"
        disabled={value.options.length >= MAX_SCHEDULE_OPTIONS}
        onClick={() =>
          set({ options: [...value.options, { startsAt: "", label: "" }] })
        }
      >
        <Plus aria-hidden="true" className="size-4" />
        {t("addCandidate")}
      </Button>
    </Box>
  );
}

type UploadError = "type" | "size" | "count" | "generic" | "forbidden";

/** Attachments: uploaded as soon as they're picked, saved with the post. */
export function AttachmentFields({
  initial,
  useBlob,
  error,
}: {
  initial: AttachmentItem[];
  useBlob: boolean;
  error: string | null;
}) {
  const t = useTranslations("adminContent.hub.files");
  const uid = useId();
  const input = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<AttachmentItem[]>(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [failed, setFailed] = useState<UploadError | null>(null);

  async function uploadOne(file: File): Promise<AttachmentItem | null> {
    if (!(ATTACHMENT_TYPES as readonly string[]).includes(file.type)) {
      setFailed("type");
      return null;
    }
    if (file.size <= 0 || file.size > ATTACHMENT_MAX_BYTES) {
      setFailed("size");
      return null;
    }
    setBusy(file.name);
    try {
      if (useBlob) {
        const blob = await upload(
          `${ATTACHMENT_PREFIX}${safeFileName(file.name)}`,
          file,
          {
            access: "private",
            handleUploadUrl: "/api/news/upload",
            contentType: file.type,
          },
        );
        return {
          key: blob.pathname,
          fileName: file.name.slice(0, 200),
          mimeType: file.type as AttachmentItem["mimeType"],
          size: file.size,
        };
      }
      const fd = new FormData();
      fd.set("file", file);
      const r = await uploadNewsFileAction(fd);
      if (!r.ok) {
        setFailed(r.error);
        return null;
      }
      return r.item;
    } catch {
      setFailed("generic");
      return null;
    } finally {
      setBusy(null);
    }
  }

  async function onFiles(files: FileList | null) {
    setFailed(null);
    const list = Array.from(files ?? []);
    if (items.length + list.length > MAX_ATTACHMENTS) {
      setFailed("count");
    } else {
      let next = items;
      for (const f of list) {
        const item = await uploadOne(f);
        if (!item) break;
        next = [...next, item];
        setItems(next);
      }
    }
    if (input.current) input.current.value = "";
  }

  return (
    <div className="space-y-3">
      <input type="hidden" name="attachments" value={JSON.stringify(items)} />
      <p id={`${uid}-hint`} className="text-sm text-slate-600">
        {t("hint", { max: MAX_ATTACHMENTS })}
      </p>
      {items.length ? (
        <ul className="space-y-2">
          {items.map((a, i) => (
            <li
              key={a.id ?? a.key}
              className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2"
            >
              <span className="flex min-w-0 items-center gap-2 text-sm">
                <FileText
                  aria-hidden="true"
                  className="size-4 shrink-0 text-slate-500"
                />
                <span className="truncate">{a.fileName}</span>
              </span>
              <Button
                variant="ghost"
                aria-label={t("remove", { name: a.fileName })}
                onClick={() => setItems(items.filter((_, j) => j !== i))}
              >
                <X aria-hidden="true" className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
      <div aria-live="polite" className="text-sm">
        {busy ? (
          <p className="text-slate-600">{t("uploading", { name: busy })}</p>
        ) : null}
        {failed ? (
          <p role="alert" className="text-red-700">
            {t(`errors.${failed}`, { max: MAX_ATTACHMENTS })}
          </p>
        ) : null}
        {error ? (
          <p role="alert" className="text-red-700">
            {error}
          </p>
        ) : null}
      </div>
      <label
        htmlFor={`${uid}-file`}
        className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold hover:bg-slate-100 has-disabled:cursor-not-allowed has-disabled:text-slate-400"
      >
        <Upload aria-hidden="true" className="size-4" />
        {t("add")}
        <input
          ref={input}
          id={`${uid}-file`}
          type="file"
          multiple
          accept={ATTACHMENT_TYPES.join(",")}
          aria-describedby={`${uid}-hint`}
          disabled={Boolean(busy) || items.length >= MAX_ATTACHMENTS}
          className="sr-only"
          onChange={(e) => onFiles(e.target.files)}
        />
      </label>
    </div>
  );
}
