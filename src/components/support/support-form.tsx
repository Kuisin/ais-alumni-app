"use client";

import { CircleCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { startTransition, useActionState, useState } from "react";
import {
  type SupportFormState,
  submitSupportAction,
} from "@/app/actions/support";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Link } from "@/i18n/navigation";
import {
  SUPPORT_LIMITS,
  SUPPORT_TYPE_KEYS,
  SUPPORT_TYPES,
  type SupportType,
} from "@/lib/support";

/**
 * お問い合わせ form: 種類 → 内容 (two-level dropdown), 件名, 本文, and name /
 * email (filled in for members). Values are kept when there are errors.
 */
export function SupportForm({
  defaults,
  signedIn,
}: {
  defaults: {
    name: string;
    email: string;
    type?: string;
    topic?: string;
  };
  signedIn: boolean;
}) {
  const t = useTranslations("support");
  const [state, action, pending] = useActionState<SupportFormState, FormData>(
    submitSupportAction,
    {},
  );
  const initialType = (
    defaults.type && defaults.type in SUPPORT_TYPES ? defaults.type : ""
  ) as SupportType | "";
  const [type, setType] = useState<SupportType | "">(initialType);
  const [topic, setTopic] = useState(
    initialType &&
      (SUPPORT_TYPES[initialType] as readonly string[]).includes(
        defaults.topic ?? "",
      )
      ? (defaults.topic as string)
      : "",
  );
  const [values, setValues] = useState({
    name: defaults.name,
    email: defaults.email,
    subject: "",
    message: "",
  });
  const set = (k: keyof typeof values) => (e: { target: { value: string } }) =>
    setValues((v) => ({ ...v, [k]: e.target.value }));
  const fe = state.fieldErrors ?? {};

  if (state.ok) {
    return (
      <div className="space-y-4 text-center">
        <CircleCheck
          aria-hidden="true"
          className="mx-auto size-12 text-green-600"
        />
        <h2 className="text-xl font-semibold">{t("sent.title")}</h2>
        <p className="text-slate-700">{t("sent.body")}</p>
        <p className="text-sm text-slate-600">
          {t("sent.ref")}{" "}
          <span className="font-mono font-semibold text-slate-900">
            {state.ref}
          </span>
        </p>
        <Link
          href={signedIn ? "/app/dashboard" : "/"}
          className="inline-flex min-h-11 items-center text-brand-700 underline"
        >
          {signedIn ? t("sent.backApp") : t("sent.backHome")}
        </Link>
      </div>
    );
  }

  return (
    // onSubmit rather than a form action: React resets a form after its
    // action, which would clear the dropdowns when there are errors.
    <form
      noValidate
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => action(fd));
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          id="support-type"
          label={t("form.type")}
          required
          error={fe.type}
        >
          {(aria) => (
            <Select
              {...aria}
              name="type"
              value={type}
              onChange={(e) => {
                setType(e.target.value as SupportType | "");
                setTopic("");
              }}
            >
              <option value="">{t("form.choose")}</option>
              {SUPPORT_TYPE_KEYS.map((k) => (
                <option key={k} value={k}>
                  {t(`types.${k}.label`)}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field
          id="support-topic"
          label={t("form.topic")}
          required
          error={fe.topic}
          hint={type ? t(`types.${type}.hint`) : t("form.topicFirst")}
        >
          {(aria) => (
            <Select
              {...aria}
              name="topic"
              value={topic}
              disabled={!type}
              onChange={(e) => setTopic(e.target.value)}
            >
              <option value="">{t("form.choose")}</option>
              {type
                ? SUPPORT_TYPES[type].map((k) => (
                    <option key={k} value={k}>
                      {t(`types.${type}.topics.${k}`)}
                    </option>
                  ))
                : null}
            </Select>
          )}
        </Field>
      </div>
      <Field
        id="support-subject"
        label={t("form.subject")}
        required
        error={fe.subject}
      >
        {(aria) => (
          <Input
            {...aria}
            name="subject"
            value={values.subject}
            onChange={set("subject")}
            maxLength={SUPPORT_LIMITS.subject}
            placeholder={t("form.subjectPlaceholder")}
          />
        )}
      </Field>
      <Field
        id="support-message"
        label={t("form.message")}
        required
        error={fe.message}
        hint={t(`form.messageHint.${type || "default"}`)}
      >
        {(aria) => (
          <Textarea
            {...aria}
            name="message"
            rows={7}
            value={values.message}
            onChange={set("message")}
            maxLength={SUPPORT_LIMITS.message}
          />
        )}
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          id="support-name"
          label={t("form.name")}
          required
          error={fe.name}
        >
          {(aria) => (
            <Input
              {...aria}
              name="name"
              autoComplete="name"
              value={values.name}
              onChange={set("name")}
              maxLength={SUPPORT_LIMITS.name}
            />
          )}
        </Field>
        <Field
          id="support-email"
          label={t("form.email")}
          required
          error={fe.email}
          hint={t("form.emailHint")}
        >
          {(aria) => (
            <Input
              {...aria}
              type="email"
              name="email"
              autoComplete="email"
              inputMode="email"
              value={values.email}
              onChange={set("email")}
              maxLength={SUPPORT_LIMITS.email}
            />
          )}
        </Field>
      </div>
      {/* Honeypot for bots; hidden from people and screen readers. */}
      <div aria-hidden="true" className="absolute -left-[9999px]">
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      {state.error ? <Alert tone="error">{state.error}</Alert> : null}
      <p className="text-xs text-slate-500">{t("form.privacy")}</p>
      <Button type="submit" disabled={pending} aria-disabled={pending}>
        {pending ? t("form.sending") : t("form.send")}
      </Button>
    </form>
  );
}
