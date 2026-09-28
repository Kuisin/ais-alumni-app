import { ShieldCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { SubmitButton } from "@/components/ui/submit-button";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/format";

/**
 * Approval of a 同窓会委員's ニュース post or event: waiting (with 「承認する」
 * for another 同窓会委員 or an admin), or who approved it and when.
 */
export async function ApprovalPanel({
  post,
  canApprove,
  action,
  locale,
}: {
  /** approveNewsAction / approveEventAction */
  action: (fd: FormData) => Promise<void>;
  post: { id: string; approvedAt: Date | null; approvedById: string | null };
  /** the viewer may approve (and isn't the author) */
  canApprove: boolean;
  locale: "ja" | "en";
}) {
  const t = await getTranslations("adminContent");
  const approver = post.approvedById
    ? await db.user.findUnique({
        where: { id: post.approvedById },
        select: { nameRomaji: true, nameKanji: true },
      })
    : null;

  return (
    <Card>
      <h2 className="mb-2 flex items-center gap-2 text-lg font-semibold">
        <ShieldCheck aria-hidden="true" className="size-5 text-brand-700" />
        {t("approval.title")}
      </h2>
      {post.approvedAt ? (
        <p className="text-sm text-slate-700">
          {t("approval.approved", {
            name: approver?.nameKanji ?? approver?.nameRomaji ?? "—",
            date: formatDateTime(post.approvedAt, locale),
          })}
        </p>
      ) : canApprove ? (
        <form action={action} className="space-y-3">
          <input type="hidden" name="id" value={post.id} />
          <p className="text-sm text-slate-700">{t("approval.ask")}</p>
          <SubmitButton>{t("approval.approve")}</SubmitButton>
        </form>
      ) : (
        <p className="text-sm text-slate-700">{t("approval.waiting")}</p>
      )}
    </Card>
  );
}
