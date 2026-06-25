import { expect, test } from "@playwright/test";
import { confirmDefaultCharacter, startApp } from "./helpers";

test("world ui hotkeys show inventory, equipment, comparison, and block gameplay clicks", async ({ page }) => {
  await startApp(page);

  const canvas = await confirmDefaultCharacter(page);
  const startX = Number(await canvas.getAttribute("data-player-x"));

  await page.keyboard.press("KeyI");
  await expect(canvas).toHaveAttribute("data-ui-panel", "inventory");
  await expect(canvas).toHaveAttribute("data-gameplay-input-blocked", "true");
  await expect(canvas).toHaveAttribute("data-inventory-panel", "visible");
  await expect(canvas).toHaveAttribute("data-inventory-item-count", "1");
  await expect(canvas).toHaveAttribute("data-selected-inventory-item", "training-sword");
  await expect(canvas).toHaveAttribute("data-selected-inventory-item-name", "Training Sword");
  await expect(canvas).toHaveAttribute("data-selected-inventory-item-quantity", "1");
  await expect(canvas).toHaveAttribute("data-selected-inventory-item-source", "stack");
  await expect(canvas).toHaveAttribute("data-selected-inventory-item-rarity", "Uncommon");
  await expect(canvas).toHaveAttribute("data-selected-inventory-item-description", /practice blade/);
  await expect(canvas).toHaveAttribute("data-inventory-buttons", "Equip|Drop|Close");

  await canvas.hover({ position: { x: 140, y: 196 } });
  await expect(canvas).toHaveAttribute("data-item-comparison", "visible");
  await expect(canvas).toHaveAttribute("data-item-comparison-text", /current=Training Sword\|new=Training Sword/);
  await expect(canvas).toHaveAttribute("data-item-comparison-text", /requirements=None\|effects=physicalAttack \+2, rangedAttack \+2/);

  await canvas.click({ position: { x: 560, y: 300 } });
  await page.waitForTimeout(150);
  expect(Number(await canvas.getAttribute("data-player-x"))).toBeCloseTo(startX, 1);

  await page.keyboard.press("Escape");
  await expect(canvas).toHaveAttribute("data-ui-panel", "closed");
  await expect(canvas).toHaveAttribute("data-gameplay-input-blocked", "false");

  await page.keyboard.press("KeyC");
  await expect(canvas).toHaveAttribute("data-ui-panel", "character");
  await expect(canvas).toHaveAttribute("data-character-panel", "visible");
  await expect(canvas).toHaveAttribute("data-character-panel-buttons", "HP Auto|SP Auto|Confirm|Reset|Close");
  await expect(canvas).toHaveAttribute("data-stat-allocation-points", "0");
  await expect(canvas).toHaveAttribute("data-auto-potion-settings", "hp:0|sp:0");
  await canvas.click({ position: { x: 126, y: 454 } });
  await expect(canvas).toHaveAttribute("data-last-auto-potion-setting", "hp:25");
  await expect(canvas).toHaveAttribute("data-auto-potion-settings", "hp:25|sp:0");

  await page.keyboard.press("KeyP");
  await expect(canvas).toHaveAttribute("data-ui-panel", "equipment");
  await expect(canvas).toHaveAttribute("data-equipment-panel", "visible");
  await expect(canvas).toHaveAttribute(
    "data-equipment-slots-visible",
    "weapon|offhand|head|body|cloak|boots|accessory1|accessory2|sigil|supportCharm",
  );
  await expect(canvas).toHaveAttribute("data-player-attack-stat", "29");

  await canvas.click({ position: { x: 140, y: 466 } });
  await expect(canvas).toHaveAttribute("data-last-equipment-action", "remove:weapon");
  await expect(canvas).toHaveAttribute("data-equipment-weapon", "");
  await expect(canvas).toHaveAttribute("data-player-attack-stat", "27");

  await page.keyboard.press("KeyI");
  await expect(canvas).toHaveAttribute("data-ui-panel", "inventory");
  await canvas.click({ position: { x: 540, y: 446 } });
  await expect(canvas).toHaveAttribute("data-last-inventory-action", "equip:training-sword");
  await expect(canvas).toHaveAttribute("data-equipment-weapon", "training-sword");
  await expect(canvas).toHaveAttribute("data-player-attack-stat", "29");
});

test("skill screen supports leveling, requirements, hotbar assignment, and persistence data", async ({ page }) => {
  await startApp(page);

  const canvas = await confirmDefaultCharacter(page);

  await page.keyboard.press("KeyK");
  await expect(canvas).toHaveAttribute("data-ui-panel", "skills");
  await expect(canvas).toHaveAttribute("data-skill-panel", "visible");
  await expect(canvas).toHaveAttribute("data-skill-groups", "swordsman");
  await expect(canvas).toHaveAttribute("data-skill-panel-points", "0");
  await expect(canvas).toHaveAttribute(
    "data-class-skills",
    "power-slash|guard-stance|iron-body|sweeping-cut|battle-cry|endure-pain|weapon-training|counter-blow",
  );
  await expect(canvas).toHaveAttribute("data-selected-skill", "power-slash");
  await expect(canvas).toHaveAttribute("data-selected-skill-level", "1");
  await expect(canvas).toHaveAttribute("data-selected-skill-locked", "false");
  await expect(canvas).toHaveAttribute("data-selected-skill-tooltip", /active\|enemy\|Damage 1\.15x STR; Status armor-break, stun\|Unlocked/);
  await expect(canvas).toHaveAttribute("data-skill-panel-buttons", "Level|Slot 1|Potion|Close");

  await canvas.click({ position: { x: 482, y: 438 } });
  await expect(canvas).toHaveAttribute("data-last-skill-allocation", "failed");

  await canvas.click({ position: { x: 578, y: 438 } });
  await expect(canvas).toHaveAttribute("data-last-hotbar-assignment", "1:skill:power-slash");
  await expect(canvas).toHaveAttribute("data-hotbar-assignments", /1:skill:power-slash/);

  await canvas.click({ position: { x: 674, y: 438 } });
  await expect(canvas).toHaveAttribute("data-last-hotbar-assignment", "2:item:minor-health-potion");
  await expect(canvas).toHaveAttribute("data-hotbar-assignments", /2:item:minor-health-potion/);
});
