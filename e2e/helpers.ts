import { readFile, rm } from "node:fs/promises";
import path from "node:path";
import { expect, type Page } from "@playwright/test";

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

/** Email-code sign-in from the English sign-in page (/en/app). */
export async function signInWithEmail(
  page: Page,
  email: string,
): Promise<void> {
  await clearMailbox(email);
  await page.goto("/en/app");
  await page.getByLabel("Email address").fill(email);
  await page.getByRole("button", { name: "Email me a sign-in code" }).click();
  const code = await readCode(email);
  await page.getByLabel("6-digit code").fill(code);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).not.toHaveURL(/\/en\/app$/);
}
