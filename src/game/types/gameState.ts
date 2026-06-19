export interface PlayerProfile {
  name: string;
  level: number;
  xp: number;
  gold: number;
  statPoints: number;
  skillPoints: number;
}

export interface CharacterStats {
  hp: number;
  maxHp: number;
  sp: number;
  maxSp: number;
}

export interface CharacterData {
  id: string;
  archetype: string;
  stats: CharacterStats;
  skillIds: string[];
}

export interface InventoryItem {
  id: string;
  quantity: number;
}

export interface EquipmentInstance {
  instanceId: string;
  itemId: string;
}

export interface InventoryState {
  items: InventoryItem[];
  gold: number;
  equipmentInstances: EquipmentInstance[];
}

export type EquipmentSlot =
  | "weapon"
  | "offhand"
  | "head"
  | "body"
  | "cloak"
  | "boots"
  | "accessory1"
  | "accessory2"
  | "sigil"
  | "supportCharm";

export type EquipmentData = Record<EquipmentSlot, string | null>;

export interface QuestState {
  activeQuestIds: string[];
  completedQuestIds: string[];
}

export interface BestiaryState {
  discoveredEnemyIds: string[];
  defeatedEnemyIds: string[];
}

export interface SettingsState {
  musicVolume: number;
  sfxVolume: number;
  textSpeed: number;
}

export interface GameState {
  currentSaveSlot: number | null;
  playerProfile: PlayerProfile;
  currentMapId: string;
  character: CharacterData;
  inventory: InventoryState;
  equipment: EquipmentData;
  quests: QuestState;
  bestiary: BestiaryState;
  worldFlags: Record<string, boolean>;
  settings: SettingsState;
}
