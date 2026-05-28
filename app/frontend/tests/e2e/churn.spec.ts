import { expect, test } from "@playwright/test";
import { installDefaultMocks } from "./helpers/mock-api";

test("churn shows retention metrics and churned accounts", async ({ page }) => {
  await installDefaultMocks(page);

  await page.goto("/churn");

  await expect(page.getByTestId("churn-page")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Churn" })).toBeVisible();
  await expect(page.getByText("101.4%")).toBeVisible();
  await expect(page.getByRole("cell", { name: "Beta Corp" })).toBeVisible();
  await expect(page.getByText("Author Online se incluye en el puente")).toBeVisible();
});

test("monthly churn compares Apr 2026 against Mar 2026", async ({ page }) => {
  await installDefaultMocks(page);

  await page.goto("/churn");
  await expect(page.getByLabel("Mes de llegada")).toBeVisible();
  await page.getByLabel("Mes de llegada").fill("2026-05");
  const requestPromise = page.waitForRequest((request) => {
    const url = new URL(request.url());
    return (
      url.pathname.endsWith("/api/churn/monthly") &&
      url.searchParams.get("month") === "2026-04-01"
    );
  });
  await page.getByLabel("Mes de llegada").fill("2026-04");

  const request = await requestPromise;
  const url = new URL(request.url());
  expect(url.searchParams.get("month_from")).toBe("2026-03-01");
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
