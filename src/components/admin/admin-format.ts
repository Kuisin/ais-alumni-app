import { TIME_ZONE } from "@/lib/format";

type Lang = "ja" | "en";

/** Compact date for dense admin tables: ja → 2026/09/27, en → Sep 27, 2026 */
export function formatCompactDate(date: Date, locale: Lang): string {
  return new Intl.DateTimeFormat(locale === "ja" ? "ja-JP" : "en-US", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: locale === "ja" ? "2-digit" : "short",
    day: locale === "ja" ? "2-digit" : "numeric",
  }).format(date);
}

/** Time of day in JST: 14:05 */
export function formatTime(date: Date, locale: Lang): string {
  return new Intl.DateTimeFormat(locale === "ja" ? "ja-JP" : "en-GB", {
    timeZone: TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

/** JST calendar day key (YYYY-MM-DD) for grouping rows by date. */
export function jstDayKey(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** How long ago: ja → 3日前 / 5時間前, en → 3 days ago / 5 hours ago */
export function formatAge(
  date: Date,
  locale: Lang,
  now: Date = new Date(),
): string {
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const minutes = Math.round((date.getTime() - now.getTime()) / 60_000);
  if (Math.abs(minutes) < 60) return rtf.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return rtf.format(hours, "hour");
  const days = Math.round(hours / 24);
  if (Math.abs(days) < 60) return rtf.format(days, "day");
  return rtf.format(Math.round(days / 30), "month");
}
