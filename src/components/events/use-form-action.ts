"use client";

import { type FormEvent, startTransition, useActionState } from "react";

/**
 * useActionState wrapper that submits via onSubmit instead of the form
 * `action` prop, so React does not reset the fields when validation fails.
 * The clicked submit button's name/value is included (FormData submitter).
 */
export function useFormAction<S>(
  action: (prev: Awaited<S>, fd: FormData) => Promise<S>,
  initial: Awaited<S>,
) {
  const [state, dispatch, pending] = useActionState<S, FormData>(
    action,
    initial,
  );
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const submitter = (e.nativeEvent as SubmitEvent).submitter;
    const fd = new FormData(e.currentTarget, submitter);
    startTransition(() => dispatch(fd));
  };
  return { state, pending, onSubmit };
}
