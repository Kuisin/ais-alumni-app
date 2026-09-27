"use client";

import {
  CalendarClock,
  CircleCheck,
  EyeOff,
  ListChecks,
  MessageSquare,
  Trash2,
  Vote as VoteIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { type ReactNode, useId, useState, useTransition } from "react";
import {
  addCommentAction,
  confirmNewsAction,
  deleteCommentAction,
  type HubResult,
  hideCommentAction,
  toggleReactionAction,
  votePollAction,
} from "@/app/actions/news-hub";
import { Button } from "@/components/ui/button";
import { Alert, Badge, Card } from "@/components/ui/card";
import { cn } from "@/components/ui/cn";
import { Textarea } from "@/components/ui/field";
import { bestCandidates, MAX_COMMENT_LENGTH, type Vote } from "@/lib/news-hub";
import type { HubView } from "@/lib/news-hub-db";

type Poll = HubView["polls"][number];

function useFormat() {
  const locale = useLocale();
  return (iso: string, withWeekday = true) =>
    new Intl.DateTimeFormat(locale === "en" ? "en-US" : "ja-JP", {
      timeZone: "Asia/Tokyo",
      month: "short",
      day: "numeric",
      ...(withWeekday ? { weekday: "short" } : {}),
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
}

/** Runs an action, shows its error, and refreshes the page on success. */
function useHubAction() {
  const t = useTranslations("news.hub.errors");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (fn: () => Promise<HubResult>, onOk?: () => void) =>
    start(async () => {
      setError(null);
      try {
        const r = await fn();
        if (r.ok) {
          onOk?.();
          router.refresh();
        } else setError(t(r.error));
      } catch {
        setError(t("generic"));
      }
    });
  return { pending, error, run };
}

function Section({
  icon,
  title,
  children,
  id,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
  id: string;
}) {
  return (
    <Card>
      <section aria-labelledby={id} className="space-y-3">
        <h2
          id={id}
          className="flex items-center gap-2 text-lg font-semibold [&_svg]:size-5 [&_svg]:text-brand-700"
        >
          {icon}
          {title}
        </h2>
        {children}
      </section>
    </Card>
  );
}

export function ConfirmCard({
  postId,
  confirmedAt,
  count,
  open,
}: {
  postId: string;
  confirmedAt: string | null;
  count: number;
  open: boolean;
}) {
  const t = useTranslations("news.hub.confirm");
  const fmt = useFormat();
  const { pending, error, run } = useHubAction();
  return (
    <Section id="hub-confirm" icon={<ListChecks />} title={t("title")}>
      {error ? <Alert tone="error">{error}</Alert> : null}
      {confirmedAt ? (
        <div className="flex flex-wrap items-center gap-3">
          <p className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-900">
            <CircleCheck aria-hidden="true" className="size-5" />
            {t("done", { time: fmt(confirmedAt) })}
          </p>
          {open ? (
            <Button
              variant="ghost"
              disabled={pending}
              onClick={() => run(() => confirmNewsAction(postId, false))}
            >
              {t("undo")}
            </Button>
          ) : null}
        </div>
      ) : (
        <>
          <p className="text-sm text-slate-600">{t("hint")}</p>
          <Button
            className="w-full sm:w-auto"
            disabled={pending}
            onClick={() => run(() => confirmNewsAction(postId, true))}
          >
            <CircleCheck aria-hidden="true" className="size-4" />
            {t("button")}
          </Button>
        </>
      )}
      <p className="text-xs text-slate-500">{t("count", { count })}</p>
    </Section>
  );
}

export function PollCard({
  postId,
  poll,
  open,
}: {
  postId: string;
  poll: Poll;
  open: boolean;
}) {
  const t = useTranslations("news.hub.poll");
  const uid = useId();
  const mine = poll.options.filter((o) => o.mine === "YES").map((o) => o.id);
  const [editing, setEditing] = useState(mine.length === 0);
  const [chosen, setChosen] = useState<string[]>(mine);
  const { pending, error, run } = useHubAction();
  const max = Math.max(1, ...poll.options.map((o) => o.counts.YES));
  const showForm = open && editing;

  return (
    <Section id={`${uid}-poll`} icon={<VoteIcon />} title={t("title")}>
      <p className="font-medium">{poll.question}</p>
      {error ? <Alert tone="error">{error}</Alert> : null}
      {showForm ? (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            run(
              () =>
                votePollAction(postId, {
                  pollId: poll.id,
                  choices: Object.fromEntries(
                    chosen.map((id) => [id, "YES" as const]),
                  ),
                }),
              () => setEditing(false),
            );
          }}
        >
          <fieldset className="space-y-2">
            <legend className="mb-1 text-sm text-slate-600">
              {poll.multiple ? t("multiple") : t("single")}
            </legend>
            {poll.options.map((o) => (
              <label
                key={o.id}
                className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-slate-300 px-3 py-2 has-checked:border-brand-700 has-checked:bg-brand-50"
              >
                <input
                  type={poll.multiple ? "checkbox" : "radio"}
                  name={`${uid}-choice`}
                  className="size-5 shrink-0 accent-brand-700"
                  checked={chosen.includes(o.id)}
                  onChange={(e) =>
                    setChosen((c) =>
                      poll.multiple
                        ? e.target.checked
                          ? [...c, o.id]
                          : c.filter((x) => x !== o.id)
                        : [o.id],
                    )
                  }
                />
                <span>{o.label}</span>
              </label>
            ))}
          </fieldset>
          <Button
            type="submit"
            disabled={pending || chosen.length === 0}
            className="w-full sm:w-auto"
          >
            {mine.length ? t("update") : t("submit")}
          </Button>
        </form>
      ) : (
        <ul className="space-y-2">
          {poll.options.map((o) => (
            <li key={o.id} className="space-y-1">
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className={cn(o.mine && "font-semibold text-brand-800")}>
                  {o.mine ? (
                    <CircleCheck
                      aria-label={t("yours")}
                      className="mr-1 inline size-4 text-brand-700"
                    />
                  ) : null}
                  {o.label}
                </span>
                <span className="tabular-nums text-slate-600">
                  {o.counts.YES}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={cn(
                    "h-full rounded-full",
                    o.mine ? "bg-brand-700" : "bg-slate-400",
                  )}
                  style={{ width: `${(o.counts.YES / max) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-slate-500">
          {t("voters", { count: poll.voters })}
        </p>
        {!showForm && open ? (
          <Button variant="ghost" onClick={() => setEditing(true)}>
            {mine.length ? t("update") : t("submit")}
          </Button>
        ) : null}
      </div>
    </Section>
  );
}

const ANSWERS: Vote[] = ["YES", "MAYBE", "NO"];
const ANSWER_TONE: Record<Vote, string> = {
  YES: "has-checked:border-emerald-700 has-checked:bg-emerald-50 has-checked:text-emerald-900",
  MAYBE:
    "has-checked:border-amber-600 has-checked:bg-amber-50 has-checked:text-amber-900",
  NO: "has-checked:border-red-700 has-checked:bg-red-50 has-checked:text-red-900",
};

export function ScheduleCard({
  postId,
  poll,
  open,
}: {
  postId: string;
  poll: Poll;
  open: boolean;
}) {
  const t = useTranslations("news.hub.schedule");
  const fmt = useFormat();
  const uid = useId();
  const initial = Object.fromEntries(
    poll.options.flatMap((o) => (o.mine ? [[o.id, o.mine]] : [])),
  ) as Record<string, Vote>;
  const answered = Object.keys(initial).length > 0;
  const [answers, setAnswers] = useState<Record<string, Vote>>(initial);
  const { pending, error, run } = useHubAction();
  const [saved, setSaved] = useState(false);
  const best = new Set(
    bestCandidates(new Map(poll.options.map((o) => [o.id, o.counts]))),
  );
  const complete = poll.options.every((o) => answers[o.id]);

  return (
    <Section id={`${uid}-schedule`} icon={<CalendarClock />} title={t("title")}>
      {poll.question ? <p className="font-medium">{poll.question}</p> : null}
      {error ? <Alert tone="error">{error}</Alert> : null}
      {saved ? <Alert tone="success">{t("saved")}</Alert> : null}
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          run(
            () => votePollAction(postId, { pollId: poll.id, choices: answers }),
            () => setSaved(true),
          );
        }}
      >
        <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
          {poll.options.map((o) => {
            const date = o.startsAt ? fmt(o.startsAt) : o.label;
            return (
              <li key={o.id} className="space-y-2 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">
                    {date}
                    {o.startsAt && o.label ? (
                      <span className="ml-2 text-sm font-normal text-slate-600">
                        {o.label}
                      </span>
                    ) : null}
                    {best.has(o.id) ? (
                      <span className="ml-2">
                        <Badge tone="green">{t("best")}</Badge>
                      </span>
                    ) : null}
                  </p>
                  <span className="text-sm tabular-nums text-slate-600">
                    {t("counts", {
                      yes: o.counts.YES,
                      maybe: o.counts.MAYBE,
                      no: o.counts.NO,
                    })}
                  </span>
                </div>
                {open ? (
                  <fieldset className="grid grid-cols-3 gap-2">
                    <legend className="sr-only">
                      {t("answerFor", { date })}
                    </legend>
                    {ANSWERS.map((a) => (
                      <label
                        key={a}
                        className={cn(
                          "flex min-h-11 cursor-pointer flex-col items-center justify-center rounded-lg border border-slate-300 px-2 py-1 text-center",
                          ANSWER_TONE[a],
                        )}
                      >
                        <input
                          type="radio"
                          className="sr-only"
                          name={`${uid}-${o.id}`}
                          checked={answers[o.id] === a}
                          onChange={() => {
                            setSaved(false);
                            setAnswers((x) => ({ ...x, [o.id]: a }));
                          }}
                        />
                        <span
                          aria-hidden="true"
                          className="text-lg leading-none"
                        >
                          {t(a)}
                        </span>
                        <span className="text-xs">{t(`${a}Label`)}</span>
                      </label>
                    ))}
                  </fieldset>
                ) : o.mine ? (
                  <p className="text-sm">
                    {t(o.mine)} {t(`${o.mine}Label`)}
                  </p>
                ) : null}
                {o.names.length ? (
                  <details className="text-sm text-slate-600">
                    <summary className="cursor-pointer">{t("answers")}</summary>
                    <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
                      {o.names.map((n, i) => (
                        // biome-ignore lint/suspicious/noArrayIndexKey: names may repeat
                        <li key={i}>
                          {t(n.answer as Vote)} {n.name}
                        </li>
                      ))}
                    </ul>
                  </details>
                ) : null}
              </li>
            );
          })}
        </ul>
        {open ? (
          <>
            {!complete ? (
              <p className="text-sm text-slate-600">{t("needAll")}</p>
            ) : null}
            <Button
              type="submit"
              disabled={pending || !complete}
              className="w-full sm:w-auto"
            >
              {answered ? t("update") : t("submit")}
            </Button>
          </>
        ) : null}
      </form>
    </Section>
  );
}

export function Reactions({
  postId,
  reactions,
}: {
  postId: string;
  reactions: HubView["reactions"];
}) {
  const t = useTranslations("news.hub.reactions");
  const { pending, error, run } = useHubAction();
  return (
    <div className="space-y-2">
      <ul aria-label={t("label")} className="flex flex-wrap gap-2">
        {reactions.map((r) => (
          <li key={r.emoji}>
            <button
              type="button"
              aria-pressed={r.mine}
              aria-label={t("toggle", { emoji: r.emoji, count: r.count })}
              disabled={pending}
              onClick={() => run(() => toggleReactionAction(postId, r.emoji))}
              className={cn(
                "inline-flex min-h-11 items-center gap-1 rounded-full border px-3 text-sm transition-colors",
                r.mine
                  ? "border-brand-600 bg-brand-50 text-brand-900"
                  : "border-slate-300 bg-white hover:bg-slate-50",
              )}
            >
              <span aria-hidden="true">{r.emoji}</span>
              {r.count ? (
                <span aria-hidden="true" className="tabular-nums">
                  {r.count}
                </span>
              ) : null}
            </button>
          </li>
        ))}
      </ul>
      {error ? <Alert tone="error">{error}</Alert> : null}
    </div>
  );
}

export function Comments({
  postId,
  comments,
  allow,
  isAdmin,
}: {
  postId: string;
  comments: HubView["comments"];
  allow: boolean;
  isAdmin: boolean;
}) {
  const t = useTranslations("news.hub.comments");
  const fmt = useFormat();
  const uid = useId();
  const [text, setText] = useState("");
  const { pending, error, run } = useHubAction();

  return (
    <Section id={`${uid}-comments`} icon={<MessageSquare />} title={t("title")}>
      {error ? <Alert tone="error">{error}</Alert> : null}
      {comments.length === 0 ? (
        <p className="text-sm text-slate-600">{t("empty")}</p>
      ) : (
        <ul className="space-y-3">
          {comments.map((c) => (
            <li
              key={c.id}
              className={cn(
                "rounded-lg p-3",
                c.hidden
                  ? "border border-dashed border-slate-300"
                  : "bg-slate-50",
              )}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-semibold">{c.name}</p>
                <time dateTime={c.createdAt} className="text-xs text-slate-500">
                  {fmt(c.createdAt, false)}
                </time>
              </div>
              {c.hidden ? (
                <p className="mt-1 flex items-center gap-1 text-xs text-amber-800">
                  <EyeOff aria-hidden="true" className="size-3.5" />
                  {t("hidden")}
                </p>
              ) : null}
              <p className="mt-1 text-sm whitespace-pre-line break-words">
                {c.body}
              </p>
              {c.mine || isAdmin ? (
                <div className="mt-1 flex gap-1">
                  {isAdmin ? (
                    <Button
                      variant="ghost"
                      className="min-h-9 px-2 text-xs"
                      disabled={pending}
                      onClick={() =>
                        run(() => hideCommentAction(c.id, !c.hidden))
                      }
                    >
                      {c.hidden ? t("show") : t("hide")}
                    </Button>
                  ) : null}
                  <Button
                    variant="ghost"
                    className="min-h-9 px-2 text-xs text-red-700"
                    disabled={pending}
                    onClick={() => {
                      if (window.confirm(t("deleteConfirm")))
                        run(() => deleteCommentAction(c.id));
                    }}
                  >
                    <Trash2 aria-hidden="true" className="size-3.5" />
                    {t("delete")}
                  </Button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      {allow ? (
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!text.trim()) return;
            run(
              () => addCommentAction(postId, text),
              () => setText(""),
            );
          }}
        >
          <label htmlFor={`${uid}-text`} className="block text-sm font-medium">
            {t("label")}
          </label>
          <Textarea
            id={`${uid}-text`}
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            maxLength={MAX_COMMENT_LENGTH}
          />
          <Button
            type="submit"
            disabled={pending || !text.trim()}
            className="w-full sm:w-auto"
          >
            {t("submit")}
          </Button>
        </form>
      ) : (
        <p className="text-sm text-slate-600">{t("off")}</p>
      )}
    </Section>
  );
}
