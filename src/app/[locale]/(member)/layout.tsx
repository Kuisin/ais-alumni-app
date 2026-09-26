import { AppShell } from "@/components/layout/app-shell";
import { requireActive } from "@/lib/session";

// Every page under (member) is ACTIVE-only (§3.3). Server actions must still
// call actionActive() themselves: layouts do not guard actions.
export default async function MemberLayout({ children }: LayoutProps<"/[locale]">) {
  const user = await requireActive();
  return <AppShell user={user}>{children}</AppShell>;
}
