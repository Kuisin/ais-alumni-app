"use client";

import { useTranslations } from "next-intl";
import {
  type AdminFormState,
  saveNewsAction,
} from "@/app/actions/admin-content";
import { TargetRolesField } from "@/components/events/target-roles-field";
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

export function NewsForm({ values }: { values: NewsFormValues }) {
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

  return (
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

      <fieldset className="space-y-4">
        <legend className="text-lg font-semibold">
          {t("sections.content")}
        </legend>
        <p className="text-sm text-slate-600">{t("fields.titleHint")}</p>
        <Field id="titleJa" label={t("fields.titleJa")} error={err("titleJa")}>
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
        <Field id="titleEn" label={t("fields.titleEn")} error={err("titleEn")}>
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
        <Field
          id="bodyJa"
          label={t("fields.bodyJa")}
          hint={t("fields.markdownHint")}
          error={err("bodyJa")}
        >
          {(a) => (
            <Textarea
              {...a}
              name="bodyJa"
              defaultValue={values.bodyJa}
              rows={10}
              lang="ja"
            />
          )}
        </Field>
        <Field
          id="bodyEn"
          label={t("fields.bodyEn")}
          hint={t("fields.markdownHint")}
          error={err("bodyEn")}
        >
          {(a) => (
            <Textarea
              {...a}
              name="bodyEn"
              defaultValue={values.bodyEn}
              rows={10}
              lang="en"
            />
          )}
        </Field>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-lg font-semibold">{t("sections.cover")}</legend>
        {values.coverPreviewUrl ? (
          <div className="space-y-2">
            {/* biome-ignore lint/performance/noImgElement: signed private URL */}
            <img
              src={values.coverPreviewUrl}
              alt={t("fields.currentCover")}
              className="max-h-48 rounded-lg border border-slate-200 object-cover"
            />
            <label className="flex min-h-11 items-center gap-3">
              <input type="checkbox" name="removeCover" className="size-5" />
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
              className="file:mr-3 file:rounded file:border-0 file:bg-slate-100 file:px-3 file:py-1"
            />
          )}
        </Field>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-lg font-semibold">
          {t("sections.publishing")}
        </legend>
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
            />
          )}
        </Field>
        <label className="flex min-h-11 items-center gap-3">
          <input
            type="checkbox"
            name="pinned"
            defaultChecked={values.pinned}
            className="size-5"
          />
          <span className="text-sm font-medium">{t("fields.pinned")}</span>
        </label>
        <TargetRolesField defaultValue={values.targetRoles} />
      </fieldset>

      <div className="flex flex-wrap gap-2">
        <Button
          type="submit"
          name="intent"
          value="save"
          disabled={pending}
          aria-disabled={pending}
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
          >
            {t("news.saveAndNotify")}
          </Button>
        ) : null}
      </div>
    </form>
  );
}
