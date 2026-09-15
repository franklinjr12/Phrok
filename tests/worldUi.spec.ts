import { expect, test } from "@playwright/test";
import { confirmDefaultCharacter, startApp } from "./helpers";

test("world ui hotkeys support overlapping ordinary windows without blocking gameplay", async ({ page }) => {
  await startApp(page);

  const canvas = await confirmDefaultCharacter(page);
  const startX = Number(await canvas.getAttribute("data-player-x"));

  await page.keyboard.press("KeyI");
  await expect(canvas).toHaveAttribute("data-ui-panel", "inventory");
  await expect(canvas).toHaveAttribute("data-gameplay-input-blocked", "false");
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
  await expect(canvas).toHaveAttribute("data-character-panel-buttons", "HP Auto|SP Auto|Support|Confirm|Reset|Close");
  await expect(canvas).toHaveAttribute("data-stat-allocation-points", "0");
  await expect(canvas).toHaveAttribute("data-auto-potion-settings", "hp:0|sp:0");
  await expect(canvas).toHaveAttribute("data-support-summary", "none");
  await expect(canvas).toHaveAttribute("data-support-auto-pickup-filter", "none");
  await canvas.click({ position: { x: 126, y: 454 } });
  await expect(canvas).toHaveAttribute("data-last-auto-potion-setting", "hp:25");
  await expect(canvas).toHaveAttribute("data-auto-potion-settings", "hp:25|sp:0");

  await page.keyboard.press("KeyP");
  await expect(canvas).toHaveAttribute("data-ui-panel", "equipment");
  await expect(canvas).toHaveAttribute("data-character-panel", "visible");
  await expect(canvas).toHaveAttribute("data-equipment-panel", "visible");
  await expect(canvas).toHaveAttribute(
    "data-equipment-slots-visible",
    "weapon|offhand|head|body|cloak|boots|accessory1|accessory2|sigil|supportCharm",
  );
  await expect(canvas).toHaveAttribute("data-player-attack-stat", "29");

  await page.keyboard.press("KeyC");
  await expect(canvas).toHaveAttribute("data-ui-panel", "equipment");
  await expect(canvas).toHaveAttribute("data-character-panel", "hidden");

  await canvas.click({ position: { x: 164, y: 486 } });
  await expect(canvas).toHaveAttribute("data-last-equipment-action", "remove:weapon");
  await expect(canvas).toHaveAttribute("data-equipment-weapon", "");
  await expect(canvas).toHaveAttribute("data-player-attack-stat", "27");

  await page.keyboard.press("KeyI");
  await expect(canvas).toHaveAttribute("data-ui-panel", "inventory");
  await expect(canvas).toHaveAttribute("data-equipment-panel", "visible");
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

  await page.keyboard.press("Digit3");
  await expect(canvas).toHaveAttribute("data-last-hotbar-assignment", "3:skill:power-slash");
  await expect(canvas).toHaveAttribute("data-hotbar-assignments", /3:skill:power-slash/);
  await expect(canvas).toHaveAttribute("data-hotbar-rendered-labels", /3:PS/);
  await expect(canvas).not.toHaveAttribute("data-hotbar-assignments", /1:skill:power-slash/);
  await expect(canvas).not.toHaveAttribute("data-hotbar-rendered-labels", /1:PS/);

  await canvas.click({ position: { x: 674, y: 438 } });
  await expect(canvas).toHaveAttribute("data-last-hotbar-assignment", "2:item:minor-health-potion");
  await expect(canvas).toHaveAttribute("data-hotbar-assignments", /2:item:minor-health-potion/);
  await expect(canvas).toHaveAttribute("data-hotbar-rendered-labels", /2:POT/);
});

test("polished HUD exposes minimap, world map, readable bars, and tooltips", async ({ page }) => {
  await startApp(page);

  const canvas = await confirmDefaultCharacter(page);

  await expect(canvas).toHaveAttribute("data-hud-layout", "final");
  await expect(canvas).toHaveAttribute("data-hp-bar-width", /\d+/);
  await expect(canvas).toHaveAttribute("data-sp-bar-width", /\d+/);
  await expect(canvas).toHaveAttribute("data-xp-bar", "visible");
  await expect(canvas).toHaveAttribute("data-hotbar-icon-labels", /1:PS/);
  await expect(canvas).toHaveAttribute("data-minimap-visible", "true");
  await expect(canvas).toHaveAttribute("data-minimap-shape", /town/);
  await expect(canvas).toHaveAttribute("data-minimap-markers", /player/);
  await expect(canvas).toHaveAttribute("data-minimap-markers", /portal:crownfield-meadows/);

  await canvas.hover({ position: { x: 264, y: 542 } });
  await expect(canvas).toHaveAttribute("data-tooltip", "visible");
  await expect(canvas).toHaveAttribute("data-tooltip-text", /Power Slash/);
  await expect(canvas).toHaveAttribute("data-tooltip-bounds", /\d+,\d+,238,\d+/);

  await page.keyboard.press("KeyM");
  await expect(canvas).toHaveAttribute("data-minimap-visible", "false");
  await page.keyboard.press("KeyM");
  await expect(canvas).toHaveAttribute("data-minimap-visible", "true");

  await page.keyboard.press("KeyO");
  await expect(canvas).toHaveAttribute("data-ui-panel", "worldMap");
  await expect(canvas).toHaveAttribute("data-world-map-panel", "visible");
  await expect(canvas).toHaveAttribute("data-world-map-regions", /crownfield:1-15/);
  await expect(canvas).toHaveAttribute("data-world-map-current-location", "crownfield-town");
  await expect(canvas).toHaveAttribute("data-world-map-discovered-maps", /crownfield-town/);
  await expect(canvas).toHaveAttribute("data-world-map-fast-travel", /crownfield-town/);
  await expect(canvas).toHaveAttribute("data-world-map-buttons", "Close");
});

test("active player effects show in right-side HUD tray", async ({ page }) => {
  await page.route("**/assets/data/classes.json", async (route) => {
    const response = await route.fetch();
    const classes = await response.json() as Array<Record<string, unknown>>;

    await route.fulfill({
      response,
      json: classes.map((playerClass) => playerClass.id === "swordsman"
        ? {
          ...playerClass,
          startingSkillIds: ["power-slash", "guard-stance"],
        }
        : playerClass),
    });
  });
  await page.route("**/assets/data/skills.json", async (route) => {
    const response = await route.fetch();
    const skills = await response.json() as Array<Record<string, unknown>>;

    await route.fulfill({
      response,
      json: skills.map((skill) => skill.id === "guard-stance"
        ? {
          ...skill,
          cooldown: 0,
        }
        : skill),
    });
  });
  await startApp(page);

  const canvas = await confirmDefaultCharacter(page);

  await expect(canvas).toHaveAttribute("data-hotbar-assignments", /2:skill:guard-stance/);
  await page.keyboard.press("Digit2");
  await expect.poll(async () => await canvas.getAttribute("data-active-effect-icons")).toContain("guard-stance");
  await expect(canvas).toHaveAttribute("data-active-effect-labels", /GS/);
  await expect(canvas).toHaveAttribute("data-active-effect-count", "1");

  await canvas.hover({ position: { x: 748, y: 120 } });
  await expect(canvas).toHaveAttribute("data-tooltip", "visible");
  await expect(canvas).toHaveAttribute("data-tooltip-text", /Guard Stance/);

  await page.keyboard.press("Digit2");
  await expect.poll(async () => await canvas.getAttribute("data-active-effect-icons")).not.toContain("guard-stance");
  await expect(canvas).toHaveAttribute("data-active-effect-count", "0");
});

test("bestiary opens with B, filters entries, and shows partial monster knowledge", async ({ page }) => {
  await startApp(page);

  const canvas = await confirmDefaultCharacter(page);

  await page.keyboard.press("KeyB");
  await expect(canvas).toHaveAttribute("data-ui-panel", "bestiary");
  await expect(canvas).toHaveAttribute("data-bestiary-panel", "visible");
  await expect(canvas).toHaveAttribute("data-bestiary-entry-count", /\d+/);
  await expect(canvas).toHaveAttribute("data-bestiary-groups", /crownfield\//);
  await expect(canvas).toHaveAttribute("data-selected-bestiary-monster", /\w/);
  await expect(canvas).toHaveAttribute("data-selected-bestiary-monster-name", "Unknown monster");
  await expect(canvas).toHaveAttribute("data-selected-bestiary-kills", "0");
  await expect(canvas).toHaveAttribute("data-selected-bestiary-drops", "");
  await expect(canvas).toHaveAttribute("data-bestiary-buttons", "Close");

  await page.keyboard.type("hopper");
  await expect(canvas).toHaveAttribute("data-bestiary-search", "hopper");
  await expect(canvas).toHaveAttribute("data-bestiary-entry-count", "1");
  await expect(canvas).toHaveAttribute("data-selected-bestiary-monster", "field-hopper");

  await page.keyboard.press("Escape");
  await expect(canvas).toHaveAttribute("data-ui-panel", "closed");
});

test("hunting board lists regional contracts and accepts one active contract", async ({ page }) => {
  await startApp(page);

  const canvas = await confirmDefaultCharacter(page);

  await page.keyboard.press("KeyH");
  await expect(canvas).toHaveAttribute("data-ui-panel", "huntingBoard");
  await expect(canvas).toHaveAttribute("data-hunting-board-panel", "visible");
  await expect(canvas).toHaveAttribute("data-hunting-board-region", "crownfield");
  await expect(canvas).toHaveAttribute("data-hunting-board-contract-count", "7");
  await expect(canvas).toHaveAttribute("data-hunting-board-contracts", /crownfield-hunt-1-green-jelly:available:0\/3/);
  await expect(canvas).toHaveAttribute("data-hunting-board-contracts", /crownfield-boss-sewer-glutton:locked:0\/1/);
  await expect(canvas).toHaveAttribute("data-selected-hunting-contract", "crownfield-hunt-1-green-jelly");
  await expect(canvas).toHaveAttribute("data-selected-hunting-contract-status", "available");
  await expect(canvas).toHaveAttribute("data-selected-hunting-contract-progress", "0/3");
  await expect(canvas).toHaveAttribute("data-selected-hunting-contract-reward", /xp:\d+\|gold:\d+\|items:jelly-gel:1/);
  await expect(canvas).toHaveAttribute("data-hunting-board-buttons", "Accept|Turn In|Rest|Close");

  await canvas.click({ position: { x: 526, y: 466 } });
  await expect(canvas).toHaveAttribute("data-last-hunting-board-action", "accept:crownfield-hunt-1-green-jelly");
  await expect(canvas).toHaveAttribute("data-selected-hunting-contract-status", "active");
  await expect(canvas).toHaveAttribute("data-hunting-board-active-contracts", "crownfield-hunt-1-green-jelly");

  await canvas.click({ position: { x: 526, y: 512 } });
  await expect(canvas).toHaveAttribute("data-last-hunting-board-action", "refresh-failed:active-contract");

  await page.keyboard.press("Escape");
  await expect(canvas).toHaveAttribute("data-ui-panel", "closed");
});

test("quest log opens with L and tracks campaign quest state", async ({ page }) => {
  await startApp(page);

  const canvas = await confirmDefaultCharacter(page);

  await page.keyboard.press("KeyL");
  await expect(canvas).toHaveAttribute("data-ui-panel", "questLog");
  await expect(canvas).toHaveAttribute("data-quest-log-panel", "visible");
  await expect(canvas).toHaveAttribute("data-quest-count", "5");
  await expect(canvas).toHaveAttribute("data-selected-quest", "act1-crownfield-first-steps");
  await expect(canvas).toHaveAttribute("data-selected-quest-status", "available");
  await expect(canvas).toHaveAttribute("data-selected-quest-objectives", /enter-meadows:0\/1/);
  await expect(canvas).toHaveAttribute("data-selected-quest-hints", /Crownfield Meadows/);
  await expect(canvas).toHaveAttribute("data-quest-log-buttons", "Accept|Complete|Close");

  await canvas.click({ position: { x: 526, y: 466 } });
  await expect(canvas).toHaveAttribute("data-last-quest-action", "accepted:act1-crownfield-first-steps");
  await expect(canvas).toHaveAttribute("data-active-quests", "act1-crownfield-first-steps");
  await expect(canvas).toHaveAttribute("data-selected-quest-status", "active");

  await canvas.click({ position: { x: 626, y: 466 } });
  await expect(canvas).toHaveAttribute("data-last-quest-action", "complete-failed");
});

test("crafting screen lists recipes, shows missing materials, and blocks unavailable crafts", async ({ page }) => {
  await startApp(page);

  const canvas = await confirmDefaultCharacter(page);
  const startX = Number(await canvas.getAttribute("data-player-x"));

  await page.keyboard.press("KeyR");
  await expect(canvas).toHaveAttribute("data-ui-panel", "crafting");
  await expect(canvas).toHaveAttribute("data-gameplay-input-blocked", "true");
  await expect(canvas).toHaveAttribute("data-crafting-panel", "visible");
  await expect(canvas).toHaveAttribute("data-active-crafting-npc", "nima-threadwell");
  await expect(canvas).toHaveAttribute("data-crafting-recipe-count", /\d+/);
  await expect(canvas).toHaveAttribute("data-visible-recipes", /recipe-/);
  await expect(canvas).toHaveAttribute("data-selected-recipe", /recipe-/);
  await expect(canvas).toHaveAttribute("data-selected-recipe-output", /.+/);
  await expect(canvas).toHaveAttribute("data-selected-recipe-can-craft", "false");
  await expect(canvas).toHaveAttribute("data-selected-recipe-block-reason", "missing-materials");
  await expect(canvas).toHaveAttribute("data-selected-recipe-missing-materials", /:/);
  await expect(canvas).toHaveAttribute("data-crafting-buttons", "Craft|Close");

  await canvas.click({ position: { x: 524, y: 468 } });
  await expect(canvas).toHaveAttribute("data-last-crafting-action", /craft-failed:missing-materials:recipe-/);

  await canvas.click({ position: { x: 560, y: 300 } });
  await page.waitForTimeout(150);
  expect(Number(await canvas.getAttribute("data-player-x"))).toBeCloseTo(startX, 1);
});

test("settings panel applies accessibility scale and gameplay presets immediately", async ({ page }) => {
  await startApp(page);

  const canvas = await confirmDefaultCharacter(page);

  await page.keyboard.press("Escape");
  await expect(canvas).toHaveAttribute("data-ui-panel", "settings");
  await expect(canvas).toHaveAttribute("data-settings-panel", "visible");
  await expect(canvas).toHaveAttribute("data-settings-buttons", /UI.*Damage.*Difficulty.*Text/);
  await expect(canvas).toHaveAttribute("data-rarity-readable-mode", "color+label");
  await expect(canvas).toHaveAttribute("data-element-readable-mode", "label+icon");
  await expect(canvas).toHaveAttribute("data-warning-readable-mode", "shape+text");
  await expect(canvas).toHaveAttribute("data-ui-contrast", "acceptable");

  await canvas.click({ position: { x: 148, y: 267 } });
  await expect(canvas).toHaveAttribute("data-settings-ui-scale", "1.25");
  await canvas.click({ position: { x: 280, y: 267 } });
  await expect(canvas).toHaveAttribute("data-settings-damage-numbers", "false");
  await canvas.click({ position: { x: 318, y: 385 } });
  await expect(canvas).toHaveAttribute("data-settings-difficulty", "Veteran");
  await canvas.click({ position: { x: 160, y: 385 } });
  await expect(canvas).toHaveAttribute("data-settings-auto-potion", "false");
  await expect(canvas).toHaveAttribute("data-settings-summary", /ui:125.*damage:false.*autoPotion:false.*difficulty:Veteran/);

  await page.keyboard.press("KeyS");
  await expect(canvas).toHaveAttribute("data-last-manual-save-status", "saved");
  const savedSlot = await page.evaluate(() => localStorage.getItem("prok-save-slot-1"));
  expect(savedSlot).toContain("\"uiScale\":1.25");
  expect(savedSlot).toContain("\"difficulty\":\"Veteran\"");
  expect(savedSlot).toContain("\"autoPotionEnabled\":false");

  await page.keyboard.press("Escape");
  await expect(canvas).toHaveAttribute("data-ui-panel", "closed");
  await expect(canvas).toHaveAttribute("data-settings-panel", "hidden");

  await page.keyboard.press("KeyI");
  await expect(canvas).toHaveAttribute("data-ui-panel", "inventory");
  await page.keyboard.press("Escape");
  await expect(canvas).toHaveAttribute("data-ui-panel", "closed");
  await expect(canvas).toHaveAttribute("data-inventory-panel", "hidden");
});
