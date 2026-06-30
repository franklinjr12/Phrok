import { describe, expect, it } from "vitest";
import { createNewGameState } from "../data/gameState";
import type { DungeonDefinition, ItemDefinition } from "../types/dataDefinitions";
import {
  beginChallengeDungeon,
  challengeDungeonModifiers,
  challengeDungeonUnlockFlag,
  classTrials,
  completeChallengeDungeon,
  completeClassTrial,
  createInitialChallengeDungeonState,
  formatChallengeModifierDisplay,
  isChallengeDungeonAvailable,
  startClassTrial,
} from "./challengeDungeons";
import { advancedClassDefinitions } from "./advancedClasses";

describe("challenge dungeons", () => {
  it("starts a visible modifier run with higher difficulty and rewards", () => {
    const state = createNewGameState();

    expect(state.challengeDungeons).toEqual(createInitialChallengeDungeonState());
    expect(isChallengeDungeonAvailable(state, oldSewers)).toBe(false);

    state.playerProfile.level = 70;
    const start = beginChallengeDungeon(state, oldSewers, "elite", "2026-06-30T00:00:00.000Z");

    expect(start).toMatchObject({
      dungeonId: "old-sewers",
      modifierDisplay: expect.stringContaining("Elite"),
      difficultyDisplay: "HP x1.35 / Damage x1.28",
      rewardDisplay: "x1.45",
    });
    expect(start?.modifier.enemyHpMultiplier).toBeGreaterThan(1);
    expect(start?.modifier.enemyDamageMultiplier).toBeGreaterThan(1);
    expect(start?.modifier.rewardMultiplier).toBeGreaterThan(1);
    expect(state.challengeDungeons.activeRun).toMatchObject({
      dungeonId: "old-sewers",
      modifierId: "elite",
      rewardMultiplier: 1.45,
    });
    expect(state.worldFlags[challengeDungeonUnlockFlag]).toBe(true);
  });

  it("completes challenge runs with scaled repeat rewards", () => {
    const state = createNewGameState();
    const registry = createRegistry(oldSewers);
    state.playerProfile.level = 70;

    beginChallengeDungeon(state, oldSewers, "treasure");
    const firstClear = completeChallengeDungeon(state, registry);

    expect(firstClear).toMatchObject({
      dungeonId: "old-sewers",
      modifierId: "treasure",
      repeatCount: 1,
    });
    expect(firstClear?.gold).toBeGreaterThan(oldSewers.levelRange.max);
    expect(firstClear?.rewards).toEqual([
      { itemId: "rusted-buckler", quantity: 2 },
      { itemId: "sewer-moss", quantity: 2 },
      { itemId: "glutton-gland", quantity: 2 },
    ]);
    expect(state.inventory.items).toEqual(expect.arrayContaining([
      { id: "rusted-buckler", quantity: 2 },
      { id: "glutton-gland", quantity: 2 },
    ]));
    expect(state.challengeDungeons.activeRun).toBeNull();

    beginChallengeDungeon(state, oldSewers, "treasure");
    const secondClear = completeChallengeDungeon(state, registry);

    expect(secondClear?.repeatCount).toBe(2);
    expect(state.challengeDungeons.completedRunsByDungeonId["old-sewers"]).toBe(2);
    expect(state.challengeDungeons.completedRunsByModifierId.treasure).toBe(2);
  });

  it("defines replayable advanced class trials with lessons and rewards", () => {
    expect(classTrials.map((trial) => trial.advancedClassId).sort()).toEqual(
      advancedClassDefinitions.map((definition) => definition.id).sort(),
    );

    for (const trial of classTrials) {
      expect(trial.lesson.length).toBeGreaterThan(0);
      expect(trial.monsterIds.length).toBeGreaterThan(0);
      expect(trial.rewardItemId.length).toBeGreaterThan(0);
      expect(["skillAugment", "cosmetic"]).toContain(trial.rewardKind);
      expect(trial.replayable).toBe(true);
    }
  });

  it("starts and replays the current advanced class trial", () => {
    const state = createNewGameState();
    const registry = createRegistry(oldSewers);

    expect(startClassTrial(state)).toEqual({ success: false, reason: "no-advanced-class" });

    state.character.advancedClass = {
      id: "knight",
      name: "Knight",
      baseClassId: "swordsman",
      unlockedAtLevel: 40,
    };

    const firstStart = startClassTrial(state);
    expect(firstStart).toMatchObject({
      success: true,
      replay: false,
      trial: {
        id: "knight-trial",
        lesson: expect.stringContaining("burst timing"),
        rewardKind: "skillAugment",
      },
    });

    const firstComplete = completeClassTrial(state, registry);
    expect(firstComplete?.id).toBe("knight-trial");
    expect(state.challengeDungeons.completedClassTrialIds).toEqual(["knight-trial"]);
    expect(state.inventory.items.some((item) => item.id === "starfall-skill-augment")).toBe(true);

    expect(startClassTrial(state)).toMatchObject({ success: true, replay: true });
  });

  it("keeps modifier display text available for UI state", () => {
    expect(challengeDungeonModifiers.map((modifier) => modifier.id)).toEqual([
      "overgrown",
      "cursed",
      "swarming",
      "elite",
      "volatile",
      "treasure",
    ]);
    expect(formatChallengeModifierDisplay(challengeDungeonModifiers[0])).toContain("Overgrown");
  });
});

const oldSewers: DungeonDefinition = {
  id: "old-sewers",
  mapId: "training-sewers",
  name: "Old Sewers",
  levelRange: { min: 5, max: 15 },
  bossId: "sewer-glutton",
  roomPlan: [],
  enemyThemes: ["sewer"],
  hazardIds: [],
  hazards: [],
  rewardItemIds: ["rusted-buckler", "sewer-moss"],
  rareMaterialIds: ["glutton-gland"],
  replayable: true,
  shortcutUnlockId: "",
  unlocksMapId: "",
  mechanics: [],
  bossMechanics: [],
};

function createRegistry(dungeon: DungeonDefinition) {
  return {
    getDungeon(id: string): DungeonDefinition {
      if (id !== dungeon.id) {
        throw new Error(`Missing dungeon ${id}`);
      }

      return dungeon;
    },
    getItem(id: string): ItemDefinition {
      return {
        id,
        name: id,
        description: "",
        type: "material",
        value: 1,
      };
    },
  };
}
