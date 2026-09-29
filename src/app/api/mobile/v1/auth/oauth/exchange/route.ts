import { z } from "zod";
import { db } from "@/lib/db";
import type { SessionResult } from "@/lib/mobile/contract/core";
import { redeemHandoffCode } from "@/lib/mobile/handoff";
import {
  ApiError,
  DeviceSchema,
  publicRoute,
  readJson,
} from "@/lib/mobile/http";
import { meFor } from "@/lib/mobile/me";
import { createMobileSession, HandoffReplayError } from "@/lib/mobile/tokens";

const Body = z.object({
  code: z.string().max(1000),
  verifier: z.string().max(128),
  device: DeviceSchema,
});

/**
 * Google / LINE sign-in, step 3: the app trades the code for a session.
 * A code works once; using it again also ends the session it started.
 */
export const POST = publicRoute(async (request): Promise<SessionResult> => {
  const body = await readJson(request, Body);
  const redeemed = redeemHandoffCode(body.code, body.verifier);
  if (!redeemed) throw new ApiError(400, "invalid_code");
  const user = await db.user.findUnique({
    where: { id: redeemed.userId },
    include: { roles: true },
  });
  if (!user) throw new ApiError(400, "invalid_code");
  let token: string;
  try {
    token = await createMobileSession(user.id, body.device, redeemed.jti);
  } catch (e) {
    if (e instanceof HandoffReplayError)
      throw new ApiError(400, "invalid_code");
    throw e;
  }
  return { token, me: await meFor(user) };
});
