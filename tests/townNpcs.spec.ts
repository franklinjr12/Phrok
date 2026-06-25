import { expect, test, type Page } from "@playwright/test";
import { confirmDefaultCharacter, startApp } from "./helpers";

test("town NPCs can be clicked to open blocking placeholder service dialogue", async ({ page }) => {
  await startApp(page);

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

test("town stat reset NPC offers reset service with confirmation state", async ({ page }) => {
  await startApp(page);

  const canvas = await confirmDefaultCharacter(page);

  await canvas.click({ position: { x: 336, y: 432 } });
  await expect(canvas).toHaveAttribute("data-last-clicked-npc", "sella-greenward");
  await expect(canvas).toHaveAttribute("data-last-clicked-npc-service-type", "stat-reset");
  await expect.poll(async () => await canvas.getAttribute("data-dialogue-state"), { timeout: 6000 }).toBe("open");
  await expect(canvas).toHaveAttribute("data-dialogue-npc-name", "Sella Greenward");
  await expect(canvas).toHaveAttribute("data-dialogue-service-type", "stat-reset");
  await expect(canvas).toHaveAttribute("data-dialogue-choice-labels", "Reset stats");
  await expect(canvas).toHaveAttribute("data-dialogue-choice-disabled", "false");

  await canvas.click({ position: { x: 86, y: 530 } });
  await expect(canvas).toHaveAttribute("data-last-dialogue-choice", "reset-stats");
  await expect(canvas).toHaveAttribute("data-last-stat-reset", /failed:(insufficient-gold|no-allocated-stats):50:0/);
});

test("merchant NPC opens a JSON-backed shop for buying and selling", async ({ page }) => {
  await seedMarketSave(page, {
    mapId: "crownfield-town",
    gold: 50,
    items: [
      { id: "training-sword", quantity: 1 },
      { id: "jelly-gel", quantity: 1 },
    ],
  });
  await startApp(page);

  const canvas = page.locator("canvas");
  await expect(canvas).toHaveAttribute("data-scene", "main-menu");
  await canvas.click({ position: { x: 400, y: 204 } });
  await expect(canvas).toHaveAttribute("data-scene", "world");

  await canvas.click({ position: { x: 496, y: 336 } });
  await expect(canvas).toHaveAttribute("data-last-clicked-npc", "tessa-vale");
  await expect(canvas).toHaveAttribute("data-last-clicked-npc-service-type", "merchant");
  await expect.poll(async () => await canvas.getAttribute("data-shop-panel"), { timeout: 6000 }).toBe("visible");
  await expect(canvas).toHaveAttribute("data-active-shop", "crownfield-market");
  await expect(canvas).toHaveAttribute("data-shop-stock", /minor-health-potion/);
  await expect(canvas).toHaveAttribute("data-selected-shop-item", "minor-health-potion");

  await canvas.click({ position: { x: 286, y: 452 } });
  await expect(canvas).toHaveAttribute("data-last-shop-action", "buy:minor-health-potion:9:41");
  await expect(canvas).toHaveAttribute("data-inventory-gold", "41");

  await canvas.click({ position: { x: 590, y: 452 } });
  await expect(canvas).toHaveAttribute("data-last-shop-action", /sell:jelly-gel:2:43|sell:training-sword:12:53/);
});

test("appraiser NPC reveals unknown item details and offers improved sell value", async ({ page }) => {
  await seedMarketSave(page, {
    mapId: "blueharbor-hub",
    gold: 30,
    items: [{ id: "moonlit-reed", quantity: 1 }],
    position: { x: 256, y: 384 },
  });
  await startApp(page);

  const canvas = page.locator("canvas");
  await expect(canvas).toHaveAttribute("data-scene", "main-menu");
  await canvas.click({ position: { x: 400, y: 204 } });
  await expect(canvas).toHaveAttribute("data-scene", "world");
  await expect(canvas).toHaveAttribute("data-current-map", "blueharbor-hub");

  await canvas.click({ position: { x: 256, y: 432 } });
  await expect(canvas).toHaveAttribute("data-last-clicked-npc", "blueharbor-market-broker");
  await expect(canvas).toHaveAttribute("data-last-clicked-npc-service-type", "appraiser");
  await expect.poll(async () => await canvas.getAttribute("data-appraiser-panel"), { timeout: 6000 }).toBe("visible");
  await expect(canvas).toHaveAttribute("data-active-shop", "blueharbor-appraiser");
  await expect(canvas).toHaveAttribute("data-selected-appraiser-item-name", "Unappraised Rare material");
  await expect(canvas).toHaveAttribute("data-selected-appraiser-item-known", "false");
  await expect(canvas).toHaveAttribute("data-appraiser-identify-cost", "15");
  await expect(canvas).toHaveAttribute("data-appraiser-improved-sell-value", "54");

  await canvas.click({ position: { x: 516, y: 442 } });
  await expect(canvas).toHaveAttribute("data-last-appraiser-action", "appraise:moonlit-reed:15:15");
  await expect(canvas).toHaveAttribute("data-selected-appraiser-item-name", "Moonlit Reed");
  await expect(canvas).toHaveAttribute("data-selected-appraiser-item-known", "true");
  await expect(canvas).toHaveAttribute("data-appraised-items", "moonlit-reed");
});

async function seedMarketSave(
  page: Page,
  options: {
    mapId: string;
    gold: number;
    items: Array<{ id: string; quantity: number }>;
    position?: { x: number; y: number };
  },
): Promise<void> {
  await page.addInitScript((seedOptions) => {
    if (sessionStorage.getItem(`market-save-seeded-${seedOptions.mapId}`) === "true") {
      return;
    }

    const character = {
      id: "player",
      archetype: "swordsman",
      advancedClass: null,
      stats: { hp: 73, maxHp: 73, sp: 24, maxSp: 24 },
      baseStats: { str: 8, agi: 5, vit: 7, int: 3, dex: 5, luk: 4 },
      allocatedStats: { str: 0, agi: 0, vit: 0, int: 0, dex: 0, luk: 0 },
      statBuffs: [],
      statusEffects: [],
      skillIds: ["power-slash"],
      skills: {
        learned: [{ id: "power-slash", level: 1 }],
        cooldowns: {},
        activeToggleIds: [],
      },
      hotbar: [
        { slot: 1, type: "skill", id: "power-slash" },
        { slot: 2, type: "item", id: "minor-health-potion" },
      ],
      consumables: {
        cooldowns: {},
        autoPotion: {
          hpThresholdPercent: 0,
          spThresholdPercent: 0,
        },
      },
    };
    const inventory = {
      items: seedOptions.items,
      gold: seedOptions.gold,
      equipmentInstances: [],
      appraisedItemIds: [],
    };
    const position = seedOptions.position ?? { x: 240, y: 304 };
    const gameState = {
      currentSaveSlot: 1,
      playerProfile: {
        name: "Market Tester",
        level: 20,
        xp: 0,
        gold: seedOptions.gold,
        statPoints: 0,
        skillPoints: 0,
      },
      currentMapId: seedOptions.mapId,
      position,
      character,
      inventory,
      equipment: {
        weapon: "training-sword",
        offhand: null,
        head: null,
        body: null,
        cloak: null,
        boots: null,
        accessory1: null,
        accessory2: null,
        sigil: null,
        supportCharm: null,
      },
      quests: { activeQuestIds: [], completedQuestIds: [] },
      bestiary: { discoveredEnemyIds: [], defeatedEnemyIds: [] },
      worldFlags: {},
      settings: { musicVolume: 0.8, sfxVolume: 0.8, textSpeed: 1 },
    };

    localStorage.setItem("prok-save-slot-1", JSON.stringify({
      version: 1,
      savedAt: "2026-06-25T00:00:00.000Z",
      currentSaveSlot: 1,
      character,
      currentMapId: seedOptions.mapId,
      position: gameState.position,
      inventory,
      equipment: gameState.equipment,
      skills: ["power-slash"],
      stats: character.stats,
      gold: seedOptions.gold,
      bestiary: gameState.bestiary,
      quests: gameState.quests,
      worldFlags: {},
      settings: gameState.settings,
      gameState,
    }));
    sessionStorage.setItem(`market-save-seeded-${seedOptions.mapId}`, "true");
  }, options);
}
