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
  await expect(canvas).toHaveAttribute("data-current-map", "crownfield-meadows");
  await expect(canvas).toHaveAttribute("data-current-map-name", "Crownfield Meadows");
  await expect(canvas).toHaveAttribute("data-character-archetype", "swordsman");
  await expect(canvas).toHaveAttribute("data-spawned-monster", "green-jelly");
  await expect(canvas).toHaveAttribute("data-spawned-monster-name", "Green Jelly");
  await expect(canvas).toHaveAttribute("data-tilemap-key", "map-crownfield-meadows");
  await expect(canvas).toHaveAttribute("data-tilemap-layers", "Ground|Decoration|Collision|Objects");
  await expect(canvas).toHaveAttribute("data-tilemap-size", "25x19");
  await expect(canvas).toHaveAttribute("data-spawn-point", "400,304");
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
  await expect(canvas).toHaveAttribute("data-player-stat-points", "0");
  await expect(canvas).toHaveAttribute("data-player-skill-points", "0");
  await expect(canvas).toHaveAttribute("data-player-class", "swordsman");
  await expect(canvas).toHaveAttribute("data-inventory-item", "training-sword");
  await expect(canvas).toHaveAttribute("data-inventory-item-name", "Training Sword");
  await expect(canvas).toHaveAttribute("data-inventory-gold", "0");
  await expect(canvas).toHaveAttribute("data-inventory-stack-count", "1");
  await expect(canvas).toHaveAttribute("data-equipment-instance-count", "0");
  await expect(canvas).toHaveAttribute("data-skill", "power-slash");
  await expect(canvas).toHaveAttribute("data-skill-name", "Power Slash");
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

  await canvas.click({ position: { x: 400, y: 190 } });
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
  await expect(canvas).toHaveAttribute("data-player-animation-state", "idle-right");
  await expect(canvas).toHaveAttribute("data-movement-marker", "hidden");
});

test("world supports target selection and auto-attack combat", async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 600 });
  await page.goto("/");

  const canvas = await confirmDefaultCharacter(page);
  await expect(canvas).toHaveAttribute("data-spawned-monster", "green-jelly");
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
