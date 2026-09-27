import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { HistoryEditor } from "@/components/history/history-editor";
import { BackLink } from "@/components/ui/back-link";
import { PageHeader } from "@/components/ui/card";
import { requireActive } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("history");
  return { title: t("title") };
}

/** 学歴・職歴: add, edit and remove entries; ongoing ones set the current stage. */
export default async function HistoryPage() {
  const me = await requireActive();
  const t = await getTranslations("history");
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <BackLink href="/app/profile#history">{t("backToProfile")}</BackLink>
        <PageHeader title={t("title")} description={t("description")} />
      </div>
      <HistoryEditor userId={me.id} />
    </div>
  );
}
