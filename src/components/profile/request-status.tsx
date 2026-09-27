import { Badge } from "@/components/ui/card";
import { SubmitButton } from "@/components/ui/submit-button";
import { ChangeRequestStatus } from "@/generated/prisma/enums";

type Request = {
  id: string;
  status: ChangeRequestStatus;
  reviewNote: string | null;
};

/**
 * Status of the latest change request under a locked field (name, birth
 * date, gender): pending (with withdraw) or the committee's decision.
 */
export function RequestStatus({
  latest,
  pendingText,
  statusLabel,
  reviewNoteLabel,
  withdrawLabel,
  withdrawAction,
}: {
  latest: Request | null;
  /** e.g. 「9月28日に申請（確認待ち）」 */
  pendingText: string;
  statusLabel: (s: ChangeRequestStatus) => string;
  reviewNoteLabel: string;
  withdrawLabel: string;
  withdrawAction: (fd: FormData) => Promise<void>;
}) {
  if (!latest || latest.status === ChangeRequestStatus.CANCELLED) return null;
  if (latest.status === ChangeRequestStatus.PENDING) {
    return (
      <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
        <p className="flex flex-wrap items-center gap-2 font-medium text-amber-900">
          <Badge tone="amber">{statusLabel(latest.status)}</Badge>
          {pendingText}
        </p>
        <form action={withdrawAction}>
          <input type="hidden" name="id" value={latest.id} />
          <SubmitButton variant="secondary">{withdrawLabel}</SubmitButton>
        </form>
      </div>
    );
  }
  return (
    <p className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
      <Badge
        tone={latest.status === ChangeRequestStatus.APPROVED ? "green" : "red"}
      >
        {statusLabel(latest.status)}
      </Badge>
      {latest.reviewNote ? (
        <span>
          {reviewNoteLabel}: {latest.reviewNote}
        </span>
      ) : null}
    </p>
  );
}
