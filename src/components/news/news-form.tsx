"use client";

import { Eye, ImageIcon, Type } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  type AdminFormState,
  saveNewsAction,
} from "@/app/actions/admin-content";
import {
  ConfirmDeleteForm,
  DeleteButton,
} from "@/components/events/confirm-delete";
import {
  ACTION_BUTTON,
  CancelLink,
  describedBy,
  FormSection,
  MarkdownHint,
  StickyActions,
} from "@/components/events/event-form";
import {
  CHOICE_CARD,
  TargetRolesField,
} from "@/components/events/target-roles-field";
import { useFormAction } from "@/components/events/use-form-action";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/field";
import type { RoleKey } from "@/generated/prisma/enums";

export type NewsFormValues = {
  id?: string;
  titleJa: string;
  titleEn: string;
  bodyJa: string;
  bodyEn: string;
  /** datetime-local in JST; empty = draft */
  publishedAt: string;
  pinned: boolean;
  targetRoles: RoleKey[];
  /** signed URL of the current cover, for preview */
  coverPreviewUrl: string | null;
  notified: boolean;
};

export const EMPTY_NEWS: NewsFormValues = {
  titleJa: "",
  titleEn: "",
  bodyJa: "",
  bodyEn: "",
  publishedAt: "",
  pinned: false,
  targetRoles: [],
  coverPreviewUrl: null,
  notified: false,
};

export function NewsForm({
  values,
  cancelHref,
  deleteAction,
}: {
  values: NewsFormValues;
  /** shows a cancel link in the action bar (from `sm`) */
  cancelHref?: string;
  /** shows a delete button in the action bar */
  deleteAction?: {
    action: (fd: FormData) => Promise<void>;
    message: string;
  };
}) {
  const t = useTranslations("adminContent");
  const tc = useTranslations("common");
  const { state, pending, onSubmit } = useFormAction<AdminFormState>(
    saveNewsAction,
    {},
  );
  const err = (name: string) => {
    const key = state.fieldErrors?.[name];
    return key ? t(`errors.${key}`) : null;
  };
  const deleteFormId = values.id ? `delete-news-${values.id}` : "";

  return (
    <>
      <form onSubmit={onSubmit} className="space-y-6" noValidate>
        {values.id ? <input type="hidden" name="id" value={values.id} /> : null}

        {state.error ? (
          <Alert tone="error">
            {state.error === "validation"
              ? tc("errors.validation")
              : t(`errors.${state.error}`)}
          </Alert>
        ) : null}
        {state.ok ? <Alert tone="success">{tc("saved")}</Alert> : null}

        <FormSection
          icon={<Type />}
          title={t("sections.content")}
          description={t("fields.titleHint")}
        >
          <div className="grid gap-4 xl:grid-cols-2">
            <Field
              id="titleJa"
              label={t("fields.titleJa")}
              error={err("titleJa")}
            >
              {(a) => (
                <Input
                  {...a}
                  name="titleJa"
                  defaultValue={values.titleJa}
                  maxLength={200}
                  lang="ja"
                />
              )}
            </Field>
            <Field
              id="titleEn"
              label={t("fields.titleEn")}
              error={err("titleEn")}
            >
              {(a) => (
                <Input
                  {...a}
                  name="titleEn"
                  defaultValue={values.titleEn}
                  maxLength={200}
                  lang="en"
                />
              )}
            </Field>
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            <Field id="bodyJa" label={t("fields.bodyJa")} error={err("bodyJa")}>
              {(a) => (
                <Textarea
                  {...a}
                  aria-describedby={describedBy(a, "body-md-hint")}
                  name="bodyJa"
                  defaultValue={values.bodyJa}
                  rows={10}
                  lang="ja"
                />
              )}
            </Field>
            <Field id="bodyEn" label={t("fields.bodyEn")} error={err("bodyEn")}>
              {(a) => (
                <Textarea
                  {...a}
                  aria-describedby={describedBy(a, "body-md-hint")}
                  name="bodyEn"
                  defaultValue={values.bodyEn}
                  rows={10}
                  lang="en"
                />
              )}
            </Field>
          </div>
          <MarkdownHint id="body-md-hint">
            {t("fields.markdownHint")}
          </MarkdownHint>
        </FormSection>

        <FormSection icon={<ImageIcon />} title={t("sections.cover")}>
          <div
            className={
              values.coverPreviewUrl
                ? "grid gap-4 sm:grid-cols-[minmax(0,16rem)_minmax(0,1fr)] sm:items-start"
                : undefined
            }
          >
            {values.coverPreviewUrl ? (
              <div className="space-y-2">
                {/* biome-ignore lint/performance/noImgElement: signed private URL */}
                <img
                  src={values.coverPreviewUrl}
                  alt={t("fields.currentCover")}
                  className="max-h-48 w-full rounded-lg border border-slate-200 object-cover"
                />
                <label className={CHOICE_CARD}>
                  <input
                    type="checkbox"
                    name="removeCover"
                    className="size-5 shrink-0 accent-brand-700 focus-visible:outline-none"
                  />
                  <span className="text-sm">{t("fields.removeCover")}</span>
                </label>
              </div>
            ) : null}
            <Field
              id="cover"
              label={t("fields.cover")}
              hint={t("fields.coverHint")}
              error={err("cover")}
            >
              {(a) => (
                <Input
                  {...a}
                  type="file"
                  name="cover"
                  accept="image/jpeg,image/png"
                  className="file:mr-3 file:min-h-8 file:rounded file:border-0 file:bg-slate-100 file:px-3 file:py-1"
                />
              )}
            </Field>
          </div>
        </FormSection>

        <FormSection icon={<Eye />} title={t("sections.publishing")}>
          <Field
            id="publishedAt"
            label={t("fields.publishedAt")}
            hint={t("fields.publishedAtHint")}
            error={err("publishedAt")}
          >
            {(a) => (
              <Input
                {...a}
                type="datetime-local"
                name="publishedAt"
                defaultValue={values.publishedAt}
                className="sm:max-w-xs"
              />
            )}
          </Field>
          <label className={CHOICE_CARD}>
            <input
              type="checkbox"
              name="pinned"
              defaultChecked={values.pinned}
              className="size-5 shrink-0 accent-brand-700 focus-visible:outline-none"
            />
            <span className="text-sm font-medium">{t("fields.pinned")}</span>
          </label>
          <TargetRolesField defaultValue={values.targetRoles} />
        </FormSection>

        <StickyActions
          danger={
            deleteAction && deleteFormId ? (
              <DeleteButton formId={deleteFormId} />
            ) : null
          }
        >
          <Button
            type="submit"
            name="intent"
            value="save"
            disabled={pending}
            aria-disabled={pending}
            className={ACTION_BUTTON}
          >
            {pending
              ? tc("saving")
              : values.id
                ? tc("save")
                : t("news.saveDraftOrScheduled")}
          </Button>
          {!values.notified ? (
            <Button
              type="submit"
              name="intent"
              value="notify"
              variant="secondary"
              disabled={pending}
              aria-disabled={pending}
              className={ACTION_BUTTON}
            >
              {t("news.saveAndNotify")}
            </Button>
          ) : null}
          {cancelHref ? <CancelLink href={cancelHref} /> : null}
        </StickyActions>
      </form>
      {deleteAction && values.id ? (
        <ConfirmDeleteForm
          formId={deleteFormId}
          action={deleteAction.action}
          id={values.id}
          message={deleteAction.message}
        />
      ) : null}
    </>
  );
}
