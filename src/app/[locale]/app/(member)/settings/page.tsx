import { Check, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LineLinkPanel } from "@/components/line/line-link-panel";
import {
  DeactivateAccount,
  DeleteAccount,
} from "@/components/settings/danger-zone";
import { EmailChangeForm } from "@/components/settings/email-change-form";
import { LanguageForm } from "@/components/settings/language-form";
import { NotifyCategoriesForm } from "@/components/settings/notify-categories-form";
import { NotifyForm } from "@/components/settings/notify-form";
import { SettingsSection } from "@/components/settings/section";
import {
  type MethodRow,
  SignInMethods,
} from "@/components/settings/sign-in-methods";
import { buttonClass } from "@/components/ui/button";
import { Alert, Badge, PageHeader } from "@/components/ui/card";
import { EditableCard, ViewEdit } from "@/components/ui/view-edit";
import { Link } from "@/i18n/navigation";
import {
  canRemoveSignInMethod,
  OAUTH_PROVIDERS,
  signInMethods,
} from "@/lib/account";
import { getStaffAccess } from "@/lib/broadcasts";
import { db } from "@/lib/db";
import { parseLinkOutcome } from "@/lib/line-link";
import { chooseChannel } from "@/lib/notify";
import { NOTIFY_CATEGORIES } from "@/lib/notify/catalog";
import { requireActive } from "@/lib/session";
import { ssoReady } from "@/lib/sso";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/app/settings">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "settings" });
  return { title: t("title") };
}

function one(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export default async function SettingsPage({
  searchParams,
}: PageProps<"/[locale]/app/settings">) {
  const user = await requireActive();
  const sp = await searchParams;
  const t = await getTranslations("settings");
  const tn = await getTranslations("notifications");

  const accounts = await db.account.findMany({
    where: { userId: user.id },
    select: { provider: true },
  });
  const methods = signInMethods({
    primaryEmail: user.primaryEmail,
    emailVerifiedAt: user.emailVerifiedAt,
    // LINE counts as linked if either an Account row or lineUserId exists.
    providers: [
      ...accounts.map((a) => a.provider),
      ...(user.lineUserId ? ["line"] : []),
    ],
  });
  const rows: MethodRow[] = [
    {
      method: "email",
      linked: methods.includes("email"),
      removable: false,
      ready: true,
    },
    ...OAUTH_PROVIDERS.map((p) => ({
      method: p,
      ready: ssoReady(p),
      linked: methods.includes(p),
      removable: canRemoveSignInMethod(methods, p),
    })),
  ];

  const channel = chooseChannel(user) ?? "NONE";
  const lineLinked = Boolean(user.lineUserId);
  const lineOutcome = parseLinkOutcome(one(sp.line));

  const banners: string[] = [];
  if (one(sp.google) === "linked" && methods.includes("google"))
    banners.push(t("banner.googleLinked"));
  if (one(sp.saved) === "language") banners.push(t("banner.languageSaved"));

  const access = await getStaffAccess(user);
  const staffKeys = (["admin", "broadcast", "teachers"] as const).filter(
    (k) => access[k],
  );

  const nav = [
    ["language", t("language.title")],
    ["notifications", t("notifications.title")],
    ["line", t("line.title")],
    ["sign-in", t("methods.title")],
    ["email", t("email.title")],
    ["data", t("export.title")],
    ...(staffKeys.length
      ? ([["admin-mode", t("adminMode.title")]] as const)
      : []),
    ["danger", t("danger.title")],
  ] as const;

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={t("title")} description={t("description")} />

      <nav aria-label={t("sectionsLabel")} className="mb-6">
        <ul className="flex flex-wrap gap-2 text-sm">
          {nav.map(([id, label]) => (
            <li key={id}>
              <a
                href={`#${id}`}
                className="inline-flex min-h-11 items-center rounded-full bg-slate-100 px-4 hover:bg-slate-200"
              >
                {label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {banners.length ? (
        <div className="mb-4 space-y-2">
          {banners.map((b) => (
            <Alert key={b} tone="success">
              {b}
            </Alert>
          ))}
        </div>
      ) : null}

      <div className="space-y-6">
        <EditableCard
          id="language"
          title={t("language.title")}
          description={t("language.description")}
          view={
            <p className="text-sm">
              {t("language.current", {
                language: t(`language.${user.locale}`),
              })}
            </p>
          }
        >
          <LanguageForm current={user.locale} />
        </EditableCard>

        <SettingsSection
          id="notifications"
          title={t("notifications.title")}
          description={t("notifications.description")}
        >
          <ViewEdit
            editLabel={t("notifications.editChannel")}
            view={
              <p className="text-sm">
                {t("notifications.current", {
                  channel: t(`notifications.channel.${channel}`),
                })}
              </p>
            }
          >
            <NotifyForm current={user.notifyVia} />
          </ViewEdit>
          <ViewEdit
            editLabel={t("notifications.editCategories")}
            className="border-t border-slate-100 pt-4"
            view={
              <div className="space-y-1 text-sm">
                <p className="font-medium">{t("notifications.categories")}</p>
                <ul className="flex flex-wrap gap-1.5">
                  {NOTIFY_CATEGORIES.map((c) => {
                    const on = c === "account" || !user.notifyOff.includes(c);
                    return (
                      <li
                        key={c}
                        className={`rounded-full px-2.5 py-1 text-xs ${on ? "bg-brand-50 font-medium text-brand-800" : "bg-slate-100 text-slate-500 line-through"}`}
                      >
                        {tn(`categories.${c}`)}
                      </li>
                    );
                  })}
                </ul>
              </div>
            }
          >
            <NotifyCategoriesForm off={user.notifyOff} />
          </ViewEdit>
          <p className="text-sm text-slate-600">{t("notifications.rule")}</p>
        </SettingsSection>

        <SettingsSection
          id="line"
          title={t("line.title")}
          description={t("line.description")}
        >
          {/* §5.5: "LINE: Linked ✓ / Following ✓ / Notifications: LINE" */}
          <dl className="flex flex-wrap gap-2" aria-label={t("line.status")}>
            <div>
              <dt className="sr-only">{t("line.title")}</dt>
              <dd>
                <Badge tone={lineLinked ? "green" : "slate"}>
                  {lineLinked ? `${t("line.linked")} ✓` : t("line.notLinked")}
                </Badge>
              </dd>
            </div>
            {lineLinked ? (
              <div>
                <dt className="sr-only">{t("line.following")}</dt>
                <dd>
                  <Badge tone={user.lineFollowing ? "green" : "amber"}>
                    {user.lineFollowing
                      ? `${t("line.following")} ✓`
                      : t("line.notFollowing")}
                  </Badge>
                </dd>
              </div>
            ) : null}
            <div>
              <dt className="sr-only">{t("notifications.title")}</dt>
              <dd>
                <Badge tone="brand">
                  {t("line.notificationsVia", {
                    channel: t(`notifications.channel.${channel}`),
                  })}
                </Badge>
              </dd>
            </div>
          </dl>
          {lineLinked &&
          user.lineFollowing &&
          user.notifyVia === "EMAIL_ONLY" ? (
            <p className="text-sm text-slate-600">{t("line.emailOnlyNote")}</p>
          ) : null}
          {!lineLinked ? (
            <p className="text-sm text-slate-600">{t("line.linkPrompt")}</p>
          ) : null}
          <LineLinkPanel
            userId={user.id}
            returnTo="/app/settings#line"
            outcome={lineOutcome}
          />
        </SettingsSection>

        <SettingsSection
          id="sign-in"
          title={t("methods.title")}
          description={t("methods.description")}
        >
          <SignInMethods rows={rows} email={user.primaryEmail} />
        </SettingsSection>

        <EditableCard
          id="email"
          title={t("email.title")}
          description={t("email.description")}
          editLabel={t("email.change")}
          view={
            <p className="text-sm">
              <span className="text-slate-600">{t("email.current")}: </span>
              <span className="font-medium break-all">
                {user.primaryEmail ?? "—"}
              </span>
            </p>
          }
        >
          <EmailChangeForm />
        </EditableCard>

        <SettingsSection
          id="data"
          title={t("export.title")}
          description={t("export.description")}
        >
          {/* Plain <a>: a route handler download, not a page navigation. */}
          <a
            href="/api/me/export"
            download
            className={buttonClass("secondary")}
          >
            {t("export.download")}
          </a>
        </SettingsSection>

        {staffKeys.length ? (
          <SettingsSection
            id="admin-mode"
            title={t("adminMode.title")}
            description={t("adminMode.description")}
          >
            <div>
              <p className="text-sm font-medium">{t("adminMode.roles")}</p>
              <ul className="mt-1 space-y-1 text-sm text-slate-700">
                {staffKeys.map((k) => (
                  <li key={k} className="flex items-start gap-2">
                    <Check
                      aria-hidden="true"
                      className="mt-0.5 size-4 shrink-0 text-green-600"
                    />
                    {t(`adminMode.access.${k}`)}
                  </li>
                ))}
              </ul>
            </div>
            <Link href="/app/admin" className={buttonClass("primary")}>
              <ShieldCheck aria-hidden="true" className="size-4" />
              {t("adminMode.button")}
            </Link>
          </SettingsSection>
        ) : null}

        <SettingsSection
          id="danger"
          title={t("danger.title")}
          description={t("danger.description")}
          tone="danger"
        >
          <div id="account" className="scroll-mt-20 space-y-2">
            <h3 className="font-semibold">{t("deactivate.title")}</h3>
            <p className="text-sm text-slate-600">
              {t("deactivate.description")}
            </p>
            <DeactivateAccount />
          </div>
          <div
            id="delete"
            className="scroll-mt-20 space-y-2 border-t border-red-100 pt-4"
          >
            <h3 className="font-semibold text-red-800">{t("delete.title")}</h3>
            <p className="text-sm text-slate-600">{t("delete.description")}</p>
            <DeleteAccount />
          </div>
        </SettingsSection>
      </div>
    </div>
  );
}
