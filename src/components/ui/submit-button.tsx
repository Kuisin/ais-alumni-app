"use client";

import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Button, type ButtonVariant } from "./button";
import { cn } from "./cn";

export function SubmitButton({
  children,
  pendingText,
  variant = "primary",
  className,
  name,
  value,
}: {
  children: ReactNode;
  pendingText?: ReactNode;
  variant?: ButtonVariant;
  className?: string;
  name?: string;
  value?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant={variant}
      className={className}
      disabled={pending}
      aria-disabled={pending}
      name={name}
      value={value}
    >
      {pending && pendingText ? pendingText : children}
    </Button>
  );
}

/**
 * Submit button of a SearchForm. Keeps its label while the results load:
 * the icon turns into a spinner (without an icon, a spinner covers the
 * label), so the button never changes size. Not disabled: submitting a
 * newer search replaces the pending one.
 */
export function SearchButton({
  children,
  icon,
  variant = "primary",
  className,
}: {
  children: ReactNode;
  icon?: ReactNode;
  variant?: ButtonVariant;
  className?: string;
}) {
  const { pending } = useFormStatus();
  const spinner = (
    <Loader2 aria-hidden="true" className="size-4 animate-spin" />
  );
  return (
    <Button
      type="submit"
      variant={variant}
      className={cn("relative", className)}
      aria-busy={pending || undefined}
      data-pending={pending || undefined}
    >
      {icon ? (pending ? spinner : icon) : null}
      <span className={cn(!icon && pending && "invisible")}>{children}</span>
      {!icon && pending ? (
        <span className="absolute inset-0 flex items-center justify-center">
          {spinner}
        </span>
      ) : null}
    </Button>
  );
}
