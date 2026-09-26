import { redirect } from "@/i18n/navigation";

export default async function AdminIndexPage({
  params,
}: PageProps<"/[locale]/app/admin">) {
  const { locale } = await params;
  redirect({ href: "/app/admin/verification", locale });
}
