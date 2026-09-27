import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/card";
import { effectiveAudiences, type Targeted } from "@/lib/audience";

/** Target audiences as badges; empty = "All members". */
export function TargetBadges({ target }: { target: Targeted }) {
  const t = useTranslations("adminContent");
  const tr = useTranslations("roles");
  const roles = effectiveAudiences(target);
  if (roles.length === 0) return <Badge>{t("allMembers")}</Badge>;
  return (
    <>
      {roles.map((r) => (
        <Badge key={r} tone="brand">
          {tr(`audience.${r}`)}
        </Badge>
      ))}
    </>
  );
}
