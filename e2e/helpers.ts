import { readFile, rm } from "node:fs/promises";
import path from "node:path";
import { expect, type Page } from "@playwright/test";
import { Client } from "pg";

const MAILBOX = path.join(process.cwd(), ".data", "dev-mail");

export function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e4)}@example.com`;
}

/** Read the latest 6-digit code from the dev mailbox (EMAIL_DEV_MAILBOX=1). */
export async function readCode(email: string): Promise<string> {
  const file = path.join(MAILBOX, `${email}.txt`);
  for (let i = 0; i < 50; i++) {
    try {
      const body = await readFile(file, "utf8");
      const m = body.match(/\b(\d{6})\b/);
      if (m) return m[1];
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`No code emailed to ${email}`);
}

export async function clearMailbox(email: string): Promise<void> {
  await rm(path.join(MAILBOX, `${email}.txt`), { force: true });
}

/**
 * Forget earlier codes for a test address so repeated runs aren't blocked by
 * the sign-in code rate limit (5/hour, 30 s cooldown). Test database only.
 */
async function resetCodes(email: string): Promise<void> {
  if (!email.endsWith("@example.com")) return;
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  try {
    await db.query('DELETE FROM "OtpCode" WHERE email = $1', [email]);
  } finally {
    await db.end();
  }
}

/** Forget a test member's sent notifications so the send limit doesn't block reruns. */
export async function resetBroadcasts(email: string): Promise<void> {
  if (!email.endsWith("@example.com")) return;
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  try {
    await db.query(
      'DELETE FROM "Broadcast" WHERE "senderId" IN (SELECT id FROM "User" WHERE "primaryEmail" = $1)',
      [email],
    );
  } finally {
    await db.end();
  }
}

/** Email-code sign-in from the English sign-in page (/en/app). */
export async function signInWithEmail(
  page: Page,
  email: string,
): Promise<void> {
  await clearMailbox(email);
  await resetCodes(email);
  await page.goto("/en/app");
  await page.getByLabel("Email address").fill(email);
  await page.getByRole("button", { name: "Email me a sign-in code" }).click();
  const code = await readCode(email);
  await page.getByLabel("6-digit code").fill(code);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).not.toHaveURL(/\/en\/app$/);
}

/** Insert an approved member with no roles (for tests that change roles). */
export async function createActiveMember(nameRomaji: string): Promise<string> {
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  try {
    const id = `e2e${Date.now()}${Math.floor(Math.random() * 1e4)}`;
    const [first, last] = nameRomaji.split(" ");
    await db.query(
      `INSERT INTO "User" (id, "primaryEmail", state, "nameRomaji", "firstNameRomaji", "lastNameRomaji", "updatedAt")
       VALUES ($1, $2, 'ACTIVE', $3, $4, $5, now())`,
      [id, uniqueEmail("e2e-member"), nameRomaji, first, last],
    );
    return id;
  } finally {
    await db.end();
  }
}
