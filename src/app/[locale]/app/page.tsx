import { MessageCircle } from "lucide-react";
import { cookies } from "next/headers";
import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  emailSignInAction,
  signInWithGoogle,
  signInWithLine,
} from "@/app/actions/auth";
import { AppShell } from "@/components/layout/app-shell";
import { GoogleIcon } from "@/components/ui/brand-icons";
import { buttonClass } from "@/components/ui/button";
import { Alert, Badge, Card } from "@/components/ui/card";
import { Link, redirect } from "@/i18n/navigation";
import { cohortShort } from "@/lib/cohorts";
import { findOpenInvite, INVITE_COOKIE } from "@/lib/invites";
import { getCurrentUser } from "@/lib/session";
import { ssoReady } from "@/lib/sso";
import { homePathFor } from "@/lib/state-machine";
import { AuthErrorAlert, authErrorKey } from "./auth/_components/auth-error";
import { OtpEmailForm } from "./auth/_components/otp-email-form";

/** Landing + sign-in (§4, §14 screen 1). Signed-in users go to their home. */
export default async function LandingPage({
  params,
  searchParams,
}: PageProps<"/[locale]/app">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const rawError = (await searchParams).error;
  const user = await getCurrentUser();
  if (user) {
    // Auth.js sends errors to pages.signIn ("/"). A signed-in user who hit one
    // while linking a provider (e.g. OAuthAccountNotLinked) must still see it.
    if (typeof rawError === "string" && rawError) {
      return redirect({
        href: { pathname: "/app/auth/error", query: { error: rawError } },
        locale,
      });
    }
    return redirect({ href: homePathFor(user), locale });
  }

  const error = authErrorKey(rawError);
  const t = await getTranslations("landing");
  // Opened through a member's invitation link (src/app/api/invite).
  const inviteParam = (await searchParams).invite;
  const invite = await findOpenInvite(
    (await cookies()).get(INVITE_COOKIE)?.value,
  );

  return (
    <AppShell user={null} variant="onboarding">
      <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-2 md:items-start md:gap-12">
        <section aria-labelledby="landing-title" className="space-y-4 md:pt-6">
          <h1
            id="landing-title"
            className="text-3xl font-bold tracking-tight text-brand-800 sm:text-4xl"
          >
            {t("title")}
          </h1>
          <p className="text-lg text-slate-700">{t("lead")}</p>
          <ul className="space-y-3 text-slate-700">
            {(["directory", "events", "news"] as const).map((key) => (
              <li key={key} className="flex gap-3">
                <span
                  aria-hidden="true"
                  className="mt-2 inline-block size-2 shrink-0 rounded-full bg-brand-700"
                />
                <span>
                  <span className="font-semibold text-slate-900">
                    {t(`features.${key}.title`)}
                  </span>
                  <span className="block text-sm">
                    {t(`features.${key}.body`)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
          <p className="text-sm text-slate-600">{t("membersOnly")}</p>
          <p className="text-sm text-slate-600">{t("operatedBy")}</p>
        </section>

        <Card className="order-first space-y-5 md:order-none">
          {invite ? (
            <Alert tone="success">
              {t("invite.from", {
                name:
                  invite.inviter.nameRomaji ?? invite.inviter.nameKanji ?? "",
                what: invite.cohort
                  ? t(`invite.types.${invite.type}`, {
                      cohort: cohortShort(
                        invite.cohort,
                        locale === "en" ? "en" : "ja",
                      ),
                    })
                  : t(`invite.types.${invite.type}`, { cohort: "" }),
              })}
            </Alert>
          ) : inviteParam === "invalid" ? (
            <Alert tone="warning">{t("invite.invalid")}</Alert>
          ) : null}
          <div>
            <h2 className="text-xl font-bold">{t("signIn.title")}</h2>
            <p className="mt-1 text-sm text-slate-600">
              {t("signIn.subtitle")}
            </p>
          </div>

          {error ? <AuthErrorAlert error={error} /> : null}

          <div className="space-y-3">
            {(
              [
                ["line", signInWithLine, "line", MessageCircle],
                ["google", signInWithGoogle, "secondary", GoogleIcon],
              ] as const
            ).map(([provider, action, variant, Icon]) =>
              ssoReady(provider) ? (
                <form key={provider} action={action}>
                  <button
                    type="submit"
                    className={buttonClass(variant, "w-full")}
                  >
                    <Icon aria-hidden="true" className="size-5" />
                    {t(`signIn.${provider}`)}
                  </button>
                </form>
              ) : (
                <button
                  key={provider}
                  type="button"
                  disabled
                  aria-describedby="sso-not-ready"
                  className={buttonClass("secondary", "w-full")}
                >
                  <Icon aria-hidden="true" className="size-5" />
                  {t(`signIn.${provider}`)}
                  <Badge tone="amber">{t("signIn.notReady")}</Badge>
                </button>
              ),
            )}
            {ssoReady("line") && ssoReady("google") ? null : (
              <p id="sso-not-ready" className="text-xs text-slate-600">
                {t("signIn.notReadyNote")}
              </p>
            )}
            {ssoReady("line") ? (
              <p className="text-xs text-slate-600">{t("signIn.lineNote")}</p>
            ) : null}
          </div>

          <div
            className="flex items-center gap-3 text-xs text-slate-500"
            aria-hidden="true"
          >
            <span className="h-px flex-1 bg-slate-200" />
            {t("signIn.or")}
            <span className="h-px flex-1 bg-slate-200" />
          </div>

          <section aria-labelledby="email-signin-title" className="space-y-3">
            <h3 id="email-signin-title" className="text-sm font-semibold">
              {t("signIn.emailTitle")}
            </h3>
            <OtpEmailForm action={emailSignInAction} />
          </section>

          <p className="border-t border-slate-100 pt-4 text-xs text-slate-600">
            {t.rich("signIn.privacy", {
              link: (chunks) => (
                <Link href="/privacy" className="text-brand-700 underline">
                  {chunks}
                </Link>
              ),
            })}
          </p>
          <p className="text-xs text-slate-600">
            {t.rich("signIn.help", {
              link: (chunks) => (
                <Link
                  href="/support?type=ISSUE&topic=SIGN_IN"
                  className="text-brand-700 underline"
                >
                  {chunks}
                </Link>
              ),
            })}
          </p>
        </Card>
      </div>
    </AppShell>
  );
}
