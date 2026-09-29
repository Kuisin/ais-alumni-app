import { BellRing } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { formatCompactDate, formatTime } from "@/components/admin/admin-format";
import {
  ReadMeter,
  ReceiptList,
  readPercent,
} from "@/components/admin/read-receipts";
import { displayName } from "@/lib/format";
import type { NotifyKind } from "@/lib/notify/catalog";
import {
  type NotificationReceiptRow,
  notificationReceipts,
} from "@/lib/notify/receipts";

/**
 * 「通知の開封」: who was notified (LINE / email) about this item and who
 * opened the notification's link. Hidden until a notification was sent.
 */
export async function NotificationOpensCard({
  kinds,
  refId,
  locale,
}: {
  kinds: NotifyKind[];
  refId: string;
  locale: "ja" | "en";
}) {
  const [t, receipts] = await Promise.all([
    getTranslations("notifications.receipts"),
    notificationReceipts(kinds, refId),
  ]);
  const opened = receipts.opened.length;
  const total = opened + receipts.unopened.length;
  if (total === 0) return null;
  const name = (r: NotificationReceiptRow) =>
    `${displayName(r.user, locale)} · ${r.channels
      .map((c) => t(`channel.${c === "LINE" || c === "PUSH" ? c : "EMAIL"}`))
      .join("/")}`;
  const more = (n: number) => t("showAll", { count: n - 20 });

  return (
    <section
      aria-labelledby="notification-opens-title"
      className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"
    >
      <h2
        id="notification-opens-title"
        className="mb-3 flex items-center gap-2 text-lg font-semibold"
      >
        <BellRing aria-hidden="true" className="size-5 text-brand-700" />
        {t("title")}
      </h2>
      <ReadMeter
        size="lg"
        read={opened}
        total={total}
        label={t("openedOf", { opened, total })}
        percentLabel={t("percent", { percent: readPercent(opened, total) })}
      />
      <p className="mt-2 text-xs text-slate-500">{t("hint")}</p>
      <h3 className="mt-5 mb-1 text-sm font-semibold text-slate-800">
        {t("opened")}
      </h3>
      <ReceiptList
        empty={t("noneOpened")}
        moreLabel={more(opened)}
        items={receipts.opened.map((r) => ({
          key: r.user.id,
          name: name(r),
          time: r.openedAt
            ? {
                iso: r.openedAt.toISOString(),
                label: `${formatCompactDate(r.openedAt, locale)} ${formatTime(r.openedAt, locale)}`,
              }
            : undefined,
        }))}
      />
      <h3 className="mt-5 mb-1 text-sm font-semibold text-slate-800">
        {t("unopened")}
      </h3>
      <ReceiptList
        empty={t("allOpened")}
        moreLabel={more(receipts.unopened.length)}
        items={receipts.unopened.map((r) => ({
          key: r.user.id,
          name: name(r),
        }))}
      />
    </section>
  );
}
