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
import { createMobileSession } from "@/lib/mobile/tokens";

const Body = z.object({
  code: z.string().max(1000),
  verifier: z.string().max(128),
  device: DeviceSchema,
});

/** Google / LINE sign-in, step 3: the app trades the code for a session. */
export const POST = publicRoute(async (request): Promise<SessionResult> => {
  const body = await readJson(request, Body);
  const userId = redeemHandoffCode(body.code, body.verifier);
  if (!userId) throw new ApiError(400, "invalid_code");
  const user = await db.user.findUnique({
    where: { id: userId },
    include: { roles: true },
  });
  if (!user) throw new ApiError(400, "invalid_code");
  const token = await createMobileSession(user.id, body.device);
  return { token, me: await meFor(user) };
});
