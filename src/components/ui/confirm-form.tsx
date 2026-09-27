"use client";

import type { ComponentProps } from "react";

/**
 * A server-action form that asks first (browser confirmation), for removing
 * or declining things that can't be undone in one tap. Its SubmitButton
 * disables itself while the action runs.
 */
export function ConfirmForm({
  message,
  onSubmit,
  ...props
}: ComponentProps<"form"> & { message: string }) {
  return (
    <form
      {...props}
      onSubmit={(e) => {
        if (!window.confirm(message)) {
          e.preventDefault();
          return;
        }
        onSubmit?.(e);
      }}
    />
  );
}
