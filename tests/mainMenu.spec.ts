import { expect, test } from "@playwright/test";
import { confirmDefaultCharacter, startApp } from "./helpers";

test("main menu buttons respond to pointer input", async ({ page }) => {
  await startApp(page);

  const canvas = page.locator("canvas");
  await expect(canvas).toHaveAttribute("data-scene", "main-menu");

  await canvas.hover({ position: { x: 400, y: 204 } });
  await expect(canvas).toHaveAttribute("data-active-button", "Slot 1: New Game");

  const bounds = await canvas.boundingBox();
  expect(bounds).not.toBeNull();

  await page.mouse.move(bounds!.x + 400, bounds!.y + 432);
  await expect(canvas).toHaveAttribute("data-active-button", "Options");

  await page.mouse.down();
  await expect(canvas).toHaveAttribute("data-pressed-button", "Options");

  await page.mouse.up();
  await expect(canvas).not.toHaveAttribute("data-pressed-button", "Options");

  await expect(canvas).toBeVisible();
});

test("save slots support manual save and continue", async ({ page }) => {
  await startApp(page);

  const canvas = await confirmDefaultCharacter(page);
  await expect(canvas).toHaveAttribute("data-current-save-slot", "1");

  await canvas.click({ position: { x: 560, y: 300 } });
  await expect.poll(async () => Number(await canvas.getAttribute("data-player-x"))).toBeGreaterThan(320);

  await page.keyboard.press("KeyS");
  await expect(canvas).toHaveAttribute("data-last-manual-save-status", "saved");
  await expect(canvas).toHaveAttribute("data-last-manual-save-slot", "1");

  const savedSlot = await page.evaluate(() => localStorage.getItem("prok-save-slot-1"));
  expect(savedSlot).toContain("\"currentSaveSlot\":1");
  expect(savedSlot).toContain("\"position\"");

  await page.reload();
  await expect(canvas).toHaveAttribute("data-scene", "main-menu");
  await expect(canvas).toHaveAttribute("data-save-slots", /1:used:Adventurer:Swordsman:Lv 1:Crownfield/);
  await expect(canvas).toHaveAttribute("data-menu-buttons", /Slot 1: Adventurer - Swordsman Lv 1 - Crownfield/);

  await canvas.click({ position: { x: 400, y: 204 } });
  await expect(canvas).toHaveAttribute("data-scene", "world");
  await expect(canvas).toHaveAttribute("data-current-save-slot", "1");
  await expect(canvas).toHaveAttribute("data-current-map", "crownfield-town");
  await expect.poll(async () => Number(await canvas.getAttribute("data-player-x"))).toBeGreaterThan(320);
  await expect(canvas).toHaveAttribute("data-player-level", "1");
  await expect(canvas).toHaveAttribute("data-inventory-item", "training-sword");
  await expect(canvas).toHaveAttribute("data-equipment-weapon", "training-sword");
});
