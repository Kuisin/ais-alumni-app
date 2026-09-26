import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/lib/session";

export default async function OnboardingLayout({
  children,
}: LayoutProps<"/[locale]/app/onboarding">) {
  const user = await requireUser();
  return (
    <AppShell user={user} variant="onboarding">
      <div className="mx-auto max-w-xl">{children}</div>
    </AppShell>
  );
}
