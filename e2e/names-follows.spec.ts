import { expect, test } from "@playwright/test";
import { createActiveGraduate, signInWithEmail } from "./helpers";

test("approved names are locked; a name change goes through the committee", async ({
  browser,
}) => {
  const last = `Name${Date.now() % 1_000_000}`;
  const member = await createActiveGraduate(`Taro ${last}`, "1995-05-05");
  const page = await browser.newPage();
  await signInWithEmail(page, member.email);
  await page.goto("/en/app/profile");

  // No editable name fields on the profile, only a request.
  await expect(
    page.getByRole("textbox", { name: "Last name", exact: true }),
  ).toHaveCount(0);
  await page
    .locator("#name")
    .getByRole("button", { name: "Request a change" })
    .click();

  // Kanji needs its katakana reading; hiragana is converted to katakana.
  await page
    .getByRole("textbox", { name: "Last name", exact: true })
    .fill(`${last}x`);
  await page.getByRole("textbox", { name: "Last name (姓)" }).fill("山田");
  await page.getByLabel("Reason for the change").fill("Marriage");
  await page.getByRole("button", { name: "Send request" }).click();
  await expect(page.getByText(/katakana reading/).first()).toBeVisible();
  const kana = page.getByRole("textbox", {
    name: "Last name in katakana (フリガナ)",
  });
  // The form resets after the failed submit; fill once it has settled.
  await expect(kana).toHaveAttribute("aria-invalid", "true");
  await expect(async () => {
    await kana.fill("やまだ");
    await expect(kana).toHaveValue("やまだ", { timeout: 500 });
  }).toPass();
  await page.getByRole("button", { name: "Send request" }).click();
  // The card closes to its view: sent, and pending review.
  await expect(page.getByText(/Request sent/)).toBeVisible();
  await expect(page.getByText(/The committee will check it/)).toBeVisible();

  // The committee approves and the new name applies.
  const admin = await browser.newPage();
  await signInWithEmail(admin, "admin@example.com");
  await admin.goto("/en/app/admin/name-requests");
  const card = admin
    .locator("div.rounded-xl", { hasText: `${last}, Taro` })
    .filter({ has: admin.getByRole("button") })
    .first();
  await expect(card.getByText("ヤマダ")).toBeVisible();
  await card.getByRole("button", { name: "Approve and apply" }).click();
  // Decided requests leave the "to review" list.
  await expect(card).toHaveCount(0);

  await page.reload();
  const name = page.getByRole("definition");
  await expect(name.filter({ hasText: `${last}x, Taro` })).toBeVisible();
  await expect(name.filter({ hasText: "ヤマダ" })).toBeVisible();
});

test("follow back like Instagram", async ({ browser }) => {
  const stamp = Date.now() % 1_000_000;
  const a = await createActiveGraduate(`Ann F${stamp}`, "1990-01-01");
  const b = await createActiveGraduate(`Ben F${stamp}`, "1990-02-02");

  // Ann follows Ben.
  const ann = await browser.newPage();
  await signInWithEmail(ann, a.email);
  await ann.goto(`/en/app/members/${b.id}`);
  await ann.getByRole("button", { name: "Follow", exact: true }).click();
  await expect(ann.getByRole("button", { name: /Requested/ })).toBeVisible();

  // Ben accepts and is offered "Follow back".
  const ben = await browser.newPage();
  await signInWithEmail(ben, b.email);
  await ben.goto("/en/app/follows");
  await ben.getByRole("button", { name: "Accept" }).first().click();
  await expect(
    ben.getByRole("button", { name: "Follow back" }).first(),
  ).toBeVisible();

  // On Ann's profile Ben sees "Follows you" and "Follow back".
  await ben.goto(`/en/app/members/${a.id}`);
  await expect(ben.getByText("Follows you")).toBeVisible();
  await ben.getByRole("button", { name: "Follow back" }).click();
  await expect(ben.getByRole("button", { name: /Requested/ })).toBeVisible();

  // Ann now follows Ben: "Following", with counts.
  await ann.goto(`/en/app/members/${b.id}`);
  await expect(ann.getByRole("button", { name: "Following" })).toBeVisible();
  await expect(ann.getByText(/1\s*follower/)).toBeVisible();
});
