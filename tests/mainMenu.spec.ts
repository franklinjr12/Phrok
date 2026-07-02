import { expect, test } from "@playwright/test";
import { confirmDefaultCharacter, startApp } from "./helpers";

test("main menu buttons respond to pointer input", async ({ page }) => {
  await startApp(page);

  const canvas = page.locator("canvas");
  await expect(canvas).toHaveAttribute("data-scene", "main-menu");

  await canvas.hover({ position: { x: 400, y: 204 } });
  await expect(canvas).toHaveAttribute("data-active-button", "New Game");

  const bounds = await canvas.boundingBox();
  expect(bounds).not.toBeNull();

  await page.mouse.move(bounds!.x + 400, bounds!.y + 354);
  await expect(canvas).toHaveAttribute("data-active-button", "Settings");

  await page.mouse.down();
  await expect(canvas).toHaveAttribute("data-pressed-button", "Settings");

  await page.mouse.up();
  await expect(canvas).not.toHaveAttribute("data-pressed-button", "Settings");

  await expect(canvas).toBeVisible();
});

test("credits and quit actions are available from the final main menu", async ({ page }) => {
  await startApp(page);

  const canvas = page.locator("canvas");
  await expect(canvas).toHaveAttribute("data-scene", "main-menu");
  await expect(canvas).toHaveAttribute("data-menu-buttons", "New Game|Continue|Load Game|Settings|Credits|Quit");

  await canvas.click({ position: { x: 400, y: 404 } });
  await expect(canvas).toHaveAttribute("data-credits-screen", "visible");
  await expect(canvas).toHaveAttribute("data-credits-entries", /Phaser 4\.1\.0.*MIT.*Original art/);

  await canvas.click({ position: { x: 400, y: 500 } });
  await expect(canvas).toHaveAttribute("data-credits-screen", "hidden");

  await canvas.click({ position: { x: 400, y: 454 } });
  await expect(canvas).toHaveAttribute("data-menu-quit-state", "requested");
});

test("settings open from main menu and carry into new save", async ({ page }) => {
  await startApp(page);

  const canvas = page.locator("canvas");
  await expect(canvas).toHaveAttribute("data-scene", "main-menu");
  await canvas.click({ position: { x: 400, y: 354 } });
  await expect(canvas).toHaveAttribute("data-settings-menu", "visible");
  await expect(canvas).toHaveAttribute("data-settings-buttons", /Music.*Difficulty.*Text/);

  await canvas.click({ position: { x: 536, y: 207 } });
  await expect(canvas).toHaveAttribute("data-settings-ui-scale", "1.25");
  await canvas.click({ position: { x: 394, y: 311 } });
  await expect(canvas).toHaveAttribute("data-settings-difficulty", "Veteran");
  await expect(canvas).toHaveAttribute("data-settings-summary", /ui:125.*difficulty:Veteran/);

  await canvas.click({ position: { x: 536, y: 461 } });
  await expect(canvas).toHaveAttribute("data-settings-menu", "hidden");

  await canvas.click({ position: { x: 400, y: 204 } });
  await expect(canvas).toHaveAttribute("data-scene", "character-creation");
  await canvas.click({ position: { x: 630, y: 545 } });
  await expect(canvas).toHaveAttribute("data-scene", "world");
  await expect(canvas).toHaveAttribute("data-settings-difficulty", "Veteran");
  await expect(canvas).toHaveAttribute("data-settings-ui-scale", "1.25");
  await expect(canvas).toHaveAttribute("data-enemy-damage", "");
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
  await expect(canvas).toHaveAttribute("data-save-slot-buttons", /Slot 1: Adventurer - Swordsman Lv 1 - Crownfield/);
  await expect(canvas).toHaveAttribute("data-continue-state", "available");

  await canvas.click({ position: { x: 400, y: 254 } });
  await expect(canvas).toHaveAttribute("data-scene", "world");
  await expect(canvas).toHaveAttribute("data-current-save-slot", "1");
  await expect(canvas).toHaveAttribute("data-current-map", "crownfield-town");
  await expect.poll(async () => Number(await canvas.getAttribute("data-player-x"))).toBeGreaterThan(320);
  await expect(canvas).toHaveAttribute("data-player-level", "1");
  await expect(canvas).toHaveAttribute("data-inventory-item", "training-sword");
  await expect(canvas).toHaveAttribute("data-equipment-weapon", "training-sword");
});
