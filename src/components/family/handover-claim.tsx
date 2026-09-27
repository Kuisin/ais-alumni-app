"use client";

import { CircleCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { signOutAction } from "@/app/actions/common";
import { claimHandoverAction } from "@/app/actions/handover";
import { buttonClass } from "@/components/ui/button";
import { Alert } from "@/components/ui/card";
import { SubmitButton } from "@/components/ui/submit-button";
import { Link } from "@/i18n/navigation";

export function HandoverClaim({
  token,
  signedIn,
}: {
  token: string;
  signedIn: boolean;
}) {
  const t = useTranslations("family.handover.claim");
  const [state, action] = useActionState(claimHandoverAction, null);

  if (state?.ok) {
    return (
      <div className="animate-rise space-y-3" aria-live="polite">
        <p className="flex items-center gap-2 font-semibold text-green-800">
          <CircleCheck aria-hidden="true" className="size-5" />
          {t("done")}
        </p>
        <p className="text-sm text-slate-700">
          {t("signInWith", { email: state.email })}
        </p>
        {signedIn ? (
          <form action={signOutAction}>
            <SubmitButton className="w-full">{t("signOutAndIn")}</SubmitButton>
          </form>
        ) : (
          <Link href="/app" className={buttonClass("primary", "w-full")}>
            {t("goSignIn")}
          </Link>
        )}
      </div>
    );
  }
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="token" value={token} />
      {state && !state.ok ? <Alert tone="error">{t("invalid")}</Alert> : null}
      <SubmitButton className="w-full" pendingText={t("working")}>
        {t("confirm")}
      </SubmitButton>
    </form>
  );
}
