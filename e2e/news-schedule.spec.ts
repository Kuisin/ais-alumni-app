import { readFile } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { Client } from "pg";
import { clearMailbox, notificationTarget, signInWithEmail } from "./helpers";

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
  await page.goto("/en/app/news/new");
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

  const res = await page.request.get("/api/cron?task=publish-news", {
    headers: { Authorization: "Bearer e2e-cron-secret" },
  });
  expect(res.ok()).toBe(true);
  expect((await res.json()).posts).toBeGreaterThanOrEqual(1);

  // A graduate got a notification with a production link and no content…
  const hanako = await mail("hanako@example.com");
  // …through a short link that opens the post…
  const { code, token, target } = await notificationTarget(
    page.request,
    hanako,
  );
  expect(target).toMatch(new RegExp(`^/(ja|en)/app/news/${postId}$`));
  // …and gives link previews a card (no sign-in, no content)…
  const preview = await page.request.get(`/n/${code}/${token}`, {
    headers: { "User-Agent": "facebookexternalhit/1.1;line-poker/1.0" },
    maxRedirects: 0,
  });
  const html = await preview.text();
  expect(html).toContain('property="og:image"');
  // Never cached, and a person who gets it anyway is sent on (?go=1).
  expect(preview.headers()["cache-control"]).toContain("no-store");
  expect(html).toContain("location.replace(");
  const onward = await page.request.get(`/n/${code}/${token}?go=1`, {
    headers: { "User-Agent": "facebookexternalhit/1.1;line-poker/1.0" },
    maxRedirects: 0,
  });
  expect(onward.status()).toBe(302);
  expect(onward.headers().location).toContain(`/app/news/${postId}`);
  expect(html).not.toContain("Secret body text");
  const card = await page.request.get(`/n/${token}/og`);
  expect(card.headers()["content-type"]).toContain("image/png");
  // …and her open (not the preview's) is her read receipt.
  const rdb = new Client({ connectionString: process.env.DATABASE_URL });
  await rdb.connect();
  const receipt = await rdb.query(
    `SELECT r."openedAt", r.opens, r.channels FROM "NotificationReceipt" r
       JOIN "NotificationLink" l ON l.id = r."linkId"
       JOIN "User" u ON u.id = r."userId"
     WHERE l.token = $1 AND u."primaryEmail" = 'hanako@example.com'`,
    [token],
  );
  // The preview follows her current language, not the one at sending.
  const ogTitle = async () =>
    (
      await (
        await page.request.get(`/n/${code}/${token}`, {
          headers: { "User-Agent": "facebookexternalhit/1.1" },
          maxRedirects: 0,
        })
      ).text()
    ).match(/og:title" content="([^"]+)"/)?.[1];
  const setLocale = (l: string) =>
    rdb.query(`UPDATE "User" SET locale = $1 WHERE "linkCode" = $2`, [l, code]);
  await setLocale("en");
  expect(await ogTitle()).toBe("New news from the committee");
  await setLocale("ja");
  expect(await ogTitle()).toBe("新しいニュースがあります");
  await rdb.end();
  expect(receipt.rows[0].openedAt).not.toBeNull();
  expect(receipt.rows[0].opens).toBeGreaterThanOrEqual(1);
  await page.goto(`/en/app/admin/news/${postId}`);
  await expect(
    page.getByRole("heading", { name: "Notification opens" }),
  ).toBeVisible();
  expect(hanako).not.toContain("Secret body text");
  expect(hanako).not.toContain(title);
  // …the admin (a current teacher, not a graduate) did not.
  expect(await mail("admin@example.com")).not.toContain(postId);

  // Calling again doesn't send twice.
  const again = await page.request.get("/api/cron?task=publish-news", {
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
