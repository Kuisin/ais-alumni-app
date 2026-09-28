import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AppShell } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/session";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/privacy">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "landing" });
  return { title: t("privacy.title") };
}

const SECTIONS = [
  "collected",
  "purpose",
  "visibility",
  "line",
  "analytics",
  "evidence",
  "retention",
  "rights",
  "contact",
] as const;

/** APPI privacy notice (§4, §15). Public page, bilingual via messages/landing. */
export default async function PrivacyPage({
  params,
}: PageProps<"/[locale]/privacy">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("landing.privacy");
  const user = await getCurrentUser();

  return (
    <AppShell user={user} variant="onboarding">
      <article className="mx-auto max-w-2xl space-y-6">
        <header>
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="mt-2 text-slate-700">{t("intro")}</p>
        </header>
        <Card className="space-y-6">
          {SECTIONS.map((key) => {
            const items = t.has(`${key}.items`)
              ? (t.raw(`${key}.items`) as string[])
              : [];
            return (
              <section
                key={key}
                aria-labelledby={`privacy-${key}`}
                className="space-y-2"
              >
                <h2 id={`privacy-${key}`} className="text-lg font-semibold">
                  {t(`${key}.title`)}
                </h2>
                {t.has(`${key}.body`) ? (
                  <p className="text-slate-700">{t(`${key}.body`)}</p>
                ) : null}
                {items.length ? (
                  <ul className="list-disc space-y-1 pl-5 text-slate-700">
                    {items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : null}
              </section>
            );
          })}
        </Card>
        <p className="text-sm text-slate-500">{t("updated")}</p>
      </article>
    </AppShell>
  );
}
