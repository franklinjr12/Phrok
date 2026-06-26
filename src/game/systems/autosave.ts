import type { SaveData } from "../types/saveData";
import type { GameState } from "../types/gameState";
import { createNewGameState } from "../data/gameState";
import { baseStatKeys, createEmptyBaseStats } from "./stats";
import { createInitialConsumableState } from "./consumables";
import { createInitialHotbar, createInitialSkillState, hotbarSlotCount } from "./skills";

export const autosaveStorageKey = "prok-autosave";
export const autosaveSlot = 0;
export const manualSaveSlotCount = 3;
export const saveDataVersion = 1;

export function getSaveSlotStorageKey(slot: number): string {
  return `prok-save-slot-${slot}`;
}

export function createSaveData(gameState: GameState, savedAt = new Date().toISOString()): SaveData {
  const snapshot = structuredClone(gameState);

  return {
    version: saveDataVersion,
    savedAt,
    currentSaveSlot: snapshot.currentSaveSlot,
    character: snapshot.character,
    currentMapId: snapshot.currentMapId,
    position: snapshot.position,
    inventory: snapshot.inventory,
    storage: snapshot.storage,
    equipment: snapshot.equipment,
    skills: [...snapshot.character.skillIds],
    stats: snapshot.character.stats,
    gold: snapshot.playerProfile.gold,
    bestiary: snapshot.bestiary,
    crafting: snapshot.crafting,
    quests: snapshot.quests,
    worldFlags: snapshot.worldFlags,
    settings: snapshot.settings,
    gameState: snapshot,
  };
}

export function serializeSaveData(saveData: SaveData): string {
  return JSON.stringify(saveData);
}

export function deserializeSaveData(serialized: string): SaveData {
  return normalizeSaveData(JSON.parse(serialized));
}

export function saveDataToGameState(saveData: SaveData): GameState {
  return structuredClone(saveData.gameState);
}

export function writeAutosave(gameState: GameState, storage: Storage = window.localStorage): SaveData {
  const saveData = createSaveData(gameState);
  storage.setItem(autosaveStorageKey, serializeSaveData(saveData));

  return saveData;
}

export function readAutosave(storage: Storage = window.localStorage): SaveData | null {
  const serialized = storage.getItem(autosaveStorageKey);

  return serialized ? readSerializedSave(serialized) : null;
}

export function writeSaveSlot(
  slot: number,
  gameState: GameState,
  storage: Storage = window.localStorage,
): SaveData {
  assertManualSaveSlot(slot);
  const slotState = structuredClone(gameState);
  slotState.currentSaveSlot = slot;
  const saveData = createSaveData(slotState);

  storage.setItem(getSaveSlotStorageKey(slot), serializeSaveData(saveData));

  return saveData;
}

export function readSaveSlot(slot: number, storage: Storage = window.localStorage): SaveData | null {
  assertManualSaveSlot(slot);
  const serialized = storage.getItem(getSaveSlotStorageKey(slot));

  return serialized ? readSerializedSave(serialized) : null;
}

export function readSaveSlots(storage: Storage = window.localStorage): Array<SaveData | null> {
  return Array.from({ length: manualSaveSlotCount }, (_, index) => readSaveSlot(index + 1, storage));
}

function readSerializedSave(serialized: string): SaveData | null {
  try {
    return deserializeSaveData(serialized);
  } catch {
    return null;
  }
}

function normalizeSaveData(rawSave: unknown): SaveData {
  if (!isRecord(rawSave)) {
    throw new Error("Save data must be an object.");
  }

  const fallbackState = createNewGameState();
  const rawGameState = isRecord(rawSave.gameState) ? rawSave.gameState : {};
  const character = normalizeCharacter(
    isRecord(rawSave.character) ? rawSave.character : rawGameState.character,
    fallbackState.character,
  );
  const inventory = normalizeInventory(
    isRecord(rawSave.inventory) ? rawSave.inventory : rawGameState.inventory,
    fallbackState.inventory,
  );
  const storage = normalizeStorage(
    isRecord(rawSave.storage) ? rawSave.storage : rawGameState.storage,
    fallbackState.storage,
  );
  const equipment = {
    ...fallbackState.equipment,
    ...normalizeRecord(
      isRecord(rawSave.equipment) ? rawSave.equipment : rawGameState.equipment,
      {},
    ),
  };
  const gameState: GameState = {
    ...fallbackState,
    currentSaveSlot: nullableNumber(rawSave.currentSaveSlot, nullableNumber(rawGameState.currentSaveSlot, null)),
    playerProfile: {
      ...fallbackState.playerProfile,
      ...normalizeRecord(rawGameState.playerProfile, {}),
      gold: numberValue(rawSave.gold, numberValue(isRecord(rawGameState.playerProfile) ? rawGameState.playerProfile.gold : undefined, fallbackState.playerProfile.gold)),
    },
    currentMapId: stringValue(rawSave.currentMapId, stringValue(rawGameState.currentMapId, fallbackState.currentMapId)),
    position: normalizePosition(
      isRecord(rawSave.position) ? rawSave.position : rawGameState.position,
      fallbackState.position,
    ),
    character,
    inventory,
    storage,
    equipment,
    quests: normalizeQuestState(isRecord(rawSave.quests) ? rawSave.quests : rawGameState.quests, fallbackState.quests),
    bestiary: normalizeBestiaryState(isRecord(rawSave.bestiary) ? rawSave.bestiary : rawGameState.bestiary, fallbackState.bestiary),
    crafting: normalizeCraftingState(isRecord(rawSave.crafting) ? rawSave.crafting : rawGameState.crafting, fallbackState.crafting),
    worldFlags: normalizeBooleanRecord(rawSave.worldFlags, fallbackState.worldFlags),
    settings: normalizeSettings(isRecord(rawSave.settings) ? rawSave.settings : rawGameState.settings, fallbackState.settings),
  };

  gameState.inventory.gold = numberValue(rawSave.gold, gameState.inventory.gold);
  gameState.playerProfile.gold = gameState.inventory.gold;

  return createSaveData(
    gameState,
    stringValue(rawSave.savedAt, new Date(0).toISOString()),
  );
}

function normalizeCharacter(rawCharacter: unknown, fallback: GameState["character"]): GameState["character"] {
  const source = isRecord(rawCharacter) ? rawCharacter : {};
  const fallbackStats = fallback.stats;
  const sourceStats = isRecord(source.stats) ? source.stats : {};

  return {
    id: stringValue(source.id, fallback.id),
    archetype: stringValue(source.archetype, fallback.archetype),
    advancedClass: normalizeAdvancedClass(source.advancedClass),
    stats: {
      hp: numberValue(sourceStats.hp, fallbackStats.hp),
      maxHp: numberValue(sourceStats.maxHp, fallbackStats.maxHp),
      sp: numberValue(sourceStats.sp, fallbackStats.sp),
      maxSp: numberValue(sourceStats.maxSp, fallbackStats.maxSp),
    },
    baseStats: normalizeBaseStats(source.baseStats, fallback.baseStats),
    allocatedStats: normalizeBaseStats(source.allocatedStats, fallback.allocatedStats),
    statBuffs: Array.isArray(source.statBuffs)
      ? source.statBuffs.filter(isRecord).map((modifier) => ({
        id: stringValue(modifier.id, "buff"),
        sourceSkillId: typeof modifier.sourceSkillId === "string" ? modifier.sourceSkillId : undefined,
        sourceStatusEffectId: typeof modifier.sourceStatusEffectId === "string" ? modifier.sourceStatusEffectId : undefined,
        expiresAt: typeof modifier.expiresAt === "number" && Number.isFinite(modifier.expiresAt) ? modifier.expiresAt : undefined,
        baseStats: normalizePartialBaseStats(modifier.baseStats),
        derivedStats: normalizeNumberRecord(modifier.derivedStats),
      }))
      : [...fallback.statBuffs],
    statusEffects: normalizeStatusEffects(source.statusEffects, fallback.statusEffects),
    skillIds: stringArray(source.skillIds, fallback.skillIds),
    skills: normalizeSkillState(source.skills, fallback.skills, stringArray(source.skillIds, fallback.skillIds)),
    hotbar: normalizeHotbar(source.hotbar, fallback.hotbar, stringArray(source.skillIds, fallback.skillIds)),
    consumables: normalizeConsumableState(source.consumables, fallback.consumables),
  };
}

function normalizeAdvancedClass(rawAdvancedClass: unknown): GameState["character"]["advancedClass"] {
  const source = isRecord(rawAdvancedClass) ? rawAdvancedClass : null;

  if (!source) {
    return null;
  }

  const id = stringValue(source.id, "");
  const name = stringValue(source.name, "");
  const baseClassId = stringValue(source.baseClassId, "");

  if (!id || !name || !baseClassId) {
    return null;
  }

  return {
    id,
    name,
    baseClassId,
    unlockedAtLevel: Math.max(1, numberValue(source.unlockedAtLevel, 40)),
  };
}

function normalizeStatusEffects(rawStatusEffects: unknown, fallback: GameState["character"]["statusEffects"]): GameState["character"]["statusEffects"] {
  const source = Array.isArray(rawStatusEffects) ? rawStatusEffects : fallback;

  return source
    .filter(isRecord)
    .map((effect) => ({
        id: stringValue(effect.id, ""),
        sourceId: stringValue(effect.sourceId, "unknown"),
        sourceKind: normalizeStatusSourceKind(effect.sourceKind),
        persistThroughMapTransition: typeof effect.persistThroughMapTransition === "boolean"
          ? effect.persistThroughMapTransition
          : undefined,
        stacks: Math.max(1, numberValue(effect.stacks, 1)),
        appliedAt: numberValue(effect.appliedAt, 0),
        expiresAt: numberValue(effect.expiresAt, 0),
      nextTickAt: numberValue(effect.nextTickAt, 0),
    }))
    .filter((effect) => effect.id.length > 0 && effect.expiresAt > 0);
}

function normalizeSkillState(rawSkillState: unknown, fallback: GameState["character"]["skills"], skillIds: string[]): GameState["character"]["skills"] {
  const source = isRecord(rawSkillState) ? rawSkillState : {};
  const defaultState = fallback ?? createInitialSkillState(skillIds);
  const learned = Array.isArray(source.learned)
    ? source.learned
      .filter(isRecord)
      .map((entry) => ({
        id: stringValue(entry.id, ""),
        level: Math.max(1, numberValue(entry.level, 1)),
      }))
      .filter((entry) => entry.id.length > 0)
    : defaultState.learned;

  return {
    learned: learned.length > 0 ? learned : createInitialSkillState(skillIds).learned,
    cooldowns: normalizeNumberRecord(source.cooldowns),
    activeToggleIds: stringArray(source.activeToggleIds, defaultState.activeToggleIds),
  };
}

function normalizeConsumableState(
  rawConsumables: unknown,
  fallback: GameState["character"]["consumables"],
): GameState["character"]["consumables"] {
  const source = isRecord(rawConsumables) ? rawConsumables : {};
  const defaultState = fallback ?? createInitialConsumableState();
  const rawAutoPotion = isRecord(source.autoPotion) ? source.autoPotion : {};

  return {
    cooldowns: normalizeNumberRecord(source.cooldowns),
    autoPotion: {
      hpThresholdPercent: normalizeThreshold(rawAutoPotion.hpThresholdPercent, defaultState.autoPotion.hpThresholdPercent),
      spThresholdPercent: normalizeThreshold(rawAutoPotion.spThresholdPercent, defaultState.autoPotion.spThresholdPercent),
    },
  };
}

function normalizeHotbar(rawHotbar: unknown, fallback: GameState["character"]["hotbar"], skillIds: string[]): GameState["character"]["hotbar"] {
  const source = Array.isArray(rawHotbar) ? rawHotbar : fallback ?? createInitialHotbar(skillIds);

  return source
    .filter(isRecord)
    .map((entry) => ({
      slot: numberValue(entry.slot, 0),
      type: stringValue(entry.type, "skill") === "item" ? "item" as const : "skill" as const,
      id: stringValue(entry.id, ""),
    }))
    .filter((entry) => Number.isInteger(entry.slot) && entry.slot >= 1 && entry.slot <= hotbarSlotCount && entry.id.length > 0)
    .sort((left, right) => left.slot - right.slot);
}

function normalizeInventory(rawInventory: unknown, fallback: GameState["inventory"]): GameState["inventory"] {
  const source = isRecord(rawInventory) ? rawInventory : {};
  const rawItems = Array.isArray(source.items) ? source.items : fallback.items;
  const rawEquipmentInstances = Array.isArray(source.equipmentInstances)
    ? source.equipmentInstances
    : fallback.equipmentInstances;

  return {
    items: rawItems
      .filter(isRecord)
      .map((item) => ({
        id: stringValue(item.id, ""),
        quantity: numberValue(item.quantity, 1),
      }))
      .filter((item) => item.id.length > 0),
    gold: numberValue(source.gold, fallback.gold),
    equipmentInstances: rawEquipmentInstances
      .filter(isRecord)
      .map((item) => ({
        instanceId: stringValue(item.instanceId, ""),
        itemId: stringValue(item.itemId, ""),
      }))
      .filter((item) => item.instanceId.length > 0 && item.itemId.length > 0),
    appraisedItemIds: stringArray(source.appraisedItemIds, fallback.appraisedItemIds),
    refinementLevels: normalizeRefinementLevels(source.refinementLevels, fallback.refinementLevels),
  };
}

function normalizeStorage(rawStorage: unknown, fallback: GameState["storage"]): GameState["storage"] {
  const source = isRecord(rawStorage) ? rawStorage : {};
  const rawItems = Array.isArray(source.items) ? source.items : fallback.items;
  const rawEquipmentInstances = Array.isArray(source.equipmentInstances)
    ? source.equipmentInstances
    : fallback.equipmentInstances;

  return {
    items: rawItems
      .filter(isRecord)
      .map((item) => ({
        id: stringValue(item.id, ""),
        quantity: numberValue(item.quantity, 1),
      }))
      .filter((item) => item.id.length > 0 && item.quantity > 0),
    equipmentInstances: rawEquipmentInstances
      .filter(isRecord)
      .map((item) => ({
        instanceId: stringValue(item.instanceId, ""),
        itemId: stringValue(item.itemId, ""),
      }))
      .filter((item) => item.instanceId.length > 0 && item.itemId.length > 0),
  };
}

function normalizePosition(rawPosition: unknown, fallback: GameState["position"]): GameState["position"] {
  const source = isRecord(rawPosition) ? rawPosition : {};

  return {
    x: numberValue(source.x, fallback.x),
    y: numberValue(source.y, fallback.y),
  };
}

function normalizeQuestState(rawQuestState: unknown, fallback: GameState["quests"]): GameState["quests"] {
  const source = isRecord(rawQuestState) ? rawQuestState : {};

  return {
    activeQuestIds: stringArray(source.activeQuestIds, fallback.activeQuestIds),
    completedQuestIds: stringArray(source.completedQuestIds, fallback.completedQuestIds),
  };
}

function normalizeBestiaryState(rawBestiaryState: unknown, fallback: GameState["bestiary"]): GameState["bestiary"] {
  const source = isRecord(rawBestiaryState) ? rawBestiaryState : {};

  return {
    discoveredEnemyIds: stringArray(source.discoveredEnemyIds, fallback.discoveredEnemyIds),
    defeatedEnemyIds: stringArray(source.defeatedEnemyIds, fallback.defeatedEnemyIds),
  };
}

function normalizeCraftingState(rawCraftingState: unknown, fallback: GameState["crafting"]): GameState["crafting"] {
  const source = isRecord(rawCraftingState) ? rawCraftingState : {};

  return {
    unlockedRecipeIds: stringArray(source.unlockedRecipeIds, fallback.unlockedRecipeIds),
    unlockNotifications: stringArray(source.unlockNotifications, fallback.unlockNotifications),
  };
}

function normalizeRefinementLevels(rawLevels: unknown, fallback: GameState["inventory"]["refinementLevels"] = {}): GameState["inventory"]["refinementLevels"] {
  const source = isRecord(rawLevels) ? rawLevels : fallback;
  const levels: Record<string, number> = {};

  for (const [itemId, level] of Object.entries(source)) {
    if (typeof level === "number" && Number.isFinite(level)) {
      levels[itemId] = Math.max(0, Math.min(10, Math.floor(level)));
    }
  }

  return levels;
}

function normalizeSettings(rawSettings: unknown, fallback: GameState["settings"]): GameState["settings"] {
  const source = isRecord(rawSettings) ? rawSettings : {};

  return {
    musicVolume: numberValue(source.musicVolume, fallback.musicVolume),
    sfxVolume: numberValue(source.sfxVolume, fallback.sfxVolume),
    textSpeed: numberValue(source.textSpeed, fallback.textSpeed),
  };
}

function normalizeBooleanRecord(rawRecord: unknown, fallback: Record<string, boolean>): Record<string, boolean> {
  const source = isRecord(rawRecord) ? rawRecord : fallback;

  return Object.fromEntries(
    Object.entries(source).filter((entry): entry is [string, boolean] => typeof entry[1] === "boolean"),
  );
}

function normalizeBaseStats(rawStats: unknown, fallback: GameState["character"]["baseStats"]): GameState["character"]["baseStats"] {
  const source = isRecord(rawStats) ? rawStats : {};
  const stats = createEmptyBaseStats();

  for (const key of baseStatKeys) {
    stats[key] = numberValue(source[key], fallback[key]);
  }

  return stats;
}

function normalizePartialBaseStats(rawStats: unknown): Partial<GameState["character"]["baseStats"]> {
  const source = isRecord(rawStats) ? rawStats : {};
  const stats: Partial<GameState["character"]["baseStats"]> = {};

  for (const key of baseStatKeys) {
    const value = source[key];

    if (typeof value === "number" && Number.isFinite(value)) {
      stats[key] = value;
    }
  }

  return stats;
}

function normalizeNumberRecord(rawRecord: unknown): Record<string, number> {
  const source = isRecord(rawRecord) ? rawRecord : {};

  return Object.fromEntries(
    Object.entries(source).filter((entry): entry is [string, number] => typeof entry[1] === "number" && Number.isFinite(entry[1])),
  );
}

function normalizeThreshold(value: unknown, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(0, Math.min(100, Math.round(value)));
}

function normalizeStatusSourceKind(value: unknown): GameState["character"]["statusEffects"][number]["sourceKind"] {
  return value === "skill" || value === "item" || value === "enemy" || value === "unknown"
    ? value
    : undefined;
}

function normalizeRecord<T extends Record<string, unknown>>(rawRecord: unknown, fallback: T): T {
  return {
    ...fallback,
    ...(isRecord(rawRecord) ? rawRecord : {}),
  };
}

function assertManualSaveSlot(slot: number): void {
  if (!Number.isInteger(slot) || slot < 1 || slot > manualSaveSlotCount) {
    throw new Error(`Save slot must be between 1 and ${manualSaveSlotCount}.`);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

function numberValue(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function nullableNumber(value: unknown, fallback: number | null): number | null {
  return typeof value === "number" && Number.isInteger(value) ? value : fallback;
}

function stringArray(value: unknown, fallback: string[]): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [...fallback];
}
