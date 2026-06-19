export interface ClassDefinition {
  id: string;
  name: string;
  description: string;
  baseStats: {
    hp: number;
    sp: number;
    attack: number;
    defense: number;
  };
  startingSkillIds: string[];
  startingItemIds: string[];
}

export interface SkillDefinition {
  id: string;
  name: string;
  description: string;
  classId: string;
  spCost: number;
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

export interface NpcDefinition {
  id: string;
  name: string;
  mapId: string;
  dialogueId: string;
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
  durationTurns: number;
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
  npcs: NpcDefinition;
  recipes: RecipeDefinition;
  supports: SupportDefinition;
  quests: QuestDefinition;
  statusEffects: StatusEffectDefinition;
  xpTables: XpTableDefinition;
  difficulties: DifficultyDefinition;
}

export type DataCollectionKey = keyof DataFileMap;
