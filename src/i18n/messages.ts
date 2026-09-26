import type { AppLocale } from "./routing";

// Messages are split into one JSON file per namespace (messages/<locale>/<ns>.json)
// so feature areas can own their strings without editing a shared file.
// Add new namespaces to this list.
export const NAMESPACES = [
  "common",
  "roles",
  "email",
  "home",
  "landing",
  "auth",
  "onboarding",
  "line",
  "verify",
  "vouch",
  "adminVerify",
  "dashboard",
  "events",
  "news",
  "adminContent",
  "directory",
  "profile",
  "records",
  "broadcast",
  "cohorts",
  "history",
  "organizations",
  "follows",
  "family",
  "settings",
  "adminMembers",
  "adminStats",
  "setup",
] as const;

export type Messages = Record<string, Record<string, unknown>>;

export async function loadMessages(locale: AppLocale): Promise<Messages> {
  const entries = await Promise.all(
    NAMESPACES.map(async (ns) => {
      const mod = await import(`../../messages/${locale}/${ns}.json`);
      return [ns, mod.default] as const;
    }),
  );
  return Object.fromEntries(entries);
}
