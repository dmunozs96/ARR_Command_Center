import { expect, test } from "@playwright/test";
import { installDefaultMocks } from "./helpers/mock-api";

test("snapshot reviewer compares periods and shows changed rows", async ({ page }) => {
  await installDefaultMocks(page);

  await page.goto("/snapshot-review");

  await expect(page.getByTestId("snapshot-review-page")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Revisor de Snapshot" })).toBeVisible();
  await expect(page.getByLabel("Snapshot A (referencia)")).toHaveValue("22222222-2222-2222-2222-222222222222");
  await expect(page.getByLabel("Snapshot B (actual)")).toHaveValue("11111111-1111-1111-1111-111111111111");
  await expect(page.getByText("Expansion ACME")).toBeVisible();
  await expect(page.getByText("1 nuevas")).toBeVisible();
  await expect(page.getByRole("button", { name: "Exportar CSV" })).toBeEnabled();
});
