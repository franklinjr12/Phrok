import { getItemRarity } from "./equipment";
import { eventBus } from "./eventBus";
import type { ItemDefinition, ItemRarity } from "../types/dataDefinitions";
import type { EquipmentInstance, GameState, InventoryItem, StorageState } from "../types/gameState";

export type StorageListSource = "stack" | "equipment";
export type StorageCategoryFilter = "all" | "equipment" | "consumable" | "material";
export type StorageClassFilter = "all" | "current";
export type StorageLevelFilter = "all" | "usable";
export type StorageSortMode = "name" | "level" | "rarity" | "quantity";
export type StorageSortDirection = "asc" | "desc";

export interface StorageListEntry {
  itemId: string;
  quantity: number;
  source: StorageListSource;
}

export interface StorageListOptions {
  category: StorageCategoryFilter;
  rarity: ItemRarity | "all";
  classFilter: StorageClassFilter;
  levelFilter: StorageLevelFilter;
  classId: string;
  playerLevel: number;
  nameSearch: string;
  sortMode: StorageSortMode;
  sortDirection: StorageSortDirection;
}

export type StorageTransferResult =
  | { success: true; itemId: string; quantity: number; gold: number; inventoryQuantity: number; storageQuantity: number }
  | { success: false; itemId: string; quantity: number; gold: number; reason: "missing-item" | "invalid-quantity" };

const rarityRank: Record<ItemRarity, number> = {
  Common: 0,
  Uncommon: 1,
  Rare: 2,
  Epic: 3,
  Legendary: 4,
  Mythic: 5,
};

const equipmentTypes = new Set<ItemDefinition["type"]>(["weapon", "armor", "accessory", "sigil", "support"]);

export function createEmptyStorageState(): StorageState {
  return {
    items: [],
    equipmentInstances: [],
  };
}

export function depositStorageItem(
  state: GameState,
  item: ItemDefinition | undefined,
  quantity = 1,
): StorageTransferResult {
  const safeQuantity = Math.floor(quantity);

  if (!item) {
    return createFailure("", safeQuantity, state.inventory.gold, "missing-item");
  }

  if (safeQuantity < 1) {
    return createFailure(item.id, safeQuantity, state.inventory.gold, "invalid-quantity");
  }

  if (isStackableStorageItem(item)) {
    if (!moveStack(state.inventory.items, state.storage.items, item.id, safeQuantity)) {
      return createFailure(item.id, safeQuantity, state.inventory.gold, "missing-item");
    }
  } else if (!moveEquipmentInstance(state.inventory.equipmentInstances, state.storage.equipmentInstances, item.id)) {
    return createFailure(item.id, safeQuantity, state.inventory.gold, "missing-item");
  }

  emitStorageInventoryChanges(state);

  return createSuccess(state, item.id, safeQuantity);
}

export function withdrawStorageItem(
  state: GameState,
  item: ItemDefinition | undefined,
  quantity = 1,
): StorageTransferResult {
  const safeQuantity = Math.floor(quantity);

  if (!item) {
    return createFailure("", safeQuantity, state.inventory.gold, "missing-item");
  }

  if (safeQuantity < 1) {
    return createFailure(item.id, safeQuantity, state.inventory.gold, "invalid-quantity");
  }

  if (isStackableStorageItem(item)) {
    if (!moveStack(state.storage.items, state.inventory.items, item.id, safeQuantity)) {
      return createFailure(item.id, safeQuantity, state.inventory.gold, "missing-item");
    }
  } else if (!moveEquipmentInstance(state.storage.equipmentInstances, state.inventory.equipmentInstances, item.id)) {
    return createFailure(item.id, safeQuantity, state.inventory.gold, "missing-item");
  }

  emitStorageInventoryChanges(state);

  return createSuccess(state, item.id, safeQuantity);
}

export function getContainerEntries(
  items: InventoryItem[],
  equipmentInstances: EquipmentInstance[],
): StorageListEntry[] {
  const equipmentCounts = equipmentInstances.reduce<Record<string, number>>((counts, instance) => {
    counts[instance.itemId] = (counts[instance.itemId] ?? 0) + 1;
    return counts;
  }, {});

  return [
    ...items
      .filter((entry) => entry.quantity > 0)
      .map((entry) => ({
        itemId: entry.id,
        quantity: entry.quantity,
        source: "stack" as const,
      })),
    ...Object.entries(equipmentCounts).map(([itemId, quantity]) => ({
      itemId,
      quantity,
      source: "equipment" as const,
    })),
  ];
}

export function getStorageEntryQuantity(storage: StorageState, itemId: string): number {
  const stackQuantity = storage.items.find((entry) => entry.id === itemId)?.quantity ?? 0;
  const equipmentQuantity = storage.equipmentInstances.filter((entry) => entry.itemId === itemId).length;

  return stackQuantity + equipmentQuantity;
}

export function getFilteredStorageEntries(
  entries: StorageListEntry[],
  options: StorageListOptions,
  getItem: (id: string) => ItemDefinition,
): StorageListEntry[] {
  const search = options.nameSearch.trim().toLowerCase();

  return entries
    .filter((entry) => {
      const item = getItem(entry.itemId);

      return matchesCategory(item, options.category)
        && (options.rarity === "all" || getItemRarity(item) === options.rarity)
        && matchesClass(item, options.classFilter, options.classId)
        && matchesLevel(item, options.levelFilter, options.playerLevel)
        && (search.length === 0 || item.name.toLowerCase().includes(search));
    })
    .sort((left, right) => compareEntries(left, right, options, getItem));
}

function moveStack(source: InventoryItem[], target: InventoryItem[], itemId: string, quantity: number): boolean {
  const sourceEntry = source.find((entry) => entry.id === itemId);

  if (!sourceEntry || sourceEntry.quantity < quantity) {
    return false;
  }

  sourceEntry.quantity -= quantity;

  if (sourceEntry.quantity === 0) {
    source.splice(source.indexOf(sourceEntry), 1);
  }

  const targetEntry = target.find((entry) => entry.id === itemId);

  if (targetEntry) {
    targetEntry.quantity += quantity;
  } else {
    target.push({ id: itemId, quantity });
  }

  return true;
}

function moveEquipmentInstance(source: EquipmentInstance[], target: EquipmentInstance[], itemId: string): boolean {
  const index = source.findIndex((entry) => entry.itemId === itemId);

  if (index === -1) {
    return false;
  }

  const [instance] = source.splice(index, 1);
  target.push(instance);

  return true;
}

function isStackableStorageItem(item: ItemDefinition): boolean {
  return item.type === "consumable" || item.type === "material" || item.type === "key";
}

function emitStorageInventoryChanges(state: GameState): void {
  eventBus.emit("inventoryChanged", { inventory: state.inventory });
  eventBus.emit("storageChanged", { storage: state.storage });
}

function createSuccess(state: GameState, itemId: string, quantity: number): StorageTransferResult {
  return {
    success: true,
    itemId,
    quantity,
    gold: state.inventory.gold,
    inventoryQuantity: getContainerEntries(state.inventory.items, state.inventory.equipmentInstances)
      .find((entry) => entry.itemId === itemId)?.quantity ?? 0,
    storageQuantity: getStorageEntryQuantity(state.storage, itemId),
  };
}

function createFailure(
  itemId: string,
  quantity: number,
  gold: number,
  reason: "missing-item" | "invalid-quantity",
): StorageTransferResult {
  return {
    success: false,
    itemId,
    quantity,
    gold,
    reason,
  };
}

function matchesCategory(item: ItemDefinition, category: StorageCategoryFilter): boolean {
  if (category === "all") {
    return true;
  }

  if (category === "equipment") {
    return equipmentTypes.has(item.type);
  }

  if (category === "consumable") {
    return item.type === "consumable";
  }

  return item.type === "material";
}

function matchesClass(item: ItemDefinition, classFilter: StorageClassFilter, classId: string): boolean {
  if (classFilter === "all") {
    return true;
  }

  const allowedClassIds = item.allowedClassIds ?? [];

  return allowedClassIds.length === 0 || allowedClassIds.includes(classId);
}

function matchesLevel(item: ItemDefinition, levelFilter: StorageLevelFilter, playerLevel: number): boolean {
  return levelFilter === "all" || (item.level ?? 1) <= playerLevel;
}

function compareEntries(
  left: StorageListEntry,
  right: StorageListEntry,
  options: StorageListOptions,
  getItem: (id: string) => ItemDefinition,
): number {
  const leftItem = getItem(left.itemId);
  const rightItem = getItem(right.itemId);
  const direction = options.sortDirection === "asc" ? 1 : -1;
  let result = 0;

  if (options.sortMode === "level") {
    result = (leftItem.level ?? 1) - (rightItem.level ?? 1);
  } else if (options.sortMode === "rarity") {
    result = rarityRank[getItemRarity(leftItem)] - rarityRank[getItemRarity(rightItem)];
  } else if (options.sortMode === "quantity") {
    result = left.quantity - right.quantity;
  }

  if (result === 0) {
    result = leftItem.name.localeCompare(rightItem.name);
  }

  return result * direction;
}
