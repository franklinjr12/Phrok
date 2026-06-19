import { describe, expect, it } from "vitest";
import { createNewGameState } from "./gameState";

describe("createNewGameState", () => {
  it("initializes the state required for a new game", () => {
    const state = createNewGameState();

    expect(state.currentSaveSlot).toBeNull();
    expect(state.currentMapId).toBe("prologue-field");
    expect(state.playerProfile).toMatchObject({
      level: 1,
      xp: 0,
      gold: 0,
    });
    expect(state.character.stats).toMatchObject({
      hp: 24,
      maxHp: 24,
      sp: 10,
      maxSp: 10,
    });
    expect(state.inventory).toEqual([]);
    expect(state.equipment.weapon).toBeNull();
    expect(state.quests.activeQuestIds).toEqual([]);
    expect(state.bestiary.discoveredEnemyIds).toEqual([]);
    expect(state.worldFlags).toEqual({});
    expect(state.settings.musicVolume).toBe(0.8);
  });
});
