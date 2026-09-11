import { expect, test } from "@playwright/test";
import { openCharacterCreation, startApp } from "./helpers";

test("new game flows from character creation to world with ui state", async ({ page }) => {
  await startApp(page);

  const canvas = page.locator("canvas");
  await openCharacterCreation(page);
  await expect(canvas).toHaveAttribute("data-class-options", "swordsman|mage|archer|thief");
  await expect(canvas).toHaveAttribute("data-selected-class", "swordsman");
  await expect(canvas).toHaveAttribute("data-character-name", "Adventurer");
  await expect(canvas).toHaveAttribute("data-stat-preset", "hp:30|sp:8|attack:6|defense:4");
  await expect(canvas).toHaveAttribute("data-starting-weapon", "training-sword");
  await expect(canvas).toHaveAttribute("data-starting-skill", "power-slash");
  await expect(canvas).toHaveAttribute("data-difficulty-rating", "Easy");

  await canvas.click({ position: { x: 630, y: 545 } });
  await expect(canvas).toHaveAttribute("data-scene", "world");
  await expect(canvas).toHaveAttribute("data-current-map", "crownfield-town");
  await expect(canvas).toHaveAttribute("data-current-map-name", "Crownfield");
  await expect(canvas).toHaveAttribute("data-character-archetype", "swordsman");
  await expect(canvas).toHaveAttribute("data-spawned-monster", "");
  await expect(canvas).toHaveAttribute("data-spawned-monster-name", "");
  await expect(canvas).toHaveAttribute("data-tilemap-key", "map-crownfield-town");
  await expect(canvas).toHaveAttribute("data-tilemap-layers", "Ground|Decoration|Collision|Objects");
  await expect(canvas).toHaveAttribute("data-tilemap-size", "25x19");
  await expect(canvas).toHaveAttribute("data-spawn-point", "240,304");
  await expect(canvas).toHaveAttribute("data-spawn-name", "PlayerSpawn");
  await expect(canvas).toHaveAttribute("data-npc-count", "8");
  await expect(canvas).toHaveAttribute("data-npc-entity-count", "8");
  await expect(canvas).toHaveAttribute("data-npc-service-types", "inn|storage|merchant|refiner|crafter|stat-reset|travel|hunter-board");
  await expect(canvas).toHaveAttribute("data-portal-count", "1");
  await expect(canvas).toHaveAttribute("data-safe-zone", "town");
  await expect(canvas).toHaveAttribute("data-monster-spawn-zone-count", "0");
  await expect(canvas).toHaveAttribute("data-collision-layer-enabled", "true");
  await expect(canvas).toHaveAttribute("data-ui-scene", "running");
  await expect(canvas).toHaveAttribute("data-player-hp", "30/73");
  await expect(canvas).toHaveAttribute("data-player-sp", "8/24");
  await expect(canvas).toHaveAttribute("data-player-xp", "0");
  await expect(canvas).toHaveAttribute("data-player-xp-next", "100");
  await expect(canvas).toHaveAttribute("data-xp-bar", "visible");
  await expect(canvas).toHaveAttribute("data-xp-bar-width", "0");
  await expect(canvas).toHaveAttribute("data-player-level", "1");
  await expect(canvas).toHaveAttribute("data-player-gold", "0");
  await expect(canvas).toHaveAttribute("data-hud-visible", "true");
  await expect(canvas).toHaveAttribute("data-hotbar-visible", "true");
  await expect(canvas).toHaveAttribute("data-hotbar-slots", "1|2|3|4|5|6|7|8");
  await expect(canvas).toHaveAttribute("data-hotbar-assignments", "1:skill:power-slash|2:item:minor-health-potion");
  await expect(canvas).toHaveAttribute("data-player-stat-points", "0");
  await expect(canvas).toHaveAttribute("data-player-skill-points", "0");
  await expect(canvas).toHaveAttribute("data-player-class", "swordsman");
  await expect(canvas).toHaveAttribute(
    "data-class-skills",
    "power-slash|guard-stance|iron-body|sweeping-cut|battle-cry|endure-pain|weapon-training|counter-blow",
  );
  await expect(canvas).toHaveAttribute("data-learned-skills", "power-slash:1");
  await expect(canvas).toHaveAttribute("data-player-attack-stat", "29");
  await expect(canvas).toHaveAttribute("data-player-base-stats", "str:8|agi:5|vit:7|int:3|dex:5|luk:4");
  await expect(canvas).toHaveAttribute("data-player-allocated-stats", "str:0|agi:0|vit:0|int:0|dex:0|luk:0");
  await expect(canvas).toHaveAttribute("data-player-derived-stats", /maxHp:73\|maxSp:24\|physicalAttack:29/);
  await expect(canvas).toHaveAttribute("data-inventory-item", "training-sword");
  await expect(canvas).toHaveAttribute("data-inventory-item-name", "Training Sword");
  await expect(canvas).toHaveAttribute("data-inventory-gold", "0");
  await expect(canvas).toHaveAttribute("data-inventory-stack-count", "1");
  await expect(canvas).toHaveAttribute("data-equipment-instance-count", "0");
  await expect(canvas).toHaveAttribute("data-equipment-weapon", "training-sword");
  await expect(canvas).toHaveAttribute(
    "data-equipment-slots",
    "weapon:training-sword|offhand:empty|head:empty|body:empty|cloak:empty|boots:empty|accessory1:empty|accessory2:empty|sigil:empty|supportCharm:empty",
  );
  await expect(canvas).toHaveAttribute("data-skill", "power-slash");
  await expect(canvas).toHaveAttribute("data-skill-name", "Power Slash");
});

test("character creation accepts name input and class selection", async ({ page }) => {
  await startApp(page);

  const canvas = await openCharacterCreation(page);

  await canvas.click({ position: { x: 120, y: 140 } });
  await expect(canvas).toHaveAttribute("data-name-input-active", "true");
  await page.keyboard.press(process.platform === "darwin" ? "Meta+A" : "Control+A");
  await page.keyboard.type("Lyra", { delay: 80 });
  await expect(canvas).toHaveAttribute("data-character-name", "Lyra");

  await canvas.click({ position: { x: 320, y: 270 } });
  await expect(canvas).toHaveAttribute("data-selected-class", "mage");
  await expect(canvas).toHaveAttribute("data-selected-class-name", "Mage");
  await expect(canvas).toHaveAttribute("data-stat-preset", "hp:22|sp:18|attack:8|defense:2");
  await expect(canvas).toHaveAttribute("data-class-role", "High SP ranged caster with fragile defenses.");
  await expect(canvas).toHaveAttribute("data-recommended-stats", "SP|Attack|HP");
  await expect(canvas).toHaveAttribute("data-starting-weapon", "apprentice-staff");
  await expect(canvas).toHaveAttribute("data-starting-weapon-name", "Apprentice Staff");
  await expect(canvas).toHaveAttribute("data-starting-skill", "fire-bolt");
  await expect(canvas).toHaveAttribute("data-starting-skill-name", "Fire Bolt");
  await expect(canvas).toHaveAttribute("data-difficulty-rating", "Hard");
  await expect(canvas).toHaveAttribute("data-advanced-class-options", "Wizard|Sage");

  await canvas.click({ position: { x: 630, y: 545 } });
  await expect(canvas).toHaveAttribute("data-scene", "world");
  await expect(canvas).toHaveAttribute("data-character-archetype", "mage");
  await expect(canvas).toHaveAttribute("data-player-hp", "22/45");
  await expect(canvas).toHaveAttribute("data-player-sp", "18/49");
  await expect(canvas).toHaveAttribute("data-player-class", "mage");
  await expect(canvas).toHaveAttribute("data-inventory-item", "apprentice-staff");
  await expect(canvas).toHaveAttribute("data-inventory-item-name", "Apprentice Staff");
  await expect(canvas).toHaveAttribute("data-skill", "fire-bolt");
  await expect(canvas).toHaveAttribute("data-skill-name", "Fire Bolt");
});

test("character creation explains when the name is invalid", async ({ page }) => {
  await startApp(page);

  const canvas = await openCharacterCreation(page);

  await canvas.click({ position: { x: 120, y: 140 } });
  await page.keyboard.press(process.platform === "darwin" ? "Meta+A" : "Control+A");
  await expect(canvas).toHaveAttribute("data-form-status", "invalid");
  await expect(canvas).toHaveAttribute("data-confirm-enabled", "false");
  await expect(canvas).toHaveAttribute("data-validation-message", "A name is required to begin.");

  await canvas.click({ position: { x: 630, y: 545 } });
  await expect(canvas).toHaveAttribute("data-scene", "character-creation");
});
