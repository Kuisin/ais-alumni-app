import {
  ArrowLeftRight,
  BadgeCheck,
  Building2,
  CalendarDays,
  ChartColumn,
  ChevronDown,
  FilePen,
  GraduationCap,
  House,
  Layers,
  LogOut,
  Megaphone,
  Newspaper,
  Route,
  ScrollText,
  Settings,
  ShieldCheck,
  TableProperties,
  UserCheck,
  UserPlus,
  UserRound,
  Users,
  UsersRound,
} from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { signOutAction } from "@/app/actions/common";
import { Link } from "@/i18n/navigation";
import { getStaffAccess } from "@/lib/broadcasts";
import { displayName } from "@/lib/format";
import { hasStaffAccess, type StaffAccess } from "@/lib/permissions";
import type { CurrentUser } from "@/lib/session";
import { LocaleSwitcher } from "./locale-switcher";
import { Dropdown, NavLink } from "./nav-link";

type NavItem = { href: string; label: string; icon: ReactNode };
type NavGroup = { label: string; items: NavItem[] };

const ICON = "size-4 shrink-0";

/**
 * Page chrome. Member mode: top nav (bottom tab bar on phones) and an account
 * menu. Admin mode is a separate workspace — dark header, sidebar grouped by
 * task, filtered to what the member may do — with a switch back.
 */
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
  const locale = (await getLocale()) === "en" ? "en" : "ja";
  const access: StaffAccess | null =
    user && variant !== "onboarding" ? await getStaffAccess(user) : null;
  const isStaff = access ? hasStaffAccess(access) : false;
  const admin = variant === "admin";

  const primary: NavItem[] = [
    {
      href: "/app/dashboard",
      label: t("nav.dashboard"),
      icon: <House className={ICON} />,
    },
    {
      href: "/app/directory",
      label: t("nav.directory"),
      icon: <Users className={ICON} />,
    },
    {
      href: "/app/events",
      label: t("nav.events"),
      icon: <CalendarDays className={ICON} />,
    },
    {
      href: "/app/news",
      label: t("nav.news"),
      icon: <Newspaper className={ICON} />,
    },
    {
      href: "/app/family",
      label: t("nav.family"),
      icon: <UsersRound className={ICON} />,
    },
  ];
  const accountItems: NavItem[] = [
    {
      href: "/app/profile",
      label: t("nav.profile"),
      icon: <UserRound className={ICON} />,
    },
    {
      href: "/app/follows",
      label: t("nav.follows"),
      icon: <UserPlus className={ICON} />,
    },
    {
      href: "/app/settings",
      label: t("nav.settings"),
      icon: <Settings className={ICON} />,
    },
  ];

  const a = access ?? { admin: false, broadcast: false, teachers: false };
  const adminGroups: NavGroup[] = [
    {
      label: t("adminGroups.review"),
      items: a.admin
        ? [
            {
              href: "/app/admin/verification",
              label: t("adminNav.verification"),
              icon: <BadgeCheck className={ICON} />,
            },
            {
              href: "/app/admin/record-requests",
              label: t("adminNav.recordRequests"),
              icon: <FilePen className={ICON} />,
            },
          ]
        : [],
    },
    {
      label: t("adminGroups.people"),
      items: [
        ...(a.admin
          ? [
              {
                href: "/app/admin/members",
                label: t("adminNav.members"),
                icon: <Users className={ICON} />,
              },
            ]
          : []),
        ...(a.teachers
          ? [
              {
                href: "/app/admin/teachers",
                label: t("adminNav.teachers"),
                icon: <UserCheck className={ICON} />,
              },
            ]
          : []),
        ...(a.admin
          ? [
              {
                href: "/app/admin/cohorts",
                label: t("adminNav.cohorts"),
                icon: <Layers className={ICON} />,
              },
            ]
          : []),
      ],
    },
    {
      label: t("adminGroups.outreach"),
      items: [
        ...(a.broadcast
          ? [
              {
                href: "/app/admin/notify",
                label: t("nav.notify"),
                icon: <Megaphone className={ICON} />,
              },
            ]
          : []),
        ...(a.admin
          ? [
              {
                href: "/app/admin/events",
                label: t("adminNav.events"),
                icon: <CalendarDays className={ICON} />,
              },
              {
                href: "/app/admin/news",
                label: t("adminNav.news"),
                icon: <Newspaper className={ICON} />,
              },
            ]
          : []),
      ],
    },
    {
      label: t("adminGroups.data"),
      items: a.admin
        ? [
            {
              href: "/app/admin/destinations",
              label: t("adminNav.destinations"),
              icon: <Route className={ICON} />,
            },
            {
              href: "/app/admin/stats",
              label: t("adminNav.stats"),
              icon: <ChartColumn className={ICON} />,
            },
            {
              href: "/app/admin/organizations",
              label: t("adminNav.organizations"),
              icon: <Building2 className={ICON} />,
            },
            {
              href: "/app/admin/roster",
              label: t("adminNav.roster"),
              icon: <TableProperties className={ICON} />,
            },
            {
              href: "/app/admin/audit",
              label: t("adminNav.audit"),
              icon: <ScrollText className={ICON} />,
            },
          ]
        : [],
    },
  ].filter((g) => g.items.length > 0);

  const switchLink = admin ? (
    <Link
      href="/app/dashboard"
      className="flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-medium text-white hover:bg-white/10"
    >
      <ArrowLeftRight aria-hidden="true" className={ICON} />
      <span className="hidden sm:inline">{t("nav.memberMode")}</span>
      <span className="sr-only sm:hidden">{t("nav.memberMode")}</span>
    </Link>
  ) : isStaff ? (
    <Link
      href="/app/admin"
      className="flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-medium text-brand-800 hover:bg-brand-50"
    >
      <ShieldCheck aria-hidden="true" className={ICON} />
      <span className="hidden sm:inline">{t("nav.adminMode")}</span>
      <span className="sr-only sm:hidden">{t("nav.adminMode")}</span>
    </Link>
  ) : null;

  const accountMenu = user ? (
    <Dropdown
      summaryClassName={`flex min-h-11 items-center gap-1 rounded-lg px-2 text-sm font-medium ${admin ? "text-white hover:bg-white/10" : "text-slate-700 hover:bg-slate-100"}`}
      summary={
        <>
          <span
            aria-hidden="true"
            className="inline-flex size-8 items-center justify-center rounded-full bg-brand-100 text-brand-800"
          >
            <UserRound className={ICON} />
          </span>
          <span className="sr-only">{t("nav.account")}</span>
          <ChevronDown aria-hidden="true" className="size-4" />
        </>
      }
    >
      <p className="truncate px-3 py-2 text-xs text-slate-500">
        {displayName(user, locale)}
      </p>
      {variant === "member" ? (
        <ul>
          {[
            ...primary
              .filter((i) => i.href === "/app/family")
              .map((i) => ({ ...i, mobileOnly: true })),
            ...accountItems.map((i) => ({ ...i, mobileOnly: false })),
          ].map((item) => (
            <li
              key={item.href}
              className={item.mobileOnly ? "lg:hidden" : undefined}
            >
              <NavLink
                href={item.href}
                className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm hover:bg-slate-100"
                activeClassName="bg-brand-50 text-brand-800"
              >
                <span aria-hidden="true">{item.icon}</span>
                {item.label}
              </NavLink>
            </li>
          ))}
          {isStaff ? (
            <li>
              <Link
                href="/app/admin"
                className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm hover:bg-slate-100"
              >
                <ShieldCheck aria-hidden="true" className={ICON} />
                {t("nav.adminMode")}
              </Link>
            </li>
          ) : null}
        </ul>
      ) : null}
      <form
        action={signOutAction}
        className="mt-1 border-t border-slate-100 pt-1"
      >
        <button
          type="submit"
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-slate-100"
        >
          <LogOut aria-hidden="true" className={ICON} />
          {t("signOut")}
        </button>
      </form>
    </Dropdown>
  ) : null;

  const footer = (
    <footer className="border-t border-slate-200 py-6 pb-24 text-center text-xs text-slate-500 lg:pb-6">
      <Link href="/privacy" className="underline">
        {t("privacy")}
      </Link>
      <span className="mx-2">·</span>
      {t("footer")}
    </footer>
  );

  if (admin) {
    return (
      <>
        <header className="sticky top-0 z-40 bg-slate-900 text-white">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-2">
            <Link
              href="/app/admin"
              className="flex min-h-11 items-center gap-2 font-bold"
            >
              <span
                aria-hidden="true"
                className="inline-flex size-8 items-center justify-center rounded-lg bg-amber-400 text-slate-900"
              >
                <ShieldCheck className="size-5" />
              </span>
              <span>{t("nav.adminMode")}</span>
            </Link>
            <div className="flex items-center gap-1">
              {switchLink}
              <div className="[&_button]:text-white">
                <LocaleSwitcher />
              </div>
              {accountMenu}
            </div>
          </div>
        </header>
        <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 lg:flex-row">
          <nav aria-label={t("nav.adminLabel")} className="lg:w-56 lg:shrink-0">
            <div className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1 lg:sticky lg:top-20 lg:mx-0 lg:block lg:space-y-5 lg:overflow-visible lg:px-0">
              {adminGroups.map((g) => (
                <div key={g.label} className="contents lg:block">
                  <p className="hidden px-3 pb-1 text-xs font-semibold tracking-wide text-slate-500 uppercase lg:block">
                    {g.label}
                  </p>
                  <ul className="contents lg:block lg:space-y-0.5">
                    {g.items.map((item) => (
                      <li key={item.href} className="shrink-0">
                        <NavLink
                          href={item.href}
                          className="flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-medium whitespace-nowrap text-slate-700 hover:bg-slate-100"
                          activeClassName="bg-slate-900 text-white hover:bg-slate-800"
                        >
                          <span aria-hidden="true">{item.icon}</span>
                          {item.label}
                        </NavLink>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </nav>
          <main id="main" className="min-w-0 flex-1">
            {children}
          </main>
        </div>
        {footer}
      </>
    );
  }

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-4 py-2">
          <Link
            href={variant === "member" ? "/app/dashboard" : "/"}
            className="flex min-h-11 items-center gap-2 font-bold text-brand-800"
          >
            <span
              aria-hidden="true"
              className="inline-flex size-8 items-center justify-center rounded-lg bg-brand-700 text-sm text-white"
            >
              <GraduationCap className="size-5" />
            </span>
            <span className="hidden sm:inline">{t("appNameShort")}</span>
          </Link>

          {variant === "member" ? (
            <nav
              aria-label={t("nav.label")}
              className="hidden flex-1 justify-center lg:flex"
            >
              <ul className="flex gap-1">
                {primary.map((item) => (
                  <li key={item.href}>
                    <NavLink
                      href={item.href}
                      className="flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-slate-700 hover:bg-slate-100"
                      activeClassName="bg-brand-50 text-brand-800"
                    >
                      <span aria-hidden="true">{item.icon}</span>
                      {item.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}

          <div className="flex items-center gap-1">
            {switchLink}
            <LocaleSwitcher />
            {accountMenu}
          </div>
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
        {children}
      </main>
      {footer}
      {variant === "member" ? (
        <nav
          aria-label={t("nav.label")}
          className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
        >
          <ul className="mx-auto grid max-w-md grid-cols-5">
            {[
              ...primary.slice(0, 4),
              { ...accountItems[0], label: t("nav.profileShort") },
            ].map((item) => (
              <li key={item.href}>
                <NavLink
                  href={item.href}
                  className="flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium text-slate-600 [&_svg]:size-5"
                  activeClassName="text-brand-700"
                >
                  <span aria-hidden="true">{item.icon}</span>
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </>
  );
}
