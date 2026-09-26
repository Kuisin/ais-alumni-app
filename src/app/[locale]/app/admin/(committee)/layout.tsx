import { requireAdmin } from "@/lib/session";

// Committee-only pages (§3.2). Server actions must still call actionAdmin().
export default async function CommitteeLayout({
  children,
}: LayoutProps<"/[locale]/app/admin">) {
  await requireAdmin();
  return children;
}
