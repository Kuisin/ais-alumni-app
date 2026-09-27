import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/card";
import { type AudienceSpec, isEveryone } from "@/lib/news-audience";

/** Short badges for a ニュース post's recipients: groups, 学年 N, 個別 N人, or 全員. */
export function AudienceSummary({ spec }: { spec: AudienceSpec }) {
  const t = useTranslations("adminContent");
  if (isEveryone(spec)) return <Badge>{t("audience.everyone")}</Badge>;
  return (
    <>
      {spec.groups.map((g) => (
        <Badge key={g} tone="brand">
          {t(`audience.groups.${g}`)}
        </Badge>
      ))}
      {spec.cohortIds.length ? (
        <Badge tone="brand">
          {t("audience.summaryCohorts", { count: spec.cohortIds.length })}
          {spec.includeParents ? ` · ${t("audience.summaryParents")}` : ""}
        </Badge>
      ) : null}
      {spec.userIds.length ? (
        <Badge tone="brand">
          {t("audience.summaryUsers", { count: spec.userIds.length })}
        </Badge>
      ) : null}
    </>
  );
}
