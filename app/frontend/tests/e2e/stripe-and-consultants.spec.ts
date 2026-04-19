import { expect, test } from "@playwright/test";
import { installDefaultMocks } from "./helpers/mock-api";

test("stripe warning and consultants export flow are visible", async ({ page }) => {
  await installDefaultMocks(page);

  await page.goto("/stripe");
  await expect(page.getByTestId("stripe-page")).toBeVisible();
  await expect(page.getByTestId("stripe-current-month-warning")).toBeVisible();
  await expect(page.getByTestId("stripe-table")).toContainText("mar 2026");

  await page.goto("/consultants");
  await expect(page.getByTestId("consultants-page")).toBeVisible();
  await expect(page.getByTestId("consultants-kpis")).toContainText("Consultores visibles");
  await expect(page.getByTestId("consultants-table")).toContainText("Maria Lopez");
  await expect(page.getByRole("button", { name: /Exportar CSV/i })).toBeEnabled();
});
