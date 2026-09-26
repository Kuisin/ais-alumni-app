import { AppShell } from "@/components/layout/app-shell";
import { requireStaff } from "@/lib/session";

// Admin mode: committee admins and members holding a position. Each page
// (or the (committee) group) checks its own permission; server actions
// must still call their action guard.
export default async function AdminLayout({
  children,
}: LayoutProps<"/[locale]/app/admin">) {
  const user = await requireStaff();
  return (
    <AppShell user={user} variant="admin">
      {children}
    </AppShell>
  );
}
