"use client";

import {
  Camera,
  CameraOff,
  CircleAlert,
  CircleCheck,
  Search,
  Undo2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  type CheckInCandidate,
  type CheckInResult,
  checkInMemberAction,
  checkInTicketAction,
  searchCheckInAction,
  undoCheckInAction,
} from "@/app/actions/check-in";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/field";
import type { RsvpAnswer } from "@/generated/prisma/enums";

export type Attendee = {
  id: string;
  name: string;
  kanji: string | null;
  /** null = walk-in without an RSVP */
  answer: RsvpAnswer | null;
  guests: number;
  checkedInAt: string | null;
};

type View = "all" | "waiting" | "done";

const time = (iso: string) =>
  new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));

/**
 * Staff reception screen: scan QR tickets with the camera (jsQR, loaded on
 * demand), type a code, or tick people off the list; walk-ins are found by
 * name. Counts update as people arrive.
 */
export function CheckInBoard({
  eventId,
  initial,
  initialToken,
}: {
  eventId: string;
  initial: Attendee[];
  initialToken: string | null;
}) {
  const t = useTranslations("events.checkIn");
  const te = useTranslations("events");
  const uid = useId();
  const [people, setPeople] = useState<Attendee[]>(initial);
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState("");
  const [view, setView] = useState<View>("all");
  const [code, setCode] = useState("");

  const apply = useCallback((r: CheckInResult) => {
    setResult(r);
    if (r.status !== "ok" && r.status !== "already") return;
    if (r.status === "ok") navigator.vibrate?.(80);
    setPeople((list) => {
      const rest = list.filter((p) => p.id !== r.userId);
      const prev = list.find((p) => p.id === r.userId);
      return [
        ...rest,
        {
          id: r.userId,
          name: r.name,
          kanji: r.kanji,
          answer: r.answer,
          guests: r.guests,
          ...prev,
          checkedInAt: r.at,
        },
      ].sort((a, b) => a.name.localeCompare(b.name));
    });
  }, []);

  const scan = useCallback(
    async (text: string) => {
      setBusy(true);
      try {
        apply(await checkInTicketAction(eventId, text));
      } catch {
        setResult({ status: "invalid" });
      } finally {
        setBusy(false);
      }
    },
    [eventId, apply],
  );

  // Opened from a phone's camera app: the ticket is in the link.
  const opened = useRef(false);
  useEffect(() => {
    if (initialToken && !opened.current) {
      opened.current = true;
      void scan(initialToken);
    }
  }, [initialToken, scan]);

  async function checkInMember(id: string) {
    setBusy(true);
    try {
      apply(await checkInMemberAction(eventId, id));
    } finally {
      setBusy(false);
    }
  }

  async function undo(p: Attendee) {
    if (!window.confirm(t("list.undoConfirm", { name: p.name }))) return;
    const r = await undoCheckInAction(eventId, p.id);
    if (!r.ok) return;
    setResult(null);
    setPeople((list) =>
      list
        .map((x) => (x.id === p.id ? { ...x, checkedInAt: null } : x))
        // A walk-in without an RSVP leaves the list again.
        .filter((x) => x.answer !== null || x.checkedInAt !== null),
    );
  }

  const done = people.filter((p) => p.checkedInAt);
  const going = people.filter((p) => p.answer === "GOING");
  const maybe = people.filter((p) => p.answer === "MAYBE");
  const term = filter.trim().toLowerCase();
  const shown = people.filter(
    (p) =>
      (view === "all" || (view === "done" ? p.checkedInAt : !p.checkedInAt)) &&
      (!term || p.name.toLowerCase().includes(term) || p.kanji?.includes(term)),
  );

  return (
    <div className="space-y-6">
      <dl className="grid grid-cols-3 gap-3 text-center">
        <Stat label={t("stats.checkedIn")} value={done.length} strong />
        <Stat
          label={t("stats.expected")}
          value={going.length}
          sub={going.reduce((n, p) => n + p.guests, 0)}
        />
        <Stat label={t("stats.maybe")} value={maybe.length} />
      </dl>

      <div role="alert" aria-atomic="true">
        {result ? <ResultBanner result={result} /> : null}
      </div>

      <Card>
        <h2 className="mb-3 text-lg font-semibold">{t("scan.title")}</h2>
        <Scanner onScan={scan} paused={busy} />
        <form
          className="mt-4 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (code.trim()) void scan(code).then(() => setCode(""));
          }}
        >
          <label htmlFor={`${uid}-code`} className="sr-only">
            {t("scan.manual")}
          </label>
          <Input
            id={`${uid}-code`}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder={t("scan.manual")}
            autoComplete="off"
          />
          <Button
            type="submit"
            variant="secondary"
            disabled={busy}
            className="shrink-0 whitespace-nowrap"
          >
            {t("scan.manualSubmit")}
          </Button>
        </form>
      </Card>

      <Card>
        <h2 className="mb-3 text-lg font-semibold">{t("list.title")}</h2>
        <div className="mb-3 space-y-3">
          <div className="relative">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400"
            />
            <label htmlFor={`${uid}-filter`} className="sr-only">
              {t("list.filter")}
            </label>
            <Input
              id={`${uid}-filter`}
              type="search"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder={t("list.filter")}
              className="pl-9"
            />
          </div>
          <fieldset className="flex flex-wrap gap-2">
            <legend className="sr-only">{t("list.title")}</legend>
            {(["all", "waiting", "done"] as const).map((v) => (
              <label
                key={v}
                className="inline-flex min-h-11 cursor-pointer items-center rounded-full border border-slate-300 px-4 text-sm has-checked:border-brand-700 has-checked:bg-brand-50 has-checked:font-semibold has-checked:text-brand-800"
              >
                <input
                  type="radio"
                  name={`${uid}-view`}
                  className="sr-only"
                  checked={view === v}
                  onChange={() => setView(v)}
                />
                {t(`list.${v}`)}
                <span className="ml-1 text-slate-500">
                  {v === "all"
                    ? people.length
                    : v === "done"
                      ? done.length
                      : people.length - done.length}
                </span>
              </label>
            ))}
          </fieldset>
        </div>
        {shown.length === 0 ? (
          <p className="py-4 text-sm text-slate-600">{t("list.empty")}</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {shown.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between gap-3 py-2"
              >
                <div className="min-w-0">
                  <p className="font-medium">
                    {p.name}
                    {p.kanji ? (
                      <span className="ml-2 text-sm font-normal text-slate-600">
                        {p.kanji}
                      </span>
                    ) : null}
                  </p>
                  <p className="text-xs text-slate-600">
                    {p.answer ? te(`answer.${p.answer}`) : t("result.walkIn")}
                    {p.guests
                      ? ` · ${t("result.guests", { count: p.guests })}`
                      : ""}
                    {p.checkedInAt
                      ? ` · ${t("list.at", { time: time(p.checkedInAt) })}`
                      : ""}
                  </p>
                </div>
                {p.checkedInAt ? (
                  <div className="flex shrink-0 items-center gap-1">
                    <CircleCheck
                      aria-label={t("list.done")}
                      className="size-5 text-emerald-700"
                    />
                    <Button
                      variant="ghost"
                      onClick={() => undo(p)}
                      aria-label={`${t("list.undo")}: ${p.name}`}
                    >
                      <Undo2 aria-hidden="true" className="size-4" />
                      <span className="sr-only sm:not-sr-only">
                        {t("list.undo")}
                      </span>
                    </Button>
                  </div>
                ) : (
                  <Button
                    className="shrink-0"
                    disabled={busy}
                    onClick={() => checkInMember(p.id)}
                    aria-label={`${t("list.checkIn")}: ${p.name}`}
                  >
                    {t("list.checkIn")}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <WalkIn
        eventId={eventId}
        known={people}
        busy={busy}
        onPick={checkInMember}
      />
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  strong,
}: {
  label: string;
  value: number;
  sub?: number;
  strong?: boolean;
}) {
  const t = useTranslations("events.checkIn");
  return (
    <div
      className={`rounded-xl p-3 ${strong ? "bg-emerald-50 text-emerald-900" : "bg-slate-50"}`}
    >
      <dt className="text-xs text-slate-600">{label}</dt>
      <dd className="text-2xl font-bold">
        {value}
        {sub ? (
          <span className="block text-xs font-normal text-slate-600">
            {t("result.guests", { count: sub })}
          </span>
        ) : null}
      </dd>
    </div>
  );
}

function ResultBanner({ result }: { result: CheckInResult }) {
  const t = useTranslations("events.checkIn.result");
  const te = useTranslations("events");
  if (result.status === "ok" || result.status === "already") {
    const ok = result.status === "ok";
    return (
      <div
        className={`flex items-start gap-3 rounded-xl p-4 ${ok ? "bg-emerald-600 text-white" : "bg-amber-100 text-amber-950"}`}
      >
        {ok ? (
          <CircleCheck aria-hidden="true" className="size-7 shrink-0" />
        ) : (
          <CircleAlert aria-hidden="true" className="size-7 shrink-0" />
        )}
        <div>
          <p className="text-sm font-semibold">
            {ok ? t("ok") : t("already", { time: time(result.at) })}
          </p>
          <p className="text-xl font-bold">
            {result.name}
            {result.kanji ? (
              <span className="ml-2 text-base font-medium">{result.kanji}</span>
            ) : null}
          </p>
          <p className="text-sm">
            {result.answer ? te(`answer.${result.answer}`) : t("walkIn")}
            {result.guests ? ` · ${t("guests", { count: result.guests })}` : ""}
          </p>
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-3 rounded-xl bg-red-700 p-4 text-white">
      <CircleAlert aria-hidden="true" className="size-7 shrink-0" />
      <p className="font-semibold">{t(result.status)}</p>
    </div>
  );
}

/** Camera preview that decodes QR codes a few times per second. */
function Scanner({
  onScan,
  paused,
}: {
  onScan: (text: string) => Promise<void>;
  paused: boolean;
}) {
  const t = useTranslations("events.checkIn.scan");
  const video = useRef<HTMLVideoElement>(null);
  const [on, setOn] = useState(false);
  const [error, setError] = useState(false);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  useEffect(() => {
    if (!on) return;
    let stream: MediaStream | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;
    let last = { text: "", at: 0 };
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    (async () => {
      try {
        const [{ default: jsQR }, media] = await Promise.all([
          import("jsqr"),
          navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment" },
            audio: false,
          }),
        ]);
        stream = media;
        if (stopped || !video.current) return;
        video.current.srcObject = media;
        await video.current.play();
        const tick = () => {
          if (stopped) return;
          const v = video.current;
          if (v && ctx && v.videoWidth && !pausedRef.current) {
            canvas.width = v.videoWidth;
            canvas.height = v.videoHeight;
            ctx.drawImage(v, 0, 0);
            const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(img.data, img.width, img.height, {
              inversionAttempts: "dontInvert",
            });
            const now = Date.now();
            // Ignore the same code held in front of the camera.
            if (
              code?.data &&
              !(code.data === last.text && now - last.at < 4000)
            ) {
              last = { text: code.data, at: now };
              void onScan(code.data);
            }
          }
          timer = setTimeout(tick, 250);
        };
        tick();
      } catch {
        setError(true);
        setOn(false);
      }
    })();

    return () => {
      stopped = true;
      clearTimeout(timer);
      for (const track of stream?.getTracks() ?? []) track.stop();
    };
  }, [on, onScan]);

  return (
    <div className="space-y-3">
      {on ? (
        <div className="relative mx-auto aspect-square w-full max-w-sm overflow-hidden rounded-xl bg-black">
          <video
            ref={video}
            className="size-full object-cover"
            muted
            playsInline
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-[15%] rounded-xl border-4 border-white/80"
          />
        </div>
      ) : null}
      <p className="text-sm text-slate-600">{t("hint")}</p>
      {error ? (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          {t("noCamera")}
        </p>
      ) : null}
      <Button
        variant={on ? "secondary" : "primary"}
        className="w-full sm:w-auto"
        onClick={() => {
          setError(false);
          setOn((v) => !v);
        }}
      >
        {on ? (
          <CameraOff aria-hidden="true" className="size-4" />
        ) : (
          <Camera aria-hidden="true" className="size-4" />
        )}
        {on ? t("stop") : t("start")}
      </Button>
    </div>
  );
}

function WalkIn({
  eventId,
  known,
  busy,
  onPick,
}: {
  eventId: string;
  known: Attendee[];
  busy: boolean;
  onPick: (id: string) => Promise<void>;
}) {
  const t = useTranslations("events.checkIn.search");
  const tl = useTranslations("events.checkIn.list");
  const uid = useId();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<CheckInCandidate[] | null>(null);
  const seq = useRef(0);

  useEffect(() => {
    const term = q.trim();
    const n = ++seq.current;
    if (!term) {
      setResults(null);
      return;
    }
    const timer = setTimeout(async () => {
      const found = await searchCheckInAction(eventId, term).catch(() => []);
      if (n === seq.current) setResults(found);
    }, 250);
    return () => clearTimeout(timer);
  }, [q, eventId]);

  const listed = new Set(known.map((p) => p.id));
  const fresh = results?.filter((r) => !listed.has(r.id)) ?? null;

  return (
    <Card>
      <h2 className="mb-1 text-lg font-semibold">{t("title")}</h2>
      <p id={`${uid}-hint`} className="mb-3 text-sm text-slate-600">
        {t("hint")}
      </p>
      <label htmlFor={`${uid}-q`} className="sr-only">
        {t("label")}
      </label>
      <Input
        id={`${uid}-q`}
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t("label")}
        aria-describedby={`${uid}-hint`}
        autoComplete="off"
      />
      <div aria-live="polite" className="mt-2">
        {fresh && fresh.length === 0 ? (
          <p className="text-sm text-slate-600">{t("noResults")}</p>
        ) : null}
        {fresh?.length ? (
          <ul className="divide-y divide-slate-100">
            {fresh.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between gap-3 py-2"
              >
                <span>
                  {r.name}
                  {r.kanji ? (
                    <span className="ml-2 text-sm text-slate-600">
                      {r.kanji}
                    </span>
                  ) : null}
                </span>
                <Button
                  disabled={busy}
                  onClick={async () => {
                    await onPick(r.id);
                    setQ("");
                  }}
                  aria-label={`${tl("checkIn")}: ${r.name}`}
                >
                  {tl("checkIn")}
                </Button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </Card>
  );
}
