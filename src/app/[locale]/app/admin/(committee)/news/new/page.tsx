import { getTranslations } from "next-intl/server";
import { EMPTY_NEWS, NewsForm } from "@/components/news/news-form";
import { PageHeader } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
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
      <Link
        href="/app/admin/news"
        className="inline-flex min-h-11 items-center text-sm text-brand-700 underline"
      >
        {t("news.backToList")}
      </Link>
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
