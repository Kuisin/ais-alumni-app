import { readFile } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "@playwright/test";

// Messages (お知らせを送る) are switched off for now (src/lib/features.ts
// MESSAGES_ENABLED); announcements go out as ニュース. Re-enable with the flag.
test.skip(true, "Messages are switched off (MESSAGES_ENABLED = false)");

import { clearMailbox, resetBroadcasts, signInWithEmail } from "./helpers";

// Seeded demo members (SEED_DEMO=1): hanako (第5期), ken (第6期).
test("admin appoints a class representative who notifies their class", async ({
  browser,
}) => {
  await resetBroadcasts("hanako@example.com");
  const admin = await browser.newPage();
  await signInWithEmail(admin, "admin@example.com");
  await admin.goto("/en/app/admin/members?q=hanako");
  await admin
    .getByRole("link", { name: /Suzuki, Hanako/ })
    .first()
    .click();

  await expect(admin.getByRole("heading", { name: "Positions" })).toBeVisible();
  // Start from no position so repeated runs behave the same.
  const leader = admin
    .locator("div.rounded-lg", { hasText: "Class representative" })
    .filter({ has: admin.getByRole("button") });
  const remove = leader.getByRole("button", { name: "Remove", exact: true });
  if (await remove.isVisible()) {
    await remove.click();
    await expect(leader.getByText("Position removed.")).toBeVisible();
  }

  const member = await browser.newPage();
  await signInWithEmail(member, "hanako@example.com");
  // No position yet: no admin mode, and the send page sends them home.
  await member.goto("/en/app/notify");
  await expect(member).toHaveURL(/\/en\/app\/dashboard/);
  await expect(member.getByRole("link", { name: "Admin mode" })).toHaveCount(0);

  // Represent 第6期 (ken's class) for this test.
  await leader
    .getByLabel("Class", { exact: true })
    .selectOption({ label: "Class 6 (graduated 2017)" });
  await leader.getByRole("button", { name: "Assign" }).click();
  await expect(
    leader.getByText("Assigned · Class 6 (graduated 2017)"),
  ).toBeVisible();

  // The position unlocks admin mode with just the send page.
  await member.goto("/en/app/dashboard");
  await member.getByRole("link", { name: "Admin mode" }).first().click();
  await expect(member).toHaveURL(/\/en\/app\/admin\/notify/);
  const adminNav = member.getByRole("navigation", { name: "Admin menu" });
  await expect(adminNav.getByRole("link")).toHaveCount(1);
  await expect(
    member.getByRole("combobox", { name: "Class", exact: true }),
  ).toContainText("Class 6");
  const title = `Class reunion ${Date.now()}`;
  await member.getByLabel("Title").fill(title);
  await member.getByLabel("Message").fill("Let's meet in December!");
  await member.getByRole("button", { name: "Check recipients" }).click();
  await expect(member.getByText(/This will reach 1 members/)).toBeVisible();

  await clearMailbox("ken@example.com");
  await member.getByRole("button", { name: "Send to 1 members" }).click();
  await expect(member.getByText(/Sent to 1 members/)).toBeVisible();

  const mail = await readFile(
    path.join(process.cwd(), ".data", "dev-mail", "ken@example.com.txt"),
    "utf8",
  );
  // The notification carries no content: no title or body, only who it's
  // from and a link to read it in the app.
  expect(mail).not.toContain(title);
  expect(mail).not.toContain("Let's meet in December!");
  expect(mail).toMatch(/Class representative|学年代表/);
  const link = mail.match(/https?:\/\/\S*\/app\/news\/messages\/\S+/)?.[0];
  expect(link).toBeTruthy();

  // Ken reads it in the app.
  const ken = await browser.newPage();
  await signInWithEmail(ken, "ken@example.com");
  // Listed in the app, unread until opened.
  await ken.goto("/en/app/news?tab=messages");
  const row = ken.getByRole("link", { name: new RegExp(title) });
  await expect(row).toContainText("Unread");
  await ken.goto(new URL(link as string).pathname);
  await expect(ken.getByRole("heading", { name: title })).toBeVisible();
  await expect(ken.getByText("Let's meet in December!")).toBeVisible();

  await ken.goto("/en/app/news?tab=messages");
  await expect(
    ken.getByRole("link", { name: new RegExp(title) }),
  ).not.toContainText("Unread");

  // The sender sees the read receipt.
  await member.goto("/en/app/admin/notify");
  await expect(member.getByText(/Read 1 \/ 1/).first()).toBeVisible();

  // Managing it after sending: edit, archive, restore, delete.
  await member
    .getByRole("link", { name: new RegExp(title) })
    .first()
    .click();
  await member.getByRole("button", { name: "Edit" }).click();
  const edited = `${title} (updated)`;
  await member.getByLabel("Title").fill(edited);
  await member.getByRole("button", { name: "Save" }).click();
  await expect(member.getByText(/^Saved\./)).toBeVisible();
  await ken.goto("/en/app/news?tab=messages");
  const editedRow = ken.getByRole("link", {
    name: new RegExp(edited.replace(/[()]/g, "\\$&")),
  });
  await expect(editedRow).toContainText("Edited");

  await member.getByRole("button", { name: "Archive" }).click();
  await expect(member.getByText("Archived").first()).toBeVisible();
  await ken.reload();
  await expect(editedRow).toHaveCount(0);

  await member.getByRole("button", { name: "Restore" }).click();
  await ken.reload();
  await expect(editedRow).toHaveCount(1);

  member.once("dialog", (d) => d.accept());
  await member.getByRole("button", { name: "Delete" }).click();
  await expect(member).toHaveURL(/\/en\/app\/admin\/notify$/);
  await ken.reload();
  await expect(editedRow).toHaveCount(0);
});
