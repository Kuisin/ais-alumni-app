import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { cn } from "./cn";

const CONTROL =
  "block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 placeholder:text-slate-400 aria-[invalid=true]:border-red-600 disabled:bg-slate-100";

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(CONTROL, "min-h-11", className)} {...props} />;
}

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(CONTROL, className)} rows={4} {...props} />;
}

export function Select({
  className,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(CONTROL, "min-h-11", className)} {...props} />;
}

/**
 * Label + control + hint + error, wired with ids for screen readers.
 * Pass the control as a render prop so it receives the aria attributes.
 */
export function Field({
  id,
  label,
  hint,
  error,
  required,
  children,
}: {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: string | string[] | null;
  required?: boolean;
  children: (aria: {
    id: string;
    "aria-invalid"?: boolean;
    "aria-describedby"?: string;
    required?: boolean;
  }) => ReactNode;
}) {
  const errorText = Array.isArray(error) ? error[0] : error;
  const describedBy =
    [hint ? `${id}-hint` : null, errorText ? `${id}-error` : null]
      .filter(Boolean)
      .join(" ") || undefined;
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-medium text-slate-800">
        {label}
        {required ? (
          <span className="ml-1 text-red-700" aria-hidden="true">
            *
          </span>
        ) : null}
      </label>
      {children({
        id,
        "aria-invalid": errorText ? true : undefined,
        "aria-describedby": describedBy,
        required,
      })}
      {hint ? (
        <p id={`${id}-hint`} className="text-sm text-slate-600">
          {hint}
        </p>
      ) : null}
      {errorText ? (
        <p id={`${id}-error`} className="text-sm text-red-700">
          {errorText}
        </p>
      ) : null}
    </div>
  );
}
