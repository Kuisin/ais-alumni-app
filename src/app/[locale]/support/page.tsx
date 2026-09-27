import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AppShell } from "@/components/layout/app-shell";
import { SupportForm } from "@/components/support/support-form";
import { Card } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/session";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/support">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "support" });
  return { title: t("title") };
}

/**
 * お問い合わせ. Public (people who can't sign in need it most); members get
 * their name and email filled in. `?type=&topic=` preselects the dropdowns.
 */
export default async function SupportPage({
  params,
  searchParams,
}: PageProps<"/[locale]/support">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const t = await getTranslations("support");
  const user = await getCurrentUser();
  const one = (v: string | string[] | undefined) =>
    typeof v === "string" ? v : undefined;

  return (
    <AppShell
      user={user}
      variant={user?.state === "ACTIVE" ? "member" : "onboarding"}
    >
      <div className="mx-auto max-w-2xl space-y-6">
        <header>
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="mt-2 text-slate-700">{t("intro")}</p>
        </header>
        <Card>
          <SupportForm
            signedIn={Boolean(user)}
            defaults={{
              name:
                (locale === "ja"
                  ? (user?.nameKanji ?? user?.nameRomaji)
                  : (user?.nameRomaji ?? user?.nameKanji)) ?? "",
              email: user?.primaryEmail ?? "",
              type: one(sp.type),
              topic: one(sp.topic),
            }}
          />
        </Card>
      </div>
    </AppShell>
  );
}
