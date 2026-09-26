import { redirect } from "@/i18n/navigation";
import { requireUser } from "@/lib/session";
import { homePathFor } from "@/lib/state-machine";

/** Post-sign-in landing spot: forwards to the screen for the user's state. */
export default async function OnboardingIndex({
  params,
}: PageProps<"/[locale]/app/onboarding">) {
  const { locale } = await params;
  const user = await requireUser();
  return redirect({ href: homePathFor(user), locale });
}
