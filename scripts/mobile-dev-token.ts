/**
 * Local development only: print a native-app session token for a member of
 * the LOCAL database, for testing the mobile API with curl or the app's web
 * build without going through email codes (which are rate-limited).
 *   pnpm exec tsx --env-file=.env scripts/mobile-dev-token.ts hanako@example.com
 */

import { createHash, randomBytes } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const url = process.env.DATABASE_URL ?? "";
const host = (() => {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
})();
if (!["localhost", "127.0.0.1", "::1"].includes(host)) {
  console.error("Refusing: DATABASE_URL is not a local database.");
  process.exit(1);
}

const email = process.argv[2]?.trim().toLowerCase();
if (!email) {
  console.error("Usage: mobile-dev-token.ts <email>");
  process.exit(1);
}

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: url }),
});

async function main() {
  const user = await db.user.findUnique({ where: { primaryEmail: email } });
  if (!user) {
    console.error(`No member with email ${email}`);
    process.exit(1);
  }
  // Same format and hashing as src/lib/mobile/tokens.ts.
  const token = `aism_${randomBytes(32).toString("base64url")}`;
  await db.mobileSession.create({
    data: {
      userId: user.id,
      tokenHash: createHash("sha256").update(token).digest("base64url"),
      platform: "dev",
      deviceName: "mobile-dev-token",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });
  await db.$disconnect();
  console.log(token);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
