import { readFile } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { Client } from "pg";
import {
  clearMailbox,
  createActiveGraduate,
  notificationTarget,
  signInWithEmail,
} from "./helpers";

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
  const res = await hanako.request.get("/api/cron?task=chat-digest", {
    headers: { Authorization: "Bearer e2e-cron-secret" },
  });
  expect(res.ok()).toBe(true);
  const digest = await mail(grad.email);
  expect((await notificationTarget(hanako.request, digest)).target).toMatch(
    /^\/(ja|en)\/app\/chat$/,
  );
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
  // The page streams behind its loading skeleton, so notFound() arrives as
  // the not-found screen (noindex) rather than a 404 status.
  await admin.goto(talkUrl);
  await expect(
    admin.getByRole("heading", { name: "Page not found" }),
  ).toBeVisible();
  await expect(admin.getByText(hi)).toHaveCount(0);

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
  expect((await notificationTarget(other.request, notice)).target).toMatch(
    /^\/(ja|en)\/app\/chat\/.+/,
  );
  expect(notice).not.toContain("see you!");
});

test("学年代表 get their group, and tags show 期 and 学年代表", async ({
  page,
}) => {
  // A 第5期 graduate made 学年代表 for their class.
  const stamp = Date.now();
  const rep = await createActiveGraduate(`Rep R${stamp}`, "1993-05-05");
  await sql(
    `UPDATE "UserRole" SET "cohortId" = (SELECT id FROM "Cohort" WHERE number = 5)
     WHERE "userId" = $1`,
    [rep.id],
  );
  await sql(
    `INSERT INTO "UserPosition" (id, "userId", position, "cohortId")
     VALUES ($1, $2, 'STUDENT_LEADER', (SELECT id FROM "Cohort" WHERE number = 5))`,
    [`pos${stamp}`, rep.id],
  );
  await signInWithEmail(page, rep.email);
  await page.goto("/en/app/chat");
  const reps = page.getByRole("link", { name: /^Class reps/ });
  await expect(reps).toBeVisible();
  await reps.click();
  await page.locator('summary[aria-label="Menu"]').click();
  const me = page.getByRole("listitem").filter({ hasText: `R${stamp}, Rep` });
  await expect(me.getByText("Class 5", { exact: true })).toBeVisible();
  await expect(me.getByText("Class rep", { exact: true })).toBeVisible();

  // Without the position they leave the group.
  await sql(`DELETE FROM "UserPosition" WHERE id = $1`, [`pos${stamp}`]);
  await page.goto("/en/app/chat");
  await expect(page.getByRole("link", { name: /^Class reps/ })).toHaveCount(0);
});

test("1:1 talks follow the member-type rules; admins can change them", async ({
  browser,
}) => {
  const stamp = Date.now();
  const p1 = await createActiveGraduate(`Fp One${stamp}`, "1970-01-01");
  const p2 = await createActiveGraduate(`Fp Two${stamp}`, "1970-02-02");
  const grad = await createActiveGraduate(`Fp Grad${stamp}`, "1990-03-03");
  const cur = await createActiveGraduate(`Fp Cur${stamp}`, "1975-04-04");
  // p1, p2: 卒業生保護者; cur: 在校生保護者; grad stays a graduate.
  await sql(
    `UPDATE "UserRole" SET role = 'FORMER_PARENT', "didGraduate" = NULL
     WHERE "userId" = ANY($1)`,
    [[p1.id, p2.id]],
  );
  await sql(
    `UPDATE "UserRole" SET role = 'CURRENT_PARENT', "didGraduate" = NULL
     WHERE "userId" = $1`,
    [cur.id],
  );
  // p1 and each of the others follow each other.
  let n = 0;
  for (const other of [p2, grad, cur])
    await sql(
      `INSERT INTO "Follow" (id, "followerId", "followeeId", status) VALUES
       ($1, $3, $4, 'ACCEPTED'), ($2, $4, $3, 'ACCEPTED')`,
      [`rf${stamp}${n++}`, `rf${stamp}${n++}`, p1.id, other.id],
    );

  // Former parents: only with former parents.
  const page = await browser.newPage();
  await signInWithEmail(page, p1.email);
  await page.goto(`/en/app/members/${grad.id}`);
  await expect(page.getByRole("button", { name: "Message" })).toHaveCount(0);
  await page.goto(`/en/app/members/${cur.id}`);
  await expect(page.getByRole("button", { name: "Message" })).toHaveCount(0);
  await page.goto("/en/app/chat/new");
  await expect(page.getByText(`Two${stamp}, Fp`)).toBeVisible();
  await expect(page.getByText(`Grad${stamp}, Fp`)).toHaveCount(0);
  await page.goto(`/en/app/members/${p2.id}`);
  await page.getByRole("button", { name: "Message" }).click();
  await expect(page).toHaveURL(/\/en\/app\/chat\/[^/]+$/);
  const hi = `Hello parent ${stamp}`;
  await page.getByLabel("Message", { exact: true }).fill(hi);
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByText(hi)).toBeVisible();
  const talkUrl = page.url();

  // Current parents: no 1:1 talks at all.
  const pc = await browser.newPage();
  await signInWithEmail(pc, cur.email);
  await pc.goto("/en/app/chat");
  await expect(pc.getByRole("link", { name: "New chat" })).toHaveCount(0);

  // An admin turns 1:1 talks off for former parents: the talk stops.
  const admin = await browser.newPage();
  await signInWithEmail(admin, "admin@example.com");
  await admin.goto("/en/app/admin/chat");
  const rule = admin.getByLabel("Parent of former student");
  await expect(rule).toHaveValue("SAME_ROLE");
  try {
    await rule.selectOption("NOBODY");
    await admin.getByRole("button", { name: "Save" }).click();
    await expect(admin.getByText("Saved.")).toBeVisible();
    await page.goto(talkUrl);
    await expect(
      page.getByText(
        "One-to-one chats between your member types aren't available.",
      ),
    ).toBeVisible();
    await expect(page.getByLabel("Message", { exact: true })).toHaveCount(0);
  } finally {
    await sql(
      `DELETE FROM "DirectChatPolicy" WHERE role = 'FORMER_PARENT'`,
      [],
    );
  }
  await page.reload();
  await expect(page.getByLabel("Message", { exact: true })).toBeVisible();
});

test("members report someone from the chat details; admins review it", async ({
  browser,
}) => {
  const stamp = Date.now();
  const a = await createActiveGraduate(`Rp A${stamp}`, "1991-01-01");
  const b = await createActiveGraduate(`Rp B${stamp}`, "1991-02-02");
  await sql(
    `INSERT INTO "Follow" (id, "followerId", "followeeId", status) VALUES
     ($1, $3, $4, 'ACCEPTED'), ($2, $4, $3, 'ACCEPTED')`,
    [`rp1${stamp}`, `rp2${stamp}`, a.id, b.id],
  );
  // B writes something rude in their 1:1 talk.
  const pb = await browser.newPage();
  await signInWithEmail(pb, b.email);
  await pb.goto(`/en/app/members/${a.id}`);
  await pb.getByRole("button", { name: "Message" }).click();
  await expect(pb).toHaveURL(/\/en\/app\/chat\/[^/]+$/);
  const rude = `Rude words ${stamp}`;
  await pb.getByLabel("Message", { exact: true }).fill(rude);
  await pb.getByRole("button", { name: "Send" }).click();
  await expect(pb.getByText(rude)).toBeVisible();
  const talkUrl = pb.url();

  // A opens the talk's details: members, and the report form.
  const pa = await browser.newPage();
  await signInWithEmail(pa, a.email);
  await pa.goto(`${talkUrl}/info`);
  await expect(pa.getByText(`B${stamp}, Rp`).first()).toBeVisible();
  await pa.getByText("Report a problem").click();
  await expect(pa.getByLabel("Who")).toHaveValue(b.id);
  await pa.getByLabel("Reason").selectOption("HARASSMENT");
  await pa.getByLabel("What happened").fill("They keep insulting me.");
  await pa.getByRole("button", { name: "Send report" }).click();
  await expect(pa.getByText(/Your report \(#\w+\) was sent/)).toBeVisible();

  // The admin sees it with the attached message (they can't open the talk).
  const admin = await browser.newPage();
  await signInWithEmail(admin, "admin@example.com");
  await admin.goto("/en/app/admin/chat");
  const card = admin
    .getByRole("listitem")
    .filter({ hasText: "They keep insulting me." });
  await expect(card.getByText("Harassment or bullying")).toBeVisible();
  await expect(card.getByRole("link", { name: `B${stamp}, Rp` })).toBeVisible();
  await card.getByText("1 attached message").click();
  await expect(card.getByText(rude)).toBeVisible();
  await card.getByRole("button", { name: "Mark done" }).click();
  await expect(
    admin.getByRole("listitem").filter({ hasText: "They keep insulting me." }),
  ).toHaveCount(0);
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
