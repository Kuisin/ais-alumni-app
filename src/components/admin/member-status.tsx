"use client";

import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";
import {
  type AdminMemberFormState,
  setMemberAdminAction,
  setMemberStateAction,
} from "@/app/actions/admin-members";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { AccountState } from "@/generated/prisma/enums";
import { AdminFormResult } from "./form-result";

export function MemberStateControl({
  userId,
  state: current,
  isSelf,
}: {
  userId: string;
  state: AccountState;
  isSelf: boolean;
}) {
  const t = useTranslations("adminMembers.status");
  const tc = useTranslations("common");
  const [state, action] = useActionState<AdminMemberFormState, FormData>(
    setMemberStateAction,
    {},
  );
  const [confirming, setConfirming] = useState(false);

  if (isSelf) return <p className="text-sm text-slate-600">{t("notSelf")}</p>;

  if (current === AccountState.DEACTIVATED) {
    return (
      <form action={action} className="space-y-2">
        <input type="hidden" name="userId" value={userId} />
        <input type="hidden" name="state" value={AccountState.ACTIVE} />
        <AdminFormResult state={state} />
        <SubmitButton variant="secondary" pendingText={tc("saving")}>
          {t("reactivate")}
        </SubmitButton>
      </form>
    );
  }
  if (current !== AccountState.ACTIVE) {
    return (
      <div className="space-y-2">
        <AdminFormResult state={state} />
        <p className="text-sm text-slate-600">{t("noActions")}</p>
      </div>
    );
  }
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="state" value={AccountState.DEACTIVATED} />
      <AdminFormResult state={state} />
      {confirming ? (
        <div className="space-y-2 rounded-lg bg-red-50 p-3">
          <p className="text-sm text-red-900">{t("deactivateConfirm")}</p>
          <div className="flex flex-wrap gap-2">
            <SubmitButton variant="danger" pendingText={tc("saving")}>
              {t("deactivate")}
            </SubmitButton>
            <Button variant="secondary" onClick={() => setConfirming(false)}>
              {tc("cancel")}
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="secondary" onClick={() => setConfirming(true)}>
          {t("deactivate")}
        </Button>
      )}
    </form>
  );
}

export function MemberAdminControl({
  userId,
  isAdmin,
  isSelf,
  canGrant,
}: {
  userId: string;
  isAdmin: boolean;
  isSelf: boolean;
  canGrant: boolean;
}) {
  const t = useTranslations("adminMembers.admin");
  const tc = useTranslations("common");
  const [state, action] = useActionState<AdminMemberFormState, FormData>(
    setMemberAdminAction,
    {},
  );
  const [confirming, setConfirming] = useState(false);

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="grant" value={isAdmin ? "no" : "yes"} />
      <p className="text-sm">{isAdmin ? t("isAdmin") : t("notAdmin")}</p>
      <AdminFormResult state={state} />
      {confirming ? (
        <div className="space-y-2 rounded-lg bg-amber-50 p-3">
          <p className="text-sm text-amber-900">
            {isAdmin
              ? isSelf
                ? t("revokeSelfConfirm")
                : t("revokeConfirm")
              : t("grantConfirm")}
          </p>
          <div className="flex flex-wrap gap-2">
            <SubmitButton
              variant={isAdmin ? "danger" : "primary"}
              pendingText={tc("saving")}
            >
              {isAdmin ? t("revoke") : t("grant")}
            </SubmitButton>
            <Button variant="secondary" onClick={() => setConfirming(false)}>
              {tc("cancel")}
            </Button>
          </div>
        </div>
      ) : !isAdmin && !canGrant ? (
        <p className="text-sm text-slate-600">{t("mustBeActive")}</p>
      ) : (
        <Button variant="secondary" onClick={() => setConfirming(true)}>
          {isAdmin ? t("revoke") : t("grant")}
        </Button>
      )}
    </form>
  );
}
