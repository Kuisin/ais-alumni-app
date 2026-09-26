import { AppShell } from "@/components/layout/app-shell";
import { requireAdmin } from "@/lib/session";

// Admin-only (§3.2). Server actions must still call actionAdmin().
export default async function AdminLayout({
  children,
}: LayoutProps<"/[locale]/admin">) {
  const user = await requireAdmin();
  return (
    <AppShell user={user} variant="admin">
      {children}
    </AppShell>
  );
}
