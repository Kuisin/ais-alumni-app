"use client";

import { Pencil, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState } from "react";
import { Button, buttonClass } from "@/components/ui/button";
import type { RoleKey } from "@/generated/prisma/enums";
import type { CohortChoice } from "@/lib/cohorts";
import type { RecordField } from "@/lib/record-requests";
import { RecordRequestForm } from "./record-request-form";

/** "Request a correction" button that reveals the request form. */
export function CorrectionPanel(props: {
  role: RoleKey;
  fields: readonly RecordField[];
  values: Record<string, string>;
  cohorts: CohortChoice[];
}) {
  const t = useTranslations("records");
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const moveFocus = useRef(false);

  useEffect(() => {
    if (!moveFocus.current) return;
    moveFocus.current = false;
    if (open)
      panelRef.current
        ?.querySelector<HTMLElement>("input:not([type=hidden]), select")
        ?.focus();
    else buttonRef.current?.focus();
  }, [open]);

  function toggle(next: boolean) {
    moveFocus.current = true;
    setOpen(next);
  }

  return (
    <div className="space-y-3">
      {open ? null : (
        <button
          ref={buttonRef}
          type="button"
          aria-expanded={false}
          aria-controls={panelId}
          onClick={() => toggle(true)}
          className={buttonClass("secondary", "w-full sm:w-auto")}
        >
          <Pencil aria-hidden="true" className="size-4" />
          {t("requestCorrection")}
        </button>
      )}
      <div
        id={panelId}
        ref={panelRef}
        hidden={!open}
        className="animate-fade rounded-lg border border-slate-200 bg-slate-50 p-3 sm:p-4"
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="font-semibold">{t("requestCorrection")}</h3>
          <Button
            variant="ghost"
            className="px-2"
            onClick={() => toggle(false)}
          >
            <X aria-hidden="true" className="size-4" />
            {t("close")}
          </Button>
        </div>
        <RecordRequestForm {...props} />
      </div>
    </div>
  );
}
