import type { ButtonHTMLAttributes } from "react";
import { cn } from "./cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "line";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-brand-700 text-white hover:bg-brand-800 disabled:bg-slate-400",
  secondary:
    "border border-slate-300 bg-white text-slate-900 hover:bg-slate-100 disabled:text-slate-400",
  ghost: "text-brand-700 hover:bg-brand-50 disabled:text-slate-400",
  danger: "bg-red-700 text-white hover:bg-red-800 disabled:bg-slate-400",
  line: "bg-line text-white hover:brightness-95 disabled:bg-slate-400",
};

export function buttonClass(variant: ButtonVariant = "primary", extra?: string) {
  return cn(
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed",
    VARIANTS[variant],
    extra,
  );
}

export function Button({
  variant = "primary",
  className,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  // biome-ignore lint/a11y/useButtonType: type is always set via the default above
  return <button type={type} className={buttonClass(variant, className)} {...props} />;
}
