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
}: PageProps<"/[locale]/app/admin/news/new">) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "adminContent" });
  return { title: t("news.new") };
}

export default async function NewNewsPage({
  params,
}: PageProps<"/[locale]/app/admin/news/new">) {
  const locale = asLocale((await params).locale);
  await requireAdmin();
  const t = await getTranslations("adminContent");
  const cohorts = await loadCohortOptions(locale);
  return (
    <>
      <BackLink href="/app/admin/news">{t("news.backToList")}</BackLink>
      <div className="mt-1">
        <PageHeader title={t("news.new")} />
      </div>
      <NewsForm
        values={EMPTY_NEWS}
        cohorts={cohorts}
        cancelHref="/app/admin/news"
        useBlob={isBlobConfigured()}
      />
    </>
  );
}
