import { expect, test } from "@playwright/test";
import { signInWithEmail } from "./helpers";

// Uses the seeded demo member (SEED_DEMO=1): hanako@example.com, graduated 2015.
test("member requests an AIS record correction and an admin approves it", async ({
  browser,
}) => {
  const member = await browser.newPage();
  await signInWithEmail(member, "hanako@example.com");
  await member.goto("/en/app/profile/record");

  // Withdraw a pending request left over from an earlier run, if any.
  const withdraw = member.getByRole("button", { name: "Withdraw request" });
  if (await withdraw.isVisible()) {
    await withdraw.click();
    await expect(withdraw).toHaveCount(0);
  }

  const reason = `Smoke test ${Date.now()}: wrong graduation year`;
  await member.getByText("Request a correction").first().click();
  const yearInput = member.getByLabel("Graduation / leaving year");
  // A different year after hanako joined (2009), so there is a real change.
  const current = Number(await yearInput.inputValue()) || 2015;
  const year = String(current >= 2024 ? 2015 : current + 1);
  await yearInput.fill(year);
  await member.getByLabel("Reason").fill(reason);
  await member.getByRole("button", { name: "Send request" }).click();
  await expect(member.getByText(/Waiting for the committee/)).toBeVisible();

  const admin = await browser.newPage();
  await signInWithEmail(admin, "admin@example.com");
  await admin.goto("/en/app/admin/record-requests");
  // The pending card holding this request (the innermost Card with the reason).
  const card = admin.locator("div.rounded-xl", { hasText: reason });
  await expect(card).toHaveCount(1);
  await card.getByRole("button", { name: "Approve and apply" }).click();
  // Approved requests leave the pending list.
  await expect(card).toHaveCount(0);

  await member.reload();
  await expect(member.getByText("Approved").first()).toBeVisible();
  await expect(member.locator("dd", { hasText: year }).first()).toBeVisible();
});
