import { CheckCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { formatCompactDate, formatTime } from "@/components/admin/admin-format";
import {
  ReadMeter,
  ReceiptList,
  readPercent,
} from "@/components/admin/read-receipts";
import type { AudienceKey, RoleKey } from "@/generated/prisma/enums";
import { newsReaders, newsReadStats } from "@/lib/announcements";
import { displayName } from "@/lib/format";

const LIST_LIMIT = 20;

/** 「既読」 card for a published news post: counts, a bar and who read it. */
export async function NewsReadsCard({
  post,
  locale,
}: {
  post: { id: string; targetAudiences: AudienceKey[]; targetRoles: RoleKey[] };
  locale: "ja" | "en";
}) {
  const [t, stats, readers] = await Promise.all([
    getTranslations("adminContent"),
    newsReadStats([post]),
    newsReaders(post.id),
  ]);
  const { read, audience } = stats.get(post.id) ?? { read: 0, audience: 0 };

  return (
    <section
      aria-labelledby="news-reads-title"
      className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"
    >
      <h2
        id="news-reads-title"
        className="mb-3 flex items-center gap-2 text-lg font-semibold"
      >
        <CheckCheck aria-hidden="true" className="size-5 text-brand-700" />
        {t("reads.title")}
      </h2>
      <ReadMeter
        size="lg"
        read={read}
        total={audience}
        label={t("reads.readOf", { read, audience })}
        percentLabel={t("reads.percent", {
          percent: readPercent(read, audience),
        })}
      />
      <p className="mt-2 text-xs text-slate-500">{t("reads.audienceHint")}</p>
      <h3 className="mt-5 mb-1 text-sm font-semibold text-slate-800">
        {t("reads.readers")}
      </h3>
      <ReceiptList
        empty={t("reads.empty")}
        limit={LIST_LIMIT}
        moreLabel={t("reads.showAll", {
          count: readers.length - LIST_LIMIT,
        })}
        items={readers.map((r) => ({
          key: r.user.id,
          name: displayName(r.user, locale),
          time: {
            iso: r.readAt.toISOString(),
            label: `${formatCompactDate(r.readAt, locale)} ${formatTime(r.readAt, locale)}`,
          },
        }))}
      />
      {read > readers.length ? (
        <p className="mt-2 text-xs text-slate-500">
          {t("reads.truncated", { count: readers.length })}
        </p>
      ) : null}
    </section>
  );
}
