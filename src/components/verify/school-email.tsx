"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import {
  sendSchoolEmailCodeAction,
  verifySchoolEmailCodeAction,
} from "@/app/actions/verify";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";

/**
 * Optional teacher school email with OTP confirmation (§6.2). A confirmed
 * code is recorded server-side; the submit action reads it.
 */
export function SchoolEmail({
  value,
  onChange,
  verifiedEmail,
  onVerified,
  error,
}: {
  value: string;
  onChange: (v: string) => void;
  verifiedEmail: string | null;
  onVerified: (email: string) => void;
  error?: string;
}) {
  const t = useTranslations("verify");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{
    tone: "ok" | "error";
    text: string;
  } | null>(null);

  const email = value.trim().toLowerCase();
  const verified = !!email && verifiedEmail === email;

  async function send() {
    setBusy(true);
    setMessage(null);
    const res = await sendSchoolEmailCodeAction(email);
    setBusy(false);
    if (res.ok) {
      setSentTo(email);
      setMessage({ tone: "ok", text: t("schoolEmail.sent", { email }) });
    } else {
      setMessage({
        tone: "error",
        text: t(`schoolEmail.errors.${res.error ?? "invalid"}`),
      });
    }
  }

  async function confirm() {
    setBusy(true);
    setMessage(null);
    const res = await verifySchoolEmailCodeAction(email, code);
    setBusy(false);
    if (res.ok) {
      onVerified(email);
      setSentTo(null);
      setCode("");
      setMessage({ tone: "ok", text: t("schoolEmail.verified") });
    } else {
      setMessage({
        tone: "error",
        text: t(`schoolEmail.errors.${res.error ?? "invalid"}`),
      });
    }
  }

  return (
    <div className="space-y-3">
      <Field
        id="f-teacher-schoolEmail"
        label={
          <>
            {t("fields.schoolEmail")}{" "}
            <span className="font-normal text-slate-500">
              ({t("optional")})
            </span>
          </>
        }
        hint={t("hints.schoolEmail")}
        error={error ? t(`errors.${error}`) : null}
      >
        {(aria) => (
          <div className="flex flex-wrap items-center gap-2">
            <Input
              {...aria}
              type="email"
              autoComplete="email"
              inputMode="email"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="min-w-0 flex-1"
            />
            {verified ? (
              <Badge tone="green">{t("schoolEmail.verifiedBadge")}</Badge>
            ) : (
              <Button
                variant="secondary"
                onClick={send}
                disabled={busy || !email}
              >
                {sentTo === email
                  ? t("schoolEmail.resend")
                  : t("schoolEmail.send")}
              </Button>
            )}
          </div>
        )}
      </Field>

      {sentTo && sentTo === email && !verified ? (
        <Field
          id="f-teacher-schoolEmailCode"
          label={t("schoolEmail.codeLabel")}
        >
          {(aria) => (
            <div className="flex flex-wrap items-center gap-2">
              <Input
                {...aria}
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="\d{6}"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                className="w-36"
              />
              <Button onClick={confirm} disabled={busy || code.length !== 6}>
                {t("schoolEmail.confirm")}
              </Button>
            </div>
          )}
        </Field>
      ) : null}

      <p
        aria-live="polite"
        className={
          message?.tone === "error"
            ? "text-sm text-red-700"
            : "text-sm text-green-800"
        }
      >
        {message?.text}
      </p>
    </div>
  );
}
