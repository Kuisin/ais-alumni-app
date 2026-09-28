import { readFile } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { clearMailbox, notificationTarget, signInWithEmail } from "./helpers";

const mail = (email: string) =>
  readFile(
    path.join(process.cwd(), ".data", "dev-mail", `${email}.txt`),
    "utf8",
  ).catch(() => "");

/** datetime-local value in JST, `hours` from now. */
const jstIn = (hours: number) =>
  new Date(Date.now() + (9 + hours) * 3600_000).toISOString().slice(0, 16);

test("ニュース hub: confirm, poll, 日程調整, files, comments and a reminder", async ({
  browser,
}) => {
  const title = `Hub ${Date.now()}`;
  const admin = await browser.newPage();
  await signInWithEmail(admin, "admin@example.com");
  await admin.goto("/en/app/admin/news/new");
  await admin.getByLabel("Title (Japanese)").fill(title);
  await admin.getByLabel("Body (Japanese)").fill("Please answer.");
  await admin.getByRole("radio", { name: /^Send now/ }).check();
  await admin
    .getByRole("checkbox", { name: /^Notify by LINE and email/ })
    .uncheck();

  // Attachment, confirm button, deadline, poll and scheduling.
  await admin.getByLabel("Add files").setInputFiles({
    name: "guide.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4\n%%EOF\n"),
  });
  await expect(admin.getByText("guide.pdf")).toBeVisible();
  await admin
    .getByRole("checkbox", { name: /^Show a “Got it” button/ })
    .check();
  await admin.getByLabel("Respond by (Japan time)").fill(jstIn(12));
  await admin.getByRole("button", { name: "Add a poll" }).click();
  await admin
    .getByRole("textbox", { name: "Question", exact: true })
    .fill("Lunch?");
  await admin.getByRole("textbox", { name: "Choice 1" }).fill("Sushi");
  await admin.getByRole("textbox", { name: "Choice 2" }).fill("Ramen");
  await admin.getByRole("button", { name: "Add scheduling" }).click();
  await admin.getByLabel("Option 1 (Japan time)").fill(jstIn(48));
  await admin.getByRole("button", { name: "Add a date" }).click();
  await admin.getByLabel("Option 2 (Japan time)").fill(jstIn(72));
  await admin.getByRole("button", { name: "Publish now" }).click();
  await expect(admin).toHaveURL(/\/en\/app\/admin\/news\/[^/?]+\?created=1/);
  const postId = admin.url().match(/news\/([^/?]+)/)?.[1] as string;

  // Hanako answers everything.
  const hanako = await browser.newPage();
  await signInWithEmail(hanako, "hanako@example.com");
  await hanako.goto("/en/app/news");
  await expect(
    hanako
      .getByRole("listitem")
      .filter({ hasText: title })
      .getByText("Response needed"),
  ).toBeVisible();
  await hanako.goto(`/en/app/news/${postId}`);
  await expect(hanako.getByText(/^Respond by /)).toBeVisible();
  await expect(hanako.getByRole("link", { name: /guide\.pdf/ })).toBeVisible();
  await hanako.getByRole("button", { name: "Got it" }).click();
  await expect(hanako.getByText(/^Confirmed \(/)).toBeVisible();
  await hanako.getByRole("radio", { name: "Ramen" }).check();
  await hanako.getByRole("button", { name: "Vote" }).click();
  await expect(hanako.getByText("1 vote")).toBeVisible();
  const dates = hanako.getByRole("group", { name: /^Answer for / });
  await dates.nth(0).getByText("Can attend").click();
  await dates.nth(1).getByText("Can't attend").click();
  await hanako.getByRole("button", { name: "Send", exact: true }).click();
  await expect(hanako.getByText("Your answers have been saved.")).toBeVisible();
  await hanako.getByRole("button", { name: /^👍/ }).click();
  await expect(hanako.getByRole("button", { name: /^👍/ })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await hanako.getByLabel("Write a comment").fill("Looking forward!");
  await hanako.getByRole("button", { name: "Post", exact: true }).click();
  await expect(hanako.getByText("Looking forward!")).toBeVisible();
  await hanako.goto("/en/app/news");
  await expect(
    hanako
      .getByRole("listitem")
      .filter({ hasText: title })
      .getByText("Response needed"),
  ).toHaveCount(0);
  await hanako.goto(`/en/app/news/${postId}`);

  // The admin sees the responses and hides the comment.
  await admin.goto(`/en/app/admin/news/${postId}`);
  const card = admin.locator("section", {
    has: admin.getByRole("heading", { name: "Responses" }),
  });
  await expect(card.getByText(/^Responded 1 \//)).toBeVisible();
  await expect(card.getByText(/^Confirmed（1）/)).toBeVisible();
  await admin.goto(`/en/app/news/${postId}`);
  await admin.getByRole("button", { name: "Hide" }).click();
  await expect(
    admin.getByText("Hidden (visible to admins only)"),
  ).toBeVisible();
  await hanako.reload();
  await expect(hanako.getByText("Looking forward!")).toHaveCount(0);

  // One reminder, only to those who haven't answered.
  for (const e of ["hanako@example.com", "admin@example.com"])
    await clearMailbox(e);
  const res = await admin.request.get("/api/cron?task=publish-news", {
    headers: { Authorization: "Bearer e2e-cron-secret" },
  });
  expect((await res.json()).reminders.posts).toBeGreaterThanOrEqual(1);
  expect(await mail("hanako@example.com")).not.toContain(postId);
  expect(
    (await notificationTarget(admin.request, await mail("admin@example.com")))
      .target,
  ).toMatch(new RegExp(`^/(ja|en)/app/news/${postId}$`));

  // Clean up.
  await admin.goto(`/en/app/admin/news/${postId}`);
  await admin.getByRole("button", { name: "Edit", exact: true }).click();
  admin.once("dialog", (d) => d.accept());
  await admin.getByRole("button", { name: /Delete/ }).click();
  await expect(admin).toHaveURL(/\/en\/app\/admin\/news(\?|$)/);
});
