import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LineLinkPanel } from "@/components/line/line-link-panel";
import {
  DeactivateAccount,
  DeleteAccount,
} from "@/components/settings/danger-zone";
import { EmailChangeForm } from "@/components/settings/email-change-form";
import { LanguageForm } from "@/components/settings/language-form";
import { NotifyForm } from "@/components/settings/notify-form";
import { SettingsSection } from "@/components/settings/section";
import {
  type MethodRow,
  SignInMethods,
} from "@/components/settings/sign-in-methods";
import { buttonClass } from "@/components/ui/button";
import { Alert, Badge, PageHeader } from "@/components/ui/card";
import {
  canRemoveSignInMethod,
  OAUTH_PROVIDERS,
  signInMethods,
} from "@/lib/account";
import { db } from "@/lib/db";
import { parseLinkOutcome } from "@/lib/line-link";
import { chooseChannel } from "@/lib/notify";
import { requireActive } from "@/lib/session";

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
    { method: "email", linked: methods.includes("email"), removable: false },
    ...OAUTH_PROVIDERS.map((p) => ({
      method: p,
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

  const nav = [
    ["language", t("language.title")],
    ["notifications", t("notifications.title")],
    ["line", t("line.title")],
    ["sign-in", t("methods.title")],
    ["email", t("email.title")],
    ["data", t("export.title")],
    ["account", t("deactivate.title")],
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
                className="inline-flex min-h-9 items-center rounded-full bg-slate-100 px-3 hover:bg-slate-200"
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
        <SettingsSection
          id="language"
          title={t("language.title")}
          description={t("language.description")}
        >
          <LanguageForm current={user.locale} />
        </SettingsSection>

        <SettingsSection
          id="notifications"
          title={t("notifications.title")}
          description={t("notifications.description")}
        >
          <p className="text-sm">
            {t("notifications.current", {
              channel: t(`notifications.channel.${channel}`),
            })}
          </p>
          <NotifyForm current={user.notifyVia} />
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

        <SettingsSection
          id="email"
          title={t("email.title")}
          description={t("email.description")}
        >
          <EmailChangeForm current={user.primaryEmail} />
        </SettingsSection>

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

        <SettingsSection
          id="account"
          title={t("deactivate.title")}
          description={t("deactivate.description")}
        >
          <DeactivateAccount />
        </SettingsSection>

        <SettingsSection
          id="delete"
          title={t("delete.title")}
          description={t("delete.description")}
          tone="danger"
        >
          <DeleteAccount />
        </SettingsSection>
      </div>
    </div>
  );
}
