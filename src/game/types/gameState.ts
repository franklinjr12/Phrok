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

export type SupportAutoPickupFilter = "none" | "materials" | "gold" | "all";

export interface SupportCompanionState {
  equippedSupportId: string | null;
  levels: Record<string, number>;
  affinity: Record<string, number>;
  cooldowns: Record<string, number>;
  autoPickupFilter: SupportAutoPickupFilter;
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
  refinementLevels: Record<string, number>;
}

export interface StorageState {
  items: InventoryItem[];
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
  activeQuests: QuestProgressState[];
  completedAt: Record<string, string>;
}

export interface QuestProgressState {
  questId: string;
  objectiveProgress: Record<string, number>;
  acceptedAt: string;
  readyToComplete: boolean;
}

export interface BestiaryMonsterState {
  monsterId: string;
  kills: number;
  firstDiscoveredAt: string;
  discoveredDropIds: string[];
  unlockedMilestones: number[];
}

export interface BestiaryState {
  discoveredEnemyIds: string[];
  defeatedEnemyIds: string[];
  entries: Record<string, BestiaryMonsterState>;
  familyDamageBonuses: Record<string, number>;
  milestoneNotifications: string[];
}

export interface CraftingState {
  unlockedRecipeIds: string[];
  unlockNotifications: string[];
}

export interface HuntingBoardState {
  activeContractIds: string[];
  completedContractIds: string[];
  progress: Record<string, number>;
  turnInCounts: Record<string, number>;
  unlockedBossContractRegionIds: string[];
  refreshCount: number;
  lastRefreshReason: string;
}

export interface BossEncounterState {
  activeBossId: string | null;
  activeArenaMapId: string | null;
  defeatedBossIds: string[];
  victoryExitUnlockedBossIds: string[];
  summonedMvpIds: string[];
  mvpRespawnTimers: Record<string, number>;
  lastPhaseByBossId: Record<string, string>;
}

export interface EndgameTowerState {
  unlocked: boolean;
  currentFloor: number;
  highestFloorCompleted: number;
  completedMilestoneFloors: number[];
  repeatClearCountByFloor: Record<string, number>;
  activeRunId: string | null;
}

export interface ChallengeDungeonState {
  unlocked: boolean;
  activeRun: ChallengeDungeonRunState | null;
  completedRunsByDungeonId: Record<string, number>;
  completedRunsByModifierId: Record<string, number>;
  completedClassTrialIds: string[];
  activeClassTrialId: string | null;
}

export interface ChallengeDungeonRunState {
  dungeonId: string;
  modifierId: string;
  startedAt: string;
  rewardMultiplier: number;
  enemyHpMultiplier: number;
  enemyDamageMultiplier: number;
}

export interface SettingsState {
  musicVolume: number;
  sfxVolume: number;
  musicMuted: boolean;
  sfxMuted: boolean;
  textSpeed: number;
  damageNumbersEnabled: boolean;
  visualEffectsIntensity: "full" | "reduced";
  uiScale: number;
  screenShakeEnabled: boolean;
  flashIntensity: number;
  autoPotionEnabled: boolean;
  difficulty: "Story" | "Normal" | "Veteran";
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
  storage: StorageState;
  equipment: EquipmentData;
  support: SupportCompanionState;
  quests: QuestState;
  bestiary: BestiaryState;
  crafting: CraftingState;
  huntingBoard: HuntingBoardState;
  bossEncounters: BossEncounterState;
  endgameTower: EndgameTowerState;
  challengeDungeons: ChallengeDungeonState;
  worldFlags: Record<string, boolean | string>;
  settings: SettingsState;
}
