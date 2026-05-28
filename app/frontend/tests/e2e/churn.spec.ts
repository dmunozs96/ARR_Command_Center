import { expect, test } from "@playwright/test";
import { installDefaultMocks } from "./helpers/mock-api";

test("churn shows retention metrics and churned accounts", async ({ page }) => {
  await installDefaultMocks(page);

  await page.goto("/churn");

  await expect(page.getByTestId("churn-page")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Churn" })).toBeVisible();
  await expect(page.getByText("101.4%")).toBeVisible();
  await expect(page.getByRole("cell", { name: "Beta Corp" })).toBeVisible();
  await expect(page.getByText("Excluye Author Online (Stripe)")).toBeVisible();
});

test("cohort retention has its own page", async ({ page }) => {
  await installDefaultMocks(page);

  await page.goto("/cohort-retention");

  await expect(page.getByTestId("cohort-retention-page")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Retencion de cohorte" })).toBeVisible();
  await expect(page.getByText("104.2%")).toBeVisible();
  await page.getByRole("button", { name: "YTD" }).click();
  await expect(page.getByRole("button", { name: "YTD" })).toHaveClass(/bg-\[#6d35ff\]/);
});
