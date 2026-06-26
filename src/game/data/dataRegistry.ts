import type {
  ClassDefinition,
  DataCollectionKey,
  DataFileMap,
  DifficultyDefinition,
  DialogueDefinition,
  DungeonDefinition,
  DropTableDefinition,
  ItemDefinition,
  ItemRarity,
  ItemStatModifiers,
  MapDefinition,
  MonsterDefinition,
  NpcDefinition,
  QuestDefinition,
  RegionDefinition,
  RecipeDefinition,
  ShopDefinition,
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

  getItems(): ItemDefinition[] {
    return Array.from(this.collections.items.values());
  }

  getMonster(id: string): MonsterDefinition {
    return this.getById("monsters", id);
  }

  getRegion(id: string): RegionDefinition {
    return this.getById("regions", id);
  }

  getRegions(): RegionDefinition[] {
    return Array.from(this.collections.regions.values());
  }

  getDropTable(id: string): DropTableDefinition {
    return this.getById("dropTables", id);
  }

  getMap(id: string): MapDefinition {
    return this.getById("maps", id);
  }

  getMaps(): MapDefinition[] {
    return Array.from(this.collections.maps.values());
  }

  getDungeon(id: string): DungeonDefinition {
    return this.getById("dungeons", id);
  }

  getDungeons(): DungeonDefinition[] {
    return Array.from(this.collections.dungeons.values());
  }

  getDungeonByMapId(mapId: string): DungeonDefinition | undefined {
    return this.getDungeons().find((dungeon) => dungeon.mapId === mapId);
  }

  getDialogue(id: string): DialogueDefinition {
    return this.getById("dialogues", id);
  }

  getNpc(id: string): NpcDefinition {
    return this.getById("npcs", id);
  }

  getShop(id: string): ShopDefinition {
    return this.getById("shops", id);
  }

  getShops(): ShopDefinition[] {
    return Array.from(this.collections.shops.values());
  }

  getShopByNpcId(npcId: string): ShopDefinition | undefined {
    return this.getShops().find((shop) => shop.npcId === npcId);
  }

  getRecipe(id: string): RecipeDefinition {
    return this.getById("recipes", id);
  }

  getRecipes(): RecipeDefinition[] {
    return Array.from(this.collections.recipes.values());
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
    regions: new Map(),
    dropTables: new Map(),
    maps: new Map(),
    dungeons: new Map(),
    dialogues: new Map(),
    npcs: new Map(),
    shops: new Map(),
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
  { key: "regions", fileName: "regions.json", validate: validateRegion },
  { key: "dropTables", fileName: "drop-tables.json", validate: validateDropTable },
  { key: "maps", fileName: "maps.json", validate: validateMap },
  { key: "dungeons", fileName: "dungeons.json", validate: validateDungeon },
  { key: "dialogues", fileName: "dialogues.json", validate: validateDialogue },
  { key: "npcs", fileName: "npcs.json", validate: validateNpc },
  { key: "shops", fileName: "shops.json", validate: validateShop },
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
  const rarity = normalizeItemRarity(optionalString(source, "rarity", "Common"));
  const equipmentSlot = normalizeEquipmentSlot(optionalString(source, "equipmentSlot", ""));
  const validEquipmentSlots = validateEquipmentSlots(source.validEquipmentSlots);

  return {
    id,
    name: requireString(source, "name", fileName, id),
    description: optionalString(source, "description", ""),
    type: normalizeItemType(type),
    level: Math.max(1, optionalNumber(source, "level", 1)),
    rarity,
    icon: optionalString(source, "icon", `placeholder-${id}`),
    equipmentSlot,
    validEquipmentSlots: validEquipmentSlots.length > 0
      ? validEquipmentSlots
      : getDefaultEquipmentSlots(normalizeItemType(type), equipmentSlot),
    weaponType: optionalString(source, "weaponType", "") || undefined,
    allowedClassIds: optionalStringArray(source, "allowedClassIds"),
    twoHanded: Boolean(source.twoHanded),
    statModifiers: normalizeItemModifier(source.statModifiers),
    consumableEffect: normalizeConsumableEffect(source.consumableEffect),
    appraisable: Boolean(source.appraisable),
    value: optionalNumber(source, "value", 0),
  };
}

function normalizeItemType(value: string): ItemDefinition["type"] {
  return value === "weapon"
    || value === "armor"
    || value === "accessory"
    || value === "sigil"
    || value === "support"
    || value === "consumable"
    || value === "key"
    ? value
    : "material";
}

function normalizeItemRarity(value: string): ItemRarity {
  return value === "Uncommon"
    || value === "Rare"
    || value === "Epic"
    || value === "Legendary"
    || value === "Mythic"
    ? value
    : "Common";
}

function normalizeEquipmentSlot(value: string): ItemDefinition["equipmentSlot"] {
  return value === "weapon"
    || value === "offhand"
    || value === "head"
    || value === "body"
    || value === "cloak"
    || value === "boots"
    || value === "accessory1"
    || value === "accessory2"
    || value === "sigil"
    || value === "supportCharm"
    ? value
    : undefined;
}

function validateEquipmentSlots(rawSlots: unknown): NonNullable<ItemDefinition["validEquipmentSlots"]> {
  return Array.isArray(rawSlots)
    ? rawSlots.map((slot) => typeof slot === "string" ? normalizeEquipmentSlot(slot) : undefined)
      .filter((slot): slot is NonNullable<ItemDefinition["equipmentSlot"]> => Boolean(slot))
    : [];
}

function getDefaultEquipmentSlots(
  type: ItemDefinition["type"],
  equipmentSlot: ItemDefinition["equipmentSlot"],
): NonNullable<ItemDefinition["validEquipmentSlots"]> {
  if (equipmentSlot) {
    return [equipmentSlot];
  }

  if (type === "weapon") {
    return ["weapon"];
  }

  if (type === "armor") {
    return ["body"];
  }

  if (type === "accessory") {
    return ["accessory1", "accessory2"];
  }

  if (type === "sigil") {
    return ["sigil"];
  }

  if (type === "support") {
    return ["supportCharm"];
  }

  return [];
}

function normalizeItemModifier(rawModifier: unknown): ItemStatModifiers {
  if (!isRecord(rawModifier)) {
    return {};
  }

  return {
    baseStats: optionalNumberRecord(rawModifier.baseStats),
    derivedStats: optionalNumberRecord(rawModifier.derivedStats) as ItemStatModifiers["derivedStats"],
    elementDamage: optionalNumberRecord(rawModifier.elementDamage),
    raceDamage: optionalNumberRecord(rawModifier.raceDamage),
    resistances: optionalNumberRecord(rawModifier.resistances),
  };
}

function normalizeConsumableEffect(rawEffect: unknown): ItemDefinition["consumableEffect"] {
  if (!isRecord(rawEffect)) {
    return undefined;
  }

  return {
    restoreHp: optionalPositiveNumber(rawEffect, "restoreHp"),
    restoreSp: optionalPositiveNumber(rawEffect, "restoreSp"),
    cooldownMs: Math.max(0, optionalNumber(rawEffect, "cooldownMs", 0)),
    statusEffectIds: optionalStringArray(rawEffect, "statusEffectIds"),
    persistThroughMapTransition: Boolean(rawEffect.persistThroughMapTransition),
  };
}

function optionalPositiveNumber(source: Record<string, unknown>, key: string): number | undefined {
  const value = source[key];

  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, value)
    : undefined;
}

function validateMonster(source: Record<string, unknown>, fileName: string): MonsterDefinition {
  const id = readId(source, fileName);
  const behavior = optionalString(source, "behavior", "passive");

  return {
    id,
    name: requireString(source, "name", fileName, id),
    level: optionalNumber(source, "level", 1),
    hp: requireNumber(source, "hp", fileName, id),
    attack: requireNumber(source, "attack", fileName, id),
    defense: optionalNumber(source, "defense", 0),
    xpReward: optionalNumber(source, "xpReward", 0),
    dropTableId: requireString(source, "dropTableId", fileName, id),
    behavior: normalizeMonsterBehavior(behavior),
    aggroRange: optionalNumber(source, "aggroRange", 180),
    attackRange: optionalNumber(source, "attackRange", 70),
    leashDistance: optionalNumber(source, "leashDistance", 320),
    leashTimeoutMs: optionalNumber(source, "leashTimeoutMs", 8000),
    assistRadius: optionalNumber(source, "assistRadius", 140),
    castRange: optionalNumber(source, "castRange", 160),
    castCooldownMs: optionalNumber(source, "castCooldownMs", 2200),
    respawnMs: optionalNumber(source, "respawnMs", 8000),
    elite: Boolean(source.elite),
    boss: Boolean(source.boss),
  };
}

function validateRegion(source: Record<string, unknown>, fileName: string): RegionDefinition {
  const id = readId(source, fileName);

  return {
    id,
    name: requireString(source, "name", fileName, id),
    levelRange: validateLevelRange(source, fileName, id),
    description: optionalString(source, "description", ""),
    mapIds: optionalStringArray(source, "mapIds"),
    dungeonIds: optionalStringArray(source, "dungeonIds"),
    monsterIds: optionalStringArray(source, "monsterIds"),
    bossIds: optionalStringArray(source, "bossIds"),
  };
}

function normalizeMonsterBehavior(value: string): MonsterDefinition["behavior"] {
  return value === "aggressive" || value === "assist" || value === "caster" ? value : "passive";
}

function validateDropTable(source: Record<string, unknown>, fileName: string): DropTableDefinition {
  const id = readId(source, fileName);
  const entries = source.entries;

  return {
    id,
    entries: Array.isArray(entries)
      ? entries.filter(isRecord).map((entry) => {
        const type = optionalString(entry, "type", "item");
        const rarity = normalizeItemRarity(optionalString(entry, "rarity", ""));
        const itemId = type === "gold" || entry.rarity
          ? optionalString(entry, "itemId", "")
          : requireString(entry, "itemId", fileName, id);

        return {
          itemId: itemId || undefined,
          type: type === "gold" ? "gold" : "item",
          rarity: entry.rarity ? rarity : undefined,
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
  const type = optionalString(source, "type", "field");

  return {
    id,
    name: requireString(source, "name", fileName, id),
    description: optionalString(source, "description", ""),
    regionId: requireString(source, "regionId", fileName, id),
    levelRange: validateLevelRange(source, fileName, id),
    type: normalizeMapType(type),
    portals: validateMapPortals(source.portals, fileName, id),
    spawnGroups: validateMapSpawnGroups(source.spawnGroups, fileName, id),
    monsterIds: optionalStringArray(source, "monsterIds"),
    npcIds: optionalStringArray(source, "npcIds"),
    musicKey: requireString(source, "musicKey", fileName, id),
    recommendedElements: optionalStringArray(source, "recommendedElements"),
    dropHighlights: optionalStringArray(source, "dropHighlights"),
    tilemapKey: optionalString(source, "tilemapKey", `map-${id}`),
  };
}

function validateDungeon(source: Record<string, unknown>, fileName: string): DungeonDefinition {
  const id = readId(source, fileName);

  return {
    id,
    mapId: requireString(source, "mapId", fileName, id),
    name: requireString(source, "name", fileName, id),
    levelRange: validateLevelRange(source, fileName, id),
    bossId: requireString(source, "bossId", fileName, id),
    roomPlan: validateDungeonRooms(source.roomPlan, fileName, id),
    enemyThemes: optionalStringArray(source, "enemyThemes"),
    hazardIds: optionalStringArray(source, "hazardIds"),
    hazards: validateDungeonHazards(source.hazards, fileName, id),
    rewardItemIds: optionalStringArray(source, "rewardItemIds"),
    rareMaterialIds: optionalStringArray(source, "rareMaterialIds"),
    replayable: source.replayable !== false,
    shortcutUnlockId: optionalString(source, "shortcutUnlockId", ""),
    unlocksMapId: optionalString(source, "unlocksMapId", ""),
    mechanics: optionalStringArray(source, "mechanics"),
    bossMechanics: optionalStringArray(source, "bossMechanics"),
  };
}

function validateDungeonRooms(
  rawRooms: unknown,
  fileName: string,
  id: string,
): DungeonDefinition["roomPlan"] {
  return Array.isArray(rawRooms)
    ? rawRooms.filter(isRecord).map((room) => {
      const role = optionalString(room, "encounterRole", "combat");

      return {
        id: requireString(room, "id", fileName, id),
        name: requireString(room, "name", fileName, id),
        encounterRole: normalizeDungeonRoomRole(role),
      };
    })
    : [];
}

function normalizeDungeonRoomRole(value: string): DungeonDefinition["roomPlan"][number]["encounterRole"] {
  return value === "entrance"
    || value === "hazard"
    || value === "treasure"
    || value === "miniboss"
    || value === "boss"
    || value === "shortcut"
    ? value
    : "combat";
}

function validateDungeonHazards(
  rawHazards: unknown,
  fileName: string,
  id: string,
): DungeonDefinition["hazards"] {
  return Array.isArray(rawHazards)
    ? rawHazards.filter(isRecord).map((hazard) => ({
      id: requireString(hazard, "id", fileName, id),
      name: requireString(hazard, "name", fileName, id),
      effect: requireString(hazard, "effect", fileName, id),
    }))
    : [];
}

function validateLevelRange(
  source: Record<string, unknown>,
  fileName: string,
  id: string,
): MapDefinition["levelRange"] {
  const levelRange = requireRecord(source, "levelRange", fileName, id);

  return {
    min: requireNumber(levelRange, "min", fileName, id),
    max: requireNumber(levelRange, "max", fileName, id),
  };
}

function normalizeMapType(value: string): MapDefinition["type"] {
  return value === "town"
    || value === "dungeon"
    || value === "tower"
    || value === "coast"
    || value === "highlands"
    || value === "marsh"
    ? value
    : "field";
}

function validateMapPortals(
  rawPortals: unknown,
  fileName: string,
  id: string,
): MapDefinition["portals"] {
  return Array.isArray(rawPortals)
    ? rawPortals.filter(isRecord).map((portal) => ({
      id: requireString(portal, "id", fileName, id),
      name: optionalString(portal, "name", requireString(portal, "id", fileName, id)),
      targetMapId: requireString(portal, "targetMapId", fileName, id),
      targetSpawnName: requireString(portal, "targetSpawnName", fileName, id),
    }))
    : [];
}

function validateMapSpawnGroups(
  rawSpawnGroups: unknown,
  fileName: string,
  id: string,
): MapDefinition["spawnGroups"] {
  return Array.isArray(rawSpawnGroups)
    ? rawSpawnGroups.filter(isRecord).map((spawnGroup) => ({
      id: requireString(spawnGroup, "id", fileName, id),
      monsterIds: optionalStringArray(spawnGroup, "monsterIds"),
      maxCount: Math.max(1, optionalNumber(spawnGroup, "maxCount", 1)),
    }))
    : [];
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
    shopId: optionalString(source, "shopId", "") || undefined,
  };
}

function validateShop(source: Record<string, unknown>, fileName: string): ShopDefinition {
  const id = readId(source, fileName);
  const serviceType = optionalString(source, "serviceType", "shop");

  return {
    id,
    name: requireString(source, "name", fileName, id),
    regionId: requireString(source, "regionId", fileName, id),
    mapId: requireString(source, "mapId", fileName, id),
    npcId: requireString(source, "npcId", fileName, id),
    serviceType: serviceType === "appraiser" ? "appraiser" : "shop",
    stock: validateShopStock(source.stock, fileName, id),
    appraiser: validateAppraiser(source.appraiser),
  };
}

function validateShopStock(
  rawStock: unknown,
  fileName: string,
  id: string,
): ShopDefinition["stock"] {
  return Array.isArray(rawStock)
    ? rawStock.filter(isRecord).map((entry) => ({
      itemId: requireString(entry, "itemId", fileName, id),
      quantity: Math.max(1, optionalNumber(entry, "quantity", 1)),
      priceMultiplier: Math.max(0.1, optionalNumber(entry, "priceMultiplier", 1.8)),
    }))
    : [];
}

function validateAppraiser(rawAppraiser: unknown): ShopDefinition["appraiser"] {
  if (!isRecord(rawAppraiser)) {
    return undefined;
  }

  return {
    identifyCostMultiplier: Math.max(0, optionalNumber(rawAppraiser, "identifyCostMultiplier", 0.35)),
    minIdentifyCost: Math.max(0, optionalNumber(rawAppraiser, "minIdentifyCost", 15)),
    improvedSellMultiplier: Math.max(1, optionalNumber(rawAppraiser, "improvedSellMultiplier", 1.25)),
  };
}

function validateRecipe(source: Record<string, unknown>, fileName: string): RecipeDefinition {
  const id = readId(source, fileName);
  const resultItemId = optionalString(source, "resultItemId", optionalString(source, "outputItemId", ""));
  const outputItemId = optionalString(source, "outputItemId", resultItemId);
  const requiredMaterials = validateRecipeMaterials(
    source.requiredMaterials,
    optionalStringArray(source, "ingredientItemIds"),
    fileName,
    id,
  );

  return {
    id,
    name: requireString(source, "name", fileName, id),
    outputItemId: outputItemId || requireString(source, "resultItemId", fileName, id),
    outputQuantity: Math.max(1, optionalNumber(source, "outputQuantity", 1)),
    requiredMaterials,
    requiredGold: Math.max(0, optionalNumber(source, "requiredGold", 0)),
    requiredLevel: Math.max(1, optionalNumber(source, "requiredLevel", 1)),
    requiredRegionId: optionalString(source, "requiredRegionId", "") || undefined,
    requiredNpcId: optionalString(source, "requiredNpcId", "") || undefined,
    unlockCondition: validateRecipeUnlockCondition(source.unlockCondition),
    ingredientItemIds: requiredMaterials.map((material) => material.itemId),
    resultItemId: outputItemId || requireString(source, "resultItemId", fileName, id),
  };
}

function validateRecipeMaterials(
  rawMaterials: unknown,
  fallbackIngredientIds: string[],
  fileName: string,
  id: string,
): RecipeDefinition["requiredMaterials"] {
  if (Array.isArray(rawMaterials)) {
    return rawMaterials.filter(isRecord).map((material) => ({
      itemId: requireString(material, "itemId", fileName, id),
      quantity: Math.max(1, optionalNumber(material, "quantity", 1)),
    }));
  }

  return fallbackIngredientIds.map((itemId) => ({ itemId, quantity: 1 }));
}

function validateRecipeUnlockCondition(rawCondition: unknown): RecipeDefinition["unlockCondition"] {
  if (!isRecord(rawCondition)) {
    return { type: "default" };
  }

  const type = optionalString(rawCondition, "type", "default");

  if (type === "npc") {
    return { type, npcId: optionalString(rawCondition, "npcId", "") };
  }

  if (type === "bossDrop") {
    return { type, bossId: optionalString(rawCondition, "bossId", "") };
  }

  if (type === "quest") {
    return { type, questId: optionalString(rawCondition, "questId", "") };
  }

  if (type === "huntingBoard") {
    return { type, boardId: optionalString(rawCondition, "boardId", "") };
  }

  if (type === "exploration") {
    return { type, regionId: optionalString(rawCondition, "regionId", "") };
  }

  if (type === "bestiaryMilestone") {
    return {
      type,
      enemyId: optionalString(rawCondition, "enemyId", ""),
      defeatCount: Math.max(1, optionalNumber(rawCondition, "defeatCount", 1)),
    };
  }

  return { type: "default" };
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
  const type = optionalString(source, "type", "debuff");
  const stackBehavior = optionalString(source, "stackBehavior", "refresh");
  const controlEffect = optionalString(source, "controlEffect", "");
  const damageOverTime = isRecord(source.damageOverTime)
    ? {
      amount: optionalNumber(source.damageOverTime, "amount", 0),
      damageType: normalizeDamageType(optionalString(source.damageOverTime, "damageType", "true")),
    }
    : undefined;
  const dispelRules = isRecord(source.dispelRules) ? source.dispelRules : {};

  return {
    id,
    name: requireString(source, "name", fileName, id),
    description: optionalString(source, "description", ""),
    type: normalizeStatusType(type),
    duration: optionalNumber(source, "duration", optionalNumber(source, "durationTurns", 1) * 1000),
    tickInterval: optionalNumber(source, "tickInterval", 1000),
    stackBehavior: normalizeStackBehavior(stackBehavior),
    maxStacks: Math.max(1, optionalNumber(source, "maxStacks", 1)),
    statModifiers: normalizeSkillModifier(source.statModifiers),
    damageOverTime: damageOverTime && damageOverTime.amount > 0 ? damageOverTime : undefined,
    controlEffect: normalizeControlEffect(controlEffect),
    visualIcon: optionalString(source, "visualIcon", optionalString(source, "icon", id)),
    dispelRules: {
      dispellable: typeof dispelRules.dispellable === "boolean" ? dispelRules.dispellable : true,
      categories: optionalStringArray(dispelRules, "categories"),
    },
  };
}

function normalizeStatusType(value: string): StatusEffectDefinition["type"] {
  return value === "damage"
    || value === "debuff"
    || value === "control"
    || value === "buff"
    || value === "mark"
    ? value
    : "debuff";
}

function normalizeStackBehavior(value: string): StatusEffectDefinition["stackBehavior"] {
  return value === "stack" || value === "replace" || value === "ignore" ? value : "refresh";
}

function normalizeControlEffect(value: string): StatusEffectDefinition["controlEffect"] | undefined {
  return value === "freeze"
    || value === "stun"
    || value === "silence"
    || value === "blind"
    || value === "slow"
    ? value
    : undefined;
}

function normalizeDamageType(value: string): NonNullable<StatusEffectDefinition["damageOverTime"]>["damageType"] {
  return value === "physical" || value === "magic" ? value : "true";
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
