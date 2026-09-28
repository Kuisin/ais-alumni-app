import { getTranslations } from "next-intl/server";
import { EMPTY_NEWS, NewsForm } from "@/components/news/news-form";
import { BackLink } from "@/components/ui/back-link";
import { PageHeader } from "@/components/ui/card";
import { cohortShortLabels, loadCohortOptions } from "@/lib/cohorts-db";
import { asLocale } from "@/lib/events";
import { senderRoleFor } from "@/lib/permissions";
import { roleLabel } from "@/lib/sender";
import { requireNewsAuthor } from "@/lib/session";
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
  // Admins, current teachers, 同窓会委員 and 学年代表 (own 学年) may post.
  const { scope } = await requireNewsAuthor();
  const t = await getTranslations("news");
  const cohorts = await loadCohortOptions(locale);
  // Members see the role the post is sent as, not the author's name.
  const short = await cohortShortLabels(locale);
  const ts = await getTranslations("news.sender");
  const role = roleLabel(senderRoleFor(scope), ts, () =>
    scope.kind === "COHORT"
      ? scope.cohortIds
          .map((id) => short[id])
          .join(locale === "ja" ? "・" : ", ")
      : "",
  );
  return (
    <>
      <BackLink href="/app/news">{t("backToList")}</BackLink>
      <div className="mt-1">
        <PageHeader
          title={t("create")}
          description={ts("postingAs", { role })}
        />
      </div>
      <NewsForm
        values={EMPTY_NEWS}
        cohorts={cohorts}
        scope={scope}
        cancelHref="/app/news"
        useBlob={isBlobConfigured()}
      />
    </>
  );
}
