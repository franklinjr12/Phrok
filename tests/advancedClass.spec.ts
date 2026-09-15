import { expect, test, type Page } from "@playwright/test";
import { continueFromMainMenu, startApp } from "./helpers";

test("level 40 player can choose, save, and load an advanced specialization", async ({ page }) => {
  await seedLevel40Save(page);
  await startApp(page);
  await expect(page.locator("canvas")).toHaveAttribute("data-save-slots", /1:used:Veteran:Swordsman:Lv 40:Crownfield/);

  const canvas = await continueFromMainMenu(page);
  await expect(canvas).toHaveAttribute("data-player-level", "40");
  await expect(canvas).toHaveAttribute("data-advanced-class-notification", "visible");
  await expect(canvas).toHaveAttribute("data-advanced-class-service", "available");
  await expect(canvas).toHaveAttribute("data-npc-service-types", /advanced-class/);

  await canvas.click({ position: { x: 304, y: 336 } });
  await expect(canvas).toHaveAttribute("data-last-clicked-npc-service-type", "advanced-class");
  await expect.poll(async () => await canvas.getAttribute("data-dialogue-state"), { timeout: 6000 }).toBe("open");
  await expect(canvas).toHaveAttribute("data-dialogue-npc-name", "Iria Crossroad");
  await expect(canvas).toHaveAttribute("data-dialogue-choice-labels", "Knight|Guardian");
  await expect(canvas).toHaveAttribute("data-dialogue-choice-disabled", "false|false");
  await expect(canvas).toHaveAttribute("data-advanced-class-detail-names", "Knight|Guardian");
  await expect(canvas).toHaveAttribute("data-advanced-class-detail-playstyles", /Charge into danger/);
  await expect(canvas).toHaveAttribute("data-advanced-class-detail-preview-skills", /Charge Thrust, Whirlwind Blade, Knight’s Oath/);

  await canvas.click({ position: { x: 86, y: 530 } });
  await expect(canvas).toHaveAttribute("data-selected-advanced-class", "knight");
  await expect(canvas).toHaveAttribute("data-selected-advanced-class-preview-skills", "Charge Thrust|Whirlwind Blade|Knight’s Oath");
  await expect(canvas).toHaveAttribute("data-dialogue-text", /Confirm to make this permanent/);
  await expect(canvas).toHaveAttribute("data-advanced-class-confirmation", "pending:knight");
  await expect(canvas).toHaveAttribute("data-player-advanced-class", "");

  await canvas.click({ position: { x: 590, y: 530 } });
  await expect(canvas).toHaveAttribute("data-last-advanced-class-choice", "success:knight");
  await expect(canvas).toHaveAttribute("data-player-advanced-class", "knight");
  await expect(canvas).toHaveAttribute("data-player-advanced-class-name", "Knight");
  await expect(canvas).toHaveAttribute("data-advanced-skill-tree", "knight:unlocked");
  await expect(canvas).toHaveAttribute("data-advanced-class-service", "unavailable");

  await page.keyboard.press("KeyK");
  await expect(canvas).toHaveAttribute("data-skill-groups", "swordsman|knight");
  await page.keyboard.press("Escape");
  await page.keyboard.press("KeyS");
  await expect(canvas).toHaveAttribute("data-last-manual-save-status", "saved");

  const savedSlot = await page.evaluate(() => localStorage.getItem("prok-save-slot-1"));
  expect(savedSlot).toContain("\"advancedClass\":{\"id\":\"knight\"");

  await page.reload();
  await expect(canvas).toHaveAttribute("data-scene", "main-menu");
  await continueFromMainMenu(page);
  await expect(canvas).toHaveAttribute("data-player-advanced-class", "knight");
  await expect(canvas).toHaveAttribute("data-advanced-skill-tree", "knight:unlocked");
  await page.keyboard.press("KeyK");
  await expect(canvas).toHaveAttribute("data-skill-groups", "swordsman|knight");
});

async function seedLevel40Save(page: Page): Promise<void> {
  await page.addInitScript(() => {
    if (sessionStorage.getItem("advanced-class-save-seeded") === "true") {
      return;
    }

    const character = {
      id: "player",
      archetype: "swordsman",
      advancedClass: null,
      stats: { hp: 268, maxHp: 268, sp: 102, maxSp: 102 },
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
    };
    const inventory = {
      items: [{ id: "training-sword", quantity: 1 }],
      gold: 0,
      equipmentInstances: [],
      appraisedItemIds: [],
    };
    const gameState = {
      currentSaveSlot: 1,
      playerProfile: {
        name: "Veteran",
        level: 40,
        xp: 0,
        gold: 0,
        statPoints: 0,
        skillPoints: 0,
      },
      currentMapId: "crownfield-town",
      position: { x: 240, y: 304 },
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
      savedAt: "2026-06-20T00:00:00.000Z",
      currentSaveSlot: 1,
      character,
      currentMapId: "crownfield-town",
      position: { x: 240, y: 304 },
      inventory,
      equipment: gameState.equipment,
      skills: ["power-slash"],
      stats: character.stats,
      gold: 0,
      bestiary: gameState.bestiary,
      quests: gameState.quests,
      worldFlags: {},
      settings: gameState.settings,
      gameState,
    }));
    sessionStorage.setItem("advanced-class-save-seeded", "true");
  });
}
