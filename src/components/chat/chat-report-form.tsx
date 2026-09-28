"use client";

import { Flag } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState, useId } from "react";
import {
  type ChatReportFormState,
  reportChatAction,
} from "@/app/actions/chat-reports";
import { Alert, Card } from "@/components/ui/card";
import { Field, Select, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { CHAT_REPORT_LIMITS, CHAT_REPORT_REASONS } from "@/lib/chat-report";

/**
 * Report the chat, or someone in it, to the admins (chat details). In a
 * 1:1 talk the other person is chosen already.
 */
export function ChatReportForm({
  groupId,
  members,
  direct,
}: {
  groupId: string;
  /** the other members (not the viewer) */
  members: { id: string; name: string }[];
  direct: boolean;
}) {
  const t = useTranslations("chat.report");
  const uid = useId();
  const [state, action] = useActionState<ChatReportFormState, FormData>(
    reportChatAction,
    null,
  );
  if (state?.ok)
    return <Alert tone="success">{t("sent", { ref: state.ref ?? "" })}</Alert>;
  return (
    <Card>
      <details className="group">
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 font-semibold text-red-700">
          <Flag aria-hidden="true" className="size-4" />
          {t("open")}
        </summary>
        <form action={action} className="mt-3 space-y-4">
          <p className="text-sm text-slate-600">{t("intro")}</p>
          <input type="hidden" name="groupId" value={groupId} />
          <Field id={`${uid}-user`} label={t("who")}>
            {(a) => (
              <Select
                {...a}
                name="userId"
                defaultValue={direct ? (members[0]?.id ?? "") : ""}
              >
                {direct ? null : <option value="">{t("wholeChat")}</option>}
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field
            id={`${uid}-reason`}
            label={t("reason")}
            required
            error={state?.error === "reason" ? t("errors.reason") : null}
          >
            {(a) => (
              <Select {...a} name="reason" defaultValue="">
                <option value="" disabled>
                  {t("choose")}
                </option>
                {CHAT_REPORT_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {t(`reasons.${r}`)}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field
            id={`${uid}-detail`}
            label={t("detail")}
            hint={t("detailHint")}
            required
            error={state?.error === "detail" ? t("errors.detail") : null}
          >
            {(a) => (
              <Textarea
                {...a}
                name="detail"
                rows={4}
                minLength={5}
                maxLength={CHAT_REPORT_LIMITS.detail}
              />
            )}
          </Field>
          <div aria-live="polite">
            {state?.error === "forbidden" || state?.error === "rateLimited" ? (
              <Alert tone="error">{t(`errors.${state.error}`)}</Alert>
            ) : null}
          </div>
          <SubmitButton variant="danger" pendingText={t("sending")}>
            {t("send")}
          </SubmitButton>
        </form>
      </details>
    </Card>
  );
}
