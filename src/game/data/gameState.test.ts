import { describe, expect, it } from "vitest";
import { createCharacterGameState, createNewGameState } from "./gameState";
import type { ClassDefinition } from "../types/dataDefinitions";

describe("createNewGameState", () => {
  it("initializes the state required for a new game", () => {
    const state = createNewGameState();

    expect(state.currentSaveSlot).toBeNull();
    expect(state.currentMapId).toBe("crownfield-town");
    expect(state.position).toEqual({ x: 240, y: 304 });
    expect(state.playerProfile).toMatchObject({
      level: 1,
      xp: 0,
      gold: 0,
      statPoints: 0,
      skillPoints: 0,
    });
    expect(state.character.stats).toMatchObject({
      hp: 73,
      maxHp: 73,
      sp: 24,
      maxSp: 24,
    });
    expect(state.character.archetype).toBe("swordsman");
    expect(state.character.advancedClass).toBeNull();
    expect(state.character.baseStats).toEqual({ str: 8, agi: 5, vit: 7, int: 3, dex: 5, luk: 4 });
    expect(state.character.allocatedStats).toEqual({ str: 0, agi: 0, vit: 0, int: 0, dex: 0, luk: 0 });
    expect(state.character.skillIds).toEqual(["power-slash"]);
    expect(state.character.skills.learned).toEqual([{ id: "power-slash", level: 1 }]);
    expect(state.character.hotbar).toEqual([
      { slot: 1, type: "skill", id: "power-slash" },
      { slot: 2, type: "item", id: "minor-health-potion" },
    ]);
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
      startingSkillIds: ["fire-bolt"],
      startingItemIds: ["apprentice-staff"],
      advancedClassOptions: ["Elementalist"],
    };

    const state = createCharacterGameState("  Mira  ", mageClass);

    expect(state.playerProfile.name).toBe("Mira");
    expect(state.character.archetype).toBe("mage");
    expect(state.character.advancedClass).toBeNull();
    expect(state.character.skillIds).toEqual(["fire-bolt"]);
    expect(state.character.skills.learned).toEqual([{ id: "fire-bolt", level: 1 }]);
    expect(state.character.hotbar[0]).toEqual({ slot: 1, type: "skill", id: "fire-bolt" });
    expect(state.character.stats).toMatchObject({
      hp: 22,
      maxHp: 45,
      sp: 18,
      maxSp: 49,
    });
    expect(state.character.baseStats).toEqual({ str: 3, agi: 4, vit: 4, int: 9, dex: 5, luk: 5 });
    expect(state.inventory.items).toEqual([{ id: "apprentice-staff", quantity: 1 }]);
    expect(state.equipment.weapon).toBe("apprentice-staff");
  });
});
