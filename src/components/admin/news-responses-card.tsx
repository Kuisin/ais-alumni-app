import { ListChecks } from "lucide-react";
import { getTranslations } from "next-intl/server";
import {
  ReadMeter,
  ReceiptList,
  readPercent,
} from "@/components/admin/read-receipts";
import { Badge } from "@/components/ui/card";
import type { AudienceKey, RoleKey } from "@/generated/prisma/enums";
import { NewsPollKind } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { displayName, formatDateTime } from "@/lib/format";
import { asksAnything, bestCandidates, tally, type Vote } from "@/lib/news-hub";
import { responses } from "@/lib/news-hub-db";

const LIST_LIMIT = 20;

/** 回答状況: who confirmed / answered, poll and 日程調整 results (admins). */
export async function NewsResponsesCard({
  post,
  locale,
}: {
  post: {
    id: string;
    requireConfirm: boolean;
    deadline: Date | null;
    remindedAt: Date | null;
    audience: unknown;
    targetAudiences: AudienceKey[];
    targetRoles: RoleKey[];
  };
  locale: "ja" | "en";
}) {
  const { asks, members, pending } = await responses(post);
  if (!asksAnything(asks)) return null;
  const [t, ts, polls, confirms, pendingUsers] = await Promise.all([
    getTranslations("adminContent.hub.results"),
    getTranslations("news.hub.schedule"),
    db.newsPoll.findMany({
      where: { postId: post.id },
      orderBy: { kind: "asc" },
      select: {
        id: true,
        kind: true,
        question: true,
        options: {
          orderBy: { position: "asc" },
          select: { id: true, label: true, startsAt: true },
        },
        votes: {
          select: {
            optionId: true,
            answer: true,
            user: { select: { id: true, nameRomaji: true, nameKanji: true } },
          },
        },
      },
    }),
    post.requireConfirm
      ? db.newsConfirm.findMany({
          where: { postId: post.id },
          orderBy: { confirmedAt: "asc" },
          select: {
            confirmedAt: true,
            user: { select: { id: true, nameRomaji: true, nameKanji: true } },
          },
        })
      : [],
    db.user.findMany({
      where: { id: { in: pending.map((m) => m.id) } },
      orderBy: { nameRomaji: "asc" },
      select: { id: true, nameRomaji: true, nameKanji: true },
    }),
  ]);
  const done = members.length - pending.length;

  return (
    <section
      aria-labelledby="news-responses-title"
      className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"
    >
      <h2
        id="news-responses-title"
        className="flex items-center gap-2 text-lg font-semibold"
      >
        <ListChecks aria-hidden="true" className="size-5 text-brand-700" />
        {t("title")}
      </h2>
      <ReadMeter
        size="lg"
        read={done}
        total={members.length}
        label={`${t("responded")} ${done} / ${members.length}`}
        percentLabel={`${readPercent(done, members.length)}%`}
      />
      {post.deadline ? (
        <p className="text-sm text-slate-700">
          {t("deadline", { time: formatDateTime(post.deadline, locale) })}
          <span className="block text-xs text-slate-500">
            {post.remindedAt
              ? t("reminded", {
                  time: formatDateTime(post.remindedAt, locale),
                })
              : t("reminderPlanned")}
          </span>
        </p>
      ) : null}

      <details>
        <summary className="cursor-pointer text-sm font-semibold">
          {t("pendingList")}（{pending.length}）
        </summary>
        <div className="mt-2">
          <ReceiptList
            empty={t("none")}
            limit={LIST_LIMIT}
            moreLabel={`+${pending.length - LIST_LIMIT}`}
            items={pendingUsers.map((m) => ({
              key: m.id,
              name: displayName(m, locale),
            }))}
          />
        </div>
      </details>

      {post.requireConfirm ? (
        <details>
          <summary className="cursor-pointer text-sm font-semibold">
            {t("confirmedList")}（{confirms.length}）
          </summary>
          <div className="mt-2">
            <ReceiptList
              empty={t("none")}
              limit={LIST_LIMIT}
              moreLabel={`+${confirms.length - LIST_LIMIT}`}
              items={confirms.map((c) => ({
                key: c.user.id,
                name: displayName(c.user, locale),
                time: {
                  iso: c.confirmedAt.toISOString(),
                  label: formatDateTime(c.confirmedAt, locale),
                },
              }))}
            />
          </div>
        </details>
      ) : null}

      {polls.map((p) => {
        const counts = tally(
          p.options.map((o) => o.id),
          p.votes as { optionId: string; answer: Vote }[],
        );
        const best =
          p.kind === NewsPollKind.SCHEDULE
            ? new Set(bestCandidates(counts))
            : new Set<string>();
        const voters = new Set(p.votes.map((v) => v.user.id)).size;
        return (
          <div key={p.id} className="space-y-2 border-t border-slate-100 pt-3">
            <p className="text-sm font-semibold">
              {p.question || ts("title")}
              <span className="ml-2 font-normal text-slate-500">
                {t("voters", { count: voters })}
              </span>
            </p>
            <ul className="space-y-2 text-sm">
              {p.options.map((o) => {
                const c = counts.get(o.id) ?? { YES: 0, MAYBE: 0, NO: 0 };
                const who = p.votes.filter((v) => v.optionId === o.id);
                return (
                  <li key={o.id}>
                    <div className="flex items-center justify-between gap-2">
                      <span>
                        {o.startsAt
                          ? formatDateTime(o.startsAt, locale)
                          : o.label}
                        {o.startsAt && o.label ? ` ${o.label}` : ""}
                        {best.has(o.id) ? (
                          <span className="ml-1">
                            <Badge tone="green">{ts("best")}</Badge>
                          </span>
                        ) : null}
                      </span>
                      <span className="tabular-nums text-slate-600">
                        {p.kind === NewsPollKind.SCHEDULE
                          ? ts("counts", {
                              yes: c.YES,
                              maybe: c.MAYBE,
                              no: c.NO,
                            })
                          : c.YES}
                      </span>
                    </div>
                    {who.length ? (
                      <details className="text-xs text-slate-600">
                        <summary className="cursor-pointer">
                          {t("votersList")}
                        </summary>
                        <p className="mt-1">
                          {who
                            .map(
                              (v) =>
                                `${p.kind === NewsPollKind.SCHEDULE ? `${ts(v.answer as Vote)} ` : ""}${displayName(v.user, locale)}`,
                            )
                            .join("、")}
                        </p>
                      </details>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </section>
  );
}
