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
    currentMapId: "crownfield-meadows",
    character: {
      id: "player",
      archetype: "swordsman",
      stats: {
        hp: 30,
        maxHp: 30,
        sp: 8,
        maxSp: 8,
      },
    },
    inventory: [{ id: "training-sword", quantity: 1 }],
    equipment: {
      weapon: "training-sword",
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
