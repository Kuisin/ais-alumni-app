import { getTranslations } from "next-intl/server";
import { blockAction, unblockAction } from "@/app/actions/follows";
import { SubmitButton } from "@/components/ui/submit-button";

/**
 * Block with a confirmation step that works without JavaScript: the confirm
 * button only appears once the disclosure is opened.
 */
export async function BlockControl({
  targetId,
  name,
  blocked,
}: {
  targetId: string;
  name: string;
  blocked: boolean;
}) {
  const t = await getTranslations("follows");
  if (blocked) {
    return (
      <form action={unblockAction}>
        <input type="hidden" name="targetId" value={targetId} />
        <SubmitButton variant="secondary">{t("actions.unblock")}</SubmitButton>
      </form>
    );
  }
  return (
    <details className="group">
      <summary className="flex min-h-11 w-full cursor-pointer list-none items-center rounded-lg px-3 text-sm font-medium text-red-700 hover:bg-red-50 [&::-webkit-details-marker]:hidden">
        {t("actions.block")}
      </summary>
      <div className="mt-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900">
        <p>{t("actions.blockConfirm", { name })}</p>
        <form action={blockAction} className="mt-3">
          <input type="hidden" name="targetId" value={targetId} />
          <SubmitButton variant="danger">{t("actions.blockYes")}</SubmitButton>
        </form>
      </div>
    </details>
  );
}
