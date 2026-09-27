import { getLocale, getTranslations } from "next-intl/server";
import { EMPTY_EVENT, EventForm } from "@/components/events/event-form";
import { BackLink } from "@/components/ui/back-link";
import { PageHeader } from "@/components/ui/card";
import { loadCohortOptions } from "@/lib/cohorts-db";
import { requireAdmin } from "@/lib/session";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/app/admin/events/new">) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "adminContent" });
  return { title: t("events.new") };
}

export default async function NewEventPage() {
  await requireAdmin();
  const t = await getTranslations("adminContent");
  return (
    <>
      <BackLink href="/app/admin/events">{t("events.backToList")}</BackLink>
      <div className="mt-1">
        <PageHeader title={t("events.new")} />
      </div>
      <EventForm
        values={EMPTY_EVENT}
        cohorts={
          await loadCohortOptions((await getLocale()) === "en" ? "en" : "ja")
        }
        cancelHref="/app/admin/events"
      />
    </>
  );
}
