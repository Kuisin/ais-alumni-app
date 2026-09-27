"use client";

import { Radio, RefreshCw, SendHorizontal, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import {
  Fragment,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import {
  type ChatMessageView,
  chatMessagesAction,
  deleteChatMessageAction,
  markChatReadAction,
  sendChatMessageAction,
  setChatMutedAction,
} from "@/app/actions/chat";
import {
  useRealtime,
  useRealtimeLive,
} from "@/components/realtime/realtime-provider";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/card";
import { cn } from "@/components/ui/cn";
import { Textarea } from "@/components/ui/field";
import { CHAT_PAGE_SIZE, MAX_CHAT_MESSAGE } from "@/lib/chat";

const POLL_MS = 5000;

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

/**
 * A group chat. New messages arrive over Supabase Realtime (or by polling
 * every few seconds without it); what's on screen is marked read.
 */
export function ChatRoom({
  groupId,
  me,
  isAdmin,
  member,
  initial,
  lastReadAt,
  muted: initialMuted,
}: {
  groupId: string;
  me: string;
  isAdmin: boolean;
  /** false = admin looking in (can moderate, can't post) */
  member: boolean;
  initial: ChatMessageView[];
  lastReadAt: string | null;
  muted: boolean;
}) {
  const t = useTranslations("chat.room");
  const tc = useTranslations("chat");
  const locale = useLocale();
  const uid = useId();
  const live = useRealtimeLive();
  const [messages, setMessages] = useState(initial);
  const [hasOlder, setHasOlder] = useState(initial.length >= CHAT_PAGE_SIZE);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [muted, setMuted] = useState(initialMuted);
  const bottom = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  // The unread line stays where it was when the room was opened.
  const [divider] = useState(() => {
    if (!lastReadAt) return null;
    return (
      initial.find((m) => m.createdAt > lastReadAt && m.userId !== me)?.id ??
      null
    );
  });

  const fmtTime = (iso: string) =>
    new Intl.DateTimeFormat(locale === "en" ? "en-US" : "ja-JP", {
      timeZone: "Asia/Tokyo",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  const fmtDay = (iso: string) => {
    const d = jstDay(iso);
    const today = jstDay(new Date().toISOString());
    const yesterday = jstDay(new Date(Date.now() - 86_400_000).toISOString());
    if (d === today) return t("today");
    if (d === yesterday) return t("yesterday");
    return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "ja-JP", {
      timeZone: "Asia/Tokyo",
      month: "long",
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
      void markChatReadAction(groupId);
    }, 1500);
  }, [groupId, member]);
  useEffect(() => {
    markRead();
  }, [markRead]);

  const add = useCallback(
    (incoming: ChatMessageView[]) => {
      if (!incoming.length) return;
      setMessages((list) => merge(list, incoming));
      markRead();
    },
    [markRead],
  );

  useRealtime(`chat:${groupId}`, "message", (p) =>
    add([p as unknown as ChatMessageView]),
  );
  useRealtime(`chat:${groupId}`, "delete", (p) =>
    setMessages((list) =>
      list.map((m) => (m.id === p.id ? { ...m, body: "", deleted: true } : m)),
    ),
  );

  // Without Realtime: poll for new messages.
  const latest = messages.at(-1)?.createdAt;
  useEffect(() => {
    if (live) return;
    const timer = setInterval(async () => {
      const rows = await chatMessagesAction(groupId, {
        after: latest ?? new Date(0).toISOString(),
      }).catch(() => null);
      if (rows) add(rows);
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [live, groupId, latest, add]);

  // Follow new messages when the reader is at the bottom.
  useEffect(() => {
    const onScroll = () => {
      stick.current =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 160;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  const count = messages.length;
  useEffect(() => {
    if (count && stick.current)
      bottom.current?.scrollIntoView({ block: "end" });
  }, [count]);

  async function loadOlder() {
    const first = messages[0];
    if (!first) return;
    stick.current = false;
    const rows = await chatMessagesAction(groupId, {
      before: first.createdAt,
    }).catch(() => null);
    if (!rows) return;
    setHasOlder(rows.length >= CHAT_PAGE_SIZE);
    setMessages((list) => merge(rows, list));
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
    if (!window.confirm(t("deleteConfirm"))) return;
    const r = await deleteChatMessageAction(m.id);
    if (r.ok)
      setMessages((list) =>
        list.map((x) =>
          x.id === m.id ? { ...x, body: "", deleted: true } : x,
        ),
      );
  }

  return (
    <div className="space-y-3">
      <p className="flex items-center gap-1.5 text-xs text-slate-500">
        {live ? (
          <Radio aria-hidden="true" className="size-3.5 text-emerald-600" />
        ) : (
          <RefreshCw aria-hidden="true" className="size-3.5" />
        )}
        {live ? t("live") : t("polling")}
      </p>

      {hasOlder ? (
        <div className="text-center">
          <Button variant="ghost" onClick={loadOlder}>
            {t("older")}
          </Button>
        </div>
      ) : null}

      {messages.length === 0 ? (
        <p className="rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-600">
          {tc("noMessages")}
        </p>
      ) : (
        <ol aria-live="polite" aria-relevant="additions" className="space-y-2">
          {messages.map((m, i) => {
            const prev = messages[i - 1];
            const newDay =
              !prev || jstDay(prev.createdAt) !== jstDay(m.createdAt);
            const mine = m.userId === me;
            const sameAuthor =
              prev && !newDay && prev.userId === m.userId && !mine;
            return (
              <Fragment key={m.id}>
                {newDay ? (
                  <li className="py-2 text-center text-xs text-slate-500">
                    <span className="rounded-full bg-slate-100 px-3 py-1">
                      {fmtDay(m.createdAt)}
                    </span>
                  </li>
                ) : null}
                {m.id === divider ? (
                  <li className="flex items-center gap-2 py-1 text-xs font-semibold text-red-700">
                    <span className="h-px flex-1 bg-red-200" />
                    {t("unreadDivider")}
                    <span className="h-px flex-1 bg-red-200" />
                  </li>
                ) : null}
                <li
                  className={cn(
                    "flex flex-col",
                    mine ? "items-end" : "items-start",
                  )}
                >
                  {!mine && !sameAuthor ? (
                    <span className="mb-0.5 px-1 text-xs font-medium text-slate-600">
                      {m.name}
                    </span>
                  ) : null}
                  <div
                    className={cn(
                      "flex max-w-[85%] items-end gap-1.5",
                      mine && "flex-row-reverse",
                    )}
                  >
                    <p
                      className={cn(
                        "rounded-2xl px-3.5 py-2 text-[15px] leading-relaxed whitespace-pre-wrap break-words",
                        m.deleted
                          ? "border border-dashed border-slate-300 text-sm text-slate-500 italic"
                          : mine
                            ? "rounded-br-md bg-brand-700 text-white"
                            : "rounded-bl-md bg-white text-slate-900 shadow-sm ring-1 ring-slate-200",
                      )}
                    >
                      {m.deleted ? t("deleted") : m.body}
                    </p>
                    <span className="flex shrink-0 flex-col items-center gap-0.5">
                      {!m.deleted && (mine || isAdmin) ? (
                        <button
                          type="button"
                          onClick={() => remove(m)}
                          aria-label={t("deleteLabel", { name: m.name })}
                          className="inline-flex size-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-red-700"
                        >
                          <Trash2 aria-hidden="true" className="size-3.5" />
                        </button>
                      ) : null}
                      <time
                        dateTime={m.createdAt}
                        className="text-[11px] text-slate-500 tabular-nums"
                      >
                        {fmtTime(m.createdAt)}
                      </time>
                    </span>
                  </div>
                </li>
              </Fragment>
            );
          })}
        </ol>
      )}
      <div ref={bottom} />

      {member ? (
        <form
          className="sticky bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-10 -mx-4 space-y-1 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur lg:bottom-0"
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          {error ? <Alert tone="error">{error}</Alert> : null}
          <div className="flex items-end gap-2">
            <label htmlFor={`${uid}-msg`} className="sr-only">
              {t("messageLabel")}
            </label>
            <Textarea
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
              className="max-h-40 min-h-11 resize-none"
            />
            <Button
              type="submit"
              disabled={sending || !text.trim()}
              aria-label={sending ? t("sending") : t("send")}
              className="shrink-0 px-3"
            >
              <SendHorizontal aria-hidden="true" className="size-5" />
            </Button>
          </div>
          <p
            id={`${uid}-hint`}
            className="hidden text-xs text-slate-500 sm:block"
          >
            {t("enterHint")}
          </p>
          <label className="flex min-h-9 items-center gap-2 text-xs text-slate-600">
            <input
              type="checkbox"
              className="size-4 accent-brand-700"
              checked={!muted}
              onChange={async (e) => {
                const next = !e.target.checked;
                setMuted(next);
                await setChatMutedAction(groupId, next);
              }}
            />
            {t("digest")}
          </label>
        </form>
      ) : (
        <Alert tone="info">{t("adminView")}</Alert>
      )}
    </div>
  );
}
