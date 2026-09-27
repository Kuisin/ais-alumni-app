"use client";

import { Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { Button, buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/card";
import { HistoryForm } from "./history-form";

/**
 * "＋ Add a school / job": a collapsed outline button that reveals the add
 * form. With no entries yet, the button sits inside the empty state.
 */
export function AddHistory({
  kind,
  empty,
  userId,
}: {
  kind: "education" | "work";
  /** admins editing another member's history */
  userId?: string;
  /** message shown when the member has no entries of this kind */
  empty?: string;
}) {
  const t = useTranslations("history");
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const moveFocus = useRef(false);
  const title = t(`addTitle.${kind}`);

  // Move focus into the form when it opens and back to the button on close.
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

  if (open) {
    return (
      <section
        ref={panelRef}
        aria-label={title}
        className="animate-fade rounded-xl border border-slate-200 bg-slate-50 p-3 sm:p-4"
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="font-semibold">{title}</h3>
          <Button
            variant="ghost"
            className="px-2"
            onClick={() => toggle(false)}
          >
            <X aria-hidden="true" className="size-4" />
            {t("close")}
          </Button>
        </div>
        <HistoryForm
          kind={kind}
          userId={userId}
          onSaved={() => toggle(false)}
        />
      </section>
    );
  }

  const button = (
    <button
      ref={buttonRef}
      type="button"
      aria-expanded={false}
      onClick={() => toggle(true)}
      className={buttonClass("secondary", "w-full sm:w-auto")}
    >
      <Plus aria-hidden="true" className="size-4" />
      {title}
    </button>
  );

  return empty ? (
    <EmptyState action={button}>
      <span className="text-balance">{empty}</span>
    </EmptyState>
  ) : (
    button
  );
}
