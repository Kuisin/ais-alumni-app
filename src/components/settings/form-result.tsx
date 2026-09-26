import { Alert } from "@/components/ui/card";

/** Success / error line under a settings form (announced to screen readers). */
export function FormResult({
  state,
}: {
  state: { ok?: boolean; message?: string; error?: string };
}) {
  if (state.error) return <Alert tone="error">{state.error}</Alert>;
  if (state.message)
    return <Alert tone={state.ok ? "success" : "info"}>{state.message}</Alert>;
  return null;
}
