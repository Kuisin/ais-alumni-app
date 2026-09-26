import { Alert } from "@/components/ui/card";

export function AdminFormResult({
  state,
}: {
  state: { ok?: boolean; message?: string; error?: string };
}) {
  if (state.error) return <Alert tone="error">{state.error}</Alert>;
  if (state.ok && state.message)
    return <Alert tone="success">{state.message}</Alert>;
  return null;
}
