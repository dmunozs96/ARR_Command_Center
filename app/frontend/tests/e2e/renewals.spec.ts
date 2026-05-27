import { expect, test } from "@playwright/test";
import { installDefaultMocks } from "./helpers/mock-api";

test("renewals shows upcoming risk and signed renewal contracts", async ({ page }) => {
  await installDefaultMocks(page);

  await page.goto("/renewals");

  await expect(page.getByTestId("renewals-page")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Monitor de Renovaciones" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "Beta Corp" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "ACME Corp" })).toBeVisible();
  await expect(page.getByText("Renovado significa")).toBeVisible();

  await page.getByRole("button", { name: "Solo en riesgo" }).click();
  await expect(page.getByRole("cell", { name: "Beta Corp" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "ACME Corp" })).not.toBeVisible();

  await page.getByRole("button", { name: "12 meses" }).click();
  await expect(page.getByRole("button", { name: "12 meses" })).toHaveClass(/bg-\[#6d35ff\]/);
});
