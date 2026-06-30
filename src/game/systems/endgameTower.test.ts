import { describe, expect, it } from "vitest";
import { createNewGameState } from "../data/gameState";
import type { ItemDefinition } from "../types/dataDefinitions";
import {
  beginEndgameTowerFloor,
  completeEndgameTowerFloor,
  createInitialEndgameTowerState,
  endgameTowerFloors,
  endgameTowerMaxFloor,
  endgameTowerModifiers,
  endgameTowerUnlockFlag,
  formatModifierDisplay,
  isEndgameTowerAvailable,
} from "./endgameTower";

describe("endgame tower", () => {
  it("defines a 30-floor Starfall Tower with wave, miniboss, and major boss cadence", () => {
    expect(endgameTowerFloors).toHaveLength(endgameTowerMaxFloor);
    expect(endgameTowerFloors.map((floor) => floor.floor)).toEqual(
      Array.from({ length: 30 }, (_, index) => index + 1),
    );

    for (const floor of endgameTowerFloors) {
      expect(floor.monsterIds.length, `floor ${floor.floor} monsters`).toBeGreaterThan(0);
      expect(floor.modifierIds.length, `floor ${floor.floor} modifiers`).toBeGreaterThan(0);
      expect(formatModifierDisplay(floor).length, `floor ${floor.floor} modifier display`).toBeGreaterThan(0);
    }

    expect(endgameTowerFloors.filter((floor) => floor.kind === "miniboss").map((floor) => floor.floor)).toEqual([
      5,
      15,
      25,
    ]);
    expect(endgameTowerFloors.filter((floor) => floor.kind === "majorBoss").map((floor) => floor.floor)).toEqual([
      10,
      20,
      30,
    ]);
  });

  it("keeps all requested modifiers behavioral, rewarding, and compatible", () => {
    expect(endgameTowerModifiers.map((modifier) => modifier.id)).toEqual([
      "burning",
      "cursed",
      "swarming",
      "elite",
      "fragile",
      "treasure",
      "elemental",
    ]);

    for (const modifier of endgameTowerModifiers) {
      expect(modifier.behavior.length).toBeGreaterThan(0);
      expect(modifier.rewardMultiplier).toBeGreaterThan(1);
    }

    for (const floor of endgameTowerFloors) {
      for (const modifierId of floor.modifierIds) {
        const modifier = endgameTowerModifiers.find((candidate) => candidate.id === modifierId)!;
        expect(modifier.incompatibleWith.some((blockedId) => floor.modifierIds.includes(blockedId))).toBe(false);
      }
    }
  });

  it("grants scaled milestone and repeat rewards without replacing other farming", () => {
    const rewardCategories = new Set(endgameTowerFloors.flatMap((floor) => floor.rewards.map((reward) => reward.category)));

    expect(rewardCategories).toEqual(new Set(["sigil", "refinement", "cosmetic", "mythic", "skillAugment"]));

    for (const floor of endgameTowerFloors) {
      const guaranteedRewards = floor.rewards.filter((reward) => reward.guaranteed);

      expect(floor.rewardScale).toBeGreaterThan(1);
      expect(floor.rewards.length).toBeGreaterThanOrEqual(2);
      expect(floor.rewards.every((reward) => reward.quantity > 0)).toBe(true);

      if (floor.floor % 5 === 0) {
        expect(guaranteedRewards.length, `floor ${floor.floor} guaranteed rewards`).toBeGreaterThanOrEqual(2);
      }
    }

    const earlyRewardQuantity = endgameTowerFloors[0].rewards[1].quantity;
    const lateRewardQuantity = endgameTowerFloors[29].rewards[1].quantity;
    expect(lateRewardQuantity).toBeGreaterThan(earlyRewardQuantity);
  });

  it("tracks entry, current floor, milestones, and repeat clear utility", () => {
    const state = createNewGameState();
    const registry = createItemRegistry();

    expect(state.endgameTower).toEqual(createInitialEndgameTowerState());
    expect(isEndgameTowerAvailable(state, "starfall-astral-spire")).toBe(false);
    expect(beginEndgameTowerFloor(state)).toBeNull();

    state.worldFlags[endgameTowerUnlockFlag] = true;
    expect(isEndgameTowerAvailable(state, "starfall-astral-spire")).toBe(true);

    const firstFloor = beginEndgameTowerFloor(state);
    expect(firstFloor?.floor.floor).toBe(1);
    expect(firstFloor?.modifierDisplay).toContain("Burning");

    const firstClear = completeEndgameTowerFloor(state, registry);
    expect(firstClear).toMatchObject({
      highestFloorCompleted: 1,
      nextFloor: 2,
    });
    expect(state.endgameTower.currentFloor).toBe(2);
    expect(state.inventory.items.some((item) => item.id === "rune-ore")).toBe(true);

    state.endgameTower.currentFloor = 5;
    expect(beginEndgameTowerFloor(state)?.floor.kind).toBe("miniboss");
    completeEndgameTowerFloor(state, registry);
    expect(state.endgameTower.completedMilestoneFloors).toContain(5);

    state.endgameTower.currentFloor = 4;
    beginEndgameTowerFloor(state);
    const firstRepeatableClear = completeEndgameTowerFloor(state, registry)!;
    state.endgameTower.currentFloor = 4;
    beginEndgameTowerFloor(state);
    const secondRepeatableClear = completeEndgameTowerFloor(state, registry)!;

    expect(firstRepeatableClear.rewards.some((reward) => !reward.guaranteed)).toBe(true);
    expect(secondRepeatableClear.rewards.every((reward) => reward.quantity >= 1)).toBe(true);
  });
});

function createItemRegistry() {
  return {
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
