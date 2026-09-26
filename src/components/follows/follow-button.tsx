"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { requestFollowAction, unfollowAction } from "@/app/actions/follows";
import { Badge } from "@/components/ui/card";
import { SubmitButton } from "@/components/ui/submit-button";

export type FollowUiState = "none" | "requested" | "following";

/** none → Follow (request); requested → cancel; following → unfollow (§9.2). */
export function FollowButton({
  targetId,
  state,
}: {
  targetId: string;
  state: FollowUiState;
}) {
  const t = useTranslations("follows");
  const [result, action] = useActionState(requestFollowAction, null);

  if (state === "requested" || state === "following") {
    return (
      <form
        action={unfollowAction}
        className="flex flex-wrap items-center gap-2"
      >
        <input type="hidden" name="targetId" value={targetId} />
        <Badge tone={state === "following" ? "green" : "amber"}>
          {t(state === "following" ? "actions.following" : "actions.requested")}
        </Badge>
        <SubmitButton variant="secondary" pendingText={t("actions.working")}>
          {t(
            state === "following"
              ? "actions.unfollow"
              : "actions.cancelRequest",
          )}
        </SubmitButton>
      </form>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="targetId" value={targetId} />
      <SubmitButton pendingText={t("actions.working")}>
        {t("actions.follow")}
      </SubmitButton>
      <p
        aria-live="polite"
        className={
          result?.ok ? "text-sm text-green-800" : "text-sm text-red-700"
        }
      >
        {result ? t(result.message) : null}
      </p>
    </form>
  );
}
