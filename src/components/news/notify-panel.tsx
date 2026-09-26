import { BellRing, Send } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { notifyNewsAction } from "@/app/actions/admin-content";
import { buttonClass } from "@/components/ui/button";
import { Alert, Card } from "@/components/ui/card";
import { SubmitButton } from "@/components/ui/submit-button";
import type { RoleKey } from "@/generated/prisma/enums";
import { Link } from "@/i18n/navigation";
import { formatDateTime } from "@/lib/format";
import { type NewsStatus, targetedRecipients } from "@/lib/news";
import { estimateLinePushes } from "@/lib/notify";

/**
 * "Publish & notify" (§10.4, §11). Step 1 is a link to ?notify=1; step 2
 * (confirm=true) shows the estimated recipients and LINE push count before
 * the admin confirms the send.
 */
export async function NotifyPanel({
  post,
  status,
  confirm,
  locale,
}: {
  post: {
    id: string;
    targetRoles: RoleKey[];
    notifiedAt: Date | null;
    publishedAt: Date | null;
  };
  status: NewsStatus;
  confirm: boolean;
  locale: "ja" | "en";
}) {
  const t = await getTranslations("adminContent");

  if (post.notifiedAt) {
    return (
      <Card>
        <h2 className="mb-2 flex items-center gap-2 text-lg font-semibold">
          <BellRing aria-hidden="true" className="size-5 text-brand-700" />
          {t("notify.title")}
        </h2>
        <p className="text-sm text-slate-700">
          {t("notify.alreadySent", {
            date: formatDateTime(post.notifiedAt, locale),
          })}
        </p>
      </Card>
    );
  }

  if (!confirm) {
    return (
      <Card>
        <h2 className="mb-2 flex items-center gap-2 text-lg font-semibold">
          <BellRing aria-hidden="true" className="size-5 text-brand-700" />
          {t("notify.title")}
        </h2>
        <p className="mb-3 text-sm text-slate-700">
          {status === "scheduled" && post.publishedAt
            ? t("notify.scheduledHint", {
                date: formatDateTime(post.publishedAt, locale),
              })
            : status === "draft"
              ? t("notify.draftHint")
              : t("notify.publishedHint")}
        </p>
        <Link
          href={`/app/admin/news/${post.id}?notify=1`}
          className={buttonClass("secondary", "w-full sm:w-auto xl:w-full")}
        >
          <Send aria-hidden="true" className="size-4" />
          {status === "published"
            ? t("notify.notifyNow")
            : t("notify.publishAndNotify")}
        </Link>
      </Card>
    );
  }

  const users = await targetedRecipients(post.targetRoles);
  const est = estimateLinePushes(users);
  const unreachable = users.length - est.line - est.email;

  return (
    <Card className="border-amber-300">
      <h2 className="mb-2 flex items-center gap-2 text-lg font-semibold">
        <BellRing aria-hidden="true" className="size-5 text-amber-600" />
        {t("notify.confirmTitle")}
      </h2>
      {status !== "published" ? (
        <div className="mb-3">
          <Alert tone="warning">{t("notify.willPublishNow")}</Alert>
        </div>
      ) : null}
      <dl className="mb-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4 xl:grid-cols-2">
        <div className="rounded-lg bg-slate-50 p-3">
          <dt className="text-slate-600">{t("notify.recipients")}</dt>
          <dd className="text-xl font-semibold">{users.length}</dd>
        </div>
        <div className="rounded-lg bg-slate-50 p-3">
          <dt className="text-slate-600">{t("notify.linePushes")}</dt>
          <dd className="text-xl font-semibold">{est.line}</dd>
        </div>
        <div className="rounded-lg bg-slate-50 p-3">
          <dt className="text-slate-600">{t("notify.emails")}</dt>
          <dd className="text-xl font-semibold">{est.email}</dd>
        </div>
        <div className="rounded-lg bg-slate-50 p-3">
          <dt className="text-slate-600">{t("notify.unreachable")}</dt>
          <dd className="text-xl font-semibold">{unreachable}</dd>
        </div>
      </dl>
      <p className="mb-4 text-xs text-slate-500">{t("notify.quotaHint")}</p>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap xl:flex-col">
        <form action={notifyNewsAction}>
          <input type="hidden" name="id" value={post.id} />
          <SubmitButton
            pendingText={t("notify.sending")}
            className="w-full sm:w-auto xl:w-full"
          >
            {t("notify.confirm", { count: users.length })}
          </SubmitButton>
        </form>
        <Link
          href={`/app/admin/news/${post.id}`}
          className={buttonClass("ghost", "w-full sm:w-auto xl:w-full")}
        >
          {t("notify.cancel")}
        </Link>
      </div>
    </Card>
  );
}
