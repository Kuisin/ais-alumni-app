import type { ReactNode } from "react";
import { cn } from "@/components/ui/cn";

export type SignalTone = "green" | "blue" | "amber" | "red" | "dim";

const TONES: Record<SignalTone, string> = {
  green: "bg-green-50 text-green-800 ring-green-200",
  blue: "bg-sky-50 text-sky-800 ring-sky-200",
  amber: "bg-amber-50 text-amber-900 ring-amber-200",
  red: "bg-red-50 text-red-800 ring-red-200",
  dim: "bg-transparent text-slate-400 ring-slate-200",
};

/**
 * Small review signal chip: positive signals in color, empty or negative
 * ones dimmed so the eye lands on what matters.
 */
export function Signal({
  tone,
  icon,
  children,
}: {
  tone: SignalTone;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset [&_svg]:size-3.5",
        TONES[tone],
      )}
    >
      {icon ? <span aria-hidden="true">{icon}</span> : null}
      {children}
    </span>
  );
}
