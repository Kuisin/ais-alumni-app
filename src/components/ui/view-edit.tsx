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
import { Link } from "@/i18n/navigation";
import { Button, buttonClass } from "./button";
import { Alert } from "./card";
import { cn } from "./cn";

type Ctx = {
  editing: boolean;
  /** saved: back to the view (optionally with the action's own message) */
  done: (message?: string) => void;
  cancel: () => void;
};
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
  const [saved, setSaved] = useState<string | null>(null);
  const [round, setRound] = useState(0);
  const editButton = useRef<HTMLButtonElement>(null);
  const wasEditing = useRef(editing);

  // Return focus to the edit button when the form closes.
  useEffect(() => {
    if (wasEditing.current && !editing) editButton.current?.focus();
    wasEditing.current = editing;
  }, [editing]);

  const done = useCallback(
    (message?: string) => {
      setEditing(false);
      setSaved(message ?? tc("saved"));
    },
    [tc],
  );
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
      {saved ? <Alert tone="success">{saved}</Alert> : null}
      {view}
      {canEdit ? (
        <div className={actionsClassName}>
          <Button
            ref={editButton}
            variant="secondary"
            onClick={() => {
              setSaved(null);
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

/**
 * A profile/settings section as one card: title on the left, one header
 * button on the right — 編集 (or `editLabel`, e.g. 変更を申請) in view mode,
 * キャンセル while editing, always in the same place. The form (children)
 * opens in place and closes back to the view once saved (useCloseOnSave).
 * `#id` scrolls to it; `#edit-id` (setup checklist links, the avatar's
 * camera button) opens it for editing. `action` replaces the edit button with a link
 * for sections edited on their own page.
 */
export function EditableCard({
  id,
  title,
  icon,
  description,
  view,
  children,
  canEdit = true,
  editLabel,
  closeLabel,
  savedMessage,
  action,
  className,
}: {
  id: string;
  title: ReactNode;
  icon?: ReactNode;
  description?: ReactNode;
  view: ReactNode;
  /** the form; omit for read-only sections */
  children?: ReactNode;
  canEdit?: boolean;
  editLabel?: string;
  /** header button while editing (default キャンセル; 完了 when changes apply at once) */
  closeLabel?: string;
  /** shown after a save (default 保存しました) */
  savedMessage?: string;
  /** header link instead of the edit button */
  action?: ReactNode;
  className?: string;
}) {
  const tc = useTranslations("common");
  const [editing, setEditing] = useState(false);
  // An open form stays until it closes itself: a save can make the section
  // read-only (e.g. a request now pending) in the same refresh.
  const editable = children !== undefined && (canEdit || editing);
  const [saved, setSaved] = useState<string | null>(null);
  const [round, setRound] = useState(0);
  const card = useRef<HTMLElement>(null);
  const headerButton = useRef<HTMLButtonElement>(null);
  const wasEditing = useRef(editing);

  const open = useCallback(() => {
    setSaved(null);
    setRound((r) => r + 1);
    setEditing(true);
  }, []);
  const done = useCallback(
    (message?: string) => {
      setEditing(false);
      setSaved(message ?? savedMessage ?? tc("saved"));
    },
    [savedMessage, tc],
  );
  const cancel = useCallback(() => setEditing(false), []);

  // #edit-id opens the section (on load and on in-page links).
  useEffect(() => {
    if (!editable) return;
    const check = () => {
      if (window.location.hash !== `#edit-${id}`) return;
      open();
      card.current?.scrollIntoView({ block: "start" });
    };
    check();
    window.addEventListener("hashchange", check);
    return () => window.removeEventListener("hashchange", check);
  }, [editable, id, open]);

  // Keep focus on the header button as it switches, and keep the card in
  // view when a long form closes.
  useEffect(() => {
    if (wasEditing.current !== editing) {
      headerButton.current?.focus({ preventScroll: true });
      if (!editing) {
        card.current?.scrollIntoView({ block: "nearest" });
        // Drop #edit-id so the same link can open the section again.
        if (window.location.hash === `#edit-${id}`) {
          const { pathname, search } = window.location;
          window.history.replaceState(
            window.history.state,
            "",
            pathname + search,
          );
        }
      }
    }
    wasEditing.current = editing;
  }, [editing, id]);

  const headingId = `${id}-title`;
  return (
    <section
      ref={card}
      id={id}
      aria-labelledby={headingId}
      className={cn(
        "scroll-mt-20 rounded-xl border bg-white p-4 shadow-sm transition-colors sm:p-6",
        editing ? "border-brand-300 ring-4 ring-brand-50" : "border-slate-200",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <h2
          id={headingId}
          className="flex min-h-11 min-w-0 items-center gap-2 text-lg font-semibold"
        >
          {icon ? (
            <span aria-hidden="true" className="text-slate-500 [&_svg]:size-4">
              {icon}
            </span>
          ) : null}
          {title}
        </h2>
        {editable ? (
          <Button
            ref={headerButton}
            variant={editing ? "ghost" : "secondary"}
            className="shrink-0 px-3"
            aria-expanded={editing}
            onClick={editing ? cancel : open}
          >
            {editing ? (
              <X aria-hidden="true" className="size-4" />
            ) : (
              <Pencil aria-hidden="true" className="size-4" />
            )}
            {editing ? (closeLabel ?? tc("cancel")) : (editLabel ?? tc("edit"))}
          </Button>
        ) : (
          action
        )}
      </div>
      {description ? (
        <p className="mb-3 text-sm text-slate-600">{description}</p>
      ) : null}
      <div className="mt-2">
        {editing && editable ? (
          <ViewEditContext.Provider value={{ editing, done, cancel }}>
            <div key={round} className="animate-rise">
              {children}
            </div>
          </ViewEditContext.Provider>
        ) : (
          <div className="space-y-3">
            {saved ? <Alert tone="success">{saved}</Alert> : null}
            {view}
          </div>
        )}
      </div>
    </section>
  );
}

/** Header link of an EditableCard edited elsewhere (history, record, settings). */
export function CardLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={buttonClass("secondary", "shrink-0 px-3")}>
      <Pencil aria-hidden="true" className="size-4" />
      {children}
    </Link>
  );
}

/**
 * Inside ViewEdit / EditableCard: switch back to the view once a save
 * succeeded. `message` (already translated) replaces 「保存しました」.
 */
export function useCloseOnSave(
  state: { ok?: boolean } | null | undefined,
  message?: string,
) {
  const ctx = useContext(ViewEditContext);
  const seen = useRef(state);
  useEffect(() => {
    if (state === seen.current) return;
    seen.current = state;
    if (state?.ok) ctx?.done(message);
  }, [state, ctx, message]);
}

/** Inside ViewEdit: the cancel/done handles (null outside one). */
export function useViewEdit(): Ctx | null {
  return useContext(ViewEditContext);
}
