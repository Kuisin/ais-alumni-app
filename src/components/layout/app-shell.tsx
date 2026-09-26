import { getLocale, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { signOutAction } from "@/app/actions/common";
import { Link } from "@/i18n/navigation";
import { getBroadcastRights } from "@/lib/broadcasts";
import { displayName } from "@/lib/format";
import type { CurrentUser } from "@/lib/session";
import { LocaleSwitcher } from "./locale-switcher";

type NavItem = { href: string; label: string };

export async function AppShell({
  user,
  children,
  variant = "member",
}: {
  user: CurrentUser | null;
  children: ReactNode;
  variant?: "member" | "admin" | "onboarding";
}) {
  const t = await getTranslations("common");
  const locale = await getLocale();
  // Members holding a position (or admins) get the "send notification" page.
  const canBroadcast =
    variant === "member" && user
      ? (await getBroadcastRights(user)).length > 0
      : false;

  const memberNav: NavItem[] = [
    { href: "/app/dashboard", label: t("nav.dashboard") },
    { href: "/app/directory", label: t("nav.directory") },
    { href: "/app/events", label: t("nav.events") },
    { href: "/app/news", label: t("nav.news") },
    ...(canBroadcast ? [{ href: "/app/notify", label: t("nav.notify") }] : []),
    { href: "/app/follows", label: t("nav.follows") },
    { href: "/app/family", label: t("nav.family") },
    { href: "/app/profile", label: t("nav.profile") },
    { href: "/app/settings", label: t("nav.settings") },
  ];
  const adminNav: NavItem[] = [
    { href: "/app/admin/verification", label: t("adminNav.verification") },
    {
      href: "/app/admin/record-requests",
      label: t("adminNav.recordRequests"),
    },
    { href: "/app/admin/members", label: t("adminNav.members") },
    { href: "/app/admin/cohorts", label: t("adminNav.cohorts") },
    { href: "/app/admin/events", label: t("adminNav.events") },
    { href: "/app/admin/news", label: t("adminNav.news") },
    { href: "/app/admin/roster", label: t("adminNav.roster") },
    { href: "/app/admin/stats", label: t("adminNav.stats") },
    { href: "/app/admin/audit", label: t("adminNav.audit") },
  ];
  const nav =
    variant === "admin" ? adminNav : variant === "member" ? memberNav : [];

  const extra: NavItem[] = [];
  if (variant === "member" && user?.isAdmin)
    extra.push({ href: "/app/admin/verification", label: t("nav.admin") });
  if (variant === "admin")
    extra.push({ href: "/app/dashboard", label: t("nav.backToMember") });

  const home =
    variant === "admin"
      ? "/app/admin/verification"
      : variant === "member"
        ? "/app/dashboard"
        : "/";

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-4 py-2">
          <Link
            href={home}
            className="flex min-h-11 items-center gap-2 font-bold text-brand-800"
          >
            <span
              aria-hidden="true"
              className="inline-flex size-8 items-center justify-center rounded-lg bg-brand-700 text-sm text-white"
            >
              AIS
            </span>
            <span className="hidden sm:inline">
              {variant === "admin" ? t("adminTitle") : t("appNameShort")}
            </span>
          </Link>

          <nav
            aria-label={t("nav.label")}
            className="hidden flex-1 justify-center lg:flex"
          >
            <ul className="flex flex-wrap gap-1">
              {[...nav, ...extra].map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex items-center gap-1">
            <LocaleSwitcher />
            {user ? (
              <form action={signOutAction} className="hidden lg:block">
                <button
                  type="submit"
                  className="min-h-11 rounded-lg px-3 text-sm text-slate-700 hover:bg-slate-100"
                >
                  {t("signOut")}
                </button>
              </form>
            ) : null}
            {nav.length || user ? (
              <details className="relative lg:hidden">
                <summary className="flex min-h-11 cursor-pointer list-none items-center rounded-lg px-3 text-sm font-medium text-slate-700 hover:bg-slate-100">
                  {t("menu")}
                </summary>
                <div className="absolute right-0 mt-1 w-60 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
                  {user ? (
                    <p className="truncate px-3 py-2 text-xs text-slate-500">
                      {displayName(user, locale === "ja" ? "ja" : "en")}
                    </p>
                  ) : null}
                  <ul>
                    {[...nav, ...extra].map((item) => (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className="block rounded-lg px-3 py-2.5 text-sm hover:bg-slate-100"
                        >
                          {item.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                  {user ? (
                    <form
                      action={signOutAction}
                      className="mt-1 border-t border-slate-100 pt-1"
                    >
                      <button
                        type="submit"
                        className="w-full rounded-lg px-3 py-2.5 text-left text-sm hover:bg-slate-100"
                      >
                        {t("signOut")}
                      </button>
                    </form>
                  ) : null}
                </div>
              </details>
            ) : null}
          </div>
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
        {children}
      </main>
      <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        <Link href="/privacy" className="underline">
          {t("privacy")}
        </Link>
        <span className="mx-2">·</span>
        {t("footer")}
      </footer>
    </>
  );
}
