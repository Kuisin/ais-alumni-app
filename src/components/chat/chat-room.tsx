"use client";

import {
  ChevronLeft,
  Copy,
  EllipsisVertical,
  Radio,
  RefreshCw,
  SendHorizontal,
  Trash2,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import {
  Fragment,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  type ChatMessageView,
  chatMessagesAction,
  chatReadStateAction,
  deleteChatMessageAction,
  markChatReadAction,
  sendChatMessageAction,
  setChatMutedAction,
} from "@/app/actions/chat";
import {
  useRealtime,
  useRealtimeLive,
} from "@/components/realtime/realtime-provider";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/components/ui/cn";
import { Link } from "@/i18n/navigation";
import { CHAT_PAGE_SIZE, MAX_CHAT_MESSAGE } from "@/lib/chat";

const POLL_MS = 5000;
/** LINE-like colours: blue-grey talk background, green own bubbles. */
const BG = "bg-[#8cabd9]";
const MINE = "bg-[#8de055]";

const jstDay = (iso: string) =>
  new Date(new Date(iso).getTime() + 9 * 3600_000).toISOString().slice(0, 10);

/** Merge by id (newer copy wins), oldest first. */
function merge(
  a: readonly ChatMessageView[],
  b: readonly ChatMessageView[],
): ChatMessageView[] {
  const byId = new Map(a.map((m) => [m.id, m]));
  for (const m of b) byId.set(m.id, m);
  return [...byId.values()].sort((x, y) =>
    x.createdAt < y.createdAt ? -1 : x.createdAt > y.createdAt ? 1 : 0,
  );
}

export type RoomMember = { id: string; name: string; avatar: string | null };

/**
 * A talk, styled like LINE: full screen on phones with its own header,
 * bubbles (own in green on the right), 既読 marks, date pills and a composer
 * pinned to the bottom. New messages arrive over Supabase Realtime (or by
 * polling every few seconds without it); what's on screen is marked read.
 */
export function ChatRoom({
  groupId,
  topic,
  me,
  isAdmin,
  member,
  direct,
  title,
  members,
  memberCount,
  initial,
  initialReads,
  lastReadAt,
  muted: initialMuted,
  blocked,
}: {
  groupId: string;
  /** the group's realtime channel (src/lib/realtime.ts channelTopic) */
  topic: string;
  me: string;
  isAdmin: boolean;
  /** false = admin looking into a group (can moderate, can't post) */
  member: boolean;
  /** 1:1 talk */
  direct: boolean;
  title: string;
  members: RoomMember[];
  memberCount: number;
  initial: ChatMessageView[];
  /** when the other members last read the talk (ISO) */
  initialReads: string[];
  lastReadAt: string | null;
  muted: boolean;
  /** 1:1 talk where either side blocked the other */
  blocked: boolean;
}) {
  const t = useTranslations("chat.room");
  const tc = useTranslations("chat");
  const locale = useLocale();
  const uid = useId();
  const live = useRealtimeLive();
  const [messages, setMessages] = useState(initial);
  const [reads, setReads] = useState(initialReads);
  const [hasOlder, setHasOlder] = useState(initial.length >= CHAT_PAGE_SIZE);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [muted, setMuted] = useState(initialMuted);
  const [selected, setSelected] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  const canPost = member && !blocked;
  // The unread line stays where it was when the talk was opened.
  const [divider] = useState(() => {
    if (!lastReadAt) return null;
    return (
      initial.find((m) => m.createdAt > lastReadAt && m.userId !== me)?.id ??
      null
    );
  });

  // Full screen on phones: the page behind must not scroll.
  useEffect(() => {
    const html = document.documentElement;
    html.classList.add("max-lg:overflow-hidden");
    return () => html.classList.remove("max-lg:overflow-hidden");
  }, []);

  const fmtTime = (iso: string) =>
    new Intl.DateTimeFormat(locale === "en" ? "en-US" : "ja-JP", {
      timeZone: "Asia/Tokyo",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  const fmtDay = (iso: string) => {
    const d = jstDay(iso);
    if (d === jstDay(new Date().toISOString())) return t("today");
    if (d === jstDay(new Date(Date.now() - 86_400_000).toISOString()))
      return t("yesterday");
    return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "ja-JP", {
      timeZone: "Asia/Tokyo",
      month: "numeric",
      day: "numeric",
      weekday: "short",
    }).format(new Date(iso));
  };

  // Mark read (throttled) whenever new messages are on screen.
  const readTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const markRead = useCallback(() => {
    if (!member) return;
    clearTimeout(readTimer.current);
    readTimer.current = setTimeout(() => {
      if (document.visibilityState === "visible")
        void markChatReadAction(groupId);
    }, 1200);
  }, [groupId, member]);
  useEffect(() => {
    markRead();
    const onVisible = () => markRead();
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [markRead]);

  const add = useCallback(
    (incoming: ChatMessageView[]) => {
      if (!incoming.length) return;
      setMessages((list) => merge(list, incoming));
      markRead();
    },
    [markRead],
  );

  // Signals carry ids only: load what's new through the authorized action.
  const latestRef = useRef<string | undefined>(undefined);
  latestRef.current = messages.at(-1)?.createdAt;
  const fetchNew = useCallback(async () => {
    const rows = await chatMessagesAction(groupId, {
      after: latestRef.current ?? new Date(0).toISOString(),
    }).catch(() => null);
    if (rows) add(rows);
  }, [groupId, add]);
  const fetchReads = useCallback(async () => {
    const r = await chatReadStateAction(groupId).catch(() => null);
    if (r) setReads(r);
  }, [groupId]);
  useRealtime(topic, "message", () => void fetchNew());
  useRealtime(topic, "read", () => void fetchReads());
  useRealtime(topic, "delete", (p) =>
    setMessages((list) =>
      list.map((m) => (m.id === p.id ? { ...m, body: "", deleted: true } : m)),
    ),
  );

  // Without Realtime: poll for new messages and 既読.
  useEffect(() => {
    if (live) return;
    const timer = setInterval(() => {
      void fetchNew();
      void fetchReads();
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [live, fetchNew, fetchReads]);

  // Open at the unread line (or the bottom); then follow new messages
  // while the reader is at the bottom.
  const first = useRef(true);
  const count = messages.length;
  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el || !count) return;
    if (first.current) {
      first.current = false;
      const mark = divider
        ? el.querySelector<HTMLElement>("[data-divider]")
        : null;
      if (mark) el.scrollTop = mark.offsetTop - 80;
      else el.scrollTop = el.scrollHeight;
      return;
    }
    if (stick.current) el.scrollTop = el.scrollHeight;
  }, [count, divider]);

  async function loadOlder() {
    const oldest = messages[0];
    const el = scroller.current;
    if (!oldest || !el) return;
    stick.current = false;
    const before = el.scrollHeight;
    const rows = await chatMessagesAction(groupId, {
      before: oldest.createdAt,
    }).catch(() => null);
    if (!rows) return;
    setHasOlder(rows.length >= CHAT_PAGE_SIZE);
    setMessages((list) => merge(rows, list));
    requestAnimationFrame(() => {
      el.scrollTop += el.scrollHeight - before;
    });
  }

  async function send() {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setError(null);
    try {
      const r = await sendChatMessageAction(groupId, body);
      if (r.ok) {
        setText("");
        stick.current = true;
        add([r.message]);
      } else setError(t(`errors.${r.error}`));
    } catch {
      setError(t("errors.generic"));
    } finally {
      setSending(false);
    }
  }

  async function remove(m: ChatMessageView) {
    setSelected(null);
    if (!window.confirm(t("deleteConfirm"))) return;
    const r = await deleteChatMessageAction(m.id);
    if (r.ok)
      setMessages((list) =>
        list.map((x) =>
          x.id === m.id ? { ...x, body: "", deleted: true } : x,
        ),
      );
  }

  const readsOf = (m: ChatMessageView) =>
    reads.filter((r) => r >= m.createdAt).length;

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex flex-col",
        BG,
        "lg:static lg:z-auto lg:h-[calc(100dvh-9rem)] lg:overflow-hidden lg:rounded-2xl lg:shadow-sm",
      )}
    >
      {/* Talk header */}
      <header className="flex items-center gap-1 bg-[#8cabd9] px-1 pt-[env(safe-area-inset-top)] text-slate-900 lg:bg-[#7c9dcf]">
        <Link
          href="/app/chat"
          aria-label={t("back")}
          className="inline-flex size-11 items-center justify-center rounded-full hover:bg-black/10"
        >
          <ChevronLeft aria-hidden="true" className="size-6" />
        </Link>
        <h1 className="min-w-0 flex-1 truncate py-3 text-lg font-bold">
          {title}
          {!direct ? (
            <span className="ml-1 font-normal">({memberCount})</span>
          ) : null}
        </h1>
        <span
          className="mr-1 inline-flex items-center"
          title={live ? t("live") : t("polling")}
        >
          {live ? (
            <Radio aria-hidden="true" className="size-4 text-emerald-800" />
          ) : (
            <RefreshCw aria-hidden="true" className="size-4 text-slate-700" />
          )}
          <span className="sr-only">{live ? t("live") : t("polling")}</span>
        </span>
        <details className="relative">
          <summary
            aria-label={t("menu")}
            className="inline-flex size-11 cursor-pointer list-none items-center justify-center rounded-full hover:bg-black/10 [&::-webkit-details-marker]:hidden"
          >
            <EllipsisVertical aria-hidden="true" className="size-5" />
          </summary>
          <div className="absolute top-12 right-1 z-20 w-72 max-w-[calc(100vw-1rem)] space-y-3 rounded-xl bg-white p-3 text-sm shadow-xl">
            {direct ? (
              <p className="font-medium">{t("direct")}</p>
            ) : (
              <>
                <p className="font-semibold">
                  {tc("members", { count: memberCount })}
                </p>
                <ul className="max-h-56 space-y-2 overflow-y-auto">
                  {members.map((m) => (
                    <li key={m.id} className="flex items-center gap-2">
                      <Avatar src={m.avatar} name={m.name} size={28} />
                      <span className="truncate">{m.name}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
            {member ? (
              <label className="flex items-start gap-2 border-t border-slate-100 pt-3">
                <input
                  type="checkbox"
                  className="mt-0.5 size-4 accent-[#06c755]"
                  checked={!muted}
                  onChange={async (e) => {
                    const next = !e.target.checked;
                    setMuted(next);
                    await setChatMutedAction(groupId, next);
                  }}
                />
                {t("digest")}
              </label>
            ) : null}
          </div>
        </details>
      </header>

      {/* Messages */}
      <div
        ref={scroller}
        onScroll={(e) => {
          const el = e.currentTarget;
          stick.current =
            el.scrollTop + el.clientHeight >= el.scrollHeight - 120;
        }}
        className="flex-1 overflow-y-auto overscroll-contain px-3 py-3"
      >
        {hasOlder ? (
          <div className="mb-3 text-center">
            <button
              type="button"
              onClick={loadOlder}
              className="rounded-full bg-black/20 px-4 py-1.5 text-xs font-medium text-white hover:bg-black/30"
            >
              {t("older")}
            </button>
          </div>
        ) : null}
        {messages.length === 0 ? (
          <p className="mx-auto mt-10 max-w-xs rounded-2xl bg-white/70 p-4 text-center text-sm text-slate-700">
            {tc("noMessages")}
          </p>
        ) : (
          <ol
            aria-live="polite"
            aria-relevant="additions"
            className="space-y-1"
          >
            {messages.map((m, i) => {
              const prev = messages[i - 1];
              const newDay =
                !prev || jstDay(prev.createdAt) !== jstDay(m.createdAt);
              const mine = m.userId === me;
              const runStart =
                newDay || !prev || prev.userId !== m.userId || m.id === divider;
              const canAct = !m.deleted && (mine || isAdmin);
              const n = mine ? readsOf(m) : 0;
              return (
                <Fragment key={m.id}>
                  {newDay ? (
                    <li className="flex justify-center py-2">
                      <span className="rounded-full bg-black/20 px-3 py-1 text-xs font-medium text-white">
                        {fmtDay(m.createdAt)}
                      </span>
                    </li>
                  ) : null}
                  {m.id === divider ? (
                    <li data-divider className="flex justify-center py-2">
                      <span className="rounded-full bg-white/80 px-4 py-1 text-xs font-semibold text-slate-700">
                        {t("unreadDivider")}
                      </span>
                    </li>
                  ) : null}
                  <li
                    className={cn(
                      "flex gap-2",
                      mine ? "justify-end" : "justify-start",
                      runStart && "pt-2",
                    )}
                  >
                    {!mine ? (
                      runStart ? (
                        <Avatar src={m.avatar} name={m.name} size={36} />
                      ) : (
                        <span aria-hidden="true" className="w-9 shrink-0" />
                      )
                    ) : null}
                    <div
                      className={cn(
                        "flex max-w-[78%] min-w-0 flex-col",
                        mine ? "items-end" : "items-start",
                      )}
                    >
                      {!mine && runStart && !direct ? (
                        <span className="mb-0.5 px-1 text-xs text-slate-800">
                          {m.name}
                        </span>
                      ) : null}
                      <div
                        className={cn(
                          "flex items-end gap-1",
                          mine && "flex-row-reverse",
                        )}
                      >
                        {m.deleted ? (
                          <p className="rounded-2xl bg-white/50 px-3 py-2 text-sm text-slate-600 italic">
                            {t("deleted")}
                          </p>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              setSelected((s) => (s === m.id ? null : m.id))
                            }
                            aria-expanded={selected === m.id}
                            className={cn(
                              "rounded-[18px] px-3.5 py-2 text-left text-[15px] leading-relaxed whitespace-pre-wrap break-words text-slate-900 shadow-sm select-text",
                              mine ? MINE : "bg-white",
                              runStart &&
                                (mine ? "rounded-tr-md" : "rounded-tl-md"),
                            )}
                          >
                            {m.body}
                          </button>
                        )}
                        <span
                          className={cn(
                            "flex shrink-0 flex-col pb-0.5 text-[10px] leading-tight text-slate-800",
                            mine ? "items-end" : "items-start",
                          )}
                        >
                          {mine && n > 0 ? (
                            <span>
                              {direct
                                ? t("read")
                                : t("readCount", { count: n })}
                            </span>
                          ) : null}
                          <time dateTime={m.createdAt} className="tabular-nums">
                            {fmtTime(m.createdAt)}
                          </time>
                        </span>
                      </div>
                      {selected === m.id && !m.deleted ? (
                        <div className="mt-1 flex gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              void navigator.clipboard?.writeText(m.body);
                              setSelected(null);
                            }}
                            className="inline-flex min-h-9 items-center gap-1 rounded-full bg-white px-3 text-xs font-medium shadow"
                          >
                            <Copy aria-hidden="true" className="size-3.5" />
                            {t("copy")}
                          </button>
                          {canAct ? (
                            <button
                              type="button"
                              onClick={() => remove(m)}
                              aria-label={t("deleteLabel", { name: m.name })}
                              className="inline-flex min-h-9 items-center gap-1 rounded-full bg-white px-3 text-xs font-medium text-red-700 shadow"
                            >
                              <Trash2 aria-hidden="true" className="size-3.5" />
                              {t("delete")}
                            </button>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </li>
                </Fragment>
              );
            })}
          </ol>
        )}
      </div>

      {/* Composer */}
      {canPost ? (
        <form
          className="border-t border-slate-200 bg-white px-2 pt-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)]"
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          {error ? (
            <p role="alert" className="px-2 pb-1 text-sm text-red-700">
              {error}
            </p>
          ) : null}
          <div className="flex items-end gap-2">
            <label htmlFor={`${uid}-msg`} className="sr-only">
              {t("messageLabel")}
            </label>
            <textarea
              id={`${uid}-msg`}
              value={text}
              rows={Math.min(5, Math.max(1, text.split("\n").length))}
              maxLength={MAX_CHAT_MESSAGE}
              placeholder={t("placeholder")}
              aria-describedby={`${uid}-hint`}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                // Enter sends; Shift+Enter is a new line; never while the
                // IME is composing (Japanese input).
                if (
                  e.key === "Enter" &&
                  !e.shiftKey &&
                  !e.nativeEvent.isComposing &&
                  e.keyCode !== 229
                ) {
                  e.preventDefault();
                  void send();
                }
              }}
              className="block max-h-36 min-h-10 flex-1 resize-none rounded-[20px] border-0 bg-slate-100 px-4 py-2 text-base focus-visible:outline-2 focus-visible:outline-[#06c755]"
            />
            <button
              type="submit"
              disabled={sending || !text.trim()}
              aria-label={sending ? t("sending") : t("send")}
              className="inline-flex size-10 shrink-0 items-center justify-center rounded-full text-[#06c755] hover:bg-[#06c755]/10 disabled:text-slate-300"
            >
              <SendHorizontal aria-hidden="true" className="size-6" />
            </button>
          </div>
          <p id={`${uid}-hint`} className="sr-only">
            {t("enterHint")}
          </p>
        </form>
      ) : (
        <p className="bg-white px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] text-center text-sm text-slate-600">
          {blocked ? t("blockedNotice") : t("adminView")}
        </p>
      )}
    </div>
  );
}
