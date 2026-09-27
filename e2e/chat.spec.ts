import { readFile } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { clearMailbox, createActiveGraduate, signInWithEmail } from "./helpers";

const mail = (email: string) =>
  readFile(
    path.join(process.cwd(), ".data", "dev-mail", `${email}.txt`),
    "utf8",
  ).catch(() => "");

const GROUP = /^Graduates \+ former students/;

test("graduates are put in their group chat and can talk", async ({
  browser,
}) => {
  const stamp = Date.now();
  const grad = await createActiveGraduate(`Chat G${stamp}`, "1990-03-03");
  // Joining happens automatically (here: on first visit); nothing from
  // before joining counts as unread.
  const other = await browser.newPage();
  await signInWithEmail(other, grad.email);
  await other.goto("/en/app/chat");
  await expect(other.getByRole("link", { name: GROUP })).toBeVisible();

  // Hanako (a graduate) finds the group already there and writes.
  const hanako = await browser.newPage();
  await signInWithEmail(hanako, "hanako@example.com");
  await hanako.goto("/en/app/chat");
  await hanako.getByRole("link", { name: GROUP }).click();
  await expect(
    hanako.getByRole("heading", { name: "Graduates + former students" }),
  ).toBeVisible();
  const hello = `Hello from Hanako ${stamp}`;
  await hanako.getByLabel("Message", { exact: true }).fill(hello);
  await hanako.getByLabel("Message", { exact: true }).press("Enter");
  await expect(hanako.getByText(hello)).toBeVisible();
  await expect(hanako.getByLabel("Message", { exact: true })).toHaveValue("");

  // The new graduate sees it as unread, with the unread line, and replies.
  await other.reload();
  const row = other.getByRole("link", { name: GROUP });
  await expect(row.getByText(/unread$/)).toBeVisible();
  await row.click();
  await expect(other.getByText(hello)).toBeVisible();
  const reply = `Hi Hanako ${stamp}`;
  await other.getByLabel("Message", { exact: true }).fill(reply);
  await other.getByRole("button", { name: "Send" }).click();
  await expect(other.getByText(reply)).toBeVisible();

  // Hanako's open room picks the reply up (polling without Realtime).
  await expect(hanako.getByText(reply)).toBeVisible({ timeout: 15_000 });

  // Authors can delete their messages.
  hanako.once("dialog", (d) => d.accept());
  await hanako
    .getByRole("button", { name: /^Delete Suzuki, Hanako's message/ })
    .last()
    .click();
  await expect(hanako.getByText(hello)).toHaveCount(0);
  await expect(
    hanako.getByText("This message was deleted").last(),
  ).toBeVisible();

  // Daily digest: unread messages → one email with a link, no content.
  await other.close();
  const late = `Evening news ${stamp}`;
  await hanako.getByLabel("Message", { exact: true }).fill(late);
  await hanako.getByRole("button", { name: "Send" }).click();
  await expect(hanako.getByText(late)).toBeVisible();
  await clearMailbox(grad.email);
  const res = await hanako.request.get("/api/cron/chat-digest", {
    headers: { Authorization: "Bearer e2e-cron-secret" },
  });
  expect(res.ok()).toBe(true);
  const digest = await mail(grad.email);
  expect(digest).toContain("https://ais.kai-lab.net/");
  expect(digest).toContain("/app/chat");
  expect(digest).not.toContain(late);
});
