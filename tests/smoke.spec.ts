import { expect, test } from "@playwright/test";

test("T1: home loads with app title and conversation", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("app-title")).toBeVisible();
  await expect(page.getByTestId("conversation")).toBeVisible();
});
