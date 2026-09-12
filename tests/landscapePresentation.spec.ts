import { test, expect } from "@playwright/test";
import { startApp, confirmDefaultCharacter, enterMeadows } from "./helpers";

test("landscape presentation at desktop size", async ({ page }) => {
  await startApp(page);
  const canvas = await confirmDefaultCharacter(page);
  await page.waitForTimeout(2500);
  await page.screenshot({ path: "artifacts/town-800.png" });
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.waitForTimeout(500);
  await expect(canvas).toHaveAttribute("data-scene", "world");
  await page.screenshot({ path: "artifacts/town-desktop.png" });
  await page.setViewportSize({ width: 800, height: 600 });
  await page.waitForTimeout(500);
  await canvas.click({ position: { x: 760, y: 304 } });
  await expect(canvas).toHaveAttribute("data-current-map", "crownfield-meadows", { timeout: 9000 });
});

test("meadow landscape and dark inventory", async ({ page }) => {
  await startApp(page);
  const canvas = await enterMeadows(page);
  await page.waitForTimeout(2000);
  await page.screenshot({ path: "artifacts/meadows-800.png" });
  await page.keyboard.press("KeyI");
  await expect(canvas).toHaveAttribute("data-inventory-panel", "visible");
  await page.screenshot({ path: "artifacts/inventory-800.png" });
});
