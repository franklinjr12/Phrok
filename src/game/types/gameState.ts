export interface PlayerProfile {
  name: string;
  level: number;
  xp: number;
  gold: number;
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
}

export interface InventoryItem {
  id: string;
  quantity: number;
}

export interface EquipmentData {
  weapon: string | null;
  armor: string | null;
  accessory: string | null;
}

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
  inventory: InventoryItem[];
  equipment: EquipmentData;
  quests: QuestState;
  bestiary: BestiaryState;
  worldFlags: Record<string, boolean>;
  settings: SettingsState;
}
