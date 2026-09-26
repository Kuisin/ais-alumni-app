import { expect, test } from "@playwright/test";
import { signInWithEmail, uniqueEmail } from "./helpers";

test("former teacher signs up; status shows in the admin member list", async ({
  browser,
}) => {
  const email = uniqueEmail("teacher");
  const lastName = `Former${Date.now() % 1_000_000}`;
  const member = await browser.newPage();
  await signInWithEmail(member, email);
  await member.getByRole("button", { name: "Skip for now" }).click();

  await member
    .getByRole("textbox", { name: "Last name", exact: true })
    .fill(lastName);
  await member
    .getByRole("textbox", { name: "First name", exact: true })
    .fill("Teacher");
  await member.getByLabel("Date of birth").fill("1970-05-05");
  await member.getByRole("checkbox", { name: "Teacher / Staff" }).check();
  await member.getByRole("button", { name: "Next" }).click();

  await member.getByRole("radio", { name: "Former teacher / staff" }).check();
  await member.getByLabel("From (year)").fill("2005");
  await member.getByLabel("To (year)").fill("2015");
  await member.getByLabel("Subjects / grades taught").fill("Math, G9–12");
  await member.getByRole("button", { name: "Next" }).click();
  await member.getByRole("button", { name: "Submit" }).click();
  await expect(member).toHaveURL(/\/en\/app\/onboarding\/status/);

  const admin = await browser.newPage();
  await signInWithEmail(admin, "admin@example.com");
  await admin.goto(`/en/app/admin/members?q=${lastName}`);
  await expect(
    admin.getByText("Teacher / Staff（Former）").first(),
  ).toBeVisible();
});
