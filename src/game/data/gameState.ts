import type { GameState } from "../types/gameState";

export function createNewGameState(): GameState {
  return {
    currentSaveSlot: null,
    playerProfile: {
      name: "Adventurer",
      level: 1,
      xp: 0,
      gold: 0,
    },
    currentMapId: "prologue-field",
    character: {
      id: "player",
      archetype: "wanderer",
      stats: {
        hp: 24,
        maxHp: 24,
        sp: 10,
        maxSp: 10,
      },
    },
    inventory: [],
    equipment: {
      weapon: null,
      armor: null,
      accessory: null,
    },
    quests: {
      activeQuestIds: [],
      completedQuestIds: [],
    },
    bestiary: {
      discoveredEnemyIds: [],
      defeatedEnemyIds: [],
    },
    worldFlags: {},
    settings: {
      musicVolume: 0.8,
      sfxVolume: 0.8,
      textSpeed: 1,
    },
  };
}
