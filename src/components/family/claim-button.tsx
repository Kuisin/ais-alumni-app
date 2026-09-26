"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { claimFamilyAction } from "@/app/actions/family";
import { SubmitButton } from "@/components/ui/submit-button";

/** "This is my child" / "This is my parent" on a search result (§8). */
export function ClaimButton({
  otherId,
  direction,
}: {
  otherId: string;
  direction: "child" | "parent";
}) {
  const t = useTranslations("family");
  const [state, action] = useActionState(claimFamilyAction, null);
  if (state?.ok) {
    return (
      <p aria-live="polite" className="text-sm text-green-800">
        {t(state.message)}
      </p>
    );
  }
  return (
    <form action={action} className="flex flex-col gap-1">
      <input type="hidden" name="direction" value={direction} />
      <input type="hidden" name="otherId" value={otherId} />
      <SubmitButton variant="secondary" pendingText={t("working")}>
        {t(direction === "child" ? "claimChild.select" : "claimParent.select")}
      </SubmitButton>
      <p aria-live="polite" className="text-sm text-red-700">
        {state ? t(state.message) : null}
      </p>
    </form>
  );
}
