import { expect, test, type Page } from "@playwright/test";

async function openCharacterCreation(page: Page) {
  const canvas = page.locator("canvas");

  await expect(canvas).toHaveAttribute("data-scene", "main-menu");
  await canvas.click({ position: { x: 400, y: 258 } });
  await expect(canvas).toHaveAttribute("data-scene", "character-creation");

  return canvas;
}

async function confirmDefaultCharacter(page: Page) {
  const canvas = await openCharacterCreation(page);

  await canvas.click({ position: { x: 630, y: 545 } });
  await expect(canvas).toHaveAttribute("data-scene", "world");

  return canvas;
}

async function enterMeadows(page: Page) {
  const canvas = await confirmDefaultCharacter(page);

  await canvas.click({ position: { x: 760, y: 304 } });
  await expect.poll(async () => await canvas.getAttribute("data-current-map"), { timeout: 6000 }).toBe("crownfield-meadows");

  return canvas;
}

test("loads the app shell", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle("Prok");
  await expect(page.locator("#app")).toHaveAttribute("data-ready", "true");
  await expect(page.locator("canvas")).toHaveAttribute("data-scene", "main-menu");
  await expect(page.locator("canvas")).toHaveAttribute("data-menu-buttons", "Start Game|Options");
});

test("main menu buttons respond to pointer input", async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 600 });
  await page.goto("/");

  const canvas = page.locator("canvas");
  await expect(canvas).toHaveAttribute("data-scene", "main-menu");

  await canvas.hover({ position: { x: 400, y: 258 } });
  await expect(canvas).toHaveAttribute("data-active-button", "Start Game");

  const bounds = await canvas.boundingBox();
  expect(bounds).not.toBeNull();

  await page.mouse.move(bounds!.x + 400, bounds!.y + 342);
  await expect(canvas).toHaveAttribute("data-active-button", "Options");

  await page.mouse.down();
  await expect(canvas).toHaveAttribute("data-pressed-button", "Options");

  await page.mouse.up();
  await expect(canvas).not.toHaveAttribute("data-pressed-button", "Options");

  await expect(canvas).toBeVisible();
});

test("new game flows from main menu to world with ui state", async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 600 });
  await page.goto("/");

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
  await expect(canvas).toHaveAttribute("data-npc-service-types", "inn|storage|merchant|refiner|crafter|healer|travel|hunter-board");
  await expect(canvas).toHaveAttribute("data-portal-count", "1");
  await expect(canvas).toHaveAttribute("data-safe-zone", "town");
  await expect(canvas).toHaveAttribute("data-monster-spawn-zone-count", "0");
  await expect(canvas).toHaveAttribute("data-collision-layer-enabled", "true");
  await expect(canvas).toHaveAttribute("data-ui-scene", "running");
  await expect(canvas).toHaveAttribute("data-player-hp", "30/30");
  await expect(canvas).toHaveAttribute("data-player-sp", "8/8");
  await expect(canvas).toHaveAttribute("data-player-xp", "0");
  await expect(canvas).toHaveAttribute("data-player-xp-next", "100");
  await expect(canvas).toHaveAttribute("data-xp-bar", "visible");
  await expect(canvas).toHaveAttribute("data-xp-bar-width", "0");
  await expect(canvas).toHaveAttribute("data-player-level", "1");
  await expect(canvas).toHaveAttribute("data-player-gold", "0");
  await expect(canvas).toHaveAttribute("data-hud-visible", "true");
  await expect(canvas).toHaveAttribute("data-hotbar-visible", "true");
  await expect(canvas).toHaveAttribute("data-hotbar-slots", "1|2|3|4|5|6");
  await expect(canvas).toHaveAttribute("data-player-stat-points", "0");
  await expect(canvas).toHaveAttribute("data-player-skill-points", "0");
  await expect(canvas).toHaveAttribute("data-player-class", "swordsman");
  await expect(canvas).toHaveAttribute("data-player-attack-stat", "8");
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

test("world ui hotkeys show inventory, equipment, comparison, and block gameplay clicks", async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 600 });
  await page.goto("/");

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
  await expect(canvas).toHaveAttribute("data-item-comparison-text", /requirements=None\|effects=None/);

  await canvas.click({ position: { x: 560, y: 300 } });
  await page.waitForTimeout(150);
  expect(Number(await canvas.getAttribute("data-player-x"))).toBeCloseTo(startX, 1);

  await page.keyboard.press("Escape");
  await expect(canvas).toHaveAttribute("data-ui-panel", "closed");
  await expect(canvas).toHaveAttribute("data-gameplay-input-blocked", "false");

  await page.keyboard.press("KeyC");
  await expect(canvas).toHaveAttribute("data-ui-panel", "equipment");
  await expect(canvas).toHaveAttribute("data-equipment-panel", "visible");
  await expect(canvas).toHaveAttribute(
    "data-equipment-slots-visible",
    "weapon|offhand|head|body|cloak|boots|accessory1|accessory2|sigil|supportCharm",
  );
  await expect(canvas).toHaveAttribute("data-player-attack-stat", "8");

  await canvas.click({ position: { x: 140, y: 466 } });
  await expect(canvas).toHaveAttribute("data-last-equipment-action", "remove:weapon");
  await expect(canvas).toHaveAttribute("data-equipment-weapon", "");
  await expect(canvas).toHaveAttribute("data-player-attack-stat", "6");

  await page.keyboard.press("KeyI");
  await expect(canvas).toHaveAttribute("data-ui-panel", "inventory");
  await canvas.click({ position: { x: 540, y: 446 } });
  await expect(canvas).toHaveAttribute("data-last-inventory-action", "equip:training-sword");
  await expect(canvas).toHaveAttribute("data-equipment-weapon", "training-sword");
  await expect(canvas).toHaveAttribute("data-player-attack-stat", "8");
});

test("town NPCs can be clicked to open blocking placeholder service dialogue", async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 600 });
  await page.goto("/");

  const canvas = await confirmDefaultCharacter(page);
  await expect(canvas).toHaveAttribute("data-npc-names", "Maela Hearth|Borin Lockbar|Tessa Vale|Orun Brightslag|Nima Threadwell|Sella Greenward|Joric Wayfare|Perrin Slate");
  await expect(canvas).toHaveAttribute("data-dialogue-state", "closed");

  await canvas.click({ position: { x: 304, y: 240 } });
  await expect(canvas).toHaveAttribute("data-last-clicked-npc", "maela-hearth");
  await expect(canvas).toHaveAttribute("data-last-clicked-npc-service-type", "inn");
  await expect.poll(async () => await canvas.getAttribute("data-dialogue-state"), { timeout: 6000 }).toBe("open");
  await expect(canvas).toHaveAttribute("data-dialogue-npc-name", "Maela Hearth");
  await expect(canvas).toHaveAttribute("data-dialogue-id", "maela-hearth-greeting");
  await expect(canvas).toHaveAttribute("data-dialogue-service-type", "inn");
  await expect(canvas).toHaveAttribute("data-dialogue-text", "Fresh linen, warm soup, and a bed that does not ask questions. That is my promise.");
  await expect(canvas).toHaveAttribute("data-dialogue-choice-labels", "Rest at the inn");
  await expect(canvas).toHaveAttribute("data-dialogue-choice-disabled", "true");
  await expect(canvas).toHaveAttribute("data-dialogue-blocking-movement", "true");

  const blockedX = Number(await canvas.getAttribute("data-player-x"));
  await canvas.click({ position: { x: 560, y: 300 } });
  await page.waitForTimeout(150);
  expect(Number(await canvas.getAttribute("data-player-x"))).toBeCloseTo(blockedX, 1);

  await canvas.click({ position: { x: 650, y: 550 } });
  await expect(canvas).toHaveAttribute("data-dialogue-line-index", "1");
  await expect(canvas).toHaveAttribute("data-dialogue-text", "The inn rooms are being aired out for new arrivals.");
  await canvas.click({ position: { x: 650, y: 550 } });
  await expect(canvas).toHaveAttribute("data-dialogue-state", "closed");
  await expect(canvas).toHaveAttribute("data-dialogue-blocking-movement", "false");
});

test("character creation accepts name input and class selection", async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 600 });
  await page.goto("/");

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
  await expect(canvas).toHaveAttribute("data-starting-skill", "ember-bolt");
  await expect(canvas).toHaveAttribute("data-starting-skill-name", "Ember Bolt");
  await expect(canvas).toHaveAttribute("data-difficulty-rating", "Hard");
  await expect(canvas).toHaveAttribute("data-advanced-class-options", "Elementalist|Chronomancer");

  await canvas.click({ position: { x: 630, y: 545 } });
  await expect(canvas).toHaveAttribute("data-scene", "world");
  await expect(canvas).toHaveAttribute("data-character-archetype", "mage");
  await expect(canvas).toHaveAttribute("data-player-hp", "22/22");
  await expect(canvas).toHaveAttribute("data-player-sp", "18/18");
  await expect(canvas).toHaveAttribute("data-player-class", "mage");
  await expect(canvas).toHaveAttribute("data-inventory-item", "apprentice-staff");
  await expect(canvas).toHaveAttribute("data-inventory-item-name", "Apprentice Staff");
  await expect(canvas).toHaveAttribute("data-skill", "ember-bolt");
  await expect(canvas).toHaveAttribute("data-skill-name", "Ember Bolt");
});

test("world supports mouse click player movement without WASD movement", async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 600 });
  await page.goto("/");

  const canvas = await confirmDefaultCharacter(page);
  await expect(canvas).toHaveAttribute("data-player-character-id", "player");
  await expect(canvas).toHaveAttribute("data-player-has-collision-body", "true");
  await expect(canvas).toHaveAttribute("data-camera-following-player", "true");
  await expect(canvas).toHaveAttribute("data-player-animation-state", "idle-down");
  await expect(canvas).toHaveAttribute("data-wasd-movement", "disabled");

  const startX = Number(await canvas.getAttribute("data-player-x"));
  const startY = Number(await canvas.getAttribute("data-player-y"));

  await page.keyboard.press("KeyD");
  await page.waitForTimeout(100);
  expect(Number(await canvas.getAttribute("data-player-x"))).toBeCloseTo(startX, 1);
  expect(Number(await canvas.getAttribute("data-player-y"))).toBeCloseTo(startY, 1);
  await expect(canvas).toHaveAttribute("data-player-destination", "");

  await canvas.click({ position: { x: 160, y: 128 } });
  await expect(canvas).toHaveAttribute("data-last-movement-click-valid", "false");
  await expect(canvas).toHaveAttribute("data-movement-marker", "hidden");
  await expect(canvas).toHaveAttribute("data-player-destination", "");

  await canvas.click({ position: { x: 560, y: 300 } });
  await expect(canvas).toHaveAttribute("data-last-movement-click-valid", "true");
  await expect(canvas).toHaveAttribute("data-movement-marker", "visible");
  await expect.poll(async () => Number(await canvas.getAttribute("data-last-path-length"))).toBeGreaterThan(1);
  await expect(canvas).toHaveAttribute("data-player-motion-state", "walk");
  await expect(canvas).toHaveAttribute("data-player-direction", "right");
  await expect(canvas).toHaveAttribute("data-player-animation-state", "walk-right");

  await expect.poll(async () => Number(await canvas.getAttribute("data-player-x"))).toBeGreaterThan(startX + 80);
  await expect.poll(async () => await canvas.getAttribute("data-player-destination")).toBe("");
  await expect(canvas).toHaveAttribute("data-player-motion-state", "idle");
  await expect(canvas).toHaveAttribute("data-player-animation-state", /idle-/);
  await expect(canvas).toHaveAttribute("data-movement-marker", "hidden");
});

test("world supports target selection and auto-attack combat", async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 600 });
  await page.goto("/");

  const canvas = await enterMeadows(page);
  await expect(canvas).toHaveAttribute("data-spawned-monster", "green-jelly");
  await expect(canvas).toHaveAttribute("data-current-map-name", "Crownfield Meadows");
  await expect(canvas).toHaveAttribute("data-spawn-name", "TownGateSpawn");
  await expect(canvas).toHaveAttribute("data-last-autosave-slot", "0");
  await expect(canvas).toHaveAttribute("data-last-autosave-map", "crownfield-meadows");
  await expect(canvas).toHaveAttribute("data-monster-spawn-zone-count", "1");
  await expect(canvas).toHaveAttribute("data-gathering-spot-count", "1");
  await expect(canvas).toHaveAttribute("data-treasure-spot-count", "1");
  await expect(canvas).toHaveAttribute("data-enemy-hp", "10/10");
  await expect(canvas).toHaveAttribute("data-target-frame", "hidden");

  await canvas.click({ position: { x: 528, y: 300 } });
  await expect(canvas).toHaveAttribute("data-enemy-selected", "true");
  await expect(canvas).toHaveAttribute("data-target-frame", "visible");
  await expect(canvas).toHaveAttribute("data-target-enemy-id", "green-jelly");
  await expect(canvas).toHaveAttribute("data-target-enemy-name", "Green Jelly");
  await expect(canvas).toHaveAttribute("data-auto-attack", /moving-to-range|attacking/);

  await expect.poll(async () => await canvas.getAttribute("data-enemy-hp")).not.toBe("10/10");
  await expect.poll(async () => await canvas.getAttribute("data-last-combat-formula")).toContain("weapon=2");
  await expect.poll(async () => await canvas.getAttribute("data-enemy-alive"), { timeout: 6000 }).toBe("false");
  await expect(canvas).toHaveAttribute("data-enemy-hp", "0/10");
  await expect(canvas).toHaveAttribute("data-auto-attack", "stopped");
  await expect(canvas).toHaveAttribute("data-target-frame", "hidden");
  await expect(canvas).toHaveAttribute("data-player-xp", "5");
  await expect(canvas).toHaveAttribute("data-last-xp-gain", "5");
  await expect(canvas).toHaveAttribute("data-player-level", "1");
  await expect(canvas).toHaveAttribute("data-xp-bar-width", "9");
  await expect(canvas).toHaveAttribute("data-pending-loot-count", "2");
  await expect(canvas).toHaveAttribute("data-last-loot-drop", /gold:[3-5]/);

  await canvas.click({ position: { x: 528, y: 322 } });
  await expect(canvas).toHaveAttribute("data-pending-loot-count", "1");
  await expect(canvas).toHaveAttribute("data-last-loot-pickup", /jelly-gel:[1-2]/);
  await expect(canvas).toHaveAttribute("data-inventory-stack-count", "2");

  await canvas.click({ position: { x: 556, y: 322 } });
  await expect(canvas).toHaveAttribute("data-pending-loot-count", "0");
  await expect(canvas).toHaveAttribute("data-last-loot-pickup", /gold:[3-5]/);
  await expect.poll(async () => Number(await canvas.getAttribute("data-player-gold"))).toBeGreaterThan(0);
  await expect.poll(async () => Number(await canvas.getAttribute("data-inventory-gold"))).toBeGreaterThan(0);
});

test("world portals connect town and field", async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 600 });
  await page.goto("/");

  const canvas = await enterMeadows(page);

  await expect(canvas).toHaveAttribute("data-current-map", "crownfield-meadows");
  await expect(canvas).toHaveAttribute("data-current-map-name", "Crownfield Meadows");
  await expect(canvas).toHaveAttribute("data-spawn-point", "80,304");
  await expect(canvas).toHaveAttribute("data-spawn-name", "TownGateSpawn");
  await expect(canvas).toHaveAttribute("data-safe-zone", "field-entrance");
  await expect(canvas).toHaveAttribute("data-last-transition", "TownEastGate:crownfield-meadows:TownGateSpawn");

  await canvas.click({ position: { x: 20, y: 304 } });
  await expect.poll(async () => await canvas.getAttribute("data-current-map"), { timeout: 6000 }).toBe("crownfield-town");
  await expect(canvas).toHaveAttribute("data-current-map-name", "Crownfield");
  await expect(canvas).toHaveAttribute("data-spawn-point", "704,304");
  await expect(canvas).toHaveAttribute("data-spawn-name", "FieldRoadReturn");
  await expect(canvas).toHaveAttribute("data-spawned-monster", "");
  await expect(canvas).toHaveAttribute("data-last-autosave-map", "crownfield-town");
});
