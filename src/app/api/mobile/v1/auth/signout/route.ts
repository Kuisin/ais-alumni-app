import { headers } from "next/headers";
import { json } from "@/lib/mobile/http";
import { bearerToken, revokeMobileSession } from "@/lib/mobile/tokens";

/** Sign this device out (idempotent). */
export async function POST() {
  const token = bearerToken((await headers()).get("authorization"));
  if (token) await revokeMobileSession(token);
  return json({ ok: true });
}
