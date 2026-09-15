import { expect, test, type Page } from "@playwright/test";
import { continueFromMainMenu, startApp } from "./helpers";

test("challenge dungeon mode exposes modifier state and class trial replay state", async ({ page }) => {
  await seedChallengeSave(page);
  await startApp(page);

  const canvas = await continueFromMainMenu(page);
  await expect(canvas).toHaveAttribute("data-current-map", "training-sewers");
  await expect(canvas).toHaveAttribute("data-current-dungeon", "old-sewers");
  await expect(canvas).toHaveAttribute("data-challenge-dungeon-available", "true");
  await expect(canvas).toHaveAttribute("data-challenge-dungeon-modifiers", /elite:Elite:1\.45/);

  await page.keyboard.press("KeyV");
  await expect(canvas).toHaveAttribute("data-last-challenge-dungeon-start", /old-sewers:/);
  await expect(canvas).toHaveAttribute("data-challenge-dungeon-active", /old-sewers:/);
  await expect(canvas).toHaveAttribute("data-challenge-dungeon-modifier", /\w/);
  await expect(canvas).toHaveAttribute("data-challenge-dungeon-difficulty", /HP x\d+\.\d+ \/ Damage x\d+\.\d+/);
  await expect(canvas).toHaveAttribute("data-challenge-dungeon-rewards", /x\d+\.\d+/);

  await expect(canvas).toHaveAttribute("data-current-class-trial", "knight-trial");
  await expect(canvas).toHaveAttribute("data-current-class-trial-reward", "skillAugment:starfall-skill-augment");
  await page.keyboard.press("KeyT");
  await expect(canvas).toHaveAttribute("data-last-class-trial-start", "knight-trial:first");
  await expect(canvas).toHaveAttribute("data-active-class-trial", "knight-trial");
  await page.keyboard.press("KeyT");
  await expect(canvas).toHaveAttribute("data-last-class-trial-completion", "knight-trial:starfall-skill-augment");
  await expect(canvas).toHaveAttribute("data-completed-class-trials", "knight-trial");
});

async function seedChallengeSave(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const character = {
      id: "player",
      archetype: "swordsman",
      advancedClass: { id: "knight", name: "Knight", baseClassId: "swordsman", unlockedAtLevel: 40 },
      stats: { hp: 420, maxHp: 420, sp: 160, maxSp: 160 },
      baseStats: { str: 8, agi: 5, vit: 7, int: 3, dex: 5, luk: 4 },
      allocatedStats: { str: 0, agi: 0, vit: 0, int: 0, dex: 0, luk: 0 },
      statBuffs: [],
      statusEffects: [],
      skillIds: ["power-slash"],
      skills: { learned: [{ id: "power-slash", level: 1 }], cooldowns: {}, activeToggleIds: [] },
      hotbar: [
        { slot: 1, type: "skill", id: "power-slash" },
        { slot: 2, type: "item", id: "minor-health-potion" },
      ],
      consumables: { cooldowns: {}, autoPotion: { hpThresholdPercent: 0, spThresholdPercent: 0 } },
    };
    const inventory = {
      items: [{ id: "training-sword", quantity: 1 }],
      gold: 0,
      equipmentInstances: [],
      appraisedItemIds: [],
      refinementLevels: {},
    };
    const equipment = {
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
    };
    const challengeDungeons = {
      unlocked: true,
      activeRun: null,
      completedRunsByDungeonId: {},
      completedRunsByModifierId: {},
      completedClassTrialIds: [],
      activeClassTrialId: null,
    };
    const gameState = {
      currentSaveSlot: 1,
      playerProfile: { name: "Challenger", level: 70, xp: 0, gold: 0, statPoints: 0, skillPoints: 0 },
      currentMapId: "training-sewers",
      position: { x: 240, y: 304 },
      character,
      inventory,
      storage: { items: [], equipmentInstances: [] },
      equipment,
      support: { equippedSupportId: null, levels: {}, affinity: {}, cooldowns: {}, autoPickupFilter: "none" },
      quests: { activeQuestIds: [], completedQuestIds: [], activeQuests: [], completedAt: {} },
      bestiary: { discoveredEnemyIds: [], defeatedEnemyIds: [], entries: {}, familyDamageBonuses: {}, milestoneNotifications: [] },
      crafting: { unlockedRecipeIds: [], unlockNotifications: [] },
      huntingBoard: {
        activeContractIds: [],
        completedContractIds: [],
        progress: {},
        turnInCounts: {},
        unlockedBossContractRegionIds: [],
        refreshCount: 0,
        lastRefreshReason: "initial",
      },
      bossEncounters: {
        activeBossId: null,
        activeArenaMapId: null,
        defeatedBossIds: [],
        victoryExitUnlockedBossIds: [],
        summonedMvpIds: [],
        mvpRespawnTimers: {},
        lastPhaseByBossId: {},
      },
      endgameTower: {
        unlocked: false,
        currentFloor: 1,
        highestFloorCompleted: 0,
        completedMilestoneFloors: [],
        repeatClearCountByFloor: {},
        activeRunId: null,
      },
      challengeDungeons,
      worldFlags: { "challenge-dungeons-unlocked": true, "advanced-class:knight": true },
      settings: { musicVolume: 0.8, sfxVolume: 0.8, textSpeed: 1 },
    };

    localStorage.setItem("prok-save-slot-1", JSON.stringify({
      version: 1,
      savedAt: "2026-06-30T00:00:00.000Z",
      currentSaveSlot: 1,
      character,
      currentMapId: "training-sewers",
      position: gameState.position,
      inventory,
      storage: gameState.storage,
      equipment,
      support: gameState.support,
      skills: ["power-slash"],
      stats: character.stats,
      gold: 0,
      bestiary: gameState.bestiary,
      crafting: gameState.crafting,
      huntingBoard: gameState.huntingBoard,
      quests: gameState.quests,
      worldFlags: gameState.worldFlags,
      settings: gameState.settings,
      gameState,
    }));
  });
}
