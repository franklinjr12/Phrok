import { expect, test } from "@playwright/test";

test("map editor paints tiles, creates objects, and exports map json", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 820 });
  await page.goto("/tools/mapEditor/");

  const editor = page.locator("#map-editor");
  await expect(editor).toHaveAttribute("data-editor-ready", "true");
  await expect(editor).toHaveAttribute("data-current-map-id", "crownfield-town");

  await page.locator("[data-action='set-layer'][data-layer='Collision']").click();
  await page.locator("[data-action='set-tile'][data-tile='2']").click();
  await page.getByTestId("map-canvas").click({ position: { x: 112, y: 112 } });

  await page.getByRole("button", { name: "Monster" }).click();
  await page.getByTestId("map-canvas").click({ position: { x: 320, y: 320 } });
  await expect(editor).toHaveAttribute("data-selected-object-id", /\d+/);

  await page.getByRole("button", { name: "Export" }).click();
  await page.getByTestId("export-map").click();

  const output = page.getByTestId("export-output");
  await expect(output).toContainText("\"type\": \"monsterSpawn\"");
  await expect(output).toContainText("\"name\": \"Collision\"");
  await expect(output).toContainText("\"monsterId\"");
});
