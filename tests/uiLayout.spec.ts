import { expect, test, type Page } from "@playwright/test";
import { confirmDefaultCharacter, enterMeadows, openCharacterCreation, startApp } from "./helpers";
import { seedLayoutSave } from "./uiLayoutFixtures";

const standardViewport = { width: 800, height: 600 };

test.describe("deterministic UI and layout states", () => {
  test.use({ viewport: standardViewport });

  test("main menu", async ({ page }) => {
    await startApp(page);
    const canvas = page.locator("canvas");

    await expect(canvas).toHaveAttribute("data-scene", "main-menu");
    await expectViewport(canvas, page);
    await capture(canvas, page, "main-menu");
  });

  test("character creation", async ({ page }) => {
    await startApp(page);
    const canvas = await openCharacterCreation(page);

    await expect(canvas).toHaveAttribute("data-character-creation-layout", "draft-onboarding");
    await expectViewport(canvas, page);
    await capture(canvas, page, "character-creation");
  });

  test("empty inventory", async ({ page }) => {
    await seedLayoutSave(page, {
      seedKey: "ui-layout-empty-inventory",
      name: "Empty Inventory",
      items: [],
      gold: 0,
    });
    await startApp(page);
    const canvas = await continueSeededGame(page);

    await page.keyboard.press("KeyI");
    await expect(canvas).toHaveAttribute("data-inventory-panel", "visible");
    await expect(canvas).toHaveAttribute("data-inventory-item-count", "0");
    await expectLayout(canvas, page);
    await capture(canvas, page, "inventory-empty");
  });

  test("populated inventory", async ({ page }) => {
    await seedLayoutSave(page, {
      seedKey: "ui-layout-populated-inventory",
      name: "Populated Inventory",
      items: [
        { id: "training-sword", quantity: 1 },
        { id: "minor-health-potion", quantity: 8 },
        { id: "jelly-gel", quantity: 4 },
      ],
      gold: 240,
    });
    await startApp(page);
    const canvas = await continueSeededGame(page);

    await page.keyboard.press("KeyI");
    await expect(canvas).toHaveAttribute("data-inventory-panel", "visible");
    await expect(canvas).toHaveAttribute("data-inventory-item-count", "3");
    await expect(canvas).toHaveAttribute("data-inventory-gold", "240");
    await expectLayout(canvas, page);
    await capture(canvas, page, "inventory-populated");
  });

  test("character and inventory simultaneously", async ({ page }) => {
    await startApp(page);
    const canvas = await confirmDefaultCharacter(page);

    await page.keyboard.press("KeyC");
    await expect(canvas).toHaveAttribute("data-character-panel", "visible");
    await page.keyboard.press("KeyI");
    await expect(canvas).toHaveAttribute("data-character-panel", "visible");
    await expect(canvas).toHaveAttribute("data-inventory-panel", "visible");
    await expect(canvas).toHaveAttribute("data-ui-panel", "inventory");
    await expectLayout(canvas, page);
    await capture(canvas, page, "character-inventory");
  });

  test("equipment", async ({ page }) => {
    await startApp(page);
    const canvas = await confirmDefaultCharacter(page);

    await page.keyboard.press("KeyP");
    await expect(canvas).toHaveAttribute("data-equipment-panel", "visible");
    await expect(canvas).toHaveAttribute("data-equipment-slots-visible", /weapon/);
    await expectLayout(canvas, page);
    await capture(canvas, page, "equipment");
  });

  test("skill tree", async ({ page }) => {
    await startApp(page);
    const canvas = await confirmDefaultCharacter(page);

    await page.keyboard.press("KeyK");
    await expect(canvas).toHaveAttribute("data-skill-panel", "visible");
    await expect(canvas).toHaveAttribute("data-skill-groups", "swordsman");
    await expectLayout(canvas, page);
    await capture(canvas, page, "skill-tree");
  });

  test("NPC dialogue", async ({ page }) => {
    await seedLayoutSave(page, {
      seedKey: "ui-layout-dialogue",
      name: "Dialogue Layout",
      items: [{ id: "training-sword", quantity: 1 }],
      position: { x: 304, y: 240 },
    });
    await startApp(page);
    const canvas = await continueSeededGame(page);

    await canvas.click({ position: { x: 304, y: 240 } });
    await expect(canvas).toHaveAttribute("data-dialogue-state", "open");
    await expect(canvas).toHaveAttribute("data-dialogue-npc-name", "Maela Hearth");
    await expectLayout(canvas, page);
    await capture(canvas, page, "npc-dialogue");
  });

  test("shop", async ({ page }) => {
    await seedLayoutSave(page, {
      seedKey: "ui-layout-shop",
      name: "Shop Layout",
      items: [{ id: "training-sword", quantity: 1 }, { id: "jelly-gel", quantity: 4 }],
      gold: 240,
    });
    await startApp(page);
    const canvas = await continueSeededGame(page);

    await canvas.click({ position: { x: 496, y: 336 } });
    await expect.poll(async () => await canvas.getAttribute("data-shop-panel"), { timeout: 6000 }).toBe("visible");
    await expect(canvas).toHaveAttribute("data-active-shop", "crownfield-market");
    await expectLayout(canvas, page);
    await capture(canvas, page, "shop");
  });

  test("storage", async ({ page }) => {
    await seedLayoutSave(page, {
      seedKey: "ui-layout-storage",
      name: "Storage Layout",
      items: [{ id: "training-sword", quantity: 1 }, { id: "minor-health-potion", quantity: 2 }],
      storageItems: [{ id: "minor-health-potion", quantity: 4 }, { id: "moonlit-reed", quantity: 1 }],
    });
    await startApp(page);
    const canvas = await continueSeededGame(page);

    await canvas.click({ position: { x: 400, y: 240 } });
    await expect.poll(async () => await canvas.getAttribute("data-storage-panel"), { timeout: 6000 }).toBe("visible");
    await expect(canvas).toHaveAttribute("data-active-storage-npc", "borin-lockbar");
    await expectLayout(canvas, page);
    await capture(canvas, page, "storage");
  });

  test("quest log", async ({ page }) => {
    await startApp(page);
    const canvas = await confirmDefaultCharacter(page);

    await page.keyboard.press("KeyL");
    await expect(canvas).toHaveAttribute("data-quest-log-panel", "visible");
    await expect(canvas).toHaveAttribute("data-quest-count", /\d+/);
    await expectLayout(canvas, page);
    await capture(canvas, page, "quest-log");
  });

  test("boss combat", async ({ page }) => {
    await routeBossMeadows(page);
    await startApp(page);
    const canvas = await enterMeadows(page);

    await expect(canvas).toHaveAttribute("data-enemy-traits", "boss");
    await canvas.click({ position: parsePoint(await canvas.getAttribute("data-enemy-position")) });
    await expect(canvas).toHaveAttribute("data-boss-ui", "visible");
    await expect(canvas).toHaveAttribute("data-boss-ui-phase", "1");
    await expectLayout(canvas, page);
    await capture(canvas, page, "boss-combat");
  });

  test("death screen", async ({ page }) => {
    await routeDeathMeadows(page);
    await startApp(page);
    const canvas = await enterMeadows(page);

    await expect.poll(async () => await canvas.getAttribute("data-game-over"), { timeout: 9000 }).toBe("visible");
    await expect(canvas).toHaveAttribute("data-player-combat-state", "dead");
    await expectLayout(canvas, page);
    await capture(canvas, page, "death-screen");
  });

  test("large UI scale keeps windows inside a wider viewport", async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await seedLayoutSave(page, {
      seedKey: "ui-layout-compact-scale",
      name: "Large Scale Layout",
      items: [{ id: "training-sword", quantity: 1 }, { id: "minor-health-potion", quantity: 5 }],
      uiScale: 1.25,
    });
    await page.goto("/");
    const canvas = await continueSeededGame(page);

    await page.keyboard.press("KeyI");
    await expect(canvas).toHaveAttribute("data-inventory-panel", "visible");
    await expect(canvas).toHaveAttribute("data-settings-ui-scale", "1.25");
    await expectLayout(canvas, page);
    await capture(canvas, page, "inventory-large-scale");
  });
});

async function continueSeededGame(page: Page) {
  const canvas = page.locator("canvas");
  await expect(canvas).toHaveAttribute("data-scene", "main-menu", { timeout: 10000 });
  const viewport = page.viewportSize() ?? standardViewport;
  await canvas.click({
    position: {
      x: viewport.width < 700 ? 270 : 400,
      y: viewport.height / 2 - 46,
    },
  });
  await expect(canvas).toHaveAttribute("data-scene", "world", { timeout: 15000 });
  return canvas;
}

async function expectLayout(canvas: ReturnType<Page["locator"]>, page: Page): Promise<void> {
  await expect(canvas).toHaveAttribute("data-ui-layout-overflow", "false");
  const box = await canvas.boundingBox();
  const viewport = page.viewportSize();
  expect(box).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(box?.width).toBe(viewport?.width);
  expect(box?.height).toBe(viewport?.height);
}

async function expectViewport(canvas: ReturnType<Page["locator"]>, page: Page): Promise<void> {
  const box = await canvas.boundingBox();
  const viewport = page.viewportSize();
  expect(box).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(box?.width).toBe(viewport?.width);
  expect(box?.height).toBe(viewport?.height);
}

async function capture(canvas: ReturnType<Page["locator"]>, page: Page, name: string): Promise<void> {
  await page.evaluate(() => {
    const shell = window as Window & { __phrokGame?: { loop?: { sleep(): void } } };
    shell.__phrokGame?.loop?.sleep();
  });
  await expect(canvas).toHaveScreenshot(`${name}.png`, {
    animations: "disabled",
    caret: "hide",
    // The world layer contains a seeded but animated boss sprite; keep the
    // threshold tight enough to catch layout shifts while allowing its frame.
    maxDiffPixels: name === "boss-combat" ? 16000 : 500,
    scale: "css",
  });
}

function parsePoint(raw: string | null): { x: number; y: number } {
  const [x, y] = (raw ?? "528,300").split(",").map(Number);
  return { x, y };
}

async function routeBossMeadows(page: Page): Promise<void> {
  await page.route("**/assets/maps/crownfield-meadows.json", async (route) => {
    const response = await route.fetch();
    const map = await response.json() as { layers: Array<{ name?: string; objects?: Array<Record<string, unknown>> }> };
    const objects = map.layers.find((layer) => layer.name === "Objects")?.objects ?? [];
    const monsterSpawn = objects.find((object) => object.name === "JellyGrove");
    for (const object of objects) {
      if (object.type === "monsterSpawn" && object !== monsterSpawn) object.type = "removed";
    }
    if (monsterSpawn) {
      monsterSpawn.properties = [
        { name: "monsterId", type: "string", value: "green-jelly" },
        { name: "maxCount", type: "int", value: 1 },
      ];
    }
    await route.fulfill({ response, json: map });
  });
  await page.route("**/assets/data/monsters.json", async (route) => {
    const response = await route.fetch();
    const monsters = await response.json() as Array<Record<string, unknown>>;
    await route.fulfill({
      response,
      json: monsters.map((monster) => monster.id === "green-jelly"
        ? { ...monster, name: "Crowned Jelly", boss: true, hp: 40, attack: 1, behavior: "aggressive" }
        : monster),
    });
  });
}

async function routeDeathMeadows(page: Page): Promise<void> {
  await routeBossMeadows(page);
  await page.route("**/assets/data/monsters.json", async (route) => {
    const response = await route.fetch();
    const monsters = await response.json() as Array<Record<string, unknown>>;
    await route.fulfill({
      response,
      json: monsters.map((monster) => monster.id === "green-jelly"
        ? { ...monster, behavior: "aggressive", attack: 120, aggroRange: 260, attackRange: 80, leashDistance: 360 }
        : monster),
    });
  });
  await page.route("**/assets/maps/crownfield-meadows.json", async (route) => {
    const response = await route.fetch();
    const map = await response.json() as { layers: Array<{ name?: string; objects?: Array<Record<string, unknown>> }> };
    const objects = map.layers.find((layer) => layer.name === "Objects")?.objects ?? [];
    const monsterSpawn = objects.find((object) => object.name === "JellyGrove");
    for (const object of objects) {
      if (object.type === "monsterSpawn" && object !== monsterSpawn) object.type = "removed";
    }
    if (monsterSpawn) {
      monsterSpawn.x = 240;
      monsterSpawn.y = 304;
      monsterSpawn.width = 32;
      monsterSpawn.height = 32;
      monsterSpawn.properties = [
        { name: "monsterId", type: "string", value: "green-jelly" },
        { name: "maxCount", type: "int", value: 1 },
      ];
    }
    await route.fulfill({ response, json: map });
  });
}
