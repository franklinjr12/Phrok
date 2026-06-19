import { eventBus } from "./eventBus";
import type { ItemDefinition } from "../types/dataDefinitions";
import type { EquipmentData, EquipmentSlot, GameState } from "../types/gameState";

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
  defense: number;
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

export function getItemEquipmentSlot(item: ItemDefinition): EquipmentSlot | null {
  if (item.type === "weapon") {
    return "weapon";
  }

  if (item.type === "armor") {
    return "body";
  }

  return null;
}

export function equipItem(state: GameState, item: ItemDefinition, emitChange = true): boolean {
  const slot = getItemEquipmentSlot(item);

  if (!slot || !playerOwnsItem(state, item.id)) {
    return false;
  }

  state.equipment[slot] = item.id;

  if (emitChange) {
    eventBus.emit("equipmentChanged", { slot, itemId: item.id });
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
  return item?.type === "weapon" ? Math.max(1, Math.floor(item.value / 5)) : 0;
}

export function getItemEquipmentStats(item: ItemDefinition | null): EquipmentStats {
  if (!item) {
    return { attack: 0, defense: 0 };
  }

  return {
    attack: getWeaponAttack(item),
    defense: item.type === "armor" ? Math.max(1, Math.floor(item.value / 6)) : 0,
  };
}

export function getEquipmentStats(
  equipment: EquipmentData,
  getItem: (id: string) => ItemDefinition,
): EquipmentStats {
  const weapon = equipment.weapon ? getItem(equipment.weapon) : null;
  const body = equipment.body ? getItem(equipment.body) : null;
  const weaponStats = getItemEquipmentStats(weapon);
  const bodyStats = getItemEquipmentStats(body);

  return {
    attack: weaponStats.attack,
    defense: bodyStats.defense,
  };
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
      defense: next.defense - current.defense,
    },
  };
}

export function getItemRarity(item: ItemDefinition): "Common" | "Uncommon" | "Rare" {
  if (item.value >= 25) {
    return "Rare";
  }

  if (item.value >= 10) {
    return "Uncommon";
  }

  return "Common";
}

function playerOwnsItem(state: GameState, itemId: string): boolean {
  return state.inventory.items.some((entry) => entry.id === itemId && entry.quantity > 0)
    || state.inventory.equipmentInstances.some((entry) => entry.itemId === itemId);
}
