import type { BaseStats, DerivedStats, EquipmentSlot } from "./gameState";

export interface ClassDefinition {
  id: string;
  name: string;
  description: string;
  roleSummary: string;
  recommendedStats: string[];
  difficultyRating: "Easy" | "Normal" | "Hard";
  baseStats: {
    hp: number;
    sp: number;
    attack: number;
    defense: number;
  };
  growthRates: {
    hp: number;
    sp: number;
    attack: number;
    defense: number;
  };
  startingWeaponId: string;
  allowedWeaponTypes: string[];
  startingSkillIds: string[];
  startingItemIds: string[];
  advancedClassOptions: string[];
}

export interface SkillDefinition {
  id: string;
  name: string;
  class: string;
  description: string;
  classId: string;
  type: "active" | "passive" | "toggle";
  targetingMode: "enemy" | "self" | "ground";
  requiredLevel: number;
  requiredSkillLevel: number;
  maxSkillLevel: number;
  spCost: number;
  cooldown: number;
  castTime: number;
  recoveryTime: number;
  range: number;
  area: number;
  element: string;
  scalingStat: "str" | "agi" | "vit" | "int" | "dex" | "luk" | "none";
  damageMultiplier: number;
  statusEffects: string[];
  animationKey: string;
  icon: string;
  passiveModifiers: {
    baseStats?: Record<string, number>;
    derivedStats?: Record<string, number>;
  };
  buff?: {
    duration: number;
    baseStats?: Record<string, number>;
    derivedStats?: Record<string, number>;
  };
  power: number;
  target: "enemy" | "self" | "ally";
}

export interface ItemDefinition {
  id: string;
  name: string;
  description: string;
  type: "weapon" | "armor" | "accessory" | "sigil" | "support" | "consumable" | "material" | "key";
  level?: number;
  rarity?: ItemRarity;
  icon?: string;
  equipmentSlot?: EquipmentSlot;
  validEquipmentSlots?: EquipmentSlot[];
  weaponType?: string;
  allowedClassIds?: string[];
  twoHanded?: boolean;
  statModifiers?: ItemStatModifiers;
  consumableEffect?: ConsumableEffectDefinition;
  appraisable?: boolean;
  value: number;
}

export type ItemRarity = "Common" | "Uncommon" | "Rare" | "Epic" | "Legendary" | "Mythic";

export interface ItemStatModifiers {
  baseStats?: Partial<BaseStats>;
  derivedStats?: Partial<Record<keyof DerivedStats, number>>;
  elementDamage?: Record<string, number>;
  raceDamage?: Record<string, number>;
  resistances?: Record<string, number>;
}

export interface ConsumableEffectDefinition {
  restoreHp?: number;
  restoreSp?: number;
  cooldownMs: number;
  statusEffectIds: string[];
  persistThroughMapTransition: boolean;
}

export interface MonsterDefinition {
  id: string;
  name: string;
  level: number;
  hp: number;
  attack: number;
  defense: number;
  xpReward: number;
  dropTableId: string;
  behavior: "passive" | "aggressive" | "assist" | "caster";
  aggroRange: number;
  attackRange: number;
  leashDistance: number;
  leashTimeoutMs: number;
  assistRadius: number;
  castRange: number;
  castCooldownMs: number;
  respawnMs: number;
  elite: boolean;
  boss: boolean;
}

export interface LevelRangeDefinition {
  min: number;
  max: number;
}

export interface RegionDefinition {
  id: string;
  name: string;
  levelRange: LevelRangeDefinition;
  description: string;
  mapIds: string[];
  dungeonIds: string[];
  monsterIds: string[];
  bossIds: string[];
}

export interface DropTableEntryDefinition {
  itemId?: string;
  type?: "item" | "gold";
  rarity?: ItemRarity;
  chance: number;
  minQuantity: number;
  maxQuantity: number;
}

export interface DropTableDefinition {
  id: string;
  entries: DropTableEntryDefinition[];
}

export interface MapPortalDefinition {
  id: string;
  name: string;
  targetMapId: string;
  targetSpawnName: string;
}

export interface MapSpawnGroupDefinition {
  id: string;
  monsterIds: string[];
  maxCount: number;
}

export interface MapDefinition {
  id: string;
  name: string;
  description: string;
  regionId: string;
  levelRange: LevelRangeDefinition;
  type: "town" | "field" | "dungeon" | "tower" | "coast" | "highlands" | "marsh";
  portals: MapPortalDefinition[];
  spawnGroups: MapSpawnGroupDefinition[];
  monsterIds: string[];
  npcIds: string[];
  musicKey: string;
  recommendedElements: string[];
  dropHighlights: string[];
  tilemapKey: string;
}

export interface DungeonRoomDefinition {
  id: string;
  name: string;
  encounterRole: "entrance" | "combat" | "hazard" | "treasure" | "miniboss" | "boss" | "shortcut";
}

export interface DungeonHazardDefinition {
  id: string;
  name: string;
  effect: string;
}

export interface DungeonDefinition {
  id: string;
  mapId: string;
  name: string;
  levelRange: LevelRangeDefinition;
  bossId: string;
  roomPlan: DungeonRoomDefinition[];
  enemyThemes: string[];
  hazardIds: string[];
  hazards: DungeonHazardDefinition[];
  rewardItemIds: string[];
  rareMaterialIds: string[];
  replayable: boolean;
  shortcutUnlockId: string;
  unlocksMapId: string;
  mechanics: string[];
  bossMechanics: string[];
}

export interface DialogueChoiceDefinition {
  id: string;
  label: string;
  disabled: boolean;
}

export interface DialogueDefinition {
  id: string;
  lines: string[];
  choices: DialogueChoiceDefinition[];
}

export interface NpcDefinition {
  id: string;
  name: string;
  mapId: string;
  interactionRadius: number;
  dialogueId: string;
  serviceType: string;
  shopId?: string;
}

export interface ShopStockEntryDefinition {
  itemId: string;
  quantity: number;
  priceMultiplier: number;
}

export interface AppraiserDefinition {
  identifyCostMultiplier: number;
  minIdentifyCost: number;
  improvedSellMultiplier: number;
}

export interface ShopDefinition {
  id: string;
  name: string;
  regionId: string;
  mapId: string;
  npcId: string;
  serviceType: "shop" | "appraiser";
  stock: ShopStockEntryDefinition[];
  appraiser?: AppraiserDefinition;
}

export interface RecipeDefinition {
  id: string;
  name: string;
  outputItemId: string;
  outputQuantity: number;
  requiredMaterials: RecipeMaterialRequirement[];
  requiredGold: number;
  requiredLevel: number;
  requiredRegionId?: string;
  requiredNpcId?: string;
  unlockCondition: RecipeUnlockCondition;
  ingredientItemIds: string[];
  resultItemId: string;
}

export interface RecipeMaterialRequirement {
  itemId: string;
  quantity: number;
}

export type RecipeUnlockCondition =
  | { type: "default" }
  | { type: "npc"; npcId: string }
  | { type: "bossDrop"; bossId: string }
  | { type: "quest"; questId: string }
  | { type: "huntingBoard"; boardId: string }
  | { type: "exploration"; regionId: string }
  | { type: "bestiaryMilestone"; enemyId: string; defeatCount: number };

export interface SupportDefinition {
  id: string;
  name: string;
  description: string;
  skillIds: string[];
}

export interface QuestDefinition {
  id: string;
  name: string;
  description: string;
  rewardItemIds: string[];
}

export interface StatusEffectDefinition {
  id: string;
  name: string;
  description: string;
  type: "damage" | "debuff" | "control" | "buff" | "mark";
  duration: number;
  tickInterval: number;
  stackBehavior: "refresh" | "stack" | "replace" | "ignore";
  maxStacks: number;
  statModifiers: {
    baseStats?: Record<string, number>;
    derivedStats?: Record<string, number>;
  };
  damageOverTime?: {
    amount: number;
    damageType: "physical" | "magic" | "true";
  };
  controlEffect?: "freeze" | "stun" | "silence" | "blind" | "slow";
  visualIcon: string;
  dispelRules: {
    dispellable: boolean;
    categories: string[];
  };
}

export interface XpTableDefinition {
  id: string;
  levels: Record<string, number>;
}

export interface DifficultyDefinition {
  id: string;
  name: string;
  enemyHpMultiplier: number;
  enemyDamageMultiplier: number;
}

export interface DataFileMap {
  classes: ClassDefinition;
  skills: SkillDefinition;
  items: ItemDefinition;
  monsters: MonsterDefinition;
  regions: RegionDefinition;
  dropTables: DropTableDefinition;
  maps: MapDefinition;
  dungeons: DungeonDefinition;
  dialogues: DialogueDefinition;
  npcs: NpcDefinition;
  shops: ShopDefinition;
  recipes: RecipeDefinition;
  supports: SupportDefinition;
  quests: QuestDefinition;
  statusEffects: StatusEffectDefinition;
  xpTables: XpTableDefinition;
  difficulties: DifficultyDefinition;
}

export type DataCollectionKey = keyof DataFileMap;
