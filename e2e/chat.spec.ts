import { readFile } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { Client } from "pg";
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
  // Enter only starts a new line; the Send button sends.
  const box = hanako.getByLabel("Message", { exact: true });
  await box.fill("line one");
  await box.press("Enter");
  await box.pressSequentially("line two");
  await expect(box).toHaveValue("line one\nline two");
  await box.fill(hello);
  await hanako.getByRole("button", { name: "Send" }).click();
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
  // Tap a bubble for its actions (like LINE), then delete.
  await hanako.getByRole("button", { name: hello }).click();
  hanako.once("dialog", (d) => d.accept());
  await hanako
    .getByRole("button", { name: /^Delete Suzuki, Hanako's message/ })
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

test("1:1 talk between mutual followers, with 既読", async ({ browser }) => {
  const stamp = Date.now();
  const a = await createActiveGraduate(`Dm A${stamp}`, "1991-01-01");
  const b = await createActiveGraduate(`Dm B${stamp}`, "1991-02-02");
  const c = await createActiveGraduate(`Dm C${stamp}`, "1991-03-03");
  await sql(
    `INSERT INTO "Follow" (id, "followerId", "followeeId", status) VALUES
     ($1, $3, $4, 'ACCEPTED'), ($2, $4, $3, 'ACCEPTED')`,
    [`f1${stamp}`, `f2${stamp}`, a.id, b.id],
  );

  // A starts the talk from B's profile.
  const pa = await browser.newPage();
  await signInWithEmail(pa, a.email);
  await pa.goto(`/en/app/members/${c.id}`);
  await expect(pa.getByRole("button", { name: "Message" })).toHaveCount(0);
  await pa.goto(`/en/app/members/${b.id}`);
  await pa.getByRole("button", { name: "Message" }).click();
  await expect(pa).toHaveURL(/\/en\/app\/chat\/[^/]+$/);
  const talkUrl = pa.url();
  await expect(
    pa.getByRole("heading", { name: `B${stamp}, Dm` }),
  ).toBeVisible();
  const hi = `Hi B ${stamp}`;
  await pa.getByLabel("Message", { exact: true }).fill(hi);
  await pa.getByRole("button", { name: "Send" }).click();
  await expect(pa.getByText(hi)).toBeVisible();

  // B finds it under Friends, unread, and reads it; A then sees 既読.
  const pb = await browser.newPage();
  await signInWithEmail(pb, b.email);
  await pb.goto("/en/app/chat");
  await pb.getByText("Friends", { exact: true }).click();
  const row = pb.getByRole("link", { name: new RegExp(`^A${stamp}, Dm`) });
  await expect(row.getByText(hi)).toBeVisible();
  await expect(row.getByText(/unread$/)).toBeVisible();
  await row.click();
  await expect(pb.getByText(hi)).toBeVisible();
  await expect(pa.getByText("Read", { exact: true })).toBeVisible({
    timeout: 15_000,
  });

  // Admins can't open someone else's 1:1 talk.
  const admin = await browser.newPage();
  await signInWithEmail(admin, "admin@example.com");
  const res = await admin.goto(talkUrl);
  expect(res?.status()).toBe(404);

  // After a block, nobody can write any more.
  await sql(
    `INSERT INTO "Block" (id, "blockerId", "blockedId") VALUES ($1, $2, $3)`,
    [`b${stamp}`, b.id, a.id],
  );
  await pa.reload();
  await expect(
    pa.getByText("You can't exchange messages with this member."),
  ).toBeVisible();
  await expect(pa.getByLabel("Message", { exact: true })).toHaveCount(0);
});

test("mention a member with @ (and they're told)", async ({ browser }) => {
  const stamp = Date.now();
  const grad = await createActiveGraduate(`Men M${stamp}`, "1992-04-04");
  const other = await browser.newPage();
  await signInWithEmail(other, grad.email);
  await other.goto("/en/app/chat"); // joins the graduates' group

  const hanako = await browser.newPage();
  await signInWithEmail(hanako, "hanako@example.com");
  await hanako.goto("/en/app/chat");
  await hanako.getByRole("link", { name: GROUP }).click();
  const box = hanako.getByLabel("Message", { exact: true });
  await box.fill("Hello ");
  await box.pressSequentially(`@M${stamp}`);
  const picker = hanako.getByRole("listbox", { name: "Mention someone" });
  await picker
    .getByRole("option", { name: new RegExp(`M${stamp}, Men`) })
    .click();
  await expect(box).toHaveValue(`Hello @M${stamp}, Men `);
  // @all is offered in group chats.
  await box.pressSequentially("@al");
  await expect(picker.getByRole("option", { name: /^@?\s*all/ })).toBeVisible();
  await box.press("Escape");
  await box.fill(`Hello @M${stamp}, Men see you!`);
  await clearMailbox(grad.email);
  await hanako.getByRole("button", { name: "Send" }).click();
  await expect(
    hanako.getByText(`@M${stamp}, Men`, { exact: true }),
  ).toBeVisible();

  // The mentioned member sees it flagged in the list, and gets a notice.
  await other.goto("/en/app/chat");
  await expect(
    other.getByRole("link", { name: GROUP }).getByText("[Mentioned you]"),
  ).toBeVisible();
  const notice = await mail(grad.email);
  expect(notice).toMatch(/mentioned you|メンションしました/);
  expect(notice).toContain("/app/chat/");
  expect(notice).not.toContain("see you!");
});

async function sql(text: string, values: unknown[]) {
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  try {
    await db.query(text, values);
  } finally {
    await db.end();
  }
}
