import { readFile } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { Client } from "pg";
import { clearMailbox, signInWithEmail } from "./helpers";

const mail = (email: string) =>
  readFile(
    path.join(process.cwd(), ".data", "dev-mail", `${email}.txt`),
    "utf8",
  ).catch(() => "");

test("reserved news is sent when due, only to the chosen audience", async ({
  page,
}) => {
  const title = `Reserved ${Date.now()}`;
  const sendAt = new Date(Date.now() + 9 * 3600_000 + 2 * 3600_000)
    .toISOString()
    .slice(0, 16);
  await signInWithEmail(page, "admin@example.com");
  await page.goto("/en/app/admin/news/new");
  await page.getByLabel("Title (Japanese)").fill(title);
  await page.getByLabel("Body (Japanese)").fill("Secret body text");
  await page
    .getByRole("radio", { name: /^Schedule for a date and time/ })
    .check();
  await page.getByLabel(/^Send at \(JST\)/).fill(sendAt);
  await page.getByRole("radio", { name: /^Choose conditions/ }).check();
  await page.getByRole("checkbox", { name: /^Graduate(?!s)/ }).check();
  await page.getByRole("button", { name: "Schedule", exact: true }).click();
  await expect(page.getByText("The post has been saved.")).toBeVisible();
  const postId = page.url().match(/news\/([^/?]+)/)?.[1] as string;

  // Pretend the reserved time has come.
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  await db.query(
    `UPDATE "NewsPost" SET "publishedAt" = now() - interval '1 minute', "updatedAt" = now() - interval '1 hour' WHERE id = $1`,
    [postId],
  );
  await db.end();
  for (const e of ["hanako@example.com", "admin@example.com"])
    await clearMailbox(e);

  const res = await page.request.get("/api/cron/publish-news", {
    headers: { Authorization: "Bearer e2e-cron-secret" },
  });
  expect(res.ok()).toBe(true);
  expect((await res.json()).posts).toBeGreaterThanOrEqual(1);

  // A graduate got a notification with a production link and no content…
  const hanako = await mail("hanako@example.com");
  expect(hanako).toContain(`https://ais.kai-lab.net/`);
  expect(hanako).toContain(`/app/news/${postId}`);
  expect(hanako).not.toContain("Secret body text");
  expect(hanako).not.toContain(title);
  // …the admin (a current teacher, not a graduate) did not.
  expect(await mail("admin@example.com")).not.toContain(postId);

  // Calling again doesn't send twice.
  const again = await page.request.get("/api/cron/publish-news", {
    headers: { Authorization: "Bearer e2e-cron-secret" },
  });
  expect((await again.json()).posts).toBe(0);

  // Clean up.
  await page.goto(`/en/app/admin/news/${postId}`);
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: /Delete/ }).click();
  await expect(page).toHaveURL(/\/en\/app\/admin\/news(\?|$)/);
});
