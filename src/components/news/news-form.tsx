"use client";

import {
  ImageIcon,
  ListChecks,
  Paperclip,
  Send,
  Type,
  Users,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
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
import { CHOICE_CARD } from "@/components/events/target-roles-field";
import { useFormAction } from "@/components/events/use-form-action";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/field";
import { useCloseOnSave } from "@/components/ui/view-edit";
import type { CohortOption } from "@/lib/cohorts";
import type { NewsStatus } from "@/lib/news";
import { type AudienceSpec, EVERYONE } from "@/lib/news-audience";
import type { NewsScope } from "@/lib/permissions";
import { type AudienceMember, AudiencePicker } from "./audience-picker";
import { type Delivery, DeliveryField } from "./delivery-field";
import {
  AttachmentFields,
  EMPTY_HUB,
  type HubValues,
  ResponseFields,
} from "./hub-fields";

export type NewsFormValues = {
  id?: string;
  titleJa: string;
  titleEn: string;
  bodyJa: string;
  bodyEn: string;
  /** current state of the post; null = new post */
  status: NewsStatus | null;
  /** datetime-local in JST: the reserved time of a scheduled post */
  sendAt: string;
  notifyOnPublish: boolean;
  pinned: boolean;
  audience: AudienceSpec;
  /** names of the individually chosen members in `audience.userIds` */
  audienceMembers: AudienceMember[];
  /** signed URL of the current cover, for preview */
  coverPreviewUrl: string | null;
  /** confirm / poll / 日程調整 / attachments */
  hub: HubValues;
};

export const EMPTY_NEWS: NewsFormValues = {
  titleJa: "",
  titleEn: "",
  bodyJa: "",
  bodyEn: "",
  status: null,
  sendAt: "",
  notifyOnPublish: true,
  pinned: false,
  audience: EVERYONE,
  audienceMembers: [],
  coverPreviewUrl: null,
  hub: EMPTY_HUB,
};

/** The 配信 option selected when the editor opens. */
function initialDelivery(status: NewsStatus | null): Delivery {
  if (status === "published") return "KEEP";
  if (status === "scheduled") return "SCHEDULE";
  if (status === "draft") return "DRAFT";
  return "NOW";
}

export function NewsForm({
  values,
  cohorts,
  cancelHref,
  deleteAction,
  useBlob,
  scope = { kind: "ANY" },
}: {
  values: NewsFormValues;
  /** attachments go straight to Vercel Blob when it's configured */
  useBlob: boolean;
  /** existing 学年 for the audience picker */
  cohorts: readonly CohortOption[];
  /** who the author may send to (admins: anyone) */
  scope?: NewsScope;
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
  useCloseOnSave(state);
  const err = (name: string) => {
    const key = state.fieldErrors?.[name];
    return key ? t(`errors.${key}`) : null;
  };
  const deleteFormId = values.id ? `delete-news-${values.id}` : "";
  const [delivery, setDelivery] = useState<Delivery>(() =>
    initialDelivery(values.status),
  );
  // After a save changes the post's state (e.g. draft → published), follow it.
  const [shownStatus, setShownStatus] = useState(values.status);
  if (values.status !== shownStatus) {
    setShownStatus(values.status);
    setDelivery(initialDelivery(values.status));
  }
  const [notify, setNotify] = useState(values.notifyOnPublish);
  const submitLabel =
    delivery === "NOW"
      ? notify
        ? t("delivery.submitConfirm")
        : t("delivery.submitPublish")
      : delivery === "SCHEDULE"
        ? t("delivery.submitSchedule")
        : delivery === "DRAFT"
          ? t("delivery.submitDraft")
          : tc("save");

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

        <FormSection icon={<Paperclip />} title={t("sections.attachments")}>
          <AttachmentFields
            initial={values.hub.attachments}
            useBlob={useBlob}
            error={err("attachments")}
          />
        </FormSection>

        <FormSection icon={<ListChecks />} title={t("sections.responses")}>
          <ResponseFields values={values.hub} err={err} />
        </FormSection>

        <FormSection icon={<Send />} title={t("sections.delivery")}>
          <DeliveryField
            published={values.status === "published"}
            delivery={delivery}
            onDelivery={setDelivery}
            notify={notify}
            onNotify={setNotify}
            defaultSendAt={values.sendAt}
            sendAtError={err("sendAt")}
          />
          <label className={CHOICE_CARD}>
            <input
              type="checkbox"
              name="pinned"
              defaultChecked={values.pinned}
              className="size-5 shrink-0 accent-brand-700 focus-visible:outline-none"
            />
            <span className="text-sm font-medium">{t("fields.pinned")}</span>
          </label>
        </FormSection>

        <FormSection icon={<Users />} title={t("sections.audience")}>
          <AudiencePicker
            cohorts={cohorts}
            scope={scope}
            initialSpec={values.audience}
            initialMembers={values.audienceMembers}
            error={err("audience")}
          />
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
            {pending ? tc("saving") : submitLabel}
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
