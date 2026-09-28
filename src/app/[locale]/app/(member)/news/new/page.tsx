import { getTranslations } from "next-intl/server";
import { EMPTY_NEWS, NewsForm } from "@/components/news/news-form";
import { BackLink } from "@/components/ui/back-link";
import { PageHeader } from "@/components/ui/card";
import { loadCohortOptions } from "@/lib/cohorts-db";
import { asLocale } from "@/lib/events";
import { requireAdmin } from "@/lib/session";
import { isBlobConfigured } from "@/lib/storage";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/app/news/new">) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "news" });
  return { title: t("create") };
}

export default async function NewNewsPage({
  params,
}: PageProps<"/[locale]/app/news/new">) {
  const locale = asLocale((await params).locale);
  // Posting news is an admin right; the page lives in the main app.
  await requireAdmin();
  const t = await getTranslations("news");
  const cohorts = await loadCohortOptions(locale);
  return (
    <>
      <BackLink href="/app/news">{t("backToList")}</BackLink>
      <div className="mt-1">
        <PageHeader title={t("create")} />
      </div>
      <NewsForm
        values={EMPTY_NEWS}
        cohorts={cohorts}
        cancelHref="/app/news"
        useBlob={isBlobConfigured()}
      />
    </>
  );
}
