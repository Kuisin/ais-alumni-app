import { LifeBuoy } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AppShell } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/session";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/terms">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "landing" });
  return { title: t("terms.title") };
}

const SECTIONS = [
  "eligibility",
  "account",
  "conduct",
  "zeroTolerance",
  "content",
  "termination",
  "disclaimer",
  "changes",
  "contact",
] as const;

/**
 * Terms of use (利用規約). Public page, bilingual via messages/landing;
 * agreed to on the sign-in page. The same text as the app's /terms.
 */
export default async function TermsPage({
  params,
}: PageProps<"/[locale]/terms">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("landing.terms");
  const ts = await getTranslations("support");
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
                aria-labelledby={`terms-${key}`}
                className="space-y-2"
              >
                <h2 id={`terms-${key}`} className="text-lg font-semibold">
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
        <Link
          href="/support"
          className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-800 hover:bg-slate-50"
        >
          <LifeBuoy aria-hidden="true" className="size-4" />
          {ts("title")}
        </Link>
        <p className="text-sm text-slate-500">{t("updated")}</p>
      </article>
    </AppShell>
  );
}
