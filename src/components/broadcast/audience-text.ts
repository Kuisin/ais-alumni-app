import type {
  AudienceKey,
  BroadcastScope,
  RoleKey,
} from "@/generated/prisma/enums";
import { effectiveAudiences } from "@/lib/audience";

/** Who a sent message went to, as one line: a 学年, audiences, or everyone. */
export function broadcastAudienceText(
  b: {
    scope: BroadcastScope;
    cohortId: string | null;
    targetRoles: RoleKey[];
    targetAudiences: AudienceKey[];
  },
  labels: {
    cohort: (id: string) => string | undefined;
    audience: (key: AudienceKey) => string;
    all: string;
  },
): string {
  if (b.scope === "COHORT") {
    return (b.cohortId ? labels.cohort(b.cohortId) : undefined) ?? "—";
  }
  const audiences = effectiveAudiences(b);
  return audiences.length
    ? audiences.map((a) => labels.audience(a)).join(", ")
    : labels.all;
}
