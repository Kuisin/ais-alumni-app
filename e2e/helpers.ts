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
async function resetCodes(email: string, locale?: string): Promise<void> {
  if (!email.endsWith("@example.com")) return;
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  try {
    await db.query('DELETE FROM "OtpCode" WHERE email = $1', [email]);
    // Members see the app in their saved language: use the page's.
    if (locale)
      await db.query(
        'UPDATE "User" SET locale = $2::"Locale" WHERE "primaryEmail" = $1',
        [email, locale],
      );
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

/**
 * Email-code sign-in from the English sign-in page (/en/app), or from
 * where `from` (a signed-out page) sends us.
 */
export async function signInWithEmail(
  page: Page,
  email: string,
  from = "/en/app",
): Promise<void> {
  await clearMailbox(email);
  const locale = /^(?:https?:\/\/[^/]+)?\/(ja|en)\//.exec(from)?.[1];
  await resetCodes(email, locale);
  await page.goto(from);
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
      [id, uniqueEmail("e2e-member"), asListed(nameRomaji), first, last],
    );
    return id;
  } finally {
    await db.end();
  }
}

/** Insert an approved graduate with a birth date and their own sign-in email. */
export async function createActiveGraduate(
  nameRomaji: string,
  dateOfBirth: string,
): Promise<{ id: string; email: string }> {
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  try {
    const id = `e2e${Date.now()}${Math.floor(Math.random() * 1e4)}`;
    const email = uniqueEmail("e2e-grad");
    const [first, last] = nameRomaji.split(" ");
    await db.query(
      `INSERT INTO "User" (id, "primaryEmail", "emailVerifiedAt", state, "nameRomaji", "firstNameRomaji", "lastNameRomaji", "dateOfBirth", "updatedAt")
       VALUES ($1, $2, now(), 'ACTIVE', $3, $4, $5, $6, now())`,
      [id, email, asListed(nameRomaji), first, last, dateOfBirth],
    );
    await db.query(
      `INSERT INTO "UserRole" (id, "userId", role, "didGraduate") VALUES ($1, $2, 'FORMER_STUDENT', true)`,
      [`${id}r`, id],
    );
    return { id, email };
  } finally {
    await db.end();
  }
}

/** "First Last" → how the app lists it: "Last, First". */
export function asListed(firstLast: string): string {
  const [first, ...rest] = firstLast.split(" ");
  return rest.length ? `${rest.join(" ")}, ${first}` : first;
}

/** The first app link in the latest email to this address (dev mailbox). */
export async function readLink(
  email: string,
  pathPart: string,
): Promise<string> {
  const file = path.join(MAILBOX, `${email}.txt`);
  for (let i = 0; i < 50; i++) {
    try {
      const body = await readFile(file, "utf8");
      const m = body.match(new RegExp(`https?://\\S*${pathPart}\\S*`));
      if (m) return new URL(m[0]).pathname;
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`No ${pathPart} link emailed to ${email}`);
}

/**
 * The page a notification email leads to: finds the member's short
 * /n/<code>/<token> link (always ais.kai-lab.net) and opens it here without
 * redirecting (which records the member's read receipt).
 */
export async function notificationTarget(
  request: import("@playwright/test").APIRequestContext,
  mailText: string,
): Promise<{ code: string; token: string; target: string }> {
  const m = mailText.match(
    /https:\/\/ais\.kai-lab\.net\/n\/([0-9A-Za-z]{6})\/([0-9A-Za-z]{8})/,
  );
  if (!m) throw new Error("No notification link in the email");
  const res = await request.get(`/n/${m[1]}/${m[2]}`, { maxRedirects: 0 });
  const location = res.headers().location ?? "";
  return {
    code: m[1],
    token: m[2],
    target: new URL(location, "http://x").pathname,
  };
}
