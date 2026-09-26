"use client";

import { useTranslations } from "next-intl";
import {
  type AdminFormState,
  saveEventAction,
} from "@/app/actions/admin-content";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/field";
import type { RoleKey } from "@/generated/prisma/enums";
import { TargetRolesField } from "./target-roles-field";
import { useFormAction } from "./use-form-action";

/** Values for editing; dates are datetime-local strings in JST. */
export type EventFormValues = {
  id?: string;
  titleJa: string;
  titleEn: string;
  bodyJa: string;
  bodyEn: string;
  startsAt: string;
  endsAt: string;
  rsvpDeadline: string;
  location: string;
  mapUrl: string;
  capacity: string;
  targetRoles: RoleKey[];
};

export const EMPTY_EVENT: EventFormValues = {
  titleJa: "",
  titleEn: "",
  bodyJa: "",
  bodyEn: "",
  startsAt: "",
  endsAt: "",
  rsvpDeadline: "",
  location: "",
  mapUrl: "",
  capacity: "",
  targetRoles: [],
};

export function EventForm({ values }: { values: EventFormValues }) {
  const t = useTranslations("adminContent");
  const tc = useTranslations("common");
  const { state, pending, onSubmit } = useFormAction<AdminFormState>(
    saveEventAction,
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
              rows={8}
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
              rows={8}
              lang="en"
            />
          )}
        </Field>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-lg font-semibold">{t("sections.when")}</legend>
        <p className="text-sm text-slate-600">{t("fields.jstHint")}</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            id="startsAt"
            label={t("fields.startsAt")}
            required
            error={err("startsAt")}
          >
            {(a) => (
              <Input
                {...a}
                type="datetime-local"
                name="startsAt"
                defaultValue={values.startsAt}
              />
            )}
          </Field>
          <Field id="endsAt" label={t("fields.endsAt")} error={err("endsAt")}>
            {(a) => (
              <Input
                {...a}
                type="datetime-local"
                name="endsAt"
                defaultValue={values.endsAt}
              />
            )}
          </Field>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-lg font-semibold">{t("sections.where")}</legend>
        <Field
          id="location"
          label={t("fields.location")}
          error={err("location")}
        >
          {(a) => (
            <Input
              {...a}
              name="location"
              defaultValue={values.location}
              maxLength={300}
            />
          )}
        </Field>
        <Field
          id="mapUrl"
          label={t("fields.mapUrl")}
          hint={t("fields.mapUrlHint")}
          error={err("mapUrl")}
        >
          {(a) => (
            <Input
              {...a}
              type="url"
              name="mapUrl"
              defaultValue={values.mapUrl}
              inputMode="url"
            />
          )}
        </Field>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-lg font-semibold">{t("sections.rsvp")}</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            id="capacity"
            label={t("fields.capacity")}
            hint={t("fields.capacityHint")}
            error={err("capacity")}
          >
            {(a) => (
              <Input
                {...a}
                type="number"
                name="capacity"
                min={1}
                inputMode="numeric"
                defaultValue={values.capacity}
              />
            )}
          </Field>
          <Field
            id="rsvpDeadline"
            label={t("fields.rsvpDeadline")}
            hint={t("fields.rsvpDeadlineHint")}
            error={err("rsvpDeadline")}
          >
            {(a) => (
              <Input
                {...a}
                type="datetime-local"
                name="rsvpDeadline"
                defaultValue={values.rsvpDeadline}
              />
            )}
          </Field>
        </div>
        <TargetRolesField defaultValue={values.targetRoles} />
      </fieldset>

      <Button type="submit" disabled={pending} aria-disabled={pending}>
        {pending ? tc("saving") : values.id ? tc("save") : t("events.create")}
      </Button>
    </form>
  );
}
