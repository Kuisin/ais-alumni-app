import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/card";
import type { RoleKey } from "@/generated/prisma/enums";

/** Target roles as badges; empty = "All members". */
export function TargetBadges({ roles }: { roles: readonly RoleKey[] }) {
  const t = useTranslations("adminContent");
  const tr = useTranslations("roles");
  if (roles.length === 0) return <Badge>{t("allMembers")}</Badge>;
  return (
    <>
      {roles.map((r) => (
        <Badge key={r} tone="brand">
          {tr(`role.${r}`)}
        </Badge>
      ))}
    </>
  );
}
