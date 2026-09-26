import { getTranslations } from "next-intl/server";
import { EMPTY_NEWS, NewsForm } from "@/components/news/news-form";
import { PageHeader } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { requireAdmin } from "@/lib/session";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/admin/news/new">) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "adminContent" });
  return { title: t("news.new") };
}

export default async function NewNewsPage() {
  await requireAdmin();
  const t = await getTranslations("adminContent");
  return (
    <>
      <Link href="/admin/news" className="text-sm text-brand-700 underline">
        {t("news.backToList")}
      </Link>
      <div className="mt-2">
        <PageHeader title={t("news.new")} />
      </div>
      <NewsForm values={EMPTY_NEWS} />
    </>
  );
}
