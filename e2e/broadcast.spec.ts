import { readFile } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "@playwright/test";
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
    .getByRole("link", { name: /Hanako Suzuki/ })
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
  const before = await member.goto("/en/app/notify");
  expect(before?.status()).toBe(404);

  // Represent 第6期 (ken's class) for this test.
  await leader
    .getByLabel("学年 (class)")
    .selectOption({ label: "Class 6 (graduated 2017)" });
  await leader.getByRole("button", { name: "Assign" }).click();
  await expect(
    leader.getByText("Assigned · Class 6 (graduated 2017)"),
  ).toBeVisible();

  await member.goto("/en/app/notify");
  await expect(
    member.getByRole("combobox", { name: "学年 (class)" }),
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
  expect(mail).toContain(title);
  // Signed with the sender's position in the recipient's language.
  expect(mail).toMatch(/Class representative|学年代表/);
});
