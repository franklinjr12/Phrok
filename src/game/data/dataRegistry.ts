import type {
  ClassDefinition,
  DataCollectionKey,
  DataFileMap,
  DifficultyDefinition,
  DialogueDefinition,
  DropTableDefinition,
  ItemDefinition,
  MapDefinition,
  MonsterDefinition,
  NpcDefinition,
  QuestDefinition,
  RecipeDefinition,
  SkillDefinition,
  StatusEffectDefinition,
  SupportDefinition,
  XpTableDefinition,
} from "../types/dataDefinitions";
import {
  DataValidationError,
  isRecord,
  optionalNumber,
  optionalString,
  optionalStringArray,
  requireNumber,
  requireRecord,
  requireString,
} from "./dataValidation";

type FetchData = (input: string) => Promise<{
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
}>;

type CollectionMap<K extends DataCollectionKey> = Map<string, DataFileMap[K]>;

type DataCollections = {
  [Key in DataCollectionKey]: CollectionMap<Key>;
};

type Validator<K extends DataCollectionKey> = (
  source: Record<string, unknown>,
  fileName: string,
) => DataFileMap[K];

interface DataFileDescriptor<K extends DataCollectionKey> {
  key: K;
  fileName: string;
  validate: Validator<K>;
}

export class DataRegistry {
  constructor(private readonly collections: DataCollections) {}

  getClasses(): ClassDefinition[] {
    return Array.from(this.collections.classes.values());
  }

  getClass(id: string): ClassDefinition {
    return this.getById("classes", id);
  }

  getSkill(id: string): SkillDefinition {
    return this.getById("skills", id);
  }

  getSkills(): SkillDefinition[] {
    return Array.from(this.collections.skills.values());
  }

  getSkillsByClass(classId: string): SkillDefinition[] {
    return this.getSkills().filter((skill) => skill.classId === classId);
  }

  getItem(id: string): ItemDefinition {
    return this.getById("items", id);
  }

  getMonster(id: string): MonsterDefinition {
    return this.getById("monsters", id);
  }

  getDropTable(id: string): DropTableDefinition {
    return this.getById("dropTables", id);
  }

  getMap(id: string): MapDefinition {
    return this.getById("maps", id);
  }

  getDialogue(id: string): DialogueDefinition {
    return this.getById("dialogues", id);
  }

  getNpc(id: string): NpcDefinition {
    return this.getById("npcs", id);
  }

  getRecipe(id: string): RecipeDefinition {
    return this.getById("recipes", id);
  }

  getSupport(id: string): SupportDefinition {
    return this.getById("supports", id);
  }

  getQuest(id: string): QuestDefinition {
    return this.getById("quests", id);
  }

  getStatusEffect(id: string): StatusEffectDefinition {
    return this.getById("statusEffects", id);
  }

  getXpTable(id: string): XpTableDefinition {
    return this.getById("xpTables", id);
  }

  getDifficulty(id: string): DifficultyDefinition {
    return this.getById("difficulties", id);
  }

  private getById<K extends DataCollectionKey>(collection: K, id: string): DataFileMap[K] {
    const entry = this.collections[collection].get(id);

    if (!entry) {
      throw new DataValidationError(`Missing ${collection} data for ID "${id}".`);
    }

    return entry;
  }
}

export async function loadDataRegistry(
  basePath = "/assets/data",
  fetchData: FetchData = window.fetch.bind(window),
): Promise<DataRegistry> {
  const collections = createEmptyCollections();

  for (const descriptor of dataFiles) {
    const entries = await loadDataFile(descriptor, basePath, fetchData);
    setCollection(collections, descriptor.key, entries);
  }

  return new DataRegistry(collections);
}

function setCollection<K extends DataCollectionKey>(
  collections: DataCollections,
  key: K,
  entries: CollectionMap<K>,
): void {
  const writableCollections = collections as Record<K, CollectionMap<K>>;
  writableCollections[key] = entries;
}

async function loadDataFile<K extends DataCollectionKey>(
  descriptor: DataFileDescriptor<K>,
  basePath: string,
  fetchData: FetchData,
): Promise<CollectionMap<K>> {
  const path = `${basePath}/${descriptor.fileName}`;
  const response = await fetchData(path);

  if (!response.ok) {
    throw new DataValidationError(`Could not load ${descriptor.fileName}; request failed with ${response.status}.`);
  }

  const json = await response.json();

  if (!Array.isArray(json)) {
    throw new DataValidationError(`${descriptor.fileName} must contain an array of entries.`);
  }

  const entries: CollectionMap<K> = new Map();

  for (const rawEntry of json) {
    if (!isRecord(rawEntry)) {
      throw new DataValidationError(`${descriptor.fileName} contains an entry that is not an object.`);
    }

    const entry = descriptor.validate(rawEntry, descriptor.fileName);
    entries.set(entry.id, entry);
  }

  return entries;
}

function createEmptyCollections(): DataCollections {
  return {
    classes: new Map(),
    skills: new Map(),
    items: new Map(),
    monsters: new Map(),
    dropTables: new Map(),
    maps: new Map(),
    dialogues: new Map(),
    npcs: new Map(),
    recipes: new Map(),
    supports: new Map(),
    quests: new Map(),
    statusEffects: new Map(),
    xpTables: new Map(),
    difficulties: new Map(),
  };
}

const dataFiles = [
  { key: "classes", fileName: "classes.json", validate: validateClass },
  { key: "skills", fileName: "skills.json", validate: validateSkill },
  { key: "items", fileName: "items.json", validate: validateItem },
  { key: "monsters", fileName: "monsters.json", validate: validateMonster },
  { key: "dropTables", fileName: "drop-tables.json", validate: validateDropTable },
  { key: "maps", fileName: "maps.json", validate: validateMap },
  { key: "dialogues", fileName: "dialogues.json", validate: validateDialogue },
  { key: "npcs", fileName: "npcs.json", validate: validateNpc },
  { key: "recipes", fileName: "recipes.json", validate: validateRecipe },
  { key: "supports", fileName: "supports.json", validate: validateSupport },
  { key: "quests", fileName: "quests.json", validate: validateQuest },
  { key: "statusEffects", fileName: "status-effects.json", validate: validateStatusEffect },
  { key: "xpTables", fileName: "xp-tables.json", validate: validateXpTable },
  { key: "difficulties", fileName: "difficulties.json", validate: validateDifficulty },
] satisfies DataFileDescriptor<DataCollectionKey>[];

function validateClass(source: Record<string, unknown>, fileName: string): ClassDefinition {
  const id = readId(source, fileName);
  const baseStats = requireRecord(source, "baseStats", fileName, id);
  const growthRates = requireRecord(source, "growthRates", fileName, id);
  const difficultyRating = optionalString(source, "difficultyRating", "Normal");

  return {
    id,
    name: requireString(source, "name", fileName, id),
    description: optionalString(source, "description", ""),
    roleSummary: optionalString(source, "roleSummary", ""),
    recommendedStats: optionalStringArray(source, "recommendedStats"),
    difficultyRating: difficultyRating === "Easy" || difficultyRating === "Hard" ? difficultyRating : "Normal",
    baseStats: {
      hp: requireNumber(baseStats, "hp", fileName, id),
      sp: requireNumber(baseStats, "sp", fileName, id),
      attack: requireNumber(baseStats, "attack", fileName, id),
      defense: requireNumber(baseStats, "defense", fileName, id),
    },
    growthRates: {
      hp: requireNumber(growthRates, "hp", fileName, id),
      sp: requireNumber(growthRates, "sp", fileName, id),
      attack: requireNumber(growthRates, "attack", fileName, id),
      defense: requireNumber(growthRates, "defense", fileName, id),
    },
    startingWeaponId: requireString(source, "startingWeaponId", fileName, id),
    allowedWeaponTypes: optionalStringArray(source, "allowedWeaponTypes"),
    startingSkillIds: optionalStringArray(source, "startingSkillIds"),
    startingItemIds: optionalStringArray(source, "startingItemIds"),
    advancedClassOptions: optionalStringArray(source, "advancedClassOptions"),
  };
}

function validateSkill(source: Record<string, unknown>, fileName: string): SkillDefinition {
  const id = readId(source, fileName);
  const target = optionalString(source, "target", "enemy");
  const type = optionalString(source, "type", "active");
  const targetingMode = optionalString(source, "targetingMode", target === "self" ? "self" : "enemy");
  const scalingStat = optionalString(source, "scalingStat", "str");

  return {
    id,
    name: requireString(source, "name", fileName, id),
    class: optionalString(source, "class", optionalString(source, "classId", "")),
    description: optionalString(source, "description", ""),
    classId: requireString(source, "classId", fileName, id),
    type: type === "passive" || type === "toggle" ? type : "active",
    targetingMode: targetingMode === "self" || targetingMode === "ground" ? targetingMode : "enemy",
    requiredLevel: optionalNumber(source, "requiredLevel", 1),
    requiredSkillLevel: optionalNumber(source, "requiredSkillLevel", 0),
    maxSkillLevel: optionalNumber(source, "maxSkillLevel", 5),
    spCost: optionalNumber(source, "spCost", 0),
    cooldown: optionalNumber(source, "cooldown", 0),
    castTime: optionalNumber(source, "castTime", 0),
    recoveryTime: optionalNumber(source, "recoveryTime", 0),
    range: optionalNumber(source, "range", 72),
    area: optionalNumber(source, "area", 0),
    element: optionalString(source, "element", "neutral"),
    scalingStat: isBaseScalingStat(scalingStat) ? scalingStat : "none",
    damageMultiplier: optionalNumber(source, "damageMultiplier", 1),
    statusEffects: optionalStringArray(source, "statusEffects"),
    animationKey: optionalString(source, "animationKey", id),
    icon: optionalString(source, "icon", id),
    passiveModifiers: normalizeSkillModifier(source.passiveModifiers),
    buff: normalizeSkillBuff(source.buff),
    power: requireNumber(source, "power", fileName, id),
    target: target === "self" || target === "ally" ? target : "enemy",
  };
}

function isBaseScalingStat(value: string): value is SkillDefinition["scalingStat"] {
  return value === "str"
    || value === "agi"
    || value === "vit"
    || value === "int"
    || value === "dex"
    || value === "luk"
    || value === "none";
}

function normalizeSkillModifier(rawModifier: unknown): SkillDefinition["passiveModifiers"] {
  if (!isRecord(rawModifier)) {
    return {};
  }

  return {
    baseStats: optionalNumberRecord(rawModifier.baseStats),
    derivedStats: optionalNumberRecord(rawModifier.derivedStats),
  };
}

function normalizeSkillBuff(rawBuff: unknown): SkillDefinition["buff"] {
  if (!isRecord(rawBuff)) {
    return undefined;
  }

  return {
    duration: optionalNumber(rawBuff, "duration", 5000),
    baseStats: optionalNumberRecord(rawBuff.baseStats),
    derivedStats: optionalNumberRecord(rawBuff.derivedStats),
  };
}

function optionalNumberRecord(rawRecord: unknown): Record<string, number> | undefined {
  if (!isRecord(rawRecord)) {
    return undefined;
  }

  const entries = Object.entries(rawRecord).filter((entry): entry is [string, number] => (
    typeof entry[1] === "number" && Number.isFinite(entry[1])
  ));

  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

function validateItem(source: Record<string, unknown>, fileName: string): ItemDefinition {
  const id = readId(source, fileName);
  const type = optionalString(source, "type", "material");

  return {
    id,
    name: requireString(source, "name", fileName, id),
    description: optionalString(source, "description", ""),
    type: type === "weapon" || type === "armor" || type === "consumable" || type === "key" ? type : "material",
    value: optionalNumber(source, "value", 0),
  };
}

function validateMonster(source: Record<string, unknown>, fileName: string): MonsterDefinition {
  const id = readId(source, fileName);

  return {
    id,
    name: requireString(source, "name", fileName, id),
    level: optionalNumber(source, "level", 1),
    hp: requireNumber(source, "hp", fileName, id),
    attack: requireNumber(source, "attack", fileName, id),
    defense: optionalNumber(source, "defense", 0),
    xpReward: optionalNumber(source, "xpReward", 0),
    dropTableId: requireString(source, "dropTableId", fileName, id),
  };
}

function validateDropTable(source: Record<string, unknown>, fileName: string): DropTableDefinition {
  const id = readId(source, fileName);
  const entries = source.entries;

  return {
    id,
    entries: Array.isArray(entries)
      ? entries.filter(isRecord).map((entry) => {
        const type = optionalString(entry, "type", "item");
        const itemId = type === "gold" ? optionalString(entry, "itemId", "") : requireString(entry, "itemId", fileName, id);

        return {
          itemId: itemId || undefined,
          type: type === "gold" ? "gold" : "item",
          chance: requireNumber(entry, "chance", fileName, id),
          minQuantity: optionalNumber(entry, "minQuantity", 1),
          maxQuantity: optionalNumber(entry, "maxQuantity", 1),
        };
      })
      : [],
  };
}

function validateMap(source: Record<string, unknown>, fileName: string): MapDefinition {
  const id = readId(source, fileName);

  return {
    id,
    name: requireString(source, "name", fileName, id),
    description: optionalString(source, "description", ""),
    monsterIds: optionalStringArray(source, "monsterIds"),
    npcIds: optionalStringArray(source, "npcIds"),
  };
}

function validateDialogue(source: Record<string, unknown>, fileName: string): DialogueDefinition {
  const id = readId(source, fileName);
  const lines = source.lines;
  const choices = source.choices;

  return {
    id,
    lines: Array.isArray(lines)
      ? lines.filter((line): line is string => typeof line === "string" && line.length > 0)
      : [optionalString(source, "text", "")].filter((line) => line.length > 0),
    choices: Array.isArray(choices)
      ? choices.filter(isRecord).map((choice) => ({
        id: optionalString(choice, "id", "choice"),
        label: requireString(choice, "label", fileName, id),
        disabled: Boolean(choice.disabled),
      }))
      : [],
  };
}

function validateNpc(source: Record<string, unknown>, fileName: string): NpcDefinition {
  const id = readId(source, fileName);

  return {
    id,
    name: requireString(source, "name", fileName, id),
    mapId: requireString(source, "mapId", fileName, id),
    interactionRadius: optionalNumber(source, "interactionRadius", 72),
    dialogueId: optionalString(source, "dialogueId", ""),
    serviceType: optionalString(source, "serviceType", "talk"),
  };
}

function validateRecipe(source: Record<string, unknown>, fileName: string): RecipeDefinition {
  const id = readId(source, fileName);

  return {
    id,
    name: requireString(source, "name", fileName, id),
    ingredientItemIds: optionalStringArray(source, "ingredientItemIds"),
    resultItemId: requireString(source, "resultItemId", fileName, id),
  };
}

function validateSupport(source: Record<string, unknown>, fileName: string): SupportDefinition {
  const id = readId(source, fileName);

  return {
    id,
    name: requireString(source, "name", fileName, id),
    description: optionalString(source, "description", ""),
    skillIds: optionalStringArray(source, "skillIds"),
  };
}

function validateQuest(source: Record<string, unknown>, fileName: string): QuestDefinition {
  const id = readId(source, fileName);

  return {
    id,
    name: requireString(source, "name", fileName, id),
    description: optionalString(source, "description", ""),
    rewardItemIds: optionalStringArray(source, "rewardItemIds"),
  };
}

function validateStatusEffect(source: Record<string, unknown>, fileName: string): StatusEffectDefinition {
  const id = readId(source, fileName);

  return {
    id,
    name: requireString(source, "name", fileName, id),
    description: optionalString(source, "description", ""),
    durationTurns: optionalNumber(source, "durationTurns", 1),
  };
}

function validateXpTable(source: Record<string, unknown>, fileName: string): XpTableDefinition {
  const id = readId(source, fileName);
  const levels = requireRecord(source, "levels", fileName, id);
  const parsedLevels: Record<string, number> = {};

  for (const [level, xp] of Object.entries(levels)) {
    if (typeof xp === "number" && Number.isFinite(xp)) {
      parsedLevels[level] = xp;
    }
  }

  return { id, levels: parsedLevels };
}

function validateDifficulty(source: Record<string, unknown>, fileName: string): DifficultyDefinition {
  const id = readId(source, fileName);

  return {
    id,
    name: requireString(source, "name", fileName, id),
    enemyHpMultiplier: optionalNumber(source, "enemyHpMultiplier", 1),
    enemyDamageMultiplier: optionalNumber(source, "enemyDamageMultiplier", 1),
  };
}

function readId(source: Record<string, unknown>, fileName: string): string {
  return requireString(source, "id", fileName, "unknown");
}
