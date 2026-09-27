"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { CHOICE_CARD } from "@/components/events/target-roles-field";
import { Field, Input } from "@/components/ui/field";
import { toJstLocalInput } from "@/lib/format";

/** 配信: how the post goes out (matches saveNewsAction's `delivery`). */
export type Delivery = "NOW" | "SCHEDULE" | "DRAFT" | "KEEP";

const RADIO = "size-5 shrink-0 accent-brand-700 focus-visible:outline-none";

/**
 * Radio cards for 今すぐ送信 / 予約 / 下書き (and 公開中 for a live post), the
 * reservation time, and whether LINE/email notifications go out.
 * Controlled by the form so the submit label can follow the choice.
 */
export function DeliveryField({
  published,
  delivery,
  onDelivery,
  notify,
  onNotify,
  defaultSendAt,
  sendAtError,
}: {
  /** the post is already live: offer 公開中（変更しない） first */
  published: boolean;
  delivery: Delivery;
  onDelivery: (d: Delivery) => void;
  notify: boolean;
  onNotify: (on: boolean) => void;
  /** datetime-local (JST) */
  defaultSendAt: string;
  sendAtError?: string | null;
}) {
  const t = useTranslations("adminContent");
  const [sendAt, setSendAt] = useState(defaultSendAt);
  // `min` = now (JST), set after mount so server and client render the same.
  const [min, setMin] = useState<string | undefined>(undefined);
  useEffect(() => {
    setMin(toJstLocalInput(new Date()));
  }, []);

  const options: Delivery[] = [
    ...(published ? (["KEEP"] as const) : []),
    "NOW",
    "SCHEDULE",
    "DRAFT",
  ];
  const withNotify = delivery === "NOW" || delivery === "SCHEDULE";

  return (
    <div className="space-y-4">
      <fieldset className="min-w-0 space-y-2">
        <legend className="text-sm font-medium text-slate-800">
          {t("delivery.legend")}
        </legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {options.map((d) => (
            <label key={d} className={CHOICE_CARD}>
              <input
                type="radio"
                name="delivery"
                value={d}
                checked={delivery === d}
                onChange={() => onDelivery(d)}
                className={RADIO}
              />
              <span className="text-sm font-medium">
                {t(`delivery.${d}`)}
                <span className="block text-xs font-normal text-slate-500">
                  {t(`delivery.${d}Hint`)}
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {delivery === "SCHEDULE" ? (
        <Field
          id="sendAt"
          label={t("delivery.sendAt")}
          hint={t("delivery.sendAtHint")}
          error={sendAtError}
          required
        >
          {(a) => (
            <Input
              {...a}
              type="datetime-local"
              name="sendAt"
              value={sendAt}
              min={min}
              onChange={(e) => setSendAt(e.target.value)}
              className="sm:max-w-xs"
            />
          )}
        </Field>
      ) : null}

      {/* Kept in the DOM (hidden) for 下書き / 公開中 so the saved setting
          is not lost when switching options. */}
      <div hidden={!withNotify}>
        <label className={CHOICE_CARD}>
          <input
            type="checkbox"
            name="notifyOnPublish"
            checked={notify}
            onChange={(e) => onNotify(e.target.checked)}
            aria-describedby="notifyOnPublish-hint"
            className={RADIO}
          />
          <span className="text-sm font-medium">
            {t("delivery.notify")}
            <span
              id="notifyOnPublish-hint"
              className="block text-xs font-normal text-slate-500"
            >
              {t("delivery.notifyHint")}
            </span>
          </span>
        </label>
      </div>
    </div>
  );
}
