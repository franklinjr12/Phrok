import type {
  BestiaryState,
  CharacterData,
  CharacterStats,
  EquipmentData,
  GameState,
  InventoryItem,
  InventoryState,
  PositionState,
  QuestState,
  SettingsState,
  StorageState,
} from "./gameState";

export interface InventoryData {
  items: InventoryItem[];
}

export interface SaveData {
  version: number;
  savedAt: string;
  currentSaveSlot: number | null;
  character: CharacterData;
  currentMapId: string;
  position: PositionState;
  inventory: InventoryState;
  storage: StorageState;
  equipment: EquipmentData;
  skills: string[];
  stats: CharacterStats;
  gold: number;
  bestiary: BestiaryState;
  quests: QuestState;
  worldFlags: Record<string, boolean>;
  settings: SettingsState;
  gameState: GameState;
}

export interface SaveSlotSummary {
  slot: number;
  isEmpty: boolean;
  characterName: string;
  classId: string;
  level: number;
  mapId: string;
  savedAt: string;
}

export type { CharacterData, EquipmentData };
