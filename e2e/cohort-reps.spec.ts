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

  // Removing takes the position away.
  await chip.click();
  await expect(chip).toHaveCount(0);
  expect(
    await sql(`SELECT 1 FROM "UserPosition" WHERE "userId" = $1`, [five.id]),
  ).toEqual([]);
  expect(other.id).toBeTruthy();
});
