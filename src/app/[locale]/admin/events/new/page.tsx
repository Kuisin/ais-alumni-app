import { getTranslations } from "next-intl/server";
import { EMPTY_EVENT, EventForm } from "@/components/events/event-form";
import { PageHeader } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { requireAdmin } from "@/lib/session";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/admin/events/new">) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "adminContent" });
  return { title: t("events.new") };
}

export default async function NewEventPage() {
  await requireAdmin();
  const t = await getTranslations("adminContent");
  return (
    <>
      <Link href="/admin/events" className="text-sm text-brand-700 underline">
        {t("events.backToList")}
      </Link>
      <div className="mt-2">
        <PageHeader title={t("events.new")} />
      </div>
      <EventForm values={EMPTY_EVENT} />
    </>
  );
}
