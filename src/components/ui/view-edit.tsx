"use client";

import { Pencil, X } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Button } from "./button";
import { Alert } from "./card";
import { cn } from "./cn";

type Ctx = { editing: boolean; done: () => void; cancel: () => void };
const ViewEditContext = createContext<Ctx | null>(null);

/**
 * View first, edit on purpose: saved data is shown read-only with an
 * "Edit" button; the form (children) appears only after pressing it and
 * closes again once saved (forms call useCloseOnSave) or cancelled. Keeps
 * members from changing things by accident.
 */
export function ViewEdit({
  view,
  children,
  canEdit = true,
  editLabel,
  startEditing = false,
  className,
  actionsClassName,
}: {
  /** read-only rendering of the saved data */
  view: ReactNode;
  /** the form */
  children: ReactNode;
  /** false = no edit button (e.g. after the deadline) */
  canEdit?: boolean;
  editLabel?: string;
  /** open in edit mode (e.g. nothing saved yet) */
  startEditing?: boolean;
  className?: string;
  actionsClassName?: string;
}) {
  const tc = useTranslations("common");
  const [editing, setEditing] = useState(startEditing);
  const [saved, setSaved] = useState(false);
  const [round, setRound] = useState(0);
  const editButton = useRef<HTMLButtonElement>(null);
  const wasEditing = useRef(editing);

  // Return focus to the edit button when the form closes.
  useEffect(() => {
    if (wasEditing.current && !editing) editButton.current?.focus();
    wasEditing.current = editing;
  }, [editing]);

  const done = useCallback(() => {
    setEditing(false);
    setSaved(true);
  }, []);
  const cancel = useCallback(() => setEditing(false), []);

  if (editing && canEdit) {
    return (
      <ViewEditContext.Provider value={{ editing, done, cancel }}>
        <div className={cn("space-y-3", className)}>
          {/* A fresh form each time it opens (no stale input). */}
          <div key={round}>{children}</div>
          <Button variant="ghost" onClick={cancel}>
            <X aria-hidden="true" className="size-4" />
            {tc("cancel")}
          </Button>
        </div>
      </ViewEditContext.Provider>
    );
  }
  return (
    <div className={cn("space-y-3", className)}>
      {saved ? <Alert tone="success">{tc("saved")}</Alert> : null}
      {view}
      {canEdit ? (
        <div className={actionsClassName}>
          <Button
            ref={editButton}
            variant="secondary"
            onClick={() => {
              setSaved(false);
              setRound((r) => r + 1);
              setEditing(true);
            }}
          >
            <Pencil aria-hidden="true" className="size-4" />
            {editLabel ?? tc("edit")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

/** Inside ViewEdit: switch back to the view once a save succeeded. */
export function useCloseOnSave(state: { ok?: boolean } | null | undefined) {
  const ctx = useContext(ViewEditContext);
  const seen = useRef(state);
  useEffect(() => {
    if (state === seen.current) return;
    seen.current = state;
    if (state?.ok) ctx?.done();
  }, [state, ctx]);
}

/** Inside ViewEdit: the cancel/done handles (null outside one). */
export function useViewEdit(): Ctx | null {
  return useContext(ViewEditContext);
}
