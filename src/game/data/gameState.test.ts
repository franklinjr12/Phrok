import { describe, expect, it } from "vitest";
import { createCharacterGameState, createNewGameState } from "./gameState";
import type { ClassDefinition } from "../types/dataDefinitions";

describe("createNewGameState", () => {
  it("initializes the state required for a new game", () => {
    const state = createNewGameState();

    expect(state.currentSaveSlot).toBeNull();
    expect(state.currentMapId).toBe("crownfield-meadows");
    expect(state.playerProfile).toMatchObject({
      level: 1,
      xp: 0,
      gold: 0,
      statPoints: 0,
      skillPoints: 0,
    });
    expect(state.character.stats).toMatchObject({
      hp: 30,
      maxHp: 30,
      sp: 8,
      maxSp: 8,
    });
    expect(state.character.archetype).toBe("swordsman");
    expect(state.character.skillIds).toEqual(["power-slash"]);
    expect(state.inventory.items).toEqual([{ id: "training-sword", quantity: 1 }]);
    expect(state.inventory.gold).toBe(0);
    expect(state.inventory.equipmentInstances).toEqual([]);
    expect(state.equipment.weapon).toBe("training-sword");
    expect(state.quests.activeQuestIds).toEqual([]);
    expect(state.bestiary.discoveredEnemyIds).toEqual([]);
    expect(state.worldFlags).toEqual({});
    expect(state.settings.musicVolume).toBe(0.8);
  });

  it("creates a new game state from a confirmed character class", () => {
    const mageClass: ClassDefinition = {
      id: "mage",
      name: "Mage",
      description: "Casts spells.",
      roleSummary: "Ranged caster.",
      recommendedStats: ["SP", "Attack"],
      difficultyRating: "Hard",
      baseStats: { hp: 22, sp: 18, attack: 8, defense: 2 },
      growthRates: { hp: 3, sp: 5, attack: 4, defense: 1 },
      startingWeaponId: "apprentice-staff",
      allowedWeaponTypes: ["staff"],
      startingSkillIds: ["ember-bolt"],
      startingItemIds: ["apprentice-staff"],
      advancedClassOptions: ["Elementalist"],
    };

    const state = createCharacterGameState("  Mira  ", mageClass);

    expect(state.playerProfile.name).toBe("Mira");
    expect(state.character.archetype).toBe("mage");
    expect(state.character.skillIds).toEqual(["ember-bolt"]);
    expect(state.character.stats).toMatchObject({
      hp: 22,
      maxHp: 22,
      sp: 18,
      maxSp: 18,
    });
    expect(state.inventory.items).toEqual([{ id: "apprentice-staff", quantity: 1 }]);
    expect(state.equipment.weapon).toBe("apprentice-staff");
  });
});
