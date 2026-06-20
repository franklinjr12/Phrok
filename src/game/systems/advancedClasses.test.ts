import { describe, expect, it } from "vitest";
import { createNewGameState } from "../data/gameState";
import { chooseAdvancedClass, getUnlockedSkillTreeIds, isAdvancedClassServiceAvailable } from "./advancedClasses";
import type { ClassDefinition } from "../types/dataDefinitions";

describe("advanced class unlocks", () => {
  it("requires level 40 before the service is available", () => {
    const state = createNewGameState();

    expect(isAdvancedClassServiceAvailable(state)).toBe(false);

    state.playerProfile.level = 40;

    expect(isAdvancedClassServiceAvailable(state)).toBe(true);
  });

  it("chooses one valid specialization and unlocks its skill tree", () => {
    const state = createNewGameState();
    state.playerProfile.level = 40;

    const result = chooseAdvancedClass(state, swordsmanClass, "Knight");

    expect(result).toEqual({ success: true, id: "knight", name: "Knight" });
    expect(state.character.advancedClass).toEqual({
      id: "knight",
      name: "Knight",
      baseClassId: "swordsman",
      unlockedAtLevel: 40,
    });
    expect(getUnlockedSkillTreeIds(state)).toEqual(["swordsman", "knight"]);
    expect(state.worldFlags["advanced-skill-tree-unlocked"]).toBe(true);
    expect(isAdvancedClassServiceAvailable(state)).toBe(false);
    expect(chooseAdvancedClass(state, swordsmanClass, "Blade Dancer")).toEqual({
      success: false,
      reason: "already-chosen",
    });
  });
});

const swordsmanClass: ClassDefinition = {
  id: "swordsman",
  name: "Swordsman",
  description: "A steady frontline fighter.",
  roleSummary: "Durable melee.",
  recommendedStats: ["HP"],
  difficultyRating: "Easy",
  baseStats: { hp: 30, sp: 8, attack: 6, defense: 4 },
  growthRates: { hp: 5, sp: 2, attack: 3, defense: 3 },
  startingWeaponId: "training-sword",
  allowedWeaponTypes: ["sword"],
  startingSkillIds: ["power-slash"],
  startingItemIds: ["training-sword"],
  advancedClassOptions: ["Knight", "Blade Dancer"],
};
