"use client";

import { CalendarClock, MapPin, Type, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import {
  type AdminFormState,
  saveEventAction,
} from "@/app/actions/admin-content";
import { Button, buttonClass } from "@/components/ui/button";
import { Alert } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/field";
import type { AudienceKey } from "@/generated/prisma/enums";
import { Link } from "@/i18n/navigation";
import { ConfirmDeleteForm, DeleteButton } from "./confirm-delete";
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
  targetAudiences: AudienceKey[];
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
  targetAudiences: [],
};

/** One card-wrapped group of fields with an icon in its legend. */
export function FormSection({
  icon,
  title,
  description,
  children,
}: {
  icon: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <fieldset className="min-w-0 space-y-4">
        <legend className="text-lg font-semibold">
          <span className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="flex size-8 items-center justify-center rounded-lg bg-brand-50 text-brand-700 [&_svg]:size-4"
            >
              {icon}
            </span>
            {title}
          </span>
        </legend>
        {description ? (
          <p className="text-sm text-slate-500">{description}</p>
        ) : null}
        {children}
      </fieldset>
    </div>
  );
}

/**
 * Sticky bar at the bottom of an editor form: the danger action (delete) on
 * the left, separated from the secondary and primary actions on the right.
 * Full-bleed on phones, a floating rounded bar from `sm`.
 * Put the primary submit first: it is then the form's default button (Enter)
 * and shows on top on phones / rightmost from `sm` (row-reverse).
 */
export function StickyActions({
  danger,
  children,
}: {
  danger?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="sticky bottom-0 z-10 -mx-4 border-t border-slate-200 bg-white/95 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur sm:mx-0 sm:rounded-xl sm:border sm:pb-3 sm:shadow-md">
      <div className="flex items-start gap-2 sm:items-center">
        {danger ? (
          <div className="shrink-0 border-r border-slate-200 pr-2 sm:mr-auto sm:border-r-0 sm:pr-0">
            {danger}
          </div>
        ) : null}
        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:ml-auto sm:flex-none sm:flex-row-reverse sm:flex-wrap">
          {children}
        </div>
      </div>
    </div>
  );
}

/** Classes for buttons inside `StickyActions`. */
export const ACTION_BUTTON = "w-full sm:w-auto";

export function EventForm({
  values,
  cancelHref,
  deleteAction,
}: {
  values: EventFormValues;
  /** shows a cancel link in the action bar (from `sm`; phones use the back link) */
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
    saveEventAction,
    {},
  );
  const err = (name: string) => {
    const key = state.fieldErrors?.[name];
    return key ? t(`errors.${key}`) : null;
  };
  const deleteFormId = values.id ? `delete-event-${values.id}` : "";

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
                  rows={8}
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
                  rows={8}
                  lang="en"
                />
              )}
            </Field>
          </div>
          <MarkdownHint id="body-md-hint">
            {t("fields.markdownHint")}
          </MarkdownHint>
        </FormSection>

        <FormSection
          icon={<CalendarClock />}
          title={t("sections.when")}
          description={t("fields.jstHint")}
        >
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
        </FormSection>

        <FormSection icon={<MapPin />} title={t("sections.where")}>
          <div className="grid gap-4 xl:grid-cols-2">
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
          </div>
        </FormSection>

        <FormSection icon={<Users />} title={t("sections.rsvp")}>
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
          <TargetRolesField defaultValue={values.targetAudiences} />
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
            disabled={pending}
            aria-disabled={pending}
            className={ACTION_BUTTON}
          >
            {pending
              ? tc("saving")
              : values.id
                ? tc("save")
                : t("events.create")}
          </Button>
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

/** Appends an extra id to the aria-describedby that `Field` computed. */
export function describedBy(
  a: { "aria-describedby"?: string },
  extra: string,
): string {
  return [a["aria-describedby"], extra].filter(Boolean).join(" ");
}

/** Markdown formatting help, shown once under both body fields. */
export function MarkdownHint({
  id,
  children,
}: {
  id: string;
  children: ReactNode;
}) {
  return (
    <p id={id} className="text-xs text-slate-500">
      {children}
    </p>
  );
}

/** Cancel link for `StickyActions`; hidden on phones, where the back link above the title does the same. */
export function CancelLink({ href }: { href: string }) {
  const tc = useTranslations("common");
  return (
    <div className="hidden sm:block">
      <Link href={href} className={buttonClass("secondary", "w-full")}>
        {tc("cancel")}
      </Link>
    </div>
  );
}
