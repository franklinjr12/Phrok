import { eventBus } from "./eventBus";
import type { ClassDefinition, ItemDefinition, ItemRarity, ItemStatModifiers } from "../types/dataDefinitions";
import type { BaseStatKey, BaseStats, DerivedStats, EquipmentData, EquipmentSlot, GameState } from "../types/gameState";

export const equipmentSlots: EquipmentSlot[] = [
  "weapon",
  "offhand",
  "head",
  "body",
  "cloak",
  "boots",
  "accessory1",
  "accessory2",
  "sigil",
  "supportCharm",
];

export const equipmentSlotLabels: Record<EquipmentSlot, string> = {
  weapon: "Weapon",
  offhand: "Offhand",
  head: "Head",
  body: "Body",
  cloak: "Cloak",
  boots: "Boots",
  accessory1: "Accessory 1",
  accessory2: "Accessory 2",
  sigil: "Sigil",
  supportCharm: "Support Charm",
};

export interface EquipmentStats {
  attack: number;
  magicAttack: number;
  defense: number;
  magicDefense: number;
  hp: number;
  sp: number;
  crit: number;
  attackSpeed: number;
  castSpeed: number;
  cooldownReduction: number;
  moveSpeed: number;
  dropChance: number;
  baseStats: Partial<BaseStats>;
  derivedStats: Partial<Record<keyof DerivedStats, number>>;
  elementDamage: Record<string, number>;
  raceDamage: Record<string, number>;
  resistances: Record<string, number>;
}

export interface EquipmentComparison {
  current: EquipmentStats;
  next: EquipmentStats;
  delta: EquipmentStats;
}

export function createEmptyEquipment(): EquipmentData {
  return {
    weapon: null,
    offhand: null,
    head: null,
    body: null,
    cloak: null,
    boots: null,
    accessory1: null,
    accessory2: null,
    sigil: null,
    supportCharm: null,
  };
}

export function getValidEquipmentSlots(item: ItemDefinition): EquipmentSlot[] {
  if (item.validEquipmentSlots && item.validEquipmentSlots.length > 0) {
    return [...item.validEquipmentSlots];
  }

  if (item.type === "weapon") {
    return ["weapon"];
  }

  if (item.type === "armor") {
    return item.equipmentSlot ? [item.equipmentSlot] : ["body"];
  }

  if (item.type === "accessory") {
    return ["accessory1", "accessory2"];
  }

  if (item.type === "sigil") {
    return ["sigil"];
  }

  if (item.type === "support") {
    return ["supportCharm"];
  }

  return [];
}

export function getItemEquipmentSlot(item: ItemDefinition, equipment?: EquipmentData): EquipmentSlot | null {
  const slots = getValidEquipmentSlots(item);

  if (slots.length === 0) {
    return null;
  }

  if (!equipment) {
    return slots[0];
  }

  return slots.find((slot) => !equipment[slot]) ?? slots[0];
}

export function equipItem(
  state: GameState,
  item: ItemDefinition,
  emitChange = true,
  playerClass?: ClassDefinition,
  preferredSlot?: EquipmentSlot,
  getItem?: (id: string) => ItemDefinition,
): boolean {
  const validSlots = getValidEquipmentSlots(item);
  const slot = preferredSlot && validSlots.includes(preferredSlot)
    ? preferredSlot
    : getItemEquipmentSlot(item, state.equipment);

  if (!slot || !playerOwnsItem(state, item.id) || !canEquipItem(state, item, playerClass, slot, getItem)) {
    return false;
  }

  if (slot === "weapon" && item.twoHanded === true) {
    state.equipment.offhand = null;
  }

  state.equipment[slot] = item.id;

  if (emitChange) {
    eventBus.emit("equipmentChanged", { slot, itemId: item.id });
  }

  return true;
}

export function canEquipItem(
  state: GameState,
  item: ItemDefinition,
  playerClass?: ClassDefinition,
  slot = getItemEquipmentSlot(item, state.equipment),
  getItem?: (id: string) => ItemDefinition,
): boolean {
  if (!slot || !getValidEquipmentSlots(item).includes(slot)) {
    return false;
  }

  if (item.type === "weapon" && playerClass?.allowedWeaponTypes.length && item.weaponType) {
    if (!playerClass.allowedWeaponTypes.includes(item.weaponType)) {
      return false;
    }
  }

  const allowedClassIds = item.allowedClassIds ?? [];

  if (allowedClassIds.length > 0 && !allowedClassIds.includes(state.character.archetype)) {
    return false;
  }

  if (slot === "offhand" && state.equipment.weapon && getItem) {
    const weapon = getItem(state.equipment.weapon);
    if (weapon.twoHanded === true) {
      return false;
    }
  }

  return true;
}

export function removeEquipment(state: GameState, slot: EquipmentSlot, emitChange = true): boolean {
  if (!state.equipment[slot]) {
    return false;
  }

  state.equipment[slot] = null;

  if (emitChange) {
    eventBus.emit("equipmentChanged", { slot, itemId: null });
  }

  return true;
}

export function getWeaponAttack(item: ItemDefinition | null): number {
  return item?.type === "weapon" ? scaleByRarity(Math.max(1, Math.floor(item.value / 5)), item.rarity ?? "Common") : 0;
}

export function getItemEquipmentStats(item: ItemDefinition | null): EquipmentStats {
  const stats = createEmptyEquipmentStats();

  if (!item) {
    return stats;
  }

  const modifiers = item.statModifiers ?? {};

  mergeItemModifiers(stats, modifiers, getRarityStatMultiplier(item.rarity ?? "Common"));

  if (Object.keys(modifiers.derivedStats ?? {}).length === 0) {
    if (item.type === "weapon") {
      stats.attack += getWeaponAttack(item);
      stats.derivedStats.physicalAttack = (stats.derivedStats.physicalAttack ?? 0) + stats.attack;
      stats.derivedStats.rangedAttack = (stats.derivedStats.rangedAttack ?? 0) + stats.attack;
    } else if (item.type === "armor") {
      stats.defense += scaleByRarity(Math.max(1, Math.floor(item.value / 6)), item.rarity ?? "Common");
      stats.derivedStats.defense = (stats.derivedStats.defense ?? 0) + stats.defense;
    }
  }

  return stats;
}

export function getRefinedItemEquipmentStats(item: ItemDefinition | null, refineLevel = 0): EquipmentStats {
  const stats = getItemEquipmentStats(item);
  const safeLevel = Math.max(0, Math.min(10, Math.floor(refineLevel)));

  if (!item || safeLevel === 0 || !isEquipmentItem(item)) {
    return stats;
  }

  const attackBonus = item.type === "weapon" ? safeLevel * 2 : 0;
  const defenseBonus = item.type === "armor" ? safeLevel : 0;
  const utilityBonus = item.type === "accessory" || item.type === "sigil" || item.type === "support"
    ? Math.floor((safeLevel + 1) / 2)
    : 0;

  if (attackBonus > 0) {
    stats.attack += attackBonus;
    stats.magicAttack += attackBonus;
    stats.derivedStats.physicalAttack = (stats.derivedStats.physicalAttack ?? 0) + attackBonus;
    stats.derivedStats.rangedAttack = (stats.derivedStats.rangedAttack ?? 0) + attackBonus;
    stats.derivedStats.magicAttack = (stats.derivedStats.magicAttack ?? 0) + attackBonus;
  }

  if (defenseBonus > 0) {
    stats.defense += defenseBonus;
    stats.magicDefense += defenseBonus;
    stats.derivedStats.defense = (stats.derivedStats.defense ?? 0) + defenseBonus;
    stats.derivedStats.magicDefense = (stats.derivedStats.magicDefense ?? 0) + defenseBonus;
  }

  if (utilityBonus > 0) {
    stats.hp += utilityBonus * 5;
    stats.sp += utilityBonus * 2;
    stats.derivedStats.maxHp = (stats.derivedStats.maxHp ?? 0) + utilityBonus * 5;
    stats.derivedStats.maxSp = (stats.derivedStats.maxSp ?? 0) + utilityBonus * 2;
  }

  return stats;
}

export function getEquipmentStats(
  equipment: EquipmentData,
  getItem: (id: string) => ItemDefinition,
  refinementLevels: Record<string, number> = {},
): EquipmentStats {
  const total = createEmptyEquipmentStats();

  for (const slot of equipmentSlots) {
    const itemId = equipment[slot];
    mergeEquipmentStats(total, itemId ? getRefinedItemEquipmentStats(getItem(itemId), refinementLevels[itemId] ?? 0) : createEmptyEquipmentStats());
  }

  return total;
}

export function compareEquipmentItems(
  currentItem: ItemDefinition | null,
  nextItem: ItemDefinition,
): EquipmentComparison {
  const current = getItemEquipmentStats(currentItem);
  const next = getItemEquipmentStats(nextItem);

  return {
    current,
    next,
    delta: {
      attack: next.attack - current.attack,
      magicAttack: next.magicAttack - current.magicAttack,
      defense: next.defense - current.defense,
      magicDefense: next.magicDefense - current.magicDefense,
      hp: next.hp - current.hp,
      sp: next.sp - current.sp,
      crit: next.crit - current.crit,
      attackSpeed: next.attackSpeed - current.attackSpeed,
      castSpeed: next.castSpeed - current.castSpeed,
      cooldownReduction: next.cooldownReduction - current.cooldownReduction,
      moveSpeed: next.moveSpeed - current.moveSpeed,
      dropChance: next.dropChance - current.dropChance,
      baseStats: subtractNumberRecords(current.baseStats, next.baseStats) as Partial<BaseStats>,
      derivedStats: subtractNumberRecords(current.derivedStats, next.derivedStats) as Partial<Record<keyof DerivedStats, number>>,
      elementDamage: subtractNumberRecords(current.elementDamage, next.elementDamage) as Record<string, number>,
      raceDamage: subtractNumberRecords(current.raceDamage, next.raceDamage) as Record<string, number>,
      resistances: subtractNumberRecords(current.resistances, next.resistances) as Record<string, number>,
    },
  };
}

export function getItemRarity(item: ItemDefinition): ItemRarity {
  if (item.rarity) {
    return item.rarity;
  }

  if (item.value >= 80) {
    return "Epic";
  }

  if (item.value >= 25) {
    return "Rare";
  }

  if (item.value >= 10) {
    return "Uncommon";
  }

  return "Common";
}

export function isEquipmentItem(item: ItemDefinition): boolean {
  return getValidEquipmentSlots(item).length > 0;
}

export function getRarityStatMultiplier(rarity: ItemRarity): number {
  return rarityStatMultipliers[rarity];
}

export function getItemSellValue(item: ItemDefinition): number {
  return Math.max(0, Math.floor(item.value * raritySellMultipliers[getItemRarity(item)]));
}

export function createEmptyEquipmentStats(): EquipmentStats {
  return {
    attack: 0,
    magicAttack: 0,
    defense: 0,
    magicDefense: 0,
    hp: 0,
    sp: 0,
    crit: 0,
    attackSpeed: 0,
    castSpeed: 0,
    cooldownReduction: 0,
    moveSpeed: 0,
    dropChance: 0,
    baseStats: {},
    derivedStats: {},
    elementDamage: {},
    raceDamage: {},
    resistances: {},
  };
}

function playerOwnsItem(state: GameState, itemId: string): boolean {
  return state.inventory.items.some((entry) => entry.id === itemId && entry.quantity > 0)
    || state.inventory.equipmentInstances.some((entry) => entry.itemId === itemId);
}

const rarityStatMultipliers: Record<ItemRarity, number> = {
  Common: 1,
  Uncommon: 1.15,
  Rare: 1.35,
  Epic: 1.65,
  Legendary: 2,
  Mythic: 2.5,
};

const raritySellMultipliers: Record<ItemRarity, number> = {
  Common: 1,
  Uncommon: 1.2,
  Rare: 1.55,
  Epic: 2.1,
  Legendary: 3,
  Mythic: 4.5,
};

function mergeItemModifiers(stats: EquipmentStats, modifiers: ItemStatModifiers, multiplier: number): void {
  mergeScaledRecord(stats.baseStats, modifiers.baseStats, multiplier);
  mergeScaledRecord(stats.derivedStats, modifiers.derivedStats, multiplier);
  mergeScaledRecord(stats.elementDamage, modifiers.elementDamage, multiplier);
  mergeScaledRecord(stats.raceDamage, modifiers.raceDamage, multiplier);
  mergeScaledRecord(stats.resistances, modifiers.resistances, multiplier);

  stats.attack += Math.max(
    getNumericModifier(modifiers.derivedStats, "physicalAttack", multiplier),
    getNumericModifier(modifiers.derivedStats, "rangedAttack", multiplier),
  );
  stats.magicAttack += getNumericModifier(modifiers.derivedStats, "magicAttack", multiplier);
  stats.defense += getNumericModifier(modifiers.derivedStats, "defense", multiplier);
  stats.magicDefense += getNumericModifier(modifiers.derivedStats, "magicDefense", multiplier);
  stats.hp += getNumericModifier(modifiers.derivedStats, "maxHp", multiplier);
  stats.sp += getNumericModifier(modifiers.derivedStats, "maxSp", multiplier);
  stats.crit += getNumericModifier(modifiers.derivedStats, "crit", multiplier);
  stats.attackSpeed += getNumericModifier(modifiers.derivedStats, "attackSpeed", multiplier);
  stats.castSpeed += getNumericModifier(modifiers.derivedStats, "castSpeed", multiplier);
  stats.cooldownReduction += getNumericModifier(modifiers.derivedStats, "cooldownReduction", multiplier);
  stats.moveSpeed += getNumericModifier(modifiers.derivedStats, "moveSpeed", multiplier);
  stats.dropChance += getNumericModifier(modifiers.derivedStats, "dropChance", multiplier);
}

function mergeEquipmentStats(target: EquipmentStats, source: EquipmentStats): void {
  target.attack += source.attack;
  target.magicAttack += source.magicAttack;
  target.defense += source.defense;
  target.magicDefense += source.magicDefense;
  target.hp += source.hp;
  target.sp += source.sp;
  target.crit += source.crit;
  target.attackSpeed += source.attackSpeed;
  target.castSpeed += source.castSpeed;
  target.cooldownReduction += source.cooldownReduction;
  target.moveSpeed += source.moveSpeed;
  target.dropChance += source.dropChance;
  mergeScaledRecord(target.baseStats, source.baseStats, 1);
  mergeScaledRecord(target.derivedStats, source.derivedStats, 1);
  mergeScaledRecord(target.elementDamage, source.elementDamage, 1);
  mergeScaledRecord(target.raceDamage, source.raceDamage, 1);
  mergeScaledRecord(target.resistances, source.resistances, 1);
}

function mergeScaledRecord(
  target: Partial<Record<string, number>>,
  source: Partial<Record<string, number>> | undefined,
  multiplier: number,
): void {
  for (const [key, value] of Object.entries(source ?? {})) {
    if (typeof value === "number") {
      target[key] = (target[key] ?? 0) + scaleByRarity(value, multiplier);
    }
  }
}

function getNumericModifier(
  source: ItemStatModifiers["derivedStats"],
  key: keyof DerivedStats,
  multiplier: number,
): number {
  const value = source?.[key];
  return typeof value === "number" ? scaleByRarity(value, multiplier) : 0;
}

function scaleByRarity(value: number, rarityOrMultiplier: ItemRarity | number): number {
  const multiplier = typeof rarityOrMultiplier === "number" ? rarityOrMultiplier : getRarityStatMultiplier(rarityOrMultiplier);
  if (value === 0) {
    return 0;
  }

  const scaled = Math.round(value * multiplier);
  return value > 0 ? Math.max(1, scaled) : Math.min(-1, scaled);
}

function subtractNumberRecords(
  current: Partial<Record<string, number>>,
  next: Partial<Record<string, number>>,
): Partial<Record<string, number>> {
  const delta: Record<string, number> = {};

  for (const key of new Set([...Object.keys(current), ...Object.keys(next)])) {
    delta[key] = (next[key] ?? 0) - (current[key] ?? 0);
  }

  return delta;
}
