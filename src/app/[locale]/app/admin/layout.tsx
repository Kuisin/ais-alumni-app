import type { Viewport } from "next";
import { AppShell } from "@/components/layout/app-shell";
import { requireStaff } from "@/lib/session";

// Browser / system bars match the dark admin header.
export const viewport: Viewport = { themeColor: "#0f172a" };

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
