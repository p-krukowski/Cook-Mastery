import { expect, test } from "@playwright/test";

test("home page renders navbar and title", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle(/Cook Mastery/);
  await expect(page.getByRole("link", { name: "Cook Mastery" })).toBeVisible();
});
