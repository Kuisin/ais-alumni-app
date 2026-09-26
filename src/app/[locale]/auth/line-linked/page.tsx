import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AppShell } from "@/components/layout/app-shell";
import { buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { lineAddFriendUrl, parseLinkOutcome } from "@/lib/line-link";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/auth/line-linked">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "line" });
  return { title: t("done.metaTitle"), robots: { index: false } };
}

/**
 * Result page of the LINE linking flow when it was completed in a browser that
 * isn't signed in as that member — typically the phone that scanned the QR
 * code shown on a computer. Deliberately shows no account data.
 */
export default async function LineLinkedPage({
  params,
  searchParams,
}: PageProps<"/[locale]/auth/line-linked">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const outcome = parseLinkOutcome((await searchParams).status) ?? "error";
  const t = await getTranslations("line");
  const addFriendUrl = outcome === "linked" ? lineAddFriendUrl() : null;

  return (
    <AppShell user={null} variant="onboarding">
      <div className="mx-auto max-w-xl">
        <Card className="space-y-4">
          <h1 className="text-2xl font-bold">{t(`done.${outcome}.title`)}</h1>
          <output className="block text-slate-700">
            {t(`done.${outcome}.body`)}
          </output>
          <div className="flex flex-wrap gap-2">
            {addFriendUrl ? (
              <a href={addFriendUrl} className={buttonClass("line")}>
                {t("addFriend")}
              </a>
            ) : null}
            <Link href="/" className={buttonClass("secondary")}>
              {t("done.openApp")}
            </Link>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
