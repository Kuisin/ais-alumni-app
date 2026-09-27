"use client";

import { ChevronDown, Clock, UserCheck, UserPlus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState, useId, useState } from "react";
import { requestFollowAction, unfollowAction } from "@/app/actions/follows";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
// Type-only: keeps the server-side follows module out of the client bundle.
import type { FollowUiState } from "@/lib/follows";

export type { FollowUiState };

/**
 * Instagram-style follow button (§9.2):
 * - none       → 「フォローする」 sends a request
 * - followBack → 「フォローバック」 sends a request (they follow me)
 * - requested  → 「リクエスト済み」 cancels the pending request
 * - following  → 「フォロー中」 opens a confirm step, then unfollows
 */
export function FollowButton({
  targetId,
  state,
  name,
}: {
  targetId: string;
  state: FollowUiState;
  /** display name, for the unfollow confirmation */
  name: string;
}) {
  const t = useTranslations("follows");
  const [result, action] = useActionState(requestFollowAction, null);
  const [confirming, setConfirming] = useState(false);
  const confirmId = useId();

  const canRequest = state === "none" || state === "followBack";
  // Errors belong to the request form; success notes to the state it led to.
  const message =
    result && (result.ok ? !canRequest : canRequest) ? result : null;
  const status = (
    <p
      aria-live="polite"
      className={
        message?.ok ? "text-sm text-green-800" : "text-sm text-red-700"
      }
    >
      {message ? t(message.message) : null}
    </p>
  );

  if (state === "following") {
    return (
      <div className="flex flex-col gap-2">
        <Button
          variant="secondary"
          aria-expanded={confirming}
          aria-controls={confirming ? confirmId : undefined}
          onClick={() => setConfirming((v) => !v)}
        >
          <UserCheck aria-hidden="true" className="size-4" />
          {t("actions.following")}
          <ChevronDown aria-hidden="true" className="size-4" />
        </Button>
        {confirming ? (
          <div
            id={confirmId}
            className="max-w-xs rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800"
          >
            <p>{t("actions.unfollowConfirm", { name })}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <form action={unfollowAction}>
                <input type="hidden" name="targetId" value={targetId} />
                <SubmitButton
                  variant="danger"
                  pendingText={t("actions.working")}
                >
                  {t("actions.unfollow")}
                </SubmitButton>
              </form>
              <Button variant="secondary" onClick={() => setConfirming(false)}>
                {t("actions.cancel")}
              </Button>
            </div>
          </div>
        ) : null}
        {status}
      </div>
    );
  }

  if (state === "requested") {
    return (
      <form action={unfollowAction} className="flex flex-col gap-2">
        <input type="hidden" name="targetId" value={targetId} />
        <SubmitButton variant="secondary" pendingText={t("actions.working")}>
          <Clock aria-hidden="true" className="size-4" />
          {t("actions.requested")}
          <span className="sr-only">{t("actions.requestedHint")}</span>
        </SubmitButton>
        {status}
      </form>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="targetId" value={targetId} />
      <SubmitButton pendingText={t("actions.working")}>
        <UserPlus aria-hidden="true" className="size-4" />
        {t(state === "followBack" ? "actions.followBack" : "actions.follow")}
      </SubmitButton>
      {status}
    </form>
  );
}
