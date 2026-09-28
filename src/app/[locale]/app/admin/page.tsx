import { redirect } from "@/i18n/navigation";
import { getStaffAccess } from "@/lib/broadcasts";
import { requireStaff } from "@/lib/session";

/** Admin-mode home: the first page the member may use. */
export default async function AdminIndexPage({
  params,
}: PageProps<"/[locale]/app/admin">) {
  const { locale } = await params;
  const a = await getStaffAccess(await requireStaff());
  const href = a.admin
    ? "/app/admin/verification"
    : a.teachers
      ? "/app/admin/teachers"
      : a.broadcast
        ? "/app/admin/notify"
        : "/app/admin/news";
  redirect({ href, locale });
}
