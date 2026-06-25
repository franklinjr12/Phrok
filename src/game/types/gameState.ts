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

export type BaseStatKey = "str" | "agi" | "vit" | "int" | "dex" | "luk";

export type BaseStats = Record<BaseStatKey, number>;

export interface DerivedStats {
  maxHp: number;
  maxSp: number;
  physicalAttack: number;
  rangedAttack: number;
  magicAttack: number;
  defense: number;
  magicDefense: number;
  hit: number;
  dodge: number;
  crit: number;
  attackSpeed: number;
  castSpeed: number;
  cooldownReduction: number;
  moveSpeed: number;
  weightLimit: number;
  dropChance: number;
  elementDamage: Record<string, number>;
  raceDamage: Record<string, number>;
  resistances: Record<string, number>;
}

export interface StatModifier {
  id: string;
  sourceSkillId?: string;
  sourceStatusEffectId?: string;
  expiresAt?: number;
  baseStats?: Partial<BaseStats>;
  derivedStats?: Partial<Record<keyof DerivedStats, number>>;
}

export interface ActiveStatusEffect {
  id: string;
  sourceId: string;
  sourceKind?: "skill" | "item" | "enemy" | "unknown";
  persistThroughMapTransition?: boolean;
  stacks: number;
  appliedAt: number;
  expiresAt: number;
  nextTickAt: number;
}

export interface LearnedSkillState {
  id: string;
  level: number;
}

export type HotbarActionType = "skill" | "item";

export interface HotbarSlotState {
  slot: number;
  type: HotbarActionType;
  id: string;
}

export interface SkillState {
  learned: LearnedSkillState[];
  cooldowns: Record<string, number>;
  activeToggleIds: string[];
}

export interface AutoPotionSettings {
  hpThresholdPercent: number;
  spThresholdPercent: number;
}

export interface ConsumableState {
  cooldowns: Record<string, number>;
  autoPotion: AutoPotionSettings;
}

export interface CharacterData {
  id: string;
  archetype: string;
  advancedClass: AdvancedClassState | null;
  stats: CharacterStats;
  baseStats: BaseStats;
  allocatedStats: BaseStats;
  statBuffs: StatModifier[];
  statusEffects: ActiveStatusEffect[];
  skillIds: string[];
  skills: SkillState;
  hotbar: HotbarSlotState[];
  consumables: ConsumableState;
}

export interface AdvancedClassState {
  id: string;
  name: string;
  baseClassId: string;
  unlockedAtLevel: number;
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
  appraisedItemIds: string[];
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

export interface PositionState {
  x: number;
  y: number;
}

export interface GameState {
  currentSaveSlot: number | null;
  playerProfile: PlayerProfile;
  currentMapId: string;
  position: PositionState;
  character: CharacterData;
  inventory: InventoryState;
  equipment: EquipmentData;
  quests: QuestState;
  bestiary: BestiaryState;
  worldFlags: Record<string, boolean>;
  settings: SettingsState;
}
