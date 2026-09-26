import {
  ArrowRight,
  CalendarDays,
  HeartHandshake,
  LockKeyhole,
  MessageCircle,
  Newspaper,
  Users,
} from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AppShell } from "@/components/layout/app-shell";
import { buttonClass } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/session";

const FEATURES = {
  directory: Users,
  events: CalendarDays,
  news: Newspaper,
  line: MessageCircle,
  privacy: LockKeyhole,
  family: HeartHandshake,
} as const;
const STEPS = ["signup", "verify", "approved"] as const;

export async function generateMetadata({
  params,
}: PageProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "home" });
  return { title: { absolute: t("metaTitle") } };
}

/**
 * Public landing page. The app itself (sign-in, onboarding, member and admin
 * screens) lives under /app; "Sign up" and "Log in" both go to the sign-in
 * page there, since signing in for the first time creates the account.
 */
export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, user] = await Promise.all([
    getTranslations("home"),
    getCurrentUser(),
  ]);

  const actions = user ? (
    <Link href="/app" className={buttonClass("primary", "h-12 px-6 text-base")}>
      {t("hero.openApp")}
      <ArrowRight aria-hidden="true" className="size-4" />
    </Link>
  ) : (
    <>
      <Link
        href="/app"
        className={buttonClass(
          "primary",
          "h-12 w-full px-6 text-base sm:w-auto",
        )}
      >
        {t("hero.signUp")}
        <ArrowRight aria-hidden="true" className="size-4" />
      </Link>
      <Link
        href="/app"
        className={buttonClass(
          "secondary",
          "h-12 w-full px-6 text-base sm:w-auto",
        )}
      >
        {t("hero.logIn")}
      </Link>
    </>
  );

  return (
    <AppShell user={user} variant="onboarding">
      <div className="space-y-16 pb-8">
        <section
          aria-labelledby="hero-title"
          className="pt-6 text-center sm:pt-12"
        >
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-700">
            {t("hero.eyebrow")}
          </p>
          <h1
            id="hero-title"
            className="animate-rise mx-auto mt-3 max-w-3xl text-3xl font-bold tracking-tight text-balance text-slate-900 sm:text-5xl"
          >
            {t("hero.title")}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-balance text-slate-700">
            {t("hero.lead")}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {actions}
          </div>
          {user ? (
            <p className="mt-3 text-sm text-slate-600">
              {t("hero.signedInAs")}
            </p>
          ) : null}
        </section>

        <section aria-labelledby="features-title">
          <h2 id="features-title" className="text-center text-2xl font-bold">
            {t("features.title")}
          </h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(FEATURES).map(([key, Icon]) => (
              <li
                key={key}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                <span
                  aria-hidden="true"
                  className="mb-3 inline-flex size-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700"
                >
                  <Icon className="size-5" />
                </span>
                <h3 className="font-semibold text-brand-800">
                  {t(`features.items.${key}.title`)}
                </h3>
                <p className="mt-2 text-sm text-slate-700">
                  {t(`features.items.${key}.body`)}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="steps-title">
          <h2 id="steps-title" className="text-center text-2xl font-bold">
            {t("steps.title")}
          </h2>
          <ol className="mt-6 grid gap-4 sm:grid-cols-3">
            {STEPS.map((key, i) => (
              <li key={key} className="flex gap-4 rounded-xl bg-brand-50 p-5">
                <span
                  aria-hidden="true"
                  className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-700 font-bold text-white"
                >
                  {i + 1}
                </span>
                <div>
                  <h3 className="font-semibold">
                    {t(`steps.items.${key}.title`)}
                  </h3>
                  <p className="mt-1 text-sm text-slate-700">
                    {t(`steps.items.${key}.body`)}
                  </p>
                </div>
              </li>
            ))}
          </ol>
          <p className="mx-auto mt-6 max-w-2xl text-center text-sm text-slate-600">
            <span className="font-semibold text-slate-800">
              {t("audience.title")}:{" "}
            </span>
            {t("audience.body")}
          </p>
        </section>

        <section
          aria-labelledby="about-title"
          className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 text-center"
        >
          <h2 id="about-title" className="text-lg font-bold">
            {t("about.title")}
          </h2>
          <p className="mt-2 text-sm text-slate-700">{t("about.body")}</p>
        </section>

        <section
          aria-labelledby="cta-title"
          className="rounded-2xl bg-brand-700 px-6 py-10 text-center text-white"
        >
          <h2 id="cta-title" className="text-2xl font-bold">
            {t("cta.title")}
          </h2>
          <p className="mt-2 text-brand-100">{t("cta.body")}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/app"
              className={buttonClass(
                "secondary",
                "border-white px-6 text-base",
              )}
            >
              {user ? t("hero.openApp") : t("hero.signUp")}
            </Link>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
