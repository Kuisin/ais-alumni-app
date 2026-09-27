import { AccountState } from "@/generated/prisma/enums";
import { redirect } from "@/i18n/navigation";
import { safeNextPath } from "@/lib/next-path";
import { requireUser } from "@/lib/session";
import { homePathFor } from "@/lib/state-machine";

/**
 * Post-sign-in landing spot: members go back to the page they asked for
 * (?next=), everyone else to the screen for their state.
 */
export default async function OnboardingIndex({
  params,
  searchParams,
}: PageProps<"/[locale]/app/onboarding">) {
  const { locale } = await params;
  const user = await requireUser();
  const next = safeNextPath((await searchParams).next);
  const href =
    next && user.state === AccountState.ACTIVE ? next : homePathFor(user);
  return redirect({ href, locale });
}
