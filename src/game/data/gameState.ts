import type { GameState } from "../types/gameState";
import type { ClassDefinition } from "../types/dataDefinitions";

export function createNewGameState(): GameState {
  return {
    currentSaveSlot: null,
    playerProfile: {
      name: "Adventurer",
      level: 1,
      xp: 0,
      gold: 0,
      statPoints: 0,
      skillPoints: 0,
    },
    currentMapId: "crownfield-town",
    character: {
      id: "player",
      archetype: "swordsman",
      stats: {
        hp: 30,
        maxHp: 30,
        sp: 8,
        maxSp: 8,
      },
      skillIds: ["power-slash"],
    },
    inventory: {
      items: [{ id: "training-sword", quantity: 1 }],
      gold: 0,
      equipmentInstances: [],
    },
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

export function createCharacterGameState(name: string, playerClass: ClassDefinition): GameState {
  const state = createNewGameState();
  const characterName = name.trim() || "Adventurer";
  const startingItemIds = playerClass.startingItemIds.includes(playerClass.startingWeaponId)
    ? playerClass.startingItemIds
    : [playerClass.startingWeaponId, ...playerClass.startingItemIds];

  state.playerProfile.name = characterName;
  state.character.archetype = playerClass.id;
  state.character.stats = {
    hp: playerClass.baseStats.hp,
    maxHp: playerClass.baseStats.hp,
    sp: playerClass.baseStats.sp,
    maxSp: playerClass.baseStats.sp,
  };
  state.character.skillIds = [...playerClass.startingSkillIds];
  state.inventory.items = startingItemIds.map((id) => ({ id, quantity: 1 }));
  state.inventory.gold = state.playerProfile.gold;
  state.inventory.equipmentInstances = [];
  state.equipment.weapon = playerClass.startingWeaponId;

  return state;
}
