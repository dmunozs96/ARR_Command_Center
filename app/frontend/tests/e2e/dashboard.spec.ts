import { expect, test } from "@playwright/test";
import { installDefaultMocks } from "./helpers/mock-api";

test("dashboard renders snapshot data and stripe warning", async ({ page }) => {
  await installDefaultMocks(page);

  await page.goto("/");

  await expect(page.getByTestId("dashboard-page")).toBeVisible();
  await expect(page.getByRole("heading", { name: /ARR Total Compania/i })).toBeVisible();
  await expect(page.getByTestId("dashboard-stripe-warning")).toBeVisible();
  await expect(page.getByText(/128\.000/i)).toBeVisible();
  await expect(page.getByText(/2 alertas pendientes/i)).toBeVisible();
});
