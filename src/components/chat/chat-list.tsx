"use client";

import { MessageCirclePlus, Search, Users } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useId, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/components/ui/cn";
import { Link } from "@/i18n/navigation";

export type ChatListRow = {
  id: string;
  direct: boolean;
  /** false = an admin looking into a group they're not in */
  joined: boolean;
  name: string;
  avatar: string | null;
  memberCount: number;
  preview: string;
  lastAt: string | null;
  unread: number;
  /** an unread message mentions me (or @全員) */
  mentioned: boolean;
  order: number;
};

type Filter = "all" | "direct" | "groups";

/** LINE-style talk list: search, filter chips, avatars, green badges. */
export function ChatList({
  rows,
  canStartDirect,
}: {
  rows: ChatListRow[];
  canStartDirect: boolean;
}) {
  const t = useTranslations("chat");
  const locale = useLocale();
  const uid = useId();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const when = (iso: string) => {
    const d = new Date(iso);
    const day = (x: Date) =>
      new Date(x.getTime() + 9 * 3600_000).toISOString().slice(0, 10);
    const today = day(new Date());
    const yesterday = day(new Date(Date.now() - 86_400_000));
    if (day(d) === today)
      return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "ja-JP", {
        timeZone: "Asia/Tokyo",
        hour: "2-digit",
        minute: "2-digit",
      }).format(d);
    if (day(d) === yesterday) return t("room.yesterday");
    return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "ja-JP", {
      timeZone: "Asia/Tokyo",
      month: "numeric",
      day: "numeric",
    }).format(d);
  };

  const term = q.trim().toLowerCase();
  const shown = rows.filter(
    (r) =>
      (filter === "all" || (filter === "direct" ? r.direct : !r.direct)) &&
      (!term ||
        r.name.toLowerCase().includes(term) ||
        r.preview.toLowerCase().includes(term)),
  );
  const joined = shown.filter((r) => r.joined);
  const others = shown.filter((r) => !r.joined);

  const list = (items: ChatListRow[]) => (
    <ul className="divide-y divide-slate-100">
      {items.map((r) => (
        <li key={r.id}>
          <Link
            href={`/app/chat/${r.id}`}
            className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 focus-visible:bg-slate-50"
          >
            {r.direct ? (
              <Avatar src={r.avatar} name={r.name} size={52} />
            ) : (
              <span
                aria-hidden="true"
                className="inline-flex size-[52px] shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-800"
              >
                <Users className="size-6" />
              </span>
            )}
            <span className="min-w-0 flex-1">
              <span className="flex items-baseline justify-between gap-2">
                <span className="truncate font-semibold text-slate-900">
                  {r.name}
                  {!r.direct ? (
                    <span className="ml-1 font-normal text-slate-500">
                      ({r.memberCount})
                    </span>
                  ) : null}
                </span>
                {r.lastAt ? (
                  <time
                    dateTime={r.lastAt}
                    className="shrink-0 text-xs text-slate-500"
                  >
                    {when(r.lastAt)}
                  </time>
                ) : null}
              </span>
              <span className="mt-0.5 flex items-center justify-between gap-2">
                <span className="truncate text-sm text-slate-500">
                  {r.mentioned ? (
                    <span className="mr-1 font-semibold text-red-600">
                      {t("mentionedYou")}
                    </span>
                  ) : null}
                  {r.preview}
                </span>
                {r.unread ? (
                  <span className="inline-flex min-w-5 shrink-0 justify-center rounded-full bg-red-600 px-1.5 text-xs leading-5 font-semibold text-white tabular-nums">
                    <span aria-hidden="true">
                      {r.unread > 999 ? "999+" : r.unread}
                    </span>
                    <span className="sr-only">
                      {t("unread", { count: r.unread })}
                    </span>
                  </span>
                ) : null}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="-mx-4 -mt-6 lg:mx-0 lg:mt-0">
      <div className="sticky top-0 z-10 space-y-3 border-b border-slate-200 bg-white px-4 pt-4 pb-3 lg:rounded-t-2xl">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          {canStartDirect ? (
            <Link
              href="/app/chat/new"
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-brand-700 hover:bg-brand-50"
            >
              <MessageCirclePlus aria-hidden="true" className="size-5" />
              {t("newTalk")}
            </Link>
          ) : null}
        </div>
        <div className="relative">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400"
          />
          <label htmlFor={`${uid}-q`} className="sr-only">
            {t("search")}
          </label>
          <input
            id={`${uid}-q`}
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("search")}
            className="block min-h-10 w-full rounded-full border-0 bg-slate-100 py-2 pr-4 pl-9 text-base placeholder:text-slate-500 focus-visible:outline-2 focus-visible:outline-brand-600"
          />
        </div>
        <fieldset className="flex gap-2">
          <legend className="sr-only">{t("filter")}</legend>
          {(["all", "direct", "groups"] as const).map((f) => (
            <label
              key={f}
              className={cn(
                "inline-flex min-h-9 cursor-pointer items-center rounded-full border px-3 text-sm",
                "border-slate-300 text-slate-700 has-checked:border-brand-700 has-checked:bg-brand-50 has-checked:font-semibold has-checked:text-brand-800",
              )}
            >
              <input
                type="radio"
                name={`${uid}-filter`}
                className="sr-only"
                checked={filter === f}
                onChange={() => setFilter(f)}
              />
              {t(`filters.${f}`)}
            </label>
          ))}
        </fieldset>
      </div>

      <div className="bg-white lg:rounded-b-2xl lg:border lg:border-t-0 lg:border-slate-200">
        {joined.length === 0 && others.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-slate-600">
            <p className="font-medium">{term ? t("noMatch") : t("empty")}</p>
            {!term ? <p className="mt-1">{t("emptyHint")}</p> : null}
          </div>
        ) : (
          list(joined)
        )}
        {others.length ? (
          <section>
            <h2 className="bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-600">
              {t("allGroups")}
            </h2>
            {list(others)}
          </section>
        ) : null}
      </div>
    </div>
  );
}
