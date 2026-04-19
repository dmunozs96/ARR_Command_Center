import { expect, test } from "@playwright/test";
import { installDefaultMocks } from "./helpers/mock-api";

test("alerts page filters and expands alert detail", async ({ page }) => {
  await installDefaultMocks(page);

  await page.goto("/alerts");

  await expect(page.getByTestId("alerts-page")).toBeVisible();
  await expect(page.getByTestId("alerts-list")).toContainText("Expansion ACME");

  await page.getByRole("combobox").selectOption("UNCLASSIFIED_PRODUCT");
  await expect(page.getByTestId("alerts-list")).toContainText("Producto sin clasificar");

  await page.getByRole("button", { name: /Ver detalle/i }).first().click();
  await expect(page.getByText(/Nota de revision/i)).toBeVisible();
  await page.getByPlaceholder(/Documenta aqui la decision/i).fill("Revisado por smoke test");
  await page.getByRole("button", { name: /Marcar revisada/i }).click();
});
