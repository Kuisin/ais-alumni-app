import { getTranslations } from "next-intl/server";
import { EMPTY_EVENT, EventForm } from "@/components/events/event-form";
import { BackLink } from "@/components/ui/back-link";
import { PageHeader } from "@/components/ui/card";
import { cohortShortLabels, loadCohortOptions } from "@/lib/cohorts-db";
import { asLocale } from "@/lib/events";
import { senderRoleFor } from "@/lib/permissions";
import { roleLabel } from "@/lib/sender";
import { requireNewsAuthor } from "@/lib/session";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/app/events/new">) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "events" });
  return { title: t("create") };
}

export default async function NewEventPage({
  params,
}: PageProps<"/[locale]/app/events/new">) {
  const locale = asLocale((await params).locale);
  // Same authors as ニュース: admins, current teachers, 同窓会委員 and
  // 学年代表 (own 学年).
  const { scope } = await requireNewsAuthor();
  const t = await getTranslations("events");
  const ts = await getTranslations("news.sender");
  const short = await cohortShortLabels(locale);
  // Members see the role the event comes from, not the author's name.
  const role = roleLabel(senderRoleFor(scope), ts, () =>
    scope.kind === "COHORT"
      ? scope.cohortIds
          .map((id) => short[id])
          .join(locale === "ja" ? "・" : ", ")
      : "",
  );
  return (
    <>
      <BackLink href="/app/events">{t("backToList")}</BackLink>
      <div className="mt-1">
        <PageHeader
          title={t("create")}
          description={ts("postingAs", { role })}
        />
      </div>
      <EventForm
        values={EMPTY_EVENT}
        cohorts={await loadCohortOptions(locale)}
        scope={scope}
        cancelHref="/app/events"
      />
    </>
  );
}
