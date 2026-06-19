import { describe, expect, it } from "vitest";
import { createNewGameState } from "./gameState";

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
    expect(state.inventory.items).toEqual([{ id: "training-sword", quantity: 1 }]);
    expect(state.inventory.gold).toBe(0);
    expect(state.inventory.equipmentInstances).toEqual([]);
    expect(state.equipment.weapon).toBe("training-sword");
    expect(state.quests.activeQuestIds).toEqual([]);
    expect(state.bestiary.discoveredEnemyIds).toEqual([]);
    expect(state.worldFlags).toEqual({});
    expect(state.settings.musicVolume).toBe(0.8);
  });
});
