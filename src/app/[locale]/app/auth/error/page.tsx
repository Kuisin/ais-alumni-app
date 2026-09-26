import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AppShell } from "@/components/layout/app-shell";
import { buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/session";
import { authErrorKey } from "../_components/auth-error";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/app/auth/error">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth" });
  return { title: t("errorPage.metaTitle"), robots: { index: false } };
}

/** Auth.js error page (pages.error in src/auth.ts). */
export default async function AuthErrorPage({
  params,
  searchParams,
}: PageProps<"/[locale]/app/auth/error">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const error = authErrorKey((await searchParams).error) ?? "Default";
  const t = await getTranslations("auth");
  const user = await getCurrentUser();

  return (
    <AppShell user={user} variant="onboarding">
      <div className="mx-auto max-w-xl">
        <Card className="space-y-4">
          <h1 className="text-2xl font-bold">{t(`errors.${error}.title`)}</h1>
          <p className="text-slate-700">{t(`errors.${error}.body`)}</p>
          <div className="flex flex-wrap gap-2">
            <Link href="/app" className={buttonClass("primary")}>
              {user ? t("errorPage.continue") : t("errorPage.backToSignIn")}
            </Link>
          </div>
          <p className="text-xs text-slate-500">
            {t("errorPage.code", { code: error })}
          </p>
        </Card>
      </div>
    </AppShell>
  );
}
