import { expect, test } from "@playwright/test";
import { Client } from "pg";
import { createActiveGraduate, signInWithEmail } from "./helpers";

async function sql(text: string, values: unknown[]) {
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  try {
    return (await db.query(text, values)).rows;
  } finally {
    await db.end();
  }
}

test("学年代表 are chosen per 学年, from that 学年's students", async ({
  page,
}) => {
  const stamp = Date.now();
  const five = await createActiveGraduate(`Five F${stamp}`, "1993-03-03");
  const other = await createActiveGraduate(`Six S${stamp}`, "1994-04-04");
  await sql(
    `UPDATE "UserRole" SET "cohortId" = (SELECT id FROM "Cohort" WHERE number = 5)
     WHERE "userId" = $1`,
    [five.id],
  );

  await signInWithEmail(page, "admin@example.com");
  await page.goto("/en/app/admin/cohorts");
  const card = page
    .locator("li")
    .filter({ has: page.getByText("第5期", { exact: true }) })
    .first();
  // View first: 編集 opens the years, reps and delete.
  await card.getByRole("button", { name: "Edit" }).click();
  const search = card.getByPlaceholder(/^Search this 学年/);

  // Someone from another 学年 isn't offered.
  await search.fill(`S${stamp}`);
  await expect(
    card.getByText("No matching members in this 学年."),
  ).toBeVisible();

  await search.fill(`F${stamp}`);
  await card
    .getByRole("button", { name: `Make F${stamp}, Five a class rep` })
    .click();
  const chip = card.getByRole("button", {
    name: `Remove F${stamp}, Five as class rep`,
  });
  await expect(chip).toBeVisible();
  const rows = await sql(
    `SELECT c.number FROM "UserPosition" p JOIN "Cohort" c ON c.id = p."cohortId"
     WHERE p."userId" = $1 AND p.position = 'STUDENT_LEADER'`,
    [five.id],
  );
  expect(rows).toEqual([{ number: 5 }]);
  // …and they're in the 学年代表 chat.
  const chats = await sql(
    `SELECT g.kind FROM "ChatMember" m JOIN "ChatGroup" g ON g.id = m."groupId"
     WHERE m."userId" = $1`,
    [five.id],
  );
  expect(chats.map((c) => c.kind)).toContain("CLASS_REPS");

  // Removing (after confirming) takes the position away.
  page.once("dialog", (d) => d.accept());
  await chip.click();
  await expect(chip).toHaveCount(0);
  expect(
    await sql(`SELECT 1 FROM "UserPosition" WHERE "userId" = $1`, [five.id]),
  ).toEqual([]);
  expect(other.id).toBeTruthy();
});

test("学年代表 can be assigned from the member's 役職 panel (own 学年 only)", async ({
  page,
}) => {
  const stamp = Date.now();
  const grad = await createActiveGraduate(`Pos P${stamp}`, "1993-07-07");
  await sql(
    `UPDATE "UserRole" SET "cohortId" = (SELECT id FROM "Cohort" WHERE number = 5)
     WHERE "userId" = $1`,
    [grad.id],
  );
  await signInWithEmail(page, "admin@example.com");
  await page.goto(`/en/app/admin/members/${grad.id}`);
  const panel = page
    .locator("div")
    .filter({ has: page.getByText("Class representative", { exact: true }) })
    .filter({ has: page.getByRole("button", { name: "Assign" }) })
    .last();
  // View first: Assign opens the form (then Assign saves).
  await panel.getByRole("button", { name: "Assign" }).click();
  const select = panel.getByLabel("学年 (class)");
  // Only their own 学年 is offered (plus the empty choice).
  await expect(select.locator("option")).toHaveCount(2);
  await select.selectOption({ index: 1 });
  await panel.getByRole("button", { name: "Assign" }).click();
  // Saved: the section closes to its view with the result.
  await expect(page.getByText("Position assigned.")).toBeVisible();
  const chats = await sql(
    `SELECT g.kind FROM "ChatMember" m JOIN "ChatGroup" g ON g.id = m."groupId"
     WHERE m."userId" = $1`,
    [grad.id],
  );
  expect(chats.map((c) => c.kind)).toContain("CLASS_REPS");
  await sql(`DELETE FROM "UserPosition" WHERE "userId" = $1`, [grad.id]);
});
