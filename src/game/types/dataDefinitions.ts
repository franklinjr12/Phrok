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
  type: "weapon" | "armor" | "consumable" | "material" | "key";
  value: number;
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
}

export interface DropTableEntryDefinition {
  itemId?: string;
  type?: "item" | "gold";
  chance: number;
  minQuantity: number;
  maxQuantity: number;
}

export interface DropTableDefinition {
  id: string;
  entries: DropTableEntryDefinition[];
}

export interface MapDefinition {
  id: string;
  name: string;
  description: string;
  monsterIds: string[];
  npcIds: string[];
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
}

export interface RecipeDefinition {
  id: string;
  name: string;
  ingredientItemIds: string[];
  resultItemId: string;
}

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
  dropTables: DropTableDefinition;
  maps: MapDefinition;
  dialogues: DialogueDefinition;
  npcs: NpcDefinition;
  recipes: RecipeDefinition;
  supports: SupportDefinition;
  quests: QuestDefinition;
  statusEffects: StatusEffectDefinition;
  xpTables: XpTableDefinition;
  difficulties: DifficultyDefinition;
}

export type DataCollectionKey = keyof DataFileMap;
