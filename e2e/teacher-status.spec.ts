import { expect, test } from "@playwright/test";
import { signInWithEmail, uniqueEmail } from "./helpers";

test("teacher with a leave year is registered as former automatically", async ({
  browser,
}) => {
  const email = uniqueEmail("teacher");
  const lastName = `Former${Date.now() % 1_000_000}`;
  const member = await browser.newPage();
  await signInWithEmail(member, email);
  await member.getByRole("button", { name: "Skip for now" }).click();

  await member.getByRole("checkbox", { name: /Teacher \/ Staff/ }).check();
  await member.getByRole("button", { name: "Next" }).click();
  await member
    .getByRole("textbox", { name: "Last name", exact: true })
    .fill(lastName);
  await member
    .getByRole("textbox", { name: "First name", exact: true })
    .fill("Teacher");
  await member.getByLabel("Date of birth").fill("1970-05-05");
  await member.getByLabel("Gender").selectOption("OTHER");
  await member.getByRole("button", { name: "Next" }).click();

  // Former/current comes from the leave year — no manual status.
  await member.getByLabel("Year you started").fill("2005");
  await member.getByLabel("Year you left").fill("2015");
  await expect(
    member.getByText("former teacher / staff (left in 2015)"),
  ).toBeVisible();
  await member.getByLabel("Subjects / grades taught").fill("Math");
  await member.getByRole("button", { name: "Next" }).click();
  await member.getByRole("button", { name: "Submit application" }).click();
  await expect(member).toHaveURL(/\/en\/app\/onboarding\/status/);

  const admin = await browser.newPage();
  await signInWithEmail(admin, "admin@example.com");
  await admin.goto(`/en/app/admin/members?q=${lastName}`);
  await expect(
    admin
      .getByText("Teacher / Staff（Former）")
      .filter({ visible: true })
      .first(),
  ).toBeVisible();
});
