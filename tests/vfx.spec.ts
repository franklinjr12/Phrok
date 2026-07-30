import { expect, test, type Page } from "@playwright/test";
import { enterMeadows, startApp } from "./helpers";

test("combat VFX settings, damage numbers, and rare loot beams are exposed in world play", async ({ page }) => {
  await routePredictableMeadows(page);
  await startApp(page);

  const canvas = await enterMeadows(page);
  await expect(canvas).toHaveAttribute("data-damage-numbers-enabled", "true");
  await expect(canvas).toHaveAttribute("data-vfx-intensity", "full");

  await page.keyboard.press("Y");
  await expect(canvas).toHaveAttribute("data-damage-numbers-enabled", "false");
  await expect.poll(async () => {
    await page.keyboard.press("Y");
    return await canvas.getAttribute("data-damage-numbers-enabled");
  }).toBe("true");
  await page.keyboard.press("U");
  await expect(canvas).toHaveAttribute("data-vfx-intensity", "reduced");

  await expect(canvas).toHaveAttribute("data-enemy-alive", "true");
  await canvas.click({ position: { x: 528, y: 300 } });
  await expect.poll(async () => await canvas.getAttribute("data-last-combat-text"), { timeout: 6000 })
    .toMatch(/^(damage|critical|miss):/);
  await expect.poll(async () => await canvas.getAttribute("data-last-hit-vfx"), { timeout: 6000 })
    .toMatch(/^(weapon-hit|critical-hit)$/);

  await expect.poll(async () => await canvas.getAttribute("data-enemy-alive"), { timeout: 6000 }).toBe("false");
  await expect.poll(async () => await canvas.getAttribute("data-last-level-up"), { timeout: 6000 }).toBe("2");
  await expect.poll(async () => await canvas.getAttribute("data-last-vfx"), { timeout: 6000 })
    .toMatch(/^level-up-burst:/);
  await expect(canvas).toHaveAttribute("data-last-loot-beam", "Rare:rare-loot-beam");
});

async function routePredictableMeadows(page: Page) {
  await page.route("**/assets/data/items.json", async (route) => {
    const response = await route.fetch();
    const items = await response.json() as Array<Record<string, unknown>>;

    await route.fulfill({
      response,
      json: items.map((item) => item.id === "jelly-gel" ? { ...item, rarity: "Rare" } : item),
    });
  });

  await page.route("**/assets/data/drop-tables.json", async (route) => {
    const response = await route.fetch();
    const dropTables = await response.json() as Array<Record<string, unknown>>;

    await route.fulfill({
      response,
      json: dropTables.map((table) => table.id === "green-jelly-drops"
        ? {
          ...table,
          entries: [
            { type: "item", itemId: "jelly-gel", chance: 1, minQuantity: 1, maxQuantity: 1 },
          ],
        }
        : table),
    });
  });

  await page.route("**/assets/data/xp-tables.json", async (route) => {
    const response = await route.fetch();
    const xpTables = await response.json() as Array<Record<string, unknown>>;

    await route.fulfill({
      response,
      json: xpTables.map((table) => table.id === "standard"
        ? { ...table, levels: { ...(table.levels as Record<string, number>), "2": 1 } }
        : table),
    });
  });

  await page.route("**/assets/maps/crownfield-meadows.json", async (route) => {
    const response = await route.fetch();
    const map = await response.json() as {
      layers: Array<{
        name?: string;
        objects?: Array<Record<string, unknown>>;
      }>;
    };
    const objectLayer = map.layers.find((layer) => layer.name === "Objects");

    if (objectLayer?.objects) {
      objectLayer.objects = objectLayer.objects.filter((object) => object.type !== "monsterSpawn" || object.name === "JellyGrove");
      const jellyGrove = objectLayer.objects.find((object) => object.name === "JellyGrove");

      if (jellyGrove) {
        jellyGrove.x = 528;
        jellyGrove.y = 300;
        jellyGrove.width = 32;
        jellyGrove.height = 32;
        jellyGrove.properties = [
          { name: "monsterId", type: "string", value: "green-jelly" },
          { name: "maxCount", type: "int", value: 1 },
        ];
      }
    }

    await route.fulfill({ response, json: map });
  });
}
