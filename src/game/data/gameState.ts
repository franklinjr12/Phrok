import type { GameState } from "../types/gameState";
import type { ClassDefinition } from "../types/dataDefinitions";
import { createEmptyEquipment } from "../systems/equipment";
import { createInitialHotbar, createInitialSkillState } from "../systems/skills";
import { calculateDerivedStats, createClassBaseStats, createEmptyBaseStats, syncCharacterVitalsToDerivedStats } from "../systems/stats";

export function createNewGameState(): GameState {
  const state: GameState = {
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
    position: {
      x: 240,
      y: 304,
    },
    character: {
      id: "player",
      archetype: "swordsman",
      advancedClass: null,
      stats: {
        hp: 73,
        maxHp: 73,
        sp: 24,
        maxSp: 24,
      },
      baseStats: {
        str: 8,
        agi: 5,
        vit: 7,
        int: 3,
        dex: 5,
        luk: 4,
      },
      allocatedStats: createEmptyBaseStats(),
      statBuffs: [],
      statusEffects: [],
      skillIds: ["power-slash"],
      skills: createInitialSkillState(["power-slash"]),
      hotbar: createInitialHotbar(["power-slash"]),
      consumables: {
        cooldowns: {},
        autoPotion: {
          hpThresholdPercent: 0,
          spThresholdPercent: 0,
        },
      },
    },
    inventory: {
      items: [{ id: "training-sword", quantity: 1 }],
      gold: 0,
      equipmentInstances: [],
      appraisedItemIds: [],
    },
    equipment: {
      ...createEmptyEquipment(),
      weapon: "training-sword",
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

  return state;
}

export function createCharacterGameState(name: string, playerClass: ClassDefinition): GameState {
  const state = createNewGameState();
  const characterName = name.trim() || "Adventurer";
  const startingItemIds = playerClass.startingItemIds.includes(playerClass.startingWeaponId)
    ? playerClass.startingItemIds
    : [playerClass.startingWeaponId, ...playerClass.startingItemIds];

  state.playerProfile.name = characterName;
  state.character.archetype = playerClass.id;
  state.character.advancedClass = null;
  state.character.baseStats = createClassBaseStats(playerClass);
  state.character.allocatedStats = createEmptyBaseStats();
  state.character.statBuffs = [];
  state.character.statusEffects = [];
  state.character.stats = {
    hp: playerClass.baseStats.hp,
    maxHp: playerClass.baseStats.hp,
    sp: playerClass.baseStats.sp,
    maxSp: playerClass.baseStats.sp,
  };
  state.character.skillIds = [...playerClass.startingSkillIds];
  state.character.skills = createInitialSkillState(playerClass.startingSkillIds);
  state.character.hotbar = createInitialHotbar(playerClass.startingSkillIds);
  state.character.consumables = {
    cooldowns: {},
    autoPotion: {
      hpThresholdPercent: 0,
      spThresholdPercent: 0,
    },
  };
  state.inventory.items = startingItemIds.map((id) => ({ id, quantity: 1 }));
  state.inventory.gold = state.playerProfile.gold;
  state.inventory.equipmentInstances = [];
  state.inventory.appraisedItemIds = [];
  state.equipment.weapon = playerClass.startingWeaponId;
  syncCharacterVitalsToDerivedStats(
    state,
    calculateDerivedStats(state, playerClass, (id) => {
      return {
        id,
        name: id,
        description: "",
        type: "material",
        value: 0,
      };
    }),
  );

  return state;
}
